# Plan Maestro: Excelencia Visual de IaC Board

## Diagnóstico visual (evaluado sobre screenshots reales, 2026-05-16)

### Lo que funciona hoy

1. **Nodo cards** — icono real + accent bar por categoría + label. Aspecto profesional.
2. **Edges semánticos** — colores distintos por relación, dash para IAM/network, arrowheads.
3. **Dot-grid background** — aspecto canvas, estándar de la industria (draw.io, Figma).
4. **Grupos VPC/subnet** — dashed border con label, colores azul/violeta por tipo.
5. **UI shell** — hero, example cards, metrics, resource list. Limpio y funcional.

### Problemas visibles en los screenshots actuales

| # | Problema | Ejemplo afectado | Severidad |
|---|----------|------------------|-----------|
| V1 | **Edge cruza nodo** — la flecha `kinesis_trigger→normalizer` pasa encima de `telemetry_events` | IoT Pipeline | Alta |
| V2 | **Grupo VPC demasiado ancho** — 5 columnas, aspect ratio ~6:1 | VPC+RDS | Alta |
| V3 | **Labels de grupo superpuestos** — "VPC MAIN" y "PRIVATE SUBNET PRIVATE" colisionan arriba-izquierda | VPC+RDS | Alta |
| V4 | **Sin edge labels** — no se sabe qué tipo de relación es cada flecha sin mirar el color | Todos | Media |
| V5 | **Nodos IAM dispersos** — `lambda_exec` (iam_role) en misma columna que `sessions` (dynamodb) | Serverless | Media |
| V6 | **Nodo `analytics` aislado abajo-izquierda** — connected solo por dash, parece desconectado | IoT Pipeline | Media |
| V7 | **Sin leyenda de colores** — 10 colores de edges sin explicación | Todos | Media |
| V8 | **Nodos sin visual hierarchy** — todos el mismo tamaño, sin distinguir "importantes" vs "soporte" | Todos | Baja |
| V9 | **Sin minimap** — al zoom out no hay contexto de dónde estás | Todos (>5 nodos) | Baja |
| V10 | **Export buttons no visibles en screenshots** — recién implementados, no hay baselines actualizados | N/A | Info |

### Referencia: qué hacen bien los competidores

| Aspecto visual | draw.io | Cloudcraft | Lucidchart | Nosotros hoy |
|----------------|---------|------------|------------|--------------|
| Edge routing inteligente | Waypoints + auto-route | Auto | Excelente | Bezier directa, cruza nodos |
| Edge labels | Siempre visibles | N/A | Siempre | No existen |
| Group layout | Manual, respeta bounds | Auto 3D | Manual | Post-computed, nodos dispersos |
| Leyenda/key | Toolbar con estilos | N/A | Style panel | No existe |
| Minimap | Esquina inferior | N/A | Esquina inferior | No existe |
| Crossing minimization | Graphviz engine | Auto | Propio | Solo longest-path layering |
| Node sizing | Configurable | Fixed isometric | Configurable | Fixed 220×92 |
| Export quality | PNG/SVG/PDF/XML | PNG/SVG/JSON | PNG/SVG/PDF | PNG/SVG (nuevo) |

---

## Esquema de trabajo: desarrollo visual asistido por IA

### Principio fundamental

> Cada cambio visual pasa por un loop de 3 pasos:
> **Implementar → Capturar screenshot → Evaluar vs baseline → Decidir si mejorar o aceptar**

### Arquitectura de hooks y sub-agentes

