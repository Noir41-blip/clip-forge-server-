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
