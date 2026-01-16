const mongoose = require('mongoose');

const episodeSchema = new mongoose.Schema({
  seriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'Series', required: true },
  hianimeEpisodeId: { type: String, required: true, unique: true }, // unique ID from your API
  number: { type: Number, required: true },
  title: { type: String },
  isFiller: { type: Boolean, default: false },
  
  // Flags to check status quickly
  hasVideo: { type: Boolean, default: true }, // HiAnime is default
  hasAudio: { type: Boolean, default: false }, // DesiDub
  hasHardSub: { type: Boolean, default: false }, // TPX
  hasSoftSub: { type: Boolean, default: false }  // Gemini
}, { timestamps: true });

// Compound index to ensure 1 episode number per series
episodeSchema.index({ seriesId: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Episode', episodeSchema);
