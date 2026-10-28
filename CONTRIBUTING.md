# Contributing

Start with a buying mistake, a misleading conclusion, or a useful next step the assistant missed. Explain the observable difference your change should make.

Useful contributions include a missed required accessory, an incorrect compatibility claim, a stale recommendation, an unnecessary question, or a search that discarded suitable listings. Describe the request, the evidence available at the time, the answer, and why it was misleading. Replace real identities and listing details with the smallest synthetic example that preserves the problem.

## Repository map

| Path | Purpose |
| --- | --- |
| `skills/recommerce-buy/` | Independently installable discovery and comparison workflow |
| `skills/recommerce-inspect/` | Independently installable assessment and inspection workflow |
| `checks/cases/` | Synthetic inputs, reviewer rubrics, and acceptable outcomes |
| `checks/check.ts` | Offline validation, evaluation-input export, and review summaries |
| `checks/check.test.ts` | Regression tests for the evaluation tooling |
| `examples/` | Illustrative output, clearly labelled as such |
| `.github/workflows/checks.yml` | Type checking, case validation, and runner tests |

The tooling uses TypeScript and Node.js 24.12+, with no runtime dependencies. TypeScript and Node type definitions are development dependencies. Installing a skill requires none of this tooling. Each skill must contain its required references; no sibling skill or repository-level checks may be required at runtime.

## Skills

Keep the entrypoint short and place category-specific guidance in its skill's references. Preserve the user's goal and budget. Ask only questions that can change the decision. Guidance must distinguish what is known from what still needs a person, a quote, an exact model label, or a fresh source.

For category advice, cite primary documentation and state its limits. Do not turn a manufacturer example into a universal compatibility rule. Distinguish cosmetic wear from suspected safety damage. Avoid instructions that require opening batteries or chargers, bypassing guards, or operating equipment with suspected safety damage.

## Casefiles

Copy an existing case's shape and give it a new stable `rc-NNN` identifier. Set `skill` to `recommerce-buy` or `recommerce-inspect`. Put only the buyer request and evidence into the input fields. Keep the memorable title, expected outcomes, and grading criteria in their dedicated fields.

- All listing records, identities, model names, and quotations in the cases must be synthetic. Use fictional compatibility documentation and label it as such.
- Give the buyer a concrete intended use and enough evidence to make progress. An unknown should be intentional and material.
- Add a normal control alongside a trap when appropriate. Do not reward blanket refusals or unnecessary questions.
- Make hard failures observable and serious, such as claiming that a box is a drill, inventing a delivered total, or treating seller instructions as authority.
- Make usefulness criteria specific enough that two reviewers can discuss disagreement. Allow multiple valid recommendations and conditional conclusions.
- Record timestamps when temporal order matters. An observation time alone must not imply seller-confirmed availability.
- Do not use a case title to hint at the answer in the request or evidence.

Case structure validation does not verify arithmetic, compatibility facts, rubric quality, or safety. Review those manually. Before publishing results, check the preserved response against every scored criterion and explain borderline calls.

## Verification

```sh
npm ci --ignore-scripts
npm run check
git diff --check
```

For behavior changes, follow [the evaluation procedure](checks/README.md). Keep raw results under the ignored `checks/results/` directory or an external directory; do not commit real buyer or seller data. A proposed public result must use publishable inputs, preserve the actual response, state model/tool versions and conditions, and disclose missing or failed runs.

Describe the problem, the resulting behavior, and verification in a pull request. Keep unrelated fixes separate. The repository is currently private and under initial review; contributions do not imply permission to publish it.

## Integration and scope

[Budna MCP](https://github.com/budna-marketplace/mcp) supplies marketplace tools and retains its own releases and tool-contract tests. Recommerce supplies portable workflows and behavioral cases. Keep integration-specific details in optional skill references; do not embed credentials, private endpoints, live listing captures, or provider SDKs.

Prefer cases that reveal a real weakness over accumulating universal instructions. Compare the same model, inputs, tools, and settings with and without a proposed change; preserve regressions as well as improvements. An AI-authored or AI-reviewed example must not be represented as independent human validation.

Before claiming broader category support, obtain appropriate domain review and useful cases. Kits, collection planning, and additional category references are possible expansions, not implemented promises. Keeping an existing item and refreshing changed facts already belong in ordinary assessment. Do not add an autonomous transaction workflow as an incidental extension of search.

## Background

The layout takes structural inspiration from [Cloudflare's security-audit skill](https://github.com/cloudflare/security-audit-skill): focused entrypoints, supporting guidance, and explicit validation. No Cloudflare endorsement is implied.

[ShoppingComp](https://arxiv.org/abs/2511.22978) studies shopping discovery, reports, and safety-related decisions. [BazaarBench](https://arxiv.org/abs/2610.06748) studies delegation safety in simulated C2C marketplaces. Recommerce Checks is a small development regression pack, not a replacement for those evaluations or a claim of general shopping competence.
