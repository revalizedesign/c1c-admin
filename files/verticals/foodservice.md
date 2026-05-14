# Foodservice Equipment — Vertical Profile

## How to use this document

This profile gives the Agent the vertical-specific grounding it needs to recognize Foodservice Equipment vocabulary, propose typical structures when building new items, and flag likely vertical considerations during edits. It is one of four grounding layers consulted on every request.

**Precedence.** This profile is a prior, not a ground truth. When the customer layer shows the actual environment diverging from what this profile describes, the customer layer wins. The profile never licenses the Agent to override the Admin’s actual configuration.

**Companion documents.** For C1C mechanics referenced in this profile, retrieve alongside: `c1c-data-modeling-best-practices.md`, `c1c-rule-configuration-best-practices.md`, `c1c-bom-best-practices.md`, `c1c-configurator-ux-best-practices.md`, and `c1c-industry-best-practices-agent-guidance.md`. For worked examples of Products, rules, skeletons, and BOMs specific to this vertical, retrieve the Configuration Design deliverable filtered by vertical ID `foodservice_equipment`.

**Profile scope.**
- **Vertical:** Foodservice Equipment
- **Vertical ID:** `foodservice_equipment`
- **Template version:** 1.0
- **Last updated:** 2026-04-23
- **Primary C1C modules:** Configuration Interface, Bill of Materials, Product Model
- **Common co-verticals:** `industrial_machinery_equipment` (food processing machinery), `motor_vehicles_truck_bodies` (refrigerated truck bodies for foodservice)
- **Primary regions:** US dominates NSF certification landscape; CE / EN standards govern Europe; most mid-market FES manufacturers are North American with some EU exposure

---

## 1. Vertical snapshot

**What they build.** Commercial kitchen equipment — ranges, ovens, fryers, griddles, refrigeration (reach-in, walk-in, prep), ice machines, dish machines, prep tables, serving lines, warmers, shelving, hoods, smallwares, and custom fabrication (stainless counters, islands, serving buffets). Mix of standard catalog equipment and configured / custom assemblies for specific kitchen designs.

**How they sell.** Through a distinctive five-party channel: manufacturer → manufacturer’s rep (MAFSI member firm) → foodservice equipment dealer → foodservice consultant / kitchen designer → operator (restaurant, school, hospital, stadium, etc.). Dealers take title and mark up; reps work on commission without taking title. Consultants specify the kitchen; dealers fulfill; operators receive. National accounts and chain operators may buy direct or through dealer networks.

**Configuration character.** Most configurator work is configure-to-order on modular catalog equipment — a refrigerated prep table in a specific size with specific electrical, drawer arrangement, and optional accessories. Custom stainless fabrication is often a separate ETO process. Quoting is typically project-based, with entire kitchen layouts producing multi-page quotes running dozens to hundreds of line items per project.

**Where C1C work concentrates.** Driven Inputs for size-to-capacity and electrical matrices, Input Filters for option compatibility, BOM Logic for accessories and electrical configurations, and Product Outputs for dealer-facing spec sheets and quote pages.

**Applies to:** new · edit · both &nbsp; **Outcome:** foundation for all downstream retrieval &nbsp; **Downstream:** n/a (context, not recommendation)

---

## 2. Vocabulary and terminology map

