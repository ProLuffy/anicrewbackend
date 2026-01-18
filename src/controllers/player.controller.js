const Episode = require('../models/Episode.model');
const { resolveStream } = require('../utils/streamResolver');

exports.getStreamData = async (req, res) => {
  try {
    const { episodeId, lang, type } = req.query;
    const episode = await Episode.findById(episodeId);
    
    if (!episode) return res.status(404).json({ message: "Not found" });

    const data = resolveStream(episode, lang, type);
    
    res.json({
      success: true, 
      data,
      ui: { title: episode.title, number: episode.number }
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
