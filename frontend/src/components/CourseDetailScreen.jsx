import { useState, useEffect } from "react";
import { getCourse } from "../lib/api.js";
import PhoneMockup from "./PhoneMockup.jsx";

export default function CourseDetailScreen({ courseId, onBack }) {
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lessonIndex, setLessonIndex] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setLessonIndex(0);
    getCourse(courseId)
      .then(setCourse)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [courseId]);

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
          ← Back to courses
        </button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          Could not load this course: {error ?? "Not found"}
        </div>
      </div>
    );
  }

  const lessons = course.lessons ?? [];
  const lesson = lessons[lessonIndex];
  const isFirst = lessonIndex === 0;
  const isLast = lessonIndex === lessons.length - 1;

  return (
    <div className="py-8">
      {/* Back */}
      <button
        onClick={onBack}
        className="text-sm text-stone-500 hover:text-stone-800 mb-6"
      >
        ← Back to courses
      </button>

      {/* Course header */}
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-1">
          {course.title}
        </h2>
        <div className="flex items-center gap-3 text-xs text-stone-500">
          <span>{course.duration_minutes} min</span>
          <span className="text-stone-300">·</span>
          <span>{lessons.length} lessons</span>
          <span className="text-stone-300">·</span>
          <span className="capitalize">{course.level}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-stone-500 mb-1.5">
          <span>
            Lesson {lessonIndex + 1} of {lessons.length}
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
                : i < lessonIndex
                ? "bg-stone-200 text-stone-600 hover:bg-stone-300"
                : "bg-stone-100 text-stone-500 hover:bg-stone-200"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Two-column layout on desktop: lesson content left, phone mockup right */}
      <div className="flex gap-10 items-start">
        {/* Left column: lesson content + navigation */}
        <div className="flex-1 min-w-0">
          {/* Lesson content */}
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
                    Key points
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
          <div className="flex gap-3">
            <button
              onClick={() => setLessonIndex((i) => i - 1)}
              disabled={isFirst}
              className="flex-1 sm:flex-none bg-white hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed text-stone-700 font-medium px-6 py-3 rounded-xl border border-stone-300 transition"
            >
              ← Previous
            </button>

            {isLast ? (
              <button
                onClick={onBack}
                className="flex-1 sm:flex-none bg-kwaxolo-green hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-xl transition"
              >
                Done — back to courses
              </button>
            ) : (
              <button
                onClick={() => setLessonIndex((i) => i + 1)}
                className="flex-1 sm:flex-none bg-kwaxolo-green hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-xl transition"
              >
                Next lesson →
              </button>
            )}
          </div>
        </div>

        {/* Right column: phone mockup — desktop only */}
        <div className="hidden lg:block sticky top-8 flex-shrink-0">
          <PhoneMockup course={course} lesson={lesson} />
        </div>
      </div>
    </div>
  );
}
