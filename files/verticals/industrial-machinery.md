# Industrial Machinery and Equipment — Vertical Profile

## How to use this document

This profile gives the Agent the vertical-specific grounding it needs to recognize Industrial Machinery and Equipment vocabulary, propose typical structures when building new items, and flag likely vertical considerations during edits. It is one of four grounding layers consulted on every request.

**Precedence.** This profile is a prior, not a ground truth. When the customer layer shows the actual environment diverging from what this profile describes, the customer layer wins. The profile never licenses the Agent to override the Admin’s actual configuration.

**Companion documents.** For C1C mechanics referenced in this profile, retrieve alongside: `c1c-data-modeling-best-practices.md`, `c1c-rule-configuration-best-practices.md`, `c1c-bom-best-practices.md`, `c1c-configurator-ux-best-practices.md`, and `c1c-industry-best-practices-agent-guidance.md`. For worked examples of Products, rules, skeletons, and BOMs specific to this vertical, retrieve the Configuration Design deliverable filtered by vertical ID `industrial_machinery_equipment`.

**Profile scope.**
- **Vertical:** Industrial Machinery and Equipment
- **Vertical ID:** `industrial_machinery_equipment`
- **Template version:** 1.0
- **Last updated:** 2026-04-23
- **Primary C1C modules:** Configuration Interface, Bill of Materials, Product Model, Product Outputs
- **Common co-verticals:** `fluid_handling_pumps` (machinery that integrates pumps), `foodservice_equipment` (food processing machinery), `motor_vehicles_truck_bodies` (material handling for vehicle manufacturing)
- **Primary regions:** Both (US and EU; EU regulatory pressure on machinery safety is higher via the Machinery Regulation replacing the Machinery Directive in 2027)

---

## 1. Vertical snapshot

**What they build.** Engineered machinery including conveyor systems, material handling equipment, packaging machines, industrial presses, compressors, mixers, dryers, extruders, industrial tools, and automation cells. High BOM complexity with deep part hierarchies; heavy reliance on modular sub-assemblies.

**How they sell.** Direct sales for capital equipment and OEM components; dealer and integrator channels for packaged machinery; long sales cycles with technical feasibility gates before commercial commitment. Deal structure frequently includes engineering hours as a priced line, installation, commissioning, and service contracts.

**Configuration character.** Mix of engineer-to-order (fully custom), configure-to-order (modular assembly of validated options), and assemble-to-order (standard catalog with limited variants). The strategic trend is to shift ETO toward CTO wherever possible, because repeatable designs cut cost and lead time substantially. Safety-related control systems governed by ISO 13849-1 (Performance Level) or IEC 62061 (SIL) are often part of the configured deliverable and interact with the configurator via option-driven accessory decisions.

**Where C1C work concentrates.** Driven Inputs for modular compatibility matrices, Iterators for multi-station and multi-zone machinery, BOM Logic for deep hierarchical assemblies, and Product Outputs for CAD drawing generation and engineering submittal packages.

**Applies to:** new · edit · both &nbsp; **Outcome:** foundation for all downstream retrieval &nbsp; **Downstream:** n/a (context, not recommendation)

---

## 2. Vocabulary and terminology map

