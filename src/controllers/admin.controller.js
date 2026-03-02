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
// Get Queue Counts (Real-time monitoring)
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

// Proxy to search HiAnime from the Admin UI
exports.searchAnimeForImport = async (req, res) => {
try {
const query = req.query.q;
const results = await hianimeService.searchAnime(query);
const animes = results.data?.animes || results.animes || [];
res.json({ success: true, data: animes });
} catch (error) {
res.status(500).json({ success: false, error: error.message });
}
};

// Serve the Admin UI HTML
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
              <input type="text" id="searchInput" class="input-box" placeholder="Anime Name (e.g. Naruto)">
              <button onclick="searchAnime()" class="btn btn-red" style="height: 45px;">Search</button>
          </div>


      <div id="statusBox" class="error-text"></div>
      <div id="resultsGrid" class="grid"></div>
  </div>


  <script>
      const urlParams = new URLSearchParams(window.location.search);
      const apiKey = urlParams.get('apiKey') || '';
      const authQuery = apiKey ? \`&apiKey=\${apiKey}\` : '';
      const statusBox = document.getElementById('statusBox');

      async function searchAnime() {
          const query = document.getElementById('searchInput').value;
          if(!query) return;
          statusBox.innerHTML = '<span style="color: #facc15;">⏳ Scanning Databases...</span>';
          document.getElementById('resultsGrid').innerHTML = '';
          try {
              const res = await fetch(\`/api/admin/search?q=\${encodeURIComponent(query)}\${authQuery}\`);
              const json = await res.json();
              if(res.ok && json.success) {
                  statusBox.innerHTML = '';
                  renderResults(json.data);
              } else {
                  statusBox.innerText = '❌ Error: ' + (json.message || 'API rejected. Missing API Key?');
              }
          } catch(e) { statusBox.innerText = '❌ Critical Error: ' + e.message; }
      }


      function renderResults(animes) {
          const grid = document.getElementById('resultsGrid');
          grid.innerHTML = animes.map(anime => \`
              <div class="card">
                  <img src="\${anime.poster}" alt="Poster">
                  <h3 style="font-size: 14px; margin-bottom: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${anime.name}</h3>
                  <input type="number" id="season-\${anime.id}" value="1" class="input-box" style="padding: 5px; margin-bottom: 10px;" placeholder="Season">
                  <div>
                      <button onclick="importData(this, '\${anime.id}', '\${anime.name.replace(/'/g, "\\\\'")}', 'tpx')" class="btn btn-blue" style="font-size: 12px;">📥 Import TPX (Sub)</button>
                      <button onclick="importData(this, '\${anime.id}', '\${anime.name.replace(/'/g, "\\\\'")}', 'desidub')" class="btn btn-green" style="font-size: 12px;">📥 Import DesiDub (Dub)</button>
                  </div>
                  <div id="log-\${anime.id}" style="font-size: 11px; margin-top: 8px; color: #facc15;"></div>
              </div>
          \`).join('');
      }


      async function importData(btnElement, hianimeId, animeName, sourceType) {
          const season = document.getElementById(\`season-\${hianimeId}\`).value || 1;
          const logBox = document.getElementById(\`log-\${hianimeId}\`);
          btnElement.disabled = true; btnElement.style.opacity = '0.5';
          logBox.innerText = '⚙️ Queuing ' + sourceType.toUpperCase() + '...';
          try {
              const res = await fetch(\`/api/extract/start?apiKey=\${apiKey}\`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ hianimeId, animeName, season: parseInt(season), sourceType })
              });
              const data = await res.json();
              if(res.ok && data.success) {
                  logBox.style.color = '#4ade80'; logBox.innerText = '✅ ' + (data.message || 'Queued!');
              } else { throw new Error(data.message || 'Import failed'); }
          } catch(e) {
              logBox.style.color = '#ef4444'; logBox.innerText = '❌ ' + e.message;
              btnElement.disabled = false; btnElement.style.opacity = '1';
          }
      }
  </script>

</body>
</html>
`;
res.send(html);
};