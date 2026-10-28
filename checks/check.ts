#!/usr/bin/env node
// Validate casefiles, prepare separate inputs, and summarize human reviews.
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = ['recommerce-inspect', 'recommerce-buy'] as const;
const KINDS = new Set(['seller_claim', 'model_documentation', 'buyer_observation', 'marketplace_record']);
const GROUPS = ['hard_failures', 'usefulness'] as const;
const RUN_FIELDS = ['label', 'model', 'tool_setup', 'source_ref', 'reviewer'] as const;

type Rule = { id: string; text: string };
export type Casefile = {
  skill: typeof SKILLS[number];
  id: string; title: string; pair: string; category: string; request: string;
  evidence: { id: string; kind: string; text: string; observed_at?: string }[];
  rubric: { hard_failures: Rule[]; usefulness: Rule[]; acceptable_outcomes: string[] };
};
type Review = {
  suite_digest: string;
  run: Record<typeof RUN_FIELDS[number], string>;
  cases: { id: string; response: string; rationale: string;
    hard_failures: Record<string, boolean | null>; usefulness: Record<string, boolean | null> }[];
};

function require(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function fields(value: unknown, required: readonly string[], optional: readonly string[] = []): asserts value is Record<string, unknown> {
  require(isRecord(value), 'expected an object');
  require(required.every(key => Object.hasOwn(value, key))
    && Object.keys(value).every(key => required.includes(key) || optional.includes(key)),
  'missing or unknown object fields');
}

function string(value: unknown, label: string, allowEmpty = false): asserts value is string {
  require(typeof value === 'string' && (allowEmpty || value.trim()), `${label} must be a ${allowEmpty ? '' : 'nonempty '}string`);
}

function uniqueObjects(value: unknown, label: string): Map<string, Record<string, unknown>> {
  require(Array.isArray(value) && value.length > 0, `${label} must be a nonempty list`);
  const result = new Map<string, Record<string, unknown>>();
  for (const item of value) {
    require(isRecord(item), `${label} entries must be objects`);
    require(typeof item.id === 'string' && /^[a-z0-9][a-z0-9_-]*$/.test(item.id), `invalid ${label} id`);
    require(!result.has(item.id), `duplicate ${label} id: ${item.id}`);
    result.set(item.id, item);
  }
  return result;
}

export function readJson(path: string): unknown {
  const text = readFileSync(path, 'utf8');
  const value: unknown = JSON.parse(text);
  // JSON.parse silently overwrites repeated fields, which could hide a failed rating.
  const objects: Set<string>[] = [];
  let previous = '';
  for (const [token] of text.matchAll(/"(?:[^"\\]|\\.)*"|[{}:]/g)) {
    if (token === '{') objects.push(new Set());
    else if (token === '}') objects.pop();
    else if (token === ':') {
      const key: string = JSON.parse(previous);
      const keys = objects.at(-1)!;
      require(!keys.has(key), `duplicate JSON field: ${key}`);
      keys.add(key);
    }
    previous = token;
  }
  return value;
}

function suiteDigest(cases: Casefile[]): string {
  return createHash('sha256').update(JSON.stringify(cases)).digest('hex');
}

