import React, { useState } from 'react';

export default function AdminPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('');
  const [seasons, setSeasons] = useState({});
  const [logs, setLogs] = useState({});

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const API_KEY = import.meta.env.VITE_API_KEY || "";

  const searchAnime = async () => {
    if (!query) return;
    setStatus('⏳ Fetching from AniCrew Backend...');
    setResults([]);

    try {
      const res = await fetch(`${API_URL}/api/admin/search?q=${encodeURIComponent(query)}&apiKey=${API_KEY}`);
      const json = await res.json();

      if (json.success && json.data.length > 0) {
        setStatus('✅ Search Complete!');
        setResults(json.data);
      } else {
        setStatus('❌ No results found.');
      }
    } catch (error) {
      setStatus('❌ Error: Server connection failed.');
    }
  };

  const handleImport = async (id, name, type) => {
    const season = seasons[id] || 1;
    setLogs(prev => ({ ...prev, [id]: `⏳ Queuing ${type.toUpperCase()}...` }));

    try {
      const res = await fetch(`${API_URL}/api/extract/start?apiKey=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hianimeId: id, animeName: name, season: parseInt(season), sourceType: type })
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setLogs(prev => ({ ...prev, [id]: '✅ Queued in Redis!' }));
      } else {
        setLogs(prev => ({ ...prev, [id]: `❌ ${json.message || 'Import Failed'}` }));
      }
    } catch (e) {
      setLogs(prev => ({ ...prev, [id]: '❌ Connection Error' }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-extrabold text-red-600 mb-2">AniCrew Pro</h1>
        <p className="text-gray-400 mb-8">React Admin Panel (Direct API Connection)</p>

        {/* Search Bar */}
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchAnime()}
            className="flex-1 p-4 bg-gray-800 border border-gray-700 rounded-lg text-white text-lg focus:outline-none focus:border-red-500"
            placeholder="Type anime name (e.g. Solo Leveling)"
          />
          <button
            onClick={searchAnime}
            className="bg-red-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-red-700 transition"
          >
            Search
          </button>
        </div>

        {/* Status */}
        <div className="text-yellow-400 font-bold mb-6 text-lg">{status}</div>

        {/* Results Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {results.map((anime) => (
            <div key={anime.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:border-red-500 transition flex flex-col">
              <img src={anime.poster} alt={anime.name} className="w-full h-56 object-cover rounded-lg mb-3 shadow-lg" />
              <h3 className="font-bold text-sm truncate mb-3" title={anime.name}>{anime.name}</h3>

              <input
                type="number"
                value={seasons[anime.id] || 1}
                onChange={(e) => setSeasons({...seasons, [anime.id]: e.target.value})}
                min="1"
                className="w-full p-2 bg-gray-900 mb-3 rounded border border-gray-600 text-sm text-center"
                placeholder="Season"
              />

              <button
                onClick={() => handleImport(anime.id, anime.name, 'tpx')}
                className="w-full bg-blue-600 py-2 rounded-lg text-xs font-bold mb-2 hover:bg-blue-700 transition"
              >
                📥 Import SUB
              </button>

              <button
                onClick={() => handleImport(anime.id, anime.name, 'desidub')}
                className="w-full bg-green-600 py-2 rounded-lg text-xs font-bold hover:bg-green-700 transition"
              >
                📥 Import DUB
              </button>

              <div className="text-xs font-semibold text-center mt-3 h-4 text-yellow-400">
                {logs[anime.id] || ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}