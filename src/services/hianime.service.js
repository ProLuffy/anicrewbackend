const axios = require('axios');
const logger = require('../utils/logger');

class HiAnimeService {
  constructor() {
    const domain = process.env.HIANIME_API_URL || 'https://hianimeapi-1vww.onrender.com';
    this.baseUrl = `${domain}/api/v1`;
  }

  async searchAnime(query) {
    try {
      const { data } = await axios.get(`${this.baseUrl}/search?keyword=${encodeURIComponent(query)}`);
      
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

  async getEpisodes(animeId) {
    try {
      // 🚀 Nayi Render API ka exact rasta
      const { data } = await axios.get(`${this.baseUrl}/episodes/${animeId}`);
      
      let eps = [];
      
      // 🧠 SMART PARSER: Nayi API ka data nikalne ka sahi tarika
      if (data && Array.isArray(data.data)) {
          eps = data.data; // Nayi Render API
      } else if (data && data.data && Array.isArray(data.data.episodes)) {
          eps = data.data.episodes; // Purani API fallback
      }

      if (eps.length > 0) {
          return eps.map((ep, i) => ({
              id: ep.id || ep.episodeId || ep.episode_id,
              episodeNumber: ep.number || ep.episodeNumber || ep.episode_no || (i + 1)
          }));
      }
      
      throw new Error("Episodes array khali hai ya format match nahi hua!");
    } catch (error) {
      logger.error(`HiAnime Episode List Error: ${error.message}`);
      throw error;
    }
  }

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
