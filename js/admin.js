// ============================================
// HalfRolePlay - Admin Panel (Complete)
// ============================================

// ============================================
// NOTIFICATION SYSTEM
// ============================================
function showNotification(title, message, type = 'info', duration = 4000) {
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
        document.body.appendChild(container);
    }
    const colors = { success: '#4ade80', error: '#f87171', warning: '#fbbf24', info: '#60a5fa' };
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.style.borderColor = colors[type];
    notif.innerHTML = `
        <i class="fas ${icons[type]}" style="color:${colors[type]};font-size:20px;"></i>
        <div style="flex:1;">
            <div style="font-weight:700;margin-bottom:2px;">${title}</div>
            <div style="font-size:13px;opacity:0.8;">${message}</div>
        </div>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#fff;opacity:0.5;cursor:pointer;font-size:16px;">&times;</button>
    `;
    container.appendChild(notif);
    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notif.remove(), 300);
    }, duration);
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    await updateSidebar();
    const admin = await isUserAdmin();
    if (!admin) {
        window.location.href = '/index.html';
        return;
    }
    document.getElementById('sidebarAdminLink').style.display = 'flex';
    
    // Load all data
    loadStats();
    loadPurchases();
    loadChatLogs();
    loadApplyStatus();
    loadOnlineStaff();
    loadBalanceLogs();
    loadBannedUsers();
    loadShopItems();
    loadDailyStats();
    loadAllTickets();
    
    // Setup
    setupTabs();
    initSocketListeners();
    
    // Refresh sidebar every 30 seconds
    setInterval(updateSidebar, 30000);
});

// ============================================
// SOCKET LISTENERS
// ============================================
function initSocketListeners() {
    if (typeof io !== 'undefined') {
        const socket = io();
        
        socket.on('new_ticket_notification', (data) => {
            showNotification('تذكرة جديدة', `${data.username} فتح تذكرة: ${data.title}`, 'info');
            if (document.getElementById('tab-tickets')?.classList.contains('active')) {
                loadAllTickets();
            }
            loadStats();
        });
        
        socket.on('ticket_new_message', (data) => {
            if (document.getElementById('tab-tickets')?.classList.contains('active')) {
                loadAllTickets();
                if (selectedTicketId == data.ticketId) {
                    loadTicketConversation(data.ticketId);
                }
            }
        });
        
        socket.on('ticket_closed', (data) => {
            if (document.getElementById('tab-tickets')?.classList.contains('active')) {
                loadAllTickets();
                if (selectedTicketId == data.ticketId) {
                    loadTicketConversation(data.ticketId);
                }
            }
        });
    }
}

// ============================================
// TABS SETUP
// ============================================
function setupTabs() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const target = document.getElementById(this.dataset.tab);
            if (target) {
                target.classList.add('active');
                if (this.dataset.tab === 'tab-tickets') {
                    loadAllTickets();
                }
            }
        });
    });
    
    document.querySelectorAll('.admin-tab-inner').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.admin-tab-inner').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            loadLogs(this.dataset.log);
        });
    });
}

// ============================================
// OVERVIEW
// ============================================
async function loadStats() {
    try {
        const [chatRes, purchaseRes, onlineRes, ticketsRes] = await Promise.all([
            fetch('/api/admin/chat-stats', { credentials: 'include' }),
            fetch('/api/admin/purchase-stats', { credentials: 'include' }),
            fetch(API.onlinePlayers, { credentials: 'include' }),
            fetch('/api/admin/support-tickets', { credentials: 'include' })
        ]);
        
        document.getElementById('totalMessages').textContent = (await chatRes.json()).total || 0;
        document.getElementById('totalPurchases').textContent = (await purchaseRes.json()).total || 0;
        document.getElementById('onlinePlayers').textContent = (await onlineRes.json()).count || 0;
        
        const ticketsData = await ticketsRes.json();
        if (ticketsData.success && ticketsData.tickets) {
            const openCount = ticketsData.tickets.filter(t => t.status === 'open').length;
            document.getElementById('openTicketsCount').textContent = openCount;
        }
    } catch (e) {
        console.error('Error loading stats:', e);
    }
}

