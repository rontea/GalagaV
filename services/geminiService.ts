import { GoogleGenAI } from "@google/genai";

// Always initialize the client using the environment variable as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const generatePilotCallsign = async (pilotName: string): Promise<string> => {
  // Proactive check for the API key hard requirement
  if (!process.env.API_KEY) {
    console.warn("Gemini API Key missing. Returning fallback.");
    return "MAVERICK";
  }

  try {
    // Select the recommended 'gemini-3-flash-preview' for basic text tasks
    const model = 'gemini-3-flash-preview';
    const prompt = `
      Generate a single, cool, 80s arcade-style sci-fi pilot callsign for a player named "${pilotName || 'Player'}". 
      Strict rules:
      1. Maximum 10 characters.
      2. Uppercase only.
      3. No spaces or special characters (hyphens allowed).
      4. Return ONLY the callsign string.
    `;

    // Use ai.models.generateContent to query the model with the prompt
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Fast response needed for UI, thinking is supported for Gemini 3
      }
    });

    // Access the .text property directly from the GenerateContentResponse object
    const text = response.text?.trim().toUpperCase() || "STARFIGHTER";
    // Clean up any accidental extra chars
    return text.replace(/[^A-Z0-9-]/g, '').substring(0, 10);
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    return "VIPER";
  }
};
