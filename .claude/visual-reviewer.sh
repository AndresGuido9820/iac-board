#!/usr/bin/env bash
# Hook: runs after every Claude session on iac-board
# Captures fresh visual screenshots, then launches a sub-agent
# that reads the PNGs and generates a scored visual quality report.

set -euo pipefail

REPO="/home/andres/Github/iac-board"
REPORTS_DIR="$REPO/reports"
mkdir -p "$REPORTS_DIR"

REPORT="$REPORTS_DIR/visual-review-$(date +%Y%m%d-%H%M).md"
LOG="/tmp/iac-visual-reviewer-$(date +%H%M%S).log"

# Step 1: Build and capture fresh screenshots
echo "[visual-reviewer] Building and capturing screenshots..."
cd "$REPO"
npm run build 2>&1 | tail -3
npx playwright test --project=visual --update-snapshots 2>&1 | tail -10 || true
echo "[visual-reviewer] Screenshots captured."

# Step 2: Launch sub-agent to evaluate screenshots
SNAP_DIR="$REPO/tests/visual/diagram-audit.visual.spec.ts-snapshots"

PROMPT="Eres un visual QA reviewer para IaC Board (herramienta open-source que genera \
diagramas de arquitectura AWS desde archivos Terraform).

Tu trabajo es evaluar la calidad visual de los diagramas generados.

INSTRUCCIONES:

1) Lee estos 4 screenshots de los diagramas actuales:
   - $SNAP_DIR/diagram-serverless-api-visual-linux.png
   - $SNAP_DIR/diagram-iot-pipeline-visual-linux.png
   - $SNAP_DIR/diagram-vpc-rds-visual-linux.png
   - $SNAP_DIR/diagram-hero-default-visual-linux.png

2) Evalua cada screenshot contra esta checklist:

   LAYOUT (peso 30%):
   - Cruces de edges (count por diagrama)
   - Nodos del mismo grupo en columnas adyacentes (VPC+RDS)
   - Aspect ratio de grupos <=3:1
   - Nodos no solapan grupos ajenos

   EDGES (peso 25%):
   - Edges cruzan nodos intermedios? (count)
   - Edges tienen labels de relacion? (si/no)
   - Colores de edges distinguibles sin labels
   - Feedback edges (derecha a izquierda) usan arco limpio
   - Arrowheads visibles al zoom default

   NODOS (peso 20%):
   - Icono de servicio visible y reconocible
   - Labels completos (no truncados)
   - Colores por categoria claros y diferenciados
   - Drop shadow da profundidad sin ruido

   COMPOSICION (peso 15%):
   - Dot-grid background uniforme
   - Padding suficiente alrededor del diagrama
   - Diagrama centrado en viewport
   - Leyenda de colores de edges (existe o no)

   INTERACCION (peso 10%): evaluar sobre lo que sea visible (botones export, etc.)

3) Genera un score 0-10 para cada dimension.
4) Calcula el Visual Quality Score = L*0.30 + E*0.25 + N*0.20 + C*0.15 + U*0.10
5) Lista los top 3 problemas visuales mas urgentes.
6) Recomienda las 3 acciones de mayor impacto para la proxima sesion.

FORMATO DEL REPORTE:

# Visual Review - IaC Board - $(date +%Y-%m-%d)

## Visual Quality Score: X.X/10

| Dimension | Score | Target | Gap |
|-----------|-------|--------|-----|
| Layout    | X/10  | 10     | ... |
| Edges     | X/10  | 10     | ... |
| Nodos     | X/10  | 10     | ... |
| Composicion| X/10 | 10     | ... |
| Interaccion| X/10 | 10     | ... |

## Evaluacion por screenshot
### Serverless API (4 nodos)
...
### IoT Pipeline (7 nodos)
...
### VPC + RDS (8 nodos, 3 grupos)
...
### Hero Default
...

## Top 3 problemas urgentes
1. ...

## Acciones recomendadas para proxima sesion
1. ...

Guarda el reporte en $REPORT. No hagas ninguna otra accion."

claude \
  --model claude-sonnet-4-6 \
  -p "$PROMPT" \
  --output-format text \
  > "$LOG" 2>&1

echo "[visual-reviewer] Report saved to $REPORT (log: $LOG)"
