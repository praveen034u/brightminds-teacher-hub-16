import React, { useState } from "react";
import { PracticeType, PracticeSessionPayload } from "../types/practiceTypes";
import styles from "../styles/PracticeMode.module.css";

const SUGGESTIONS = [
  "Should homework be shorter?",
  "Is pizza better than burgers?",
  "Should pets come to school?",
  "Are video games good for kids?",
  "Should school start later?"
];

interface TopicPickerProps {
  activityType?: PracticeType;
  topic?: string;
  position?: "for" | "against" | "neutral";
  language: "en" | "hi";
  onStart: (payload: PracticeSessionPayload) => void;
  onSetActivity: (type: PracticeType) => void;
  onSetTopic: (topic: string) => void;
  onSetPosition: (pos: "for" | "against" | "neutral") => void;
  onSetLanguage: (lang: "en" | "hi") => void;
  loading: boolean;
  error?: string;
}

const TopicPicker: React.FC<TopicPickerProps> = ({
  activityType,
  topic,
  position,
  language,
  onStart,
  onSetActivity,
  onSetTopic,
  onSetPosition,
  onSetLanguage,
  loading,
  error
}) => {
  const [input, setInput] = useState(topic || "");
  const canStart = activityType && input.trim() && (activityType === "speech" || position);

  return (
    <div className={styles.topicPicker}>
      <div className={styles.cardOptions}>
        <button
          className={activityType === "speech" ? styles.cardActive : styles.card}
          onClick={() => onSetActivity("speech")}
          disabled={loading}
        >
          <span role="img" aria-label="Speech">🎤</span>
          <div>Speech Practice</div>
        </button>
        <button
          className={activityType === "debate" ? styles.cardActive : styles.card}
          onClick={() => onSetActivity("debate")}
          disabled={loading}
        >
          <span role="img" aria-label="Debate">🗣️</span>
          <div>Debate Practice</div>
        </button>
      </div>
      <div className={styles.topicInputSection}>
        <label className={styles.label}>Pick a topic:</label>
        <input
          className={styles.topicInput}
          value={input}
          onChange={e => {
            setInput(e.target.value);
            onSetTopic(e.target.value);
          }}
          placeholder="Type your topic or pick a suggestion"
          disabled={loading}
        />
        <div className={styles.suggestionChips}>
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              className={styles.suggestionChip}
              onClick={() => {
                setInput(s);
                onSetTopic(s);
              }}
              disabled={loading}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      {activityType === "debate" && (
        <div className={styles.positionToggle}>
          <label className={styles.label}>Your Position:</label>
          <div>
            <button
              className={position === "for" ? styles.toggleActive : styles.toggle}
              onClick={() => onSetPosition("for")}
              disabled={loading}
            >For</button>
            <button
              className={position === "against" ? styles.toggleActive : styles.toggle}
              onClick={() => onSetPosition("against")}
              disabled={loading}
            >Against</button>
            <button
              className={position === "neutral" ? styles.toggleActive : styles.toggle}
              onClick={() => onSetPosition("neutral")}
              disabled={loading}
            >Neutral</button>
          </div>
        </div>
      )}
      <div className={styles.languageSelector}>
        <label className={styles.label}>Language:</label>
        <select
          value={language}
          onChange={e => onSetLanguage(e.target.value as "en" | "hi")}
          disabled={loading}
        >
          <option value="en">English</option>
          <option value="hi">Hindi</option>
        </select>
      </div>
      <button
        className={styles.bigButton}
        onClick={() =>
          onStart({
            activityType: activityType!,
            topic: input,
            position: activityType === "debate" ? position : undefined,
            language
          })
        }
        disabled={!canStart || loading}
      >
        Start Practice
      </button>
      {error && <div className={styles.errorBox}>{error}</div>}
    </div>
  );
};

export default TopicPicker;
