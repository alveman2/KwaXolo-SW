// backend/validation.js
// Validation functions run on generated output BEFORE returning to frontend.

const KNOWN_KZN_ENTITIES = [
  "msenti", "seda", "1lt bakery", "inkify",
  "hlobisile pearl studios", "victor jaca", "dolly dlezi",
  "caleb phehlukwayo", "chief inkosi xolo",
  "thabo shude", "samke jaca", "ntokozo gwacela",
  "mtn mobile money", "mtn momo", "capitec",
  "port shepstone", "kwazulu-natal", "kwaxolo",
  "fnb ewallet", "whatsapp",
];

const BANNED_WORDS = [
  "value proposition", "roi", "b2b", "b2c", "pivot",
  "scalable", "synergy", "leverage", "onboarding",
  "stakeholder", "kpi", "demographics", "monetise", "monetize",
  "market segmentation", "customer acquisition",
  "operational efficiency", "disrupt",
];

const EXERCISE_TYPES = {
  tap_correct: { required: ["question", "options", "correctAnswer", "feedbackCorrect", "feedbackWrong"] },
  fill_blank: { required: ["question", "acceptedAnswers", "feedbackCorrect", "feedbackWrong"] },
  arrange_steps: { required: ["question", "tiles", "correctOrder", "feedbackCorrect", "feedbackWrong"] },
  match_pairs: { required: ["question", "pairs", "feedbackCorrect", "feedbackWrong"] },
  do_and_confirm: { required: ["question", "instruction", "visibleResult", "options", "correctAnswer", "feedbackCorrect", "feedbackWrong"] },
};

export function validateLocalGrounding(text) {
  if (!text) return { pass: false, errors: ["No text to check"] };
  const lower = text.toLowerCase();
  const found = KNOWN_KZN_ENTITIES.filter((e) => lower.includes(e));
  const pass = found.length >= 1;
  return {
    pass,
    found,
    errors: pass ? [] : ["No KZN local reference found in content"],
  };
}

export function validateLanguage(text) {
  if (!text) return { pass: true, errors: [], found: [] };
  const lower = text.toLowerCase();
  const found = BANNED_WORDS.filter((w) => lower.includes(w));
  return {
    pass: found.length === 0,
    found,
    errors: found.map((w) => `Banned word found: "${w}"`),
  };
}

export function validateExerciseFields(step) {
  const errors = [];
  if (!step || !step.exerciseType) {
    return { pass: false, errors: ["Step missing exerciseType"] };
  }

  const spec = EXERCISE_TYPES[step.exerciseType];
  if (!spec) {
    return { pass: false, errors: [`Unknown exerciseType: "${step.exerciseType}"`] };
  }

  for (const field of spec.required) {
    if (step[field] === undefined || step[field] === null) {
      errors.push(`Missing required field "${field}" for exerciseType "${step.exerciseType}"`);
    }
  }

  if (step.exerciseType === "match_pairs" && Array.isArray(step.pairs) && step.pairs.length > 4) {
    errors.push("match_pairs: maximum 4 pairs allowed");
  }

  return { pass: errors.length === 0, errors };
}

export function validateCourseOutput(course) {
  const errors = [];
  const warnings = [];

  if (!course) return { pass: false, errors: ["No course output"], warnings: [] };

  // Title check
  if (!course.title) {
    errors.push("Missing course title");
  } else if (course.title.split(/\s+/).length > 8) {
    warnings.push("Course title exceeds 8 words");
  }

  // Lessons check
  if (!Array.isArray(course.lessons) || course.lessons.length === 0) {
    errors.push("No lessons in course");
    return { pass: false, errors, warnings };
  }

  for (let i = 0; i < course.lessons.length; i++) {
    const lesson = course.lessons[i];
    const prefix = `Lesson ${i + 1}`;

    if (!lesson.title) errors.push(`${prefix}: missing title`);
    if (!lesson.content) errors.push(`${prefix}: missing content (teacher lesson plan)`);

    // Validate teacher content for banned words
    if (lesson.content) {
      const langCheck = validateLanguage(lesson.content);
      if (!langCheck.pass) {
        warnings.push(...langCheck.errors.map((e) => `${prefix} content: ${e}`));
      }
    }

    // Validate local grounding in content
    if (lesson.content) {
      const localCheck = validateLocalGrounding(lesson.content);
      if (!localCheck.pass) {
        warnings.push(`${prefix}: ${localCheck.errors[0]}`);
      }
    }

    // Validate studentTask if present
    if (lesson.studentTask) {
      const st = lesson.studentTask;
      if (!st.whatYouWillDo) warnings.push(`${prefix} studentTask: missing whatYouWillDo`);
      if (!st.thinkAboutThis) warnings.push(`${prefix} studentTask: missing thinkAboutThis`);

      if (Array.isArray(st.steps)) {
        for (let j = 0; j < st.steps.length; j++) {
          const stepCheck = validateExerciseFields(st.steps[j]);
          if (!stepCheck.pass) {
            errors.push(...stepCheck.errors.map((e) => `${prefix} step ${j + 1}: ${e}`));
          }
          // Check banned words in step teach text
          if (st.steps[j].teach) {
            const stepLang = validateLanguage(st.steps[j].teach);
            if (!stepLang.pass) {
              warnings.push(...stepLang.errors.map((e) => `${prefix} step ${j + 1} teach: ${e}`));
            }
          }
        }
      } else {
        errors.push(`${prefix} studentTask: missing steps array`);
      }
    }
  }

  return {
    pass: errors.length === 0,
    errors,
    warnings,
  };
}
