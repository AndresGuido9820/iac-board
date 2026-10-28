export type Lang = 'en' | 'es'

export interface Translations {
  diff_title: string
  diff_eyebrow: string
  diff_pin: string
  diff_upload: string
  diff_demo: string
  diff_intro: string
  diff_limits_heading: string
  diff_limits: string
  diff_current: string
  diff_baseline: string
  diff_export: string
  diff_clear: string
  diff_summary: string
  diff_resources: string
  diff_detail: string
  diff_before: string
  diff_after: string
  diff_no_source: string
  diff_connections: string
  diff_error: string
  diff_invalid_current: string
  diff_no_changes: string
  diff_status: Record<'added' | 'removed' | 'changed' | 'unchanged', string>
  diff_reasons: Record<'configuration' | 'connections' | 'groups', string>
  eyebrow_hero: string
  hero_copy: string
  view_source: string
  terraform_examples: string
  eyebrow_samples: string
  examples_heading: string
  examples_count: (n: number) => string
  generate_diagram: string
  eyebrow_generated: string
  bundled_example: string
  tf_files: string
  resources: string
  canvas_drafts: string
  groups: string
  diagnostics_label: string
  eyebrow_parser: string
  parser_diagnostics: string
  findings: (n: number) => string
  no_diagnostics: string
  aria_project_actions: string
  aria_example_grid: string
  aria_metrics: string
  aria_groups: string
  aria_resources: string
  aria_diagnostics_list: string
  lang_toggle: string
  aria_node_inspector: string
  close_inspector: string
  inspector_type: string
  inspector_category: string
  inspector_source: string
  inspector_edges_out: string
  inspector_edges_in: string
  export_svg: string
  export_png: string
  import_section_heading: string
  import_clear: string
  import_loaded_summary: (n: number) => string
  save_layout: string
  load_layout: string
  load_layout_mismatch: string
  plan_mode_badge: string
  plan_mode_hint: string
  edge_labels_show: string
  edge_labels_hide: string
}

