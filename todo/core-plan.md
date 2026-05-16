# IaC Board — Core Plan (revisado)

## Lo que existe en el ecosistema y qué nos diferencia

### Herramientas existentes y sus limitaciones

| Herramienta | Enfoque | Problema |
|---|---|---|
| **Rover** | Visualiza plan JSON de Terraform | Requiere `terraform plan` ejecutado, credenciales cloud, Go instalado |
| **Inkdrop** | Diagrama interactivo desde plan file | Requiere plan file pre-generado, CLI, no 100% browser |
| **Terravision** | Diagramas profesionales AWS/GCP/Azure | Python, requiere `terraform plan` o credenciales |
| **Inframap** | Grafo desde tfstate o HCL | Go binary, no browser, muestra solo recursos "importantes" |
| **Blast Radius** | Grafo de dependencias con d3.js | Abandonado, no compatible con Terraform 1.x |

### Nuestra diferenciación real

1. **100% browser** — zero instalación, zero credenciales, zero servidor
2. **Análisis estático** — parsea `.tf` directamente sin ejecutar Terraform
3. **Diagrama editable** — mover nodos, anotar, exportar
4. **Multi-cloud en una vista** — AWS + GCP + Azure simultáneamente
5. **Persistencia** — guardar layout en `.iac-board.json`, regenerar sin perder posiciones
6. **Open source** — contribuible, embeddable, CI-friendly

---

## Hallazgos de investigación — cambios al plan

### Parser: usar `@cdktf/hcl2json` (WASM, oficial HashiCorp)

En lugar de escribir nuestro propio parser HCL, podemos usar el parser oficial
de HashiCorp compilado a WASM. Funciona en el browser.

- Paquete: `@cdktf/hcl2json` (npm, ~1.8MB, Apache 2.0)
- API: `parse(filename, content) → JSON` (async, convierte HCL a JSON estructurado)
- Resultado: objeto JSON con toda la estructura del `.tf` parseada correctamente
- Maneja: bloques anidados, variables, locals, interpolaciones, módulos, data sources

Esto reemplaza nuestro parser regex por completo y es la base correcta.
Después del parse JSON, nosotros construimos el `CloudGraph` — eso sigue siendo nuestro código.

### Layout: usar `dagre` (directed graph layout)

En lugar de escribir nuestro propio algoritmo de layout:

- Paquete: `dagre` (npm, client-side, rendering-agnóstico, 2.8k downloads/semana)
- API: `dagre.layout(graph)` — recibe nodos con dimensiones y edges, devuelve coordenadas x/y
- Layout: jerarquía dirigida (izquierda → derecha siguiendo data flow)
- Alternativa más potente: `elkjs` (842k downloads/semana, más configurable)

Nuestro layout-engine se convierte en un adaptador que:
1. Traduce `CloudGraph` → formato dagre
2. Llama `dagre.layout()`
3. Traduce resultado → `PositionedCloudGraph`

### Input adicional: Terraform Plan JSON (modo enriquecido)

Todos los tools existentes usan `terraform show -json plan.tfplan` como input.
Este JSON contiene relaciones explícitas (`depends_on`), valores computados,
y la jerarquía de módulos ya resuelta.

Podemos soportar ambos modos:
- **Modo estático** (default): solo archivos `.tf` → análisis estático
- **Modo enriquecido** (opcional): acepta `plan.json` → relaciones exactas de Terraform

El modo enriquecido no requiere credenciales (el usuario genera el plan,
nosotros solo lo visualizamos). Esto nos pone al nivel de Rover/Inkdrop
para quienes tienen Terraform instalado.

---

## Fases revisadas

### Fase A — Parser propio ✅ COMPLETADA

Construimos parser HCL recursive-descent propio (sin WASM externo).

Tareas completadas:
- [x] Lexer character-by-character (237 líneas) — tokens, strings, heredocs, comments
- [x] Parser recursive descent (344 líneas) — blocks, attributes, expressions, tolerant
- [x] AST types (93 líneas) — HclFile, HclBlock, HclAttribute, HclExpr
- [x] Extractor (193 líneas) — 2-pass: variable/locals resolution → resource extraction
- [x] Reference extraction (90 líneas) — provider-prefix regex, body/string/expr scanning
- [x] Wiring en index.ts — tokenize → parseHclFile → extractFromFile pipeline
- [x] TerraformResource.refs field — refs parsed, no más regex sobre body
- [x] 14 tests unitarios cubriendo nested blocks, variables, locals, data sources, modules, heredocs
- [x] Todos los tests pasando (40/40)

### Fase B — Layout topológico ✅ COMPLETADA (base)

Reemplazamos grid de 4 columnas con longest-path layering.

Tareas completadas:
- [x] Longest-path DP para asignar capas por dependencia
- [x] Cycle detection con guard (layer=0 para ciclos)
- [x] Category sort dentro de cada capa
- [x] Centrado vertical de columnas
- [x] Group bounds post-computation
- [x] 4 tests: single node, unconnected sort, dependency placement, group bounds

