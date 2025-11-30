function WhoisModule(client, bot) {
    this.client = client;
    this.bot = bot;
    this.name = 'whois';
    this.dnsServers = ['8.8.8.8', '1.1.1.1', '9.9.9.9'];
    this.commonPorts = [21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443, 445, 993, 995, 1723, 3306, 3389, 5432, 5900, 8080, 8443];
}

WhoisModule.prototype.getCommands = function() {
    return ['whois', 'инфо', 'порты', 'ports', 'scan'];
};

WhoisModule.prototype.handleMessage = async function(msg, text) {
    const command = text.toLowerCase().trim();
    
    if (command.startsWith('whois ') || command.startsWith('инфо ') || 
        command.startsWith('порты ') || command.startsWith('ports ') || 
        command.startsWith('scan ')) {
        
        const target = text.split(' ')[1];
        if (!target) {
            await this.client.sendMessage(msg.chatId, {
                message: '❌ Укажите домен или IP-адрес\nПример: `whois vk.com` или `whois 8.8.8.8`',
                replyTo: msg.id,
                parseMode: 'markdown'
            });
            return true;
        }
        
        await this.startWhoisLookup(msg, target);
        return true;
    }
    
    return false;
};

WhoisModule.prototype.startWhoisLookup = async function(msg, target) {
    try {
        const progressMsg = await this.client.sendMessage(msg.chatId, {
            message: '🔍 Собираю информацию...',
            replyTo: msg.id
        });


        const isIP = this.isValidIP(target);
        const isDomain = this.isValidDomain(target);
        
        if (!isIP && !isDomain) {
            await progressMsg.edit({
                text: '❌ Неверный формат. Укажите валидный IP-адрес или домен'
            });
            return;
        }

        let results = [];
        

        const [whoisInfo, dnsInfo, geoInfo, portsInfo] = await Promise.allSettled([
            this.getWhoisInfo(target),
            this.getDNSInfo(target),
            this.getGeoInfo(target),
            this.scanPorts(target)
        ]);


        let report = `🌐 **Информация о:** \`${target}\`\n\n`;


        if (whoisInfo.status === 'fulfilled' && whoisInfo.value) {
            report += `📋 **WHOIS:**\n${whoisInfo.value}\n\n`;
        }


        if (dnsInfo.status === 'fulfilled' && dnsInfo.value) {
            report += `🔗 **DNS:**\n${dnsInfo.value}\n\n`;
        }


        if (geoInfo.status === 'fulfilled' && geoInfo.value) {
            report += `📍 **Геолокация:**\n${geoInfo.value}\n\n`;
        }


        if (portsInfo.status === 'fulfilled' && portsInfo.value) {
            report += `🔒 **Порты:**\n${portsInfo.value}\n`;
        }


        if (report === `🌐 **Информация о:** \`${target}\`\n\n`) {
            report += '❌ Не удалось собрать информацию';
        }

 
        if (report.length > 4000) {
            const parts = this.splitMessage(report, 4000);
            for (const part of parts) {
                await this.client.sendMessage(msg.chatId, {
                    message: part,
                    parseMode: 'markdown'
                });
            }
            await progressMsg.delete();
        } else {
            await progressMsg.edit({
                text: report,
                parseMode: 'markdown'
            });
        }

    } catch (error) {
        console.log('Ошибка WHOIS:', error);
        await this.client.sendMessage(msg.chatId, {
            message: '❌ Ошибка при сборе информации',
            replyTo: msg.id
        });
    }
};

WhoisModule.prototype.getWhoisInfo = async function(target) {
    try {
        const { promisify } = require('util');
        const { exec } = require('child_process');
        const execAsync = promisify(exec);
        

        const command = process.platform === 'win32' 
            ? `whois ${target}`
            : `whois ${target} | head -20`; 

        const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
        
        if (stderr && !stdout) {
            return 'Информация недоступна';
        }


        const lines = stdout.split('\n').filter(line => 
            line.includes('Registrar:') || 
            line.includes('Creation Date:') || 
            line.includes('Updated Date:') || 
            line.includes('Expiration Date:') ||
            line.includes('Name Server:') ||
            line.includes('country:') ||
            line.includes('Organization:') ||
            line.includes('netname:')
        ).slice(0, 10); 

        return lines.length > 0 ? lines.join('\n') : 'Информация WHOIS не найдена';
        
    } catch (error) {
        return 'WHOIS: Ошибка запроса';
    }
};

