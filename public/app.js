// ─── helpers ─────────────────────────────────────────────────────────────────

async function api(path, options = {}) {
  const res = await fetch(path, options);
  let body = null;
  try { body = await res.json(); } catch { /* non-json */ }
  if (!res.ok) throw new Error((body && body.error) || `Request failed (${res.status})`);
  return body;
}

function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden", "toast--error");
  if (isError) t.classList.add("toast--error");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.add("hidden"), 3000);
}

function esc(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// Emergency level → colour
function emergencyColor(pct) {
  if (pct >= 70) return "var(--critical)";
  if (pct >= 40) return "var(--urgent)";
  return "var(--routine)";
}

function priorityLabel(pct) {
  if (pct >= 70) return ["CRITICAL", "critical"];
  if (pct >= 40) return ["URGENT",   "urgent"];
  return ["ROUTINE", "routine"];
}

// ─── state ───────────────────────────────────────────────────────────────────
let queue = [];

// ─── queue rendering ─────────────────────────────────────────────────────────
function renderQueue() {
  const list  = document.getElementById("queueList");
  const empty = document.getElementById("queueEmpty");
  document.getElementById("statCount").textContent = queue.length;

  if (!queue.length) {
    list.innerHTML = "";
    list.appendChild(empty);
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");

  list.innerHTML = queue.map(p => {
    const color = emergencyColor(p.emergency);
    const [label] = priorityLabel(p.emergency);
    return `
      <div class="queue-row" data-id="${esc(p.id)}">
        <div class="queue-row__em" style="background:${color}20;color:${color}">
          ${p.emergency.toFixed(0)}%
        </div>
        <div class="queue-row__body">
          <div class="queue-row__name">${esc(p.name)}</div>
          <div class="queue-row__meta">${p.req_time} min · <span style="color:${color};font-weight:500">${label}</span></div>
        </div>
        <button class="btn btn--icon remove-btn" data-id="${esc(p.id)}" title="Remove">✕</button>
      </div>`;
  }).join("");

  list.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", () => removePatient(btn.dataset.id));
  });
}

// ─── add patient ─────────────────────────────────────────────────────────────
document.getElementById("addForm").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const patient = await api("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: document.getElementById("pName").value,
        emergency: document.getElementById("pEmergency").value,
        req_time: document.getElementById("pTime").value,
      }),
    });
    queue.push(patient);
    renderQueue();
    e.target.reset();
    syncSlider(50);
    showToast(`${patient.name} added to queue.`);
  } catch (err) {
    showToast(err.message, true);
  } finally {
    btn.disabled = false;
  }
});

// ─── remove patient ──────────────────────────────────────────────────────────
async function removePatient(id) {
  try {
    await api(`/api/queue/${encodeURIComponent(id)}`, { method: "DELETE" });
    queue = queue.filter(p => p.id !== id);
    renderQueue();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ─── clear queue ─────────────────────────────────────────────────────────────
document.getElementById("clearQueueBtn").addEventListener("click", async () => {
  if (!queue.length) return;
  if (!confirm("Clear the entire queue?")) return;
  try {
    await api("/api/queue", { method: "DELETE" });
    queue = [];
    renderQueue();
    document.getElementById("resultsCard").style.display = "none";
    showToast("Queue cleared.");
  } catch (err) {
    showToast(err.message, true);
  }
});

// ─── slider ↔ number sync ────────────────────────────────────────────────────
const slider = document.getElementById("pEmergencySlider");
const numInput = document.getElementById("pEmergency");

function syncSlider(val) {
  val = Math.max(0, Math.min(100, parseFloat(val) || 0));
  slider.value = val;
  numInput.value = val;
  const color = emergencyColor(val);
  const fill = document.getElementById("emergencyBarFill");
  fill.style.width = val + "%";
  fill.style.background = color;
  document.getElementById("emergencyHint").textContent = `— ${val}%`;
}

slider.addEventListener("input", () => syncSlider(slider.value));
numInput.addEventListener("input", () => syncSlider(numInput.value));
syncSlider(50);

// ─── run scheduler ───────────────────────────────────────────────────────────
document.getElementById("scheduleForm").addEventListener("submit", async e => {
  e.preventDefault();
  const totalSlots = document.getElementById("totalSlots").value;
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = "Running…";

  try {
    const result = await api("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalSlots }),
    });
    renderResults(result);
  } catch (err) {
    showToast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Run scheduler";
  }
});

// ─── render results ──────────────────────────────────────────────────────────
function renderResults(data) {
  const card = document.getElementById("resultsCard");
  card.style.display = "block";
  card.scrollIntoView({ behavior: "smooth", block: "start" });

  // summary pills
  const usedPct = data.totalSlots > 0 ? ((data.totalAllocated / data.totalSlots) * 100).toFixed(0) : 0;
  document.getElementById("summaryPills").innerHTML = `
    <span class="pill pill--green">${data.scheduledCount}/${data.patientCount} scheduled</span>
    <span class="pill pill--amber">${data.totalAllocated} / ${data.totalSlots} min used</span>
    ${data.remaining > 0 ? `<span class="pill pill--slate">${data.remaining} min free</span>` : ""}
  `;

  // table rows
  document.getElementById("resultsBody").innerHTML = data.results.map(r => {
    const color = emergencyColor(r.emergency);
    const [plabel, pkey] = priorityLabel(r.emergency);
    const statusLabel = r.status === "full" ? "Scheduled"
                      : r.status === "partial" ? "Partial"
                      : "Waiting";
    return `
      <tr>
        <td>
          <span class="rank-num">${r.rank}</span>
          <span class="priority-label priority-label--${pkey}">${plabel}</span>
        </td>
        <td><span class="patient-name">${esc(r.name)}</span></td>
        <td>
          <div class="em-cell">
            <span class="em-val" style="color:${color}">${r.emergency.toFixed(1)}%</span>
            <div class="em-bar">
              <div class="em-bar__fill" style="width:${r.emergency}%;background:${color}"></div>
            </div>
          </div>
        </td>
        <td><span class="time-mono">${r.req_time} min</span></td>
        <td><span class="time-mono">${r.allocated > 0 ? r.allocated + " min" : "—"}</span></td>
        <td><span class="badge badge--${r.status}">${statusLabel}</span></td>
      </tr>`;
  }).join("");

  // time allocation bar
  const usedWidth = data.totalSlots > 0 ? (data.totalAllocated / data.totalSlots * 100).toFixed(1) : 0;
  document.getElementById("timeBarWrap").innerHTML = `
    <div class="time-bar-label">Doctor's time allocation</div>
    <div class="time-bar">
      <div class="time-bar__used" style="width:0%"
           data-target="${usedWidth}%"></div>
    </div>
    <div class="time-bar-legend">
      <span class="legend-item">
        <span class="legend-dot" style="background:var(--accent)"></span>
        Allocated: ${data.totalAllocated} min (${usedPct}%)
      </span>
      <span class="legend-item">
        <span class="legend-dot" style="background:var(--border)"></span>
        Free: ${data.remaining} min
      </span>
    </div>`;

  // animate bar after paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const bar = document.querySelector(".time-bar__used");
      if (bar) bar.style.width = bar.dataset.target;
    });
  });
}

// ─── initial load ─────────────────────────────────────────────────────────────
(async () => {
  try {
    queue = await api("/api/queue");
    renderQueue();
  } catch {
    showToast("Could not connect to server.", true);
  }
})();