async function loadApplyStatus() {
    try {
        const res = await fetch('/api/apply-status');
        const data = await res.json();
        const display = document.getElementById('applyStatusDisplay');
        if (!display) return;
        
        if (data.open) {
            display.style.background = 'rgba(74,222,128,0.1)';
            display.style.color = '#4ade80';
            display.style.border = '1px solid rgba(74,222,128,0.2)';
            display.textContent = 'التقديمات مفتوحة ✅';
        } else {
            display.style.background = 'rgba(248,113,113,0.1)';
            display.style.color = '#f87171';
            display.style.border = '1px solid rgba(248,113,113,0.2)';
            display.textContent = 'التقديمات مقفولة ❌';
        }
    } catch (e) {
        console.error('Error loading apply status:', e);
    }
}

async function toggleApplications() {
    const btn = document.getElementById('toggleApplyBtn');
    if (!btn) return;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التبديل...';
    
    try {
        const statusRes = await fetch('/api/apply-status');
        const statusData = await statusRes.json();
        const res = await fetch('/api/admin/set-apply', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ open: !statusData.open })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('تم', data.open ? 'التقديمات الان مفتوحة' : 'التقديمات الان مقفولة', 'success');
            loadApplyStatus();
        } else {
            showNotification('خطأ', 'فشل تغيير الحالة', 'error');
        }
    } catch (e) {
        showNotification('خطأ', 'فشل الاتصال', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sync-alt"></i> تبديل الحالة';
    }
}

// ============================================
// BALANCE MANAGEMENT
// ============================================
async function giveBalance() {
    const userId = document.getElementById('giveBalanceUser')?.value?.trim();
    const amount = parseInt(document.getElementById('giveBalanceAmount')?.value);
    const reason = document.getElementById('giveBalanceReason')?.value?.trim();
    
    if (!userId || !amount || amount <= 0) {
        showNotification('خطأ', 'بيانات غير صحيحة', 'error');
        return;
    }
    
    try {
        const res = await fetch('/api/admin/give-balance', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, amount, reason })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('تم', `تم اعطاء ${amount} جنيه`, 'success');
            loadBalanceLogs();
            document.getElementById('giveBalanceUser').value = '';
            document.getElementById('giveBalanceAmount').value = '';
            document.getElementById('giveBalanceReason').value = '';
        } else {
            showNotification('خطأ', data.message || 'فشل العملية', 'error');
        }
    } catch (e) {
        showNotification('خطأ', 'فشل الاتصال', 'error');
    }
}

async function takeBalance() {
    const userId = document.getElementById('takeBalanceUser')?.value?.trim();
    const amount = parseInt(document.getElementById('takeBalanceAmount')?.value);
    const reason = document.getElementById('takeBalanceReason')?.value?.trim();
    
    if (!userId || !amount || amount <= 0) {
        showNotification('خطأ', 'بيانات غير صحيحة', 'error');
        return;
    }
    
    try {
        const res = await fetch('/api/admin/take-balance', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, amount, reason })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('تم', `تم سحب ${amount} جنيه`, 'success');
            loadBalanceLogs();
            document.getElementById('takeBalanceUser').value = '';
            document.getElementById('takeBalanceAmount').value = '';
            document.getElementById('takeBalanceReason').value = '';
        } else {
            showNotification('خطأ', data.message || 'فشل العملية', 'error');
        }
    } catch (e) {
        showNotification('خطأ', 'فشل الاتصال', 'error');
    }
}

