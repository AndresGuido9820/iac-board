# Plan: Diagram Generation Quality — HU-031 a HU-042

## Diagnóstico (auditoría visual + código, 2026-05-16)

### Estado actual del pipeline

```
.tf files → lexer (237L) → parser (344L) → extractor (193L) → TerraformParseResult
  → cloud-graph (229L) → CloudGraph {nodes, edges, groups}
    → layout-engine (144L) → PositionedCloudGraph
      → canvas-engine (46L) → CanvasElementDraft[]
        → visual-engine (550L) → CloudBoard (SVG interactivo)
```

**Total: 2,389 líneas de código fuente, 807 líneas de test.**

### Fortalezas confirmadas

- Parser HCL tolerante con recuperación de errores (no crash en syntax inválida)
- Agrupación inteligente VPC/subnet por clausura transitiva
- Inferencia semántica de edges (triggers, writes-to, uses-role, deployed-in, secured-by)
- Canvas interactivo con pan/zoom/drag y fondo dot-grid
- 19 iconos SVG reales de AWS (tf2d2/icons, Apache 2.0)
- S-curves bezier diferenciadas por color y dash según relación
- i18n inglés/español

### Brechas críticas encontradas (ordenadas por impacto en calidad visual)

| # | Brecha | Impacto | Paquete afectado |
|---|--------|---------|------------------|
| 1 | **Sin minimización de cruces** — edges cruzan nodos y grupos | Alto | layout-engine |
| 2 | **Grupos no afectan layout** — nodos de un VPC se dispersan en 4+ columnas | Alto | layout-engine |
| 3 | **Sin edge labels** — solo color/dash distingue semántica | Medio | visual-engine |
| 4 | **Sin edge routing alrededor de grupos** — edges pasan por encima | Medio | visual-engine |
| 5 | **Sin tests unitarios de visual-engine** — solo visual regression | Medio | visual-engine |
| 6 | **Solo 28 tipos AWS soportados** — ECS, EKS, ALB, CloudFront, Cognito, StepFunctions, ElastiCache faltan | Medio | cloud-graph |
| 7 | **Sin expansión de módulos** — módulos locales no se resuelven | Alto | terraform-parser |
| 8 | **Sin export PNG/SVG** — diagrama no sale del browser | Alto | visual-engine, web |
| 9 | **Sin file import** — solo ejemplos bundled | Alto | web |
| 10 | **Sin node inspector** — click en nodo no muestra detalles | Medio | visual-engine, web |
| 11 | **Drag no ajustado por zoom** — al zoom 0.5, drag se desplaza el doble | Bajo | visual-engine |
| 12 | **Sin responsive/mobile** — NODE_W/NODE_H fijos, sin touch | Bajo | layout-engine, visual-engine |

---

## Competidores y referencias

| Herramienta | Qué hace bien | Qué no hace |
|-------------|---------------|-------------|
| **Rover** | Layout jerárquico correcto (usa graphviz), plan JSON | Requiere terraform plan, no es browser |
| **Cloudcraft** | Iconos profesionales, 3D isométrico, drag & drop | SaaS propietario, requiere credenciales |
| **Lucidchart AWS** | Templates, edge routing perfecto, export | No parsea Terraform, manual |
| **draw.io** | Edge routing con waypoints, export PNG/SVG/PDF | No parsea Terraform, manual |
| **Brainboard** | Terraform↔diagrama bidireccional | SaaS, no open-source |
| **Inframap** | Extrae solo recursos "importantes" | Go CLI, no browser, abandonado |

### Nuestra ventaja competitiva

1. **100% browser, zero instalación, zero credenciales**
2. **Parser propio — no depende de WASM externo ni de `terraform plan`**
3. **Open source, embeddable, CI-friendly**
4. **Diagramas editables + persistibles**

### Para ser los mejores necesitamos

- Layout comparable a Graphviz/dagre (minimización de cruces + agrupamiento)
- Edge routing comparable a draw.io (evitar grupos, curvas inteligentes)
- Export comparable a Lucidchart (PNG, SVG, PDF)
- Coverage de recursos comparable a Cloudcraft (~50+ tipos AWS)
- Experiencia de import comparable a Brainboard (drag & drop .tf)

---

## Testing Harness para desarrollo con IA

### Principio

Cada HU incluye **tests de aceptación automatizados** que Claude puede ejecutar
para verificar que la implementación cumple los criterios. Esto permite un loop
de desarrollo asistido por IA:

