# Medical Devices and Equipment — Vertical Profile

## How to use this document

This profile gives the Agent the vertical-specific grounding it needs to recognize Medical Devices and Equipment vocabulary, propose typical structures when building new items, and flag likely vertical considerations during edits. It is one of four grounding layers consulted on every request.

**Precedence.** This profile is a prior, not a ground truth. When the customer layer shows the actual environment diverging from what this profile describes, the customer layer wins. The profile never licenses the Agent to override the Admin’s actual configuration.

**Companion documents.** For C1C mechanics referenced in this profile, retrieve alongside: `c1c-data-modeling-best-practices.md`, `c1c-rule-configuration-best-practices.md`, `c1c-bom-best-practices.md`, `c1c-configurator-ux-best-practices.md`, and `c1c-industry-best-practices-agent-guidance.md`. For worked examples of Products, rules, skeletons, and BOMs specific to this vertical, retrieve the Configuration Design deliverable filtered by vertical ID `medical_devices_equipment`.

**Profile scope.**
- **Vertical:** Medical Devices and Equipment
- **Vertical ID:** `medical_devices_equipment`
- **Template version:** 1.0
- **Last updated:** 2026-04-23
- **Primary C1C modules:** Configuration Interface, Bill of Materials, Product Model, Product Outputs, Security Model (regulatory audit trail)
- **Common co-verticals:** `industrial_machinery_equipment` (medical-adjacent industrial equipment), `foodservice_equipment` (healthcare foodservice)
- **Primary regions:** Both; US (FDA) and EU (MDR) regulatory frameworks diverge significantly, so regional segmentation is load-bearing

---

## 1. Vertical snapshot

**What they build.** Patient positioning equipment, surgical lighting, medical furniture (beds, exam tables, chairs), mobility equipment (wheelchairs, walkers, lifts), diagnostic accessories, infusion-adjacent equipment, medical storage, sterilization accessories, and related non-implant devices typical of mid-market medical device manufacturing. Generally excludes high-risk implantables and Class III devices requiring PMA pathways, though mid-market Class II is common.

**How they sell.** Through hospital procurement chains (direct, GPO-tiered, IDN contracts), distributor networks (especially for ambulatory and long-term care markets), and specialty distributors for specific clinical applications. Capital equipment sales involve long cycles (6–18 months) with clinical evaluation, technical configuration, regulatory verification, and procurement approval as sequential gates. Hospital systems often purchase through Group Purchasing Organizations (GPOs) like Vizient, Premier, and HealthTrust, which carry tiered pricing contracts.

**Configuration character.** Configure-to-order with tight regulatory envelope — most configurations must stay within the cleared / registered configuration space that the original 510(k) or MDR Technical Documentation describes. Custom variants often trigger new regulatory review (510(k) amendment, new submission, or MDR change notification). Every configuration has regulatory identity — UDI for US-market devices, Basic UDI-DI / UDI-DI for EU-market devices — and that identity must be reflected in labeling.

**Where C1C work concentrates.** Attributes and Product Outputs carrying regulatory data (FDA classification, UDI, 510(k) reference, CE certificate), Driven Inputs and Input Filters for configuration-envelope enforcement, Validation Logic Items for clinical-application compatibility, and BOM Logic for accessories and consumables.

**Applies to:** new · edit · both &nbsp; **Outcome:** foundation for all downstream retrieval &nbsp; **Downstream:** n/a (context, not recommendation)

---

## 2. Vocabulary and terminology map

