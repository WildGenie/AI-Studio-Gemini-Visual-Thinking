/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Part, Content } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const sendMessageStream = async (
  message: string,
  history: Content[],
  image?: string
) => {
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    history: history,
    config: {
      systemInstruction: "Do not refer to images in your response in markdown format.",
      tools: [{ codeExecution: {} }],
      thinkingConfig: {
        includeThoughts: true, 
      },
    },
  });

  const parts: Part[] = [{ text: message }];
  if (image) {
    // Assuming image is a base64 data URL, we need to extract the actual base64 data and mime type
    // Format: data:image/png;base64,.....
    const match = image.match(/^data:(.+);base64,(.+)$/);
    if (match) {
      let mimeType = match[1];
      // Fallback: Gemini API rejects application/octet-stream. Default to image/jpeg if this occurs.
      if (mimeType === 'application/octet-stream') {
        mimeType = 'image/jpeg';
      }

      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: match[2],
        },
      });
    }
  }

  const result = await chat.sendMessageStream({ message: parts });
  return result;
};