const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');

function FastMusicModule(client, bot) {
    this.client = client;
    this.bot = bot;
    this.name = 'music';
    this.cache = new Map();
}

FastMusicModule.prototype.getCommands = function() {
    return ['музыка', 'music', 'трек'];
};

FastMusicModule.prototype.handleMessage = async function(msg, text) {
    if (text.startsWith('музыка ')) {
        const query = text.replace('музыка ', '');
        await this.fastMusicSearch(msg, query);
        return true;
    }
    return false;
};

FastMusicModule.prototype.fastMusicSearch = async function(msg, query) {
    try {
        const sentMsg = await this.client.sendMessage(msg.chatId, {
            message: '🎵 Ищу трек...',
            replyTo: msg.id
        });

        if (this.cache.has(query)) {
            const cachedInfo = this.cache.get(query);
            await this.client.editMessage(msg.chatId, {
                message: sentMsg.id,
                text: this.formatMessage(cachedInfo),
                parseMode: 'markdown'
            });
            return;
        }

        const info = await youtubedl(`ytsearch1:"${query}"`, {
            dumpJson: true,
            noWarnings: true,
            noCheckCertificates: true, 
            preferFreeFormats: true,   
            socketTimeout: 8000,       
            retries: 1,                
            fragmentRetries: 1,        
            abortOnError: true        
        });

        if (info) {
            this.cache.set(query, info);
            
            await this.client.editMessage(msg.chatId, {
                message: sentMsg.id,
                text: this.formatMessage(info),
                parseMode: 'markdown'
            });
        } else {
            await this.client.editMessage(msg.chatId, {
                message: sentMsg.id,
                text: '❌ Трек не найден'
            });
        }

    } catch (error) {
        console.log('Ошибка:', error);
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        await this.client.sendMessage(msg.chatId, {
            message: `🎵 **${query}**\n\n🔗 [Быстрый поиск](${searchUrl})`,
            replyTo: msg.id,
            parseMode: 'markdown'
        });
    }
};

FastMusicModule.prototype.formatMessage = function(info) {
    return `🎵 **${info.title}**\n\n` +
           `⏱ ${this.formatDuration(info.duration)} | 👤 ${info.uploader}\n\n` +
           `🔗 [Скачать MP3](https://ytmp3.cc/youtube-to-mp3/${info.id}/)\n` +
           `📥 [Быстрая загрузка](https://y2mate.com/youtube/${info.id})`;
};

FastMusicModule.prototype.formatDuration = function(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

module.exports = FastMusicModule;