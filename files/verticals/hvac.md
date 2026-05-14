# HVAC and Climate Control — Vertical Profile

## How to use this document

This profile gives the Agent the vertical-specific grounding it needs to recognize HVAC and Climate Control vocabulary, propose typical structures when building new items, and flag likely vertical considerations during edits. It is one of four grounding layers consulted on every request.

**Precedence.** This profile is a prior, not a ground truth. When the customer layer shows the actual environment diverging from what this profile describes, the customer layer wins. The profile never licenses the Agent to override the Admin’s actual configuration.

**Companion documents.** For C1C mechanics referenced in this profile, retrieve alongside: `c1c-data-modeling-best-practices.md`, `c1c-rule-configuration-best-practices.md`, `c1c-bom-best-practices.md`, `c1c-configurator-ux-best-practices.md`, and `c1c-industry-best-practices-agent-guidance.md`. For worked examples of Products, rules, skeletons, and BOMs specific to this vertical, retrieve the Configuration Design deliverable filtered by vertical ID `hvac_climate_control`.

**Profile scope.**
- **Vertical:** HVAC and Climate Control
- **Vertical ID:** `hvac_climate_control`
- **Template version:** 1.0
- **Last updated:** 2026-04-23
- **Primary C1C modules:** Configuration Interface, Bill of Materials, Product Model
- **Common co-verticals:** `fluid_handling_pumps` (circulation and process pumps), `industrial_machinery_equipment` (applied equipment and air handlers)
- **Primary regions:** Both (US dominates AHRI certification; EU uses EN standards and ecodesign framework)

---

## 1. Vertical snapshot

**What they build.** Commercial rooftop units (RTUs), air handling units, unit heaters, radiant heating, fan coils, dampers, VAV terminal boxes, DOAS units, and packaged equipment for commercial buildings — offices, retail, restaurants, schools, light industrial, and multifamily.

**How they sell.** A two-layer channel: manufacturer’s representative firms handle plan-and-spec work with mechanical engineers and contractors on commercial projects, while wholesale distributors stock and sell through installing contractors for light commercial and replacement. National accounts and large owners may buy direct; most commercial volume moves through the rep-distributor-contractor path.

**Configuration character.** Predominantly configure-to-order, with engineered options stacking on a base unit family. Capacity is the anchoring decision, followed by electrical, heat source, controls, and accessories. AHRI certification for a specific combination of components is a load-bearing commercial claim — the exact indoor-plus-outdoor-plus-furnace combination listed in the AHRI Directory is what the customer is buying.

**Where C1C work concentrates.** Input Filters for capacity-to-dimension and refrigerant compatibility, Driven Inputs for voltage-by-region and heat-source-by-capacity, Logic Items for climate and code compliance, and BOM Logic for accessories and controls packages.

**Applies to:** new · edit · both &nbsp; **Outcome:** foundation for all downstream retrieval &nbsp; **Downstream:** n/a (context, not recommendation)

---

## 2. Vocabulary and terminology map

