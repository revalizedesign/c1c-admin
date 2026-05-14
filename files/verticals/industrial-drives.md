# Industrial Drives and Power Transmission — Vertical Profile

## How to use this document

This profile gives the Agent the vertical-specific grounding it needs to recognize Industrial Drives and Power Transmission vocabulary, propose typical structures when building new items, and flag likely vertical considerations during edits. It is one of four grounding layers consulted on every request.

**Precedence.** This profile is a prior, not a ground truth. When the customer layer shows the actual environment diverging from what this profile describes, the customer layer wins. The profile never licenses the Agent to override the Admin’s actual configuration.

**Companion documents.** For C1C mechanics referenced in this profile, retrieve alongside: `c1c-data-modeling-best-practices.md`, `c1c-rule-configuration-best-practices.md`, `c1c-bom-best-practices.md`, `c1c-configurator-ux-best-practices.md`, and `c1c-industry-best-practices-agent-guidance.md`. For worked examples of Products, rules, skeletons, and BOMs specific to this vertical, retrieve the Configuration Design deliverable filtered by vertical ID `industrial_drives_power_transmission`.

**Profile scope.**
- **Vertical:** Industrial Drives and Power Transmission
- **Vertical ID:** `industrial_drives_power_transmission`
- **Template version:** 1.0
- **Last updated:** 2026-04-30
- **Primary C1C modules:** Configuration Interface, Bill of Materials, Product Model
- **Common co-verticals:** `fluid_handling_pumps`, `hvac_climate_control`, `material_handling_conveyors`, `industrial_machinery_equipment`
- **Primary regions:** Both (US and EU; NEMA / IEC dual-listed motors common; AGMA classifications govern internationally)

---

## 1. Vertical snapshot

**What they build.** Gear reducers, gearmotors, and integrated drive systems — cycloidal, helical (in-line, parallel-shaft, and right-angle), bevel-helical, worm, and planetary. Often combined with motors (NEMA / IEC, premium-efficiency or inverter-duty), brakes, backstops, and mounting accessories. Catalog SKUs typically span fractional HP through 100+ HP, with reduction ratios from 3:1 through tens of thousands when double or triple reductions are stacked.

**How they sell.** Mostly through engineered distributors and authorized resellers, with Application Engineers at the manufacturer providing support for sized-to-application selections. OEM accounts (conveyor builders, mixer makers, packaging machinery, crusher / shredder builders) buy direct in volume. Aftermarket / replacement business runs through industrial parts distributors.

**Configuration character.** Selected to a duty point — required output torque or HP at a specified output speed, with mounting position, motor specification, and accessories. Frame size is determined by the duty point modified by an AGMA Service Factor that reflects the application’s load character and duty cycle. Selection tables in the catalog enumerate the allowed (HP × Ratio → Frame) combinations, and overhung load capacity per frame is a hard validation.

**Where C1C work concentrates.** Driven Inputs for the (HP × Ratio × Service Class → Frame Size) selection matrix and for region-driven motor/voltage/protection chains. Input Filters for shaft compatibility, spec-code availability by HP class, and OHL adequacy. Item Family + Item Master Automation for the Smart Part Number — the model number IS the part number, and the nomenclature on the catalog page is the SPN template. BOM Logic for brake / backstop / bearing-upgrade / accessory inclusion.

**Applies to:** new · edit · both &nbsp; **Outcome:** foundation for all downstream retrieval &nbsp; **Downstream:** n/a (context, not recommendation)

---

## 2. Vocabulary and terminology map