export function validateCase(value: unknown): Casefile {
  fields(value, ['skill', 'id', 'title', 'pair', 'category', 'request', 'evidence', 'rubric']);
  require(SKILLS.some(skill => skill === value.skill), 'unknown case skill');
  for (const key of ['id', 'title', 'pair', 'category', 'request']) string(value[key], key);
  require(typeof value.id === 'string' && /^rc-[0-9]{3,}$/.test(value.id), 'invalid case id');
  for (const evidence of uniqueObjects(value.evidence, 'evidence').values()) {
    fields(evidence, ['id', 'kind', 'text'], ['observed_at']);
    require(typeof evidence.kind === 'string' && KINDS.has(evidence.kind), 'unknown evidence kind');
    string(evidence.text, 'evidence text');
    if (Object.hasOwn(evidence, 'observed_at')) {
      string(evidence.observed_at, 'observed_at');
      require(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(evidence.observed_at)
        && Number.isFinite(Date.parse(evidence.observed_at)), 'observed_at must be an ISO timestamp with timezone');
      const day = evidence.observed_at.slice(0, 10);
      require(new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day,
        'observed_at calendar date does not exist');
    }
  }
  fields(value.rubric, [...GROUPS, 'acceptable_outcomes']);
  const ruleIds = new Set<string>();
  for (const group of GROUPS) {
    for (const [id, rule] of uniqueObjects(value.rubric[group], group)) {
      fields(rule, ['id', 'text']);
      require(!ruleIds.has(id), 'rubric ids must be unique across groups');
      ruleIds.add(id);
      string(rule.text, 'rubric text');
    }
  }
  const outcomes = value.rubric.acceptable_outcomes;
  require(Array.isArray(outcomes) && outcomes.length > 0, 'acceptable_outcomes must be nonempty');
  for (const outcome of outcomes) string(outcome, 'acceptable outcome');
  return value as Casefile;
}