| Term | What it is | Typical C1C landing | Notes / traps |
|---|---|---|---|
| Tonnage | Cooling capacity in 12,000-BTU-per-hour units | Input Value on a capacity Input | Primary sizing Input; many downstream filters key off it |
| MBH | Heating capacity in thousands of BTU per hour | Input Value or Attribute | Heating analog to tonnage; appears on heating-capable equipment |
| CFM | Supply airflow rate | Numeric Input, typically Text Field with Range | Paired with static pressure for fan-curve validation |
| Static pressure / ESP | External resistance the fan must overcome | Numeric Input or Attribute | Pair with CFM for fan-sizing; multi-variable checks may need a Logic Item rather than an Input Filter |
| SEER2 / EER / IEER | Efficiency ratings | Attributes on Input Values or on the configuration | Outputs of the selection, not user choices |
| AHRI certified | Certified performance of a specific component combination | Attribute on the configuration output, surfaced via Attribute Display or Product Output | Certification applies to the exact combination; never a user-selected Input Value |
| AHRI Directory | Public database of certified HVACR combinations | Not a C1C construct; contextual reference only | Configurations reference AHRI numbers but do not query the Directory in real time |
| Economizer | Outdoor-air cooling accessory with damper and controls | Input Value on an options Input, with BOM sub-assembly | Availability and requirement vary by climate; frequently a Logic Item |
| DOAS | Dedicated Outdoor Air System | Typically a separate Product rather than an RTU variant | Input structure and BOM diverge enough from packaged RTUs that it’s usually not a variant |
| VAV | Variable Air Volume | Input Value, Input Group, or Product depending on scope | VAV terminal boxes are typically separate Products; VAV-capable RTUs carry it as a control option |
| VFD / ECM | Variable-speed fan drive or electronically commutated motor | Input Value on a fan-control Input | Often required by energy code at specific sizes; triggers additional BOM content |
| BACnet / LonWorks / Modbus | Building automation communication protocols | Input Value on a controls-interface Input | Drives BOM for communication gateway hardware |
| Refrigerant (R-410A / R-454B / R-32) | Working fluid | Input Value, often Driven Input keyed to region and effective date | R-410A is being phased down in the US; logic must honor the effective date, not just today’s calendar |
| Package vs. split | Integrated vs. separated compressor-condenser and evaporator sections | Typically a Product-level distinction, not an Input | Often anchors the first Input Group on the configurator |
| Curb | Roof-mounting adapter for a rooftop unit | Accessory Input Value, drives BOM sub-assembly | Must match unit footprint; common Driven Input keyed to unit model |
| ASHRAE 90.1 / IECC | Energy standards referenced by code | Not a C1C construct; contextual reference only | Cited in Validation Logic Item messages and in efficiency Attribute labels |
| ENERGY STAR | Voluntary program for high-efficiency equipment | Attribute on the configuration, typically derived | Criteria vary by equipment class and region |

**Applies to:** new · edit · both &nbsp; **Outcome:** Agent credibility, faster Q&A response &nbsp; **Downstream:** n/a (recognition layer)

---

## 3. Typical product modeling patterns

### 3.1 Typical Product decomposition

HVAC customers typically create one C1C Product per equipment family — "Packaged Rooftop Unit," "Air Handling Unit," "Unit Heater," "Fan Coil" — not one per tonnage or model number. Capacity, voltage, heat type, and options belong inside the Product as Inputs; rolling tonnage into Product identity explodes maintenance. Split systems, DOAS units, and VAV terminal boxes are usually separate Products because their Input structures and BOMs diverge meaningfully from packaged RTUs. Multi-unit building projects — a mixed rooftop fleet across one building — are typically handled through the quoting layer rather than as a single nested configuration, since each unit carries its own AHRI reference and independent commercial commitments.

### 3.2 Typical Input Group structure

| Input Group | Typical position | What it usually contains | Notes |
|---|---|---|---|
| Application and Context | First | Climate zone, service (comfort, process, make-up air), indoor/outdoor | Gates visibility for economizer, heating, refrigerant |
| Capacity and Sizing | Second | Tonnage, MBH, CFM, external static pressure | Primary Inputs; most downstream filters key off these |
| Heating Source | Mid | Gas, electric, hot water, heat pump, none | Drives BOM heavily — different burner, coil, and vent content |
| Electrical | Mid | Voltage, phase, frequency | Typically Driven Input off region and capacity; single-phase availability is capacity-capped |
| Fans and Drives | Mid | Supply fan type, VFD/ECM, return or exhaust fan presence | Energy code often forces VFD at specific capacity thresholds |
| Controls and BAS | Mid-late | Unit controls, BACnet/Modbus/LonWorks, sensor package | Drives control panel BOM; often a stand-alone Input Group |
| Accessories | Late | Economizer, dampers, filters, coil coatings, hail guards | Options layer; significant BOM implications |
| Compliance and Certifications | Late | Efficiency targets, AHRI reference, seismic, hurricane | Usually Attributes rather than user-selected Input Values |

### 3.3 Global Product candidates and nested configuration usage

**Global Product candidates.**
- Electrical configuration Input — voltage, phase, Hz reused across most equipment families
- Controls and BAS communication Input — same protocol options appear on every controllable product
- Standard accessory packages — curb adapters, filter options, hail guards recur across packaged equipment lines

