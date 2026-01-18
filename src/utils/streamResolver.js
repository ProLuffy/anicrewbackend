exports.resolveStream = (episodeData, userLang = 'japanese', userType = 'sub') => {
  const lang = userLang.toLowerCase();
  const type = userType.toLowerCase();
  const response = { streamUrl: '', playerMode: 'standard', audioTrack: null, subtitleTrack: null };

  // 1. TPX Override
  if (type === 'sub' && episodeData.videoSources.tpx && episodeData.videoSources.tpx.url && episodeData.videoSources.tpx.lang === lang) {
    return {
      streamUrl: episodeData.videoSources.tpx.url,
      streamType: 'mp4',
      playerMode: 'override'
    };
  }

  // 2. Default Video
  response.streamUrl = episodeData.videoSources.hianime.url;

  // 3. Audio Logic
  if (episodeData.audioSources[lang] && episodeData.audioSources[lang] !== 'hianime') {
    response.audioTrack = { type: 'external', url: episodeData.audioSources[lang], lang };
    response.playerMode = 'hybrid';
  } else {
    response.audioTrack = { type: 'internal', lang: 'japanese' };
  }

  // 4. Subtitle Logic
  if (episodeData.subtitleSources[lang] && episodeData.subtitleSources[lang] !== 'hianime') {
    response.subtitleTrack = { type: 'external', url: episodeData.subtitleSources[lang], lang };
  }

  return response;
};
