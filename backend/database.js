const mysql = require('mysql');
require('dotenv').config();
// ==============================================
// 🔹 إعدادات قاعدة البيانات
// ==============================================
const dbConfig = {
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    acquireTimeout: 30000,
    connectTimeout: 30000,
    waitForConnections: true,
    queueLimit: 0
};

let pool;

// ==============================================
// 🔹 قائمة الرتب (نفس نظام البوت)
// ==============================================
const ADMIN_RANKS = {
    0: 'Player',
    1: 'Trial Admin',
    2: 'Admin',
    3: 'Lead Admin',
    4: 'Senior Admin',
    5: 'Supervisor',
    6: 'Head Admin',
    7: 'Vice Founder',
    8: 'Founder',
    9: 'Server Control',
    10: 'Community Developer',
    11: 'Community Manager',
    12: 'Community Owner'
};

// ==============================================
// 🔹 تهيئة قاعدة البيانات
// ==============================================
function initDatabase() {
    pool = mysql.createPool(dbConfig);
    
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('❌ Database error:', err);
            return;
        }
        console.log('✅ MySQL Pool Connected!');
        console.log(`   Host: ${dbConfig.host}`);
        console.log(`   Database: ${dbConfig.database}`);
        connection.release();
    });
    
    pool.on('error', (err) => {
        console.error('❌ MySQL pool error:', err);
    });
    
    setInterval(() => {
        safeQuery('SELECT 1', [], (err) => {
            if (err) console.error('❌ MySQL ping error:', err);
        });
    }, 60000);
}

// ==============================================
// 🔹 دالة safeQuery
// ==============================================
function safeQuery(sql, params = [], callback) {
    if (!pool) {
        console.error('❌ Database not initialized!');
        if (callback) callback(new Error('Database not initialized'), null);
        return;
    }
    
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('❌ Connection error:', err);
            if (callback) callback(err, null);
            return;
        }
        
        connection.query(sql, params, (error, results) => {
            connection.release();
            if (callback) callback(error, results);
        });
    });
}

// ==============================================
// 🔹 دالة Promise للاستعلامات
// ==============================================
function safeQueryPromise(sql, params = []) {
    return new Promise((resolve, reject) => {
        safeQuery(sql, params, (error, results) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(results);
        });
    });
}

// ==============================================
// 🔹 دالة جلب اسم الرتبة
// ==============================================
function getRankName(rank) {
    return ADMIN_RANKS[rank] || 'Player';
}

// ==============================================
// 🔹 دوال جلب البيانات
// ==============================================

// ==============================================
// 🔹 جلب معلومات المستخدم بواسطة Discord ID - معدل
// ==============================================
function getUserByDiscord(discordId, callback) {
    console.log(`🔍 Searching for user with discordId: ${discordId}`);
    
    if (!discordId) {
        console.error('❌ Discord ID is required');
        return callback(new Error('Discord ID is required'), null);
    }
    
    // ✅ البحث في عمود discord (وليس id)
    safeQuery(
        `SELECT id, username, admin, mtaserial, email, credits, activated, lastlogin, registerdate, discord 
         FROM accounts WHERE discord = ?`,
        [discordId],
        (err, results) => {
            if (err) {
                console.error('❌ getUserByDiscord error:', err);
                return callback(err, null);
            }
            
            if (results && results.length > 0) {
                console.log(`✅ User found: ${results[0].username} (ID: ${results[0].id})`);
                return callback(null, results[0]);
            }
            
            console.log(`❌ No user found for discordId: ${discordId}`);
            
            // ✅ محاولة البحث باستخدام id كـ fallback
            safeQuery(
                `SELECT id, username, admin, mtaserial, email, credits, activated, lastlogin, registerdate, discord 
                 FROM accounts WHERE id = ?`,
                [discordId],
                (err2, results2) => {
                    if (err2 || !results2 || results2.length === 0) {
                        console.log(`❌ No user found with id: ${discordId}`);
                        return callback(null, null);
                    }
                    console.log(`✅ User found via fallback (id): ${results2[0].username}`);
                    callback(null, results2[0]);
                }
            );
        }
    );
}

// ==============================================
// 🔹 جلب معلومات المستخدم بواسطة Username - معدل
// ==============================================
function getUserByUsername(username, callback) {
    safeQuery(
        `SELECT id, username, admin, mtaserial, email, credits, activated, lastlogin, registerdate, discord 
         FROM accounts WHERE username = ?`,
        [username],
        (err, results) => {
            if (err || !results || results.length === 0) {
                callback(err, null);
                return;
            }
            callback(null, results[0]);
        }
    );
}
// جلب شخصيات المستخدم
function getCharactersByAccountId(accountId, callback) {
    safeQuery(
        `SELECT id, charactername, money, bankmoney, hoursplayed, age, lastarea, lastlogin 
         FROM characters WHERE account = ? ORDER BY id ASC`,
        [accountId],
        (err, results) => {
            if (err || !results) {
                callback(err, []);
                return;
            }
            callback(null, results);
        }
    );
}

