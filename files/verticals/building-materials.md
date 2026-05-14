# Building Materials and Construction Products — Vertical Profile

## How to use this document

This profile gives the Agent the vertical-specific grounding it needs to recognize Building Materials and Construction Products vocabulary, propose typical structures when building new items, and flag likely vertical considerations during edits. It is one of four grounding layers consulted on every request.

**Precedence.** This profile is a prior, not a ground truth. When the customer layer shows the actual environment diverging from what this profile describes, the customer layer wins. The profile never licenses the Agent to override the Admin’s actual configuration.

**Companion documents.** For C1C mechanics referenced in this profile, retrieve alongside: `c1c-data-modeling-best-practices.md`, `c1c-rule-configuration-best-practices.md`, `c1c-bom-best-practices.md`, `c1c-configurator-ux-best-practices.md`, and `c1c-industry-best-practices-agent-guidance.md`. For worked examples of Products, rules, skeletons, and BOMs specific to this vertical, retrieve the Configuration Design deliverable filtered by vertical ID `building_materials_construction`.

**Profile scope.**
- **Vertical:** Building Materials and Construction Products
- **Vertical ID:** `building_materials_construction`
- **Template version:** 1.0
- **Last updated:** 2026-04-23
- **Primary C1C modules:** Configuration Interface, Bill of Materials, Product Model, Nested Configuration
- **Common co-verticals:** `hvac_climate_control` (building-project scope often includes HVAC), `industrial_machinery_equipment` (construction equipment)
- **Primary regions:** Both (US and EU; regional codes diverge significantly — IECC vs. EN standards, state-level fire codes)

---

## 1. Vertical snapshot

**What they build.** Fenestration (windows, doors, curtain walls, storefront, skylights), roofing systems, insulation and air-barrier panels, fencing and railing, architectural hardware, wall panels, and similar envelope and interior components. Mix of standard catalog items and configurable-to-order products with size-to-order being the dominant customization axis.

**How they sell.** Through dealer and distributor networks for residential and light commercial; direct to general contractors and subcontractors for commercial projects; through takeoff-driven project quotes for large builds. Architects and specifiers influence selection but rarely purchase directly. Consultants and specifiers shape specifications months before purchase.

**Configuration character.** Project-driven — quotes typically bundle many line items (e.g., every opening in a building) under a project structure, often organized by building elevation, floor, or section. Size-to-order customization within standard performance classes is the dominant configurator pattern. Takeoff inputs from architectural drawings drive the configuration rather than direct rep decisions.

**Where C1C work concentrates.** Nested configuration for project-level quotes, Driven Inputs for size-to-performance matrices, Iterators for repeated openings or panels, and BOM Logic for material / hardware / finish combinations.

**Applies to:** new · edit · both &nbsp; **Outcome:** foundation for all downstream retrieval &nbsp; **Downstream:** n/a (context, not recommendation)

---

## 2. Vocabulary and terminology map

