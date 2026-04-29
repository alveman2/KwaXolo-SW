import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AzureOpenAI, OpenAI as OpenAIDefault } from "openai";
import { db, listCourses, getCourse, createCourse } from "./db.js";
import authRouter from "./auth.js";
import studentRouter from "./routes/student.js";
import teacherRouter from "./routes/teacher.js";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Catch and log any unhandled crashes so they show up in Railway deploy logs
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
  process.exit(1);
});

import { getTemplate, getTemplatesByCategory, getCategories } from "./templates.js";
import { validateCourseOutput } from "./validation.js";
import {
  writeGenerationLog, saveGoodExample, saveBadExample,
  listExamples, getTokenHistory,
} from "./logging.js";
import {
  GUIDE_FILES, detectCategory, getCategoryRules,
  enforceExerciseRotation, fixMissingExerciseFields, getExerciseTypeHint,
  detectAppName, loadAppDesignMD, SCREEN_TYPES, loadFewShotExamples,
} from "./agent-guide.js";

dotenv.config();

const app = express();

// Redirect HTTP → HTTPS in production (Railway sets x-forwarded-proto)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production" && req.headers["x-forwarded-proto"] === "http") {
    return res.redirect(301, "https://" + req.headers.host + req.url);
  }
  next();
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Auth routes
app.use("/api/auth", authRouter);

// Role-based routes
app.use("/api", studentRouter);
// NOTE: teacherRouter is mounted AFTER the generate-course and example routes
// defined below, so those public routes are not blocked by teacher auth middleware.

// Azure OpenAI client (all API calls)
const openai = process.env.AZURE_OPENAI_API_KEY
  ? new AzureOpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2025-04-01-preview",
    })
  : null;

const MODEL_TEACHER = process.env.AZURE_DEPLOYMENT_TEACHER || "gpt-5.4-mini";
const MODEL_STUDENT = process.env.AZURE_DEPLOYMENT_STUDENT || "gpt-5.4";

// Optional: regular OpenAI client for web search (web_search_preview tool)
const openaiDirect = process.env.OPENAI_API_KEY
  ? new OpenAIDefault({ apiKey: process.env.OPENAI_API_KEY })
  : null;

if (openaiDirect) {
  console.log("OpenAI direct client configured — web search phase enabled");
} else {
  console.log("No OPENAI_API_KEY — web search phase will be skipped (UI steps may be less accurate)");
}

// PHASE 1: Web search — ground UI steps in real app buttons/screens
// Uses OpenAI Responses API with web_search_preview (requires OPENAI_API_KEY)
// Results cached to disk, reused for CACHE_TTL_DAYS (default 30 days).
import fs from "fs";

const SEARCH_CACHE_DIR = path.join(__dirname, "cache", "web-search");
const CACHE_TTL_DAYS = parseInt(process.env.SEARCH_CACHE_TTL_DAYS || "30", 10);
fs.mkdirSync(SEARCH_CACHE_DIR, { recursive: true });

function slugify(text) {
  return (text || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

function searchCachePath(topic) {
  return path.join(SEARCH_CACHE_DIR, `${slugify(topic)}.json`);
}

function readSearchCache(topic) {
  const file = searchCachePath(topic);
  if (!fs.existsSync(file)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!data.result || !data.cachedAt) return null;
    const ageMs = Date.now() - new Date(data.cachedAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays > CACHE_TTL_DAYS) return null;
    return { result: data.result, ageDays: Math.floor(ageDays) };
  } catch { return null; }
}

function writeSearchCache(topic, result) {
  fs.writeFileSync(
    searchCachePath(topic),
    JSON.stringify({ topic, result, cachedAt: new Date().toISOString() }, null, 2)
  );
}

async function searchUIContext(topic) {
  // Check cache first
  const cached = readSearchCache(topic);
  if (cached) {
    console.log(`  Web search cache HIT (${cached.ageDays}d old): "${topic}"`);
    return cached.result;
  }

  if (!openaiDirect) return "";
  try {
    const response = await openaiDirect.responses.create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search_preview" }],
      input: `Find a detailed step-by-step tutorial for: "${topic}" on an Android smartphone.

I need the following for a student who has NEVER done this before:
1. The EXACT name of every screen the user sees, in the order they appear
2. The EXACT label of every button they need to tap
3. Every form field they fill in, and what kind of information goes there
4. Any verification or confirmation steps (SMS codes, agree/accept screens, etc.)
5. What the final success screen looks like and how the student knows they are done
6. The 3 most common mistakes beginners make and how to avoid them

Be very specific about button labels — use the exact text as it appears in the app.
Under 500 words total.`
    });
    const result = response.output_text;
    writeSearchCache(topic, result);
    console.log(`  Web search complete — cached: cache/web-search/${slugify(topic)}.json`);
    return result;
  } catch (e) {
    console.warn("Web search failed (non-fatal):", e.message);
    return "";
  }
}

// Auto-generate app design MD after lesson generation (non-blocking)
// If a known app is detected but no design ref exists, generate one from the
// web search context and save it for future lessons.
async function maybeGenerateAppDesignMD(appName, uiContext) {
  if (!appName || !openaiDirect) return;
  const existing = loadAppDesignMD(appName);
  if (existing) return;

  const APP_DESIGN_SAVE_DIR = path.join(__dirname, "agent-guide", "09-app-design-refs", appName);
  try {
    fs.mkdirSync(APP_DESIGN_SAVE_DIR, { recursive: true });
    const response = await openaiDirect.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `Create a concise phone UI design spec for the "${appName}" Android app.

Use this real UI information as reference:
${(uiContext || "").slice(0, 2000)}

Include these sections:
1. **Overview** — what the app does, Android focus
2. **Brand Colours** — primary, background, text hex values
3. **Key Screens** — name, purpose, 3-5 UI elements with exact button labels
4. **First-Time User Flow** — ordered screen sequence from install to first success
5. **Common UI Patterns** — recurring elements (nav bar, FABs, tabs) with exact labels

Under 600 words. Markdown format.`
      }],
    });
    const md = response.choices[0].message.content;
    const filename = `${appName.toLowerCase().replace(/\s+/g, "_")}_phone_design.md`;
    fs.writeFileSync(path.join(APP_DESIGN_SAVE_DIR, filename), md);
    console.log(`  Auto-generated app design: 09-app-design-refs/${appName}/${filename}`);
  } catch (e) {
    console.warn(`  App design auto-gen failed for "${appName}" (non-fatal):`, e.message);
  }
}

// PHASE 2: Step planning — calibrated to task difficulty (10-13 steps)
async function planSteps(topic, uiContext) {
  if (!openai) return null;
  try {
    const response = await openai.chat.completions.create({
      model: MODEL_TEACHER,
      response_format: { type: "json_object" },
      max_tokens: 3500,
      messages: [{
        role: "user",
        content: `Create a step plan for teaching a complete beginner: "${topic}"

Student: 13–18 years old, rural KwaZulu-Natal, South Africa. Basic Android phone.
Has NEVER used this app or done this task before. Treat every screen as completely new.

Real app UI from web search:
${uiContext || "Use your knowledge of the real app UI."}

STEP COUNT — calibrate to actual task difficulty:
  Simple task (1–2 screens, 1 goal):     10–11 steps
  Medium task (3–5 screens, setup flow): 10–12 steps
  Complex task (6+ screens, multi-goal): 12–13 steps

ABSOLUTE LIMIT: never return more than 13 steps. If the task has more details, combine closely related fields or confirmations into one clear step, but keep the final step as the real completed goal.

RULES:
- Start from the ABSOLUTE beginning of what the student must do:
    → App not installed: Step 1 = Open Play Store → find app → tap Install
    → New account needed: include EVERY signup screen as its own step
- Every distinct screen the user sees = its own step
- Every form field set = its own step
- Every confirmation / permission / SMS code screen = its own step
- The FINAL step must show the student completing the main goal (not just setting up)
- Maximum 13 steps total. This is non-negotiable.
- Name the specific screen and button in each step description

Return JSON:
{
  "difficulty": "simple | medium | complex",
  "mainObjective": "One sentence — what the student will have DONE by the final step",
  "fullStepOutline": [
    "Step 1: [screen name] — [exact action and button]",
    "Step 2: [screen name] — [exact action and button]"
  ]
}`
      }]
    });

    const plan = JSON.parse(response.choices[0].message.content);
    if (plan.fullStepOutline?.length > 13) {
      console.warn(`  ⚠ Plan returned ${plan.fullStepOutline.length} steps — trimming to 13`);
      plan.fullStepOutline = plan.fullStepOutline.slice(0, 13);
    }
    console.log(`  → Plan [${plan.difficulty || "?"}]: "${plan.mainObjective}" — ${plan.fullStepOutline?.length || 0} steps`);
    return plan;
  } catch (e) {
    console.warn("Step planning failed (non-fatal):", e.message);
    return null;
  }
}

// SSE progress tracking for long-running generation
const progressClients = new Map();

app.get("/api/teacher/generate-progress/:id", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });
  progressClients.set(req.params.id, res);
  req.on("close", () => progressClients.delete(req.params.id));
});

function sendProgress(reqId, pct, phase) {
  const client = progressClients.get(reqId);
  if (client) {
    client.write(`data: ${JSON.stringify({ pct, phase })}\n\n`);
  }
}

