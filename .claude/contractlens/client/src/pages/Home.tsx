import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  Gavel,
  Layers3,
  LockKeyhole,
  Mail,
  MessageCircle,
  MoreHorizontal,
  PanelRight,
  Send,
  UserRound,
  Plus,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

type ClauseId = "cpi" | "renewal" | "liability" | "payment" | "jurisdiction";

type ContractProfile = {
  fileName: string;
  fileType: string;
  fileSize: string;
  pages: number;
  annualFees: number;
  cpi: number;
  matchScore: number;
  party: string;
  status: string;
};

type ChatMessage = { id: number; role: "user" | "assistant"; text: string; source?: string };
type Account = { name: string; email: string; password: string; occupation: string };

type Clause = {
  id: ClauseId;
  section: string;
  title: string;
  label: string;
  quote: string;
  detail: string;
  severity?: "high" | "medium" | "low";
  confidence?: number;
  page: number;
};

const clauses: Clause[] = [
  {
    id: "cpi",
    section: "7.2",
    title: "Dynamic CPI escalation",
    label: "Price increase right",
    quote:
      "Beginning on each anniversary of the Effective Date, Supplier may increase the Fees by the percentage increase in CPI plus three percent (3%).",
    detail:
      "The vendor can stack the latest CPI reading on top of a fixed 3% uplift every year. At the current run rate, that is an estimated $9.2k of avoidable annual exposure.",
    severity: "high",
    confidence: 81,
    page: 7,
  },
  {
    id: "renewal",
    section: "11.4",
    title: "Auto-renewal window",
    label: "Renewal notice",
    quote:
      "This Agreement will automatically renew for successive one-year terms unless either party provides written notice of non-renewal at least sixty (60) days prior to the then-current expiration date.",
    detail:
      "A missed notice window rolls the agreement for another year. The next decision date is 22 Nov 2026, with a 60-day notice requirement.",
    severity: "high",
    confidence: 96,
    page: 11,
  },
  {
    id: "liability",
    section: "9.1",
    title: "Uncapped liability",
    label: "Liability exposure",
    quote:
      "Except for amounts arising from a party's gross negligence, willful misconduct, or indemnification obligations, neither party's liability shall be limited.",
    detail:
      "The exception language leaves general commercial exposure without a clear cap. The recommended fallback is one times the annual contract value.",
    severity: "medium",
    confidence: 91,
    page: 9,
  },
  {
    id: "payment",
    section: "4.3",
    title: "Net-45 payment terms",
    label: "Payment obligation",
    quote:
      "Undisputed invoices are payable within forty-five (45) days after receipt of invoice.",
    detail:
      "The current term is five days outside the company playbook standard of Net-30.",
    severity: "medium",
    confidence: 99,
    page: 4,
  },
  {
    id: "jurisdiction",
    section: "14.2",
    title: "New York governing law",
    label: "Governing law",
    quote:
      "This Agreement shall be governed by and construed in accordance with the laws of the State of New York, without regard to conflict of law principles.",
    detail:
      "The company playbook prefers Delaware law for vendor agreements of this size.",
    severity: "low",
    confidence: 98,
    page: 14,
  },
];

const documentSections = [
  {
    heading: "1. Services & scope",
    body: "Supplier will provide the hosted analytics platform, implementation services, and premium support described in Exhibit A (the “Services”). Customer may add workspace seats through an order form.",
  },
  {
    heading: "4. Fees & payment",
    body: "Customer will pay the fees listed in the applicable Order Form. Fees exclude taxes and are invoiced annually in advance. Undisputed invoices are payable within forty-five (45) days after receipt of invoice.",
    clauseId: "payment" as ClauseId,
  },
  {
    heading: "7. Pricing adjustments",
    body: "The parties acknowledge that the Services are priced based on the current scope and usage assumptions. Any changes to the Services will be documented in an Order Form.",
  },
  {
    heading: "7.2 Dynamic CPI escalation",
    body: "Beginning on each anniversary of the Effective Date, Supplier may increase the Fees by the percentage increase in CPI plus three percent (3%). Supplier will provide Customer with at least thirty (30) days’ written notice of any adjustment. For clarity, the CPI adjustment will be calculated against the then-current Fees.",
    clauseId: "cpi" as ClauseId,
  },
  {
    heading: "9. Limitation of liability",
    body: "Except for amounts arising from a party's gross negligence, willful misconduct, or indemnification obligations, neither party's liability shall be limited. In no event will either party be liable for indirect, incidental, special, consequential, or punitive damages.",
    clauseId: "liability" as ClauseId,
  },
  {
    heading: "11. Term & renewal",
    body: "This Agreement begins on 01 Dec 2025 and continues for an initial term of twelve months. This Agreement will automatically renew for successive one-year terms unless either party provides written notice of non-renewal at least sixty (60) days prior to the then-current expiration date.",
    clauseId: "renewal" as ClauseId,
  },
  {
    heading: "14. General",
    body: "This Agreement is the complete agreement between the parties and may only be amended in writing. This Agreement shall be governed by and construed in accordance with the laws of the State of New York, without regard to conflict of law principles.",
    clauseId: "jurisdiction" as ClauseId,
  },
];

const playbookRules = [
  { label: "Net-30 payment terms", expectation: "≤ 30 days", status: "review", clauseId: "payment" as ClauseId },
  { label: "Delaware governing law", expectation: "Preferred", status: "fail", clauseId: "jurisdiction" as ClauseId },
  { label: "Liability cap", expectation: "1× annual fees", status: "fail", clauseId: "liability" as ClauseId },
  { label: "Mutual indemnity", expectation: "Required", status: "pass", clauseId: "liability" as ClauseId },
];

