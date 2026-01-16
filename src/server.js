require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db.config');
const http = require('http');

// Initialize Database
connectDB();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`
  ################################################
  🚀 Server listening on port: ${PORT}
  guarded by Admin: ${process.env.ADMIN_API_KEY ? 'YES' : 'NO'}
  Environment: ${process.env.NODE_ENV}
  ################################################
  `);
});

// Handle Unhandled Rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