// SHARED REGIONAL CONTEXT — included in both system prompts below.
const REGION_CONTEXT = `
GEOGRAPHIC AND ECONOMIC CONTEXT YOU KNOW DEEPLY:

KwaXolo is a rural community in Ward 8 of Ray Nkonyeni Local Municipality,
within Ugu District, KwaZulu-Natal South Coast. It is one of 6 Amakhosi
(traditional) areas in the municipality. The N2 freeway divides the
municipality into "two worlds": the developed coastal belt (Margate,
Southbroom, Port Shepstone, Port Edward) with Blue Flag beaches and
established tourism, and the rural hinterland where KwaXolo sits — historically
characterized by poverty, traditional settlements, and cheap labour servicing
the coast.

KwaXolo is only 15 km inland from Margate, Southbroom, and Port Edward — three
major tourism hubs. This proximity is a HUGE business opportunity that most
locals don't see: tourists are right there, ready to spend.

POPULATION AND DEMOGRAPHICS:
- Ugu District: ~755,000 people, 84% rural, 90% Black African
- 81% speak isiZulu as first language
- 38% of the population is under 14 years old
- 58% is working age (15–64)
- KwaXolo specifically: ~7,000 secondary school students across 9 schools,
  ~200 teachers; the wider community is tens of thousands of people.

ECONOMIC REALITY (this is critical context):
- Ugu District unemployment was 28% pre-COVID and has worsened since;
  KwaZulu-Natal youth unemployment is 50%+
- Main district sectors: tourism, agriculture (sugar cane, bananas),
  manufacturing, informal trade
- The KZN South Coast produces 1/5 of all bananas in South Africa
- Township/informal economy across SA generates ~R900 billion annually,
  contributes ~6% of GDP, employs ~3 million people
- Stokvels (rotating savings groups) hold ~R45 billion in collective savings
- Ugu produces world-class coffee (Beaver Creek Coffee Estate, Port Edward) —
  small-scale coffee farming is a recognized growth opportunity
- Ray Nkonyeni Municipality is the economic hub of the district

KEY LOCAL ANCHOR — KWAXOLO CAVES ADVENTURES:
- Major eco-tourism site in KwaXolo: 100,000-year-old San rock art, Via Ferrata
  climbing system, gorge views, waterfall
- Currently undergoing R8-million expansion (Phase 1 done, Phase 2 in progress,
  Phase 3 approved): adding zipline, high-wire bridge, 10 luxury chalets,
  amphitheatre, restaurant, coffee shop
- Already employs 14 local workers; revenue partly funds skills training
- Active demand for adjacent small businesses: horse riding, tent rentals,
  security, team-building, catering, photography, transport
- Tour cost is R150/person; thousands of tourists per year already, scaling fast
- This is the single biggest underutilized economic engine in KwaXolo

EXISTING SUCCESSFUL LOCAL VENTURES (use these as proof points):
- Hlobisile Pearl Studios — photography and event documentation, founded
  through Msenti Hub support; serves schools and community events
- 1LT Bakery — Thabo Shude received an investment loan to open it
- Inkify — Samke Jaca and Ntokozo Gwacela are opening a printer/photocopy store
- KwaXolo Caves Adventures — community-owned tourism enterprise, 14 jobs
- Coffee farming pilot (Ugu District Social Compact, signed Sept 2025) — small
  farmers can now enter the coffee value chain
- KwaNalu's WYRE programme has supported 1,500+ rural KZN entrepreneurs since
  2021, with reported income increases up to 20% within 6 months

REAL SUCCESS STORIES YOU CAN REFERENCE:
- Sibusiso Mfazwe (32, Port St Johns) — went from selling firewood to
  co-owning Sajonisi Chicken Co-operative; supplies chicken, eggs, wood and
  charcoal across 4+ towns
- Bukhosibakhe Dlamini (Ixopo, KZN) — returned home after 8 years in Durban,
  built a poultry business supplying street vendors, tuck shops and
  shisanyama operators; now also farms cabbage, broccoli, peppers
- Andile Mkhize (KZN) — secured a Spar Supermarket spinach contract from
  family farm; now also trains young farmers
- Ntobeko Vilakazi (Mpumalanga) — used a R5,500 phone gift to buy 50 broiler
  chicks instead; now runs Luminathi Agribusiness
- Refiloe Rantekoe — built Borotho Bakery in Soweto during COVID lockdown by
  delivering quality bread when commercial bread became unaffordable

LOCAL PAIN POINTS THE COMMUNITY HAS REPORTED (from KwaXolo Impact field work):
- People travel 3+ hours by bus to Port Shepstone for mobile phone repairs
  because no repair shop exists locally — captive market with zero competition
- Teachers spend 4–6 hours/week creating lesson materials manually instead
  of using free tools
- Local bakeries and small shops do not scale — owners think "make more bread"
  rather than "open a second location" or "supply schools on invoice"
- No local printing/photocopying business — students and parents must travel
- Funerals are frequent and large (50–200 guests in Zulu culture); families
  hire tents, plastic chairs and PA systems from Port Shepstone (R500+
  transport on top of rental); a single tent + 50 chairs covers 2–3 funerals
  per weekend
- SASSA social grant payments happen monthly on the 3rd; hundreds queue 1–3
  hours at payment points; no food vendor, cold-drink seller or phone-charging
  station — captive crowd on a predictable date
- Eggs and live chickens are sold individually door-to-door instead of
  systematically; the 9 schools all need eggs for school meals and pay on
  invoice; spaza shops want reliable weekly stock
- Tourists visit KwaXolo Caves but bring their own food and drinks because
  there's no local tuck shop, refreshment stand or souvenir vendor at the site
  entrance — Phase 2 expansion is adding a restaurant, but small adjacent
  vendors have no competition yet
- Agricultural produce is sold one bag at a time instead of aggregated
- Limited internet means data and airtime are expensive; local WiFi hotspot
  businesses are viable
- Crafts and traditional Zulu attire have demand from tourists 15 km away in
  Margate but no local supply chain delivers there

THE SUPPORT INFRASTRUCTURE THAT EXISTS:
- Msenti Entrepreneurship Hub (KwaXolo) — Caleb Phehlukwayo runs IT/digital
  coordination; offers bookkeeping, business registration support, small loans
- SEDA (Small Enterprise Development Agency), Port Shepstone — official
  government small business support
- KwaNalu WYRE programme — agricultural entrepreneurship training
- Siyazisiza Trust Young Farmers Development Programme — covers Ray Nkonyeni;
  trains youth in poultry breeding, provides business plan support and
  potential investment capital
- ABSA Agribusiness Development — funded R300k for 94 KZN agri-entrepreneurs
- South Coast Tourism & Investment Enterprise (SCTIE) — actively investing
  in KwaXolo; supports adjacent small businesses

CONSTRAINTS YOU RESPECT:
- Capital is scarce. Most ventures must start under R5,000 (about $270).
  Some can start under R500.
- Digital literacy is in early stages — "use a computer" is itself a skill
  many adults are still learning.
- Trust and word-of-mouth matter more than marketing.
- Customers are often the same 500–5,000 people in nearby villages, plus
  tourists at the Caves and beachgoers 15 km away.
- Transport is expensive and slow. Many people don't own a car.
- Load-shedding can affect business hours; solar/battery is increasingly used.
- Crime: theft of stock and equipment is a real risk; secure storage matters.
- Water access is unreliable in parts of the district.

THE COMMUNITY ECONOMIC RIPPLE EFFECT:
When one person starts a successful business in a rural community like
KwaXolo, the impact multiplies. A poultry farmer hires 1–2 helpers, buys
feed from a local supplier, sells eggs to spaza shops which then have
reliable stock, schools get cheaper eggs which means lower meal costs, and
the helpers' families have more income which gets spent in other local shops.
Ubuntu and "paying it forward" are real here — successful entrepreneurs
mentor others and create knock-on opportunities. Money that stays local
multiplies; money sent to Port Shepstone or Durban is gone.
`;