| Term | What it is | Typical C1C landing | Notes / traps |
|---|---|---|---|
| Rough opening (RO) | Framed opening dimension before the product is installed | Input values for width and height, or paired Inputs | Cross-checked against product dimensions in a Logic Item to confirm fit with tolerance |
| U-Factor | Rate of non-solar heat flow through fenestration | Attribute on configurations (not a user Input) | Primary energy-performance metric; driven by glazing, frame, and spacer selection |
| SHGC | Solar Heat Gain Coefficient — fraction of solar radiation transmitted | Attribute on configurations | Paired with U-Factor as the main ENERGY STAR criteria |
| VT | Visible Transmittance — fraction of visible light transmitted | Attribute on configurations | Secondary NFRC-labeled metric |
| AL | Air Leakage — air flow through fenestration at test pressure | Attribute on configurations | NFRC-labeled when certified; AAMA/WDMA also specify air leakage |
| CR | Condensation Resistance — rated ability to resist condensation | Attribute on configurations | Optional NFRC metric; not always published |
| NFRC label | Energy performance rating label with U-Factor, SHGC, VT, AL, CR | Product Output representation; NFRC rating data as Attributes | Required for ENERGY STAR qualification; the rating is combination-specific like AHRI in HVAC |
| ENERGY STAR | Voluntary government program for energy-efficient products | Attribute on configurations, typically derived from U-Factor / SHGC | Climate-zone-specific criteria |
| Fire rating | Rated duration of fire resistance for an assembly (e.g., 20, 45, 60, 90, 180 minutes) | Attribute on configurations | Governed by NFPA 80 for fire doors, UL10B / UL10C for testing |
| CSI MasterFormat | 50-division standard for organizing construction specifications | Not a C1C construct; contextual reference only | Used to organize takeoffs and quote line items; Division 08 covers openings, Division 07 thermal / moisture protection |
| Takeoff | Quantity / material list extracted from project drawings | Input source document; often imported as a CSV or Excel file | Takeoffs are what drive project quotes; extraction from takeoff documents is a frequent document-driven change |
| Submittal | Document package sent to architect / GC for approval before manufacture | Product Output | Includes shop drawings, performance data, sample assemblies; rejection loops back into configuration changes |
| Shop drawing | Manufacturer-produced drawing showing how the product will be built | Product Output (CAD-driven) | Generated per configuration; revisions during submittal review |
| Takeoff software (Bluebeam, PlanSwift, STACK, Autodesk Takeoff, On-Screen Takeoff) | Tools the specifier / estimator uses upstream | Not a C1C construct; contextual reference only | Output from these tools often becomes the source document attached to a configuration request |
| LEED | Green building rating system from USGBC | Attribute on configurations; drives optional documentation | Credit contribution (EA credit for energy, MR credit for materials) is the typical configurator touch point |
| Curtain wall | Non-load-bearing building exterior wall system | Product-level category; curtain walls often modeled with Iterators for mullion spacing | Typically project-configured with many openings per system |
| Storefront | Light commercial glazing system | Product-level category | Similar configurator pattern to curtain wall but smaller scale |
| Mullion | Vertical member between window / door openings in a frame | Input or Item Master | Spacing drives Iterator count in curtain-wall configurations |
| Wind load | Structural loading from wind per local code | Attribute or Input; project-driven from site data | Drives glass thickness and frame reinforcement |
| Design pressure (DP) | Tested wind-load rating for fenestration assemblies | Attribute on configurations | Performance class; governed by AAMA/WDMA testing |
| Impact rating / HVHR | Hurricane-impact-rated assembly for high-velocity hurricane zones | Attribute on configurations | Miami-Dade notice of acceptance (NOA) is the common reference |
| U-Factor zone (US) / U-value (EU) | Same physics, different regional terminology | Attribute; regional mapping | Don’t conflate — U-Factor (US) uses BTU/(hr·ft²·°F), U-value (EU) uses W/(m²·K) |

**Applies to:** new · edit · both &nbsp; **Outcome:** Agent credibility, faster Q&A response &nbsp; **Downstream:** n/a (recognition layer)

---

## 3. Typical product modeling patterns

### 3.1 Typical Product decomposition

Building Materials customers typically create one C1C Product per product line or system (e.g., "Double-Hung Window," "Sliding Patio Door," "Aluminum Storefront System," "Standing Seam Metal Roof"). Size is an Input (often a width / height pair), glazing is an Input with multiple glass-type Values, finish is an Input, and performance attributes (U-Factor, SHGC, fire rating) are Attributes derived from the Input combination rather than user choices. Project-level quotes with many openings are typically modeled as nested parent-project configurations with per-opening child configurations — this mirrors how specifiers and estimators think (project > building > elevation > opening). Curtain wall and storefront systems are typically parent system Products with Iterator-driven opening count for repeated bays.

### 3.2 Typical Input Group structure

