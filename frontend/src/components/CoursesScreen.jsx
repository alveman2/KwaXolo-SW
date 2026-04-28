import { useState, useEffect } from "react";
import { listCourses } from "../lib/api.js";

const TABS = [
  { label: "Phase 1: Getting started", category: "phase1" },
  { label: "Phase 2: Productivity", category: "phase2" },
  { label: "Business basics", category: "business" },
];

const LEVEL_LABEL = { beginner: "Beginner", intermediate: "Intermediate" };

export default function CoursesScreen({ onSelectCourse }) {
  const [activeCategory, setActiveCategory] = useState("phase1");
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listCourses(activeCategory)
      .then(setCourses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  return (
    <div className="py-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-1">
        Courses
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
            <div
              key={n}
              className="bg-stone-100 rounded-2xl h-44 animate-pulse"
            />
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
          No courses in this category yet.
        </div>
      )}

      {!loading && !error && courses.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onClick={() => onSelectCourse(course.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white border border-stone-200 hover:border-kwaxolo-green hover:shadow-sm rounded-2xl p-5 transition group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-stone-900 text-base leading-snug group-hover:text-kwaxolo-green transition">
          {course.title}
        </h3>
        <span className="flex-shrink-0 text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full font-medium">
          {LEVEL_LABEL[course.level] ?? course.level}
        </span>
      </div>
      <p className="text-stone-600 text-sm leading-relaxed mb-4 line-clamp-2">
        {course.description}
      </p>
      <div className="flex items-center gap-3 text-xs text-stone-500">
        <span className="flex items-center gap-1">
          <ClockIcon />
          {course.duration_minutes} min
        </span>
        <span className="text-stone-300">·</span>
        <span className="text-kwaxolo-green font-medium">Start →</span>
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
