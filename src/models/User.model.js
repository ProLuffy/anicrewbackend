const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
username: { type: String, required: true, unique: true },
email: { type: String, required: true, unique: true },
password: { type: String, required: true },
continueWatching: [{
animeId: { type: String },
title: { type: String },
poster: { type: String },
episodeNumber: { type: Number },
timestamp: { type: Number, default: 0 },
lastWatchedAt: { type: Date, default: Date.now }
}],
watchlist: [{
animeId: { type: String },
title: { type: String },
poster: { type: String },
addedAt: { type: Date, default: Date.now }
}]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);