| Term | What it is | Typical C1C landing | Notes / traps |
|---|---|---|---|
| NSF listed / NSF certified | Sanitation and public-health certification for food equipment | Attribute on Products or configurations | NSF standards (NSF/ANSI 2, 4, 7, 8, 12 and others) govern specific equipment classes — the Admin should know which standard applies to which product |
| NSF/ANSI 7 | Standard for commercial refrigerators and freezers | Not a C1C construct; contextual reference only | Cited in product marketing; Attribute on certified products |
| NSF/ANSI 4 | Standard for commercial cooking equipment | Not a C1C construct; contextual reference only | Applies to ranges, ovens, fryers, griddles |
| NSF/ANSI 2 | Standard for food equipment (counters, sinks, shelving, handling) | Not a C1C construct; contextual reference only | Covers fabrication work; the broad "food equipment" standard |
| ETL listed / intertek | Electrical safety certification | Attribute on configurations | Alternative to UL for electrical safety; common in foodservice |
| UL listed | Electrical safety certification | Attribute on configurations | Functionally equivalent to ETL in most foodservice contexts |
| CSA certified | Canadian safety certification | Attribute on configurations | Required for Canadian market entry |
| Energy Star | Voluntary efficiency program | Attribute on configurations | Applies to specific equipment classes — commercial refrigeration, fryers, dishwashers, steam cookers |
| BTU / BTU/hr | Heating output rating for gas equipment | Numeric Input or Attribute | Defines gas equipment capacity; paired with electrical specs for sizing circuit requirements |
| Amps / phases / volts | Electrical specification | Input Values or Driven Input | Commercial kitchen circuits vary (120V, 208V single or three-phase, 240V, 480V); availability varies by equipment |
| Reach-in / pass-through / roll-in / undercounter | Refrigeration form factors | Input Values on a form-factor Input, or separate Products | Significant BOM differences between them; may be separate Products depending on catalog breadth |
| GN size (1/1, 1/2, 1/3, 1/6) | Gastronorm pan-capacity spec (European) | Input Value on capacity Input, or Attribute | European sizing; common in combination ovens and hot wells |
| Pan capacity | Number of standard pans the equipment holds | Numeric Input or Attribute | Primary capacity metric for refrigeration, hot holding, warming |
| Sneeze guard | Serving-line guard over food | Accessory Input Value or sub-assembly | Required on most buffet and serving equipment; drives BOM content |
| Tray slide | Cafeteria tray rail | Accessory Input Value or sub-assembly | Option on serving lines; drives BOM and often priced |
| Cold wall vs. forced air | Refrigeration cooling methods | Attribute on Product, rarely an Input | Design distinction; affects internal airflow and product BOM |
| Casters vs. legs | Mounting options | Input Value on a mounting Input | Standard option choice; drives BOM; ADA and sanitation implications |
| ADA | Americans with Disabilities Act accessibility | Attribute on configurations, typically derived | Serving-line height limits, reach distances; region-specific |
| AutoQuotes / AQ | Revalize-owned FES-industry quoting and CPQ platform | Not a C1C construct; contextual reference only | Dominant industry tool for FES quoting; most dealers and reps use it; product data is catalogued centrally |
| Specifi / SpecPath | Industry specification-tracking systems | Not a C1C construct; contextual reference only | Tracks project specifications from consultant through award; reps and dealers use it to find pending projects |
| Operator | End customer (restaurant, hotel, school, stadium, hospital foodservice) | Not a C1C construct; contextual reference only | Industry term for the buyer/user |

**Applies to:** new · edit · both &nbsp; **Outcome:** Agent credibility, faster Q&A response &nbsp; **Downstream:** n/a (recognition layer)

---

## 3. Typical product modeling patterns

### 3.1 Typical Product decomposition

Foodservice customers typically create one Product per equipment family — "Worktop Refrigerator," "Combi Oven," "Reach-In Freezer," "Steam Table" — with model lines within the Product distinguished by size and capacity (typically as Input Values or Driven Inputs). Form-factor differences that materially change the BOM or the Input structure (e.g., reach-in vs. pass-through refrigerator, full-size combi vs. boilerless) are often separate Products. Custom fabrication work (bespoke stainless counters, custom hoods, custom serving lines) is frequently a separate Product or a separate ETO workflow outside the configurator. Multi-piece kitchen layouts are assembled at the quote level rather than as a single parent configuration, because each equipment piece carries its own specification and commercial terms.

### 3.2 Typical Input Group structure