**Nested configuration typical uses.**
- DOAS-plus-VAV systems where the DOAS feeds VAV zones — parent DOAS configuration, child VAV zone configurations
- Split systems with matched indoor and outdoor units that must align on capacity and refrigerant

**Not typically nested in this vertical.**
- Multi-RTU building projects (handled as line items at the quote level)
- Individual accessories (kept flat as Input Values on the parent)

**Applies to:** new (primary) · edit (secondary, as reference for ripple analysis) &nbsp; **Outcome:** quote accuracy, maintainability, catalog expansion velocity &nbsp; **Downstream:** Admin authoring speed, sales rep configurator clarity, engineering handoff cleanliness

---

## 4. Typical rule patterns

| Pattern | What it enforces | Typical C1C mechanism | Typical Logic Group | Notes |
|---|---|---|---|---|
| Capacity-to-cabinet matching | Tonnage must fit in a cabinet physically sized for it | Driven Input | — | Compact when cabinet sizes are discrete; becomes Input Filter if cabinet is attribute-driven |
| Voltage and phase availability | Electrical availability varies by capacity and region | Driven Input | — | Single-phase typically capped at small tonnages; 480V common in commercial |
| Heat source by region and climate | Gas, heat pump, or dual-fuel availability varies | Driven Input | — | Climate zone from the Application group drives; dual-fuel adds both gas and heat pump BOM content |
| Refrigerant by region and date | Permitted refrigerant depends on region regulation and in-service date | Driven Input with a date Attribute | — | Honor the effective date, not today’s calendar — phase-downs are scheduled ahead |
| Minimum efficiency compliance | Efficiency must meet ASHRAE 90.1 or local IECC floor | Logic Item (Interface, Validation) | Validation Group | Error Message should cite the specific code and edition |
| Altitude derating | Rated capacity drops above specified elevation | Logic Item (Interface, Dependency) | Materials / Compatibility Group | Lock or adjust capacity; surface the derating visibly rather than blocking silently |
| Economizer by climate | Economizer required or not recommended by climate region | Logic Item (Interface, Visibility) | Visibility Group | Hide/show rather than block; Admin rarely wants an Error Message here |
| VFD required at capacity threshold | Energy code requires variable-speed fan at or above a size | Logic Item (Interface, Dependency) | Materials / Compatibility Group | Common compliance-driven rule; drives BOM addition |
| Controls protocol to hardware | Selected BAS protocol drives controls board and gateway | BOM Logic Item | — | Interface side handles visibility; BOM side handles hardware |
| Curb-to-unit match | Roof curb must match the specific unit footprint | Driven Item Master | — | One of the most common factory corrections when mismatched |
| Coating by environment | Coastal or chemical environments require coil coating | Logic Item (Interface, Dependency) | Options Group | Drives BOM for coating option plus additional lead time |
| Accessory-to-BOM mapping | Option selection drives BOM additions | BOM Logic Item | — | Interface Logic is the wrong tool — accessories belong in BOM Logic |
| Hurricane and seismic package | Region drives tie-down, shipping reinforcement, curb bracing | Logic Item (Interface, Dependency) | Options Group | Often regulatory for coastal installations |

**Applies to:** new (primary) · edit (secondary, as reference for ripple analysis on rule changes) &nbsp; **Outcome:** quote accuracy, rule maintainability, reduced factory corrections &nbsp; **Downstream:** sales rep error reduction, engineering handoff cleanliness, Admin debuggability

---

## 5. Typical BOM and skeleton patterns

### 5.1 Typical BOM construction patterns