Tareas pendientes (ver HU-032, HU-033):
- [ ] Barycenter crossing minimization (Sugiyama fase 2)
- [ ] Group-constrained placement (nodos del mismo grupo en columnas adyacentes)

### Fase B.2 — Diagram Quality Plan (NUEVO — ver todo/diagram-quality-plan.md)

11 HUs detalladas (HU-032 a HU-042) para llevar la calidad visual al nivel
de herramientas profesionales. Incluye:
- Minimización de cruces (HU-032)
- Layout consciente de grupos (HU-033)
- Edge routing inteligente (HU-034)
- Edge labels (HU-035)
- 20 tipos AWS nuevos (HU-036)
- Export PNG/SVG (HU-037)
- Import .tf (HU-038)
- Node inspector (HU-039)
- Módulos locales (HU-040)
- Performance benchmark (HU-041)
- Visual regression expandido (HU-042)

### Fase C — File import en el browser (HU-001, HU-038)

Tareas:
- [ ] Drag & drop de archivos `.tf` sobre la app
- [ ] File picker multi-select (`.tf` y `.tfvars`)
- [ ] Text area para pegar HCL directamente
- [ ] Vista de "archivos cargados" con conteo de recursos
- [ ] Botón "generate diagram" que lanza el pipeline

### Fase D — Modo plan JSON (input enriquecido)

Tareas:
- [ ] Aceptar `plan.json` (output de `terraform show -json`) como input alternativo
- [ ] Parser para `plan.json` → `CloudGraph` con relaciones exactas
- [ ] Mostrar en UI que el diagrama viene de plan (más preciso que análisis estático)
- [ ] Documentar cómo generar `plan.json` sin credenciales (`-refresh=false`)

### Fase E — Visual polish + Export (HU-016)

Tareas:
- [ ] Corregir drag ajustado por zoom (multiplicar dx/dy por 1/viewport.zoom)
- [ ] Reemplazar `foreignObject` por `<image href="data:...">` para iconos (mejor compatibilidad)
- [ ] Export PNG usando `canvas` + `drawImage` del SVG serializado
- [ ] Export SVG limpio (remover aria-hidden, añadir viewBox correcto)
- [ ] Arrowheads con estilo AWS (filled triangle)

### Fase F — Más recursos y providers

AWS adicionales (por frecuencia de uso):
- [ ] `aws_ecs_cluster`, `aws_ecs_service`, `aws_ecs_task_definition` (containers)
- [ ] `aws_eks_cluster` (Kubernetes)
- [ ] `aws_lb`, `aws_lb_listener`, `aws_lb_target_group` (load balancers)
- [ ] `aws_cloudfront_distribution` (CDN)
- [ ] `aws_cognito_user_pool` (auth)
- [ ] `aws_sfn_state_machine` (orchestration)
- [ ] `aws_elasticache_cluster` (cache)
- [ ] `aws_sqs_queue` event sources para Lambda (relaciones explícitas)

GCP y Azure: expandir a medida que hay demanda.

### Fase G — Módulos Terraform (HU-025)

- [ ] Expandir módulos locales inline en el grafo
- [ ] Prefijo de módulo en direcciones (`module.vpc.aws_vpc.main`)
- [ ] Módulos como grupos visuales en el diagrama
- [ ] Módulos remotos: diagnóstico "módulo remoto no expandido"

### Fase H — Node inspector + Save (HU-009 completo, HU-013)

- [ ] Click en nodo → panel lateral: atributos parseados, source file:line, relaciones
- [ ] Guardar `.iac-board.json` (graph + layout + overrides)
- [ ] Reabrir documento y restaurar posiciones
- [ ] Regenerar sin perder posiciones manuales

---

## Stack técnico final

```
Input
├── .tf files (static) ─→ @cdktf/hcl2json (WASM) ─→ TerraformParseResult
└── plan.json (enriched) ─→ plan-parser ─────────────→ TerraformParseResult

Pipeline
TerraformParseResult ─→ cloud-graph ─→ CloudGraph ─→ layout-engine (dagre) ─→ PositionedCloudGraph
                                                                              ↓
                                                                    canvas-engine ─→ CanvasElementDraft[]
                                                                              ↓
                                                                    visual-engine ─→ CloudBoard (SVG)

Output
├── Interactive SVG diagram (pan, zoom, drag)
├── Export PNG / SVG
├── Export Markdown report
└── Save .iac-board.json
```

---

## Métricas de éxito

- Parsear un módulo Terraform real de 5-10 archivos sin crash
- El diagrama muestra las relaciones en el orden correcto (izquierda = entrada, derecha = salida)
- Un engineer carga `.tf`, ve el diagrama y entiende su infra en < 30 segundos
- Export PNG usable en un README
- Diferencia clara vs Rover/Inkdrop: cero instalación, cero credenciales, 100% browser
