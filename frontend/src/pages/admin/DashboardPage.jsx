import { useState, useEffect } from "react";
import { getStats } from "../../lib/adminApi";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n} className="h-24 bg-stone-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Students", value: stats?.totalStudents ?? 0, color: "bg-kwaxolo-green/10 text-kwaxolo-green" },
    { label: "Teachers", value: stats?.totalTeachers ?? 0, color: "bg-kwaxolo-gold/10 text-kwaxolo-gold" },
    { label: "Schools", value: stats?.totalSchools ?? 0, color: "bg-kwaxolo-blue/10 text-kwaxolo-blue" },
    { label: "Classes", value: stats?.totalClasses ?? 0, color: "bg-kwaxolo-red/10 text-kwaxolo-red" },
    { label: "Courses", value: stats?.totalCourses ?? 0, color: "bg-purple-100 text-purple-700" },
    { label: "Completions", value: stats?.totalCompletions ?? 0, color: "bg-emerald-100 text-emerald-700" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="border border-stone-200 rounded-xl p-5">
            <div className={`text-3xl font-bold ${card.color.split(" ")[1]}`}>
              {card.value}
            </div>
            <div className="text-sm text-stone-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
