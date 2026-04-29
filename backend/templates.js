// backend/templates.js
// 25 content templates in 6 categories from KwaXolo-Impact agent-guide

export const CATEGORIES = {
  A: {
    name: "Starting a Business",
    description: "Finding ideas, registering, planning, pricing, and getting first customers",
  },
  B: {
    name: "Money & Budgeting",
    description: "Weekly budgets, tracking income/expenses, understanding profit, bank accounts, micro-loans",
  },
  C: {
    name: "Digital Marketing & Sales",
    description: "WhatsApp Business, Facebook pages, product photos, sales messages, Facebook Marketplace",
  },
  D: {
    name: "Practical Digital Skills",
    description: "Email, flyers in Canva, spreadsheets, quotes/invoices, Google Maps for delivery",
  },
  E: {
    name: "Sector-Specific Businesses",
    description: "Food, services, agri-business, trades, crafts and handmade products",
  },
  F: {
    name: "Custom Module",
    description: "Teacher writes a free-form brief for any topic not covered by A-E",
  },
};

export const TEMPLATES = {
  // ── Category A: Starting a Business ──
  A1: {
    id: "A1",
    title: "Finding a business idea in your community",
    category: "A",
    interactionPattern: "explore_and_observe",
    description: "Student walks around or thinks about their community and writes down what they observe.",
    localGroundingHooks: [
      "Spaza shops as existing reference points for local demand",
      "Common needs: food, hair services, phone repair, printing, transport, tutoring",
      "Chief Inkosi Xolo's community as the physical space students know",
      "Msenti Hub as a place where local business ideas have turned into real ventures",
    ],
    rules: "Never suggest ideas that require startup capital. Always include at least one idea that requires only a skill, not materials (tutoring, hair, repairs, delivery).",
  },
  A2: {
    id: "A2",
    title: "Registering your business with SEDA",
    category: "A",
    interactionPattern: "write_and_reflect",
    description: "Student researches SEDA online or writes what they would do to register a business.",
    localGroundingHooks: [
      "SEDA Port Shepstone — specific, free, government-backed",
      "Caleb Phehlukwayo (former principal) as a community figure who understands formal processes",
      "Msenti Hub as a place that helps with registration support",
    ],
    rules: "Be specific: SEDA Port Shepstone, not 'a government office'. Acknowledge that registration takes time. Always mention that SEDA is free.",
  },
  A3: {
    id: "A3",
    title: "Writing a simple business plan (Lean Canvas)",
    category: "A",
    interactionPattern: "write_and_reflect",
    description: "Student fills in a simplified Lean Canvas — 5 fields maximum.",
    localGroundingHooks: [
      "Lean Canvas simplified to: problem, customers, solution, revenue, unfair advantage",
      "Use 1LT Bakery (Thabo Shude) or Hlobisile Pearl Studios as worked examples",
      "Frame the canvas as a one-page document, not a formal business plan",
    ],
    rules: "Never use the full Lean Canvas 9-box format — too complex. Use plain language for each field. Student task should produce a real, partially filled canvas for their own idea.",
  },
  A4: {
    id: "A4",
    title: "Setting your first prices",
    category: "A",
    interactionPattern: "write_and_reflect",
    description: "Student calculates a price for a hypothetical or real product/service.",
    localGroundingHooks: [
      "MTN Mobile Money as the payment context",
      "Spaza shop pricing as a reference point students understand",
      "Inkify (printing business) as an example of pricing a service, not a product",
    ],
    rules: "Start with cost + time, not 'what competitors charge'. Always address the discomfort of asking for money. Never suggest undercutting on price as a first strategy.",
  },
  A5: {
    id: "A5",
    title: "Finding your first 10 customers",
    category: "A",
    interactionPattern: "write_and_reflect",
    description: "Student writes a list of 10 real people and how they would approach each one.",
    localGroundingHooks: [
      "WhatsApp as the tool for reaching first customers",
      "Family, neighbours, school as the first circles",
      "Hlobisile Pearl Studios found its first clients through word of mouth in the community",
    ],
    rules: "Frame this as a people exercise, not a marketing exercise. Students should write real names if comfortable. End with a step where the student actually sends one WhatsApp message if ready.",
  },

  // ── Category B: Money & Budgeting ──
  B1: {
    id: "B1",
    title: "Creating a weekly budget for your venture",
    category: "B",
    interactionPattern: "write_and_reflect",
    description: "Student fills in a simple budget template for a real or hypothetical business.",
    localGroundingHooks: [
      "Dolly Dlezi (accountant at Msenti Hub) helps local businesses with basic bookkeeping",
      "Weekly budget frame: students think in weeks, not months",
      "Cash-dominant economy — budget in cash, not bank transfers",
    ],
    rules: "Budget must have exactly 3 rows: Money coming in / Money going out / What is left. Do not use the word 'budget' without defining it. Keep to weekly numbers.",
  },
  B2: {
    id: "B2",
    title: "Tracking income and expenses in a spreadsheet",
    category: "B",
    interactionPattern: "step_by_step_guided",
    description: "Student creates a Google Sheets spreadsheet with 5 real or sample entries.",
    localGroundingHooks: [
      "Google Sheets is free and works on any phone or PC",
      "Dolly Dlezi uses spreadsheets for Msenti Hub clients",
      "Example: 1LT Bakery tracks ingredient costs vs bread sales income",
    ],
    rules: "Use Google Sheets, not Excel. Only 3 columns: Date / Description / Amount. Do not introduce formulas. Explain income vs expense in plain language.",
  },
  B3: {
    id: "B3",
    title: "Understanding profit, revenue, and cost",
    category: "B",
    interactionPattern: "write_and_reflect",
    description: "Student calculates a simple example using their own numbers.",
    localGroundingHooks: [
      "Use food business as the primary example (baking, snacks)",
      "1LT Bakery as a named example",
      "Frame profit as 'what is left for you'",
    ],
    rules: "Define all three terms in plain language before using them. Student task must involve real numbers the student chooses. Never use R (Rand) without writing 'Rand' in full on first use.",
  },
  B4: {
    id: "B4",
    title: "Opening a business bank account (or using MTN MoMo)",
    category: "B",
    interactionPattern: "explore_and_observe",
    description: "Student researches Capitec or MTN Mobile Money requirements on their phone.",
    localGroundingHooks: [
      "Capitec Bank — low minimum balance, available in Port Shepstone area",
      "MTN Mobile Money (MoMo) — zero-bank alternative, only requires phone and ID",
      "Msenti Hub can provide a letter of introduction for SEDA registration",
    ],
    rules: "Present both options: bank account (Capitec) and mobile money (MTN MoMo). Do not assume the student is over 18. This lesson is about knowing the options — not opening an account today.",
  },
  B5: {
    id: "B5",
    title: "Applying for a micro-loan at Msenti Hub",
    category: "B",
    interactionPattern: "write_and_reflect",
    description: "Student writes a short explanation of what they would use a loan for.",
    localGroundingHooks: [
      "Msenti Hub directly — Victor Jaca CEO, offers micro-finance support",
      "SEDA Port Shepstone — also offers some funding pathways",
      "Frame loans as a last resort, not a first step",
    ],
    rules: "Never make a loan sound easy or risk-free. Explain interest in plain language. Student task focuses on: what would I use the money for, and how would I pay it back.",
  },

  // ── Category C: Digital Marketing & Sales ──
  C1: {
    id: "C1",
    title: "Setting up a WhatsApp Business profile",
    category: "C",
    interactionPattern: "step_by_step_guided",
    description: "Student sets up a real WhatsApp Business profile during the task.",
    localGroundingHooks: [
      "WhatsApp Business is free and runs on any Android phone",
      "Hlobisile Pearl Studios uses WhatsApp Business for photography booking",
      "Catalogue feature: students can list products with photos and prices",
    ],
    rules: "Use WhatsApp Business (the separate app), not regular WhatsApp. Include exact steps from Play Store. Student task must result in a live profile with at least a name and photo.",
  },
  C2: {
    id: "C2",
    title: "Creating a Facebook page for your business",
    category: "C",
    interactionPattern: "step_by_step_guided",
    description: "Student creates a real Facebook page during the task.",
    localGroundingHooks: [
      "Facebook Marketplace is active in the community for buying and selling",
      "Inkify promotes services via Facebook",
      "A Facebook Page is separate from a personal profile",
    ],
    rules: "Use the Facebook mobile app, not desktop site. Student task must produce a live page with name, profile photo, and one post. Warn about privacy.",
  },
  C3: {
    id: "C3",
    title: "Taking good product photos with a phone",
    category: "C",
    interactionPattern: "try_this_now",
    description: "Student takes 3 photos of a real object and compares them.",
    localGroundingHooks: [
      "Hlobisile Pearl Studios (photography) as professional image standards example",
      "Natural light is free and available — no equipment needed",
      "Background: plain wall, cloth, or ground",
    ],
    rules: "Student takes real photos during the task. Three shots required: bad, better, good. Tips must be usable without any equipment. End with how to share on WhatsApp or Facebook.",
  },
  C4: {
    id: "C4",
    title: "Writing a sales message that gets replies",
    category: "C",
    interactionPattern: "write_and_reflect",
    description: "Student writes a real WhatsApp sales message and optionally sends it.",
    localGroundingHooks: [
      "WhatsApp as the primary sales channel",
      "Spaza shop WhatsApp groups for local buying and selling",
      "Frame the message as personal and specific — not a broadcast",
    ],
    rules: "Provide a message template with 4 parts: what you sell / why it is good / price / how to order. Student writes their own version. Never recommend sending to strangers.",
  },
  C5: {
    id: "C5",
    title: "Using Facebook Marketplace to sell locally",
    category: "C",
    interactionPattern: "explore_and_observe",
    description: "Student browses Facebook Marketplace and then lists one item.",
    localGroundingHooks: [
      "Facebook Marketplace is active in KwaZulu-Natal",
      "Zero cost to list — no fees, buyer collects",
      "Inkify has listed services in the area",
    ],
    rules: "First step: browse local marketplace. Second step: create one listing. Listing must include photo, title, price, contact method. Warn: never share home address publicly.",
  },

  // ── Category D: Practical Digital Skills ──
  D1: {
    id: "D1",
    title: "Creating a professional email and using it",
    category: "D",
    interactionPattern: "step_by_step_guided",
    description: "Student creates a real Gmail account and sends a practice email.",
    localGroundingHooks: [
      "Inkify sends quotes and invoices by email to customers",
      "Job applications in the area increasingly require an email address",
      "Teachers themselves use email — frame this as a tool students are ready for",
    ],
    rules: "Include every sub-step (Play Store to Install to Create account). Explain the subject line. Warn about unprofessional email addresses.",
  },
  D2: {
    id: "D2",
    title: "Making a simple flyer in Canva or PowerPoint",
    category: "D",
    interactionPattern: "step_by_step_guided",
    description: "Student creates a real flyer for a product or service.",
    localGroundingHooks: [
      "Canva is free, works on Android, no design knowledge needed",
      "Inkify prints flyers — a completed Canva design could become a real printed flyer",
      "Local WhatsApp groups as the primary distribution channel for flyers",
    ],
    rules: "Use Canva by default (free, mobile-friendly); mention PowerPoint as the alternative. Student task must result in a saved or downloaded flyer. Include sharing via WhatsApp.",
  },
  D3: {
    id: "D3",
    title: "Using Excel to track stock/inventory",
    category: "D",
    interactionPattern: "step_by_step_guided",
    description: "Student creates a simple spreadsheet with 5 real products/items.",
    localGroundingHooks: [
      "Google Sheets is the accessible alternative to Excel — free, browser-based",
      "Dolly Dlezi (accountant at Msenti Hub) uses spreadsheets for small business bookkeeping",
      "Spaza shop inventory as the practical example",
    ],
    rules: "Use Google Sheets as the primary tool (free). Keep to 3 columns: Item name, Quantity, Price. Do not introduce formulas in this first lesson.",
  },
  D4: {
    id: "D4",
    title: "Writing a quote/invoice for a customer",
    category: "D",
    interactionPattern: "write_and_reflect",
    description: "Student writes a real quote for a hypothetical or real customer.",
    localGroundingHooks: [
      "Inkify creates quotes for printing customers",
      "Hlobisile Pearl Studios quotes for photography events",
      "MTN Mobile Money or Capitec as the payment methods listed on the invoice",
    ],
    rules: "Provide a simple invoice template with 5 fields. Include the payment method. Do not use the word 'invoice' without explaining it.",
  },
  D5: {
    id: "D5",
    title: "Using Google Maps to plan a delivery route",
    category: "D",
    interactionPattern: "step_by_step_guided",
    description: "Student uses Google Maps to find a route between two real places they know.",
    localGroundingHooks: [
      "Delivery as a zero-capital business (no stock needed)",
      "Port Shepstone area, nearby towns, Msenti Hub location",
      "WhatsApp as the tool for coordinating deliveries with customers",
    ],
    rules: "Only introduce the directions/routing feature. Student task must use a real destination they know. Connect to business use case.",
  },

  // ── Category E: Sector-Specific Businesses ──
  E1: {
    id: "E1",
    title: "Starting a food business (baking, catering, preserves)",
    category: "E",
    interactionPattern: "write_and_reflect",
    description: "Student writes a mini plan for a food product they could actually make.",
    localGroundingHooks: [
      "1LT Bakery (Thabo Shude) — started with zero capital, sells to neighbours",
      "Common zero-capital food options: vetkoek, amagwinya, umngqusho, catering for events, cold drinks at school",
      "Health considerations: basic food safety awareness, hygiene matters",
      "MTN Mobile Money and Capitec for taking payments",
    ],
    rules: "Only zero-capital or very low-capital food ideas. Always include hygiene as a board point. Never suggest large investment without flagging cost.",
  },
  E2: {
    id: "E2",
    title: "Starting a services business (photography, printing, tutoring)",
    category: "E",
    interactionPattern: "write_and_reflect",
    description: "Student identifies one service they could offer based on a skill they already have.",
    localGroundingHooks: [
      "Hlobisile Pearl Studios (photography and events) — started with a phone camera",
      "Inkify (printing) — started with one printer",
      "Tutoring younger students: zero capital, uses existing knowledge",
      "Hair services: widely practised informally, low or no startup cost",
    ],
    rules: "Always start with: 'What can you already do that other people would pay for?' — skill-first framing. Tutoring must be included as an option.",
  },
  E3: {
    id: "E3",
    title: "Starting an agri-business (vegetable farming, poultry)",
    category: "E",
    interactionPattern: "write_and_reflect",
    description: "Student identifies a crop or animal product they could produce and who would buy it.",
    localGroundingHooks: [
      "KwaZulu-Natal has strong agri-tech growth",
      "Agri-business as a family activity — many students already help at home with small gardens",
      "Msenti Hub has supported agri-entrepreneurs in the community",
      "Chief Inkosi Xolo's traditional community context — land use is a community decision",
    ],
    rules: "Never recommend poultry without acknowledging feed cost. Vegetable growing from seeds is lowest-capital — lead with this. Connect to existing buyers: spaza shops, families, school canteens. Address land access.",
  },
  E4: {
    id: "E4",
    title: "Starting a trade business (repairs, construction, sewing)",
    category: "E",
    interactionPattern: "write_and_reflect",
    description: "Student identifies a trade skill (or one to learn) and their first potential customer.",
    localGroundingHooks: [
      "Phone repair as a growing opportunity — most students encounter broken phones",
      "Sewing and alterations: existing skill in many households, minimal startup cost",
      "Caleb Phehlukwayo (former principal) as a community figure who would know people needing repairs",
    ],
    rules: "Trade skills take time to learn — acknowledge learning curve. Focus on apprenticeship and observation as a starting point. Phone repair is appropriate for high school students.",
  },
  E5: {
    id: "E5",
    title: "Selling crafts and handmade products online",
    category: "E",
    interactionPattern: "step_by_step_guided",
    description: "Student takes a photo of a craft item and creates a WhatsApp or Facebook listing.",
    localGroundingHooks: [
      "Traditional Zulu crafts have national and international markets (beadwork, baskets, woodwork)",
      "Facebook Marketplace as the primary local channel; WhatsApp groups for immediate community sales",
      "Hlobisile Pearl Studios helps document and photograph handmade work for clients",
    ],
    rules: "First step: create the product (or describe one they already make). Second step: photograph it properly. Third step: write a product description with price. Never suggest shipping without viable payment method first.",
  },
};

export function getTemplate(id) {
  return TEMPLATES[id] || null;
}

export function getTemplatesByCategory(cat) {
  const upper = cat.toUpperCase();
  return Object.values(TEMPLATES).filter((t) => t.category === upper);
}

export function getCategories() {
  return CATEGORIES;
}
