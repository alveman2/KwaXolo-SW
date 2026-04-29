// backend/agent-guide.js
// Loads all agent guide files from KwaXolo-Impact at startup and exports
// prompt-building utilities used by the generate-course pipeline.

import fs from "fs";
import path from "path";

// ── Resolve guide path ──────────────────────────────────────────────────────
// Prefer local copy, fall back to sibling repo
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CANDIDATES = [
  path.join(__dirname, "agent-guide"),                       // local copy in backend/
  path.resolve(__dirname, "../../KwaXolo-Impact/agent-guide"), // sibling repo
  path.resolve(process.env.HOME, "KwaXolo-Impact/agent-guide"),
];

let GUIDE_DIR = null;
for (const dir of CANDIDATES) {
  if (fs.existsSync(path.join(dir, "01-system-prompt/system-prompt.md"))) {
    GUIDE_DIR = dir;
    break;
  }
}

function readGuide(relativePath) {
  if (!GUIDE_DIR) return "";
  const full = path.join(GUIDE_DIR, relativePath);
  try {
    return fs.readFileSync(full, "utf8");
  } catch {
    console.warn(`Agent guide file not found: ${relativePath}`);
    return "";
  }
}

// ── Load all guide files at startup ─────────────────────────────────────────
export const GUIDE_FILES = {
  // 00 — Overview
  whatAgentDoes:     readGuide("00-overview/what-the-agent-does.md"),
  constraints:       readGuide("00-overview/constraints.md"),
  neverDo:           readGuide("00-overview/never-do-this.md"),
  // 01 — System prompt
  systemPrompt:      readGuide("01-system-prompt/system-prompt.md"),
  contextInjection:  readGuide("01-system-prompt/context-injection.md"),
  // 02 — Teacher material
  lessonStructure:   readGuide("02-teacher-material/lesson-plan-structure.md"),
  exampleLesson:     readGuide("02-teacher-material/example-lesson-plan.md"),
  // 03 — Student material
  exerciseTypes:     readGuide("03-student-material/exercise-types.md"),
  taskStructure:     readGuide("03-student-material/task-structure.md"),
  interactionPat:    readGuide("03-student-material/interaction-patterns.md"),
  exampleTask:       readGuide("03-student-material/example-student-task.md"),
  // 04 — Content templates
  templateOverview:  readGuide("04-content-templates/template-overview.md"),
  catA:              readGuide("04-content-templates/category-A-business.md"),
  catB:              readGuide("04-content-templates/category-B-money.md"),
  catC:              readGuide("04-content-templates/category-C-marketing.md"),
  catD:              readGuide("04-content-templates/category-D-digital.md"),
  catE:              readGuide("04-content-templates/category-E-sector.md"),
  catF:              readGuide("04-content-templates/category-F-custom.md"),
  // 05 — Language guide
  englishStandard:   readGuide("05-language-guide/english-standard.md"),
  hoverRules:        readGuide("05-language-guide/hover-word-rules.md"),
  // 06 — Design system
  brandColors:       readGuide("06-design-system/brand-colors.md"),
  typography:        readGuide("06-design-system/typography.md"),
  // 07 — Output formats
  studentHtmlSpec:   readGuide("07-output-formats/student-html-spec.md"),
  teacherPdfSpec:    readGuide("07-output-formats/teacher-pdf-spec.md"),
  // 08 — Quality checklist
  qualityChecklist:  readGuide("08-quality-checklist/review-checklist.md"),
  // 09 — App design reference system
  appDesignSystem:   readGuide("09-app-design-refs/app-design-reference-system.md"),
};

const CAT_FILES = {
  A: GUIDE_FILES.catA,
  B: GUIDE_FILES.catB,
  C: GUIDE_FILES.catC,
  D: GUIDE_FILES.catD,
  E: GUIDE_FILES.catE,
  F: GUIDE_FILES.catF,
};

if (GUIDE_DIR) {
  const loaded = Object.values(GUIDE_FILES).filter(v => v.length > 0).length;
  console.log(`Agent guide loaded: ${loaded}/${Object.keys(GUIDE_FILES).length} files from ${GUIDE_DIR}`);
} else {
  console.warn("Agent guide directory not found — prompts will use inline summaries only");
}

