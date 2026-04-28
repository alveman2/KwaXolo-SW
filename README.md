# KwaXolo Bridge — MVP

An AI-powered opportunity engine that helps youth and entrepreneurs in rural KwaZulu-Natal identify business opportunities, get concrete first steps, and connect to local support (Msenti Hub).

## What this MVP demonstrates

1. **Opportunity Engine** — A conversational interview that turns local observations into concrete business opportunities, calibrated to the KwaXolo context.
2. **Action Plan Generator** — Once an opportunity is chosen, generates a concrete first-week plan with skills, capital, and resources.
3. **Msenti Hub Bridge** — Packages user progress into a structured handoff for Caleb / SEDA.

## Stack

- **Frontend**: React + Vite + Tailwind CSS (single-page app)
- **Backend**: Node.js + Express (proxies OpenAI calls, keeps API key server-side)
- **AI**: OpenAI GPT-4o-mini (good balance of cost/quality for demo)

## Architecture

```
┌─────────────┐         ┌─────────────┐         ┌───────────┐
│   Browser   │ ──────► │   Backend   │ ──────► │  OpenAI   │
│ (React app) │ ◄────── │  (Express)  │ ◄────── │    API    │
└─────────────┘         └─────────────┘         └───────────┘
                            ▲
                            │
                       OPENAI_API_KEY
                       (in .env, never sent to browser)
```

The backend exists for one reason: to keep the API key off the user's browser. Without it, anyone inspecting your demo could steal the key and run up your bill.

## Setup (5 minutes)

1. Clone or copy this folder into your VS Code workspace
2. Add your OpenAI API key:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and paste your key
   ```
3. Install and run backend:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
4. In a new terminal, install and run frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
5. Open http://localhost:5173

## Where to extend with Claude Code

When you open this in VS Code with Claude Code, ask it to:

- "Add a teacher mode that generates lesson plans for Grade 8-12 in KZN"
- "Add a saved opportunities database using SQLite"
- "Add a 'connect to Caleb' email handoff"
- "Translate the UI to isiZulu"
- "Add login with names so each user has a saved journey"

The system prompt in `backend/server.js` is the most important file to iterate on — that's where the KwaXolo-specific intelligence lives.

## Demo script for the pitch

1. Open the app, click "Start"
2. Say something concrete: "I noticed people in my village travel 3 hours to fix their phones."
3. Watch the AI identify it as an opportunity, show market sizing, and propose a path
4. Choose the opportunity, get a first-week action plan
5. Click "Connect to Msenti Hub" — show the structured handoff

Total demo time: ~3 minutes. Leave 2 minutes for questions.
# KwaXolo-SW
