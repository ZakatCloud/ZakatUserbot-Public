const https = require('https');

function WeatherModule(client, bot) {
    this.client = client;
    this.bot = bot;
    this.name = 'weather';
}

WeatherModule.prototype.getCommands = function() {
    return ['погода', 'weather'];
};

WeatherModule.prototype.handleMessage = async function(msg, text) {
    if (text.startsWith('погода ')) {
        const city = text.replace('погода ', '').trim();
        await this.getWeather(msg, city);
        return true;
    }
    return false;
};

WeatherModule.prototype.getWeather = async function(msg, city) {
    try {
        await this.client.editMessage(msg.chatId, { message: msg.id, text: '🌤 Получаю координаты...' });


        const coords = await this.getCityCoords(city);
        if (!coords) {
            await this.client.editMessage(msg.chatId, { 
                message: msg.id, 
                text: `❌ Город "${city}" не найден` 
            });
            return;
        }

        await this.client.editMessage(msg.chatId, { message: msg.id, text: '🌤 Запрашиваю погоду...' });


        const weatherData = await this.fetchOpenMeteo(coords.lat, coords.lon, city);
        
        await this.client.editMessage(msg.chatId, {
            message: msg.id,
            text: weatherData,
            parseMode: 'markdown'
        });

    } catch (error) {
        await this.client.editMessage(msg.chatId, { 
            message: msg.id, 
            text: '❌ Ошибка получения погоды' 
        });
    }
};

WeatherModule.prototype.getCityCoords = function(city) {
    return new Promise((resolve) => {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ru&format=json`;
        
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.results && result.results.length > 0) {
                        resolve({
                            lat: result.results[0].latitude,
                            lon: result.results[0].longitude,
                            name: result.results[0].name
                        });
                    } else {
                        resolve(null);
                    }
                } catch {
                    resolve(null);
                }
            });
        }).on('error', () => resolve(null));
    });
};

WeatherModule.prototype.fetchOpenMeteo = function(lat, lon, city) {
    return new Promise((resolve) => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=auto&forecast_days=1`;
        
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.current) {
                        const weatherText = this.formatWeather(result.current, city);
                        resolve(weatherText);
                    } else {
                        resolve('❌ Данные о погоде не получены');
                    }
                } catch {
                    resolve('❌ Ошибка обработки данных');
                }
            });
        }).on('error', () => {
            resolve('❌ Ошибка соединения с сервером погоды');
        });
    });
};

WeatherModule.prototype.formatWeather = function(current, city) {
    const temp = Math.round(current.temperature_2m);
    const feelsLike = Math.round(current.apparent_temperature);
    const humidity = current.relative_humidity_2m;
    const pressure = Math.round(current.pressure_msl * 0.75); // переводим в мм рт.ст.
    const windSpeed = current.wind_speed_10m;
    const windGusts = current.wind_gusts_10m;
    
    const weatherDesc = this.getWeatherDescription(current.weather_code);
    const windDir = this.getWindDirection(current.wind_direction_10m);


    let precipitation = '';
    if (current.rain > 0) precipitation = `💧 Дождь: ${current.rain}mm`;
    else if (current.showers > 0) precipitation = `🌦 Ливень: ${current.showers}mm`;
    else if (current.snowfall > 0) precipitation = `❄️ Снег: ${current.snowfall}cm`;
    else if (current.precipitation > 0) precipitation = `🌧 Осадки: ${current.precipitation}mm`;

    let text = `🌤 **Погода в ${city}**\n\n`;
    text += `• **Температура:** ${temp}°C\n`;
    text += `• **Ощущается как:** ${feelsLike}°C\n`;
    text += `• **Влажность:** ${humidity}%\n`;
    text += `• **Давление:** ${pressure} мм рт.ст.\n`;
    text += `• **Ветер:** ${windSpeed} м/с\n`;
    if (windGusts > windSpeed) text += `• **Порывы:** ${windGusts} м/с\n`;
    text += `• **Направление:** ${windDir}\n`;
    text += `• **Состояние:** ${weatherDesc}\n`;
    if (precipitation) text += `• ${precipitation}\n`;
    
    text += `\n📡 Источник: Open-Meteo.com`;

    return text;
};

WeatherModule.prototype.getWeatherDescription = function(code) {
    const weatherCodes = {
        0: '☀️ Ясно',
        1: '🌤 Преимущественно ясно',
        2: '⛅️ Переменная облачность',
        3: '☁️ Пасмурно',
        45: '🌫 Туман',
        48: '🌫 Инейный туман',
        51: '🌦 Легкая морось',
        53: '🌦 Умеренная морось',
        55: '🌦 Сильная морось',
        56: '🌧 Легкая ледяная морось',
        57: '🌧 Сильная ледяная морось',
        61: '🌧 Небольшой дождь',
        63: '🌧 Умеренный дождь',
        65: '🌧 Сильный дождь',
        66: '🌧 Легкий ледяной дождь',
        67: '🌧 Сильный ледяной дождь',
        71: '❄️ Небольшой снег',
        73: '❄️ Умеренный снег',
        75: '❄️ Сильный снег',
        77: '🌨 Снежные зерна',
        80: '🌦 Небольшой ливень',
        81: '🌦 Умеренный ливень',
        82: '🌦 Сильный ливень',
        85: '❄️ Небольшой снегопад',
        86: '❄️ Сильный снегопад',
        95: '⛈ Гроза',
        96: '⛈ Гроза с градом',
        99: '⛈ Сильная гроза с градом'
    };
    
    return weatherCodes[code] || `Код: ${code}`;
};

WeatherModule.prototype.getWindDirection = function(degrees) {
    const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
};

module.exports = WeatherModule;