| Term | What it is | Typical C1C landing | Notes / traps |
|---|---|---|---|
| Gearmotor | Integral gear reducer + motor as a single SKU | One Product per drive family; integral vs reducer-only is an Input within the Product | Buying just the reducer (no motor, no input adaptor) is a real SKU class — model as `UNIT_TYPE = Reducer Only` Input, not as a separate Product |
| Reducer | Gear reducer with no motor; customer supplies motor via C-face adaptor or hollow input shaft | `INPUT_TYPE_CODE = JM` (C-face) or `XM` (hollow shaft); excludes motor from BOM | If `UNIT_TYPE = Reducer Only`, all motor Inputs hide |
| Frame size | The reducer body size — primary driver of torque capacity, OHL capacity, and mounting dimensions | Driven Input output (`DRIVE_FRAME_SIZE`); driven by HP × Ratio × AGMA Service Class | Frame size drives lubrication choice (small frames greased, large frames oil-lubricated); cross-reference legacy frames (Cyclo 3000 → 6000, etc.) when modeling migration |
| Reduction ratio | Speed reduction from input to output (e.g., 29:1) | Input Value list; categorized as Planetary / Single / Double / Triple | Ratios 3 and 5 are categorically **Planetary** (different Product Code prefix) — do not lump them with Single Reduction even though they are mathematically a single stage |
| Single / Double / Triple reduction | Number of stacked reduction stages | Hidden derived Input from `DRIVE_RATIO`, OR explicit user-facing Input | Per-vendor catalog convention: each stage range is contiguous (e.g., Cyclo 6000 single 6:1–119:1, double 121:1–7569:1, triple 8041:1+); the gap between 119 and 121 is intentional and triggers stage×ratio invariant errors |
| Mounting style code | Canonical 3–5 char code combining housing, orientation, input type (e.g., CHHM = Cyclo Horizontal Foot Integral) | Single user-facing Select Menu picklist of canonical codes; orientation / housing / input-type / lubrication / position-restriction derived via Logic Items | Decomposing into separate Orientation × Housing × Input Type Inputs creates UX friction — sales reps think and quote in the canonical code |
| AGMA Service Class | I (uniform) / II (moderate shock) / III (heavy shock) — determines required Service Factor | Input set by Driven Input from (Industry × Hours/Day × Load Character); user can override | If overridden, downstream Driven Inputs that depend on it must re-fire — check propagation when allowing override |
| Service Factor | Multiplier (1.0 / 1.4 / 2.0 typical) on rated torque to satisfy AGMA class | Equation lookup from AGMA Class | Frequent start/stop on EP motors triggers a supplemental Service Factor (Method B) — separate from the Method A / C class derivation |
| Overhung load (OHL) | Radial load on the output shaft from a sprocket, pulley, gear, etc. | Numeric Input; validated against frame’s `MAX_OHL_LBS` Attribute | If application OHL exceeds frame capacity, recommend R1 (high-cap bearing) or R2 (high-cap brg + ductile iron casing) — do not block silently |
| Axial / thrust load | Axial load on the output shaft | Numeric Input; engineering check via Equation | Affects allowable OHL; significant axial load combined with marginal OHL warrants engineering review |
| Spec code suffix | Single-character or two-character codes appended to the model number that select catalog options (EP, AV, R1, R2, DV, LB, SG, SV, TL, H1/H2/H3) | Multiple Inputs each contributing to an `ATTR_SPEC_CODE_SUFFIX` text Attribute concatenated alphabetically | **Each suffix has exactly one discrete trigger** — EP from motor efficiency, R1/R2 from bearing upgrade, LB from low-backlash option. Do not derive a suffix from another option’s value (a common modeling bug) |
| EP / IE3 / Premium Efficiency | Motor efficiency class required at 1HP+ | Auto-set as a spec code suffix when `MOTOR_HP ≥ 1` | EP is mandatory at 1HP+; AV (inverter duty) only applies to fractional motors — the two are mutually exclusive by HP class |
| AV / AF Motor | Inverter-duty fractional motor with extended VFD turndown | Spec code suffix selectable for fractional HP (1/8–3/4) | AV does NOT apply to EP motors; if user selects "VFD operation" on a 1HP+ unit, the EP motor handles it natively (10:1 turndown standard, 4:1 with brake) |
| VFD turndown | Constant-torque speed range under inverter control | Driven Input lookup from (HP × Brake) | Brakemotors have reduced turndown vs no-brake variants — surface this to the user before they finalize |
| Brake (FB / ESB) | Built-in spring-set fail-safe brake | `MOTOR_BRAKE` Input; Driven Input for availability by HP | Brakes typically available 1HP–60HP only — 75HP+ frames do not offer brake; modeling brake as universally available is a common error |
| Backstop / Anti-Reverse | One-way clutch preventing reverse rotation under load (conveyor inclines, hoists) | Checkbox Input in Options group; BOM line conditional | Mechanically incompatible with vertical-down V-flange (CVVM) and similar configurations — warn |
| OHL capacity | Frame’s allowable solid-shaft overhung load | Numeric Attribute on `DRIVE_FRAME_SIZE` Input Values; populated from catalog Selection Tables | Required for the OHL Input Filter; missing values cause silent filter failures |
| Lubrication | Greased (maintenance-free) or oil-lubricated | Driven Input from frame size; small frames (per-vendor cutoff, e.g., ≤6125 for Cyclo 6000) are greased, larger frames oil | Greased frames support all mounting orientations; oil-lubricated frames have orientation-specific oil sumps and CANNOT use Universal Direction (N) mounting |
| Output orientation | Direction the output shaft faces — Horizontal (H), Vertical Down (V), Vertical Up (W), Universal/Any (N) | Derived from mounting style code, OR explicit Input | Universal (N) is greased-only — mutually exclusive with oil-lubricated frames |
| Housing style | Foot (H), Flange (F), V-Flange (V), and special variants | Derived from mounting style code | Must align with the customer’s mounting interface; flange dimensions vary by frame size |
| Input type | Integral motor (M), C-face adaptor (JM), hollow input shaft (XM) | Derived from mounting style code; or explicit when modeling reducer-only | C-face and hollow input shaft suppress the Motor Assembly subtree on the BOM |
| Smart Part Number / Model Number | The full nomenclature string identifying a configured unit (e.g., `CHHM10-6165YB-EP-29`) | Item Master Automation generated on Item Family `IF_<FAMILY>_GEARMOTOR` | The catalog nomenclature page IS the SPN template specification — read it line-by-line; do not derive suffixes from each other |
| Cycloidal / Planetary / Helical / Bevel-helical / Worm | Gear technology types | One Product per family | Different families have different ratio ranges, OHL profiles, efficiency curves; mixing in one Product is a Product-scoping mistake |

**Applies to:** new · edit · both &nbsp; **Outcome:** Agent credibility, faster Q&A response &nbsp; **Downstream:** n/a (recognition layer)

---

## 3. Typical product modeling patterns

### 3.1 Typical Product decomposition

Industrial Drives customers typically create one C1C Product per drive family — for example, "Cyclo 6000 Gearmotor," "Hyponic Inline Helical," "Bevel-Buddybox Right-Angle," "Hansen Worm Reducer." Frame size, ratio, and mounting style belong as Inputs inside the Product, not separate Products. Reducer-Only (no motor) is an Input value within the same Product, gated via a `UNIT_TYPE` Input — not a separate Product. Multi-drive packaged systems (conveyor drive packages, agitator drives, hoist drives) are typically modeled as parent nested configurations with per-drive child configurations plus system-level controls and structural Input Groups on the parent. Motors and brakes are typically Driven Item Master selections from a shared motor catalog rather than separate Products, since the motor catalog is reused across drive families.