| Pattern | What it produces | Typical C1C mechanism | Notes |
|---|---|---|---|
| Heat section by heat source | Burner assembly, gas train, flue, or electric heat strips | Driven Item Master | Heat-source Input drives; each source has distinct BOM content including safety devices |
| Coil by capacity and refrigerant | Evaporator and condenser coils sized and matched to refrigerant | Driven Item Master | Multiple drivers; watch for combinatorial explosion — Input Filter may be better for high-option catalogs |
| Fan and motor | Fan wheel, motor, drive or ECM | Driven Item Master | CFM and static pressure drive; VFD presence typically triggers a separate BOM line |
| Control panel | PCB, transformer, BAS gateway, sensor harness | Item Subassembly under a controls Item Family | Separate sub-assembly keeps manufacturing content organized |
| Economizer sub-assembly | Damper, actuator, sensor, linkage | Item Subassembly under an options Item Family | Gated by BOM Logic against the economizer Input |
| Curb and flashing | Roof curb matched to unit, flashing, weatherstrip | Driven Item Master | Keyed off unit model; mismatches drive factory corrections |
| Nameplate and labels | Per-configuration nameplate with serial, efficiency, AHRI reference, refrigerant | Item Family with Item Master Automation | Smart Part Number includes config data; test regeneration — SPNs are immutable once saved |
| Shipping kit | Straps, pallet, protective covers, installation docs | Static Skeleton lines plus weight-driven BOM Logic | Oversized shipments have freight implications beyond C1C’s direct scope |
| Optional accessory roll-up | Filter upgrade, hail guard, service disconnect, exhaust fan | BOM Logic Items | Individual BOM Logic Items; avoid Interface Logic for these |

### 5.2 Invisible BOM content typical in this vertical

- Refrigerant charge — weight and type driven by configuration, not a user choice
- Gas train components — regulator, shutoff valves, flex connector — bundled inside the heat-section Item Family
- Condensate drain hardware — trap, line kit, drain pan
- Mounting and lifting hardware — rigging brackets, lifting lugs
- Factory test and startup documentation — commissioning records, factory run test certificate
- Nameplate, efficiency label, AHRI reference label — per-unit data that drives regulatory and customer-facing labeling

**Applies to:** new (primary — BOM structure) · edit (primary — BOM changes ripple to manufacturing) &nbsp; **Outcome:** factory correction reduction, on-time delivery, manufacturing accuracy &nbsp; **Downstream:** engineering handoff quality, manufacturing floor accuracy, aftermarket parts identification

---

## 6. Integration expectations

| System / category | Type | Relationship to C1C | Notes |
|---|---|---|---|
| Carrier HAP / Trane TRACE 3D / IES | Selection / sizing | Upstream | Load calculation upstream of equipment selection; outputs become inputs to C1C |
| AHRI Directory | Regulatory database | Adjacent (not integrated) | Certification lookup; configurations reference AHRI numbers but do not query in real time |
| ASHRAE 90.1 / IECC / local energy codes | Regulatory reference | Adjacent (not integrated) | Cited in Error Message content and efficiency Attribute labels |
| Rep and distributor portals | Dealer portal | Downstream | Configurations published to portals for rep-run selections; often the most active Product Output destination |
| ERP (NetSuite, SAP, Oracle, Epicor) | ERP | Downstream | BOM and configuration-to-order handoff; NetSuite is the Revalize reference integration for new deployments |
| CAD (SolidWorks, Inventor, Revit) | CAD | Bidirectional | Revit families inform configurator imagery; Product Outputs drive CAD submittal drawings |
| Building automation platforms (Niagara, Metasys, Desigo) | Industry design tool | Downstream (reference only) | Controls BOM must carry the right gateway hardware; actual integration is the installer’s responsibility |
| Utility rebate programs and ENERGY STAR | Regulatory database | Adjacent (not integrated) | Efficiency Attributes drive eligibility commentary in quote documents |

**Applies to:** new · edit · both &nbsp; **Outcome:** Agent credibility on adjacent-systems conversations, correct scoping of integration vs. non-integration questions &nbsp; **Downstream:** engineering handoff awareness, rep / distributor workflow awareness

---

## 7. Document types and interpretation cues

