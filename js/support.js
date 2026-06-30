// ============================================
// HalfRolePlay - Support Page (Interactive Chat)
// ============================================

let currentUser = null;
let currentTicketId = null;
let ticketSocket = null;
let notificationSound = null;
let messagePollInterval = null;

// ============================================
// Initialize Notification Sound
// ============================================
function initNotificationSound() {
    try {
        notificationSound = {
            play: function() {
                try {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                    oscillator.frequency.linearRampToValueAtTime(1000, audioContext.currentTime + 0.1);
                    oscillator.frequency.linearRampToValueAtTime(900, audioContext.currentTime + 0.2);
                    
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
                    
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.4);
                } catch (e) {
                    // Silent fail
                }
            }
        };
    } catch (e) {
        notificationSound = { play: function() {} };
    }
}

// ============================================
// Enhanced Notification
// ============================================
function showEnhancedNotification(title, message, type = 'info', duration = 5000) {
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
        document.body.appendChild(container);
    }
    
    const icons = {
        'ticket_reply': 'fa-headset',
        'ticket_closed': 'fa-lock',
        'success': 'fa-check-circle',
        'error': 'fa-times-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    
    const notif = document.createElement('div');
    notif.className = `notification-sound ${type}`;
    notif.innerHTML = `
        <div class="notif-icon">
            <i class="fas ${icons[type] || icons.info}"></i>
        </div>
        <div class="notif-content">
            ${title ? `<div class="notif-title">${title}</div>` : ''}
            <div class="notif-message">${message}</div>
        </div>
        <button class="notif-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    container.appendChild(notif);
    
    // Play notification sound
    if (notificationSound) {
        notificationSound.play();
    }
    
    // Auto remove
    setTimeout(() => {
        if (notif.parentElement) {
            notif.style.animation = 'slideOutNotif 0.3s ease forwards';
            setTimeout(() => {
                if (notif.parentElement) notif.remove();
            }, 300);
        }
    }, duration);
}

// ============================================
// Simple notification (backward compatible)
// ============================================
function showNotification(title, message, type = 'success') {
    if (message) {
        showEnhancedNotification(title, message, type);
    } else {
        showEnhancedNotification('', title, type);
    }
}

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    initNotificationSound();
    await updateSidebar();
    
    const res = await fetch(API.session, { credentials: 'include' });
    const session = await res.json();
    
    if (!session.loggedIn) {
        document.getElementById('supportContent').style.display = 'none';
        document.getElementById('loginPrompt').style.display = 'block';
        return;
    }
    
    currentUser = session;
    loadTickets();
    initSocketListeners();
    setInterval(updateSidebar, 30000);
    
    // Poll for new messages if socket not available
    if (typeof io === 'undefined') {
        messagePollInterval = setInterval(() => {
            if (currentTicketId) {
                loadTicketMessages(currentTicketId, true);
            }
        }, 5000);
    }
});

// دالة جلب صورة الأفاتار
function getAvatarUrl(userId) {
    if (!userId) return 'assets/images/user-avatar.png';
    // Discord default avatar based on user ID
    const defaultAvatarNumber = (parseInt(userId) >> 22) % 6;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
}


// ============================================
// Socket Listeners
// ============================================
function initSocketListeners() {
    if (typeof io !== 'undefined') {
        ticketSocket = io();
        
        ticketSocket.on('connect', () => {
            // Join user room for private notifications
            if (currentUser && currentUser.userId) {
                ticketSocket.emit('join_user_room', currentUser.userId);
            }
        });
        
        ticketSocket.on('notification', (data) => {
            if (data.type === 'ticket_reply') {
                showEnhancedNotification(
                    '📬 رد جديد على تذكرتك',
                    data.message || 'تم الرد على تذكرتك من قبل الإدارة',
                    'ticket_reply'
                );
                loadTickets();
                if (currentTicketId && currentTicketId == data.ticketId) {
                    loadTicketMessages(currentTicketId);
                }
            } else if (data.type === 'ticket_closed') {
                showEnhancedNotification(
                    '🔒 تم إغلاق تذكرتك',
                    data.message || 'تم إغلاق تذكرتك من قبل الإدارة',
                    'ticket_closed'
                );
                loadTickets();
                if (currentTicketId && currentTicketId == data.ticketId) {
                    loadTicketMessages(currentTicketId);
                }
            }
        });
        
        ticketSocket.on('ticket_admin_message', (data) => {
            if (currentTicketId && currentTicketId == data.ticketId) {
                loadTicketMessages(currentTicketId);
            }
        });
    }
}

// ============================================
// Submit Ticket
// ============================================
async function submitTicket() {
    const type = document.getElementById('ticketType').value;
    const title = document.getElementById('ticketTitle').value.trim();
    const message = document.getElementById('ticketMessage').value.trim();
    
    if (!type) {
        showNotification('الرجاء اختيار نوع المشكلة', '', 'error');
        return;
    }
    if (!title) {
        showNotification('الرجاء كتابة عنوان المشكلة', '', 'error');
        return;
    }
    if (!message || message.length < 10) {
        showNotification('الرجاء كتابة وصف المشكلة (10 احرف على الاقل)', '', 'error');
        return;
    }
    
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الارسال...';
    
    try {
        const res = await fetch('/api/support/create', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, title, message })
        });
        const data = await res.json();
        
        if (data.success) {
            showNotification('تم ارسال التذكرة بنجاح', '', 'success');
            document.getElementById('ticketType').value = '';
            document.getElementById('ticketTitle').value = '';
            document.getElementById('ticketMessage').value = '';
            loadTickets();
        } else {
            showNotification(data.message || 'فشل ارسال التذكرة', '', 'error');
        }
    } catch (e) {
        showNotification('فشل الاتصال', '', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> ارسال التذكرة';
    }
}

// ============================================
// Load Tickets
// ============================================
async function loadTickets() {
    try {
        const res = await fetch('/api/support/tickets', { credentials: 'include' });
        const data = await res.json();
        
        const count = document.getElementById('ticketCount');
        if (count) count.textContent = data.tickets ? data.tickets.length : 0;
        
        if (data.success && data.tickets && data.tickets.length > 0) {
            let html = '';
            data.tickets.forEach(ticket => {
                const statusClass = ticket.status === 'open' ? 'open' : 
                                   ticket.status === 'replied' ? 'replied' : 'closed';
                const statusText = ticket.status === 'open' ? 'مفتوحة' : 
                                  ticket.status === 'replied' ? 'تم الرد' : 'مقفولة';
                const date = new Date(ticket.last_activity || ticket.timestamp).toLocaleString('ar-EG');
                
                html += `
                    <div class="ticket-item" onclick="openTicketChat(${ticket.id})">
                        <div class="ticket-item-header">
                            <span class="ticket-status ${statusClass}">${statusText}</span>
                            <span class="ticket-type">${getTicketType(ticket.type)}</span>
                            <span class="ticket-date">${date}</span>
                        </div>
                        <div class="ticket-title">${escapeHtml(ticket.title)}</div>
                        <div class="ticket-preview">${escapeHtml(ticket.message.substring(0, 80))}...</div>
                        ${ticket.status === 'replied' && !ticket.last_read ? `
                        <div class="new-reply-badge">
                            <i class="fas fa-circle"></i> رد جديد
                        </div>
                        ` : ''}
                    </div>
                `;
            });
            document.getElementById('ticketsList').innerHTML = html;
        } else {
            document.getElementById('ticketsList').innerHTML = `
                <div class="text-center" style="padding:30px; color:#888;">
                    <i class="fas fa-inbox"></i>
                    <p>لا توجد تذاكر</p>
                </div>
            `;
        }
    } catch (e) {
        document.getElementById('ticketsList').innerHTML = 
            '<div class="text-center" style="padding:30px; color:#f87171;">خطا في التحميل</div>';
    }
}

// ============================================
// Open Ticket Chat
// ============================================
async function openTicketChat(ticketId) {
    currentTicketId = ticketId;
    const modal = document.getElementById('ticketChatModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    await loadTicketMessages(ticketId);
    
    // Focus on input
    setTimeout(() => {
        const input = document.getElementById('ticketMessageInput');
        if (input) input.focus();
    }, 300);
}

// ============================================
// Load Ticket Messages
// ============================================
async function loadTicketMessages(ticketId, silent = false) {
    if (!silent) {
        document.getElementById('ticketChatMessages').innerHTML = `
            <div class="text-center" style="padding:40px;color:#888;">
                <i class="fas fa-spinner fa-spin"></i>
                <p>جاري تحميل المحادثة...</p>
            </div>
        `;
    }
    
    try {
        const res = await fetch(`/api/support/ticket/${ticketId}/messages`, { credentials: 'include' });
        const data = await res.json();
        
        if (data.success) {
            const ticket = data.ticket;
            document.getElementById('chatTicketTitle').textContent = `#${ticketId} - ${escapeHtml(ticket.title)}`;
            
            const statusClass = ticket.status === 'open' ? 'open' : 
                               ticket.status === 'replied' ? 'replied' : 'closed';
            const statusText = ticket.status === 'open' ? 'مفتوحة' : 
                              ticket.status === 'replied' ? 'تم الرد' : 'مقفولة';
            const statusEl = document.getElementById('chatTicketStatus');
            statusEl.className = `ticket-status ${statusClass}`;
            statusEl.textContent = statusText;
            
            // Build messages HTML
            let messagesHtml = '';
            const messages = data.messages || [];
            
            if (messages.length === 0) {
                messagesHtml = `
                    <div class="text-center" style="padding:20px;color:#888;">
                        <i class="fas fa-comments"></i>
                        <p>لا توجد رسائل بعد</p>
                    </div>
                `;
            } else {
                messages.forEach(msg => {
                    const time = new Date(msg.timestamp).toLocaleString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'numeric',
                        year: 'numeric'
                    });
                    
// استبدل هذا الجزء في دالة loadTicketMessages
messagesHtml += `
    <div class="chat-message ${msg.is_admin ? 'admin' : 'user'}">
        <img src="${msg.is_admin ? 'assets/images/admin-avatar.png' : getAvatarUrl(msg.user_id)}" 
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
    </div>
`;
                });
            }
            
            // Only update if ticket is still open
            if (currentTicketId == ticketId) {
                const messagesDiv = document.getElementById('ticketChatMessages');
                
                // Check if user scrolled up
                const wasAtBottom = messagesDiv.scrollHeight - messagesDiv.scrollTop - messagesDiv.clientHeight < 100;
                
                messagesDiv.innerHTML = messagesHtml;
                
                // Auto scroll to bottom if was at bottom or new messages
                if (wasAtBottom || silent) {
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }
                
                // Show/hide input area based on ticket status
                if (ticket.status === 'closed') {
                    document.getElementById('ticketChatInputArea').style.display = 'none';
                    document.getElementById('ticketClosedMessage').style.display = 'block';
                } else {
                    document.getElementById('ticketChatInputArea').style.display = 'flex';
                    document.getElementById('ticketClosedMessage').style.display = 'none';
                }
            }
        }
    } catch (e) {
        if (currentTicketId == ticketId) {
            document.getElementById('ticketChatMessages').innerHTML = 
                '<div class="text-center" style="padding:40px; color:#f87171;">خطا في تحميل المحادثة</div>';
        }
    }
}

