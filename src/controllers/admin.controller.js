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
          .error-text { font-weight: bold; margin-top: 10px; padding: 10px; border-radius: 5px; }
          .grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin-top: 20px; }
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
              <button onclick="searchAnime()" class="btn btn-red" style="height: 48px; min-width: 100px;">Search</button>
          </div>

          <div id="statusBox" class="error-text" style="display:none;"></div>
          <div id="resultsGrid" class="grid-layout"></div>
      </div>

      <script>
          const urlParams = new URLSearchParams(window.location.search);
          const apiKey = urlParams.get('apiKey') || '';

          async function searchAnime() {
              const query = document.getElementById('searchInput').value.trim();
              if(!query) {
                  alert("Bhai, anime ka naam toh daal!");
                  return;
              }

              const statusBox = document.getElementById('statusBox');
              const grid = document.getElementById('resultsGrid');

              statusBox.style.display = 'block';
              statusBox.style.backgroundColor = '#333';
              statusBox.style.color = '#facc15';
              statusBox.innerText = '⏳ Searching HiAnime for: ' + query + '...';
              grid.innerHTML = '';

              try {
                  const endpoint = "/api/admin/search?q=" + encodeURIComponent(query) + "&apiKey=" + apiKey;
                  const res = await fetch(endpoint);
                  const json = await res.json();

                  if(res.ok && json.success && json.data.length > 0) {
                      statusBox.style.display = 'none';
                      renderResults(json.data);
                  } else {
                      statusBox.style.backgroundColor = '#450a0a';
                      statusBox.style.color = '#ef4444';
                      statusBox.innerText = '❌ Error: ' + (json.message || 'Anime nahi mila.');
                  }
              } catch(e) {
                  statusBox.style.backgroundColor = '#450a0a';
                  statusBox.style.color = '#ef4444';
                  statusBox.innerText = '❌ Critical Error: Backend se connection tut gaya.';
              }
          }

          function renderResults(animes) {
              const grid = document.getElementById('resultsGrid');
              let htmlStr = '';
              for(let i=0; i<animes.length; i++) {
                  const anime = animes[i];
                  const safeName = anime.name.replace(/'/g, "\\\\'");
                  htmlStr += '<div class="card">';
                  htmlStr += '<img src="' + anime.poster + '" alt="Poster" onerror="this.src=\\'https://via.placeholder.com/200x300?text=No+Image\\'">';
                  htmlStr += '<h3 style="font-size: 14px; margin-bottom: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="' + anime.name + '">' + anime.name + '</h3>';
                  htmlStr += '<input type="number" id="season-' + anime.id + '" value="1" class="input-box" style="padding: 5px; margin-bottom: 10px;" placeholder="Season">';
                  htmlStr += '<div>';
                  htmlStr += '<button onclick="importData(this, \\'' + anime.id + '\\', \\'' + safeName + '\\', \\'tpx\\')" class="btn btn-blue" style="font-size: 12px;">📥 Import TPX (Sub)</button>';
                  htmlStr += '<button onclick="importData(this, \\'' + anime.id + '\\', \\'' + safeName + '\\', \\'desidub\\')" class="btn btn-green" style="font-size: 12px;">📥 Import DesiDub</button>';
                  htmlStr += '</div>';
                  htmlStr += '<div id="log-' + anime.id + '" style="font-size: 11px; margin-top: 8px; font-weight: bold;"></div>';
                  htmlStr += '</div>';
              }
              grid.innerHTML = htmlStr;
          }

          async function importData(btnElement, hianimeId, animeName, sourceType) {
              const season = document.getElementById("season-" + hianimeId).value || 1;
              const logBox = document.getElementById("log-" + hianimeId);
              btnElement.disabled = true;
              btnElement.style.opacity = '0.5';
              logBox.style.color = '#facc15';
              logBox.innerText = '⚙️ Queuing ' + sourceType.toUpperCase() + '...';

              try {
                  const endpoint = "/api/extract/start?apiKey=" + apiKey;
                  const res = await fetch(endpoint, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ hianimeId: hianimeId, animeName: animeName, season: parseInt(season), sourceType: sourceType })
                  });
                  const data = await res.json();
                  if(res.ok && data.success) {
                      logBox.style.color = '#4ade80'; logBox.innerText = '✅ Added to Queue!';
                  } else {
                      throw new Error(data.message || 'Import failed');
                  }
              } catch(e) {
                  logBox.style.color = '#ef4444'; logBox.innerText = '❌ ' + e.message;
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
