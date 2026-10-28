# Recommerce by Budna

**Buy used with fewer unknowns.**

Portable agent skills for researching second-hand purchases. Recommerce combines listing discovery, exact-model compatibility checks, complete-cost comparisons, and practical inspection guidance in a repeatable decision workflow.

A listing is incomplete, changing evidence. The skills distinguish what a seller claims, what product documentation supports, and what still needs verification. The objective is a suitable purchase at a supported total cost—including the option to keep an existing item.

## Skills

| Skill | Purpose | Output |
| --- | --- | --- |
| **[Recommerce Buy](skills/recommerce-buy/SKILL.md)** | Discover listings, compare supplied candidates, or reassess an existing shortlist. | A source-backed shortlist with complete costs or explicit unknowns, compatibility evidence, tradeoffs, and a recommended next step. |
| **[Recommerce Inspect](skills/recommerce-inspect/SKILL.md)** | Assess a specific item before purchase or collection. | A listing-specific decision and inspection card: suitability, included essentials, material questions, safe checks, and remaining uncertainty. |

Both skills work independently with supplied listing text, links, or images the host can access. Buy also uses available read-only search tools. [Budna MCP](https://github.com/budna-marketplace/mcp) is an optional integration.

## Workflow

1. Establish intended use, budget, compatibility requirements, and delivery or collection constraints.
2. Identify the actual item and purchase terms, then inspect the strongest candidates beyond their search summaries.
3. Reconcile model documentation, listing claims, costs, and relevant observations.
4. Separate supported options from conditional leads and established mismatches.
5. Recheck changing facts when possible and return a concise recommendation with the next useful action.

The result may be one candidate, a short comparison, or no qualifying option. Ordinary used-item uncertainty should remain visible without becoming an endless checklist.

## Usage

After installing, ask your assistant:

```text
Find a complete used cordless drill delivered to Gothenburg for under
1,000 SEK. I need it for furniture assembly and already own suitable bits.
```

```text
Compare these monitor listings for my laptop. Check the exact model and
port requirements, included cables, and total cost before ranking them.
```

```text
Inspect this drill listing before tomorrow's viewing. Give me the checks
that could change my decision, distinguishing seller claims, model
documentation, and observed condition.
```

Provide the intended use and constraints you know. The assistant should ask only for missing information that changes the decision. See an [illustrative inspection card](examples/drill-inspection.md).

## Installation

Install directly from GitHub with the [Skills CLI](https://github.com/vercel-labs/skills):

```sh
npx skills add budna-marketplace/recommerce
```

The installer lets you choose the skills and supported agents. To install only Buy:

```sh
npx skills add budna-marketplace/recommerce --skill recommerce-buy
```

Add `--global` to make the skill available across projects. No manual clone or repository-level check tooling is needed.

For other Agent Skills-compatible hosts with GitHub import, use the [Buy skill folder](https://github.com/budna-marketplace/recommerce/tree/main/skills/recommerce-buy) or [Inspect skill folder](https://github.com/budna-marketplace/recommerce/tree/main/skills/recommerce-inspect). Import the complete folder, including its references; each skill works independently. Hosts without skill support cannot install these as persistent skills.

**Review status:** these remote instructions become usable once the skill folders are pushed. The repository is currently private, so installation also requires GitHub access.

## Design principles and scope

- **Claims retain their sources.** Model specifications do not certify a particular used unit; ratings and identity badges do not establish condition.
- **Compare usable totals.** Required accessories, fees, delivery, and collection costs belong in the decision. A current auction bid is not a guaranteed purchase price.
- **Respect the buyer's constraints.** Do not silently relax requirements, invent availability, or fill a shortlist with unsuitable options.
- **Keep assessment separate from transactions.** The skills do not contact sellers, reserve items, bid, or purchase. They do not certify condition, authenticity, or future availability.

**Private review draft.** Inspect's category guidance currently focuses on cordless drills. Buy applies a general research workflow; broader examples rely on supplied or verified specifications, not established category expertise.

[Recommerce Checks](checks/README.md) contains synthetic regression cases and an offline evaluation workflow. These support development, not a claim of general reliability. See [CONTRIBUTING.md](CONTRIBUTING.md) for repository structure, development checks, and how to contribute cases or improvements.

[MIT](LICENSE).