### 3.2 Typical Input Group structure

| Input Group | Typical position | What it usually contains | Notes |
|---|---|---|---|
| Application & Service | First | Industry, driven machine, hours per day, load character, ambient conditions, atmosphere | Drives AGMA Service Class via Driven Input — Method C tables in the catalog are the matrix source |
| Duty Requirements | First or second | Required output speed, output torque OR motor HP, input speed, overhung load, axial load | Output speed + torque may be entered instead of HP — provide an Equation that back-calculates HP |
| Drive Selection | Second or third | Reduction ratio, frame size (driven), lubrication (driven), product code (derived: C / P) | Frame size is a Driven Input from (HP × Output Speed × Service Class); ratio is a Driven Input from (Frame × HP × Input Speed) |
| Mounting & Orientation | Third or fourth | Mounting style code (canonical), output shaft orientation (derived), housing style (derived), mounting position note | Use the canonical mounting code as the user-facing pick — sales reps already think in these codes |
| Input & Shaft Configuration | Mid | Input type (derived from mounting code or explicit for reducer-only), output shaft specification (Inch / Metric / DIN-G / DIN-E / AGMA-classed) | Shaft specification has frame-size limits — Input Filter required |
| Motor & Electrical | Mid | Region (NEMA / IEC / JIS / CSA), motor voltage, efficiency (EP auto-set ≥1HP), brake, brake voltage, agency listings, IP rating, conduit box, VFD operation | Conditionally asked only when `INPUT_TYPE_CODE = M` (integral); skipped for reducer-only |
| Options & Specifications | Late | Paint (standard / FDA), housing material (cast iron / ductile iron), low backlash, torque limiter, slide rail, food/industry package, backstop, overhead drive (XXDVX) | Each suffix-bearing option contributes a discrete spec code to `ATTR_SPEC_CODE_SUFFIX` — alphabetical concatenation per the nomenclature footnote |
| Compliance & Documentation | Late | AGMA Service Class override, certifications required, witness test, nameplate language | Typically Attribute-driven outputs and BOM lines for test certificates |
| Review & Notes | Last | Customer PO ref, region code, configuration notes, drawing upload | Attached to Configuration Results; UDFs on the generated Item Master |

### 3.3 Global Product candidates and nested configuration usage

**Global Product candidates.**
- Motor selection Input Group — the same motor catalog typically serves multiple drive families
- Brake variant selection — same brake offering across drive families
- Voltage / region / agency listings — shared across all motorized products
- Paint / finish options (standard color, FDA white) — typically a brand-wide standard
- Compliance (UL / CSA / CE / ATEX) — shared across the catalog

**Nested configuration typical uses.**
- Conveyor drive packages — parent package with motor mount, drive, take-up, and N drive child configurations
- Agitator / mixer drives — parent agitator with drive child + impeller assembly
- Hoist drive packages — parent hoist with drive + brake + monitoring children
- Multi-stage drive trains — parent train with N stage children sharing duty point and ratio cascade

**Not typically nested in this vertical.**
- Individual gear stages within a single reducer — modeled as Item Subassemblies under the reducer Item Family
- Motor accessories (conduit box, terminal kit) — typically inside the motor Item Master itself, not a separate child

**Applies to:** new (primary) · edit (secondary, as reference for ripple analysis) &nbsp; **Outcome:** quote accuracy, maintainability, catalog expansion velocity &nbsp; **Downstream:** Admin authoring speed, sales rep configurator clarity, engineering handoff cleanliness

---

## 4. Typical rule patterns