| Document type | Typical source | Fields the Agent should expect | Interpretation traps |
|---|---|---|---|
| Engineer’s specification (plan-and-spec) | Mechanical engineer / spec writer | Required capacity, efficiency floors, controls requirements, accessory list, compliance citations | Specs are written to multiple manufacturers; the same feature appears under slightly different names; compliance citations may reference old editions |
| Load calculation output | Carrier HAP, Trane TRACE 3D, IES, or similar | Cooling load, heating load, CFM, outdoor design conditions, altitude | Design load is not selected capacity — equipment is typically over-sized by a safety margin; don’t treat the load value as the required tonnage |
| AHRI certificate | AHRI Directory or manufacturer | AHRI reference number, rated capacity, efficiency values, tested combination components | A certificate identifies an exact combination; substituting any component invalidates it |
| Submittal package | Rep / distributor | Unit model, options selected, performance data, dimensions, electrical, controls schematic | Redlines and revision marks matter — the latest revision is authoritative |
| Product catalog page | Manufacturer product marketing | Model lineup, option codes, accessory codes, performance tables | Option codes vary by manufacturer; tables often require cross-reference between the unit code and a separate option decoder |
| Shop drawing | Engineering | Dimensions, weights, rigging points, clearance requirements | Manufacturing-level drawings, not sales authority for configurator content |
| Rebate or incentive program spec | Utility or government agency | Required SEER2, IEER, EER thresholds by equipment class and region | Incentive thresholds change annually; check effective dates explicitly |

**Applies to:** new · edit · both &nbsp; **Outcome:** extraction accuracy, reduction of clarification loops, faster document-driven changes &nbsp; **Downstream:** Admin session velocity

---

## 8. Downstream user expectations

### 8.1 Sales rep expectations

Sales engineers at independent manufacturer reps handle commercial plan-and-spec work; salespeople at wholesale distributors handle replacement and light commercial via contractors; direct salespeople handle national accounts. Technical literacy is typically high for applied equipment (DOAS, AHU, VAV) and more variable for packaged RTU sales, where distributor salespeople serve contractors with less technical background. The rep needs the configurator to deliver a valid unit selection, a submittal package, an AHRI reference where available, and a printable quote — often on deadlines tied to bid close dates. Configurators that force a rep to walk through ten pages of non-applicable options to reach the economizer either stop being used or get replaced with spreadsheets. Rep-facing configurators that default intelligently from application context and hide irrelevant options win adoption.

### 8.2 Engineering and manufacturing expectations

In-house engineering handles custom requests that fall outside the configurator’s scope; shop-floor assemblers work from the BOM and routing for standard configurations. Manufacturing expects a BOM that fully reflects the heat source, the electrical configuration, the controls package, the curb, and every accessory — and a nameplate spec with the correct refrigerant charge, efficiency values, and AHRI reference number. The handoff most commonly breaks on curbs that don’t match the unit footprint, control panels that are missing the ordered BAS gateway, and coil coatings specified on the configurator but not actually added to the BOM because the Admin used Interface Logic instead of BOM Logic for the coating option.

### 8.3 End customer expectations

Mechanical contractors for installation and the building owner or facility manager for ongoing operation. The contractor expects a submittal that matches what was bid, equipment that arrives with the AHRI-certified combination intact, and a curb that fits the rooftop opening. The owner expects the efficiency ratings and utility-rebate eligibility claimed at quote time to hold at installation. "Wrong" looks like an RTU that arrives with a different coil than ordered (losing AHRI certification and possibly rebate eligibility) or a curb that doesn’t match the unit and requires onsite modification. Both are expensive to correct and visible on the jobsite.

**Applies to:** new (primary) · edit (primary — edits ripple downstream more than new items sometimes, because expectations are already set) &nbsp; **Outcome:** factory correction reduction, rep adoption, end-customer quote acceptance &nbsp; **Downstream:** the whole point — this section IS the downstream-impact lens

---

## 9. How Admins in this vertical tend to mis-model

- **Modeling efficiency ratings as user Inputs.** SEER2, EER, IEER, and AFUE are outcomes of the configuration, not user choices. Admins sometimes create Inputs so reps can "select the efficiency they want," producing configurations with efficiency values that don’t match the selected equipment. Efficiency values are Attributes on the combination, surfaced through Attribute Display or Product Output — never a user Input.

- **Modeling AHRI certification as an Input Value.** AHRI certification is a property of a specific combination of components, not a user selection. Admins sometimes add an "AHRI Certified" Input Value the rep can toggle; the right pattern is an Attribute derived from whether the selected combination matches a certified AHRI reference, displayed on the submittal but not user-toggleable.

- **Creating a separate Product per tonnage.** A 3-ton RTU and a 5-ton RTU from the same family share most Inputs, most rule logic, and most of the BOM. Modeling them as separate Products multiplies maintenance load and prevents reuse. Tonnage is an Input Value, not Product identity — the same pattern applies to voltage, heat source, and controls variant.

