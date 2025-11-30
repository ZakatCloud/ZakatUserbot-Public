const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const readline = require('readline');
const fs = require('fs');
const path = require('path');


class ModularUserBot {
  constructor() {
    this.client = null;
    this.apiId = 0000000;
    this.apiHash = '000000000000000000000000000';
    this.modules = new Map();
    this.modulesDir = path.join(__dirname, 'modules');
    this.loadedModules = new Set();
    this.botUserId = null;
  }

  async initialize() {
    if (fs.existsSync('./session.txt') && fs.readFileSync('./session.txt', 'utf8').trim() !== '') {
      await this.connectWithSession();
    } else {

      await this.createNewSession();
    }
  }

  async connectWithSession() {
    try {
      const sessionString = fs.readFileSync('./session.txt', 'utf8').trim();
      console.log('📁 Загружаем сохраненную сессию...');
      const stringSession = new StringSession(sessionString);
      
      this.client = new TelegramClient(stringSession, this.apiId, this.apiHash, {
        connectionRetries: 5,
        useWSS: false,
        floodSleepThreshold: 60,
        deviceModel: "UserBot",
        systemVersion: "1.0",
        appVersion: "1.0",
      });

      console.log('🔌 Подключаемся...');
      await this.client.connect();
      
      const me = await this.client.getMe();
      this.botUserId = me.id;
      console.log('✅ Авторизованы как: ' + me.firstName + ' (@' + (me.username || 'без username') + ') ID: ' + this.botUserId);
      
      this.ensureModulesDir();
      await this.loadAllModules();
      await this.forceLoadDialogs();
      await this.setupUniversalHandler();
      this.startModuleWatcher();
    } catch (error) {
      console.log('❌ Ошибка подключения по сессии:', error.message);
      console.log('🔄 Пробуем создать новую сессию...');
      await this.createNewSession();
    }
  }

  async createNewSession() {
    try {
      console.log('🆕 Создаем новую сессию...');
      
      const stringSession = new StringSession('');
      
      this.client = new TelegramClient(stringSession, this.apiId, this.apiHash, {
        connectionRetries: 5,
        useWSS: false,
        floodSleepThreshold: 60,
        deviceModel: "UserBot",
        systemVersion: "1.0",
        appVersion: "1.0",
      });

      console.log('🔌 Запускаем клиент...');
      await this.client.start({
        phoneNumber: async () => await input.text("📱 Введите номер телефона: "),
        password: async () => await input.text("🔑 Введите пароль (если есть): "),
        phoneCode: async () => await input.text("📲 Введите код из Telegram: "),
        onError: (err) => console.log('❌ Ошибка:', err),
      });

      console.log('✅ Авторизация успешна!');
      
      const sessionString = this.client.session.save();
      fs.writeFileSync('./session.txt', sessionString);
      console.log('💾 Сессия сохранена в session.txt');
      
      const me = await this.client.getMe();
      this.botUserId = me.id;
      console.log('👤 Авторизованы как: ' + me.firstName + ' (@' + (me.username || 'без username') + ') ID: ' + this.botUserId);
      
      this.ensureModulesDir();
      await this.loadAllModules();
      await this.forceLoadDialogs();
      await this.setupUniversalHandler();
      this.startModuleWatcher();
      
    } catch (error) {
      console.log('💥 Ошибка создания сессии:', error);
      if (fs.existsSync('./session.txt')) {
        fs.unlinkSync('./session.txt');
        console.log('🗑️ Удален невалидный файл сессии');
      }
    }
  }

  isMessageFromBotOwner(msg) {
    if (!this.botUserId) {
      console.log('⚠️ ID бота не установлен');
      return false;
    }

    try {
      const senderId = msg.senderId;
      const isOwner = senderId && senderId.toString() === this.botUserId.toString();
      
      if (!isOwner) {
        console.log('🚫 Игнорируем сообщение от другого пользователя ID:', senderId);
      }
      
      return isOwner;
    } catch (error) {
      console.log('❌ Ошибка проверки отправителя:', error.message);
      return false;
    }
  }