// OPPORTUNITY ADVISOR PROMPT
const KWAXOLO_CONTEXT = `
You are an opportunity-spotting business advisor with 20 years of experience
in rural KwaZulu-Natal, South Africa. You specifically know the KwaXolo
region. You have personally helped dozens of young people and families start
ventures that now feed multiple households. You speak warmly and directly.
${REGION_CONTEXT}

YOUR JOB:
The user is a young person, teacher, or local entrepreneur in KwaXolo. They
will tell you something they have observed, struggled with, or are curious
about. Your job is NOT to teach them general business theory. Your job is to:

1. Spot the specific opportunity hiding in their observation.
2. Show them market size in concrete numbers (how many potential customers,
   how much they would pay, where the customers come from).
3. Cite a real success story of someone who has done something similar in
   rural South Africa, so they can SEE that this is possible — not theory.
4. Suggest a realistic first step that costs little and uses skills they
   could plausibly learn.
5. Explain who benefits from this venture beyond just the founder — how does
   the family, neighbours, schools, or wider KwaXolo community gain?
6. Connect them to the Msenti Hub when they are ready.

YOUR TONE:
- Warm, direct, plain language. Not corporate. Like a wise uncle, not a
  consultant.
- Never lecture. Always concrete.
- Use rand (R) for money. Reference real local places: Margate (15 km),
  Southbroom (15 km), Port Edward (15 km), Port Shepstone (45 km), Durban
  (130 km), KwaXolo Caves Adventures, the N2 freeway.
- Avoid generic advice like "build a brand" or "use social media." Be
  specific to rural KZN reality.
- It's okay to push back gently if the user underestimates themselves
  ("Open a second bakery" is a fine answer, even if it sounds bold).
- When you cite a success story, name the person and what they actually did.
  This is much more powerful than abstract claims.

WHEN TO ASK A FOLLOW-UP VS. WHEN TO PROPOSE:
Ask one follow-up question (mode: "needs_more_info") when ANY of these is true:
- The user's input is very general ("I want to start a business")
- You don't know what skills or resources they already have
- You don't know their constraints (capital available, time, location specifics)
- The opportunity could go in 3+ very different directions depending on details

Ask AT MOST 3 follow-up questions in total across a conversation. After 3
follow-ups, you MUST commit to a "ready" response even if information is
imperfect — better to give a concrete suggestion they can react to than to
keep interrogating them.

Return mode "ready" when:
- The user has given a specific observation or situation
- You can name a specific opportunity tied to their context
- You can give realistic numbers (even if estimated)
- The user explicitly asks you to propose something now

Good follow-up questions are SHORT, SPECIFIC, and feel like a friend asking,
not a form. Examples:
- "Roughly how much money could you put into this to start — under R1,000, around R5,000, or more?"
- "Do you already have any of the equipment, or would you start from scratch?"
- "Are you thinking of doing this full-time, or alongside school/work?"

Bad follow-up questions (do NOT do this):
- "Please describe your background, skills, and goals." (too broad)
- "What is your business plan?" (they don't have one yet — that's why they're here)

RESPONSE FORMAT:
Always respond as JSON matching exactly ONE of these two schemas (no markdown code fences):

When you need more information:
{
  "mode": "needs_more_info",
  "question": "A single, specific follow-up question. Friendly and short.",
  "reasoning": "1 sentence on why you need this info (shown to user as helper text)."
}

When you are ready to propose:
{
  "mode": "ready",
  "acknowledgment": "1-2 sentences showing you heard them.",
  "opportunity": {
    "title": "Short name of the opportunity, max 6 words.",
    "summary": "2-3 sentences explaining the opportunity, including WHY this matters for KwaXolo specifically (proximity to tourists at the Caves, captive market, no competitor, etc).",
    "marketSize": "Concrete numbers: how many customers, what they would pay. Reference specific local groups (e.g. '~7,000 students across 9 schools', 'tourists visiting KwaXolo Caves', 'SASSA queue of 200+ on the 3rd of each month').",
    "estimatedMonthlyEarnings": "Realistic range in rand, e.g. 'R3,000 – R8,000'."
  },
  "successStory": {
    "name": "Name of a real person from rural South Africa who has done something similar.",
    "story": "2-3 sentences describing what they did and what result they achieved. Use real cases like Sibusiso Mfazwe (Port St Johns chicken co-op), Bukhosibakhe Dlamini (Ixopo poultry), Ntobeko Vilakazi (used R5,500 for 50 broilers), Andile Mkhize (Spar spinach contract), Refiloe Rantekoe (Soweto bakery), Hlobisile Pearl Studios (KwaXolo photography), Thabo Shude (1LT Bakery KwaXolo), or KwaXolo Caves Adventures itself. Pick the one that fits best. Be honest if there's no perfect match — pick the closest one and adapt the lesson."
  },
  "firstSteps": [
    "Step 1: very specific, doable this week.",
    "Step 2: very specific, builds on step 1.",
    "Step 3: very specific, gets to first customer or first revenue."
  ],
  "skillsNeeded": ["skill 1", "skill 2", "skill 3"],
  "estimatedStartupCost": "Concrete rand amount or range, broken down where useful (e.g. 'R3,000–R5,000: R1,500 for tools, R1,000 for first stock, R500 for transport')",
  "communityImpact": {
    "founderBenefit": "1 sentence: how does the founder personally benefit (income, independence, skills)?",
    "familyBenefit": "1 sentence: how does the founder's family benefit?",
    "communityBenefit": "2-3 sentences: how does this venture put money back into KwaXolo? Who else benefits — customers, employees, suppliers, schools, the village economy as a whole? Mention specific knock-on effects (e.g. 'spaza shops get reliable supply at lower prices, which lets them charge less, which means families spend less on basics')."
  },
  "connectToMsenti": "1-2 sentences on what Msenti Hub specifically can help with for THIS idea: business registration, bookkeeping, small loan for startup capital, IT support from Caleb, connection to SEDA in Port Shepstone, etc. Be specific."
}
`;

// ROUTE: /api/opportunity
// Takes the user's observation and returns a structured opportunity.
app.post("/api/opportunity", async (req, res) => {
  if (!openai) return res.status(503).json({ error: "Azure OpenAI not configured." });
  const { observation, history } = req.body;

  if (!observation || typeof observation !== "string") {
    return res.status(400).json({ error: "Missing 'observation' string." });
  }

  const priorMessages = Array.isArray(history) ? history : [];

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL_TEACHER,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: KWAXOLO_CONTEXT },
        ...priorMessages,
        { role: "user", content: observation },
      ],
      temperature: 0.7,
    });

    const raw = completion.choices[0].message.content;
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    console.error("Azure OpenAI error:", err);
    res.status(500).json({ error: "AI request failed.", detail: err.message });
  }
});

// ROUTE: /api/refine
// Follow-up: user asks a question about the opportunity (e.g. "how do I
// scale this?"). Keeps conversation going.
app.post("/api/refine", async (req, res) => {
  if (!openai) return res.status(503).json({ error: "Azure OpenAI not configured." });
  const { history, question } = req.body;

  if (!Array.isArray(history) || !question) {
    return res.status(400).json({ error: "Need history array and question." });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL_TEACHER,
      messages: [
        { role: "system", content: KWAXOLO_CONTEXT.replace(/RESPONSE FORMAT:[\s\S]*$/, "RESPONSE FORMAT: Reply in plain text, 3-5 sentences, concrete and specific.") },
        ...history,
        { role: "user", content: question },
      ],
      temperature: 0.7,
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error("Azure OpenAI error:", err);
    res.status(500).json({ error: "AI request failed.", detail: err.message });
  }
});

// ROUTE: /api/translate
const translationCache = new Map();

app.post("/api/translate", async (req, res) => {
  if (!openai) {
    return res.status(503).json({ error: "Translation service unavailable (no API key)." });
  }

  const { text, targetLang } = req.body;
  if (!text || !targetLang) {
    return res.status(400).json({ error: "text and targetLang are required." });
  }
  if (!["en", "zu"].includes(targetLang)) {
    return res.status(400).json({ error: "targetLang must be 'en' or 'zu'." });
  }

  const cacheKey = targetLang + ":" + JSON.stringify(text);
  if (translationCache.has(cacheKey)) {
    return res.json({ translated: translationCache.get(cacheKey) });
  }

  const isObject = typeof text === "object";
  const direction = targetLang === "zu" ? "from English to isiZulu (Zulu)" : "from isiZulu (Zulu) to English";

  const systemPrompt = `You are a professional translator ${direction}, as spoken in KwaZulu-Natal, South Africa. Translate accurately and naturally for a Grade 8–12 audience. Preserve proper nouns exactly: KwaXolo, Port Shepstone, Margate, Southbroom, Port Edward, Durban, Msenti Hub, SASSA, SEDA, Microsoft, Khan Academy, KwaXolo Caves Adventures, WhatsApp, Gmail. Preserve all numbers and currency (R amounts) exactly. ${isObject ? "Translate all string values in the JSON, preserve the exact same structure, and return ONLY valid JSON with no markdown fences or commentary." : "Return ONLY the translated text — no explanation, no quotes, no markdown."}`;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL_TEACHER,
      response_format: isObject ? { type: "json_object" } : undefined,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: isObject ? JSON.stringify(text) : text },
      ],
      temperature: 0.3,
    });

    const raw = completion.choices[0].message.content;
    const translated = isObject ? JSON.parse(raw) : raw;
    translationCache.set(cacheKey, translated);
    res.json({ translated });
  } catch (err) {
    console.error("Translate error:", err);
    res.status(500).json({ error: "Translation failed.", detail: err.message });
  }
});

// ROUTES: /api/courses

app.get("/api/courses", (req, res) => {
  const { category } = req.query;
  const courses = listCourses(category ? { category } : {});
  res.json(courses);
});

app.get("/api/courses/:id", (req, res) => {
  const course = getCourse(req.params.id);
  if (!course) return res.status(404).json({ error: "Course not found." });
  res.json(course);
});

app.post("/api/courses", (req, res) => {
  const { title, description, category, level, duration_minutes, lessons, created_by } =
    req.body;
  if (!title || !description) {
    return res.status(400).json({ error: "title and description are required." });
  }
  const course = createCourse({ title, description, category, level, duration_minutes, lessons, created_by });
  res.status(201).json(course);
});

// ── Alias guide file content to Marcus's variable names ──────────────────────
const EXAMPLE_LESSON   = GUIDE_FILES.exampleLesson;
const EXAMPLE_TASK     = GUIDE_FILES.exampleTask;
const CONSTRAINTS      = GUIDE_FILES.constraints;
const ENGLISH_STD      = GUIDE_FILES.englishStandard;
const HOVER_RULES      = GUIDE_FILES.hoverRules;
const LESSON_STRUCT    = GUIDE_FILES.lessonStructure;
const QUALITY_CHECK    = GUIDE_FILES.qualityChecklist;
const EXERCISE_SPEC    = GUIDE_FILES.exerciseTypes;
const INTERACTION_PAT  = GUIDE_FILES.interactionPat;
const TASK_STRUCTURE   = GUIDE_FILES.taskStructure;

// ── Screen type targets ──────────────────────────────────────────────────────
const SCREEN_TARGETS = {
  android_home:        ["Play Store","Gmail","WhatsApp","WhatsApp Business","Facebook","Instagram","TikTok","Canva","Google Maps","Google Sheets","YouTube","Settings","Files","Calculator","Phone","Messages","Chrome","All apps"],
  play_store_search:   ["Search for apps & games","Voice search","Back"],
  play_store_app:      ["Install","Open","Back"],
  chrome_browser:      ["Address bar","Search bar","Back","Forward","Tabs","Menu"],
  gmail_welcome:       ["Create account","Sign in"],
  gmail_account_type:  ["For myself","For my child","For work or my business"],
  gmail_signup_name:   ["First name","Last name","Next"],
  gmail_signup_user:   ["Username","Gmail address","Next"],
  gmail_signup_pass:   ["Password","Confirm","Next"],
  gmail_inbox:         ["Compose"],
  gmail_compose:       ["To","Subject","Body","Send"],
  whatsapp_welcome:    ["Agree and Continue"],
  whatsapp_phone:      ["Phone number","Next"],
  whatsapp_verify:     ["SMS code","Verify"],
  whatsapp_setup_name: ["Profile photo","Your name","Next"],
  whatsapp_chat_list:  ["New chat"],
  whatsapp_chat:       ["Type a message","Send"],
  whatsapp_business:   ["Profile photo","Business name","Category","Description","Business hours","Save"],
  facebook_feed:       ["What's on your mind","Photo","Marketplace","Home","Menu","Search"],
  facebook_create_post:["Post","Write something","Photo/Video","Tag People","Feeling"],
  facebook_marketplace:["Sell"],
  fb_listing_form:     ["Add photo","Price","Title","Category","Location","Description","Next"],
  sheets_blank:        ["Cell A1","Cell B1","Cell C1","Cell A2","Cell B2","Cell C2","Cell A3","Cell B3","Cell C3"],
  sheets_data:         ["Date","Description","Amount","Row 5","Total"],
};

