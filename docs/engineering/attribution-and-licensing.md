# Attribution And Licensing

## License Direction

IaC Board can be released under MIT unless future dependencies require a
different compatible license.

Drawnix is MIT licensed, so using or adapting it is allowed, provided license
and copyright notices are preserved.

## Attribution Requirements

If using Drawnix as a package dependency:

- keep dependency listed in `package.json`,
- mention Drawnix/Plait in README acknowledgements,
- preserve package licenses through normal dependency license metadata.

If copying Drawnix source into this repo:

- include Drawnix MIT license text in `NOTICE.md` or `THIRD_PARTY_NOTICES.md`,
- document copied files,
- preserve copyright notices if present,
- describe modifications.

## Recommended README Acknowledgement

```md
## Acknowledgements

IaC Board uses the Drawnix and Plait ecosystem as part of its visual canvas
foundation. Drawnix is an MIT-licensed open source whiteboard project.
```

## Product Identity

Do not present IaC Board as official Drawnix.

Correct:

- "Powered by Drawnix/Plait"
- "Built on top of Drawnix and Plait"
- "Uses Drawnix as a visual canvas foundation"

Avoid:

- "Official Drawnix Cloud"
- "Drawnix IaC"
- branding that implies endorsement.

## Source Extraction Log

If files are copied later, maintain a table:

| Source file | Destination file | Reason | Modified |
| ----------- | ---------------- | ------ | -------- |
| TBD         | TBD              | TBD    | TBD      |

## Dependency Review

Before public launch:

- run license checker,
- verify all dependencies are compatible with MIT,
- document any copyleft dependencies,
- avoid bundling proprietary cloud provider icons without checking terms.

## Cloud Provider Icons

Cloud provider architecture icons may have brand usage restrictions.

Safer first version:

- use generic service icons,
- use text labels,
- optionally support user-provided icon packs,
- add official icon packs only after checking usage terms.
