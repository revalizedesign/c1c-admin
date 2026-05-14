# Motor Vehicles, Truck Bodies and Trailers — Vertical Profile

## How to use this document

This profile gives the Agent the vertical-specific grounding it needs to recognize Motor Vehicles, Truck Bodies and Trailers vocabulary, propose typical structures when building new items, and flag likely vertical considerations during edits. It is one of four grounding layers consulted on every request.

**Precedence.** This profile is a prior, not a ground truth. When the customer layer shows the actual environment diverging from what this profile describes, the customer layer wins. The profile never licenses the Agent to override the Admin’s actual configuration.

**Companion documents.** For C1C mechanics referenced in this profile, retrieve alongside: `c1c-data-modeling-best-practices.md`, `c1c-rule-configuration-best-practices.md`, `c1c-bom-best-practices.md`, `c1c-configurator-ux-best-practices.md`, and `c1c-industry-best-practices-agent-guidance.md`. For worked examples of Products, rules, skeletons, and BOMs specific to this vertical, retrieve the Configuration Design deliverable filtered by vertical ID `motor_vehicles_truck_bodies`.

**Profile scope.**
- **Vertical:** Motor Vehicles, Truck Bodies and Trailers
- **Vertical ID:** `motor_vehicles_truck_bodies`
- **Template version:** 1.0
- **Last updated:** 2026-04-23
- **Primary C1C modules:** Configuration Interface, Bill of Materials, Nested Configuration, Product Outputs
- **Common co-verticals:** `industrial_machinery_equipment` (shared heavy-equipment build patterns), `foodservice_equipment` (refrigerated truck bodies)
- **Primary regions:** US and Canada primary, with European variants for upfit products aimed at Transit / Sprinter / European chassis

---

## 1. Vertical snapshot

**What they build.** Vocational truck bodies (service bodies, dump bodies, utility bodies, van bodies, refrigerated bodies), trailers (flatbed, tanker, dry van, refrigerated, lowboy, dump, specialty), van upfits (contractor, mobile service, ambulance, shuttle), and vehicle accessories (lift gates, toolboxes, cranes, hitches, specialty upfits). Body and upfit configuration is chassis-dependent — the Ford / GM / Ram / Freightliner / Kenworth chassis sets the physical and regulatory starting point.

**How they sell.** Through vocational truck dealers and body / equipment distributors, typically as a multi-stage build (chassis sold by OEM dealer, body built by a separate manufacturer, upfit by a third stage). Fleet sales (fleets buying many identical units) and single-unit sales (contractors, municipalities, utilities buying one truck) are both common. End customer is rarely the same as the chassis buyer.

**Configuration character.** Chassis-dependent configure-to-order is the dominant pattern. The chassis is selected (or brought to the body manufacturer) with defined wheelbase, cab-to-axle, GVWR, and other fixed specs; the body and upfit configuration must fit within those specs. Body builder layout books from chassis OEMs (Ford BBLB, Ram Body Builder’s Guide, GM Upfitter Guide) define the compatibility envelope. Weight budgets (GVWR minus curb weight equals payload) are the primary physical constraint.

**Where C1C work concentrates.** Driven Inputs for chassis-to-body compatibility matrices, nested configuration for chassis-plus-body-plus-upfit structures, Product Equations for weight-budget calculations, and BOM Logic for accessory and upfit content.

**Applies to:** new · edit · both &nbsp; **Outcome:** foundation for all downstream retrieval &nbsp; **Downstream:** n/a (context, not recommendation)

---

## 2. Vocabulary and terminology map

