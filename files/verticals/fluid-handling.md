# Fluid Handling and Pump Manufacturing — Vertical Profile

## How to use this document

This profile gives the Agent the vertical-specific grounding it needs to recognize Fluid Handling and Pump Manufacturing vocabulary, propose typical structures when building new items, and flag likely vertical considerations during edits. It is one of four grounding layers consulted on every request.

**Precedence.** This profile is a prior, not a ground truth. When the customer layer shows the actual environment diverging from what this profile describes, the customer layer wins. The profile never licenses the Agent to override the Admin’s actual configuration.

**Companion documents.** For C1C mechanics referenced in this profile, retrieve alongside: `c1c-data-modeling-best-practices.md`, `c1c-rule-configuration-best-practices.md`, `c1c-bom-best-practices.md`, `c1c-configurator-ux-best-practices.md`, and `c1c-industry-best-practices-agent-guidance.md`. For worked examples of Products, rules, skeletons, and BOMs specific to this vertical, retrieve the Configuration Design deliverable filtered by vertical ID `fluid_handling_pumps`.

**Profile scope.**
- **Vertical:** Fluid Handling and Pump Manufacturing
- **Vertical ID:** `fluid_handling_pumps`
- **Template version:** 1.0
- **Last updated:** 2026-04-23
- **Primary C1C modules:** Configuration Interface, Bill of Materials, Product Model
- **Common co-verticals:** `hvac_climate_control`, `industrial_machinery_equipment`
- **Primary regions:** Both (US and EU; API 610 governs internationally)

---

## 1. Vertical snapshot

**What they build.** Centrifugal, positive displacement, and submersible pumps, plus control valves, actuators, and packaged pump systems for municipal water, industrial process, HVAC circulation, and fire suppression applications.

**How they sell.** Predominantly through manufacturer reps and engineered distributors who run application-engineering selections for end users; direct sales for large OEM and municipal accounts.

**Configuration character.** Engineered-to-order against a duty point — flow rate, head, fluid properties — with material and seal selection driven by fluid chemistry and service conditions. Performance-curve validation and NPSH checks are typically part of the configuration, not an afterthought.

**Where C1C work concentrates.** Input Filters and Driven Inputs for duty-point and material-compatibility matrices, Iterators for multi-pump packaged systems, and BOM Logic for motor and seal selection.

**Applies to:** new · edit · both &nbsp; **Outcome:** foundation for all downstream retrieval &nbsp; **Downstream:** n/a (context, not recommendation)

---

## 2. Vocabulary and terminology map

