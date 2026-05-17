import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const apiDir = path.join(root, "api");
const serverDir = path.join(root, "server");

const money = (value) => Number(value.toFixed(2));
const pad = (value) => String(value).padStart(3, "0");
const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy.toISOString().slice(0, 10);
};

const start = new Date("2026-05-18T00:00:00Z");
const businesses = [
  "Riverbend Roasters",
  "Juniper Studio",
  "MetroCare Supplies",
  "FreshCart Market",
  "Northstar Fabrication",
  "BrightDesk Consulting",
  "Harbor House Catering",
  "Lumen Print Co."
];
const accounts = ["Operating", "Payroll", "Tax Reserve", "Inventory", "Owner Draw", "Growth Fund"];
const inflows = ["retainer invoice", "card settlement", "wholesale order", "subscription batch", "deposit", "maintenance contract"];
const outflows = ["payroll run", "supplier payment", "rent", "tax set-aside", "ad spend", "equipment lease"];
const statuses = ["Forecasted", "Due soon", "Cleared", "Delayed", "Needs decision", "Matched"];
const owners = ["Simoné Govender", "Finance lead", "Bookkeeper", "Owner", "Advisor"];
const risks = ["Low", "Watch", "High"];

const records = Array.from({ length: 200 }, (_, index) => {
  const i = index + 1;
  const isOutflow = i % 4 === 0 || i % 5 === 0;
  const source = isOutflow ? outflows : inflows;
  const amountBase = isOutflow
    ? 900 + ((i * 431) % 18500)
    : 1200 + ((i * 617) % 32000);
  const score = 42 + ((i * 7) % 57);
  const confidence = 51 + ((i * 11) % 48);
  return {
    id: `LL-${pad(i)}`,
    date: addDays(start, i % 92),
    company: businesses[i % businesses.length],
    title: `${source[i % source.length]} ${pad(i)}`,
    type: isOutflow ? "Outflow" : "Inflow",
    category: source[i % source.length],
    account: accounts[i % accounts.length],
    amount: money((isOutflow ? -1 : 1) * amountBase),
    status: statuses[i % statuses.length],
    owner: owners[i % owners.length],
    confidence,
    score,
    risk: risks[score > 82 ? 2 : score > 62 ? 1 : 0],
    note: isOutflow
      ? "Tracked for timing pressure and reserve impact."
      : "Tracked for collection confidence and runway impact.",
    updated: `${8 + i * 3} min ago`,
    demoSeed: true
  };
});

let balance = 84600;
const forecast = Array.from({ length: 45 }, (_, index) => {
  const inflow = 1800 + ((index * 941) % 9200);
  const outflow = 1300 + ((index * 577) % 7400);
  const expected = inflow - outflow - (index % 11 === 0 ? 6200 : 0);
  balance = money(balance + expected);
  return {
    date: addDays(start, index),
    inflow,
    outflow,
    balance,
    event: index % 11 === 0 ? "Payroll pressure" : index % 7 === 0 ? "Invoice batch" : "Normal movement"
  };
});

const documents = [
  {
    id: "cash-flow-statement",
    title: "Cash Flow Statement",
    summary: "Monthly operating cash in, cash out, and closing balance.",
    columns: ["Line item", "Planned", "Actual", "Notes"],
    rows: [
      ["Opening balance", "84600", "84600", "Synced from operating account"],
      ["Customer receipts", "68400", "62150", "Weighted by invoice confidence"],
      ["Supplier payments", "-31200", "-28750", "Two payments negotiable"],
      ["Payroll", "-22400", "-22400", "Biweekly run"],
      ["Closing cash", "99400", "95600", "Auto reviewed by advisor"]
    ]
  },
  {
    id: "invoice-tracker",
    title: "Invoice Tracker",
    summary: "Open invoices, due dates, collection probability, and follow-up owner.",
    columns: ["Invoice", "Due", "Amount", "Confidence"],
    rows: [
      ["INV-1048 Riverbend Roasters", "2026-05-22", "8600", "91"],
      ["INV-1051 FreshCart Market", "2026-05-27", "14300", "72"],
      ["INV-1057 MetroCare Supplies", "2026-06-02", "11850", "66"],
      ["INV-1060 Harbor House Catering", "2026-06-05", "5900", "84"]
    ]
  },
  {
    id: "expense-register",
    title: "Expense Register",
    summary: "Recurring and one-off costs with owner notes.",
    columns: ["Expense", "Vendor", "Amount", "Decision"],
    rows: [
      ["Inventory replenishment", "Atlas Supply", "-12800", "Split payment"],
      ["Payroll software", "RunDesk", "-420", "Keep"],
      ["Paid ads", "Search network", "-2400", "Cap this month"],
      ["Equipment lease", "Forge Finance", "-1850", "Review renewal"]
    ]
  },
  {
    id: "tax-reserve",
    title: "Tax Reserve Worksheet",
    summary: "Set-aside planning for sales tax, payroll tax, and quarterly estimates.",
    columns: ["Reserve", "Rate", "Base", "Set aside"],
    rows: [
      ["Sales tax", "8.25", "42100", "3473"],
      ["Payroll tax", "9.80", "22400", "2195"],
      ["Quarterly estimate", "14.00", "35600", "4984"],
      ["Owner draw buffer", "5.00", "18000", "900"]
    ]
  },
  {
    id: "payroll-plan",
    title: "Payroll Runbook",
    summary: "Payroll readiness, funding source, and final release status.",
    columns: ["Run", "Funding account", "Amount", "Status"],
    rows: [
      ["May 22 payroll", "Payroll", "-22400", "Ready"],
      ["Contractor batch", "Operating", "-6200", "Needs approval"],
      ["Benefits debit", "Operating", "-4100", "Forecasted"],
      ["June 5 payroll", "Payroll", "-22800", "Watch"]
    ]
  },
  {
    id: "supplier-calendar",
    title: "Supplier Payment Calendar",
    summary: "Upcoming payables ranked by flexibility and cash impact.",
    columns: ["Supplier", "Due", "Amount", "Flexibility"],
    rows: [
      ["Atlas Supply", "2026-05-25", "-12800", "Can split"],
      ["Northline Logistics", "2026-05-29", "-4700", "Low"],
      ["PrintWorks", "2026-06-03", "-2300", "High"],
      ["Cloud tools", "2026-06-08", "-980", "Medium"]
    ]
  }
];