  ensureModulesDir() {
    if (!fs.existsSync(this.modulesDir)) {
      fs.mkdirSync(this.modulesDir);
      console.log('📁 Создана папка modules/ для модулей');
      this.createExampleModules();
    }
  }

  createExampleModules() {
    const baseModuleCode = `class BaseModule {
  constructor(client, bot) {
    this.client = client;
    this.bot = bot;
    this.name = 'base';
  }

  getCommands() {
    return ['секс', 'взлом', 'тест', 'статус'];
  }

  async handleMessage(msg, text) {
    if (text.includes('секс')) {
      await this.client.sendMessage(msg.chatId, {
        message: 'Я ДЕЛАЮ ТРАХ ТРАХ 💥',
        replyTo: msg.id
      });
      return true;
    }
    
    if (text.includes('взлом')) {
      await this.startHackProcess(msg.chatId, msg);
      return true;
    }
    
    if (text.includes('тест')) {
      await this.client.sendMessage(msg.chatId, {
        message: '🤖 Бот работает! Модульная система активна!',
        replyTo: msg.id
      });
      return true;
    }

    if (text.includes('статус')) {
      await this.client.sendMessage(msg.chatId, {
        message: '✅ Бот онлайн, модули загружены!',
        replyTo: msg.id
      });
      return true;
    }

    return false;
  }

  async startHackProcess(chatId, originalMsg) {
    try {
      const msg = await this.client.sendMessage(chatId, {
        message: '💻 ИНИЦИАЛИЗАЦИЯ ВЗЛОМА...\\\\n[░░░░░░░░░░] 0%',
        replyTo: originalMsg.id
      });

      const stages = [10, 30, 50, 70, 90, 100];
      
      for (const percent of stages) {
        await this.delay(1000);
        const bars = '█'.repeat(percent/10) + '░'.repeat(10 - percent/10);
        await msg.edit({
          text: '💻 Взлом... [' + percent + '%] ' + bars
        });
      }

      await msg.edit({ text: '✅ Взлом завершен!' });

    } catch (error) {
      console.log('❌ Ошибка взлома:', error.message);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = BaseModule;
`;

    const deanonModuleCode = `class DeanonModule {
  constructor(client, bot) {
    this.client = client;
    this.bot = bot;
    this.name = 'deanon';
  }

  getCommands() {
    return ['деанон', 'инфо', 'userinfo'];
  }

  async handleMessage(msg, text) {
    if (text.includes('деанон') || text.includes('инфо') || text.includes('userinfo')) {
      await this.showUserInfo(msg);
      return true;
    }
    return false;
  }

  async showUserInfo(msg) {
    try {
      let targetUser = msg.senderId;
      
      if (msg.replyTo) {
        const repliedMsg = await this.client.getMessages(msg.chatId, { ids: msg.replyTo.replyToMsgId });
        if (repliedMsg && repliedMsg[0]) {
          targetUser = repliedMsg[0].senderId;
        }
      }

      const user = await this.client.getEntity(targetUser);
      
      let infoText = '👤 **Информация о пользователе:**\\\\n\\\\n';
      infoText += '**Имя:** ' + (user.firstName || 'Не указано') + '\\\\n';
      infoText += '**Фамилия:** ' + (user.lastName || 'Не указана') + '\\\\n';
      infoText += '**Username:** @' + (user.username || 'Не указан') + '\\\\n';
      infoText += '**ID:** ' + user.id + '\\\\n';
      infoText += '**Премиум:** ' + (user.premium ? '✅ Да' : '❌ Нет') + '\\\\n';
      
      await this.client.sendMessage(msg.chatId, {
        message: infoText,
        replyTo: msg.id,
        parseMode: 'markdown'
      });

    } catch (error) {
      await this.client.sendMessage(msg.chatId, {
        message: '❌ Не удалось получить информацию',
        replyTo: msg.id
      });
    }
  }
}

module.exports = DeanonModule;
`;

    const exampleModules = {
      'base.js': baseModuleCode,
      'deanon.js': deanonModuleCode
    };

    for (const [filename, content] of Object.entries(exampleModules)) {
      const filepath = path.join(this.modulesDir, filename);
      if (!fs.existsSync(filepath)) {
        fs.writeFileSync(filepath, content);
        console.log('📄 Создан пример модуля: ' + filename);
      }
    }
  }

