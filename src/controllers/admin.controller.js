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
<title>AniCrew Auto-Importer</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>body { background-color: #0a0a0a; color: white; font-family: sans-serif; }</style>
</head>
<body class="p-8">
<div class="max-w-7xl mx-auto">
<h1 class="text-4xl font-black mb-2"><span class="text-red-600">AniCrew</span> Auto-Importer</h1>
<p class="text-gray-400 mb-8">Search an anime. The system will auto-fetch metadata from HiAnime, scrape external audio/video, upload to Drive, and sync the DB.</p>

                  <div class="flex gap-4 mb-10">
          <input type="text" id="searchInput" placeholder="Enter Anime Name (e.g. Solo Leveling)" class="flex-1 bg-[#1a1a1a] border border-gray-700 p-4 rounded-lg text-white focus:border-red-500 focus:outline-none text-lg">
          <button onclick="searchAnime()" class="bg-red-600 hover:bg-red-700 px-8 py-4 rounded-lg font-bold text-lg transition-all shadow-lg shadow-red-600/30">Search</button>
      </div>


                  <div id="loading" class="hidden text-center text-red-500 my-10 text-xl font-bold animate-pulse">Scanning Anime Databases...</div>


                  <div id="resultsGrid" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6"></div>
  </div>


  <script>
      async function searchAnime() {
          const query = document.getElementById('searchInput').value;
          if(!query) return;

          document.getElementById('loading').classList.remove('hidden');
          document.getElementById('resultsGrid').innerHTML = '';


          try {
              const res = await fetch(\`/api/admin/search?q=\${encodeURIComponent(query)}\`);
              const json = await res.json();

              if(json.success && json.data) {
                  renderResults(json.data);
              } else {
                  alert('No results found.');
              }
          } catch(e) {
              alert('Error searching anime');
          } finally {
              document.getElementById('loading').classList.add('hidden');
          }
      }


      function renderResults(animes) {
          const grid = document.getElementById('resultsGrid');
          grid.innerHTML = animes.map(anime => \`
              <div class="bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-lg p-4 flex flex-col group hover:border-red-500 transition-colors">
                  <img src="\${anime.poster}" alt="\${anime.name}" class="w-full h-72 object-cover rounded-lg mb-4 group-hover:scale-105 transition-transform duration-300">
                  <h3 class="font-bold text-sm text-gray-200 line-clamp-2 mb-3 flex-1">\${anime.name}</h3>

                  <div class="space-y-2 mt-auto">
                      <div class="flex gap-2">
                          <input type="number" id="season-\${anime.id}" placeholder="Season" value="1" title="Season number for Desidub scraping" class="w-20 bg-[#222] border border-gray-700 text-center rounded px-2 py-2 text-sm text-white focus:outline-none focus:border-red-500">
                          <button onclick="importAnime('\${anime.id}', '\${anime.name.replace(/'/g, "\\\\'")}')" class="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded transition-colors text-sm shadow-lg shadow-red-600/20">
                              📥 Import All
                          </button>
                      </div>
                  </div>
              </div>
          \`).join('');
      }


      async function importAnime(hianimeId, animeName) {
          const season = document.getElementById(\`season-\${hianimeId}\`).value || 1;
          const btn = event.target;
          const originalText = btn.innerHTML;

          btn.innerText = '⚙️ Queuing...';
          btn.disabled = true;
          btn.classList.add('opacity-50');


          try {
              const res = await fetch('/api/extract/start', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ hianimeId, animeName, season: parseInt(season) })
              });
              const data = await res.json();

              if(data.success) {
                  alert(data.message || 'Import started successfully! Check workers for progress.');
                  btn.innerText = '✅ Processing';
                  btn.classList.replace('bg-red-600', 'bg-green-600');
              } else {
                  throw new Error(data.message || 'Import failed');
              }
          } catch(e) {
              alert(e.message);
              btn.innerHTML = originalText;
              btn.disabled = false;
              btn.classList.remove('opacity-50');
          }
      }
  </script>

</body>
</html>
`;
res.send(html);
};