// جلب معلومات شخصية محددة
function getCharacterById(charId, accountId, callback) {
    safeQuery(
        `SELECT * FROM characters WHERE id = ? AND account = ?`,
        [charId, accountId],
        (err, results) => {
            if (err || !results || results.length === 0) {
                callback(err, null);
                return;
            }
            callback(null, results[0]);
        }
    );
}

// جلب جميع المستخدمين (للمشرفين)
function getAllUsers(callback) {
    safeQuery(
        `SELECT id, username, admin, email, credits, activated, discord, lastlogin 
         FROM accounts ORDER BY admin DESC, username ASC`,
        [],
        (err, results) => {
            if (err || !results) {
                callback(err, []);
                return;
            }
            callback(null, results);
        }
    );
}

// ==============================================
// 🔹 دوال العملات (للاستخدام من admin.js)
// ==============================================

// جلب رصيد المستخدم
function getUserBalance(discordId, callback) {
    // استخدام mysqlDB مباشرة
    const mysqlDB = require('./database-mysql');
    mysqlDB.getUserBalance(discordId, callback);
}

// تحديث رصيد المستخدم
function updateUserBalance(discordId, username, amount, reason, adminDiscord, adminUsername, callback) {
    const mysqlDB = require('./database-mysql');
    mysqlDB.updateUserBalance(discordId, username, amount, reason, adminDiscord, adminUsername, callback);
}

// جلب جميع الأرصدة (ترتيب اللاعبين)
function getAllBalances(callback) {
    const mysqlDB = require('./database-mysql');
    mysqlDB.getAllBalances(callback);
}

// جلب سجل العملات
function getCoinLogs(limit, callback) {
    const mysqlDB = require('./database-mysql');
    mysqlDB.getCoinLogs(limit, callback);
}

// ==============================================
// 🔹 دوال المتجر (للاستخدام من admin.js)
// ==============================================

// إضافة منتج جديد
function addShopItem(name, description, price, category, imageUrl, itemType, itemValue, createdBy, callback) {
    const mysqlDB = require('./database-mysql');
    mysqlDB.addShopItem(name, description, price, category, imageUrl, itemType, itemValue, createdBy, callback);
}

// جلب جميع المنتجات
function getAllShopItems(callback) {
    const mysqlDB = require('./database-mysql');
    mysqlDB.getAllShopItems(callback);
}

// جلب منتج معين
function getShopItem(id, callback) {
    const mysqlDB = require('./database-mysql');
    mysqlDB.getShopItem(id, callback);
}

// حذف منتج
function deleteShopItem(id, callback) {
    const mysqlDB = require('./database-mysql');
    mysqlDB.deleteShopItem(id, callback);
}

// تحديث منتج
function updateShopItem(id, name, description, price, category, imageUrl, itemType, itemValue, callback) {
    const mysqlDB = require('./database-mysql');
    mysqlDB.updateShopItem(id, name, description, price, category, imageUrl, itemType, itemValue, callback);
}

// تسجيل شراء
function addPurchase(discordId, username, itemId, itemName, price, callback) {
    const mysqlDB = require('./database-mysql');
    mysqlDB.addPurchase(discordId, username, itemId, itemName, price, callback);
}

// جلب مشتريات المستخدم
function getUserPurchases(discordId, callback) {
    const mysqlDB = require('./database-mysql');
    mysqlDB.getUserPurchases(discordId, callback);
}

// جلب جميع المشتريات
function getAllPurchases(callback) {
    const mysqlDB = require('./database-mysql');
    mysqlDB.getAllPurchases(callback);
}

// ==============================================
// 🔹 تنسيق التاريخ
// ==============================================
function formatDate(dateString) {
    if (!dateString) return 'غير معروف';
    const date = new Date(dateString);
    return date.toLocaleString('ar-EG');
}

// ==============================================
// 🔹 تصدير الوحدات
// ==============================================
module.exports = {
    initDatabase,
    safeQuery,
    safeQueryPromise,
    getUserByDiscord,
    getUserByUsername,
    getCharactersByAccountId,
    getCharacterById,
    getAllUsers,
    getRankName,
    formatDate,
    ADMIN_RANKS,
    // دوال العملات
    getUserBalance,
    updateUserBalance,
    getAllBalances,
    getCoinLogs,
    // دوال المتجر
    addShopItem,
    getAllShopItems,
    getShopItem,
    deleteShopItem,
    updateShopItem,
    addPurchase,
    getUserPurchases,
    getAllPurchases
};
