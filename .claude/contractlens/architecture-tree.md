# ContractLens Architecture Tree

```text
contractlens/
├── README.md                         # Product overview, setup, and demo walkthrough
├── implementation.md                 # Implementation blueprint and production path
├── agent.md                          # Extension, UX, data, and quality guidance
├── architecture-tree.md              # This repository map
├── client/
│   ├── index.html                   # Browser entrypoint and typography
│   ├── public/
│   │   ├── .gitkeep
│   │   └── __manus__/               # WebDev runtime support files
│   └── src/
│       ├── App.tsx                  # Top-level routing and theme shell
│       ├── main.tsx                 # React bootstrap
│       ├── index.css                # Design tokens, global styles, motion
│       ├── const.ts                 # Client constants
│       ├── pages/
│       │   ├── Home.tsx             # ContractLens review workspace
│       │   └── NotFound.tsx         # Fallback route
│       ├── components/
│       │   ├── ui/                  # shadcn/ui primitives from the template
│       │   ├── ErrorBoundary.tsx
│       │   ├── ManusDialog.tsx
│       │   └── Map.tsx
│       ├── contexts/
│       │   └── ThemeContext.tsx
│       ├── hooks/                   # Reusable client hooks
│       └── lib/
│           └── utils.ts
├── server/
│   └── index.ts                     # Template compatibility server (not used for AI)
├── shared/
│   └── const.ts                     # Shared template constants
├── package.json                     # React, Tailwind, Vite, and UI dependencies
├── vite.config.ts
├── tsconfig.json
└── patches/
    └── wouter@3.7.1.patch
```

## Logical runtime architecture

```text
[Contract file / demo sample]
            |
            v
[Parser: PDF.js + pdf-parse / mammoth in production]
            |
            v
[AI 1: Structured extraction JSON]
            |
            +--------------------------+
            |                          |
            v                          v
[AI 2: Playbook rules]       [Source-Lock clause map]
            |                          |
            +-------------+------------+
                          v
                 [ContractLens UI]
                  /       |        \
                 v        v         v
          [CPI math] [Timeline] [Redline generator]
                                      |
                                      v
                        [.docx / .ics / email artifacts]
```

## Prototype boundary

The current static build implements the right side of the experience with local, pre-processed data. The server and parser boxes are documented production seams, not hidden simulations. This keeps the demo transparent while making the next architecture step explicit.
