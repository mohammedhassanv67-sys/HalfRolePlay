const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coins')
        .setDescription('عرض رصيد HalfCoins الخاص بك'),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            // جلب رصيد المستخدم من الموقع
            const response = await axios.get('http://localhost:3000/api/session', {
                headers: { Cookie: interaction.user.id }
            });
            
            // هنا تقدر تجلب الرصيد من قاعدة البيانات
            const embed = new EmbedBuilder()
                .setTitle('🪙 رصيد HalfCoins')
                .setDescription(`رصيدك الحالي: **0** عملات`)
                .setColor('#fbbf24')
                .setFooter({ text: 'HalfRolePlay • ' + new Date().toLocaleString('ar-EG') });
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ حدث خطأ في جلب الرصيد');
        }
    }
};