| Input Group | Typical position | What it usually contains | Notes |
|---|---|---|---|
| Model and Capacity | First | Model line, size (width/depth/height), pan capacity | Anchors the configuration; downstream options are size-dependent |
| Electrical | Second or third | Voltage, phase, amperage | Typically Driven Input off capacity and region; commercial-kitchen circuit variety is high |
| Gas (if gas-capable) | Second or third | Natural gas vs. propane, BTU input | Common for cooking equipment; drives regulator and connection BOM |
| Refrigeration and Controls | Mid | Temperature range, controls type, defrost, alarms | Significant BOM differences between basic mechanical and electronic-control packages |
| Interior Configuration | Mid | Shelving, drawer arrangement, pan configuration, dividers | Often a repeated Input via Iterator; drives accessory BOM |
| Exterior / Finish | Mid | Finish (stainless standard, optional colors, powder-coat), backsplashes, trim | Often catalog-standard but some customers offer variant finishes |
| Mounting and Mobility | Mid | Casters, legs, seismic legs, bolt-down | Drives BOM; ADA and sanitation implications |
| Accessories | Late | Sneeze guard, tray slide, handles, lights, covers, specialty inserts | Options layer with significant BOM content |
| Compliance and Certifications | Late | NSF, UL/ETL, Energy Star, ADA, CSA | Usually Attributes surfaced via Attribute Display, not user-selected |

### 3.3 Global Product candidates and nested configuration usage

**Global Product candidates.**
- Electrical configuration Input — voltage, phase, amperage recurs across most powered equipment
- Standard accessory Input Groups — sneeze guards, casters, shelving options recur across serving-line and prep equipment
- Finish Input — where customers offer variant finishes across multiple product lines

**Nested configuration typical uses.**
- Serving-line assemblies where the parent line has child wells, hot holding units, cold pans, and sneeze-guard sections as separate configurations
- Custom counter fabrication with child sections (e.g., a 12-foot prep counter with child sink, drainboard, and workspace sections)

**Not typically nested in this vertical.**
- Multi-piece kitchen layouts (assembled at the quote level)
- Standard catalog equipment (kept flat; custom fabrication is the exception that warrants nesting)

**Applies to:** new (primary) · edit (secondary, as reference for ripple analysis) &nbsp; **Outcome:** quote accuracy, maintainability, catalog expansion velocity &nbsp; **Downstream:** Admin authoring speed, sales rep configurator clarity, engineering handoff cleanliness

---

## 4. Typical rule patterns

| Pattern | What it enforces | Typical C1C mechanism | Typical Logic Group | Notes |
|---|---|---|---|---|
| Size-to-capacity consistency | Pan capacity must align with selected size | Driven Input | — | Size drives capacity; typically a compact matrix |
| Electrical by region and capacity | Voltage and phase availability varies | Driven Input | — | Single-phase capped at smaller units; 208V/480V three-phase on larger |
| Gas type by region | Natural gas vs. propane availability | Driven Input | — | Drives regulator and orifice BOM content |
| NSF standard applicability | Product class determines which NSF standard applies | Attribute, derived | — | Not a user choice — the Product’s nature determines the applicable standard |
| UL vs. ETL selection | Preferred safety certification varies by customer or market | Attribute or Driven Item Master | — | Some markets require specific certs; BOM reflects the selected test lab |
| Amperage-to-circuit sizing | Selected configuration amperage must fit circuit family | Logic Item (Interface, Validation) | Validation Group | Critical for operator and installer; surfaces required circuit in output |
| Drawer-and-shelf combinations | Valid arrangements of drawers and shelves | Driven Input or Input Filter | — | Physical space constraints produce matrices of valid interior layouts |
| Casters vs. legs by sanitation | Sanitation code may restrict legs in certain installations | Logic Item (Interface, Dependency) | Materials / Compatibility Group | Code-driven; often region-specific |
| Energy Star eligibility | Configuration must meet Energy Star criteria for class | Logic Item (Interface, Display) or derived Attribute | Recommendations Group | Displays the qualification status; not blocking |
| Accessory-to-BOM mapping | Selected accessory drives BOM additions | BOM Logic Item | — | Interface Logic is the wrong tool |
| Sneeze guard mount compatibility | Mount type must match counter type | Driven Input | — | Compact matrix; tied to counter family |
| Tray slide length by counter length | Accessory length must match parent length | Product Equation or Driven Input | — | Length-driven; test for boundary cases |
| ADA compliance validation | Height, reach, and operating force limits | Logic Item (Interface, Validation) | Validation Group | Region-specific; surfaces required modifications to achieve ADA |

