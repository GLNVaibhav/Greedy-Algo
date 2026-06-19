const express = require("express");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;

const BASE_DIR = __dirname;
const DATA_DIR = path.join(BASE_DIR, "data");
const QUEUE_FILE = path.join(DATA_DIR, "queue.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(QUEUE_FILE)) fs.writeFileSync(QUEUE_FILE, "[]");

// ─── greedy scheduler (direct port from HealthQueue.c) ───────────────────────
//
// Original C logic:
//   sortPatients(p, n)  — selection sort by emergency DESC
//   for each patient in sorted order:
//     if remaining <= 0: break
//     if req_time <= remaining: allocate fully, remaining -= req_time
//     else:              allocate remaining, remaining = 0
//
// One improvement over the C original: ties in emergency% are broken by
// req_time ASC (shorter consultations first), giving more patients a full
// slot when available time is tight. The C code had no tiebreak.
// ─────────────────────────────────────────────────────────────────────────────
function runScheduler(patients, totalSlots) {
  const sorted = [...patients].sort((a, b) => {
    if (b.emergency !== a.emergency) return b.emergency - a.emergency;
    return a.req_time - b.req_time;
  });

  let remaining = totalSlots;

  return sorted.map((p, rank) => {
    let allocated = 0;

    if (remaining > 0) {
      if (p.req_time <= remaining) {
        allocated = p.req_time;
        remaining -= p.req_time;
      } else {
        allocated = remaining;
        remaining = 0;
      }
    }

    return {
      rank: rank + 1,
      name: p.name,
      emergency: p.emergency,
      req_time: p.req_time,
      allocated: Math.round(allocated * 100) / 100,
      status: allocated >= p.req_time ? "full" : allocated > 0 ? "partial" : "waiting",
    };
  });
}

// ─── data helpers ────────────────────────────────────────────────────────────
async function readQueue() {
  const raw = await fsp.readFile(QUEUE_FILE, "utf-8");
  try { return JSON.parse(raw || "[]"); } catch { return []; }
}

async function writeQueue(q) {
  await fsp.writeFile(QUEUE_FILE, JSON.stringify(q, null, 2));
}

function validatePatient({ name, emergency, req_time }) {
  if (!name || !String(name).trim()) return "Name is required.";
  const em = parseFloat(emergency);
  if (Number.isNaN(em) || em < 0 || em > 100) return "Emergency % must be 0–100.";
  const rt = parseFloat(req_time);
  if (Number.isNaN(rt) || rt <= 0) return "Required time must be greater than 0.";
  return null;
}

// ─── express ─────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.static(path.join(BASE_DIR, "public")));

// GET  /api/queue        — list all patients
app.get("/api/queue", async (req, res) => {
  res.json(await readQueue());
});

// POST /api/queue        — add a patient
app.post("/api/queue", async (req, res) => {
  const err = validatePatient(req.body);
  if (err) return res.status(400).json({ error: err });

  const patient = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: String(req.body.name).trim(),
    emergency: parseFloat(req.body.emergency),
    req_time: parseFloat(req.body.req_time),
    addedAt: new Date().toISOString(),
  };

  const queue = await readQueue();
  queue.push(patient);
  await writeQueue(queue);
  res.status(201).json(patient);
});

// DELETE /api/queue/:id  — remove one patient
app.delete("/api/queue/:id", async (req, res) => {
  const queue = await readQueue();
  const next = queue.filter((p) => p.id !== req.params.id);
  if (next.length === queue.length) return res.status(404).json({ error: "Patient not found." });
  await writeQueue(next);
  res.json({ removed: true, id: req.params.id });
});

// DELETE /api/queue      — clear entire queue
app.delete("/api/queue", async (req, res) => {
  await writeQueue([]);
  res.json({ cleared: true });
});

// POST /api/schedule     — run the greedy algorithm
app.post("/api/schedule", async (req, res) => {
  const totalSlots = parseFloat(req.body.totalSlots);
  if (Number.isNaN(totalSlots) || totalSlots <= 0) {
    return res.status(400).json({ error: "Total available time must be greater than 0." });
  }

  const queue = await readQueue();
  if (!queue.length) return res.status(400).json({ error: "No patients in the queue." });

  const results = runScheduler(queue, totalSlots);
  const totalAllocated = results.reduce((s, r) => s + r.allocated, 0);
  const scheduled = results.filter((r) => r.status !== "waiting").length;

  res.json({
    totalSlots,
    totalAllocated: Math.round(totalAllocated * 100) / 100,
    remaining: Math.round((totalSlots - totalAllocated) * 100) / 100,
    patientCount: queue.length,
    scheduledCount: scheduled,
    results,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`HealthQueue running at http://localhost:${PORT}`);
});