| Term | What it is | Typical C1C landing | Notes / traps |
|---|---|---|---|
| 510(k) | FDA premarket notification establishing substantial equivalence to a predicate device | Attribute on Products or configurations; 510(k) reference number | Not a C1C construct itself — the reference number is stored and surfaced; configuration envelope is constrained by what the 510(k) covers |
| PMA | Premarket Approval (high-risk Class III devices) | Attribute; rare in mid-market | Most mid-market verticals are Class II with 510(k); PMA pathway is largely out of scope |
| Predicate device | Legally marketed device used as basis for substantial equivalence claim | Not a C1C construct; contextual reference only | The predicate’s cleared indications constrain what the new device may claim |
| Class I / II / III | FDA risk classification | Attribute on Product | Class I often exempt from 510(k); Class II typically requires 510(k); Class III typically requires PMA |
| UDI (Unique Device Identifier) | Globally unique identifier for a medical device | Attribute on configuration or Product, consisting of DI + PI | Consists of Device Identifier (DI, static) and Production Identifier (PI, variable — lot, serial, expiration). DI per version/model |
| DI (Device Identifier) | Static portion of UDI identifying labeler and specific version/model | Attribute on configuration — typically the Smart Part Number or equivalent | One DI per distinct device version; configuration changes affecting version may require a new DI |
| PI (Production Identifier) | Variable portion of UDI (lot, serial, manufacture date, expiration) | Not a configuration-time Attribute; assigned at production | Not relevant to C1C configuration itself; is downstream of manufacturing |
| GUDID | FDA’s Global UDI Database | Not a C1C construct; contextual reference only | Configurations carry UDI DI that is registered in GUDID by the labeler |
| AccessGUDID | Public-facing subset of GUDID | Not a C1C construct; contextual reference only | Useful for customers and healthcare providers; the Agent’s configurator work doesn’t interact with it directly |
| EU MDR | Medical Device Regulation (EU 2017/745) | Regulatory framework; Attribute-level reference | EU equivalent to FDA path with significant differences; EUDAMED is the EU UDI database |
| Basic UDI-DI / UDI-DI | EU UDI components | Attributes on EU configurations | Basic UDI-DI is at model-family level; UDI-DI at specific version level |
| IEC 60601 | International standard for electrical medical equipment safety | Attribute on Products; certification body listings | Has many collateral and particular standards; specific versions must be tracked per-product |
| IEC 60601-1 | General safety requirements | Attribute; part of regulatory pedigree | Version-specific — 3.2 is current general revision |
| IEC 60601-2-X | Particular standards for specific equipment types | Attribute | Each equipment class has its own particular standard |
| IEC 60601-1-2 | EMC collateral standard | Attribute | Electromagnetic compatibility; required alongside general safety |
| Biocompatibility (ISO 10993) | Testing for patient-contact materials | Attribute | Patient-contact surfaces require biocompatibility validation; material changes trigger re-testing |
| Sterilization compatibility | Whether the device withstands a specific sterilization method (steam, EtO, gamma, plasma) | Attribute | Material substitutions may invalidate compatibility; method is typically specified by the customer |
| GPO (Group Purchasing Organization) | Consortium that negotiates pricing for member hospitals | Not a C1C construct; contextual reference only | Vizient, Premier, HealthTrust are the big three; tiered pricing is out of V1 scope |
| IDN (Integrated Delivery Network) | Hospital system with multiple facilities under common ownership | Not a C1C construct; contextual reference only | IDN contracts drive large-scale equipment orders |
| Capital equipment | Durable medical equipment capitalized as a fixed asset | Attribute on Product or configuration | Distinct sales cycle from consumables; long approval processes |
| OR-compatible | Operating-room-compatible (cleaning, draping, electrical isolation) | Attribute on configurations | Drives materials, finish, possibly electrical isolation |
| Antimicrobial finish | Surface treatment resisting microbial colonization | Attribute or Input Value | Regulated claim in some contexts; supported by test data |

**Applies to:** new · edit · both &nbsp; **Outcome:** Agent credibility, faster Q&A response &nbsp; **Downstream:** n/a (recognition layer)

---

## 3. Typical product modeling patterns

### 3.1 Typical Product decomposition

Medical device customers typically create one Product per cleared / registered device family — "OR Table," "Patient Lift," "Exam Chair," "Surgical Light" — with clinical-application variants and optional accessories as Inputs within the Product. A configuration’s scope is tightly bounded by the 510(k) clearance or MDR Technical Documentation that covers the Product; variants outside that envelope are often separate Products because the regulatory identity differs. Accessories that carry their own clearance (e.g., a specific attachment with its own 510(k)) are often Global Products that can be referenced across multiple parent Products. Consumables that accompany capital equipment (pads, straps, disposables) are typically separate Products with their own lifecycle. Bundles (capital equipment + installation + training + service contract) are often handled at the quote level rather than as nested configurations, because each component has its own regulatory identity and commercial terms.

### 3.2 Typical Input Group structure