| Pattern | What it enforces | Typical C1C mechanism | Typical Logic Group | Notes |
|---|---|---|---|---|
| HP × Ratio × Service Class → Frame Size | The catalog selection table — the master valid-combination matrix | Driven Input | — | Source matrix is the per-HP Selection Table pages; populate via Driven Input Import. This is the largest matrix in the build (often 1000+ rows) |
| Output Speed = Input RPM / Ratio | Display the calculated output speed | Equation set via Logic Item | — | Display-only; lock the Input |
| Required HP from Output Torque + Output Speed | Back-calculate HP when the user enters torque + speed instead of HP | Equation `(torque × speed) / 63025`, rounded up to nearest catalog HP | — | Pair with a "set if HP is null" Logic Item; do not overwrite a user-supplied HP |
| AGMA Service Class derivation | Industry × Hours/Day → AGMA Class (I / II / III) | Driven Input | Application & Context | Method C industry table from the catalog populates the matrix; allow override with caution (downstream DIs depend on it) |
| Service Factor from AGMA Class | I → 1.0, II → 1.4, III → 2.0 | Equation | Application & Context | Used in OHL adequacy calculations and motor sizing |
| OHL capacity check | Application OHL must not exceed selected frame’s max OHL | Input Filter (filter Frame Size by OHL Attribute), or Logic Item Warning when over capacity | Validation | If exceeded, recommend R1 / R2 spec code or larger frame — do not silently block |
| Frame size → Lubrication | Greased for small frames, oil for large frames (per-vendor cutoff) | Driven Input | Drive Narrowing | Lock the lubrication Input — it is determined by frame, not user-pickable |
| Mounting code → derived attributes | Canonical mounting code sets orientation, housing, input type, lubrication, position restriction | Set Input to Value Logic Items (one per mounting code, ~17 codes) | Mounting | Concrete and explicit — beats a generic attribute filter that depends on populated attribute data |
| Shaft spec frame range | DIN G shafts limited to ≤ frame 6125; DIN E to ≤ 6145 | Input Filter | Input & Shaft | Filter on `ATTR_SHAFT_MAX_FRAME ≥ DRIVE_FRAME_SIZE numeric` |
| Spec code: EP auto-set at 1HP+ | Premium Efficiency mandatory at 1HP+ per energy regulations | Logic Item — Set Input to Value | Motor & Electrical | Auto-set on entering Motor Group; do not allow user to deselect |
| Spec code: AV mutex with EP | Inverter-duty fractional motor incompatible with EP | Input Filter on the `OPT_SPEC_CODES` Checkbox to hide AV when HP ≥ 1, hide EP when HP < 1 | Motor & Electrical | Mutually exclusive by HP class — the Input Filter prevents both being selected |
| Reduction stages × ratio invariants | Single = 3:1 to 119:1; Double = 121:1 to 7569:1; Triple = 8041:1+ | Logic Item — Error Message | Validation | Three discrete error rules — DOUBLE+R≤119 / SINGLE+R≥121 / TRIPLE without consult-factory flag |
| Planetary vs Cycloidal product code | Ratio 3 or 5 → Product Code "P"; ratio ≥ 6 → Product Code "C" | Logic Item — Set Input to Value | Drive Narrowing | Two discrete rules; the Product Code prefixes the Smart Part Number |
| Universal Direction × Lubrication | Universal Direction (N) requires greased lubrication | Logic Item — Error Message | Validation | If user picks N orientation and a frame size > greased cutoff, block with explanation |
| Backstop × mounting compatibility | Backstops not mechanically compatible with certain vertical mounting orientations | Logic Item — Warning Message | Validation | Per-vendor incompatibility list; warn rather than block to allow engineered exceptions |
| Brake × HP availability | Brakes typically available 1–60 HP only | Driven Input from HP → Brake availability | Motor & Electrical | 75HP+ has no brake — modeling brake as universally available produces unsellable configs |
| VFD turndown lookup | Constant-torque turndown depends on HP × Brake | Driven Input or Equation lookup against `ATTR_HP_VFD_TURNDOWN` | Motor & Electrical | Surface to user before finalizing; brakemotors have reduced turndown |
| FDA paint × frame lubrication | FDA paint with food-grade lubrication available on greased frames only | Logic Item — Error Message OR Input Filter | Validation / Options | Greased = small frames; FDA paint on oil-lubricated frame is a real catalog incompatibility |
| Hazardous-area motor by atmosphere | Corrosive / Explosive / Wet / Dusty atmospheres require XP, IECEx, or higher IP rating | Logic Item — Warning Message; Special Request rule | Validation | Standard motor cannot be sold into hazardous areas — force a higher-spec motor or route to engineering |
| Auto-set defaults that user can override | Setting defaults from region (voltage, agency, conduit, brake voltage) | Logic Item — Set Input to Value with `IS NULL` guard | Motor & Electrical | **Critical pattern** — without the IS NULL guard, the rule overwrites user input on every page load |
| Smart Part Number assembly | Concatenate model number per nomenclature page | Item Master Automation on the gearmotor Item Family | — | Each suffix has ONE trigger; concatenate alphabetically; test against 5 representative configs before publish |
| Special-modification flag (S) | Discrete user pick or specific custom-shaft / custom-housing-material trigger | Set Input to Value Logic Item with single explicit trigger condition | Options | Do NOT derive S from "any non-standard option selected" — it has a specific catalog meaning per the nomenclature page |

**Applies to:** new (primary) · edit (secondary, as reference for ripple analysis on rule changes) &nbsp; **Outcome:** quote accuracy, rule maintainability, reduced factory corrections &nbsp; **Downstream:** sales rep error reduction, engineering handoff cleanliness, Admin debuggability

---

## 5. Typical BOM and skeleton patterns

### 5.1 Typical BOM construction patterns

