import React, { useRef, useState } from "react";
import styles from "../styles/PracticeMode.module.css";

interface AudioUploadStepProps {
  onUpload: (file: File) => void;
  loading: boolean;
  error?: string;
}

const AudioUploadStep: React.FC<AudioUploadStepProps> = ({ onUpload, loading, error }) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState<File | null>(null);

  const handleFakeRecord = () => {
    // Simulate recording by creating a fake file
    const blob = new Blob(["Fake audio data"], { type: "audio/mp3" });
    const file = new File([blob], "recording.mp3", { type: "audio/mp3" });
    setSelected(file);
  };

  const handleUpload = () => {
    if (!selected) return;
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += 20;
      setProgress(Math.min(p, 100));
      if (p >= 100) {
        clearInterval(interval);
        onUpload(selected);
      }
    }, 200);
  };

  return (
    <div className={styles.audioUploadStep}>
      <button
        className={styles.bigButton}
        onClick={handleFakeRecord}
        disabled={loading}
      >
        <span role="img" aria-label="Record">🎙️</span> Record (Mock)
      </button>
      <div className={styles.orText}>or</div>
      <input
        type="file"
        accept="audio/*"
        ref={fileInput}
        style={{ display: "none" }}
        onChange={e => {
          if (e.target.files && e.target.files[0]) {
            setSelected(e.target.files[0]);
          }
        }}
        disabled={loading}
      />
      <button
        className={styles.bigButton}
        onClick={() => fileInput.current?.click()}
        disabled={loading}
      >
        <span role="img" aria-label="Upload">⬆️</span> Upload Audio
      </button>
      {selected && (
        <div className={styles.selectedFile}>
          <span role="img" aria-label="File">📁</span> {selected.name}
        </div>
      )}
      {selected && (
        <button
          className={styles.bigButton}
          onClick={handleUpload}
          disabled={loading}
        >
          Upload & Continue
        </button>
      )}
      {progress > 0 && progress < 100 && (
        <div className={styles.progressBarContainer}>
          <div className={styles.progressBar} style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <div className={styles.errorBox}>{error}</div>}
    </div>
  );
};

export default AudioUploadStep;
