// backend/logging.js
// Generation logging, example storage (good/bad), token history

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LOGS_DIR = path.join(__dirname, "logs", "raw");
const EXAMPLES_DIR = path.join(__dirname, "examples");
const GOOD_DIR = path.join(EXAMPLES_DIR, "good");
const BAD_DIR = path.join(EXAMPLES_DIR, "bad");

[LOGS_DIR, GOOD_DIR, BAD_DIR].forEach((d) => fs.mkdirSync(d, { recursive: true }));

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function exampleFilename(reqId, topic) {
  return `${new Date().toISOString().slice(0, 10)}_${slugify(topic)}_${reqId.slice(-6)}.json`;
}

export function writeGenerationLog(reqId, data) {
  const file = path.join(LOGS_DIR, `${reqId}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

export function saveGoodExample(reqId) {
  const src = path.join(LOGS_DIR, `${reqId}.json`);
  if (!fs.existsSync(src)) return { ok: false, error: "Log not found" };

  const data = JSON.parse(fs.readFileSync(src, "utf8"));
  const filename = exampleFilename(reqId, data.inputs?.teacherInput || "unknown");
  const dest = path.join(GOOD_DIR, filename);

  fs.writeFileSync(dest, JSON.stringify({
    ...data,
    savedAt: new Date().toISOString(),
    rating: "good",
  }, null, 2));

  console.log(`Good example saved: examples/good/${filename}`);
  return { ok: true, file: `examples/good/${filename}` };
}

export function saveBadExample(reqId, comment) {
  const src = path.join(LOGS_DIR, `${reqId}.json`);
  if (!fs.existsSync(src)) return { ok: false, error: "Log not found" };

  const data = JSON.parse(fs.readFileSync(src, "utf8"));
  const filename = exampleFilename(reqId, data.inputs?.teacherInput || "unknown");
  const dest = path.join(BAD_DIR, filename);

  fs.writeFileSync(dest, JSON.stringify({
    ...data,
    savedAt: new Date().toISOString(),
    rating: "bad",
    comment: (comment || "").trim(),
  }, null, 2));

  console.log(`Bad example saved: examples/bad/${filename}`);
  return { ok: true, file: `examples/bad/${filename}` };
}

export function listExamples(rating) {
  const dir = rating === "good" ? GOOD_DIR : BAD_DIR;
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      return {
        filename: f,
        topic: data.inputs?.teacherInput || "unknown",
        category: data.inputs?.category || null,
        savedAt: data.savedAt,
        comment: data.comment || null,
      };
    })
    .sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));
}

export function getTokenHistory() {
  if (!fs.existsSync(LOGS_DIR)) return { totalTokens: 0, generationCount: 0, logs: [] };
  const files = fs.readdirSync(LOGS_DIR).filter((f) => f.endsWith(".json"));
  let totalPrompt = 0;
  let totalCompletion = 0;
  const logs = [];

  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(LOGS_DIR, f), "utf8"));
    const usage = data.tokenUsage || {};
    // Token data is nested under teacher/student sub-objects
    const teacherTokens = usage.teacher || {};
    const studentTokens = usage.student || {};
    const promptT = (teacherTokens.promptTokens || 0) + (studentTokens.promptTokens || 0);
    const completionT = (teacherTokens.completionTokens || 0) + (studentTokens.completionTokens || 0);
    const totalT = (teacherTokens.totalTokens || 0) + (studentTokens.totalTokens || 0);
    totalPrompt += promptT;
    totalCompletion += completionT;
    logs.push({
      reqId: data.reqId,
      generatedAt: data.generatedAt,
      models: data.models || null,
      latencyMs: data.latencyMs,
      promptTokens: promptT,
      completionTokens: completionT,
      totalTokens: totalT,
    });
  }

  return {
    totalPromptTokens: totalPrompt,
    totalCompletionTokens: totalCompletion,
    totalTokens: totalPrompt + totalCompletion,
    generationCount: files.length,
    logs: logs.sort((a, b) => (b.generatedAt || "").localeCompare(a.generatedAt || "")),
  };
}