const navigation = [
  { label: "Review", icon: FileCheck2, active: true },
  { label: "Obligations", icon: Clock3 },
  { label: "Playbook", icon: ShieldCheck },
  { label: "Exports", icon: Download },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [activeClauseId, setActiveClauseId] = useState<ClauseId>("cpi");
  const [verified, setVerified] = useState(false);
  const [cpi, setCpi] = useState(3.2);
  const [redlineOpen, setRedlineOpen] = useState(false);
  const [assistantAnswer, setAssistantAnswer] = useState("Ask about a clause to see a grounded answer.");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showAllRisks, setShowAllRisks] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedFileSize, setSelectedFileSize] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("");
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [panelClosing, setPanelClosing] = useState(false);
  const [splitView, setSplitView] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMode, setAccountMode] = useState<"login" | "signup">("signup");
  const [account, setAccount] = useState<Account | null>(null);
  const [accountForm, setAccountForm] = useState<Account>({ name: "", email: "", password: "", occupation: "" });
  const [contractProfile, setContractProfile] = useState<ContractProfile>({
    fileName: "",
    fileType: "",
    fileSize: "",
    pages: 0,
    annualFees: 0,
    cpi: 0,
    matchScore: 0,
    party: "",
    status: "No file loaded",
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const clauseRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const activeClause = clauses.find((clause) => clause.id === activeClauseId) ?? clauses[0];
  const annualFees = contractProfile.annualFees;
  const annualizedExposure = useMemo(() => annualFees * ((cpi + 3) / 100), [annualFees, cpi]);
  const matchScore = verified ? Math.min(contractProfile.matchScore + 4, 99) : contractProfile.matchScore;
  const matchTone = matchScore <= 50 ? "red" : matchScore <= 80 ? "yellow" : "green";
  const activePage = Math.min(activeClause.page, contractProfile.pages);
  const displayedFileName = contractProfile.fileName;

  useEffect(() => {
    const target = clauseRefs.current[activeClauseId];
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeClauseId]);

  function closeWorkspacePanel() {
    if (!openPanel) return;
    setPanelClosing(true);
    window.setTimeout(() => {
      setOpenPanel(null);
      setPanelClosing(false);
    }, 180);
  }

  function openFilePicker() {
    if (!account) {
      toast.error("Please log in to upload files.");
      return;
    }
    fileInputRef.current?.click();
  }

  function submitAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountForm.name || !accountForm.email || !accountForm.password || !accountForm.occupation) {
      toast.error("Complete all fields", { description: "Name, email, password, and occupation are required." });
      return;
    }
    setAccount(accountForm);
    setAccountOpen(false);
    toast.success(accountMode === "signup" ? "Account created" : "Signed in", { description: `Welcome, ${accountForm.name}.` });
  }

  function openRedline() {
    if (!selectedFileName) {
      toast("Upload a contract first", { description: "Auto-redline becomes available after a PDF or DOCX is loaded." });
      return;
    }
    setRedlineOpen(true);
  }

  function handleUploadPanelClick(event: React.MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("label")) return;
    openFilePicker();
  }

  function focusClause(id: ClauseId, announce = true) {
    setActiveClauseId(id);
    const clause = clauses.find((item) => item.id === id);
    if (announce && clause) {
      toast(`Source-Lock: Section ${clause.section}`, {
        description: "The document is anchored to the quoted source clause.",
      });
    }
  }

  function approveExtraction() {
    setVerified(true);
    toast.success("Extraction approved", {
      description: "Section 7.2 is now marked as human-verified.",
    });
  }

  function exportCalendar() {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ContractLens//Obligations//EN",
      "BEGIN:VEVENT",
      "UID:contractlens-renewal-2026@contractlens.local",
      "DTSTAMP:20260919T000000Z",
      "DTSTART;VALUE=DATE:20261122",
      "SUMMARY:ContractLens renewal notice deadline",
      "DESCRIPTION:Review Enterprise SaaS Vendor Agreement renewal. 30-day and 7-day reminders enabled.",
      "BEGIN:VALARM",
      "TRIGGER:-P30D",
      "ACTION:DISPLAY",
      "DESCRIPTION:30-day renewal reminder",
      "END:VALARM",
      "BEGIN:VALARM",
      "TRIGGER:-P7D",
      "ACTION:DISPLAY",
      "DESCRIPTION:7-day renewal reminder",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    downloadFile("contractlens-obligations.ics", ics, "text/calendar");
    toast.success("Renewal alerts synced", { description: "The .ics file is ready to add to your calendar." });
  }

  function exportRedline() {
    const redline = `ContractLens redline draft\n\nSection 7.2 — Position A\nSupplier may increase Fees once per renewal year by the lesser of CPI or 3%, with 60 days' notice.\n\nPosition B\nAny annual increase will not exceed 3% and will not apply during the initial term.\n\nRationale\nRemoves stacked escalation and makes the financial exposure predictable.`;
    downloadFile("contractlens-redline-draft.txt", redline, "text/plain");
    setRedlineOpen(false);
    toast.success("Redline exported", { description: "The prototype redline draft has been downloaded." });
  }

  function choosePrompt(prompt: string) {
    submitChatMessage(prompt);
  }

  function submitChatMessage(rawQuestion = chatInput) {
    const question = rawQuestion.trim();
    if (!question) return;
    const lower = question.toLowerCase();
    const matched = lower.includes("payment") || lower.includes("invoice") || lower.includes("net-30") || lower.includes("net 30")
      ? clauses.find((clause) => clause.id === "payment")
      : lower.includes("price") || lower.includes("cpi") || lower.includes("increase") || lower.includes("uplift")
        ? clauses.find((clause) => clause.id === "cpi")
        : lower.includes("renew") || lower.includes("notice")
          ? clauses.find((clause) => clause.id === "renewal")
          : lower.includes("liability") || lower.includes("cap")
            ? clauses.find((clause) => clause.id === "liability")
            : lower.includes("law") || lower.includes("jurisdiction")
              ? clauses.find((clause) => clause.id === "jurisdiction")
              : lower.includes("termination")
                ? undefined
                : null;
    let answer = "";
    let source = "Contract scope only";
    if (matched) {
      answer = matched.id === "payment"
        ? "The contract gives the customer 45 days to pay an invoice. The company prefers 30 days, so this needs review."
        : matched.id === "cpi"
          ? `Each year, the vendor can raise the price by CPI plus 3%. The estimated yearly increase is ${formatMoney(annualizedExposure)}.`
          : matched.id === "renewal"
            ? "The contract renews for another year unless notice is sent at least 60 days before it ends."
            : matched.id === "liability"
              ? "The contract does not set a clear limit on liability. The company prefers a limit of one year of contract fees."
              : "The contract uses New York law. The company prefers Delaware law.";
      source = `Section ${matched.section} · page ${matched.page}`;
      setActiveClauseId(matched.id);
    } else if (lower.includes("termination")) {
      answer = "I could not find a right for the customer to end the contract early for convenience. Please ask a lawyer to confirm this.";
      source = "Termination review · contract extraction";
    } else {
      answer = "I can only answer questions about this contract PDF. Try asking about payment, price increases, renewal, liability, governing law, or ending the contract.";
    }
    setChatMessages((messages) => [
      ...messages,
      { id: Date.now(), role: "user", text: question },
      { id: Date.now() + 1, role: "assistant", text: answer, source },
    ]);
    setAssistantAnswer(answer);
    setChatInput("");
    toast("Contract assistant grounded", { description: source });
  }

  function handleLocalFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const sizeInMb = file.size / (1024 * 1024);
    const extension = file.name.split(".").pop()?.toUpperCase() || "DOCUMENT";
    const sizeSeed = Math.max(file.size, 1);
    const inferredFees = 50000 + (sizeSeed % 180000);
    const inferredCpi = Number((2.1 + ((sizeSeed % 260) / 100)).toFixed(1));
    const inferredScore = 60 + (sizeSeed % 31);
    const inferredPages = 6 + (sizeSeed % 26);
    const profile: ContractProfile = {
      fileName: file.name,
      fileType: extension,
      fileSize: sizeInMb < 1 ? `${Math.max(file.size / 1024, 1).toFixed(0)} KB` : `${sizeInMb.toFixed(1)} MB`,
      pages: inferredPages,
      annualFees: inferredFees,
      cpi: inferredCpi,
      matchScore: inferredScore,
      party: file.name.replace(/[-_]/g, " ").replace(/\.[^/.]+$/, "").slice(0, 38) || "Uploaded counterparty",
      status: "Ready for review",
    };
    setSelectedFileName(file.name);
    setSelectedFileSize(profile.fileSize);
    setSelectedFileType(extension);
    setContractProfile(profile);
    setCpi(inferredCpi);
    setVerified(false);
    setSplitView(true);
    setPanelClosing(false);
    setOpenPanel("File details");
    toast.success("File loaded into the workspace", {
      description: `${file.name} now drives the visible contract metrics and review details.`,
    });
  }

  return (
    <div className="min-h-screen bg-[#eeeae0] text-[#202522]">
      <aside className="workspace-sidebar fixed inset-y-0 left-0 z-30 hidden w-[236px] flex-col border-r border-[#d8d4c9] bg-[#fbfaf7] text-[#202522] lg:flex">
        <div className="flex items-center gap-3 px-6 pb-8 pt-7">
          <div className="brand-mark">CL</div>
          <div>
            <p className="font-display text-[15px] font-semibold tracking-[-0.02em]">Clauselock AI</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[#9ea79c]">Ops workspace</p>
          </div>
        </div>

        <div className="px-4">
          <p className="eyebrow px-3 pb-3 text-[#828a80]">Workspace</p>
          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  className={`sidebar-item ${item.active ? "sidebar-item-active" : ""}`}
                  onClick={() => { if (item.active) { setOpenPanel(null); return; } setPanelClosing(false); setOpenPanel(item.label); toast(`${item.label} opened`, { description: `The ${item.label.toLowerCase()} panel is now visible.` }); }}
                >
                  <Icon size={17} strokeWidth={1.7} />
                  <span>{item.label}</span>
                  {item.label === "Obligations" && <span className="ml-auto text-[10px] text-[#9ea79c]">3</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-10 px-4">
          <p className="eyebrow px-3 pb-3 text-[#828a80]">Quick actions</p>
          <button className="sidebar-item" onClick={() => fileInputRef.current?.click()}>
            <Plus size={17} strokeWidth={1.7} />
            <span>Upload contract</span>
          </button>
          <button className="sidebar-item" onClick={() => toast("Playbook synced", { description: "4 policy checks loaded from the local demo ruleset." })}>
            <Layers3 size={17} strokeWidth={1.7} />
            <span>Sync playbook</span>
          </button>
        </div>

        <div className="mt-auto px-4 pb-5">
          <button className="account-entry" onClick={() => setAccountOpen(true)}>
            {account ? <div className="avatar">{account.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div> : <div className="account-entry-icon"><UserRound size={17} /></div>}
            <div className="min-w-0 text-left">
              <p className="truncate text-[12px] font-semibold">{account ? account.name : "Login / Sign up"}</p>
              <p className="truncate text-[10px] text-[#b8c4d3]">{account ? account.occupation : "Create your workspace profile"}</p>
            </div>
            <MoreHorizontal className="ml-auto text-[#b8c4d3]" size={16} />
          </button>
        </div>
      </aside>

      <main className="lg:pl-[236px]">
        <header className="sticky top-0 z-20 flex h-[70px] items-center justify-between border-b border-[#d8d4c9]/80 bg-[#eeeae0]/90 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <div className="brand-mark brand-mark-small lg:hidden">CL</div>
            <div className="hidden items-center gap-2 text-[12px] text-[#778077] sm:flex">
              <span>Contracts</span>
              <ChevronRight size={13} />
              <span className="font-medium text-[#202522]">Review workspace</span>
            </div>
            <span className="mobile-title font-display text-[15px] font-semibold lg:hidden">Clauselock AI</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-2 text-[11px] text-[#778077] md:flex">
              <span className="status-dot" />
              {selectedFileName ? "AI extraction ready" : "Upload a contract to begin"}
            </div>
            <button className="icon-button" aria-label="Help" onClick={() => toast("Clauselock AI demo", { description: "Evidence first. Actions second." })}><CircleHelp size={17} /></button>
            <button className="icon-button" aria-label="Notifications" onClick={() => toast("No new review tasks", { description: "All current obligations are visible below." })}><BellRing size={17} /></button>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] px-4 pb-12 pt-6 sm:px-8 lg:px-10">
          <section className="mb-5 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="eyebrow text-[#778077]">{selectedFileName ? "Reviewing contract" : "Workspace ready"}</span>
                <span className="rounded-full bg-[#dfe6d1] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4c6244]">{selectedFileName ? "In review" : "No file loaded"}</span>
              </div>
              <h1 className="font-display max-w-3xl text-[clamp(28px,4vw,49px)] font-semibold leading-[0.98] tracking-[-0.055em] text-[#202522]">Review workspace</h1>
              <p className="mt-3 flex items-center gap-2 text-[13px] text-[#687169]"><FileText size={14} /> {selectedFileName ? `${contractProfile.party} · ${contractProfile.status}` : "No contract loaded · Upload a PDF or DOCX to begin"}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="icon-button bg-[#f6f2e9]" aria-label="Search contract" onClick={() => toast("Search is scoped to this contract", { description: "Try clicking a risk card to jump to its clause." })}><Search size={17} /></button>
              <button className="secondary-button" onClick={() => toast("File actions opened", { description: "Download, duplicate, and archive are staged for the next increment." })}><MoreHorizontal size={16} /> <span className="hidden sm:inline">More</span></button>
              {selectedFileName && <Button className="lime-button" onClick={openRedline}><Sparkles size={16} /> Auto-redline</Button>}
            </div>
          </section>

          <div className="upload-panel mb-6" role="button" tabIndex={0} aria-label={selectedFileName ? "Choose another contract file" : "Upload a contract file"} onClick={handleUploadPanelClick} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openFilePicker(); } }}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="upload-icon">{selectedFileName ? <Check size={17} /> : <Plus size={17} />}</div>
              <div className="min-w-0"><p className="text-[12px] font-semibold text-[#f5f8fc]">{selectedFileName ? "File ready in workspace" : "Add a contract from your drive"}</p><p className="mt-1 truncate text-[10px] text-[#b8c4d3]">{selectedFileName || "PDF or DOCX · up to 25 MB"}</p></div>
            </div>
            {selectedFileName && <div className="hidden items-center gap-3 text-[10px] text-[#c9d8e6] md:flex"><span>{selectedFileType}</span><span>·</span><span>{selectedFileSize}</span><span>·</span><span className="text-[#d08b5e]">Ready for review</span></div>}
            <label className="upload-button"><Download size={14} /> {selectedFileName ? "Choose another" : "Choose file"}<input ref={fileInputRef} className="sr-only" type="file" accept=".pdf,.doc,.docx" onChange={handleLocalFile} /></label>
          </div>

          {selectedFileName && <>
          <div className="mb-6 flex flex-wrap gap-2">
            <div className="meta-chip"><span className="meta-label">Type</span><span>Vendor MSA</span></div>
            <div className="meta-chip"><span className="meta-label">Term</span><span>01 Dec 25 — 30 Nov 26</span></div>
            <div className="meta-chip"><span className="meta-label">Annual value</span><span>{formatMoney(annualFees)}</span></div>
            <div className="meta-chip"><span className="meta-label">Notice window</span><span>60 days</span></div>
            <div className="meta-chip source-chip"><LockKeyhole size={13} /><span>Source-Lock on</span></div>
          </div>

          <div className={`workspace-grid grid gap-5 ${splitView ? "workspace-grid-split xl:grid-cols-[minmax(430px,0.84fr)_minmax(0,1.16fr)]" : "workspace-grid-full"}`}>
            <section className="insight-card order-1 min-h-[690px] overflow-hidden">
              <div className="flex items-start justify-between border-b border-[#3a4a5d] px-5 py-5 sm:px-6">
                <div><div className="flex items-center gap-2"><Sparkles size={16} className="text-[#d08b5e]" /><p className="eyebrow text-[#b8c4d3]">Executive brief</p></div><h2 className="mt-2 font-display text-[24px] font-semibold tracking-[-0.045em] text-[#f5f8fc]">The contract needs attention.</h2><p className="mt-2 max-w-md text-[12px] leading-5 text-[#b8c4d3]">Three terms create financial or workflow exposure against the Northstar playbook.</p></div>
                <button className="icon-button icon-button-dark" aria-label="Executive brief options" onClick={() => toast("Brief options", { description: "Share and pin actions are staged for the next increment." })}><MoreHorizontal size={17} /></button>
              </div>
              <div className="p-5 sm:p-6">
                <div className={`score-panel score-panel-${matchTone}`}>
                  <div><p className="eyebrow text-[#b8c4d3]">Playbook match</p><div className="mt-2 flex items-end gap-2"><span className="font-display text-[52px] font-semibold leading-none tracking-[-0.07em] text-[#f5f8fc]">{matchScore}</span><span className="mb-1 text-[16px] text-[#b8c4d3]">/ 100</span></div><p className="mt-2 text-[11px] score-status-text">{matchTone === "red" ? "Red · playbook mismatch" : matchTone === "yellow" ? "Yellow · review before sign-off" : "Green · strong playbook match"}</p></div><div className="score-orbit"><div className="score-orbit-inner"><span>{matchScore}%</span><small>match</small></div></div>
                </div>
                <div className="mt-6 flex items-center justify-between"><p className="eyebrow text-[#b8c4d3]">Risk breakdown</p><button className="text-[11px] font-semibold text-[#d08b5e]" onClick={() => setShowAllRisks((value) => !value)}>{showAllRisks ? "Show less" : "View all risks"}</button></div>
                <div className="mt-3 space-y-2">{clauses.filter((clause) => clause.severity === "high" || showAllRisks).map((clause) => { const active = clause.id === activeClauseId; const high = clause.severity === "high"; return <button key={clause.id} className={`risk-row ${active ? "risk-row-active" : ""}`} onClick={() => { focusClause(clause.id); setPanelClosing(false); setOpenPanel(`Risk: ${clause.title}`); }}><span className={`risk-icon ${high ? "risk-icon-high" : clause.severity === "medium" ? "risk-icon-medium" : "risk-icon-low"}`}>{high ? <AlertTriangle size={14} /> : <Scale size={14} />}</span><span className="min-w-0 text-left"><span className="block truncate text-[12px] font-semibold text-[#f5f8fc]">{clause.title}</span><span className="mt-1 block text-[10px] text-[#b8c4d3]">Section {clause.section} · {clause.confidence}% confidence</span></span><ChevronRight className="ml-auto text-[#92a2b7]" size={15} /></button>; })}</div>
                <div className="mt-5 rounded-2xl border border-[#53677d] bg-[#203b64] p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[#e9c6a8]"><Zap size={14} fill="currentColor" /><span className="eyebrow text-[#e9c6a8]">Financial exposure</span></div><span className="rounded-full bg-[#38547a] px-2 py-1 text-[10px] font-semibold text-[#e9c6a8]">CPI + 3%</span></div><div className="mt-4 flex items-end justify-between gap-3"><div><p className="font-display text-[30px] font-semibold leading-none tracking-[-0.05em] text-[#f5f8fc]">{formatMoney(annualizedExposure)}</p><p className="mt-2 text-[11px] text-[#b8c4d3]">modeled annual uplift on {formatMoney(annualFees)} base</p></div><div className="text-right"><label className="text-[10px] uppercase tracking-[0.12em] text-[#b8c4d3]" htmlFor="cpi-input">Current CPI</label><div className="mt-1 flex items-center rounded-lg border border-[#61768a] bg-[#172f52] px-2"><input id="cpi-input" value={cpi} onChange={(event) => { const next = Number(event.target.value) || 0; setCpi(next); setContractProfile((profile) => ({ ...profile, cpi: next })); }} className="w-12 bg-transparent py-1.5 text-right text-[12px] font-semibold text-[#f5f8fc] outline-none" type="number" step="0.1" min="0" max="20" /><span className="text-[12px] text-[#b8c4d3]">%</span></div></div></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#53677d]"><div className="h-full rounded-full bg-[#d08b5e]" style={{ width: `${Math.min((cpi / 8) * 100, 100)}%` }} /></div><p className="mt-2 text-[10px] leading-4 text-[#b8c4d3]">Computed in browser code from the extracted formula; not generated by the model.</p></div>
                {!verified ? <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#80634d] bg-[#4a3b35] p-4"><div className="mt-0.5 rounded-full bg-[#d08b5e]/20 p-1.5 text-[#e9c6a8]"><CircleHelp size={15} /></div><div className="min-w-0 flex-1"><p className="text-[12px] font-semibold text-[#f5f8fc]">Human verification required</p><p className="mt-1 text-[11px] leading-5 text-[#d7c9c0]">Section 7.2 extracted at 81% confidence. Approve the quoted clause before using it in a negotiation.</p><button className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold text-[#e9c6a8]" onClick={approveExtraction}>Approve extraction <Check size={13} /></button></div></div> : <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[#587b98] bg-[#294d71] p-4"><div className="rounded-full bg-[#d08b5e]/15 p-1.5 text-[#e9c6a8]"><CheckCircle2 size={15} /></div><div><p className="text-[12px] font-semibold text-[#f5f8fc]">Human verified</p><p className="mt-1 text-[11px] text-[#c4d2e0]">Section 7.2 is approved for action.</p></div></div>}
                <div className="mt-6 flex gap-2"><button className="lime-button flex-1 justify-center" onClick={openRedline}><Sparkles size={15} /> Generate redline</button><button className="secondary-button secondary-button-dark" onClick={exportCalendar}><CalendarDays size={15} /> Sync dates</button></div>
              </div>
            </section>

            <section className="paper-card order-2 min-h-[690px] overflow-hidden">
              <div className="flex flex-col justify-between gap-3 border-b border-[#e2ddd2] px-5 py-4 sm:flex-row sm:items-center sm:px-7">
                <div className="flex items-center gap-3">
                  <div className="file-icon"><FileText size={17} /></div>
                  <div>
                    <div className="flex items-center gap-2"><p className="text-[13px] font-semibold">{displayedFileName}</p><span className="file-tag">{selectedFileType || "PDF"}</span></div>
                    <p className="mt-1 text-[11px] text-[#899087]">{contractProfile.pages} pages · {contractProfile.status} · page map ready</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#899087]"><BookOpen size={14} /> <span>Page {activePage} of {contractProfile.pages}</span><span className="mx-1 h-4 w-px bg-[#dbd6cc]" /><button className="split-view-toggle" aria-pressed={splitView} onClick={() => { const next = !splitView; setSplitView(next); toast.success(next ? "Split view active" : "Split view closed", { description: next ? "Active Document and Source-Lock are on the left; the PDF is on the right." : "The PDF is back in the full-width document layout." }); }}><PanelRight size={14} /> <span>{splitView ? "Cancel split view" : "Split view"}</span></button></div>
              </div>

              <div className={`grid min-h-[625px] lg:grid-cols-[220px_minmax(0,1fr)] ${splitView ? "document-grid-split" : "document-grid-full"}`}>
                <div className="document-scroll px-5 py-7 sm:px-10 sm:py-9">
                  <div className="mb-9 border-b border-[#e3ded3] pb-6">
                    <p className="font-display text-[20px] font-semibold tracking-[-0.04em]">Enterprise SaaS Vendor Agreement</p>
                    <p className="mt-2 max-w-xl text-[11px] leading-5 text-[#858b83]">This Enterprise SaaS Vendor Agreement is entered into as of December 1, 2025 by and between Zenith Cloud Systems, Inc. (“Supplier”) and Northstar Goods Co. (“Customer”).</p>
                    <div className="mt-5 grid grid-cols-2 gap-4 text-[10px] uppercase tracking-[0.12em] text-[#9a9f97] sm:grid-cols-4"><div><span className="block text-[#59625a]">Effective</span><strong className="mt-1 block font-medium normal-case tracking-normal text-[#303631]">01 Dec 2025</strong></div><div><span className="block text-[#59625a]">Expiry</span><strong className="mt-1 block font-medium normal-case tracking-normal text-[#303631]">30 Nov 2026</strong></div><div><span className="block text-[#59625a]">Customer</span><strong className="mt-1 block font-medium normal-case tracking-normal text-[#303631]">Northstar Goods</strong></div><div><span className="block text-[#59625a]">Supplier</span><strong className="mt-1 block font-medium normal-case tracking-normal text-[#303631]">Zenith Cloud</strong></div></div>
                  </div>

                  <div className="space-y-5">
                    {documentSections.map((section, index) => {
                      const active = section.clauseId === activeClauseId;
                      const clause = section.clauseId ? clauses.find((item) => item.id === section.clauseId) : undefined;
                      return (
                        <div
                          key={section.heading}
                          ref={(node) => { if (section.clauseId) clauseRefs.current[section.clauseId] = node; }}
                          className={`document-clause ${clause ? `document-clause-risk-${clause.severity ?? "low"}` : ""} ${active ? "document-clause-active" : ""}`}
                          onClick={() => section.clauseId && focusClause(section.clauseId, false)}
                        >
                          <div className="mb-2 flex items-start justify-between gap-4"><p className="font-display text-[13px] font-semibold tracking-[-0.02em] text-[#303631]">{section.heading}</p>{clause && <span className={`clause-marker clause-marker-${clause.severity ?? "low"} ${active ? "clause-marker-active" : ""}`}>{active ? <LockKeyhole size={12} /> : <span>{clause.section}</span>}</span>}</div>
                          <p className="text-[12px] leading-[1.8] text-[#687169]">{section.body}</p>
                          {active && clause && <div className={`source-lock-line source-lock-line-${clause.severity ?? "low"}`}><LockKeyhole size={12} /><span>Source-Lock active · {clause.confidence}% extraction confidence</span><span className="ml-auto">p. {activePage}</span></div>}
                          {index === 0 && <div className="document-rule" />}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-9 flex items-center gap-3 border-t border-[#e5e0d5] pt-5 text-[10px] uppercase tracking-[0.14em] text-[#a0a49d]"><span className="h-1.5 w-1.5 rounded-full bg-[#b9c1b5]" /> <span>End of visible page</span><span className="ml-auto">{activePage} / {contractProfile.pages}</span></div>
                </div>

                <aside className="border-t border-[#e2ddd2] bg-[#f3efe6] p-5 lg:border-l lg:border-t-0">
                  <p className="eyebrow text-[#8a9188]">Active document</p>
                  <h2 className="mt-3 font-display text-[22px] font-semibold leading-[1.05] tracking-[-0.045em] text-[#202522]">Enterprise SaaS Vendor Agreement</h2>
                  <p className="mt-2 text-[11px] leading-5 text-[#7d857c]">Zenith Cloud Systems, Inc. · Vendor MSA</p>
                  <div className="my-5 h-px bg-[#ded9ce]" />
                  <p className="eyebrow text-[#8a9188]">Source-Lock</p>
                  <div className="mt-4 rounded-2xl border border-[#d9e0cd] bg-[#edf3df] p-4">
                    <div className="flex items-center gap-2 text-[#587046]"><LockKeyhole size={14} /><span className="text-[10px] font-bold uppercase tracking-[0.16em]">Grounded finding</span></div>
                    <p className="mt-3 font-display text-[17px] font-semibold leading-tight tracking-[-0.035em] text-[#273026]">{activeClause.title}</p>
                    <p className="mt-2 text-[11px] leading-5 text-[#68745f]">{activeClause.label} · Section {activeClause.section}</p>
                  </div>
                  <div className="mt-5"><p className="eyebrow text-[#8a9188]">Quoted source</p><p className="mt-3 border-l-2 border-[#abc37d] pl-3 text-[11px] leading-5 text-[#636c64]">“{activeClause.quote}”</p></div>
                  <button className="mt-5 flex w-full items-center justify-between rounded-xl border border-[#d8d4c9] bg-[#f8f5ee] px-3 py-2.5 text-left text-[11px] font-semibold text-[#4b554c] transition hover:border-[#abb9a1] hover:bg-white" onClick={() => { navigator.clipboard?.writeText(activeClause.quote); toast.success("Source quote copied", { description: `Section ${activeClause.section} copied to your clipboard.` }); }}><span>Copy source quote</span><ArrowUpRight size={14} /></button>
                  <div className="mt-7 border-t border-[#ded9ce] pt-5"><p className="eyebrow text-[#8a9188]">Reverse lookup</p><p className="mt-2 text-[11px] leading-5 text-[#7c847b]">Click any highlighted passage to update the connected finding.</p><div className="mt-3 flex items-center gap-2 text-[11px] font-medium text-[#556052]"><span className="h-2 w-2 rounded-full bg-[#c8ff42]" /> Bi-directional</div></div>
                </aside>
              </div>
            </section>

          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
            <section className="soft-card p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="eyebrow text-[#8b9389]">Obligation engine</p><h2 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.04em]">Dates that need a human.</h2></div><button className="secondary-button" onClick={exportCalendar}><Download size={14} /> .ics export</button></div><div className="timeline mt-7"><div className="timeline-line" />{[{ date: "01 Dec 25", title: "Agreement signed", detail: "Effective date", icon: FileText, tone: "done" }, { date: "15 Jan 26", title: "Invoice due", detail: "Net-45 payment", icon: Clock3, tone: "done" }, { date: "22 Nov 26", title: "Renewal notice", detail: "60-day window", icon: BellRing, tone: "alert" }, { date: "30 Nov 26", title: "Term expires", detail: "Action required", icon: CalendarDays, tone: "next" }].map((item) => { const Icon = item.icon; return <div className="timeline-item" key={item.title}><div className={`timeline-icon timeline-icon-${item.tone}`}><Icon size={14} /></div><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#899187]">{item.date}</p><p className="mt-1 text-[12px] font-semibold text-[#313832]">{item.title}</p><p className="mt-1 text-[11px] text-[#7e877d]">{item.detail}</p></div></div>; })}</div></section>

            <section className="soft-card p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="eyebrow text-[#8b9389]">Company playbook</p><h2 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.04em]">Policy fit at a glance.</h2></div><button className="icon-button" aria-label="Playbook details" onClick={() => toast("Playbook details", { description: "Rules are local JSON in this static demo." })}><MoreHorizontal size={17} /></button></div><div className="mt-5 divide-y divide-[#e4dfd4]">{playbookRules.map((rule) => <button key={rule.label} className="flex w-full items-center gap-3 py-3 text-left" onClick={() => { focusClause(rule.clauseId); setPanelClosing(false); setOpenPanel("Playbook"); }}><span className={`playbook-status playbook-${rule.status}`}>{rule.status === "pass" ? <Check size={13} /> : rule.status === "review" ? <CircleHelp size={13} /> : <X size={13} />}</span><span className="min-w-0 flex-1"><span className="block text-[12px] font-semibold text-[#39423a]">{rule.label}</span><span className="mt-1 block text-[10px] text-[#929991]">Target: {rule.expectation}</span></span><span className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${rule.status === "pass" ? "text-[#688258]" : rule.status === "review" ? "text-[#a17c34]" : "text-[#ac6557]"}`}>{rule.status}</span><ChevronRight size={14} className="text-[#a6ada4]" /></button>)}</div></section>
          </div>

          </>}

          <section className="assistant-bar mt-5"><div className="flex min-w-0 items-start gap-3"><div className="assistant-icon"><MessageCircle size={17} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="eyebrow text-[#c8ff42]">Grounded assistant</p><span className="rounded-full border border-[#52614e] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#a9b8a1]">PDF only · session only</span></div><p className="mt-2 text-[11px] leading-5 text-[#aeb9ad]">{selectedFileName ? "Ask a simple question about this contract. I will answer from this PDF only." : "Upload a contract first. I can then answer questions using that PDF only."}</p>{chatMessages.length > 0 && <div className="chat-thread" aria-live="polite">{chatMessages.slice(-6).map((message) => <div key={message.id} className={`chat-message chat-message-${message.role}`}><span>{message.text}</span>{message.role === "assistant" && message.source && <small>{message.source}</small>}</div>)}</div>}{chatMessages.length === 0 && <p className="mt-3 text-[12px] leading-5 text-[#d6ddd2]">{selectedFileName ? assistantAnswer : "No contract is loaded yet."}</p>}<form className="chat-composer mt-4" onSubmit={(event) => { event.preventDefault(); submitChatMessage(); }}><input aria-label="Ask about the contract PDF" disabled={!selectedFileName} value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder={selectedFileName ? "Ask a question about this PDF…" : "Upload a PDF to start chatting…"} /><button type="submit" aria-label="Send contract question" disabled={!selectedFileName}><Send size={15} /></button></form>{selectedFileName && <div className="chat-prompts mt-3"><p>Quick questions</p>{["Payment obligations", "Price-raise rights", "Early termination"].map((prompt) => <button key={prompt} className="prompt-chip" onClick={() => choosePrompt(prompt)}>{prompt}<ArrowUpRight size={12} /></button>)}</div>}</div></div></section>

          <footer className="mt-6 flex flex-col gap-2 border-t border-[#d8d4c9] pt-5 text-[10px] text-[#949c92] sm:flex-row sm:items-center sm:justify-between"><p>Clauselock AI · Secure contract workspace</p><p className="flex items-center gap-2"><LockKeyhole size={12} /> Source-Lock evidence layer active</p></footer>
        </div>
      </main>


      {accountOpen && <div className="account-backdrop" role="presentation" onClick={() => setAccountOpen(false)}><section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><p className="eyebrow text-[#7186a1]">Workspace account</p><h2 id="account-title" className="mt-2 font-display text-[28px] font-semibold tracking-[-0.05em] text-[#172231]">{accountMode === "signup" ? "Create your profile" : "Welcome back"}</h2><p className="mt-2 text-[12px] leading-5 text-[#6e8195]">Use your account to personalize contract reviews.</p></div><button className="icon-button" onClick={() => setAccountOpen(false)} aria-label="Close account dialog"><X size={16} /></button></div><div className="account-tabs"><button className={accountMode === "login" ? "account-tab account-tab-active" : "account-tab"} onClick={() => setAccountMode("login")}>Log in</button><button className={accountMode === "signup" ? "account-tab account-tab-active" : "account-tab"} onClick={() => setAccountMode("signup")}>Sign up</button></div><form className="account-form" onSubmit={submitAccount}><label>Name<input required value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} placeholder="Your name" /></label><label>Email<input required type="email" value={accountForm.email} onChange={(event) => setAccountForm({ ...accountForm, email: event.target.value })} placeholder="you@company.com" /></label><label>Password<input required type="password" value={accountForm.password} onChange={(event) => setAccountForm({ ...accountForm, password: event.target.value })} placeholder="Create a password" /></label><label>Occupation<input required value={accountForm.occupation} onChange={(event) => setAccountForm({ ...accountForm, occupation: event.target.value })} placeholder="e.g. Legal operations" /></label><button className="account-submit" type="submit">{accountMode === "signup" ? "Create account" : "Log in"}</button></form></section></div>}
      {openPanel && <div className="panel-backdrop" role="presentation" onClick={closeWorkspacePanel}><section className={`workspace-panel ${panelClosing ? "panel-closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="workspace-panel-title" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between border-b border-[#d4deea] px-5 py-4"><div><p className="eyebrow text-[#637a93]">Workspace module</p><h2 id="workspace-panel-title" className="mt-2 font-display text-[24px] font-semibold tracking-[-0.04em] text-[#172231]">{openPanel}</h2></div><button className="icon-button" onClick={() => setOpenPanel(null)} aria-label="Close panel"><X size={16} /></button></div><div className="p-5">{openPanel === "Obligations" && <div className="panel-content"><p>Upcoming dates extracted from the active contract.</p><div className="panel-list"><div><strong>22 Nov 2026</strong><span>Renewal notice deadline · 60-day window</span></div><div><strong>30 Nov 2026</strong><span>Term expires · action required</span></div></div><button className="lime-button mt-5" onClick={exportCalendar}><CalendarDays size={15} /> Export calendar alerts</button></div>}{openPanel === "Playbook" && <div className="panel-content"><p>Northstar’s current contract policy checks.</p><div className="panel-list">{playbookRules.map((rule) => <div key={rule.label}><strong>{rule.label}</strong><span>{rule.status.toUpperCase()} · target {rule.expectation}</span></div>)}</div></div>}{openPanel === "Exports" && <div className="panel-content"><p>Generate grounded artifacts from this review.</p><div className="panel-actions"><button className="secondary-button" onClick={openRedline}><Sparkles size={15} /> Open redline</button><button className="secondary-button" onClick={exportCalendar}><CalendarDays size={15} /> Export .ics</button><button className="secondary-button" onClick={exportRedline}><Download size={15} /> Export draft</button></div></div>}{openPanel?.startsWith("Risk:") && <div className="panel-content"><div className="risk-detail-panel"><div className="risk-detail-icon"><AlertTriangle size={17} /></div><p className="eyebrow text-[#8c6a50]">Grounded risk finding</p><h3 className="mt-2 font-display text-[22px] font-semibold text-[#172231]">{activeClause.title}</h3><p className="mt-2 text-[12px] text-[#6e8195]">Section {activeClause.section} · {activeClause.confidence}% extraction confidence · Page {activePage}</p><p className="mt-5 text-[13px] leading-6 text-[#4f647b]">{activeClause.detail}</p><blockquote className="mt-5 border-l-2 border-[#d08b5e] pl-3 text-[12px] leading-5 text-[#6e8195]">“{activeClause.quote}”</blockquote><div className="panel-actions"><button className="secondary-button" onClick={() => { setOpenPanel(null); openRedline(); }}><Sparkles size={15} /> Open redline</button><button className="secondary-button" onClick={approveExtraction}><Check size={15} /> Approve finding</button></div></div></div>}{openPanel === "File details" && <div className="panel-content"><div className="file-detail-card"><div className="file-detail-icon"><FileText size={18} /></div><p className="eyebrow text-[#637a93]">Loaded contract</p><h3 className="mt-2 break-words font-display text-[22px] font-semibold text-[#172231]">{contractProfile.fileName}</h3><div className="file-detail-grid"><div><span>Type</span><strong>{contractProfile.fileType}</strong></div><div><span>Size</span><strong>{contractProfile.fileSize}</strong></div><div><span>Pages</span><strong>{contractProfile.pages}</strong></div><div><span>Status</span><strong>{contractProfile.status}</strong></div><div><span>Annual value</span><strong>{formatMoney(contractProfile.annualFees)}</strong></div><div><span>Playbook match</span><strong>{matchScore}%</strong></div></div><p className="mt-5 text-[11px] leading-5 text-[#6e8195]">This static prototype derives the visible metrics from the selected file’s local metadata. Connect the production parser to replace these inferred values with clause-level extraction.</p></div></div>}</div></section></div>}
      {redlineOpen && selectedFileName && <div className="modal-backdrop" role="presentation" onClick={() => setRedlineOpen(false)}><section className="redline-drawer" role="dialog" aria-modal="true" aria-labelledby="redline-title" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between border-b border-[#3e473e] px-6 py-5"><div><div className="flex items-center gap-2 text-[#c8ff42]"><Sparkles size={15} /><p className="eyebrow text-[#a9b8a1]">AI generation layer</p></div><h2 id="redline-title" className="mt-2 font-display text-[27px] font-semibold tracking-[-0.05em] text-[#f5f1e8]">A more workable Section 7.2.</h2><p className="mt-2 max-w-lg text-[12px] leading-5 text-[#aeb6aa]">Three negotiation positions, grounded in the selected source clause and the Northstar playbook.</p></div><button className="icon-button icon-button-dark" aria-label="Close redline drawer" onClick={() => setRedlineOpen(false)}><X size={17} /></button></div><div className="flex-1 overflow-y-auto px-6 py-6"><div className="redline-grid"><div className="redline-option redline-option-ideal"><div className="flex items-center justify-between"><span className="redline-label">Position A · Ideal</span><span className="redline-badge">Preferred</span></div><p className="mt-4 text-[13px] font-semibold leading-6 text-[#eff6e7]">“Supplier may increase Fees once per renewal year by the lesser of CPI or 3%, with 60 days' written notice.”</p><div className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-[#b2c0a9]"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#c8ff42]" /> Removes stacking and keeps the annual increase predictable.</div></div><div className="redline-option"><div className="flex items-center justify-between"><span className="redline-label">Position B · Fallback</span><span className="redline-badge redline-badge-muted">Acceptable</span></div><p className="mt-4 text-[13px] font-semibold leading-6 text-[#eff6e7]">“Any annual increase will not exceed 3% and will not apply during the initial term.”</p><div className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-[#b2c0a9]"><Scale size={14} className="mt-0.5 shrink-0 text-[#e7d99e]" /> Caps downside while preserving a vendor uplift path.</div></div></div><div className="mt-5 rounded-2xl border border-[#4a5548] bg-[#2c352d] p-5"><div className="flex items-center gap-2 text-[#e7d99e]"><Gavel size={15} /><span className="eyebrow text-[#c9bd8c]">Negotiation rationale</span></div><p className="mt-3 text-[12px] leading-6 text-[#c6d0c2]">The current clause allows CPI to compound on top of a fixed 3% uplift. The ideal position converts the formula into a single ceiling, which directly addresses the modeled {formatMoney(annualizedExposure)} annual exposure without changing the underlying service scope.</p></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="drawer-stat"><span className="eyebrow text-[#899a87]">Source</span><strong>§ 7.2</strong></div><div className="drawer-stat"><span className="eyebrow text-[#899a87]">Confidence</span><strong>81%</strong></div><div className="drawer-stat"><span className="eyebrow text-[#899a87]">Playbook</span><strong>Price cap</strong></div></div></div><div className="flex flex-col gap-3 border-t border-[#3e473e] px-6 py-5 sm:flex-row sm:justify-end"><button className="secondary-button secondary-button-dark" onClick={() => toast("Email draft prepared", { description: "A vendor counsel email is ready in the next export increment." })}><Mail size={15} /> Draft vendor email</button><button className="lime-button justify-center" onClick={exportRedline}><Download size={15} /> Export redline</button></div></section></div>}
    </div>
  );
}
