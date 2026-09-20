# Clauselock AI Agent Guide

## Mission

Build and maintain an evidence-first contract operations workspace. The product should help a reviewer move from a document clause to a verified business action with as little cognitive overhead as possible.

## Working agreements

1. Keep claims grounded. Every risk or assistant answer should point to a clause, section, page, or explicit demo boundary.
2. Preserve the hero flow. Changes must not make sample load, Source-Lock, approval, redline, or sync slower or harder to discover.
3. Treat the playbook as policy. Match results must be deterministic and explainable; do not hide policy failures behind generic AI copy.
4. Never move arithmetic into generated text. CPI exposure and date calculations belong in code.
5. Keep confidence visible. Low-confidence extraction must show a verification state and an explicit approval action.
6. Prefer reversible actions. Downloads, toasts, drawers, and local state are safe defaults for the static prototype.
7. Do not present pre-processed output as live parsing. Label demo data and keep the production boundary documented.
8. Preserve accessibility. Maintain keyboard focus, semantic buttons, readable contrast, and reduced-motion support.

## UI conventions

- Use `lucide-react` for interface icons.
- Keep the warm paper / graphite / acid-lime / amber palette coherent.
- Use short labels that describe the next action: `Source-Lock`, `Approve extraction`, `Auto-redline`, `Resolve & sync`.
- Use toasts for confirmation, not blocking modal dialogs, except for the redline drawer where comparison content benefits from focus.
- Highlight active clauses with a visible left rule, pale fill, and a source-lock marker.
- Keep animations below 300ms and prefer opacity / transform transitions.

## Data conventions

The demo contract is an Enterprise SaaS Vendor Agreement with these notable clauses:

| Clause | Purpose | Demo behavior |
| --- | --- | --- |
| Section 7.2 | CPI + 3% annual price escalation | High risk, amber confidence, Source-Lock target |
| Section 11.4 | Auto-renewal with 60-day notice | High risk, obligation timeline target |
| Section 9.1 | Uncapped liability | Medium risk, fallback redline target |
| Section 4.3 | Net-45 payment terms | Playbook review against Net-30 |
| Section 14.2 | New York governing law | Playbook review against Delaware |

## When adding a feature

Update the relevant documentation if a feature changes the product boundary. Add or revise:

- `implementation.md` for behavior and architecture
- `README.md` for user-facing instructions
- `architecture-tree.md` for new files or services

For external integrations, keep secrets server-side and do not place API keys in the static client. The intended path is a `web-db-user` upgrade with secure environment variables.

## Quality gate

Before delivery, verify:

- `pnpm run check`
- `pnpm run build`
- Desktop and narrow viewport rendering
- Source-Lock from each risk card
- Approval state transition
- Redline drawer open / close and export
- Calendar export download
- No visible placeholder copy or broken navigation