const workflow = [
  {
    step: 1,
    title: "Sync the ledger",
    detail: "Import bank movement, invoices, supplier bills, tax reserves, and payroll obligations into one timeline."
  },
  {
    step: 2,
    title: "Score the runway",
    detail: "Blend payment confidence, recurring expenses, and account buffers to expose shortfall windows early."
  },
  {
    step: 3,
    title: "Model decisions",
    detail: "Test late invoices, inventory orders, hiring, and payment plans before committing cash."
  },
  {
    step: 4,
    title: "Package the advisor handoff",
    detail: "Save editable statements, invoice trackers, and notes so accountants can act without rework."
  }
];

const data = {
  product: "LedgerLift",
  category: "Cash Flow Foresight",
  database: "ledgerlift_cashflow_records",
  generatedAt: "2026-05-17",
  summary: "Cash-flow foresight for small business decisions with scenario planning, editable documents, and a local JSON database.",
  metrics: [
    { label: "Current cash", value: "$84.6k", delta: "+$11.4k projected" },
    { label: "Runway", value: "47 days", delta: "9-day safety buffer" },
    { label: "Open invoices", value: "$72.8k", delta: "78% weighted confidence" },
    { label: "Database rows", value: "200", delta: "preloaded records" }
  ],
  accounts: [
    { name: "Operating", balance: 84600, health: "Strong" },
    { name: "Payroll", balance: 31800, health: "Ready" },
    { name: "Tax Reserve", balance: 19450, health: "Watch" },
    { name: "Growth Fund", balance: 12800, health: "Flexible" }
  ],
  forecast,
  documents,
  records,
  workflow,
  activity: [
    { title: "Late FreshCart payment modeled", kind: "Scenario", time: "12 min" },
    { title: "Tax reserve worksheet updated", kind: "Document", time: "24 min" },
    { title: "Supplier split-payment plan saved", kind: "Decision", time: "41 min" }
  ]
};

const users = {
  users: [
    {
      id: "user-simone",
      name: "Simoné Govender",
      role: "Founder",
      email: "simone@ledgerlift.demo",
      password: "demo123"
    },
    {
      id: "user-owner",
      name: "Small Business Owner",
      role: "Owner",
      email: "owner@ledgerlift.demo",
      password: "cashflow"
    },
    {
      id: "user-advisor",
      name: "Advisor",
      role: "Accountant",
      email: "advisor@ledgerlift.demo",
      password: "advisor123"
    }
  ]
};

await mkdir(apiDir, { recursive: true });
await mkdir(serverDir, { recursive: true });
await writeFile(path.join(apiDir, "data.json"), `${JSON.stringify(data, null, 2)}\n`, "utf8");
await writeFile(path.join(apiDir, "users.json"), `${JSON.stringify(users, null, 2)}\n`, "utf8");
await writeFile(
  path.join(serverDir, "db.json"),
  `${JSON.stringify({ product: data.product, database: data.database, records, users: users.users, documentSnapshots: [] }, null, 2)}\n`,
  "utf8"
);

console.log(`Generated ${records.length} LedgerLift records.`);
