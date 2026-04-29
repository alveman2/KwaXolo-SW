import { useState, useEffect } from "react";

// ── Levenshtein distance for fuzzy fill_blank matching ─────────────────────
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function fuzzyMatch(input, accepted = []) {
  const norm = input.trim().toLowerCase();
  return accepted.some(ans => {
    const a = ans.trim().toLowerCase();
    if (norm === a) return true;
    const tolerance = a.length <= 4 ? 0 : a.length <= 8 ? 1 : 2;
    return levenshtein(norm, a) <= tolerance;
  });
}

// ── Exercise renderers ─────────────────────────────────────────────────────

function TapCorrect({ step, onCorrect, onWrong, locked }) {
  const [selected, setSelected] = useState(null);
  function pick(opt) {
    if (locked || selected) return;
    setSelected(opt);
    if (opt === step.correctAnswer) onCorrect();
    else onWrong();
  }
  return (
    <div className="space-y-3 w-full">
      {(step.options || []).map((opt, i) => {
        const isSelected = selected === opt;
        const isCorrect = isSelected && opt === step.correctAnswer;
        const isWrong = isSelected && opt !== step.correctAnswer;
        return (
          <button
            key={i}
            onClick={() => pick(opt)}
            disabled={!!selected || locked}
            className={`w-full text-left px-4 py-3 rounded-2xl border-2 text-sm font-medium transition-all
              ${isCorrect ? "border-green-400 bg-green-50 text-green-800" :
                isWrong ? "border-red-400 bg-red-50 text-red-800 animate-shake" :
                selected ? "border-stone-200 bg-stone-50 text-stone-400" :
                "border-stone-200 bg-white text-stone-800 hover:border-blue-400 hover:bg-blue-50 active:scale-95"}`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function FillBlank({ step, onCorrect, onWrong, locked }) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  function submit() {
    if (!value.trim() || submitted) return;
    const ok = fuzzyMatch(value, step.acceptedAnswers?.length ? step.acceptedAnswers : [step.correctAnswer]);
    setSubmitted(true);
    setCorrect(ok);
    if (ok) onCorrect(); else onWrong();
  }

  return (
    <div className="w-full space-y-3">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()}
        disabled={submitted || locked}
        placeholder="Type your answer…"
        className={`w-full px-4 py-3 rounded-2xl border-2 text-sm outline-none transition
          ${submitted && correct ? "border-green-400 bg-green-50 text-green-800" :
            submitted && !correct ? "border-red-400 bg-red-50 text-red-800" :
            "border-stone-300 bg-white text-stone-800 focus:border-blue-400"}`}
      />
      {!submitted && (
        <button
          onClick={submit}
          disabled={!value.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold py-2.5 rounded-2xl text-sm transition"
        >
          Check
        </button>
      )}
      {submitted && !correct && step.acceptedAnswers?.[0] && (
        <p className="text-xs text-stone-500 text-center">Answer: <span className="font-semibold text-stone-700">{step.acceptedAnswers[0]}</span></p>
      )}
    </div>
  );
}

function ArrangeSteps({ step, onCorrect, onWrong, locked }) {
  const tiles = step.tiles || step.correctOrder || [];
  const [placed, setPlaced] = useState([]);
  const [remaining, setRemaining] = useState(() => [...tiles].sort(() => Math.random() - 0.5));
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);

  function tap(tile) {
    if (checked || locked) return;
    setPlaced(p => [...p, tile]);
    setRemaining(r => r.filter(t => t !== tile));
  }

  function remove(i) {
    if (checked || locked) return;
    const tile = placed[i];
    setPlaced(p => p.filter((_, j) => j !== i));
    setRemaining(r => [...r, tile]);
  }

  function check() {
    const ok = (step.correctOrder || tiles).every((t, i) => t === placed[i]);
    setChecked(true);
    setCorrect(ok);
    if (ok) onCorrect(); else onWrong();
  }

  function reset() {
    setPlaced([]);
    setRemaining([...tiles].sort(() => Math.random() - 0.5));
    setChecked(false);
    setCorrect(false);
  }

  return (
    <div className="w-full space-y-3">
      {/* Drop zone */}
      <div className="min-h-[56px] border-2 border-dashed rounded-2xl p-2 flex flex-wrap gap-2 bg-stone-50
        border-stone-300">
        {placed.length === 0 && <p className="text-xs text-stone-400 self-center px-2">Tap tiles below to order them</p>}
        {placed.map((t, i) => (
          <button key={i} onClick={() => remove(i)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition
              ${checked && correct ? "bg-green-100 border-green-300 text-green-800" :
                checked && !correct ? "bg-red-100 border-red-300 text-red-800" :
                "bg-white border-stone-300 text-stone-800 hover:bg-red-50"}`}>
            {i + 1}. {t}
          </button>
        ))}
      </div>

      {/* Source tiles */}
      <div className="flex flex-wrap gap-2">
        {remaining.map((t, i) => (
          <button key={i} onClick={() => tap(t)}
            disabled={checked || locked}
            className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium rounded-xl hover:bg-blue-100 transition disabled:opacity-50">
            {t}
          </button>
        ))}
      </div>

      {!checked && placed.length === tiles.length && (
        <button onClick={check}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-2xl text-sm transition">
          Check order
        </button>
      )}
      {checked && !correct && (
        <button onClick={reset}
          className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold py-2.5 rounded-2xl text-sm transition">
          Try again
        </button>
      )}
    </div>
  );
}

function MatchPairs({ step, onCorrect, onWrong, locked }) {
  const pairs = step.pairs || [];
  const [leftSel, setLeftSel] = useState(null);
  const [matched, setMatched] = useState({}); // term → match
  const [wrong, setWrong] = useState(null);
  const [done, setDone] = useState(false);

  const terms = pairs.map(p => p.term);
  const matches = [...pairs.map(p => p.match)].sort(() => Math.random() - 0.5);
  // keep shuffle stable
  const [shuffled] = useState(() => [...pairs.map(p => p.match)].sort(() => Math.random() - 0.5));

  function pickLeft(term) {
    if (done || locked || matched[term]) return;
    setLeftSel(term);
    setWrong(null);
  }

  function pickRight(match) {
    if (!leftSel || done || locked) return;
    const expected = pairs.find(p => p.term === leftSel)?.match;
    if (match === expected) {
      const newMatched = { ...matched, [leftSel]: match };
      setMatched(newMatched);
      setLeftSel(null);
      if (Object.keys(newMatched).length === pairs.length) {
        setDone(true);
        onCorrect();
      }
    } else {
      setWrong(match);
      setTimeout(() => { setWrong(null); setLeftSel(null); }, 700);
      onWrong();
    }
  }

  const matchedValues = Object.values(matched);

  return (
    <div className="w-full grid grid-cols-2 gap-2">
      <div className="space-y-2">
        {terms.map((term, i) => (
          <button key={i} onClick={() => pickLeft(term)}
            disabled={!!matched[term] || done || locked}
            className={`w-full px-3 py-2.5 rounded-xl text-xs font-medium border-2 text-left transition
              ${matched[term] ? "border-green-300 bg-green-50 text-green-800" :
                leftSel === term ? "border-blue-500 bg-blue-50 text-blue-800" :
                "border-stone-200 bg-white text-stone-800 hover:border-blue-300"}`}>
            {term}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {shuffled.map((match, i) => (
          <button key={i} onClick={() => pickRight(match)}
            disabled={matchedValues.includes(match) || done || locked || !leftSel}
            className={`w-full px-3 py-2.5 rounded-xl text-xs font-medium border-2 text-left transition
              ${matchedValues.includes(match) ? "border-green-300 bg-green-50 text-green-800" :
                wrong === match ? "border-red-400 bg-red-50 text-red-800" :
                leftSel ? "border-stone-300 bg-white text-stone-800 hover:border-emerald-400 hover:bg-emerald-50" :
                "border-stone-200 bg-stone-50 text-stone-400"}`}>
            {match}
          </button>
        ))}
      </div>
    </div>
  );
}

function DoAndConfirm({ step, onCorrect, onWrong, locked }) {
  const [selected, setSelected] = useState(null);
  function pick(opt) {
    if (locked || selected) return;
    setSelected(opt);
    if (opt === step.correctAnswer) onCorrect(); else onWrong();
  }
  return (
    <div className="w-full space-y-3">
      {step.visibleResult && (
        <div className="bg-stone-100 rounded-xl p-3 text-xs text-stone-600 text-center border border-stone-200">
          <span className="block text-stone-400 text-[10px] uppercase tracking-wide mb-1">What you see</span>
          {step.visibleResult}
        </div>
      )}
      {(step.options || []).map((opt, i) => {
        const isSelected = selected === opt;
        const isCorrect = isSelected && opt === step.correctAnswer;
        const isWrong = isSelected && opt !== step.correctAnswer;
        return (
          <button key={i} onClick={() => pick(opt)}
            disabled={!!selected || locked}
            className={`w-full text-left px-4 py-3 rounded-2xl border-2 text-sm font-medium transition-all
              ${isCorrect ? "border-green-400 bg-green-50 text-green-800" :
                isWrong ? "border-red-400 bg-red-50 text-red-800" :
                selected ? "border-stone-200 bg-stone-50 text-stone-400" :
                "border-stone-200 bg-white text-stone-800 hover:border-blue-400 hover:bg-blue-50 active:scale-95"}`}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ── Main PhoneSimulator ────────────────────────────────────────────────────

export default function PhoneSimulator({ task, onClose }) {
  const steps = task?.steps || [];
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [feedbackOk, setFeedbackOk] = useState(false);
  const MAX_ATTEMPTS = 3;

  const step = steps[idx];

  // Reset per step
  useEffect(() => {
    setAnswered(false);
    setAttempts(0);
    setFeedbackMsg(null);
  }, [idx]);

  function handleCorrect() {
    setAnswered(true);
    setFeedbackMsg(step.feedbackCorrect || "Correct! ✓");
    setFeedbackOk(true);
  }

  function handleWrong() {
    const next = attempts + 1;
    setAttempts(next);
    if (next >= MAX_ATTEMPTS) {
      setAnswered(true);
      setFeedbackMsg("Answer revealed. Read it and continue.");
      setFeedbackOk(false);
    } else {
      setFeedbackMsg(step.feedbackWrong || "Not quite — try again.");
      setFeedbackOk(false);
    }
  }

  if (!step) return null;

  const isLocked = answered;
  const canNext = answered && idx < steps.length - 1;
  const isLast = idx === steps.length - 1;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="relative flex flex-col bg-white rounded-[3rem] shadow-2xl overflow-hidden"
        style={{ width: 340, maxHeight: "92vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Phone notch / status bar */}
        <div className="flex-shrink-0 bg-stone-900 text-white pt-3 pb-2 px-6 flex items-center justify-between">
          <div className="w-16 h-1.5 bg-white/20 rounded-full" />
          <div className="w-20 h-5 bg-stone-800 rounded-full" /> {/* notch */}
          <div className="w-16 flex justify-end gap-1 items-center">
            <span className="text-[10px] opacity-60">●●●</span>
          </div>
        </div>

        {/* App bar */}
        <div className="flex-shrink-0 bg-stone-900 text-white px-5 pb-3 flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: task.appColor || "#3b82f6", color: task.appTextColor || "#fff" }}
          >
            {task.appName?.[0] || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{task.appName || "App"}</div>
            <div className="text-[10px] text-stone-400">Step {idx + 1} / {steps.length}</div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white text-lg leading-none">×</button>
        </div>

        {/* Progress bar */}
        <div className="flex-shrink-0 bg-stone-900 px-5 pb-3">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i < idx ? "bg-green-400" : i === idx ? "bg-blue-400" : "bg-stone-700"}`} />
            ))}
          </div>
        </div>

        {/* Screen content */}
        <div className="flex-1 overflow-y-auto bg-stone-50 px-5 py-4 space-y-4">

          {/* Screen name */}
          {step.screenName && (
            <div className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold text-center">
              {step.screenName}
            </div>
          )}

          {/* Teach text */}
          {step.teach && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
              <p className="text-sm text-blue-900 leading-relaxed">{step.teach}</p>
            </div>
          )}

          {/* Sample data — dummy values shown on the phone */}
          {step.sampleData && Object.keys(step.sampleData).length > 0 && (
            <div className="bg-stone-100 rounded-2xl p-3 space-y-1">
              {Object.entries(step.sampleData).map(([label, value]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-stone-500 font-medium">{label}</span>
                  <span className="text-stone-800 font-semibold">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Question */}
          <p className="text-base font-bold text-stone-900 leading-snug text-center">
            {step.question}
          </p>

          {/* Exercise */}
          {step.exerciseType === "tap_correct" && (
            <TapCorrect step={step} onCorrect={handleCorrect} onWrong={handleWrong} locked={isLocked} />
          )}
          {step.exerciseType === "fill_blank" && (
            <FillBlank step={step} onCorrect={handleCorrect} onWrong={handleWrong} locked={isLocked} />
          )}
          {step.exerciseType === "arrange_steps" && (
            <ArrangeSteps step={step} onCorrect={handleCorrect} onWrong={handleWrong} locked={isLocked} />
          )}
          {step.exerciseType === "match_pairs" && (
            <MatchPairs step={step} onCorrect={handleCorrect} onWrong={handleWrong} locked={isLocked} />
          )}
          {step.exerciseType === "do_and_confirm" && (
            <DoAndConfirm step={step} onCorrect={handleCorrect} onWrong={handleWrong} locked={isLocked} />
          )}

          {/* Feedback */}
          {feedbackMsg && (
            <div className={`rounded-2xl px-4 py-3 text-sm font-medium text-center transition-all
              ${feedbackOk ? "bg-green-100 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
              {feedbackMsg}
            </div>
          )}

          {/* Tip */}
          {step.tip && answered && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-xs text-amber-800">
              💡 {step.tip}
            </div>
          )}

          {/* Last step celebration */}
          {answered && isLast && (
            <div className="text-center py-4 space-y-2">
              <div className="text-4xl">🎉</div>
              <p className="font-bold text-stone-900">Lesson complete!</p>
              {(task.taskReflection || task.thinkAboutThis) && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-left">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Think about this</p>
                  <p className="text-sm text-amber-900">{task.taskReflection || task.thinkAboutThis}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div className="flex-shrink-0 bg-white border-t border-stone-200 px-5 py-4 flex gap-3">
          <button
            onClick={() => setIdx(i => i - 1)}
            disabled={idx === 0}
            className="flex-1 bg-stone-100 hover:bg-stone-200 disabled:opacity-30 text-stone-700 font-semibold py-3 rounded-2xl text-sm transition"
          >
            ← Back
          </button>
          <button
            onClick={() => { if (canNext) setIdx(i => i + 1); else if (isLast && answered) onClose(); }}
            disabled={!answered}
            className="flex-[2] bg-blue-600 hover:bg-blue-700 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold py-3 rounded-2xl text-sm transition"
          >
            {isLast && answered ? "Done ✓" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