**Applies to:** new (primary) · edit (secondary, as reference for ripple analysis on rule changes) &nbsp; **Outcome:** quote accuracy, rule maintainability, reduced factory corrections &nbsp; **Downstream:** sales rep error reduction, engineering handoff cleanliness, Admin debuggability

---

## 5. Typical BOM and skeleton patterns

### 5.1 Typical BOM construction patterns

| Pattern | What it produces | Typical C1C mechanism | Notes |
|---|---|---|---|
| Cabinet and shell | Stainless cabinet with doors, top, back, interior liner | Item Family with Item Master Automation | Smart Part Number often encodes size and model |
| Electrical configuration | Electrical harness, contactors, plug or hardwire termination, disconnect | Driven Item Master | Voltage, phase, amperage drive BOM |
| Refrigeration assembly (if applicable) | Compressor, condenser, evaporator, expansion device, refrigerant charge | Item Subassembly under a refrigeration Item Family | Pre-engineered matched sets by capacity |
| Interior configuration | Shelves, drawers, dividers, pans | Iterator-driven BOM lines | User configures count and placement; BOM Iterator translates to line items |
| Controls | Thermostat, control board, display, sensors, alarms | Driven Item Master | Controls package Input drives |
| Mounting hardware | Casters, legs, bolt-down pads, seismic fittings | Driven Item Master | Mounting Input drives BOM |
| Accessory roll-up | Sneeze guard, tray slide, night covers, specialty inserts | BOM Logic Items | Individual accessory decisions map to BOM additions |
| Finish and trim | Stainless (standard) or specialty finishes, backsplash trim, side panels | Driven Item Master | Finish Input drives |
| Labels and nameplate | Rating plate, model plate, NSF plate, UL/ETL plate, warnings | Static Skeleton lines with Item Master Automation for config data | Nameplate uses config-driven data — voltage, amperage, serial |
| Gas components (if gas-capable) | Regulator, orifice, pilot, safety valve, flex connector | Driven Item Master | Gas type Input drives |
| Shipping | Pallet, strap, corner protectors, installation docs, warranty card | Static Skeleton lines or weight-driven BOM Logic | Foodservice equipment often ships on pallets with specific crating for damage prevention |

### 5.2 Invisible BOM content typical in this vertical

- Rating and warning labels — NSF plate, UL/ETL plate, voltage plate, amperage plate
- Gas connection components — regulator, flex connector, shut-off valve — bundled with gas equipment
- Refrigerant charge — driven by configuration, not a user choice
- Condensate drain components — evaporator pan, drain hose, heater
- Documentation — owner’s manual, installation instructions, warranty registration card, service quick-reference
- Shipping kit — pallet, stretch wrap, corner boards, protective film on stainless surfaces
- Touch-up paint and hardware kit — small spares for installation touch-up

**Applies to:** new (primary — BOM structure) · edit (primary — BOM changes ripple to manufacturing) &nbsp; **Outcome:** factory correction reduction, on-time delivery, manufacturing accuracy &nbsp; **Downstream:** engineering handoff quality, manufacturing floor accuracy, aftermarket parts identification

---

## 6. Integration expectations