| Term | What it is | Typical C1C landing | Notes / traps |
|---|---|---|---|
| GVWR | Gross Vehicle Weight Rating — maximum rated weight of the vehicle | Attribute on chassis Input Value | Hard regulatory limit; curb weight plus payload must not exceed GVWR |
| GAWR | Gross Axle Weight Rating — per-axle rated capacity (front and rear) | Attributes on chassis Input Value | Paired — front and rear separately; body and load distribution affect each |
| Curb weight | Empty vehicle weight with standard equipment and full fuel | Attribute on chassis Input Value | Starting point for weight-budget calculations |
| Payload | Load capacity = GVWR minus curb weight minus OPT/ARC | Derived via Product Equation | Shown to the rep / customer; the central weight-budget decision |
| WB / Wheelbase | Distance between front and rear axle | Attribute on chassis Input Value | Drives body length compatibility |
| CA / Cab-to-axle | Distance from back of cab to centerline of rear axle | Attribute on chassis Input Value | Critical body-fit dimension; body length envelope keys off this |
| AF / After-frame | Frame extension behind the rear axle | Attribute on chassis Input Value | Constrains tail overhang and aft-of-axle body mounting |
| OPT / ARC | Optional equipment / Accessory Reserve Capacity weight allowance | Attribute on chassis Input Value | Ford-specific terminology for factory-option weight allocation |
| BBLB | Body Builder Layout Book (Ford) | Not a C1C construct; contextual reference only | Chassis OEM documentation defining the compatibility envelope for body / upfit builders |
| BEMM | Body and Equipment Mounting Manual | Not a C1C construct; contextual reference only | Ford’s detailed mounting reference document for Transit / Transit Connect |
| IVM | Incomplete Vehicle Manual | Not a C1C construct; contextual reference only | Required document defining FMVSS compliance status of incomplete vehicle shipped to body builder |
| QVM | Qualified Vehicle Modifier (Ford) / QAP Qualified Altered Parts | Attribute on configurations, or a certification status | Ford’s program certifying body builders who meet specific requirements |
| NTEA | National Truck Equipment Association | Not a C1C construct; contextual reference only | Industry association; customers may reference NTEA standards and certifications |
| FMVSS | Federal Motor Vehicle Safety Standards | Not a C1C construct; contextual reference only | Regulatory standards; multi-stage manufacturers certify compliance per stage |
| DOT | Department of Transportation | Not a C1C construct; contextual reference only | Federal regulatory authority; DOT compliance often cited in Validation Logic |
| CDL | Commercial Driver’s License class threshold (typically > 26,000 lb GVWR) | Attribute or display driven by GVWR | Important for fleet customer decisions about driver qualification |
| PTO | Power Take-Off | Input Value for the PTO option, often with a driven Item Master | Drives hydraulic system BOM content for dump, lift, and other applications |
| Upfit | Body, equipment, or accessory installation on a chassis | Typical second-stage configuration layer | Usually nested under a chassis parent configuration |
| Build sheet | Document listing all configuration choices for a specific build order | Product Output | Frequently the primary submittal to chassis OEM’s upfitter coordination system |
| Ship-through / modification center | OEM-approved facility where body / upfit happens in-line with chassis production | Not a C1C construct; contextual reference only | Affects lead time and shipping; often a configuration context Input |
| Alterer’s / final-stage manufacturer | Regulatory role identifying who certifies the completed vehicle | Attribute on configurations | Compliance responsibility; affects required documentation |
| Body length | Rear cargo / service body length | Input Value or numeric Input | Must fit within CA + AF envelope per OEM guidelines |
| Cab-axle-body (CAB) | Shortcut identifier combining chassis dimensions | Not a C1C construct; contextual reference only | Sometimes used in takeoffs as a compact identifier |

**Applies to:** new · edit · both &nbsp; **Outcome:** Agent credibility, faster Q&A response &nbsp; **Downstream:** n/a (recognition layer)

---

## 3. Typical product modeling patterns

### 3.1 Typical Product decomposition

Motor vehicles and truck bodies customers typically create one C1C Product per body type or upfit platform (e.g., "Service Body," "Dump Body," "Van Upfit - Contractor," "Flatbed Trailer," "Tanker Trailer"). The chassis is NOT typically a Product in C1C — it’s an Input on the body Product, with chassis-specific dimensions and ratings (GVWR, CA, WB, AF) as Attributes on the chassis Input Values. For customers building both chassis and body (rare — most body builders don’t manufacture chassis), chassis is a separate Product nested as a parent configuration. Multi-stage builds — chassis plus body plus upfit — are typically modeled as nested configurations where a parent "completed vehicle" configuration owns chassis-context Inputs and has body and upfit child configurations. Fleet orders with many identical units use Iterators on the quantity.

### 3.2 Typical Input Group structure

