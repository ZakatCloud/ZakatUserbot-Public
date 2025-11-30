class RPModule {
  constructor(client, bot) {
    this.client = client;
    this.bot = bot;
    this.name = 'rp';
  }

  getCommands() {
    return [
      'обнять', 'поцеловать', 'отлизать', 'трахнуть',
      'отсосать', 'укусить', 'накормить', 
      'погладить', 'выебать', 'убить'
    ];
  }

  async handleMessage(msg, text) {
    const command = text.toLowerCase().trim();
    
    if (this.getCommands().includes(command)) {
      await this.handleRPCommand(msg, command);
      return true;
    }
    
    return false;
  }

  async handleRPCommand(msg, command) {
    try {

      const adminUser = await this.client.getEntity(msg.senderId);
      const adminName = adminUser.username ? `@${adminUser.username}` : (adminUser.firstName || 'Админ');
      
      let targetUser = null;
      let targetName = 'неизвестного';
      
      if (msg.replyTo) {
        const repliedMsg = await this.client.getMessages(msg.chatId, { 
          ids: msg.replyTo.replyToMsgId 
        });
        if (repliedMsg && repliedMsg[0]) {
          targetUser = await this.client.getEntity(repliedMsg[0].senderId);
          targetName = targetUser.username ? `@${targetUser.username}` : (targetUser.firstName || 'Пользователь');
        }
      } else {
        targetName = 'самого себя';
      }

      const rpText = this.createRPText(command, adminName, targetName);
      
      await this.client.editMessage(msg.chatId, {
        message: msg.id,
        text: rpText,
        parseMode: 'markdown'
      });

      console.log(`✅ RP команда выполнена: ${command}`);

    } catch (error) {
      console.log('❌ Ошибка RP команды:', error.message);
      
      try {
        await this.client.sendMessage(msg.chatId, {
          message: '❌ Ошибка выполнения команды',
          replyTo: msg.id
        });
      } catch (e) {
      }
    }
  }

  createRPText(command, adminName, targetName) {
    const actions = {
      'обнять': {
        emoji: '🤗',
        text: 'крепко обнимает'
      },
      'поцеловать': {
        emoji: '😘',
        text: 'нежно целует'
      },
      'отлизать': {
        emoji: '👅💦',
        text: 'страстно отлизывает'
      },
      'трахнуть': {
        emoji: '🍆💥',
        text: 'грубо трахает'
      },
      'отсосать': {
        emoji: '👅💦',
        text: 'страстно отсасывает у'
      },
      'укусить': {
        emoji: '🧛‍♂️',
        text: 'больно кусает'
      },
      'накормить': {
        emoji: '🍔😋',
        text: 'сытно кормит'
      },
      'погладить': {
        emoji: '✋✨',
        text: 'нежно гладит'
      },
      'выебать': {
        emoji: '🍆💥',
        text: 'жестко выебывает'
      },
      'убить': {
        emoji: '🔪🩸',
        text: 'хладнокровно убивает'
      }
    };

    const action = actions[command];
    
    if (action) {
      if (targetName === 'самого себя' && (['отсосать', 'выебать', 'убить', 'отлизать', 'трахнуть'].includes(command))) {
        return `${action.emoji} **${adminName}** *пытается* ${action.text.replace(/ет$/, 'ает')} *самого себя*, что выглядит весьма странно ${action.emoji}`;
      }
      
      return `${action.emoji} **${adminName}** ${action.text} **${targetName}** ${action.emoji}`;
    }
    
    return `🎭 **${adminName}** взаимодействует с **${targetName}**`;
  }
}

module.exports = RPModule;