| Input Group | Typical position | What it usually contains | Notes |
|---|---|---|---|
| Application / Project Context | First | Project name, building type, region / climate zone, wind zone, code jurisdiction | Drives visibility of impact-rating Input Groups, efficiency minimums, fire-rating options |
| Size and Opening | Second | Width, height, rough opening dimensions, orientation | Size cross-check against product dimensional limits; non-standard sizes may route to a special request Product |
| Frame / Profile | Mid | Material (aluminum, vinyl, wood, fiberglass, composite), series, thermal break | Material drives frame sub-assembly on the BOM and affects U-Factor via Attribute |
| Glazing | Mid | Glass type, tint, low-E coating, gas fill, IGU makeup (single / double / triple), spacer type | Primary driver of U-Factor and SHGC Attributes; typically has dense Input Filter rules |
| Hardware and Operation | Mid | Operation type (fixed / casement / slider / hung), lock type, handle style | Operation type often determines whether the Product can be configured at certain sizes |
| Finish / Color | Mid-late | Exterior color, interior color, special coatings, wood species stain | Manufacturer-specific finish catalog; frequently a Global Product candidate |
| Performance / Compliance | Late | Target U-Factor, SHGC, fire rating, DP requirement, impact rating, ENERGY STAR | Usually Attributes displayed via Attribute Display; validated against region and code |
| Accessories | Late | Screens, grilles / muntins, trim, installation hardware, integrated blinds | Option layer; each carries BOM implications |

### 3.3 Global Product candidates and nested configuration usage

**Global Product candidates.**
- Finish / color Input — manufacturer finish catalog shared across multiple product lines (window, door, storefront)
- Glazing Input — glass and IGU catalog shared across most fenestration Products
- Hardware finish Input — lock, handle, hinge finishes reused across operation types
- Standard accessory Input Group (trim, installation clips, flashing) — shared across fenestration lines

**Nested configuration typical uses.**
- Project-level quotes — parent project with per-opening child configurations, often grouped by building elevation or floor
- Curtain wall systems — parent system with child configurations for individual bays, vents, or doors within the wall
- Storefront systems — parent system with repeated openings
- Roof systems — parent roof with child configurations for different roof areas or slope conditions

**Not typically nested in this vertical.**
- Individual muntins / grilles (stays flat as an Input decorating the parent)
- Standard hardware (stays as Input Values or Item Masters on the parent)

**Applies to:** new (primary) · edit (secondary, as reference for ripple analysis) &nbsp; **Outcome:** quote accuracy, maintainability, catalog expansion velocity &nbsp; **Downstream:** Admin authoring speed, sales rep configurator clarity, engineering handoff cleanliness

---

## 4. Typical rule patterns

| Pattern | What it enforces | Typical C1C mechanism | Typical Logic Group | Notes |
|---|---|---|---|---|
| Size-to-product envelope | Selected width and height must fall within the product’s allowed size range | Input Filter | — | Width and height as Inputs; max dimensions as Attributes on product variants |
| Glazing-to-frame compatibility | Selected IGU thickness must fit the frame’s glazing pocket | Input Filter | — | Attribute-driven; cross-checks IGU overall thickness against frame pocket depth |
| U-Factor target compliance | Configuration’s computed U-Factor must meet region / code minimum | Logic Item (Interface, Validation) | Validation Group | Error Message should cite IECC / ASHRAE 90.1 / Title 24 climate zone |
| ENERGY STAR qualification | Configuration’s U-Factor and SHGC meet ENERGY STAR criteria for the selected climate zone | Logic Item (Interface, Display) | Recommendations Group | Typically a Display Message confirming ENERGY STAR qualification; drives output documentation |
| Wind load / design pressure | Configuration’s tested DP must meet project wind-zone requirement | Input Filter | — | DP Attribute on the glazing + frame combination; project wind zone from the Application group |
| Impact rating by region | Project in a High-Velocity Hurricane Zone (HVHZ) requires impact-rated assembly | Logic Item (Interface, Dependency) | Visibility Group | Show or hide impact-rating Inputs based on region / county Input |
| Fire rating compliance | Fire-rated opening requires matching fire-rated frame, glass, and hardware | Input Filter | — | Fire rating Attribute on every component; must meet or exceed required rating |
| Hardware-to-operation compatibility | Operation type (e.g., casement) determines allowed hardware set | Driven Input | — | Operation drives the allowed hardware Input Values |
| Grille / muntin pattern feasibility | Grille pattern must be physically possible given IGU size and glass thickness | Input Filter | — | Often multi-variable — spacing, width, IGU thickness, pattern complexity |
| Finish availability by product | Custom colors available on some product lines and sizes, not others | Driven Input | — | Product line + size combinations drive color availability |
| Takeoff quantity consistency | Project-level sum of openings matches takeoff document | Logic Item (Interface, Display) | Validation Group | Cross-parent validation — sum of child-configuration counts compared to an Attribute or Input on the parent |
| Shop drawing requirement | Non-standard size / configuration triggers shop drawing generation | Logic Item (Output, conditional) | — | Drives a Product Output to fire only when non-standard flag is set |
| Rough-opening to unit-size tolerance | Selected unit size must allow correct installation clearance in the rough opening | Logic Item (Interface, Validation) | Validation Group | Warning rather than error — some customers install tightly on purpose |
| LEED credit documentation | Project flagged for LEED triggers material / performance documentation outputs | Logic Item (Output, conditional) | — | Gates specific Product Outputs carrying LEED-relevant data |

