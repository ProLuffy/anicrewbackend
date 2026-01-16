const Episode = require('../models/Episode.model');
const VideoSource = require('../models/VideoSource.model');
const AudioTrack = require('../models/AudioTrack.model');
const Subtitle = require('../models/Subtitle.model');
const hianimeService = require('../services/hianime.service');

exports.getEpisodeData = async (req, res, next) => {
  try {
    const { episodeId } = req.params; // Internal MongoDB ID

    // 1. Fetch Episode Metadata
    const episode = await Episode.findById(episodeId).populate('seriesId');
    if (!episode) return res.status(404).json({ message: "Episode not found" });

    // 2. Get Live HiAnime Stream (Video)
    // Hum DB me stream URL store nahi karte kyunki wo expire hote hain
    let videoUrl = null;
    try {
        const sources = await hianimeService.getEpisodeSources(episode.hianimeEpisodeId);
        // Logic to pick best m3u8 (usually first one or 'master')
        videoUrl = sources.sources[0].url; 
    } catch (e) {
        console.error("HiAnime fetch failed, looking for TPX fallback");
    }

    // 3. Get Audio Tracks (Drive)
    const audioTracks = await AudioTrack.find({ episodeId: episode._id });

    // 4. Get Subtitles (Gemini/Local)
    const subtitles = await Subtitle.find({ episodeId: episode._id });

    // 5. Get Fallback Video (TPX Hardsub)
    const fallback = await VideoSource.findOne({ episodeId: episode._id, source: 'tpx' });

    // 6. Construct Player JSON
    res.status(200).json({
      title: `${episode.seriesId.title} - EP ${episode.number}`,
      video: {
        source: 'hianime',
        url: videoUrl,
        fallbackUrl: fallback ? `https://drive.google.com/uc?id=${fallback.driveFileId}` : null
      },
      audio: audioTracks.map(track => ({
        lang: track.language,
        url: `https://drive.google.com/uc?export=download&id=${track.driveFileId}`,
        offset: track.offset
      })),
      subtitles: subtitles.map(sub => ({
        lang: sub.language,
        url: `/subtitles/${sub.localPath}`, // Served statically
        type: sub.format
      }))
    });

  } catch (error) {
    next(error);
  }
};
