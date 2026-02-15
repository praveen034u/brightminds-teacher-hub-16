export const aiAssessmentSettings = {
  apiBaseUrl: import.meta.env.VITE_AI_ASSESSMENT_API_URL || "http://localhost:3000",
  rubric: import.meta.env.VITE_AI_RUBRIC || "Thesis, evidence, structure",
  maxScore: Number(import.meta.env.VITE_AI_MAX_SCORE || 100),
  language: import.meta.env.VITE_AI_LANGUAGE || "English",
};
