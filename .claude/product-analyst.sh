#!/usr/bin/env bash
# Hook: runs after every Claude session on iac-board
# Launches a sub-agent that analyzes the session and writes a product report.

set -euo pipefail

REPO="/home/andres/Github/iac-board"
REPORTS_DIR="$REPO/reports"
mkdir -p "$REPORTS_DIR"

REPORT="$REPORTS_DIR/product-analysis-$(date +%Y%m%d-%H%M).md"
LOG="/tmp/iac-analyst-$(date +%H%M%S).log"

PROMPT="Eres un product analyst técnico para IaC Board (herramienta open-source \
que genera diagramas de arquitectura AWS desde archivos Terraform, 100% browser, \
sin credenciales, sin servidor).

Analiza el estado actual del repo en $REPO y ejecuta estos pasos:

1) Lee $REPO/WORKLOG.md — qué se implementó recientemente.
2) Lee $REPO/todo/diagram-quality-plan.md — HUs pendientes y roadmap.
3) Lee estos archivos clave del producto:
   - $REPO/apps/web/src/App.tsx
   - $REPO/packages/visual-engine/src/cloud-board.tsx
   - $REPO/packages/cloud-graph/src/index.ts
   - $REPO/packages/terraform-parser/src/extractor.ts
4) Analiza posibles mejoras en 4 dimensiones:
   (a) UX/DX — fricción, onboarding, flujo de importación, feedback al usuario
   (b) Features de alto impacto faltantes (más allá del roadmap existente)
   (c) Deuda técnica que bloquea features futuras
   (d) Diferenciación vs competidores: Rover, Cloudcraft, Brainboard, Inframap, draw.io
5) Genera un reporte markdown guardado en $REPORT con estas secciones:
   ## Resumen de sesión
   ## Estado del producto hoy
   ## Top 5 mejoras recomendadas
   (cada una: descripción, justificación de negocio, esfuerzo estimado, HU relacionada)
   ## Riesgos técnicos
   ## Próximos pasos sugeridos

Guarda el reporte en $REPORT. No hagas ninguna otra acción."

claude \
  --model claude-sonnet-4-6 \
  -p "$PROMPT" \
  --output-format text \
  > "$LOG" 2>&1

echo "Product analysis saved to $REPORT (log: $LOG)"
