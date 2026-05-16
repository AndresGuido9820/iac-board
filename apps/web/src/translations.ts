export type Lang = 'en' | 'es'

export interface Translations {
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
}

export const translations: Record<Lang, Translations> = {
  en: {
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
  },
  es: {
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
  },
}
