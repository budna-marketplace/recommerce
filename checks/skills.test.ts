import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep, win32 } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { marked } from 'marked';
import { parse } from 'yaml';
import { exportCases, loadCases } from './check.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAMES = ['recommerce-buy', 'recommerce-collect', 'recommerce-inspect', 'recommerce-keep',
  'recommerce-kits', 'recommerce-second-look'];

function validateSkill(skill: string): void {
  const entry = join(skill, 'SKILL.md');
  const content = readFileSync(entry, 'utf8');
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  assert.ok(frontmatter, `${entry}: missing YAML frontmatter`);
  const metadata: unknown = parse(frontmatter[1]!);
  assert.ok(metadata && typeof metadata === 'object' && !Array.isArray(metadata), `${entry}: metadata must be a mapping`);
  assert.ok('name' in metadata && typeof metadata.name === 'string'
    && metadata.name.length <= 64 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.name), `${entry}: invalid skill name`);
  assert.equal(metadata.name, basename(skill), `${entry}: name must match its folder`);
  assert.ok('description' in metadata && typeof metadata.description === 'string'
    && metadata.description.trim() && metadata.description.length <= 1024, `${entry}: invalid description`);

  for (const path of readdirSync(skill, { recursive: true, encoding: 'utf8' })) {
    if (!path.endsWith('.md')) continue;
    const file = join(skill, path);
    const markdown = file === entry ? content.slice(frontmatter[0].length) : readFileSync(file, 'utf8');
    marked.walkTokens(marked.lexer(markdown), token => {
      if (token.type !== 'link' && token.type !== 'image') return;
      const href: string = token.href;
      if (href.startsWith('#') || href.startsWith('//')) return;
      const label = `${file}: ${href}`;
      assert.ok(!win32.isAbsolute(href), `${label}: local links must be relative`);
      // shortcut: local targets use URL encoding; add entity decoding if filenames require it.
      const target = new URL(href, pathToFileURL(file));
      if (target.protocol !== 'file:') return;
      const destination = fileURLToPath(target);
      const local = relative(skill, destination);
      assert.ok(local !== '..' && !local.startsWith(`..${sep}`) && !isAbsolute(local), `${label}: link escapes skill`);
      assert.ok(existsSync(destination), `${label}: missing local link target`);
    });
  }
}

function validatePackages(root: string, output: string): void {
  const names = readdirSync(join(root, 'skills'), { withFileTypes: true })
    .filter(entry => entry.isDirectory() || entry.isSymbolicLink()).map(entry => entry.name).sort();
  assert.deepEqual(names, NAMES, 'skill folders must match supported workflows');
  const cases = loadCases(join(root, 'checks', 'cases'));
  assert.deepEqual([...new Set(cases.map(item => item.skill))].sort(), names, 'case coverage must match skill folders');
  const selected = names.map(name => cases.find(item => item.skill === name)!);
  exportCases(selected, output, true, root);
  for (const item of selected) {
    const installed = join(output, item.id, 'skills');
    assert.deepEqual(readdirSync(installed), [item.skill], 'export must contain only the selected skill');
    validateSkill(join(installed, item.skill));
  }
}

function scratch(work: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), 'recommerce-skills-'));
  try { work(directory); } finally { rmSync(directory, { recursive: true, force: true }); }
}

function fixture(work: (root: string, output: string) => void): void {
  scratch(directory => {
    const root = join(directory, 'repo');
    cpSync(join(ROOT, 'skills'), join(root, 'skills'), { recursive: true });
    cpSync(join(ROOT, 'checks', 'cases'), join(root, 'checks', 'cases'), { recursive: true });
    work(root, join(directory, 'export'));
  });
}

test('real skills have valid metadata, case coverage, and self-contained installations', () => scratch(directory => {
  validatePackages(ROOT, join(directory, 'export'));
}));

