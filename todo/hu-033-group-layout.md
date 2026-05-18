# HU-033 — Layout consciente de grupos

**Status:** IN PROGRESS
**Branch:** feat/hu-033-group-layout

## Objective
Force VPC/subnet group members to occupy adjacent columns so the group rect
has a reasonable aspect ratio and network topology is visually obvious.

## Problem
Current layout: computeLayers assigns layers by topology depth.
In VPC+RDS, this gives:
- Col 0: aws_vpc.main
- Col 1: subnets, internet_gw, security_group
- Col 2: nat_gateway, db_instance (each deployed-in a subnet)
VPC group spans 3 columns → rect too wide.

## Solution (post-process on byLayer)
1. **Subnet constraint**: For each subnet group, find the min layer of its children.
   Move all children to that layer.
2. **VPC constraint**: For each VPC group, if children span > 2 layers, compress to [min, min+1].
3. Renormalize layer numbering if gaps remain.

Note: HU-032 (barycentre ordering) was already implemented in a prior sprint.

## Tasks
- [x] Mark HU-032 complete (barycentreOrdering already in layout engine + tests)
- [x] Implement `applyGroupConstraints()` in layout-engine/src/index.ts
- [x] Call it after barycentreOrdering, before coordinate assignment
- [x] Unit tests: packages/layout-engine/test/group-layout.test.ts
  - subnet children share same column
  - vpc children span at most 2 columns
  - group aspect ratio does not exceed 3:1 for vpc-rds example
  - non-grouped nodes unaffected
- [x] Integration: generateDiagramFromTerraformFiles(vpc-rds) → VPC group ≤ 2 cols
- [x] No regressions in existing layout tests