| Pattern | What it produces | Typical C1C mechanism | Notes |
|---|---|---|---|
| Smart Part Number top-level | The configured drive as a single generated Item Master with the nomenclature SPN | Item Family with Item Master Automation | The catalog nomenclature page IS the template — read line by line; SPN is immutable once saved, test 5 configs first |
| Reducer subassembly | The cycloidal / helical / planetary stage(s), output shaft, bearings, seals, housing as a coherent subassembly | Item Subassembly under the reducer Item Family, OR Driven Item Master matrix by frame size | Frame size is the primary driver; secondary drivers are housing material (cast iron / ductile iron) and lubrication type |
| Motor selection | Motor Item Master by HP × voltage × efficiency × brake | Driven Item Master | Motor catalog typically sits in a shared Item Family; confirm vendor Item Master coverage (Baldor / WEG / Sumitomo / US Motors / Marathon) before populating the matrix |
| Brake assembly | Brake module + rectifier + wiring | BOM Logic Item conditional on `MOTOR_BRAKE = Brake`, with sub-components as Driven Items | Reduces VFD turndown — surface the constraint on the Input side too |
| Bearing upgrade kit | Replaces standard output bearing with R1 (high-cap) or R2 (high-cap + ductile housing) | BOM Logic Item conditional on spec-code selection; substitution pattern (Include R1 + Exclude standard) | Each kit varies per frame size — model as Driven Item Master keyed on frame |
| Backstop assembly | One-way clutch installed on the output shaft | BOM Logic Item conditional on `OPT_BACKSTOP = Yes` | Item Master varies by frame size — Driven Item Master |
| Mounting hardware | Bolts, gaskets, mounting flange or feet | Driven Item Master keyed on (housing style × frame size) | Often forgotten in the initial BOM — leads to factory corrections |
| Lubricant fill | Grease cartridge or oil charge | BOM line with Quantity Override Equation referencing `EQ_OIL_VOLUME_BY_FRAME` | Greased frames = grease cartridge (typically 1 each); oil-lubricated frames = quart/liter quantity by frame size from the lubrication chart |
| Conduit box | NPT or metric conduit per region and HP | Driven Item Master or BOM Logic | Cast iron conduit typically only IEC 60–75 HP; aluminum NPT for NEMA standard |
| Cooling fan | External fan on the motor for derating at low input speeds | Static Item Master inside the Motor subassembly, or separate BOM line | Often inside motor IM; surface as separate BOM line only if separately stocked |
| Coupling guard | OSHA-required guard when slide rail / coupling is selected | BOM Logic Item conditional on `OPT_SLIDE_RAIL = Yes` (typically bundled in slide rail kit) | If coupling is added without slide rail, the guard is not on the BOM and must be field-installed — surface this on the configuration |
| Nameplate | Aluminum / stainless nameplate engraved per configuration | Separate Item Family `IF_NAMEPLATE` with Item Master Automation including a Sequential # for serialization | Carries certification marks (UL, CSA, CE), country of origin, model number, serial, duty data; language driven by `COMP_NAMEPLATE_LANGUAGE` |
| Documentation kit | O&M manual, warranty card, installation drawing | Driven Item Master by `COMP_NAMEPLATE_LANGUAGE` for the manual; static for warranty | Manual languages are typically EN / ES / FR / PT / DE — confirm offered languages per customer |
| Test certificate line | Performance test, hydrostatic test, witness documentation | BOM Logic Item against `COMP_WITNESS_TEST` Input; accumulate test labor hours via BOM Temp Field | Do not unconditionally include — gated by witness-test Input |
| Packaging | Crate, foam, banding, shipping label | Static Item Master, Included By Default; quantity may scale by overall dimension/weight via BOM Temp Field | Domestic vs export packaging may differ — drive by `QI_DELIVERY_TERMS` if applicable |
| Spare parts kit | Commissioning + 1-year spares per frame size | Item Family with own selection logic; surfaced as a quote add-on | Ties to the aftermarket / replacement-parts catalog |

### 5.2 Invisible BOM content typical in this vertical

- Lubricant fill quantity — calculated by frame size + lubrication type (greased vs oil), not user-selected; quantities come from the catalog Lubrication section
- Mounting hardware — bolts, gaskets, drift pins per the housing style and frame size; not usually a user choice
- Conduit box and terminal kit — bundled inside the motor Item Master in most vendor catalogs but split out for cost analysis
- Nameplate and serial label — generated per configuration with engraved data; carries certification marks
- Coupling guard — OSHA-required when a coupling is exposed; often forgotten when slide rail is not selected
- Standard packaging (crate + foam + banding + shipping label) — always present; sized by overall dimensions
- Documentation kit (O&M manual, warranty card, installation drawing) — always present; language varies
- Test labor (witness test, performance test) — driven by witness-test Input but not always surfaced as a labor line
- Brake rectifier and wiring — bundled inside the brake assembly in most catalogs but split for service-spares mapping
- Cooling fan (external) — present on inverter-duty motors at low input speeds; sometimes a separate Item Master, sometimes inside the motor

**Applies to:** new (primary — BOM structure) · edit (primary — BOM changes ripple to manufacturing) &nbsp; **Outcome:** factory correction reduction, on-time delivery, manufacturing accuracy &nbsp; **Downstream:** engineering handoff quality, manufacturing floor accuracy, aftermarket parts identification

---

## 6. Integration expectations

| System / category | Type | Relationship to C1C | Notes |
|---|---|---|---|
| Motor vendor catalogs (Baldor / WEG / Sumitomo branded / US Motors / Marathon / Siemens) | Selection / sizing | Upstream | Motor selection matrices populated from vendor catalogs; confirm Item Master coverage matches the active catalog and replenish on vendor catalog updates |
| VFD / drive vendor catalogs (ABB, Yaskawa, Allen-Bradley, Danfoss, Siemens) | Selection / sizing | Adjacent | When VFD operation is required, the chosen VFD must be compatible with motor (voltage / phase / power); often a separate Product or external selection |
| AGMA standards | Regulatory reference | Adjacent (not integrated) | Service class methodology referenced in catalog and Validation Logic Item messages |
| ATEX / IECEx / UL hazardous-area databases | Regulatory reference | Adjacent | Hazardous-area motor selection requires confirmed certification; reference in Special Request rules |
| Vendor selection software (Sumitomo’s online Configurator, SEW DriveCAD, Nord NORDCAD, Bonfiglioli "Pro Configurator") | Selection / sizing | Upstream | Customers may use vendor tools as the entry point; outputs become source documents for the C1C configuration |
| ERP (NetSuite, Oracle, SAP, Epicor, Microsoft D365) | ERP | Downstream | BOM and configuration-to-order handoff; NetSuite is Revalize’s reference integration for new deployments |
| CAD (SolidWorks, Inventor, Autodesk) | CAD | Bidirectional | Dimension drawings often generated from Product Outputs; engineering CAD families inform Input Value imagery and dimension PDFs |
| Replacement / aftermarket parts portals | Dealer portal | Downstream | Configuration-to-spare-parts-kit mapping drives aftermarket catalog; BOM structure determines whether this works cleanly |
| Energy efficiency databases (CEE, NEMA Premium, IEC IE3) | Regulatory reference | Adjacent | EP / IE3 requirements are jurisdictional (US DOE, EU eco-design directive) — selection rules must enforce per region |

