(() => {
  const app = {
    slug: "ledgerlift",
    sessionKey: "ledgerlift-session",
    themeKey: "ledgerlift-theme",
    localRecordsKey: "ledgerlift-local-records",
    documentKey: "ledgerlift-document-snapshots",
    data: null,
    records: [],
    activeDocument: 0,
    activePlaybook: "protectPayroll"
  };

  const playbooks = {
    protectPayroll: {
      label: "Protect payroll",
      short: "Shield",
      values: { lateInvoice: 14500, inventory: 4200, newContract: 12000, hiring: 1000 },
      copy: "Conserve operating cash, split supplier pressure, and preserve payroll coverage."
    },
    chaseCollections: {
      label: "Chase collections",
      short: "Collect",
      values: { lateInvoice: 3500, inventory: 6400, newContract: 16000, hiring: 2500 },
      copy: "Pull invoice confidence forward and release cash for routine operating moves."
    },
    fundGrowth: {
      label: "Fund growth",
      short: "Grow",
      values: { lateInvoice: 9500, inventory: 18500, newContract: 41000, hiring: 9000 },
      copy: "Stress-test expansion spend against new-contract upside before committing."
    }
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value || 0));
  const number = (value) => new Intl.NumberFormat("en-US").format(Number(value || 0));
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  const parseAmount = (value) => Number(String(value ?? "0").replace(/[^0-9.-]/g, "")) || 0;

  function session() {
    try {
      return JSON.parse(localStorage.getItem(app.sessionKey) || "null");
    } catch {
      return null;
    }
  }

  function setSession(user) {
    if (user) localStorage.setItem(app.sessionKey, JSON.stringify(user));
    else localStorage.removeItem(app.sessionKey);
    renderSession();
  }

  function localRecords() {
    try {
      return JSON.parse(localStorage.getItem(app.localRecordsKey) || "[]");
    } catch {
      return [];
    }
  }

  function saveLocalRecord(record) {
    const rows = localRecords();
    rows.unshift(record);
    localStorage.setItem(app.localRecordsKey, JSON.stringify(rows.slice(0, 40)));
  }

  function documentSnapshots() {
    try {
      return JSON.parse(localStorage.getItem(app.documentKey) || "[]");
    } catch {
      return [];
    }
  }

  function saveDocumentSnapshot(snapshot) {
    const rows = documentSnapshots();
    rows.unshift(snapshot);
    localStorage.setItem(app.documentKey, JSON.stringify(rows.slice(0, 24)));
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
  }

  async function getData() {
    try {
      return await fetchJson("/api/data", { cache: "no-store" });
    } catch {
      return fetchJson("api/data.json", { cache: "no-store" });
    }
  }

  async function getUsers() {
    return fetchJson("api/users.json", { cache: "no-store" });
  }

  async function login(email, password) {
    try {
      return await fetchJson("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
    } catch {
      const users = await getUsers();
      const user = (users.users || []).find((item) => item.email === email && item.password === password);
      if (!user) throw new Error("Invalid demo credentials");
      const { password: _password, ...safeUser } = user;
      return { ok: true, user: safeUser };
    }
  }

  async function createRecord(record) {
    try {
      const result = await fetchJson("/api/records", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(record)
      });
      return result.record;
    } catch {
      const local = { ...record, id: `LL-LOCAL-${Date.now()}`, updated: "saved locally", demoSeed: false };
      saveLocalRecord(local);
      return local;
    }
  }

  async function deleteRecord(id) {
    try {
      await fetchJson(`/api/records/${encodeURIComponent(id)}`, { method: "DELETE" });
      return true;
    } catch {
      const next = localRecords().filter((record) => record.id !== id);
      localStorage.setItem(app.localRecordsKey, JSON.stringify(next));
      return false;
    }
  }

  async function resetDatabase() {
    try {
      await fetchJson("/api/reset", { method: "POST" });
    } catch {
      localStorage.removeItem(app.localRecordsKey);
    }
    app.data = await getData();
    app.records = [...(app.data.records || []), ...localRecords()];
    renderAll();
  }

  async function postDocumentSnapshot(snapshot) {
    saveDocumentSnapshot(snapshot);
    try {
      await fetchJson("/api/document-snapshots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(snapshot)
      });
    } catch {
      return snapshot;
    }
    return snapshot;
  }

  function renderSession() {
    const user = session();
    $$("[data-session-pill]").forEach((el) => {
      el.textContent = user ? `${user.name} - ${user.role}` : "Guest mode";
    });
    $$("[data-session-detail]").forEach((el) => {
      el.innerHTML = user
        ? `<strong>${escapeHtml(user.name)}</strong><p>${escapeHtml(user.email)}<br>${escapeHtml(user.role)}</p>`
        : "<strong>No active session.</strong><p>Use a demo account to unlock database edits and document saves.</p>";
    });
    $$("[data-auth-required]").forEach((el) => {
      el.classList.toggle("is-visible", !user);
    });
    $$("[data-auth-only]").forEach((el) => {
      el.disabled = !user;
      el.setAttribute("aria-disabled", user ? "false" : "true");
    });
  }

  function initTheme() {
    document.documentElement.dataset.theme = localStorage.getItem(app.themeKey) || "light";
    const update = () => {
      $$("[data-theme-toggle]").forEach((button) => {
        button.textContent = document.documentElement.dataset.theme === "dark" ? "Light" : "Dark";
      });
    };
    update();
    $$("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        localStorage.setItem(app.themeKey, next);
        update();
      });
    });
  }

  function highlightNav() {
    const current = location.pathname.split("/").pop() || "index.html";
    $$(".nav-links a").forEach((link) => {
      const href = link.getAttribute("href");
      if (href === current || (current === "" && href === "index.html")) {
        link.setAttribute("aria-current", "page");
      }
    });
  }

  function renderMetrics() {
    $$("[data-kpi-grid]").forEach((el) => {
      el.innerHTML = (app.data.metrics || []).map((metric) => `
        <article class="metric-card">
          <span>${escapeHtml(metric.label)}</span>
          <strong>${escapeHtml(metric.value)}</strong>
          <p>${escapeHtml(metric.delta)}</p>
        </article>
      `).join("");
    });
  }

  function renderDecisionStrip() {
    const highRisk = app.records.filter((record) => record.risk === "High").length;
    const expectedIn = app.records.filter((record) => record.type === "Inflow").slice(0, 35).reduce((sum, record) => sum + Math.max(0, record.amount), 0);
    const expectedOut = Math.abs(app.records.filter((record) => record.type === "Outflow").slice(0, 35).reduce((sum, record) => sum + Math.min(0, record.amount), 0));
    $$("[data-decision-strip]").forEach((el) => {
      el.innerHTML = `
        <article><span class="kicker">Foresight</span><b>${money(expectedIn - expectedOut)} net 35-day movement</b><p>Based on the newest seeded transactions and saved records.</p></article>
        <article><span class="kicker">Attention</span><b>${number(highRisk)} high-risk rows</b><p>Records with timing or confidence pressure.</p></article>
        <article><span class="kicker">Next move</span><b>Split supplier payment</b><p>Preserves payroll and tax reserve coverage.</p></article>
      `;
    });
  }

  function summaryStats() {
    const records = app.records || [];
    const forecast = app.data?.forecast || [];
    const inflow = records.filter((record) => record.type === "Inflow").reduce((sum, record) => sum + Math.max(0, Number(record.amount || 0)), 0);
    const outflow = Math.abs(records.filter((record) => record.type === "Outflow").reduce((sum, record) => sum + Math.min(0, Number(record.amount || 0)), 0));
    const highRisk = records.filter((record) => record.risk === "High").length;
    const watchRisk = records.filter((record) => record.risk === "Watch").length;
    const floor = forecast.length ? Math.min(...forecast.map((item) => Number(item.balance || 0))) : 0;
    const closing = forecast.length ? forecast[forecast.length - 1].balance : 0;
    const topRisk = [...records].sort((a, b) => (Number(b.score || 0) - Number(a.score || 0))).slice(0, 3);
    const nextOutflows = [...records].filter((record) => Number(record.amount) < 0).sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 3);
    const nextInflows = [...records].filter((record) => Number(record.amount) > 0).sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 3);
    return { records, forecast, inflow, outflow, highRisk, watchRisk, floor, closing, topRisk, nextOutflows, nextInflows };
  }

  function currentPlaybook() {
    return playbooks[app.activePlaybook] || playbooks.protectPayroll;
  }

  function setScenarioInputs(values) {
    Object.entries(values).forEach(([key, value]) => {
      $$(`[data-scenario="${key}"]`).forEach((input) => {
        input.value = String(value);
      });
    });
  }

  function applyPlaybook(key) {
    if (!playbooks[key]) return;
    app.activePlaybook = key;
    setScenarioInputs(playbooks[key].values);
    renderPlaybooks();
    calculateScenario();
    renderSignalBoard();
    renderProductModes();
  }

  function renderPlaybooks() {
    const active = currentPlaybook();
    $$('[data-playbook-title]').forEach((el) => { el.textContent = active.label; });
    $$('[data-playbook-copy]').forEach((el) => { el.textContent = active.copy; });
    $$('[data-playbook-grid]').forEach((el) => {
      el.innerHTML = Object.entries(playbooks).map(([key, item]) => `
        <button class="playbook-card ${key === app.activePlaybook ? "is-active" : ""}" type="button" data-playbook="${key}">
          <span>${escapeHtml(item.short)}</span>
          <strong>${escapeHtml(item.short)}</strong>
          <small>${escapeHtml(item.label)}</small>
        </button>
      `).join("");
    });
  }

  function renderSignalBoard() {
    const stats = summaryStats();
    const accounts = app.data?.accounts || [];
    const maxBalance = Math.max(1, ...accounts.map((account) => Math.abs(Number(account.balance || 0))));
    const points = [[50, 12], [82, 38], [62, 78], [18, 60], [28, 25]];
    const insightRows = [
      { label: "Cash floor", value: money(stats.floor), detail: "Lowest point in the 45-day forecast." },
      { label: "Net database flow", value: money(stats.inflow - stats.outflow), detail: `${number(stats.highRisk)} high-risk records need attention.` },
      { label: "Active mode", value: currentPlaybook().short, detail: currentPlaybook().copy }
    ];

    $$('[data-signal-board]').forEach((el) => {
      el.innerHTML = `
        <div class="constellation" aria-label="Interactive cash constellation">
          <span class="orbit orbit-one"></span>
          <span class="orbit orbit-two"></span>
          <span class="constellation-core"><b>${money(stats.closing || stats.floor)}</b><small>closing pulse</small></span>
          ${accounts.map((account, index) => {
            const [x, y] = points[index % points.length];
            const scale = .78 + (Math.abs(Number(account.balance || 0)) / maxBalance) * .52;
            return `<button class="constellation-node" type="button" style="--x:${x}%;--y:${y}%;--s:${scale.toFixed(2)}" title="${escapeHtml(account.name)} ${money(account.balance)}">
              <span>${escapeHtml(account.name.slice(0, 2))}</span>
            </button>`;
          }).join("")}
        </div>
        <div class="signal-list">
          ${insightRows.map((row) => `
            <article class="signal-row">
              <span>${escapeHtml(row.label)}</span>
              <strong>${escapeHtml(row.value)}</strong>
              <p>${escapeHtml(row.detail)}</p>
            </article>
          `).join("")}
        </div>
      `;
    });
  }

  function renderTriageBoard() {
    const stats = summaryStats();
    const cards = [
      { label: "Risk queue", value: `${number(stats.highRisk)} high`, detail: `${number(stats.watchRisk)} watch items in the database`, tone: "danger" },
      { label: "Lowest forecast cash", value: money(stats.floor), detail: "Floor detected across the 45-day cash line", tone: stats.floor > 60000 ? "good" : "warn" },
      { label: "Next collection", value: money(stats.nextInflows[0]?.amount || 0), detail: stats.nextInflows[0] ? `${stats.nextInflows[0].company} · ${stats.nextInflows[0].date}` : "No inflow found", tone: "good" },
      { label: "Next cash drag", value: money(stats.nextOutflows[0]?.amount || 0), detail: stats.nextOutflows[0] ? `${stats.nextOutflows[0].company} · ${stats.nextOutflows[0].date}` : "No outflow found", tone: "warn" }
    ];
    $$('[data-triage-board]').forEach((el) => {
      el.innerHTML = cards.map((card) => `
        <article class="triage-card is-${card.tone}">
          <span>${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(card.value)}</strong>
          <p>${escapeHtml(card.detail)}</p>
        </article>
      `).join("");
    });
  }

  function renderProductModes() {
    const stats = summaryStats();
    const modes = [
      { key: "protectPayroll", label: "Guardian mode", detail: "Turns the UI into a reserve-protection cockpit for payroll, tax, and supplier timing.", metric: `${number(stats.highRisk)} risks` },
      { key: "chaseCollections", label: "Collector mode", detail: "Surfaces invoices and confidence pressure so owners know exactly whom to chase first.", metric: money(stats.nextInflows[0]?.amount || 0) },
      { key: "fundGrowth", label: "Growth mode", detail: "Stress-tests new hires, inventory, and contracts without losing sight of the cash floor.", metric: money(stats.closing) }
    ];
    $$('[data-product-modes]').forEach((el) => {
      el.innerHTML = modes.map((mode) => `
        <button class="mode-card ${mode.key === app.activePlaybook ? "is-active" : ""}" type="button" data-playbook="${mode.key}">
          <span>${escapeHtml(mode.metric)}</span>
          <strong>${escapeHtml(mode.label)}</strong>
          <p>${escapeHtml(mode.detail)}</p>
        </button>
      `).join("");
    });
  }

  function ensureCommandPalette() {
    if ($('[data-command-overlay]')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <button class="command-fab" type="button" data-command-launch aria-label="Open LedgerLift command center">⌘K</button>
      <div class="command-overlay" data-command-overlay aria-hidden="true">
        <div class="command-palette" role="dialog" aria-modal="true" aria-label="LedgerLift command center">
          <div class="command-head">
            <div><p class="kicker">Command center</p><h3>Ask LedgerLift what to inspect next.</h3></div>
            <button class="tool-button" type="button" data-command-close>Close</button>
          </div>
          <label class="command-search"><span>Search records or run a mode</span><input data-command-search placeholder="Try: payroll, invoice, high risk, growth" /></label>
          <div class="command-results" data-command-results></div>
        </div>
      </div>
    `);
  }

  function openCommand(prefill = "") {
    ensureCommandPalette();
    const overlay = $('[data-command-overlay]');
    const input = $('[data-command-search]');
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    if (input) {
      input.value = prefill;
      renderCommandResults(prefill);
      setTimeout(() => input.focus(), 20);
    }
  }

  function closeCommand() {
    const overlay = $('[data-command-overlay]');
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function renderCommandResults(query = "") {
    const target = $('[data-command-results]');
    if (!target) return;
    const clean = query.trim().toLowerCase();
    const commands = [
      { action: 'playbook:protectPayroll', title: 'Protect payroll', detail: 'Apply a conservative cash-preservation playbook.' },
      { action: 'playbook:chaseCollections', title: 'Chase collections', detail: 'Prioritize invoice confidence and debtor follow-up.' },
      { action: 'playbook:fundGrowth', title: 'Fund growth', detail: 'Model inventory, hiring, and new-contract upside.' },
      { action: 'nav:database.html', title: 'Open database', detail: 'Review the full cash-flow records table.' },
      { action: 'nav:demo.html', title: 'Open document studio', detail: 'Edit statements and save document snapshots.' }
    ].filter((item) => !clean || `${item.title} ${item.detail}`.toLowerCase().includes(clean));
    const recordHits = (app.records || [])
      .filter((record) => !clean || Object.values(record).join(' ').toLowerCase().includes(clean))
      .slice(0, 5);
    target.innerHTML = `
      <div class="command-group">
        <span>Actions</span>
        ${commands.map((item) => `<button type="button" data-command-action="${escapeHtml(item.action)}"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></button>`).join('') || '<p>No action matches yet.</p>'}
      </div>
      <div class="command-group">
        <span>Record hits</span>
        ${recordHits.map((record) => `<button type="button" data-command-action="search:${escapeHtml(record.id)}"><strong>${escapeHtml(record.title)}</strong><small>${escapeHtml(record.company)} · ${money(record.amount)} · ${escapeHtml(record.risk)}</small></button>`).join('') || '<p>No record matches yet.</p>'}
      </div>
    `;
  }

  function runCommand(action) {
    if (action.startsWith('playbook:')) {
      applyPlaybook(action.split(':')[1]);
      closeCommand();
      return;
    }
    if (action.startsWith('nav:')) {
      location.href = action.split(':')[1];
      return;
    }
    if (action.startsWith('search:')) {
      const term = action.split(':')[1];
      $$('[data-record-search], [data-db-search]').forEach((input) => { input.value = term; });
      renderRecords();
      closeCommand();
      if (!$('[data-record-search]') && !$('[data-db-search]')) location.href = `workspace.html#${encodeURIComponent(term)}`;
    }
  }

  function renderForecast() {
    const rows = app.data.forecast || [];
    if (!rows.length) return;
    const values = rows.map((item) => item.balance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(1, max - min);
    $$("[data-forecast-chart]").forEach((el) => {
      el.innerHTML = rows.map((item) => {
        const height = 16 + ((item.balance - min) / range) * 210;
        const className = item.event.includes("Payroll") ? "is-pressure" : item.event.includes("Invoice") ? "is-batch" : "";
        return `<button class="forecast-bar ${className}" type="button" style="--bar-height:${height}px" title="${escapeHtml(item.date)} ${money(item.balance)}" aria-label="${escapeHtml(item.date)} ${escapeHtml(item.event)} ${money(item.balance)}" data-forecast-bar data-date="${escapeHtml(item.date)}" data-event="${escapeHtml(item.event)}" data-balance="${money(item.balance)}" data-label="${escapeHtml(item.date.slice(5))} · ${money(item.balance)}"></button>`;
      }).join("");
    });
    $$("[data-cash-timeline]").forEach((el) => {
      el.innerHTML = rows.slice(0, 6).map((item) => `
        <article class="timeline-row">
          <strong>${escapeHtml(item.date.slice(5))}</strong>
          <span>${escapeHtml(item.event)}<br><small>${money(item.inflow)} in / ${money(item.outflow)} out</small></span>
          <em>${money(item.balance)}</em>
        </article>
      `).join("");
    });
  }

  function renderAccounts() {
    $$("[data-account-list]").forEach((el) => {
      el.innerHTML = (app.data.accounts || []).map((account) => `
        <article class="account-row">
          <span><b>${escapeHtml(account.name)}</b><p>${escapeHtml(account.health)}</p></span>
          <strong>${money(account.balance)}</strong>
        </article>
      `).join("");
    });
  }

  function renderActivity() {
    $$("[data-activity-list]").forEach((el) => {
      el.innerHTML = (app.data.activity || []).map((activity) => `
        <article class="snapshot-row">
          <b>${escapeHtml(activity.title)}</b>
          <p>${escapeHtml(activity.kind)} - ${escapeHtml(activity.time)} ago</p>
        </article>
      `).join("");
    });
  }

  function scenarioValues() {
    const values = {};
    $$("[data-scenario]").forEach((input) => {
      values[input.dataset.scenario] = Number(input.value);
      const output = $(`[data-scenario-output="${input.dataset.scenario}"]`);
      if (output) output.textContent = input.dataset.money === "false" ? input.value : money(input.value);
    });
    return values;
  }

  function calculateScenario() {
    if (!$("[data-scenario-result]")) return;
    const values = scenarioValues();
    const baseCash = (app.data.accounts || [])[0]?.balance || 84600;
    const expectedIn = 68200 - (values.lateInvoice || 0) + (values.newContract || 0);
    const expectedOut = 42800 + (values.inventory || 0) + (values.hiring || 0);
    const projected = baseCash + expectedIn - expectedOut;
    const dailyBurn = Math.max(1200, expectedOut / 31);
    const runway = Math.max(1, Math.round(projected / dailyBurn));
    const risk = runway > 45 ? "Low" : runway > 28 ? "Watch" : "High";
    const recommendation = risk === "Low"
      ? "Green light for the planned spend while preserving reserve coverage."
      : risk === "Watch"
        ? "Approve the move after splitting one payable or collecting one invoice earlier."
        : "Pause the spend and prioritize invoice collection before payroll week.";

    $$("[data-scenario-result]").forEach((el) => {
      el.innerHTML = `<span>Projected closing cash</span><strong>${money(projected)}</strong><p>${runway} runway days - ${risk} risk</p>`;
    });
    $$("[data-decision-summary]").forEach((el) => {
      el.textContent = recommendation;
    });
    $$("[data-risk-level]").forEach((el) => {
      el.textContent = risk;
      el.className = risk === "Low" ? "risk-low" : risk === "Watch" ? "risk-watch" : "risk-high";
    });
  }

  function renderDocumentTabs() {
    const docs = app.data.documents || [];
    $$("[data-document-tabs]").forEach((el) => {
      el.innerHTML = docs.map((doc, index) => `
        <button class="tab-button ${index === app.activeDocument ? "is-active" : ""}" type="button" data-doc-tab="${index}">
          ${escapeHtml(doc.title)}
        </button>
      `).join("");
    });
  }

  function docRowsFromPanel(panel) {
    return $$("tbody tr", panel).map((row) => $$("td", row).map((cell) => cell.textContent.trim()));
  }

  function calculateDocumentTotal(panel) {
    const amountCells = $$("[data-doc-number]", panel);
    const total = amountCells.reduce((sum, cell) => sum + parseAmount(cell.textContent), 0);
    const totalEl = $("[data-document-total]", panel);
    if (totalEl) totalEl.textContent = money(total);
    return total;
  }

  function renderDocumentPanel() {
    const docs = app.data.documents || [];
    const doc = docs[app.activeDocument] || docs[0];
    if (!doc) return;
    const numericColumns = doc.columns.map((column) => /planned|actual|amount|base|set aside|rate/i.test(column));
    $$("[data-document-panel]").forEach((el) => {
      el.innerHTML = `
        <article class="document-card" data-active-document="${escapeHtml(doc.id)}">
          <div class="document-head">
            <div>
              <p class="kicker">Editable document</p>
              <h3>${escapeHtml(doc.title)}</h3>
              <p>${escapeHtml(doc.summary)}</p>
            </div>
            <span class="badge">${escapeHtml(doc.rows.length)} rows</span>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr>${doc.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
              <tbody>
                ${doc.rows.map((row) => `<tr>${row.map((cell, index) => `<td contenteditable="true" ${numericColumns[index] ? "data-doc-number" : ""}>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
              </tbody>
            </table>
          </div>
          <div class="document-footer">
            <div class="document-total"><span class="kicker">Editable total</span><strong data-document-total>$0</strong></div>
            <button class="button primary" type="button" data-save-document>Save document snapshot</button>
          </div>
        </article>
      `;
      calculateDocumentTotal(el);
    });
  }

  function renderSnapshots() {
    const snapshots = documentSnapshots();
    $$("[data-snapshot-list]").forEach((el) => {
      el.innerHTML = snapshots.length
        ? snapshots.map((snapshot) => `
          <article class="snapshot-row">
            <b>${escapeHtml(snapshot.title)}</b>
            <p>${money(snapshot.total)} - ${escapeHtml(snapshot.owner || "Guest")}</p>
          </article>
        `).join("")
        : `<div class="empty">No document snapshots yet.</div>`;
    });
  }

  function renderDocuments() {
    renderDocumentTabs();
    renderDocumentPanel();
    renderSnapshots();
  }

  function recordMarkup(record, withDelete = false) {
    const riskClass = record.risk === "High" ? "risk-high" : record.risk === "Watch" ? "risk-watch" : "risk-low";
    const amountClass = Number(record.amount) >= 0 ? "amount-in" : "amount-out";
    return `
      <article class="record-row" data-record-id="${escapeHtml(record.id)}">
        <span><strong>${escapeHtml(record.title)}</strong><small>${escapeHtml(record.company || record.owner)} - ${escapeHtml(record.account || "Operating")}</small></span>
        <b class="${amountClass}">${money(record.amount)}</b>
        <span class="${riskClass}">${escapeHtml(record.risk || "Watch")}</span>
        ${withDelete ? `<button class="tool-button" type="button" data-delete-record="${escapeHtml(record.id)}" data-auth-only>Delete</button>` : `<small>${escapeHtml(record.status)}</small>`}
      </article>
    `;
  }

  function filteredRecords() {
    const query = ($("[data-record-search]")?.value || $("[data-db-search]")?.value || "").trim().toLowerCase();
    const type = $("[data-record-type]")?.value || "all";
    const risk = $("[data-record-risk]")?.value || "all";
    let rows = [...app.records];
    if (query) {
      rows = rows.filter((record) => Object.values(record).join(" ").toLowerCase().includes(query));
    }
    if (type !== "all") rows = rows.filter((record) => record.type === type);
    if (risk !== "all") rows = rows.filter((record) => record.risk === risk);
    return rows;
  }

  function renderRecords() {
    const rows = filteredRecords();
    $$("[data-record-list]").forEach((el) => {
      el.innerHTML = rows.slice(0, 24).map((record) => recordMarkup(record)).join("") || `<div class="empty">No records match the current filters.</div>`;
    });
    renderDatabaseRows();
  }

  function renderDatabaseRows() {
    const tbody = $("[data-db-rows]");
    if (!tbody) return;
    const query = ($("[data-db-search]")?.value || "").trim().toLowerCase();
    const sort = $("[data-db-sort]")?.value || "date";
    let rows = [...app.records];
    if (query) rows = rows.filter((record) => Object.values(record).join(" ").toLowerCase().includes(query));
    rows.sort((a, b) => {
      if (sort === "amount") return Math.abs(b.amount) - Math.abs(a.amount);
      if (sort === "risk") return (b.score || 0) - (a.score || 0);
      if (sort === "company") return String(a.company).localeCompare(String(b.company));
      return String(a.date).localeCompare(String(b.date));
    });
    tbody.innerHTML = rows.map((record) => {
      const riskClass = record.risk === "High" ? "risk-high" : record.risk === "Watch" ? "risk-watch" : "risk-low";
      const amountClass = Number(record.amount) >= 0 ? "amount-in" : "amount-out";
      return `
        <tr>
          <td>${escapeHtml(record.id)}</td>
          <td><strong>${escapeHtml(record.title)}</strong><br><small>${escapeHtml(record.company)}</small></td>
          <td>${escapeHtml(record.date)}</td>
          <td>${escapeHtml(record.type)}</td>
          <td class="${amountClass}">${money(record.amount)}</td>
          <td><span class="${riskClass}">${escapeHtml(record.risk)}</span></td>
          <td><button class="tool-button" type="button" data-delete-record="${escapeHtml(record.id)}" data-auth-only>Delete</button></td>
        </tr>
      `;
    }).join("");
    const count = $("[data-db-count]");
    if (count) count.textContent = `${number(rows.length)} records`;
    renderSession();
  }

  function renderWorkflow() {
    $$("[data-workflow-list]").forEach((el) => {
      el.innerHTML = (app.data.workflow || []).map((step) => `
        <article class="workflow-row">
          <strong>${String(step.step).padStart(2, "0")}</strong>
          <span><b>${escapeHtml(step.title)}</b><p>${escapeHtml(step.detail)}</p></span>
          <span class="badge">Live</span>
        </article>
      `).join("");
    });
  }

  function renderApiPreview() {
    $$("[data-api-preview]").forEach((el) => {
      const preview = {
        database: app.data.database,
        records: app.records.length,
        documents: (app.data.documents || []).map((doc) => doc.title),
        endpoints: ["/api/health", "/api/data", "/api/login", "/api/records", "/api/document-snapshots"]
      };
      el.textContent = JSON.stringify(preview, null, 2);
    });
  }

  function renderAll() {
    renderMetrics();
    renderDecisionStrip();
    renderForecast();
    renderAccounts();
    renderActivity();
    renderDocuments();
    renderRecords();
    renderWorkflow();
    renderApiPreview();
    renderPlaybooks();
    renderSignalBoard();
    renderTriageBoard();
    renderProductModes();
    calculateScenario();
    renderCommandResults($('[data-command-search]')?.value || '');
    renderSession();
  }

  function bindEvents() {
    $$("[data-scenario]").forEach((input) => input.addEventListener("input", calculateScenario));
    document.addEventListener("click", async (event) => {
      const docTab = event.target.closest("[data-doc-tab]");
      if (docTab) {
        app.activeDocument = Number(docTab.dataset.docTab);
        renderDocuments();
      }

      const playbookButton = event.target.closest("[data-playbook]");
      if (playbookButton) applyPlaybook(playbookButton.dataset.playbook);

      const commandLaunch = event.target.closest("[data-command-launch]");
      if (commandLaunch) openCommand();

      const commandClose = event.target.closest("[data-command-close]");
      if (commandClose || event.target.matches("[data-command-overlay]")) closeCommand();

      const commandAction = event.target.closest("[data-command-action]");
      if (commandAction) runCommand(commandAction.dataset.commandAction);

      const forecastBar = event.target.closest("[data-forecast-bar]");
      if (forecastBar) {
        $$('[data-decision-summary]').forEach((el) => {
          el.textContent = `${forecastBar.dataset.date}: ${forecastBar.dataset.event} leaves the forecast at ${forecastBar.dataset.balance}.`;
        });
      }

      const saveDoc = event.target.closest("[data-save-document]");
      if (saveDoc) {
        const panel = saveDoc.closest("[data-active-document]");
        const doc = (app.data.documents || [])[app.activeDocument];
        const user = session();
        const snapshot = {
          title: doc.title,
          rows: docRowsFromPanel(panel),
          total: calculateDocumentTotal(panel),
          owner: user ? user.name : "Guest"
        };
        await postDocumentSnapshot(snapshot);
        renderSnapshots();
      }

      const demoUser = event.target.closest("[data-demo-user]");
      if (demoUser) {
        const form = $("[data-login-form]");
        if (form) {
          form.email.value = demoUser.dataset.demoUser;
          form.password.value = demoUser.dataset.demoPassword;
        }
      }

      const logout = event.target.closest("[data-logout]");
      if (logout) setSession(null);

      const deleteButton = event.target.closest("[data-delete-record]");
      if (deleteButton) {
        if (!session()) {
          alert("Demo login required for database edits.");
          return;
        }
        await deleteRecord(deleteButton.dataset.deleteRecord);
        app.data = await getData();
        app.records = [...(app.data.records || []), ...localRecords()];
        renderAll();
      }

      const exportButton = event.target.closest("[data-db-export]");
      if (exportButton) {
        const blob = new Blob([JSON.stringify(app.records, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "ledgerlift-records.json";
        link.click();
        URL.revokeObjectURL(url);
      }

      const resetButton = event.target.closest("[data-db-reset]");
      if (resetButton) await resetDatabase();
    });

    document.addEventListener("input", (event) => {
      if (event.target.matches("[data-record-search], [data-record-type], [data-record-risk]")) renderRecords();
      if (event.target.matches("[data-db-search], [data-db-sort]")) renderDatabaseRows();
      if (event.target.matches("[data-command-search]")) renderCommandResults(event.target.value);
      if (event.target.closest("[data-active-document]")) calculateDocumentTotal(event.target.closest("[data-active-document]"));
    });

    document.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openCommand();
      }
      if (event.key === "Escape") closeCommand();
    });

    const loginForm = $("[data-login-form]");
    if (loginForm) {
      loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const status = $("[data-login-status]");
        try {
          const result = await login(loginForm.email.value, loginForm.password.value);
          setSession(result.user);
          if (status) status.textContent = "Signed in. Database edits and document saves are unlocked.";
        } catch (error) {
          if (status) status.textContent = error.message;
        }
      });
    }

    const dbForm = $("[data-db-form]");
    if (dbForm) {
      dbForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const status = $("[data-db-form-status]");
        if (!session()) {
          if (status) status.textContent = "Demo login required before saving records.";
          return;
        }
        const form = new FormData(dbForm);
        const amount = Number(form.get("amount"));
        const record = {
          title: form.get("title"),
          company: form.get("company"),
          date: form.get("date"),
          type: amount < 0 ? "Outflow" : "Inflow",
          category: form.get("category"),
          account: form.get("account"),
          amount,
          status: form.get("status"),
          owner: session().name,
          confidence: Number(form.get("confidence")),
          score: Number(form.get("score")),
          risk: Number(form.get("score")) > 82 ? "High" : Number(form.get("score")) > 62 ? "Watch" : "Low",
          note: form.get("note")
        };
        const saved = await createRecord(record);
        app.records.unshift(saved);
        renderAll();
        dbForm.reset();
        if (status) status.textContent = "Record saved to the LedgerLift database.";
      });
    }
  }

  async function init() {
    initTheme();
    highlightNav();
    bindEvents();
    ensureCommandPalette();
    renderSession();
    app.data = await getData();
    app.records = [...(app.data.records || []), ...localRecords()];
    renderAll();
  }

  init().catch((error) => {
    console.error(error);
    $$("[data-load-status]").forEach((el) => {
      el.textContent = "LedgerLift could not load the data layer.";
    });
  });
})();