async function loadBalanceLogs() {
    try {
        const res = await fetch('/api/admin/balance-logs', { credentials: 'include' });
        const data = await res.json();
        const tbody = document.getElementById('balanceLogsTable');
        if (!tbody) return;
        
        if (data.success && data.logs && data.logs.length > 0) {
            tbody.innerHTML = data.logs.map(l => `
                <tr>
                    <td>${l.discord_id || '-'}</td>
                    <td style="color:${l.type === 'add' ? '#4ade80' : '#f87171'}">${l.type === 'add' ? 'اعطاء' : 'سحب'}</td>
                    <td>${l.amount} جنيه</td>
                    <td>${l.reason || '-'}</td>
                    <td>${l.admin_username || '-'}</td>
                    <td>${new Date(l.timestamp).toLocaleString('ar-EG')}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">لا توجد سجلات</td></tr>';
        }
    } catch (e) {
        console.error('Error loading balance logs:', e);
    }
}

// ============================================
// BAN MANAGEMENT
// ============================================
async function banUser() {
    const userId = document.getElementById('banUserId')?.value?.trim();
    const reason = document.getElementById('banReason')?.value?.trim();
    
    if (!userId || !reason) {
        showNotification('خطأ', 'ادخل جميع البيانات', 'error');
        return;
    }
    
    try {
        const res = await fetch('/api/admin/ban', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, reason })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('تم', 'تم حظر المستخدم', 'success');
            loadBannedUsers();
            document.getElementById('banUserId').value = '';
            document.getElementById('banReason').value = '';
        } else {
            showNotification('خطأ', data.message || 'فشل الحظر', 'error');
        }
    } catch (e) {
        showNotification('خطأ', 'فشل الاتصال', 'error');
    }
}

async function unbanUser() {
    const userId = document.getElementById('unbanUserId')?.value?.trim();
    
    if (!userId) {
        showNotification('خطأ', 'ادخل معرف الديسكورد', 'error');
        return;
    }
    
    try {
        const res = await fetch('/api/admin/unban', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('تم', 'تم فك الحظر', 'success');
            loadBannedUsers();
            document.getElementById('unbanUserId').value = '';
        } else {
            showNotification('خطأ', data.message || 'فشل فك الحظر', 'error');
        }
    } catch (e) {
        showNotification('خطأ', 'فشل الاتصال', 'error');
    }
}

async function loadBannedUsers() {
    try {
        const res = await fetch('/api/admin/banned-users', { credentials: 'include' });
        const data = await res.json();
        const tbody = document.getElementById('bannedUsersTable');
        if (!tbody) return;
        
        if (data.success && data.users && data.users.length > 0) {
            tbody.innerHTML = data.users.map(u => `
                <tr>
                    <td>${u.user_id}</td>
                    <td>${u.reason}</td>
                    <td>${u.banned_by || '-'}</td>
                    <td>${new Date(u.timestamp).toLocaleString('ar-EG')}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">لا يوجد محظورين</td></tr>';
        }
    } catch (e) {
        console.error('Error loading banned users:', e);
    }
}

// ============================================
// SHOP MANAGEMENT
// ============================================
async function addShopItem() {
    const name = document.getElementById('shopName')?.value?.trim();
    const price = parseInt(document.getElementById('shopPrice')?.value);
    const type = document.getElementById('shopType')?.value;
    const category = document.getElementById('shopCategory')?.value;
    const value = document.getElementById('shopValue')?.value?.trim();
    const image = document.getElementById('shopImage')?.value?.trim();
    const desc = document.getElementById('shopDescription')?.value?.trim();
    
    if (!name || !price) {
        showNotification('خطأ', 'الاسم والسعر مطلوبان', 'error');
        return;
    }
    
    try {
        const res = await fetch('/api/admin/shop/add', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, price, type, category, value, image, description: desc })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('تم', 'تم اضافة المنتج', 'success');
            loadShopItems();
            // Clear form
            ['shopName', 'shopPrice', 'shopValue', 'shopImage', 'shopDescription'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
        } else {
            showNotification('خطأ', data.message || 'فشل الاضافة', 'error');
        }
    } catch (e) {
        showNotification('خطأ', 'فشل الاتصال', 'error');
    }
}

