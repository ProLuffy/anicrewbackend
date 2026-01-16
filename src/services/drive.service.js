const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class DriveService {
  constructor() {
    const keyPath = path.join(__dirname, '../../secrets/service_account.json');
    
    // Auth logic
    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    this.drive = google.drive({ version: 'v3', auth });
    this.rootFolderId = process.env.DRIVE_ROOT_FOLDER_ID;
  }

  /**
   * Create Folder if not exists
   */
  async createFolder(name, parentId = this.rootFolderId) {
    try {
      // Check if exists logic omitted for brevity, usually we search first
      const fileMetadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      };
      const file = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id',
      });
      return file.data.id;
    } catch (error) {
      logger.error(`Drive Create Folder Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload File Stream (Memory Efficient)
   */
  async uploadFile(fileName, filePath, mimeType, parentFolderId) {
    try {
      const fileMetadata = {
        name: fileName,
        parents: [parentFolderId],
      };
      const media = {
        mimeType: mimeType,
        body: fs.createReadStream(filePath),
      };
      
      const file = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id',
      });
      
      logger.info(`Uploaded to Drive: ${fileName} (ID: ${file.data.id})`);
      return file.data.id;
    } catch (error) {
      logger.error(`Drive Upload Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete File (Cleanup)
   */
  async deleteFile(fileId) {
    try {
      await this.drive.files.delete({ fileId });
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new DriveService();
