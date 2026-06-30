const Game = require('mtasa').Client;

class MTAClient {
    constructor(ip, port, username, password) {
        this.ip = ip;
        this.port = port;
        this.username = username;
        this.password = password;
        this.connection = null;
        this.resources = {
            handler: {
                // ============================================
                // 🟢 أوامر الأموال
                // ============================================
                giveThings: (amount, playerId, adminName) => {
                    return new Promise((resolve, reject) => {
                        if (!this.connection) {
                            reject('❌ السيرفر غير متصل');
                            return;
                        }
                        try {
                            const result = this.connection.resources.handler.giveThings(amount, playerId, adminName);
                            resolve(result || `✅ تم إعطاء $${amount} للاعب ${playerId}`);
                        } catch (error) {
                            reject(error.message);
                        }
                    });
                },
                takePlayerMoney: (username, amount) => {
                    return new Promise((resolve, reject) => {
                        if (!this.connection) {
                            reject('❌ السيرفر غير متصل');
                            return;
                        }
                        try {
                            const result = this.connection.resources.handler.takePlayerMoney(username, amount);
                            resolve(result);
                        } catch (error) {
                            reject(error.message);
                        }
                    });
                },
                givePlayerMoney: (username, amount) => {
                    return new Promise((resolve, reject) => {
                        if (!this.connection) {
                            reject('❌ السيرفر غير متصل');
                            return;
                        }
                        try {
                            const result = this.connection.resources.handler.givePlayerMoney(username, amount);
                            resolve(result);
                        } catch (error) {
                            reject(error.message);
                        }
                    });
                },

                // ============================================
                // 🚫 أوامر الحظر
                // ============================================
                banThePlayer: (playerId, adminName, reason, time) => {
                    return new Promise((resolve, reject) => {
                        if (!this.connection) {
                            reject('❌ السيرفر غير متصل');
                            return;
                        }
                        try {
                            const result = this.connection.resources.handler.banThePlayer(playerId, adminName, reason, time);
                            resolve(result || `✅ تم حظر اللاعب ${playerId}`);
                        } catch (error) {
                            reject(error.message);
                        }
                    });
                },
                banSerial: (serial, adminName, reason) => {
                    return new Promise((resolve, reject) => {
                        if (!this.connection) {
                            reject('❌ السيرفر غير متصل');
                            return;
                        }
                        try {
                            const result = this.connection.resources.handler.banSerial(serial, adminName, reason);
                            resolve(result || `✅ تم حظر السيريال ${serial}`);
                        } catch (error) {
                            reject(error.message);
                        }
                    });
                },
                unbanPlayer: (serial) => {
                    return new Promise((resolve, reject) => {
                        if (!this.connection) {
                            reject('❌ السيرفر غير متصل');
                            return;
                        }
                        try {
                            const result = this.connection.resources.handler.unbanPlayer(serial);
                            resolve(result || `✅ تم فك الحظر عن ${serial}`);
                        } catch (error) {
                            reject(error.message);
                        }
                    });
                },

                // ============================================
                // 🔍 معلومات اللاعب
                // ============================================
                getPlayerInfo: (playerId) => {
                    return new Promise((resolve, reject) => {
                        if (!this.connection) {
                            reject('❌ السيرفر غير متصل');
                            return;
                        }
                        try {
                            const result = this.connection.resources.handler.getPlayerInfo(playerId);
                            resolve(result);
                        } catch (error) {
                            reject(error.message);
                        }
                    });
                },

                // ============================================
// 🚗 أوامر المركبات - معدل
// ============================================
makeVehicleForPlayer: (playerId, model, adminName) => {
    return new Promise((resolve, reject) => {
        if (!this.connection) {
            reject('❌ السيرفر غير متصل');
            return;
        }
        try {
            console.log(`🚗 Calling makeVehicleForPlayer with ID: ${playerId}, Model: ${model}`);
            
            // ✅ التأكد من وجود الـ resource و الدالة
            if (!this.connection.resources || !this.connection.resources.handler) {
                reject('❌ Resource handler not found');
                return;
            }
            
            if (typeof this.connection.resources.handler.makeVehicleForPlayer !== 'function') {
                reject('❌ makeVehicleForPlayer function not found in MTA resource');
                return;
            }
            
            const result = this.connection.resources.handler.makeVehicleForPlayer(
                parseInt(playerId), 
                parseInt(model), 
                adminName || 'Admin'
            );
            
            console.log(`🚗 Result from MTA:`, result);
            resolve(result || `✅ تم إعطاء المركبة موديل ${model} للاعب ${playerId}`);
        } catch (error) {
            console.error('❌ makeVehicleForPlayer error:', error);
            reject(error.message || 'فشل في إعطاء المركبة');
        }
    });
},

                // ============================================
                // 🔄 أوامر الريستارت
                // ============================================
                restartServer: (minutes) => {
                    return new Promise((resolve, reject) => {
                        if (!this.connection) {
                            reject('❌ السيرفر غير متصل');
                            return;
                        }
                        try {
                            const result = this.connection.resources.handler.restartServer(minutes);
                            resolve(result || `🔄 سيتم إعادة التشغيل بعد ${minutes} دقائق`);
                        } catch (error) {
                            reject(error.message);
                        }
                    });
                },
                cancelRestart: () => {
                    return new Promise((resolve, reject) => {
                        if (!this.connection) {
                            reject('❌ السيرفر غير متصل');
                            return;
                        }
                        try {
                            const result = this.connection.resources.handler.cancelRestart();
                            resolve(result || `✅ تم إلغاء إعادة التشغيل`);
                        } catch (error) {
                            reject(error.message);
                        }
                    });
                },

                // ============================================
                // 📢 أوامر الإعلانات
                // ============================================
                sendAnnouncement: (message) => {
                    return new Promise((resolve, reject) => {
                        if (!this.connection) {
                            reject('❌ السيرفر غير متصل');
                            return;
                        }
                        try {
                            const result = this.connection.resources.handler.sendAnnouncement(message);
                            resolve(result || '✅ تم إرسال الإعلان');
                        } catch (error) {
                            reject(error.message);
                        }
                    });
                },

                // ============================================
                // 🎫 أوامر المزاد
                // ============================================
                giveAuctionItem: (username, itemType, auctionId) => {
                    return new Promise((resolve, reject) => {
                        if (!this.connection) {
                            reject('❌ السيرفر غير متصل');
                            return;
                        }
                        try {
                            const result = this.connection.resources.handler.giveAuctionItem(username, itemType, auctionId);
                            resolve(result);
                        } catch (error) {
                            reject(error.message);
                        }
                    });
                },
                acceptOrder: (userId, productId, price, category, value, productName) => {
                    return new Promise((resolve, reject) => {
                        if (!this.connection) {
                            reject('❌ السيرفر غير متصل');
                            return;
                        }
                        try {
                            const result = this.connection.resources.handler.acceptOrder(userId, productId, price, category, value, productName);
                            resolve(result);
                        } catch (error) {
                            reject(error.message);
                        }
                    });
                },

                // ============================================
                // 📋 أوامر الطلبات
                // ============================================
                playerRequest: (id, name, serial, action) => {
                    return new Promise((resolve, reject) => {
                        if (!this.connection) {
                            reject('❌ السيرفر غير متصل');
                            return;
                        }
                        try {
                            this.connection.resources.handler.playerRequest(id, name, serial, action);
                            resolve(true);
                        } catch (error) {
                            reject(error.message);
                        }
                    });
                },

                summonPlayer: (playerId, adminName, reason) => {
                    return new Promise((resolve, reject) => {
                        if (!this.connection) {
                            reject('❌ السيرفر غير متصل');
                            return;
                        }
                        try {
                            const result = this.connection.resources.handler.summonPlayer(
                                playerId,
                                adminName,
                                reason
                            );
                            resolve(result || `✅ تم استدعاء اللاعب ${playerId} للتحقيق`);
                        } catch (error) {
                            reject(error.message);
                        }
                    });
                },

                // ============================================
                // 🎨 أوامر السكن
                // ============================================
                giveSkin: (skinId, playerId, adminName) => {
                    return new Promise((resolve, reject) => {
                        if (!this.connection) {
                            reject('❌ السيرفر غير متصل');
                            return;
                        }
                        try {
                            const result = this.connection.resources.handler.giveSkin(skinId, playerId, adminName);
                            resolve(result || `✅ تم إعطاء السكن ${skinId} للاعب ${playerId}`);
                        } catch (error) {
                            reject(error.message);
                        }
                    });
                },
// ============================================
// 📋 جلب المتصلين في السيرفر (محدث)
// ============================================

getOnlinePlayers: () => {
    return new Promise((resolve, reject) => {
        if (!this.connection) {
            console.log('❌ No connection');
            resolve({ count: 0, max: 100, players: [] });
            return;
        }
        try {
            if (!this.connection.resources || !this.connection.resources.handler) {
                console.log('❌ handler resource not found');
                resolve({ count: 0, max: 100, players: [] });
                return;
            }
            
            if (typeof this.connection.resources.handler.getOnlinePlayers !== 'function') {
                console.log('❌ getOnlinePlayers function not found');
                resolve({ count: 0, max: 100, players: [] });
                return;
            }
            
            const result = this.connection.resources.handler.getOnlinePlayers();
            
            if (result && typeof result.then === 'function') {
                result.then(data => {
                    console.log('📊 Result from MTA (Promise resolved):', data);
                    let players = [];
                    if (Array.isArray(data)) {
                        players = data;
                    } else if (data && typeof data === 'object') {
                        players = Object.values(data);
                    }
                    resolve({ 
                        count: players.length, 
                        max: 100,
                        players: players 
                    });
                }).catch(err => {
                    console.error('❌ Promise error:', err);
                    resolve({ count: 0, max: 100, players: [] });
                });
                return;
            }
            
            let players = [];
            if (Array.isArray(result)) {
                players = result;
            } else if (result && typeof result === 'object') {
                players = Object.values(result);
            }
            
            console.log('📊 Result from MTA:', result);
            resolve({ 
                count: players.length, 
                max: 100,
                players: players 
            });
            
        } catch (error) {
            console.error('❌ getOnlinePlayers error:', error.message);
            resolve({ count: 0, max: 100, players: [] });
        }
    });
},

// ============================================
// 📊 دوال إحصائيات السيرفر - أضفها داخل resources.handler
// ============================================

// 🔹 جلب إحصائيات السيرفر العامة
getServerStats: () => {
    return new Promise((resolve, reject) => {
        if (!this.connection) {
            reject('❌ السيرفر غير متصل');
            return;
        }
        try {
            if (!this.connection.resources || !this.connection.resources.handler) {
                reject('❌ Resource handler not found');
                return;
            }
            
            if (typeof this.connection.resources.handler.getServerStats !== 'function') {
                reject('❌ getServerStats function not found');
                return;
            }
            
            const result = this.connection.resources.handler.getServerStats();
            
            if (result && typeof result.then === 'function') {
                result.then(data => resolve(data)).catch(err => reject(err));
                return;
            }
            
            resolve(result || {
                onlinePlayers: 0,
                peakPlayers: 0,
                maxPlayers: 1000,
                uptime: 0,
                totalAccounts: 0,
                totalVehicles: 0,
                workingPlayers: 0,
                status: 'offline',
                portEnabled: false,
                xpBonus: false
            });
        } catch (error) {
            console.error('❌ getServerStats error:', error);
            reject(error.message);
        }
    });
},

// 🔹 جلب إحصائيات الوظائف
getJobStats: () => {
    return new Promise((resolve, reject) => {
        if (!this.connection) {
            reject('❌ السيرفر غير متصل');
            return;
        }
        try {
            if (!this.connection.resources || !this.connection.resources.handler) {
                reject('❌ Resource handler not found');
                return;
            }
            
            if (typeof this.connection.resources.handler.getJobStats !== 'function') {
                reject('❌ getJobStats function not found');
                return;
            }
            
            const result = this.connection.resources.handler.getJobStats();
            
            if (result && typeof result.then === 'function') {
                result.then(data => resolve(data)).catch(err => reject(err));
                return;
            }
            
            resolve(result || {});
        } catch (error) {
            console.error('❌ getJobStats error:', error);
            reject(error.message);
        }
    });
},

// 🔹 جلب جميع بيانات السيرفر (مجمعة)
getFullServerStatus: () => {
    return new Promise((resolve, reject) => {
        if (!this.connection) {
            reject('❌ السيرفر غير متصل');
            return;
        }
        try {
            if (!this.connection.resources || !this.connection.resources.handler) {
                reject('❌ Resource handler not found');
                return;
            }
            
            if (typeof this.connection.resources.handler.getFullServerStatus !== 'function') {
                reject('❌ getFullServerStatus function not found');
                return;
            }
            
            const result = this.connection.resources.handler.getFullServerStatus();
            
            if (result && typeof result.then === 'function') {
                result.then(data => resolve(data)).catch(err => reject(err));
                return;
            }
            
            resolve(result || {
                onlinePlayers: 0,
                peakPlayers: 0,
                maxPlayers: 1000,
                uptime: 0,
                totalAccounts: 0,
                totalVehicles: 0,
                workingPlayers: 0,
                status: 'offline',
                portEnabled: false,
                xpBonus: false,
                jobStats: {}
            });
        } catch (error) {
            console.error('❌ getFullServerStatus error:', error);
            reject(error.message);
        }
    });
},
                // ============================================
                // 🏪 أوامر المتاجر
                // ============================================
                giveShopToPlayer: (username, shopId) => {
                    return new Promise((resolve, reject) => {
                        if (!this.connection) {
                            reject('❌ السيرفر غير متصل');
                            return;
                        }
                        try {
                            const result = this.connection.resources.handler.giveShopToPlayer(username, shopId);
                            resolve(result || `✅ تم إعطاء المتجر ${shopId} للاعب ${username}`);
                        } catch (error) {
                            reject(error.message);
                        }
                    });
                },

                // ============================================
                // 💰 أوامر الرصيد
                // ============================================
                getPlayerBalance: (playerId) => {
                    return new Promise((resolve, reject) => {
                        if (!this.connection) {
                            reject('❌ السيرفر غير متصل');
                            return;
                        }
                        try {
                            const result = this.connection.resources.handler.getPlayerBalance(playerId);
                            resolve(result);
                        } catch (error) {
                            reject(error.message);
                        }
                    });
                },

                // ============================================
// 🔒 أوامر السجن - معدل
// ============================================
jailPlayerFromDiscord: (playerId, minutes, reason, url, adminName) => {
    return new Promise((resolve, reject) => {
        if (!this.connection) {
            reject('❌ السيرفر غير متصل');
            return;
        }
        try {
            console.log(`🔒 Calling jailPlayerFromDiscord with ID: ${playerId}, Minutes: ${minutes}`);
            
            // ✅ التأكد من وجود الـ resource و الدالة
            if (!this.connection.resources || !this.connection.resources.handler) {
                reject('❌ Resource handler not found');
                return;
            }
            
            if (typeof this.connection.resources.handler.jailPlayerFromDiscord !== 'function') {
                reject('❌ jailPlayerFromDiscord function not found in MTA resource');
                return;
            }
            
            const result = this.connection.resources.handler.jailPlayerFromDiscord(
                parseInt(playerId),
                parseInt(minutes),
                reason || 'No reason',
                url || '',
                adminName || 'Discord Bot'
            );
            
            console.log(`🔒 Result from MTA:`, result);
            resolve(result || `✅ تم سجن اللاعب ${playerId} لمدة ${minutes} دقيقة`);
        } catch (error) {
            console.error('❌ jailPlayerFromDiscord error:', error);
            reject(error.message || 'فشل في سجن اللاعب');
        }
    });
},
                unjailPlayerFromDiscord: (playerId, adminName) => {
    return new Promise((resolve, reject) => {
        if (!this.connection) {
            reject('❌ السيرفر غير متصل');
            return;
        }
        try {
            console.log(`🔓 Calling unjailPlayerFromDiscord with ID: ${playerId}`);
            
            if (!this.connection.resources || !this.connection.resources.handler) {
                reject('❌ Resource handler not found');
                return;
            }
            
            if (typeof this.connection.resources.handler.unjailPlayerFromDiscord !== 'function') {
                reject('❌ unjailPlayerFromDiscord function not found in MTA resource');
                return;
            }
            
            const result = this.connection.resources.handler.unjailPlayerFromDiscord(
                parseInt(playerId),
                adminName || 'Discord Bot'
            );
            
            console.log(`🔓 Result from MTA:`, result);
            resolve(result || `✅ تم فك السجن عن اللاعب ${playerId}`);
        } catch (error) {
            console.error('❌ unjailPlayerFromDiscord error:', error);
            reject(error.message || 'فشل في فك السجن');
        }
    });
},






// ============================================
// 👑 أوامر الراعي VIP للمتجر
// ============================================

// ✅ شراء VIP من الموقع
buyVIPFromWebsite: (playerId, vipType, days) => {
    return new Promise((resolve, reject) => {
        if (!this.connection) {
            reject('❌ السيرفر غير متصل');
            return;
        }
        try {
            console.log(`👑 Calling buyVIPFromWebsite - PlayerID: ${playerId}, Type: ${vipType}, Days: ${days}`);
            
            if (!this.connection.resources?.handler?.buyVIPFromWebsite) {
                reject('❌ buyVIPFromWebsite function not found');
                return;
            }
            
            // ✅ Call the MTA function
            const result = this.connection.resources.handler.buyVIPFromWebsite(
                parseInt(playerId),
                vipType,
                parseInt(days) || 30
            );
            
            console.log(`👑 Raw VIP Result type:`, typeof result);
            console.log(`👑 Raw VIP Result:`, result);
            
            // ✅ Handle both sync and async results
            if (result && typeof result.then === 'function') {
                // Async result (Promise)
                result.then(data => {
                    console.log(`👑 VIP Result (async):`, data);
                    resolve(data);
                }).catch(err => {
                    console.error('❌ VIP async error:', err);
                    reject(err.message || err);
                });
            } else {
                // Sync result
                console.log(`👑 VIP Result (sync):`, result);
                resolve(result || `✅ تم تسليم ${vipType} للاعب ${playerId}`);
            }
        } catch (error) {
            console.error('❌ buyVIPFromWebsite error:', error);
            reject(error.message || 'فشل في شراء الراعي');
        }
    });
},

// ✅ إعطاء راعي من الأدمن (موجودة في handler.lua)
giveVIPToPlayer: (playerId, vipType, days, silent, adminName) => {
    return new Promise((resolve, reject) => {
        if (!this.connection) {
            reject('❌ السيرفر غير متصل');
            return;
        }
        try {
            console.log(`👑 Calling giveVIPToPlayer - PlayerID: ${playerId}, Type: ${vipType}, Days: ${days}`);
            
            if (!this.connection.resources || !this.connection.resources.handler) {
                reject('❌ Resource handler not found');
                return;
            }
            
            if (typeof this.connection.resources.handler.giveVIPToPlayer !== 'function') {
                reject('❌ giveVIPToPlayer function not found');
                return;
            }
            
            const result = this.connection.resources.handler.giveVIPToPlayer(
                parseInt(playerId),
                vipType,
                parseInt(days),
                silent || false,
                adminName || 'Admin'
            );
            
            console.log(`👑 VIP Result:`, result);
            resolve(result || `✅ تم إعطاء ${vipType} للاعب ${playerId}`);
        } catch (error) {
            console.error('❌ giveVIPToPlayer error:', error);
            reject(error.message || 'فشل في إعطاء الراعي');
        }
    });
},

// ✅ إزالة راعي من لاعب
removeVIPFromPlayer: (playerName, vipType, adminName) => {
    return new Promise((resolve, reject) => {
        if (!this.connection) {
            reject('❌ السيرفر غير متصل');
            return;
        }
        try {
            console.log(`👑 Calling removeVIPFromPlayer - Player: ${playerName}, Type: ${vipType}`);
            
            if (!this.connection.resources || !this.connection.resources.handler) {
                reject('❌ Resource handler not found');
                return;
            }
            
            if (typeof this.connection.resources.handler.removeVIPFromPlayer !== 'function') {
                reject('❌ removeVIPFromPlayer function not found');
                return;
            }
            
            const result = this.connection.resources.handler.removeVIPFromPlayer(
                playerName,
                vipType,
                adminName || 'Admin'
            );
            
            resolve(result || `✅ تم إزالة ${vipType} من ${playerName}`);
        } catch (error) {
            console.error('❌ removeVIPFromPlayer error:', error);
            reject(error.message || 'فشل في إزالة الراعي');
        }
    });
},

// ✅ التحقق من وجود VIP للاعب
checkPlayerVIP: (playerId, vipType) => {
    return new Promise((resolve, reject) => {
        if (!this.connection) {
            reject('❌ السيرفر غير متصل');
            return;
        }
        try {
            console.log(`🔍 Checking VIP for PlayerID: ${playerId}, Type: ${vipType}`);
            
            if (!this.connection.resources || !this.connection.resources.handler) {
                reject('❌ Resource handler not found');
                return;
            }
            
            if (typeof this.connection.resources.handler.checkPlayerVIP !== 'function') {
                // لو الدالة مش موجودة، نرجع false
                resolve({ hasVIP: false });
                return;
            }
            
            const result = this.connection.resources.handler.checkPlayerVIP(
                parseInt(playerId),
                vipType
            );
            
            if (result && typeof result.then === 'function') {
                result.then(data => resolve(data)).catch(() => resolve({ hasVIP: false }));
                return;
            }
            
            resolve(result || { hasVIP: false });
        } catch (error) {
            console.error('❌ checkPlayerVIP error:', error);
            resolve({ hasVIP: false });
        }
    });
},

// ✅ جلب قائمة اللاعبين اللي معاهم VIP
getVIPPlayers: () => {
    return new Promise((resolve, reject) => {
        if (!this.connection) {
            reject('❌ السيرفر غير متصل');
            return;
        }
        try {
            console.log('📡 Fetching VIP players list...');
            
            if (!this.connection.resources || !this.connection.resources.handler) {
                reject('❌ Resource handler not found');
                return;
            }
            
            if (typeof this.connection.resources.handler.requestVIPPlayers !== 'function') {
                reject('❌ requestVIPPlayers function not found');
                return;
            }
            
            const result = this.connection.resources.handler.requestVIPPlayers();
            resolve(result || []);
        } catch (error) {
            console.error('❌ getVIPPlayers error:', error);
            reject(error.message);
        }
    });
},








                getJailedPlayers: () => {
                    return new Promise((resolve, reject) => {
                        if (!this.connection) {
                            reject('❌ السيرفر غير متصل');
                            return;
                        }
                        try {
                            console.log('📡 Calling getJailedPlayers...');
                            const result = this.connection.resources.handler.getJailedPlayers();
                            console.log('📡 Result from MTA:', result);
                            if (result && typeof result === 'string') {
                                resolve(result);
                            } else if (result === false || result === null) {
                                resolve('📋 لا يوجد مسجونين حالياً');
                            } else {
                                resolve(result || '📋 لا يوجد مسجونين حالياً');
                            }
                        } catch (error) {
                            console.error('Jailed error in mtasa.js:', error.message);
                            reject(error.message);
                        }
                    });
                },
                setPlayerBalance: (playerId, amount) => {
                    return new Promise((resolve, reject) => {
                        if (!this.connection) {
                            reject('❌ السيرفر غير متصل');
                            return;
                        }
                        try {
                            const result = this.connection.resources.handler.setPlayerBalance(playerId, amount);
                            resolve(result);
                        } catch (error) {
                            reject(error.message);
                        }
                    });
                }
            },
            discordLink: {
                triggerIt: (username) => {
                    if (this.connection?.resources?.discordLink?.triggerIt) {
                        this.connection.resources.discordLink.triggerIt(username);
                    }
                    console.log(`📌 Discord link triggered for ${username}`);
                },
                getRolesTrigger: (username) => {
                    if (this.connection?.resources?.discordLink?.getRolesTrigger) {
                        this.connection.resources.discordLink.getRolesTrigger(username);
                    }
                    console.log(`📌 Get roles triggered for ${username}`);
                },
                removeRolesTrigger: (username) => {
                    if (this.connection?.resources?.discordLink?.removeRolesTrigger) {
                        this.connection.resources.discordLink.removeRolesTrigger(username);
                    }
                    console.log(`📌 Remove roles triggered for ${username}`);
                }
            }
        };
    }

    connect() {
        try {
            console.log(`🔌 Connecting to MTA Server at ${this.ip}:${this.port}...`);
            this.connection = new Game(this.ip, this.port, this.username, this.password);
            console.log(`✅ MTA Server connected successfully!`);
            return this.connection;
        } catch (error) {
            console.error(`❌ Failed to connect to MTA Server:`, error.message);
            return null;
        }
    }
}

function createClient(ip, port, username, password) {
    return new MTAClient(ip, port, username, password);
}

module.exports = { createClient };