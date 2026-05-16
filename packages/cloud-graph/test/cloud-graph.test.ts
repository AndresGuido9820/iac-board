import { describe, expect, it } from 'vitest'
import { parseTerraformFiles } from '@iac-board/terraform-parser'
import { buildCloudGraph } from '../src'

describe('buildCloudGraph', () => {
  it('maps Terraform AWS resources to cloud graph nodes', () => {
    const parseResult = parseTerraformFiles([
      {
        path: 'main.tf',
        content: `resource "aws_s3_bucket" "assets" {}
resource "aws_iot_topic_rule" "telemetry" {}
resource "aws_nat_gateway" "egress" {}`,
      },
    ])

    const graph = buildCloudGraph(parseResult)

    expect(graph.nodes).toMatchObject([
      {
        id: 'aws_s3_bucket.assets',
        provider: 'aws',
        category: 'storage',
      },
      {
        id: 'aws_iot_topic_rule.telemetry',
        provider: 'aws',
        category: 'integration',
      },
      {
        id: 'aws_nat_gateway.egress',
        provider: 'aws',
        category: 'network',
      },
    ])
  })

  it('keeps unsupported resources visible with diagnostics', () => {
    const parseResult = parseTerraformFiles([
      {
        path: 'main.tf',
        content: 'resource "custom_service" "thing" {}',
      },
    ])

    const graph = buildCloudGraph(parseResult)

    expect(graph.nodes).toMatchObject([
      {
        id: 'custom_service.thing',
        provider: 'unknown',
        category: 'unknown',
      },
    ])
    expect(graph.diagnostics).toMatchObject([
      {
        code: 'GRAPH001',
        severity: 'warning',
      },
    ])
  })

  it('categorizes new AWS resource types correctly (HU-036)', () => {
    const parseResult = parseTerraformFiles([
      {
        path: 'main.tf',
        content: `
resource "aws_ecs_cluster" "app" {}
resource "aws_ecs_service" "api" {}
resource "aws_ecs_task_definition" "api_task" {}
resource "aws_eks_cluster" "k8s" {}
resource "aws_ecr_repository" "images" {}
resource "aws_lb" "public" {}
resource "aws_lb_listener" "http" {}
resource "aws_lb_target_group" "api" {}
resource "aws_alb" "app" {}
resource "aws_cloudfront_distribution" "cdn" {}
resource "aws_cognito_user_pool" "users" {}
resource "aws_cognito_user_pool_client" "app" {}
resource "aws_sfn_state_machine" "pipeline" {}
resource "aws_elasticache_cluster" "cache" {}
resource "aws_elasticache_replication_group" "redis" {}
resource "aws_route53_zone" "main" {}
resource "aws_route53_record" "api" {}
resource "aws_acm_certificate" "tls" {}
resource "aws_wafv2_web_acl" "protection" {}
resource "aws_iam_policy" "perms" {}
`,
      },
    ])

    const graph = buildCloudGraph(parseResult)

    // No GRAPH001 warnings for any of these types
    const graph001 = graph.diagnostics.filter((d) => d.code === 'GRAPH001')
    expect(graph001).toHaveLength(0)

    // Spot-check categories
    const byId = new Map(graph.nodes.map((n) => [n.id, n]))
    expect(byId.get('aws_ecs_cluster.app')?.category).toBe('compute')
    expect(byId.get('aws_eks_cluster.k8s')?.category).toBe('compute')
    expect(byId.get('aws_ecr_repository.images')?.category).toBe('storage')
    expect(byId.get('aws_lb.public')?.category).toBe('network')
    expect(byId.get('aws_cloudfront_distribution.cdn')?.category).toBe(
      'integration',
    )
    expect(byId.get('aws_sfn_state_machine.pipeline')?.category).toBe(
      'integration',
    )
    expect(byId.get('aws_elasticache_cluster.cache')?.category).toBe('database')
    expect(byId.get('aws_cognito_user_pool.users')?.category).toBe('security')
    expect(byId.get('aws_acm_certificate.tls')?.category).toBe('security')
    expect(byId.get('aws_wafv2_web_acl.protection')?.category).toBe('security')
  })

  it('infers correct edge relations for new resource types (HU-036)', () => {
    const parseResult = parseTerraformFiles([
      {
        path: 'main.tf',
        content: `
resource "aws_cloudfront_distribution" "cdn" {
  origin { domain_name = aws_lb.public.dns_name }
}
resource "aws_lb" "public" {}
resource "aws_sfn_state_machine" "pipeline" {
  role_arn = aws_iam_role.exec.arn
}
resource "aws_iam_role" "exec" {}
resource "aws_ecs_service" "api" {
  task_definition = aws_ecs_task_definition.api_task.arn
  iam_role = aws_iam_role.exec.arn
}
resource "aws_ecs_task_definition" "api_task" {}
`,
      },
    ])

    const graph = buildCloudGraph(parseResult)
    const edgeRelation = (from: string, to: string) =>
      graph.edges.find((e) => e.from === from && e.to === to)?.relation

    expect(
      edgeRelation('aws_cloudfront_distribution.cdn', 'aws_lb.public'),
    ).toBe('connects')
    expect(
      edgeRelation('aws_sfn_state_machine.pipeline', 'aws_iam_role.exec'),
    ).toBe('uses-role')
    expect(edgeRelation('aws_ecs_service.api', 'aws_iam_role.exec')).toBe(
      'uses-role',
    )
  })

  it('builds VPC and subnet groups from Terraform references', () => {
    const parseResult = parseTerraformFiles([
      {
        path: 'main.tf',
        content: `resource "aws_vpc" "main" {}

resource "aws_subnet" "public" {
  vpc_id = aws_vpc.main.id
  map_public_ip_on_launch = true
}

resource "aws_nat_gateway" "egress" {
  subnet_id = aws_subnet.public.id
}`,
      },
    ])

    const graph = buildCloudGraph(parseResult)

    expect(graph.groups).toContainEqual(
      expect.objectContaining({
        id: 'group:vpc:aws_vpc.main',
        label: 'VPC main',
        kind: 'vpc',
        children: [
          'aws_vpc.main',
          'aws_subnet.public',
          'aws_nat_gateway.egress',
        ],
      }),
    )
    expect(graph.groups).toContainEqual(
      expect.objectContaining({
        id: 'group:subnet:aws_subnet.public',
        label: 'Public subnet public',
        kind: 'subnet',
        children: ['aws_subnet.public', 'aws_nat_gateway.egress'],
        metadata: expect.objectContaining({
          visibility: 'public',
          vpcAddress: 'aws_vpc.main',
        }),
      }),
    )
  })
})
