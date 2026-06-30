// ============================================
// HalfRolePlay - Dashboard Page
// ============================================

const vipNames = { 'bronze': 'راعي برونزي', 'silver': 'راعي فضي', 'gold': 'راعي ذهبي', 'diamond': 'راعي الماسي', 'premium': 'راعي براميوم', 'premiumplus': 'راعي براميوم بلس' };
const vipOrder = ['premiumplus', 'premium', 'diamond', 'gold', 'silver', 'bronze'];

async function loadUserData() {
    try {
        const res = await fetch(API.user, { credentials: 'include' });
        const data = await res.json();
        if (!data.success) { window.location.href = 'index.html'; return; }
        
        const user = data.user;
        const char = (data.characters && data.characters.length > 0) ? data.characters[0] : {};
        
        document.getElementById('userDisplayName').textContent = user.username || 'مستخدم';
        const rankName = getRankName(user.admin || 0);
        const rankColor = getRankColor(user.admin || 0);
        document.getElementById('userRank').textContent = rankName;
        document.getElementById('userRank').style.color = rankColor;
        
        document.getElementById('profileAvatar').src = user.avatar || 'assets/images/user-avatar.png';
        document.getElementById('profileRankBadge').textContent = rankName;
        document.getElementById('profileRankBadge').style.color = rankColor;
        document.getElementById('profileUsername').textContent = user.username || 'غير معروف';
        document.getElementById('profileCharacter').textContent = char.charactername || 'لا توجد شخصية';
        document.getElementById('profileEmail').textContent = user.email || 'غير متوفر';
        document.getElementById('profileSerial').textContent = user.mtaserial || 'غير مربوط';
        document.getElementById('profileAdmin').textContent = rankName;
        document.getElementById('profileAdmin').style.color = rankColor;
        
        const bankMoney = char.bankmoney || 0;
        const walletMoney = char.money || 0;
        document.getElementById('bankMoney').textContent = formatNumber(bankMoney);
        document.getElementById('walletMoney').textContent = formatNumber(walletMoney);
        document.getElementById('totalMoney').textContent = formatNumber(bankMoney + walletMoney);
        
        const hours = char.hoursplayed || 0;
        document.getElementById('hoursPlayed').textContent = hours;
        document.querySelector('.stat-number.level').textContent = Math.floor(hours / 10) + 1;
        document.querySelector('.stat-number.exp').textContent = hours * 100;
        document.querySelector('.stat-number.reputation').textContent = Math.min(100, hours * 2) + '%';
        
        loadVIPStatus(user.id);
        loadVehicles(user.id);
        loadRecentPurchases(user.discordId);
    } catch (e) { window.location.href = 'index.html'; }
}

function loadVIPStatus(accountId) {
    const container = document.getElementById('vipOwnership');
    if (!accountId) return;
    fetch(`${API.vipStatus}/${accountId}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.vips && data.vips.length > 0) {
                let html = '';
                data.vips.forEach(vip => {
                    const name = vipNames[vip.type] || vip.type;
                    html += `<div class="ownership-item vip"><div class="ownership-icon vip-icon"><i class="fas fa-crown"></i></div><div class="ownership-info"><span class="ownership-name">${name}</span><span class="ownership-detail">المدة المتبقية: ${vip.remainingDays || 0} يوم</span></div><div class="ownership-status active">نشط</div></div>`;
                });
                container.innerHTML = html;
            } else {
                container.innerHTML = `<div class="ownership-empty"><i class="fas fa-crown"></i><span>لا يوجد راعي VIP نشط</span><a href="shop.html" class="ownership-link">شراء راعي VIP</a></div>`;
            }
        })
        .catch(() => { container.innerHTML = `<div class="ownership-empty"><i class="fas fa-crown"></i><span>يجب ان تكون متصل بالسيرفر</span></div>`; });
}

function loadVehicles(accountId) {
    const container = document.getElementById('vehicleOwnership');
    if (!accountId) return;
    fetch(`${API.vehicles}/${accountId}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.vehicles && data.vehicles.length > 0) {
                let html = '';
                data.vehicles.forEach(v => {
                    html += `<div class="ownership-item vehicle"><div class="ownership-icon vehicle-icon"><i class="fas fa-car"></i></div><div class="ownership-info"><span class="ownership-name">${v.name || 'سيارة #' + v.id}</span><span class="ownership-detail">لوحة: ${v.plate || 'N/A'}</span></div></div>`;
                });
                container.innerHTML = html;
            } else {
                container.innerHTML = `<div class="ownership-empty"><i class="fas fa-car"></i><span>لا توجد سيارات</span><a href="shop.html" class="ownership-link">شراء سيارة</a></div>`;
            }
        })
        .catch(() => { container.innerHTML = `<div class="ownership-empty"><i class="fas fa-car"></i><span>خطا في التحميل</span></div>`; });
}

function loadRecentPurchases(discordId) {
    const container = document.getElementById('recentPurchases');
    if (!discordId) return;
    fetch(`${API.purchases}/${discordId}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.purchases && data.purchases.length > 0) {
                let html = '';
                data.purchases.forEach(p => {
                    html += `<div class="ownership-item purchase"><div class="ownership-icon purchase-icon"><i class="fas fa-shopping-bag"></i></div><div class="ownership-info"><span class="ownership-name">${p.item_name}</span><span class="ownership-detail">${new Date(p.purchase_date).toLocaleDateString('ar-EG')}</span></div><div class="ownership-status purchase-price">${p.price} جنيه</div></div>`;
                });
                container.innerHTML = html;
            } else {
                container.innerHTML = `<div class="ownership-empty"><i class="fas fa-shopping-bag"></i><span>لا توجد مشتريات</span></div>`;
            }
        })
        .catch(() => { container.innerHTML = `<div class="ownership-empty"><i class="fas fa-shopping-bag"></i><span>خطا في التحميل</span></div>`; });
}

document.addEventListener('DOMContentLoaded', async function() {
    await updateSidebar();
    
    const res = await fetch(API.session, { credentials: 'include' });
    const session = await res.json();
    
    if (!session.loggedIn) {
        document.getElementById('dashboardContent').style.display = 'none';
        document.getElementById('loginPrompt').style.display = 'block';
        return;
    }
    
    const linkRes = await fetch(API.linkStatus, { credentials: 'include' });
    const linkData = await linkRes.json();
    
    if (!linkData.linked) {
        document.getElementById('dashboardContent').style.display = 'none';
        document.getElementById('linkPrompt').style.display = 'block';
        return;
    }
    
    loadUserData();
    setInterval(updateSidebar, 30000);
});