```
1. Claude lee la HU y sus acceptance criteria
2. Claude implementa el cambio
3. Claude ejecuta `npm test` (unit + integration)
4. Claude ejecuta `npx playwright test --project=visual` (visual regression)
5. Claude lee los screenshots y evalúa calidad visual
6. Si falla → Claude corrige y repite desde paso 2
7. Si pasa → marca TODO como completado
```

### Estructura de tests por capa

```
packages/*/test/          → unit tests (vitest, fast, deterministic)
tests/integration/        → pipeline end-to-end tests (vitest)
tests/visual/             → visual regression screenshots (playwright)
tests/e2e/                → functional browser tests (playwright)
tests/benchmark/          → performance benchmarks (NEW — vitest bench)
```

### Visual audit test (ya existe)

```typescript
// tests/visual/diagram-audit.visual.spec.ts
// Captura screenshots de cada ejemplo → Claude los lee y evalúa
// Sirve como "acceptance criteria visual" para cualquier HU de layout/render
```

---

## Historias de Usuario — Diagrama Quality

### Convenciones

- Cada HU tiene: objetivo, contexto, criterios de aceptación, tests requeridos,
  archivos afectados, y dependencias.
- Los tests son ejecutables por IA (npm test / playwright).
- Las HUs están ordenadas por impacto × esfuerzo (primero las de mayor ROI).

---

### HU-032: Minimización de cruces de edges (Sugiyama Phase 2)

**Como** cloud engineer, **quiero** que las flechas del diagrama no crucen
innecesariamente nodos ni otras flechas, **para** leer el flujo de datos sin
confusión visual.

**Contexto:**
El layout actual asigna capas (Sugiyama fase 1: longest-path layering) pero NO
hace fase 2 (barycenter ordering). Resultado: dentro de cada columna, los nodos
están ordenados por categoría alfabética, no por posición óptima para minimizar
cruces.

**Criterios de aceptación:**

- [ ] Para el ejemplo Serverless API (4 nodos, 3 edges): 0 cruces de edges
- [ ] Para el ejemplo IoT Pipeline (7 nodos, 6 edges): ≤ 1 cruce
- [ ] Para el ejemplo VPC+RDS (8 nodos, 8 edges): ≤ 3 cruces
- [ ] El algoritmo es determinista (misma entrada → mismo layout)
- [ ] Benchmark: layout de 50 nodos + 60 edges en < 50ms

**Tests requeridos:**

```
packages/layout-engine/test/crossing-minimization.test.ts
  - "zero crossings for linear chain A→B→C→D"
  - "minimizes crossings for bipartite graph"
  - "deterministic output for same input"
  - "handles disconnected components"

tests/visual/diagram-audit.visual.spec.ts
  - Screenshots actualizados y evaluados visualmente
```

**Archivos afectados:**
- `packages/layout-engine/src/index.ts` — agregar barycenter ordering después de layer assignment

**Dependencias:** ninguna

**Implementación sugerida:**
1. Después de asignar capas (computeLayers), agrupar nodos por capa
2. Para cada par de capas adyacentes, aplicar barycenter heuristic:
   - Posición de cada nodo = promedio de posiciones de vecinos en capa adyacente
   - Reordenar nodos en la capa según este promedio
   - Repetir 4-8 iteraciones (convergencia rápida)
3. Asignar coordenadas y finales según el nuevo orden

---

### HU-033: Layout consciente de grupos (group-constrained placement)

**Como** cloud engineer que trabaja con VPCs, **quiero** que los nodos dentro de
un mismo VPC/subnet estén visualmente agrupados en columnas adyacentes, **para**
que la topología de red sea obvia a primera vista.

**Contexto:**
Actualmente los nodos de un VPC pueden terminar dispersos en 4+ columnas porque
el layout ignora la membresía de grupo. El grupo rect simplemente envuelve a
todos sus hijos, resultando en un rectángulo muy ancho.

**Criterios de aceptación:**

- [ ] Nodos dentro del mismo VPC group ocupan máximo 2 columnas adyacentes
- [ ] Nodos dentro del mismo subnet group están en la misma columna
- [ ] El VPC group rect tiene aspect ratio ≤ 3:1 (ancho:alto)
- [ ] Screenshot de VPC+RDS muestra topología de red legible
- [ ] No regresiones en Serverless API ni IoT Pipeline (sin grupos)

**Tests requeridos:**

