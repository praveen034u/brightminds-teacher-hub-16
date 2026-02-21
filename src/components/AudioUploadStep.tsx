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
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordError, setRecordError] = useState<string | null>(null);

  const handleStartRecording = async () => {
    setRecordError(null);
    setSelected(null);
    setRecordedChunks([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new window.MediaRecorder(stream);
      setMediaRecorder(recorder);
      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) setRecordedChunks(prev => [...prev, e.data]);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'audio/webm' });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        setSelected(file);
        setRecording(false);
        setMediaRecorder(null);
      };
      recorder.start();
      setRecording(true);
    } catch (err: any) {
      setRecordError('Microphone access denied or not available.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
    }
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
        onClick={recording ? handleStopRecording : handleStartRecording}
        disabled={loading}
        style={recording ? { background: '#e74c3c', borderColor: '#e74c3c' } : {}}
      >
        <span role="img" aria-label="Record">🎙️</span> {recording ? 'Stop Recording' : 'Record'}
      </button>
      {recordError && <div className={styles.errorBox}>{recordError}</div>}
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
        <div className={styles.progressBar}><div style={{ width: `${progress}%` }} /></div>
      )}
      {error && <div className={styles.errorBox}>{error}</div>}
    </div>
  );
};

export default AudioUploadStep;
