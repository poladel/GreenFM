const socket = io();
let currentChatId = null;

// ✅ Get user ID from <body> tag
const currentUserId = document.body.dataset.userId;
console.log('👤 Current User ID:', currentUserId);

// ✅ Log when socket connects
socket.on('connect', () => {
    console.log('✅ Connected to Socket.IO. Socket ID:', socket.id);
});

// ✅ Room click event listener
document.querySelectorAll('.chat-room').forEach(room => {
    room.addEventListener('click', async () => {
        currentChatId = room.dataset.id;
        localStorage.setItem('activeChatId', currentChatId);
        console.log('🟢 Joined chat room:', currentChatId);

        socket.emit('joinRoom', currentChatId);

        try {
            const res = await fetch(`/chat/messages/${currentChatId}`);
            const messages = await res.json();

            const messagesDiv = document.getElementById('messages');
            messagesDiv.innerHTML = '';
            messages.forEach(msg => {
                messagesDiv.innerHTML += renderMessage(msg, currentUserId);
            });

            scrollToBottom();
        } catch (err) {
            console.error('❌ Error loading messages:', err);
        }
    });
});

// ✅ Send new message
document.getElementById('message-form').addEventListener('submit', async e => {
    e.preventDefault();

    const input = document.getElementById('message-input');
    const content = input.value.trim();
    if (!content || !currentChatId) return;

    try {
        const res = await fetch(`/chat/message/${currentChatId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });

        const message = await res.json();

        if (res.ok) {
            input.value = '';
        } else {
            console.error('❌ Message send failed:', message.error);        
        }
    } catch (err) {
        console.error('❌ Send message error:', err);
    }
});

// ✅ Listen for real-time incoming messages
socket.on('newMessage', message => {
    console.log('📥 New message received:', message);

    console.log('🟡 Message chat ID:', message.chat);
    console.log('🟠 Current active chat ID:', currentChatId);

    if (message.chat !== currentChatId) {
        console.log('⚠️ Message not for current chat. Ignored.');
        return;
    }

    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML += renderMessage(message, currentUserId);
    scrollToBottom();
});

// ✅ Render message HTML for initial and incoming messages
function renderMessage(message, currentUserId) {
    const isMine = message.sender._id === currentUserId;
    const messageClass = isMine ? 'my-message' : 'other-message';

    return `
        <div class="message ${messageClass}" style="margin-bottom: 10px;">
            <div class="bubble" style="
                padding: 10px;
                background: ${isMine ? '#dcf8c6' : '#fff'};
                border-radius: 10px;
                max-width: 70%;
                ${isMine ? 'margin-left:auto;' : ''}
            ">
                <strong>${message.sender.username}</strong>
                <p style="margin: 5px 0 0;">${message.content}</p>
            </div>
        </div>
    `;
}

// ✅ Append new message to chat window
function addMessageToChat(message, currentUserId) {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.insertAdjacentHTML('beforeend', renderMessage(message, currentUserId));
    scrollToBottom();
}

// ✅ Scroll to latest message
function scrollToBottom() {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ✅ Auto-load first chat room on page load
window.addEventListener('DOMContentLoaded', () => {
    const savedChatId = localStorage.getItem('activeChatId');
    let chatToClick = null;

    if (savedChatId) {
        chatToClick = document.querySelector(`.chat-room[data-id="${savedChatId}"]`);
    }

    if (!chatToClick) {
        // fallback: open first chat
        chatToClick = document.querySelector('.chat-room');
    }

    if (chatToClick) {
        chatToClick.click(); // simulates the click to load messages
    }
});