| Term | What it is | Typical C1C landing | Notes / traps |
|---|---|---|---|
| BOM explosion | Expansion of a parent assembly into its child items, recursively | The BOM output produced by the configurator; not a C1C construct per se | Depth typical in this vertical is 4-8 levels; model with Item Families and Subassemblies |
| ETO / CTO / ATO / MTO | Engineer-to-order, configure-to-order, assemble-to-order, make-to-order | Classification at the Product level, often reflected in Product Category | ETO Products typically carry ECO workflow; CTO / ATO Products typically don’t |
| ECO (Engineering Change Order) | Controlled change to an engineering design, with review and approval | Typically a workflow outside C1C, but configurations may be flagged as "pending ECO" | Don’t model ECO state as configuration Inputs — it’s a lifecycle state on the customer’s engineering system |
| Routing | Manufacturing operation sequence with work centers and times | Product Output (Routing type) | Flows to ERP for MRP; when not configured, represents the last manual step between quote and production |
| Work center | Physical or logical production station | Attribute on Routing lines, not an Input | Referenced during Routing setup; customer-specific |
| Performance Level (PL) | Safety reliability rating per ISO 13849-1 (PLa - PLe) | Attribute on safety-option Input Values | Required PL determined by risk assessment — not a configurator determination |
| SIL (Safety Integrity Level) | Safety reliability rating per IEC 62061 (SIL 1-3) | Attribute on safety-option Input Values | Alternative to PL; some customers use both frameworks |
| SRP/CS | Safety-Related Parts of Control Systems | Not a C1C construct; contextual reference only | Referenced in safety documentation and validation Logic Item messages |
| E-stop | Emergency stop function | Option Input Value, typically required on most machines | Its own safety function with its own PL or SIL requirement |
| CE marking | Manufacturer’s self-declaration of EU conformity | Attribute on the configuration or Product Output content | Requires Machinery Directive (transitioning to Machinery Regulation in 2027) conformity; cascades to documentation deliverables |
| UL Listed / CSA | North American electrical safety certifications | Attribute on Input Values or configurations | Sometimes required by customer / region; specific to equipment classification |
| PLC | Programmable Logic Controller | Input or Item Master; brand / model selection is typical | Often Global Product scope when the same PLC family serves multiple machinery lines |
| HMI | Human-Machine Interface (operator panel) | Input or Item Master | Size, resolution, protocol are typical Attributes |
| VFD / Variable Frequency Drive | Motor speed controller | Input Value with BOM Logic implications | Common across motorized machinery; often a Global Product candidate |
| Servo drive / servo motor | Precision motion control components | Input and Item Master; often driven by motion requirements | Paired selection — drive and motor must match on voltage, torque, feedback |
| IP rating | Ingress protection code (IP20, IP55, IP66, etc.) | Attribute on component Input Values | Drives enclosure selection; environmental-match validation is common |
| NEMA enclosure rating | North American enclosure classification (NEMA 1, 4, 4X, 12) | Attribute on enclosure Input Values | Parallel to IP but on a different scale; region-driven |
| IIoT / Industry 4.0 | Connected / sensor-enabled machinery | Option Input Group; not a configurator mechanic | Typically adds sensor, gateway, and software Item Masters |
| MRP | Material Requirements Planning | Not a C1C construct; contextual reference only | The downstream ERP function that consumes the BOM and Routing |

**Applies to:** new · edit · both &nbsp; **Outcome:** Agent credibility, faster Q&A response &nbsp; **Downstream:** n/a (recognition layer)

---

## 3. Typical product modeling patterns

### 3.1 Typical Product decomposition

Industrial Machinery customers typically create one C1C Product per machine family or platform (e.g., "Belt Conveyor," "Modular Conveyor Line," "Hydraulic Press," "Vertical Form Fill Seal Packager"). Size, throughput, and motor options are Inputs inside the Product. Fully custom ETO machinery often does not belong in C1C as a configured Product at all — it’s handled through an engineering project workflow with the ECO system and C1C captures only the commercial scope and quote package. Modular machinery like conveyor lines or packaging systems is typically modeled as a parent "line" or "system" Product with per-station child configurations using nested configuration. Multi-station machinery with repeating identical modules uses Iterators.

### 3.2 Typical Input Group structure

| Input Group | Typical position | What it usually contains | Notes |
|---|---|---|---|
| Application / Use Case | First | Industry, product handled (bulk / unit / fragile / heavy), environment, throughput target | Drives visibility of material, speed, and safety option groups |
| Size and Throughput | First-second | Dimensions, capacity, rate (per hour / per minute), cycle time | Primary sizing Inputs; many downstream filters key off these |
| Drive and Motion | Mid | Motor type, motor HP, drive type (VFD, servo, pneumatic), reducer | Often includes derived Inputs from a motor-sizing Product Equation |
| Materials of Construction | Mid | Frame material (mild steel, stainless, aluminum), contact material, coating | Material class often drives wet-end sub-assembly on downstream content (food / pharma / chemical) |
| Controls and Automation | Mid | PLC, HMI, control voltage, communication protocols, I/O count | Commonly a Global Product when the controls catalog is shared |
| Safety | Mid-late | E-stop count, light curtain / laser scanner, safety PLC / safety relay, required PL or SIL | Safety-function selection drives regulatory documentation in Product Outputs |
| Options / Accessories | Late | Sensors, meters, lubrication, air-prep, specialty tooling | Large and configuration-dependent; each accessory typically carries BOM Logic |
| Documentation and Compliance | Late | CE, UL, region-specific compliance targets, documentation language | Typically Attributes on configurations; drive Product Output selection and content |

