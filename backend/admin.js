const express = require('express');
const router = express.Router();
const { createClient } = require('./mtasa');
const mysqlDB = require('./database-mysql');

// ============================================ */
// 🔹 إعدادات MTA
// ============================================ */
const mtaConfig = {
    ip: '161.97.115.58',
    port: 22059,
    username: 'discordBaba',
    password: 'Baba'
};

let mtaClient = null;
let mtaConnected = false;

// ============================================ */
// 🔹 الاتصال بـ MTA
// ============================================ */
function connectMTA() {
    try {
        mtaClient = createClient(mtaConfig.ip, mtaConfig.port, mtaConfig.username, mtaConfig.password);
        const connection = mtaClient.connect();
        if (connection) {
            console.log('✅ MTA Client Connected!');
            mtaConnected = true;
            return true;
        }
        mtaConnected = false;
        return false;
    } catch (error) {
        console.error('❌ MTA Connection Error:', error.message);
        mtaConnected = false;
        return false;
    }
}

connectMTA();

// ============================================ */
// 🔹 منع السبام
// ============================================ */
const purchaseCooldowns = new Map();
const COOLDOWN_TIME = 60 * 1000; // 60 ثانية

function checkPurchaseCooldown(discordId) {
    const now = Date.now();
    const lastPurchase = purchaseCooldowns.get(discordId);
    
    if (lastPurchase && (now - lastPurchase) < COOLDOWN_TIME) {
        const remaining = Math.ceil((COOLDOWN_TIME - (now - lastPurchase)) / 1000);
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        
        let timeMessage = '';
        if (minutes > 0) {
            timeMessage = `${minutes} دقيقة و ${seconds} ثانية`;
        } else {
            timeMessage = `${seconds} ثانية`;
        }
        
        return { allowed: false, remaining, timeMessage };
    }
    
    purchaseCooldowns.set(discordId, now);
    return { allowed: true };
}

// ============================================ */
// 🔹 جلب منتجات المتجر
// ============================================ */
router.get('/shop/items', (req, res) => {
    mysqlDB.getAllShopItems((err, items) => {
        if (err) {
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, items: items });
    });
});

