import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import LandingScreen from "./components/LandingScreen.jsx";
import ObservationScreen from "./components/ObservationScreen.jsx";
import OpportunityScreen from "./components/OpportunityScreen.jsx";
import CoursesScreen from "./components/CoursesScreen.jsx";
import CourseDetailScreen from "./components/CourseDetailScreen.jsx";
import TeacherScreen from "./components/TeacherScreen.jsx";
import TeacherClassesScreen from "./components/TeacherClassesScreen.jsx";
import JoinClassScreen from "./components/JoinClassScreen.jsx";
import { useLanguage, useStrings } from "./lib/i18n.jsx";

export default function App() {
  const { user, logout } = useAuth();
  const isStudent = user?.role === "student";
  const isTeacher = user?.role === "teacher";

  // Default view depends on role: students start on Courses, teachers on opportunity
  const [view, setView] = useState(isStudent ? "courses" : "opportunity");
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  // Opportunity flow sub-state
  const [step, setStep] = useState("landing");
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
    if (isStudent) {
      goToCourses();
    } else {
      goToOpportunity();
      resetOpportunity();
    }
  }

  function openCourse(id) {
    setSelectedCourseId(id);
    setView("course-detail");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className={`mx-auto px-6 py-4 flex items-center justify-between ${view === "opportunity" && step === "opportunity" ? "max-w-6xl" : "max-w-3xl"}`}>
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

          {/* Navigation + Language toggle + Sign out */}
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1">
              {/* Both roles */}
              <NavButton
                active={view === "opportunity"}
                onClick={goToOpportunity}
              >
                {t.nav.findOpportunity}
              </NavButton>
              <NavButton
                active={view === "courses" || view === "course-detail"}
                onClick={goToCourses}
              >
                {t.nav.courses}
              </NavButton>

              {/* Teacher only */}
              {isTeacher && (
                <>
                  <NavButton
                    active={view === "teacher"}
                    onClick={() => setView("teacher")}
                  >
                    {t.nav.teacher}
                  </NavButton>
                  <NavButton
                    active={view === "my-classes"}
                    onClick={() => setView("my-classes")}
                  >
                    {t.nav.myClasses}
                  </NavButton>
                </>
              )}

              {/* Student only */}
              {isStudent && (
                <NavButton
                  active={view === "join-class"}
                  onClick={() => setView("join-class")}
                >
                  {t.nav.joinClass}
                </NavButton>
              )}
            </nav>

            {/* Language toggle */}
            <div
              className="flex items-center bg-stone-100 rounded-full p-0.5"
              style={{ width: 80 }}
            >
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

            {/* Sign out */}
            {user && (
              <button
                onClick={logout}
                className="ml-1 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition"
              >
                {t.nav.signOut}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className={`flex-1 w-full mx-auto px-6 py-8 ${view === "opportunity" && step === "opportunity" ? "max-w-6xl" : "max-w-3xl"}`}>
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

        {/* ── Teacher: AI course generator ── */}
        {view === "teacher" && isTeacher && (
          <TeacherScreen onCourseSaved={openCourse} />
        )}

        {/* ── Teacher: class management ── */}
        {view === "my-classes" && isTeacher && (
          <TeacherClassesScreen />
        )}

        {/* ── Student: join a class ── */}
        {view === "join-class" && isStudent && (
          <JoinClassScreen onViewCourses={goToCourses} />
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