| Input Group | Typical position | What it usually contains | Notes |
|---|---|---|---|
| Chassis Context | First | Chassis OEM, model, cab type, wheelbase, CA, GVWR, GAWR front / rear, body builder layout book reference | Critical first step — everything downstream keys off chassis compatibility |
| Application / Use Case | First-second | Vehicle application (utility, contractor, refrigerated, emergency), operating environment | Drives option visibility and BOM content |
| Body Type and Size | Second | Body length, body style, material (steel, aluminum, stainless, fiberglass), floor type | Length typically constrained by chassis CA; Driven Input is common |
| Doors and Access | Mid | Door configuration (roll-up, barn, sliding), door count, step types | Driven by body type and application |
| Load Handling | Mid | Dump hoist, lift gate, crane, winch, PTO requirements | Each option cascades to hydraulic, electrical, and structural BOM content |
| Electrical and Lighting | Mid | Lighting package (DOT required, optional work lights, strobes, beacons), auxiliary power, wiring harness | Base DOT lighting plus optional additions |
| Interior / Cargo | Mid-late | Shelving, drawers, partitions, racks, tie-downs, floor coverings | Option-heavy layer; each item carries BOM implications |
| Paint and Graphics | Late | Body color, graphics package, DOT lettering, striping | Color may be linked to chassis color or independent |
| Compliance and Documentation | Late | DOT certifications required, CSA / Transport Canada for Canadian markets, state-specific equipment | Typically Attributes; drive Product Output content |

### 3.3 Global Product candidates and nested configuration usage

**Global Product candidates.**
- Chassis catalog Input — shared across body lines (service body, dump body, flatbed all draw from the same chassis catalog)
- Lighting package Input Group — standard DOT and optional lighting shared across body types
- Lift gate and tommy-lift Input — shared across body types that accept them
- Paint / color Input — manufacturer paint catalog shared across body lines

**Nested configuration typical uses.**
- Chassis-plus-body-plus-upfit combined quotes — parent "completed vehicle" with chassis context, body child, upfit child
- Fleet orders with variant builds — parent fleet order with per-unit child configurations that differ in options
- Multi-axle trailer configurations — parent trailer with per-axle child configurations for trailers with varied axle specs

**Not typically nested in this vertical.**
- Standard accessories on a single body (stays as Input Values)
- Graphics and paint (stays flat unless highly custom)

**Applies to:** new (primary) · edit (secondary, as reference for ripple analysis) &nbsp; **Outcome:** quote accuracy, maintainability, catalog expansion velocity &nbsp; **Downstream:** Admin authoring speed, sales rep configurator clarity, engineering handoff cleanliness

---

## 4. Typical rule patterns

| Pattern | What it enforces | Typical C1C mechanism | Typical Logic Group | Notes |
|---|---|---|---|---|
| Chassis-to-body compatibility | Selected body length / type must fit the chassis CA and AF dimensions | Driven Input | — | Chassis Input drives allowed body-length Values; matrix is dense but finite |
| GVWR payload budget | Curb weight plus body weight plus upfit weight plus planned payload must not exceed GVWR | Product Equation (for total weight) plus Logic Item (for validation) | Validation Group | Weights are Attributes on each component; equation sums; Logic Item displays warning/error |
| GAWR axle distribution | Projected front and rear axle loads must each stay within GAWR | Product Equation plus Logic Item | Validation Group | Front/rear allocation varies by body type and load placement — requires assumed CG for each body type |
| Chassis wheelbase for body length | Body length constrains wheelbase; short wheelbase with long body produces overhang issues | Input Filter | — | WB and body-length Attributes; filter restricts invalid combinations |
| QVM / QAP compliance | Configurations intended for QVM / QAP program must stay within certified envelope | Input Filter or Logic Item | Validation Group | Typically a flag at the configuration level with downstream validation |
| PTO requirement for hydraulic bodies | Dump, crane, lift-gate selections require PTO chassis option | Logic Item (Interface, Dependency) | Materials / Compatibility Group | Should lock the PTO Input or warn the user to return to chassis to add PTO |
| Electrical capacity | Electrical accessory load must not exceed chassis alternator and battery capacity | Logic Item (Interface, Validation) plus Product Equation | Validation Group | Load Attribute on each electrical option; sum via equation |
| Hydraulic capacity match | Hydraulic pump, reservoir, and hoses must match lift gate / dump / crane duty | Driven Input | — | Load-handling selection drives hydraulic system sizing |
| FMVSS lighting compliance | DOT-required lighting must be included based on vehicle class and length | Logic Item (Interface, Dependency) | Materials / Compatibility Group | Can lock lighting Inputs based on body length / chassis class |
| Paint-substrate compatibility | Paint system must match body material | Driven Input | — | Steel, aluminum, fiberglass each have different prep and paint systems |
| Canadian market differences | Transport Canada compliance requires specific lighting, markings, documentation for Canadian delivery | Logic Item (Output, conditional) | — | Drives alternative Product Outputs when market is Canada |
| Refrigerated body thermal performance | Refrigeration unit capacity, insulation thickness, door seal type must match thermal target | Input Filter | — | Application (frozen vs. refrigerated vs. ambient) drives thermal requirements |
| Tanker capacity and baffling | Tanker capacity and interior baffling driven by commodity and regulatory requirements (DOT 406, 407, 412) | Input Filter | — | Commodity type (hazmat class) drives construction standards |
| Trailer brake compliance | Trailer brake system must meet FMVSS requirements for axle count and GVWR | Logic Item (Interface, Validation) | Validation Group | Electric / air brake decisions driven by GVWR and axle count |
| Accessory-to-BOM mapping | Each selected accessory (lift gate, toolbox, crane, etc.) drives BOM additions | BOM Logic Item | — | BOM concerns belong in BOM Logic; keep out of Interface Logic |

