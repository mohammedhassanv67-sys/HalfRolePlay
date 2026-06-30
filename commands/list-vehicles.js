const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list-vehicles')
        .setDescription('عرض جميع السيارات في المتجر')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const response = await axios.get('http://localhost:3000/api/admin/shop/items');
            const items = response.data.items || [];
            const vehicles = items.filter(item => item.category === 'vehicles');

            if (vehicles.length === 0) {
                return interaction.editReply('❌ لا توجد سيارات في المتجر');
            }

            let description = `**عدد السيارات:** ${vehicles.length}\n\n`;
            vehicles.slice(0, 10).forEach((v, i) => {
                description += `**${i + 1}.** #${v.id} - **${v.name}**\n`;
                description += `   💰 ${v.price} HalfCoins | 🏷️ ${v.item_value || 'غير معروف'}\n\n`;
            });

            if (vehicles.length > 10) {
                description += `\n*... و ${vehicles.length - 10} سيارة أخرى*`;
            }

            const embed = new EmbedBuilder()
                .setTitle('🚗 قائمة السيارات في المتجر')
                .setDescription(description)
                .setColor('#fbbf24')
                .setFooter({ text: `آخر تحديث • ${new Date().toLocaleString('ar-EG')}` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ Error listing vehicles:', error);
            await interaction.editReply('❌ حدث خطأ في جلب السيارات');
        }
    }
};