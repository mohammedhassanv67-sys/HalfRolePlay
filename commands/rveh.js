const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-vehicle')
        .setDescription('حذف سيارة من المتجر')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('معرف السيارة في المتجر')
                .setRequired(true)
                .setMinValue(1)),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply('❌ هذا الأمر مخصص للمشرفين فقط!');
        }

        const itemId = interaction.options.getInteger('id');

        try {
            const response = await axios.delete(`http://localhost:3000/api/admin/shop/remove-vehicle/${itemId}`, {
                headers: {
                    'Authorization': `Bot ${process.env.BOT_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                const embed = new EmbedBuilder()
                    .setTitle('🗑️ تم حذف السيارة')
                    .setColor('#ff0000')
                    .setDescription(`تم حذف السيارة رقم **#${itemId}** بنجاح`)
                    .setFooter({ text: `تمت بواسطة ${interaction.user.username}` })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.editReply(`❌ فشل الحذف: ${response.data.message || 'خطأ غير معروف'}`);
            }

        } catch (error) {
            console.error('❌ Error removing vehicle:', error);
            await interaction.editReply('❌ حدث خطأ أثناء حذف السيارة');
        }
    }
};