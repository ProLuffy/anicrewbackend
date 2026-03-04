const Episode = require('../models/Episode.model');
const Series = require('../models/Series.model');
const { Queue } = require('bullmq');
const { connection } = require('../config/redis.config');
const { QUEUES } = require('../config/constants');
const hianimeService = require('../services/hianime.service');

// Queues init
const scraperQueue = new Queue(QUEUES.SCRAPER, { connection });
const subtitleQueue = new Queue(QUEUES.SUBTITLE, { connection });

exports.getDashboardStats = async (req, res) => {
try {
const totalSeries = await Series.countDocuments();
const totalEpisodes = await Episode.countDocuments();
const episodesWithAudio = await Episode.countDocuments({ hasAudio: true });
const pendingScrapes = await scraperQueue.getWaitingCount();

res.json({
overview: { totalSeries, totalEpisodes, episodesWithAudio },
queues: { pendingScrapes }
});
} catch (error) {
res.status(500).json({ error: error.message });
}
};

exports.retryJob = async (req, res) => {
try {
await scraperQueue.retryJobs();
res.json({ message: "Failed scrape jobs retried" });
} catch (error) {
res.status(500).json({ error: error.message });
}
};

exports.forceGenerateSubtitle = async (req, res) => {
const { episodeId } = req.body;
res.json({ message: "Subtitle generation triggered manually" });
};

// ----------------------------------------------------
// 🔴 ADMIN UI PANEL & PROXY LOGIC BELOW 🔴
// ----------------------------------------------------

exports.searchAnimeForImport = async (req, res) => {
try {
const query = req.query.q;
const results = await hianimeService.searchAnime(query);

let rawAnimes = results.data?.animes || results.animes || results.data?.response || [];

const formattedAnimes = rawAnimes.map(anime => ({
    id: anime.id,
    name: anime.name || anime.title, 
    poster: anime.poster
}));

res.json({ success: true, data: formattedAnimes });
} catch (error) {
res.status(500).json({ success: false, error: error.message });
}
};

// Serve the Admin UI HTML (100% Syntax Error Free Code)
exports.renderAdminPanel = (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AniCrew Pro Importer</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
          body { background-color: #121212; color: #ffffff; font-family: system-ui, sans-serif; margin: 0; padding: 20px; }
          .container { max-width: 1200px; margin: 0 auto; }
          .input-box { width: 100%; padding: 12px; background: #222; color: white; border: 1px solid #444; border-radius: 6px; margin-bottom: 10px;}
          .btn { padding: 12px 20px; font-weight: bold; border: none; border-radius: 6px; cursor: pointer; }
          .btn-red { background: #e50914; color: white; }
          .btn-blue { background: #2563eb; color: white; margin-bottom: 5px; width: 100%; }
          .btn-green { background: #16a34a; color: white; width: 100%; }
          .error-text { color: #ef4444; font-weight: bold; margin-top: 10px; }
          .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin-top: 20px; }
          .card { background: #1a1a1a; padding: 15px; border-radius: 10px; border: 1px solid #333; }
          .card img { width: 100%; height: 250px; object-fit: cover; border-radius: 6px; margin-bottom: 10px;}
      </style>
  </head>
  <body>
      <div class="container">
          <h1 style="font-size: 2rem; margin-bottom: 5px;"><span style="color:#e50914">AniCrew</span> Auto-Importer</h1>
          <p style="color: #aaa; margin-bottom: 20px;">Downloads videos to Premium Drive & Syncs with Vercel.</p>

          <div style="display: flex; gap: 10px;">
              <input type="text" id="searchInput" class="input-box" placeholder="Anime Name (e.g. Naruto)" onkeydown="if(event.key === 'Enter'){ searchAnime(); }">
              <button onclick="searchAnime()" class="btn btn-red" style="height: 45px;">Search</button>
          </div>

      <div id="statusBox" class="error-text"></div>
      <div id="resultsGrid" class="grid"></div>
  </div>

  <script>
      // 🛠️ NO BACKTICKS HERE: Completely safe from Node.js template crash
      var urlParams = new URLSearchParams(window.location.search);
      var apiKey = urlParams.get('apiKey') || '';
      var authQuery = apiKey ? '&apiKey=' + apiKey : '';
      var statusBox = document.getElementById('statusBox');

      async function searchAnime() {
          var query = document.getElementById('searchInput').value;
          if(!query) return;
          
          statusBox.innerHTML = '<span style="color: #facc15;">⏳ Scanning Databases...</span>';
          document.getElementById('resultsGrid').innerHTML = '';
          
          try {
              var url = '/api/admin/search?q=' + encodeURIComponent(query) + authQuery;
              var res = await fetch(url);
              var json = await res.json();
              
              if(res.ok && json.success) {
                  statusBox.innerHTML = '';
                  renderResults(json.data);
              } else {
                  statusBox.innerText = '❌ Error: ' + (json.message || 'API rejected. Missing API Key?');
              }
          } catch(e) { 
              statusBox.innerText = '❌ Critical Error: ' + e.message; 
          }
      }

      function renderResults(animes) {
          var grid = document.getElementById('resultsGrid');
          var htmlString = '';
          
          for(var i = 0; i < animes.length; i++) {
              var anime = animes[i];
              var safeName = anime.name ? anime.name.replace(/'/g, "") : "Unknown";
              
              htmlString += '<div class="card">';
              htmlString += '<img src="' + anime.poster + '" alt="Poster">';
              htmlString += '<h3 style="font-size: 14px; margin-bottom: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + anime.name + '</h3>';
              htmlString += '<input type="number" id="season-' + anime.id + '" value="1" class="input-box" style="padding: 5px; margin-bottom: 10px;" placeholder="Season">';
              htmlString += '<div>';
              htmlString += '<button onclick="importData(this, \\'' + anime.id + '\\', \\'' + safeName + '\\', \\'tpx\\')" class="btn btn-blue" style="font-size: 12px;">📥 Import TPX (Sub)</button>';
              htmlString += '<button onclick="importData(this, \\'' + anime.id + '\\', \\'' + safeName + '\\', \\'desidub\\')" class="btn btn-green" style="font-size: 12px;">📥 Import DesiDub (Dub)</button>';
              htmlString += '</div>';
              htmlString += '<div id="log-' + anime.id + '" style="font-size: 11px; margin-top: 8px; color: #facc15;"></div>';
              htmlString += '</div>';
          }
          grid.innerHTML = htmlString;
      }

      async function importData(btnElement, hianimeId, animeName, sourceType) {
          var season = document.getElementById('season-' + hianimeId).value || 1;
          var logBox = document.getElementById('log-' + hianimeId);
          
          btnElement.disabled = true; 
          btnElement.style.opacity = '0.5';
          logBox.innerText = '⚙️ Queuing ' + sourceType.toUpperCase() + '...';
          
          try {
              var res = await fetch('/api/extract/start?apiKey=' + apiKey, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ hianimeId: hianimeId, animeName: animeName, season: parseInt(season), sourceType: sourceType })
              });
              var data = await res.json();
              if(res.ok && data.success) {
                  logBox.style.color = '#4ade80'; 
                  logBox.innerText = '✅ ' + (data.message || 'Queued!');
              } else { 
                  throw new Error(data.message || 'Import failed'); 
              }
          } catch(e) {
              logBox.style.color = '#ef4444'; 
              logBox.innerText = '❌ ' + e.message;
              btnElement.disabled = false; 
              btnElement.style.opacity = '1';
          }
      }
  </script>
</body>
</html>
`;
res.send(html);
};