### 3.3 Global Product candidates and nested configuration usage

**Global Product candidates.**
- Motor selection Input Group — shared across motorized machinery lines, same motor catalog
- Controls hardware (PLC, HMI, safety relay) — shared across machinery families
- Enclosure / ingress-protection Input — reused where enclosure decisions are shared
- Standard safety-options Input Group (E-stop, light curtains, interlocks) — reused across safeguarded machinery

**Nested configuration typical uses.**
- Modular conveyor or packaging lines — parent line with per-station child configurations (infeed, metering, sealing, discharge)
- Multi-machine cells (e.g., a robotic cell with press, conveyor, and controls) — parent cell with child machine configurations
- System-level quotes combining machinery plus ancillary equipment (e.g., press plus die plus material handler)

**Not typically nested in this vertical.**
- Accessories on a single-machine Product (stays flat as Input Values or option Input Groups)
- Motor and drive (paired selection but rarely a separate child configuration)

**Applies to:** new (primary) · edit (secondary, as reference for ripple analysis) &nbsp; **Outcome:** quote accuracy, maintainability, catalog expansion velocity &nbsp; **Downstream:** Admin authoring speed, sales rep configurator clarity, engineering handoff cleanliness

---

## 4. Typical rule patterns

| Pattern | What it enforces | Typical C1C mechanism | Typical Logic Group | Notes |
|---|---|---|---|---|
| Motor sizing | Required motor HP derived from load, speed, and duty | Product Equation (for required HP) plus Input Filter (for selection) | — | Do not model as a Logic Item — the calculation belongs in Product Equations |
| Drive-to-motor compatibility | VFD / servo drive must match motor on voltage, current, frame, feedback | Driven Input | — | Paired selection; drive catalog is often Global Product scope |
| Voltage / phase availability by region | Valid voltage and phase combinations vary by region | Driven Input | — | Region typically in the Application Input Group |
| Material-to-product compatibility | Frame and contact materials must suit product handled and environment | Input Filter | — | Food, pharma, and chemical applications carry attribute-driven cascades |
| Enclosure rating match | Selected enclosure IP / NEMA rating must meet environment classification | Input Filter | — | Environmental class is typically an Attribute on the Application group |
| Safety Performance Level | Required PL (or SIL) for each safety function must be met by selected safety components | Logic Item (Interface, Validation) | Validation Group | Error Message should cite ISO 13849 / IEC 62061 and the specific function |
| E-stop redundancy | Number and placement of E-stops must match machine length / operator zones | Logic Item (Interface, Dependency) | Materials / Compatibility Group | Can lock the E-stop quantity Input based on machine-length Input |
| Light curtain / laser scanner coverage | Safeguarded area must be covered given machine dimensions and access points | Input Filter or Logic Item | Validation Group | Often requires an Attribute Display to show the projected guarded area |
| Modular station compatibility | Adjacent stations in a conveyor / packaging line must be height / width / speed compatible | Input Filter on nested child configurations | — | The validation runs at the parent-line level against child Attributes |
| PLC I/O capacity | Selected PLC must have enough I/O points for all selected sensors and actuators | Logic Item (Interface, Validation) | Validation Group | Requires Product Equation to compute required I/O; compare against PLC Attribute |
| Communication protocol compatibility | Selected devices (drives, HMI, safety) must share a common bus (EtherNet/IP, Profinet, Modbus) | Input Filter | — | Protocol is typically an Attribute on each communicating device |
| Region documentation requirement | Region selection drives required documentation language and compliance declarations | Logic Item (Output, conditional) | — | Drives which Product Outputs fire — conformity declarations, CE documentation, UL documentation |
| Accessory-to-BOM mapping | Option selection (sensor, meter, lubrication kit) drives BOM additions | BOM Logic Item | — | Keep out of Interface Logic; BOM concerns belong in BOM Logic |
| Duty cycle derating | Continuous vs. intermittent duty affects motor and bearing selection | Logic Item (Interface, Dependency) | Materials / Compatibility Group | Can lock motor selection to a derated option, or trigger a warning |
| Throughput-to-drive sizing | Throughput-driven drive capacity is sufficient with margin | Input Filter with Product Equation | — | Throughput is an Input; required drive capacity is an equation output; selection is filtered |

