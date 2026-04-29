import { useState } from "react";
import { generateCourse, createCourse } from "../lib/api.js";
import { useStrings } from "../lib/i18n.jsx";
import PhoneSimulator from "./PhoneSimulator.jsx";

const GRADE_OPTIONS_VALUES = [
  { value: "", key: "mixedGrade" },
  { value: "Grade 8", label: "Grade 8" },
  { value: "Grade 9", label: "Grade 9" },
  { value: "Grade 10", label: "Grade 10" },
  { value: "Grade 11", label: "Grade 11" },
  { value: "Grade 12", label: "Grade 12" },
];

const EXAMPLE_PROMPTS = [
  { label: "WhatsApp Business", prompt: "Teach my students how to set up a WhatsApp Business profile for their side hustles" },
  { label: "Create a Gmail Account", prompt: "Teach my students how to create a Gmail account step by step — they have never had an email address before" },
  { label: "Profit & Revenue", prompt: "I want my Grade 10s to understand profit, revenue and cost using spaza shop examples" },
  { label: "Facebook Marketplace", prompt: "How to list and sell products on Facebook Marketplace for beginners" },
  { label: "Budget for Food Business", prompt: "Teach students how to write a simple budget for a small food business like baking or catering" },
  { label: "Using a Web Browser", prompt: "My students have never used a computer before. Teach them how to open a web browser and search for something on Google" },
  { label: "Using a Mouse", prompt: "Teach my students the basics of using a computer mouse — left click, right click, double click, scrolling and dragging" },
];

const CATEGORY_LABEL = {
  phase1: "Phase 1: Getting started",
  phase2: "Phase 2: Productivity",
  business: "Business basics",
  custom: "Custom",
};

const LEVEL_LABEL = {
  beginner: "Beginner",
  intermediate: "Intermediate",
};