| Input Group | Typical position | What it usually contains | Notes |
|---|---|---|---|
| Clinical Application | First | Intended use selection (specific procedures, patient populations, care settings) | Gates downstream visibility; frequently drives regulatory path |
| Model and Version | First or second | Model line, version, specific cleared configuration | Version identity is load-bearing for UDI and 510(k) reference |
| Size and Capacity | Second or third | Weight capacity, dimensions, height range | Often a regulated envelope — exceeding cleared capacity requires review |
| Electrical | Mid | Voltage, plug type, isolation class, battery backup | Must align with IEC 60601 electrical safety envelope; isolation is critical for patient-contact equipment |
| Materials (patient-contact) | Mid | Upholstery, padding, antimicrobial coatings | Any change in patient-contact material may require biocompatibility re-evaluation |
| Sterilization compatibility | Mid | Supported sterilization methods (steam, EtO, gamma, plasma) | Materials must match the claimed compatibility |
| Accessories and attachments | Mid-late | Clinical accessories (trays, armboards, headrests, slide-boards, specialty attachments) | Many accessories have their own 510(k); drives BOM heavily |
| Controls and Connectivity | Mid-late | Manual, electric, networked, EHR integration | Connectivity introduces cybersecurity and software-as-medical-device (SaMD) considerations |
| Finish and Appearance | Late | Color, upholstery pattern, branding | Usually non-regulated; still may affect cleanability |
| Compliance and Certifications | Late | FDA class, 510(k) number, UDI DI, IEC 60601 version, CE, ISO 13485 context | Attributes, not user-selected Input Values |

### 3.3 Global Product candidates and nested configuration usage

**Global Product candidates.**
- Accessories with their own 510(k) clearance (e.g., specific clinical attachments reused across multiple parent devices)
- Standard accessories across a product line (e.g., armboards shared across multiple OR table models)
- Power and electrical configuration Input where device family shares electrical architecture

**Nested configuration typical uses.**
- Capital equipment with matched accessory kits where parent carries the clinical envelope and children are individually cleared accessories
- Modular systems (e.g., an OR table platform with interchangeable tops, armboards, and specialty attachments)

**Not typically nested in this vertical.**
- Capital-plus-service bundles (handled at quote level)
- Consumables accompanying capital equipment (separate Products with separate lifecycles)

**Applies to:** new (primary) · edit (secondary, as reference for ripple analysis) &nbsp; **Outcome:** quote accuracy, maintainability, catalog expansion velocity &nbsp; **Downstream:** Admin authoring speed, sales rep configurator clarity, engineering handoff cleanliness

---

## 4. Typical rule patterns

| Pattern | What it enforces | Typical C1C mechanism | Typical Logic Group | Notes |
|---|---|---|---|---|
| Cleared configuration envelope | Configuration must stay within what the 510(k) / MDR Technical Doc covers | Logic Item (Interface, Validation) | Validation Group | Error Message should cite the regulatory pathway (510(k) reference) that the envelope derives from |
| Clinical application compatibility | Selected application must match the device’s cleared indications | Driven Input | — | Clinical application gates downstream options |
| Weight capacity envelope | Patient weight or payload must not exceed cleared capacity | Logic Item (Interface, Validation) | Validation Group | Weight-bearing is safety-critical; hard block with clear message |
| Patient-contact material change | Material changes may trigger biocompatibility re-evaluation | Logic Item (Interface, Display + Dependency) | Materials / Compatibility Group | Surface the implication; do not silently allow substitution |
| Sterilization-method compatibility | Materials must withstand claimed sterilization methods | Input Filter | — | Material attributes drive filter against the selected sterilization method |
| Electrical safety envelope (IEC 60601) | Electrical configuration must align with IEC 60601 class and isolation | Logic Item (Interface, Dependency) | Materials / Compatibility Group | Class I vs. Class II equipment; patient-contact type (B, BF, CF) constrains isolation |
| Accessory-to-parent compatibility | Accessory 510(k) must be compatible with parent device | Driven Input | — | Clearance-level compatibility matrix |
| OR-compatibility envelope | OR-use requires specific materials, finish, electrical isolation | Logic Item (Interface, Validation) | Validation Group | OR is a high-bar environment; blocks when constraints are not met |
| Antimicrobial finish claim | Regulated claim requires specific coating | Driven Item Master | — | Claim must be supported by test data; BOM reflects the coating |
| UDI-DI generation | Version-level identity | Item Family with Item Master Automation | — | DI is typically a structured identifier encoding labeler and version; Smart Part Number discipline is critical |
| Cybersecurity-connected device | Networked devices require cybersecurity documentation | Logic Item (Interface, Display) | Validation Group | Surface cybersecurity requirements when connectivity is enabled |
| Accessory-to-BOM mapping | Selected accessory drives BOM additions | BOM Logic Item | — | Interface Logic is the wrong tool |
| Battery backup required | Certain clinical applications require battery backup | Logic Item (Interface, Dependency) | Materials / Compatibility Group | Life-safety context may require backup power |
| Region-specific electrical | Voltage, plug type, cord configuration | Driven Input | — | Region drives electrical; hospital power standards vary |
| Region-specific regulatory marking | FDA vs. CE vs. other region approvals surfaced | Driven Output or Attribute | — | Region drives which regulatory marking appears on labels and documentation |