**Applies to:** new (primary) · edit (secondary, as reference for ripple analysis on rule changes) &nbsp; **Outcome:** quote accuracy, rule maintainability, reduced factory corrections &nbsp; **Downstream:** sales rep error reduction, engineering handoff cleanliness, Admin debuggability

---

## 5. Typical BOM and skeleton patterns

### 5.1 Typical BOM construction patterns

| Pattern | What it produces | Typical C1C mechanism | Notes |
|---|---|---|---|
| Frame / structural sub-assembly | Main machine frame with legs, cross-members, guarding mounts | Item Subassembly under a frame Item Family | Dimensions driven by size Inputs; generated Smart Part Numbers encode key dimensions |
| Drive assembly | Motor, gearbox / reducer, drive mount, coupling | Item Subassembly; Driven Item Master for motor catalog | Paired selection — motor and gearbox must match; modeling both as Driven Item Master off the same driver Input works well |
| Controls cabinet sub-assembly | PLC, HMI, safety relay, contactors, terminal blocks, wiring harness | Item Subassembly under a controls Item Family | Complex and often the single largest sub-assembly; frequent source of controls-to-BOM drift |
| Conveyor belt / chain / band | Material-specific belting selection | Driven Item Master | Driven by material handled and machine length; length is often an Iterator-chained dimension |
| Multi-station line | N stations under a line parent | Config Iterator chained to BOM Iterator, plus static line-level items | Station heterogeneity is common — stations differ; typically modeled with nested child configurations rather than Iterators |
| Safety components package | Light curtains, scanners, safety relays, E-stops | BOM Logic Item adding multiple Item Masters | Must align with safety-option Input selections; easy to under-model the supporting brackets and wiring |
| Guarding and enclosure | Panels, doors, interlocks, mounting hardware | Driven Item Master for panel selection; BOM Logic for door and interlock counts | Guarded perimeter is often derived from machine dimensions via Product Equation |
| Sensors and instrumentation | Proximity, photo-eye, encoder, temperature, pressure sensors | BOM Logic Item adding Item Masters keyed off option Inputs | Sensor mounting brackets are frequently forgotten |
| Lubrication / air-prep / utilities | Grease fittings, filter-regulator-lubricator (FRL), air and water manifolds | BOM Logic Item | Small in cost but critical for commissioning |
| Documentation package | O&M manual, wiring diagrams, PLC program, risk assessment, declaration of conformity | Item Family with per-configuration document generation | Language and regulatory content driven by region Input |
| Spare parts kit | First-year spares, consumables | Item Family with its own selection logic | Often priced separately; should not be bundled into the main BOM by default |
| Shipping and crating | Packaging, labels, fastening, rigging | Static BOM Skeleton lines with quantity equations | Crate dimensions typically come from machine dimension Product Equations |

### 5.2 Invisible BOM content typical in this vertical

- Nameplate and safety labels — generated per configuration, carry CE / UL / CSA marks as applicable
- Fasteners (bolts, nuts, washers) — consolidated hardware kits, typically one or two Item Masters covering a broad range of configurations
- Wiring harness for sensors and actuators — length and connector type driven by machine dimensions and sensor count
- Cable tray / conduit — sized by control-cabinet-to-field distance, often overlooked
- Grease, oil, and break-in lubricants — small consumables required for commissioning
- Shipping blocks / stabilizer brackets — removed at installation but required during transport
- Commissioning documentation bundle — startup checklist, test records, training materials
- Risk assessment documentation — required per Machinery Directive / Machinery Regulation for CE marking; often forgotten as a BOM-tracked deliverable

