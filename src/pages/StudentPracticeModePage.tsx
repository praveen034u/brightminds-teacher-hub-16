          // API: Get Session Details (with feedback)
          const getSessionDetailsWithFeedback = async ({ sessionId, studentId }) => {
            try {
              const response = await axios.get(
                `https://ai-feedback-api-756501801816.us-east4.run.app/api/student/practice-sessions/${sessionId}`,
                {
                    headers: {
                      "x-student-id": studentId,
                  },
                }
              );
              return response.data;
            } catch (error) {
              console.error("Get Session Details (with feedback) error:", error);
              throw error;
            }
          };
        // API: Request AI Feedback
        const requestAIFeedback = async ({ sessionId, studentId }) => {
          try {
            const response = await axios.post(
              `https://ai-feedback-api-756501801816.us-east4.run.app/api/student/practice-sessions/${sessionId}/ai-feedback`,
              {},
              {
                  headers: {
                    "x-student-id": studentId,
                },
              }
            );
            return response.data;
          } catch (error) {
            console.error("Request AI Feedback error:", error);
            throw error;
          }
        };
      // API: Attach Audio Session
      const attachAudioSession = async ({ sessionId, studentId, audioUrl }) => {
        try {
          const response = await axios.post(
            `https://ai-feedback-api-756501801816.us-east4.run.app/api/student/practice-sessions/${sessionId}/attach-audio`,
            {
              audio_url: audioUrl,
            },
            {
              headers: {
                "Content-Type": "application/json",
                  "x-student-id": studentId,
              },
            }
          );
          return response.data;
        } catch (error) {
          console.error("Attach Audio Session error:", error);
          throw error;
        }
      };
    // API: Upload Audio (to GCS)
    const uploadAudioToGCS = async ({ uploadUrl, audioFile }) => {
      try {
        const response = await axios.put(
          uploadUrl,
          audioFile,
          {
            headers: {
              "Content-Type": "audio/wav",
            },
          }
        );
        return response.data;
      } catch (error) {
        console.error("Upload Audio to GCS error:", error);
        throw error;
      }
    };
  // API: Get Upload Url
  const getUploadUrl = async ({ sessionId, studentId }) => {
    try {
      const response = await axios.post(
        `https://ai-feedback-api-756501801816.us-east4.run.app/api/student/practice-sessions/${sessionId}/upload-url`,
        {},
        {
                headers: {
                  "x-student-id": studentId,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Get Upload Url error:", error);
      throw error;
    }
  };

import React, { useState } from "react";
import axios from "axios";
import PracticeWizard from "../components/PracticeWizard";
import styles from "../styles/PracticeMode.module.css";


const StudentPracticeModePage: React.FC = () => {
  const [step, setStep] = useState<'pick' | 'audio' | 'ai' | 'results'>('pick');

  // API: Create Speech Session
  const createSpeechSession = async ({ studentId, topic, language }) => {
    try {
      const response = await axios.post(
        "https://ai-feedback-api-756501801816.us-east4.run.app/api/student/practice-sessions",
        {
          practice_type: "speech",
          topic,
          position: null,
          language,
        },
        {
          headers: {
            "Content-Type": "application/json",
              "x-student-id": studentId,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Create Speech Session error:", error);
      throw error;
    }
  };

  // Handler for Start New Session
  const handleStartNew = () => {
    window.location.reload();
  };

  // Home button logic matching StudentFeedbackPage
  const handleHome = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("student_presigned_token") : null;
    const schoolId = typeof window !== "undefined" ? localStorage.getItem("student_school_id") : null;
    if (token) {
      const schoolParam = schoolId ? `&school_id=${encodeURIComponent(schoolId)}` : "";
      window.location.href = `/student-portal?token=${encodeURIComponent(token)}${schoolParam}`;
      return;
    }
    window.location.href = "/student-portal";
  };

  return (
    <div className={styles.practiceModePage} style={{ position: "relative", minHeight: "100vh", paddingBottom: 96 }}>
      {step !== 'results' && (
        <h1 className={styles.title}>🎯 Practice Mode</h1>
      )}
      <PracticeWizard initialStep="pick" />
      <div style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        background: "linear-gradient(90deg, #e0f7fa 60%, #b3e0ff 100%)",
        boxShadow: "0 -2px 12px #b3e0ff33",
        padding: "1.2rem 0",
        display: "flex",
        justifyContent: "center",
        gap: "1.5rem",
      }}>
        <button
          className={styles.bigButton}
          style={{ minWidth: 180, fontSize: "1.15rem", background: "#3498db", color: "#fff", border: "2px solid #3498db" }}
          onClick={handleStartNew}
        >
          🎯 Start New Session
        </button>
        <button
          className={styles.bigButton}
          style={{ minWidth: 120, fontSize: "1.15rem", background: "#2980b9", color: "#fff", border: "2px solid #2980b9" }}
          onClick={handleHome}
        >
          🏠 Home
        </button>
      </div>
    </div>
  );
};

export default StudentPracticeModePage;
