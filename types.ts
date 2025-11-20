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
}

export interface ExamHeader {
  title: string;
  schoolName: string;
  teacherName: string;
  grade: string;
  durationMinutes: number;
  totalScore: number;
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
  sourceType: 'TEXT' | 'URL';
  content: string;
  difficulty: Difficulty;
  questionCounts: Record<QuestionType, number>; // Dictionary of counts
}