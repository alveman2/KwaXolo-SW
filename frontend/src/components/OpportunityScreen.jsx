// OpportunityScreen — shows opportunity result + local advisor recommendations

import { useState, useMemo } from "react";
import { refineConversation } from "../lib/api.js";
import GlossaryText from "./GlossaryText.jsx";

// ── Local KwaXolo advisors ──────────────────────────────────────────────────
const LOCAL_ADVISORS = [
  {
    id: "victor",
    name: "Victor Jaca",
    photo: "/images/advisors/victor-jaca.png",
    role: "CEO, Msenti Hub",
    bio: "Drives business registration, early-stage venture development, and day-to-day coordination — the central node for on-the-ground execution.",
    email: "victor.jaca@msentihub.co.za",
    phone: "+27 72 345 6789",
    keywords: ["business", "registration", "startup", "venture", "operations", "management", "planning", "supply", "logistics", "retail", "shop", "spaza", "market", "sell", "trade", "import", "export"],
  },
  {
    id: "dolly",
    name: "Dolly Dlezi",
    photo: "/images/advisors/dolly-dlezi.png",
    role: "Accountant & Financial Specialist",
    bio: "Provides bookkeeping, compliance, and financial setup support — critical for ensuring new ventures are structured for growth from day one.",
    email: "dolly.dlezi@msentihub.co.za",
    phone: "+27 73 456 7890",
    keywords: ["finance", "accounting", "bookkeeping", "budget", "cost", "pricing", "tax", "compliance", "invoice", "profit", "loan", "savings", "money", "financial", "capital", "investment"],
  },
  {
    id: "thubelihle",
    name: "Thubelihle Sikobi",
    photo: "/images/advisors/thubelihle-sikobi.png",
    role: "IT Consultant & Digital Lead",
    bio: "Oversees technology infrastructure across 9 high schools. Ensures systems are operational and scalable across the region's educational network.",
    email: "thubelihle.sikobi@msentihub.co.za",
    phone: "+27 74 567 8901",
    keywords: ["technology", "digital", "IT", "computer", "phone", "repair", "software", "website", "app", "internet", "online", "social media", "printing", "photocopy", "tech", "electronics"],
  },
  {
    id: "caleb",
    name: "Caleb Phehlukwayo",
    photo: "/images/advisors/caleb-phehlukwayo.png",
    role: "Education & Community Advisor",
    bio: "Former school principal with over three decades in education. Brings deep community trust and institutional knowledge as Deputy Chair of the local school committee.",
    email: "caleb.phehlukwayo@msentihub.co.za",
    phone: "+27 76 678 9012",
    keywords: ["education", "school", "student", "training", "teaching", "tutoring", "mentoring", "youth", "community", "skills", "learning", "workshop", "course"],
  },
  {
    id: "inkosi",
    name: "Chief Inkosi Xolo",
    photo: "/images/advisors/inkosi-xolo.png",
    role: "Traditional Authority & Governance",
    bio: "Traditional Zulu chief bridging local governance and district institutions. Provides legitimacy and access that no external partner could replicate.",
    email: "inkosi.xolo@kwaxolo.gov.za",
    phone: "+27 78 789 0123",
    keywords: ["land", "permit", "governance", "community", "traditional", "tourism", "cultural", "heritage", "agriculture", "farming", "livestock", "cattle", "crops", "authority", "council"],
  },
];

function matchAdvisors(opportunity) {
  const text = [
    opportunity.opportunity?.title,
    opportunity.opportunity?.summary,
    ...(opportunity.skillsNeeded || []),
    opportunity.connectToMsenti,
    opportunity.communityImpact?.communityBenefit,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const scored = LOCAL_ADVISORS.map((advisor) => {
    const hits = advisor.keywords.filter((kw) => text.includes(kw.toLowerCase())).length;
    return { ...advisor, score: hits };
  })
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score);

  // Always return at least Victor (hub CEO) as fallback, max 2 advisors
  if (scored.length === 0) return [LOCAL_ADVISORS[0]];
  return scored.slice(0, 2);
}

