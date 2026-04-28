import { useState, useEffect } from "react";
import { listCourses } from "../lib/api.js";
import { getMyFeed } from "../lib/studentApi.js";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../lib/i18n.jsx";

export default function CoursesScreen({ onSelectCourse }) {
  const { user } = useAuth();
  const isStudent = user?.role === "student";

  const t = useStrings();

  // Students start on their feed; everyone else starts on phase1
  const [activeCategory, setActiveCategory] = useState(isStudent ? "feed" : "phase1");
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const TABS = [
    ...(isStudent ? [{ label: t.courses.tabs.myFeed, category: "feed" }] : []),
    { label: t.courses.tabs.phase1, category: "phase1" },
    { label: t.courses.tabs.phase2, category: "phase2" },
    { label: t.courses.tabs.business, category: "business" },
  ];

  const LEVEL_LABEL = {
    beginner: t.courses.beginner,
    intermediate: t.courses.intermediate,
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetch = activeCategory === "feed"
      ? getMyFeed()
      : listCourses(activeCategory);

    fetch
      .then(setCourses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  return (
    <div className="py-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-1">
        {t.nav.courses}
      </h2>
      <p className="text-stone-600 mb-6">
        Free lessons to build practical digital and business skills.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-stone-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.category}
            onClick={() => setActiveCategory(tab.category)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeCategory === tab.category
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-stone-100 rounded-2xl h-44 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          Could not load courses: {error}
        </div>
      )}

      {!loading && !error && courses.length === 0 && (
        <div className="text-center py-16 text-stone-500">
          {activeCategory === "feed" ? t.courses.myFeedEmpty : t.courses.noCourses}
        </div>
      )}

      {!loading && !error && courses.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              levelLabel={LEVEL_LABEL}
              minutesLabel={t.courses.minutes}
              showProgress={activeCategory === "feed"}
              onClick={() => onSelectCourse(course.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course, levelLabel, minutesLabel, showProgress, onClick }) {
  const totalLessons = course.lessons?.length ?? 0;
  const completedLessons = course.progress?.length ?? 0;
  const pct = showProgress && totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : null;

  return (
    <button
      onClick={onClick}
      className="text-left bg-white border border-stone-200 hover:border-kwaxolo-green hover:shadow-sm rounded-2xl p-5 transition group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-stone-900 text-base leading-snug group-hover:text-kwaxolo-green transition">
          {course.title}
        </h3>
        {pct !== null ? (
          <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
            pct === 100
              ? "bg-kwaxolo-green/10 text-kwaxolo-green"
              : "bg-stone-100 text-stone-600"
          }`}>
            {pct === 100 ? "Done" : `${pct}%`}
          </span>
        ) : (
          <span className="flex-shrink-0 text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full font-medium">
            {levelLabel[course.level] ?? course.level}
          </span>
        )}
      </div>
      <p className="text-stone-600 text-sm leading-relaxed mb-4 line-clamp-2">
        {course.description}
      </p>

      {/* Progress bar for feed courses */}
      {pct !== null && (
        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-kwaxolo-green rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-stone-500">
        <span className="flex items-center gap-1">
          <ClockIcon />
          {course.duration_minutes} {minutesLabel}
        </span>
        {showProgress && course.class_name && (
          <>
            <span className="text-stone-300">·</span>
            <span>{course.class_name}</span>
          </>
        )}
        {pct === null && (
          <>
            <span className="text-stone-300">·</span>
            <span className="text-kwaxolo-green font-medium">Start →</span>
          </>
        )}
      </div>
    </button>
  );
}

function ClockIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