**Applies to:** new (primary) · edit (secondary, as reference for ripple analysis on rule changes) &nbsp; **Outcome:** quote accuracy, rule maintainability, reduced factory corrections &nbsp; **Downstream:** sales rep error reduction, engineering handoff cleanliness, Admin debuggability

---

## 5. Typical BOM and skeleton patterns

### 5.1 Typical BOM construction patterns

| Pattern | What it produces | Typical C1C mechanism | Notes |
|---|---|---|---|
| Frame sub-assembly | Frame members (head, sill, jambs), mullions, corner hardware | Item Subassembly under a frame Item Family | Cut-to-length for each member; lengths driven by size Inputs via Product Equation |
| Glazing unit (IGU) | Glass lites, spacer, desiccant, seal, gas fill | Item Subassembly generated per configuration | Overall dimensions driven by frame glazing pocket; not a stock item for custom sizes |
| Hardware package | Lock, keeper, hinges, handles, roller, sash lifts | Driven Item Master keyed off operation-type Input | Operation type drives which hardware set comes in |
| Sash / panel sub-assembly | For operable windows: sash frame, sash hardware, weatherstripping | Item Subassembly under a sash Item Family | Applies only to operable products (casement, hung, slider) |
| Finish application | Paint / powder coat / anodize job tied to configuration | Routing step rather than BOM line in most cases | Finish appears on items as a spec, not as a separate BOM row |
| Grille / muntin kit | Grid pattern for visual divisions | BOM Logic Item adding grille Item Masters | Count and pattern driven by grille-pattern Input |
| Screen | Insect / debris screen for operable products | BOM Logic Item | Usually an option; frame material and mesh type drive selection |
| Installation accessories | Trim, flashing, clips, shims, sealant, caulk | BOM Logic Item adding static Item Masters | Often shared across product lines via a Global Product accessories Input Group |
| Project shipping and packaging | Crates, edge protection, stretch wrap, labels | Static BOM Skeleton lines with quantity equations | Quantities driven by project-level counts on the parent configuration |
| Submittal / shop drawing package | Generated drawings, performance data sheet, compliance certificates | Product Outputs rather than BOM lines | The docs themselves may not be BOM items, but their generation is configuration-driven |
| Nameplate / label | Unit identification label with NFRC rating, model, performance data | Item Family with Item Master Automation | Per-configuration generation; ensures NFRC-labeled configurations carry correct data |

### 5.2 Invisible BOM content typical in this vertical

- Setting blocks, shims, and spacers — required for every glazed unit but often forgotten
- Weatherstripping gaskets and seals — driven by operation type and frame material
- Installation sealant — per linear foot of perimeter, frequently under-modeled
- Fasteners — screws, anchors, shim shims sized by frame material and opening type
- Trim and casing materials — interior and exterior trim packages
- NFRC and certification labels — applied to every labeled unit, small but required
- Installation instruction sheets — per product line, per configuration variant
- Warranty registration materials — often bundled as installation kit items

