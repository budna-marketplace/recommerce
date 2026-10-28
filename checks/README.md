# Recommerce Checks

A small regression pack for six second-hand decision workflows: 44 synthetic cases—17 for Inspect, 11 for Buy, and four each for Kits, Collect, Keep, and Second Look. They are contrast cases, not single-variable experiments or evidence of broad shopping competence.

## What is checked

| Case pair | Failure and control |
| --- | --- |
| [001](cases/rc-001.json) / [002](cases/rc-002.json) | Empty packaging versus the actual tool kit |
| [003](cases/rc-003.json) / [004](cases/rc-004.json) | Missing essentials versus a complete offered setup |
| [005](cases/rc-005.json) / [006](cases/rc-006.json) | Component mismatch versus exact-model compatibility |
| [007](cases/rc-007.json) / [008](cases/rc-008.json) | Unknown delivery versus a total at an inclusive budget limit |
| [009](cases/rc-009.json) / [010](cases/rc-010.json) | Sold status versus a current seller availability claim |
| [011](cases/rc-011.json) / [012](cases/rc-012.json) | Malicious versus ordinary seller content when keeping an existing tool makes sense |

The extended Inspect cases cover [adequate prior observation](cases/rc-013.json), [pre-payment risk](cases/rc-014.json), [model-revision scope](cases/rc-015.json), [integrated batteries](cases/rc-016.json), and [unsafe battery testing](cases/rc-027.json).

Buy cases cover [auction versus complete purchase prices](cases/rc-017.json), [no qualifying options](cases/rc-018.json), [unknown costs](cases/rc-019.json), [duplicate listings](cases/rc-020.json), [changed availability and unidentified models](cases/rc-021.json), [search failures](cases/rc-022.json), [monitor compatibility](cases/rc-023.json), [furniture logistics](cases/rc-024.json), [seller instructions and reputation](cases/rc-025.json), [missing search tools](cases/rc-026.json), and [mixed currencies](cases/rc-028.json).

The other workflows each have four focused cases:

| Skill | Cases | Focus |
| --- | --- | --- |
| Kits | `rc-029`–`rc-032` | Complete signal/component paths, owned parts, shared costs, and changed components |
| Collect | `rc-033`–`rc-036` | Access routes, measured controls, vehicle limits, and disassembly constraints |
| Keep | `rc-037`–`rc-040` | Future repair/replacement costs, uncertain diagnoses, sunk costs, and affordability |
| Second Look | `rc-041`–`rc-044` | Changed terms, unverified freshness, item identity, and supported unchanged decisions |

Each case declares its `skill` and has a buyer request, source-labelled synthetic evidence, hard-failure criteria, usefulness criteria, and acceptable outcomes. Multiple conclusions can be reasonable. Review observable behavior, not wording or whether the assistant matches one model answer.

The TypeScript runner checks structure and records human reviews. It does not judge natural-language responses, prove technical facts, or validate arithmetic embedded in prose. Exact-money handling, data projection, and tool-permission mechanics belong in their respective integration tests; these cases test the assistant's conclusions from supplied evidence.

## Local verification

Node.js 24.12+ runs the TypeScript directly. The runner and its tests use Node's built-in APIs. TypeScript and Node definitions are development dependencies for static checking.

```sh
npm ci --ignore-scripts
npm run check
```

To validate only the casefiles without installing development dependencies:

```sh
node checks/check.ts validate
```

Every command optionally accepts `--skill` with one of `recommerce-buy`, `recommerce-kits`, `recommerce-inspect`, `recommerce-collect`, `recommerce-keep`, or `recommerce-second-look`. Omit the flag to use all cases. Keep the same selection when exporting inputs, creating a review template, and scoring that review. Unknown skills and empty selections are rejected.

These commands do not call a model or a marketplace. They do not establish that the skill improves decisions.

## Prepare a matched evaluation

Export baseline and skill inputs to two **new directories outside the checkout**. The paths below are examples for macOS/Linux; on other systems choose equivalent writable external paths. Existing directories are refused to avoid overwriting a prior run.

```sh
node checks/check.ts export --output /tmp/recommerce-baseline
node checks/check.ts export --output /tmp/recommerce-with-skill --with-skill
```