async function loadShopItems() {
    try {
        const res = await fetch('/api/admin/shop/all', { credentials: 'include' });
        const data = await res.json();
        const tbody = document.getElementById('shopItemsTable');
        if (!tbody) return;
        
        if (data.success && data.items && data.items.length > 0) {
            tbody.innerHTML = data.items.map(item => `
                <tr>
                    <td>#${item.id}</td>
                    <td>${item.name}</td>
                    <td>${item.price} جنيه</td>
                    <td>${item.item_type}</td>
                    <td style="color:${item.hidden ? '#f87171' : '#4ade80'}">${item.hidden ? 'مخفي' : 'ظاهر'}</td>
                    <td>
                        <button class="btn-sm primary" onclick="editShopItem(${item.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn-sm danger" onclick="deleteShopItem(${item.id})"><i class="fas fa-trash"></i></button>
                        <button class="btn-sm ${item.hidden ? 'success' : 'danger'}" onclick="toggleShopItem(${item.id})">${item.hidden ? 'اظهار' : 'اخفاء'}</button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">لا توجد منتجات</td></tr>';
        }
    } catch (e) {
        console.error('Error loading shop items:', e);
    }
}

async function deleteShopItem(id) {
    if (!confirm('هل انت متأكد من حذف هذا المنتج؟')) return;
    try {
        const res = await fetch(`/api/admin/shop/delete/${id}`, { method: 'DELETE', credentials: 'include' });
        if ((await res.json()).success) {
            showNotification('تم', 'تم حذف المنتج', 'success');
            loadShopItems();
        }
    } catch (e) {
        showNotification('خطأ', 'فشل الحذف', 'error');
    }
}

async function toggleShopItem(id) {
    try {
        const res = await fetch(`/api/admin/shop/toggle/${id}`, { method: 'POST', credentials: 'include' });
        if ((await res.json()).success) {
            showNotification('تم', 'تم تغيير الحالة', 'success');
            loadShopItems();
        }
    } catch (e) {
        showNotification('خطأ', 'فشل تغيير الحالة', 'error');
    }
}

async function editShopItem(id) {
    const price = prompt('السعر الجديد:');
    if (price && !isNaN(price) && parseInt(price) > 0) {
        try {
            const res = await fetch(`/api/admin/shop/update/${id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ price: parseInt(price) })
            });
            if ((await res.json()).success) {
                showNotification('تم', 'تم تحديث السعر', 'success');
                loadShopItems();
            }
        } catch (e) {
            showNotification('خطأ', 'فشل التحديث', 'error');
        }
    }
}

// ============================================
// LOGS
// ============================================
async function loadLogs(type) {
    try {
        const res = await fetch(`/api/admin/logs/${type}`, { credentials: 'include' });
        const data = await res.json();
        const thead = document.getElementById('logsTableHead');
        const tbody = document.getElementById('logsTableBody');
        
        if (!thead || !tbody) return;
        
        const headMap = {
            'log-login': ['المستخدم', 'الحدث', 'IP', 'التاريخ'],
            'log-purchases': ['المستخدم', 'المنتج', 'السعر', 'التاريخ'],
            'log-balance': ['المستخدم', 'النوع', 'المبلغ', 'السبب', 'التاريخ'],
            'log-bans': ['المستخدم', 'سبب الحظر', 'بواسطة', 'التاريخ']
        };
        
        thead.innerHTML = '<tr>' + headMap[type].map(h => `<th>${h}</th>`).join('') + '</tr>';
        
        if (data.success && data.logs && data.logs.length > 0) {
            let html = '';
            data.logs.forEach(l => {
                if (type === 'log-login') {
                    html += `<tr><td>${l.username || '-'}</td><td style="color:${l.action === 'login' ? '#4ade80' : '#f87171'}">${l.action === 'login' ? 'دخول' : 'خروج'}</td><td>${l.ip || '-'}</td><td>${new Date(l.timestamp).toLocaleString('ar-EG')}</td></tr>`;
                } else if (type === 'log-purchases') {
                    html += `<tr><td>${l.discord_id || '-'}</td><td>${l.item_name || '-'}</td><td>${l.price || 0} جنيه</td><td>${new Date(l.purchase_date).toLocaleString('ar-EG')}</td></tr>`;
                } else if (type === 'log-balance') {
                    html += `<tr><td>${l.discord_id || '-'}</td><td style="color:${l.type === 'add' ? '#4ade80' : '#f87171'}">${l.type === 'add' ? 'اعطاء' : 'سحب'}</td><td>${l.amount || 0}</td><td>${l.reason || '-'}</td><td>${new Date(l.timestamp).toLocaleString('ar-EG')}</td></tr>`;
                } else if (type === 'log-bans') {
                    html += `<tr><td>${l.user_id || '-'}</td><td>${l.reason || '-'}</td><td>${l.banned_by || '-'}</td><td>${new Date(l.timestamp).toLocaleString('ar-EG')}</td></tr>`;
                }
            });
            tbody.innerHTML = html;
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد سجلات</td></tr>';
        }
    } catch (e) {
        console.error('Error loading logs:', e);
    }
}