**Applies to:** new · edit · both &nbsp; **Outcome:** Agent credibility on adjacent-systems conversations, correct scoping of integration vs. non-integration questions &nbsp; **Downstream:** engineering handoff awareness, rep / distributor workflow awareness

---

## 7. Document types and interpretation cues

| Document type | Typical source | Fields the Agent should expect | Interpretation traps |
|---|---|---|---|
| Catalog (PDF) | Manufacturer | Nomenclature page (model number positions), selection tables (HP × ratio × frame), dimension drawings, options sections, technical data, lubrication chart, motor performance, AGMA tables, cross-reference tables | The nomenclature page IS the SPN template specification — read it line by line. Selection tables span many pages, often one per HP, with double-reduction tables stacked separately. Frame size suffixes (DA, DB, DC) appear on double / triple reduction tables only |
| Selection table | Catalog | Output speed, output torque (in·lbs and N·m), service factor + AGMA class column, solid-shaft overhung load, motor power code, frame size, ratio, VFD availability code | A row marked with `*` in the SF column is torque-limited (no AGMA class) — selection should not exceed the listed torque. Multiple rows per (HP, ratio) — different frames give different SF / OHL combinations |
| Dimension drawing | Catalog Section 4 / engineering | Per-frame, per-housing, per-orientation drawings with bolt patterns, shaft dimensions, oil / grease ports, mounting envelope | Different drawings per CHHM vs CNHM (oil vs greased) — make sure the right drawing is attached to the right configuration via Driven Output |
| Wiring diagram | Catalog Section 4 / vendor | Per voltage / phase / brake configuration | Vendor-specific; brakemotor wiring differs from non-brake; rectifier type (half-wave / full-wave) varies |
| Performance data | Catalog / vendor motor data | Motor speed, current, efficiency, power factor at full and part load; for inverter duty, performance vs frequency | Different curves at 50Hz vs 60Hz; CE motors carry IE3 50Hz data separately |
| Lubrication chart | Catalog Section 4.10 | Recommended lubricant per ambient temp range, fill quantity per frame size, oil change intervals | Quantities differ per mounting position for oil-lubricated frames; greased frames are sealed-for-life |
| AGMA Service Class table | Catalog Section 2.4 / industry standard | Method A (load × duration matrix), Method B (start/stop frequency for EP motors), Method C (industry × application matrix) | Method C is the long table — typically 30+ industries with sub-applications, dual columns for ≤10hr and 24hr service |
| Spec code reference | Catalog nomenclature page | Suffix list with one-line description per code (EP, AV, R1, R2, DV, LB, SG, SV, TL, H1, H2, H3) | Each suffix has exactly ONE catalog meaning and ONE trigger; do not derive a suffix from another option |
| Cross-reference table | Catalog Section 1 | Legacy frame size → current frame size mapping (e.g., Cyclo 3000 → Cyclo 6000) | Used for replacement / migration sales; map legacy SKUs in the configurator’s Input Values for searchability |
| Vendor selection software output | Customer-supplied | Selected drive model, duty point, ratio, frame size, motor specs, sometimes a generated quote | Treat the selected model as authoritative input; surrounding commentary (efficiency warnings, OHL margin) is context |

**Applies to:** new · edit · both &nbsp; **Outcome:** extraction accuracy, reduction of clarification loops, faster document-driven changes &nbsp; **Downstream:** Admin session velocity

---

## 8. Downstream user expectations

### 8.1 Sales rep / Application Engineer expectations

Application Engineers at engineered distributors and authorized reps. Technical literacy is high — most have a mechanical engineering background and read selection tables fluently. The rep expects to enter a duty point (output speed + torque, OR HP + ratio) plus mounting style and motor specifications, and have the configurator return a valid frame selection with output torque, OHL capacity, service factor, and a model number that matches the catalog nomenclature. Speed matters — reps quote dozens of drives a week and expect the configurator to be faster than reading the catalog. Reps frequently know "I need a CHHM10-6165YB-EP-29" from prior experience and expect to enter the model number directly to validate or reverse-engineer the duty point — a configurator that forces them to walk through every Input Group from scratch is slower than the catalog. Distributor reps expect distributor pricing (their tier) and do not expect to see manufacturing or cost-analysis BOM views.

### 8.2 Engineering and manufacturing expectations

In-house engineering for engineered-to-order drives and large packaged systems; shop-floor assemblers working from the BOM and shop order for catalog drives; outside field service for commissioning and warranty. Engineering expects a BOM that reflects the actual reducer subassembly content (correct gears, bearings, seals, housing material), the correct motor (HP, voltage, efficiency, brake matching the spec) with motor-mount alignment, complete mounting hardware (bolts, gaskets, flanges per the housing style), correct lubricant fill quantity for the frame and lubrication type, the right nameplate with engraved data matching the configuration (model number, serial, certifications, duty), and complete documentation (O&M manual in the right language, installation drawing matching the actual frame and housing). The handoff most commonly breaks on missing mounting hardware (bolts and gaskets not on BOM), lubricant fill quantity wrong (oil quantity defaulted instead of frame-specific), motor enclosure wrong for hazardous-area service (TEFC instead of XP), and bearing kit not included when application OHL exceeds standard frame capacity.

### 8.3 End customer expectations

Typically a maintenance engineer or plant engineer for replacement / aftermarket; a project engineer at an OEM (machine builder, system integrator) for new equipment; a consulting engineer for specified-by-engineer industrial projects. The customer expects a quote package that includes the model number, output speed and torque at the operating point, motor specifications including efficiency class and brake (if any), mounting drawing with bolt pattern and overall envelope, certifications matching the spec (UL, CSA, CE, IECEx as applicable), and applicable warranty terms. Delivery of a drive that matches the model number on the quote is the core expectation — substitutions (different frame, different motor brand, different lubrication) are typically rejections, not tolerable variances. Replacement orders against legacy frame sizes (Cyclo 3000 / 4000) expect the configurator to map to the current generation (Cyclo 6000) and produce a model number that fits the same mounting envelope.

