# Contributing to Recommerce

Help improve the decisions these skills produce. Report misleading recommendations, missed dependencies, or unnecessary questions. Contribute clearer guidance and realistic cases the checks do not cover.

## Report a problem

Describe:

- What the person asked and the constraints that mattered.
- What evidence and tools the assistant had.
- What it recommended, and the specific mistake or omission.
- What a useful answer should have established or asked next.

Use a small synthetic example in place of real listings, identities, addresses, or private conversations. Include the skill, model, and relevant tool versions when known. A reproducible mistake is more useful than a general request to make the skill smarter.

## Improve a skill

Choose the workflow that owns the decision:

| Skill folder | Contributions belong here when they concern… |
| --- | --- |
| `skills/recommerce-buy/` | Discovery, candidate comparison, purchase terms, and complete costs |
| `skills/recommerce-kits/` | Component dependencies, compatibility, substitutions, and a shared budget |
| `skills/recommerce-inspect/` | Listing-specific condition questions and inspection guidance |
| `skills/recommerce-collect/` | Access, transport, handling, disassembly constraints, and collection costs |
| `skills/recommerce-keep/` | Keeping, maintenance, repair, upgrade, and replacement decisions |
| `skills/recommerce-second-look/` | Changes to an earlier recommendation and facts still unverified |

Start with `SKILL.md`. Add the smallest instruction that addresses the demonstrated failure. Keep the entrypoint focused; put substantial category-specific guidance in a reference inside that skill's folder, linked from the entrypoint.

Each skill must remain independently installable. Preserve the complete repository `LICENSE` in every skill folder so its copyright and permission notices remain in standalone installations. Do not require sibling skills, repository-level checks, local machine paths, credentials, or private endpoints. Reuse an existing workflow when it fits rather than introducing another skill for a minor variation.

For technical or category advice, cite applicable primary documentation. Match the actual model and variant; do not generalize an example into a universal rule. Keep seller claims, specifications, and human observations distinct. Ordinary uncertainty should not automatically block a reasonable decision, and a short checklist must not imply certification.

Keep search and assessment separate from transactions. Changes must not grant permission to message sellers, reserve items, bid, purchase, book transport, or perform repairs.

## Add a casefile

1. Copy a relevant file from `checks/cases/` and choose an unused `rc-NNN` identifier. Match the filename to that ID.
2. Set `skill` to the owning skill's directory name. Write the buyer request and the evidence that was actually available in the scenario.
3. Add observable hard failures, useful behaviors, and acceptable outcomes. Several answers may be valid; the rubric should test the decision rather than exact wording.
4. Add a normal control when useful. A missing charger should be caught, but a confirmed included charger should not trigger another unnecessary question.
5. Manually check arithmetic, timing, compatibility assumptions, and whether the evidence supports the expected outcome.

Keep every marketplace record, identity, product name, and quote in the case synthetic. Label fictional documentation. Give the buyer enough information to make progress; missing information should be intentional and consequential.

Put answer-revealing titles, rubrics, and expected outcomes only in their dedicated fields. The evaluated assistant receives the request and evidence, not the answer key. Record source event and observation times when they affect the decision.

For a new independently installable workflow, also add its name to the runner's accepted skill list and extend the routing/export test. Discuss a proposed new workflow before building a separate integration or framework.

## Validate the change

The development tooling uses TypeScript and Node.js 24.12+. From the repository root:

```sh
npm ci --ignore-scripts
npm run check
git diff --check
```

`npm run check` verifies TypeScript, casefile structure, runner behavior, and each skill's metadata and self-contained package. It catches missing skills, broken local Markdown links, and references outside the installed skill. It does not grade shopping advice. Add a focused regression test when changing non-trivial runner logic; prose edits do not need tests that merely match their wording.

For a skill change, verify discovery:

```sh
npx skills add . --list
```

Then exercise realistic inputs with only the installed skill and its own references available. Follow [Recommerce Checks](checks/README.md) for exporting inputs, recording responses, and reviewing results. Compare the same model, evidence, tools, and settings when claiming improvement. Preserve regressions and unresolved results as well as successes.

## Submit the contribution

Open a focused pull request explaining the concrete problem, resulting behavior, and validation. Include a minimized case or before/after example when it helps a reviewer understand the change. Separate unrelated fixes.

Commit curated synthetic cases and their rubrics. Keep generated responses, temporary exports, and run artifacts in the ignored `checks/results/` directory or outside the checkout. A deliberately published evaluation should preserve publishable inputs, actual responses, versions, grading method, and failures; identify AI-assisted review as such.

Do not include live listing captures, personal information, secrets, or private source material.
