import { GoogleGenAI, Type } from "@google/genai";
import { ExamPaper, GenerationConfig, Question, Difficulty, QuestionType } from "../types";

const parseJSONSafe = (text: string): any => {
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      return JSON.parse(match[1]);
    }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      return JSON.parse(text.substring(start, end + 1));
    }
    throw new Error("Failed to parse JSON response");
  }
};

export const generateExam = async (config: GenerationConfig): Promise<ExamPaper> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Construct the requirement string based on counts
  const requirements = Object.entries(config.questionCounts)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => `${count} questions of type ${type}`)
    .join(', ');

  const totalQ = Object.values(config.questionCounts).reduce((a, b) => a + b, 0);

  const systemPrompt = `
    You are an expert educational consultant and exam designer fluent in Persian (Farsi).
    
    Requirements:
    1. Output: Valid JSON only.
    2. Language: Persian.
    3. Content:
       - Header info.
       - EXACTLY these questions: ${requirements}.
       - Total score approx 20.
       - Generate a list of 4-6 core 'learning objectives' for the evaluation table.
    
    Difficulty: ${config.difficulty}
  `;

  let finalPrompt = "";
  let tools: any[] = [];
  let useSchema = false;

  if (config.sourceType === 'URL') {
    tools = [{ googleSearch: {} }];
    finalPrompt = `
      Analyze content at: "${config.content}".
      Generate a Persian exam JSON.
      Structure:
      {
        "header": { "title": "...", "schoolName": "...", "teacherName": "...", "grade": "...", "durationMinutes": 60, "totalScore": 20 },
        "questions": [
           { "id": 1, "type": "MULTIPLE_CHOICE", "text": "...", "options": ["..."], "learningObjective": "...", "difficulty": "${config.difficulty}" },
           { "id": 2, "type": "MATCHING", "text": "Connect the related items", "pairs": [{"left": "A", "right": "B"}], ... }
        ],
        "evaluationTable": [
            { "objective": "Understanding X" }
        ]
      }
    `;
  } else {
    useSchema = true;
    finalPrompt = `
      Content: "${config.content.substring(0, 25000)}" 
      Generate exam JSON based on this content with exactly ${totalQ} questions as requested.
    `;
  }

  try {
    const modelName = config.sourceType === 'URL' ? 'gemini-2.5-flash' : 'gemini-2.5-flash';
    
    const requestConfig: any = {
        systemInstruction: systemPrompt,
        temperature: 0.4,
    };

    if (tools.length > 0) {
        requestConfig.tools = tools;
    }

    if (useSchema) {
        requestConfig.responseMimeType = "application/json";
        requestConfig.responseSchema = {
            type: Type.OBJECT,
            properties: {
                header: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        schoolName: { type: Type.STRING },
                        teacherName: { type: Type.STRING },
                        grade: { type: Type.STRING },
                        durationMinutes: { type: Type.INTEGER },
                        totalScore: { type: Type.NUMBER },
                    },
                    required: ["title", "totalScore"]
                },
                questions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.INTEGER },
                            type: { type: Type.STRING, enum: Object.values(QuestionType) },
                            text: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            pairs: { 
                                type: Type.ARRAY, 
                                items: { 
                                    type: Type.OBJECT, 
                                    properties: {
                                        left: { type: Type.STRING },
                                        right: { type: Type.STRING }
                                    }
                                }
                            },
                            correctAnswer: { type: Type.STRING },
                            learningObjective: { type: Type.STRING },
                            difficulty: { type: Type.STRING }
                        },
                        required: ["id", "type", "text"]
                    }
                },
                evaluationTable: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            objective: { type: Type.STRING }
                        }
                    }
                }
            }
        };
    }

    const response = await ai.models.generateContent({
        model: modelName,
        contents: finalPrompt,
        config: requestConfig
    });

    const text = response.text;
    if (!text) throw new Error("No response generated");

    return parseJSONSafe(text) as ExamPaper;

  } catch (error) {
    console.error("Generation Error:", error);
    throw new Error("Failed to generate exam. Try different content.");
  }
};

export const regenerateQuestion = async (currentQuestion: Question, newDifficulty: Difficulty, contextSummary: string): Promise<Question> => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
        Rewrite the following exam question to be "${newDifficulty}".
        Original Question: "${currentQuestion.text}"
        Type: ${currentQuestion.type}
        Context/Topic: ${contextSummary}
        
        Return JSON only:
        {
           "text": "New question text...",
           "options": ["opt1", "opt2"] (if MC),
           "pairs": [{"left": "a", "right": "b"}] (if Matching),
           "learningObjective": "..."
        }
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });

    const data = parseJSONSafe(response.text);
    
    return {
        ...currentQuestion,
        ...data,
        difficulty: newDifficulty
    };
};