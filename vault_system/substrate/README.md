# Shep Substrate Intake

The Windows R: drive mounted at `/mnt/r` is Shep's canonical source substrate. Original files are indexed read-only. This project tree stores intake copies when explicitly supplied and derived artifacts only.

## Intake folders

- `intake/registry`: registry applications, rules, fee schedules, standards, inspections, coat and transfer documents.
- `intake/animals`: animal-master exports.
- `intake/pedigrees`, `breeding`, `lambing`, `health`, `weights`, `inspections`: corresponding governed farm records.
- `intake/sales-transfers`, `customers`: restricted administrative exports.
- `intake/farm-procedures`: approved operating procedures and policies.
- `intake/photos`: source images and certificates requiring OCR.

## Derived folders

- `derived/manifests`: transparent scan status and failures.
- `derived/text`: extracted embedded text.
- `derived/ocr`: cached Tesseract results tied to original hashes and pages.
- `derived/indexes`: searchable source/chunk index.
- `derived/escalations`: persisted human-review records.

The ORB mesh is an authorized governed read/write layer. Writes are append-only envelopes under `/mnt/r/orb_mesh/results/web`; source records elsewhere on R: are never modified by the scanner.

