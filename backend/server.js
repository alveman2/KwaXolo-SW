import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { db, listCourses, getCourse, createCourse } from "./db.js";
import authRouter from "./auth.js";
import studentRouter from "./routes/student.js";
import teacherRouter from "./routes/teacher.js";
import adminRouter from "./routes/admin.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Auth routes
app.use("/api/auth", authRouter);

// Role-based routes
app.use("/api", studentRouter);
app.use("/api/teacher", teacherRouter);
app.use("/api/admin", adminRouter);

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ============================================================================
// SHARED REGIONAL CONTEXT — included in both system prompts below.
// ============================================================================
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

// ============================================================================
// OPPORTUNITY ADVISOR PROMPT
// ============================================================================
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

// ============================================================================
// ROUTE: /api/opportunity
// Takes the user's observation and returns a structured opportunity.
// ============================================================================
app.post("/api/opportunity", async (req, res) => {
  if (!openai) return res.status(503).json({ error: "OpenAI API key not configured." });
  const { observation, history } = req.body;

  if (!observation || typeof observation !== "string") {
    return res.status(400).json({ error: "Missing 'observation' string." });
  }

  const priorMessages = Array.isArray(history) ? history : [];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
    console.error("OpenAI error:", err);
    res.status(500).json({ error: "AI request failed.", detail: err.message });
  }
});

// ============================================================================
// ROUTE: /api/refine
// Follow-up: user asks a question about the opportunity (e.g. "how do I
// scale this?"). Keeps conversation going.
// ============================================================================
app.post("/api/refine", async (req, res) => {
  if (!openai) return res.status(503).json({ error: "OpenAI API key not configured." });
  const { history, question } = req.body;

  if (!Array.isArray(history) || !question) {
    return res.status(400).json({ error: "Need history array and question." });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: KWAXOLO_CONTEXT.replace(/RESPONSE FORMAT:[\s\S]*$/, "RESPONSE FORMAT: Reply in plain text, 3-5 sentences, concrete and specific.") },
        ...history,
        { role: "user", content: question },
      ],
      temperature: 0.7,
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error("OpenAI error:", err);
    res.status(500).json({ error: "AI request failed.", detail: err.message });
  }
});

// ============================================================================
// ROUTES: /api/courses
// ============================================================================

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

// ============================================================================
// TEACHER PROMPT + ROUTE: /api/teacher/generate-course
// ============================================================================
const TEACHER_CONTEXT = `
You are an expert instructional designer working with rural KwaZulu-Natal
schools (Grade 8–12). You create practical, engaging lesson content for
students in the KwaXolo community.
${REGION_CONTEXT}
YOUR TASK:
A teacher will describe what their students need to learn. You must generate
a complete, ready-to-use course with 3–5 lessons. Every lesson must contain
real, usable content — never placeholder text.

CONTENT GUIDELINES:
- Write for beginner learners (Grade 8–12 students in rural KZN).
- Use plain, clear English. Short sentences. Active voice.
- Each lesson's "content" field must be 150–300 words across 2–3 paragraphs.
- Use concrete local examples: Port Shepstone, Durban, spaza shops, taxi rank,
  SASSA grants, learnerships, school principals, the Msenti Hub, load-shedding.
- Where it helps understanding, include common isiZulu words or phrases in
  parentheses — e.g. "your community (umphakathi)".
- Never use generic filler like "In today's world..." or "It is important to..."
  — dive straight into the content.
- keyPoints are short, memorable bullets (under 12 words each).

RESPONSE FORMAT:
Respond with valid JSON only — no markdown code fences, no commentary.
The JSON must match this exact shape:
{
  "title": "Clear course title, max 8 words",
  "description": "1-2 sentences describing what students will learn and why it matters for their lives in KwaXolo.",
  "category": "phase1" | "phase2" | "business" | "custom",
  "level": "beginner" | "intermediate",
  "duration_minutes": <realistic integer>,
  "lessons": [
    {
      "title": "Lesson title",
      "content": "2-3 paragraphs of beginner-friendly plain text with concrete KwaXolo/KZN examples",
      "keyPoints": ["short bullet 1", "short bullet 2", "short bullet 3", "short bullet 4"]
    }
  ]
}

Choose category as follows:
- "phase1" for basic digital literacy (email, computer, internet, WhatsApp)
- "phase2" for productivity tools (Word, Excel, professional communication)
- "business" for entrepreneurship, money, and local commerce topics
- "custom" for anything else (life skills, subject-specific, etc.)
`;

app.post("/api/teacher/generate-course", async (req, res) => {
  if (!openai) return res.status(503).json({ error: "OpenAI API key not configured." });
  const { teacherInput, gradeLevel } = req.body;

  if (!teacherInput || typeof teacherInput !== "string") {
    return res.status(400).json({ error: "Missing 'teacherInput' string." });
  }

  const userMessage = gradeLevel
    ? `Grade level: ${gradeLevel}\n\n${teacherInput}`
    : teacherInput;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: TEACHER_CONTEXT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
    });

    const raw = completion.choices[0].message.content;
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    console.error("Teacher generate-course error:", err);
    res.status(500).json({ error: "AI request failed.", detail: err.message });
  }
});

// ============================================================================
// ROUTE: /api/schools (public list for dropdowns)
// ============================================================================
app.get("/api/schools", (req, res) => {
  const schools = db.prepare("SELECT id, name, code FROM schools ORDER BY name ASC").all();
  res.json(schools);
});

// ============================================================================
// ROUTE: /api/health
// ============================================================================
app.get("/api/health", (req, res) => {
  res.json({ ok: true, hasKey: !!process.env.OPENAI_API_KEY });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`KwaXolo backend running on http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.warn("⚠️  No OPENAI_API_KEY set in .env — requests will fail.");
  }
});
