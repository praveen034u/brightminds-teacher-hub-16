import React from "react";
import PracticeWizard from "../components/PracticeWizard";
import styles from "../styles/PracticeMode.module.css";

const StudentPracticeModePage: React.FC = () => {

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
      <h1 className={styles.title}>🎯 Practice Mode</h1>
      <PracticeWizard />
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
