class ProfileModule {
  constructor(client, bot) {
    this.client = client;
    this.bot = bot;
    this.name = 'profile';
    this.userStats = {
      messagesSent: 0,
      commandsUsed: 0
    };
  }

  getCommands() {
    return ['профиль', 'profile', 'кто я', 'юзер', 'user', 'мой профиль', 'стата'];
  }

  async handleMessage(msg, text) {
    const command = text.toLowerCase();
    if (this.getCommands().includes(command)) {
      console.log('🎯 ТРИГГЕР "ПРОФИЛЬ" СРАБОТАЛ!');
      this.userStats.commandsUsed++;
      await this.showProfile(msg);
      return true;
    }

    this.userStats.messagesSent++;

    return false;
  }

  async showProfile(msg) {
    try {
      const user = await this.client.getEntity('me');
      const totalModules = this.bot.modules.size;
      
      const rank = this.determineRank(user);
      
      const profileText = this.formatProfile(user, rank, totalModules);
      
      await this.client.sendMessage(msg.chatId, {
        message: profileText,
        replyTo: msg.id,
        parseMode: 'markdown'
      });

      console.log('✅ Профиль показан');

    } catch (error) {
      console.log('❌ Ошибка показа профиля:', error.message);
      await this.client.sendMessage(msg.chatId, {
        message: '❌ Не удалось загрузить профиль',
        replyTo: msg.id
      });
    }
  }

  determineRank(user) {
    if (user.username && user.username.includes('admin')) {
      return 'Administrator';
    } else if (user.premium) {
      return 'Premium User';
    } else if (user.bot) {
      return 'Bot';
    } else {
      return 'Developer';
    }
  }

  formatProfile(user, rank, totalModules) {
    const nickname = user.firstName || 'Не установлен';
    const username = user.username ? `@${user.username}` : 'Не установлен';
    const lastName = user.lastName ? ` ${user.lastName}` : '';
    
    return `👤 **ZakatUserBot v1.5** (${this.getUserType(user)})

📛 **Никнейм:** ${nickname}${lastName}
🔗 **Юзернейм:** ${username}
⭐ **Ранг в юзерботе:** ${rank}
📦 **Личных модулей:** ${totalModules}
🆔 **ID:** ${user.id}
📊 **Статистика:** ${this.userStats.commandsUsed} команд, ${this.userStats.messagesSent} сообщ.
${user.premium ? '💎 **Премиум:** ✅ Да' : ''}
${this.getStatusEmoji()} **Статус:** ${this.getUserStatus()}

${this.getAdditionalInfo()}`;
  }

  getUserType(user) {
    if (user.bot) return 'Бот';
    if (user.deleted) return 'Удаленный';
    if (user.verified) return 'Верифицированный';
    if (user.premium) return 'Премиум';
    return 'Пользователь';
  }

  getUserStatus() {
    const statuses = ['🟢 Онлайн', '🟡 Недавно', '🔴 Офлайн'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  getStatusEmoji() {
    return '🟢';
  }

  getAdditionalInfo() {
    const info = [];
    
    info.push(`🔧 **Версия юзербота:** 1.5.0`);
    info.push(`🕒 **Время работы:** ${this.getUptime()}`);
    info.push(`📁 **Папка модулей:** modules/`);
    info.push(`🎯 **Активных команд:** ${this.getCommands().length}`);
    
    return info.join('\n');
  }

  getUptime() {
    const hours = Math.floor(process.uptime() / 3600);
    const minutes = Math.floor((process.uptime() % 3600) / 60);
    return `${hours}ч ${minutes}м`;
  }
}

module.exports = ProfileModule;