  async loadAllModules() {
    console.log('📦 Загружаем все модули...');
    
    if (!fs.existsSync(this.modulesDir)) {
      console.log('❌ Папка modules не существует');
      return;
    }

    const files = fs.readdirSync(this.modulesDir).filter(file => 
      file.endsWith('.js') && !file.startsWith('_')
    );

    if (files.length === 0) {
      console.log('📁 В папке modules нет файлов модулей');
      return;
    }

    let loadedCount = 0;
    
    for (const file of files) {
      const moduleName = path.basename(file, '.js');
      
      if (this.loadedModules.has(moduleName)) {
        continue;
      }

      try {
        const modulePath = path.join(this.modulesDir, file);
        console.log('🔄 Пробуем загрузить: ' + modulePath);
        
        if (!fs.existsSync(modulePath)) {
          console.log('❌ Файл не существует: ' + modulePath);
          continue;
        }

        delete require.cache[require.resolve(modulePath)];
        const moduleClass = require(modulePath);
        
        if (typeof moduleClass !== 'function') {
          console.log('❌ Модуль ' + moduleName + ' не экспортирует класс');
          continue;
        }
        
        const moduleInstance = new moduleClass(this.client, this);
        

        if (typeof moduleInstance.handleMessage !== 'function') {
          console.log('❌ Модуль ' + moduleName + ' не имеет метода handleMessage');
          continue;
        }
        
        this.modules.set(moduleName, moduleInstance);
        this.loadedModules.add(moduleName);
        loadedCount++;
        
        console.log('✅ Модуль "' + moduleName + '" загружен');
        
      } catch (error) {
        console.log('❌ Ошибка загрузки модуля "' + moduleName + '":', error.message);
        console.log('Stack:', error.stack);
      }
    }

    console.log('🎯 Успешно загружено модулей: ' + loadedCount);
    

    if (this.modules.size > 0) {
      console.log('📋 Загруженные модули: ' + Array.from(this.modules.keys()).join(', '));
    }
  }

  async loadSingleModule(filepath) {
    const filename = path.basename(filepath);
    const moduleName = path.basename(filename, '.js');
    
    if (this.loadedModules.has(moduleName)) {
      console.log('🔄 Перезагружаем модуль "' + moduleName + '"');
      this.modules.delete(moduleName);
      this.loadedModules.delete(moduleName);
    }

    try {
      if (!fs.existsSync(filepath)) {
        console.log('❌ Файл модуля не существует: ' + filepath);
        return false;
      }

      delete require.cache[require.resolve(filepath)];
      const moduleClass = require(filepath);
      
      if (typeof moduleClass !== 'function') {
        console.log('❌ Модуль не экспортирует класс');
        return false;
      }
      
      const moduleInstance = new moduleClass(this.client, this);
      
      if (typeof moduleInstance.handleMessage !== 'function') {
        console.log('❌ Модуль не имеет метода handleMessage');
        return false;
      }
      
      this.modules.set(moduleName, moduleInstance);
      this.loadedModules.add(moduleName);
      
      console.log('🆕 Модуль "' + moduleName + '" загружен');
      return true;
      
    } catch (error) {
      console.log('❌ Ошибка загрузки модуля "' + moduleName + '":', error.message);
      return false;
    }
  }

