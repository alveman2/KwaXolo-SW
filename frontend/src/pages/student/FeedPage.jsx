import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMyFeed } from "../../lib/studentApi";

export default function FeedPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getMyFeed()
      .then(setCourses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-1">
        My Feed
      </h2>
      <p className="text-stone-600 mb-6">
        Courses published by your teachers.
      </p>

      {loading && (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-stone-100 rounded-2xl h-44 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          {error}
        </div>
      )}

      {!loading && !error && courses.length === 0 && (
        <div className="text-center py-16">
          <p className="text-stone-500 mb-2">No courses yet.</p>
          <p className="text-sm text-stone-400">
            Join a class to see courses from your teachers.
          </p>
        </div>
      )}

      {!loading && !error && courses.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {courses.map((course) => (
            <FeedCourseCard
              key={course.id}
              course={course}
              onClick={() => navigate(`/app/course/${course.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedCourseCard({ course, onClick }) {
  const totalLessons = course.lessons?.length ?? 0;
  const completedLessons = course.progress?.length ?? 0;
  const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className="text-left bg-white border border-stone-200 hover:border-kwaxolo-green hover:shadow-sm rounded-2xl p-5 transition group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-stone-900 text-base leading-snug group-hover:text-kwaxolo-green transition">
          {course.title}
        </h3>
        {pct === 100 ? (
          <span className="flex-shrink-0 text-xs bg-kwaxolo-green/10 text-kwaxolo-green px-2.5 py-1 rounded-full font-medium">
            Done
          </span>
        ) : (
          <span className="flex-shrink-0 text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full font-medium">
            {pct}%
          </span>
        )}
      </div>
      <p className="text-stone-600 text-sm leading-relaxed mb-4 line-clamp-2">
        {course.description}
      </p>
      {/* Progress bar */}
      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-kwaxolo-green rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-stone-500">
        <span>{completedLessons}/{totalLessons} lessons</span>
        <span className="text-stone-300">·</span>
        <span className="flex items-center gap-1">
          <ClockIcon />
          {course.duration_minutes} min
        </span>
        {course.class_name && (
          <>
            <span className="text-stone-300">·</span>
            <span>{course.class_name}</span>
          </>
        )}
      </div>
    </button>
  );
}

function ClockIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
