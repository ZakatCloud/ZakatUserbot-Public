class TranslateModule {
  constructor(client, bot) {
    this.client = client;
    this.bot = bot;
    this.name = 'translate';
    this.translator = null;
    this.initTranslator();
  }

  async initTranslator() {
    try {
      const { translate } = await import('@vitalets/google-translate-api');
      this.translator = translate;
      console.log('✅ Переводчик Google Translate загружен');
    } catch (error) {
      console.log('⚠️ Google Translate не доступен');
    }
  }

  getCommands() {
    return ['перевести', 'translate', 'tr'];
  }

  async handleMessage(msg, text) {
    if (text.startsWith('перевести ') || text.startsWith('translate ') || text.startsWith('tr ')) {
      console.log('🎯 ТРИГГЕР "ПЕРЕВЕСТИ" СРАБОТАЛ!');
      await this.translateAndEdit(msg);
      return true;
    }

    return false;
  }

  async translateAndEdit(msg) {
    try {
      const text = msg.text;
      
      let textToTranslate = '';
      if (text.startsWith('перевести ')) {
        textToTranslate = text.substring('перевести '.length);
      } else if (text.startsWith('translate ')) {
        textToTranslate = text.substring('translate '.length);
      } else if (text.startsWith('tr ')) {
        textToTranslate = text.substring('tr '.length);
      }

      if (!textToTranslate.trim()) {
        await this.client.sendMessage(msg.chatId, {
          message: '❌ Укажите текст для перевода\nПример: перевести привет как дела?',
          replyTo: msg.id
        });
        return;
      }

      console.log('🔤 Перевод текста: ' + textToTranslate);

      if (!this.translator) {
        await this.initTranslator();
        if (!this.translator) {
          await this.fallbackTranslateAndEdit(msg, textToTranslate);
          return;
        }
      }

      const result = await this.translator(textToTranslate, { to: 'en' });
      
      await this.client.editMessage(msg.chatId, {
        message: msg.id,
        text: `🔤 ${result.text}`
      });

      console.log('✅ Сообщение отредактировано на перевод: ' + result.text);

    } catch (error) {
      console.log('❌ Ошибка перевода:', error.message);
      
      await this.fallbackTranslateAndEdit(msg, textToTranslate);
    }
  }

  async fallbackTranslateAndEdit(msg, textToTranslate) {
    try {
      console.log('🔄 Пробуем альтернативный метод перевода...');
      
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=ru|en`);
      const data = await response.json();
      
      if (data.responseStatus === 200 && data.responseData) {
        const translation = data.responseData.translatedText;
        
        await this.client.editMessage(msg.chatId, {
          message: msg.id,
          text: `🔤 ${translation}`
        });

        console.log('✅ Сообщение отредактировано (fallback): ' + translation);
        
      } else {
        throw new Error('API translation failed');
      }
      
    } catch (fallbackError) {
      console.log('❌ Альтернативный перевод также не сработал');
      
      await this.client.sendMessage(msg.chatId, {
        message: '❌ Ошибка перевода. Установите зависимости:\n`npm install @vitalets/google-translate-api`',
        replyTo: msg.id
      });
    }
  }
}

module.exports = TranslateModule;