const axios = require('axios');
const logger = require('../utils/logger');

class HiAnimeService {
  constructor() {
    // Teri OLD Render API + /api/v1
    const domain = process.env.HIANIME_API_URL || 'https://hianimeapi-1vww.onrender.com';
    this.baseUrl = `${domain}/api/v1`;

    // 🚀 Server ko jagaye rakhne wali motor chalu kar di
    this.startKeepAlive();
  }

  /**
   * Anti-Sleep / Keep-Alive Motor
   */
  startKeepAlive() {
    // Har 5 minute (300,000 milliseconds) me ek request bhejega
    setInterval(async () => {
      try {
        // '/home' endpoint par halki si request bhejte hain API ko jagane ke liye
        await axios.get(`${this.baseUrl}/home`);
        logger.info('🟢 HiAnime API Keep-Alive Ping: Server is awake!');
      } catch (error) {
        logger.error(`🔴 HiAnime API Keep-Alive Ping Failed: ${error.message}`);
      }
    }, 5 * 60 * 1000); // 5 mins in milliseconds
  }

  /**
   * Anime search by name
   */
  async searchAnime(query) {
    try {
      const { data } = await axios.get(`${this.baseUrl}/search?keyword=${encodeURIComponent(query)}`);
      
      // UI ke hisaab se data format karna
      let animesList = [];
      if (data && data.data && data.data.response) {
         animesList = data.data.response.map(item => ({
             id: item.id,
             name: item.title,  
             poster: item.poster
         }));
      }
      return { animes: animesList }; 

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
      const { data } = await axios.get(`${this.baseUrl}/episodes/${animeId}`);
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
      const { data } = await axios.get(`${this.baseUrl}/stream?id=${episodeId}`);
      return data;
    } catch (error) {
      logger.error(`HiAnime Source Error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new HiAnimeService();
