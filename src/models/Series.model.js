const mongoose = require('mongoose');

const seriesSchema = new mongoose.Schema({
  hianimeId: { type: String, required: true, unique: true }, // e.g., "solo-leveling-123"
  title: { type: String, required: true },
  description: String,
  poster: String,
  totalEpisodes: { type: Number, default: 0 },
  type: { type: String, default: 'TV' }, // TV, Movie, OVA
  isOngoing: { type: Boolean, default: false },
  lastSync: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Series', seriesSchema);
