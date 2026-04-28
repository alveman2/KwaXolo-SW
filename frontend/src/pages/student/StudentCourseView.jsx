import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMyFeed, markLessonComplete } from "../../lib/studentApi";

export default function StudentCourseView() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    setLoading(true);
    getMyFeed()
      .then((feed) => {
        const found = feed.find((c) => c.id === courseId);
        if (!found) throw new Error("Course not found in your feed");
        setCourse(found);
        const done = new Set((found.progress || []).map((p) => p.lesson_index));
        setCompletedLessons(done);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [courseId]);

  async function handleMarkComplete() {
    setMarking(true);
    try {
      await markLessonComplete(courseId, lessonIndex);
      setCompletedLessons((prev) => new Set([...prev, lessonIndex]));
    } catch (err) {
      // Already completed is fine
    } finally {
      setMarking(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-stone-100 rounded-lg animate-pulse w-2/3" />
        <div className="h-4 bg-stone-100 rounded animate-pulse w-1/3" />
        <div className="h-64 bg-stone-100 rounded-2xl animate-pulse mt-6" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div>
        <button onClick={() => navigate("/app/feed")} className="text-sm text-stone-500 hover:text-stone-800 mb-6">
          ← Back to feed
        </button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          {error ?? "Not found"}
        </div>
      </div>
    );
  }

  const lessons = course.lessons ?? [];
  const lesson = lessons[lessonIndex];
  const isFirst = lessonIndex === 0;
  const isLast = lessonIndex === lessons.length - 1;
  const isCurrentCompleted = completedLessons.has(lessonIndex);
  const totalCompleted = completedLessons.size;
  const pct = lessons.length > 0 ? Math.round((totalCompleted / lessons.length) * 100) : 0;

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => navigate("/app/feed")}
        className="text-sm text-stone-500 hover:text-stone-800 mb-6"
      >
        ← Back to feed
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
          <span>{totalCompleted} completed</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-stone-500 mb-1.5">
          <span>Lesson {lessonIndex + 1} of {lessons.length}</span>
          <span>{pct}% complete</span>
        </div>
        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-kwaxolo-green rounded-full transition-all"
            style={{ width: `${pct}%` }}
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
                : completedLessons.has(i)
                ? "bg-kwaxolo-green/20 text-kwaxolo-green hover:bg-kwaxolo-green/30"
                : "bg-stone-100 text-stone-500 hover:bg-stone-200"
            }`}
          >
            {completedLessons.has(i) && i !== lessonIndex ? "✓" : i + 1}
          </button>
        ))}
      </div>

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

      {/* Navigation + mark complete */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setLessonIndex((i) => i - 1)}
          disabled={isFirst}
          className="bg-white hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed text-stone-700 font-medium px-6 py-3 rounded-xl border border-stone-300 transition"
        >
          ← Previous
        </button>

        {!isCurrentCompleted && (
          <button
            onClick={handleMarkComplete}
            disabled={marking}
            className="bg-kwaxolo-gold hover:bg-kwaxolo-gold/90 text-stone-900 font-semibold px-6 py-3 rounded-xl transition disabled:opacity-50"
          >
            {marking ? "Saving..." : "Mark complete ✓"}
          </button>
        )}

        {isCurrentCompleted && (
          <span className="flex items-center px-4 py-3 text-sm text-kwaxolo-green font-medium">
            ✓ Completed
          </span>
        )}

        {isLast ? (
          <button
            onClick={() => navigate("/app/feed")}
            className="bg-kwaxolo-green hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-xl transition"
          >
            Done — back to feed
          </button>
        ) : (
          <button
            onClick={() => setLessonIndex((i) => i + 1)}
            className="bg-kwaxolo-green hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-xl transition"
          >
            Next lesson →
          </button>
        )}
      </div>
    </div>
  );
}
