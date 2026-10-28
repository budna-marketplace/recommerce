import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { exportCases, loadCases, readJson, reviewTemplate, scoreReview, validateCase } from './check.ts';
import type { Casefile } from './check.ts';

function sample(): Casefile {
  return {
    skill: 'recommerce-inspect',
    id: 'rc-001', title: 'ANSWER-REVEALING TITLE', pair: 'identity', category: 'cordless-drills',
    request: 'Is this drill suitable?',
    evidence: [{ id: 'listing-1', kind: 'seller_claim', text: 'Empty box, 50 SEK.', observed_at: '2026-10-28T09:00:00Z' }],
    rubric: {
      hard_failures: [{ id: 'h1', text: 'Calls the box a drill.' }],
      usefulness: [{ id: 'u1', text: 'Explains that no drill is included.' }],
      acceptable_outcomes: ['Reject this listing.'],
    },
  };
}

function scratch(work: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), 'recommerce-test-'));
  try { work(directory); } finally { rmSync(directory, { recursive: true, force: true }); }
}

function reviewed() {
  const review = reviewTemplate([sample()]);
  review.run = { label: 'test', model: 'test', tool_setup: 'offline', source_ref: 'test', reviewer: 'test' };
  const response = review.cases[0]!;
  response.response = 'This is only a box.';
  response.rationale = 'Response correctly reads listing-1.';
  response.hard_failures.h1 = false;
  response.usefulness.u1 = true;
  return review;
}

test('case validation rejects malformed fields, duplicate ids, and missing timezone', () => {
  validateCase(sample());
  for (const change of [{ id: '../../escape' }, { request: '' }, { unknown: true }, { skill: '../answers' }, { skill: null }]) {
    assert.throws(() => validateCase({ ...sample(), ...change }));
  }
  const duplicate = sample();
  duplicate.evidence.push(structuredClone(duplicate.evidence[0]!));
  assert.throws(() => validateCase(duplicate));
  const timestamp = sample();
  timestamp.evidence[0]!.observed_at = '2026-10-28T09:00:00';
  assert.throws(() => validateCase(timestamp));
  const rules = sample();
  rules.rubric.usefulness[0]!.id = 'h1';
  assert.throws(() => validateCase(rules));
});

test('case filenames and nonempty suites are validated', () => scratch(directory => {
  assert.throws(() => loadCases(directory));
  writeFileSync(join(directory, 'rc-002.json'), JSON.stringify(sample()));
  assert.throws(() => loadCases(directory), /filename must match/);
}));

test('skill filtering is explicit and cannot silently select an unknown or empty suite', () => scratch(directory => {
  const inspect = sample();
  writeFileSync(join(directory, 'rc-001.json'), JSON.stringify(inspect));
  assert.throws(() => loadCases(directory, 'recommerce-buy'), /no cases match/);
  assert.throws(() => loadCases(directory, 'unknown'), /unknown skill/);
  const buy: Casefile = { ...sample(), id: 'rc-002', skill: 'recommerce-buy' };
  writeFileSync(join(directory, 'rc-002.json'), JSON.stringify(buy));
  assert.equal(loadCases(directory).length, 2);
  assert.deepEqual(loadCases(directory, 'recommerce-buy'), [buy]);
  assert.throws(() => scoreReview(reviewTemplate([buy]), [inspect, buy]), /case content has changed/);
}));

test('timestamps reject impossible dates while retaining leap days and timezone offsets', () => {
  const item = sample();
  item.evidence[0]!.observed_at = '2026-02-30T09:00:00Z';
  assert.throws(() => validateCase(item), /calendar date does not exist/);
  item.evidence[0]!.observed_at = '2024-02-29T00:30:00+02:00';
  validateCase(item);
});

test('export allowlists input, copies only skill, and rejects overwrite or repository leakage', () => scratch(directory => {
  const root = join(directory, 'repo');
  const skill = join(root, 'skills', 'recommerce-inspect');
  mkdirSync(skill, { recursive: true });
  writeFileSync(join(skill, 'SKILL.md'), 'Skill instructions');
  writeFileSync(join(root, 'answers.json'), 'SECRET RUBRICS');
  const output = join(directory, 'export');
  exportCases([sample()], output, true, root);
  const exported = JSON.parse(readFileSync(join(output, 'rc-001', 'input.json'), 'utf8'));
  assert.deepEqual(Object.keys(exported).sort(), ['evidence', 'instruction', 'request']);
  assert.deepEqual(exported.evidence, sample().evidence);
  assert.ok(!JSON.stringify(exported).includes(sample().title));
  const copied = join(output, 'rc-001', 'skills', 'recommerce-inspect');
  assert.deepEqual(readdirSync(copied), ['SKILL.md']);
  assert.equal(readFileSync(join(copied, 'SKILL.md'), 'utf8'), 'Skill instructions');
  assert.throws(() => exportCases([sample()], output, false, root));
  assert.throws(() => exportCases([sample()], join(root, 'export'), false, root));
  const link = join(directory, 'repo-link');
  symlinkSync(root, link, 'junction');
  assert.throws(() => exportCases([sample()], join(link, 'export'), false, root));
  symlinkSync(join(root, 'answers.json'), join(skill, 'leak'));
  assert.throws(() => exportCases([sample()], join(directory, 'unsafe'), true, root));
}));