export default function OpportunityScreen({ observation, opportunity, onRestart }) {
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showHandoff, setShowHandoff] = useState(false);

  const recommendedAdvisors = useMemo(() => matchAdvisors(opportunity), [opportunity]);

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
      {/* ── Top row: observation + acknowledgment ── */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-stone-100 border border-stone-200 rounded-xl p-4">
          <div className="text-xs uppercase tracking-wide text-stone-500 font-semibold mb-1">
            What you noticed
          </div>
          <div className="text-stone-700 italic">"{observation}"</div>
        </div>
        {opportunity.acknowledgment && (
          <div className="lg:col-span-2 text-stone-600 leading-relaxed text-base flex items-center">
            {opportunity.acknowledgment}
          </div>
        )}
      </div>

      {/* ── OPPORTUNITY REPORT ── */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header banner */}
        <div className="bg-gradient-to-r from-kwaxolo-green to-emerald-600 px-8 py-6">
          <div className="text-emerald-100 text-xs uppercase tracking-widest font-semibold mb-1">
            Opportunity Report
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight max-w-3xl">
            {opportunity.opportunity.title}
          </h2>
        </div>

        {/* Summary */}
        <div className="px-8 py-6">
          <p className="text-stone-600 text-lg leading-relaxed max-w-3xl">
            <GlossaryText text={opportunity.opportunity.summary} />
          </p>
        </div>

        {/* Financial snapshot — hero numbers */}
        <div className="px-8 pb-6">
          <h3 className="text-xs uppercase tracking-widest text-stone-400 font-bold mb-4">
            Financial snapshot
          </h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
              <div className="text-[11px] uppercase tracking-widest text-emerald-600 font-semibold mb-2">
                Monthly earnings
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-700 tracking-tight">
                {opportunity.opportunity.estimatedMonthlyEarnings}
              </div>
            </div>

            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
              <div className="text-[11px] uppercase tracking-widest text-amber-600 font-semibold mb-2">
                Startup cost
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-700 tracking-tight">
                {opportunity.estimatedStartupCost}
              </div>
            </div>

            <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
              <div className="text-[11px] uppercase tracking-widest text-blue-600 font-semibold mb-2">
                Market size
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-800 tracking-tight">
                {opportunity.opportunity.marketSize}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-stone-100" />

        {/* Success story */}
        {opportunity.successStory && (
          <div className="px-8 py-6">
            <div className="flex items-start gap-4 bg-kwaxolo-blue/5 rounded-xl p-5">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-kwaxolo-blue/10 flex items-center justify-center">
                <span className="text-kwaxolo-blue text-lg font-bold">!</span>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-kwaxolo-blue font-bold mb-1">
                  Real success story
                </div>
                <div className="text-base font-bold text-stone-900 mb-1">
                  {opportunity.successStory.name}
                </div>
                <p className="text-sm text-stone-600 leading-relaxed">
                  <GlossaryText text={opportunity.successStory.story} />
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-stone-100" />

        {/* First steps + Skills — side by side */}
        <div className="px-8 py-6 grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide mb-4">
              Your first three steps
            </h3>
            <ol className="space-y-3">
              {opportunity.firstSteps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-kwaxolo-green text-white font-bold text-sm flex items-center justify-center shadow-sm">
                    {i + 1}
                  </div>
                  <div className="text-sm text-stone-700 pt-1 leading-relaxed"><GlossaryText text={step} /></div>
                </li>
              ))}
            </ol>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide mb-4">
              Skills needed
            </h3>
            <div className="flex flex-wrap gap-2">
              {opportunity.skillsNeeded.map((skill, i) => (
                <span
                  key={i}
                  className="bg-kwaxolo-blue/10 text-kwaxolo-blue px-3 py-1.5 rounded-full text-xs font-semibold"
                >
                  <GlossaryText text={skill} />
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-stone-100" />

        {/* Community impact */}
        {opportunity.communityImpact && (
          <div className="px-8 py-6">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide mb-1">
              Community impact
            </h3>
            <p className="text-xs text-stone-400 mb-4">
              Money that stays in KwaXolo multiplies — here's the ripple effect.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <ImpactCard
                label="You"
                text={opportunity.communityImpact.founderBenefit}
                color="emerald"
              />
              <ImpactCard
                label="Your family"
                text={opportunity.communityImpact.familyBenefit}
                color="blue"
              />
              <ImpactCard
                label="KwaXolo community"
                text={opportunity.communityImpact.communityBenefit}
                color="green"
                featured
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Chat + Advisors — side by side on wide screens ── */}
      <div className="grid lg:grid-cols-2 gap-6">
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
                  {msg.role === "assistant" ? <GlossaryText text={msg.content} /> : msg.content}
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
          {chatLoading && (
            <div className="mt-3">
              <ProgressBar />
            </div>
          )}
        </div>

        {/* Local advisors recommendation */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-stone-900 mb-1">
            People who can help you
          </h3>
          <p className="text-sm text-stone-500 mb-5">
            These local experts at the Msenti Hub can support you with this opportunity.
          </p>
          <div className="space-y-4">
            {recommendedAdvisors.map((advisor) => (
              <div
                key={advisor.id}
                className="flex items-start gap-4 p-4 bg-stone-50 rounded-xl border border-stone-100 hover:border-kwaxolo-green/30 transition"
              >
                <img
                  src={advisor.photo}
                  alt={advisor.name}
                  className="flex-shrink-0 w-14 h-14 rounded-full object-cover shadow-md border-2 border-kwaxolo-green/20"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-stone-900">{advisor.name}</div>
                  <div className="text-xs text-kwaxolo-blue font-semibold uppercase tracking-wide mb-1">
                    {advisor.role}
                  </div>
                  <p className="text-sm text-stone-600 leading-relaxed mb-3">
                    {advisor.bio}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={`mailto:${advisor.email}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-kwaxolo-green hover:text-emerald-700 bg-kwaxolo-green/10 px-3 py-1.5 rounded-full transition"
                    >
                      <span>✉</span> {advisor.email}
                    </a>
                    <a
                      href={`tel:${advisor.phone.replace(/\s/g, "")}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-kwaxolo-blue hover:text-blue-700 bg-kwaxolo-blue/10 px-3 py-1.5 rounded-full transition"
                    >
                      <span>✆</span> {advisor.phone}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Msenti handoff */}
      <div className="bg-kwaxolo-gold/20 border-2 border-kwaxolo-gold rounded-2xl p-6">
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <h3 className="text-lg font-bold text-stone-900 mb-2">
              Ready for the next step?
            </h3>
            <p className="text-stone-700 mb-4"><GlossaryText text={opportunity.connectToMsenti} /></p>
            <button
              onClick={() => setShowHandoff(!showHandoff)}
              className="bg-kwaxolo-blue hover:bg-blue-900 text-white font-semibold px-6 py-3 rounded-xl transition"
            >
              {showHandoff ? "Hide handoff" : "Connect to Msenti Hub →"}
            </button>
          </div>

          {showHandoff && (
            <div className="lg:col-span-1 bg-white rounded-xl p-4 border border-stone-200">
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

function ImpactCard({ label, text, color, featured }) {
  const styles = {
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", label: "text-emerald-700" },
    blue:    { bg: "bg-blue-50",    border: "border-blue-200",    label: "text-blue-700" },
    green:   { bg: "bg-kwaxolo-green/5", border: "border-kwaxolo-green/20", label: "text-kwaxolo-green" },
  };
  const s = styles[color] || styles.green;
  return (
    <div className={`${s.bg} border ${s.border} rounded-xl p-5 ${featured ? "sm:col-span-3 md:col-span-1" : ""}`}>
      <div className={`text-[11px] uppercase tracking-widest font-bold mb-2 ${s.label}`}>
        {label}
      </div>
      <div className="text-base font-medium text-stone-800 leading-relaxed"><GlossaryText text={text} /></div>
    </div>
  );
}
