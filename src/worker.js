require('dotenv').config();
const { Worker } = require('bullmq');
const fs = require('fs');
const { connection } = require('./queues');
const { scrapeTPX, scrapeHiAnime, scrapeDesiDub } = require('./scrapers');
const { downloadStream, uploadToDrive } = require('./services');
const { connectDB, VideoSource, AudioTrack, Episode } = require('./db');
const { processQueue, uploadQueue } = require('./queues');

connectDB();

// 1. SCRAPER
new Worker('scraper-queue', async (job) => {
    const { taskType, url, meta } = job.data; 
    // taskType: 'tpx' | 'hianime' | 'audio'
    
    let streamUrl = null;
    if (taskType === 'tpx') streamUrl = await scrapeTPX(url);
    else if (taskType === 'hianime') streamUrl = await scrapeHiAnime(url);
    else if (taskType === 'audio') streamUrl = await scrapeDesiDub(url);

    if (!streamUrl) throw new Error(`${taskType} Stream Not Found`);

    await processQueue.add('process-job', { taskType, streamUrl, meta });
    console.log(`✅ Scraped [${taskType}]`);

}, { connection, concurrency: 2 });

// 2. PROCESSOR (Download)
new Worker('process-queue', async (job) => {
    const { taskType, streamUrl, meta } = job.data;
    
    // Naming logic safe for linux
    const ext = taskType === 'audio' ? 'm4a' : 'mp4';
    const fileName = `${meta.title}_Ep${meta.epNum}_${taskType}.${ext}`.replace(/\s+/g, '_');

    // Download (Audio ko extract, Video ko copy)
    const filePath = await downloadStream(streamUrl, fileName, taskType === 'audio');

    await uploadQueue.add('upload-job', { filePath, fileName, taskType, meta });
    console.log(`✅ Downloaded: ${fileName}`);

}, { connection, concurrency: 2 });

// 3. UPLOADER (Drive + DB)
new Worker('upload-queue', async (job) => {
    const { filePath, fileName, taskType, meta } = job.data;
    const mime = taskType === 'audio' ? 'audio/mp4' : 'video/mp4';

    try {
        const fileId = await uploadToDrive(filePath, fileName, mime);

        // Update Database based on Type
        if (taskType === 'tpx') {
            await VideoSource.create({ episodeId: meta.episodeId, source: 'tpx', fileId });
            await Episode.findByIdAndUpdate(meta.episodeId, { hasTPX: true });
        } 
        else if (taskType === 'hianime') {
            await VideoSource.create({ episodeId: meta.episodeId, source: 'hianime', fileId });
            await Episode.findByIdAndUpdate(meta.episodeId, { hasHiAnime: true });
        }
        else if (taskType === 'audio') {
            await AudioTrack.create({ episodeId: meta.episodeId, source: 'desidub', fileId });
            await Episode.findByIdAndUpdate(meta.episodeId, { hasAudio: true });
        }

        // Publish Check (Agar koi bhi ek video ready hai)
        const ep = await Episode.findById(meta.episodeId);
        if ((ep.hasHiAnime || ep.hasTPX) && !ep.isPublished) {
            ep.isPublished = true;
            await ep.save();
            console.log(`🚀 PUBLISHED: ${meta.title} Ep ${meta.epNum}`);
        }

        console.log(`✅ Upload Done: ${fileName}`);

    } finally {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
}, { connection, concurrency: 2 });

console.log("👷 Workers Running...");
