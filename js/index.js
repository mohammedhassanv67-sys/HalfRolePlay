// ============================================
// HalfRolePlay - Index Page (Secured)
// ============================================

// ============================================
// 🔹 Secure Functions (وظائف أمنية)
// ============================================

// 🔹 منع XSS - تنظيف النصوص
function sanitizeHTML(str) {
    if (!str) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        "/": '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };
    return String(str).replace(/[&<>"'`=\/]/g, function(s) {
        return map[s];
    });
}

// 🔹 التحقق من ايدي ديسكورد
function isValidDiscordId(id) {
    if (!id) return false;
    return /^\d{17,20}$/.test(id);
}

// 🔹 التحقق من اسم المستخدم
function isValidUsername(name) {
    if (!name) return false;
    return /^[a-zA-Z0-9_\-.\s]{1,32}$/.test(name);
}

// ============================================
// 🔹 Variables (متغيرات)
// ============================================

let onlinePlayers = [];
let allStaffMembers = [];
let staffVisible = true;

// ============================================
// 🔹 Secure Functions (استخدامات آمنة)
// ============================================

// 🔹 إنشاء عنصر آمن مع الاحتفاظ بالنص
function createSafeElement(tag, attributes = {}, content = '') {
    const el = document.createElement(tag);
    
    for (const [key, value] of Object.entries(attributes)) {
        if (key === 'className') {
            el.className = value; // ما نحتاج sanitize هنا
        } else if (key === 'textContent') {
            el.textContent = value; // textContent آمن تلقائياً
        } else if (key === 'innerHTML') {
            // ممنوع استخدام innerHTML
            continue;
        } else if (key === 'title' || key === 'alt') {
            el.setAttribute(key, value); // آمن
        } else {
            el.setAttribute(key, value);
        }
    }
    
    if (typeof content === 'string') {
        el.textContent = content; // آمن
    } else if (content instanceof HTMLElement) {
        el.appendChild(content);
    }
    
    return el;
}

// ============================================
// 🔹 Online Players (اللاعبين المتصلين)
// ============================================

