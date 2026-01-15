require('dotenv').config();
const express = require('express');
const { connectDB, Series, Episode } = require('./db');
const { scraperQueue } = require('./queues');

const app = express();
app.use(express.json());
connectDB();

app.post('/api/extract', async (req, res) => {
    const { animeName, tpxBaseUrl, hianimeBaseUrl, desidubBaseUrl, startEp, endEp } = req.body;

    let series = await Series.findOne({ title: animeName });
    if (!series) series = await Series.create({ title: animeName });

    let count = 0;
    for (let i = startEp; i <= endEp; i++) {
        let ep = await Episode.findOne({ seriesId: series._id, episodeNumber: i });
        if (!ep) ep = await Episode.create({ seriesId: series._id, episodeNumber: i });

        // URL Generation (Ensure this logic matches target sites)
        const tpxUrl = `${tpxBaseUrl}-episode-${i}`; 
        const hiUrl = `${hianimeBaseUrl}?ep=${i}`; // HiAnime usually needs ID logic, adjust as needed
        const desiUrl = `${desidubBaseUrl}-episode-${i}`; 

        const meta = { title: animeName, epNum: i, episodeId: ep._id };

        // 3 Jobs per Episode
        if(tpxBaseUrl) await scraperQueue.add('job', { taskType: 'tpx', url: tpxUrl, meta });
        if(hianimeBaseUrl) await scraperQueue.add('job', { taskType: 'hianime', url: hiUrl, meta });
        if(desidubBaseUrl) await scraperQueue.add('job', { taskType: 'audio', url: desiUrl, meta });

        count++;
    }

    res.json({ msg: `Pipeline Queued: ${count} Eps x 3 Sources` });
});

app.listen(process.env.PORT || 5000, () => console.log('🚀 Server Running'));
