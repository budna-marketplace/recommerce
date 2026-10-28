# Recommerce by Budna

**Buy used with fewer unknowns.**

Portable agent skills for researching second-hand purchases. Recommerce covers discovery, complete setups, inspection, collection planning, repair-versus-replacement decisions, and reassessment before commitment.

A listing is incomplete, changing evidence. The skills distinguish what a seller claims, what product documentation supports, and what still needs verification. The objective is a suitable purchase at a supported total cost—including the option to keep an existing item.

## Skills

| Skill | Purpose | Output |
| --- | --- | --- |
| **[Buy](skills/recommerce-buy/SKILL.md)** | Find and compare potential purchases. | A source-backed shortlist with fit, complete costs, tradeoffs, and decisive unknowns. |
| **[Kits](skills/recommerce-kits/SKILL.md)** | Assemble a working setup from multiple items. | A compatible bill of materials, required accessories, alternatives, and one shared budget. |
| **[Inspect](skills/recommerce-inspect/SKILL.md)** | Assess an item before purchase or collection. | A listing-specific inspection card separating claims, useful checks, and unresolved condition. |
| **[Collect](skills/recommerce-collect/SKILL.md)** | Determine whether collection is practical. | A route and transport plan with measurements, disassembly constraints, costs, and blockers. |
| **[Keep](skills/recommerce-keep/SKILL.md)** | Compare keeping, repairing, upgrading, or replacing. | A conditional comparison of future costs, suitability, downtime, and uncertainty. |
| **[Second Look](skills/recommerce-second-look/SKILL.md)** | Reassess an earlier recommendation before committing. | A change report and updated decision: what changed, what remains supported, and what was not rechecked. |

Each skill works independently with evidence the host can access: listings, specifications, measurements, quotes, or a previous assessment. Available read-only tools can supply current evidence; [Budna MCP](https://github.com/budna-marketplace/mcp) is an optional integration.

## Usage

After installing, ask your assistant:

```text
Find a complete used cordless drill delivered to Gothenburg for under
1,000 SEK. I need it for furniture assembly and already own suitable bits.
```

```text
Build a two-person podcast setup from these used listings. I have a laptop
and headphones; include every required connection within 2,000 SEK.
```

```text
Inspect this drill listing before tomorrow's viewing. Give me the checks
that could change my decision, distinguishing seller claims, model
documentation, and observed condition.
```

```text
Can I collect this wardrobe in my van? Check both access routes, packed
dimensions, payload, disassembly requirements, and total collection cost.
```

```text
Compare this laptop repair quote with these used replacements. I need it
for another year; account for downtime and costs still unconfirmed.
```

```text
Take a second look at yesterday's shortlist before I commit. Recheck the
decisive facts and show what changes the recommendation.
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

For other Agent Skills-compatible hosts with GitHub import, select the relevant folder in [skills/](https://github.com/budna-marketplace/recommerce/tree/main/skills). Import the complete folder, including its references. Hosts without skill support cannot install these as persistent skills.

**Review status:** these remote instructions become usable once the skill folders are pushed. The repository is currently private, so installation also requires GitHub access.

## Design principles and scope

- **Claims retain their sources.** Model specifications do not certify a particular used unit; ratings and identity badges do not establish condition.
- **Compare usable totals.** Required accessories, fees, delivery, and collection costs belong in the decision. A current auction bid is not a guaranteed purchase price.
- **Respect the buyer's constraints.** Do not silently relax requirements, invent availability, or fill a shortlist with unsuitable options.
- **Keep assessment separate from transactions.** The skills do not contact sellers, reserve items, bid, or purchase. They do not certify condition, authenticity, or future availability.

**Private review draft.** These are general decision workflows; examples rely on supplied or verified specifications and quotes. Inspect's detailed category guidance currently focuses on cordless drills. No workflow certifies physical condition, safe handling, repair success, or future availability.

[Recommerce Checks](checks/README.md) contains synthetic regression cases and an offline evaluation workflow. These support development, not a claim of general reliability. See [CONTRIBUTING.md](CONTRIBUTING.md) for repository structure, development checks, and how to contribute cases or improvements.

[MIT](LICENSE).
