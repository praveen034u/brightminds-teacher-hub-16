export type AssignmentType = "essay" | "story";

export interface Assignment {
  id: string;
  title: string;
  type: AssignmentType;
  prompt: string;
  gradeLevel?: string;
  rubric?: string[];
  dueDate?: string;
  createdBy: string;
  createdAt: string;
}
