const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

const database = require('./database');
const mysqlDB = require('./database-mysql');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

const config = {
    database: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    },
    discord: {
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        redirectUri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback',
        guildId: process.env.DISCORD_GUILD_ID,
        botToken: process.env.DISCORD_BOT_TOKEN
    },
    sessionSecret: process.env.SESSION_SECRET || 'halfroleplay_secret',
    websiteUrl: process.env.WEBSITE_URL || 'http://localhost:3000',
    encryptionKey: process.env.ENCRYPTION_KEY || 'default-key'
};

// ==============================================
// SECURITY
// ==============================================
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.disable('x-powered-by');

function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;');
}

app.use((req, res, next) => {
    if (req.body) Object.keys(req.body).forEach(key => { if (typeof req.body[key] === 'string') req.body[key] = sanitizeInput(req.body[key]); });
    next();
});

// ==============================================
// WEBHOOKS
// ==============================================
const WEBHOOK_CHAT = process.env.WEBHOOK_CHAT || '';
const WEBHOOK_VIP = process.env.WEBHOOK_VIP || '';
const WEBHOOK_VEHICLE = process.env.WEBHOOK_VEHICLE || '';
const WEBHOOK_LOGIN = process.env.WEBHOOK_LOGIN || '';
const WEBHOOK_LOGOUT = process.env.WEBHOOK_LOGOUT || '';
const WEBHOOK_ERROR = process.env.WEBHOOK_ERROR || '';
const WEBHOOK_BALANCE = process.env.WEBHOOK_BALANCE || '';
const WEBHOOK_BAN = process.env.WEBHOOK_BAN || '';
const WEBHOOK_UNBAN = process.env.WEBHOOK_UNBAN || '';
const WEBHOOK_SHOP = process.env.WEBHOOK_SHOP || '';
const WEBHOOK_APPLY = process.env.WEBHOOK_APPLY || '';

async function sendWebhook(url, embed) { if (!url) return; try { await axios.post(url, { embeds: [embed] }); } catch (e) {} }

function createEmbed(title, description, color, fields = []) {
    return { title: sanitizeInput(title), description: sanitizeInput(description), color, timestamp: new Date().toISOString(), fields: fields.map(f => ({ name: sanitizeInput(f.name), value: sanitizeInput(f.value), inline: f.inline })), footer: { text: 'HalfRolePlay' } };
}

async function sendChatWebhook(username, message, userId) { await sendWebhook(WEBHOOK_CHAT, createEmbed('Chat Message', `${username} sent a message`, 0x5865F2, [{ name: 'User', value: username, inline: true }, { name: 'Discord ID', value: userId || 'N/A', inline: true }, { name: 'Message', value: message.substring(0, 1000), inline: false }])); }
async function sendLoginWebhook(username, discordId, ip) { await sendWebhook(WEBHOOK_LOGIN, createEmbed('Login', `${username} logged in`, 0x00ff00, [{ name: 'User', value: username, inline: true }, { name: 'Discord ID', value: discordId || 'N/A', inline: true }, { name: 'IP', value: ip || 'N/A', inline: true }])); }
async function sendLogoutWebhook(username) { await sendWebhook(WEBHOOK_LOGOUT, createEmbed('Logout', `${username} logged out`, 0xff0000, [{ name: 'User', value: username, inline: true }])); }
async function sendVIPWebhook(playerName, vipName, price, days, remainingBalance) { await sendWebhook(WEBHOOK_VIP, createEmbed('VIP Purchase', `${playerName} purchased VIP`, 0xFFD700, [{ name: 'Player', value: playerName, inline: true }, { name: 'VIP', value: vipName, inline: true }, { name: 'Duration', value: `${days} Days`, inline: true }, { name: 'Price', value: `${price} EGP`, inline: true }, { name: 'Remaining', value: `${remainingBalance} EGP`, inline: true }])); }
async function sendVehicleWebhook(playerName, vehicleName, price, remainingBalance) { await sendWebhook(WEBHOOK_VEHICLE, createEmbed('Vehicle Purchase', `${playerName} purchased vehicle`, 0x00BFFF, [{ name: 'Player', value: playerName, inline: true }, { name: 'Vehicle', value: vehicleName, inline: true }, { name: 'Price', value: `${price} EGP`, inline: true }, { name: 'Remaining', value: `${remainingBalance} EGP`, inline: true }])); }

// ==============================================
// AVATAR
// ==============================================
const avatarCache = new Map();
async function fetchUserAvatar(discordId, avatarHash) {
    // إذا ما فيه discordId، استخدم الصورة الافتراضية
    if (!discordId) return 'assets/images/user-avatar.png';
    
    // إذا فيه avatar hash من Discord
    if (avatarHash) {
        return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.png?size=64`;
    }
    
    // Check cache
    if (avatarCache.has(discordId) && Date.now() - avatarCache.get(discordId).timestamp < 3600000) {
        return avatarCache.get(discordId).url;
    }
    
    // Discord default avatar
    const defaultAvatarNumber = (BigInt(discordId) >> 22n) % 6n;
    const def = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
    
    try {
        if (config.discord.botToken && config.discord.botToken.length > 20) {
            const r = await axios.get(`https://discord.com/api/v10/users/${discordId}`, { 
                headers: { Authorization: `Bot ${config.discord.botToken}` }, 
                timeout: 3000 
            });
            const url = r.data.avatar ? 
                `https://cdn.discordapp.com/avatars/${discordId}/${r.data.avatar}.png?size=64` : def;
            avatarCache.set(discordId, { url, timestamp: Date.now() });
            return url;
        }
    } catch (e) {
        console.log('Avatar fetch failed, using default');
    }
    return def;
}
// ==============================================
// COOLDOWN
// ==============================================
const purchaseCooldowns = new Map();
function checkPurchaseCooldown(discordId) {
    const now = Date.now(), last = purchaseCooldowns.get(discordId);
    if (last && (now - last) < 60000) { const r = Math.ceil((60000 - (now - last)) / 1000); return { allowed: false, remaining: r }; }
    purchaseCooldowns.set(discordId, now);
    return { allowed: true };
}

// ==============================================
// FILE UPLOAD
// ==============================================
const uploadDir = path.join(__dirname, '../assets/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({ destination: (req, file, cb) => cb(null, uploadDir), filename: (req, file, cb) => cb(null, 'vehicle_' + Date.now() + '_' + Math.round(Math.random() * 1E9) + path.extname(file.originalname).toLowerCase()) });
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => { const a = ['image/png','image/jpeg','image/jpg','image/webp']; cb(null, a.includes(file.mimetype)); } });

// ==============================================
// MTA FUNCTIONS
// ==============================================
function checkMtaLinked(discordId, callback) { database.safeQuery(`SELECT id, username, mtaserial FROM accounts WHERE discord = ?`, [discordId], (err, r) => { if (err || !r.length || !r[0].mtaserial) return callback(null, { linked: false }); callback(null, { linked: true, accountId: r[0].id, username: r[0].username, serial: r[0].mtaserial }); }); }

