export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  LONG_ANSWER = 'LONG_ANSWER',
  FILL_IN_THE_BLANK = 'FILL_IN_THE_BLANK',
  MATCHING = 'MATCHING'
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Question {
  id: number;
  type: QuestionType;
  text: string;
  options?: string[]; // For Multiple Choice
  pairs?: { left: string; right: string }[]; // For Matching
  correctAnswer?: string; 
  learningObjective: string;
  difficulty?: Difficulty;
  page?: number; // Page number for rendering (starts at 1)
}

export interface ExamHeader {
  title: string;
  schoolName: string;
  grade: string;
  durationMinutes: number;
}

export interface EvaluationTableItem {
  objective: string;
}

export interface ExamPaper {
  header: ExamHeader;
  questions: Question[];
  evaluationTable: EvaluationTableItem[];
}

export interface GenerationConfig {
  sourceType: 'TEXT' | 'URL' | 'FILE';
  content: string;
  fileData?: {
    mimeType: string;
    data: string; // Base64 string
  };
  difficulty: Difficulty;
  questionCounts: Record<QuestionType, number>; // Dictionary of counts
}