const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('عرض قائمة الأوامر المتاحة'),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('📋 قائمة الأوامر')
            .setColor('#7c3aed')
            .addFields(
                { name: '/ping', value: 'التحقق من سرعة البوت', inline: true },
                { name: '/server-status', value: 'عرض حالة السيرفر', inline: true },
                { name: '/jobs', value: 'عرض إحصائيات الوظائف', inline: true },
                { name: '/coins', value: 'عرض رصيد HalfCoins', inline: true },
                { name: '/help', value: 'عرض هذه القائمة', inline: true }
            )
            .setFooter({ text: 'HalfRolePlay • ' + new Date().toLocaleString('ar-EG') });
        
        await interaction.reply({ embeds: [embed] });
    }
};