**Applies to:** new (primary) · edit (primary — edits ripple downstream more than new items sometimes, because expectations are already set) &nbsp; **Outcome:** factory correction reduction, rep adoption, end-customer quote acceptance &nbsp; **Downstream:** the whole point — this section IS the downstream-impact lens

---

## 9. How Admins in this vertical tend to mis-model

- **Decomposing mounting into separate Orientation × Housing × Input Type Inputs.** Sales reps and order entry think in canonical mounting codes (CHHM, CNVM, CHHJM). Modeling these as 3 separate Inputs that the user picks independently creates UX friction — the user has to know which combinations are valid (not all 3 × 4 × 3 = 36 combinations are catalog SKUs; only ~17 are). Use the canonical mounting code as the user-facing pick, and derive orientation / housing / input type / lubrication / position restriction via Logic Items.

- **Treating each frame size as a separate Product.** Frame size is an Input within the drive Product, not a separate Product. Creating "Cyclo 6060," "Cyclo 6065," "Cyclo 6070" as separate Products produces 23+ Products where one would do, breaks the selection-table Driven Input pattern, and prevents the master HP × Ratio × Frame Driven Input matrix.

- **Modeling Reducer-Only as a separate Product.** Reducer-Only (no motor) is a SKU class within the same drive Product, gated by a `UNIT_TYPE` Input. Creating it as a separate Product duplicates 90% of the Inputs and creates two Products to maintain. Hide the Motor & Electrical Input Group when `UNIT_TYPE = Reducer Only`.

- **Forgetting the BACKSTOP / Anti-Reverse option.** Standard accessory across most drive vendors. Common modeling oversight because it is mechanical (not electrical) and lives in the Options section rather than the motor section. Add a `BACKSTOP` Checkbox Input plus a CVVM-incompatibility warning.

- **Deriving spec code suffixes from each other.** Each suffix has exactly one trigger per the catalog nomenclature page. EP comes from motor efficiency (auto-set at 1HP+). R1 / R2 from bearing-upgrade option. LB from low-backlash option. TL from torque-limiter option. AV from inverter-duty fractional motor. Do NOT derive S (modification) from "any non-standard option selected" — S has a specific catalog meaning. Do NOT map XXDVX to a DV or other suffix — the overhead-drive option is a separate Section 3 catalog option, not a SPN suffix.

- **Modeling planetary ratios (3, 5) as Single Reduction.** Catalog footnote on the standard ratios page categorizes 3 and 5 as Planetary, distinct from cycloidal Single Reduction (6+). Product Code prefixes the SPN: P for planetary, C for cycloidal. Lumping 3 and 5 with 6+ produces wrong Product Codes (and wrong SPNs) for those ratios.

- **Auto-setting region-driven defaults without an `IS NULL` guard.** Setting `MOTOR_VOLTAGE`, `MOTOR_AGENCY`, `MOTOR_BRAKE_VOLTAGE`, `MOTOR_CONDUIT_BOX` from `MOTOR_REGION` is a useful default — but if the rule fires on every page load without a guard, it overwrites the user’s overrides on every navigation. Add `AND target IS NULL` to the IF condition. This is the #1 silent defaulting bug in this vertical.

- **Modeling AGMA Class as Driven Input output AND user-overridable, without re-firing downstream DIs.** The AGMA Class drives the Frame Size Driven Input. If the user overrides AGMA Class after Frame Size is computed, Frame Size goes stale. Either lock AGMA after derivation, or re-fire dependent DIs (and re-confirm Frame Size) when AGMA changes.

- **Hard-coding the HP × Ratio × Frame matrix in Logic Items instead of populating a Driven Input.** The selection table has hundreds of valid combinations. Modeling each as a Logic Item produces an unmaintainable rule set. Use Driven Input with import from a spreadsheet sourced from the catalog.

- **Modeling lubricant fill as a user-pickable option.** Lubricant type (greased vs oil) is determined by frame size — small frames are sealed-for-life greased, large frames are oil-filled. Lubricant quantity is determined by frame size + lubrication type + mounting position (for oil-filled frames). Make it a derived display Input plus a BOM line with Quantity Override Equation. Asking the user is wrong.

- **Modeling triple-reduction ratios as standard pickable values.** Triple reduction (8041:1+) is consult-factory in most catalogs. List as available with a `TRIPLE` reduction-stage value but require a `SPECIAL_RATIO` flag and route to engineering review. Modeling them as standard picks generates SKUs the factory cannot ship.

- **Forgetting frame-suffix conventions (DA, DB, DC).** Double-reduction frames carry `DA` or `DB` suffixes (e.g., 6060DA, 6120DB); triple-reduction carries `DC`. These are part of the frame-size identifier and appear on selection tables only for the higher-ratio rows. Modeling frame size as just the numeric portion (6060, 6120) loses the suffix information needed for the SPN.

- **Modeling brake as universally available across all HPs.** Brakes are typically offered 1HP through 60HP; 75HP+ frames usually have no brake variant (varies by vendor). Universal availability produces unsellable configs.

- **Not testing the Smart Part Number template against representative configs.** SPNs are immutable once saved. The SPN template is the most error-prone artifact in the build — wrong format flags (CAPS / RDP / TS), wrong concatenation order, wrong derivation of suffixes. Always run 5+ representative configs through the SPN template, compare against catalog example part numbers, fix bugs, then publish.