async function checkPlayerOnline(accountId) { 
    try { 
        const { createClient } = require('./mtasa'); 
        const c = createClient('161.97.115.58', 22059, 'discordBaba', 'Baba').connect(); 
        if (!c) return { online: false, message: 'Server offline' }; 
        const r = await c.resources.handler.getOnlinePlayers(); 
        const players = r.players || r || []; 
        const p = players.find(p => p.accountId == accountId || p.playerId == accountId); 
        return p ? { online: true, player: p } : { online: false, message: 'Player offline' }; 
    } catch (e) { return { online: false, message: 'Error' }; } 
}

// ==============================================
// MIDDLEWARE
// ==============================================
const requireAuth = (req, res, next) => { if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Login required' }); next(); };
const validatePurchase = (req, res, next) => { const { discordId, itemId } = req.body; if (!discordId || !itemId || isNaN(itemId) || parseInt(itemId) < 1) return res.status(400).json({ success: false }); next(); };
const validateVIP = (req, res, next) => { const { discordId, vipType } = req.body; if (!discordId || !vipType || !['bronze','silver','gold','diamond','premium','premiumplus'].includes(vipType)) return res.status(400).json({ success: false }); next(); };

// ==============================================
// RATE LIMIT
// ==============================================
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, message: { success: false }, standardHeaders: true, legacyHeaders: false });
const buyLimiter = rateLimit({ windowMs: 60 * 1000, max: 3, message: { success: false }, validate: { xForwardedForHeader: false } });