```
packages/layout-engine/test/group-layout.test.ts
  - "vpc children span at most 2 columns"
  - "subnet children share same column"
  - "group aspect ratio does not exceed 3:1"
  - "non-grouped nodes unaffected"

tests/visual/diagram-audit.visual.spec.ts
  - VPC+RDS screenshot evaluado por calidad visual
```

**Archivos afectados:**
- `packages/layout-engine/src/index.ts` — post-procesar layout para colapsar nodos de grupo

**Dependencias:** HU-032 (crossing minimization, para que el reordenamiento no rompa)

**Implementación sugerida:**
1. Después del layout base, identificar nodos que pertenecen a cada grupo
2. Para cada grupo: encontrar la capa más frecuente de sus hijos
3. Mover hijos de capas lejanas a la capa más cercana del grupo (±1)
4. Recalcular posiciones y para la nueva distribución
5. Recalcular group bounds

---

### HU-034: Edge routing inteligente (evitar nodos y grupos)

**Como** cloud engineer, **quiero** que las flechas del diagrama rodeen los nodos
y los grupos en vez de pasar por encima, **para** que el diagrama sea legible
incluso con muchas conexiones.

**Contexto:**
Las edges actuales son bezier directas de centro-derecho a centro-izquierdo. No
consideran obstáculos. En el diagrama VPC+RDS, las edges pasan por encima de los
grupos dashed.

**Criterios de aceptación:**

- [ ] Ningún edge pasa por el interior de un nodo que no es su origen ni destino
- [ ] Edges que cruzan un grupo pasan por el borde del grupo (no por el interior)
- [ ] Edges feedback (derecha→izquierda) pasan por arriba o abajo, no por en medio
- [ ] El routing funciona con ≤ 20 nodos sin degradación visual
- [ ] Bezier curves siguen siendo smooth (no segmentos rectos bruscos)

**Tests requeridos:**

```
packages/visual-engine/test/edge-routing.test.ts
  - "edge avoids intermediate node rect"
  - "edge routes around group boundary"
  - "feedback edge goes above or below"
  - "no edge segment intersects non-endpoint node"

tests/visual/diagram-audit.visual.spec.ts
  - VPC+RDS sin edges pasando por encima de grupos
```

**Archivos afectados:**
- `packages/visual-engine/src/edge-renderer.tsx` — routing algorithm
- Posible nuevo archivo: `packages/visual-engine/src/edge-router.ts`

**Dependencias:** HU-033 (group layout, para tener bounds correctos)

---

### HU-035: Edge labels con relación semántica

**Como** cloud engineer, **quiero** ver qué tipo de relación representa cada
flecha (triggers, writes-to, deployed-in, etc.), **para** entender la semántica
sin tener que adivinar por el color.

**Contexto:**
Actualmente el único indicador de relación es el color/dash del edge. No hay
texto visible. En diagramas profesionales (Lucidchart, draw.io), los edges
tienen labels en el punto medio.

**Criterios de aceptación:**

- [ ] Cada edge muestra su `relation` como label en el punto medio del bezier
- [ ] Label es legible (≥ 8px, contraste suficiente)
- [ ] Label no se superpone con nodos
- [ ] Labels se pueden ocultar con un toggle en la UI (default: visible)
- [ ] Labels usan nombres legibles: "triggers" → "triggers", "writes-to" → "writes to", "deployed-in" → "deployed in"

**Tests requeridos:**

```
packages/visual-engine/test/edge-labels.test.ts
  - "renders relation text at bezier midpoint"
  - "label does not overlap source or target node"
  - "label is hidden when showEdgeLabels=false"

apps/web/src/App.test.tsx
  - "toggle edge labels visibility"
```

**Archivos afectados:**
- `packages/visual-engine/src/edge-renderer.tsx` — render label at midpoint
- `packages/visual-engine/src/cloud-board.tsx` — pass showLabels prop
- `apps/web/src/App.tsx` — toggle control

**Dependencias:** ninguna

---

### HU-036: Ampliación de tipos de recursos AWS (Fase 1: 20 tipos nuevos)

**Como** cloud engineer, **quiero** que ECS, EKS, ALB, CloudFront, Cognito,
Step Functions, ElastiCache, y otros servicios comunes aparezcan con icono y
categoría correctos, **para** que mis diagramas reales no tengan cajitas grises
de "unknown".

**Contexto:**
Solo 28 tipos AWS están en `awsCategories`. Los servicios más usados en
producción real (ECS, EKS, ALB, CloudFront) no están soportados. Cada tipo
necesita: categoría en cloud-graph, icono SVG en visual-engine, y un test.