WhoisModule.prototype.getDNSInfo = async function(target) {
    try {
        const dns = require('dns').promises;
        
        const records = [];
        
        // Получаем разные типы записей
        const queries = [
            dns.resolve4(target).catch(() => []),
            dns.resolve6(target).catch(() => []),
            dns.resolveMx(target).catch(() => []),
            dns.resolveTxt(target).catch(() => []),
            dns.resolveNs(target).catch(() => []),
            dns.resolveCname(target).catch(() => [])
        ];

        const results = await Promise.allSettled(queries);
        
        if (results[0].status === 'fulfilled' && results[0].value.length > 0) {
            records.push(`A: ${results[0].value.join(', ')}`);
        }
        
        if (results[1].status === 'fulfilled' && results[1].value.length > 0) {
            records.push(`AAAA: ${results[1].value.join(', ')}`);
        }
        
        if (results[2].status === 'fulfilled' && results[2].value.length > 0) {
            const mx = results[2].value.map(mx => `${mx.priority} ${mx.exchange}`).join(', ');
            records.push(`MX: ${mx}`);
        }
        
        if (results[3].status === 'fulfilled' && results[3].value.length > 0) {
            records.push(`TXT: ${results[3].value.flat().join(' | ').substring(0, 100)}...`);
        }
        
        if (results[4].status === 'fulfilled' && results[4].value.length > 0) {
            records.push(`NS: ${results[4].value.join(', ')}`);
        }

        return records.length > 0 ? records.join('\n') : 'DNS записи не найдены';
        
    } catch (error) {
        return 'DNS: Ошибка запроса';
    }
};

WhoisModule.prototype.getGeoInfo = async function(target) {
    try {
        const https = require('https');
        
        return new Promise((resolve) => {
            const req = https.get(`https://ipapi.co/${target}/json/`, (resp) => {
                let data = '';
                
                resp.on('data', (chunk) => {
                    data += chunk;
                });
                
                resp.on('end', () => {
                    try {
                        const geo = JSON.parse(data);
                        if (geo.error) {
                            resolve('Геоданные недоступны');
                            return;
                        }
                        
                        const info = [
                            `Страна: ${geo.country_name || 'N/A'}`,
                            `Город: ${geo.city || 'N/A'}`,
                            `Провайдер: ${geo.org || 'N/A'}`,
                            `Часовой пояс: ${geo.timezone || 'N/A'}`
                        ].filter(line => !line.includes('N/A'));
                        
                        resolve(info.join('\n') || 'Геоданные не найдены');
                    } catch (e) {
                        resolve('Геоданные: Ошибка парсинга');
                    }
                });
            });
            
            req.setTimeout(5000, () => {
                req.destroy();
                resolve('Геоданные: Таймаут');
            });
            
            req.on('error', () => {
                resolve('Геоданные: Ошибка запроса');
            });
        });
        
    } catch (error) {
        return 'Геоданные: Ошибка';
    }
};

WhoisModule.prototype.scanPorts = async function(target) {
    try {
        const net = require('net');
        const openPorts = [];
        
        const quickPorts = [21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995, 3389, 8080];
        
        const portChecks = quickPorts.map(port => {
            return new Promise((resolve) => {
                const socket = new net.Socket();
                socket.setTimeout(2000);
                
                socket.on('connect', () => {
                    openPorts.push(port);
                    socket.destroy();
                    resolve();
                });
                
                socket.on('timeout', () => {
                    socket.destroy();
                    resolve();
                });
                
                socket.on('error', () => {
                    socket.destroy();
                    resolve();
                });
                
                socket.connect(port, target);
            });
        });
        
        await Promise.allSettled(portChecks);
        
        if (openPorts.length > 0) {
            openPorts.sort((a, b) => a - b);
            return `Открытые порты: ${openPorts.join(', ')}`;
        } else {
            return 'Открытые порты не найдены';
        }
        
    } catch (error) {
        return 'Сканирование портов: Ошибка';
    }
};

WhoisModule.prototype.isValidIP = function(ip) {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;
    
    const parts = ip.split('.');
    return parts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
    });
};

WhoisModule.prototype.isValidDomain = function(domain) {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
    return domainRegex.test(domain);
};

WhoisModule.prototype.splitMessage = function(text, maxLength) {
    const parts = [];
    let currentPart = '';
    
    const lines = text.split('\n');
    for (const line of lines) {
        if (currentPart.length + line.length + 1 > maxLength) {
            parts.push(currentPart);
            currentPart = line + '\n';
        } else {
            currentPart += line + '\n';
        }
    }
    
    if (currentPart) {
        parts.push(currentPart);
    }
    
    return parts;
};

module.exports = WhoisModule;