// ── App design reference injection ──────────────────────────────────────────
const APP_DESIGN_DIR = GUIDE_DIR ? path.join(GUIDE_DIR, "09-app-design-refs") : null;

const APP_NAME_KEYWORDS = [
  { app: "Gmail",         keywords: ["gmail", "google mail", "google account", "email account"] },
  { app: "WhatsApp",      keywords: ["whatsapp", "whatsapp business"] },
  { app: "Facebook",      keywords: ["facebook", "fb page", "facebook page", "facebook marketplace"] },
  { app: "Google Sheets", keywords: ["google sheets", "spreadsheet", "excel"] },
  { app: "Canva",         keywords: ["canva", "flyer design", "poster design", "banner design"] },
  { app: "Google Maps",   keywords: ["google maps", "maps", "directions", "navigate", "route"] },
];

export function detectAppName(topic) {
  const lower = topic.toLowerCase();
  for (const entry of APP_NAME_KEYWORDS) {
    if (entry.keywords.some(kw => lower.includes(kw))) return entry.app;
  }
  return null;
}

export function loadAppDesignMD(appName) {
  if (!APP_DESIGN_DIR || !appName) return "";
  try {
    const entries = fs.readdirSync(APP_DESIGN_DIR, { withFileTypes: true });
    const match = entries.find(e => e.isDirectory() && e.name.toLowerCase().includes(appName.toLowerCase()));
    if (!match) return "";
    const folder = path.join(APP_DESIGN_DIR, match.name);
    const mdFiles = fs.readdirSync(folder).filter(f => f.endsWith(".md"));
    if (mdFiles.length === 0) return "";
    const content = fs.readFileSync(path.join(folder, mdFiles[0]), "utf8");
    const capped = content.slice(0, 3000);
    console.log(`  App design loaded: ${match.name}/${mdFiles[0]} (${capped.length} chars)`);
    return `\n\nAPP UI DESIGN REFERENCE — use for accurate screen names, colours, and button labels\n${capped}`;
  } catch (err) {
    console.warn(`  App design load failed for "${appName}":`, err.message);
    return "";
  }
}

// ── Category auto-detection from topic keywords ─────────────────────────────
const CATEGORY_KEYWORDS = [
  { cat: "D", keywords: ["gmail", "email", "google account", "inbox", "compose", "subject line"] },
  { cat: "D", keywords: ["canva", "flyer", "design", "poster", "banner"] },
  { cat: "D", keywords: ["google sheets", "spreadsheet", "excel", "track income", "track expenses", "track stock"] },
  { cat: "D", keywords: ["invoice", "quote", "quotation", "billing", "receipt"] },
  { cat: "D", keywords: ["google maps", "directions", "map", "route", "navigate", "delivery route"] },
  { cat: "C", keywords: ["whatsapp business", "whatsapp business profile", "business profile"] },
  { cat: "C", keywords: ["facebook page", "business page", "fb page"] },
  { cat: "C", keywords: ["product photo", "phone photo", "take a photo", "photograph"] },
  { cat: "C", keywords: ["sales message", "whatsapp message", "selling on whatsapp", "advertise on whatsapp"] },
  { cat: "C", keywords: ["facebook marketplace", "marketplace", "list a product", "sell online"] },
  { cat: "B", keywords: ["budget", "weekly budget", "plan money", "money plan"] },
  { cat: "B", keywords: ["income and expenses", "track money", "record money", "bookkeeping"] },
  { cat: "B", keywords: ["profit", "revenue", "cost", "money in", "money out", "understanding profit"] },
  { cat: "B", keywords: ["bank account", "capitec", "mtn mobile money", "mtn momo", "fnb ewallet"] },
  { cat: "B", keywords: ["loan", "micro-loan", "borrow money", "funding", "msenti hub loan"] },
  { cat: "A", keywords: ["business idea", "find an idea", "community problem", "identify a need"] },
  { cat: "A", keywords: ["register", "seda", "business registration", "formal business"] },
  { cat: "A", keywords: ["business plan", "lean canvas", "planning a business", "simple plan"] },
  { cat: "A", keywords: ["pricing", "set prices", "first price", "how to price", "charge for"] },
  { cat: "A", keywords: ["first customers", "find customers", "10 customers", "who to sell to"] },
  { cat: "E", keywords: ["food business", "baking", "catering", "vetkoek", "amagwinya", "sell food"] },
  { cat: "E", keywords: ["photography", "tutoring", "printing business", "hair services", "services business"] },
  { cat: "E", keywords: ["farming", "agri", "vegetable", "garden", "poultry", "crops"] },
  { cat: "E", keywords: ["repairs", "sewing", "construction", "trade", "phone repair"] },
  { cat: "E", keywords: ["crafts", "handmade", "beadwork", "basket", "woodwork", "artisan"] },
];

