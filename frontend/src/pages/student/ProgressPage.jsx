import { useState, useEffect } from "react";
import { getMyProgress, getMyFeed } from "../../lib/studentApi";

export default function ProgressPage() {
  const [progress, setProgress] = useState([]);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMyProgress(), getMyFeed()])
      .then(([p, f]) => {
        setProgress(p);
        setFeed(f);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-20 bg-stone-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  // Build per-course summary
  const courseSummaries = feed.map((course) => {
    const totalLessons = course.lessons?.length ?? 0;
    const completed = course.progress?.length ?? 0;
    return {
      id: course.id,
      title: course.title,
      totalLessons,
      completed,
      pct: totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0,
    };
  });

  const totalCompleted = progress.length;
  const totalLessons = feed.reduce((sum, c) => sum + (c.lessons?.length ?? 0), 0);
  const overallPct = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-1">
        My Progress
      </h2>
      <p className="text-stone-600 mb-6">
        Track your learning journey.
      </p>

      {/* Overall stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Courses" value={feed.length} />
        <StatCard label="Lessons done" value={totalCompleted} />
        <StatCard label="Overall" value={`${overallPct}%`} />
      </div>

      {courseSummaries.length === 0 && (
        <div className="text-center py-12 text-stone-500 text-sm">
          No courses yet. Join a class to get started.
        </div>
      )}

      {/* Per-course progress */}
      <div className="space-y-3">
        {courseSummaries.map((c) => (
          <div
            key={c.id}
            className="border border-stone-200 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-stone-900 text-sm truncate pr-4">
                {c.title}
              </h3>
              <span className={`text-xs font-medium ${c.pct === 100 ? "text-kwaxolo-green" : "text-stone-500"}`}>
                {c.completed}/{c.totalLessons}
              </span>
            </div>
            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-kwaxolo-green rounded-full transition-all"
                style={{ width: `${c.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="border border-stone-200 rounded-xl p-4 text-center">
      <div className="text-2xl font-bold text-stone-900">{value}</div>
      <div className="text-xs text-stone-500 mt-1">{label}</div>
    </div>
  );
}
