# IaC Board — Core Plan

## Estado actual (honesto)

| Componente | Estado | Problema real |
|---|---|---|
| **HCL Parser** | ❌ Regex básico | Solo detecta `resource`. No maneja bloques anidados, `variable`, `locals`, `data`, `module`. Body extraído por heurística de "buscar el siguiente resource". |
| **Cloud Graph** | ⚠️ Funciona | Edges inferidos de referencias en texto. Soporta ~20 tipos AWS. Sin GCP/Azure. Sin `data` sources. |
| **Layout Engine** | ❌ Grid fijo | 4 columnas, 160px de alto. No respeta flujo de datos. Los grupos VPC/subnet son calculados pero no posicionan bien a sus hijos. |
| **Visual Engine** | ⚠️ Funciona | Pan/zoom OK. Drag no ajusta por zoom. `foreignObject` para iconos puede fallar en algunos renderers. Edges rectas sin routing. Sin export. |
| **Web UX** | ⚠️ Parcial | Solo 3 ejemplos hardcodeados. Sin importar archivos reales. |
| **Ejemplos** | ✅ Simples | Cubren los casos básicos pero son muy planos (sin nested blocks, sin variables). |

---

## El core loop

```
Archivos .tf  →  Parser  →  Cloud Graph  →  Layout  →  Visual Engine  →  Diagrama
```

Cada eslabón debe ser suficientemente bueno para que el loop completo funcione con Terraform real.

---

## Fases (por impacto)

### Fase A — Parser HCL propio ← PRÓXIMO
**Por qué primero**: sin un parser correcto, todo lo demás trabaja con inputs sintéticos.
Un archivo Terraform real tiene nested blocks, variables, locals, data sources, módulos.

Alcance:
- Reemplazar regex con un parser recursivo de bloques HCL
- Bloques soportados: `resource`, `variable`, `locals`, `data`, `module`, `output`, `provider`
- Extracción correcta de atributos y referencias
- Resolución de variables simples (las que tienen `default`)
- Resolución de locals simples (sin expresiones complejas)
- Soporte multi-archivo real (todos los `.tf` del mismo módulo se combinan)
- Diagnósticos para expresiones no resolubles (en vez de crashear)
- Sin ejecutar Terraform — solo análisis estático

No en Fase A:
- `for_each`, `count`, `dynamic` blocks
- Módulos remotos (registry, git)
- Expresiones complejas (`merge()`, `concat()`, etc.)

Tests requeridos:
- Archivo con nested blocks (tags, environment variables, vpc_config)
- Archivo con variables referenciadas en recursos
- Archivo con locals
- Archivo con data sources
- Múltiples archivos en el mismo módulo
- Expresiones no resolubles → diagnóstico, no crash

### Fase B — Layout inteligente
**Por qué segundo**: el parser mejor alimenta un grafo real, el layout lo tiene que mostrar legible.

Alcance:
- Layout de capas: izquierda → derecha siguiendo dirección de edges
- Dentro de cada capa, agrupar por categoría (compute, integration, database, storage)
- Grupos VPC/subnet como contenedores reales: sus hijos se posicionan dentro
- Padding inteligente entre nodos y grupos
- Fallback a grid si no hay edges

No en Fase B:
- Layout automático con fuerzas (force-directed)
- Routing de edges ortogonales (Fase D)

### Fase C — Importar archivos reales (HU-001)
**Por qué tercero**: de nada sirve el parser si el usuario no puede cargar sus archivos.

Alcance:
- Drag & drop de archivos `.tf` individuales sobre el diagrama
- File picker para seleccionar múltiples `.tf`
- Text area para pegar HCL directamente
- Mostrar cuántos archivos cargados y cuántos recursos detectados
- No enviar archivos al servidor — todo local en el browser

No en Fase C:
- Folder picker / File System Access API (experimental, poco soporte)
- Import desde GitHub URL

### Fase D — Visual polish + Export (HU-016)
Alcance:
- Corregir drag ajustado por zoom
- Reemplazar `foreignObject` por `<image>` + data URI para los iconos (más compatible)
- Edges con routing básico (evitar atravesar nodos)
- Arrowheads con forma AWS-style
- Export a PNG (canvas + XMLSerializer)
- Export a SVG limpio

### Fase E — Más tipos de recursos y providers
Alcance:
- Ampliar AWS: EC2, ECS, EKS/Fargate, ALB/NLB, CloudFront, SES, Cognito, Step Functions
- GCP básico: Cloud Functions, GCS, Cloud SQL, Pub/Sub, BigQuery, GKE
- Azure básico: Functions, Storage Account, Service Bus, VNet, AKS
- Añadir iconos correspondientes al registry

### Fase F — Módulos y variables (HU-025, HU-026)
Alcance:
- Resolver módulos locales (source = "./modules/vpc")
- Expandir recursos de módulos en el grafo con prefijo de módulo
- Resolver variables con tfvars si se proveen
- Mostrar módulo como grupo en el diagrama

### Fase G — UX producto (HU-005 completo, HU-008, HU-017)
Alcance:
- Panel lateral: inspector de nodo (atributos parseados, source file)
- Summary generado: providers, regiones detectadas, conteo de recursos, flows principales
- Export Markdown report
- Guardar/abrir `.iac-board.json`

---

## Qué NO hacer por ahora
- Integración con Terraform Cloud / Registry
- Ejecución de `terraform plan`
- IA / explicaciones generadas
- GitHub Actions / CLI
- Editor de diagramas completo (resize, multi-select, undo)
- Soporte OpenTofu (fácil de agregar después, mismo parser)

---

## Métricas de éxito para "suficientemente bueno"
- Parsear un módulo Terraform real de 5-10 archivos sin crash
- El diagrama resultante es legible sin mover nodos
- Un engineer puede cargar sus `.tf`, ver el diagrama, y entender la infra en < 30 segundos
- Export PNG usable para un README
