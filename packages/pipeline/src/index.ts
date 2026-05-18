import type { CanvasElementDraft } from '@iac-board/canvas-engine'
import { toCanvasElementDrafts } from '@iac-board/canvas-engine'
import { buildCloudGraph } from '@iac-board/cloud-graph'
import type { CloudGraph, Diagnostic } from '@iac-board/core-types'
import type { PositionedCloudGraph } from '@iac-board/layout-engine'
import { layoutCloudGraph } from '@iac-board/layout-engine'
import type {
  TerraformFile,
  TerraformParseResult,
} from '@iac-board/terraform-parser'
import { parseTerraformFiles, parsePlanJson } from '@iac-board/terraform-parser'

export type DiagramPipelineResult = {
  parsed: TerraformParseResult
  graph: CloudGraph
  positionedGraph: PositionedCloudGraph
  canvasDrafts: CanvasElementDraft[]
  diagnostics: Diagnostic[]
}

export function generateDiagramFromPlanJson(
  content: string,
): DiagramPipelineResult {
  const parsed = parsePlanJson(content)
  const graph = buildCloudGraph(parsed)
  const positionedGraph = layoutCloudGraph(graph)
  const canvasDrafts = toCanvasElementDrafts(positionedGraph)

  return {
    parsed,
    graph,
    positionedGraph,
    canvasDrafts,
    diagnostics: [...parsed.diagnostics, ...graph.diagnostics],
  }
}

export function generateDiagramFromTerraformFiles(
  files: TerraformFile[],
): DiagramPipelineResult {
  const parsed = parseTerraformFiles(files)
  const graph = buildCloudGraph(parsed)
  const positionedGraph = layoutCloudGraph(graph)
  const canvasDrafts = toCanvasElementDrafts(positionedGraph)

  return {
    parsed,
    graph,
    positionedGraph,
    canvasDrafts,
    diagnostics: [...parsed.diagnostics, ...graph.diagnostics],
  }
}