// ============================================
// Send Message
// ============================================
async function sendTicketMessage() {
    if (!currentTicketId) return;
    
    const input = document.getElementById('ticketMessageInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    const btn = document.getElementById('sendTicketBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    input.disabled = true;
    
    try {
        const res = await fetch('/api/support/message', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ticketId: currentTicketId, 
                message: message 
            })
        });
        const data = await res.json();
        
        if (data.success) {
            input.value = '';
            input.style.height = 'auto';
            await loadTicketMessages(currentTicketId);
        } else {
            showNotification(data.message || 'فشل الإرسال', '', 'error');
        }
    } catch (e) {
        showNotification('فشل الاتصال', '', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        input.disabled = false;
        input.focus();
    }
}

// ============================================
// Close Ticket Chat
// ============================================
function closeTicketChat() {
    document.getElementById('ticketChatModal').style.display = 'none';
    document.body.style.overflow = '';
    currentTicketId = null;
    loadTickets();
}

// ============================================
// Close modal with Escape key
// ============================================
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && currentTicketId) {
        closeTicketChat();
        return;
    }
    
    // Send message with Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey && currentTicketId) {
        const input = document.getElementById('ticketMessageInput');
        if (document.activeElement === input) {
            e.preventDefault();
            sendTicketMessage();
        }
    }
});

// ============================================
// Auto-resize textarea
// ============================================
document.addEventListener('input', function(e) {
    if (e.target.id === 'ticketMessageInput') {
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    }
});

// ============================================
// Helper Functions
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

// ============================================
// Cleanup on page unload
// ============================================
window.addEventListener('beforeunload', () => {
    if (messagePollInterval) {
        clearInterval(messagePollInterval);
    }
    if (ticketSocket) {
        ticketSocket.disconnect();
    }
});