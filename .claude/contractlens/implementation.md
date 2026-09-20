# Clauselock AI Implementation Blueprint

## Product intent

ContractLens turns a static contract into an active operating workflow. The product is designed for in-house legal, procurement, finance, and operations teams that need to understand exposure, prove where an answer came from, and move from review to action without switching tools.

The prototype prioritizes the report's 60-second hero flow: load an Enterprise SaaS Vendor Agreement, surface three material risks, Source-Lock the dynamic CPI clause, show the live financial exposure, generate a three-tier redline, and resolve the renewal deadline into a calendar action.

## Design principles

| Principle | Implementation choice |
| --- | --- |
| Evidence before confidence | Every insight carries a clause number, quoted source text, and confidence state. |
| Deterministic where it matters | Playbook matching and CPI arithmetic are computed from structured data in code. |
| Action over summary | Risk cards lead directly to approve, redline, sync, or export actions. |
| Responsible AI | Low-confidence extractions show a Human Verification Required state. |
| Demo-safe, not demo-only | The first contract is pre-processed for speed, while upload and parsing boundaries remain explicit for the production path. |

## Frontend scope

The first release is a client-side React prototype in the `web-static` template. It includes a polished split-screen review workspace with:

1. A persistent navigation rail for Review, Obligations, Playbook, and Exports.
2. A contract metadata header with file state, total value, parties, term, and review status.
3. A right-side source document viewer with searchable clause anchors and active Source-Lock highlighting.
4. A left-side Active Document / Source-Lock rail that sits inside the PDF split screen.
5. An executive brief with a playbook score, severity buckets, confidence states, and plain-English explanations.
6. An exposure panel for the CPI-linked escalator using a deterministic calculation.
7. An obligation timeline for signing, payment due, notice deadline, and expiry.
8. A playbook checklist for Net-30 payment, Delaware law, liability cap, and mutual indemnity.
9. Guided assistant chips for payment obligations, price-raise rights, and early termination.
10. A redline drawer with Position A, Position B, and rationale.
11. Calendar and redline downloads implemented as browser-generated demo artifacts.
12. A local-drive picker for PDF and DOC/DOCX files, with a review-queue state and transparent pre-processing boundary.

## Interaction model

The workspace uses a single source of truth for the active clause. Clicking a risk card, metadata field, or highlighted passage updates `activeClauseId`, which drives the document highlight and the source-lock badge. This preserves the report's bi-directional Source-Lock idea without requiring a server in the prototype.

The prototype deliberately uses a compact local data model:

```ts
type Clause = {
  id: string;
  section: string;
  title: string;
  quote: string;
  page: number;
  severity?: "high" | "medium" | "low";
  confidence?: number;
};

type PlaybookRule = {
  label: string;
  expectation: string;
  status: "pass" | "review" | "fail";
  sourceClauseId?: string;
};
```

## Production path

The report recommends the following thin architecture when the prototype graduates beyond the local demo:

| Layer | Suggested technology | Responsibility |
| --- | --- | --- |
| Frontend | React, Tailwind, PDF.js, Framer Motion | Split-screen workspace, viewer, timeline, toasts, optimistic transitions |
| Backend | Node.js / Express or Next.js API routes | Upload handling, orchestration, export generation |
| Parsing | `pdf-parse`, `mammoth` | Raw text plus page and character-offset mapping |
| AI 1: extraction | LLM with strict JSON schema | Metadata, clauses, risks, translations, confidence |
| AI 2: playbook | Deterministic JSON rule engine | Policy comparison and match score |
| AI 3: generation | Prompt templates | Redline positions, rationale, vendor email draft |
| Exports | `docx` library and ICS generator | Native Word revisions and calendar files |

## Data flow

```text
Upload
  → text extraction with page / character offsets
  → structured extraction JSON
  → deterministic playbook matching
  → Executive Brief render
  → Source-Lock / CPI / redline / sync actions
  → .docx, .ics, and email artifacts
```

## Verification strategy

The hero flow should be tested in order: sample load, risk click, source highlight, confidence approval, auto-redline, redline export, and calendar sync. The critical checks are that the active clause is visually obvious, the confidence gate is not hidden, the CPI arithmetic is explained, and every action has a visible success state.

## Known prototype boundaries

The current static build does not perform live PDF parsing, call a hosted LLM, or produce OOXML tracked changes. It uses pre-processed demo data to make the UX reviewable and keeps those production boundaries documented rather than presenting canned output as live AI. The next engineering increment is a `web-db-user` upgrade with server-side parsing, secure model calls, persistent contract records, and real exports.

## Delivery checklist

- [x] Split-screen contract review experience
- [x] Source-Lock clause navigation
- [x] Risk severity and confidence states
- [x] Deterministic CPI exposure calculation
- [x] Obligation timeline and calendar download
- [x] Playbook matcher presentation
- [x] Three-tier redline interaction
- [x] Implementation, README, agent, and architecture documentation
- [ ] Live PDF/DOCX upload and parsing
- [ ] Server-side AI extraction and generation
- [ ] Native tracked-changes `.docx` export
- [ ] Authentication, persistence, and audit log

## Success criteria

A first-time reviewer should understand the product's promise within ten seconds, verify the highest-risk clause within fifteen seconds, and complete a meaningful action within one minute. The interface should feel like an operating console rather than a chatbot wrapper: every AI claim is paired with evidence, a confidence gate, and a next step.