| System / category | Type | Relationship to C1C | Notes |
|---|---|---|---|
| AutoQuotes (AQ) | Industry CPQ / design tool | Downstream (and peer) | The dominant FES industry quoting platform; foodservice manufacturers publish product data to AutoQuotes for dealer / rep use. Since AutoQuotes is a Revalize product, integration is a strategic pattern — configurations produced in C1C may publish spec data to AutoQuotes |
| Specifi / SpecPath | Spec tracking | Adjacent | Tracks kitchen-project specs from consultant through award; reps and dealers use it to find pending projects |
| NSF standards | Regulatory reference | Adjacent (not integrated) | Cited in Attribute labels and Error Messages; not integrated |
| UL / ETL certification databases | Regulatory reference | Adjacent (not integrated) | Certification status is known per product, not queried in real time |
| Energy Star program | Regulatory reference | Adjacent (not integrated) | Efficiency Attributes drive eligibility commentary |
| ERP (NetSuite, SAP, Oracle, Microsoft Dynamics) | ERP | Downstream | BOM and configuration-to-order handoff; NetSuite is the Revalize reference integration |
| Dealer portals | Dealer portal | Downstream | Dealer-facing product catalogs and quoting tools; configurations publish spec sheets |
| CAD (AutoCAD, Revit families) | CAD | Bidirectional | Kitchen designers specify layouts in AutoCAD with Revit MEP families; manufacturer Product Outputs often include 2D/3D data for the designer’s software |
| Chef’s Deal, Restaurant Equippers, WebstaurantStore | Online catalog / e-commerce | Downstream | Online equipment resellers; product data may feed catalog listings |

**Applies to:** new · edit · both &nbsp; **Outcome:** Agent credibility on adjacent-systems conversations, correct scoping of integration vs. non-integration questions &nbsp; **Downstream:** engineering handoff awareness, rep / distributor workflow awareness

---

## 7. Document types and interpretation cues

| Document type | Typical source | Fields the Agent should expect | Interpretation traps |
|---|---|---|---|
| Consultant’s kitchen specification | Foodservice consultant | Equipment schedule (model, quantity, options), electrical schedule, gas schedule, plumbing, kitchen layout drawing | Specs are written by CSI Division or by equipment schedule — formats vary by consultant; the same option may be specified differently in two documents |
| Spec sheet / cut sheet | Manufacturer product marketing | Model numbers, option codes, dimensions, electrical, plumbing, weight, shipping | Option codes vary widely between manufacturers; consult the catalog’s decoder |
| Project equipment list / kitchen schedule | Consultant or dealer | Line-by-line equipment list with model numbers, options, quantities | Each line is essentially a configuration to recreate; list format varies |
| AutoQuotes export | AutoQuotes | Configured equipment with AQ model and option codes | AutoQuotes has its own configuration grammar; map carefully |
| Dealer quote (competitor or historical) | Dealer | Equipment descriptions, option codes, pricing (strip before extraction) | Pricing is out of scope for V1; focus on configuration data |
| Kitchen layout drawing (plan view) | Consultant / architect | Equipment placement, dimensions, utility connections | Drawing data is positional; configuration data is usually in the equipment schedule, not the drawing |
| NSF certificate | NSF | Standard (NSF/ANSI 2, 4, 7, etc.), certified product, certification date | Certification is for the specific product family; certification doesn’t extend to custom variants |
| UL / ETL listing | UL or Intertek | Listed product, listing number, standard applied | Listing is per product family; custom fabrication may not be covered |
| Service manual or installation manual | Manufacturer | Product dimensions, utility requirements, clearances, startup procedure | Service-oriented rather than configuration-oriented; useful for confirming installation constraints |

**Applies to:** new · edit · both &nbsp; **Outcome:** extraction accuracy, reduction of clarification loops, faster document-driven changes &nbsp; **Downstream:** Admin session velocity

---

## 8. Downstream user expectations

### 8.1 Sales rep expectations

