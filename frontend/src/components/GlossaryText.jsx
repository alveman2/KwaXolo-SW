// GlossaryText — wraps text and adds hover tooltips for difficult English words,
// showing translations in the local language (isiZulu).

import { useState, useRef, useEffect, useCallback } from "react";
import { useLanguage } from "../lib/i18n.jsx";
import GLOSSARY from "../lib/glossary.js";

// Build regex: match glossary stems followed by optional English suffixes.
// Sort longest-first so multi-word terms match before their substrings.
const sortedTerms = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
const escaped = sortedTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const glossaryRegex = new RegExp(
  `\\b(${escaped.join("|")})[a-z]*\\b`,
  "gi"
);

function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  const updatePos = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({
        top: rect.top - 6,
        left: rect.left + rect.width / 2,
      });
    }
  }, []);

  useEffect(() => {
    if (show) updatePos();
  }, [show, updatePos]);

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onTouchStart={(e) => { e.preventDefault(); setShow((s) => !s); }}
        className="border-b border-dashed border-kwaxolo-green/50 cursor-help text-inherit hover:border-kwaxolo-green hover:bg-kwaxolo-green/5 rounded-sm transition-colors"
      >
        {children}
      </span>
      {show && (
        <span
          className="fixed z-[9999] px-3 py-1.5 text-xs font-medium bg-stone-900 text-white rounded-lg shadow-xl pointer-events-none -translate-x-1/2 -translate-y-full whitespace-nowrap"
          style={{ top: pos.top, left: pos.left }}
        >
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-900" />
        </span>
      )}
    </>
  );
}

/**
 * GlossaryText — renders text with hoverable tooltips on difficult English words.
 * Only active when the UI language is English (showing isiZulu translations).
 * When the UI is already in isiZulu, no tooltips are shown.
 */
export default function GlossaryText({ text, className = "" }) {
  const { lang } = useLanguage();

  if (lang !== "en" || !text || typeof text !== "string") {
    return <span className={className}>{text}</span>;
  }

  const parts = [];
  let lastIndex = 0;

  // Reset regex state before each render
  glossaryRegex.lastIndex = 0;

  let match;
  while ((match = glossaryRegex.exec(text)) !== null) {
    const fullMatch = match[0]; // e.g. "opportunities", "profitable"
    const stem = match[1].toLowerCase(); // e.g. "opportunit", "profit"
    const translation = GLOSSARY[stem];

    if (!translation) continue;

    // Text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    parts.push(
      <Tooltip key={`${match.index}-${stem}`} text={translation}>
        {fullMatch}
      </Tooltip>
    );

    lastIndex = match.index + fullMatch.length;
  }

  // Remaining text after last match
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  // If no matches were found, just return the text without a wrapper
  if (parts.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return <span className={className}>{parts}</span>;
}
