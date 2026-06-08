import { GoogleGenAI } from "@google/genai";

const CONVENTIONAL_TYPES = new Set(['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert']);

const normalizeCommitMessage = (message: string, fallbackType: string, fallbackTitle: string): string => {
  const trimmed = message.trim().replace(/^["']|["']$/g, '');
  const fixedMissingColon = trimmed.replace(/^([a-z]+)(\([^)\r\n]+\))(!?)\s+(.+)$/i, '$1$2$3: $4');
  const match = fixedMissingColon.match(/^([a-z]+)(?:\([^)\r\n]+\))?!?:\s+\S.+$/i);

  if (match && CONVENTIONAL_TYPES.has(match[1].toLowerCase())) {
    return fixedMissingColon;
  }

  const type = CONVENTIONAL_TYPES.has(fallbackType) ? fallbackType : 'feat';
  return `${type}: ${fallbackTitle.trim() || 'update project'}`;
};

const getGeminiApiKey = (): string => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is required. Set GEMINI_API_KEY or API_KEY.');
  }
  return apiKey;
};

const getGeminiClient = (): GoogleGenAI => {
  return new GoogleGenAI({ apiKey: getGeminiApiKey() });
};

export const generatePilotCallsign = async (pilotName: string): Promise<string> => {
  const ai = getGeminiClient();

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

export const generateCommitMessage = async (todo: { title: string, description: string, subtask: { text: string, completed: boolean }[], type: string }): Promise<string> => {
  const type = (todo.type || 'feat').toLowerCase();
  if (!process.env.GEMINI_API_KEY && !process.env.API_KEY) {
    return normalizeCommitMessage('', type, todo.title);
  }

  const ai = getGeminiClient();
  try {
    const model = 'gemini-3-flash-preview';
    const subtasksText = todo.subtask.map(st => `- ${st.text}`).join('\n');
    const prompt = `
      As a senior developer, generate a concise and descriptive conventional commit message for the following task.
      
      Task Title: ${todo.title}
      Type: ${todo.type}
      Description: ${todo.description}
      Subtasks:
      ${subtasksText}
      
      Rules:
      1. Use conventional commit format: <type>(<scope>): <description>
      2. The type should be one of: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
      3. Focus on what was achieved.
      4. Keep the first line under 72 characters.
      5. Return ONLY the commit message string, no markdown, no quotes.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return normalizeCommitMessage(response.text || '', type, todo.title);
  } catch (error) {
    console.error("Gemini Commit Generation Error:", error);
    return normalizeCommitMessage('', type, todo.title);
  }
};
