import { useStrings } from "../lib/i18n.jsx";

export default function LandingScreen({ onStart }) {
  const t = useStrings();

  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 mb-4 leading-tight">
          {t.landing.headline1}
          <br />
          <span className="text-kwaxolo-green">{t.landing.headline2}</span>
        </h1>
        <p className="text-lg text-stone-600 max-w-xl mx-auto">
          {t.landing.description}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-12">
        <ExampleCard
          icon="🚌"
          title={t.landing.exampleTransport}
          example={t.landing.exampleTransportText}
        />
        <ExampleCard
          icon="🍞"
          title={t.landing.exampleScaling}
          example={t.landing.exampleScalingText}
        />
        <ExampleCard
          icon="📚"
          title={t.landing.exampleGap}
          example={t.landing.exampleGapText}
        />
      </div>

      <div className="text-center">
        <button
          onClick={onStart}
          className="bg-kwaxolo-green hover:bg-emerald-700 text-white text-lg font-semibold px-8 py-4 rounded-xl shadow-sm transition"
        >
          {t.landing.startButton}
        </button>
        <p className="text-xs text-stone-500 mt-3">{t.landing.takesAbout}</p>
      </div>
    </div>
  );
}

function ExampleCard({ icon, title, example }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-semibold text-stone-900 text-sm mb-1">{title}</div>
      <div className="text-sm text-stone-600 italic">"{example}"</div>
    </div>
  );
}