Each export contains one directory per case with `input.json`. The skill export also contains that case's complete declared skill folder, with no sibling skill. Titles, skill labels, pairs, rubrics, and acceptable outcomes are not included in `input.json`.

For each case, use a fresh agent context with access only to that case directory:

1. Run the baseline on `input.json` with no Recommerce skill loaded.
2. Run the skill condition with the same model version, tools, settings, and request, explicitly loading the one exported skill.
3. Use only the supplied evidence for these offline cases. Do not browse fictional products or make live marketplace calls. Source timestamps belong to the scenario, not the real run date.
4. Preserve each complete response, relevant tool trace, elapsed time, and tool-call count. Record the model/version and exact source commit; identify a dirty working tree if applicable.
5. Have a reviewer apply the source case's rubric to both responses, preferably without knowing which condition produced each one. Explain borderline ratings and disagreements.

Do not give the evaluated assistant this README, the original casefile, other cases' responses, the example output, or grading material. A title such as “The bargain is the box” reveals the answer. Exporting inputs is not an OS sandbox: configure the evaluation host so the agent cannot inspect the source checkout, sibling runs, or previously loaded skills. If the host cannot provide that separation, disclose the contamination risk and do not label the run blind or isolated.

## Record and summarize reviews

Create a separate review file for each condition:

```sh
node checks/check.ts review-template --output checks/results/baseline.json
node checks/check.ts review-template --output checks/results/with-skill.json
```

Fill the `run` fields: `label`, `model`, `tool_setup`, `source_ref`, and `reviewer`. Use `tool_setup` to record settings, actual skill loading, any tools used, and relevant restrictions. Record the evaluation date and repeat identifier in the label or rationale. Keep external timing/tool traces with the run; the summary does not infer them.

Keep the generated `suite_digest` unchanged. It binds the review to the case content used to create the template. Scoring against changed evidence or rubrics is rejected even if the criterion IDs stayed the same. To reproduce an older result, use its original case version; to evaluate changed cases, create a new template and regrade. The digest detects a mismatched suite, not fabricated responses or grades.

For every case, preserve its `id`, paste the complete assistant `response`, and explain the grading in `rationale`. Fill the maps using the criterion IDs in the source rubric:

| Field | `true` | `false` | `null` |
| --- | --- | --- | --- |
| `hard_failures` | The assistant committed this failure | The failure was not observed | Not reviewed |
| `usefulness` | The assistant met this criterion | The assistant did not meet it | Not reviewed |

Every rated case needs a response and rationale. Missing metadata or pending criteria prevent a complete review. Missing, duplicated, or unknown case/rule IDs are rejected. Retain unreviewed cases rather than dropping difficult or failed runs.

```sh
node checks/check.ts score checks/results/baseline.json
node checks/check.ts score checks/results/with-skill.json
```

The JSON summary reports hard-failure violations and affected case IDs separately from usefulness criteria met. It has no combined quality score. `reviewed` means that grading is complete, not that every usefulness criterion passed. A hard failure remains visible regardless of usefulness.

Exit status is `0` for a completed review without hard failures, `1` for an incomplete review or a recorded hard failure, and `2` for malformed inputs or command errors. An empty template is deliberately incomplete.

Compare like-for-like summaries and inspect the underlying responses. Report new errors as well as prevented errors. Repeated runs and independently authored variants are needed before drawing a performance conclusion. Do not present a single successful example or this small public pack as proof of general reliability.

`checks/results/` is ignored by Git. Do not upload real buyer/seller information with results. Any future published run should preserve the actual synthetic inputs, responses, rubric version, model/settings, failures, and review method.

## Current limits

- Cases use supplied text and timestamps. Buy cases test reasoning over search/detail records and next steps, not actual tool execution. Freshness cases test interpretation of changed records, not live refresh scheduling. Stateful tool-hand-off exercises need a separate recorded transcript.
- No current case tests actual image interpretation or physical condition. The small monitor/furniture examples exercise supplied evidence and do not establish category expertise.
- Public examples can be memorized. Keep reviewer material out of input contexts and use new variants when measuring improvement.
- Human rubric judgments can disagree. Structure validation does not settle those disagreements.
- No matched baseline-versus-skill results are claimed in this draft. Category guidance and case acceptance criteria still need owner/domain review before release.