test('mixed suites export each case with only its declared skill', () => scratch(directory => {
  const root = join(directory, 'repo');
  for (const name of ['recommerce-inspect', 'recommerce-buy']) {
    mkdirSync(join(root, 'skills', name), { recursive: true });
    writeFileSync(join(root, 'skills', name, 'SKILL.md'), name);
  }
  const cases: Casefile[] = [sample(), { ...sample(), id: 'rc-002', skill: 'recommerce-buy' }];
  const output = join(directory, 'export');
  exportCases(cases, output, true, root);
  for (const item of cases) {
    assert.deepEqual(readdirSync(join(output, item.id, 'skills')), [item.skill]);
    assert.equal(readFileSync(join(output, item.id, 'skills', item.skill, 'SKILL.md'), 'utf8'), item.skill);
    const input = JSON.parse(readFileSync(join(output, item.id, 'input.json'), 'utf8'));
    assert.deepEqual(Object.keys(input).sort(), ['evidence', 'instruction', 'request']);
  }
}));

test('pending ratings and missing metadata never look complete', () => {
  const empty = scoreReview(reviewTemplate([sample()]), [sample()]);
  assert.equal(empty.status, 'incomplete');
  assert.equal(empty.hard_failures.reviewed, 0);
  const review = reviewed();
  assert.equal(scoreReview(review, [sample()]).status, 'reviewed');
  review.cases[0]!.usefulness.u1 = null;
  assert.equal(scoreReview(review, [sample()]).status, 'incomplete');
  const missing = reviewed();
  missing.run.source_ref = '';
  assert.equal(scoreReview(missing, [sample()]).status, 'incomplete');
});

test('hard failure remains visible despite usefulness or pending ratings', () => {
  const review = reviewed();
  review.cases[0]!.hard_failures.h1 = true;
  const result = scoreReview(review, [sample()]);
  assert.equal(result.status, 'hard-failure');
  assert.deepEqual(result.hard_failures.case_ids, ['rc-001']);
  assert.equal(result.usefulness.met, 1);
  review.cases[0]!.usefulness.u1 = null;
  assert.equal(scoreReview(review, [sample()]).status, 'hard-failure');
});

test('missing, duplicate or unknown cases, bad ratings, and unsupported grades are rejected', () => {
  const mutations: ((value: ReturnType<typeof reviewed>) => void)[] = [
    r => { r.cases = []; },
    r => { r.cases.push(structuredClone(r.cases[0]!)); },
    r => { r.cases[0]!.id = 'rc-999'; },
    r => { r.cases[0]!.hard_failures = {}; },
    r => { r.cases[0]!.usefulness.unknown = true; },
    r => { Object.assign(r.cases[0]!.usefulness, { u1: 1 }); },
    r => { r.cases[0]!.response = ''; },
    r => { r.cases[0]!.rationale = ''; },
  ];
  for (const mutate of mutations) {
    const review = reviewed();
    mutate(review);
    assert.throws(() => scoreReview(review, [sample()]));
  }
});

test('a review cannot silently use changed evidence or rubric text with the same ids', () => {
  for (const part of ['evidence', 'rubric']) {
    const changed = sample();
    if (part === 'evidence') changed.evidence[0]!.text = 'A complete drill kit, not an empty box.';
    else changed.rubric.hard_failures[0]!.text = 'Invents a missing charger.';
    assert.throws(() => scoreReview(reviewed(), [changed]), /case content has changed/);
  }
});

test('JSON loading rejects overwritten and escaped-equivalent fields without confusing strings or nested objects', () => scratch(directory => {
  const path = join(directory, 'review.json');
  const valid = JSON.stringify(reviewed());
  for (const duplicate of ['"h1":true,"h1":false', '"h\\u0031":true,"h1":false']) {
    writeFileSync(path, valid.replace('"h1":false', duplicate));
    assert.throws(() => readJson(path), /duplicate JSON field: h1/);
  }
  const distinct = { text: '"h1": true, {escaped} \\ :', a: { h1: true }, b: [{ h1: false }] };
  writeFileSync(path, JSON.stringify(distinct));
  assert.deepEqual(readJson(path), distinct);
}));