export const translations: Record<Lang, Translations> = {
  en: {
    diff_limits_heading: 'Comparison limits',
    diff_title: 'Compare architectures',
    diff_eyebrow: 'Review infrastructure changes',
    diff_pin: 'Use current as baseline',
    diff_upload: 'Load baseline files',
    diff_demo: 'Try comparison demo',
    diff_intro:
      'Save the current diagram as a baseline, then import the updated Terraform above. Or load baseline .tf files or a single plan JSON. Everything stays in your browser.',
    diff_limits:
      'Compares parsed configuration and topology, not Terraform apply actions. Unresolved expressions and missing modules limit the comparison. Renames appear as removal and addition. Use the same input format on both sides. Plan JSON compares known values; unknown values are not evaluated.',
    diff_current: 'Current diagram',
    diff_baseline: 'Baseline',
    diff_export: 'Export change summary',
    diff_clear: 'Clear comparison',
    diff_summary: 'Change summary',
    diff_resources: 'Changed resources',
    diff_detail: 'Change details',
    diff_before: 'Before',
    diff_after: 'After',
    diff_no_source: 'No HCL source available for this version.',
    diff_connections: 'Connections across both versions',
    diff_error:
      'Could not load baseline. Choose valid .tf files or a single Terraform plan JSON with resources. Previous baseline was kept.',
    diff_invalid_current:
      'Fix parser errors in the current diagram before comparing.',
    diff_no_changes: 'No changes detected in the parsed resources.',
    diff_status: {
      added: '+ Added',
      changed: '~ Modified',
      removed: '− Removed',
      unchanged: 'Unchanged',
    },
    diff_reasons: {
      configuration: 'Configuration',
      connections: 'Connections',
      groups: 'Group membership',
    },
    eyebrow_hero: 'Terraform-first architecture diagrams',
    hero_copy:
      'Generate editable AWS architecture diagrams from Terraform without executing infrastructure code.',
    view_source: 'View source',
    terraform_examples: 'Terraform examples',
    eyebrow_samples: 'Sample infrastructure',
    examples_heading: 'Example projects',
    examples_count: (n) => `${n} examples`,
    generate_diagram: 'Generate diagram',
    eyebrow_generated: 'Generated architecture',
    bundled_example: 'Bundled example',
    tf_files: 'Terraform files',
    resources: 'Resources',
    canvas_drafts: 'Canvas drafts',
    groups: 'Groups',
    diagnostics_label: 'Diagnostics',
    eyebrow_parser: 'Parser output',
    parser_diagnostics: 'Parser diagnostics',
    findings: (n) => `${n} findings`,
    no_diagnostics: 'No diagnostics for this example.',
    aria_project_actions: 'Project actions',
    aria_example_grid: 'Bundled example projects',
    aria_metrics: 'Generated diagram metrics',
    aria_groups: 'Generated network groups',
    aria_resources: 'Generated resources',
    aria_diagnostics_list: 'Parser diagnostics',
    lang_toggle: 'Español',
    aria_node_inspector: 'Node inspector',
    close_inspector: 'Close inspector',
    inspector_type: 'Resource type',
    inspector_category: 'Category',
    inspector_source: 'Source',
    inspector_edges_out: 'Edges out',
    inspector_edges_in: 'Edges in',
    export_svg: 'Export SVG',
    export_png: 'Export PNG',
    import_section_heading: 'Import .tf files',
    import_clear: 'Clear',
    import_loaded_summary: (n) => `${n} file${n !== 1 ? 's' : ''} loaded`,
    save_layout: 'Save layout',
    load_layout: 'Load layout',
    load_layout_mismatch:
      'Layout was saved for a different diagram — positions may not align.',
    plan_mode_badge: 'From plan',
    plan_mode_hint:
      'Exact dependencies from terraform show -json — no inference.',
    edge_labels_show: 'Show labels',
    edge_labels_hide: 'Hide labels',
  },
  es: {
    diff_limits_heading: 'Alcance de la comparación',
    diff_title: 'Comparar arquitecturas',
    diff_eyebrow: 'Revisa cambios de infraestructura',
    diff_pin: 'Usar actual como base',
    diff_upload: 'Cargar archivos base',
    diff_demo: 'Probar comparación',
    diff_intro:
      'Guarda el diagrama actual como base e importa el Terraform actualizado arriba. También puedes cargar archivos .tf base o un único plan JSON. Todo permanece en tu navegador.',
    diff_limits:
      'Compara configuración y topología interpretadas, no acciones de Terraform apply. Las expresiones sin resolver y módulos faltantes limitan la comparación. Renombrar aparece como eliminación y adición. Usa el mismo formato en ambas versiones. Plan JSON compara valores conocidos; no evalúa valores desconocidos.',
    diff_current: 'Diagrama actual',
    diff_baseline: 'Versión base',
    diff_export: 'Exportar resumen de cambios',
    diff_clear: 'Limpiar comparación',
    diff_summary: 'Resumen de cambios',
    diff_resources: 'Recursos modificados',
    diff_detail: 'Detalle del cambio',
    diff_before: 'Antes',
    diff_after: 'Después',
    diff_no_source: 'Esta versión no tiene código HCL disponible.',
    diff_connections: 'Conexiones de ambas versiones',
    diff_error:
      'No se pudo cargar la base. Elige archivos .tf válidos o un único plan JSON de Terraform con recursos. Se conservó la base anterior.',
    diff_invalid_current:
      'Corrige los errores del parser en el diagrama actual antes de comparar.',
    diff_no_changes: 'No se detectaron cambios en los recursos interpretados.',
    diff_status: {
      added: '+ Agregados',
      changed: '~ Modificados',
      removed: '− Eliminados',
      unchanged: 'Sin cambios',
    },
    diff_reasons: {
      configuration: 'Configuración',
      connections: 'Conexiones',
      groups: 'Pertenencia a grupos',
    },
    eyebrow_hero: 'Diagramas de arquitectura desde Terraform',
    hero_copy:
      'Genera diagramas de arquitectura AWS editables desde Terraform sin ejecutar código de infraestructura.',
    view_source: 'Ver código fuente',
    terraform_examples: 'Ejemplos Terraform',
    eyebrow_samples: 'Infraestructura de ejemplo',
    examples_heading: 'Proyectos de ejemplo',
    examples_count: (n) => `${n} ejemplos`,
    generate_diagram: 'Generar diagrama',
    eyebrow_generated: 'Arquitectura generada',
    bundled_example: 'Ejemplo incluido',
    tf_files: 'Archivos Terraform',
    resources: 'Recursos',
    canvas_drafts: 'Borradores del canvas',
    groups: 'Grupos',
    diagnostics_label: 'Diagnósticos',
    eyebrow_parser: 'Salida del parser',
    parser_diagnostics: 'Diagnósticos del parser',
    findings: (n) => `${n} hallazgos`,
    no_diagnostics: 'Sin diagnósticos para este ejemplo.',
    aria_project_actions: 'Acciones del proyecto',
    aria_example_grid: 'Proyectos de ejemplo incluidos',
    aria_metrics: 'Métricas del diagrama generado',
    aria_groups: 'Grupos de red generados',
    aria_resources: 'Recursos generados',
    aria_diagnostics_list: 'Diagnósticos del parser',
    lang_toggle: 'English',
    aria_node_inspector: 'Inspector de nodo',
    close_inspector: 'Cerrar inspector',
    inspector_type: 'Tipo de recurso',
    inspector_category: 'Categoría',
    inspector_source: 'Fuente',
    inspector_edges_out: 'Edges salientes',
    inspector_edges_in: 'Edges entrantes',
    export_svg: 'Exportar SVG',
    export_png: 'Exportar PNG',
    import_section_heading: 'Importar archivos .tf',
    import_clear: 'Limpiar',
    import_loaded_summary: (n) =>
      `${n} archivo${n !== 1 ? 's' : ''} cargado${n !== 1 ? 's' : ''}`,
    save_layout: 'Guardar layout',
    load_layout: 'Cargar layout',
    load_layout_mismatch:
      'El layout fue guardado para otro diagrama — las posiciones pueden no coincidir.',
    plan_mode_badge: 'Desde plan',
    plan_mode_hint:
      'Dependencias exactas de terraform show -json — sin inferencia.',
    edge_labels_show: 'Mostrar labels',
    edge_labels_hide: 'Ocultar labels',
  },
}
