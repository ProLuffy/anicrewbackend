const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { PATHS } = require('./config/constants');
const fs = require('fs');

// Import Routes
const adminRoutes = require('./routes/admin.routes');
const extractRoutes = require('./routes/extract.routes');
const subtitleRoutes = require('./routes/subtitle.routes');
const publicRoutes = require('./routes/public.routes');

// Import Middleware
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();

// Ensure temp directories exist
if (!fs.existsSync(PATHS.DOWNLOADS)) fs.mkdirSync(PATHS.DOWNLOADS);
if (!fs.existsSync(PATHS.SUBTITLES)) fs.mkdirSync(PATHS.SUBTITLES);

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // Logger

// Static folders for subtitles (Soft-sub access)
app.use('/subtitles', express.static(path.join(__dirname, '../subtitles')));

// Route Mounting
app.use('/api/admin', adminRoutes);
app.use('/api/extract', extractRoutes);
app.use('/api/subtitle', subtitleRoutes);
app.use('/api/public', publicRoutes);

// Health Check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'active', system: 'AniCrew Backend' });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
