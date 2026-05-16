import { describe, expect, it } from 'vitest'
import { buildCloudGraph } from '@iac-board/cloud-graph'
import { toCanvasElementDrafts } from '@iac-board/canvas-engine'
import { layoutCloudGraph } from '@iac-board/layout-engine'
import { parseTerraformFiles } from '@iac-board/terraform-parser'

describe('Terraform to canvas pipeline', () => {
  it('turns Terraform resources into canvas drafts', () => {
    const parsed = parseTerraformFiles([
      {
        path: 'main.tf',
        content: 'resource "aws_lambda_function" "api" {}',
      },
    ])
    const graph = buildCloudGraph(parsed)
    const positioned = layoutCloudGraph(graph)
    const drafts = toCanvasElementDrafts(positioned)

    expect(drafts).toMatchObject([
      {
        id: 'aws_lambda_function.api',
        label: 'api',
      },
    ])
  })
})
