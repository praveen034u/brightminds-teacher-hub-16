export interface FeedbackResponse {
  extracted_text: string;
  readability: {
    readability_score: number;
    readable: boolean;
    issues: string[];
    confidence: number;
  };
  assessment: {
    overall_score: number;
    max_score: number;
    rubric_breakdown: Array<{
      criterion: string;
      score: number;
      max: number;
      notes: string;
    }>;
  };
  feedback: {
    strengths: string[];
    improvements: string[];
    next_steps: string[];
    model_answer_suggestion: string;
  };
}