**Applies to:** new (primary) · edit (secondary, as reference for ripple analysis on rule changes) &nbsp; **Outcome:** quote accuracy, rule maintainability, reduced factory corrections &nbsp; **Downstream:** sales rep error reduction, engineering handoff cleanliness, Admin debuggability

---

## 5. Typical BOM and skeleton patterns

### 5.1 Typical BOM construction patterns

| Pattern | What it produces | Typical C1C mechanism | Notes |
|---|---|---|---|
| Body structure sub-assembly | Frame, sides, floor, roof, door framing — the base body shell | Item Subassembly under a body Item Family | Dimensions driven by body length and width Inputs; cut-to-length for length-variable members |
| Door assembly | Doors, hinges, latches, locks, weatherstripping | Driven Item Master keyed off door-type Input | Each door style is a distinct Item Family |
| Lift gate assembly | Lift platform, hydraulic cylinder, pump, mounting brackets, electrical controls | Item Subassembly | Gate capacity and body compatibility drive model selection |
| Crane / loader assembly | Crane structure, rotation, hydraulic pump, controls, mounting | Item Subassembly | Often customer-specified; capacity and reach are the driver Attributes |
| Refrigeration unit | Condenser, evaporator, compressor, controls, refrigerant charge | Driven Item Master | Sized against body thermal load per Product Equation |
| Hydraulic system | Pump, reservoir, valves, hoses, fittings | BOM Logic Item adding Item Masters | Driven by hydraulic options (lift gate, dump, crane); hoses sized by body dimensions |
| Electrical harness | Wiring harness, connectors, circuit protection | Driven Item Master | Harness catalog keyed by body length and option count |
| Lighting kit | DOT-required lights, work lights, strobes, beacons | BOM Logic Item | Base DOT lighting is typically unconditional; optional lights are option-driven |
| Shelving / interior package | Shelves, drawers, partitions, cargo management | BOM Logic Item adding Item Masters | Per-option BOM additions; small items accumulate |
| Paint and finishing | Primer, paint, graphics, labels | Routing step plus BOM items for consumables | Color system drives prep and paint BOM content |
| Compliance / certification labels | VIN plate, FMVSS labels, capacity placard, DOT lighting label | Item Family with Item Master Automation | Per-configuration generation; carries regulatory data |
| Fleet variations | Per-unit BOM differences within a fleet order | Child configurations under a parent fleet order | Each unit has its own BOM; fleet parent aggregates |
| Trailer-specific items | Axles, suspension, brakes, tires, wheels, ABS module | BOM by trailer class (dry van, tanker, flatbed, etc.) | Driven by GVWR and axle count |

### 5.2 Invisible BOM content typical in this vertical