const DEFAULT_TARGET_BY_SCREEN = {
  android_home:        "Play Store",
  play_store_search:   "Search for apps & games",
  play_store_app:      "Install",
  gmail_welcome:       "Create account",
  gmail_account_type:  "For myself",
  gmail_signup_name:   "Next",
  gmail_signup_user:   "Next",
  gmail_signup_pass:   "Next",
  gmail_inbox:         "Compose",
  gmail_compose:       "Send",
  whatsapp_welcome:    "Agree and Continue",
  whatsapp_phone:      "Next",
  whatsapp_verify:     "SMS code",
  whatsapp_setup_name: "Next",
  whatsapp_chat_list:  "New chat",
  whatsapp_chat:       "Send",
  whatsapp_business:   "Save",
  facebook_feed:       "Marketplace",
  facebook_create_post:"Post",
  facebook_marketplace:"Sell",
  fb_listing_form:     "Next",
  sheets_blank:        "Cell A1",
  sheets_data:         "Amount",
  chrome_browser:      "Address bar",
};

function screenTargetContractBlock() {
  return Object.entries(SCREEN_TARGETS)
    .map(([screen, targets]) => `${screen}: ${targets.join(", ")}`)
    .join("\n");
}

function labelMatches(elLabel, targetLabel) {
  if (!targetLabel) return false;
  const clean = s => String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const el = clean(elLabel), tg = clean(targetLabel);
  if (!el || !tg) return false;
  if (el === tg || el.includes(tg) || tg.includes(el)) return true;
  const stop = new Set(["the","and","for","your","this","that","then","from","with","into","how","what","you","tap","press","click","now","next"]);
  const sig = s => s.split(" ").filter(w => w.length > 2 && !stop.has(w));
  return sig(el).some(w => sig(tg).includes(w));
}

function visibleTargetsForStep(step, lesson) {
  const base = SCREEN_TARGETS[step.screenType] || [];
  const appName = lesson.appName || "";
  if (step.screenType === "android_home" && appName) return [...new Set([...base, appName])];
  if (step.screenType === "play_store_search" && appName) return [...new Set([...base, appName])];
  if (step.screenType === "generic" && step.targetLabel) return [step.targetLabel, "Input"];
  return base;
}

function normalizeTargetLabel(step, lesson) {
  const targets = visibleTargetsForStep(step, lesson);
  if (!targets.length) return true;
  const current = step.targetLabel || "";
  const exact = targets.find(t => labelMatches(t, current));
  if (exact) {
    if (step.targetLabel !== exact) step.targetLabel = exact;
    return true;
  }
  step.targetLabel = DEFAULT_TARGET_BY_SCREEN[step.screenType] || targets[0];
  return false;
}

function inferScreenTypeFromStep(step, lesson) {
  const t = [step.screenName, step.targetLabel, step.teach, step.question].filter(Boolean).join(" ").toLowerCase();
  const app = (lesson.appName || "").toLowerCase();

  if (Number(step.number) === 1 && (t.includes("home screen") || t.includes("play store") || t.includes("open") || t.includes("find"))) {
    return "android_home";
  }
  if (t.includes("app page") || t.includes("app listing") || t.includes("tap install") || t.includes("install button") || t.includes("download the app") || t.includes("button changes to open") || (step.targetLabel||"").toLowerCase() === "install" || (step.targetLabel||"").toLowerCase() === "open") {
    return "play_store_app";
  }
  if (t.includes("search for apps") || t.includes("search bar") || t.includes("type the app name") || (step.targetLabel||"").toLowerCase() === "search for apps & games") {
    return "play_store_search";
  }
  if (app.includes("gmail") && (t.includes("account type") || t.includes("for myself"))) return "gmail_account_type";
  if (app.includes("gmail") && (t.includes("welcome to gmail") || (t.includes("create account") && t.includes("sign in")))) return "gmail_welcome";
  if (app.includes("facebook") && (t.includes("marketplace icon") || t.includes("shopping bag") || t.includes("main facebook screen"))) return "facebook_feed";
  if (app.includes("facebook") && (t.includes("marketplace screen") || t.includes("marketplace browse") || t.includes("tap sell"))) return "facebook_marketplace";
  return "";
}

function applyDeterministicScreenCorrections(lesson, label = "screen sync") {
  const corrected = [];
  (lesson.steps || []).forEach(step => {
    if (!step) return;
    const before = step.screenType || "generic";
    const inferred = inferScreenTypeFromStep(step, lesson);
    if (inferred && before !== inferred) {
      step.screenType = inferred;
      corrected.push(`Step ${step.number}: ${before} → ${inferred}`);
    }
  });
  if (corrected.length) console.warn(`  ⚠ ${label}: ${corrected.join(" | ")}`);
  return lesson;
}

// ── Common context block (shared by teacher + student prompts) ────────────────
function commonContextBlock(catRules) {
  const examples = loadFewShotExamples() || "";
  return `═══════════════════════════════════════════
REFERENCE EXAMPLES — MATCH THIS QUALITY
═══════════════════════════════════════════

REFERENCE TEACHER LESSON PLAN:
${EXAMPLE_LESSON}

REFERENCE STUDENT TASK:
${EXAMPLE_TASK}

${examples ? examples + "\n" : ""}
═══════════════════════════════════════════
CORE CONSTRAINTS (non-negotiable)
═══════════════════════════════════════════
${CONSTRAINTS}

═══════════════════════════════════════════
LANGUAGE RULES
═══════════════════════════════════════════
${ENGLISH_STD}

═══════════════════════════════════════════
ISIZULU HOVER WORD RULES
═══════════════════════════════════════════
${HOVER_RULES}

═══════════════════════════════════════════
CATEGORY-SPECIFIC RULES
═══════════════════════════════════════════
${catRules}

═══════════════════════════════════════════
LOCAL CONTEXT — always use named references
═══════════════════════════════════════════
You MUST reference at least one of these by name where local grounding applies:
- Msenti Entrepreneurship Hub — Victor Jaca (CEO). Business registration, mentorship, IT support.
- SEDA Port Shepstone — free government business registration
- Dolly Dlezi — accountant at Msenti Hub
- Caleb Phehlukwayo — former school principal, community trust figure
- Chief Inkosi Xolo — traditional Zulu authority
- 1LT Bakery — Thabo Shude. Started from his kitchen.
- Hlobisile Pearl Studios — photography and events
- Inkify — Samke Jaca and Ntokozo Gwacela, print store
- Capitec — most accessible bank (no minimum balance)
- MTN Mobile Money / FNB eWallet — mobile payments, no bank account required
- WhatsApp — the PRIMARY business communication tool

Generic examples are REJECTED. Name a specific person/business/place.

═══════════════════════════════════════════
WHAT THE AGENT MUST NEVER DO
═══════════════════════════════════════════
${GUIDE_FILES.neverDo}`;
}

// ── Phase 3a: Teacher material ────────────────────────────────────────────────
async function generateTeacherMaterial(inputs, uiContext, plan, catRules) {
  const systemPrompt = `You are an entrepreneurship curriculum assistant for KwaXolo Impact.
You generate the TEACHER-FACING half of a lesson for teachers in rural KwaZulu-Natal, South Africa.
Output is read by the teacher to deliver class with chalk and a blackboard only.
The student-facing task steps are generated separately. Do NOT generate steps here.

${REGION_CONTEXT}

${commonContextBlock(catRules)}

═══════════════════════════════════════════
TEACHER LESSON PLAN STRUCTURE
═══════════════════════════════════════════
${LESSON_STRUCT}

═══════════════════════════════════════════
QUALITY CHECKLIST (run silently before returning)
═══════════════════════════════════════════
${QUALITY_CHECK}

Main objective for this lesson: ${plan.mainObjective}

Student task plan the teacher must prepare students for:
${(plan.fullStepOutline || []).map((s, i) => `${i + 1}. ${s}`).join("\n")}

Real app UI from web search (for context only — do not turn this into a projector demo):
${uiContext || "(no web search context)"}`;

  const userMsg = `Generate the TEACHER MATERIAL ONLY for: "${inputs.topic}"

What students struggle with: ${inputs.struggles || "none noted"}
Available class time: ${inputs.time || "45 minutes"}
Class context: ${inputs.context || "none provided"}

Return ONLY valid JSON in this exact shape:

{
  "teacherTitle": "Plain-language title, max 8 words, no jargon",
  "teacherObjective": "By the end of this lesson, students can... [one concrete, checkable sentence]",
  "teacherPrep": [
    "One short thing to prepare before class",
    "One short thing to write/check before class",
    "One short grouping/material note"
  ],
  "teacherBoardPoints": ["Point 1 — max 6 words","Point 2 — max 6 words","Point 3 — max 6 words","Point 4 — max 6 words","Point 5 — max 6 words"],
  "teacherBoardLayout": {
    "title": "Exact title to write at top of board",
    "leftColumn": ["Key word: simple meaning","Key word: simple meaning"],
    "rightColumn": ["Simple class step 1","Simple class step 2","Simple class step 3"],
    "bottomLine": "One reminder/question to keep on the board"
  },
  "teacherScript": [
    { "section": "Open",    "minutes": 5,  "say": "Short words the teacher can say directly. No projector.", "do": "Physical classroom action." },
    { "section": "Explain", "minutes": 10, "say": "Simple explanation with a NAMED KZN reference.", "do": "How to use the board and questions to teach it." },
    { "section": "Practice","minutes": 15, "say": "How to send students into the phone task.", "do": "How to group students and walk around." },
    { "section": "Check",   "minutes": 5,  "say": "What to ask at the end to check understanding.", "do": "What evidence to look for." }
  ],
  "teacherExplanation": "2 short paragraphs. Grade 8 English, one named KZN example, connects to the student task.",
  "teacherVocabulary": [
    { "word": "One important word", "simpleMeaning": "Simple meaning in plain English", "isiZuluSupport": "Non-empty isiZulu support word or borrowed term" }
  ],
  "teacherDiscussionQuestions": ["Open question 1?","Open question 2?","Open question 3?"],
  "teacherLocalExample": "2 sentences. Sentence 1: what the named KZN person/place is and WHERE. Sentence 2: how it uses this lesson skill.",
  "teacherDevicePlan": {
    "ifEnoughDevices": "How to run the task if enough phones/PCs are available.",
    "ifSharedDevices": "How groups should rotate roles when 4–6 students share one device.",
    "ifNoInternet": "A chalk/blackboard or notebook fallback that still teaches the concept."
  },
  "teacherCommonMistakes": [
    { "mistake": "Likely student mistake or confusion", "teacherResponse": "What the teacher should say or do to help" }
  ],
  "teacherAssessment": ["One visible result to check","One question students should answer","One notebook/group output to collect"],
  "teacherTimeGuide": ["5 min: opening and board","10 min: explanation","15 min: student task or no-internet fallback","5 min: check and wrap-up"],
  "teacherWrapUpQuestion": "One final question students answer in one sentence.",
  "teacherExtension": "Optional task for faster groups."
}

teacherVocabulary MUST include 6–8 items with non-empty isiZuluSupport for every row.
teacherLocalExample MUST first explain what the example is and where, then how it uses the topic.
teacherExplanation AND teacherLocalExample MUST name a specific KZN entity from the local context list.`;

  const response = await openai.chat.completions.create({
    model: MODEL_TEACHER,
    response_format: { type: "json_object" },
    max_tokens: 8000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userMsg }
    ]
  });

  console.log(`  Teacher: ${response.usage?.total_tokens || "?"} tokens`);
  return JSON.parse(response.choices[0].message.content);
}

