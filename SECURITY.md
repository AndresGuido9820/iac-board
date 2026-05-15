# Security Policy

IaC Board is Terraform-first and local-first.

## Supported Versions

The project is pre-MVP. Security fixes target the default branch until a public
release line exists.

## Security Model

IaC Board must treat Terraform repositories as untrusted input.

Rules:

- Do not execute `terraform init`, `terraform plan`, or `terraform apply`.
- Do not execute scripts from imported repositories.
- Do not request cloud credentials in the MVP.
- Do not upload local Terraform files by default.
- Sanitize labels, paths, diagnostics, and metadata before rendering.
- Report security-related observations as hints, not complete audits.

## Reporting A Vulnerability

Please open a private security advisory on GitHub when the repository is public.
Until then, contact the maintainer directly.

Include:

- affected version or commit,
- reproduction steps,
- impact,
- suggested fix if known.
