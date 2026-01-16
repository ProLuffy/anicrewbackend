const mongoose = require('mongoose');

const videoSourceSchema = new mongoose.Schema({
  episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode', required: true },
  source: { type: String, enum: ['hianime', 'tpx'], required: true },
  quality: { type: String, default: '1080p' }, // 1080p, 720p
  type: { type: String, enum: ['stream', 'file'], default: 'stream' },
  
  // Agar stream hai (HiAnime)
  streamUrl: { type: String }, 
  
  // Agar file hai (TPX stored in Drive)
  driveFileId: { type: String },
  fileSize: { type: Number } // in bytes
}, { timestamps: true });

module.exports = mongoose.model('VideoSource', videoSourceSchema);
