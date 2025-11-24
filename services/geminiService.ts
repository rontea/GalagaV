import { GoogleGenAI } from "@google/genai";

const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : undefined;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const generatePilotCallsign = async (pilotName: string): Promise<string> => {
  if (!ai) {
    console.warn("Gemini API Key missing. Returning fallback.");
    return "MAVERICK";
  }

  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      Generate a single, cool, 80s arcade-style sci-fi pilot callsign for a player named "${pilotName || 'Player'}". 
      Strict rules:
      1. Maximum 10 characters.
      2. Uppercase only.
      3. No spaces or special characters (hyphens allowed).
      4. Return ONLY the callsign string.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Fast response needed for UI
      }
    });

    const text = response.text?.trim().toUpperCase() || "STARFIGHTER";
    // Clean up any accidental extra chars
    return text.replace(/[^A-Z0-9-]/g, '').substring(0, 10);
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    return "VIPER";
  }
};