test('package validation rejects missing skills, entrypoints, and case coverage', () => {
  for (const missing of ['skills', 'skills/recommerce-buy', 'skills/recommerce-buy/SKILL.md']) {
    fixture((root, output) => {
      rmSync(join(root, missing), { recursive: true });
      assert.throws(() => validatePackages(root, output));
    });
  }
  fixture((root, output) => {
    for (const item of loadCases(join(root, 'checks', 'cases'), 'recommerce-buy')) {
      rmSync(join(root, 'checks', 'cases', `${item.id}.json`));
    }
    assert.throws(() => validatePackages(root, output), /case coverage/);
  });
});

test('metadata accepts YAML strings and rejects invalid, duplicate, missing, or mismatched fields', () => {
  const invalid = ['No frontmatter', '---\nname: [broken\n---', '---\n- name\n---',
    ...['description: Valid description', 'name: recommerce-buy',
      'name: recommerce-buy\nname: recommerce-buy\ndescription: Valid description',
      'name: recommerce-inspect\ndescription: Valid description',
      'name: Recommerce-Buy\ndescription: Valid description',
      'name: recommerce--buy\ndescription: Valid description',
      `name: ${'x'.repeat(65)}\ndescription: Valid description`,
      'name: recommerce-buy\ndescription: 42', 'name: recommerce-buy\ndescription: " "',
      `name: recommerce-buy\ndescription: ${'x'.repeat(1025)}`].map(value => `---\n${value}\n---\n`)];
  fixture((root) => {
    const skill = join(root, 'skills', 'recommerce-buy');
    for (const text of invalid) {
      writeFileSync(join(skill, 'SKILL.md'), text);
      assert.throws(() => validateSkill(skill), text);
    }
    writeFileSync(join(skill, 'SKILL.md'), '---\nname: "recommerce-buy"\ndescription: >\n  A folded description\n  spanning two lines.\n---\n# Instructions\n');
    validateSkill(skill);
  });
});

test('local inline, image, and reference links must exist and stay inside the installed skill', () => {
  fixture(root => {
    const skill = join(root, 'skills', 'recommerce-buy');
    for (const target of ['../../recommerce-inspect/SKILL.md', '%2e%2e/%2e%2e/recommerce-inspect/SKILL.md']) {
      writeFileSync(join(skill, 'references', 'discovery.md'), `[sibling][guide]\n\n[guide]: ${target}`);
      assert.throws(() => validateSkill(skill), /link escapes skill/);
    }
  });
  for (const link of ['[missing](missing.md)', '![missing](missing.png)',
    '[escape](../../answers.md)',
    '[escape][guide]\n\n[guide]: ../../answers.md', '[absolute](/tmp/answers.md)',
    '[windows](C:/answers.md)', '[file](file:///tmp/answers.md)']) {
    fixture((root, output) => {
      writeFileSync(join(root, 'skills', 'recommerce-buy', 'references', 'discovery.md'), link);
      assert.throws(() => validatePackages(root, output), /missing local link target|link escapes skill|local links must be relative/);
    });
  }
  fixture((root, output) => {
    const references = join(root, 'skills', 'recommerce-buy', 'references');
    writeFileSync(join(references, 'a guide (1).md'), '# Guide\n');
    writeFileSync(join(references, 'discovery.md'), '[guide][ref]\n\n[ref]: <a%20guide%20(1).md#guide>\n\n'
      + '[external](https://example.invalid/unavailable) [section](#heading)\n\n`[code](missing.md)`\n\n```md\n[example](missing.md)\n```\n');
    validatePackages(root, output);
  });
});

test('real-package exports reject symlinks to repository resources', () => fixture((root, output) => {
  const target = join(root, 'answers.md');
  writeFileSync(target, 'Private grading material');
  symlinkSync(target, join(root, 'skills', 'recommerce-buy', 'references', 'leak.md'));
  assert.throws(() => validatePackages(root, output), /must not contain symlinks/);
}));
