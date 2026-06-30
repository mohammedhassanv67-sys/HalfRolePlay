// ============================================
// HalfRolePlay - تقديم على الادارة
// ============================================

let isApplicationOpen = false;

document.addEventListener('DOMContentLoaded', async function() {
    await updateSidebar();
    
    // Check if applications are open
    try {
        const statusRes = await fetch('/api/apply-status');
        const statusData = await statusRes.json();
        isApplicationOpen = statusData.open;
        
        if (!isApplicationOpen) {
            document.getElementById('applyForm').classList.add('hidden');
            document.getElementById('closedCard').classList.remove('hidden');
            return;
        }
    } catch (e) {}
    
    // Get user session
    const res = await fetch(API.session, { credentials: 'include' });
    const session = await res.json();
    
    if (session.loggedIn) {
        document.getElementById('discordUser').value = session.username || '';
        document.getElementById('discordUser').dataset.userId = session.userId || '';
    } else {
        document.getElementById('discordUser').value = 'يجب تسجيل الدخول اولا';
    }
    
    // Char count listeners
    ['whyMod', 'ruleBreak', 'conflict', 'skills'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', function() {
                const count = this.value.length;
                document.getElementById(id + 'Count').textContent = count;
            });
        }
    });
    
    setInterval(updateSidebar, 30000);
});

function getExperience() {
    const checked = document.querySelector('input[name="experience"]:checked');
    return checked ? checked.value : '';
}

async function submitApplication() {
    const userId = document.getElementById('discordUser').dataset.userId;
    const username = document.getElementById('discordUser').value;
    const age = document.getElementById('age').value;
    const hours = document.getElementById('hours').value;
    const experience = getExperience();
    const whyMod = document.getElementById('whyMod').value.trim();
    const ruleBreak = document.getElementById('ruleBreak').value.trim();
    const conflict = document.getElementById('conflict').value.trim();
    const skills = document.getElementById('skills').value.trim();
    
    if (!userId || username === 'يجب تسجيل الدخول اولا') {
        showNotification('يجب تسجيل الدخول اولا', 'error');
        return;
    }
    
    if (!age || age < 13 || age > 100) {
        showNotification('الرجاء ادخال عمر صحيح (13-100)', 'error');
        return;
    }
    
    if (!hours) {
        showNotification('الرجاء اختيار عدد الساعات', 'error');
        return;
    }
    
    if (!experience) {
        showNotification('الرجاء اختيار مستوى الخبرة', 'error');
        return;
    }
    
    if (!whyMod || whyMod.length < 20) {
        showNotification('الرجاء كتابة اجابة مفصلة (20 حرف على الاقل)', 'error');
        return;
    }
    
    if (!ruleBreak || ruleBreak.length < 20) {
        showNotification('الرجاء كتابة اجابة مفصلة (20 حرف على الاقل)', 'error');
        return;
    }
    
    if (!conflict || conflict.length < 20) {
        showNotification('الرجاء كتابة اجابة مفصلة (20 حرف على الاقل)', 'error');
        return;
    }
    
    if (!skills || skills.length < 20) {
        showNotification('الرجاء كتابة اجابة مفصلة (20 حرف على الاقل)', 'error');
        return;
    }
    
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الارسال...';
    
    try {
        const res = await fetch('/api/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userId, username, age, hours, experience, whyMod, ruleBreak, conflict, skills })
        });
        
        const data = await res.json();
        
        if (data.success) {
            document.getElementById('applyForm').classList.add('hidden');
            document.getElementById('successCard').classList.remove('hidden');
        } else {
            showNotification(data.message || 'خطا في ارسال الطلب', 'error');
        }
    } catch (e) {
        showNotification('خطا في الاتصال بالسيرفر', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> ارسال الطلب';
    }
}

function showNotification(message, type = 'success') {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-times-circle'}"></i>${message}`;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notif.remove(), 300);
    }, 4000);
}