**Applies to:** new (primary — BOM structure) · edit (primary — BOM changes ripple to manufacturing) &nbsp; **Outcome:** factory correction reduction, on-time delivery, manufacturing accuracy &nbsp; **Downstream:** engineering handoff quality, manufacturing floor accuracy, aftermarket parts identification

---

## 6. Integration expectations

| System / category | Type | Relationship to C1C | Notes |
|---|---|---|---|
| CAD (SolidWorks, Inventor, Creo, NX) | CAD | Bidirectional | Product Outputs drive CAD drawing generation; CAD configurations feed equipment Item Master libraries. Revalize’s PROCAD and PRO.FILE PLM tools integrate in this space |
| ERP (SAP, Oracle, Epicor, IFS, NetSuite) | ERP | Downstream | BOM and Routing handoff; NetSuite is Revalize’s reference integration for new deployments |
| PLM / PDM | PLM | Bidirectional | Item Master catalog and engineering BOM source; ECO workflow lives here. Revalize’s keytech and PRO.FILE serve this space |
| MRP / MES | Manufacturing execution | Downstream | Shop-floor execution; consumes Routing and BOM from ERP but may also receive configuration data directly |
| Engineering change management | Workflow | Adjacent (not integrated) | ECO system; configurations may be flagged pending an ECO but ECO state isn’t a C1C Input |
| Dealer / integrator portals | Dealer portal | Downstream | Published Products for channel sales; Product Outputs feed portal catalogs |
| Functional safety analysis tools (SISTEMA, etc.) | Industry design tool | Adjacent (not integrated) | Safety calculations done upstream of configurator; outputs may be attached as source documents |
| Commissioning and field service platforms | Industry design tool | Downstream | Configuration spec sheets feed commissioning workflows; typically document-based |

**Applies to:** new · edit · both &nbsp; **Outcome:** Agent credibility on adjacent-systems conversations, correct scoping of integration vs. non-integration questions &nbsp; **Downstream:** engineering handoff awareness, rep / distributor workflow awareness

---

## 7. Document types and interpretation cues

| Document type | Typical source | Fields the Agent should expect | Interpretation traps |
|---|---|---|---|
| Engineering specification | Engineering | Machine dimensions, throughput, materials, drive spec, controls spec, safety requirements | Specifications often mix "required" with "optional" without clear markers; extraction should preserve the distinction |
| Engineering BOM export | Engineering / PLM | Part numbers, descriptions, quantities, level / indent, material | Indentation conventions vary between PLM systems; phantom / reference assemblies may appear without Item Masters |
| CAD assembly model | Engineering | 3D geometry, bill of materials tree, part metadata | Treat the embedded BOM as authoritative for structure; visual geometry is context for validation |
| Request for quote (RFQ) / customer specification | Customer / sales | Application requirements, throughput targets, environmental conditions, compliance requirements | Customer specs are often looser than engineering specs; clarifications frequently needed |
| Risk assessment / safety analysis | Engineering | Hazards identified, risk ratings, required safety functions, required PL or SIL | Not typically configured against directly; read for context about which safety options must be included |
| ECO document | Engineering / PLM | Change description, affected parts, effective date, approval status | Treat ECO content as a description of a pending change, not as authoritative configuration data |
| Motor / drive data sheet | Component vendor | HP, RPM, frame size, voltage, phase, current, enclosure, weight | Service factor varies by duty condition; extract the HP with its associated duty |
| PLC program / automation specification | Engineering / controls engineering | I/O list, communication protocols, safety functions, interlocks | I/O lists are long and mostly not configurator-relevant; extract protocol and I/O count |
| Declaration of Conformity / CE documentation | Regulatory | Directives / regulations applied, harmonized standards, technical file references | Standards cited by version — extract with version because version matters for compliance |

