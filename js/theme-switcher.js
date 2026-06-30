// ============================================
// HalfRolePlay - Theme & Layout Switcher
// ============================================

const themes = [
    { id: 'purple', name: 'البنفسجي', desc: 'تصميم كلاسيكي', icon: 'fa-palette', iconClass: 'purple' },
    { id: 'blue', name: 'الازرق', desc: 'تصميم هادئ', icon: 'fa-water', iconClass: 'blue' },
    { id: 'green', name: 'الاخضر', desc: 'تصميم عصري', icon: 'fa-leaf', iconClass: 'green' },
];

let currentTheme = localStorage.getItem('halfrp-theme') || 'purple';
let currentLayout = localStorage.getItem('halfrp-layout') || 'top';
let sidebarHidden = localStorage.getItem('halfrp-sidebar-hidden') === 'true';
let lastScrollY = window.scrollY;
let activePopup = null;

// ============================================
// Create Sidebar Toggle Button
// ============================================
function createSidebarToggleButton() {
    const existing = document.querySelectorAll('.sidebar-toggle-btn');
    existing.forEach(el => el.remove());
    
    if (currentLayout === 'top') return;
    
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'sidebarToggleBtn';
    toggleBtn.className = 'sidebar-toggle-btn';
    toggleBtn.innerHTML = sidebarHidden ? `<i class="fas fa-chevron-left"></i>` : `<i class="fas fa-chevron-right"></i>`;
    toggleBtn.title = sidebarHidden ? 'اظهار القائمة' : 'اخفاء القائمة';
    toggleBtn.onclick = toggleSidebarVisibility;
    
    // Position on the left edge of the viewport
    toggleBtn.style.position = 'fixed';
    toggleBtn.style.top = '50%';
    toggleBtn.style.transform = 'translateY(-50%)';
    toggleBtn.style.right = sidebarHidden ? '5px' : '255px';
    toggleBtn.style.zIndex = '1001';
    
    document.body.appendChild(toggleBtn);
}

