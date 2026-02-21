export const aiAssessmentSettings = {
  apiBaseUrl: import.meta.env.VITE_AI_ASSESSMENT_API_URL || "https://brightmind-sa-756501801816.us-east4.run.app",
  rubric: import.meta.env.VITE_AI_RUBRIC || "Thesis, evidence, structure",
  maxScore: Number(import.meta.env.VITE_AI_MAX_SCORE || 100),
  language: import.meta.env.VITE_AI_LANGUAGE || "English",
};