export function detectCategory(topic) {
  const lower = topic.toLowerCase();
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.keywords.some(kw => lower.includes(kw))) return entry.cat;
  }
  return "F";
}

export function getCategoryRules(cat) {
  return CAT_FILES[cat] || CAT_FILES["F"];
}

// ── Exercise type rotation ──────────────────────────────────────────────────
const ALL_EXERCISE_TYPES = ["tap_correct", "fill_blank", "arrange_steps", "match_pairs", "do_and_confirm"];

export function enforceExerciseRotation(steps) {
  // No 3-in-a-row of same type
  for (let i = 2; i < steps.length; i++) {
    const prev2 = [steps[i - 2].exerciseType, steps[i - 1].exerciseType];
    if (steps[i].exerciseType === prev2[0] && steps[i].exerciseType === prev2[1]) {
      const used = new Set(steps.map(s => s.exerciseType));
      const unused = ALL_EXERCISE_TYPES.filter(t => !used.has(t));
      const replacement = unused.length > 0 ? unused[0] : ALL_EXERCISE_TYPES.find(t => t !== steps[i].exerciseType);
      console.log(`  Exercise rotation fix: step ${steps[i].number} ${steps[i].exerciseType} -> ${replacement}`);
      steps[i].exerciseType = replacement;
    }
  }

  // Ensure at least 3 distinct types if 5+ steps
  const distinct = new Set(steps.map(s => s.exerciseType));
  if (distinct.size < 3 && steps.length >= 5) {
    const missing = ALL_EXERCISE_TYPES.filter(t => !distinct.has(t));
    const tapSteps = steps.filter(s => s.exerciseType === "tap_correct");
    for (let j = 0; j < Math.min(missing.length, tapSteps.length - 1); j++) {
      const mid = tapSteps[Math.floor(tapSteps.length / 2) + j];
      if (mid) {
        console.log(`  Exercise diversity fix: step ${mid.number} tap_correct -> ${missing[j]}`);
        mid.exerciseType = missing[j];
      }
    }
  }
  return steps;
}

// ── Post-processing: fill missing exercise fields ───────────────────────────
export function fixMissingExerciseFields(steps) {
  for (const step of steps) {
    const type = step.exerciseType;

    if (type === "tap_correct") {
      if (!step.options || step.options.length === 0) {
        console.warn(`  Step ${step.number}: tap_correct empty options — filled placeholders`);
        step.options = ["Option A", "Option B", "Option C", "Option D"];
      }
      if (!step.correctAnswer) {
        step.correctAnswer = step.options[0];
      }
    }

    if (type === "fill_blank") {
      if (!step.acceptedAnswers || step.acceptedAnswers.length === 0) {
        console.warn(`  Step ${step.number}: fill_blank empty acceptedAnswers — set placeholder`);
        step.acceptedAnswers = ["answer"];
      }
    }

    if (type === "arrange_steps") {
      if (!step.tiles || step.tiles.length === 0) {
        console.warn(`  Step ${step.number}: arrange_steps empty tiles — filled placeholders`);
        step.tiles = ["Step 1", "Step 2", "Step 3"];
        step.correctOrder = ["Step 1", "Step 2", "Step 3"];
      }
      if (!step.correctOrder || step.correctOrder.length === 0) {
        step.correctOrder = [...(step.tiles || [])];
      }
    }

    if (type === "match_pairs") {
      if (!step.pairs || step.pairs.length === 0) {
        console.warn(`  Step ${step.number}: match_pairs empty pairs — filled placeholder`);
        step.pairs = [{ term: "Term", match: "Match" }];
      }
    }

    if (type === "do_and_confirm") {
      if (!step.instruction) {
        step.instruction = "Do this on your phone now.";
      }
      if (!step.options || step.options.length === 0) {
        step.options = ["Yes, I see it", "No, I don't see it"];
      }
      if (!step.correctAnswer) {
        step.correctAnswer = step.options[0];
      }
    }

    if (!step.feedbackCorrect) {
      step.feedbackCorrect = "Well done! You completed this step correctly.";
    }
    if (!step.feedbackWrong) {
      step.feedbackWrong = "Look carefully at the screen and try again.";
    }
  }
  return steps;
}

