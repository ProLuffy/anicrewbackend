const axios = require('axios');
const logger = require('../utils/logger');

class HiAnimeService {
  constructor() {
    this.baseUrl = process.env.HIANIME_API_URL || 'https://hianimeapi-1vww.onrender.com';
  }

  /**
   * Anime search by name
   * @param {string} query 
   */
  async searchAnime(query) {
    try {
      const { data } = await axios.get(`${this.baseUrl}/anime/search?q=${encodeURIComponent(query)}`);
      return data;
    } catch (error) {
      logger.error(`HiAnime Search Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get Episode List
   * @param {string} animeId 
   */
  async getEpisodes(animeId) {
    try {
      const { data } = await axios.get(`${this.baseUrl}/anime/episodes/${animeId}`);
      return data; 
    } catch (error) {
      logger.error(`HiAnime Episode List Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get Streaming Links (M3U8)
   * @param {string} episodeId 
   */
  async getEpisodeSources(episodeId) {
    try {
      // Standard endpoint for most HiAnime wrappers
      // Agar teri API ka endpoint alag hai to yahan change kar dena
      const { data } = await axios.get(`${this.baseUrl}/anime/episode-srcs?id=${episodeId}`);
      return data;
    } catch (error) {
      logger.error(`HiAnime Source Error: ${error.message}`);
      // Agar render API sleep mode me hai to retry logic add kar sakte hain
      throw error;
    }
  }
}

module.exports = new HiAnimeService();