**Applies to:** new (primary — BOM structure) · edit (primary — BOM changes ripple to manufacturing) &nbsp; **Outcome:** factory correction reduction, on-time delivery, manufacturing accuracy &nbsp; **Downstream:** engineering handoff quality, manufacturing floor accuracy, aftermarket parts identification

---

## 6. Integration expectations

| System / category | Type | Relationship to C1C | Notes |
|---|---|---|---|
| Bluebeam Revu | Takeoff / estimating | Upstream | Estimators and specifiers use Bluebeam for PDF markup and takeoffs; outputs attached to configuration requests |
| PlanSwift | Takeoff / estimating | Upstream | Drag-and-drop takeoff tool; delivers quantity lists as Excel that become source documents |
| STACK | Takeoff / estimating | Upstream | Cloud-based takeoff; similar role to PlanSwift |
| Autodesk Takeoff / Autodesk Construction Cloud | Takeoff / estimating | Upstream | BIM-integrated takeoff; 3D-model-driven quantities |
| On-Screen Takeoff | Takeoff / estimating | Upstream | Legacy digital takeoff tool; still widely used |
| Procore | Project management | Adjacent (not integrated) | GC-side project management; configurations may be referenced but systems typically do not integrate directly |
| NFRC Directory | Regulatory database | Adjacent (not integrated) | Performance rating lookup; configurations reference NFRC ratings but don’t query the Directory live |
| ENERGY STAR reference | Regulatory reference | Adjacent (not integrated) | Criteria referenced in Validation Logic Item messages |
| CAD (SolidWorks, Inventor, Revit) | CAD | Bidirectional | Product Outputs drive shop drawing generation; Revit families published for specifier use |
| ERP (SAP, Oracle, Epicor, NetSuite) | ERP | Downstream | Order handoff; NetSuite is Revalize’s reference integration for new deployments |
| Architectural specification databases | Industry design tool | Adjacent (not integrated) | Master specifications reference product lines; text comes from manufacturer technical marketing |
| Dealer / distributor portals | Dealer portal | Downstream | Published Products for channel sales; Product Outputs feed portal catalogs |

**Applies to:** new · edit · both &nbsp; **Outcome:** Agent credibility on adjacent-systems conversations, correct scoping of integration vs. non-integration questions &nbsp; **Downstream:** engineering handoff awareness, rep / distributor workflow awareness

---

## 7. Document types and interpretation cues

| Document type | Typical source | Fields the Agent should expect | Interpretation traps |
|---|---|---|---|
| Takeoff report | Estimator / specifier | Per-opening sizes, operation types, quantities, organized by CSI division / elevation | Spreadsheet layouts vary widely; may mix schedules from multiple products in one file |
| Architectural drawing | Architect | Floor plans, elevations, schedules, details | Schedules are the extractable part; elevations provide visual context, floor plans give quantity context |
| Window / door schedule | Architect / specifier | Mark / ID, size, operation type, performance requirements, finish, hardware | Schedules often reference specifications by CSI number without spelling out performance details in the schedule itself |
| Project specification | Architect / specifier | Full requirements for product line, materials, performance, testing | Specifications are long and mostly prose; performance requirements are the extraction target |
| Shop drawing | Manufacturer (via C1C Product Output) | Configuration-specific detailed drawing for approval | Typically generated, not consumed as input; submittal rejection loops back into configuration edits |
| NFRC rating report | Manufacturer testing / certification | Certified U-Factor, SHGC, VT, AL, CR, test conditions, CPD number | The CPD (Certified Product Directory) number identifies the specific combination; extracting a single rating without the component combination context is an error |
| Fire rating report | Independent testing lab | Tested assembly, rating achieved, test standard (UL10B, UL10C, NFPA 252) | Fire rating applies to the whole tested assembly — any component substitution may invalidate the rating |
| Wind load / design pressure report | Independent testing lab | Tested DP, test standard (AAMA / WDMA / CSA), assembly components | Similar to fire rating — assembly-scope test, substitutions matter |
| LEED material data sheet | Manufacturer | Recycled content, regional sourcing, VOC content, EPD / HPD references | Project LEED submissions typically need specific documents per product; manufacturer provides, project team selects |

