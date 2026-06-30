// ============================================
// HalfRolePlay - Chat
// ============================================

let socket = null;
let currentUser = null;
let isAdmin = false;
let lastMessageTime = 0;
const MESSAGE_COOLDOWN = 3000;

// ============================================
// Connect Chat
// ============================================
async function connectChat() {
    try {
        const res = await fetch(API.session, { credentials: 'include' });
        const data = await res.json();
        
        currentUser = data;
        
        if (data.loggedIn) {
            isAdmin = await isUserAdmin();
            document.getElementById('chatLoginPrompt').classList.add('hidden');
            document.getElementById('chatInputWrapper').classList.remove('hidden');
        }
        
        socket = io();
        
        socket.on('connect', async () => {
            let userRank = 0;
            let userRankName = '';
            
            if (data.loggedIn) {
                try {
                    const rolesRes = await fetch(`/api/user-discord-roles/${data.userId}`, { credentials: 'include' });
                    const rolesData = await rolesRes.json();
                    
                    if (rolesData.success && rolesData.roles) {
                        let highestRank = 0;
                        for (const roleId of rolesData.roles) {
                            const rank = getRankByRoleId(roleId);
                            if (rank > highestRank) highestRank = rank;
                        }
                        userRank = highestRank;
                        const rankInfo = getRankInfo(highestRank);
                        if (rankInfo) userRankName = rankInfo.name;
                    }
                } catch (e) {}
            }
            
            socket.emit('join', { 
                userId: data.userId || 'guest',
                username: data.username || 'Guest',
                avatar: data.avatar || 'assets/images/user-avatar.png',
                admin: userRank,
                rankName: userRankName
            });
        });
        
        socket.on('chat history', (messages) => renderMessages(messages));
        socket.on('chat message', (msg) => appendMessage(msg));
        
        socket.on('message deleted', (data) => {
            const el = document.getElementById(`msg-${data.id}`);
            if (el) {
                el.querySelector('.chat-message-text').innerHTML = '<span class="chat-message-deleted">Message deleted</span>';
                const actions = el.querySelector('.msg-actions');
                if (actions) actions.remove();
            }
        });
        
        socket.on('message edited', (data) => {
            const el = document.getElementById(`msg-${data.id}`);
            if (el) {
                el.querySelector('.chat-message-text').textContent = data.message;
                const edited = el.querySelector('.chat-edited');
                if (edited) edited.classList.remove('hidden');
            }
        });
        
        socket.on('chat cleared', () => {
            document.getElementById('chatMessages').innerHTML = '';
        });
        
        socket.on('online count', (count) => {
            document.getElementById('onlineCount').textContent = count + ' online';
        });
        
        socket.on('error', (msg) => alert(msg));
        
        loadMessages();
        
    } catch (e) {
        console.error('Chat connection error:', e);
    }
}

// ============================================
// Load Messages
// ============================================
function loadMessages() {
    if (!socket) return;
    socket.emit('load messages');
}

// ============================================
// Send Message
// ============================================
function sendMessage() {
    if (!currentUser || !currentUser.loggedIn) {
        alert('Please login to chat');
        window.location.href = '/auth/discord';
        return;
    }
    
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    const now = Date.now();
    
    if (!message || !socket) return;
    
    if (now - lastMessageTime < MESSAGE_COOLDOWN) {
        const remaining = Math.ceil((MESSAGE_COOLDOWN - (now - lastMessageTime)) / 1000);
        alert(`Wait ${remaining} seconds`);
        return;
    }
    
    if (message.length > 200) { alert('Message too long'); return; }
    if (/https?:\/\//i.test(message)) { alert('Links not allowed'); return; }
    
    socket.emit('chat message', message);
    lastMessageTime = now;
    input.value = '';
    input.style.height = 'auto';
}

// ============================================
// Handle Keyboard
// ============================================
function handleChatKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

// ============================================
// Render Messages
// ============================================
function renderMessages(messages) {
    const container = document.getElementById('chatMessages');
    if (!messages || messages.length === 0) {
        container.innerHTML = `<div class="chat-loading"><i class="fas fa-comments"></i><p>No messages yet</p></div>`;
        return;
    }
    let html = '';
    messages.forEach(msg => { html += createMessageHTML(msg); });
    container.innerHTML = html;
    scrollToBottom();
}

// ============================================
// Append Single Message
// ============================================
function appendMessage(msg) {
    const container = document.getElementById('chatMessages');
    container.insertAdjacentHTML('beforeend', createMessageHTML(msg));
    scrollToBottom();
}

// ============================================
// Create Message HTML
// ============================================
function createMessageHTML(msg) {
    const isMine = currentUser && msg.user_id === currentUser.userId;
    const isDeleted = msg.deleted === 1;
    const isEdited = msg.edited === 1;
    const rankInfo = getRankInfo(msg.admin || 0);
    const rankName = rankInfo ? rankInfo.name : '';
    const rankColor = rankInfo ? rankInfo.color : '#9ca3af';
    const rankIcon = rankInfo ? rankInfo.icon : '';
    const canDelete = isMine || isAdmin;
    const canEdit = isMine && !isDeleted;
    
    return `
        <div class="chat-message ${isMine ? 'mine' : ''}" id="msg-${msg.id}">
            <div class="chat-avatar-wrapper">
                <img src="${msg.avatar || 'assets/images/user-avatar.png'}" class="chat-message-avatar" onerror="this.src='assets/images/user-avatar.png'">
                ${rankInfo ? '<span class="admin-badge"><i class="fas ' + rankIcon + '"></i></span>' : ''}
            </div>
            <div class="chat-message-content">
                <div class="chat-message-header">
                    <span class="chat-message-username" style="color: ${rankColor}">
                        ${rankInfo ? '<i class="fas ' + rankIcon + ' admin-icon"></i> ' : ''}${msg.username}
                    </span>
                    ${rankName ? '<span class="chat-rank-badge" style="background: ' + rankColor + '20; color: ' + rankColor + '; border: 1px solid ' + rankColor + '40;">' + rankName + '</span>' : ''}
                    <span class="chat-message-time">${formatTime(msg.timestamp)}</span>
                    <span class="chat-edited ${isEdited ? '' : 'hidden'}">(edited)</span>
                </div>
                <div class="chat-message-text">${isDeleted ? '<span class="chat-message-deleted">Message deleted</span>' : msg.message}</div>
                ${!isDeleted ? `
                <div class="msg-actions">
                    ${canEdit ? `<button class="btn-msg-action" onclick="editMessage(${msg.id})"><i class="fas fa-pen"></i></button>` : ''}
                    ${canDelete ? `<button class="btn-msg-action" onclick="deleteMessage(${msg.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

// ============================================
// Edit Message
// ============================================
function editMessage(id) {
    const newMessage = prompt('Edit your message:');
    if (!newMessage || !newMessage.trim()) return;
    if (newMessage.length > 200) { alert('Message too long'); return; }
    if (/https?:\/\//i.test(newMessage)) { alert('Links not allowed'); return; }
    socket.emit('edit message', { id, message: newMessage.trim() });
}

// ============================================
// Delete Message
// ============================================
function deleteMessage(id) {
    if (confirm('Delete this message?')) {
        socket.emit('delete message', id);
    }
}

// ============================================
// Format Time
// ============================================
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return date.toLocaleDateString('en-US');
}

// ============================================
// Scroll to Bottom
// ============================================
function scrollToBottom() {
    const container = document.getElementById('chatMessages');
    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 100);
}

// ============================================
// Init
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    updateSidebar();
    connectChat();
    setInterval(updateSidebar, 30000);
});