// ── Phase 3b: Student material ────────────────────────────────────────────────
async function generateStudentMaterial(inputs, uiContext, plan, catRules, appDesignMD) {
  const screenTypesBlock = `
VALID screenType VALUES (use EXACTLY one per step):
  android_home         → Android phone home screen with app icons grid (use for step 1 when student opens an app)
  play_store_search    → Play Store search screen with results
  play_store_app       → App detail page: name, icon, Install/Open button, reviews
  gmail_welcome        → Gmail first-launch welcome: "Create account" + "Sign in" buttons
  gmail_account_type   → Google account type menu: "For myself", "For my child", "For work or my business"
  gmail_signup_name    → Enter first name, last name
  gmail_signup_user    → Choose Gmail address
  gmail_signup_pass    → Create a strong password
  gmail_inbox          → Gmail inbox listing received emails
  gmail_compose        → Compose window: To, Subject, Body fields
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
  chrome_browser       → Chrome browser: address bar, search box, or results page
  generic              → Any app not listed

VISUAL ACCURACY RULES:
- Step 1 → MUST be android_home (student taps app icon from home screen)
- Gmail first-launch welcome (Create account + Sign in) → gmail_welcome, NOT generic
- Gmail account type menu (For myself) → gmail_account_type, NOT gmail_welcome
- Creating Gmail account → gmail_welcome → gmail_account_type → gmail_signup_name → gmail_signup_user → gmail_signup_pass
- Chrome/browser steps → MUST be chrome_browser, NOT play_store_search or generic`;

  const systemPrompt = `You are an entrepreneurship curriculum assistant for KwaXolo Impact.
You generate the STUDENT-FACING task — the Duolingo-style step-by-step phone walkthrough.
The teacher-facing lesson plan is generated separately. Focus all effort on the steps.

${REGION_CONTEXT}

${commonContextBlock(catRules)}

═══════════════════════════════════════════
STUDENT TASK STRUCTURE
═══════════════════════════════════════════
${TASK_STRUCTURE}

═══════════════════════════════════════════
EXERCISE TYPES (Duolingo-style active learning)
═══════════════════════════════════════════
${EXERCISE_SPEC}

═══════════════════════════════════════════
INTERACTION PATTERNS AND FAIL-RECOVERY
═══════════════════════════════════════════
${INTERACTION_PAT}

═══════════════════════════════════════════
PHONE SCREEN TYPES
═══════════════════════════════════════════
${screenTypesBlock}

VISIBLE TARGET CONTRACT — targetLabel must be one of the visible controls for that screenType:
${screenTargetContractBlock()}
${appDesignMD ? `\n═══════════════════════════════════════════\nAPP UI DESIGN REFERENCE\n═══════════════════════════════════════════\n${appDesignMD}` : ""}
═══════════════════════════════════════════
QUALITY CHECKLIST (run silently before returning)
═══════════════════════════════════════════
${QUALITY_CHECK}

═══════════════════════════════════════════
STEP PLAN TO FOLLOW EXACTLY
Main objective: ${plan.mainObjective}
═══════════════════════════════════════════
Expand EACH of these into a full step object. Do not merge. Do not skip.
${(plan.fullStepOutline || []).map((s, i) => `${i + 1}. ${s}`).join("\n")}

Real app UI from web search (use exact button and screen names):
${uiContext || "Use your knowledge of the real app UI."}`;

  const userMsg = `Generate the STUDENT TASK ONLY for: "${inputs.topic}"

You must generate ALL ${(plan.fullStepOutline || []).length} steps listed in the step plan above.
Never generate more than 13 steps total. Target 10–13 steps.

Return ONLY valid JSON in this exact shape:

{
  "appName": "Exact app name as it appears in the app store",
  "appColor": "#hex brand colour",
  "appTextColor": "#fff or #1A1A1A",
  "taskTitle": "Task title matching the lesson topic",
  "taskIntro": "One active-voice sentence: what the student will HAVE when they finish",
  "whatYouWillDo": "One active-voice sentence",
  "taskTime": "10–15 minutes",
  "thinkAboutThis": "Personal reflection question connecting to real life, cannot be yes/no",
  "taskReflection": "Same as thinkAboutThis but longer form — 1-2 sentences",
  "steps": [
    {
      "number": 1,
      "screenType": "android_home",
      "screenName": "Home Screen",
      "targetLabel": "Play Store",
      "sampleData": { "Label shown on phone": "Concrete dummy value" },
      "teach": "2–3 sentences. What is on this screen. What to do and why. Fail-recovery hint if needed.",
      "exerciseType": "tap_correct",
      "question": "The question the student must answer correctly to advance.",
      "options": ["Option A","Option B","Option C","Option D"],
      "correctAnswer": "Option B",
      "acceptedAnswers": [],
      "tiles": [],
      "correctOrder": [],
      "pairs": [],
      "instruction": "",
      "visibleResult": "",
      "feedbackCorrect": "Confirms what they just learned. Names the button/screen. 1 sentence.",
      "feedbackWrong": "Tells exactly WHERE to look or what to try. Never just 'Try again'. 1 sentence.",
      "tip": "One specific common mistake for this step, or empty string"
    }
  ]
}

FIELD RULES BY EXERCISE TYPE:
- tap_correct:    fill options (3–4 items) + correctAnswer. Others empty.
- fill_blank:     fill acceptedAnswers (lowercase strings array). Others empty.
- arrange_steps:  fill tiles (shuffled) + correctOrder (correct sequence). Others empty.
- match_pairs:    fill pairs as [{term, match}] (max 4 pairs). Others empty.
- do_and_confirm: fill instruction + visibleResult + options + correctAnswer. Others empty.

Always include feedbackCorrect AND feedbackWrong for EVERY step.
Always include targetLabel for EVERY step. Must match a visible button/icon/field on that screenType.
Use sampleData when the screen shows user/business/payment/listing/account details. Use safe dummy data:
  Payment: Recipient "Thandi Ndlovu", Mobile "072 123 4567", Amount "R50.00", Reference "Lunch order"
  Customer/email: Customer "Ms Dlamini", Email "customer@example.com"
  Listing: Product "School calculator", Price "R120", Location "KwaXolo"
  Account: Name "Thandi Ndlovu", Business "Thandi's Snacks", Username "thandi.ndlovu"
Vary exerciseTypes — never more than 3 tap_correct in a row.
Use do_and_confirm for any step requiring real phone action.
Use arrange_steps at least once if the topic involves a sequence.`;

  const response = await openai.chat.completions.create({
    model: MODEL_STUDENT,
    response_format: { type: "json_object" },
    max_tokens: 16000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userMsg }
    ]
  });

  console.log(`  Student: ${response.usage?.total_tokens || "?"} tokens`);
  return JSON.parse(response.choices[0].message.content);
}

// ── Phase 3: Parallel teacher + student generation ────────────────────────────
async function generateLesson(inputs, uiContext, plan) {
  const cat = detectCategory(inputs.topic);
  const catRules = getCategoryRules(cat);
  const appName = detectAppName(inputs.topic);
  const appDesignMD = appName ? loadAppDesignMD(appName) : "";

  console.log(`  Category: ${cat} | App: ${appName || "(none)"} | Teacher: ${MODEL_TEACHER} | Student: ${MODEL_STUDENT}`);

  const [teacherPart, studentPart] = await Promise.all([
    generateTeacherMaterial(inputs, uiContext, plan, catRules),
    generateStudentMaterial(inputs, uiContext, plan, catRules, appDesignMD),
  ]);

  const lesson = { ...teacherPart, ...studentPart };

  // Non-blocking: auto-generate app design MD for new apps
  if (appName && !appDesignMD) {
    maybeGenerateAppDesignMD(appName, uiContext).catch(() => {});
  }

  return lesson;
}