- Mounting brackets and frame-attachment hardware — chassis-to-body attachment, overlooked because it seems like "standard hardware"
- Under-body plumbing and wiring routing — cable ties, grommets, loom, protective covers
- Weatherstripping and seals — typically driven by door and body-panel count
- Vehicle identification labels — VIN placard, body manufacturer plate, capacity placard, FMVSS labels
- Paint prep consumables — masking, primer, sealer, paint, clearcoat
- Final inspection and road test materials — test documentation, QC checklists
- Delivery preparation — fuel, battery check, key sets, owner documentation
- Warranty registration materials — per-unit documentation packets
- OEM-required body builder compliance documentation — must accompany completed vehicle to satisfy FMVSS multi-stage certification
- Touch-up paint, spare fasteners, and field-service consumables delivered with the completed vehicle

**Applies to:** new (primary — BOM structure) · edit (primary — BOM changes ripple to manufacturing) &nbsp; **Outcome:** factory correction reduction, on-time delivery, manufacturing accuracy &nbsp; **Downstream:** engineering handoff quality, manufacturing floor accuracy, aftermarket parts identification

---

## 6. Integration expectations

| System / category | Type | Relationship to C1C | Notes |
|---|---|---|---|
| Ford Body Builder Advisory Service (BBAS / fordbbas.com) | Regulatory / reference | Adjacent (not integrated) | Chassis compatibility documentation; typically referenced rather than integrated |
| Ram Body Builder’s Guide | Regulatory / reference | Adjacent (not integrated) | FCA / Stellantis equivalent |
| GM Upfitter Integration | Regulatory / reference | Adjacent (not integrated) | GM equivalent; GM Fleet orders sometimes go through GM’s upfitter coordination |
| Freightliner / Kenworth / Peterbilt Chassis Spec databases | Chassis OEM | Upstream | Chassis specification data feeds into the configurator; updated regularly for new model years |
| Chassis OEM VIN / build scheduling systems | Chassis OEM | Adjacent (not integrated) | VIN assignment and production scheduling live at the OEM; body builder coordinates but does not own |
| NTEA Vocational Truck Show technical resources | Industry reference | Adjacent (not integrated) | Trade association materials |
| Fleet management systems (Geotab, Samsara, Fleetio, etc.) | Fleet management | Adjacent (not integrated) | Post-delivery use; configuration delivery feeds fleet management onboarding |
| Dealer portals | Dealer portal | Downstream | Published Products for dealer sales; Product Outputs feed portal catalogs |
| ERP (SAP, Oracle, Epicor, NetSuite) | ERP | Downstream | BOM and Routing handoff; NetSuite is Revalize’s reference integration for new deployments |
| CAD (SolidWorks, Inventor) | CAD | Bidirectional | Body and upfit drawings generated from Product Outputs |
| CVT (Ford’s chassis performance tool) | Performance simulation | Adjacent (not integrated) | Performance / handling prediction tools; typically referenced not integrated |

**Applies to:** new · edit · both &nbsp; **Outcome:** Agent credibility on adjacent-systems conversations, correct scoping of integration vs. non-integration questions &nbsp; **Downstream:** engineering handoff awareness, rep / distributor workflow awareness

---

## 7. Document types and interpretation cues

| Document type | Typical source | Fields the Agent should expect | Interpretation traps |
|---|---|---|---|
| Chassis spec sheet | Chassis OEM | Model, cab, wheelbase, CA, GVWR, GAWRs, curb weight, engine, transmission, factory options | OEM spec sheets often show a matrix of available configurations — the Admin usually means one specific chassis build |
| Body Builder Layout Book section | Chassis OEM | Dimensional drawings, mounting patterns, clearance requirements, PTO opening locations | Typically CAD-heavy PDFs; extraction should focus on dimensions and bolt patterns, not full manual content |
| Customer spec / RFQ | Customer / sales | Application requirements, desired equipment, quantity, delivery date | Fleet RFQs often specify target unit weight and payload envelope; this is the weight budget |
| Build sheet / build order | Internal / dealer | Complete configuration for a specific unit including chassis VIN, options, accessories | Build sheets are typically outputs rather than inputs; may be attached as reference for replica orders |
| Fleet order schedule | Fleet customer | Quantity, per-unit variants, delivery schedule | Fleet orders may have 10-500 units; modeling as child configurations under a fleet parent is the typical pattern |
| OEM VIN and completed vehicle documentation | Chassis OEM + body builder | VIN, IVM, certification label, weight documentation, body builder certification | Multi-stage certification chain; each stage adds its own documentation |
| Hazmat / DOT compliance document | Regulatory | DOT classification, tank specification (for tankers), placard requirements | Tanker-specific; DOT 406 / 407 / 412 construction specs govern certain commodity classes |
| Performance and handling analysis (CVT output) | OEM / engineering | Weight distribution, braking performance, handling prediction | Typically analysis output; extract if performance concerns arise |
| Refrigeration specification | Customer / engineering | Target cargo temperature, ambient conditions, unit capacity, refrigerant | Application class (frozen, refrigerated, ambient) determines spec boundaries |