  startModuleWatcher() {
    console.log('👀 Запускаем отслеживание новых модулей...');
    
    setInterval(async () => {
      if (!fs.existsSync(this.modulesDir)) return;
      
      const currentFiles = new Set(
        fs.readdirSync(this.modulesDir)
          .filter(file => file.endsWith('.js') && !file.startsWith('_'))
          .map(file => path.basename(file, '.js'))
      );

      for (const moduleName of currentFiles) {
        if (!this.loadedModules.has(moduleName)) {
          const filepath = path.join(this.modulesDir, moduleName + '.js');
          console.log('🆕 Обнаружен новый модуль: ' + moduleName);
          await this.loadSingleModule(filepath);
        }
      }

      for (const loadedModule of this.loadedModules) {
        if (!currentFiles.has(loadedModule)) {
          this.modules.delete(loadedModule);
          this.loadedModules.delete(loadedModule);
          console.log('🗑️ Модуль "' + loadedModule + '" удален');
        }
      }
    }, 10000);
  }

  async forceLoadDialogs() {
    try {
      console.log('📂 Загружаем диалоги...');
      const dialogs = await this.client.getDialogs({});
      console.log('✅ Загружено диалогов: ' + dialogs.length);
    } catch (error) {
      console.log('⚠️ Ошибка загрузки диалогов:', error.message);
    }
  }

  async setupUniversalHandler() {
    console.log('🐛 Настраиваем обработчик всех сообщений...');
    
    this.client.addEventHandler(async (event) => {
      try {
        if (!event.message) return;
        
        const msg = event.message;
        if (!msg.text || typeof msg.text !== 'string') return;
        
        console.log('\n' + '='.repeat(60));
        console.log('🕒 Время:', new Date().toLocaleTimeString());
        console.log('📩 СООБЩЕНИЕ:', msg.text);
        console.log('🆔 ID чата:', msg.chatId ? msg.chatId.toString() : 'unknown');
        
        try {
          const chat = await msg.getChat();
          console.log('💬 Чат:', chat.title || 'Личные (' + chat.id + ')');
        } catch (e) {
          console.log('💬 Чат: Не удалось получить информацию');
        }

        if (!this.isMessageFromBotOwner(msg)) {
          console.log('🚫 Игнорируем сообщение от другого пользователя');
          console.log('='.repeat(60));
          return;
        }

        const text = msg.text.toLowerCase().trim();
        console.log('🔍 Проверяем команды в модулях...');

        let commandHandled = false;

        for (const [moduleName, moduleInstance] of this.modules) {
          if (typeof moduleInstance.handleMessage === 'function') {
            const handled = await moduleInstance.handleMessage(msg, text);
            if (handled) {
              console.log('🎯 Команда обработана модулем "' + moduleName + '"');
              commandHandled = true;
              break;
            }
          }
        }

        if (text === 'модули' || text === 'modules') {
          await this.showModulesList(msg.chatId, msg.id);
          commandHandled = true;
        }

        if (text.startsWith('перезагрузить модуль ')) {
          const moduleToReload = text.replace('перезагрузить модуль ', '').trim();
          await this.reloadModule(msg.chatId, msg.id, moduleToReload);
          commandHandled = true;
        }

        if (text === 'перезагрузить все модули') {
          await this.reloadAllModules(msg.chatId, msg.id);
          commandHandled = true;
        }

        if (!commandHandled && (text === 'помощь' || text === 'help' || text === '/start')) {
          if (this.modules.size === 0) {
            await this.client.sendMessage(msg.chatId, {
              message: '🤖 Бот запущен, но модули не загружены!',
              replyTo: msg.id
            });
          } else {
            await this.showHelp(msg.chatId, msg.id);
          }
          commandHandled = true;
        }

        console.log('='.repeat(60));
        
      } catch (error) {
        console.log('❌ Ошибка в обработчике:', error.message);
      }
    }, new NewMessage({}));

    console.log('\n✨ МОДУЛЬНЫЙ ЮЗЕРБОТ ЗАПУЩЕН!');
    console.log('📍 Система автоматически подгружает новые модули');
    console.log('🔒 Команды принимаются только от владельца бота (ID: ' + this.botUserId + ')');
    
    if (this.modules.size === 0) {
      console.log('❌ Нет загруженных модулей! Проверьте папку modules/');
    } else {
      console.log('💡 Напишите "помощь" для списка команд');
      console.log('💡 Напишите "модули" для списка загруженных модулей');
    }

    await this.sendTestInstructions();
  }

