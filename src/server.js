const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const { processVideo } = require("./processor");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const CLIPS_DIR = path.join(__dirname, "..", "clips");
if (!fs.existsSync(CLIPS_DIR)) fs.mkdirSync(CLIPS_DIR, { recursive: true });

const jobs = new Map();

app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/process", (req, res) => {
  const { url, clipCount = 5 } = req.body || {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing 'url' in request body" });
  }

  const jobId = uuidv4();
  jobs.set(jobId, { id: jobId, status: "queued", progress: 0, step: "Queued", clips: [], error: null });

  processVideo({ jobId, url, clipCount, clipsDir: CLIPS_DIR, jobs }).catch((err) => {
    const job = jobs.get(jobId);
    if (job) {
      job.status = "error";
      job.error = err.message || String(err);
    }
  });

  res.json({ jobId });
});

app.get("/status/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json({ status: job.status, progress: job.progress, step: job.step, error: job.error });
});

app.get("/result/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.status !== "completed") {
    return res.status(400).json({ error: `Job not completed yet (status: ${job.status})` });
  }
  res.json({ clips: job.clips });
});

app.use("/clips", express.static(CLIPS_DIR));

app.listen(PORT, () => {
  console.log(`ClipForge processing server listening on port ${PORT}`);
});