// ==============================================
// CORS
// ==============================================
const allowedOrigins = ['http://localhost:3000','http://127.0.0.1:3000','https://halfrp.netlify.app','https://half-website-for-me.onrender.com'];
app.use(cors({ origin: (o, cb) => cb(null, !o || allowedOrigins.includes(o)), credentials: true, methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization','Cookie'] }));
app.use('/api', generalLimiter);

// ==============================================
// DB
// ==============================================
database.initDatabase();
mysqlDB.initDatabase();
mysqlDB.initTables();

// ==============================================
// BODY PARSER & SESSION
// ==============================================
app.use(express.json({ limit: '10mb' }));

app.use(session({
    secret: config.sessionSecret || 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' },
    name: 'halfrp.sid'
}));

// ==============================================
// CHAT SYSTEM (SQLite)
// ==============================================
const SQLite3 = require('better-sqlite3');
const chatDB = new SQLite3('chat.db');

function filterBadWords(text) {
    const badWords = ['كس', 'امك', 'زب', 'عرص', 'خول', 'منيوك', 'شرموط', 'قحبه', 'ابن', 'fuck', 'shit', 'ass', 'bitch', 'damn'];
    let filtered = text;
    badWords.forEach(word => { const regex = new RegExp(word, 'gi'); filtered = filtered.replace(regex, '***'); });
    return filtered;
}

chatDB.exec(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    avatar TEXT,
    message TEXT NOT NULL,
    admin INTEGER DEFAULT 0,
    deleted INTEGER DEFAULT 0,
    edited INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
try { chatDB.exec(`ALTER TABLE messages ADD COLUMN edited INTEGER DEFAULT 0`); } catch (e) {}

const onlineUsers = new Map();
const messageCooldowns = new Map();

io.on('connection', (socket) => {
    socket.on('join', (user) => {
        onlineUsers.set(socket.id, user);
        io.emit('online count', onlineUsers.size);
        const msgs = chatDB.prepare('SELECT * FROM messages WHERE deleted = 0 ORDER BY id DESC LIMIT 50').all();
        socket.emit('chat history', msgs.reverse());
    });
    socket.on('load messages', () => {
        const msgs = chatDB.prepare('SELECT * FROM messages WHERE deleted = 0 ORDER BY id DESC LIMIT 50').all();
        socket.emit('chat history', msgs.reverse());
    });
    socket.on('chat message', (message) => {
        const user = onlineUsers.get(socket.id);
        if (!user) return;
        const now = Date.now();
        const lastMsg = messageCooldowns.get(user.userId);
        if (lastMsg && (now - lastMsg) < 3000) { socket.emit('error', 'Wait 3 seconds'); return; }
        messageCooldowns.set(user.userId, now);
        if (!message || message.trim().length === 0) return;
        if (message.length > 200) { socket.emit('error', 'Message too long'); return; }
        if (/https?:\/\//i.test(message)) { socket.emit('error', 'Links not allowed'); return; }
        const clean = filterBadWords(message.trim());
        const r = chatDB.prepare('INSERT INTO messages (user_id, username, avatar, message, admin) VALUES (?, ?, ?, ?, ?)').run(user.userId, user.username, user.avatar || '', clean, user.admin || 0);
        io.emit('chat message', { id: r.lastInsertRowid, user_id: user.userId, username: user.username, avatar: user.avatar || '', message: clean, admin: user.admin || 0, deleted: 0, edited: 0, timestamp: new Date().toISOString() });
        sendChatWebhook(user.username, clean, user.userId);
    });
    socket.on('edit message', (data) => {
        const user = onlineUsers.get(socket.id);
        const msg = chatDB.prepare('SELECT * FROM messages WHERE id = ?').get(data.id);
        if (!msg || !user || msg.user_id !== user.userId) return;
        const clean = filterBadWords(data.message.trim());
        chatDB.prepare('UPDATE messages SET message = ?, edited = 1 WHERE id = ?').run(clean, data.id);
        io.emit('message edited', { id: data.id, message: clean });
    });
    socket.on('delete message', (id) => {
        const user = onlineUsers.get(socket.id);
        const msg = chatDB.prepare('SELECT * FROM messages WHERE id = ?').get(id);
        if (!msg || !user) return;
        if (msg.user_id !== user.userId && user.admin < 1) return;
        chatDB.prepare('UPDATE messages SET deleted = 1 WHERE id = ?').run(id);
        io.emit('message deleted', { id });
    });
    socket.on('disconnect', () => { onlineUsers.delete(socket.id); io.emit('online count', onlineUsers.size); });
});

// ==============================================
// SETTINGS TABLE
// ==============================================
chatDB.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
const existingApp = chatDB.prepare('SELECT value FROM settings WHERE key = ?').get('application_open');
if (!existingApp) chatDB.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('application_open', '1');

function isApplicationOpen() { const row = chatDB.prepare('SELECT value FROM settings WHERE key = ?').get('application_open'); return row ? row.value === '1' : true; }
function setApplicationOpen(open) { chatDB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('application_open', open ? '1' : '0'); }

// ==============================================
// BAN SYSTEM
// ==============================================
chatDB.exec(`CREATE TABLE IF NOT EXISTS bans (user_id TEXT PRIMARY KEY, reason TEXT, banned_by TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
const bannedUsers = new Map();
const banRows = chatDB.prepare('SELECT * FROM bans').all();
banRows.forEach(r => bannedUsers.set(r.user_id, { reason: r.reason, bannedBy: r.banned_by }));

// ==============================================
// LOGIN LOGS
// ==============================================
chatDB.exec(`CREATE TABLE IF NOT EXISTS login_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, user_id TEXT, action TEXT, ip TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);

// ==============================================
// API: DISCORD ROLES
// ==============================================
app.get('/api/user-discord-roles/:discordId', async (req, res) => {
    try {
        const r = await axios.get(`https://discord.com/api/v10/guilds/${config.discord.guildId}/members/${req.params.discordId}`, { headers: { Authorization: `Bot ${config.discord.botToken}` } });
        res.json({ success: true, roles: r.data.roles || [] });
    } catch (e) { res.json({ success: false, roles: [] }); }
});

// ==============================================
// API: ADMIN CHAT
// ==============================================
app.get('/api/admin/chat-stats', requireAuth, (req, res) => { const total = chatDB.prepare('SELECT COUNT(*) as count FROM messages WHERE deleted = 0').get(); res.json({ success: true, total: total.count }); });
app.post('/api/admin/clear-chat', requireAuth, (req, res) => { chatDB.prepare('UPDATE messages SET deleted = 1').run(); io.emit('chat cleared'); res.json({ success: true }); });
app.get('/api/admin/chat-logs', requireAuth, (req, res) => { const messages = chatDB.prepare('SELECT * FROM messages ORDER BY id DESC LIMIT 100').all(); res.json({ success: true, messages }); });
app.delete('/api/admin/delete-message/:id', requireAuth, (req, res) => { chatDB.prepare('UPDATE messages SET deleted = 1 WHERE id = ?').run(req.params.id); res.json({ success: true }); });

// ==============================================
// API: ADMIN BALANCE
// ==============================================
app.post('/api/admin/give-balance', requireAuth, (req, res) => {
    const { userId, amount, reason } = req.body;
    if (!userId || !amount || amount <= 0) return res.json({ success: false, message: 'بيانات غير صحيحة' });
    mysqlDB.updateUserBalance(userId, amount, reason || 'اعطاء رصيد', req.session.userId, req.session.username, (err) => {
        if (err) return res.json({ success: false, message: err.message });
        sendWebhook(WEBHOOK_BALANCE, createEmbed('اعطاء رصيد', `${req.session.username} gave ${amount} EGP to ${userId}`, 0x4ade80, [{ name: 'Amount', value: `${amount} EGP`, inline: true }, { name: 'To', value: userId, inline: true }, { name: 'By', value: req.session.username, inline: true }]));
        res.json({ success: true });
    });
});

app.post('/api/admin/take-balance', requireAuth, (req, res) => {
    const { userId, amount, reason } = req.body;
    if (!userId || !amount || amount <= 0) return res.json({ success: false, message: 'بيانات غير صحيحة' });
    mysqlDB.updateUserBalance(userId, -amount, reason || 'سحب رصيد', req.session.userId, req.session.username, (err) => {
        if (err) return res.json({ success: false, message: err.message });
        sendWebhook(WEBHOOK_BALANCE, createEmbed('سحب رصيد', `${req.session.username} took ${amount} EGP from ${userId}`, 0xf87171, [{ name: 'Amount', value: `${amount} EGP`, inline: true }, { name: 'From', value: userId, inline: true }, { name: 'By', value: req.session.username, inline: true }]));
        res.json({ success: true });
    });
});

app.get('/api/admin/balance-logs', requireAuth, (req, res) => {
    mysqlDB.getCoinLogs(100, (err, logs) => res.json({ success: true, logs: logs || [] }));
});

// ==============================================
// API: ADMIN BANS
// ==============================================
app.post('/api/admin/ban', requireAuth, (req, res) => {
    const { userId, reason } = req.body;
    if (!userId || !reason) return res.json({ success: false });
    bannedUsers.set(userId, { reason, bannedBy: req.session.username });
    chatDB.prepare('INSERT OR REPLACE INTO bans (user_id, reason, banned_by) VALUES (?, ?, ?)').run(userId, reason, req.session.username);
    sendWebhook(WEBHOOK_BAN, createEmbed('حظر', `${userId} has been banned`, 0xf87171, [{ name: 'User', value: userId, inline: true }, { name: 'Reason', value: reason, inline: true }, { name: 'By', value: req.session.username, inline: true }]));
    res.json({ success: true });
});

app.post('/api/admin/unban', requireAuth, (req, res) => {
    const { userId } = req.body;
    bannedUsers.delete(userId);
    chatDB.prepare('DELETE FROM bans WHERE user_id = ?').run(userId);
    sendWebhook(WEBHOOK_UNBAN, createEmbed('فك حظر', `${userId} has been unbanned`, 0x4ade80, [{ name: 'User', value: userId, inline: true }, { name: 'By', value: req.session.username, inline: true }]));
    res.json({ success: true });
});

app.get('/api/admin/banned-users', requireAuth, (req, res) => {
    const users = chatDB.prepare('SELECT * FROM bans ORDER BY timestamp DESC LIMIT 100').all();
    res.json({ success: true, users });
});

// Ban middleware
app.use('/api', (req, res, next) => {
    const userId = req.session?.userId;
    if (userId && bannedUsers.has(userId)) return res.status(403).json({ success: false, message: 'You are banned' });
    next();
});

// ==============================================
// API: ADMIN SHOP
// ==============================================
app.post('/api/admin/shop/add', requireAuth, (req, res) => {
    const { name, price, type, category, value, image, description } = req.body;
    mysqlDB.addShopItem(name, description||'', price, category||'vehicles', image||'', type||'vehicle', value||'', req.session.username, (err, id) => {
        if (err) return res.json({ success: false });
        sendWebhook(WEBHOOK_SHOP, createEmbed('اضافة منتج', `${name} added`, 0x4ade80, [{ name: 'Name', value: name, inline: true }, { name: 'Price', value: `${price} EGP`, inline: true }]));
        res.json({ success: true, itemId: id });
    });
});

app.get('/api/admin/shop/all', requireAuth, (req, res) => {
    mysqlDB.getAllShopItems((err, items) => res.json({ success: true, items: items || [] }));
});

app.delete('/api/admin/shop/delete/:id', requireAuth, (req, res) => {
    mysqlDB.deleteShopItem(parseInt(req.params.id), (err) => res.json({ success: !err }));
});

app.put('/api/admin/shop/update/:id', requireAuth, (req, res) => {
    const { price } = req.body;
    mysqlDB.getShopItem(parseInt(req.params.id), (err, item) => {
        if (err || !item) return res.json({ success: false });
        mysqlDB.updateShopItem(item.id, item.name, item.description, price, item.category, item.image_url, item.item_type, item.item_value, (e) => res.json({ success: !e }));
    });
});

app.post('/api/admin/shop/toggle/:id', requireAuth, (req, res) => {
    mysqlDB.getShopItem(parseInt(req.params.id), (err, item) => {
        if (err || !item) return res.json({ success: false });
        const newHidden = item.hidden ? 0 : 1;
        mysqlDB.safeQuery('UPDATE website_data SET data_value = JSON_SET(data_value, ?, ?) WHERE data_key = ?', [`$[${item.id-1}].hidden`, newHidden, 'shop_items'], (e) => res.json({ success: !e }));
    });
});

// ==============================================
// API: ADMIN LOGS
// ==============================================
app.get('/api/admin/logs/:type', requireAuth, (req, res) => {
    const type = req.params.type;
    if (type === 'log-login') return res.json({ success: true, logs: chatDB.prepare('SELECT * FROM login_logs ORDER BY timestamp DESC LIMIT 100').all() });
    if (type === 'log-purchases') return mysqlDB.getAllPurchases((err, p) => res.json({ success: true, logs: p || [] }));
    if (type === 'log-balance') return mysqlDB.getCoinLogs(100, (err, l) => res.json({ success: true, logs: l || [] }));
    if (type === 'log-bans') return res.json({ success: true, logs: chatDB.prepare('SELECT * FROM bans ORDER BY timestamp DESC LIMIT 100').all() });
    res.json({ success: false });
});

// ==============================================
// API: ADMIN STATS
// ==============================================
app.get('/api/admin/daily-stats', requireAuth, (req, res) => {
    const visitors = chatDB.prepare("SELECT COUNT(DISTINCT user_id) as count FROM login_logs WHERE action='login' AND date(timestamp)=date('now')").get();
    const pageViews = chatDB.prepare("SELECT COUNT(*) as count FROM login_logs WHERE action='login' AND date(timestamp)=date('now')").get();
    res.json({ success: true, visitors: visitors?.count||0, pageViews: pageViews?.count||0, peakHour: '18:00 - 22:00', salesData: { labels: [], values: [] } });
});

// ==============================================
// API: ADMIN SEARCH
// ==============================================
app.get('/api/admin/search-player/:query', requireAuth, async (req, res) => {
    const query = req.params.query;
    database.safeQuery(`SELECT id, username, admin, discord FROM accounts WHERE discord = ? OR username = ?`, [query, query], async (err, results) => {
        if (err || !results || results.length === 0) return res.json({ success: false });
        const user = results[0];
        mysqlDB.getUserBalance(user.discord || user.id, (e, bal) => {
            mysqlDB.getUserPurchases(user.discord || user.id, (e2, purchases) => {
                res.json({ success: true, player: { username: user.username, discord: user.discord, admin: user.admin, balance: bal?.balance||0, purchases: purchases?purchases.length:0, online: false } });
            });
        });
    });
});

// ==============================================
// API: ADMIN ONLINE STAFF
// ==============================================
app.get('/api/admin/online-staff', requireAuth, async (req, res) => {
    try {
        const { createClient } = require('./mtasa');
        const c = createClient('161.97.115.58', 22059, 'discordBaba', 'Baba').connect();
        if (!c) return res.json({ success: false });
        const result = await c.resources.handler.getOnlinePlayers();
        const players = result.players || result || [];
        database.safeQuery(`SELECT username, admin, discord FROM accounts WHERE admin > 0`, [], (err, staffAccounts) => {
            if (err) return res.json({ success: false });
            const admins = [];
            staffAccounts.forEach(account => {
                if (players.some(p => p.accountName === account.username)) {
                    admins.push({ name: account.username, admin: account.admin, discordId: account.discord });
                }
            });
            res.json({ success: true, admins, supporters: [] });
        });
    } catch (e) { res.json({ success: false }); }
});

// ==============================================
// API: APPLICATIONS
// ==============================================
app.get('/api/apply-status', (req, res) => res.json({ open: isApplicationOpen() }));

app.post('/api/admin/set-apply', requireAuth, (req, res) => {
    const { open } = req.body;
    setApplicationOpen(open === true);
    res.json({ success: true, open: isApplicationOpen() });
});

app.post('/api/apply', async (req, res) => {
    if (!isApplicationOpen()) return res.json({ success: false, message: 'التقديم مقفول حاليا' });
    const { userId, username, age, hours, experience, whyMod, ruleBreak, conflict, skills } = req.body;
    if (!userId || !username) return res.json({ success: false, message: 'يجب تسجيل الدخول اولا' });
    const embed = {
        title: 'تقديم جديد - مراقب ديسكورد', description: `<@${userId}> قدم طلب للانضمام الى فريق المراقبة`, color: 0x60a5fa, timestamp: new Date().toISOString(),
        thumbnail: { url: `https://cdn.discordapp.com/avatars/${userId}/${req.session.avatar || '0'}.png?size=128` },
        author: { name: 'نظام التقديمات', icon_url: 'https://cdn.discordapp.com/icons/1486338722315112523/63c4d426a9340e51e46efd84e98c34f9.png?size=1024' },
        fields: [
            { name: 'المتقدم', value: `<@${userId}>`, inline: true }, { name: 'معرف الديسكورد', value: userId, inline: true }, { name: 'اسم المستخدم', value: username, inline: true },
            { name: 'العمر', value: age || 'غير محدد', inline: true }, { name: 'ساعات المراقبة يوميا', value: hours || 'غير محدد', inline: true }, { name: 'خبرة سابقة', value: experience === 'yes' ? 'نعم' : 'لا', inline: true },
            { name: 'لماذا تريد الانضمام؟', value: whyMod || 'غير محدد', inline: false }, { name: 'كيف تتعامل مع مخالفي القوانين؟', value: ruleBreak || 'غير محدد', inline: false },
            { name: 'كيف تتعامل مع خلافات الاعضاء؟', value: conflict || 'غير محدد', inline: false }, { name: 'مهاراتك وصفاتك', value: skills || 'غير محدد', inline: false }
        ],
        footer: { text: 'HalfRolePlay - نظام التقديمات', icon_url: 'https://cdn.discordapp.com/icons/1486338722315112523/63c4d426a9340e51e46efd84e98c34f9.png?size=1024' }
    };
    await sendWebhook(WEBHOOK_APPLY, embed);
    res.json({ success: true, message: 'تم ارسال طلبك بنجاح!' });
});


// ==============================================
// SUPPORT SYSTEM - INTERACTIVE CHAT (استبدل الجزء القديم)
// ==============================================

// Create tickets table
chatDB.exec(`CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Create ticket messages table (for conversation)
chatDB.exec(`CREATE TABLE IF NOT EXISTS ticket_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
)`);

// Add indexes for better performance
try { chatDB.exec(`CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id)`); } catch(e) {}
try { chatDB.exec(`CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id)`); } catch(e) {}
try { chatDB.exec(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)`); } catch(e) {}

// ==============================================
// User Support APIs
// ==============================================

// Create new ticket
app.post('/api/support/create', requireAuth, (req, res) => {
    const { type, title, message } = req.body;
    if (!type || !title || !message) {
        return res.json({ success: false, message: 'جميع الحقول مطلوبة' });
    }
    
    if (message.length > 2000) {
        return res.json({ success: false, message: 'الرسالة طويلة جداً' });
    }
    
    try {
        const result = chatDB.prepare(
            'INSERT INTO tickets (user_id, username, type, title, message) VALUES (?, ?, ?, ?, ?)'
        ).run(req.session.userId, req.session.username, type, title, message);
        
        const ticketId = result.lastInsertRowid;
        
        // Add first message to conversation
        chatDB.prepare(
            'INSERT INTO ticket_messages (ticket_id, user_id, username, message, is_admin) VALUES (?, ?, ?, ?, ?)'
        ).run(ticketId, req.session.userId, req.session.username, message, 0);
        
        // Notify admins via socket
        io.to('admin_room').emit('new_ticket', {
            ticketId: ticketId,
            username: req.session.username,
            title: title,
            type: type
        });
        
        // Also broadcast to all (admins might not be in room)
        io.emit('new_ticket_notification', {
            ticketId: ticketId,
            username: req.session.username,
            title: title
        });
        
        res.json({ 
            success: true, 
            message: 'تم ارسال التذكرة بنجاح',
            ticketId: ticketId 
        });
    } catch (e) {
        console.error('Error creating ticket:', e);
        res.json({ success: false, message: 'حدث خطأ في إنشاء التذكرة' });
    }
});

// Get user tickets
app.get('/api/support/tickets', requireAuth, (req, res) => {
    try {
        const tickets = chatDB.prepare(
            'SELECT * FROM tickets WHERE user_id = ? ORDER BY last_activity DESC LIMIT 50'
        ).all(req.session.userId);
        
        res.json({ success: true, tickets });
    } catch (e) {
        res.json({ success: false, tickets: [] });
    }
});

// Send message in ticket (user)
app.post('/api/support/message', requireAuth, (req, res) => {
    const { ticketId, message } = req.body;
    
    if (!ticketId || !message || !message.trim()) {
        return res.json({ success: false, message: 'الرسالة مطلوبة' });
    }
    
    if (message.length > 2000) {
        return res.json({ success: false, message: 'الرسالة طويلة جداً' });
    }
    
    try {
        const ticket = chatDB.prepare(
            'SELECT * FROM tickets WHERE id = ? AND user_id = ?'
        ).get(ticketId, req.session.userId);
        
        if (!ticket) {
            return res.json({ success: false, message: 'التذكرة غير موجودة' });
        }
        
        if (ticket.status === 'closed') {
            return res.json({ success: false, message: 'التذكرة مقفولة' });
        }
        
        // Add message
        chatDB.prepare(
            'INSERT INTO ticket_messages (ticket_id, user_id, username, message, is_admin) VALUES (?, ?, ?, ?, ?)'
        ).run(ticketId, req.session.userId, req.session.username, message.trim(), 0);
        
        // Update last activity
        chatDB.prepare(
            'UPDATE tickets SET last_activity = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(ticketId);
        
        // Notify admins
        io.to('admin_room').emit('ticket_new_message', {
            ticketId: ticketId,
            username: req.session.username,
            message: message.substring(0, 50)
        });
        
        io.emit('ticket_user_message', {
            ticketId: ticketId
        });
        
        res.json({ success: true });
    } catch (e) {
        console.error('Error sending message:', e);
        res.json({ success: false, message: 'حدث خطأ' });
    }
});

// Get ticket messages
app.get('/api/support/ticket/:id/messages', requireAuth, (req, res) => {
    try {
        const ticket = chatDB.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
        
        if (!ticket) {
            return res.json({ success: false, message: 'التذكرة غير موجودة' });
        }
        
        // Allow admin to view any ticket, users only their own
        if (req.session.admin < 1 && ticket.user_id !== req.session.userId) {
            return res.json({ success: false, message: 'غير مصرح' });
        }
        
        const messages = chatDB.prepare(
            'SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY timestamp ASC'
        ).all(req.params.id);
        
        res.json({ success: true, messages, ticket });
    } catch (e) {
        res.json({ success: false, message: 'حدث خطأ' });
    }
});

// ==============================================
// Admin Support APIs
// ==============================================

// Get all tickets (admin)
app.get('/api/admin/support-tickets', requireAuth, (req, res) => {
    if (req.session.admin < 1) {
        return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    
    try {
        const tickets = chatDB.prepare(`
            SELECT t.*, 
                (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count,
                (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id AND is_admin = 0 AND timestamp > t.last_activity) as new_user_messages
            FROM tickets t 
            ORDER BY 
                CASE t.status 
                    WHEN 'open' THEN 1 
                    WHEN 'replied' THEN 2 
                    ELSE 3 
                END,
                t.last_activity DESC 
            LIMIT 200
        `).all();
        
        res.json({ success: true, tickets });
    } catch (e) {
        console.error('Error loading tickets:', e);
        res.json({ success: false, tickets: [] });
    }
});

// Send message in ticket (admin)
app.post('/api/admin/support-message', requireAuth, (req, res) => {
    if (req.session.admin < 1) {
        return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    
    const { ticketId, message } = req.body;
    
    if (!ticketId || !message || !message.trim()) {
        return res.json({ success: false, message: 'الرسالة مطلوبة' });
    }
    
    if (message.length > 2000) {
        return res.json({ success: false, message: 'الرسالة طويلة جداً' });
    }
    
    try {
        const ticket = chatDB.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
        
        if (!ticket) {
            return res.json({ success: false, message: 'التذكرة غير موجودة' });
        }
        
        if (ticket.status === 'closed') {
            return res.json({ success: false, message: 'التذكرة مقفولة' });
        }
        
        // Add admin message
        chatDB.prepare(
            'INSERT INTO ticket_messages (ticket_id, user_id, username, message, is_admin) VALUES (?, ?, ?, ?, ?)'
        ).run(ticketId, req.session.userId, req.session.username, message.trim(), 1);
        
        // Update ticket status and last activity
        chatDB.prepare(
            "UPDATE tickets SET status = 'replied', last_activity = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(ticketId);
        
        // Send notification to user
        io.to(`user_${ticket.user_id}`).emit('notification', {
            type: 'ticket_reply',
            title: '📬 رد جديد على تذكرتك',
            message: `${req.session.username}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
            ticketId: ticketId
        });
        
        // Update admin panel if open
        io.emit('ticket_admin_message', {
            ticketId: ticketId,
            adminName: req.session.username,
            message: message.substring(0, 50)
        });
        
        // Send Discord webhook notification
        sendWebhook(WEBHOOK_CHAT, createEmbed(
            'رد على تذكرة دعم',
            `${req.session.username} رد على تذكرة #${ticketId}`,
            0x4ade80,
            [
                { name: 'المستخدم', value: ticket.username, inline: true },
                { name: 'التذكرة', value: `#${ticketId} - ${ticket.title}`, inline: true },
                { name: 'الرد', value: message.substring(0, 500), inline: false },
                { name: 'بواسطة', value: req.session.username, inline: true }
            ]
        ));
        
        res.json({ success: true });
    } catch (e) {
        console.error('Error sending admin message:', e);
        res.json({ success: false, message: 'حدث خطأ' });
    }
});

// Close ticket (admin)
app.post('/api/admin/support-close', requireAuth, (req, res) => {
    if (req.session.admin < 1) {
        return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    
    const { ticketId } = req.body;
    
    if (!ticketId) {
        return res.json({ success: false, message: 'معرف التذكرة مطلوب' });
    }
    
    try {
        const ticket = chatDB.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
        
        if (!ticket) {
            return res.json({ success: false, message: 'التذكرة غير موجودة' });
        }
        
        chatDB.prepare("UPDATE tickets SET status = 'closed', last_activity = CURRENT_TIMESTAMP WHERE id = ?").run(ticketId);
        
        // Add system message
        chatDB.prepare(
            'INSERT INTO ticket_messages (ticket_id, user_id, username, message, is_admin) VALUES (?, ?, ?, ?, ?)'
        ).run(ticketId, req.session.userId, 'النظام', `تم إغلاق التذكرة بواسطة ${req.session.username}`, 1);
        
        // Send notification to user
        io.to(`user_${ticket.user_id}`).emit('notification', {
            type: 'ticket_closed',
            title: '🔒 تم إغلاق تذكرتك',
            message: `تم إغلاق تذكرتك #${ticketId} من قبل الإدارة`,
            ticketId: ticketId
        });
        
        // Update admin panel
        io.emit('ticket_closed', {
            ticketId: ticketId
        });
        
        // Send Discord webhook
        sendWebhook(WEBHOOK_CHAT, createEmbed(
            'إغلاق تذكرة دعم',
            `${req.session.username} أغلق تذكرة #${ticketId}`,
            0xf87171,
            [
                { name: 'المستخدم', value: ticket.username, inline: true },
                { name: 'التذكرة', value: `#${ticketId} - ${ticket.title}`, inline: true },
                { name: 'بواسطة', value: req.session.username, inline: true }
            ]
        ));
        
        res.json({ success: true });
    } catch (e) {
        console.error('Error closing ticket:', e);
        res.json({ success: false, message: 'حدث خطأ' });
    }
});

// Admin reply to ticket (old API - for backward compatibility)
app.post('/api/admin/support-reply', requireAuth, (req, res) => {
    if (req.session.admin < 1) {
        return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    
    const { ticketId, reply } = req.body;
    
    if (!ticketId || !reply) {
        return res.json({ success: false, message: 'الرد مطلوب' });
    }
    
    try {
        // Add message to conversation
        chatDB.prepare(
            'INSERT INTO ticket_messages (ticket_id, user_id, username, message, is_admin) VALUES (?, ?, ?, ?, ?)'
        ).run(ticketId, req.session.userId, req.session.username, reply, 1);
        
        // Update ticket
        chatDB.prepare(
            "UPDATE tickets SET status = 'replied', reply = ?, replied_by = ?, last_activity = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(reply, req.session.username, ticketId);
        
        // Get ticket info
        const ticket = chatDB.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
        
        // Notify user
        if (ticket) {
            io.to(`user_${ticket.user_id}`).emit('notification', {
                type: 'ticket_reply',
                title: '📬 رد جديد على تذكرتك',
                message: `${req.session.username}: ${reply.substring(0, 100)}...`,
                ticketId: ticketId
            });
        }
        
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: 'حدث خطأ' });
    }
});


// ==============================================
// API ROUTES
// ==============================================
app.get('/api/ready', (req, res) => res.json({ ready: true }));
app.get('/api/guild', async (req, res) => { res.json({ success: true, guild: { name: 'HalfRolePlay', members: 0 } }); });
app.get('/api/users', async (req, res) => { database.getAllUsers(async (err, users) => { if (err || !users) return res.json({ success: false }); const d = users.map(u => ({ id: u.id, username: u.username, admin: u.admin, adminName: database.getRankName(u.admin), discord: u.discord, avatar: 'assets/images/user-avatar.png' })); d.sort((a, b) => b.admin - a.admin); res.json({ success: true, users: d }); }); });
app.get('/api/online-players', async (req, res) => { try { const { createClient } = require('./mtasa'); const c = createClient('161.97.115.58', 22059, 'discordBaba', 'Baba').connect(); if (!c) return res.json({ success: true, players: [], count: 0 }); const r = await c.resources.handler.getOnlinePlayers(); const players = r.players || r || []; res.json({ success: true, players: players.map(p => ({ characterName: p.characterName || 'Unknown', accountName: p.accountName || '', discordId: p.discordId || null, playerId: p.playerId || 0, accountId: p.accountId || 0 })), count: players.length }); } catch (e) { res.json({ success: true, players: [], count: 0 }); } });
let topPlayersCache = null, topPlayersCacheTime = 0;
app.get('/api/top-players', async (req, res) => { if (topPlayersCache && Date.now() - topPlayersCacheTime < 60000) return res.json(topPlayersCache); try { const [h, m] = await Promise.all([new Promise((r, rj) => database.safeQuery(`SELECT c.charactername, c.hoursplayed, a.discord FROM characters c LEFT JOIN accounts a ON c.account = a.id WHERE c.hoursplayed > 0 ORDER BY c.hoursplayed DESC LIMIT 10`, [], (e, d) => e ? rj(e) : r(d))), new Promise((r, rj) => database.safeQuery(`SELECT c.charactername, c.money, c.bankmoney, (c.money+c.bankmoney) as total_money, a.discord FROM characters c LEFT JOIN accounts a ON c.account = a.id ORDER BY total_money DESC LIMIT 10`, [], (e, d) => e ? rj(e) : r(d)))]); topPlayersCache = { success: true, topHours: (h||[]).map(r => ({ characterName: r.charactername||'Unknown', hours: r.hoursplayed||0, discordId: r.discord||'' })), topMoney: (m||[]).map(r => ({ characterName: r.charactername||'Unknown', money: r.money||0, bankmoney: r.bankmoney||0, total: r.total_money||0, discordId: r.discord||'' })) }; topPlayersCacheTime = Date.now(); res.json(topPlayersCache); } catch (e) { res.json({ success: false }); } });
app.get('/api/server-status', async (req, res) => { res.json({ success: true, data: { onlinePlayers: 0, peakPlayers: 0, maxPlayers: 1000, uptime: 0, status: 'offline' } }); });
app.post('/api/upload-image', upload.single('image'), (req, res) => { if (!req.file) return res.json({ success: false }); res.json({ success: true, url: `/assets/uploads/${req.file.filename}` }); });
app.get('/api/coins/:discordId', (req, res) => mysqlDB.getUserBalance(req.params.discordId, (e, d) => res.json({ success: !e, balance: d?.balance || 0 })));
app.get('/api/check-link/:discordId', (req, res) => checkMtaLinked(req.params.discordId, (e, d) => res.json(d || { linked: false })));
app.get('/api/check-online/:accountId', async (req, res) => res.json(await checkPlayerOnline(parseInt(req.params.accountId))));
app.get('/api/admin/shop/items', (req, res) => mysqlDB.getAllShopItems((e, i) => res.json({ success: !e, items: i || [] })));
app.post('/api/admin/shop/add-vehicle', (req, res) => { if (req.headers.authorization !== `Bot ${process.env.BOT_TOKEN}`) return res.status(401).json({ success: false }); const { name, description, price, category, image_url, item_type, item_value, createdBy } = req.body; mysqlDB.addShopItem(name, description||'', price, category||'vehicles', image_url||'', item_type||'vehicle', item_value||'', createdBy||'Bot', (e, id) => res.json({ success: !e, itemId: id })); });
app.delete('/api/admin/shop/remove-vehicle/:id', (req, res) => { if (req.headers.authorization !== `Bot ${process.env.BOT_TOKEN}`) return res.status(401).json({ success: false }); mysqlDB.deleteShopItem(parseInt(req.params.id), (e) => res.json({ success: !e })); });
app.put('/api/admin/shop/update-vehicle/:id', (req, res) => { if (req.headers.authorization !== `Bot ${process.env.BOT_TOKEN}`) return res.status(401).json({ success: false }); const { name, description, price, image_url, item_value } = req.body; mysqlDB.updateShopItem(parseInt(req.params.id), name, description, price, 'vehicles', image_url, 'vehicle', item_value, (e) => res.json({ success: !e })); });
app.post('/api/admin/shop/buy', buyLimiter, requireAuth, validatePurchase, async (req, res) => { const { discordId, itemId } = req.body; if (discordId !== req.session.discordId && discordId !== req.session.userId) return res.status(403).json({ success: false }); checkMtaLinked(discordId, async (e, l) => { if (!l?.linked) return res.json({ success: false }); const o = await checkPlayerOnline(l.accountId); if (!o.online) return res.json({ success: false, message: o.message || 'Offline' }); if (!checkPurchaseCooldown(discordId).allowed) return res.json({ success: false, message: 'Wait' }); mysqlDB.getShopItem(itemId, async (e2, item) => { if (!item) return res.json({ success: false }); mysqlDB.getUserBalance(discordId, async (e3, b) => { const bal = b?.balance || 0; if (bal < item.price) return res.json({ success: false, message: 'Insufficient' }); mysqlDB.updateUserBalance(discordId, -item.price, `Purchase: ${item.name}`, req.session.userId, req.session.username, async () => { mysqlDB.addPurchase(discordId, item.id, item.name, item.price, async () => { try { const c = require('./mtasa').createClient('161.97.115.58', 22059, 'discordBaba', 'Baba').connect(); if (c && item.item_type === 'vehicle') await c.resources.handler.makeVehicleForPlayer(l.accountId, parseInt(item.item_value)||411, 'Store'); } catch (ex) {} res.json({ success: true, message: `Purchased ${item.name}`, remainingBalance: bal - item.price }); }); }); }); }); }); });
app.post('/api/shop/buy-vip', buyLimiter, requireAuth, validateVIP, async (req, res) => { const { discordId, vipType } = req.body; const prices = { bronze: 10, silver: 15, gold: 20, diamond: 30, premium: 35, premiumplus: 40 }; const days = { bronze: 30, silver: 30, gold: 30, diamond: 30, premium: 30, premiumplus: 30 }; const names = { bronze: 'Bronze VIP', silver: 'Silver VIP', gold: 'Gold VIP', diamond: 'Diamond VIP', premium: 'Premium VIP', premiumplus: 'Premium Plus VIP' }; if (discordId !== req.session.discordId && discordId !== req.session.userId) return res.status(403).json({ success: false }); if (!checkPurchaseCooldown(discordId).allowed) return res.json({ success: false, message: 'Wait' }); checkMtaLinked(discordId, async (e, l) => { if (!l?.linked) return res.json({ success: false }); const o = await checkPlayerOnline(l.accountId); if (!o.online) return res.json({ success: false, message: o.message || 'Offline' }); mysqlDB.getUserBalance(discordId, async (e2, b) => { const bal = b?.balance || 0; if (bal < prices[vipType]) return res.json({ success: false, message: 'Insufficient' }); mysqlDB.updateUserBalance(discordId, -prices[vipType], `VIP: ${names[vipType]}`, req.session.userId, req.session.username, async () => { mysqlDB.addPurchase(discordId, 0, `VIP: ${names[vipType]}`, prices[vipType], async () => { try { const c = require('./mtasa').createClient('161.97.115.58', 22059, 'discordBaba', 'Baba').connect(); if (c) await c.resources.handler.buyVIPFromWebsite(o.player?.playerId || l.accountId, vipType, days[vipType]); } catch (ex) {} res.json({ success: true, message: `Purchased ${names[vipType]}`, remainingBalance: bal - prices[vipType] }); }); }); }); }); });
app.get('/api/vip-status/:accountId', requireAuth, async (req, res) => { try { res.json({ success: true, vips: [] }); } catch (e) { res.json({ success: false, vips: [] }); } });
app.get('/api/user', requireAuth, async (req, res) => { database.getUserByDiscord(req.session.discordId, async (e, u) => { if (e || !u) return res.json({ success: false }); database.getCharactersByAccountId(u.id, async (e2, c) => { const av = req.session.discordId ? await fetchUserAvatar(req.session.discordId) : 'assets/images/user-avatar.png'; res.json({ success: true, user: { id: u.id, username: u.username, admin: u.admin, adminName: database.getRankName(u.admin), mtaserial: u.mtaserial, email: u.email, credits: u.credits||0, activated: u.activated, lastlogin: database.formatDate(u.lastlogin), registerdate: database.formatDate(u.registerdate), avatar: av, discordId: req.session.discordId }, characters: c || [] }); }); }); });
app.get('/api/user-vehicles/:accountId', requireAuth, (req, res) => { database.safeQuery(`SELECT id FROM characters WHERE account = ? LIMIT 1`, [parseInt(req.params.accountId)], (e, r) => { if (!r?.length) return res.json({ success: true, vehicles: [] }); database.safeQuery(`SELECT v.id, v.plate, COALESCE(vc.brand,'') as brand, COALESCE(vc.model,'') as custom_model, COALESCE(vc.year,'') as year FROM vehicles v LEFT JOIN vehicles_custom vc ON v.id = vc.id WHERE v.owner = ? AND v.deleted = '1' LIMIT 50`, [r[0].id], (e2, r2) => { res.json({ success: true, vehicles: (r2||[]).map(v => { const b=v.brand, m=v.custom_model, y=v.year; return { id: v.id, plate: v.plate||'No plate', name: b&&m?(y?`${b} ${m} ${y}`:`${b} ${m}`):(b||m||`Vehicle #${v.id}`) }; }) }); }); }); });
app.get('/api/user-purchases/:discordId', requireAuth, (req, res) => mysqlDB.getUserPurchases(req.params.discordId, (e, p) => res.json({ success: !e, purchases: p || [] })));
app.get('/api/avatar/:discordId', async (req, res) => res.json({ success: true, avatar: await fetchUserAvatar(req.params.discordId) }));

app.get('/api/session', async (req, res) => { 
    if (req.session.userId) { 
        // ✅ استخدام avatar من session مباشرة
        const avatarHash = req.session.avatar || req.session.discordAvatar;
        const discordId = req.session.discordId || req.session.userId;
        
        let avatarUrl = 'assets/images/user-avatar.png';
        
        if (avatarHash) {
            // عنده صورة مخصصة من Discord
            avatarUrl = `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.png?size=64`;
        } else if (discordId) {
            // صورة افتراضية من Discord
            const defaultNum = (BigInt(discordId) >> 22n) % 6n;
            avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultNum}.png`;
        }
        
        return res.json({ 
            loggedIn: true, 
            userId: req.session.userId, 
            username: req.session.username, 
            admin: req.session.admin || 0, 
            adminName: database.getRankName(req.session.admin || 0), 
            avatar: avatarUrl, // ✅ الصورة الصحيحة
            discordId: discordId,
            isLinked: !!req.session.accountId 
        }); 
    } 
    res.json({ loggedIn: false }); 
});

app.get('/api/link/status', requireAuth, (req, res) => { database.safeQuery(`SELECT username, mtaserial FROM accounts WHERE discord = ?`, [req.session.userId], (e, r) => { if (r?.length && r[0].mtaserial) res.json({ success: true, linked: true, username: r[0].username, serial: r[0].mtaserial }); else res.json({ success: true, linked: false }); }); });

// ==============================================
// OAUTH
// ==============================================
app.get('/auth/discord', (req, res) => { const p = new URLSearchParams({ client_id: config.discord.clientId, redirect_uri: config.discord.redirectUri, response_type: 'code', scope: 'identify email guilds', state: Math.random().toString(36).substring(2,15) }); res.redirect(`https://discord.com/api/oauth2/authorize?${p.toString()}`); });

app.get('/auth/discord/callback', async (req, res) => { 
    const { code } = req.query; 
    if (!code) return res.redirect('/?error=no_code'); 
    try { 
        const t = await axios.post('https://discord.com/api/oauth2/token', 
            new URLSearchParams({ 
                client_id: config.discord.clientId, 
                client_secret: config.discord.clientSecret, 
                code, 
                grant_type: 'authorization_code', 
                redirect_uri: config.discord.redirectUri 
            }), 
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        ); 
        const u = await axios.get('https://discord.com/api/users/@me', { 
            headers: { Authorization: `Bearer ${t.data.access_token}` } 
        }); 
        
        // ✅ حفظ كل البيانات في session
        req.session.userId = u.data.id; 
        req.session.discordId = u.data.id; 
        req.session.username = u.data.username; 
        req.session.avatar = u.data.avatar;
        req.session.discordAvatar = u.data.avatar; // ✅ مهم للصورة
        
        // ✅ جلب رتبة المستخدم من قاعدة البيانات
        database.getUserByDiscord(u.data.id, (err, user) => {
            if (user) {
                req.session.admin = user.admin || 0;
                req.session.accountId = user.id;
            } else {
                req.session.admin = 0;
            }
        });
        
        sendLoginWebhook(u.data.username, u.data.id, req.ip); 
        req.session.save(e => res.redirect(e ? '/?error=session_error' : '/index.html')); 
    } catch (e) { 
        console.error('Auth error:', e.message);
        res.redirect('/?error=auth_failed'); 
    } 
});

app.get('/auth/logout', (req, res) => { const u = req.session?.username || 'Unknown'; const uid = req.session?.userId || ''; chatDB.prepare('INSERT INTO login_logs (username, user_id, action, ip) VALUES (?, ?, ?, ?)').run(u, uid, 'logout', req.ip); req.session.destroy(() => { sendLogoutWebhook(u); res.redirect('/'); }); });

// ==============================================
// LOGIN TRACKING
// ==============================================
app.use((req, res, next) => {
    if (req.session?.userId && req.path === '/api/session' && req.method === 'GET') {
        const existing = chatDB.prepare('SELECT id FROM login_logs WHERE user_id = ? AND action = ? ORDER BY timestamp DESC LIMIT 1').get(req.session.userId, 'login');
        if (!existing || (Date.now() - new Date(existing.timestamp).getTime()) > 600000) {
            chatDB.prepare('INSERT INTO login_logs (username, user_id, action, ip) VALUES (?, ?, ?, ?)').run(req.session.username, req.session.userId, 'login', req.ip);
        }
    }
    next();
});



// ==============================================
// SECURITY: Block /backend
// ==============================================
app.use((req, res, next) => { if (req.path.startsWith('/backend')) return res.status(404).sendFile(path.join(__dirname, '..', '404.html')); next(); });

// ==============================================
// STATIC
// ==============================================
app.use(express.static(path.join(__dirname, '..')));
app.use('/assets/uploads', express.static(path.join(__dirname, '../assets/uploads')));

// ==============================================
// 404
// ==============================================
app.use((req, res) => { res.status(404).sendFile(path.join(__dirname, '..', '404.html')); });

// ==============================================
// ERROR
// ==============================================
app.use((err, req, res, next) => { sendWebhook(WEBHOOK_ERROR, createEmbed('Error', err.message || 'Unknown', 0xff0000, [{ name: 'Path', value: req.path, inline: true }, { name: 'IP', value: req.ip, inline: true }])); res.status(500).json({ success: false }); });

// ==============================================
// START
// ==============================================
server.listen(PORT, '0.0.0.0', () => { console.log('========================================'); console.log('HalfRolePlay Website Server'); console.log(`Running on: http://localhost:${PORT}`); console.log('========================================'); });
