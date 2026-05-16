import { z } from 'zod'

export const documentVersion = 1

export const sourceLocationSchema = z.object({
  filePath: z.string(),
  line: z.number().int().positive().optional(),
  column: z.number().int().positive().optional(),
})

export const diagnosticSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: z.enum(['info', 'warning', 'error']),
  source: sourceLocationSchema.optional(),
})

export const cloudNodeSchema = z.object({
  id: z.string(),
  provider: z.enum(['aws', 'unknown']),
  kind: z.string(),
  label: z.string(),
  category: z.enum([
    'network',
    'compute',
    'database',
    'storage',
    'security',
    'integration',
    'unknown',
  ]),
  source: sourceLocationSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export const cloudEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  relation: z.enum([
    'contains',
    'connects',
    'depends-on',
    'publishes-to',
    'reads-from',
    'writes-to',
    'invokes',
  ]),
  confidence: z.enum(['exact', 'inferred', 'uncertain']).default('inferred'),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export const cloudGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(['account', 'region', 'vpc', 'subnet', 'service']),
  children: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export const cloudGraphSchema = z.object({
  nodes: z.array(cloudNodeSchema),
  edges: z.array(cloudEdgeSchema),
  groups: z.array(cloudGroupSchema).default([]),
  diagnostics: z.array(diagnosticSchema).default([]),
})

export const iacBoardDocumentSchema = z.object({
  version: z.literal(documentVersion),
  source: z.object({
    type: z.enum(['local-folder', 'git-repo', 'example']),
    name: z.string(),
    scannedAt: z.string(),
  }),
  graph: cloudGraphSchema,
  layout: z.record(
    z.string(),
    z.object({
      x: z.number(),
      y: z.number(),
      width: z.number().positive(),
      height: z.number().positive(),
    }),
  ),
  diagnostics: z.array(diagnosticSchema).default([]),
})

export type SourceLocation = z.infer<typeof sourceLocationSchema>
export type Diagnostic = z.infer<typeof diagnosticSchema>
export type CloudNode = z.infer<typeof cloudNodeSchema>
export type CloudEdge = z.infer<typeof cloudEdgeSchema>
export type CloudGroup = z.infer<typeof cloudGroupSchema>
export type CloudGraph = z.infer<typeof cloudGraphSchema>
export type IacBoardDocument = z.infer<typeof iacBoardDocumentSchema>