Manufacturer’s rep firms (MAFSI members) handle field sales to dealers and consultants; factory-direct salespeople handle national accounts and chain operators; inside sales at dealers handle smaller operators directly. Technical literacy varies — reps are typically well-versed in their line card and channel norms but may rely on factory engineering for unusual applications. The rep needs the configurator to handle dealer-facing spec sheets, AutoQuotes-compatible output where relevant, and a quick path from consultant spec to configured equipment. Reps work across many manufacturers’ lines and value configurators that match the industry’s standard workflows. Configurators that force the rep into a unique product-decoder workflow divergent from AutoQuotes conventions tend to get worked around via spreadsheets.

### 8.2 Engineering and manufacturing expectations

In-house engineering owns custom fabrication and non-standard requests; manufacturing shops build from BOM with validated sub-assemblies. Foodservice manufacturing expects a BOM that correctly reflects the electrical configuration (including voltage, phase, and the correct plug or hardwire termination), the refrigeration package for refrigerated equipment (matched compressor-evaporator pair), the interior configuration (drawer count, shelf count, position), all accessories, and the labels and rating plates carrying config-driven data. Handoff most commonly breaks when an option was selected on the configurator but not reflected in BOM (classic Interface-vs-BOM-Logic misuse), when electrical amperage on the rating plate doesn’t match actual assembled configuration, or when NSF or ETL certification claims don’t match the as-built product (e.g., a non-listed aftermarket variation).

### 8.3 End customer expectations

Commercial kitchen operators — restaurant owners, chefs, facilities managers at schools and hospitals, corporate foodservice managers. They expect equipment that arrives pre-assembled, NSF-certified when specified, installable with standard utility connections, and compliant with local health inspection requirements. Chefs expect operating workflows to match what was specified — if a prep table was ordered with a specific drawer arrangement, that arrangement needs to arrive. Facilities managers expect electrical amperage and gas BTU to match what the kitchen was designed around; if the installed equipment draws more power than specified, the branch circuit may not support it. "Wrong" looks like equipment that fails health inspection, doesn’t fit the designed space, or requires electrical re-work after delivery.

**Applies to:** new (primary) · edit (primary — edits ripple downstream more than new items sometimes, because expectations are already set) &nbsp; **Outcome:** factory correction reduction, rep adoption, end-customer quote acceptance &nbsp; **Downstream:** the whole point — this section IS the downstream-impact lens

---

## 9. How Admins in this vertical tend to mis-model

- **Treating NSF certification as a user-selectable option.** NSF certification is a property of the product family (tested and listed), not a configuration-time choice. Admins sometimes model it as an Input Value the rep can toggle, producing configurations that claim certification that was never tested. NSF certification is an Attribute on the Product, derived from the product family’s listing status.

- **Not distinguishing reach-in from pass-through (or similar form factors) as separate Products.** Reach-in and pass-through refrigerators share surface-level similarity but differ significantly in BOM (extra door, possibly different insulation), often in controls, and frequently in installation clearances. Admins sometimes model them as Input Value variants within a single Product, producing rule logic that’s hard to maintain and BOM structures that fight against the actual assembly process.

- **Modeling the electrical amperage as a separate user Input from voltage.** Voltage is a choice; amperage is derived from the selected configuration (capacity, optional heaters, compressor size, lighting). When Admins let reps select amperage directly, configurators produce rating plates that don’t match as-built reality, and circuit-sizing advice to the operator is wrong. Amperage should be calculated from the configuration and surfaced as an Attribute.

- **Ignoring the AutoQuotes ecosystem.** Most dealers and reps live in AutoQuotes; they expect foodservice product data to flow from manufacturer catalog to AutoQuotes naturally, and configurator outputs should harmonize with AutoQuotes conventions for model codes and option codes. Admins who build configurators as if AutoQuotes doesn’t exist produce tools reps work around rather than use.

- **Custom fabrication lumped in with standard catalog configurator.** A custom stainless counter with bespoke dimensions, sink locations, and drainboards is fundamentally different work from configuring a standard prep table — different engineering process, different BOM structure, different lead times. Admins sometimes try to force custom fabrication through the standard configurator and either overconstrain the custom work (blocking valid designs) or underconstrain the standard product (allowing misconfigurations). Custom fabrication is usually a separate Product or workflow.

