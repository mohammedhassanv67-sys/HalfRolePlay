const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-vehicle')
        .setDescription('إضافة سيارة جديدة للمتجر')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('name')
                .setDescription('اسم السيارة')
                .setRequired(true)
                .setMaxLength(100))
        .addIntegerOption(option =>
            option.setName('price')
                .setDescription('سعر السيارة (بـ HalfCoins)')
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(option =>
            option.setName('model')
                .setDescription('موديل السيارة (رقم الموديل في MTA)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('brand')
                .setDescription('ماركة السيارة')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('year')
                .setDescription('سنة الصنع')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('image')
                .setDescription('رابط صورة السيارة')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('وصف السيارة')
                .setRequired(false)
                .setMaxLength(500)),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        // ✅ التحقق من صلاحية المشرف
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply('❌ هذا الأمر مخصص للمشرفين فقط!');
        }

        // ✅ جلب البيانات من الأمر
        const name = interaction.options.getString('name');
        const price = interaction.options.getInteger('price');
        const model = interaction.options.getString('model');
        const brand = interaction.options.getString('brand') || 'غير معروف';
        const year = interaction.options.getString('year') || '2024';
        const image = interaction.options.getString('image') || '';
        const description = interaction.options.getString('description') || `سيارة ${brand} ${name}`;

        // ✅ التحقق من صحة الموديل
        const modelNumber = parseInt(model);
        if (isNaN(modelNumber) || modelNumber < 400 || modelNumber > 612) {
            return interaction.editReply('❌ موديل السيارة غير صحيح! يجب أن يكون رقم بين 400 و 612');
        }

        try {
            // ✅ إرسال البيانات إلى API الموقع
            const response = await axios.post('http://localhost:3000/api/admin/shop/add-vehicle', {
                name: name,
                description: description,
                price: price,
                category: 'vehicles',
                image_url: image,
                item_type: 'vehicle',
                item_value: model,
                brand: brand,
                year: year,
                createdBy: interaction.user.username
            }, {
                headers: {
                    'Authorization': `Bot ${process.env.BOT_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ تم إضافة السيارة بنجاح')
                    .setColor('#00ff00')
                    .addFields(
                        { name: '🚗 السيارة', value: name, inline: true },
                        { name: '💰 السعر', value: `${price} HalfCoins`, inline: true },
                        { name: '🏷️ الموديل', value: model, inline: true },
                        { name: '🏢 الماركة', value: brand, inline: true },
                        { name: '📅 السنة', value: year, inline: true },
                        { name: '🆔 المعرف', value: `#${response.data.itemId || 'غير معروف'}`, inline: true }
                    )
                    .setFooter({ text: `تمت الإضافة بواسطة ${interaction.user.username}` })
                    .setTimestamp();

                if (image) {
                    embed.setImage(image);
                }

                await interaction.editReply({ embeds: [embed] });

                // ✅ إرسال إشعار للقناة العامة
                const publicChannel = interaction.guild.channels.cache.find(c => c.name === 'general' || c.name === 'إعلانات');
                if (publicChannel) {
                    const notifyEmbed = new EmbedBuilder()
                        .setTitle('🆕 سيارة جديدة في المتجر!')
                        .setDescription(`تمت إضافة **${name}** إلى المتجر بسعر **${price}** HalfCoins`)
                        .setColor('#fbbf24')
                        .setFooter({ text: 'تسوق الآن من /shop' });
                    
                    await publicChannel.send({ embeds: [notifyEmbed] });
                }

            } else {
                await interaction.editReply(`❌ فشل إضافة السيارة: ${response.data.message || 'خطأ غير معروف'}`);
            }

        } catch (error) {
            console.error('❌ Error adding vehicle:', error);
            await interaction.editReply('❌ حدث خطأ أثناء إضافة السيارة. تأكد من أن الموقع يعمل.');
        }
    }
};