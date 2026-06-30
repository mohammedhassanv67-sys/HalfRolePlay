// ============================================
// HalfRolePlay - Server Status Page
// ============================================

const jobs = [
    { id: 1, name: 'Police', icon: 'fa-shield-halved', color: '#3b82f6' },
    { id: 2, name: 'Mechanic', icon: 'fa-wrench', color: '#f59e0b' },
    { id: 3, name: 'Port Security', icon: 'fa-ship', color: '#06b6d4' },
    { id: 4, name: 'Ambulance', icon: 'fa-truck-medical', color: '#ef4444' },
    { id: 22, name: 'Ministry of Defense', icon: 'fa-crosshairs', color: '#8b5cf6' },
    { id: 5, name: 'Scrap Worker', icon: 'fa-recycle', color: '#10b981' },
    { id: 6, name: 'Farmer', icon: 'fa-seedling', color: '#22c55e' },
    { id: 7, name: 'Port Worker', icon: 'fa-box', color: '#f97316' },
    { id: 8, name: 'Cleaner', icon: 'fa-broom', color: '#8b8ba3' },
    { id: 9, name: 'Miner', icon: 'fa-hammer', color: '#78716c' },
    { id: 10, name: 'Deliverer', icon: 'fa-truck', color: '#eab308' },
    { id: 11, name: 'Electrician', icon: 'fa-bolt', color: '#fbbf24' },
    { id: 16, name: 'Poultry', icon: 'fa-egg', color: '#fcd34d' },
    { id: 17, name: 'Media', icon: 'fa-video', color: '#ec4899' },
    { id: 18, name: 'Wood Co.', icon: 'fa-tree', color: '#a3a3a3' },
    { id: 19, name: 'Uber', icon: 'fa-taxi', color: '#22d3ee' },
    { id: 20, name: 'Meat Processor', icon: 'fa-utensils', color: '#fca5a5' },
    { id: 13, name: 'Grove Street', icon: 'fa-skull', color: '#64748b' },
    { id: 14, name: 'Vagos', icon: 'fa-skull', color: '#475569' },
    { id: 15, name: 'Ballas', icon: 'fa-skull', color: '#334155' },
    { id: 21, name: 'Diver', icon: 'fa-water', color: '#38bdf8' },
    { id: 0, name: 'Unemployed', icon: 'fa-user-slash', color: '#9ca3af' },
    { id: 12, name: 'Other', icon: 'fa-ellipsis', color: '#6b7280' }
];

async function loadServerStatus() {
    try {
        const res = await fetch(API.serverStatus, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
            const s = data.data;
            document.getElementById('onlinePlayers').textContent = s.onlinePlayers || 0;
            document.getElementById('peakPlayers').textContent = s.peakPlayers || 0;
            document.getElementById('uptime').textContent = formatUptime(s.uptime || 0);
            document.getElementById('totalAccounts').textContent = s.totalAccounts || 0;
            document.getElementById('totalVehicles').textContent = s.totalVehicles || 0;
            document.getElementById('workingPlayers').textContent = s.workingPlayers || 0;
            
            const pct = s.maxPlayers > 0 ? Math.min(100, (s.onlinePlayers / s.maxPlayers) * 100) : 0;
            document.getElementById('progressBar').style.width = pct + '%';
            document.getElementById('progressPercentage').textContent = Math.floor(pct) + '%';
            document.getElementById('progressText').textContent = `${s.onlinePlayers} / ${s.maxPlayers}`;
            
            const dot = document.getElementById('statusDot');
            const txt = document.getElementById('statusText');
            if (s.status === 'online') { dot.className = 'status-dot online'; txt.textContent = 'Server Online'; }
            else { dot.className = 'status-dot offline'; txt.textContent = 'Server Offline'; }
            
            document.getElementById('lastUpdateTime').textContent = new Date().toLocaleString('en-US');
            renderJobs(s.jobStats || {});
        }
    } catch (e) {}
}

function renderJobs(jobStats) {
    const grid = document.getElementById('jobsGrid');
    if (!grid) return;
    let html = '';
    jobs.forEach(job => {
        const stats = jobStats[job.id] || { total: 0, working: 0 };
        html += `<div class="job-card" style="border-right:4px solid ${job.color};"><div class="job-header"><i class="fas ${job.icon}" style="color:${job.color};"></i><span>${job.name}</span><span>${stats.total || 0}</span></div></div>`;
    });
    grid.innerHTML = html;
}

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    let parts = [];
    if (d > 0) parts.push(d + 'd');
    if (h > 0) parts.push(h + 'h');
    if (m > 0) parts.push(m + 'm');
    return parts.length > 0 ? parts.join(' ') : '< 1m';
}

document.addEventListener('DOMContentLoaded', async function() {
    await waitForServer();
    updateSidebar();
    loadServerStatus();
    setInterval(loadServerStatus, 10000);
    setInterval(updateSidebar, 30000);
});