| Term | What it is | Typical C1C landing | Notes / traps |
|---|---|---|---|
| Duty point | Required operating flow and head | Paired Input Values on flow and head Inputs, read together by Input Filter logic | Reps think of this as one decision; modeling it as two disconnected Inputs frustrates them |
| BEP / Best Efficiency Point | Flow rate where the pump runs most efficiently | Attribute on the pump Input Value; used in validation Logic Items | Not a user choice — a property of the selected pump |
| NPSH required / NPSH available | Pressure margin required at the suction vs. what the system provides | NPSHr as Attribute on pump Input Value; NPSHa as numeric Input | Classic Input Filter pattern: NPSHa must exceed NPSHr |
| Impeller trim | Diameter reduction of the impeller to hit a specific curve | Input Value or numeric Input, typically Text Field with Range | Same pump model produces multiple Input Values if trims are catalog-tracked |
| Mechanical seal | Sealing component between shaft and casing | Input plus a linked seal-assembly Item Family | Seal plan (API Plan 11, 52, etc.) drives flush-piping sub-assembly selection |
| Packed gland | Compression packing as an alternative to mechanical seal | Input Value on the seal-type Input | Triggers different BOM content (gland rings, follower, lubrication) than mechanical seals |
| API 610 / API 682 / ANSI B73.1 | Industry standards governing pump / seal design | Attributes on Products or Input Values; referenced in Validation Logic Item messages | Standard version matters — API 610 12th edition ≠ 11th; partial compliance is common |
| Affinity laws | Physical scaling relationships between speed, flow, head, power | Typically surfaced in Product Equations that derive one value from others | Don’t model these as Input Filters; they’re calculations, not constraints |
| Duty classification | Continuous / intermittent / standby service | Input on the Application Input Group | Drives motor sizing Logic Items and sometimes material selection |
| System curve | Hydraulic resistance curve of the installed system | Not modeled in C1C | Not a C1C construct; contextual reference only — lives in selection tools like Pump-Flo |
| Pump-Flo | Industry pump selection software | Not a C1C construct; contextual reference only | Upstream of C1C; Admins may attach Pump-Flo selection outputs as source documents |
| Flange rating (150 / 300 / 600 #) | Pressure class of connection flange | Input Value on connection Input, or Attribute | Typically filtered against fluid pressure rating |
| Wet end | The fluid-contact portion of the pump (casing, impeller, wear parts) | A common sub-assembly boundary in BOM Skeleton | Material-package decisions typically govern the entire wet end together |

**Applies to:** new · edit · both &nbsp; **Outcome:** Agent credibility, faster Q&A response &nbsp; **Downstream:** n/a (recognition layer)

---

## 3. Typical product modeling patterns

### 3.1 Typical Product decomposition

Fluid Handling customers typically create one C1C Product per pump family (e.g., "ANSI Process Pump," "Split Case Pump," "Submersible Sewage Pump"), not one per hydraulic size. Hydraulic size (casing size, impeller diameter, trim) belongs as Input Values inside the Product, selected downstream of the duty-point decision. Multi-pump packaged systems (lift stations, booster sets, fire packages) are typically modeled as parent nested configurations with per-pump child configurations plus system-level controls and piping Input Groups on the parent. Control valves and actuators are typically separate Products, occasionally Global Products when the same valve line serves multiple pump packages.

### 3.2 Typical Input Group structure

| Input Group | Typical position | What it usually contains | Notes |
|---|---|---|---|
| Application and Service | First | Fluid, service class (continuous / intermittent / standby), temperature, specific gravity, viscosity | Drives most downstream filters — material compatibility, seal selection, NPSH calculation |
| Duty Point | First or second | Flow rate, head, optional NPSHa | Often surfaced as a paired decision rather than two separate Inputs |
| Hydraulic Selection | Second or third | Pump model, casing size, impeller diameter, trim | Most often a filtered selection against duty point — Input Filter territory |
| Materials of Construction | Mid | Casing material, impeller material, wear parts, shaft | Driven Input off fluid + service class is common; Driven Item Master takes over on the BOM side |
| Seal Arrangement | Mid | Seal type (mechanical / packed), seal plan, faces, elastomer, flush plan | Frequently its own sub-group with a multi-step selection |
| Driver | Mid-late | Motor HP, RPM, frame, enclosure (TEFC / XP / WP) | HP typically derived from duty point via Product Equation; enclosure filtered by area classification |
| Accessories | Late | Baseplate, coupling, coupling guard, instrumentation, suction strainer | Option layer; most items add to the BOM via BOM Logic |
| Compliance and Testing | Late | Applicable standard (API 610, ANSI), witness test, certification | Usually Attributes surfaced via Attribute Display; drives optional BOM lines for test certificates |

### 3.3 Global Product candidates and nested configuration usage

**Global Product candidates.**
- Motor selection Input Group — the motor catalog is typically shared across multiple pump families
- Seal arrangement Input Group — the same seal plans apply across pump families within a customer’s product line
- Flange connection Input — standard sizes and ratings reused across pump and valve Products

**Nested configuration typical uses.**
- Packaged pump stations — parent station configuration (controls, piping, enclosure) with N child pump configurations
- Duplex / triplex pump sets — parent assembly with matched child pumps that must align on duty point and materials
- Pump-plus-skid configurations — parent skid with child pump, child motor, child controls

**Not typically nested in this vertical.**
- Individual seal components (stays flat as Item Subassembly under the seal-assembly Item Family)
- Instrumentation packages (typically modeled as accessories, not nested children)

**Applies to:** new (primary) · edit (secondary, as reference for ripple analysis) &nbsp; **Outcome:** quote accuracy, maintainability, catalog expansion velocity &nbsp; **Downstream:** Admin authoring speed, sales rep configurator clarity, engineering handoff cleanliness

---

## 4. Typical rule patterns

| Pattern | What it enforces | Typical C1C mechanism | Typical Logic Group | Notes |
|---|---|---|---|---|
| NPSH margin check | NPSH available must exceed NPSH required by margin | Input Filter | — | NPSHr is an Attribute on the selected pump; NPSHa is a numeric Input; filter compares them with a margin |
| Duty-point-to-pump envelope | Selected pump’s published curve must cover the duty point | Input Filter | — | Attribute-driven against flow / head Attributes on the pump Input Values |
| Material-to-fluid compatibility | Wet-end materials must be compatible with fluid chemistry | Driven Input | — | Fluid class drives allowed material class; becomes an Input Filter if fluid is attribute-characterized rather than class-selected |
| Flange rating adequacy | Flange rating must exceed system pressure | Input Filter | — | Filter against pressure-rating Attribute on flange Input Values |
| Motor HP sizing | Motor HP must exceed pump power at duty point, typically with service-factor margin | Product Equation (for required HP) plus Input Filter (for selection) | — | Do not model sizing itself as a Logic Item — the calculation belongs in Product Equations |
| Motor enclosure by area classification | Hazardous-area service requires XP or equivalent enclosure | Driven Input | — | Area classification Input drives allowed enclosure values |
| Seal plan to service compatibility | Seal plan must suit temperature, pressure, and fluid | Input Filter | — | Seal Plan is often represented as Input Values with multiple Attributes (temperature limit, pressure limit, fluid class) |
| Standard compliance validation | Configuration must meet claimed standard (API 610, ANSI B73.1) | Logic Item (Interface, Validation) | Validation Group | Error Message must name the specific standard clause or exception |
| Operating envelope warning | Duty point at the extreme end of the curve | Logic Item (Interface, Display) | Recommendations Group | Warning not error — the configuration is valid but lower-reliability |
| Multi-pump station duty | N-pump stations must share duty point and materials | Logic Item (Interface, Dependency) | Materials / Compatibility Group | Sets and locks child-pump values from parent-level selections in nested configuration |
| Accessory-to-BOM mapping | Option selection drives BOM additions (baseplate, coupling, guard, instrumentation) | BOM Logic Item | — | Do not try to enforce via Interface Logic — BOM concerns belong in BOM Logic |
| Test and certification line items | Witness test / performance test drives BOM line items for test certificate, test labor | BOM Logic Item | — | Gated by a test-required Input — do not make test certificates unconditional |

**Applies to:** new (primary) · edit (secondary, as reference for ripple analysis on rule changes) &nbsp; **Outcome:** quote accuracy, rule maintainability, reduced factory corrections &nbsp; **Downstream:** sales rep error reduction, engineering handoff cleanliness, Admin debuggability

---

## 5. Typical BOM and skeleton patterns

### 5.1 Typical BOM construction patterns

| Pattern | What it produces | Typical C1C mechanism | Notes |
|---|---|---|---|
| Wet-end material cascade | Casing, impeller, wear rings, and sometimes shaft selected as a material package | Driven Item Master | Material class Input drives; prevents mismatched wet-end materials |
| Seal arrangement sub-assembly | Seal faces, elastomer, gland plate, flush plan piping bundled | Item Subassembly under a seal-assembly Item Family | Seal plan (API 11, 52, 53A, etc.) is the typical driver |
| Motor selection | Motor Item Master by HP / RPM / frame / enclosure | Driven Item Master | Motor catalog typically sits in a shared Item Family; confirm Item Masters exist before the matrix |
| Packaged station assembly | N parallel pump assemblies under a station parent with system-level items (piping, controls, skid) | Config Iterator chained to BOM Iterator, plus static station-level Skeleton lines | Iterator must be on a non-root Logic Group; chain breaks easily on Product copy |
| Instrumentation package | Gauges, transmitters, local panels added per option selection | BOM Logic Item adding static Item Masters | Option visibility on config side should match; test both presence and absence |
| Nameplate generation | Per-configuration nameplate carrying serial, duty point, certifications, materials | Item Family with Item Master Automation | Smart Part Number draws from config data; test carefully — Smart Part Numbers are immutable once saved |
| Test certificate line | Hydrostatic test, performance test, witness documentation | BOM Logic Item against a test-required Input | Do not model as unconditional static Skeleton line |
| Flange adapter / connection hardware | Gaskets, bolts, adapter spools for size or rating conversion | Driven Item Master | Keyed off connection-size and flange-rating Inputs |
| Spare parts kit | Commissioning spares, one-year spares | Item Family with its own selection logic | Usually a priced option on the configurator and a separate Item Family on the BOM |

### 5.2 Invisible BOM content typical in this vertical

- Gaskets and fasteners per connection — driven by flange count and rating, not user-selected
- Nameplate and data plate — generated per configuration, carries certification marks
- Shipping and crating materials — driven by overall dimension and weight
- Commissioning documentation — test certificates, O&M manual, installation drawings
- Motor accessories — conduit box, terminal kit, often bundled inside the motor Item Master
- Coupling guard — OSHA-required on most configurations; often forgotten when coupling is selected as an option

**Applies to:** new (primary — BOM structure) · edit (primary — BOM changes ripple to manufacturing) &nbsp; **Outcome:** factory correction reduction, on-time delivery, manufacturing accuracy &nbsp; **Downstream:** engineering handoff quality, manufacturing floor accuracy, aftermarket parts identification

---

## 6. Integration expectations

| System / category | Type | Relationship to C1C | Notes |
|---|---|---|---|
| Pump-Flo | Selection / sizing | Upstream | Industry-standard pump selection; Admins often attach Pump-Flo outputs as source documents that drive Product updates |
| Hydraulic Institute standards references | Regulatory reference | Adjacent (not integrated) | Referenced in Validation Logic Item messages; no data exchange |
| API 610 / API 682 / ANSI B73.1 standards | Regulatory reference | Adjacent (not integrated) | Named in compliance Attributes and Error Message content |
| ERP (Oracle, SAP, Epicor, NetSuite) | ERP | Downstream | BOM and configuration-to-order handoff; NetSuite is Revalize’s reference integration for new deployments |
| CAD (SolidWorks, Inventor) | CAD | Bidirectional | Pump and skid drawings typically generated from Product Outputs; engineering CAD families inform Input Value imagery |
| Motor vendor databases (Baldor, WEG, US Motors catalogs) | Selection / sizing | Upstream | Motor selection matrices are typically populated from vendor catalogs; confirm Item Master coverage matches the active catalog |
| Aftermarket / spare parts portals | Dealer portal | Downstream | Configuration-to-spare-parts-kit mapping drives aftermarket catalog; BOM structure determines whether this works cleanly |

**Applies to:** new · edit · both &nbsp; **Outcome:** Agent credibility on adjacent-systems conversations, correct scoping of integration vs. non-integration questions &nbsp; **Downstream:** engineering handoff awareness, rep / distributor workflow awareness

---

## 7. Document types and interpretation cues

| Document type | Typical source | Fields the Agent should expect | Interpretation traps |
|---|---|---|---|
| Pump curve / performance curve | Engineering | Flow, head, efficiency, power, NPSHr across operating range | Multiple impeller diameter trims on one curve — the Admin usually means one specific trim; annotations like "BEP" or "design point" are cues |
| Duty point specification | Sales / application engineering | Flow, head, fluid, temperature, specific gravity, viscosity, NPSHa | Flow / head may be given as a range or as guaranteed vs. design point; fluid may be named ("seawater") rather than specified numerically |
| Materials of construction spec | Engineering | Casing, impeller, wear parts, shaft, seal faces, gaskets | Material codes vary (ASTM, UNS, trade names like "CD4MCu"); the same material appears under different names across customers |
| Seal / mechanical seal datasheet | Component vendor | Seal type, faces, elastomer, flush plan, pressure / temperature limits | API Plan numbers (Plan 11, 52, 53A) are the primary reference; the same plan drawn differently by different vendors |
| API / ANSI compliance certificate | Regulatory / customer | Standard version, scope of compliance, certifying body | Standard version matters (API 610 12th ed ≠ 11th); partial compliance vs. full compliance vs. compliance with exceptions |
| Bill of material export | Engineering / ERP | Part numbers, descriptions, quantities, level / indent | Indentation conventions vary; quantities may be per-assembly or per-configuration; phantom assemblies appear without Item Masters |
| Pump-Flo selection output | Selection tool | Duty point, selected pump, curves, efficiency, NPSH margin | The selected pump model name is authoritative; surrounding commentary (efficiency warnings, NPSH margin alerts) is context, not data to extract |
| Motor data sheet | Vendor | HP, RPM, frame, enclosure, efficiency, service factor, electrical specs | Service factor varies with duty — don’t extract the number without the applied duty condition |

**Applies to:** new · edit · both &nbsp; **Outcome:** extraction accuracy, reduction of clarification loops, faster document-driven changes &nbsp; **Downstream:** Admin session velocity

---

## 8. Downstream user expectations

### 8.1 Sales rep expectations

Application engineers at manufacturer reps, engineered distributors, and a small number of direct-sales specialists. Technical literacy is high — most have an engineering background and read pump curves fluently. The rep expects to enter duty points (flow, head, fluid, service) and have the configurator route them to a valid pump selection with a curve, NPSH margin, and material recommendation; the output should include a performance curve and a printable quote package suitable for engineering submittal. Speed matters more than hand-holding — guided selling that slows a fluent rep is worse than no guidance, and rep configurators that force duty-point entry before pump selection feel backwards to reps who think "I need a 4x3-13 with 5-inch trim" first and work the duty point from there.

### 8.2 Engineering and manufacturing expectations

In-house engineering for packaged systems and ETO pumps; shop-floor assemblers working from the BOM and shop order for standard and semi-custom pumps; outside field service for commissioning. Engineering expects a BOM that reflects the actual material package, correct motor-pump match, and a complete seal plan with all ancillaries (flush piping, seal pots for dual-seal arrangements), plus a nameplate specification that carries the certification marks the customer ordered and a configuration document that includes the duty point and the selected curve for field commissioning. The handoff most commonly breaks on material-package mismatches where the casing is one grade and an internal part defaulted to a different grade, seal arrangements where the configurator showed the seal but didn’t add the flush plan hardware to the BOM, and motor selections that match HP and RPM but miss on enclosure (TEFC vs. XP) for hazardous-area service.

### 8.3 End customer expectations

Typically a project engineer at an EPC firm or a plant engineer at an end-user site; for municipal applications, a consulting engineer; for industrial process, a reliability or maintenance engineer. The customer expects a quote package that includes the performance curve with the duty point annotated, NPSH margin documentation, materials of construction by part, seal arrangement drawing, motor data sheet, and applicable code / standard compliance statements; delivery of a pump that matches the curve submitted with the quote is the core expectation, and field performance tests against the quoted curve. A delivered pump that meets duty but with a materials substitution ("we shipped 316 instead of Alloy 20 because of availability") is often a rejection, not a tolerable variance — the quote package is effectively the contract.

**Applies to:** new (primary) · edit (primary — edits ripple downstream more than new items sometimes, because expectations are already set) &nbsp; **Outcome:** factory correction reduction, rep adoption, end-customer quote acceptance &nbsp; **Downstream:** the whole point — this section IS the downstream-impact lens

---

## 9. How Admins in this vertical tend to mis-model

- **Modeling the duty point as two independent Inputs.** Flow and head are a paired decision in the reps’ and end customers’ minds. Admins sometimes model them as two separate Inputs on separate pages, which breaks the mental model for reps and produces brittle Input Filter logic that has to cross-check them anyway. The right shape is a linked pair, typically in a single Input Group with visible coupling.

- **Treating pump-family and pump-size as separate Products.** The configuration burden of "which family?" plus "which size?" pushes Admins toward one Product per family-size combination, creating 12 Products where one would do. Size is an Input inside the Product; family is the Product.

- **Modeling NPSH as a hard block when it should be a margin warning.** NPSH required is a published value; NPSH available is a site-specific input from the Admin’s customer. Reps frequently work at tight NPSH margins by design. A hard Error Message blocks sales in the name of safety when a margin warning plus documentation would do.

- **Modeling each material option as a separate BOM Logic Item.** When the wet end is a cascade — casing / impeller / wear rings / sometimes shaft all chosen together by material class — Admins sometimes write one BOM Logic Item per material per component, producing 4 × 4 = 16 BOM Logic Items where a Driven Item Master does the same work in one matrix. Breaks at the fifth material, and the fifth material always eventually comes.

- **Treating the seal plan as a single Input Value.** The plan is a Seal Plan 52 or Plan 11 from the rep’s and customer’s perspective — one decision. But shop floor needs the plan broken out into faces, elastomer, gland plate, flush piping, reservoir, fittings. Modeling the plan as one Input Value and stopping there produces a configurator that reads right to reps and a BOM that reads wrong to manufacturing. The right shape is one Input for the plan plus an Item Subassembly on the BOM that expands it.

- **Assuming Iterator chaining "just works."** Admins build a configurator Iterator for a multi-pump station, verify the interface repeats correctly, and declare the feature done. The BOM Iterator link is a separate mechanic that has to be established, and it breaks when a Product is copied. Every multi-pump vertical customer hits this at least once.

- **Not modeling the nameplate as a BOM item.** The nameplate is a physical part the shop produces and attaches to the pump, and it carries certification marks that are sometimes auditable. Admins sometimes leave it out of the BOM because it’s "not a real part" — and then discover the Item Master Automation pattern for generating per-configuration nameplates doesn’t exist.

**Applies to:** new (primary) · edit (secondary) &nbsp; **Outcome:** better initial modeling decisions, reduced rework, better catalog expansion &nbsp; **Downstream:** Admin’s future self, rule maintainability, configurator UX

---

## 10. Vertical edge cases and guardrail triggers

| Edge case | Trigger signal | Guardrail posture | Notes |
|---|---|---|---|
| API 610 compliance claim at risk | Edit to a pump Product carrying an API 610 Attribute, or change to materials, seals, or testing on a configuration with an API-required customer | Pause and confirm | The Agent surfaces that API 610 compliance may be affected; does not determine compliance itself. Refer to engineering / QA for re-certification scope |
| Hazardous-area service violation | Edit that changes motor enclosure, or addition of a non-XP option to a configuration flagged for Class I Div 1 / ATEX service | Pause and confirm | Agent flags that area classification constraints may be violated; does not reclassify the area or certify the replacement. Area classification belongs to plant engineering |
| Materials substitution on in-flight order | Edit to an existing configuration’s wet-end material after quote issue | Flag for Admin review | Material substitution is often a rejection with end customers in this vertical — surface the substitution scope and risk in the recommendation |
| Duty point outside published envelope | New configuration with duty point beyond the pump curve’s published limits | Flag for Admin review | Configuration may still be valid with engineering review; Agent flags for Admin review but does not block |
| Seal plan change on existing configuration | Edit to seal plan on a configuration already released | Pause and confirm | Seal plan change typically requires re-certification documentation and updated drawings; Agent flags downstream impact on documentation deliverables |
| Nameplate data drift after duty-point edit | Edit to duty-point Inputs without accompanying review of nameplate Item Master Automation | Flag for Admin review | The nameplate regeneration is not always automatic; Agent surfaces the dependency so the Admin confirms the nameplate reflects the edited duty |

**Applies to:** new · edit (edits are where most edge-case triggers fire — an Admin modifying an existing configuration is the highest-risk surface for regulatory and safety edges) · both &nbsp; **Outcome:** risk reduction, compliance posture, audit defensibility &nbsp; **Downstream:** regulatory affairs workflow, legal defensibility, end-customer safety where applicable &nbsp; **Guardrail:** primary input to vertical-aware guardrail behavior

---

*Document version: 1.0 · Profile authored against vertical profile template v1.0. Worked example for the Fluid Handling and Pump Manufacturing vertical, produced as a reference during template authoring.*
