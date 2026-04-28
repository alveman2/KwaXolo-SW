import { useState, useEffect } from "react";
import { getCourse, translate } from "../lib/api.js";
import { getMyProgress, markLessonComplete } from "../lib/studentApi.js";
import { useAuth } from "../context/AuthContext";
import { useLanguage, useStrings } from "../lib/i18n.jsx";
import PhoneMockup from "./PhoneMockup.jsx";

export default function CourseDetailScreen({ courseId, onBack }) {
  const { user } = useAuth();
  const isStudent = user?.role === "student";

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lessonIndex, setLessonIndex] = useState(0);

  // Translation state
  const [translatedCourse, setTranslatedCourse] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState(null);

  // Student progress state
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [marking, setMarking] = useState(false);

  const { lang } = useLanguage();
  const t = useStrings();

  // Load course
  useEffect(() => {
    setLoading(true);
    setError(null);
    setLessonIndex(0);
    setTranslatedCourse(null);
    getCourse(courseId)
      .then(setCourse)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [courseId]);

  // Load student progress
  useEffect(() => {
    if (!isStudent) return;
    getMyProgress()
      .then((rows) => {
        const done = new Set(
          rows.filter((r) => r.course_id === courseId).map((r) => r.lesson_index)
        );
        setCompletedLessons(done);
      })
      .catch(() => {}); // progress failure is non-fatal
  }, [courseId, isStudent]);

  // Translation effect
  useEffect(() => {
    if (!course) return;

    if (lang === "en") {
      setTranslatedCourse(null);
      setTranslateError(null);
      return;
    }

    // Use pre-translated content if available (no API call needed)
    if (lang === "zu" && course.translations?.zu) {
      setTranslatedCourse({
        ...course,
        title: course.translations.zu.title,
        description: course.translations.zu.description,
        lessons: course.translations.zu.lessons,
      });
      setTranslating(false);
      return;
    }

    setTranslating(true);
    setTranslateError(null);

    const translationInput = {
      title: course.title,
      description: course.description,
      lessons: (course.lessons ?? []).map((l) => ({
        title: l.title,
        content: l.content,
        keyPoints: l.keyPoints ?? [],
      })),
    };

    translate(translationInput, "zu")
      .then((result) => {
        setTranslatedCourse({
          ...course,
          title: result.title ?? course.title,
          description: result.description ?? course.description,
          lessons: (course.lessons ?? []).map((l, i) => ({
            ...l,
            title: result.lessons?.[i]?.title ?? l.title,
            content: result.lessons?.[i]?.content ?? l.content,
            keyPoints: result.lessons?.[i]?.keyPoints ?? l.keyPoints,
          })),
        });
      })
      .catch(() => {
        setTranslateError("Translation failed — showing English.");
        setTranslatedCourse(null);
      })
      .finally(() => setTranslating(false));
  }, [course, lang]);

  async function handleMarkComplete() {
    if (completedLessons.has(lessonIndex)) return;
    setMarking(true);
    try {
      await markLessonComplete(courseId, lessonIndex);
      setCompletedLessons((prev) => new Set([...prev, lessonIndex]));
    } catch {
      // already completed is fine; other errors are silent
    } finally {
      setMarking(false);
    }
  }

  if (loading) {
    return (
      <div className="py-8 space-y-4">
        <div className="h-8 bg-stone-100 rounded-lg animate-pulse w-2/3" />
        <div className="h-4 bg-stone-100 rounded animate-pulse w-1/3" />
        <div className="h-64 bg-stone-100 rounded-2xl animate-pulse mt-6" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="py-8">
        <button onClick={onBack} className="text-sm text-stone-500 hover:text-stone-800 mb-6">
          {t.courseDetail.back}
        </button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          Could not load this course: {error ?? "Not found"}
        </div>
      </div>
    );
  }

  const displayCourse = translatedCourse ?? course;
  const lessons = displayCourse.lessons ?? [];
  const lesson = lessons[lessonIndex];
  const isFirst = lessonIndex === 0;
  const isLast = lessonIndex === lessons.length - 1;
  const isCurrentCompleted = completedLessons.has(lessonIndex);

  // For PhoneMockup index lookup
  const rawLessons = course.lessons ?? [];

  return (
    <div className="py-8">
      {/* Back */}
      <button
        onClick={onBack}
        className="text-sm text-stone-500 hover:text-stone-800 mb-6"
      >
        {t.courseDetail.back}
      </button>

      {/* Translating indicator */}
      {translating && (
        <div className="mb-4 flex items-center gap-2 text-sm text-stone-500">
          <Spinner />
          {t.courseDetail.translating}
        </div>
      )}

      {translateError && (
        <div className="mb-4 text-xs text-stone-400">{translateError}</div>
      )}

      {/* Course header */}
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-1">
          {displayCourse.title}
        </h2>
        {translatedCourse && !translating && (
          <span className="inline-block text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full mb-1">
            {t.courseDetail.aiTranslated}
          </span>
        )}
        <div className="flex items-center gap-3 text-xs text-stone-500">
          <span>{course.duration_minutes} {t.courses.minutes}</span>
          <span className="text-stone-300">·</span>
          <span>{lessons.length} {t.courses.lessonsCount}</span>
          <span className="text-stone-300">·</span>
          <span className="capitalize">{course.level}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-stone-500 mb-1.5">
          <span>
            {t.courseDetail.lesson} {lessonIndex + 1} {t.courseDetail.of} {lessons.length}
          </span>
          <span>{Math.round(((lessonIndex + 1) / lessons.length) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-kwaxolo-green rounded-full transition-all"
            style={{ width: `${((lessonIndex + 1) / lessons.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Lesson pill nav */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        {lessons.map((l, i) => (
          <button
            key={i}
            onClick={() => setLessonIndex(i)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full transition font-medium ${
              i === lessonIndex
                ? "bg-kwaxolo-green text-white"
                : isStudent && completedLessons.has(i)
                ? "bg-kwaxolo-green/20 text-kwaxolo-green hover:bg-kwaxolo-green/30"
                : i < lessonIndex
                ? "bg-stone-200 text-stone-600 hover:bg-stone-300"
                : "bg-stone-100 text-stone-500 hover:bg-stone-200"
            }`}
          >
            {isStudent && completedLessons.has(i) && i !== lessonIndex ? "✓" : i + 1}
          </button>
        ))}
      </div>

      {/* Two-column layout on desktop */}
      <div className="flex gap-10 items-start">
        {/* Left column: lesson content + navigation */}
        <div className="flex-1 min-w-0">
          {lesson && (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-6">
              <h3 className="text-xl font-bold text-stone-900 mb-4">
                {lesson.title}
              </h3>

              <div className="space-y-4 mb-6">
                {lesson.content.split("\n\n").map((para, i) => (
                  <p key={i} className="text-stone-700 leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>

              {lesson.keyPoints && lesson.keyPoints.length > 0 && (
                <div className="bg-kwaxolo-green/5 border border-kwaxolo-green/20 rounded-xl p-4">
                  <div className="text-xs uppercase tracking-wide text-kwaxolo-green font-bold mb-3">
                    {t.courseDetail.keyPoints}
                  </div>
                  <ul className="space-y-2">
                    {lesson.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
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

          {/* Navigation */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setLessonIndex((i) => i - 1)}
              disabled={isFirst}
              className="flex-1 sm:flex-none bg-white hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed text-stone-700 font-medium px-6 py-3 rounded-xl border border-stone-300 transition"
            >
              {t.courseDetail.previousLesson}
            </button>

            {/* Student mark complete */}
            {isStudent && !isCurrentCompleted && (
              <button
                onClick={handleMarkComplete}
                disabled={marking}
                className="flex-1 sm:flex-none bg-kwaxolo-gold hover:bg-kwaxolo-gold/90 disabled:opacity-50 text-stone-900 font-semibold px-6 py-3 rounded-xl transition"
              >
                {marking ? t.courseDetail.marking : t.courseDetail.markComplete}
              </button>
            )}

            {isStudent && isCurrentCompleted && (
              <span className="flex items-center px-4 py-3 text-sm text-kwaxolo-green font-medium">
                {t.courseDetail.lessonCompleted}
              </span>
            )}

            {isLast ? (
              <button
                onClick={onBack}
                className="flex-1 sm:flex-none bg-kwaxolo-green hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-xl transition"
              >
                {t.courseDetail.finished}
              </button>
            ) : (
              <button
                onClick={() => setLessonIndex((i) => i + 1)}
                className="flex-1 sm:flex-none bg-kwaxolo-green hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-xl transition"
              >
                {t.courseDetail.nextLesson}
              </button>
            )}
          </div>
        </div>

        {/* Right column: phone mockup — desktop only */}
        <div className="hidden lg:block sticky top-8 flex-shrink-0">
          <PhoneMockup
            course={displayCourse}
            lesson={lesson}
            rawLesson={rawLessons[lessonIndex]}
          />
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
