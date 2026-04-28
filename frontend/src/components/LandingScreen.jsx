export default function LandingScreen({ onStart }) {
  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 mb-4 leading-tight">
          See the opportunity
          <br />
          <span className="text-kwaxolo-green">around you.</span>
        </h1>
        <p className="text-lg text-stone-600 max-w-xl mx-auto">
          Tell us something you have noticed in your community — a problem, a
          frustration, something missing. We will help you see if it is also a
          business opportunity.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-12">
        <ExampleCard
          icon="🚌"
          title="A transport problem"
          example="People travel hours to repair phones."
        />
        <ExampleCard
          icon="🍞"
          title="A scaling question"
          example="My bakery is full every day. What now?"
        />
        <ExampleCard
          icon="📚"
          title="A gap in services"
          example="Students have no place to print homework."
        />
      </div>

      <div className="text-center">
        <button
          onClick={onStart}
          className="bg-kwaxolo-green hover:bg-emerald-700 text-white text-lg font-semibold px-8 py-4 rounded-xl shadow-sm transition"
        >
          Start →
        </button>
        <p className="text-xs text-stone-500 mt-3">Takes about 2 minutes.</p>
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
