import { createContext, useContext, useState } from "react";

export const STRINGS = {
  en: {
    nav: {
      findOpportunity: "Find opportunity",
      courses: "Courses",
      teacher: "Teacher",
      myClasses: "My classes",
      joinClass: "Join a class",
      signOut: "Sign out",
    },
    landing: {
      headline1: "See the opportunity",
      headline2: "around you.",
      description:
        "Tell us something you have noticed in your community — a problem, a frustration, something missing. We will help you see if it is also a business opportunity.",
      startButton: "Start →",
      takesAbout: "Takes about 2 minutes.",
      exampleTransport: "A transport problem",
      exampleTransportText: "People travel hours to repair phones.",
      exampleScaling: "A scaling question",
      exampleScalingText: "My bakery is full every day. What now?",
      exampleGap: "A gap in services",
      exampleGapText: "Students have no place to print homework.",
    },
    observation: {
      back: "← Back",
      heading: "What have you noticed?",
      description:
        "Describe one specific thing — a problem, a frustration, or something missing in your community. Be concrete.",
      placeholder:
        "For example: 'When my friend's phone screen broke, he had to take the bus to Port Shepstone and stay overnight to get it fixed.'",
      orTry: "Or try one of these:",
      findButton: "Find the opportunity →",
      finding: "Finding opportunities...",
    },
    courses: {
      tabs: {
        myFeed: "My class courses",
        phase1: "Phase 1: Getting started",
        phase2: "Phase 2: Productivity",
        business: "Business basics",
      },
      lessonsCount: "lessons",
      minutes: "min",
      beginner: "Beginner",
      intermediate: "Intermediate",
      noCourses: "No courses in this category yet.",
      myFeedEmpty: "Join a class to see courses from your teachers.",
      loading: "Loading courses...",
    },
    courseDetail: {
      back: "← Back to courses",
      lesson: "Lesson",
      of: "of",
      keyPoints: "Key points",
      previousLesson: "← Previous",
      nextLesson: "Next →",
      finished: "Done — back to courses",
      loading: "Loading course...",
      translating: "Translating to isiZulu...",
      aiTranslated: "AI-translated",
      comingSoonMobile: "Coming soon to iOS and Android",
      markComplete: "Mark complete ✓",
      marking: "Saving...",
      lessonCompleted: "✓ Completed",
    },
    teacher: {
      heading: "Generate a new course",
      description:
        "What do your students need to learn? Be specific — describe what they're struggling with or what knowledge gap you've noticed.",
      gradeLevel: "Grade level",
      mixedGrade: "Mixed / Any grade",
      generate: "Generate course",
      generating: "Generating... (~15s)",
      regenerate: "Regenerate",
      editInput: "Edit input",
      save: "Save to course library",
      saving: "Saving...",
    },
    phone: {
      coursesNav: "Courses",
      opportunityNav: "Opportunity",
      profileNav: "Profile",
    },
    header: {
      restart: "Home",
    },
    joinClass: {
      heading: "Join a class",
      subhead: "Enter the code your teacher gave you (format: ABCD-123).",
      inputPlaceholder: "ABCD-123",
      submitButton: "Join class",
      joining: "Joining...",
      successJoined: "You've joined:",
      taughtBy: "Taught by:",
      myClasses: "My classes",
      viewCourses: "View courses →",
      noClasses: "You haven't joined any classes yet.",
    },
    teacherClasses: {
      noPublishedCourses: "No courses published to this class yet.",
      removeButton: "Remove",
      publishedSuccess: "Course published ✓",
      removeConfirm: "Remove this course from the class?",
    },
  },

  zu: {
    nav: {
      findOpportunity: "Thola ithuba",
      courses: "Izifundo",
      teacher: "Uthisha",
      myClasses: "Izigaba zami",
      joinClass: "Joyina isigaba",
      signOut: "Phuma",
    },
    landing: {
      headline1: "Bona ithuba",
      headline2: "elikuzungezile.",
      description:
        "Sishela into oyibonile emphakathini — inkinga, ukuphoxeka, noma into eswele. Sizokunisela ukuthi ingaba nethuba loshishilezi.",
      startButton: "Qala →",
      takesAbout: "Kuthatha imizuzu eyi-2 nje.",
      exampleTransport: "Inkinga yokuthutha",
      exampleTransportText: "Abantu bahambe amahora ukuyolungisa izingcingo.",
      exampleScaling: "Umbuzo wokukhula",
      exampleScalingText: "Ibhekhari lami ligcwele nsuku zonke. Ngenzeni manje?",
      exampleGap: "Umsila wezinsizakalo",
      exampleGapText: "Abafundi abanandawo yokuphrinta imisebenzi.",
    },
    observation: {
      back: "← Emuva",
      heading: "Uboneni?",
      description:
        "Chaza into eyodwa — inkinga, ukuphoxeka, noma into eswele emphakathini. Yiba nokuqondile.",
      placeholder:
        "Isibonelo: 'Lapho ingcingo yomngane wami yaphuka, kwadingeka athathe ibhasi eya ePort Shepstone alale khona ukuyolungisa.'",
      orTry: "Noma zama enye yalezi:",
      findButton: "Thola ithuba →",
      finding: "Kuthola amathuba...",
    },
    courses: {
      tabs: {
        myFeed: "Izifundo zesigaba sami",
        phase1: "Phase 1: Ukuqala",
        phase2: "Phase 2: Ukukhiqiza",
        business: "Izisekelo zoshishilezi",
      },
      lessonsCount: "izifundo",
      minutes: "min",
      beginner: "Umqalisi",
      intermediate: "Phakathi",
      noCourses: "Awekho izifundo kule ndawo njengamanje.",
      myFeedEmpty: "Joyina isigaba ukuze ubone izifundo zothisha wakho.",
      loading: "Iyalayisha izifundo...",
    },
    courseDetail: {
      back: "← Emuva kwezifundo",
      lesson: "Isifundo",
      of: "kwezi",
      keyPoints: "Amaphuzu abalulekile",
      previousLesson: "← Emuva",
      nextLesson: "Okulandelayo →",
      finished: "Qedile — emuva kwezifundo",
      loading: "Iyalayisha isifundo...",
      translating: "Iyahumusha ngesiZulu...",
      aiTranslated: "Kuhunyushwe nge-AI",
      comingSoonMobile: "Kuzofika ku-iOS naku-Android",
      markComplete: "Phawula njengokuqediwe ✓",
      marking: "Kuyagcina...",
      lessonCompleted: "✓ Kuqedwe",
    },
    teacher: {
      heading: "Khipha isifundo esisha",
      description:
        "Abafundi bakho badinga ukufundani? Yiba nokuqondile — chaza izinto abasabalele nazo noma igebe lokwazi olikubonile.",
      gradeLevel: "Izinga lebanga",
      mixedGrade: "Ixube / Noma ibanga lini",
      generate: "Khipha isifundo",
      generating: "Iyakhipha... (~15s)",
      regenerate: "Khipha futhi",
      editInput: "Hlela okufakiwe",
      save: "Gcela kulayibrari yezifundo",
      saving: "Iyagcina...",
    },
    phone: {
      coursesNav: "Izifundo",
      opportunityNav: "Ithuba",
      profileNav: "Iphrofayili",
    },
    header: {
      restart: "Ikhaya",
    },
    joinClass: {
      heading: "Joyina isigaba",
      subhead: "Faka ikhodi uthisha akupha yona (isimo: ABCD-123).",
      inputPlaceholder: "ABCD-123",
      submitButton: "Joyina isigaba",
      joining: "Iyajoyina...",
      successJoined: "Ujoyinile:",
      taughtBy: "Kufundiswa ngu:",
      myClasses: "Izigaba zami",
      viewCourses: "Bona izifundo →",
      noClasses: "Awukajoyini izigaba naziphi.",
    },
    teacherClasses: {
      noPublishedCourses: "Awekho izifundo ezikhishiwe kule sigaba.",
      removeButton: "Susa",
      publishedSuccess: "Isifundo sikhishiwe ✓",
      removeConfirm: "Susa le isifundo emagabeni?",
    },
  },
};

const LanguageContext = createContext({ lang: "en", setLang: () => {} });

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("en");
  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useStrings() {
  const { lang } = useLanguage();
  return STRINGS[lang];
}
