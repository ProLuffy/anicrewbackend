const mongoose = require('mongoose');

const SeriesSchema = new mongoose.Schema({
  hianimeId: { type: String, required: true, unique: true },
  title: { type: String, required: true }, // Series ka naam auto-save hoga
  totalEpisodes: { type: Number, default: 0 },
  
  // 🔥 Status Flag: Taaki dobara extract na ho
  extractionStatus: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
  lastProcessedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Series', SeriesSchema);