**Criterios de aceptación:**

- [ ] 20 nuevos tipos soportados (ver lista abajo)
- [ ] Cada tipo tiene categoría correcta en `awsCategories`
- [ ] Cada tipo tiene icono SVG real (de tf2d2/icons u otra fuente Apache 2.0)
- [ ] Si el icono no está disponible, usa fallback de categoría (sin crash)
- [ ] Un nuevo ejemplo bundled usa al menos 5 de los nuevos tipos
- [ ] 0 diagnósticos GRAPH001 para los nuevos tipos

**Tipos a agregar:**

| Tipo | Categoría | Prioridad |
|------|-----------|-----------|
| aws_ecs_cluster | compute | Alta |
| aws_ecs_service | compute | Alta |
| aws_ecs_task_definition | compute | Alta |
| aws_eks_cluster | compute | Alta |
| aws_lb | network | Alta |
| aws_lb_listener | network | Alta |
| aws_lb_target_group | network | Alta |
| aws_cloudfront_distribution | network | Alta |
| aws_route53_zone | network | Media |
| aws_route53_record | network | Media |
| aws_cognito_user_pool | security | Media |
| aws_sfn_state_machine | integration | Media |
| aws_elasticache_cluster | database | Media |
| aws_elasticsearch_domain | database | Media |
| aws_cloudwatch_log_group | integration | Media |
| aws_cloudwatch_metric_alarm | integration | Media |
| aws_secretsmanager_secret | security | Media |
| aws_ssm_parameter | security | Baja |
| aws_ecr_repository | storage | Baja |
| aws_kms_key | security | Baja |

**Tests requeridos:**

```
packages/cloud-graph/test/aws-resource-coverage.test.ts
  - "all 48 supported types map to valid category"
  - "no GRAPH001 diagnostic for any supported type"
  - "unsupported type still generates node with 'unknown' category"

packages/visual-engine/test/icon-coverage.test.ts
  - "every supported type has icon or category fallback"
  - "getIcon returns string for registered types"
```

**Archivos afectados:**
- `packages/cloud-graph/src/index.ts` — awsCategories map
- `packages/visual-engine/src/icons/registry.ts` — icon SVG strings
- `packages/visual-engine/src/icons/aws/*.svg` — nuevos iconos
- `packages/example-catalog/src/index.ts` — nuevo ejemplo

**Dependencias:** ninguna

---

### HU-037: Export PNG y SVG del diagrama

**Como** cloud engineer, **quiero** descargar el diagrama como imagen PNG o SVG,
**para** incluirlo en documentación, PRs, y presentaciones.

**Criterios de aceptación:**

- [ ] Botón "Export PNG" en la UI descarga un archivo .png del diagrama visible
- [ ] Botón "Export SVG" descarga un archivo .svg limpio (sin scripts, sin aria-hidden)
- [ ] El PNG incluye todos los elementos visibles (nodos, edges, grupos, labels)
- [ ] La resolución del PNG es 2x (para pantallas retina)
- [ ] El SVG tiene viewBox correcto y es editable en Figma/Illustrator
- [ ] El nombre del archivo incluye el nombre del ejemplo: `aws-serverless-api.png`

**Tests requeridos:**

```
tests/e2e/export.spec.ts
  - "downloads PNG file on Export PNG click"
  - "downloads SVG file on Export SVG click"
  - "PNG file is valid image with correct dimensions"
  - "SVG file is valid XML with viewBox attribute"
```

**Archivos afectados:**
- `packages/visual-engine/src/cloud-board.tsx` — expose SVG ref
- `apps/web/src/App.tsx` — export buttons y handlers
- `apps/web/src/export.ts` — NEW: SVG→PNG conversion via canvas, SVG cleanup

**Dependencias:** ninguna

---

### HU-038: Import de archivos .tf (drag & drop + file picker)

**Como** cloud engineer, **quiero** arrastrar mis archivos .tf al browser para
generar un diagrama de MI infraestructura, **para** no depender de ejemplos
bundled.

**Criterios de aceptación:**

- [ ] Zona de drag & drop acepta archivos .tf y carpetas
- [ ] File picker permite seleccionar múltiples archivos .tf
- [ ] Text area permite pegar HCL directamente
- [ ] Los archivos NO se envían a ningún servidor (verificable en Network tab)
- [ ] Después de importar, el diagrama se genera automáticamente
- [ ] Se muestra conteo de archivos y recursos encontrados antes de generar
- [ ] Archivos no-.tf se ignoran con diagnóstico, no error

