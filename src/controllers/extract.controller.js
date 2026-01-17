const Episode = require('../models/Episode.model');
const { resolveStream } = require('../utils/streamResolver');

exports.getStreamData = async (req, res) => {
  try {
    const { episodeId } = req.query;
    const lang = (req.query.lang || 'japanese').toLowerCase();
    const type = (req.query.type || 'sub').toLowerCase();

    if (!episodeId) return res.status(400).json({ message: "Missing episodeId" });

    const episode = await Episode.findById(episodeId);
    if (!episode) return res.status(404).json({ message: "Episode not found" });

    // 🧠 Execute Decision Engine
    const streamData = resolveStream(episode, lang, type);

    // Send optimized payload
    res.json({
      success: true,
      data: streamData,
      ui: {
        title: episode.title,
        number: episode.number,
        availableLanguages: episode.availableLanguages || ['japanese'],
        availableSubtitles: episode.availableSubtitles || ['english']
      }
    });

  } catch (error) {
    console.error("Stream Resolution Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