**Applies to:** new · edit · both &nbsp; **Outcome:** extraction accuracy, reduction of clarification loops, faster document-driven changes &nbsp; **Downstream:** Admin session velocity

---

## 8. Downstream user expectations

### 8.1 Sales rep expectations

Inside sales at body / upfit manufacturers, dealer sales at vocational truck dealerships, fleet account managers for large fleet customers. Technical literacy varies — a fleet account manager handling a 50-truck order is deeply technical; a dealer counter-sales staff entering a single service body order may rely heavily on the configurator to guide them. The rep expects chassis-first configuration (pick or enter the chassis, have the configurator adapt the body options accordingly) because that’s how the physical constraint works. The rep expects real-time feedback on payload budget — "I’m adding a lift gate; how much payload do I still have?" — and needs to see the budget before committing options. Configurators that allow over-GVWR configurations without warning are actively harmful — the rep may quote, the customer may agree, and the build may be non-compliant.

### 8.2 Engineering and manufacturing expectations

Body engineering for structural and hydraulic design, manufacturing assembly for body fabrication and upfit installation, final-stage QC for compliance certification, and paint and finishing operations. Engineering expects the BOM to reflect the actual buildable configuration — structural components matched to chassis mounting patterns, hydraulic system sized for the loads, electrical harness routing planned for the body and chassis combination, paint system matched to body material. The handoff commonly breaks on chassis mounting-hole patterns (body was engineered for one chassis’s mounting pattern but fitted to another), on hydraulic PTO compatibility (body requires PTO, chassis was ordered without), on electrical capacity (accessory load exceeds chassis capacity), and on weight budget (body plus upfit plus planned payload exceeds GVWR).

### 8.3 End customer expectations

Fleet managers, small-business owners (contractors, landscapers, service contractors), municipalities, utilities, and first-responder agencies. The customer expects a delivered completed vehicle that matches the quoted configuration — chassis, body, accessories, paint, graphics all present and correct. The customer expects compliance documentation — VIN, FMVSS certification, IVM, capacity placard, state registration-ready documentation. Substitutions of body components are typically rejections because the quoted specifications matter for operational fit (toolbox dimensions, shelf sizes, crane reach). Post-delivery weight verification at a public scale is a common customer check; over-GVWR deliveries are serious problems that can require unwinding the build.

**Applies to:** new (primary) · edit (primary — edits ripple downstream more than new items sometimes, because expectations are already set) &nbsp; **Outcome:** factory correction reduction, rep adoption, end-customer quote acceptance &nbsp; **Downstream:** the whole point — this section IS the downstream-impact lens

---

## 9. How Admins in this vertical tend to mis-model

- **Modeling the chassis as a Product instead of as an Input to the body Product.** The customer’s business is body and upfit; the chassis is an input to that business, not a product they build. Modeling chassis as a Product creates a parallel catalog maintenance burden (every chassis variant becomes its own Product) and makes body-to-chassis compatibility harder to model. Correct pattern: chassis is an Input on the body Product with chassis-specific dimensions and ratings as Attributes on the chassis Input Values.

- **Treating GVWR as a display Attribute instead of enforcing the payload budget.** The configurator should sum body weight plus upfit weight plus planned-payload Input and compare to GVWR; when the sum approaches or exceeds GVWR, the rep should see a warning. Admins sometimes show GVWR as a display-only value and let the rep do the math in their head, producing configurations that over-GVWR. The equation is straightforward; the validation is what protects downstream compliance.

- **Under-modeling the chassis-to-body mounting compatibility.** Body attachment to chassis frame uses OEM-defined bolt patterns, cross-members, and frame-rail specifications. Admins sometimes model body and chassis as independently-selectable, missing the fact that not every body pattern fits every chassis frame. Chassis choice should cascade to available mounting configurations via Driven Input.