**Applies to:** new · edit · both &nbsp; **Outcome:** extraction accuracy, reduction of clarification loops, faster document-driven changes &nbsp; **Downstream:** Admin session velocity

---

## 8. Downstream user expectations

### 8.1 Sales rep expectations

Distributor sales staff, dealer sales representatives, inside sales for direct-to-contractor accounts, and specification sales representatives who work with architects. Technical literacy varies — a specification rep discussing U-Factor trade-offs with an architect is deeply technical; a dealer counter staff entering a replacement window order may just need to match an existing opening. The configurator must work at both ends of that spectrum. Reps expect quick configuration for standard scenarios (size, operation, finish, standard hardware) and the flexibility to configure complex projects with many openings quickly without re-entering project-level context for every opening. Project-based quoting with the ability to copy and modify an opening across a schedule is essential — the alternative is rep rejection and back-to-spreadsheet workflow.

### 8.2 Engineering and manufacturing expectations

Production engineering, shop engineering for custom or semi-custom configurations, manufacturing assembly, and finishing / glazing operations. Engineering expects frame members cut to correct lengths, glazing units sized correctly for the frame’s glazing pocket, hardware package matched to operation type, and finish specifications attached. Manufacturing expects a BOM plus cutting schedule plus finish schedule plus hardware picklist that together produce a buildable unit. The handoff commonly breaks on glass-to-frame fit (IGU thickness vs. frame pocket mismatch), hardware gaps (the option was selected but a supporting bracket or strike plate is missing), and finish specification errors where the color is right but the substrate treatment (anodizing, paint, stain) is wrong for the selected frame material.

### 8.3 End customer expectations

General contractors, subcontractors, architects (as approvers, not buyers), project owners, and homeowners for residential. The customer expects a quote package matching the schedule provided in the takeoff, with shop drawings for approval, performance data (NFRC labels, DP ratings, fire ratings where applicable), and delivery schedule. For commercial projects, the submittal package is often a separate expected deliverable — shop drawings, performance certificates, LEED documentation if applicable. Delivered product that matches the approved submittal is the baseline; substitutions without explicit approval are typically rejections because they may invalidate certifications (fire rating, NFRC rating) that apply only to the tested assembly.

**Applies to:** new (primary) · edit (primary — edits ripple downstream more than new items sometimes, because expectations are already set) &nbsp; **Outcome:** factory correction reduction, rep adoption, end-customer quote acceptance &nbsp; **Downstream:** the whole point — this section IS the downstream-impact lens

---

## 9. How Admins in this vertical tend to mis-model

- **Flattening project-level quotes into a single flat configuration.** A commercial window schedule might have 300 openings in a dozen unit types. Modeling each project as a flat Product with 300 repeating-value Input Groups, or with a single Iterator, breaks down fast — openings differ, reps want to edit them independently, and any change at the project level forces re-entry of every opening. Use nested parent-project / per-opening-child configurations.

- **Modeling performance ratings as user Inputs instead of Attributes.** U-Factor, SHGC, VT, and fire rating are properties of the selected combination of glazing, frame, and hardware. Admins sometimes model them as Inputs the user selects from ("pick a U-Factor between 0.20 and 0.40"), leading to configurations that claim a rating they can’t actually meet. Correct pattern: ratings are Attributes on the combination and are displayed (not selected) via Attribute Display.

- **Treating size as free-entry without envelope validation.** The temptation is to let the user type any width and height, reasoning that "we size to order anyway." But every product has physical limits driven by frame stiffness, glass thickness, and manufacturing capacity. Entering 120" x 84" on a product rated for 48" x 72" produces a quote that can’t actually be built. Size-envelope validation via Input Filter is essential.

- **Modeling finishes as a single color Input without the cascade.** Finish choice cascades to substrate treatment, priming, paint system, drying / curing time, and cost. Admins sometimes reduce this to "pick a color" without the cascade, producing configurations where the color looks right but the substrate treatment defaulted to an incompatible pattern. Finish should drive BOM content via BOM Logic, not just display.

