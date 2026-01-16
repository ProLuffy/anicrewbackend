const mongoose = require('mongoose');

const audioTrackSchema = new mongoose.Schema({
  episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode', required: true },
  source: { type: String, default: 'desidub' },
  language: { type: String, required: true, default: 'Hindi' },
  
  // Google Drive File ID
  driveFileId: { type: String, required: true },
  duration: { type: Number }, // in seconds (sync ke liye)
  offset: { type: Number, default: 0 } // ms delay to sync with video
}, { timestamps: true });

module.exports = mongoose.model('AudioTrack', audioTrackSchema);
