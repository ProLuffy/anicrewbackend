const mongoose = require('mongoose');

const EpisodeSchema = new mongoose.Schema({
  seriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'Series', required: true },
  
  // Basic Info
  title: { type: String },
  number: { type: Number, required: true },
  hianimeEpisodeId: { type: String, required: true }, // Key for scraping
  
  // 🎥 VIDEO SOURCES
  videoSources: {
    hianime: {
        url: { type: String }, 
        type: { type: String, default: 'hls' } 
    },
    tpx: { 
        url: { type: String }, // Full Override video
        lang: { type: String, default: 'hindi' },
        type: { type: String, default: 'mp4' }
    }
  },

  // 🔊 AUDIO SOURCES (Map: lang -> url/source)
  audioSources: {
    japanese: { type: String, default: 'hianime' }, // Embedded
    english: { type: String, default: 'hianime' },
    hindi: { type: String }, // External URL
    tamil: { type: String }
  },

  // 📝 SUBTITLE SOURCES
  subtitleSources: {
    english: { type: String, default: 'hianime' },
    hindi: { type: String } // VTT URL
  },

  // Metadata for Frontend UI
  availableLanguages: [{ type: String }], // e.g. ['japanese', 'english', 'hindi']
  availableSubtitles: [{ type: String }], // e.g. ['english', 'hindi']

  // Flags for Worker Optimization
  isProcessed: { type: Boolean, default: false },
  hasExternalAudio: { type: Boolean, default: false },
  hasTPXOverride: { type: Boolean, default: false }

}, { timestamps: true });

// Prevent duplicate episodes
EpisodeSchema.index({ seriesId: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Episode', EpisodeSchema);