- **Ignoring the fire-rating and impact-rating assembly constraint.** Certifications apply to the tested assembly, not to individual components. A fire-rated frame with a non-fire-rated vision lite is not a fire-rated assembly, even if all components sound similar. Admins sometimes model fire rating as a frame Attribute and let any glazing be selected, producing a configuration that claims a rating the assembly doesn’t have. Fire rating must validate the whole component combination.

- **Building the takeoff extraction logic ad-hoc per project.** Takeoff documents are Excel or CSV files with layouts that vary by estimator and project. Admins sometimes build extraction logic per customer, per project template, producing fragile integration that breaks when the next project uses a different format. The Document Interpretation Patterns deliverable should own extraction logic; per-project overrides should be narrow.

- **Not modeling the rough opening tolerance.** Rough opening is the framed hole; the unit goes inside it with installation clearance. Customers sometimes specify unit size thinking they mean rough opening and vice versa. Admins sometimes model only unit size without an explicit rough-opening cross-check, producing units that don’t fit on installation. RO and unit size should both appear, with a Logic Item confirming the tolerance.

**Applies to:** new (primary) · edit (secondary) &nbsp; **Outcome:** better initial modeling decisions, reduced rework, better catalog expansion &nbsp; **Downstream:** Admin’s future self, rule maintainability, configurator UX

---

## 10. Vertical edge cases and guardrail triggers

| Edge case | Trigger signal | Guardrail posture | Notes |
|---|---|---|---|
| NFRC rating invalidation | Edit to glazing, frame, or spacer on a configuration with a referenced NFRC CPD number | Pause and confirm | Agent surfaces the concern that the NFRC rating applies to the original combination; defers to the Admin / product marketing for re-certification decisions |
| Fire rating invalidation | Edit to any component in a fire-rated assembly | Pause and confirm | Fire rating applies to the tested assembly; component substitution typically requires re-certification |
| DP / wind load inadequacy | New configuration in a high-wind-zone project with DP rating below the zone’s requirement | Flag for Admin review | Agent surfaces the mismatch; does not redesign the assembly |
| HVHZ / impact-rating requirement | Project in a county requiring impact-rated fenestration configured without an impact-rated assembly | Pause and confirm | Miami-Dade NOA requirements are strict; surface the requirement |
| LEED documentation scope | Project flagged for LEED without corresponding material / performance documentation Product Outputs enabled | Flag for Admin review | Surface the documentation gap |
| ENERGY STAR criteria shift | Climate zone edit on a configuration that was ENERGY STAR qualified in the old zone but may not meet criteria in the new zone | Flag for Admin review | Zone-specific ENERGY STAR criteria are different; surface the shift |
| Size envelope near-limit | Configuration approaching the upper size limit of the product (e.g., within 5% of maximum dimension) | Flag for Admin review | Not an error but a reliability concern; larger sizes are more prone to warp, deflection, seal failure |
| Finish-substrate mismatch | Finish specification change without corresponding substrate-treatment BOM update | Flag for Admin review | Factory correction risk |
| Takeoff-to-project-quote mismatch | Project-level configuration with opening count materially different from source takeoff | Flag for Admin review | Agent surfaces the delta; the Admin or rep verifies |

**Applies to:** new · edit (edits are where most edge-case triggers fire — an Admin modifying an existing configuration is the highest-risk surface for regulatory and safety edges) · both &nbsp; **Outcome:** risk reduction, compliance posture, audit defensibility &nbsp; **Downstream:** regulatory affairs workflow, legal defensibility, end-customer safety where applicable &nbsp; **Guardrail:** primary input to vertical-aware guardrail behavior

---

*Document version: 1.0 · Profile authored against vertical profile template v1.0. Contains real grounding on NFRC performance rating structure (U-Factor, SHGC, VT, AL, CR), ENERGY STAR climate-zone criteria, CSI MasterFormat’s 50-division structure, takeoff tool ecosystem (Bluebeam, PlanSwift, STACK, Autodesk Takeoff), and fire-rating assembly-scope certification. Author review should validate specific rule patterns and BOM content against current customer implementations.*
