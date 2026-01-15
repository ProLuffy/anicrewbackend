const { google } = require('googleapis');
const { chromium } = require('playwright');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '../secrets/service_account.json'),
    scopes: ['https://www.googleapis.com/auth/drive.file'],
});
const drive = google.drive({ version: 'v3', auth });

const uploadToDrive = async (filePath, fileName, mimeType) => {
    console.log(`☁️ Uploading: ${fileName}`);
    const res = await drive.files.create({
        resource: { name: fileName, parents: [process.env.GDRIVE_FOLDER_ID] },
        media: { mimeType, body: fs.createReadStream(filePath) },
        fields: 'id'
    });
    return res.data.id;
};

const TEMP_DIR = path.join(__dirname, '../downloads');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

const downloadStream = (url, fileName, isAudioOnly = false) => {
    return new Promise((resolve, reject) => {
        const outputPath = path.join(TEMP_DIR, fileName);
        const args = isAudioOnly ? '-vn -acodec copy' : '-c copy -bsf:a aac_adtstoasc';
        const cmd = `ffmpeg -i "${url}" ${args} "${outputPath}" -y -hide_banner -loglevel error`;
        
        console.log(`⬇️ FFmpeg: ${fileName}`);
        exec(cmd, { timeout: 1000 * 60 * 60 }, (err) => err ? reject(err) : resolve(outputPath));
    });
};

const launchBrowser = async () => {
    return await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });
};

module.exports = { uploadToDrive, downloadStream, launchBrowser };
