const mysql = require('mysql');
require('dotenv').config();

// ==============================================
// Database Config from .env
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
// Init Database
// ==============================================
function initDatabase() {
    pool = mysql.createPool(dbConfig);
    
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Database error:', err);
            return;
        }
        console.log('MySQL Website Tables Connected!');
        connection.release();
    });
    
    pool.on('error', (err) => {
        console.error('MySQL pool error:', err);
    });
    
    setInterval(() => {
        safeQuery('SELECT 1', [], (err) => {
            if (err) console.error('MySQL ping error:', err);
        });
    }, 60000);
}

// ==============================================
// Safe Query
// ==============================================
function safeQuery(sql, params = [], callback) {
    if (!pool) {
        if (callback) callback(new Error('Database not initialized'), null);
        return;
    }
    pool.getConnection((err, connection) => {
        if (err) {
            if (callback) callback(err, null);
            return;
        }
        connection.query(sql, params, (error, results) => {
            connection.release();
            if (callback) callback(error, results);
        });
    });
}

function safeQueryPromise(sql, params = []) {
    return new Promise((resolve, reject) => {
        safeQuery(sql, params, (error, results) => {
            if (error) reject(error);
            else resolve(results);
        });
    });
}

// ==============================================
// Get/Set Data
// ==============================================
function getData(key, callback) {
    safeQuery(
        'SELECT data_value, data_type FROM website_data WHERE data_key = ?',
        [key],
        (err, results) => {
            if (err) { callback(err, null); return; }
            if (results.length === 0) { callback(null, null); return; }
            try {
                const data = JSON.parse(results[0].data_value);
                callback(null, data);
            } catch (e) {
                callback(null, results[0].data_value);
            }
        }
    );
}

function setData(key, value, callback) {
    const jsonValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const dataType = typeof value === 'object' ? 'json' : 'string';
    
    safeQuery(
        `INSERT INTO website_data (data_key, data_value, data_type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data_value = ?, data_type = ?, updated_at = CURRENT_TIMESTAMP`,
        [key, jsonValue, dataType, jsonValue, dataType],
        (err) => { if (callback) callback(err); }
    );
}

// ==============================================
// User Balance
// ==============================================
function getUserBalance(discordId, callback) {
    getData('coins', (err, data) => {
        if (err) { callback(null, { balance: 0 }); return; }
        if (!data || !Array.isArray(data)) { callback(null, { balance: 0 }); return; }
        const user = data.find(u => u.discord_id === discordId);
        callback(null, { balance: user ? user.balance : 0 });
    });
}

function updateUserBalance(discordId, amount, reason, adminDiscord = null, adminUsername = null, callback) {
    getData('coins', (err, data) => {
        if (err) { callback(err); return; }
        let coins = data || [];
        let user = coins.find(u => u.discord_id === discordId);
        const currentBalance = user ? user.balance : 0;
        const newBalance = currentBalance + amount;
        
        if (newBalance < 0) { callback(new Error('Insufficient balance')); return; }
        
        if (user) {
            user.balance = newBalance;
            user.last_updated = new Date().toISOString();
        } else {
            coins.push({ discord_id: discordId, balance: newBalance, last_updated: new Date().toISOString() });
        }
        
        setData('coins', coins, (setErr) => {
            if (setErr) { callback(setErr); return; }
            const type = amount > 0 ? 'add' : 'remove';
            getData('coin_logs', (logErr, logs) => {
                let coinLogs = logs || [];
                coinLogs.push({ discord_id: discordId, amount: Math.abs(amount), type, reason: reason || 'No reason', admin_discord: adminDiscord || null, admin_username: adminUsername || null, timestamp: new Date().toISOString() });
                if (coinLogs.length > 1000) coinLogs = coinLogs.slice(-1000);
                setData('coin_logs', coinLogs, () => { callback(null); });
            });
        });
    });
}

function getAllBalances(callback) {
    getData('coins', (err, data) => {
        if (err || !data || !Array.isArray(data)) { callback(null, []); return; }
        callback(null, [...data].sort((a, b) => b.balance - a.balance));
    });
}

function getCoinLogs(limit = 100, callback) {
    getData('coin_logs', (err, data) => {
        if (err || !data || !Array.isArray(data)) { callback(null, []); return; }
        callback(null, data.slice(0, limit));
    });
}