**Applies to:** new (primary) · edit (secondary, as reference for ripple analysis on rule changes — edit analysis is especially important in this vertical due to regulatory implications) &nbsp; **Outcome:** quote accuracy, rule maintainability, reduced factory corrections, regulatory compliance &nbsp; **Downstream:** sales rep error reduction, engineering handoff cleanliness, Admin debuggability, regulatory affairs confidence

---

## 5. Typical BOM and skeleton patterns

### 5.1 Typical BOM construction patterns

| Pattern | What it produces | Typical C1C mechanism | Notes |
|---|---|---|---|
| Regulated sub-assembly | Patient-contact assembly with biocompatibility pedigree | Item Subassembly under regulated Item Family | Each patient-contact sub-assembly has traceable material lineage |
| Electrical assembly | Power supply, isolation transformer, grounding, IEC 60601-compliant wiring | Item Subassembly under electrical Item Family | Critical for IEC 60601 compliance; component substitutions are not casual |
| Control system | PCB, software (version-tracked), display, touchscreen | Item Family with Item Master Automation | Software version is part of UDI identity for SaMD-adjacent devices |
| Accessory kit | Attachments specific to clinical application | Item Family plus BOM Logic Items | Each accessory may have its own 510(k); the BOM reflects both the parent and accessory identities |
| Consumables starter kit | Initial supply of pads, straps, drapes | BOM Logic Item | Consumables are usually priced separately but may ship with capital equipment on initial delivery |
| Sterilization-compatibility components | Gaskets, seals, fasteners suitable for steam/EtO/gamma | Driven Item Master | Sterilization method Input drives component selection |
| Labeling and documentation | Device label with UDI (DI portion), IFU (Instructions for Use), quick-reference | Item Family with Item Master Automation; static Skeleton lines | IFU is per-configuration; UDI DI must be encoded correctly |
| Installation and training materials | Installation guide, user training materials, service manual | Static Skeleton lines or BOM Logic | Training content varies by clinical application |
| Nameplate with regulatory marking | Device nameplate with FDA registration, 510(k) reference, UDI, IEC markings | Item Family with Item Master Automation | Regulatory marking content is region-driven; Driven Output pattern |
| Packaging and sterile barrier (if sterile) | Sterile barrier packaging with validated sterilization indicator | Driven Item Master or static Skeleton | Applies to pre-sterilized products; sterilization validation must be current |

### 5.2 Invisible BOM content typical in this vertical

- Device label and UDI carrier — carries UDI DI; must be applied during final assembly; content is configuration-driven
- Instructions for Use (IFU) — regulated document; region-specific; version-controlled
- Declaration of Conformity (EU) — regulated document for CE-marked products
- 510(k) letter or summary (US) — accompanies some capital equipment deliveries; reference material
- Warranty card and service-contract documentation — standard
- Installation guide — required for most capital equipment
- Sterilization validation indicators — on sterile-barrier packaging
- Biocompatibility documentation trail — traceable to the material lot, not a BOM line per se but referenced
- Quality release certificate — per-unit QA record, printed at shipment
- Quick-start guide or training-reference card — end-user documentation

**Applies to:** new (primary — BOM structure) · edit (primary — BOM changes ripple to manufacturing and regulatory) &nbsp; **Outcome:** factory correction reduction, on-time delivery, manufacturing accuracy, regulatory compliance &nbsp; **Downstream:** engineering handoff quality, manufacturing floor accuracy, regulatory audit defensibility, aftermarket parts identification

---

## 6. Integration expectations

