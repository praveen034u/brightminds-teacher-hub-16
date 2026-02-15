export type ScoreBadge = {
  label: string;
  emoji: string;
  tone: "celebrate" | "progress" | "encourage";
};

export type HighlightToken = {
  text: string;
  type: "normal" | "unclear" | "punctuation";
};

export const badgeFromScore = (score: number): ScoreBadge => {
  if (score >= 90) {
    return { label: "Amazing! You're a Writing Star!", emoji: "🏆", tone: "celebrate" };
  }
  if (score >= 80) {
    return { label: "Awesome work! Keep going!", emoji: "🎉", tone: "celebrate" };
  }
  if (score >= 70) {
    return { label: "Great progress! Level up!", emoji: "🚀", tone: "progress" };
  }
  if (score >= 60) {
    return { label: "Nice try! You're improving!", emoji: "💪", tone: "progress" };
  }
  return { label: "Good start! Let's practice!", emoji: "🌱", tone: "encourage" };
};

export const starsFromPct = (pct: number): number => {
  const normalized = Math.max(0, Math.min(100, pct));
  const stars = Math.round(normalized / 20);
  return Math.max(1, Math.min(5, stars));
};

export const highlightExtractedText = (text: string): HighlightToken[] => {
  if (!text) return [];

  const tokens: HighlightToken[] = [];
  const pattern = /(\[UNCLEAR\]|\.\.)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: text.slice(lastIndex, match.index), type: "normal" });
    }

    const value = match[0];
    tokens.push({
      text: value,
      type: value === "[UNCLEAR]" ? "unclear" : "punctuation",
    });

    lastIndex = match.index + value.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ text: text.slice(lastIndex), type: "normal" });
  }

  return tokens;
};
