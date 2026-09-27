const { execFile } = require("child_process");
const util = require("util");
const path = require("path");
const fs = require("fs");
const os = require("os");
const execFileAsync = util.promisify(execFile);

function updateJob(jobs, jobId, patch) {
  const job = jobs.get(jobId);
  if (!job) return;
  Object.assign(job, patch);
}

async function getDuration(filePath) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  return parseFloat(stdout.trim());
}

async function scoreWindows(filePath, totalDuration, windowSeconds = 45) {
  const windows = [];
  for (let start = 0; start + windowSeconds <= totalDuration; start += windowSeconds) {
    windows.push({ start, end: start + windowSeconds });
  }
  if (windows.length === 0) {
    windows.push({ start: 0, end: totalDuration });
  }

  const scored = [];
  for (const w of windows) {
    try {
      const { stderr } = await execFileAsync("ffmpeg", [
        "-i", filePath,
        "-ss", String(w.start),
        "-t", String(w.end - w.start),
        "-af", "volumedetect",
        "-vn",
        "-f", "null",
        "-",
      ]);
      const match = stderr.match(/mean_volume:\s*(-?\d+(\.\d+)?)\s*dB/);
      const meanVolume = match ? parseFloat(match[1]) : -100;
      scored.push({ ...w, score: meanVolume });
    } catch (e) {
      scored.push({ ...w, score: -100 });
    }
  }
  return scored.sort((a, b) => b.score - a.score);
}

function pickNonOverlapping(sortedWindows, count, minGapSeconds) {
  const picked = [];
  for (const w of sortedWindows) {
    if (picked.length >= count) break;
    const overlaps = picked.some((p) => Math.abs(p.start -
