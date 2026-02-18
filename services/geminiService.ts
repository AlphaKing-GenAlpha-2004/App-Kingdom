
import { GoogleGenAI, Type } from "@google/genai";

export const getPuzzleHint = async (board: number[]): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `I am playing an 8-puzzle. The current board state is: ${JSON.stringify(board)}. 
      0 is the empty slot. The goal is [1,2,3,4,5,6,7,8,0]. 
      Suggest the next best move in one short sentence. Explain why briefly.`,
      config: {
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "I'm stumped! Try moving an adjacent tile.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error getting hint. Try again later.";
  }
};
