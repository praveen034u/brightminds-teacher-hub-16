import React, { useEffect, useState } from "react";
import { PracticeSessionDetails, PracticeType } from "../types/practiceTypes";
import styles from "../styles/PracticeMode.module.css";

interface FeedbackResultsProps {
  feedback: PracticeSessionDetails;
  activityType: PracticeType;
  aiFeedbackTTSUrl?: string;
  onPracticeAgain: (stepOverride?: 'pick' | 'audio') => void;
  onNewTopic: () => void;
}

// Mock function to get signed URL (replace with real API call in prod)
async function fetchAiFeedbackAudioUrl(sessionId: string): Promise<string> {
  // Simulate network delay
  await new Promise(res => setTimeout(res, 800));
  // Return a mock signed URL (replace with real one)
  return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
}

const FeedbackResults: React.FC<FeedbackResultsProps> = ({ feedback, activityType, aiFeedbackTTSUrl, onPracticeAgain, onNewTopic }) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const ai = feedback.ai_feedback!;

  useEffect(() => {
    setShowConfetti(true);
    const t = setTimeout(() => setShowConfetti(false), 2500);
    return () => clearTimeout(t);
  }, [feedback]);

  const handleListenAudio = () => {
    setAudioError(null);
    if (aiFeedbackTTSUrl) {
      setAudioUrl(aiFeedbackTTSUrl);
    } else {
      setAudioError("No AI feedback audio available.");
    }
  };

  return (
    <div className={styles.feedbackResults}>
      {showConfetti && <div className={styles.confetti}></div>}
      <h2 className={styles.resultTitle}>🎉 Nice job! Let’s level up!</h2>
      <div className={styles.scoreBadge}>
        <span role="img" aria-label="Score">⭐</span> {feedback.score}/10
      </div>
      <div className={styles.scoreCards}>
        <div className={styles.scoreCard}>Clarity: <b>{ai.scores.clarity}</b></div>
        <div className={styles.scoreCard}>Structure: <b>{ai.scores.structure}</b></div>
        <div className={styles.scoreCard}>Delivery: <b>{ai.scores.delivery}</b></div>
        {activityType === "debate" && ai.scores.argumentStrength !== undefined && (
          <div className={styles.scoreCard}>Argument Strength: <b>{ai.scores.argumentStrength}</b></div>
        )}
      </div>
      {/* Listen to AI Feedback Audio Button */}
      {aiFeedbackTTSUrl && (
        <div style={{ margin: "1.5rem 0" }}>
          <button className={styles.bigButton} onClick={handleListenAudio} disabled={loadingAudio}>
            {loadingAudio ? "Loading audio..." : "🔊 Listen to AI Feedback"}
          </button>
          {audioError && <div className={styles.errorBox}>{audioError}</div>}
          {audioUrl && (
            <div style={{ marginTop: 12 }}>
              <audio controls autoPlay src={audioUrl} style={{ width: "100%" }}>
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>
      )}
      {!aiFeedbackTTSUrl && (
        <div style={{ margin: "1.5rem 0" }}>
          <div className={styles.errorBox}>No AI feedback audio available.</div>
        </div>
      )}
      <div className={styles.strengthsImprovements}>
        <div>
          <h3>You did awesome at…</h3>
          <ul>
            {ai.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
        <div>
          <h3>Next time try…</h3>
          <ul>
            {ai.improvements.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      </div>
      <div className={styles.nextPracticePlan}>
        <h3>Next Practice Plan</h3>
        <ul>
          {ai.nextPracticePlan.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>
      {activityType === "debate" && ai.counterArguments && (
        <div className={styles.counterArguments}>
          <h3>Possible Counter Arguments</h3>
          <ul>
            {ai.counterArguments.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
      <div className={styles.timestampedNotes}>
        <h3>Timestamped Notes</h3>
        <div className={styles.noteChips}>
          {ai.timestampedNotes.map((n, i) => (
            <span key={i} className={styles.noteChip}>
              {`${Math.floor(n.startSec/60)}:${(n.startSec%60).toString().padStart(2,"0")}`}
              –{`${Math.floor(n.endSec/60)}:${(n.endSec%60).toString().padStart(2,"0")}`}: {n.note}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.resultButtons}>
        <button
          className={styles.bigButton}
          style={{ minWidth: 180, fontSize: '1.15rem', background: '#3498db', color: '#fff', border: '2px solid #3498db' }}
          onClick={() => onPracticeAgain('audio')}
        >
          Practice Again
        </button>
        <button
          className={styles.bigButton}
          style={{ minWidth: 120, fontSize: '1.15rem', background: '#2980b9', color: '#fff', border: '2px solid #2980b9' }}
          onClick={onNewTopic}
        >
          Try a New Topic
        </button>
      </div>
    </div>
  );
};

export default FeedbackResults;
