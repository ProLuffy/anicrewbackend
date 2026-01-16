const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class FfmpegService {
  
  /**
   * Extract Audio from Stream/File
   * @param {string} inputUrl - DesiDub m3u8 or file path
   * @param {string} outputPath - Local path to save .m4a
   */
  async extractAudio(inputUrl, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputUrl)
        .noVideo() // Remove video
        .audioCodec('copy') // Try to copy first (fastest)
        .on('end', () => {
          logger.info(`Audio Extracted: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          // If copy fails (format mismatch), try encoding
          logger.warn(`Copy failed, re-encoding audio... ${err.message}`);
          this.reEncodeAudio(inputUrl, outputPath, resolve, reject);
        })
        .save(outputPath);
    });
  }

  reEncodeAudio(input, output, resolve, reject) {
    ffmpeg(input)
      .noVideo()
      .audioCodec('aac')
      .audioBitrate('128k')
      .on('end', () => resolve(output))
      .on('error', (err) => reject(err))
      .save(output);
  }
}

module.exports = new FfmpegService();
