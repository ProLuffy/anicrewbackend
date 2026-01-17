/**
 * HYBRID STREAM RESOLVER ENGINE
 * * Modes:
 * 1. 'standard': Use HiAnime Video + Embedded Audio
 * 2. 'hybrid': Use HiAnime Video + External Audio Overlay (Sync required)
 * 3. 'override': Ignore HiAnime, play TPX full video directly
 */
exports.resolveStream = (episodeData, userLang = 'japanese', userType = 'sub') => {
  // Normalize inputs
  const lang = userLang.toLowerCase();
  const type = userType.toLowerCase();

  const response = {
    streamUrl: '',
    streamType: 'hls',
    audioTrack: null,
    subtitleTrack: null,
    playerMode: 'standard' 
  };

  // 🛑 RULE 1: FULL VIDEO OVERRIDE (TPX)
  // Condition: User wants Hindi Subbed AND TPX override exists for that language
  if (
    type === 'sub' && 
    episodeData.videoSources.tpx && 
    episodeData.videoSources.tpx.url &&
    episodeData.videoSources.tpx.lang === lang
  ) {
    return {
      streamUrl: episodeData.videoSources.tpx.url,
      streamType: episodeData.videoSources.tpx.type || 'mp4',
      playerMode: 'override', // Frontend: Play directly, hide audio/sub switch
      meta: { source: 'tpx' }
    };
  }

  // 🟢 RULE 2: DEFAULT HIANIME VIDEO
  if (!episodeData.videoSources.hianime || !episodeData.videoSources.hianime.url) {
    throw new Error("Primary HiAnime video source missing");
  }

  response.streamUrl = episodeData.videoSources.hianime.url;
  response.streamType = episodeData.videoSources.hianime.type || 'hls';

  // 🔊 RULE 3: AUDIO SELECTION
  if (episodeData.audioSources[lang] === 'hianime') {
    // INTERNAL AUDIO
    response.audioTrack = { type: 'internal', lang: lang };
    response.playerMode = 'standard';
  } 
  else if (episodeData.audioSources[lang]) {
    // EXTERNAL AUDIO (Hybrid Mode)
    response.audioTrack = { 
      type: 'external', 
      url: episodeData.audioSources[lang],
      lang: lang 
    };
    response.playerMode = 'hybrid'; // Frontend: Enable audio sync logic
  } 
  else {
    // FALLBACK (Default to Japanese)
    response.audioTrack = { type: 'internal', lang: 'japanese' };
    response.playerMode = 'standard';
  }

  // 📝 RULE 4: SUBTITLE SELECTION
  if (episodeData.subtitleSources[lang] === 'hianime') {
    response.subtitleTrack = { type: 'internal', lang: lang };
  } else if (episodeData.subtitleSources[lang]) {
    response.subtitleTrack = { 
      type: 'external', 
      url: episodeData.subtitleSources[lang],
      lang: lang 
    };
  }

  return response;
};