| System / category | Type | Relationship to C1C | Notes |
|---|---|---|---|
| FDA GUDID / AccessGUDID | Regulatory database | Adjacent (not integrated) | Configurations carry UDI DI that’s registered in GUDID by the labeler; not a runtime query |
| FDA 510(k) database | Regulatory database | Adjacent (not integrated) | 510(k) reference numbers are stored as Attributes; not a runtime lookup |
| EUDAMED (EU) | Regulatory database | Adjacent (not integrated) | EU equivalent to GUDID for MDR registration |
| GPO pricing databases (Vizient, Premier, HealthTrust) | Pricing database | Adjacent (out of V1 scope) | Pricing integration is a Version 2 consideration |
| Hospital procurement platforms (GHX, Vizient Spend, Premier SCM) | Procurement portal | Downstream | Order intake and catalog publishing; spec data flows from manufacturer to portal |
| ERP (NetSuite, SAP, Oracle) | ERP | Downstream | BOM and configuration-to-order handoff; NetSuite is the Revalize reference integration |
| CAD (SolidWorks, Inventor, Creo) | CAD | Bidirectional | Product Outputs drive CAD documentation for installation drawings and submittals |
| QMS (Quality Management System) | Quality platform | Adjacent (may be integrated) | ISO 13485 QMS may link to configuration changes for design-control purposes; integration pattern varies |
| Labeling system (NiceLabel, BarTender, Seagull) | Labeling | Downstream | UDI labels and device labels are generated from configuration data via label printing |
| EHR / clinical systems | Clinical platform | Adjacent | Connected devices may integrate with EHR; configuration-time decision is connectivity enablement |
| Installation and service scheduling | Scheduling | Downstream | Capital equipment installation is coordinated separately from order fulfillment |

**Applies to:** new · edit · both &nbsp; **Outcome:** Agent credibility on adjacent-systems conversations, correct scoping of integration vs. non-integration questions &nbsp; **Downstream:** engineering handoff awareness, regulatory audit trail, rep / distributor workflow awareness

---

## 7. Document types and interpretation cues

| Document type | Typical source | Fields the Agent should expect | Interpretation traps |
|---|---|---|---|
| 510(k) summary | FDA database or manufacturer | Cleared indications, device description, substantial equivalence table, 510(k) number, device class | Cleared indications define the envelope — new configurations outside this envelope trigger regulatory review |
| Device Master Record (DMR) / Technical File | Manufacturer internal | Approved design configuration, components, specs, drawings | The DMR is the ground truth for what’s been cleared; extraction should reference it explicitly |
| Instructions for Use (IFU) | Manufacturer | Intended use, indications, contraindications, warnings, precautions, instructions | Regulatory document; not a product catalog — structured content |
| Declaration of Conformity (EU) | Manufacturer | Device identity, applicable directives/regulations, standards, test data references | EU-market documentation; standards list matters for configuration envelope |
| UDI label / label specimen | Manufacturer | DI encoding, PI placeholders, human-readable interpretation | UDI DI must match what’s registered in GUDID; encoding is GS1 or HIBCC typically |
| Clinical specification (from customer) | Hospital clinical team | Intended procedures, patient population, required features, capacity requirements, accessories needed | Customer-written; maps to configuration Inputs; clinical language differs from the manufacturer’s configuration grammar |
| GPO contract / IDN spec | GPO or hospital system | Product catalog covered by contract, options included/excluded, pricing tiers | Contract scope matters; configurations outside the contract scope are commercially different |
| Biocompatibility test report | Testing lab | Test article, materials, test methods (ISO 10993), results | Material lineage per patient-contact component; referenced when configuration changes patient-contact materials |
| IEC 60601 test report | Certification body | Standard edition, test results, exceptions | Edition matters — IEC 60601-1 3.2 vs. earlier editions have meaningfully different requirements |
| Quality audit or inspection findings | Internal QA or regulator | Observations, non-conformities, corrective actions | Indirect input to configurator; may drive changes to enforced rules |

**Applies to:** new · edit · both &nbsp; **Outcome:** extraction accuracy, reduction of clarification loops, faster document-driven changes, regulatory traceability &nbsp; **Downstream:** Admin session velocity, regulatory documentation consistency

---

## 8. Downstream user expectations

### 8.1 Sales rep expectations

Capital equipment sales reps (direct or through specialty distributors), clinical specialists (deeply familiar with clinical workflow), and inside sales teams handling GPO-contract orders. Clinical specialists typically have clinical or engineering backgrounds and are comfortable discussing the device’s regulatory pedigree. The rep needs the configurator to produce clinically-accurate configurations that match the customer’s cleared use envelope, to generate submittal documents with correct 510(k) references and UDI information, and to handle GPO contract scope (is the configuration eligible under the customer’s contract?). Reps in this vertical understand that "off-label configuration" is not a valid sales path — the configurator should not allow the rep to build configurations that imply clinical use outside the cleared indications.