// ==============================================
// Shop Items
// ==============================================
function addShopItem(name, description, price, category, imageUrl, itemType, itemValue, createdBy, callback) {
    getData('shop_items', (err, data) => {
        if (err) { callback(err, null); return; }
        let items = data || [];
        const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
        items.push({ id: newId, name, description: description || '', price, category: category || 'vehicles', image_url: imageUrl || '', item_type: itemType || 'vehicle', item_value: itemValue || '', created_by: createdBy, created_at: new Date().toISOString(), stock: -1 });
        setData('shop_items', items, (setErr) => { if (setErr) { callback(setErr, null); return; } callback(null, newId); });
    });
}

function getAllShopItems(callback) { getData('shop_items', (err, data) => callback(err, data || [])); }

function getShopItem(id, callback) {
    getData('shop_items', (err, data) => {
        if (err || !data) { callback(err, null); return; }
        callback(null, data.find(i => i.id === id) || null);
    });
}

function deleteShopItem(id, callback) {
    getData('shop_items', (err, data) => {
        if (err) { callback(err); return; }
        let items = data || [];
        const filtered = items.filter(i => i.id !== id);
        if (filtered.length === items.length) { callback(new Error('Item not found')); return; }
        setData('shop_items', filtered, callback);
    });
}

function updateShopItem(id, name, description, price, category, imageUrl, itemType, itemValue, callback) {
    getData('shop_items', (err, data) => {
        if (err) { callback(err); return; }
        let items = data || [];
        const index = items.findIndex(i => i.id === id);
        if (index === -1) { callback(new Error('Item not found')); return; }
        items[index].name = name;
        items[index].description = description || '';
        items[index].price = price;
        items[index].category = category || 'vehicles';
        items[index].image_url = imageUrl || '';
        items[index].item_type = itemType || 'vehicle';
        items[index].item_value = itemValue || '';
        setData('shop_items', items, callback);
    });
}

// ==============================================
// Purchases
// ==============================================
function addPurchase(discordId, itemId, itemName, price, callback) {
    getData('purchases', (err, data) => {
        if (err) { callback(err, null); return; }
        let purchases = data || [];
        const newId = purchases.length > 0 ? Math.max(...purchases.map(i => i.id)) + 1 : 1;
        purchases.push({ id: newId, discord_id: discordId, item_id: itemId, item_name: itemName, price, status: 'completed', purchase_date: new Date().toISOString() });
        if (purchases.length > 500) purchases = purchases.slice(-500);
        setData('purchases', purchases, (setErr) => { if (setErr) { callback(setErr, null); return; } callback(null, newId); });
    });
}

function getUserPurchases(discordId, callback) {
    getData('purchases', (err, data) => {
        if (err || !data) { callback(err, []); return; }
        callback(null, data.filter(p => p.discord_id === discordId).sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date)).slice(0, 10));
    });
}

function getAllPurchases(callback) { getData('purchases', (err, data) => callback(err, data || [])); }

// ==============================================
// Init Tables
// ==============================================
function initTables() {
    safeQuery(
        `CREATE TABLE IF NOT EXISTS website_data (
            id INT PRIMARY KEY AUTO_INCREMENT,
            data_key VARCHAR(100) UNIQUE NOT NULL,
            data_value LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
            data_type VARCHAR(20) DEFAULT 'json',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_key (data_key)
        )`,
        [],
        (err) => {
            if (err) { console.error('Error creating table:', err); return; }
            console.log('website_data table ready');
            getData('coins', (err, data) => {
                if (!err && data === null) {
                    setData('coins', []);
                    setData('coin_logs', []);
                    setData('shop_items', []);
                    setData('purchases', []);
                    console.log('Default data initialized');
                }
            });
        }
    );
}

// ==============================================
// Export
// ==============================================
module.exports = {
    initDatabase, initTables,
    safeQuery, safeQueryPromise,
    getData, setData,
    getUserBalance, updateUserBalance, getAllBalances, getCoinLogs,
    addShopItem, getAllShopItems, getShopItem, deleteShopItem, updateShopItem,
    addPurchase, getUserPurchases, getAllPurchases
};