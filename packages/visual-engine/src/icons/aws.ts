/**
 * Inline SVG path data for AWS service categories.
 * Paths are designed to fit a 24×24 viewBox.
 * Inspired by AWS architecture icon shapes — original drawings, not copies.
 */

/** Lambda / compute: lightning bolt */
export const computeIcon = 'M13 2L4.5 13.5H11L9 22L19.5 10H13L13 2Z'

/** S3 / storage: layered cylinder top */
export const storageIcon =
  'M12 3C7.03 3 3 4.34 3 6v12c0 1.66 4.03 3 9 3s9-1.34 9-3V6c0-1.66-4.03-3-9-3Z' +
  'M12 5c4.42 0 7 1.12 7 1s-2.58 1-7 1-7-1.12-7-1 2.58-1 7-1Z'

/** DynamoDB/RDS / database: stacked disks */
export const databaseIcon =
  'M12 2C7.58 2 4 3.34 4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5c0-1.66-3.58-3-8-3Z' +
  'M12 8c-4.42 0-8-1.12-8-2s3.58-2 8-2 8 1.12 8 2-3.58 2-8 2Z' +
  'M12 13c-4.42 0-8-1.12-8-2s3.58-2 8-2 8 1.12 8 2-3.58 2-8 2Z'

/** API Gateway / SQS / SNS / integration: connected dots */
export const integrationIcon =
  'M4 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z' +
  'M16 6a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z' +
  'M16 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z' +
  'M8 12h8M18 8l-1.5 2.5M18 16l-1.5-2.5'

/** VPC / subnet / network: hexagon grid */
export const networkIcon =
  'M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2Z' + 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z'

/** IAM / security group: shield */
export const securityIcon =
  'M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4Z' +
  'M10 13l-2-2 1.41-1.41L10 10.17l4.59-4.58L16 7l-6 6Z'

/** Unknown: generic box */
export const unknownIcon = 'M4 4h16v16H4z' + 'M9 12h6M12 9v6'

export type AwsCategory =
  | 'compute'
  | 'storage'
  | 'database'
  | 'integration'
  | 'network'
  | 'security'
  | 'unknown'

export const categoryIcons: Record<AwsCategory, string> = {
  compute: computeIcon,
  storage: storageIcon,
  database: databaseIcon,
  integration: integrationIcon,
  network: networkIcon,
  security: securityIcon,
  unknown: unknownIcon,
}

export const categoryColors: Record<AwsCategory, string> = {
  compute: '#f97316', // orange
  storage: '#f59e0b', // amber
  database: '#10b981', // emerald
  integration: '#8b5cf6', // violet
  network: '#2563eb', // blue
  security: '#ef4444', // red
  unknown: '#94a3b8', // slate
}