// ============================================
// Toggle Sidebar Visibility
// ============================================
function toggleSidebarVisibility() {
    sidebarHidden = !sidebarHidden;
    localStorage.setItem('halfrp-sidebar-hidden', sidebarHidden);
    
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const btn = document.getElementById('sidebarToggleBtn');
    
    console.log('Toggle sidebar. Hidden:', sidebarHidden);
    console.log('Sidebar element:', sidebar);
    
    if (sidebar) {
        if (sidebarHidden) {
            sidebar.style.setProperty('transform', 'translateX(100%)', 'important');
            sidebar.style.setProperty('transition', 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 'important');
        } else {
            sidebar.style.setProperty('transform', 'translateX(0)', 'important');
            sidebar.style.setProperty('transition', 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 'important');
        }
    }
    
    if (mainContent) {
        mainContent.style.setProperty('margin-right', sidebarHidden ? '0' : '250px', 'important');
        mainContent.style.setProperty('transition', 'margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 'important');
    }
    
    if (btn) {
        btn.innerHTML = sidebarHidden ? '<i class="fas fa-chevron-left"></i>' : '<i class="fas fa-chevron-right"></i>';
        btn.title = sidebarHidden ? 'اظهار القائمة' : 'اخفاء القائمة';
        btn.style.setProperty('right', sidebarHidden ? '5px' : '255px', 'important');
    }
}

// ============================================
// Create Floating Buttons
// ============================================
function createFloatingControls() {
    const existing = document.getElementById('floatingControls');
    if (existing) existing.remove();
    
    const container = document.createElement('div');
    container.className = 'floating-controls';
    container.id = 'floatingControls';
    container.innerHTML = `
        <button class="control-btn theme-btn-main" data-tooltip="تغيير الثيم" onclick="togglePopup('theme')">
            <i class="fas fa-paint-brush"></i>
        </button>
        <button class="control-btn layout-btn-main" data-tooltip="تغيير شكل القائمة" onclick="togglePopup('layout')">
            <i class="fas fa-bars"></i>
        </button>
        <div class="control-overlay" id="controlOverlay" onclick="closeAllPopups()"></div>
        <div class="control-popup hidden" id="themePopup"></div>
        <div class="control-popup hidden" id="layoutPopup"></div>
    `;
    document.body.appendChild(container);
    
    renderThemePopup();
    renderLayoutPopup();
}

// ============================================
// Render Popups
// ============================================
function renderThemePopup() {
    const popup = document.getElementById('themePopup');
    if (!popup) return;
    popup.innerHTML = `
        <div class="popup-title">اختر الثيم</div>
        ${themes.map(theme => `
            <button class="popup-option ${currentTheme === theme.id ? 'active' : ''}" onclick="selectTheme('${theme.id}')">
                <span class="option-icon ${theme.iconClass}"><i class="fas ${theme.icon}"></i></span>
                <span class="option-info"><span class="option-name">${theme.name}</span><span class="option-desc">${theme.desc}</span></span>
                <span class="option-check"><i class="fas fa-check"></i></span>
            </button>
        `).join('')}
    `;
}

function renderLayoutPopup() {
    const popup = document.getElementById('layoutPopup');
    if (!popup) return;
    popup.innerHTML = `
        <div class="popup-title">اختر شكل القائمة</div>
        <button class="popup-option ${currentLayout === 'top' ? 'active' : ''}" onclick="selectLayout('top')">
            <span class="option-icon layout"><i class="fas fa-bars"></i></span>
            <span class="option-info"><span class="option-name">قائمة علوية</span><span class="option-desc">شريط افقي في الاعلى</span></span>
            <span class="option-check"><i class="fas fa-check"></i></span>
        </button>
        <button class="popup-option ${currentLayout === 'right' ? 'active' : ''}" onclick="selectLayout('right')">
            <span class="option-icon layout"><i class="fas fa-sidebar"></i></span>
            <span class="option-info"><span class="option-name">قائمة جانبية</span><span class="option-desc">قائمة جانبية على اليمين</span></span>
            <span class="option-check"><i class="fas fa-check"></i></span>
        </button>
    `;
}

// ============================================
// Popup Controls
// ============================================
function togglePopup(type) {
    const themePopup = document.getElementById('themePopup');
    const layoutPopup = document.getElementById('layoutPopup');
    const overlay = document.getElementById('controlOverlay');
    
    if (type === 'theme') {
        if (activePopup === 'theme') { themePopup.classList.add('hidden'); overlay.classList.remove('active'); activePopup = null; }
        else { themePopup.classList.remove('hidden'); if (layoutPopup) layoutPopup.classList.add('hidden'); overlay.classList.add('active'); activePopup = 'theme'; }
    } else {
        if (activePopup === 'layout') { layoutPopup.classList.add('hidden'); overlay.classList.remove('active'); activePopup = null; }
        else { layoutPopup.classList.remove('hidden'); if (themePopup) themePopup.classList.add('hidden'); overlay.classList.add('active'); activePopup = 'layout'; }
    }
}

function closeAllPopups() {
    document.querySelectorAll('.control-popup').forEach(p => p.classList.add('hidden'));
    const overlay = document.getElementById('controlOverlay');
    if (overlay) overlay.classList.remove('active');
    activePopup = null;
}

// ============================================
// Select Theme / Layout
// ============================================
function selectTheme(themeId) { currentTheme = themeId; localStorage.setItem('halfrp-theme', themeId); applyTheme(themeId); renderThemePopup(); closeAllPopups(); }
function selectLayout(layoutId) { currentLayout = layoutId; localStorage.setItem('halfrp-layout', layoutId); applyLayout(layoutId); renderLayoutPopup(); closeAllPopups(); }
function applyTheme(themeId) { document.documentElement.setAttribute('data-theme', themeId); }

// ============================================
// Apply Layout
// ============================================
function applyLayout(layoutId) {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    if (!sidebar) return;
    
    // Reset all styles
    sidebar.style.cssText = '';
    sidebar.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    
    // Reset internal elements
    const allChildren = sidebar.querySelectorAll('.sidebar-header, .sidebar-user, .sidebar-auth, .sidebar-links, .sidebar-footer');
    allChildren.forEach(el => el.style.cssText = '');
    
    const allLinks = sidebar.querySelectorAll('.sidebar-link');
    allLinks.forEach(el => el.style.cssText = '');
    
    if (layoutId === 'top') {
        // === TOP LAYOUT ===
        sidebar.style.position = 'fixed';
        sidebar.style.top = '0';
        sidebar.style.right = '0';
        sidebar.style.left = '0';
        sidebar.style.width = '100%';
        sidebar.style.height = '60px';
        sidebar.style.display = 'flex';
        sidebar.style.flexDirection = 'row';
        sidebar.style.alignItems = 'center';
        sidebar.style.justifyContent = 'space-between';
        sidebar.style.padding = '0 20px';
        sidebar.style.borderLeft = 'none';
        sidebar.style.borderRight = 'none';
        sidebar.style.borderBottom = '1px solid var(--border-color)';
        sidebar.style.borderRadius = '0';
        sidebar.style.zIndex = '1000';
        sidebar.style.transform = sidebarHidden ? 'translateY(-100%)' : 'translateY(0)';
        
        if (mainContent) {
            mainContent.style.marginRight = '0';
            mainContent.style.paddingTop = sidebarHidden ? '20px' : '70px';
            mainContent.style.transition = 'padding-top 0.3s ease';
        }
        
        // Header (Logo) - Right side
        const header = sidebar.querySelector('.sidebar-header');
        if (header) {
            header.style.display = 'flex';
            header.style.padding = '0';
            header.style.borderBottom = 'none';
            header.style.flexShrink = '0';
            header.style.order = '0';
        }
        
        // Links - Center
        const links = sidebar.querySelector('.sidebar-links');
        if (links) {
            links.style.display = 'flex';
            links.style.flexDirection = 'row';
            links.style.alignItems = 'center';
            links.style.gap = '2px';
            links.style.padding = '0';
            links.style.margin = '0 20px';
            links.style.flexShrink = '1';
            links.style.overflow = 'hidden';
            links.style.order = '1';
        }
        
        // User info + Login/Logout - Left side
        const user = sidebar.querySelector('.sidebar-user');
        const auth = sidebar.querySelector('.sidebar-auth');
        if (user) {
            user.style.display = 'flex';
            user.style.padding = '0 8px';
            user.style.borderBottom = 'none';
            user.style.minHeight = 'auto';
            user.style.flexShrink = '0';
            user.style.order = '2';
        }
        if (auth) {
            auth.style.display = 'flex';
            auth.style.padding = '0';
            auth.style.borderBottom = 'none';
            auth.style.flexShrink = '0';
            auth.style.order = '3';
        }
        
        // Footer - Hide
        const footer = sidebar.querySelector('.sidebar-footer');
        if (footer) { footer.style.display = 'none'; }
        
        // Link styles
        allLinks.forEach(link => {
            link.style.padding = '8px 14px';
            link.style.fontSize = '13px';
            link.style.borderRight = 'none';
            link.style.whiteSpace = 'nowrap';
        });
        
    } else {
        // === SIDE LAYOUT ===
        sidebar.style.position = 'fixed';
        sidebar.style.top = '0';
        sidebar.style.right = '0';
        sidebar.style.left = 'auto';
        sidebar.style.width = '250px';
        sidebar.style.height = '100vh';
        sidebar.style.display = 'flex';
        sidebar.style.flexDirection = 'column';
        sidebar.style.alignItems = '';
        sidebar.style.justifyContent = '';
        sidebar.style.padding = '16px 0';
        sidebar.style.borderLeft = '1px solid var(--border-color)';
        sidebar.style.borderRight = 'none';
        sidebar.style.borderBottom = 'none';
        sidebar.style.borderRadius = '0';
        sidebar.style.overflowY = 'auto';
        sidebar.style.transform = sidebarHidden ? 'translateX(100%)' : 'translateX(0)';
        
        if (mainContent) {
            mainContent.style.marginRight = sidebarHidden ? '0' : '250px';
            mainContent.style.paddingTop = '';
            mainContent.style.transition = 'margin-right 0.3s ease';
        }
        
        // Reset internal elements order
        const header = sidebar.querySelector('.sidebar-header');
        const links = sidebar.querySelector('.sidebar-links');
        const user = sidebar.querySelector('.sidebar-user');
        const auth = sidebar.querySelector('.sidebar-auth');
        const footer = sidebar.querySelector('.sidebar-footer');
        
        if (header) { header.style.cssText = ''; header.style.order = ''; }
        if (user) { user.style.cssText = ''; user.style.order = ''; }
        if (auth) { auth.style.cssText = ''; auth.style.order = ''; }
        if (links) { links.style.cssText = ''; links.style.order = ''; }
        if (footer) { footer.style.display = ''; footer.style.order = ''; }
        
        allLinks.forEach(link => { link.style.cssText = ''; });
    }
    
    createSidebarToggleButton();
}

// ============================================
// Scroll Handler
// ============================================
function handleScroll() {
    if (currentLayout !== 'top' || sidebarHidden) return;
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    
    const currentScrollY = window.scrollY;
    if (currentScrollY > lastScrollY && currentScrollY > 80) {
        sidebar.style.transform = 'translateY(-100%)';
    } else if (currentScrollY < lastScrollY) {
        sidebar.style.transform = 'translateY(0)';
    }
    lastScrollY = currentScrollY;
}

// ============================================
// Init
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    applyTheme(currentTheme);
    applyLayout(currentLayout);
    createFloatingControls();
    window.addEventListener('scroll', handleScroll, { passive: true });
});

document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeAllPopups(); });