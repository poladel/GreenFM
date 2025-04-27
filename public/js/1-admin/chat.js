let messagesPage = 1;
let loadingMore = false;
let allMessagesLoaded = false;
let loadedMessageIds = new Set();

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
        loadedMessageIds.clear();

        allMessagesLoaded = false;
        messagesPage = 1;

        const latestMessages = messages.slice(-10).reverse();
        latestMessages.forEach(msg => {
            loadedMessageIds.add(msg._id);
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

        const newMessages = moreMessages
            .filter(msg => !loadedMessageIds.has(msg._id));

        if (newMessages.length > 0) {
            newMessages.reverse().forEach(msg => {
                loadedMessageIds.add(msg._id);
                messagesDiv.insertAdjacentHTML('afterbegin', renderMessage(msg, currentUserId));
            });

            const newScrollHeight = messagesDiv.scrollHeight;
            messagesDiv.scrollTop = newScrollHeight - previousScrollHeight;
        }

        if (newMessages.length === 0) {
            allMessagesLoaded = true;
            showNoMoreMessagesNotice();
        }
    } catch (err) {
        console.error('❌ Error loading more messages:', err);
        messagesPage--;
    }

    loadingMore = false;
}

// Scroll detection for auto-load
let scrollTimeout = null;

messagesDiv.addEventListener('scroll', () => {
    if (scrollTimeout) return;

    scrollTimeout = setTimeout(async () => {
        scrollTimeout = null;

        if (messagesDiv.scrollTop < 50 && !loadingMore && !allMessagesLoaded) {
            await loadMoreMessages();
        }
    }, 150);
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
            <div class="bubble"}
            ">
                <strong>${message.sender.username}</strong>
                <p style="margin: 5px 0 0;">${message.content}</p>
            </div>
        </div>
    `;
}

function showNoMoreMessagesNotice() {
    const notice = document.createElement('div');
    notice.textContent = 'You’ve reached the beginning of the conversation.';
    notice.style.textAlign = 'center';
    notice.style.color = '#888';
    notice.style.margin = '10px 0';
    notice.style.fontSize = '0.9em';
    messagesDiv.insertAdjacentElement('afterbegin', notice);
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

// Start new chat (group or single)
// Start new chat (group or single)
document.getElementById('new-chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const checkboxes = document.querySelectorAll('#user-list input[name="userIds"]:checked');
    const userIds = Array.from(checkboxes).map(cb => cb.value);
    const groupName = document.getElementById('group-name').value.trim();

    if (userIds.length === 0) {
        alert('Please select at least one user.');
        return;
    }

    try {
        const res = await fetch('/chat/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds, groupName })
        });

        const chat = await res.json();
        if (res.ok) {
            document.getElementById('new-chat-modal').style.display = 'none';

            // Set the new chat as the current chat
            currentChatId = chat._id;
            localStorage.setItem('activeChatId', currentChatId);
            socket.emit('joinRoom', currentChatId);

            // Clear previous messages and load the new chat messages
            messagesDiv.innerHTML = '';
            loadedMessageIds.clear();
            loadMessages();

            // Optional: dynamically add it to sidebar if you want
            const chatSidebar = document.querySelector('.chat-sidebar');
            const newChatDiv = document.createElement('div');
            newChatDiv.classList.add('chat-room');
            newChatDiv.dataset.id = chat._id;
            newChatDiv.innerHTML = chat.isGroupChat ? `<strong>[Group]</strong> ${chat.groupName}` : chat.users.find(u => u._id !== currentUserId)?.username || 'New Chat';

            newChatDiv.addEventListener('click', async () => {
                currentChatId = newChatDiv.dataset.id;
                localStorage.setItem('activeChatId', currentChatId);
                socket.emit('joinRoom', currentChatId);
                messagesPage = 1;
                allMessagesLoaded = false;
                loadMessages();
            });

            chatSidebar.appendChild(newChatDiv);

        } else {
            alert(chat.error || 'Failed to start chat.');
        }
    } catch (err) {
        console.error('❌ Start new chat error:', err);
    }
});

// User search inside modal
document.getElementById('user-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const userCheckboxes = document.querySelectorAll('#user-list .user-checkbox');

    userCheckboxes.forEach(checkboxDiv => {
        const label = checkboxDiv.querySelector('label');
        const text = label.textContent.toLowerCase();
        checkboxDiv.style.display = text.includes(query) ? '' : 'none';
    });
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

// Loading spinner
const spinner = document.getElementById('loading-spinner');
if (spinner) spinner.style.display = 'block';
// after loading:
if (spinner) spinner.style.display = 'none';