**Applies to:** new · edit · both &nbsp; **Outcome:** extraction accuracy, reduction of clarification loops, faster document-driven changes &nbsp; **Downstream:** Admin session velocity

---

## 8. Downstream user expectations

### 8.1 Sales rep expectations

Direct-sales account managers for capital equipment, application engineers supporting them, and integrator / dealer staff for packaged machinery. Technical literacy varies widely — a direct-sales rep selling a $2M automation cell is deeply technical; a dealer selling a standard conveyor may have far less depth. The rep expects the configurator to move at the pace of the conversation — quick for standard configurations, flexible for ETO flagging. Reps need the configurator to generate a commercial-grade quote package with spec sheet, preliminary drawing or image, and pricing that can go to a customer procurement team. Configurators that require extensive engineering detail to produce a preliminary quote are worse than no configurator — reps bypass them and go to engineering directly.

### 8.2 Engineering and manufacturing expectations

In-house engineering for ETO and semi-custom work, mechanical / electrical / controls engineering subsystems, manufacturing-floor assembly, and field service for installation and commissioning. Engineering expects the BOM to reflect the actual machine — structural frame right, drives and motors matched, controls cabinet content accurate, safety functions supported by the correct hardware, guarding complete. Manufacturing expects routing with work centers and times that reflect actual build sequence. The handoff most commonly breaks on controls-cabinet content where the option list looked right but the terminal blocks, wiring, and brackets are under-modeled; on safety-function gaps where the option drives the hardware but not the required documentation; and on guarding where the perimeter calculation didn’t update after a machine-length edit.

### 8.3 End customer expectations

Manufacturing engineers at end-user plants, plant engineers, operations leaders, and maintenance / reliability engineers for long-term support. The customer expects a quote package with detailed technical specifications, preliminary layout drawings, compliance declarations (CE, UL, CSA as applicable), safety documentation outline, lead time, installation and commissioning scope, and warranty terms. Delivered machinery that matches the quoted specifications is the baseline — substitutions on structural components or safety components are typically rejections, not tolerable variances. Post-sale support for spare parts and service is frequently tied to the delivered BOM, so BOM accuracy affects aftermarket as well as initial delivery.

**Applies to:** new (primary) · edit (primary — edits ripple downstream more than new items sometimes, because expectations are already set) &nbsp; **Outcome:** factory correction reduction, rep adoption, end-customer quote acceptance &nbsp; **Downstream:** the whole point — this section IS the downstream-impact lens

---

## 9. How Admins in this vertical tend to mis-model

- **Trying to model fully ETO machinery in C1C.** The temptation is to handle every deal in C1C for uniformity, but when every machine is custom-designed from scratch, C1C becomes an overhead burden rather than an efficiency tool. Pure ETO deals belong in engineering project workflow; C1C should carry only the commercial scope, BOQ, and quote package. The strategic move is to identify the repeatable subset within ETO-heavy product lines and migrate those to CTO, which is where C1C’s value compounds.

- **Under-modeling the controls cabinet.** Controls are where configurator work commonly under-delivers. The PLC model, HMI model, and primary relays get configured; the terminal blocks, wiring harness, cable tray, labeling, and mounting brackets are modeled as generic sub-assemblies that don’t flex with configuration. Result: factory corrections on nearly every build when something is "close but not quite right" in the cabinet.

- **Flattening a modular line into a single Product.** Packaging and conveyor lines are naturally modular — infeed, process stations, discharge — and the customer’s engineering thinks that way. Admins sometimes model the whole line as one Product with Iterators for station count, which makes heterogeneous stations (different functions) hard to configure. Use nested parent-line / per-station-child configurations so each station is a recognizable object.

- **Modeling safety Performance Level as a free-choice Input.** Required PL is a risk-assessment output, not a configurator choice. The rep / Admin shouldn’t "pick" PLd or PLe; the machine’s risk assessment determines what’s required. Model PL as an Attribute on safety components and validate that selected safety components meet or exceed the required PL — don’t make PL something the user chooses.