// ── Validator 1: step count ───────────────────────────────────────────────────
async function validateStepCount(lesson, topic, plan) {
  const count = (lesson.steps || []).length;
  if (count > 13) {
    lesson.steps = lesson.steps.slice(0, 13).map((s, i) => ({ ...s, number: i + 1 }));
    console.warn(`  ⚠ Step count capped at 13`);
    return lesson;
  }
  const minByDifficulty = { simple: 10, medium: 10, complex: 12 };
  const min = Math.min(minByDifficulty[plan?.difficulty] || 10, 13);
  if (count >= min) {
    console.log(`  → Step count OK: ${count} steps`);
    return lesson;
  }

  console.log(`  ⚠ Only ${count} steps — requesting missing steps to reach ${min}`);
  const existing = lesson.steps.map(s =>
    `Step ${s.number}: [${s.screenType}] ${s.screenName} — ${(s.teach || "").slice(0, 100)}`
  ).join("\n");

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_STUDENT,
      response_format: { type: "json_object" },
      max_tokens: 6000,
      messages: [{
        role: "user",
        content: `A lesson about "${topic}" only has ${count} steps. It needs at least ${min} and at most 13.
Main objective: ${plan?.mainObjective}

Existing steps:
${existing}

Generate the MISSING steps to reach at least ${min} total. Continue naturally from the last step.
Use the same step schema. Vary the exerciseTypes. Never exceed 13 total.

${screenTargetContractBlock()}

Return JSON: { "additionalSteps": [ ...step objects... ] }`
      }]
    });

    const extra = JSON.parse(response.choices[0].message.content);
    if (extra.additionalSteps?.length > 0) {
      const offset = lesson.steps.length;
      const slots = Math.max(0, 13 - offset);
      lesson.steps = [
        ...lesson.steps,
        ...extra.additionalSteps.slice(0, slots).map((s, i) => ({ ...s, number: offset + i + 1 }))
      ];
      console.log(`  → Added ${extra.additionalSteps.length} steps — now ${lesson.steps.length} total`);
    }
  } catch (e) {
    console.warn("  ⚠ Step count validator failed (non-fatal):", e.message);
  }
  return lesson;
}

// ── Validator 2: local grounding ──────────────────────────────────────────────
const KNOWN_KZN_ENTITIES = [
  "msenti","seda","1lt bakery","inkify","hlobisile pearl studios",
  "victor jaca","dolly dlezi","caleb phehlukwayo","chief inkosi xolo",
  "thabo shude","samke jaca","ntokozo gwacela",
  "mtn mobile money","mtn momo","capitec",
  "port shepstone","kwazulu-natal","kwazulu natal"
];

function validateLocalGrounding(lesson) {
  const combined = (lesson.teacherExplanation || "") + " " + (lesson.teacherLocalExample || "");
  const passed = KNOWN_KZN_ENTITIES.some(name => combined.toLowerCase().includes(name));
  console.log(passed ? "  → Local grounding check passed" : "  ⚠ Local grounding check FAILED — no named KZN entity found");
  return lesson;
}

// ── Validator 3: exercise fields ──────────────────────────────────────────────
async function validateExercises(lesson) {
  const summary = lesson.steps.map(s =>
    `Step ${s.number}: type="${s.exerciseType}", options=${JSON.stringify(s.options||[])}, correctAnswer="${s.correctAnswer||""}", acceptedAnswers=${JSON.stringify(s.acceptedAnswers||[])}, tiles=${(s.tiles||[]).length}, pairs=${(s.pairs||[]).length}, feedbackCorrect="${(s.feedbackCorrect||"").slice(0,40)}", feedbackWrong="${(s.feedbackWrong||"").slice(0,40)}"`
  ).join("\n");

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_TEACHER,
      response_format: { type: "json_object" },
      max_tokens: 800,
      messages: [{
        role: "user",
        content: `Check these ${lesson.steps.length} lesson steps for REAL problems only:
${summary}

Flag only genuine issues:
1. exerciseType missing or not one of the 5 valid types
2. tap_correct: no options or no correctAnswer
3. fill_blank: empty acceptedAnswers
4. arrange_steps: no tiles or no correctOrder
5. match_pairs: no pairs
6. do_and_confirm: no instruction or no options
7. feedbackCorrect empty or just "Correct!"
8. feedbackWrong empty or just "Try again"
9. All steps identical exerciseType

Return JSON: { "valid": true } if no real issues.
Return JSON: { "valid": false, "issues": ["Step 2: ..."] } listing real issues only.`
      }]
    });

    const check = JSON.parse(response.choices[0].message.content);
    if (!check.valid && check.issues) {
      console.warn("  ⚠ Exercise issues:", check.issues.join(" | "));
    } else {
      console.log(`  → Exercise validation passed (${lesson.steps.length} steps)`);
    }
  } catch (e) {
    console.warn("  ⚠ Exercise validator failed (non-fatal):", e.message);
  }
  return lesson;
}

// ── Validator 4: screen types ─────────────────────────────────────────────────
async function validateScreenTypes(lesson, topic) {
  applyDeterministicScreenCorrections(lesson, "pre-validator visual sync");

  // Hard rule: step 1 → android_home if it implies opening from home screen
  if (lesson.steps[0] && lesson.steps[0].screenType !== "android_home") {
    const firstTeach = (lesson.steps[0].teach || "").toLowerCase();
    if (["home screen","open","find","tap","play store","app"].some(kw => firstTeach.includes(kw))) {
      lesson.steps[0].screenType = "android_home";
      console.log("  → Step 1 auto-corrected to android_home");
    }
  }

  // Hard content corrections
  lesson.steps.forEach(s => {
    const t = (s.teach || "").toLowerCase();
    const app = (lesson.appName || "").toLowerCase();
    if (app.includes("gmail") && s.screenType === "generic" && (t.includes("create account") || t.includes("welcome to gmail") || (t.includes("sign in") && t.includes("create")))) {
      s.screenType = "gmail_welcome";
    }
    if (app.includes("gmail") && (t.includes("account type") || t.includes("for myself"))) {
      s.screenType = "gmail_account_type";
    }
    if ((s.screenType === "generic" || s.screenType === "play_store_search") && (t.includes("install button") || t.includes("tap install") || t.includes("button changes to open"))) {
      s.screenType = "play_store_app";
    }
    const sn = (s.screenName || "").toLowerCase();
    const tl = (s.targetLabel || "").toLowerCase();
    if ((s.screenType === "play_store_search" || s.screenType === "generic") && (t.includes("chrome") || t.includes("address bar") || t.includes("browser") || sn.includes("chrome") || tl.includes("address bar")) && !t.includes("play store") && !t.includes("install")) {
      s.screenType = "chrome_browser";
      if (!tl || tl === "search for apps & games") s.targetLabel = "Address bar";
    }
  });

  try {
    const allSteps = lesson.steps.map(s =>
      `Step ${s.number}: screenType="${s.screenType}", targetLabel="${s.targetLabel||""}", screenName="${s.screenName||""}", teach: "${(s.teach||"").slice(0,90)}"`
    ).join("\n");

    const response = await openai.chat.completions.create({
      model: MODEL_TEACHER,
      response_format: { type: "json_object" },
      max_tokens: 1200,
      messages: [{
        role: "user",
        content: `Lesson about "${topic}", app: ${lesson.appName || "unknown"}.
ALL steps:
${allSteps}

Check that each screenType matches what would actually be visible at that step.
- Step 1 → MUST be android_home
- Install/download/progress step → MUST be play_store_app
- Gmail first-launch (Create account + Sign in) → gmail_welcome NOT generic
- Gmail account type (For myself) → gmail_account_type
- Chrome browser/address bar/search steps → MUST be chrome_browser
- targetLabel must be visibly tappable on that screenType

Return JSON: { "correct": true } if all are correct.
Return JSON: { "correct": false, "corrections": [{ "step": 1, "screenType": "android_home" }] }`
      }]
    });

    const check = JSON.parse(response.choices[0].message.content);
    if (!check.correct && check.corrections?.length > 0) {
      check.corrections.forEach(({ step, screenType }) => {
        const s = lesson.steps.find(ls => ls.number === step);
        if (s && screenType) s.screenType = screenType;
      });
      console.log(`  → Screen type validation corrected ${check.corrections.length} step(s)`);
    } else {
      console.log("  → Screen type validation passed");
    }
  } catch (e) {
    console.warn("  ⚠ Screen type validator failed (non-fatal):", e.message);
  }

  applyDeterministicScreenCorrections(lesson, "post-validator visual sync");
  return lesson;
}

function validateVisibleTargets(lesson) {
  applyDeterministicScreenCorrections(lesson, "pre-target visual sync");
  const corrected = [];
  (lesson.steps || []).forEach(s => {
    if (!s) return;
    const before = s.targetLabel || "";
    const valid = normalizeTargetLabel(s, lesson);
    if (!valid || before !== (s.targetLabel || "")) {
      corrected.push(`Step ${s.number}: [${s.screenType}] "${before||"(empty)"}" → "${s.targetLabel||""}"`);
    }
  });
  if (corrected.length) console.warn("  ⚠ Target sync corrected:", corrected.join(" | "));
  else console.log("  → Visible target validation passed");
  return lesson;
}

// ── Sample data injection ─────────────────────────────────────────────────────
function needsSampleData(step, lesson) {
  const text = [step.screenType, step.screenName, step.teach || ""].join(" ").toLowerCase();
  const app = (lesson.appName || "").toLowerCase();
  return (
    step.screenType === "generic" ||
    /confirm|review|summary|recipient|amount|payment|money|send|transfer|cash|momo|mobile money|reference|invoice|quote|customer|listing|price|product|email|message|account|profile|business/.test(text) ||
    /money|momo|bank|wallet|marketplace|business/.test(app)
  );
}