```
┌──────────────────────────────────────────────────────┐
│  SESIÓN DE DESARROLLO (Claude Code)                  │
│                                                      │
│  1. Implementa cambio en visual-engine               │
│  2. Hook PostToolUse[Edit|Write] →                   │
│     Si archivo es visual-engine/* o App.css:          │
│     • Marca flag: VISUAL_CHANGE=true                 │
│                                                      │
│  3. Ejecuta `npm test` (unit tests)                  │
│  4. Ejecuta `npm run test:visual` (screenshots)      │
│  5. Lee screenshots con tool Read                    │
│  6. Evalúa calidad vs criterios del plan             │
│  7. Si no satisfecho → itera desde paso 1            │
│                                                      │
│  STOP ─────────────────────────────────────────────┐ │
│                                                    │ │
└────────────────────────────────────────────────────┼─┘
                                                     │
  ┌──────────────────────────────────────────────────┼──┐
  │  HOOK Stop (async)                               │  │
  │                                                  ▼  │
  │  Sub-agente 1: PRODUCT ANALYST (ya existe)          │
  │  → Genera reports/product-analysis-*.md             │
  │                                                     │
  │  Sub-agente 2: VISUAL REVIEWER (nuevo)              │
  │  → Lee los 4 screenshots actuales                   │
  │  → Evalúa contra checklist de calidad               │
  │  → Genera reports/visual-review-*.md                │
  │  → Score numérico por dimensión                     │
  │                                                     │
  └─────────────────────────────────────────────────────┘
```

### Hooks a configurar

#### Hook 1: Stop — Visual Reviewer sub-agent (NUEVO)

Lanza un sub-agente que:
1. Ejecuta `npm run build && npm run test:visual:update` para capturar screenshots frescos
2. Lee los 4 screenshots PNG (serverless-api, iot-pipeline, vpc-rds, hero-default)
3. Evalúa cada uno contra la checklist de calidad visual (definida abajo)
4. Genera un reporte scored en `reports/visual-review-YYYYMMDD-HHMM.md`

#### Hook 2: Stop — Product Analyst sub-agent (YA EXISTE)

Ya configurado. Analiza estado general del producto.

#### Hook 3: PostToolUse[Edit|Write] — Visual change detector (NUEVO)

Cuando se edita un archivo en `packages/visual-engine/` o `apps/web/src/App.css`:
- Imprime recordatorio al desarrollador:
  `"Visual change detected. Run: npm run test:visual:update && review screenshots."`

---

## Checklist de calidad visual (criterios de evaluación para sub-agente)

### Dimensión 1: Layout (peso 30%)

| Criterio | Scoring | Target |
|----------|---------|--------|
| L1. Zero cruces de edges en diagramas ≤5 nodos | 0=cruces visibles, 10=zero cruces | 10 |
| L2. ≤2 cruces en diagramas 6-10 nodos | 0=5+ cruces, 5=3-4, 10=≤2 | ≥8 |
| L3. Nodos del mismo grupo en columnas adyacentes | 0=dispersos 4+ cols, 10=misma o ±1 col | 10 |
| L4. Aspect ratio de grupo ≤3:1 | 0=>5:1, 5=3-5:1, 10=≤3:1 | 10 |
| L5. Nodos no solapan grupos ajenos | 0=solapan, 10=clean | 10 |

### Dimensión 2: Edges (peso 25%)

| Criterio | Scoring | Target |
|----------|---------|--------|
| E1. Edges no cruzan nodos intermedios | 0=cruzan, 10=clean | 10 |
| E2. Edges tienen label de relación visible | 0=no labels, 10=todos legibles | 10 |
| E3. Colores de edges distinguibles sin label | 0=confusión, 10=claros | 8 |
| E4. Feedback edges (der→izq) usan arco limpio | 0=messy, 10=smooth S-curve | 8 |
| E5. Arrowheads visibles al zoom default | 0=invisibles, 10=claros | 10 |

### Dimensión 3: Nodos (peso 20%)

| Criterio | Scoring | Target |
|----------|---------|--------|
| N1. Icono de servicio visible y reconocible | 0=no icon, 10=icon correcto | 10 |
| N2. Label no truncado para nombres ≤18 chars | 0=truncado, 10=completo | 10 |
| N3. Category color diferencia compute vs storage vs db | 0=todos iguales, 10=claros | 10 |
| N4. Drop shadow da profundidad sin ruido | 0=ugly/missing, 10=subtle | 8 |
| N5. Selected state visualmente claro | 0=no diff, 10=obvio | 8 |

### Dimensión 4: Composición general (peso 15%)

| Criterio | Scoring | Target |
|----------|---------|--------|
| C1. Dot-grid background uniforme | 0=glitchy, 10=clean | 10 |
| C2. Padding suficiente alrededor del diagrama | 0=cortado, 10=respirado | 8 |
| C3. Diagrama centrado en viewport | 0=off-center, 10=centered | 8 |
| C4. Leyenda de colores de edges | 0=no existe, 10=visible y correcta | 10 |
| C5. Export PNG/SVG produce salida limpia | 0=roto, 10=pixel-perfect | 10 |

