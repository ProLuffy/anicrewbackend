const Episode = require('../models/Episode.model');


exports.getEpisodeData = async (req, res) => {
try {
const { hianimeId } = req.query;
if (!hianimeId) {
    return res.status(400).json({ success: false, message: "hianimeId is required" });
}


// Query by HiAnime ID to match the Vercel frontend
const episode = await Episode.findOne({ hianimeId: hianimeId })
    .populate('audioTracks')
    .populate('subtitles');


// If episode not imported, tell frontend to fallback to HiAnime
if (!episode) {
return res.json({
success: false,
message: "Not imported in backend. Play directly from HiAnime."
});
}


// Return the Premium Google Drive links
res.json({
  success: true,
  source: "AniCrew Premium Drive",
  data: {
      title: episode.title,
      number: episode.number,
      hasAudio: episode.hasAudio,
      audioTracks: episode.audioTracks, // Drive links for Dub
      subtitles: episode.subtitles      // Drive links for Hindi Sub
  }
});

} catch (error) {
console.error("Player Controller Error:", error);
res.status(500).json({ success: false, message: "Server Error" });
}
};