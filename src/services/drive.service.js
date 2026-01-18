const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Service Account Path (Root folder me hona chahiye)
const KEY_FILE = path.join(__dirname, '../../service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/drive'];

const auth = new google.auth.GoogleAuth({
  keyFile: KEY_FILE,
  scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

// Helper: Folder ID dhoondho ya banao
async function getFolderId(folderName, parentId = null) {
  let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
  if (parentId) query += ` and '${parentId}' in parents`;

  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  } else {
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) fileMetadata.parents = [parentId];

    const file = await drive.files.create({
      resource: fileMetadata,
      fields: 'id',
    });
    return file.data.id;
  }
}

exports.uploadToDrive = async (filePath, fileName, seriesName, season = 1) => {
  try {
    // 1. Folder Hierarchy: AniCrew_Data -> Series Name -> Season X
    const rootId = await getFolderId('AniCrew_Data');
    const seriesId = await getFolderId(seriesName, rootId);
    const seasonId = await getFolderId(`Season ${season}`, seriesId);

    // 2. Upload
    const fileMetadata = {
      name: fileName,
      parents: [seasonId],
    };
    const media = {
      mimeType: fileName.endsWith('.vtt') ? 'text/vtt' : 'audio/mpeg',
      body: fs.createReadStream(filePath),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });

    // 3. Permission Public karo (Taaki stream ho sake)
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    // Direct Download Link
    return `https://drive.google.com/uc?export=download&id=${file.data.id}`;

  } catch (error) {
    logger.error(`Drive Upload Error: ${error.message}`);
    throw error;
  }
};
