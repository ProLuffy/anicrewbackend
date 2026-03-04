const axios = require('axios');
const logger = require('../utils/logger');

class HiAnimeService {
  constructor() {
    // API Base URL
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
    // 🧠 MULTI-PATH FALLBACK ENGINE: Koi na koi rasta chalega hi!
    const urlsToTry = [
      `${this.baseUrl}/episodes/${animeId}`,
      `${this.baseUrl}/anime/${animeId}/episodes`,
      `https://hianime-api-seven-teal.vercel.app/api/v2/hianime/anime/${animeId}/episodes`
    ];

    let lastError = null;

    for (const url of urlsToTry) {
      try {
        const { data } = await axios.get(url);
        
        let eps = [];
        if (data && data.data && data.data.episodes) eps = data.data.episodes;
        else if (data && data.episodes) eps = data.episodes;
        else eps = data;

        // 🛠️ Ensure perfect format for your controller
        if (Array.isArray(eps)) {
            return eps.map((ep, i) => ({
                id: ep.id || ep.episodeId || ep.episode_id,
                episodeNumber: ep.number || ep.episodeNumber || ep.episode_no || (i + 1)
            }));
        }
      } catch (error) {
        lastError = error;
        continue; // Error aaya? Doosra rasta try karo!
      }
    }
    
    // Agar sab fail ho gaye
    logger.error(`🔴 All HiAnime Episode URLs Failed! Last Error: ${lastError.message}`);
    throw new Error(`Episodes API is returning 404 for ${animeId}`);
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