// ============================================ */
// 🔹 شراء منتج من المتجر (مع تسليم MTA)
// ============================================ */
router.post('/shop/buy', async (req, res) => {
    const { discordId, itemId } = req.body;
    
    console.log('🛒 Purchase request:', { discordId, itemId });
    
    // ✅ التحقق من الجلسة
    if (!req.session || !req.session.userId) {
        return res.json({ success: false, message: '❌ يجب تسجيل الدخول أولاً' });
    }
    
    const sessionDiscordId = req.session.discordId || req.session.userId;
    if (discordId !== sessionDiscordId) {
        return res.json({ success: false, message: '❌ لا يمكنك الشراء لحساب آخر' });
    }
    
    if (!discordId || !itemId) {
        return res.json({ success: false, message: 'بيانات غير صحيحة' });
    }
    
    // ✅ منع السبام
    const cooldownCheck = checkPurchaseCooldown(discordId);
    if (!cooldownCheck.allowed) {
        return res.json({ 
            success: false, 
            message: `⏳ انتظر ${cooldownCheck.timeMessage} قبل الشراء مرة أخرى`,
            cooldown: cooldownCheck.remaining 
        });
    }
    
    // ✅ جلب المنتج
    mysqlDB.getShopItem(itemId, async (err, item) => {
        if (err || !item) {
            console.error('❌ Item not found:', err);
            return res.json({ success: false, message: 'المنتج غير موجود' });
        }
        
        console.log('📦 Item found:', item);
        
        const { getUserByDiscord, safeQuery } = require('./database');
        
        // ✅ جلب المستخدم
        getUserByDiscord(discordId, async (userErr, user) => {
            if (userErr || !user) {
                console.error('❌ User not found for discordId:', discordId);
                return res.json({ 
                    success: false, 
                    message: '❌ لم يتم العثور على المستخدم. تأكد من ربط حسابك بـ Discord' 
                });
            }
            
            console.log('✅ User found:', { id: user.id, username: user.username });
            
            // ✅ جلب الرصيد
            mysqlDB.getUserBalance(discordId, async (err2, data) => {
                if (err2) {
                    return res.json({ success: false, message: err2.message });
                }
                
                const currentBalance = data?.balance || 0;
                console.log(`💰 Current balance: ${currentBalance}`);
                
                if (currentBalance < item.price) {
                    return res.json({ 
                        success: false, 
                        message: `❌ رصيدك غير كافي! المتاح: ${currentBalance}، المطلوب: ${item.price}` 
                    });
                }
                
                // ✅ خصم العملات
                mysqlDB.updateUserBalance(discordId, -item.price, `شراء ${item.name}`, 'System', 'System', async (err3) => {
                    if (err3) {
                        return res.json({ success: false, message: err3.message });
                    }
                    
                    // ✅ تسجيل الشراء
                    mysqlDB.addPurchase(discordId, item.id, item.name, item.price, async (err4, purchaseId) => {
                        if (err4) {
                            return res.json({ success: false, message: err4.message });
                        }
                        
                        console.log(`📝 Purchase recorded: ID ${purchaseId}`);
                        
                        // ✅ جلب الـ Player ID
                        const accountId = user.id;
                        let playerId = null;
                        let characterName = user.username;
                        
                        try {
                            const charResult = await new Promise((resolve, reject) => {
                                safeQuery(
                                    `SELECT id, charactername FROM characters WHERE account = ? LIMIT 1`,
                                    [accountId],
                                    (err, results) => {
                                        if (err) reject(err);
                                        else resolve(results);
                                    }
                                );
                            });
                            
                            if (charResult && charResult.length > 0) {
                                playerId = charResult[0].id;
                                characterName = charResult[0].charactername || user.username;
                                console.log(`🎭 Character found: ${characterName} (ID: ${playerId})`);
                            } else {
                                playerId = accountId;
                                console.log(`⚠️ No character found, using account ID: ${playerId}`);
                            }
                        } catch (charError) {
                            console.error('❌ Character fetch error:', charError);
                            playerId = accountId;
                        }
                        
                        let mtaResult = '⚠️ تم الشراء ولكن فشل التسليم للسيرفر';
                        let successMessage = `✅ تم شراء ${item.name} بنجاح!`;
                        
                        // ✅ تسليم العنصر عبر MTA
                        if (mtaConnected && mtaClient && mtaClient.resources && mtaClient.resources.handler) {
                            try {
                                const adminName = '🛒 المتجر';
                                let deliveryResult = null;
                                
                                console.log(`📦 Delivering ${item.item_type} to player ${playerId}`);
                                
                                if (item.item_type === 'vehicle') {
                                    const modelId = parseInt(item.item_value) || 411;
                                    deliveryResult = await mtaClient.resources.handler.makeVehicleForPlayer(
                                        playerId, modelId, adminName
                                    );
                                    if (deliveryResult && !deliveryResult.includes('خطأ')) {
                                        mtaResult = `✅ تم تسليم السيارة للاعب ${characterName}`;
                                        successMessage = `✅ تم شراء ${item.name} وتسليمها بنجاح!`;
                                    }
                                } else if (item.item_type === 'skin') {
                                    const skinId = parseInt(item.item_value) || 0;
                                    deliveryResult = await mtaClient.resources.handler.giveSkin(
                                        skinId, playerId, adminName
                                    );
                                    if (deliveryResult && !deliveryResult.includes('خطأ')) {
                                        mtaResult = `✅ تم تسليم السكن للاعب ${characterName}`;
                                        successMessage = `✅ تم شراء ${item.name} وتسليمها بنجاح!`;
                                    }
                                } else if (item.item_type === 'money') {
                                    const amount = parseInt(item.item_value) || 1000;
                                    deliveryResult = await mtaClient.resources.handler.giveThings(
                                        amount, playerId, adminName
                                    );
                                    if (deliveryResult && !deliveryResult.includes('خطأ')) {
                                        mtaResult = `✅ تم تسليم $${amount} للاعب ${characterName}`;
                                        successMessage = `✅ تم شراء ${item.name} وتسليمها بنجاح!`;
                                    }
                                }
                                
                                console.log('📦 Delivery result:', deliveryResult);
                            } catch (mtaError) {
                                console.error('❌ MTA delivery error:', mtaError);
                                mtaResult = `⚠️ تم الشراء ولكن فشل التسليم: ${mtaError.message}`;
                            }
                        }
                        
                        res.json({
                            success: true,
                            message: successMessage,
                            remainingBalance: currentBalance - item.price,
                            purchaseId: purchaseId,
                            mtaResult: mtaResult,
                            itemName: item.name
                        });
                    });
                });
            });
        });
    });
});

module.exports = {
    router: router,
    mtaClient: mtaClient,
    mtaConnected: mtaConnected,
    connectMTA: connectMTA
};