// ── Screen types — valid screenType values for student steps ────────────────
export const SCREEN_TYPES = `
VALID screenType VALUES (use EXACTLY one per step):
  play_store_search    → Play Store home with search bar
  play_store_app       → App detail page: name, icon, Install/Open button, reviews
  gmail_signup_name    → Google account creation: enter first name, last name
  gmail_signup_user    → Choose Gmail address
  gmail_signup_pass    → Create a strong password
  gmail_inbox          → Gmail inbox listing received emails
  gmail_compose        → Compose window: To, Subject, Body fields visible
  whatsapp_welcome     → WhatsApp first-launch: logo + "Agree and Continue"
  whatsapp_phone       → Enter phone number screen
  whatsapp_verify      → 6-digit SMS code entry screen
  whatsapp_setup_name  → Enter your name screen
  whatsapp_chat_list   → Main WhatsApp chat list (home)
  whatsapp_chat        → Open conversation with messages
  whatsapp_business    → WhatsApp Business: profile setup
  facebook_feed        → Facebook news feed
  facebook_create_post → Post composer with photo/text options
  facebook_marketplace → Marketplace browse screen with listings grid
  fb_listing_form      → Create listing form: photo, price, title, location
  sheets_blank         → New empty Google Sheets spreadsheet
  sheets_data          → Spreadsheet with column headers and data rows
  generic              → Any app not listed — branded header + key UI elements

VISUAL ACCURACY RULES:
- Installing an app → step 1 MUST be play_store_app or play_store_search
- Creating account → early steps MUST use signup screens, NOT the app home
- Steps must follow the EXACT ORDER a first-time user experiences them`;

// ── Few-shot example loading ───────────────────────────────────────────────
const EXAMPLES_DIR = GUIDE_DIR ? path.join(GUIDE_DIR, "examples") : null;

export function loadFewShotExamples() {
  if (!EXAMPLES_DIR) return "";

  function loadRecent(dir, limit) {
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, limit);
    return files.map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      } catch { return null; }
    }).filter(Boolean);
  }

  const good = loadRecent(path.join(EXAMPLES_DIR, "good"), 4);
  const bad = loadRecent(path.join(EXAMPLES_DIR, "bad"), 4);

  if (good.length === 0 && bad.length === 0) return "";

  const lines = ["LEARN FROM PAST GENERATIONS:"];

  if (good.length > 0) {
    lines.push("\nGOOD EXAMPLES (replicate these patterns):");
    for (const ex of good) {
      const lesson = ex.course?.lessons?.[0] || ex.lesson || {};
      const topic = ex.inputs?.teacherInput || ex.topic || "unknown";
      lines.push(`- Topic: "${topic}" | Title: "${lesson.teacherTitle || ""}" | Objective: "${lesson.teacherObjective || ""}" | Local example: "${(lesson.teacherLocalExample || "").slice(0, 100)}"`);
    }
  }

  if (bad.length > 0) {
    lines.push("\nBAD EXAMPLES (avoid these patterns):");
    for (const ex of bad) {
      const comment = ex.comment || "no comment";
      const topic = ex.inputs?.teacherInput || ex.topic || "unknown";
      lines.push(`- Topic: "${topic}" | Problem: "${comment}"`);
    }
  }

  return lines.join("\n");
}

// ── Build the exercise type assignment hint for steps ────────────────────────
const ROTATION = ["tap_correct", "do_and_confirm", "fill_blank", "arrange_steps", "match_pairs"];

export function getExerciseTypeHint(stepCount) {
  const lines = [];
  for (let i = 0; i < stepCount; i++) {
    lines.push(`Step ${i + 1}: exerciseType MUST be "${ROTATION[i % ROTATION.length]}"`);
  }
  return lines.join("\n");
}
