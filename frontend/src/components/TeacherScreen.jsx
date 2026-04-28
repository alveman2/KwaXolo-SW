import { useState } from "react";
import { generateCourse, createCourse } from "../lib/api.js";
import { useStrings } from "../lib/i18n.jsx";

const GRADE_OPTIONS_VALUES = [
  { value: "", key: "mixedGrade" },
  { value: "Grade 8", label: "Grade 8" },
  { value: "Grade 9", label: "Grade 9" },
  { value: "Grade 10", label: "Grade 10" },
  { value: "Grade 11", label: "Grade 11" },
  { value: "Grade 12", label: "Grade 12" },
];

const EXAMPLE_PROMPTS = [
  "My Grade 10 students don't know how to write a CV",
  "Students need basic budgeting skills before they start side businesses",
  "I want to teach online safety because students are getting scammed on WhatsApp",
  "Many students don't understand how to apply for SASSA grants",
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
    try {
      const course = await generateCourse(teacherInput.trim(), gradeLevel || undefined);
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
            <div className="text-xs text-stone-500 mb-2">Or try one of these:</div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setTeacherInput(p)}
                  disabled={generating}
                  className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-full transition disabled:opacity-50"
                >
                  {p}
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
            <p className="mt-2 text-xs text-stone-500">
              This takes about 15–20 seconds. The AI is writing real lesson
              content — not just titles.
            </p>
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
        <div className="px-5 pb-5 border-t border-stone-100">
          <div className="pt-4 space-y-3 mb-4">
            {lesson.content.split("\n\n").map((para, i) => (
              <p key={i} className="text-stone-700 text-sm leading-relaxed">
                {para}
              </p>
            ))}
          </div>

          {lesson.keyPoints && lesson.keyPoints.length > 0 && (
            <div className="bg-kwaxolo-green/5 border border-kwaxolo-green/20 rounded-xl p-4">
              <div className="text-xs uppercase tracking-wide text-kwaxolo-green font-bold mb-2">
                Key points
              </div>
              <ul className="space-y-1.5">
                {lesson.keyPoints.map((point, j) => (
                  <li
                    key={j}
                    className="flex items-start gap-2 text-sm text-stone-700"
                  >
                    <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-kwaxolo-green text-white text-xs flex items-center justify-center font-bold">
                      ✓
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
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
