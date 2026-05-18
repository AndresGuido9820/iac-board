# HU-013 — Save / Restore Layout

**Status:** IN PROGRESS
**Branch:** feat/hu-013-save-restore-layout

## Objective
Persist user-dragged node positions across page reloads. Let users download an
explicit `.iac-board.json` layout file and reload it later.

## Tasks

### 1. visual-engine — expose overrides API
- [x] Add `initialOverrides?: Record<string, Rect>` prop to `CloudBoard`
- [x] Add `onOverridesChange?: (overrides: Record<string, Rect>) => void` prop
- [x] Initialize `overrides` state from `initialOverrides`
- [x] Call `onOverridesChange` when drag ends (`onBoardMouseUp`)

### 2. App — localStorage auto-save
- [x] `diagramId` computed from example ID or FNV hash of file paths+content
- [x] Load overrides from `localStorage` on `diagramId` change
- [x] Save overrides to `localStorage` via `handleOverridesChange`
- [x] Pass `key={diagramId}` to `CloudBoard` so state resets on diagram switch
- [x] Pass `initialOverrides` and `onOverridesChange` to `CloudBoard`

### 3. App — Save layout button
- [x] Add `saveLayout(diagramId, name, overrides)` util → downloads `diagram.iac-board.json`
- [x] Wire button in panel header (only shown when overrides exist)

### 4. Translations
- [x] Add `save_layout` key to EN + ES translations

### 5. Tests
- [x] Unit: `CloudBoard` calls `onOverridesChange` after drag
- [x] Unit: `CloudBoard` initializes positions from `initialOverrides`
- [x] App test: save layout button present when overrides exist (mock localStorage)

### 6. Docs / cleanup
- [x] Update core-plan.md to mark Fase H (partial) done
- [x] Mark this TODO complete
