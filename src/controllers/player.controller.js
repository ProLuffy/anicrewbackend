const Episode = require('../models/Episode.model');
const hianimeService = require('../services/hianime.service');

exports.getEpisodeData = async (req, res, next) => {
  try {
    const { episodeId } = req.params;

    const episode = await Episode.findById(episodeId).populate('seriesId');
    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }

    // 🎥 PRIMARY VIDEO (HiAnime – Live Fetch)
    let videoUrl = null;
    let videoSource = 'hianime';

    try {
      const sources = await hianimeService.getEpisodeSources(
        episode.hianimeEpisodeId
      );

      videoUrl = sources?.sources?.find(s => s.url.includes('m3u8'))?.url;
    } catch (err) {
      console.warn('⚠️ HiAnime stream failed, checking TPX fallback');
    }

    // 🏴‍☠️ TPX FALLBACK (Hard-sub override)
    if (!videoUrl && episode.hasTPXOverride && episode.tpxData?.driveUrl) {
      videoUrl = episode.tpxData.driveUrl;
      videoSource = 'tpx';
    }

    if (!videoUrl) {
      return res.status(503).json({ message: 'No playable source available' });
    }

    // 🔊 AUDIO TRACKS
    const audioTracks = [];
    for (const [lang, source] of Object.entries(episode.audioSources || {})) {
      if (!source) continue;

      if (source === 'hianime') {
        audioTracks.push({
          lang,
          type: 'embedded'
        });
      } else {
        audioTracks.push({
          lang,
          type: 'external',
          url: source
        });
      }
    }

    // 📝 SUBTITLES
    const subtitles = [];
    for (const [lang, src] of Object.entries(episode.subtitleSources || {})) {
      if (!src) continue;

      subtitles.push({
        lang,
        type: src === 'hianime' ? 'embedded' : 'external',
        url: src === 'hianime' ? null : src
      });
    }

    // 🎯 FINAL PLAYER PAYLOAD
    return res.json({
      title: `${episode.seriesId.title} - EP ${episode.number}`,
      episode: episode.number,

      video: {
        source: videoSource,
        type: videoSource === 'hianime' ? 'hls' : 'mp4',
        url: videoUrl
      },

      audio: audioTracks,
      subtitles,

      meta: {
        availableLanguages: episode.availableLanguages || [],
        availableSubtitles: episode.availableSubtitles || [],
        hasTPXOverride: episode.hasTPXOverride
      }
    });

  } catch (error) {
    next(error);
  }
};