- **Ignoring the PL / SIL cascade to documentation.** Selecting a safety function at a given PL creates a downstream obligation for risk-assessment documentation, SISTEMA calculations, and declaration of conformity content. Admins often configure the hardware but not the documentation, leaving engineering to re-create documentation manually for every order. Documentation generation should be driven by the same Inputs that drive the hardware.

- **Hardcoding motor HP on the BOM instead of deriving it.** Motor HP is a function of load, speed, duty, and service factor. Admins sometimes model HP as a user-selected Input and let the user pick anything that "seems right," then hardcode the BOM motor to that selection. The correct pattern is to calculate required HP from load / speed / duty via Product Equation, then filter the motor catalog by HP and other attributes. Letting the user pick HP directly produces under-sized drives that fail in commissioning.

- **Treating region selection as cosmetic.** Region drives compliance requirements (CE in EU, UL / CSA in North America, local requirements elsewhere), documentation language, electrical norms, and sometimes entirely different components. Admins sometimes model region as an Attribute that doesn’t cascade, producing configurations that look right in the wizard and fail at compliance review. Region should cascade to visibility, availability, and documentation generation.

**Applies to:** new (primary) · edit (secondary) &nbsp; **Outcome:** better initial modeling decisions, reduced rework, better catalog expansion &nbsp; **Downstream:** Admin’s future self, rule maintainability, configurator UX

---

## 10. Vertical edge cases and guardrail triggers

| Edge case | Trigger signal | Guardrail posture | Notes |
|---|---|---|---|
| Safety Performance Level at risk | Edit to a safety-option Input, change to a safety-related Attribute, change to safety architecture (single-channel vs. dual-channel) | Pause and confirm | Agent surfaces the safety function that may be affected; refers to safety engineering for re-validation; does not determine PL achievement itself |
| CE marking scope change | Edit that changes region to include EU, or change to a component that affects Machinery Directive / Machinery Regulation conformity | Pause and confirm | Flag the compliance scope change; the re-verification of conformity assessment is the engineering / regulatory affairs responsibility |
| Machinery Regulation transition | New or edited configuration with EU region and target shipment after January 20, 2027 (when Machinery Regulation 2023/1230 replaces Machinery Directive 2006/42/EC) | Flag for Admin review | Surface the transition; the Admin’s regulatory team decides how to handle the specific conformity pathway |
| ECO pending on a referenced component | Edit or configuration using a component flagged as pending an ECO | Flag for Admin review | Agent surfaces the ECO status; does not make the commit / hold decision |
| Safety-function to documentation gap | Configuration with a safety function at PL ≥ c without corresponding documentation Product Outputs enabled | Flag for Admin review | Surface the missing documentation scope; regulatory compliance is the Admin’s determination |
| Motor oversizing / undersizing | Configuration with motor HP significantly different (> 25% either direction) from the Product-Equation-calculated required HP | Flag for Admin review | Agent surfaces the mismatch; the Admin decides whether the override is intentional |
| Multi-station line heterogeneity edit | Edit to a station’s Input Group in a nested line where the change affects interface compatibility with adjacent stations | Pause and confirm | Surface the adjacent-station compatibility check; the line-level validation may need re-running |
| UL / CSA listing boundary | Change to an electrical component that may affect the listing mark’s validity | Pause and confirm | Compliance boundary; surface but do not assess listing validity |

**Applies to:** new · edit (edits are where most edge-case triggers fire — an Admin modifying an existing configuration is the highest-risk surface for regulatory and safety edges) · both &nbsp; **Outcome:** risk reduction, compliance posture, audit defensibility &nbsp; **Downstream:** regulatory affairs workflow, legal defensibility, end-customer safety where applicable &nbsp; **Guardrail:** primary input to vertical-aware guardrail behavior

---

*Document version: 1.0 · Profile authored against vertical profile template v1.0. Contains real grounding on ISO 13849-1 Performance Level and IEC 62061 SIL frameworks, the 2027 Machinery Regulation transition replacing the Machinery Directive, ETO / CTO / ATO / MTO distinctions, and typical CAD and PLM integration patterns. Author review should validate specific rule patterns and BOM content against current customer implementations.*
