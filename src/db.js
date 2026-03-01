const mongoose = require('mongoose');


// Import actual models safely
const Series = require('./models/Series.model');
const Episode = require('./models/Episode.model');
const VideoSource = require('./models/VideoSource.model');
const AudioTrack = require('./models/AudioTrack.model');
const User = require('./models/User.model');

const connectDB = async () => {
try {
// Prevent multiple connections
if (mongoose.connection.readyState >= 1) return;
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected Successfully');
} catch (err) {
    console.error('❌ DB Error:', err);
    process.exit(1);
}

};

module.exports = {
connectDB,
Series,
Episode,
VideoSource,
AudioTrack,
User
};