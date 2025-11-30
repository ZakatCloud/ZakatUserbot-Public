const os = require('os');
const fs = require('fs');

function ServerInfoModule(client, bot) {
    this.client = client;
    this.bot = bot;
    this.name = 'serverinfo';
}

ServerInfoModule.prototype.getCommands = function() {
    return ['серв', 'статистика', 'инфо'];
};

ServerInfoModule.prototype.handleMessage = async function(msg, text) {
    if (['серв', 'статистика', 'инфо'].includes(text)) {
        await this.showServerInfo(msg);
        return true;
    }
    return false;
};

ServerInfoModule.prototype.showServerInfo = async function(msg) {
    try {
        const totalMem = Math.round(os.totalmem() / 1024 / 1024 / 1024);
        const freeMem = Math.round(os.freemem() / 1024 / 1024 / 1024);
        const usedMem = totalMem - freeMem;
        const memUsage = Math.round((usedMem / totalMem) * 100);

        const cpus = os.cpus();
        const loadAvg = os.loadavg();
        
        const uptime = Math.round(os.uptime() / 3600);

        let infoText = `🖥 **СЕРВЕР**\n\n`;
        infoText += `**Система:** ${os.type()} ${os.release()}\n`;
        infoText += `**Аптайм:** ${uptime} часов\n\n`;
        
        infoText += `**CPU:** ${cpus.length} ядер\n`;
        infoText += `**Нагрузка:** ${loadAvg[0].toFixed(2)}\n\n`;
        
        infoText += `**Память:** ${usedMem}GB / ${totalMem}GB\n`;
        infoText += `**Использование:** ${memUsage}%\n\n`;
        
        infoText += `**Юзербот:**\n`;
        infoText += `• Модулей: ${this.bot.modules.size}\n`;
        infoText += `• Память: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`;

        await this.client.editMessage(msg.chatId, {
            message: msg.id,
            text: infoText,
            parseMode: 'markdown'
        });

    } catch (error) {
        await this.client.editMessage(msg.chatId, { 
            message: msg.id, 
            text: '❌ Ошибка' 
        });
    }
};

module.exports = ServerInfoModule;