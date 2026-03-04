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

// Serve the Admin UI HTML (100% Mobile Safe + Popups)
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
          .input-box { width: 100%; padding: 12px; background: #222; color: white; border: 1px solid #444; border-radius: 6px; margin-bottom: 10px;}
          .btn { padding: 12px 20px; font-weight: bold; border: none; border-radius: 6px; cursor: pointer; }
          .btn-red { background: #e50914; color: white; }
          .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin-top: 20px; }
          .card { background: #1a1a1a; padding: 15px; border-radius: 10px; border: 1px solid #333; }
          .card img { width: 100%; height: 250px; object-fit: cover; border-radius: 6px; margin-bottom: 10px;}
      </style>
  </head>
  <body>
      <div style="max-width: 1200px; margin: 0 auto;">
          <h1 style="font-size: 2rem; margin-bottom: 5px;"><span style="color:#e50914">AniCrew</span> Auto-Importer</h1>
          <p style="color: #aaa; margin-bottom: 20px;">Downloads videos to Premium Drive & Syncs with Vercel.</p>

          <div style="display: flex; gap: 10px;">
              <input type="text" id="searchInput" class="input-box" placeholder="Anime Name (e.g. Naruto)" onkeydown="if(event.key === 'Enter'){ performSearch(); }">
              <button id="searchBtn" class="btn btn-red" style="height: 45px;" onclick="performSearch()">Search</button>
          </div>

          <div id="statusBox" style="color: #ef4444; font-weight: bold; margin-top: 10px;"></div>
          <div id="resultsGrid" class="grid"></div>
      </div>

  <script>
      // 🚨 MOBILE ALERT: Page load hotey hi popup aayega
      setTimeout(() => alert("✅ Panel Ready! Cache Clear Hai!"), 500);

      var urlParams = new URLSearchParams(window.location.search);
      var apiKey = urlParams.get('apiKey') || '';

      async function performSearch() {
          var searchInput = document.getElementById('searchInput');
          var statusBox = document.getElementById('statusBox');
          var resultsGrid = document.getElementById('resultsGrid');
          
          var query = searchInput.value.trim();
          
          if(!query) {
              alert("⚠️ Bhai pehle Anime ka naam toh likh!");
              return;
          }
          
          statusBox.innerHTML = '<span style="color: #facc15;">⏳ Scanning Databases...</span>';
          resultsGrid.innerHTML = '';
          
          try {
              var res = await fetch('/api/admin/search?q=' + encodeURIComponent(query) + '&apiKey=' + apiKey);
              var json = await res.json();
              
              if(res.ok && json.success) {
                  statusBox.innerHTML = '<span style="color: #4ade80;">✅ Fetched ' + json.data.length + ' results</span>';
                  renderCards(json.data);
              } else {
                  var errorMsg = json.message || 'Unknown API Error';
                  statusBox.innerHTML = '❌ Error: ' + errorMsg;
                  alert("❌ API Error: " + errorMsg);
              }
          } catch(e) { 
              statusBox.innerHTML = '❌ Critical Error: ' + e.message; 
              alert("❌ Code Phat Gaya: " + e.message);
          }
      }

      function renderCards(animes) {
          var resultsGrid = document.getElementById('resultsGrid');
          var htmlStr = "";

          for (var i = 0; i < animes.length; i++) {
              var anime = animes[i];
              var safeName = anime.name ? anime.name.replace(/'/g, "") : "Unknown";
              
              htmlStr += '<div class="card">';
              htmlStr += '<img src="' + anime.poster + '" alt="Poster">';
              htmlStr += '<h3 style="font-size: 14px; margin-bottom: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + anime.name + '</h3>';
              htmlStr += '<input type="number" id="season-' + anime.id + '" value="1" class="input-box" style="padding: 5px; margin-bottom: 10px;" placeholder="Season">';
              htmlStr += '<button onclick="importData(this, \\'' + anime.id + '\\', \\'' + safeName + '\\', \\'tpx\\')" class="btn import-btn" style="background: #2563eb; color: white; width: 100%; margin-bottom: 5px; font-size: 12px;">📥 Import TPX (Sub)</button>';
              htmlStr += '<button onclick="importData(this, \\'' + anime.id + '\\', \\'' + safeName + '\\', \\'desidub\\')" class="btn import-btn" style="background: #16a34a; color: white; width: 100%; font-size: 12px;">📥 Import DesiDub (Dub)</button>';
              htmlStr += '<div id="log-' + anime.id + '" style="font-size: 11px; margin-top: 8px; color: #facc15;"></div>';
              htmlStr += '</div>';
          }
          resultsGrid.innerHTML = htmlStr;
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
                  logBox.innerText = '✅ Queued!';
              } else { 
                  throw new Error(data.message || 'Import failed'); 
              }
          } catch(err) {
              logBox.style.color = '#ef4444'; 
              logBox.innerText = '❌ ' + err.message;
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