**Applies to:** new (primary) · edit (secondary) &nbsp; **Outcome:** better initial modeling decisions, reduced rework, better catalog expansion &nbsp; **Downstream:** Admin’s future self, rule maintainability, configurator UX

---

## 10. Vertical edge cases and guardrail triggers

| Edge case | Trigger signal | Guardrail posture | Notes |
|---|---|---|---|
| Triple reduction without special-ratio confirmation | New configuration with `REDUCTION_STAGES = Triple` and no `SPECIAL_RATIO = Yes` flag | Block | Triple reduction is consult-factory in most catalogs; configuration cannot be finalized until factory confirms availability and lead time |
| Reduction-stage × ratio mismatch | `REDUCTION_STAGES = Single` AND ratio ≥ 121, OR `REDUCTION_STAGES = Double` AND ratio ≤ 119 | Block | The catalog ratio ranges per stage are contiguous and non-overlapping; mismatches indicate user confusion, not a valid configuration |
| Backstop on incompatible mounting | `OPT_BACKSTOP = Yes` AND `MOUNTING_STYLE_CODE = CVVM` (or equivalent vertical-down V-flange) | Pause and confirm | Mechanical incompatibility — the backstop’s pawl mechanism conflicts with the vertical oil sump in V-flange vertical-down configurations. Refer to engineering for confirmation if the application requires both |
| Universal Direction (N) on oil-lubricated frame | `MOUNT_OUTPUT_ORIENTATION = N` AND frame numeric > greased cutoff (e.g., > 6125 for Cyclo 6000) | Block | Universal Direction is a property of greased / sealed frames; oil-lubricated frames have orientation-specific oil sumps. Configuration is mechanically invalid |
| FDA paint on oil-lubricated frame | `OPT_PAINT = FDA White` AND lubrication = Oil | Block | FDA paint with food-grade lubrication available on greased frames only per most catalogs; oil sumps are not FDA-compliant |
| Application OHL exceeds frame capacity | `DUTY_OVERHUNG_LOAD_LBS` > frame’s `ATTR_MAX_OHL_LBS` AND no R1/R2 spec code selected | Flag for Admin review | Recommend R1 (high-cap bearing) or R2 (high-cap brg + ductile housing), or larger frame. Do not silently allow under-spec’d selection |
| Frequent start/stop with non-EP motor | `APP_START_STOP_FREQ ≠ None` AND `MOTOR_EFFICIENCY ≠ EP / IE3` | Pause and confirm | Method B supplemental Service Factor only applies to EP motors with published inertia data. Non-EP motors at frequent-start service may have insufficient thermal capacity — refer to motor data |
| Hazardous-area motor without confirmed certification | `APP_ATMOSPHERE` IN (Corrosive, Explosive, Wet/Washdown, Dusty) AND `MOTOR_PROTECTION` = standard IP55 | Flag for Admin review | Standard motor enclosures are not rated for hazardous-area service; recommend XP, Ex e, IECEx, or higher IP rating per applicable area classification |
| Replacement of legacy frame without cross-reference confirmation | New configuration referencing a legacy frame size (Cyclo 3000 / 4000 series) for replacement purposes | Pause and confirm | Surface the cross-reference mapping (e.g., 3145 → 6135) and confirm the replacement frame matches the existing mounting envelope; mounting drawings may differ slightly between generations |
| AGMA Class override after Frame Size selected | User edits `APP_AGMA_CLASS` after `DRIVE_FRAME_SIZE` has been derived | Flag for Admin review | Frame Size selection depends on Service Class; an override invalidates the prior Frame Size derivation. Re-fire the Frame Size Driven Input or warn the user to re-validate |
| Distributor user attempting engineered-status configuration | Distributor User Group selecting an Input Value that triggers a Special Request (engineered, consult-factory, custom) | Restrict | Distributor accounts typically cannot finalize engineered configurations — route to App Engineering with a required comment |
| Brake required on 75HP+ unit | `MOTOR_BRAKE = Yes` AND HP ≥ 75 | Block | Brake variants typically not offered above 60HP per most vendors; surface the constraint and block |
| Smart Part Number contains forbidden characters | SPN automation produces a string containing `% \ " / ’ |` | Block at publish | C1C SPN constraint — automation must avoid these characters; refactor template if any Input Value or Attribute could introduce them |
| Lubricant quantity miscalculated for vertical mounting | `DRIVE_LUBRICATION = Oil` AND `MOUNT_OUTPUT_ORIENTATION` IN (V, W) | Flag for Admin review | Oil-filled frames have orientation-specific fill quantities (vertical mounting requires more or less oil than horizontal); confirm the lubrication chart entry for the chosen orientation |

**Applies to:** new · edit (edits are where most edge-case triggers fire — an Admin modifying an existing configuration is the highest-risk surface for nomenclature and SKU-class regressions) · both &nbsp; **Outcome:** risk reduction, BOM accuracy, audit defensibility &nbsp; **Downstream:** engineering review workflow, factory shippability, end-customer quote integrity &nbsp; **Guardrail:** primary input to vertical-aware guardrail behavior

---

*Document version: 1.0 · Profile authored against vertical profile template v1.0. Reference vertical profile for the Industrial Drives and Power Transmission vertical, modeled on the Sumitomo Cyclo 6000 catalog as a representative product family. Patterns generalize to other major drive vendors (SEW Eurodrive, Nord, Bonfiglioli, Hansen, Falk, Sumitomo Hyponic / Bevel-Buddybox, Brevini, Brook Crompton, etc.).*