- **Ignoring PTO as a chassis-factory-option dependency.** Dump bodies, lift gates, and cranes need hydraulic power, which comes from a chassis PTO that has to be ordered with the chassis at the factory. Admins sometimes allow body-side selection of hydraulic options without validating the chassis PTO presence, producing configurations that can’t actually be built because the chassis wasn’t ordered with PTO. PTO should be an Attribute on chassis Input Values, validated against body-side hydraulic selections.

- **Modeling paint color without the substrate cascade.** Body material (steel, aluminum, fiberglass) determines paint prep (primer, etch, treatment) and paint system (solvent, waterborne). Admins sometimes model color as a simple Input without the substrate cascade, producing configurations where the color is right but the paint-system BOM content defaults incorrectly.

- **Not modeling the multi-stage certification chain.** A chassis is shipped incomplete with an IVM; the body builder is a second-stage manufacturer; an upfitter can be a third stage. Each stage has certification responsibilities. Admins sometimes collapse this into a single "built" status without modeling the chain, losing the documentation trail that’s required for FMVSS compliance. At minimum, configurations should carry an Attribute identifying the stages and who certifies what.

- **Treating fleet orders as repeated configurations rather than a nested structure.** When a fleet wants 20 identical trucks, Iterators work fine. When a fleet wants 20 trucks with slight variations (different cargo packages for different routes, different paint for different divisions), Iterators fall apart. Nested parent-fleet / per-unit-child configurations handle variation naturally.

**Applies to:** new (primary) · edit (secondary) &nbsp; **Outcome:** better initial modeling decisions, reduced rework, better catalog expansion &nbsp; **Downstream:** Admin’s future self, rule maintainability, configurator UX

---

## 10. Vertical edge cases and guardrail triggers

| Edge case | Trigger signal | Guardrail posture | Notes |
|---|---|---|---|
| GVWR overage | Calculated total weight (curb + body + upfit + payload allowance) approaches or exceeds GVWR | Pause and confirm | Agent surfaces the payload math and flags the risk; over-GVWR is a regulatory compliance issue, not just a commercial one |
| GAWR overage (front or rear) | Projected axle load exceeds GAWR | Pause and confirm | Axle-specific; often a rear-axle issue on heavy body / aft-loaded configurations |
| Chassis-to-body mounting incompatibility | Edit that changes chassis or body to a combination not in the compatibility matrix | Pause and confirm | Agent surfaces the compatibility gap; body engineering may need to confirm |
| PTO missing for hydraulic upfit | Configuration with dump body, lift gate, or crane selected on a chassis without PTO Attribute | Pause and confirm | The chassis can’t be retrofitted with PTO post-factory; the chassis order has to change |
| FMVSS compliance edit | Change to a regulated component — lighting, brakes, steering, fuel system — on a configuration with an existing compliance certification | Pause and confirm | Surface the compliance concern; re-certification responsibility is engineering’s |
| QVM envelope exit | Edit that takes a Ford QVM configuration outside the program’s certified envelope | Pause and confirm | QVM certification is configuration-specific; changes may cancel QVM status |
| Canadian market variations | Change to region = Canada on a configuration that doesn’t include Transport Canada-required lighting / markings | Flag for Admin review | Surface the Transport Canada requirements; specific equipment may need to be added |
| Hazmat / DOT classification change on tanker | Change to commodity class on a tanker configuration | Pause and confirm | DOT 406 / 407 / 412 and specific commodity requirements cascade to construction and documentation |
| Refrigeration capacity inadequate | Refrigeration unit capacity below the body’s calculated thermal load | Flag for Admin review | Engineering thermal load calculation may need to be re-run |

**Applies to:** new · edit (edits are where most edge-case triggers fire — an Admin modifying an existing configuration is the highest-risk surface for regulatory and safety edges) · both &nbsp; **Outcome:** risk reduction, compliance posture, audit defensibility &nbsp; **Downstream:** regulatory affairs workflow, legal defensibility, end-customer safety where applicable &nbsp; **Guardrail:** primary input to vertical-aware guardrail behavior

---

*Document version: 1.0 · Profile authored against vertical profile template v1.0. Contains real grounding on GVWR / GAWR / curb weight / payload weight-budget structure, Ford Body Builder Layout Book and BBAS resources, FMVSS multi-stage certification chain, QVM program structure, and DOT / Transport Canada compliance patterns. Author review should validate specific rule patterns and BOM content against current customer implementations.*
