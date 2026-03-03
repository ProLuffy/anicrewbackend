const axios = require('axios');
const logger = require('../utils/logger');

class HiAnimeService {
  constructor() {
    // Tera naya Vercel API Link
    this.baseUrl = process.env.HIANIME_API_URL || 'https://hianime-api-seven-teal.vercel.app';
  }

  /**
   * Anime search by name
   */
  async searchAnime(query) {
    try {
      // ✅ Yahan maine naya rasta lagaya hai: /search?q=
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
      // Hum assume kar rahe hain episodes ka rasta purana wala hi hoga, agar import fasa toh ise fix karenge
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
