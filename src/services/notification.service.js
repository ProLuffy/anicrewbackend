const TelegramBot = require('node-telegram-bot-api');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID; // Main Channel ID
    
    if (this.token) {
      this.bot = new TelegramBot(this.token, { polling: false }); // Worker sirf send karega, receive nahi
    } else {
      logger.warn('⚠️ Telegram Token missing! Notifications disabled.');
    }
  }

  async sendUpdate(message, imageUrl = null) {
    if (!this.bot) return;

    try {
      if (imageUrl) {
        await this.bot.sendPhoto(this.chatId, imageUrl, { caption: message, parse_mode: 'Markdown' });
      } else {
        await this.bot.sendMessage(this.chatId, message, { parse_mode: 'Markdown' });
      }
      logger.info(`📢 Notification sent to ${this.chatId}`);
    } catch (error) {
      logger.error(`Telegram Send Error: ${error.message}`);
      // Don't throw, just log. Notification failure shouldn't crash the worker.
    }
  }

  async sendAdminAlert(message) {
    // Admin ko direct DM ya Admin Group me bhejne ke liye
    // Assume ADMIN_CHAT_ID env variable hai
    const adminChatId = process.env.ADMIN_CHAT_ID || this.chatId;
    if(this.bot) {
        await this.bot.sendMessage(adminChatId, `🚨 *SYSTEM ALERT*\n${message}`, { parse_mode: 'Markdown' });
    }
  }
}

module.exports = new NotificationService();
