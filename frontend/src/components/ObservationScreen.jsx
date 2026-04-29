import { useState } from "react";
import { findOpportunity } from "../lib/api.js";
import { useStrings } from "../lib/i18n.jsx";
import GlossaryText from "./GlossaryText.jsx";

const PROMPTS = [
  "People in my village travel 3 hours to Port Shepstone to repair their phones.",
  "I bake bread every morning and it sells out by 9am, but I do not know how to grow.",
  "Students at my school have no place to print or photocopy assignments.",
  "Farmers around here sell maize one bag at a time. There must be a better way.",
];

// Instruction sent to the AI when the user clicks "Skip".
// Not shown in the conversation UI.
const SKIP_INSTRUCTION =
  "User wants you to propose an opportunity now with the information you have. You must return mode: ready.";

export default function ObservationScreen({ initialValue, onSubmit, onBack }) {
  // ── Initial phase state ──────────────────────────────────────────────────
  const [text, setText] = useState(initialValue);

  // ── Shared state ─────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Follow-up phase state ─────────────────────────────────────────────────
  const [phase, setPhase] = useState("initial"); // "initial" | "followup"
  // displayConvo: messages already committed to the conversation view.
  // Shape: { role: "user" | "ai", text: string, reasoning?: string }
  const [displayConvo, setDisplayConvo] = useState([]);
  // apiHistory: raw OpenAI-format messages to forward on the next call.
  const [apiHistory, setApiHistory] = useState([]);
  const [answerText, setAnswerText] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [originalObservation, setOriginalObservation] = useState("");

  const t = useStrings();

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleInitialSubmit() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await findOpportunity(text.trim(), []);
      if (result.mode === "needs_more_info") {
        setOriginalObservation(text.trim());
        setDisplayConvo([{ role: "user", text: text.trim() }]);
        setApiHistory([
          { role: "user", content: text.trim() },
          { role: "assistant", content: result.question },
        ]);
        setCurrentQuestion({ question: result.question, reasoning: result.reasoning });
        setFollowUpCount(1);
        setPhase("followup");
      } else {
        onSubmit(text.trim(), result);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // skipInstruction: when provided, use this as the API observation instead
  // of answerText, and show a friendly placeholder in the UI.
  async function handleFollowUpSubmit(skipInstruction) {
    const apiObservation = skipInstruction ?? answerText.trim();
    if (!apiObservation) return;

    const displayAnswer = skipInstruction ? "Skip — show me the opportunity." : apiObservation;

    setLoading(true);
    setError(null);

    // Optimistically append the current AI question + user answer to the UI.
    const nextDisplayConvo = [
      ...displayConvo,
      { role: "ai", text: currentQuestion.question, reasoning: currentQuestion.reasoning },
      { role: "user", text: displayAnswer },
    ];
    setDisplayConvo(nextDisplayConvo);

    try {
      const result = await findOpportunity(apiObservation, apiHistory);

      if (result.mode === "needs_more_info" && followUpCount < 3) {
        setApiHistory([
          ...apiHistory,
          { role: "user", content: apiObservation },
          { role: "assistant", content: result.question },
        ]);
        setCurrentQuestion({ question: result.question, reasoning: result.reasoning });
        setFollowUpCount((n) => n + 1);
        setAnswerText("");
      } else {
        // "ready" response, or AI still returning needs_more_info after 3
        // follow-ups / skip (force-treat as ready).
        onSubmit(originalObservation, result);
      }
    } catch (err) {
      // Roll back the optimistic UI update.
      setDisplayConvo(displayConvo);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Render: initial phase ─────────────────────────────────────────────────

  if (phase === "initial") {
    return (
      <div className="py-8">
        <button
          onClick={onBack}
          className="text-sm text-stone-500 hover:text-stone-800 mb-6"
        >
          {t.observation.back}
        </button>

        <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-3">
          {t.observation.heading}
        </h2>
        <p className="text-stone-600 mb-6">
          {t.observation.description}
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.observation.placeholder}
          rows={5}
          className="w-full bg-white border border-stone-300 rounded-xl p-4 text-stone-900 focus:outline-none focus:ring-2 focus:ring-kwaxolo-green focus:border-transparent resize-none"
          disabled={loading}
        />

        <div className="mt-3 mb-6">
          <div className="text-xs text-stone-500 mb-2">{t.observation.orTry}</div>
          <div className="flex flex-wrap gap-2">
            {PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => setText(p)}
                disabled={loading}
                className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-full transition disabled:opacity-50"
              >
                {p.length > 60 ? p.slice(0, 60) + "..." : p}
              </button>
            ))}
          </div>
        </div>

        {error && <ErrorBox error={error} />}

        <button
          onClick={handleInitialSubmit}
          disabled={loading || !text.trim()}
          className="w-full sm:w-auto bg-kwaxolo-green hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Spinner /> {t.observation.finding}
            </>
          ) : (
            <>{t.observation.findButton}</>
          )}
        </button>
        {loading && (
          <div className="mt-3">
            <ProgressBar />
          </div>
        )}
      </div>
    );
  }

  // ── Render: follow-up phase ───────────────────────────────────────────────

  return (
    <div className="py-8">
      <button
        onClick={onBack}
        className="text-sm text-stone-500 hover:text-stone-800 mb-6"
      >
        {t.observation.back}
      </button>

      {/* Committed conversation so far */}
      <div className="mb-4 space-y-3">
        {displayConvo.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-kwaxolo-green text-white rounded-br-sm"
                  : "bg-stone-100 text-stone-800 rounded-bl-sm"
              }`}
            >
              <GlossaryText text={msg.text} />
              {msg.reasoning && (
                <p className="mt-1 text-xs opacity-60 italic"><GlossaryText text={msg.reasoning} /></p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Current AI question (pending answer) */}
      {currentQuestion && !loading && (
        <div className="flex justify-start mb-5">
          <div className="max-w-[80%] bg-stone-100 text-stone-800 rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed">
            <GlossaryText text={currentQuestion.question} />
            {currentQuestion.reasoning && (
              <p className="mt-1 text-xs text-stone-500 italic">
                <GlossaryText text={currentQuestion.reasoning} />
              </p>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-start mb-5">
          <div className="bg-stone-100 text-stone-500 rounded-2xl rounded-bl-sm px-4 py-3 text-sm flex items-center gap-2">
            <Spinner /> Thinking...
          </div>
          <div className="mt-2">
            <ProgressBar />
          </div>
        </div>
      )}

      {error && <ErrorBox error={error} />}

      {/* Answer input */}
      <textarea
        value={answerText}
        onChange={(e) => setAnswerText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleFollowUpSubmit();
        }}
        placeholder="Your answer..."
        rows={3}
        className="w-full bg-white border border-stone-300 rounded-xl p-4 text-stone-900 focus:outline-none focus:ring-2 focus:ring-kwaxolo-green focus:border-transparent resize-none mb-3"
        disabled={loading}
      />

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handleFollowUpSubmit()}
          disabled={loading || !answerText.trim()}
          className="flex-1 sm:flex-none bg-kwaxolo-green hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Spinner /> Thinking...
            </>
          ) : (
            <>Continue →</>
          )}
        </button>

        <button
          onClick={() => handleFollowUpSubmit(SKIP_INSTRUCTION)}
          disabled={loading}
          className="flex-1 sm:flex-none bg-white hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed text-stone-600 font-medium px-6 py-3 rounded-xl border border-stone-300 transition"
        >
          Skip — propose now
        </button>
      </div>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────

function ErrorBox({ error }) {
  return (
    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
      <strong>Error:</strong> {error}
      <div className="mt-1 text-xs">
        Make sure the backend is running and OPENAI_API_KEY is set in backend/.env
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function ProgressBar() {
  return (
    <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full bg-kwaxolo-green rounded-full"
        style={{ animation: "progress 3s ease-out forwards" }}
      />
      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          60% { width: 65%; }
          100% { width: 90%; }
        }
      `}</style>
    </div>
  );
}
