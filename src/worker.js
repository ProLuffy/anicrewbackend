require('dotenv').config();
const { Worker } = require('bullmq');
const fs = require('fs');
const path = require('path');
const { connection } = require('./queues');
const { scrapeTPX, scrapeHiAnime, scrapeDesiDub } = require('./scrapers');
const { downloadStream, uploadToDrive } = require('./services');
const { connectDB, VideoSource, AudioTrack, Episode } = require('./db');
const { processQueue, uploadQueue } = require('./queues');

connectDB();

// 1. SCRAPER WORKER (Url / API Data Finder)
new Worker('scraper-queue', async (job) => {
    const { taskType, url, meta } = job.data; 
    // taskType can be: 'tpx', 'hianime', 'audio'
    
    let streamUrl = null;

    if (taskType === 'tpx') {
        streamUrl = await scrapeTPX(url);
    } 
    else if (taskType === 'hianime') {
        // 🔥 SMART LOGIC: URL ki zarurat nahi, Naam aur Episode number se dhoondhega
        streamUrl = await scrapeHiAnime(meta.title, meta.epNum);
    } 
    else if (taskType === 'audio') {
        streamUrl = await scrapeDesiDub(url);
    }

    if (!streamUrl) throw new Error(`${taskType.toUpperCase()} Stream Not Found`);

    // Agar link mil gaya, toh Processing Queue mein daalo
    await processQueue.add('process-job', { taskType, streamUrl, meta });
    console.log(`✅ Scraped [${taskType}]: ${meta.title} Ep ${meta.epNum}`);

}, { connection, concurrency: 2 }); // 2 Browsers max at a time


// 2. PROCESSOR WORKER (Download & Convert)
new Worker('process-queue', async (job) => {
    const { taskType, streamUrl, meta } = job.data;
    
    // Naming Logic: Safe filename banayenge
    const ext = taskType === 'audio' ? 'm4a' : 'mp4';
    const cleanTitle = meta.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${cleanTitle}_Ep${meta.epNum}_${taskType}_${Date.now()}.${ext}`;

    // Action: 
    // Agar 'audio' hai toh FFmpeg Audio extract karega.
    // Agar 'video' hai (TPX/HiAnime) toh FFmpeg stream copy karega.
    const isAudioOnly = (taskType === 'audio');
    
    const filePath = await downloadStream(streamUrl, fileName, isAudioOnly);

    // Pass to Uploader
    await uploadQueue.add('upload-job', { filePath, fileName, taskType, meta });
    console.log(`✅ Downloaded: ${fileName}`);

}, { connection, concurrency: 2 }); // CPU intensive task


// 3. UPLOAD WORKER (Drive + Database Update)
new Worker('upload-queue', async (job) => {
    const { filePath, fileName, taskType, meta } = job.data;
    
    // Mime Type logic
    const mime = (taskType === 'audio') ? 'audio/mp4' : 'video/mp4';

    try {
        const fileId = await uploadToDrive(filePath, fileName, mime);

        // Database Update Logic based on Source
        if (taskType === 'tpx') {
            await VideoSource.create({ episodeId: meta.episodeId, source: 'tpx', fileId, quality: '1080p' });
            await Episode.findByIdAndUpdate(meta.episodeId, { hasTPX: true });
        } 
        else if (taskType === 'hianime') {
            await VideoSource.create({ episodeId: meta.episodeId, source: 'hianime', fileId, quality: '1080p' });
            await Episode.findByIdAndUpdate(meta.episodeId, { hasHiAnime: true });
        }
        else if (taskType === 'audio') {
            await AudioTrack.create({ episodeId: meta.episodeId, source: 'desidub', fileId, language: 'Hindi' });
            await Episode.findByIdAndUpdate(meta.episodeId, { hasAudio: true });
        }

        // 🔥 PUBLISH CHECK
        // Agar TPX (Subbed) ya HiAnime (Clean) mein se koi bhi aa gaya ho, toh Published mark kar do
        const ep = await Episode.findById(meta.episodeId);
        if ((ep.hasHiAnime || ep.hasTPX) && !ep.isPublished) {
            ep.isPublished = true;
            await ep.save();
            console.log(`🚀 PUBLISHED: ${meta.title} Ep ${meta.epNum}`);
        }

        console.log(`✅ Upload Done: ${fileName}`);

    } finally {
        // CLEANUP: VPS storage bachane ke liye file delete karna zaroori hai
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
}, { connection, concurrency: 2 }); // Network intensive task

console.log("👷 All Workers Started & Running...");
