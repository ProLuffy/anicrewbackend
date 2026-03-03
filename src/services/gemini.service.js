const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/files");
const fs = require('fs');
const logger = require('../utils/logger');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.fileManager = new GoogleAIFileManager(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
  }

  async uploadMedia(filePath, mimeType) {
    try {
      const uploadResponse = await this.fileManager.uploadFile(filePath, {
        mimeType: mimeType,
        displayName: "Anime Audio Track",
      });
      
      logger.info(`Uploaded to Gemini: ${uploadResponse.file.uri}`);
      return uploadResponse.file;
    } catch (error) {
      logger.error(`Gemini Upload Failed: ${error.message}`);
      throw error;
    }
  }

  async generateSubtitles(fileUri) {
    try {
      const prompt = `
        Listen to this audio track from an anime episode.
        Generate subtitles in HINDI.
        Format must be strict SRT (SubRip Subtitle) format.
        Timestamps must be accurate.
        Do not translate names (like Naruto, Goku).
        Keep the tone informal/anime-style.
        Output ONLY the SRT content, no markdown, no explanation.
      `;

      const result = await this.model.generateContent([
        {
          fileData: {
            mimeType: "audio/mp3",
            fileUri: fileUri
          }
        },
        { text: prompt }
      ]);

      return result.response.text();
    } catch (error) {
      logger.error(`Gemini Subtitle Generation Failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new GeminiService();
