import http from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const serverDir = path.join(root, "server");
const dbPath = path.join(serverDir, "db.json");
const seedPath = path.join(root, "api", "data.json");
const usersPath = path.join(root, "api", "users.json");
const port = 4174;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function seedDb() {
  const data = await readJson(seedPath);
  const users = await readJson(usersPath);
  const db = {
    product: "LedgerLift",
    database: "ledgerlift_cashflow_records",
    records: data.records || [],
    users: users.users || [],
    documentSnapshots: []
  };
  await mkdir(serverDir, { recursive: true });
  await writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  return db;
}

async function ensureDb() {
  await mkdir(serverDir, { recursive: true });
  if (!existsSync(dbPath)) return seedDb();
  return readJson(dbPath);
}

async function writeDb(db) {
  await writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
}

async function bodyJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function send(res, status, payload, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  res.end(Buffer.isBuffer(payload) || typeof payload === "string" ? payload : JSON.stringify(payload));
}

function safeFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "") || "index.html";
  const file = path.join(root, clean);
  return file.startsWith(root) ? file : path.join(root, "index.html");
}

function publicUser(user) {
  const { password, ...safe } = user;
  return safe;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "OPTIONS") return send(res, 204, "");

    if (url.pathname === "/api/health") {
      const db = await ensureDb();
      return send(res, 200, {
        ok: true,
        product: "LedgerLift",
        database: db.database,
        records: db.records.length,
        documentSnapshots: db.documentSnapshots.length
      });
    }

    if (url.pathname === "/api/data") {
      const seed = await readJson(seedPath);
      const db = await ensureDb();
      return send(res, 200, { ...seed, records: db.records, database: db.database });
    }

    if (url.pathname === "/api/login" && req.method === "POST") {
      const input = await bodyJson(req);
      const db = await ensureDb();
      const user = db.users.find((item) => item.email === input.email && item.password === input.password);
      if (!user) return send(res, 401, { ok: false, message: "Invalid demo credentials" });
      return send(res, 200, { ok: true, user: publicUser(user) });
    }

    if (url.pathname === "/api/records") {
      const db = await ensureDb();
      if (req.method === "GET") return send(res, 200, { records: db.records });
      if (req.method === "POST") {
        const row = await bodyJson(req);
        const record = {
          id: row.id || `LL-API-${Date.now()}`,
          date: row.date || new Date().toISOString().slice(0, 10),
          company: row.company || "Demo business",
          title: row.title || "Cash-flow decision",
          type: row.type || "Inflow",
          category: row.category || "manual entry",
          account: row.account || "Operating",
          amount: Number(row.amount || 0),
          status: row.status || "Needs decision",
          owner: row.owner || "Owner",
          confidence: Number(row.confidence || 76),
          score: Number(row.score || 76),
          risk: row.risk || "Watch",
          note: row.note || "Saved through LedgerLift local API.",
          updated: "saved through Node API",
          demoSeed: false
        };
        db.records.unshift(record);
        await writeDb(db);
        return send(res, 201, { ok: true, record });
      }
    }

    if (url.pathname.startsWith("/api/records/") && req.method === "DELETE") {
      const db = await ensureDb();
      const id = decodeURIComponent(url.pathname.split("/").pop());
      db.records = db.records.filter((record) => record.id !== id);
      await writeDb(db);
      return send(res, 200, { ok: true });
    }

    if (url.pathname === "/api/document-snapshots") {
      const db = await ensureDb();
      if (req.method === "GET") return send(res, 200, { snapshots: db.documentSnapshots });
      if (req.method === "POST") {
        const input = await bodyJson(req);
        const snapshot = {
          id: `DOC-${Date.now()}`,
          title: input.title || "Financial document",
          total: Number(input.total || 0),
          rows: input.rows || [],
          owner: input.owner || "Guest",
          savedAt: new Date().toISOString()
        };
        db.documentSnapshots.unshift(snapshot);
        db.documentSnapshots = db.documentSnapshots.slice(0, 40);
        await writeDb(db);
        return send(res, 201, { ok: true, snapshot });
      }
    }

    if (url.pathname === "/api/reset" && req.method === "POST") {
      const db = await seedDb();
      return send(res, 200, { ok: true, records: db.records.length });
    }

    const file = safeFile(url.pathname);
    const target = existsSync(file) ? file : path.join(root, "index.html");
    const type = mime[path.extname(target)] || "text/plain; charset=utf-8";
    return send(res, 200, await readFile(target), type);
  } catch (error) {
    return send(res, 500, { ok: false, error: error.message });
  }
});

server.listen(port, () => {
  console.log(`LedgerLift running at http://localhost:${port}`);
});
