# HealthQueue — Priority Appointment Scheduler

A browser-based appointment scheduling system built on Node.js/Express.
This is a complete port of **HealthQueue.c** — the same greedy algorithm,
now accessible via a REST API and a responsive web front end instead of a
command-line prompt.

## How the algorithm works

Given a set of patients and a total block of available doctor time, the
scheduler:

1. **Sorts** patients by emergency level (%) — highest first.
2. **Greedily allocates** time slots in that order:
   - If the next patient's required time fits within the remaining time → full allocation.
   - If it partially fits → allocate what's left, then stop.
   - If no time remains → patient is marked **Waiting**.

This mirrors the original C selection-sort + greedy loop exactly.

One improvement over the original: equal emergency percentages are broken by
**shorter required time first**, so more patients get a full slot when time is
tight. The C version had no tiebreak (order was arbitrary for equal values).

## Project structure

```
healthqueue-webapp/
├── server.js         Express API (scheduler logic lives here)
├── package.json
├── public/
│   ├── index.html    Single-page UI
│   ├── style.css     Clinical design — navy header, EKG line, colour-coded bars
│   └── app.js        Front-end JS (fetch-based, no framework)
└── data/
    └── queue.json    Persistent patient queue (created at runtime)
```

## Running it locally

Requires Node.js 18+.

```bash
npm install
npm start
# → http://localhost:3000
```

`PORT` environment variable overrides the default 3000.

## API reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/queue` | List all patients currently in the queue |
| `POST` | `/api/queue` | Add a patient `{ name, emergency, req_time }` |
| `DELETE` | `/api/queue/:id` | Remove one patient by ID |
| `DELETE` | `/api/queue` | Clear the entire queue |
| `POST` | `/api/schedule` | Run the scheduler `{ totalSlots }` → ranked results |

### POST /api/schedule response shape

```json
{
  "totalSlots": 60,
  "totalAllocated": 50,
  "remaining": 10,
  "patientCount": 4,
  "scheduledCount": 3,
  "results": [
    {
      "rank": 1,
      "name": "Sunita Reddy",
      "emergency": 92,
      "req_time": 20,
      "allocated": 20,
      "status": "full"
    }
  ]
}
```

`status` is one of `"full"` (fully scheduled), `"partial"` (partially allocated), or `"waiting"` (no time left).

## Mapping from the original C code

| C function / concept | Web equivalent |
|---|---|
| `sortPatients(p, n)` | `Array.sort()` by `emergency` DESC in `runScheduler()` in `server.js` |
| Greedy allocation loop | Same logic in `runScheduler()`, lines ~30–45 |
| `--machine` mode / JSON output | `POST /api/schedule` returns JSON |
| `scanf` prompts | Web form on the Applicant side panel |
| `printf` table output | Results table with priority labels and status badges |

## Pushing to your existing repo

Your repo already has a `backend/` and `frontend/` folder. You can either
replace those with this cleaner single-folder structure, or add this as a
new subdirectory:

```bash
# Option A — replace the existing backend/frontend with this webapp
cp -r healthqueue-webapp/* /path/to/Greedy-Algo/
git add .
git commit -m "feat: full Node/Express rebuild with browser front end"
git push

# Option B — add as a subfolder
cp -r healthqueue-webapp /path/to/Greedy-Algo/webapp
git add webapp/
git commit -m "feat: add self-contained webapp alongside original C source"
git push
```