### Dimensión 5: UX interactiva (peso 10%)

| Criterio | Scoring | Target |
|----------|---------|--------|
| U1. Pan funciona en background | pass/fail | pass |
| U2. Zoom no pierde nodos de vista | pass/fail | pass |
| U3. Node drag respeta zoom factor | 0=offset bug, 10=1:1 | 10 |
| U4. Click en nodo abre inspector | 0=nothing, 10=details panel | 10 |
| U5. Escape cierra overlays | pass/fail | pass |

### Scoring global

**Visual Quality Score = (L×0.30 + E×0.25 + N×0.20 + C×0.15 + U×0.10) / 10**

- **≥8.5** = production-ready, comparable a herramientas profesionales
- **7.0-8.4** = usable, con gaps menores
- **5.0-6.9** = funcional pero visualmente inferior a competidores
- **<5.0** = no listo para demo pública

**Score estimado hoy: ~5.8/10** (layout cruces=4, edge labels=0, groups dispersos=3, nodos buenos=8, composición=6)

---

## Roadmap visual: del 5.8 al 8.5+

### Sprint 1: Fundamentos de layout (Score objetivo: 6.5)

**HU-032: Barycenter crossing minimization**
- Implementar Sugiyama Fase 2 en `layout-engine/src/index.ts`
- Después del layer assignment, reordenar nodos por barycenter 6 iteraciones
- Criterio: 0 cruces en Serverless API, ≤1 en IoT Pipeline
- Test: screenshot before/after, Claude evalúa

**HU-033: Group-constrained layout**
- Nodos del mismo VPC en máximo 2 columnas adyacentes
- Subnet children en misma columna
- Aspect ratio grupo ≤3:1
- Test: screenshot VPC+RDS con grupo compacto

### Sprint 2: Claridad de edges (Score objetivo: 7.2)

**HU-035: Edge labels**
- Texto de relación en midpoint del bezier
- Toggle show/hide (default: visible)
- Font 8px, background pill semi-transparente para legibilidad
- Relaciones legibles: "triggers", "writes to", "uses role", "deployed in"

**Leyenda de edges (nuevo)**
- Panel fijo abajo-izquierda con los 8 tipos de relación
- Color swatch + nombre + dash pattern sample
- Visible por default, colapsable

### Sprint 3: Edge routing (Score objetivo: 7.8)

**HU-034: Edge routing inteligente**
- Edges evitan nodos intermedios (bounding box + padding 16px)
- Edges que cruzan grupos pasan por el borde, no por dentro
- Mantener curvas smooth (spline, no segmentos rectos)
- Criterio: IoT Pipeline sin edge cruzando `telemetry_events`

### Sprint 4: Interacción y polish (Score objetivo: 8.5+)

**HU-039: Node inspector sidebar**
- Click en nodo → panel derecho con detalles
- Resource address, type, file:line, body attributes, edges in/out
- Cierre con Escape o click fuera

**Zoom-drag fix**
- Ajustar drag handler para dividir dx/dy por viewport.zoom
- Test: drag con zoom 0.5x mueve nodo proporcionalmente

**Minimap (nuevo, stretch)**
- Thumbnail 120×80 en esquina inferior-derecha
- Muestra viewport rect sobre diagrama completo
- Clickable para navegar

---

## Especificación del sub-agente Visual Reviewer

### Objetivo

Evaluar automáticamente la calidad visual del producto después de cada sesión de desarrollo, generando un reporte scored y accionable.

### Prompt del sub-agente