### 8.2 Engineering and manufacturing expectations

In-house engineering handles cleared-envelope changes and triggers regulatory review when envelope-crossing changes occur. Manufacturing operates under ISO 13485 QMS with strict design-control discipline — the BOM and device assembly must match the cleared design configuration; deviations require Engineering Change Orders with regulatory assessment. Manufacturing expects the BOM to carry the correct regulated sub-assemblies, the correct patient-contact materials (with biocompatibility lineage), the correct electrical configuration (with IEC 60601 compliance), and the correct UDI DI encoding for labeling. Handoff most commonly breaks when a configuration option was added through the configurator but not reflected in the DMR (Device Master Record), when patient-contact material was substituted without biocompatibility re-evaluation, or when accessory selection produces a configuration whose accessories aren’t individually cleared for the parent.

### 8.3 End customer expectations

Hospital clinical staff, biomedical engineering teams, supply chain and procurement, and facility administration. Clinicians expect the device to function as the IFU describes for the cleared indications. Biomedical engineering expects the device’s regulatory pedigree (510(k) reference, UDI, IEC compliance) to be documented at delivery and traceable over the device’s life cycle. Supply chain expects GPO contract compliance, UDI scanning for inventory, and integration with hospital procurement systems (GHX). "Wrong" looks like a device that arrives without correct UDI labeling (blocking receiving), a configuration with patient-contact materials that aren’t biocompatibility-documented (flagged during commissioning), or a device whose connected accessories aren’t individually cleared (flagged during installation or during a field audit). Regulatory audit failures can drive costly field actions — corrections, removals, or recalls.

**Applies to:** new (primary) · edit (primary — edits are particularly sensitive in this vertical due to regulatory implications; a seemingly small edit can trigger substantial regulatory re-work) &nbsp; **Outcome:** factory correction reduction, rep adoption, end-customer acceptance, regulatory audit defensibility &nbsp; **Downstream:** the whole point — this section IS the downstream-impact lens, with regulatory as the dominant consideration

---

## 9. How Admins in this vertical tend to mis-model

- **Modeling configuration options that exceed the cleared envelope.** The 510(k) or MDR Technical Documentation defines what the device has been cleared to be. Admins sometimes add options to the configurator that produce variants outside that envelope — a weight capacity above cleared limits, a material substitution not covered by biocompatibility testing, an accessory not listed in the 510(k). The envelope must constrain the configurator’s option space; new variants typically belong to a new Product or a regulatory update cycle, not an Input Value extension.

- **Treating UDI as an afterthought.** UDI DI must be encoded correctly on device labels; the Smart Part Number discipline is the tip of a larger identity architecture. Admins sometimes bolt UDI generation on after product modeling is complete, producing configurations where UDI DI collides across variants or where version-level distinctions aren’t reflected in DI assignment. UDI structure should be part of the initial Product design.

- **Substituting patient-contact materials via an Input Value without triggering biocompatibility re-evaluation.** A configuration option like "optional antimicrobial pad" may seem like a simple upgrade, but the pad material must have biocompatibility test data for the intended use. Admins sometimes expose material options without linking them to biocompatibility documentation; the configurator can produce a valid-looking configuration whose patient-contact materials lack the required testing.

- **Ignoring the distinction between Class II accessories with their own 510(k) and accessories covered by the parent.** Some accessories are cleared individually and may be used across multiple parent devices; others are only cleared as part of the parent. Admins sometimes conflate these — modeling all accessories as parent-Product-specific options, or all accessories as Global, producing configurations where the regulatory claim is unclear.

- **Ignoring IEC 60601 edition transitions.** The IEC 60601 standard has editions (2.0, 3.0, 3.1, 3.2, 4th forthcoming), and each edition has different requirements. Admins sometimes treat "IEC 60601 compliant" as a single Attribute without noting which edition; when an edition transition happens (e.g., national regulator adopts a new edition), existing configurations may no longer comply. Edition identity is part of the configuration.

- **Letting connectivity options produce configurations without cybersecurity documentation.** Network-capable devices are increasingly regulated for cybersecurity (FDA guidance on premarket cybersecurity, EU MDR Annex I on software requirements). Admins sometimes expose connectivity as a simple option without linking it to cybersecurity documentation requirements. The configurator can produce connected configurations without accompanying regulatory content.

