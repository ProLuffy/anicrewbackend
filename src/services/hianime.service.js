const axios = require('axios');
const logger = require('../utils/logger');

class HiAnimeService {
  constructor() {
    // Sirf Base Domain aayega, aage ka koi kachra nahi!
    this.baseUrl = 'https://hianime-api-seven-teal.vercel.app';
  }

  /**
   * Anime search by name
   */
  async searchAnime(query) {
    try {
      // Ab yeh seedha banega: https://hianime-api-seven-teal.vercel.app/search?q=solo
      const { data } = await axios.get(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`);
      return data;
    } catch (error) {
      logger.error(`HiAnime Search Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get Episode List
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
   */
  async getEpisodeSources(episodeId) {
    try {
      const { data } = await axios.get(`${this.baseUrl}/anime/episode-srcs?id=${episodeId}`);
      return data;
    } catch (error) {
      logger.error(`HiAnime Source Error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new HiAnimeService();