export default function TeacherScreen({ onCourseSaved }) {
  // ── Step A: input ──────────────────────────────────────────────────────────
  const [teacherInput, setTeacherInput] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [progressPct, setProgressPct] = useState(0);
  const [progressPhase, setProgressPhase] = useState("");

  // ── Step B: preview ────────────────────────────────────────────────────────
  const [preview, setPreview] = useState(null); // generated course object
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const t = useStrings();

  // ── Step A: Generate ───────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!teacherInput.trim()) return;
    setGenerating(true);
    setGenerateError(null);
    setProgressPct(0);
    setProgressPhase("");
    try {
      const course = await generateCourse(
        teacherInput.trim(),
        gradeLevel || undefined,
        (pct, phase) => {
          setProgressPct(pct);
          setProgressPhase(phase);
        }
      );
      setPreview(course);
    } catch (err) {
      setGenerateError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  // ── Step B: Save ───────────────────────────────────────────────────────────

  async function handleSave() {
    if (!preview) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await createCourse({ ...preview, created_by: "teacher" });
      onCourseSaved(saved.id);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Render: Step A ─────────────────────────────────────────────────────────

  if (!preview) {
    return (
      <div className="py-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-kwaxolo-gold/20 text-stone-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <span>👩‍🏫</span> Teacher mode
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
            {t.teacher.heading}
          </h2>
          <p className="text-stone-600">
            {t.teacher.description}
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              What do your students need to learn?
            </label>
            <textarea
              value={teacherInput}
              onChange={(e) => setTeacherInput(e.target.value)}
              placeholder="Be specific — describe what they're struggling with or what knowledge gap you've noticed. For example: 'My Grade 11s are about to start job searching but have never written a CV or a formal email. They also don't know how to use Word.'"
              rows={5}
              disabled={generating}
              className="w-full bg-white border border-stone-300 rounded-xl p-4 text-stone-900 focus:outline-none focus:ring-2 focus:ring-kwaxolo-green focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              {t.teacher.gradeLevel}{" "}
              <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              disabled={generating}
              className="bg-white border border-stone-300 rounded-xl px-4 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-kwaxolo-green focus:border-transparent"
            >
              {GRADE_OPTIONS_VALUES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.key ? t.teacher.mixedGrade : o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs text-stone-500 mb-3">Try an example:</div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setTeacherInput(p.prompt)}
                  disabled={generating}
                  className="text-sm bg-white border border-stone-200 hover:border-kwaxolo-green hover:bg-kwaxolo-green/5 text-stone-700 px-4 py-2 rounded-xl transition disabled:opacity-50"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {generateError && (
          <div className="mt-5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            <strong>Error:</strong> {generateError}
            <div className="mt-1 text-xs">
              Make sure the backend is running and OPENAI_API_KEY is set.
            </div>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={handleGenerate}
            disabled={generating || !teacherInput.trim()}
            className="w-full sm:w-auto bg-kwaxolo-green hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl transition flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Spinner /> {t.teacher.generating}
              </>
            ) : (
              <>{t.teacher.generate} →</>
            )}
          </button>
          {generating && (
            <div className="mt-3 space-y-2">
              <ProgressBar pct={progressPct} />
              {progressPhase && (
                <p className="text-xs text-stone-600 font-medium">{progressPhase}</p>
              )}
              <p className="text-xs text-stone-500">
                This takes about 20–40 seconds. The AI is searching real app UI,
                planning steps, and writing lesson content.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Render: Step B (preview) ───────────────────────────────────────────────

  return (
    <div className="py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <div className="inline-flex items-center gap-2 bg-kwaxolo-gold/20 text-stone-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
            <span>👩‍🏫</span> Course preview
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">
            {preview.title}
          </h2>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full font-medium">
          {CATEGORY_LABEL[preview.category] ?? preview.category}
        </span>
        <span className="text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full font-medium">
          {LEVEL_LABEL[preview.level] ?? preview.level}
        </span>
        <span className="text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full font-medium">
          {preview.duration_minutes} min
        </span>
        <span className="text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full font-medium">
          {preview.lessons?.length ?? 0} lessons
        </span>
      </div>

      <p className="text-stone-700 mb-6 leading-relaxed">{preview.description}</p>

      {/* Lessons */}
      <div className="space-y-4 mb-8">
        {(preview.lessons ?? []).map((lesson, i) => (
          <LessonCard key={i} lesson={lesson} index={i} />
        ))}
      </div>

      {saveError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <strong>Could not save:</strong> {saveError}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 sm:flex-none bg-kwaxolo-green hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl transition flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Spinner /> {t.teacher.saving}
            </>
          ) : (
            <>{t.teacher.save} →</>
          )}
        </button>

        <button
          onClick={handleGenerate}
          disabled={generating || saving}
          className="flex-1 sm:flex-none bg-white hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed text-stone-700 font-medium px-6 py-3 rounded-xl border border-stone-300 transition flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <Spinner className="text-stone-400" /> {t.teacher.generating}
            </>
          ) : (
            <>{t.teacher.regenerate}</>
          )}
        </button>

        <button
          onClick={() => {
            setPreview(null);
            setGenerateError(null);
            setSaveError(null);
          }}
          disabled={saving}
          className="flex-1 sm:flex-none bg-white hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed text-stone-500 font-medium px-6 py-3 rounded-xl border border-stone-200 transition"
        >
          {t.teacher.editInput}
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LessonCard({ lesson, index }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50 transition"
      >
        <div className="flex items-center gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-kwaxolo-gold text-stone-900 font-bold text-xs flex items-center justify-center">
            {index + 1}
          </span>
          <span className="font-semibold text-stone-900 text-sm">
            {lesson.title}
          </span>
        </div>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-stone-100 space-y-4 pt-4">
          {/* Objective */}
          {lesson.teacherObjective && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="text-xs uppercase tracking-wide text-blue-600 font-bold mb-1">Objective</div>
              <p className="text-sm text-stone-700">{lesson.teacherObjective}</p>
            </div>
          )}

          {/* Teacher Prep */}
          {lesson.teacherPrep?.length > 0 && (
            <TeacherSection title="Preparation" color="amber">
              <ul className="space-y-1">{lesson.teacherPrep.map((p, j) => <li key={j} className="text-sm text-stone-700">- {p}</li>)}</ul>
            </TeacherSection>
          )}

          {/* Board Points */}
          {lesson.keyPoints?.length > 0 && (
            <div className="bg-kwaxolo-green/5 border border-kwaxolo-green/20 rounded-xl p-4">
              <div className="text-xs uppercase tracking-wide text-kwaxolo-green font-bold mb-2">Write on the Board</div>
              <ul className="space-y-1.5">
                {lesson.keyPoints.map((point, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-stone-700">
                    <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-kwaxolo-green text-white text-xs flex items-center justify-center font-bold">✓</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Board Layout */}
          {lesson.teacherBoardLayout && (
            <div className="bg-stone-800 text-white rounded-xl p-4">
              <div className="text-xs uppercase tracking-wide text-stone-400 font-bold mb-2">Blackboard Layout</div>
              {lesson.teacherBoardLayout.title && <div className="text-center font-bold text-sm mb-2 border-b border-stone-600 pb-1">{lesson.teacherBoardLayout.title}</div>}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {lesson.teacherBoardLayout.leftColumn?.length > 0 && (
                  <div>{lesson.teacherBoardLayout.leftColumn.map((l, j) => <div key={j} className="mb-1">{l}</div>)}</div>
                )}
                {lesson.teacherBoardLayout.rightColumn?.length > 0 && (
                  <div>{lesson.teacherBoardLayout.rightColumn.map((r, j) => <div key={j} className="mb-1">{r}</div>)}</div>
                )}
              </div>
              {lesson.teacherBoardLayout.bottomLine && <div className="text-xs text-stone-300 mt-2 pt-1 border-t border-stone-600">{lesson.teacherBoardLayout.bottomLine}</div>}
            </div>
          )}

          {/* Teacher Script */}
          {lesson.teacherScript?.length > 0 && (
            <TeacherSection title="Teacher Script" color="indigo">
              <div className="space-y-2">
                {lesson.teacherScript.map((s, j) => (
                  <div key={j} className="bg-white rounded-lg p-2 border border-stone-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-indigo-600">{s.section}</span>
                      <span className="text-xs text-stone-400">{s.minutes} min</span>
                    </div>
                    <p className="text-xs text-stone-700"><span className="font-semibold">Say:</span> {s.say}</p>
                    <p className="text-xs text-stone-500"><span className="font-semibold">Do:</span> {s.do}</p>
                  </div>
                ))}
              </div>
            </TeacherSection>
          )}

          {/* Explanation */}
          {lesson.teacherExplanation && (
            <TeacherSection title="Explain to Students" color="stone">
              {lesson.teacherExplanation.split(/\n\n+/).map((para, j) => (
                <p key={j} className="text-sm text-stone-700 leading-relaxed mb-2">{para}</p>
              ))}
            </TeacherSection>
          )}

          {/* Vocabulary */}
          {lesson.teacherVocabulary?.length > 0 && (
            <TeacherSection title="Vocabulary" color="teal">
              <div className="grid gap-1">
                {lesson.teacherVocabulary.map((v, j) => (
                  <div key={j} className="flex items-baseline gap-2 text-xs">
                    <span className="font-bold text-stone-800">{v.word}</span>
                    <span className="text-stone-600">— {v.simpleMeaning}</span>
                    {v.isiZuluSupport && <span className="text-teal-600 italic">({v.isiZuluSupport})</span>}
                  </div>
                ))}
              </div>
            </TeacherSection>
          )}

          {/* Discussion Questions */}
          {lesson.teacherDiscussionQuestions?.length > 0 && (
            <TeacherSection title="Discussion Questions" color="purple">
              <ol className="space-y-1 list-decimal list-inside">
                {lesson.teacherDiscussionQuestions.map((q, j) => <li key={j} className="text-sm text-stone-700">{q}</li>)}
              </ol>
            </TeacherSection>
          )}

          {/* Local Example */}
          {lesson.teacherLocalExample && (
            <div className="bg-green-50 border-l-4 border-green-400 rounded-r-xl p-3">
              <div className="text-xs uppercase tracking-wide text-green-700 font-bold mb-1">Local Example</div>
              <p className="text-sm text-stone-700 italic">{lesson.teacherLocalExample}</p>
            </div>
          )}

          {/* Device Plan */}
          {lesson.teacherDevicePlan && (
            <TeacherSection title="Device Plan" color="cyan">
              <div className="space-y-1 text-xs text-stone-700">
                <p><span className="font-semibold">Enough devices:</span> {lesson.teacherDevicePlan.ifEnoughDevices}</p>
                <p><span className="font-semibold">Shared devices:</span> {lesson.teacherDevicePlan.ifSharedDevices}</p>
                <p><span className="font-semibold">No internet:</span> {lesson.teacherDevicePlan.ifNoInternet}</p>
              </div>
            </TeacherSection>
          )}

          {/* Common Mistakes */}
          {lesson.teacherCommonMistakes?.length > 0 && (
            <TeacherSection title="Common Mistakes" color="red">
              {lesson.teacherCommonMistakes.map((m, j) => (
                <div key={j} className="text-xs mb-1">
                  <p className="text-red-700 font-medium">Mistake: {m.mistake}</p>
                  <p className="text-stone-600">Response: {m.teacherResponse}</p>
                </div>
              ))}
            </TeacherSection>
          )}

          {/* Time Guide */}
          {lesson.teacherTimeGuide?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {lesson.teacherTimeGuide.map((t, j) => (
                <span key={j} className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-lg">{t}</span>
              ))}
            </div>
          )}

          {/* Student task exercises */}
          {lesson.studentTask && (
            <StudentTaskPreview task={lesson.studentTask} />
          )}
        </div>
      )}
    </div>
  );
}

function TeacherSection({ title, color, children }) {
  const colorMap = {
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
    stone: "bg-stone-50 border-stone-200 text-stone-600",
    teal: "bg-teal-50 border-teal-200 text-teal-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    cyan: "bg-cyan-50 border-cyan-200 text-cyan-700",
    red: "bg-red-50 border-red-200 text-red-700",
  };
  const classes = colorMap[color] || colorMap.stone;
  return (
    <div className={`rounded-xl border p-3 ${classes.split(" ").slice(0, 2).join(" ")}`}>
      <div className={`text-xs uppercase tracking-wide font-bold mb-2 ${classes.split(" ")[2]}`}>{title}</div>
      {children}
    </div>
  );
}

const EXERCISE_TYPE_LABEL = {
  tap_correct: "Multiple choice",
  fill_blank: "Fill in the blank",
  arrange_steps: "Arrange steps",
  match_pairs: "Match pairs",
  do_and_confirm: "Do & confirm",
};

const EXERCISE_TYPE_COLOR = {
  tap_correct: "bg-blue-100 text-blue-700",
  fill_blank: "bg-amber-100 text-amber-700",
  arrange_steps: "bg-purple-100 text-purple-700",
  match_pairs: "bg-emerald-100 text-emerald-700",
  do_and_confirm: "bg-rose-100 text-rose-700",
};

function StudentTaskPreview({ task }) {
  const [expanded, setExpanded] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
      {showSimulator && (
        <PhoneSimulator task={task} onClose={() => setShowSimulator(false)} />
      )}

      <div className="flex items-start justify-between gap-3 mb-0">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex-1 flex items-center justify-between text-left"
        >
          <div>
            <div className="text-xs uppercase tracking-wide text-orange-600 font-bold mb-1">
              Student Task ({task.steps?.length || 0} steps)
            </div>
            {task.whatYouWillDo && (
              <p className="text-sm text-stone-700">{task.whatYouWillDo}</p>
            )}
          </div>
          <ChevronIcon open={expanded} />
        </button>

        <button
          onClick={() => setShowSimulator(true)}
          className="flex-shrink-0 flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
        >
          📱 Try on phone
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          {(task.steps || []).map((step, i) => (
            <div key={i} className="bg-white rounded-lg p-3 border border-stone-200">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-stone-500">
                  Step {step.number || i + 1}
                </span>
                {step.screenName && (
                  <span className="text-xs text-stone-400">{step.screenName}</span>
                )}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    EXERCISE_TYPE_COLOR[step.exerciseType] || "bg-stone-100 text-stone-600"
                  }`}
                >
                  {EXERCISE_TYPE_LABEL[step.exerciseType] || step.exerciseType}
                </span>
              </div>
              {step.teach && (
                <p className="text-xs text-stone-600 mb-1.5">{step.teach}</p>
              )}
              <p className="text-sm font-medium text-stone-800">{step.question}</p>
              {step.exerciseType === "tap_correct" && step.options && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {step.options.map((opt, j) => (
                    <span
                      key={j}
                      className={`text-xs px-2 py-1 rounded-lg border ${
                        opt === step.correctAnswer
                          ? "bg-green-50 border-green-300 text-green-700 font-semibold"
                          : "bg-white border-stone-200 text-stone-600"
                      }`}
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              )}
              {step.exerciseType === "fill_blank" && step.acceptedAnswers && (
                <div className="mt-1.5 text-xs text-stone-500">
                  Accepted: {step.acceptedAnswers.join(", ")}
                </div>
              )}
              {step.exerciseType === "arrange_steps" && step.correctOrder && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {step.correctOrder.map((tile, j) => (
                    <span key={j} className="text-xs bg-purple-50 border border-purple-200 text-purple-700 px-2 py-0.5 rounded">
                      {j + 1}. {tile}
                    </span>
                  ))}
                </div>
              )}
              {step.exerciseType === "match_pairs" && step.pairs && (
                <div className="mt-1.5 space-y-0.5">
                  {step.pairs.map((pair, j) => (
                    <div key={j} className="text-xs text-stone-600">
                      <span className="font-medium">{pair.term}</span> → {pair.match}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {task.thinkAboutThis && (
            <div className="bg-orange-100 rounded-lg p-3 text-sm text-orange-800">
              <span className="font-semibold">Reflection:</span> {task.thinkAboutThis}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      className={`w-4 h-4 text-stone-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M19 9l-7 7-7-7" />
    </svg>
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

function ProgressBar({ pct = 0 }) {
  return (
    <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full bg-kwaxolo-green rounded-full transition-all duration-500 ease-out"
        style={{ width: `${Math.max(pct, 2)}%` }}
      />
    </div>
  );
}