- **Collapsing hospital-capital-equipment bundling into single configurations.** Capital equipment, installation, training, and service contracts are four distinct commercial items with distinct regulatory and commercial characteristics. Admins sometimes force them into a single nested configuration, producing structures that fight against the customer’s procurement process and the manufacturer’s operational process. These typically belong at the quote level with independent line items.

**Applies to:** new (primary) · edit (secondary — though edits carry particularly high regulatory stakes in this vertical) &nbsp; **Outcome:** better initial modeling decisions, reduced rework, regulatory compliance, better catalog expansion &nbsp; **Downstream:** Admin’s future self, rule maintainability, configurator UX, regulatory audit defensibility

---

## 10. Vertical edge cases and guardrail triggers

| Edge case | Trigger signal | Guardrail posture | Notes |
|---|---|---|---|
| Configuration exceeding cleared envelope | Edit that adds a variant, capacity, or material outside the existing 510(k) or MDR Technical Doc | Pause and confirm | Agent surfaces that a regulatory review may be triggered; defers to customer regulatory affairs. Does not make clearance determinations itself |
| Patient-contact material change | Change to a material in patient-contact position | Pause and confirm | Biocompatibility re-evaluation may be required; refer to customer regulatory affairs / product engineering |
| IEC 60601 compliance boundary | Change to electrical configuration, insulation class, or isolation characteristic | Pause and confirm | Surface that IEC 60601 re-testing or re-evaluation may be required |
| Sterilization compatibility change | Change to a material or component on sterilization-validated device | Pause and confirm | Sterilization validation may require re-evaluation; do not assume new material survives validated process |
| UDI DI collision or inadequate distinctness | New variant whose UDI-DI would duplicate an existing variant’s, or fails to distinguish meaningful differences | Pause and confirm | UDI DI uniqueness is mandatory; surface the collision to the Admin |
| Accessory-to-parent clearance mismatch | Accessory added without its own 510(k) coverage, attached to a parent device whose 510(k) doesn’t include that accessory | Pause and confirm | Surface that the accessory may not be cleared for use with this parent; defer to regulatory affairs |
| Cybersecurity documentation gap | Connectivity enabled without corresponding cybersecurity documentation Products Outputs configured | Pause and confirm | Connected medical devices are regulated for cybersecurity; surface the gap |
| Regional regulatory mismatch | Configuration exported to a region where the product isn’t registered | Flag for Admin review | Register-by-region is how many markets gate entry; flag the mismatch |
| Recall or field-safety action affected | Edit to a product with an active recall or field-safety notice | Escalate to human | Do not proceed with configuration changes on recalled or field-action-subject products without explicit confirmation from customer regulatory / legal |
| Clinical-application out of cleared indications | Configuration built for clinical use outside the product’s cleared indications | Pause and confirm | Off-label configuration is not a valid sales path; surface that the Admin should either redirect the user or flag the request for clinical and regulatory review |
| Software version change on SaMD-adjacent device | Software update or configuration change on a device with software-as-medical-device characteristics | Pause and confirm | Software version is part of regulatory identity; changes may trigger regulatory assessment |

**Applies to:** new · edit (edits are particularly sensitive — regulatory implications ripple widely, and "small" edits frequently trigger substantial regulatory re-work) · both &nbsp; **Outcome:** risk reduction, compliance posture, audit defensibility, patient safety &nbsp; **Downstream:** regulatory affairs workflow, legal defensibility, end-customer safety &nbsp; **Guardrail:** primary input to vertical-aware guardrail behavior; highest regulatory stakes of any vertical in the set

---

*Document version: 1.0 · Profile authored against vertical profile template v1.0. Contains real grounding on FDA 510(k) pathway (substantial equivalence, predicate device, cleared envelope), UDI system (DI + PI, GUDID registration, GS1/HIBCC issuing agencies), EU MDR 2017/745 (Basic UDI-DI, EUDAMED), IEC 60601 family including collateral and particular standards, ISO 10993 biocompatibility testing framework, hospital procurement structure (GPO tiers via Vizient/Premier/HealthTrust, IDN contracting, GHX e-commerce), and ISO 13485 QMS context. Author review should validate specific rule patterns, BOM content, and regulatory-trigger specifics against current customer implementations and current regulatory landscape, as regulations evolve continuously.*