export function loadCases(directory: string, skill?: string): Casefile[] {
  require(skill === undefined || SKILLS.some(name => name === skill), 'unknown skill filter');
  const cases = readdirSync(directory).filter(name => name.endsWith('.json')).sort().map(name => {
    try {
      const item = validateCase(readJson(join(directory, name)));
      require(name === `${item.id}.json`, 'filename must match case id');
      return item;
    } catch (error) {
      throw new Error(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  uniqueObjects(cases, 'case');
  const selected = skill === undefined ? cases : cases.filter(item => item.skill === skill);
  require(selected.length > 0, 'no cases match the selected skill');
  return selected;
}

function writeNewJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
}

function rejectSymlinks(path: string): void {
  const info = lstatSync(path);
  require(!info.isSymbolicLink(), 'export skill must not contain symlinks');
  if (info.isDirectory()) for (const name of readdirSync(path)) rejectSymlinks(join(path, name));
}

export function exportCases(cases: Casefile[], output: string, withSkill = false, root = ROOT): void {
  const repo = realpathSync(root);
  const destination = join(realpathSync(dirname(resolve(output))), basename(output));
  const rel = relative(repo, destination);
  require(rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel), 'export must be outside the repository');
  require(!existsSync(output), 'export destination already exists');
  if (withSkill) {
    for (const name of new Set(cases.map(item => item.skill))) {
      const skill = join(repo, 'skills', name);
      require(existsSync(join(skill, 'SKILL.md')), `${name} skill is missing`);
      require(!lstatSync(dirname(skill)).isSymbolicLink(), 'export skill must not contain symlinks');
      rejectSymlinks(skill);
    }
  }
  mkdirSync(output);
  for (const item of cases) {
    const caseDir = join(output, item.id);
    mkdirSync(caseDir);
    writeNewJson(join(caseDir, 'input.json'), {
      instruction: 'Answer the buyer request using only the supplied evidence. '
        + 'This is an offline assessment; do not contact sellers or take marketplace actions.',
      request: item.request,
      evidence: item.evidence,
    });
    if (withSkill) cpSync(join(repo, 'skills', item.skill), join(caseDir, 'skills', item.skill),
      { recursive: true, force: false, errorOnExist: true });
  }
}

export function reviewTemplate(cases: Casefile[]): Review {
  return {
    suite_digest: suiteDigest(cases),
    run: { label: '', model: '', tool_setup: '', source_ref: '', reviewer: '' },
    cases: cases.map(item => ({
      id: item.id, response: '', rationale: '',
      hard_failures: Object.fromEntries(item.rubric.hard_failures.map(rule => [rule.id, null])),
      usefulness: Object.fromEntries(item.rubric.usefulness.map(rule => [rule.id, null])),
    })),
  };
}

export function scoreReview(review: unknown, cases: Casefile[]) {
  fields(review, ['suite_digest', 'run', 'cases']);
  require(review.suite_digest === suiteDigest(cases),
    'case content has changed; score with the original suite or create and grade a new review');
  fields(review.run, RUN_FIELDS);
  for (const field of RUN_FIELDS) string(review.run[field], field, true);
  const run = review.run as Review['run'];
  const missingMetadata = RUN_FIELDS.filter(field => !run[field].trim());
  const responses = uniqueObjects(review.cases, 'review case');
  require(responses.size === cases.length && cases.every(item => responses.has(item.id)),
    'review must contain every case exactly once and no unknown cases');
  const totals = {
    hard_failures: { positive: 0, reviewed: 0, total: 0 },
    usefulness: { positive: 0, reviewed: 0, total: 0 },
  };
  let complete = 0;
  const failingIds: string[] = [];
  for (const item of cases) {
    const response = responses.get(item.id);
    fields(response, ['id', 'response', 'rationale', ...GROUPS]);
    string(response.response, 'response', true);
    string(response.rationale, 'rationale', true);
    const ratings: (boolean | null)[] = [];
    for (const group of GROUPS) {
      const scores = response[group];
      fields(scores, item.rubric[group].map(rule => rule.id));
      for (const value of Object.values(scores)) {
        require(value === null || typeof value === 'boolean', 'ratings must be true, false, or null');
        ratings.push(value);
        totals[group].total += 1;
        totals[group].reviewed += Number(value !== null);
        totals[group].positive += Number(value === true);
      }
    }
    if (ratings.some(value => value !== null)) require(response.response.trim() && response.rationale.trim(),
      `${item.id}: ratings require the assistant response and review rationale`);
    complete += Number(ratings.every(value => value !== null));
    if (Object.values(response.hard_failures as Record<string, unknown>).some(value => value === true)) failingIds.push(item.id);
  }
  const hard = totals.hard_failures;
  const useful = totals.usefulness;
  return {
    label: run.label,
    status: failingIds.length ? 'hard-failure' : (complete !== cases.length || missingMetadata.length ? 'incomplete' : 'reviewed'),
    cases: { complete, total: cases.length },
    hard_failures: { violations: hard.positive, reviewed: hard.reviewed, total: hard.total, case_ids: failingIds },
    usefulness: { met: useful.positive, reviewed: useful.reviewed, total: useful.total },
    missing_metadata: missingMetadata,
  };
}

function main(): number {
  try {
    const [command, ...args] = process.argv.slice(2);
    if (!command || command === '--help') {
      console.log('Usage: node checks/check.ts validate | export --output DIR [--with-skill] | review-template --output FILE | score FILE\n'
        + 'All commands accept --skill recommerce-inspect|recommerce-buy; omitted selects all cases.');
      return command ? 0 : 2;
    }
    require(['validate', 'export', 'review-template', 'score'].includes(command), 'unknown command');
    const { values, positionals } = parseArgs({ args, strict: true, allowPositionals: command === 'score', options: {
      skill: { type: 'string' as const },
      ...(command === 'export' || command === 'review-template' ? { output: { type: 'string' as const } } : {}),
      ...(command === 'export' ? { 'with-skill': { type: 'boolean' as const } } : {}),
    } });
    const cases = loadCases(join(ROOT, 'checks', 'cases'), values.skill);
    if (command === 'validate') console.log(`Validated ${cases.length} casefiles (structure only).`);
    else if (command === 'export' || command === 'review-template') {
      require(typeof values.output === 'string' && values.output.trim(), '--output is required');
      if (command === 'export') {
        exportCases(cases, values.output, values['with-skill'] === true);
        console.log(`Exported ${cases.length} separate case inputs to ${values.output}.`);
      } else {
        mkdirSync(dirname(values.output), { recursive: true });
        writeNewJson(values.output, reviewTemplate(cases));
        console.log(`Created unscored review template at ${values.output}.`);
      }
    } else {
      require(positionals.length === 1 && positionals[0], 'score requires one review file');
      const summary = scoreReview(readJson(positionals[0]), cases);
      console.log(JSON.stringify(summary, null, 2));
      return summary.status === 'reviewed' ? 0 : 1;
    }
    return 0;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