**Tests requeridos:**

```
tests/e2e/import.spec.ts
  - "generates diagram from dropped .tf file"
  - "generates diagram from pasted HCL text"
  - "ignores non-.tf files with diagnostic"
  - "shows file count before generation"
  - "no network requests made during import" (intercept check)

apps/web/src/App.test.tsx
  - "renders import zone when no example selected"
  - "switches to custom diagram mode after import"
```

**Archivos afectados:**
- `apps/web/src/App.tsx` — import zone, mode switching
- `apps/web/src/import-zone.tsx` — NEW: drag & drop + file picker + text area
- `apps/web/src/App.css` — import zone styles

**Dependencias:** ninguna

---

### HU-039: Node inspector (click para ver detalles)

**Como** cloud engineer, **quiero** hacer click en un nodo para ver sus detalles
(tipo, atributos parseados, source file:line, relaciones), **para** entender
cada recurso sin salir del diagrama.

**Criterios de aceptación:**

- [ ] Click en nodo abre panel lateral con detalles
- [ ] Panel muestra: resource address, type, name, file:line
- [ ] Panel muestra: atributos parseados del body (key=value)
- [ ] Panel muestra: edges entrantes y salientes con su relación
- [ ] Panel se cierra al clickear fuera o presionar Escape
- [ ] Panel no bloquea interacción con el canvas (sidebar, no modal)

**Tests requeridos:**

```
apps/web/src/App.test.tsx
  - "opens inspector on node click"
  - "shows resource address and source location"
  - "shows incoming and outgoing edges"
  - "closes inspector on Escape key"
  - "closes inspector on outside click"
```

**Archivos afectados:**
- `packages/visual-engine/src/cloud-board.tsx` — onNodeClick callback
- `apps/web/src/App.tsx` — inspector panel state + render
- `apps/web/src/node-inspector.tsx` — NEW: inspector panel component
- `apps/web/src/App.css` — inspector styles

**Dependencias:** ninguna

---

### HU-040: Expansión de módulos Terraform locales

**Como** platform engineer con repos reales, **quiero** que IaC Board expanda
módulos locales (source = "./modules/vpc"), **para** que mi diagrama incluya
todos los recursos, no solo los del root module.

**Criterios de aceptación:**

- [ ] `module "x" { source = "./path" }` expande recursivamente los .tf del path
- [ ] Recursos expandidos tienen address prefijado: `module.x.aws_vpc.main`
- [ ] Variables del módulo se resuelven desde los argumentos del module block
- [ ] Módulos anidados (módulo dentro de módulo) se expanden hasta 3 niveles
- [ ] Módulos remotos siguen generando TF004 diagnostic (no se expanden)
- [ ] Módulo con path inexistente genera TF005 diagnostic, no crash
- [ ] Un ejemplo bundled demuestra expansión de módulo local

**Tests requeridos:**

```
packages/terraform-parser/test/module-expansion.test.ts
  - "expands local module source into parent result"
  - "prefixes resource addresses with module path"
  - "resolves module input variables from arguments"
  - "handles nested modules up to 3 levels"
  - "missing module path generates TF005 diagnostic"
  - "remote module source is not expanded"
  - "circular module reference detected with diagnostic"
```

**Archivos afectados:**
- `packages/terraform-parser/src/extractor.ts` — module expansion logic
- `packages/terraform-parser/src/index.ts` — pass file resolver to extractor
- `packages/example-catalog/src/index.ts` — nuevo ejemplo con módulos

**Dependencias:** ninguna (pero beneficia enormemente a HU-038 file import)

---

### HU-041: Performance benchmark y budget

**Como** desarrollador del proyecto, **quiero** benchmarks automatizados que
midan el tiempo de cada fase del pipeline, **para** detectar regresiones de
performance antes de deploy.

**Criterios de aceptación:**

- [ ] Benchmark: parsear 20 archivos .tf (500 recursos) en < 200ms
- [ ] Benchmark: buildCloudGraph de 500 recursos en < 50ms
- [ ] Benchmark: layoutCloudGraph de 200 nodos + 300 edges en < 100ms
- [ ] Benchmark: render completo (parse → canvas) de 500 recursos en < 500ms
- [ ] Los benchmarks corren en CI y fallan si exceden el budget 2x
- [ ] Resultados se imprimen en stdout para tracking