  async showModulesList(chatId, replyToId) {
    let modulesText = '📦 **Загруженные модули:**\n\n';
    
    if (this.modules.size === 0) {
      modulesText += '❌ Нет загруженных модулей';
    } else {
      for (const [moduleName, moduleInstance] of this.modules) {
        const commands = typeof moduleInstance.getCommands === 'function' 
          ? moduleInstance.getCommands() 
          : [];
        modulesText += '**' + moduleName + '** - ' + commands.length + ' команд\n';
      }
    }
    
    modulesText += '\n💡 Новые модули автоматически загружаются каждые 10 секунд';

    await this.client.sendMessage(chatId, {
      message: modulesText,
      replyTo: replyToId,
      parseMode: 'markdown'
    });
  }

  async reloadModule(chatId, replyToId, moduleName) {
    const filepath = path.join(this.modulesDir, moduleName + '.js');
    
    if (!fs.existsSync(filepath)) {
      await this.client.sendMessage(chatId, {
        message: '❌ Модуль "' + moduleName + '" не найден',
        replyTo: replyToId
      });
      return;
    }

    const success = await this.loadSingleModule(filepath);
    
    await this.client.sendMessage(chatId, {
      message: success 
        ? '✅ Модуль "' + moduleName + '" перезагружен'
        : '❌ Ошибка перезагрузки модуля "' + moduleName + '"',
      replyTo: replyToId
    });
  }

  async reloadAllModules(chatId, replyToId) {
    this.modules.clear();
    this.loadedModules.clear();
    await this.loadAllModules();
    
    await this.client.sendMessage(chatId, {
      message: '✅ Все модули перезагружены (' + this.modules.size + ' модулей)',
      replyTo: replyToId
    });
  }

  async showHelp(chatId, replyToId) {
    let helpText = '🤖 **Модульный UserBot**\n\n';
    helpText += '**Доступные команды:**\n\n';

    for (const [moduleName, moduleInstance] of this.modules) {
      if (typeof moduleInstance.getCommands === 'function') {
        const commands = moduleInstance.getCommands();
        if (commands.length > 0) {
          helpText += '📦 **' + moduleName + ':**\n';
          commands.forEach(cmd => {
            helpText += '   • ' + cmd + '\n';
          });
          helpText += '\n';
        }
      }
    }

    helpText += '**Управление модулями:**\n';
    helpText += '• модули - список модулей\n';
    helpText += '• перезагрузить модуль [имя] - перезагрузить модуль\n';
    helpText += '• перезагрузить все модули - перезагрузить все\n\n';
    helpText += '💡 Новые модули автоматически загружаются!';

    await this.client.sendMessage(chatId, {
      message: helpText,
      replyTo: replyToId,
      parseMode: 'markdown'
    });
  }

  async sendTestInstructions() {
    try {
      await this.client.sendMessage('me', {
        message: `🤖 Модульный UserBot запущен!

🎯 Особенности:
• Автоподгрузка новых модулей
• Горячая перезагрузка
• Динамическое управление
• 🔒 Команды принимаются только от вас

Команды:
• помощь - список команд
• модули - список модулей
• перезагрузить модуль [имя] - перезагрузить модуль

Просто добавьте .js файл в папку modules/!`
      });
      
      console.log('✅ Инструкции отправлены');
    } catch (error) {
      console.log('⚠️ Не удалось отправить инструкции');
    }
  }
}

async function main() {
  try {
    console.log('🤖 Запуск модульного UserBot с авто-подгрузкой...');
    const bot = new ModularUserBot();
    await bot.initialize();
  } catch (error) {
    console.error('💥 Фатальная ошибка:', error);
  }
}

main();