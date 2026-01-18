const mongoose = require('mongoose');

const EpisodeSchema = new mongoose.Schema({
  seriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'Series', required: true },
  
  title: { type: String },
  number: { type: Number, required: true },
  hianimeEpisodeId: { type: String, required: true },
  
  // 🎥 VIDEO SOURCES
  videoSources: {
    hianime: {
        url: { type: String }, 
        type: { type: String, default: 'hls' } 
    },
    tpx: { 
        url: { type: String }, 
        lang: { type: String, default: 'hindi' },
        type: { type: String, default: 'mp4' }
    }
  },

  // 🔊 AUDIO SOURCES (Drive Links yahan aayenge)
  audioSources: {
    japanese: { type: String, default: 'hianime' },
    english: { type: String, default: 'hianime' },
    hindi: { type: String }, // Drive Link
    tamil: { type: String }
  },

  // 📝 SUBTITLES
  subtitleSources: {
    english: { type: String, default: 'hianime' },
    hindi: { type: String } // Drive Link
  },

  availableLanguages: [{ type: String }],
  
  isProcessed: { type: Boolean, default: false },
  hasExternalAudio: { type: Boolean, default: false },
  hasTPXOverride: { type: Boolean, default: false }

}, { timestamps: true });

EpisodeSchema.index({ seriesId: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Episode', EpisodeSchema);
