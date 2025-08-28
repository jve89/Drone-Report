# Intake → Report mapping (fixed order template)

## 1) Cover
- contact.project → Title
- contact.company → Subtitle
- inspection.date → Date line
- site.address → Location line (omit if empty)
- branding.logoUrl → Logo (omit if empty)
- branding.color → Theme (default gray if empty)

## 2) Executive Summary
- summary.condition, summary.urgency → badges
- summary.topIssues[] → bullets
- (Raw mode: placeholder when empty)

## 3) Methodology
### 3.1 Scope & Site
- scope.types[] → chips
- areas[] → chips
- site.mapImageUrl → map figure (optional)

### 3.2 Equipment & UAS ID
- equipment.drone.{manufacturer,model,type} → table
- equipment.specs.{spanM,tomKg,maxSpeedMs} → table
- equipment.identifiers.{serial,uaReg} → table
- equipment.certificates.{tc,dvr,cofa,noise} → list (omit empty)

### 3.3 Flight & Conditions
- flight.{type,altitudeMinM,altitudeMaxM,airtimeMin,crewCount} → table
- weather.{tempC,windMs,precip,cloud} → table
- constraints.heightLimitM → line

### 3.4 Risk & Authorisation
- risk.ground.{characterisation,mitigations,ERP} → bullets
- risk.air.{residualARC,strategic,tactical} → bullets
- authorisation.{number,expires} → line (SPEC only)

## 4) Observations & Findings
- findings[] grouped by area and defect:
  - Title: "{area} · {defect}"
  - severity → badge
  - recommendation → label
  - note → paragraph
  - imageRefs[] → inline thumbnails
- If no findings: per-image placeholders under area headings (Raw)

## 5) Media Appendix
- media.images[] → contact sheets (24 per page)
- media.videos[] → list with filename and URL (max 3)

## 6) Recommendations
- recommendations.global → paragraphs (omit if empty)

## 7) Compliance & Disclaimer
- operator.registration, operator.name → lines
- operator.responsibleContact{ name,email,phone } → lines (omit empty)
- preparedBy.{name,company,credentials} → prepared by block
- compliance.{omRef,evidenceRef,eventsNote} → lines (omit empty)
- compliance.insuranceConfirmed → checkbox line if true
- Footer note: “Documents retained ≥ 2 years per ops policy.”
