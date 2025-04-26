let messagesPage = 1;
let loadingMore = false;
let allMessagesLoaded = false;

const socket = io();
let currentChatId = null;
const currentUserId = document.body.dataset.userId;
const messagesDiv = document.getElementById('messages');

console.log('👤 Current User ID:', currentUserId);

// Handle chat room click
document.querySelectorAll('.chat-room').forEach(room => {
    room.addEventListener('click', async () => {
        currentChatId = room.dataset.id;
        localStorage.setItem('activeChatId', currentChatId);
        socket.emit('joinRoom', currentChatId);
        messagesPage = 1;
        allMessagesLoaded = false;
        loadMessages();
    });
});

// Load initial messages
async function loadMessages() {
    try {
        const res = await fetch(`/chat/messages/${currentChatId}?page=1`);
        const messages = await res.json();
        messagesDiv.innerHTML = '';

        allMessagesLoaded = false;
        messagesPage = 1;

        const latestMessages = messages.slice(-10).reverse();
        latestMessages.forEach(msg => {
            messagesDiv.insertAdjacentHTML('afterbegin', renderMessage(msg, currentUserId));
        });

        scrollToBottom();
    } catch (err) {
        console.error('❌ Error loading messages:', err);
    }
}

// Load older messages on scroll to top
async function loadMoreMessages() {
    if (loadingMore || !currentChatId || allMessagesLoaded) return;
    loadingMore = true;

    const previousScrollHeight = messagesDiv.scrollHeight;
    messagesPage++;

    try {
        const res = await fetch(`/chat/messages/${currentChatId}?page=${messagesPage}`);
        const moreMessages = await res.json();

        if (moreMessages.length > 0) {
            moreMessages.reverse().forEach(msg => {
                messagesDiv.insertAdjacentHTML('afterbegin', renderMessage(msg, currentUserId));
            });

            const newScrollHeight = messagesDiv.scrollHeight;
            messagesDiv.scrollTop = newScrollHeight - previousScrollHeight;
        } else {
            allMessagesLoaded = true;
        }
    } catch (err) {
        console.error('❌ Error loading more messages:', err);
        messagesPage--;
    }

    loadingMore = false;
}

// Scroll detection for auto-load
messagesDiv.addEventListener('scroll', async () => {
    if (messagesDiv.scrollTop === 0 && !loadingMore && !allMessagesLoaded) {
        await loadMoreMessages();
    }
});

// Send new message
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

// Real-time messages
socket.on('newMessage', message => {
    if (message.chat !== currentChatId) return;
    messagesDiv.insertAdjacentHTML('beforeend', renderMessage(message, currentUserId));
    scrollToBottom();
});

// Render one message
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

// Scroll to bottom
function scrollToBottom() {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Modal handlers
document.getElementById('open-new-chat').addEventListener('click', () => {
    document.getElementById('new-chat-modal').style.display = 'flex';
});
document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('new-chat-modal').style.display = 'none';
});

// Start new chat
document.getElementById('new-chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const select = e.target.userIds;
    const groupName = document.getElementById('group-name').value.trim();
    const userIds = Array.from(select.selectedOptions).map(option => option.value);

    try {
        const res = await fetch('/chat/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds, groupName })
        });

        const chat = await res.json();
        if (res.ok) {
            window.location.reload();
        } else {
            alert(chat.error || 'Failed to start chat.');
        }
    } catch (err) {
        console.error('❌ Start new chat error:', err);
    }
});

// Auto-load first chat
window.addEventListener('DOMContentLoaded', () => {
    const savedChatId = localStorage.getItem('activeChatId');
    let chatToClick = null;
    if (savedChatId) {
        chatToClick = document.querySelector(`.chat-room[data-id="${savedChatId}"]`);
    }
    if (!chatToClick) {
        chatToClick = document.querySelector('.chat-room');
    }
    if (chatToClick) {
        chatToClick.click();
    }
});

// User search in modal
document.getElementById('user-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const options = document.querySelectorAll('#user-select option');
    options.forEach(option => {
        const text = option.textContent.toLowerCase();
        option.style.display = text.includes(query) ? '' : 'none';
    });
});

const spinner = document.getElementById('loading-spinner');
if (spinner) spinner.style.display = 'block';
// after loading:
if (spinner) spinner.style.display = 'none';