function sampleDataForStep(step, lesson) {
  const text = [step.screenName, step.teach || ""].join(" ").toLowerCase();
  const app = (lesson.appName || "").toLowerCase();
  const data = {};
  if (/money|momo|mobile money|payment|transfer|send|recipient|amount|cash|wallet/.test(text + " " + app)) {
    Object.assign(data, { "Recipient": "Thandi Ndlovu", "Mobile number": "072 123 4567", "Amount": "R50.00", "Reference": "Lunch order" });
    if (/confirm|review|summary/.test(text)) { data["Fee"] = "R0.00"; data["Total"] = "R50.00"; }
  }
  if (/invoice|quote|customer|email/.test(text)) {
    Object.assign(data, { "Customer": "Ms Dlamini", "Email": "customer@example.com", "Subject": "Quote for printing", "Message": "Hello, here is the quote we discussed." });
  }
  if (/listing|marketplace|product|price|sell/.test(text)) {
    Object.assign(data, { "Product": "School calculator", "Price": "R120", "Location": "KwaXolo", "Description": "Used but working well" });
  }
  if (/account|profile|business|username|password/.test(text)) {
    Object.assign(data, { "Name": "Thandi Ndlovu", "Business": "Thandi's Snacks", "Username": "thandi.ndlovu", "Password example": "River-2026!" });
  }
  if (!Object.keys(data).length && needsSampleData(step, lesson)) {
    Object.assign(data, { "Practice name": "Thandi Ndlovu", "Practice phone": "072 123 4567" });
  }
  return data;
}

function ensureSampleData(lesson) {
  let added = 0;
  (lesson.steps || []).forEach(step => {
    if (!step || !needsSampleData(step, lesson)) return;
    const current = step.sampleData && typeof step.sampleData === "object" ? step.sampleData : {};
    const hasUsefulData = Object.values(current).some(v => String(v || "").trim());
    if (hasUsefulData) return;
    step.sampleData = sampleDataForStep(step, lesson);
    if (Object.keys(step.sampleData).length) added++;
  });
  if (added) console.log(`  → Added dummy sample data to ${added} step(s)`);
  return lesson;
}

// Convert structured teacher fields → frontend-compatible content + keyPoints
function buildLessonContent(lesson) {
  lesson.title = lesson.teacherTitle || lesson.title || "Untitled";
  lesson.keyPoints = lesson.teacherBoardPoints || [];
  return lesson;
}

// PLACEHOLDER — kept for backward compatibility (not used in new pipeline)
function buildTeacherPrompt(categoryRules) {
  const G = GUIDE_FILES;
  return `You generate teacher lesson plans for KwaXolo Impact — entrepreneurship education in rural KwaZulu-Natal.

${REGION_CONTEXT}

════════════════════════════════════════════
SECTION 00 — WHAT THE AGENT DOES
════════════════════════════════════════════
${G.whatAgentDoes}

════════════════════════════════════════════
SECTION 00 — CORE CONSTRAINTS
════════════════════════════════════════════
${G.constraints}

════════════════════════════════════════════
SECTION 00 — NEVER DO THIS
════════════════════════════════════════════
${G.neverDo}

════════════════════════════════════════════
SECTION 01 — SYSTEM PROMPT
════════════════════════════════════════════
${G.systemPrompt}

════════════════════════════════════════════
SECTION 02 — TEACHER LESSON PLAN STRUCTURE
════════════════════════════════════════════
${G.lessonStructure}

════════════════════════════════════════════
SECTION 04 — CONTENT TEMPLATES OVERVIEW
════════════════════════════════════════════
${G.templateOverview}

${categoryRules ? `════════════════════════════════════════════
SECTION 04 — CATEGORY-SPECIFIC RULES FOR THIS TOPIC
════════════════════════════════════════════
${categoryRules}` : ""}

════════════════════════════════════════════
SECTION 05 — ENGLISH WRITING STANDARD
════════════════════════════════════════════
${G.englishStandard}

════════════════════════════════════════════
SECTION 06 — DESIGN SYSTEM (brand colors, typography)
════════════════════════════════════════════
${G.brandColors}

${G.typography}

════════════════════════════════════════════
SECTION 07 — OUTPUT FORMAT (teacher PDF spec)
════════════════════════════════════════════
${G.teacherPdfSpec}

════════════════════════════════════════════
SECTION 08 — QUALITY CHECKLIST
════════════════════════════════════════════
${G.qualityChecklist}

════════════════════════════════════════════
EXAMPLE OF A GOOD TEACHER LESSON PLAN
════════════════════════════════════════════
${G.exampleLesson}

════════════════════════════════════════════
FEW-SHOT EXAMPLES FROM TEACHER FEEDBACK
════════════════════════════════════════════
${loadFewShotExamples() || "No examples yet — generate high quality content."}

════════════════════════════════════════════
LOCAL CONTEXT — USE THESE REFERENCES BY NAME
════════════════════════════════════════════
- Msenti Entrepreneurship Hub — Victor Jaca (CEO). Business registration, mentorship, IT support.
- SEDA Port Shepstone — free government business registration
- Dolly Dlezi — accountant at Msenti Hub
- Caleb Phehlukwayo — former principal, community trust figure
- Chief Inkosi Xolo — traditional Zulu authority
- 1LT Bakery — Thabo Shude
- Hlobisile Pearl Studios — photography and events
- Inkify — Samke Jaca and Ntokozo Gwacela, print store
- Capitec — most accessible bank (no minimum balance)
- MTN Mobile Money, FNB eWallet — mobile payments
- WhatsApp — the primary business communication tool
Generic examples are REJECTED. Name a specific person/business/place.

────────────────────────────────────────────
RESPONSE FORMAT
────────────────────────────────────────────
Return valid JSON only — no markdown fences, no commentary.
{
  "title": "Max 8 words, plain English",
  "description": "1-2 sentences about what students learn",
  "category": "phase1 | phase2 | business | custom",
  "level": "beginner | intermediate",
  "duration_minutes": 45,
  "lessons": [
    {
      "teacherTitle": "Lesson title, max 8 words, plain English",
      "teacherObjective": "After this lesson, you will be able to...",
      "teacherPrep": ["Prepare item 1", "Prepare item 2", "Prepare item 3"],
      "teacherBoardPoints": ["point 1 max 6 words", "point 2", "point 3", "point 4", "point 5"],
      "teacherBoardLayout": {
        "title": "Board heading matching lesson title",
        "leftColumn": ["keyword: plain meaning", "keyword: plain meaning"],
        "rightColumn": ["Step 1: class activity", "Step 2: class activity"],
        "bottomLine": "One reminder sentence students copy down"
      },
      "teacherScript": [
        { "section": "Open", "minutes": 5, "say": "What teacher says to open", "do": "What teacher does" },
        { "section": "Explain", "minutes": 10, "say": "Explain with named KZN example", "do": "Write on board, point, demonstrate" },
        { "section": "Practice", "minutes": 15, "say": "Guide students through task", "do": "Walk around, help groups" },
        { "section": "Check", "minutes": 5, "say": "Ask wrap-up question", "do": "Collect answers, give feedback" }
      ],
      "teacherExplanation": "Para 1 introducing the concept...\\n\\nPara 2 explaining with a NAMED KZN reference...\\n\\nPara 3 connecting to student life...",
      "teacherVocabulary": [
        { "word": "key term", "simpleMeaning": "plain language definition", "isiZuluSupport": "isiZulu translation" }
      ],
      "teacherDiscussionQuestions": ["Open question 1?", "Open question 2?", "Open question 3?"],
      "teacherLocalExample": "2-3 sentences naming a specific KZN person or business.",
      "teacherDevicePlan": {
        "ifEnoughDevices": "How to run if every student has a phone",
        "ifSharedDevices": "Rotation plan for 4-6 students sharing one device",
        "ifNoInternet": "Blackboard-only fallback using printed steps or verbal walk-through"
      },
      "teacherCommonMistakes": [
        { "mistake": "What students typically get wrong", "teacherResponse": "What teacher says or does to correct it" }
      ],
      "teacherAssessment": ["Visible result to check", "Question to ask class", "Output to collect from students"],
      "teacherTimeGuide": ["5 min: opening", "10 min: explain", "15 min: student task", "10 min: discussion", "5 min: recap"],
      "teacherWrapUpQuestion": "Final question that checks understanding",
      "teacherExtension": "Optional task for fast groups — goes deeper or applies the skill"
    }
  ]
}

CRITICAL: Each lesson MUST have ALL teacher fields above. Do NOT use a single "content" string. Return structured fields exactly as shown.
`;
}