async function fetchOnlinePlayers() {
    const list = document.getElementById('onlinePlayersList');
    const count = document.getElementById('onlineCount');
    
    // 🔹 حماية: التحقق من وجود العناصر
    if (!list) return;
    
    try {
        // 🔹 حماية: التحقق من الـ API وتوقيت الطلب
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const res = await fetch(API.onlinePlayers, {
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.success) {
            onlinePlayers = data.players || [];
            if (count) count.textContent = onlinePlayers.length;
            renderOnlinePlayers(onlinePlayers);
        }
    } catch (e) {
        console.error('🔒 Error fetching online players:', e);
        // 🔹 لا تكشف معلومات حساسة في الـ Console
        if (list) {
            list.innerHTML = `<div class="top-empty"><i class="fas fa-exclamation-triangle"></i><p>Unable to load players</p></div>`;
        }
    }
}

function renderOnlinePlayers(players) {
    const list = document.getElementById('onlinePlayersList');
    if (!list) return;
    
    if (!players || players.length === 0) {
        list.innerHTML = `<div class="top-empty"><i class="fas fa-users"></i><p>No players online</p></div>`;
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    players.forEach(player => {
        const item = document.createElement('div');
        item.className = 'top-item';
        
        // الصورة
        const img = document.createElement('img');
        img.className = 'top-avatar';
        img.src = 'assets/images/user-avatar.png';
        if (isValidDiscordId(player.discordId)) {
            img.dataset.discord = player.discordId;
        }
        img.onerror = function() { this.src = 'assets/images/user-avatar.png'; };
        
        // المعلومات
        const info = document.createElement('div');
        info.className = 'top-info';
        
        const name = document.createElement('div');
        name.className = 'top-name';
        name.textContent = player.characterName || 'Unknown'; // ✅ يظهر كامل
        
        const sub = document.createElement('div');
        sub.className = 'top-sub';
        sub.textContent = player.accountName || '';
        
        info.appendChild(name);
        info.appendChild(sub);
        
        // الحالة
        const status = document.createElement('div');
        status.className = 'top-status';
        
        const dot = document.createElement('span');
        dot.className = 'status-dot';
        
        const statusText = document.createElement('span');
        statusText.textContent = 'Online';
        
        status.appendChild(dot);
        status.appendChild(statusText);
        
        item.appendChild(img);
        item.appendChild(info);
        item.appendChild(status);
        fragment.appendChild(item);
    });
    
    list.innerHTML = '';
    list.appendChild(fragment);
    
    setTimeout(() => {
        if (typeof loadAllAvatars === 'function') {
            loadAllAvatars();
        }
    }, 300);
}
// ============================================
// 🔹 Staff Team (فريق الإدارة) - آمن
// ============================================

async function fetchStaff() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const res = await fetch(API.users, {
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.success) {
            // 🔹 التحقق من صحة البيانات
            allStaffMembers = (data.users || [])
                .filter(u => {
                    const rank = parseInt(u.admin);
                    return rank >= 1 && rank <= 13;
                })
                .map(u => ({
                    ...u,
                    username: sanitizeHTML(u.username || 'Unknown'),
                    discord: isValidDiscordId(u.discord) ? u.discord : ''
                }));
            
            const defaultRank = 12;
            const rankFilter = document.getElementById('rankFilter');
            if (rankFilter) {
                rankFilter.value = defaultRank;
            }
            const filtered = allStaffMembers.filter(m => parseInt(m.admin) === defaultRank);
            renderStaff(filtered.length > 0 ? filtered : allStaffMembers);
        }
    } catch (e) {
        console.error('🔒 Error fetching staff:', e);
        const container = document.getElementById('staffGrid');
        if (container) {
            container.innerHTML = `<div class="staff-loading"><i class="fas fa-exclamation-triangle"></i><p>Unable to load staff</p></div>`;
        }
    }
}

function renderStaff(staff) {
    const container = document.getElementById('staffGrid');
    if (!container) return;
    
    if (!staffVisible) {
        container.innerHTML = `<div class="staff-hidden-message"><i class="fas fa-eye-slash"></i><p>Staff hidden</p></div>`;
        return;
    }
    
    if (!staff || staff.length === 0) {
        container.innerHTML = `<div class="staff-loading"><i class="fas fa-users"></i><p>No staff members</p></div>`;
        return;
    }
    
    // 🔹 استخدام DocumentFragment
    const fragment = document.createDocumentFragment();
    
    staff.forEach(member => {
        const rank = parseInt(member.admin) || 0;
        const rankColor = typeof getRankColor === 'function' ? getRankColor(rank) : '#ffffff';
        const rankName = typeof getRankName === 'function' ? getRankName(rank) : 'Unknown';
        const discordId = isValidDiscordId(member.discord) ? member.discord : '';
        const username = member.username || 'Unknown';
        
        // 🔹 إنشاء البطاقة مباشرة
        const card = document.createElement('div');
        card.className = 'staff-card';
        card.style.borderColor = `${rankColor}40`;
        card.style.borderTopColor = rankColor;
        
        // الصورة
        const avatarWrapper = document.createElement('div');
        avatarWrapper.className = 'staff-avatar-wrapper';
        
        const img = document.createElement('img');
        img.className = 'staff-avatar';
        img.src = 'assets/images/user-avatar.png';
        if (discordId) {
            img.dataset.discord = discordId;
        }
        img.onerror = function() { this.src = 'assets/images/user-avatar.png'; };
        
        const status = document.createElement('div');
        status.className = 'staff-status online';
        
        avatarWrapper.appendChild(img);
        avatarWrapper.appendChild(status);
        
        // 🔹 الاسم (يظهر كامل)
        const name = document.createElement('div');
        name.className = 'staff-name';
        name.title = username;
        name.textContent = username; // ✅ آمن وبيظهر كامل
        
        // 🔹 الرتبة
        const rankEl = document.createElement('div');
        rankEl.className = 'staff-rank';
        rankEl.style.color = rankColor;
        rankEl.textContent = rankName;
        
        card.appendChild(avatarWrapper);
        card.appendChild(name);
        card.appendChild(rankEl);
        fragment.appendChild(card);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
    
    setTimeout(() => {
        if (typeof loadAllAvatars === 'function') {
            loadAllAvatars();
        }
    }, 300);
}

// ============================================
// 🔹 Top Players (أفضل اللاعبين) - آمن
// ============================================

async function fetchTopPlayers() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const res = await fetch(API.topPlayers, {
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.success) {
            renderTopHours(data.topHours || []);
            renderTopMoney(data.topMoney || []);
        }
    } catch (e) {
        console.error('🔒 Error fetching top players:', e);
    }
}

function renderTopHours(players) {
    const list = document.getElementById('topHoursList');
    if (!list) return;
    
    if (!players || players.length === 0) {
        list.innerHTML = `<div class="top-empty"><i class="fas fa-clock"></i><p>No data</p></div>`;
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    players.forEach((p, i) => {
        const item = document.createElement('div');
        item.className = 'top-item';
        
        const rank = document.createElement('span');
        rank.className = 'top-rank';
        rank.textContent = `#${i + 1}`;
        
        const img = document.createElement('img');
        img.className = 'top-avatar';
        img.src = 'assets/images/user-avatar.png';
        if (isValidDiscordId(p.discordId)) {
            img.dataset.discord = p.discordId;
        }
        img.onerror = function() { this.src = 'assets/images/user-avatar.png'; };
        
        const info = document.createElement('div');
        info.className = 'top-info';
        
        const name = document.createElement('div');
        name.className = 'top-name';
        name.textContent = p.characterName || 'Unknown';
        info.appendChild(name);
        
        const value = document.createElement('span');
        value.className = 'top-value';
        value.textContent = `${p.hours || 0} hrs`;
        
        item.appendChild(rank);
        item.appendChild(img);
        item.appendChild(info);
        item.appendChild(value);
        fragment.appendChild(item);
    });
    
    list.innerHTML = '';
    list.appendChild(fragment);
    
    setTimeout(() => {
        if (typeof loadAllAvatars === 'function') {
            loadAllAvatars();
        }
    }, 300);
}

function renderTopMoney(players) {
    const list = document.getElementById('topMoneyList');
    if (!list) return;
    
    if (!players || players.length === 0) {
        list.innerHTML = `<div class="top-empty"><i class="fas fa-coins"></i><p>No data</p></div>`;
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    players.forEach((p, i) => {
        const item = document.createElement('div');
        item.className = 'top-item';
        
        const rank = document.createElement('span');
        rank.className = 'top-rank';
        rank.textContent = `#${i + 1}`;
        
        const img = document.createElement('img');
        img.className = 'top-avatar';
        img.src = 'assets/images/user-avatar.png';
        if (isValidDiscordId(p.discordId)) {
            img.dataset.discord = p.discordId;
        }
        img.onerror = function() { this.src = 'assets/images/user-avatar.png'; };
        
        const info = document.createElement('div');
        info.className = 'top-info';
        
        const name = document.createElement('div');
        name.className = 'top-name';
        name.textContent = p.characterName || 'Unknown';
        info.appendChild(name);
        
        const total = (p.money || 0) + (p.bankmoney || 0);
        const value = document.createElement('span');
        value.className = 'top-value';
        value.textContent = typeof formatNumber === 'function' ? formatNumber(total) : `$${total}`;
        
        item.appendChild(rank);
        item.appendChild(img);
        item.appendChild(info);
        item.appendChild(value);
        fragment.appendChild(item);
    });
    
    list.innerHTML = '';
    list.appendChild(fragment);
    
    setTimeout(() => {
        if (typeof loadAllAvatars === 'function') {
            loadAllAvatars();
        }
    }, 300);
}
// ============================================
// 🔹 Filter Functions (التصفية)
// ============================================

function filterOnlinePlayers() {
    const search = document.getElementById('searchPlayer');
    if (!search) return;
    
    // 🔹 منع حقن XSS في البحث
    const query = sanitizeHTML(search.value).toLowerCase().trim();
    
    if (!query) {
        renderOnlinePlayers(onlinePlayers);
        return;
    }
    
    const filtered = onlinePlayers.filter(p => 
        (p.characterName || '').toLowerCase().includes(query) || 
        (p.accountName || '').toLowerCase().includes(query)
    );
    renderOnlinePlayers(filtered);
}

function filterStaff() {
    const rankFilter = document.getElementById('rankFilter');
    const sortFilter = document.getElementById('sortFilter');
    let filtered = [...allStaffMembers];
    
    if (rankFilter && rankFilter.value !== 'all') {
        const rank = parseInt(rankFilter.value);
        if (!isNaN(rank) && rank >= 1 && rank <= 13) {
            filtered = filtered.filter(m => parseInt(m.admin) === rank);
        }
    }
    
    if (sortFilter) {
        if (sortFilter.value === 'highest') filtered.sort((a, b) => b.admin - a.admin);
        else if (sortFilter.value === 'lowest') filtered.sort((a, b) => a.admin - b.admin);
        else if (sortFilter.value === 'name') filtered.sort((a, b) => a.username.localeCompare(b.username));
    }
    
    renderStaff(filtered);
}

function toggleStaffVisibility() {
    staffVisible = !staffVisible;
    const icon = document.getElementById('toggleStaffIcon');
    const text = document.getElementById('toggleStaffText');
    const btn = document.querySelector('.btn-toggle-staff');
    
    if (staffVisible) {
        if (icon) icon.className = 'fas fa-eye';
        if (text) text.textContent = 'Hide Staff';
        if (btn) btn.classList.remove('hidden-staff');
    } else {
        if (icon) icon.className = 'fas fa-eye-slash';
        if (text) text.textContent = 'Show Staff';
        if (btn) btn.classList.add('hidden-staff');
    }
    renderStaff(allStaffMembers);
}

// ============================================
// 🔹 Events (الأحداث)
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    // 🔹 انتظار السيرفر
    if (typeof waitForServer === 'function') {
        await waitForServer();
    }
    
    // 🔹 تحديث الـ Sidebar
    if (typeof updateSidebar === 'function') {
        updateSidebar();
    }
    
    // 🔹 تحميل البيانات
    await Promise.all([
        fetchOnlinePlayers(),
        fetchTopPlayers(),
        fetchStaff()
    ]);
    
    // 🔹 التحديث الدوري
    setInterval(() => {
        if (typeof updateSidebar === 'function') {
            updateSidebar();
        }
    }, 30000);
    
    setInterval(fetchOnlinePlayers, 30000);
    setInterval(fetchTopPlayers, 60000);
    setInterval(fetchStaff, 120000);
});