- **Sneeze guard as a detached option.** Sneeze guards must match the counter length, the counter type (flat, bain-marie, well), and the mount style (post, cantilever). Admins sometimes let the rep select a sneeze guard freely, producing configurations where the guard doesn’t fit the counter. Sneeze guards need Driven Input logic against the counter configuration, not a free Input Value.

- **Not modeling the shipping kit and documentation.** Foodservice equipment ships with a warranty card, installation manual, rating plate kit, touch-up hardware, and specific crating. Admins sometimes leave these off the BOM because they aren’t "part of the equipment," producing BOMs that shop floor can’t ship without manually adding content. Shipping kit and documentation belong on the BOM as static Skeleton lines or BOM Logic.

**Applies to:** new (primary) · edit (secondary) &nbsp; **Outcome:** better initial modeling decisions, reduced rework, better catalog expansion &nbsp; **Downstream:** Admin’s future self, rule maintainability, configurator UX

---

## 10. Vertical edge cases and guardrail triggers

| Edge case | Trigger signal | Guardrail posture | Notes |
|---|---|---|---|
| NSF certification at risk | Edit to a configuration that changes materials in food-contact surfaces, changes dimensions that affect cleanability, or modifies an NSF-listed product family | Pause and confirm | Agent surfaces that NSF certification may be affected; does not determine certification status. Refer to product engineering / regulatory |
| UL / ETL listing boundary | Edit to electrical configuration that changes amperage, voltage, or component layout on a listed product | Pause and confirm | Safety listings are for the tested configuration; deviations may invalidate. Refer to product engineering |
| Energy Star eligibility change | Configuration change that affects Energy Star-relevant attributes (efficiency, standby energy, water use for dishwashers) | Flag for Admin review | Eligibility can shift with option changes; surface the dependency |
| ADA compliance boundary | Serving-line or counter height edit that crosses ADA threshold, or removal of accessibility options | Pause and confirm | ADA is legally enforceable; surface the concern and defer to the customer’s compliance review |
| Gas-to-electric conversion | Change of a gas product to electric or vice versa | Pause and confirm | Significant BOM change; often affects certifications, safety devices, and rating plate. Often should be a new configuration rather than an edit |
| Health code substitution | Configuration change replacing legs with casters or vice versa in regions with specific health-code requirements | Flag for Admin review | Some regions require specific installation methods; flag for the operator / inspector |
| Custom fabrication escape from the configurator | Configurator request with dimensions or features outside the standard envelope | Flag for Admin review | May need to route to custom fabrication process rather than be forced into the standard configurator |
| Recall or field-safety action affected | Edit to a product with active recall or field-safety notice | Escalate to human | Do not proceed with configuration changes on recalled products without explicit confirmation from customer-side regulatory / legal |

**Applies to:** new · edit (edits are where most edge-case triggers fire — an Admin modifying an existing configuration is the highest-risk surface for regulatory and safety edges) · both &nbsp; **Outcome:** risk reduction, compliance posture, audit defensibility &nbsp; **Downstream:** regulatory affairs workflow, legal defensibility, end-customer safety where applicable &nbsp; **Guardrail:** primary input to vertical-aware guardrail behavior

---

*Document version: 1.0 · Profile authored against vertical profile template v1.0. Contains real grounding on NSF/ANSI food-equipment standards (NSF 2, 4, 7, 8, 12 family), UL vs. ETL certification paths, MAFSI rep-dealer-consultant-operator channel structure (~230 rep firms, ~200 manufacturer members), AutoQuotes industry platform (Revalize-owned, 20,000+ users, dominant FES CPQ tool), and AHRMM / FDA-adjacent regulatory context where applicable. Author review should validate specific rule patterns and BOM content against current customer implementations.*
