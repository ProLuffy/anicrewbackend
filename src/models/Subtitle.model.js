const mongoose = require('mongoose');

const subtitleSchema = new mongoose.Schema({
  episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode', required: true },
  language: { type: String, default: 'Hindi' },
  format: { type: String, enum: ['vtt', 'srt'], default: 'vtt' },
  source: { type: String, default: 'gemini' }, // gemini, tpx-meta
  
  // File Path (Local or Drive)
  driveFileId: { type: String },
  localPath: { type: String }, // For temporary serving
  
  isApproved: { type: Boolean, default: false } // Admin check
}, { timestamps: true });

module.exports = mongoose.model('Subtitle', subtitleSchema);