**Tests requeridos:**

```
tests/benchmark/pipeline-bench.test.ts
  - "parse 500 resources under 200ms"
  - "graph build under 50ms"
  - "layout under 100ms"
  - "full pipeline under 500ms"
```

**Archivos afectados:**
- `tests/benchmark/pipeline-bench.test.ts` — NEW
- `tests/benchmark/fixtures/large-infra.tf` — NEW: 500 recursos generados
- `package.json` — script `test:bench`

**Dependencias:** ninguna

---

### HU-042: Visual regression harness expandido

**Como** desarrollador asistido por IA, **quiero** screenshots automatizados de
cada ejemplo en múltiples estados (default, zoomed, after drag, dark mode),
**para** que Claude pueda evaluar calidad visual en cada iteración.

**Criterios de aceptación:**

- [ ] Screenshot de cada ejemplo en vista default (ya existe)
- [ ] Screenshot de cada ejemplo con zoom 150%
- [ ] Screenshot del diagrama más grande (VPC+RDS) con un nodo dragged
- [ ] Screenshot de un diagrama con 15+ nodos (nuevo ejemplo grande)
- [ ] Todos los screenshots almacenados como baselines en el repo
- [ ] `npx playwright test --project=visual` ejecuta todos y compara
- [ ] Claude puede leer los screenshots con la tool Read y evaluar calidad

**Tests requeridos:**

```
tests/visual/diagram-audit.visual.spec.ts (expandir existente)
  - "diagram: serverless-api" ✓ (ya existe)
  - "diagram: iot-pipeline" ✓ (ya existe)
  - "diagram: vpc-rds" ✓ (ya existe)
  - "diagram: hero-default" ✓ (ya existe)
  - "diagram: serverless-api zoomed 150%"
  - "diagram: vpc-rds after node drag"
  - "diagram: large infrastructure (15+ nodes)"
```

**Archivos afectados:**
- `tests/visual/diagram-audit.visual.spec.ts` — agregar tests
- `packages/example-catalog/src/index.ts` — ejemplo grande (ECS + ALB + RDS + VPC)

**Dependencias:** HU-036 (nuevos tipos para el ejemplo grande)

---

## Orden de ejecución recomendado

```
Fase 1 — Foundation (sin dependencias entre sí, paralelizable)
├── HU-041: Performance benchmark (establece baseline)
├── HU-036: 20 tipos AWS nuevos (amplía cobertura)
└── HU-035: Edge labels (mejora visual rápida)

Fase 2 — Layout Quality (secuencial)
├── HU-032: Minimización de cruces (Sugiyama fase 2)
├── HU-033: Layout consciente de grupos (post-process)
└── HU-034: Edge routing inteligente

Fase 3 — User-Facing Features (paralelizable)
├── HU-037: Export PNG/SVG
├── HU-038: Import .tf files
└── HU-039: Node inspector

Fase 4 — Advanced
├── HU-040: Módulos locales
└── HU-042: Visual regression expandido
```

### Estimación de líneas de código nuevas

| HU | Código nuevo | Tests nuevos |
|----|-------------|-------------|
| HU-032 | ~80 líneas | ~60 líneas |
| HU-033 | ~60 líneas | ~50 líneas |
| HU-034 | ~120 líneas | ~80 líneas |
| HU-035 | ~40 líneas | ~30 líneas |
| HU-036 | ~100 líneas + 20 SVGs | ~50 líneas |
| HU-037 | ~80 líneas | ~40 líneas |
| HU-038 | ~150 líneas | ~60 líneas |
| HU-039 | ~120 líneas | ~50 líneas |
| HU-040 | ~200 líneas | ~100 líneas |
| HU-041 | ~60 líneas + fixture | ~60 líneas |
| HU-042 | ~40 líneas | ~40 líneas |
| **Total** | **~1,050 líneas** | **~620 líneas** |

---

## Métricas de éxito

1. **0 cruces** en diagramas de ≤ 10 nodos lineales
2. **≤ 3 cruces** en diagramas de ≤ 20 nodos con grupos
3. **48 tipos AWS** soportados con icono (vs 28 actuales)
4. **< 500ms** pipeline completo para 500 recursos
5. **Export PNG/SVG** funcional
6. **Import .tf** funcional
7. **Visual regression** con 10+ screenshots de baseline
8. **All tests green**: 60+ unit tests, 5+ e2e tests, 10+ visual tests
