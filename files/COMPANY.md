# Sumitomo Heavy Industries, Ltd.

## Company Identity

- **Legal name** — Sumitomo Heavy Industries, Ltd. (SHI)
- **Trade name** — Sumitomo Drive Technologies
- **Parent** — Sumitomo Heavy Industries, Ltd. (Tokyo, Japan)
- **US subsidiary** — Sumitomo Machinery Corporation of America
- **Founded** — 1888 (130+ years)
- **HQ** — Tokyo, Japan
- **US HQ** — Chesapeake, VA (engineering, sales, manufacturing, warehouse)
- **Additional US** — Manufacturing in Chesapeake, VA; regional sales offices in Chicago, Houston, Atlanta, Los Angeles
- **Employees** — ~800 in North America; ~25,000 globally
- **Revenue band** — $500M+ (Power Transmission & Controls segment)
- **Status** — Public (TSE: 6302)
- **C1C tenant** — sumitomo-us-prod

## Market Position

- **Primary verticals** — Material handling (conveyors, hoists), food & beverage (mixers, packaging), mining & energy (crushers, shredders), general industrial (fans, pumps, compressors)
- **Geographic focus** — North America (primary), with global catalog shared across SHI divisions
- **Competitive landscape** — SEW Eurodrive, Nord Drivesystems, Bonfiglioli, Falk (Rexnord), Dodge (ABB), WEG, Siemens, Flender
- **Where they win** — Cycloidal technology (compact, high ratio, shock-resistant), long service life, broad catalog depth, strong distributor network
- **Channel strategy** — Engineered distributors (primary), authorized reps, direct OEM accounts (conveyor builders, mixer OEMs, packaging machinery), aftermarket through industrial parts distributors
- **Key customer types** — Application engineers at distributors, OEM design engineers, plant maintenance engineers (replacement), consulting engineers (specification)

## Product Portfolio

| Family | Technology | Inputs (est.) | Status |
|---|---|---|---|
| Cyclo 6000 | Cycloidal | 200–400 | Active (flagship) |
| Cyclo Bevel Buddybox | Cycloidal + bevel | 150–300 | Active |
| Hansen P4 Industrial | Helical parallel-shaft | 200–350 | Active |
| SM-Hyponic | Hypoid right-angle | 150–250 | Active |
| SM-Cyclo (3000/4000) | Cycloidal (legacy) | — | Discontinued (cross-ref to 6000) |
| Fine Cyclo | Precision cycloidal | 100–200 | Active (servo/robotics) |
| Paramax | Helical/bevel-helical | 200–350 | Active (heavy industrial) |
| Alta Series | AC drives/VFDs | 50–100 | Active |
| Lafert | IEC motors | 100–200 | Active (EU-focused) |

- **Shared components** — Motor catalog (Baldor/WEG/Sumitomo-branded), brake assemblies, backstops, mounting hardware, paint/finish options, compliance/certification packages
- **Legacy migrations** — Cyclo 3000 → 6000, Cyclo 4000 → 6000 (cross-reference tables in catalog)

## Configuration Character

- **Sales model** — Engineer-to-order (ETO) for large/custom; configure-to-order (CTO) for catalog drives
- **Typical session** — Rep enters duty point (HP + ratio + mounting) or known model number; 5–15 minutes for standard catalog, 30+ minutes for packaged systems
- **Selection methodology** — Duty-point driven: output torque/speed → HP × ratio × service class → frame size from selection tables
- **Nomenclature** — Alphanumeric model codes where each position encodes a configuration choice (e.g., CHHM10-6165YB-EP-29); the model number IS the smart part number
- **Catalog structure** — Nomenclature page → selection tables (per HP) → dimension drawings → options/accessories → lubrication → wiring → maintenance
- **Ordering** — Configured model number → distributor PO → factory order entry → manufacturing → ship

## Technical Domain (Company-Specific)

- **Standards** — AGMA (service class, gear rating), NEMA (motor frames, efficiency), IEC (IE3/IE4 motors, 50Hz markets), DIN (shaft specifications), ATEX (hazardous area)
- **Key interdependencies** — Frame size ↔ motor HP ↔ ratio ↔ service class; mounting code ↔ orientation ↔ housing ↔ lubrication; shaft spec ↔ frame range limits
- **Calculations** — Output torque (frame × ratio lookup), output speed (input RPM / ratio), service factor (AGMA class lookup), OHL capacity (frame attribute)
- **Regional variations** — NEMA motors for North America, IEC for EU/Asia; voltage/frequency differences (460V/60Hz vs 400V/50Hz); agency certifications (UL/CSA vs CE/ATEX)

## Existing C1C Environment

- **Current footprint** — 3 products modeled (Cyclo 6000, SM-Hyponic partial, Hansen P4 partial); ~600 total inputs; ~45 logic items; ~12 driven inputs
- **Naming conventions** — UPPER_SNAKE_CASE for input names, Title Case for labels, product code prefix on all IDs (e.g., C6K_FRAME_SIZE)
- **Known patterns** — Canonical mounting code as primary user-facing pick; frame size as driven input from selection table matrix; spec code suffixes concatenated alphabetically
- **Known issues** — SM-Hyponic model incomplete (missing BOM and some driven inputs); legacy cross-reference not yet modeled; motor catalog shared but not yet a global product
- **Integrations** — NetSuite (ERP, downstream BOM handoff), SolidWorks (dimension drawings from product outputs), dealer portal (aftermarket parts mapping)

## Business Rules

- **Pricing** — List price from frame + motor + options adders; distributor discount tiers (A/B/C/D); OEM contract pricing on volume
- **Lead times** — Stock units 2–3 weeks; configured catalog 4–6 weeks; engineered specials 8–12 weeks
- **Order constraints** — No MOQ for catalog; MOQ applies to custom paint, special shaft, engineered modifications
- **Compliance** — DOE motor efficiency regulations (EP mandatory ≥1HP); ATEX/IECEx for hazardous area; FDA paint for food-contact applications
- **Data sensitivity** — Distributor pricing tiers are confidential; OEM contract terms are confidential; engineering drawings are customer-property after purchase
