# Clauselock AI

**The AI Contract Operating System**

Clauselock AI turns a static contract into an active workflow engine. It extracts key terms, scores risk against a company playbook, proves findings with exact source clauses, drafts negotiation redlines, and turns important dates into workflow actions.

This repository contains a polished frontend prototype built from the ContractLens project report. It is optimized for the 60-second hero flow: open a pre-processed Enterprise SaaS Vendor Agreement, inspect a CPI escalation risk, verify the source clause, generate a redline, and sync the renewal deadline.

## What is implemented

- Split-screen contract viewer and Executive Brief
- Navy workspace treatment with the PDF on the right and Active Document / Source-Lock rail on the left
- Local-drive PDF and DOC/DOCX file picker for adding contracts to the review queue
- Bi-directional Source-Lock interaction
- Risk breakdown with high / medium / low severity
- Confidence gate with human verification state
- Live CPI exposure calculation in browser code
- Obligation timeline with calendar download
- Company Playbook Matcher
- Guided assistant prompt chips
- Three-tier redline drawer with Position A, Position B, and rationale
- Success toasts for approval, export, and sync actions
- Documentation files: `implementation.md`, `agent.md`, and `architecture-tree.md`

## Run locally

```bash
pnpm install
pnpm dev
```

The WebDev project runs on Vite and serves the app from `client/`.

## Demo walkthrough

1. Open the Review workspace.
2. Click **Dynamic CPI escalation** in the Executive Brief. The document viewer will Source-Lock to Section 7.2.
3. Review the amber confidence state and click **Approve extraction**.
4. Adjust the CPI input if desired and inspect the exposure calculation.
5. Click **Auto-redline** to open Position A, Position B, and negotiation rationale.
6. Use **Export redline** to download the prototype artifact.
7. Click **Resolve & sync** to download an ICS calendar file and surface the completion toast.

## Architecture

The static prototype keeps the UX layer deterministic and local so it can be reviewed without external credentials. The intended production architecture separates extraction, playbook rules, and generation into three explainable layers. See [implementation.md](./implementation.md) for the full blueprint and [architecture-tree.md](./architecture-tree.md) for the repository map.

## Production follow-up

The report recommends upgrading the static frontend with a server-backed application for real PDF/DOCX ingestion, structured LLM extraction, persistent contracts, secure API calls, and native tracked-change Word export. Those capabilities are intentionally marked as follow-up work rather than simulated as live infrastructure in this prototype.

## Design direction

The UI combines warm document-paper surfaces, a near-black operations rail, muted graphite typography, and acid-lime verification signals. Amber is reserved for exposure and confidence review. Motion is restrained and task-oriented so source navigation and action feedback feel immediate.