- **Refrigerant as a free user choice.** Refrigerant availability is driven by region, in-service date, and equipment family. When Admins make it a free Input Value, configurators let reps select a refrigerant for a region where it’s no longer permitted on new equipment. Refrigerant needs Driven Input logic against region and effective date — and the effective date matters because phase-downs are scheduled ahead of today.

- **Treating the controls package as a single Input Value.** "BACnet" or "LonWorks" describes a protocol, but the actual configuration requires a specific controls board, a specific gateway, a specific harness, and often a specific sensor set. Collapsing to one Input Value produces a configurator that reads cleanly to reps and a BOM missing the gateway hardware. Protocol is the user-facing Input; BOM Logic translates protocol into board and gateway Item Masters.

- **Modeling altitude as a hard block.** Customers in Denver, Albuquerque, and mountain markets need derated units, not error messages. Configurators that block at altitude push reps to call the factory instead of using the tool. The right pattern is a dependency Logic Item that adjusts capacity and surfaces the derated performance visibly.

- **Assuming economizer behaves the same across climates.** In colder ASHRAE climate zones, economizers are typically required by energy code; in warm-humid zones, they may not pay back the capital cost. Admins sometimes write one climate-blind economizer Logic Item. The right pattern treats the economizer decision as climate-gated, with the Logic Item reading from the Application and Context Input Group.

**Applies to:** new (primary) · edit (secondary) &nbsp; **Outcome:** better initial modeling decisions, reduced rework, better catalog expansion &nbsp; **Downstream:** Admin’s future self, rule maintainability, configurator UX

---

## 10. Vertical edge cases and guardrail triggers

| Edge case | Trigger signal | Guardrail posture | Notes |
|---|---|---|---|
| Refrigerant phase-down violation | Edit to refrigerant-related Inputs, or new configurations with legacy refrigerant in regulated regions after phase-down effective date | Pause and confirm | Agent flags that refrigerant regulation may apply; does not determine regulatory status itself. Refer to product engineering |
| AHRI certification at risk | Change to any component of a certified combination — coil, compressor, fan, heat source | Pause and confirm | Component substitution invalidates AHRI certification; the Admin must confirm whether a new certification applies or the claim must be removed |
| Energy code compliance boundary | Edit that moves an efficiency Attribute below a code-relevant threshold, or adds a configuration in a region with a higher code floor | Flag for Admin review | Agent surfaces the affected code (ASHRAE 90.1, local IECC) and the projected value; does not certify compliance |
| Utility rebate eligibility change | Configuration changes that move SEER2, IEER, or EER below a rebate threshold | Flag for Admin review | Rebate programs change annually by region; surface the dependency without asserting current eligibility |
| Hazardous-location electrical classification | Process applications with explosive atmospheres; changes to motor enclosure or junction box | Pause and confirm | Area classification is plant engineering’s decision; the Agent flags that the substitution may violate the original classification |
| Structural load on existing roof | Edits increasing unit weight for retrofit applications | Flag for Admin review | Flag the weight change; the Agent does not do structural calculation — defer to the customer’s engineering |
| Seismic or hurricane zone omissions | Configurations in seismic or hurricane regions without tie-down or reinforcement options | Flag for Admin review | Region-to-hardware gating is typical; flag configurations that skip it |

**Applies to:** new · edit (edits are where most edge-case triggers fire — an Admin modifying an existing configuration is the highest-risk surface for regulatory and safety edges) · both &nbsp; **Outcome:** risk reduction, compliance posture, audit defensibility &nbsp; **Downstream:** regulatory affairs workflow, legal defensibility, end-customer safety where applicable &nbsp; **Guardrail:** primary input to vertical-aware guardrail behavior

---

*Document version: 1.0 · Profile authored against vertical profile template v1.0. Contains real grounding on AHRI Product Performance Certification Program, ASHRAE 90.1 and IECC energy code structure, US refrigerant phase-down schedule (R-410A to R-454B/R-32), rep/distributor/contractor channel structure (HARDI, AD, independent rep firms), and load-calculation ecosystem (Carrier HAP, Trane TRACE). Author review should validate specific rule patterns and BOM content against current customer implementations.*