// ============================================
// STATS
// ============================================
async function loadDailyStats() {
    try {
        const res = await fetch('/api/admin/daily-stats', { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
            document.getElementById('dailyVisitors').textContent = data.visitors || 0;
            document.getElementById('totalPageViews').textContent = data.pageViews || 0;
            document.getElementById('peakHour').textContent = data.peakHour || '-';
            
            const chartDiv = document.getElementById('salesChart');
            if (chartDiv) {
                chartDiv.innerHTML = '<canvas id="salesCanvas" style="max-height:300px;"></canvas>';
                if (data.salesData && typeof Chart !== 'undefined') {
                    const ctx = document.getElementById('salesCanvas').getContext('2d');
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: data.salesData.labels || [],
                            datasets: [{
                                label: 'المبيعات (جنيه)',
                                data: data.salesData.values || [],
                                borderColor: '#7c3aed',
                                backgroundColor: 'rgba(124,58,237,0.1)',
                                tension: 0.3,
                                fill: true
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false
                        }
                    });
                }
            }
        }
    } catch (e) {
        console.error('Error loading stats:', e);
    }
}

// ============================================
// PLAYER SEARCH
// ============================================
async function searchPlayer() {
    const query = document.getElementById('searchQuery')?.value?.trim();
    if (!query) {
        showNotification('خطأ', 'ادخل معرف الديسكورد او اسم MTA', 'error');
        return;
    }
    
    try {
        const res = await fetch(`/api/admin/search-player/${encodeURIComponent(query)}`, { credentials: 'include' });
        const data = await res.json();
        const resultDiv = document.getElementById('searchResult');
        if (!resultDiv) return;
        
        if (data.success && data.player) {
            const p = data.player;
            resultDiv.innerHTML = `
                <div class="player-info-card">
                    <div class="info-col">
                        <p><span>اسم الحساب:</span> <strong>${p.username || '-'}</strong></p>
                        <p><span>معرف الديسكورد:</span> <strong>${p.discord || '-'}</strong></p>
                        <p><span>الرتبة:</span> <strong>${getRankName(p.admin || 0)}</strong></p>
                    </div>
                    <div class="info-col">
                        <p><span>الرصيد:</span> <strong>${p.balance || 0} جنيه</strong></p>
                        <p><span>مشتريات:</span> <strong>${p.purchases || 0}</strong></p>
                        <p><span>متصل:</span> <strong style="color:${p.online ? '#4ade80' : '#f87171'}">${p.online ? 'نعم 🟢' : 'لا 🔴'}</strong></p>
                    </div>
                </div>`;
        } else {
            resultDiv.innerHTML = '<div class="text-center" style="padding:20px; color:#f87171;">لم يتم العثور على اللاعب</div>';
        }
    } catch (e) {
        showNotification('خطأ', 'فشل البحث', 'error');
    }
}

// ============================================
// ONLINE STAFF
// ============================================
async function loadOnlineStaff() {
    try {
        const res = await fetch('/api/admin/online-staff', { credentials: 'include' });
        const data = await res.json();
        const grid = document.getElementById('onlineStaffGrid');
        if (!grid) return;
        
        if (data.success && data.admins && data.admins.length > 0) {
            grid.innerHTML = data.admins.map(a => `
                <div class="staff-rank-row">
                    <div class="rank-header">
                        <span class="rank-dot" style="background:#4ade80;"></span>
                        <span class="rank-name">${a.name}</span>
                        <span class="rank-count">${getRankName(a.admin)}</span>
                    </div>
                </div>
            `).join('');
        } else {
            grid.innerHTML = '<div class="text-center" style="padding:20px; color:#888;">لا يوجد اداريين متصلين حالياً</div>';
        }
    } catch (e) {
        console.error('Error loading staff:', e);
        const grid = document.getElementById('onlineStaffGrid');
        if (grid) grid.innerHTML = '<div class="text-center" style="padding:20px;color:#f87171;">خطأ في التحميل</div>';
    }
}

// ============================================
// CHAT MANAGEMENT
// ============================================
async function clearAllChat() {
    if (!confirm('هل انت متأكد من مسح جميع الرسائل؟ لا يمكن التراجع عن هذا الاجراء!')) return;
    try {
        const res = await fetch('/api/admin/clear-chat', { method: 'POST', credentials: 'include' });
        if ((await res.json()).success) {
            showNotification('تم', 'تم مسح جميع الرسائل', 'success');
            loadChatLogs();
        }
    } catch (e) {
        showNotification('خطأ', 'فشل مسح الرسائل', 'error');
    }
}