```
Eres un visual QA reviewer para IaC Board. Tu trabajo es evaluar la calidad
visual de los diagramas de arquitectura generados.

Instrucciones:
1. Ejecuta: cd /home/andres/Github/iac-board && npm run build && npm run test:visual:update
2. Lee los screenshots resultantes:
   - tests/visual/diagram-audit.visual.spec.ts-snapshots/diagram-serverless-api-visual-linux.png
   - tests/visual/diagram-audit.visual.spec.ts-snapshots/diagram-iot-pipeline-visual-linux.png
   - tests/visual/diagram-audit.visual.spec.ts-snapshots/diagram-vpc-rds-visual-linux.png
   - tests/visual/diagram-audit.visual.spec.ts-snapshots/diagram-hero-default-visual-linux.png
3. Evalúa cada screenshot contra esta checklist:
   LAYOUT:
   - ¿Hay cruces de edges? (count)
   - ¿Los nodos del mismo grupo están en columnas adyacentes?
   - ¿El aspect ratio de los grupos es ≤3:1?
   EDGES:
   - ¿Los edges cruzan nodos intermedios?
   - ¿Los edges tienen labels de relación?
   - ¿Los colores de edges son distinguibles?
   NODOS:
   - ¿Los iconos de servicio son visibles y correctos?
   - ¿Los labels están completos (no truncados)?
   - ¿Los colores por categoría son claros?
   COMPOSICION:
   - ¿Hay leyenda de colores?
   - ¿El diagrama tiene padding suficiente?
   - ¿El fondo dot-grid es uniforme?
4. Genera un score 0-10 para cada dimensión (Layout, Edges, Nodos, Composición).
5. Calcula el Visual Quality Score global (L*0.30 + E*0.25 + N*0.20 + C*0.15 + U*0.10).
6. Lista los top 3 problemas visuales más urgentes con screenshot de referencia.
7. Guarda el reporte en /home/andres/Github/iac-board/reports/visual-review-$(date +%Y%m%d-%H%M).md
```

### Formato de reporte

```markdown
# Visual Review — IaC Board — {fecha}

## Visual Quality Score: X.X/10

| Dimensión | Score | Target | Gap |
|-----------|-------|--------|-----|
| Layout | X/10 | 10 | ... |
| Edges | X/10 | 10 | ... |
| Nodos | X/10 | 10 | ... |
| Composición | X/10 | 10 | ... |

## Evaluación por screenshot

### Serverless API
- Cruces: N
- Edge labels: sí/no
- Iconos correctos: N/N
- Issues: ...

### IoT Pipeline
...

### VPC + RDS
...

## Top 3 problemas urgentes
1. ...
2. ...
3. ...

## Recomendaciones para próxima sesión
- ...
```

---

## Especificación de hooks

### Hook 1: Visual Reviewer (Stop, async)

**Archivo:** `.claude/visual-reviewer.sh`

**Trigger:** Stop (sesión termina)

**Comportamiento:**
1. Captura screenshots frescos (`npm run test:visual:update`)
2. Lanza sub-agente Claude que lee los PNGs y evalúa
3. Genera reporte en `reports/visual-review-*.md`
4. Logs en `/tmp/iac-visual-reviewer-*.log`

### Hook 2: Visual Change Reminder (PostToolUse, sync)

**Trigger:** PostToolUse en Edit|Write cuando el archivo está en:
- `packages/visual-engine/src/**`
- `packages/layout-engine/src/**`
- `packages/canvas-engine/src/**`
- `apps/web/src/App.css`

**Comportamiento:**
- Retorna `{"systemMessage": "Visual file changed. After implementation, run: npm run test:visual:update — then read screenshots to verify."}`

### Hook 3: Product Analyst (Stop, async) — YA EXISTE

Sin cambios.

---

## Flujo de trabajo completo para una HU visual

```
1. LEER el plan (este archivo) y la HU específica
2. CREAR branch: feat/hu-NNN-descripcion
3. IMPLEMENTAR el cambio (código)
4. EJECUTAR unit tests: npm test
5. EJECUTAR visual tests: npm run test:visual:update
6. LEER screenshots con tool Read
7. EVALUAR contra la checklist de calidad visual:
   - ¿El cambio mejoró el score en la dimensión target?
   - ¿Introdujo regresiones en otras dimensiones?
   - ¿Los screenshots se ven comparables a draw.io/Lucidchart?
8. Si NO satisfecho → ITERAR desde paso 3
9. Si satisfecho → COMMIT + actualizar scores en este plan
10. Al STOP → hooks generan reportes automáticos
```

### Convención de commits visuales

