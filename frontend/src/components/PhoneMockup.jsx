export default function PhoneMockup({ course, lesson }) {
  if (!course || !lesson) return null;

  const lessons = course.lessons ?? [];
  const lessonIndex = lessons.findIndex((l) => l === lesson);

  // Truncate content to fit the phone screen
  const paragraphs = lesson.content.split("\n\n");
  const preview = paragraphs.slice(0, 3).join("\n\n");
  const isTruncated = paragraphs.length > 3;

  return (
    <div className="flex flex-col items-center">
      {/* Phone frame */}
      <div
        className="relative flex-shrink-0 shadow-2xl"
        style={{
          width: 280,
          height: 580,
          background: "#1a1a1a",
          borderRadius: 40,
          padding: "12px 8px",
        }}
      >
        {/* Notch */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: 12,
            width: 80,
            height: 22,
            background: "#1a1a1a",
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            zIndex: 10,
          }}
        />

        {/* Side buttons (decorative) */}
        <div
          className="absolute"
          style={{
            right: -3,
            top: 100,
            width: 3,
            height: 40,
            background: "#2e2e2e",
            borderRadius: 2,
          }}
        />
        <div
          className="absolute"
          style={{
            left: -3,
            top: 80,
            width: 3,
            height: 28,
            background: "#2e2e2e",
            borderRadius: 2,
          }}
        />
        <div
          className="absolute"
          style={{
            left: -3,
            top: 118,
            width: 3,
            height: 28,
            background: "#2e2e2e",
            borderRadius: 2,
          }}
        />

        {/* Inner screen */}
        <div
          className="relative overflow-hidden flex flex-col"
          style={{
            background: "#faf6ef",
            borderRadius: 32,
            height: "100%",
            width: "100%",
          }}
        >
          {/* Status bar */}
          <div
            className="flex items-center justify-between px-5 flex-shrink-0"
            style={{ paddingTop: 18, paddingBottom: 6, fontSize: 11 }}
          >
            <span className="font-semibold text-stone-800">9:41</span>
            <div className="flex items-center gap-1 text-stone-600" style={{ fontSize: 10 }}>
              <span>▮▮▮</span>
              <span>WiFi</span>
              <span>▮▮▮▮</span>
            </div>
          </div>

          {/* App header */}
          <div
            className="flex items-center gap-2 px-4 pb-2 flex-shrink-0 border-b border-stone-200"
          >
            {/* 4-color logo */}
            <div className="w-6 h-6 grid grid-cols-2 gap-px flex-shrink-0">
              <div className="bg-kwaxolo-gold rounded-sm" />
              <div className="bg-kwaxolo-red rounded-sm" />
              <div className="bg-kwaxolo-blue rounded-sm" />
              <div className="bg-kwaxolo-green rounded-sm" />
            </div>
            <span className="font-bold text-stone-900" style={{ fontSize: 12 }}>
              KwaXolo Bridge
            </span>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-hidden flex flex-col px-4 pt-3">
            {/* Course title */}
            <div
              className="text-stone-500 font-medium mb-2 leading-tight"
              style={{ fontSize: 10 }}
            >
              {course.title}
            </div>

            {/* Progress dots */}
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {lessons.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background:
                      i === lessonIndex
                        ? "#16a34a"
                        : i < lessonIndex
                        ? "#bbf7d0"
                        : "#e7e5e4",
                  }}
                />
              ))}
            </div>

            {/* Lesson title */}
            <div
              className="font-bold text-stone-900 mb-2 leading-tight"
              style={{ fontSize: 13 }}
            >
              {lesson.title}
            </div>

            {/* Lesson content preview */}
            <div
              className="text-stone-700 leading-snug flex-1 overflow-hidden"
              style={{ fontSize: 10 }}
            >
              {preview.split("\n\n").map((para, i) => (
                <p key={i} className={i > 0 ? "mt-1.5" : ""}>
                  {para}
                </p>
              ))}
              {isTruncated && (
                <span className="text-stone-400"> ...</span>
              )}
            </div>
          </div>

          {/* Next lesson button */}
          <div className="px-4 pb-2 flex-shrink-0">
            <div
              className="bg-kwaxolo-green text-white text-center font-semibold rounded-lg"
              style={{ fontSize: 11, padding: "7px 0" }}
            >
              Next lesson →
            </div>
          </div>

          {/* Bottom nav */}
          <div
            className="flex items-center justify-around border-t border-stone-200 bg-white flex-shrink-0"
            style={{ padding: "6px 0 10px" }}
          >
            <NavIcon label="Courses" active />
            <NavIcon label="Opportunity" />
            <NavIcon label="Profile" />
          </div>
        </div>
      </div>

      {/* Caption */}
      <p className="mt-4 text-xs text-stone-400 text-center">
        Coming soon to iOS and Android
      </p>
    </div>
  );
}

function NavIcon({ label, active }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        style={{
          width: 18,
          height: 3,
          borderRadius: 2,
          background: active ? "#16a34a" : "#d6d3d1",
        }}
      />
      <span
        style={{
          fontSize: 8,
          color: active ? "#16a34a" : "#a8a29e",
          fontWeight: active ? 600 : 400,
        }}
      >
        {label}
      </span>
    </div>
  );
}
