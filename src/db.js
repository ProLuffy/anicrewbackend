const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected');
    } catch (err) {
        console.error('❌ DB Error:', err);
        process.exit(1);
    }
};

const SeriesSchema = new mongoose.Schema({
    title: { type: String, required: true, unique: true },
    poster: String,
    totalEpisodes: Number
});

const EpisodeSchema = new mongoose.Schema({
    seriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'Series' },
    episodeNumber: { type: Number, required: true },
    title: String,
    
    // Flags
    hasHiAnime: { type: Boolean, default: false }, // Clean Video
    hasTPX: { type: Boolean, default: false },     // Hindi Subbed Video
    hasAudio: { type: Boolean, default: false },   // Hindi Audio
    
    isPublished: { type: Boolean, default: false }
});
EpisodeSchema.index({ seriesId: 1, episodeNumber: 1 }, { unique: true });

// Stores BOTH TPX and HiAnime videos separately
const VideoSourceSchema = new mongoose.Schema({
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode' },
    quality: { type: String, default: '1080p' },
    fileId: String, // GDrive ID
    source: { type: String, enum: ['hianime', 'tpx'], required: true } 
});

const AudioTrackSchema = new mongoose.Schema({
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode' },
    language: { type: String, default: 'Hindi' },
    fileId: String, // GDrive ID
    source: { type: String, default: 'desidub' },
    offset: { type: Number, default: 0 }
});

module.exports = {
    connectDB,
    Series: mongoose.model('Series', SeriesSchema),
    Episode: mongoose.model('Episode', EpisodeSchema),
    VideoSource: mongoose.model('VideoSource', VideoSourceSchema),
    AudioTrack: mongoose.model('AudioTrack', AudioTrackSchema)
};
