# Fase H2 — Load .iac-board.json

**Status:** DONE
**Branch:** feat/fase-d-plan-json (combined with Fase D)

## Objective
Close the save/load cycle: allow users to drag-drop or pick a `.iac-board.json`
file to restore a previously saved layout into the current diagram.

## Tasks
- [x] Add `loadLayoutFile(file: File): Promise<Record<string, Rect>>` util in App.tsx
- [x] Add "Load layout" button / drop handler in import-zone or diagram panel
- [x] Warn (non-blocking) when loaded file diagramId doesn't match current
- [x] Add `load_layout` translation key (EN + ES)
- [x] Tests: loading a valid .iac-board.json applies overrides
- [x] Tests: mismatched diagramId still applies overrides (warn only)
