# Context Quality Rubric

A+ benchmark for each context file. Grade by counting what's present vs what's listed.

## AGENTS.md

- Role and identity statement
- Capabilities (what it does)
- Operating constraints (what it doesn't do)
- Draft/commit model explained
- Context layer inventory

## COMPANY.md

- Legal name, trade names, parent/subsidiary structure
- All locations with functions (manufacturing, sales, engineering)
- Employee count and revenue band
- Verticals served with competitive positioning
- Channel strategy (direct, distributor, OEM, aftermarket)
- Full product portfolio with families, technology types, complexity, status, and legacy migrations
- Configuration character (ETO/CTO, session profile, selection methodology, nomenclature)
- Standards and regulatory landscape
- Current C1C environment (tenant, product counts, naming conventions, known patterns, integrations)
- Pricing methodology and lead times
- Data sensitivity and compliance requirements

## VERTICAL.md

- Vertical snapshot (what they build, how they sell, configuration character)
- Vocabulary and terminology map with C1C landing
- Typical product modeling patterns (decomposition, input group structure, global products, nested configs)
- Typical rule patterns with C1C mechanism
- Typical BOM and skeleton patterns
- Integration expectations (upstream, downstream, adjacent systems)
- Document types and interpretation cues
- Downstream user expectations (sales, engineering, end customer)
- Common mis-modeling patterns
- Edge cases and guardrail triggers

## TEAM.md

- Primary user name, role, department, location, experience
- Scope of responsibility (which products/families)
- Collaborators and team size
- Reporting structure
- Workflow preferences and known pain points

## PRODUCT.md

- Product name and family
- Source documents ingested (with page counts and assessment)
- Model estimates (inputs, rules, BOMs)
- Configuration character specific to this product
- Known constraints and interdependencies
- Build history (what was generated, what was edited)
