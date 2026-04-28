import { useState } from "react";
import LandingScreen from "./components/LandingScreen.jsx";
import ObservationScreen from "./components/ObservationScreen.jsx";
import OpportunityScreen from "./components/OpportunityScreen.jsx";
import CoursesScreen from "./components/CoursesScreen.jsx";
import CourseDetailScreen from "./components/CourseDetailScreen.jsx";
import TeacherScreen from "./components/TeacherScreen.jsx";
import { useLanguage, useStrings } from "./lib/i18n.jsx";

export default function App() {
  // Top-level view: which section is active
  const [view, setView] = useState("opportunity"); // "opportunity" | "courses" | "course-detail" | "teacher"
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  // Opportunity flow sub-state
  const [step, setStep] = useState("landing"); // "landing" | "observation" | "opportunity"
  const [observation, setObservation] = useState("");
  const [opportunity, setOpportunity] = useState(null);

  const { lang, setLang } = useLanguage();
  const t = useStrings();

  function goToOpportunity() {
    setView("opportunity");
  }

  function goToCourses() {
    setView("courses");
    setSelectedCourseId(null);
  }

  function resetOpportunity() {
    setStep("landing");
    setObservation("");
    setOpportunity(null);
  }

  function handleLogoClick() {
    goToOpportunity();
    resetOpportunity();
  }

  function openCourse(id) {
    setSelectedCourseId(id);
    setView("course-detail");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-3 group"
            aria-label={t.header.restart}
          >
            <div className="w-9 h-9 grid grid-cols-2 gap-0.5">
              <div className="bg-kwaxolo-gold rounded-sm" />
              <div className="bg-kwaxolo-red rounded-sm" />
              <div className="bg-kwaxolo-blue rounded-sm" />
              <div className="bg-kwaxolo-green rounded-sm" />
            </div>
            <div>
              <div className="font-bold text-lg leading-tight text-stone-900">
                KwaXolo Bridge
              </div>
              <div className="text-xs text-stone-500 leading-tight">
                Opportunity engine
              </div>
            </div>
          </button>

          {/* Navigation + Language toggle */}
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-1">
              <NavButton active={view === "opportunity"} onClick={goToOpportunity}>
                {t.nav.findOpportunity}
              </NavButton>
              <NavButton active={view === "courses" || view === "course-detail"} onClick={goToCourses}>
                {t.nav.courses}
              </NavButton>
              <NavButton active={view === "teacher"} onClick={() => setView("teacher")}>
                {t.nav.teacher}
              </NavButton>
            </nav>

            {/* Language toggle */}
            <div className="flex items-center bg-stone-100 rounded-full p-0.5" style={{ width: 80 }}>
              <button
                onClick={() => setLang("en")}
                className={`flex-1 text-xs font-semibold py-1 rounded-full transition ${
                  lang === "en"
                    ? "bg-kwaxolo-green text-white"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang("zu")}
                className={`flex-1 text-xs font-semibold py-1 rounded-full transition ${
                  lang === "zu"
                    ? "bg-kwaxolo-green text-white"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Zu
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-8">
        {/* ── Opportunity flow ── */}
        {view === "opportunity" && step === "landing" && (
          <LandingScreen onStart={() => setStep("observation")} />
        )}
        {view === "opportunity" && step === "observation" && (
          <ObservationScreen
            initialValue={observation}
            onSubmit={(text, result) => {
              setObservation(text);
              setOpportunity(result);
              setStep("opportunity");
            }}
            onBack={() => setStep("landing")}
          />
        )}
        {view === "opportunity" && step === "opportunity" && (
          <OpportunityScreen
            observation={observation}
            opportunity={opportunity}
            onRestart={resetOpportunity}
          />
        )}

        {/* ── Courses list ── */}
        {view === "courses" && (
          <CoursesScreen onSelectCourse={openCourse} />
        )}

        {/* ── Course detail ── */}
        {view === "course-detail" && selectedCourseId && (
          <CourseDetailScreen
            courseId={selectedCourseId}
            onBack={goToCourses}
          />
        )}

        {/* ── Teacher mode ── */}
        {view === "teacher" && (
          <TeacherScreen onCourseSaved={openCourse} />
        )}
      </main>

      <footer className="border-t border-stone-200 py-4 text-center text-xs text-stone-500">
        Built for the KwaXolo Impact Challenge · April 2026
      </footer>
    </div>
  );
}

function NavButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
        active
          ? "bg-stone-100 text-stone-900"
          : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
      }`}
    >
      {children}
    </button>
  );
}
