const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bot-info')
        .setDescription('عرض معلومات عن البوت'),
    
    async execute(interaction) {
        const embed = {
            title: '🤖 معلومات البوت',
            description: 'بوت HalfRolePlay الرسمي',
            color: 0x7c3aed,
            fields: [
                { name: '📌 الاسم', value: 'HalfRolePlay Bot', inline: true },
                { name: '📅 تاريخ الإنشاء', value: '2026', inline: true },
                { name: '👨‍💻 المطور', value: 'HalfRolePlay Team', inline: true }
            ],
            footer: {
                text: 'HalfRolePlay • ' + new Date().toLocaleString('ar-EG')
            }
        };
        
        await interaction.reply({ embeds: [embed] });
    }
};