async function loadChatLogs() {
    try {
        const res = await fetch('/api/admin/chat-logs', { credentials: 'include' });
        const data = await res.json();
        const tbody = document.getElementById('chatLogsTable');
        if (!tbody) return;
        
        if (data.success && data.messages && data.messages.length > 0) {
            tbody.innerHTML = data.messages.map(msg => `
                <tr>
                    <td>#${msg.id}</td>
                    <td>${msg.username || '-'}</td>
                    <td>${(msg.message || '').substring(0, 50)}${(msg.message || '').length > 50 ? '...' : ''}</td>
                    <td>${new Date(msg.timestamp).toLocaleString('ar-EG')}</td>
                    <td>
                        <button class="btn-sm danger" onclick="deleteSingleMessage(${msg.id})">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد رسائل</td></tr>';
        }
    } catch (e) {
        console.error('Error loading chat logs:', e);
    }
}

async function deleteSingleMessage(id) {
    if (!confirm('حذف هذه الرسالة؟')) return;
    try {
        const res = await fetch(`/api/admin/delete-message/${id}`, { method: 'DELETE', credentials: 'include' });
        if ((await res.json()).success) {
            showNotification('تم', 'تم حذف الرسالة', 'success');
            loadChatLogs();
        }
    } catch (e) {
        showNotification('خطأ', 'فشل حذف الرسالة', 'error');
    }
}

async function loadPurchases() {
    try {
        const res = await fetch('/api/admin/purchase-stats', { credentials: 'include' });
        const data = await res.json();
        const el = document.getElementById('totalPurchases');
        if (el) el.textContent = data.total || 0;
    } catch (e) {
        console.error('Error loading purchases:', e);
    }
}

// ============================================
// TICKETS SYSTEM (Interactive Chat)
// ============================================
let allTickets = [];
let currentTicketFilter = 'all';
let selectedTicketId = null;

async function loadAllTickets() {
    try {
        const res = await fetch('/api/admin/support-tickets', { credentials: 'include' });
        const data = await res.json();
        
        if (data.success && data.tickets) {
            allTickets = data.tickets;
            displayFilteredTickets();
            updateOpenTicketsCount();
        }
    } catch (e) {
        console.error('Error loading tickets:', e);
        const container = document.getElementById('allTicketsList');
        if (container) {
            container.innerHTML = '<div class="text-center" style="padding:30px;color:#f87171;">خطأ في تحميل التذاكر</div>';
        }
    }
}

function updateOpenTicketsCount() {
    const openCount = allTickets.filter(t => t.status === 'open').length;
    const countEl = document.getElementById('openTicketsCount');
    if (countEl) countEl.textContent = openCount;
}

function displayFilteredTickets() {
    const container = document.getElementById('allTicketsList');
    if (!container) return;
    
    let tickets = allTickets;
    if (currentTicketFilter !== 'all') {
        tickets = allTickets.filter(t => t.status === currentTicketFilter);
    }
    
    if (tickets.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="padding:30px;color:#888;">
                <i class="fas fa-inbox"></i>
                <p>لا توجد تذاكر</p>
            </div>`;
        return;
    }
    
    container.innerHTML = tickets.map(ticket => {
        const statusClass = ticket.status === 'open' ? 'open' : 
                           ticket.status === 'replied' ? 'replied' : 'closed';
        const statusText = ticket.status === 'open' ? 'مفتوحة' : 
                          ticket.status === 'replied' ? 'تم الرد' : 'مقفولة';
        const selected = selectedTicketId === ticket.id ? ' selected' : '';
        const messageCount = ticket.message_count || 0;
        
        return `
            <div class="ticket-admin-item${selected}" onclick="viewTicketDetail(${ticket.id})" id="ticket-${ticket.id}">
                <div class="ticket-admin-header">
                    <span class="ticket-status ${statusClass}">${statusText}</span>
                    <span class="ticket-admin-user">${escapeHtml(ticket.username)}</span>
                    <span class="ticket-admin-type">${getTicketType(ticket.type)}</span>
                    ${messageCount > 0 ? `<span class="ticket-msg-count">${messageCount} رسالة</span>` : ''}
                </div>
                <div class="ticket-admin-title">${escapeHtml(ticket.title)}</div>
                <div class="ticket-admin-message">${escapeHtml((ticket.message || '').substring(0, 100))}...</div>
                <div style="font-size:11px;color:#666;">${new Date(ticket.last_activity || ticket.timestamp).toLocaleString('ar-EG')}</div>
            </div>`;
    }).join('');
}

function filterTickets(filter, btn) {
    currentTicketFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    displayFilteredTickets();
}

async function viewTicketDetail(ticketId) {
    selectedTicketId = ticketId;
    
    document.querySelectorAll('.ticket-admin-item').forEach(el => el.classList.remove('selected'));
    const ticketEl = document.getElementById(`ticket-${ticketId}`);
    if (ticketEl) ticketEl.classList.add('selected');
    
    const detailCard = document.getElementById('ticketDetailCard');
    if (detailCard) detailCard.style.display = 'block';
    
    await loadTicketConversation(ticketId);
}
function getAvatarUrl(userId) {
    if (!userId) return 'assets/images/user-avatar.png';
    const defaultAvatarNumber = (parseInt(userId) >> 22) % 6;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
}
function getAvatarHTML(username, userId, isAdmin) {
    const firstLetter = (username || '?').charAt(0).toUpperCase();
    const bgColor = isAdmin ? '#4ade80' : '#60a5fa';
    const discordAvatar = userId ? `https://cdn.discordapp.com/embed/avatars/${(parseInt(userId) >> 22) % 6}.png` : '';
    
    return `
        <div class="chat-avatar-wrapper" style="flex-shrink:0;">
            <img src="${discordAvatar}" 
                 class="chat-message-avatar" 
                 alt="${escapeHtml(username)}"
                 style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid ${bgColor};"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
            <div class="chat-avatar-fallback" 
                 style="display:none;width:32px;height:32px;border-radius:50%;background:${bgColor};align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:14px;border:2px solid ${bgColor};">
                ${firstLetter}
            </div>
        </div>
    `;
}

async function loadTicketConversation(ticketId) {
    const detailEl = document.getElementById('ticketDetail');
    if (!detailEl) return;
    
    detailEl.innerHTML = '<div class="text-center" style="padding:40px;color:#888;"><i class="fas fa-spinner fa-spin"></i><p>جاري تحميل المحادثة...</p></div>';
    
    try {
        const res = await fetch(`/api/support/ticket/${ticketId}/messages`, { credentials: 'include' });
        const data = await res.json();
        
        if (data.success) {
            const ticket = data.ticket;
            const statusClass = ticket.status === 'open' ? 'open' : 
                               ticket.status === 'replied' ? 'replied' : 'closed';
            const statusText = ticket.status === 'open' ? 'مفتوحة' : 
                              ticket.status === 'replied' ? 'تم الرد' : 'مقفولة';
            
            let html = `
                <div style="margin-bottom:16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span class="ticket-status ${statusClass}">${statusText}</span>
                    <span class="ticket-admin-type">${getTicketType(ticket.type)}</span>
                    <span style="font-size:12px;color:#60a5fa;">${escapeHtml(ticket.username)}</span>
                    <span style="font-size:11px;color:#666;">${new Date(ticket.timestamp).toLocaleString('ar-EG')}</span>
                </div>
                <div style="margin-bottom:12px;font-weight:700;font-size:15px;">${escapeHtml(ticket.title)}</div>
                
                <div class="admin-ticket-conversation">`;
            
            if (data.messages && data.messages.length > 0) {
                data.messages.forEach(msg => {
                    const time = new Date(msg.timestamp).toLocaleString('ar-EG', {
                        hour: '2-digit', minute: '2-digit',
                        day: 'numeric', month: 'numeric'
                    });
                    
// استبدل هذا الجزء
html += `
    <div class="chat-message ${msg.is_admin ? 'admin' : 'user'}">
        <img src="${getAvatarUrl(msg.user_id)}" 
             class="chat-message-avatar" 
             alt="${escapeHtml(msg.username)}"
             onerror="this.onerror=null; this.src='assets/images/user-avatar.png';">
        <div class="chat-message-bubble">
            <div class="chat-message-username">
                ${msg.is_admin ? '<i class="fas fa-shield-alt"></i> ' : ''}${escapeHtml(msg.username)}
            </div>
            <div class="chat-message-text">${escapeHtml(msg.message)}</div>
            <div class="chat-message-time">${time}</div>
        </div>
    </div>`;
                });
            } else {
                html += '<div class="text-center" style="padding:20px;color:#888;">لا توجد رسائل</div>';
            }
            
            html += '</div>';
            
            if (ticket.status !== 'closed') {
                html += `
                    <div class="reply-form" style="margin-top:16px;">
                        <label style="display:block;font-size:13px;font-weight:600;color:#ccc;margin-bottom:6px;">
                            <i class="fas fa-reply"></i> الرد على التذكرة (Enter للإرسال)
                        </label>
                        <textarea id="adminReplyMessage" placeholder="اكتب ردك هنا..." rows="3" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();adminReplyToTicket(${ticket.id});}"></textarea>
                        <div class="reply-actions" style="margin-top:10px;">
                            <button class="btn-success" onclick="adminReplyToTicket(${ticket.id})">
                                <i class="fas fa-paper-plane"></i> ارسال الرد
                            </button>
                            <button class="btn-warning" onclick="closeTicketAdmin(${ticket.id})">
                                <i class="fas fa-check-circle"></i> اغلاق التذكرة
                            </button>
                        </div>
                    </div>`;
            } else {
                html += `
                    <div class="text-center" style="padding:16px;color:#888;background:rgba(248,113,113,0.05);border-radius:8px;margin-top:16px;">
                        <i class="fas fa-lock"></i> هذه التذكرة مقفولة
                    </div>`;
            }
            
            detailEl.innerHTML = html;
            
            // Scroll conversation to bottom
            setTimeout(() => {
                const conv = detailEl.querySelector('.admin-ticket-conversation');
                if (conv) conv.scrollTop = conv.scrollHeight;
            }, 100);
        } else {
            detailEl.innerHTML = '<div class="text-center" style="padding:40px;color:#f87171;">فشل تحميل التذكرة</div>';
        }
    } catch (e) {
        console.error('Error loading conversation:', e);
        detailEl.innerHTML = '<div class="text-center" style="padding:40px;color:#f87171;">خطأ في التحميل</div>';
    }
}

async function adminReplyToTicket(ticketId) {
    const reply = document.getElementById('adminReplyMessage')?.value?.trim();
    if (!reply) {
        showNotification('خطأ', 'الرجاء كتابة الرد', 'error');
        return;
    }
    
    const btn = document.querySelector('.btn-success');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
    }
    
    try {
        const res = await fetch('/api/admin/support-message', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId, message: reply })
        });
        const data = await res.json();
        
        if (data.success) {
            showNotification('تم', 'تم ارسال الرد بنجاح', 'success');
            await loadAllTickets();
            await loadTicketConversation(ticketId);
        } else {
            showNotification('خطأ', data.message || 'فشل ارسال الرد', 'error');
        }
    } catch (e) {
        showNotification('خطأ', 'فشل الاتصال', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> ارسال الرد';
        }
    }
}

async function closeTicketAdmin(ticketId) {
    if (!confirm('هل انت متأكد من اغلاق التذكرة؟ لن يتمكن المستخدم من ارسال رسائل جديدة.')) return;
    
    try {
        const res = await fetch('/api/admin/support-close', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId })
        });
        const data = await res.json();
        
        if (data.success) {
            showNotification('تم', 'تم اغلاق التذكرة', 'success');
            await loadAllTickets();
            await loadTicketConversation(ticketId);
        } else {
            showNotification('خطأ', data.message || 'فشل اغلاق التذكرة', 'error');
        }
    } catch (e) {
        showNotification('خطأ', 'فشل الاتصال', 'error');
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function getTicketType(type) {
    const types = {
        'technical': 'مشكلة تقنية',
        'account': 'مشكلة في الحساب',
        'payment': 'مشكلة في الدفع',
        'game': 'مشكلة في اللعبة',
        'other': 'اخرى'
    };
    return types[type] || type;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getRankName(adminLevel) {
    const ranks = {
        0: 'لاعب',
        1: 'مراقب',
        2: 'اداري',
        3: 'اداري اول',
        4: 'مدير',
        5: 'مدير عام'
    };
    return ranks[adminLevel] || 'لاعب';
}