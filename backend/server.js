import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AzureOpenAI } from "openai";
import OpenAIDefault from "openai";
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
  ? new OpenAIDefault.default({ apiKey: process.env.OPENAI_API_KEY })
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
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// PHASE 2: Step planning — plan a thorough 10-step outline before generating
async function planSteps(topic, uiContext) {
  if (!openai) return null;
  try {
    const response = await openai.chat.completions.create({
      model: MODEL_TEACHER,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: `Create a thorough step plan for teaching a complete beginner: "${topic}"

Student: 13–18 years old, rural KwaZulu-Natal, South Africa. Basic Android phone.
Has NEVER used this app or done this task before. Treat every screen as completely new.

Real app UI from web search:
${uiContext || "Use your knowledge of the real app UI."}

RULES FOR THE STEP PLAN:
- Return EXACTLY 10 steps. NEVER more.
- If the task seems to need more than 10, merge related screens into one step.
- Start from the ABSOLUTE beginning:
    → If the app needs installing: Step 1 = Open Play Store
    → If the app needs an account: include EVERY signup screen as its own step
- Every screen the user sees = its own step
- Every form that needs filling = its own step (or grouped if on the same screen)
- Every verification step (SMS code, agree button, confirm screen) = its own step
- The FINAL step must show the student COMPLETING the main goal, not just setting up:
    → "Send email" task: last step = tap Send, see sent confirmation
    → "Create listing" task: last step = listing published, visible to others
    → "Set up profile" task: last step = profile saved, visible to others
- Name the specific screen and button in each step description

Return JSON:
{
  "mainObjective": "One sentence — what the student will have DONE by the final step",
  "fullStepOutline": [
    "Step 1: [screen name] — [exact action and button]",
    "Step 2: [screen name] — [exact action and button]",
    ...exactly 10 steps...
  ]
}`
      }]
    });

    const plan = JSON.parse(response.choices[0].message.content);
    plan.fullStepOutline = (plan.fullStepOutline || []).slice(0, 10);
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

// PROMPT BUILDERS — inject agent guide files dynamically

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

// Convert structured teacher fields → frontend-compatible content + keyPoints
function buildLessonContent(lesson) {
  const parts = [];

  if (lesson.teacherObjective) {
    parts.push(`LEARNING OBJECTIVE\n${lesson.teacherObjective}`);
  }

  if (lesson.teacherPrep?.length) {
    parts.push(`TEACHER PREPARATION\n${lesson.teacherPrep.map(p => `- ${p}`).join("\n")}`);
  }

  if (lesson.teacherBoardPoints?.length) {
    parts.push(`WRITE ON THE BOARD\n${lesson.teacherBoardPoints.map(p => `- ${p}`).join("\n")}`);
  }

  if (lesson.teacherBoardLayout) {
    const bl = lesson.teacherBoardLayout;
    const boardLines = [`BLACKBOARD LAYOUT: ${bl.title || ""}`];
    if (bl.leftColumn?.length) boardLines.push(`Left column:\n${bl.leftColumn.map(l => `  ${l}`).join("\n")}`);
    if (bl.rightColumn?.length) boardLines.push(`Right column:\n${bl.rightColumn.map(r => `  ${r}`).join("\n")}`);
    if (bl.bottomLine) boardLines.push(`Bottom: ${bl.bottomLine}`);
    parts.push(boardLines.join("\n"));
  }

  if (lesson.teacherScript?.length) {
    parts.push(`TEACHER SCRIPT\n${lesson.teacherScript.map(s =>
      `[${s.section} — ${s.minutes} min]\nSay: ${s.say}\nDo: ${s.do}`
    ).join("\n\n")}`);
  }

  if (lesson.teacherExplanation) {
    parts.push(`EXPLAIN TO STUDENTS\n${lesson.teacherExplanation}`);
  }

  if (lesson.teacherVocabulary?.length) {
    parts.push(`VOCABULARY\n${lesson.teacherVocabulary.map(v =>
      `- ${v.word}: ${v.simpleMeaning} (isiZulu: ${v.isiZuluSupport || "—"})`
    ).join("\n")}`);
  }

  if (lesson.teacherDiscussionQuestions?.length) {
    parts.push(`DISCUSSION QUESTIONS\n${lesson.teacherDiscussionQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`);
  }

  if (lesson.teacherLocalExample) {
    parts.push(`LOCAL EXAMPLE\n${lesson.teacherLocalExample}`);
  }

  if (lesson.teacherDevicePlan) {
    const dp = lesson.teacherDevicePlan;
    parts.push(`DEVICE PLAN\n- Enough devices: ${dp.ifEnoughDevices || "—"}\n- Shared devices: ${dp.ifSharedDevices || "—"}\n- No internet: ${dp.ifNoInternet || "—"}`);
  }

  if (lesson.teacherCommonMistakes?.length) {
    parts.push(`COMMON MISTAKES\n${lesson.teacherCommonMistakes.map(m =>
      `- Mistake: ${m.mistake}\n  Response: ${m.teacherResponse}`
    ).join("\n")}`);
  }

  if (lesson.teacherAssessment?.length) {
    parts.push(`ASSESSMENT\n${lesson.teacherAssessment.map(a => `- ${a}`).join("\n")}`);
  }

  if (lesson.teacherTimeGuide?.length) {
    parts.push(`TIME GUIDE\n${lesson.teacherTimeGuide.map(t => `- ${t}`).join("\n")}`);
  }

  if (lesson.teacherWrapUpQuestion) {
    parts.push(`WRAP-UP QUESTION\n${lesson.teacherWrapUpQuestion}`);
  }

  if (lesson.teacherExtension) {
    parts.push(`EXTENSION (fast groups)\n${lesson.teacherExtension}`);
  }

  // Set frontend-compatible fields
  lesson.title = lesson.teacherTitle || lesson.title || "Untitled";
  lesson.content = parts.join("\n\n");
  lesson.keyPoints = lesson.teacherBoardPoints || [];

  return lesson;
}