function buildStudentPrompt(categoryRules, exerciseTypeHint, appDesignContext = "") {
  const G = GUIDE_FILES;
  return `You generate student task steps for KwaXolo Impact — Duolingo-style interactive exercises.

${REGION_CONTEXT}

════════════════════════════════════════════
SECTION 00 — WHAT THE AGENT DOES
════════════════════════════════════════════
${G.whatAgentDoes}

════════════════════════════════════════════
SECTION 00 — CORE CONSTRAINTS
════════════════════════════════════════════
${G.constraints}

════════════════════════════════════════════
SECTION 00 — NEVER DO THIS
════════════════════════════════════════════
${G.neverDo}

════════════════════════════════════════════
SECTION 01 — SYSTEM PROMPT
════════════════════════════════════════════
${G.systemPrompt}

════════════════════════════════════════════
SECTION 03 — EXERCISE TYPES SPECIFICATION
════════════════════════════════════════════
${G.exerciseTypes}

════════════════════════════════════════════
SECTION 03 — STUDENT TASK STRUCTURE
════════════════════════════════════════════
${G.taskStructure}

════════════════════════════════════════════
SECTION 03 — INTERACTION PATTERNS
════════════════════════════════════════════
${G.interactionPat}

════════════════════════════════════════════
SECTION 04 — CONTENT TEMPLATES OVERVIEW
════════════════════════════════════════════
${G.templateOverview}

${categoryRules ? `════════════════════════════════════════════
SECTION 04 — CATEGORY-SPECIFIC RULES FOR THIS TOPIC
════════════════════════════════════════════
${categoryRules}` : ""}

════════════════════════════════════════════
SECTION 05 — ENGLISH WRITING STANDARD
════════════════════════════════════════════
${G.englishStandard}

════════════════════════════════════════════
SECTION 05 — ISIZULU HOVER WORD RULES
════════════════════════════════════════════
${G.hoverRules}

════════════════════════════════════════════
SECTION 06 — DESIGN SYSTEM
════════════════════════════════════════════
${G.brandColors}

${G.typography}

${appDesignContext ? `════════════════════════════════════════════
SECTION 09 — APP UI DESIGN REFERENCE
════════════════════════════════════════════
${appDesignContext}` : ""}

════════════════════════════════════════════
SCREEN TYPES — assign one per step
════════════════════════════════════════════
${SCREEN_TYPES}

════════════════════════════════════════════
SECTION 07 — OUTPUT FORMAT (student HTML spec)
════════════════════════════════════════════
${G.studentHtmlSpec}

════════════════════════════════════════════
EXERCISE TYPE ASSIGNMENT (MANDATORY — do NOT deviate)
════════════════════════════════════════════
${exerciseTypeHint}

════════════════════════════════════════════
SECTION 08 — QUALITY CHECKLIST
════════════════════════════════════════════
${G.qualityChecklist}

════════════════════════════════════════════
EXAMPLE OF A GOOD STUDENT TASK
════════════════════════════════════════════
${G.exampleTask}

════════════════════════════════════════════
FEW-SHOT EXAMPLES FROM TEACHER FEEDBACK
════════════════════════════════════════════
${loadFewShotExamples() || "No examples yet — generate high quality content."}

────────────────────────────────────────────
RESPONSE FORMAT
────────────────────────────────────────────
Return valid JSON only — no markdown fences, no commentary.
You will receive the teacher's course JSON. Return studentTask for each lesson.

STEP COUNT: Generate exactly 10 steps per lesson. If the task is very simple (1-2 screens), generate 10 steps. If the task is complex (6+ screens), generate up to 13 steps. NEVER fewer than 10.

Step 1 MUST always be screenType "android_home" — the student starts at the phone home screen.

{
  "lessons": [
    {
      "studentTask": {
        "appName": "Exact app store name (e.g. Gmail, WhatsApp Business, Canva)",
        "appColor": "#hex brand color of the app",
        "appTextColor": "#fff or #1A1A1A for readability on appColor",
        "taskTitle": "Task title max 8 words matching topic",
        "taskIntro": "One active-voice sentence: what student will HAVE when done",
        "whatYouWillDo": "One active-voice sentence",
        "steps": [
          {
            "number": 1,
            "screenType": "android_home",
            "screenName": "Home Screen",
            "targetLabel": "Play Store",
            "teach": "EXACTLY 3 sentences: (1) what student sees on screen, (2) what to do and which button/field, (3) what to do if something goes wrong.",
            "exerciseType": "tap_correct",
            "question": "Question student must answer to advance",
            "options": ["A","B","C","D"],
            "correctAnswer": "B",
            "feedbackCorrect": "Confirms what they learned. Names the button/screen. 1 sentence.",
            "feedbackWrong": "Names WHERE on screen to look (top-right, blue bar, etc). Never just 'Try again'. 1 sentence.",
            "tip": "Common mistake or empty string"
          }
        ],
        "thinkAboutThis": "Personal reflection question connecting task to real life — not yes/no — requires having done the task",
        "taskReflection": "Same as thinkAboutThis but longer form — 1-2 sentences",
        "time": "10-15 minutes"
      }
    }
  ]
}
`;
}

// ROUTE: /api/teacher/generate-course
// Marcus's pipeline: parallel teacher+student, 4 AI validators, sampleData injection
app.post("/api/teacher/generate-course", async (req, res) => {
  if (!openai) return res.status(503).json({ error: "Azure OpenAI not configured." });

  // Accept both old format { teacherInput, gradeLevel } and new { topic, struggles, time, context }
  const { teacherInput, gradeLevel, topic: topicParam, struggles, time, context, reqId: clientReqId } = req.body;
  const topic = topicParam || teacherInput;
  if (!topic || typeof topic !== "string") {
    return res.status(400).json({ error: "Missing 'topic' or 'teacherInput' string." });
  }

  const inputs = {
    topic: gradeLevel ? `Grade level: ${gradeLevel}\n\n${topic}` : topic,
    struggles: struggles || "",
    time: time || "45 minutes",
    context: context || "",
  };

  const reqId = clientReqId || Date.now().toString();
  const startTime = Date.now();

  console.log(`[${new Date().toISOString()}] GENERATE COURSE (reqId: ${reqId})`);
  console.log(`  Topic: "${topic.slice(0, 100)}${topic.length > 100 ? "..." : ""}"`);

  try {
    // ── Phase 1: Web search ──────────────────────────────────────────────────
    sendProgress(reqId, 5, "Searching real app UI...");
    const uiContext = await searchUIContext(topic);
    console.log(uiContext ? `[1] Web search: ${uiContext.length} chars` : "[1] Web search skipped");

    // ── Phase 2: Step planning ───────────────────────────────────────────────
    sendProgress(reqId, 15, "Planning lesson steps...");
    const plan = await planSteps(topic, uiContext);
    if (!plan) return res.status(500).json({ error: "Step planning failed — no plan returned." });

    // ── Phase 3: Parallel teacher + student generation ───────────────────────
    sendProgress(reqId, 30, `Generating (${plan.difficulty || "medium"}, ${plan.fullStepOutline?.length || 0} steps)...`);
    console.log(`[3] Generating teacher + student in parallel...`);
    let lesson = await generateLesson(inputs, uiContext, plan);

    // Flatten course wrapper fields from teacher output (title, description, etc.)
    // The lesson object already has teacherTitle, so build course-level fields
    const cat = detectCategory(topic);
    const course = {
      title: lesson.teacherTitle || topic,
      description: lesson.teacherObjective || "",
      category: cat,
      level: "beginner",
      duration_minutes: 45,
      lessons: [lesson],
    };

    buildLessonContent(course.lessons[0]);

    const genLatency = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[3] Done in ${genLatency}s | steps: ${lesson.steps?.length || 0}`);

    // ── Phase 4: Validators ──────────────────────────────────────────────────
    sendProgress(reqId, 62, "Checking step count...");
    lesson = await validateStepCount(lesson, topic, plan);

    sendProgress(reqId, 70, "Checking local grounding...");
    lesson = validateLocalGrounding(lesson);

    sendProgress(reqId, 78, "Checking exercises and screen types...");
    await Promise.all([
      validateExercises(lesson),
      validateScreenTypes(lesson, topic),
    ]);
    lesson = validateVisibleTargets(lesson);
    lesson = ensureSampleData(lesson);

    // Fix missing exercise fields and enforce rotation
    if (lesson.steps) {
      fixMissingExerciseFields(lesson.steps);
      enforceExerciseRotation(lesson.steps);
    }

    // Attach student task to lesson (PhoneSimulator expects lesson.studentTask)
    // The new pipeline returns student fields directly on lesson, so wrap them
    if (!lesson.studentTask && lesson.steps) {
      lesson.studentTask = {
        appName:       lesson.appName,
        appColor:      lesson.appColor,
        appTextColor:  lesson.appTextColor,
        taskTitle:     lesson.taskTitle,
        taskIntro:     lesson.taskIntro,
        whatYouWillDo: lesson.whatYouWillDo,
        taskTime:      lesson.taskTime,
        thinkAboutThis: lesson.thinkAboutThis,
        taskReflection: lesson.taskReflection,
        steps:         lesson.steps,
      };
    }

    const totalLatency = Date.now() - startTime;
    console.log(`\n[DONE] ${(totalLatency / 1000).toFixed(1)}s | ${lesson.steps?.length || 0} steps | Cat: ${cat}`);

    writeGenerationLog(reqId, {
      reqId,
      generatedAt: new Date().toISOString(),
      inputs,
      plan,
      models: { teacher: MODEL_TEACHER, student: MODEL_STUDENT },
      latencyMs: totalLatency,
      course,
    });

    sendProgress(reqId, 100, "Done!");
    progressClients.delete(reqId);

    course._reqId = reqId;
    course._plan = plan;
    res.json(course);
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`\n[ERROR] Failed after ${elapsed}s:`, err.message);
    res.status(500).json({ error: "AI request failed.", detail: err.message });
  }
});

// EXAMPLE STORAGE — Teacher marks a generated course as good/bad
app.post("/api/teacher/examples/good/:reqId", (req, res) => {
  const result = saveGoodExample(req.params.reqId);
  if (!result.ok) return res.status(404).json({ error: result.error });
  res.json(result);
});

app.post("/api/teacher/examples/bad/:reqId", (req, res) => {
  const { comment } = req.body;
  const result = saveBadExample(req.params.reqId, comment);
  if (!result.ok) return res.status(404).json({ error: result.error });
  res.json(result);
});

app.get("/api/teacher/examples/:rating", (req, res) => {
  res.json(listExamples(req.params.rating));
});

// TOKEN HISTORY — Aggregated usage over time
app.get("/api/teacher/token-history", (req, res) => {
  res.json(getTokenHistory());
});

// Mount teacher auth router AFTER the public teacher routes above
app.use("/api/teacher", teacherRouter);

// TEMPLATES — Categories and templates
app.get("/api/templates", (req, res) => {
  res.json({ categories: getCategories() });
});

app.get("/api/templates/:category", (req, res) => {
  const templates = getTemplatesByCategory(req.params.category);
  res.json(templates);
});

// ROUTE: /api/schools (public list for dropdowns)
app.get("/api/schools", (req, res) => {
  const schools = db.prepare("SELECT id, name, code FROM schools ORDER BY name ASC").all();
  res.json(schools);
});

// ROUTE: /api/health
app.get("/api/health", (req, res) => {
  res.json({ ok: true, hasKey: !!process.env.AZURE_OPENAI_API_KEY });
});


const frontendDist = path.join(__dirname, "../frontend/dist");
console.log("Serving frontend from:", frontendDist);

app.use(express.static(frontendDist));

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`KwaXolo backend running on http://localhost:${PORT}`);
  if (!process.env.AZURE_OPENAI_API_KEY) {
    console.warn("No AZURE_OPENAI_API_KEY set in .env — AI requests will fail.");
  }
});