```
feat(visual): HU-NNN descripción — score L:X E:X N:X C:X = X.X/10
```

Incluir el score en el commit permite tracking de progresión visual en git log.

---

## Criterios de aceptación globales

## Estado de implementación (2026-05-17)

| HU | Feature | Estado | Score impacto |
|----|---------|--------|--------------|
| HU-032 | Barycenter crossing minimization | ✅ DONE | L: 4→8 |
| HU-033 | Containment edge reversal (VPC izquierda) | ✅ DONE | L: 8→9, G: 3→9 |
| HU-035 | Edge labels en bezier midpoints | ✅ DONE | E: 0→8 |
| Leyenda | Panel RELATIONS debajo del canvas | ✅ DONE | C: 0→8 |
| HU-039 | Node inspector sidebar | ✅ DONE | U: 0→7 |
| Drag fix | Zoom-aware drag (÷ zoom×scale) | ✅ DONE | U: +1 |
| HU-034 | Edge routing (skip-layer avoidance) | 🔲 TODO | E: 8→9 |
| Coverage | Tests para cloud-board, viewport, inspector | 🔲 TODO | CI pass |
| Feedback edges | S-curves debajo del VPC se ven messy | 🔲 TODO | E: +0.5 |
| HU-036 | 20 AWS resource types + icons | 🔲 TODO | N: 8→9 |
| Export test | Visual test del PNG export | 🔲 TODO | C: +0.5 |
| Minimap | Thumbnail 120×80 en esquina inferior-derecha | 🔲 TODO | U: 7→9 |
| README | Screenshots de calidad + demo GIF | 🔲 TODO | producto |

**Score actual: ~7.5/10** → **Target: 10/10**

---

## Plan hacia 10/10

### Bloque A: CI verde (bloqueante)
- Arreglar coverage branches (64% → ≥70%) y statements/lines (≥80%)
- Tests para: cloud-board drag, useViewport, NodeInspector, edge-renderer EdgeLabel branches

### Bloque B: Edge polish (E: 8→10)
- HU-034 simplificado: para edges que saltan columnas intermedias, detectar si la bezier cruza un nodo y añadir vertical offset de ±(PADDING=24px) sobre/bajo el obstáculo
- Ocultar edges `deployed-in` del canvas (ya no aportan info visual — la posición del VPC lo dice todo)
- Mejorar S-curves de feedback: usar arco más pequeño y discreto (no que baje tanto)

### Bloque C: Completitud de contenido (N: 8→10)
- HU-036: Agregar 20 tipos de recursos AWS con iconos (ECS, EKS, SQS, SNS, CloudFront, Route53, ElasticSearch, etc.)
- Mostrar resource count en el node card cuando hay múltiples instancias del mismo tipo

### Bloque D: Interacción avanzada (U: 7→10)
- Minimap: `<rect>` thumbnail en esquina inferior-derecha del SVG mostrando viewport position
- Keyboard nav: flechas para moverse entre nodos seleccionados
- Click en fondo → deselecciona nodo (actualmente solo ✕ y Escape)

### Bloque E: Calidad de exportación (C: 8→10)
- Asegurar que el CSS (fuentes, colores) se serializa en el SVG export para que el PNG sea pixel-perfect
- Test visual del export: renderizar y comparar contra baseline

---

## Criterios de aceptación para 10/10

- [x] HU-032 Barycenter: 0 crossings en ≤5 nodos
- [x] HU-033 Contenedor izquierda: VPC en col 0, aspect ratio ≤3:1
- [x] HU-035 Edge labels: todas las relaciones legibles
- [x] Leyenda: 8 tipos con color + dash
- [x] HU-039 Inspector: click → panel con type/source/edges
- [x] Drag fix: 1:1 a cualquier zoom
- [ ] CI verde: coverage branches ≥70%, statements/lines ≥80%
- [ ] HU-034 edge routing: ningún edge cruza nodo intermedio
- [ ] deployed-in edges ocultos (posición comunica contención)
- [ ] HU-036: ≥20 tipos AWS iconizados
- [ ] Minimap funcional
- [ ] Export PNG: texto legible, iconos correctos
- [ ] Visual Quality Score ≥ 9.5/10 evaluado por sub-agente
