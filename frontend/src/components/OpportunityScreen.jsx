// Replace the entire content of frontend/src/components/OpportunityScreen.jsx
// with this. Adds success story and community impact sections.

import { useState } from "react";
import { refineConversation } from "../lib/api.js";

export default function OpportunityScreen({ observation, opportunity, onRestart }) {
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showHandoff, setShowHandoff] = useState(false);

  async function askFollowUp() {
    if (!chatInput.trim()) return;
    const question = chatInput.trim();
    setChatInput("");
    setChatLoading(true);

    const baseHistory = [
      { role: "user", content: observation },
      {
        role: "assistant",
        content: `Identified opportunity: ${opportunity.opportunity.title}. ${opportunity.opportunity.summary}`,
      },
      ...chatHistory,
    ];

    try {
      const { reply } = await refineConversation(baseHistory, question);
      setChatHistory([
        ...chatHistory,
        { role: "user", content: question },
        { role: "assistant", content: reply },
      ]);
    } catch (err) {
      setChatHistory([
        ...chatHistory,
        { role: "user", content: question },
        { role: "assistant", content: `(Error: ${err.message})` },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div className="py-6 space-y-6">
      {/* Original observation echoed back */}
      <div className="bg-stone-100 border border-stone-200 rounded-xl p-4">
        <div className="text-xs uppercase tracking-wide text-stone-500 font-semibold mb-1">
          What you noticed
        </div>
        <div className="text-stone-700 italic">"{observation}"</div>
      </div>

      {/* Acknowledgment */}
      {opportunity.acknowledgment && (
        <div className="text-stone-700 leading-relaxed">
          {opportunity.acknowledgment}
        </div>
      )}

      {/* The opportunity card */}
      <div className="bg-white border-2 border-kwaxolo-green rounded-2xl p-6 shadow-sm">
        <div className="text-xs uppercase tracking-wide text-kwaxolo-green font-bold mb-2">
          Opportunity
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-3">
          {opportunity.opportunity.title}
        </h2>
        <p className="text-stone-700 mb-5">{opportunity.opportunity.summary}</p>

        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <Stat label="Market" value={opportunity.opportunity.marketSize} />
          <Stat
            label="Possible monthly earnings"
            value={opportunity.opportunity.estimatedMonthlyEarnings}
            highlight
          />
        </div>

        <div className="bg-stone-50 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wide text-stone-500 font-semibold mb-1">
            Estimated startup cost
          </div>
          <div className="text-lg font-bold text-stone-900">
            {opportunity.estimatedStartupCost}
          </div>
        </div>
      </div>

      {/* Success story — NEW */}
      {opportunity.successStory && (
        <div className="bg-kwaxolo-blue/5 border-l-4 border-kwaxolo-blue rounded-r-2xl p-6">
          <div className="flex items-start gap-3">
            <div className="text-3xl flex-shrink-0">💡</div>
            <div>
              <div className="text-xs uppercase tracking-wide text-kwaxolo-blue font-bold mb-1">
                Someone who did this
              </div>
              <div className="font-bold text-stone-900 mb-2">
                {opportunity.successStory.name}
              </div>
              <p className="text-stone-700 leading-relaxed">
                {opportunity.successStory.story}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* First steps */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-stone-900 mb-4">
          Your first three steps
        </h3>
        <ol className="space-y-3">
          {opportunity.firstSteps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-kwaxolo-gold text-stone-900 font-bold text-sm flex items-center justify-center">
                {i + 1}
              </div>
              <div className="text-stone-700 pt-0.5">{step}</div>
            </li>
          ))}
        </ol>
      </div>

      {/* Skills needed */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-stone-900 mb-3">
          Skills you will need
        </h3>
        <div className="flex flex-wrap gap-2">
          {opportunity.skillsNeeded.map((skill, i) => (
            <span
              key={i}
              className="bg-kwaxolo-blue/10 text-kwaxolo-blue px-3 py-1.5 rounded-full text-sm font-medium"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Community impact — NEW */}
      {opportunity.communityImpact && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-stone-900 mb-1">
            Who benefits
          </h3>
          <p className="text-sm text-stone-500 mb-5">
            Money that stays in KwaXolo multiplies. Here's the ripple effect.
          </p>
          <div className="space-y-4">
            <ImpactRow
              icon="👤"
              label="You"
              text={opportunity.communityImpact.founderBenefit}
            />
            <ImpactRow
              icon="🏠"
              label="Your family"
              text={opportunity.communityImpact.familyBenefit}
            />
            <ImpactRow
              icon="🌍"
              label="The KwaXolo community"
              text={opportunity.communityImpact.communityBenefit}
              highlight
            />
          </div>
        </div>
      )}

      {/* Follow-up chat */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-stone-900 mb-1">
          Have a question?
        </h3>
        <p className="text-sm text-stone-600 mb-4">
          Ask anything specific — pricing, where to learn, how to scale.
        </p>

        {chatHistory.length > 0 && (
          <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg text-sm ${
                  msg.role === "user"
                    ? "bg-kwaxolo-green text-white ml-8"
                    : "bg-stone-100 text-stone-800 mr-8"
                }`}
              >
                {msg.content}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askFollowUp()}
            placeholder="How much should I charge for a screen replacement?"
            disabled={chatLoading}
            className="flex-1 bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kwaxolo-green"
          />
          <button
            onClick={askFollowUp}
            disabled={chatLoading || !chatInput.trim()}
            className="bg-kwaxolo-green hover:bg-emerald-700 disabled:bg-stone-300 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
          >
            {chatLoading ? "..." : "Ask"}
          </button>
        </div>
      </div>

      {/* Msenti handoff */}
      <div className="bg-kwaxolo-gold/20 border-2 border-kwaxolo-gold rounded-2xl p-6">
        <h3 className="text-lg font-bold text-stone-900 mb-2">
          Ready for the next step?
        </h3>
        <p className="text-stone-700 mb-4">{opportunity.connectToMsenti}</p>
        <button
          onClick={() => setShowHandoff(!showHandoff)}
          className="bg-kwaxolo-blue hover:bg-blue-900 text-white font-semibold px-6 py-3 rounded-xl transition"
        >
          {showHandoff ? "Hide handoff" : "Connect to Msenti Hub →"}
        </button>

        {showHandoff && (
          <div className="mt-4 bg-white rounded-xl p-4 border border-stone-200">
            <div className="text-xs uppercase tracking-wide text-stone-500 font-semibold mb-2">
              Pre-filled summary for Caleb at Msenti Hub
            </div>
            <div className="space-y-2 text-sm text-stone-700">
              <div>
                <strong>Observation:</strong> {observation}
              </div>
              <div>
                <strong>Proposed opportunity:</strong>{" "}
                {opportunity.opportunity.title}
              </div>
              <div>
                <strong>Estimated startup cost:</strong>{" "}
                {opportunity.estimatedStartupCost}
              </div>
              <div>
                <strong>Skills to develop:</strong>{" "}
                {opportunity.skillsNeeded.join(", ")}
              </div>
              <div>
                <strong>Support requested:</strong>{" "}
                {opportunity.connectToMsenti}
              </div>
            </div>
            <div className="mt-3 text-xs text-stone-500">
              In production: this sends an email or Slack message to Caleb
              and creates an entry in the Msenti Hub mentee queue.
            </div>
          </div>
        )}
      </div>

      <div className="text-center pt-4">
        <button
          onClick={onRestart}
          className="text-sm text-stone-500 hover:text-stone-800"
        >
          ← Start a new observation
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div
      className={`rounded-lg p-4 ${
        highlight ? "bg-kwaxolo-green/10" : "bg-stone-50"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-stone-500 font-semibold mb-1">
        {label}
      </div>
      <div
        className={`font-bold ${
          highlight ? "text-kwaxolo-green text-xl" : "text-stone-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ImpactRow({ icon, label, text, highlight }) {
  return (
    <div
      className={`flex gap-3 p-3 rounded-lg ${
        highlight ? "bg-kwaxolo-green/5" : "bg-stone-50"
      }`}
    >
      <div className="text-2xl flex-shrink-0">{icon}</div>
      <div>
        <div
          className={`text-xs uppercase tracking-wide font-bold mb-1 ${
            highlight ? "text-kwaxolo-green" : "text-stone-500"
          }`}
        >
          {label}
        </div>
        <div className="text-sm text-stone-700 leading-relaxed">{text}</div>
      </div>
    </div>
  );
}