// ROUTE: /api/teacher/generate-course
// Two-call pipeline: teacher lesson plan (MODEL_TEACHER) + student task (MODEL_STUDENT)
app.post("/api/teacher/generate-course", async (req, res) => {
  if (!openai) return res.status(503).json({ error: "Azure OpenAI not configured." });
  const { teacherInput, gradeLevel, templateId, category, reqId: clientReqId } = req.body;

  if (!teacherInput || typeof teacherInput !== "string") {
    return res.status(400).json({ error: "Missing 'teacherInput' string." });
  }

  // Auto-detect category from topic keywords
  const detectedCat = detectCategory(teacherInput);
  const categoryRules = getCategoryRules(detectedCat);

  // Inject template context if selected
  let templateContext = "";
  if (templateId) {
    const tmpl = getTemplate(templateId);
    if (tmpl) {
      templateContext = `\n\nSELECTED TEMPLATE: ${tmpl.title}\nCategory: ${tmpl.category}\nInteraction pattern: ${tmpl.interactionPattern}\nLocal grounding hooks: ${tmpl.localGroundingHooks.join("; ")}\nTopic-specific rules: ${tmpl.rules}\n`;
    }
  }

  const teacherSystemPrompt = buildTeacherPrompt(categoryRules) + templateContext;

  const userMessage = gradeLevel
    ? `Grade level: ${gradeLevel}\n\n${teacherInput}`
    : teacherInput;

  const reqId = clientReqId || Date.now().toString();
  const startTime = Date.now();

  console.log(`[${new Date().toISOString()}] GENERATE COURSE (reqId: ${reqId})`);
  console.log(`  Input: "${teacherInput.slice(0, 100)}${teacherInput.length > 100 ? "..." : ""}"`);
  console.log(`  Category: ${detectedCat} (auto-detected)`);
  if (gradeLevel) console.log(`  Grade: ${gradeLevel}`);
  if (templateId) console.log(`  Template: ${templateId}`);

  try {
    // ── Phase 1: Web search (optional — needs OPENAI_API_KEY) ──
    sendProgress(reqId, 5, "Searching real app UI...");
    console.log(`\n[1/4] Web search for UI context...`);
    const uiContext = await searchUIContext(teacherInput);
    if (uiContext) {
      console.log(`[1/4] Web search returned ${uiContext.length} chars`);
    } else {
      console.log(`[1/4] Web search skipped (no OPENAI_API_KEY or failed)`);
    }

    // ── Phase 2: Step planning ──
    sendProgress(reqId, 15, "Planning lesson steps...");
    console.log(`[2/4] Planning steps...`);
    const stepPlan = await planSteps(teacherInput, uiContext);
    if (stepPlan) {
      console.log(`[2/4] Plan: "${stepPlan.mainObjective}" — ${stepPlan.fullStepOutline?.length || 0} steps`);
    } else {
      console.log(`[2/4] Planning skipped`);
    }

    // ── Phase 3: Teacher lesson plan ──
    sendProgress(reqId, 30, "Generating teacher lesson plan...");
    console.log(`[3/4] Generating teacher lesson plan (${MODEL_TEACHER})...`);
    const teacherCompletion = await openai.chat.completions.create({
      model: MODEL_TEACHER,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: teacherSystemPrompt },
        { role: "user", content: userMessage + (stepPlan ? `\n\nSTEP PLAN (follow this outline for the student task):\nMain objective: ${stepPlan.mainObjective}\n${stepPlan.fullStepOutline.map((s, i) => `${i + 1}. ${s}`).join("\n")}` : "") + (uiContext ? `\n\nREAL APP UI REFERENCE (use exact button names from this):\n${uiContext.slice(0, 2000)}` : "") },
      ],
      temperature: 0.7,
    });

    const teacherRaw = teacherCompletion.choices[0].message.content;
    const course = JSON.parse(teacherRaw);
    const teacherLatency = Date.now() - startTime;
    const teacherUsage = teacherCompletion.usage || {};

    // Convert structured teacher fields → frontend-compatible content + keyPoints
    if (Array.isArray(course.lessons)) {
      course.lessons.forEach(buildLessonContent);
    }

    console.log(`[3/4] Done in ${(teacherLatency / 1000).toFixed(1)}s | ${teacherUsage.total_tokens || "?"} tokens | "${course.title || "untitled"}"`);
    console.log(`      ${course.lessons?.length || 0} lessons generated`);

    // ── Call 2: Student tasks ──
    const stepCount = 10; // target steps per lesson (architecture: 10-13)
    const exerciseTypeHint = getExerciseTypeHint(stepCount);
    const appName = detectAppName(teacherInput);
    const appDesignContext = appName ? loadAppDesignMD(appName) : "";
    if (appName) console.log(`  App detected: ${appName}${appDesignContext ? " (design ref loaded)" : " (no design ref found)"}`);
    const studentSystemPrompt = buildStudentPrompt(categoryRules, exerciseTypeHint, appDesignContext);

    sendProgress(reqId, 55, "Generating student exercises...");
    console.log(`\n[4/4] Generating student tasks (${MODEL_STUDENT})...`);
    const studentStart = Date.now();

    // Inject plan + UI context into student generation for grounded steps
    let studentUserContent = `Here is the teacher's course. Generate a studentTask for each lesson.\n\n${JSON.stringify(course, null, 2)}`;
    if (stepPlan) {
      studentUserContent += `\n\nSTEP PLAN (follow this outline for ordering steps):\nMain objective: ${stepPlan.mainObjective}\n${stepPlan.fullStepOutline.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
    }
    if (uiContext) {
      studentUserContent += `\n\nREAL APP UI REFERENCE (use exact button/screen names):\n${uiContext.slice(0, 2000)}`;
    }

    const studentCompletion = await openai.chat.completions.create({
      model: MODEL_STUDENT,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: studentSystemPrompt },
        { role: "user", content: studentUserContent },
      ],
      temperature: 0.7,
    });

    const studentRaw = studentCompletion.choices[0].message.content;
    const studentData = JSON.parse(studentRaw);
    const studentLatency = Date.now() - studentStart;
    const studentUsage = studentCompletion.usage || {};
    console.log(`[4/4] Done in ${(studentLatency / 1000).toFixed(1)}s | ${studentUsage.total_tokens || "?"} tokens`);

    // Merge student tasks into course lessons
    let mergedCount = 0;
    if (Array.isArray(studentData.lessons)) {
      for (let i = 0; i < course.lessons.length; i++) {
        if (studentData.lessons[i]?.studentTask) {
          course.lessons[i].studentTask = studentData.lessons[i].studentTask;
          mergedCount++;
        }
      }
    }
    console.log(`      ${mergedCount}/${course.lessons?.length || 0} student tasks merged`);

    sendProgress(reqId, 75, "Validating exercises...");
    // Post-processing: fix missing fields and enforce rotation
    for (const lesson of course.lessons) {
      if (lesson.studentTask?.steps) {
        fixMissingExerciseFields(lesson.studentTask.steps);
        enforceExerciseRotation(lesson.studentTask.steps);
      }
    }
    console.log(`      Post-processing complete`);

    const totalLatency = Date.now() - startTime;

    // Validation
    const validation = validateCourseOutput(course);
    if (validation.pass) {
      console.log(`\n[OK] Validation passed`);
    } else {
      console.warn(`\n[WARN] Validation errors:`, validation.errors);
    }
    if (validation.warnings?.length) {
      console.warn(`[WARN] Warnings:`, validation.warnings);
    }

    // Log generation with token usage
    writeGenerationLog(reqId, {
      reqId,
      generatedAt: new Date().toISOString(),
      inputs: { teacherInput, gradeLevel, templateId, category: detectedCat, hasWebSearch: !!uiContext, hasPlan: !!stepPlan },
      plan: stepPlan || null,
      models: { teacher: MODEL_TEACHER, student: MODEL_STUDENT },
      temperature: 0.7,
      latencyMs: { teacher: teacherLatency, student: studentLatency, total: totalLatency },
      tokenUsage: {
        teacher: {
          promptTokens: teacherUsage.prompt_tokens || null,
          completionTokens: teacherUsage.completion_tokens || null,
          totalTokens: teacherUsage.total_tokens || null,
        },
        student: {
          promptTokens: studentUsage.prompt_tokens || null,
          completionTokens: studentUsage.completion_tokens || null,
          totalTokens: studentUsage.total_tokens || null,
        },
      },
      validation,
      course,
    });

    const totalTokens = (teacherUsage.total_tokens || 0) + (studentUsage.total_tokens || 0);
    console.log(`\n[DONE] Total: ${(totalLatency / 1000).toFixed(1)}s | ${totalTokens} tokens | Cat: ${detectedCat} | Log: logs/raw/${reqId}.json`);

    sendProgress(reqId, 100, "Done!");
    progressClients.delete(reqId);

    course._reqId = reqId;
    course._validation = validation;
    course._plan = stepPlan || null;
    res.json(course);

    // Non-blocking: auto-generate app design MD if a known app was detected
    // but no design ref exists yet. Runs after response is sent.
    const appNameForDesign = detectAppName(teacherInput);
    if (appNameForDesign) {
      maybeGenerateAppDesignMD(appNameForDesign, uiContext).catch(() => {});
    }
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

