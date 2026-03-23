import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface BrochureData {
  destination: string;
  duration: number;
  mustVisit: string;
  itinerary: {
    day: number;
    title: string;
    description: string;
    activities: string[];
    imageKeyword: string;
    ticketLink?: {
      name: string;
      url: string;
    };
  }[];
  tips: string[];
  description: string;
  coverImageKeyword: string;
}

export async function generateBrochure(destination: string, duration: number, mustVisit: string): Promise<BrochureData> {
  const prompt = `Create a highly detailed, professional travel brochure for ${destination} for ${duration} days. 
  The user specifically wants to visit: ${mustVisit}.
  
  Requirements:
  1. Provide a catchy, editorial-style description of the destination.
  2. For each day, provide:
     - A title.
     - A detailed description (at least 5-6 sentences) explaining the vibe, historical context, and specific highlights.
     - A list of specific activities.
     - A specific 'imageKeyword' for a high-quality photo. This MUST be the exact name of a famous landmark or specific location mentioned for that day, followed by the city and country (e.g., "Eiffel Tower Paris France", "Shibuya Crossing Tokyo Japan").
     - IMPORTANT: The keyword must be highly specific to ensure the image service returns the correct location. Do not use generic terms.
     - If an activity requires a ticket (museum, tour, attraction), provide an official-looking 'ticketLink' object with 'name' and 'url'.
  3. Provide a 'coverImageKeyword' for the destination. This should be the most iconic landmark of the destination with the city and country name (e.g., "Colosseum Rome Italy", "Statue of Liberty New York USA").
  4. Provide 5-7 expert travel tips.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          destination: { type: Type.STRING },
          duration: { type: Type.NUMBER },
          mustVisit: { type: Type.STRING },
          description: { type: Type.STRING },
          coverImageKeyword: { type: Type.STRING },
          itinerary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.NUMBER },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                activities: { type: Type.ARRAY, items: { type: Type.STRING } },
                imageKeyword: { type: Type.STRING },
                ticketLink: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    url: { type: Type.STRING }
                  },
                  required: ["name", "url"]
                }
              },
              required: ["day", "title", "description", "activities", "imageKeyword"]
            }
          },
          tips: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["destination", "duration", "mustVisit", "description", "itinerary", "tips", "coverImageKeyword"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function validateDestination(destination: string): Promise<{ isValid: boolean, message?: string }> {
  const prompt = `Check if "${destination}" is a real, recognizable travel destination (city, country, landmark, or region). 
  Return a JSON object with:
  - "isValid": boolean
  - "message": a short explanation if it's not valid (e.g., "This doesn't seem to be a real place.") or null if valid.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isValid: { type: Type.BOOLEAN },
          message: { type: Type.STRING }
        },
        required: ["isValid"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{"isValid": false}');
  } catch (e) {
    return { isValid: false, message: "Validation failed. Please try again." };
  }
}

export async function validateMustVisit(destination: string, mustVisit: string): Promise<{ isValid: boolean, message?: string }> {
  const prompt = `Check if the following "must visit" places or activities: "${mustVisit}" are real, recognizable, and relevant to the destination "${destination}". 
  If the input is just random letters, gibberish, or completely unrelated to travel in that area, mark it as invalid.
  Return a JSON object with:
  - "isValid": boolean
  - "message": a short explanation if it's not valid (e.g., "Some of these places don't seem to exist in ${destination}.") or null if valid.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isValid: { type: Type.BOOLEAN },
          message: { type: Type.STRING }
        },
        required: ["isValid"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{"isValid": false}');
  } catch (e) {
    return { isValid: false, message: "Validation failed. Please try again." };
  }
}

export async function updateBrochure(currentData: BrochureData, message: string): Promise<BrochureData> {
  const prompt = `The user wants to modify their travel brochure.
  Current Brochure: ${JSON.stringify(currentData)}
  User Request: ${message}
  
  Return the updated brochure in the same JSON format, maintaining the high level of detail and ticket links where applicable.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          destination: { type: Type.STRING },
          duration: { type: Type.NUMBER },
          mustVisit: { type: Type.STRING },
          description: { type: Type.STRING },
          coverImageKeyword: { type: Type.STRING },
          itinerary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.NUMBER },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                activities: { type: Type.ARRAY, items: { type: Type.STRING } },
                imageKeyword: { type: Type.STRING },
                ticketLink: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    url: { type: Type.STRING }
                  },
                  required: ["name", "url"]
                }
              },
              required: ["day", "title", "description", "activities", "imageKeyword"]
            }
          },
          tips: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["destination", "duration", "mustVisit", "description", "itinerary", "tips", "coverImageKeyword"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}
