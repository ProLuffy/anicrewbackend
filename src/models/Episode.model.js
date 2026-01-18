const mongoose = require('mongoose');

const EpisodeSchema = new mongoose.Schema({
  // 🔗 RELATION
  seriesId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Series', 
    required: true 
  },

  // 📘 BASIC INFO
  title: { type: String },
  number: { type: Number, required: true },
  hianimeEpisodeId: { type: String, required: true }, // Key for HiAnime scraping

  // 🎥 VIDEO SOURCES
  videoSources: {
    hianime: {
      url: { type: String },        // m3u8
      type: { type: String, default: 'hls' }
    },
    tpx: {
      url: { type: String },        // Full hard-sub MP4 (override)
      lang: { type: String, default: 'hindi' },
      type: { type: String, default: 'mp4' }
    }
  },

  // 🔊 AUDIO SOURCES (lang → source/url)
  audioSources: {
    japanese: { type: String, default: 'hianime' }, // Embedded
    english: { type: String, default: 'hianime' },
    hindi: { type: String },   // External (DesiDub / extracted)
    tamil: { type: String }
  },

  // 📝 SUBTITLE SOURCES
  subtitleSources: {
    english: { type: String, default: 'hianime' },
    hindi: { type: String } // Generated / TPX / External VTT
  },

  // 🏴‍☠️ TPX DATA (Download + Override Pipeline)
  tpxData: {
    originalUrl: String,

    status: { 
      type: String, 
      enum: ['pending', 'resolving', 'downloading', 'uploaded', 'failed'], 
      default: 'pending' 
    },

    // 🔁 Retry & Debug
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
    resolvedAt: { type: Date },

    // 🔗 Extracted Host Links
    extractedLinks: {
      mirrored: String,
      mega: String,
      theta: String
    },

    // 📦 FINAL OUTPUT
    driveUrl: String,      // Google Drive / CDN
    fileSizeMB: Number,
    resolution: String    // 720p / 1080p
  },

  // 🎛️ FRONTEND HELPERS
  availableLanguages: [{ type: String }],   // ['japanese','english','hindi']
  availableSubtitles: [{ type: String }],   // ['english','hindi']

  // ⚙️ WORKER FLAGS
  isProcessed: { type: Boolean, default: false },
  hasExternalAudio: { type: Boolean, default: false },
  hasTPXOverride: { type: Boolean, default: false }

}, { timestamps: true });

// 🚫 Prevent duplicate episodes per series
EpisodeSchema.index({ seriesId: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Episode', EpisodeSchema);
