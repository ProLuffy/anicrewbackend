const axios = require('axios');
const logger = require('../utils/logger');

class HiAnimeService {
  constructor() {
    this.baseUrl = process.env.HIANIME_API_URL || 'https://hianime-api-seven-teal.vercel.app';
  }

  /**
   * Anime search by name
   * @param {string} query
   */
  async searchAnime(query) {
    try {
      const { data } = await axios.get(`${this.baseUrl}/api/v2/hianime/search?q=${encodeURIComponent(query)}`);
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
      const { data } = await axios.get(`${this.baseUrl}/api/v2/hianime/anime/${animeId}/episodes`);
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
      const { data } = await axios.get(`${this.baseUrl}/api/v2/hianime/episode/sources?animeEpisodeId=${episodeId}`);
      return data;
    } catch (error) {
      logger.error(`HiAnime Source Error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new HiAnimeService();
