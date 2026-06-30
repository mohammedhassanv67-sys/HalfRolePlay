const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

// ==============================================
// 🔹 إعدادات البوت
// ==============================================

const clientId = config.discord.clientId;
const guildId = config.discord.guildId;
const token = config.discord.botToken;

// ==============================================
// 🔹 جلب الأوامر من مجلد commands
// ==============================================

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('📂 Loading commands from:', commandsPath);
console.log('📄 Found files:', commandFiles);

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️ Command ${file} is missing "data" or "execute"`);
    }
}

console.log(`\n📋 Total commands loaded: ${commands.length}`);

// ==============================================
// 🔹 تسجيل الأوامر
// ==============================================

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log('\n🔄 Registering slash commands...');

        // ✅ تسجيل الأوامر في سيرفر معين
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );

        console.log('✅ Successfully registered slash commands!');
        console.log(`📋 Commands registered: ${commands.map(c => c.name).join(', ')}`);

        // ✅ (اختياري) تسجيل الأوامر عالمياً - علقها لو عايز تستخدمها
        /*
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands }
        );
        console.log('✅ Successfully registered global commands!');
        */

    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
})();