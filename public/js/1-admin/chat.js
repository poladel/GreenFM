let messagesPage = 1;
let loadingMore = false;
let allMessagesLoaded = false;
let loadedMessageIds = new Set();

const socket = io();
let currentChatId = null;
const currentUserId = document.body.dataset.userId;
const messagesDiv = document.getElementById('messages');
const modal = document.getElementById('new-chat-modal');
const modalBackdrop = document.getElementById('modal-backdrop');
const spinner = document.getElementById('loading-spinner'); // Get spinner element

console.log('👤 Current User ID:', currentUserId);

// --- SPINNER FUNCTIONS (Using Tailwind) ---
function showSpinner() {
    if (spinner) {
        spinner.classList.remove('hidden');
        spinner.classList.add('block'); // Or 'flex' if needed for centering
    }
}

function hideSpinner() {
    if (spinner) {
        spinner.classList.add('hidden');
        spinner.classList.remove('block'); // Or 'flex'
    }
}
// --- END SPINNER FUNCTIONS ---

// --- Socket Connection Handling ---
socket.on('connect', () => {
    console.log(`[DEBUG] Socket connected with ID: ${socket.id}`);
    // If a chat was already active, rejoin its room upon connection/reconnection
    if (currentChatId) {
        console.log(`[DEBUG] Rejoining room ${currentChatId} after connection.`);
        socket.emit('joinRoom', currentChatId);
    }
});

// --- END Socket Connection Handling ---

// Handle chat room click
document.querySelectorAll('.chat-room').forEach(room => {
    room.addEventListener('click', async () => {
        const newChatId = room.dataset.id;
        // Only emit joinRoom if the chat ID actually changes
        if (newChatId !== currentChatId) {
            console.log(`[DEBUG] Joining new room: ${newChatId}`);
            currentChatId = newChatId;
            localStorage.setItem('activeChatId', currentChatId);
            socket.emit('joinRoom', currentChatId); // Emit join for the new room
            messagesPage = 1; // Reset page for new chat
            allMessagesLoaded = false; // Reset flag
            loadedMessageIds.clear(); // Clear loaded message tracking
            loadMessages();
            // Optional: Add active state styling
            document.querySelectorAll('.chat-room').forEach(r => r.classList.remove('bg-gray-200', 'text-black')); // Use a neutral active state
            room.classList.add('bg-gray-200', 'text-black'); // Apply neutral active state
        } else {
            console.log(`[DEBUG] Clicked already active room: ${currentChatId}. No join emitted.`);
        }
    });
});

// Load initial messages
async function loadMessages() {
    if (!currentChatId) return;
    showSpinner();
    messagesDiv.innerHTML = '<p class="text-center text-gray-500">Loading messages...</p>'; // Initial loading message
    try {
        // Fetch only the latest N messages initially
        const initialLimit = 20; // Fetch more initially
        const res = await fetch(`/chat/messages/${currentChatId}?page=1&limit=${initialLimit}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const messages = await res.json();

        messagesDiv.innerHTML = ''; // Clear loading message
        loadedMessageIds.clear();
        allMessagesLoaded = false; // Reset flag
        messagesPage = 1; // Reset page

        // Check if the fetched messages are less than the limit, meaning all are loaded
        if (messages.length < initialLimit) {
            allMessagesLoaded = true;
            showNoMoreMessagesNotice(); // Show notice if all loaded initially
        }

        // Render messages (latest at the bottom)
        messages.forEach(msg => { // Already fetched in correct order (latest last)
            loadedMessageIds.add(msg._id);
            messagesDiv.insertAdjacentHTML('beforeend', renderMessage(msg, currentUserId));
        });

        scrollToBottom(); // Scroll after rendering

    } catch (err) {
        console.error('❌ Error loading messages:', err);
        messagesDiv.innerHTML = '<p class="text-center text-red-500">Error loading messages.</p>';
    } finally {
        hideSpinner();
    }
}


// Load older messages on scroll to top
async function loadMoreMessages() {
    if (loadingMore || !currentChatId || allMessagesLoaded) return;
    loadingMore = true;
    showSpinner(); // Show spinner while loading more

    const previousScrollHeight = messagesDiv.scrollHeight;
    const previousScrollTop = messagesDiv.scrollTop; // Store current scroll position
    messagesPage++; // Increment page *before* fetching

    try {
        const res = await fetch(`/chat/messages/${currentChatId}?page=${messagesPage}`); // Default limit on backend
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const moreMessages = await res.json();

        const newMessages = moreMessages.filter(msg => !loadedMessageIds.has(msg._id));

        if (newMessages.length > 0) {
            // Insert new messages at the top
            newMessages.reverse().forEach(msg => {
                loadedMessageIds.add(msg._id);
                messagesDiv.insertAdjacentHTML('afterbegin', renderMessage(msg, currentUserId));
            });

            // Restore scroll position relative to the old top
            const newScrollHeight = messagesDiv.scrollHeight;
            messagesDiv.scrollTop = previousScrollTop + (newScrollHeight - previousScrollHeight);

        } else {
            // No *new* messages found, assume we've reached the beginning
            allMessagesLoaded = true;
            showNoMoreMessagesNotice();
        }
    } catch (err) {
        console.error('❌ Error loading more messages:', err);
        messagesPage--; // Decrement page count on error
        // Optionally show error message to user
    } finally {
        loadingMore = false;
        hideSpinner(); // Hide spinner when done
    }
}

// Scroll detection for auto-load
let scrollTimeout = null;
messagesDiv.addEventListener('scroll', () => {
    // Debounce the scroll event
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        // Check if scrolled near the top
        if (messagesDiv.scrollTop < 50 && !loadingMore && !allMessagesLoaded) {
            loadMoreMessages();
        }
    }, 100); // Adjust debounce time as needed
});


// Send new message
document.getElementById('message-form').addEventListener('submit', async e => {
    e.preventDefault();
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    if (!content || !currentChatId) return;

    // Optimistic UI update
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage = {
        _id: tempId, // Use temporary ID
        sender: { _id: currentUserId, username: 'You' },
        content: content,
        chat: currentChatId,
        createdAt: new Date().toISOString()
    };
    // Render with optimistic flag and class
    messagesDiv.insertAdjacentHTML('beforeend', renderMessage(optimisticMessage, currentUserId, true));
    scrollToBottom();
    input.value = ''; // Clear input immediately

    try {
        const res = await fetch(`/chat/message/${currentChatId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });

        const message = await res.json(); // Backend returns the saved message

        // ** REMOVED tempElement removal from here **

        if (!res.ok) {
            console.error('❌ Message send failed:', message.error);
            // Visually mark the optimistic message as failed
            const tempElement = document.getElementById(`message-${tempId}`);
            if (tempElement) {
                tempElement.classList.add('opacity-50', 'border', 'border-red-500'); // Example failure style
            }
            alert("Failed to send message: " + (message.error || 'Unknown error'));
            // Optionally, restore input value: input.value = content;
        }
        // Success: rely on socket listener 'newMessage' to replace optimistic message
    } catch (err) {
        console.error('❌ Send message error:', err);
        // Visually mark optimistic message as failed on network error
        const tempElement = document.getElementById(`message-${tempId}`);
        if (tempElement) {
             tempElement.classList.add('opacity-50', 'border', 'border-red-500'); // Example failure style
        }
        alert("Network error sending message.");
        // Optionally, restore input value: input.value = content;
    }
});


// Real-time messages
socket.on('newMessage', message => {
    // --- DEBUGGING START ---
    console.log('[DEBUG] Received newMessage event:', message);
    console.log(`[DEBUG] Current active chat ID: ${currentChatId}`);
    console.log(`[DEBUG] Message belongs to chat ID: ${message.chat}`);
    // --- DEBUGGING END ---

    // Ensure message object and chat ID are valid
    if (!message || !message.chat || !message.sender) {
        console.warn('[DEBUG] Received invalid message object:', message);
        return;
    }

    // Only process if it belongs to the currently active chat
    if (message.chat === currentChatId) {
        console.log('[DEBUG] Message IS for the currently active chat.');
        const isOwnMessage = message.sender._id === currentUserId;
        console.log(`[DEBUG] Is own message? ${isOwnMessage}`);

        // If it's the sender's own message, remove the optimistic placeholder(s)
        if (isOwnMessage) {
            const optimisticElements = messagesDiv.querySelectorAll('.optimistic-message');
            console.log(`[DEBUG] Found ${optimisticElements.length} optimistic message(s) to remove.`);
            optimisticElements.forEach(el => {
                el.remove();
            });
        }

        // --- Simplified Logic ---
        // Check if the message ID is already tracked (e.g., from initial load or loadMore)
        // This prevents duplicates if the message was already loaded via fetch.
        if (!loadedMessageIds.has(message._id)) {
            console.log(`[DEBUG] Message ID ${message._id} is NOT in loadedMessageIds Set. Adding message to DOM.`);
            // Render the actual message (not optimistic)
            messagesDiv.insertAdjacentHTML('beforeend', renderMessage(message, currentUserId, false));
            // Add the ID to the set *after* rendering
            loadedMessageIds.add(message._id);
            scrollToBottom();
        } else {
            console.log(`[DEBUG] Message ID ${message._id} IS already in loadedMessageIds Set. Skipping render to avoid duplicate.`);
            // Optional: Ensure any potentially failed optimistic message styling is removed if the real one was already loaded
            const existingElement = document.getElementById(`message-${message._id}`);
            if (existingElement) {
                existingElement.classList.remove('opacity-50', 'border', 'border-red-500');
            }
        }
        // --- End Simplified Logic ---

    } else {
        // --- DEBUGGING START ---
        console.log('[DEBUG] Message is NOT for the currently active chat. Highlighting sidebar.');
        // --- DEBUGGING END ---
        // Optionally, indicate new message in another chat room in the sidebar
        const roomElement = document.querySelector(`.chat-room[data-id="${message.chat}"]`);
        if (roomElement) {
            roomElement.classList.add('font-bold', 'text-blue-600'); // Example notification style
        }
    }
});

// Render one message using Tailwind classes
// Added isOptimistic flag
function renderMessage(message, currentUserId, isOptimistic = false) {
    const isMine = message.sender && message.sender._id === currentUserId;
    const messageAlign = isMine ? 'items-end' : 'items-start';
    // Use green-700/white for received, gray-100/gray-800 for sent (mine)
    const bubbleColor = isMine ? 'bg-gray-100 text-gray-800' : 'bg-green-700 text-white';
    // Set senderName to "You" if it's the current user's message
    const senderName = isMine ? 'You' : (message.sender ? message.sender.username : 'Unknown');
    // Use the temporary ID if optimistic, otherwise use the real ID or generate a fallback
    const messageId = isOptimistic ? message._id : (message._id || `received_${Date.now()}`);
    const optimisticClass = isOptimistic ? 'optimistic-message' : ''; // Add class if optimistic

    // Basic HTML sanitization
    const sanitizedContent = (message.content || '')
        .replace(/</g, "&lt;") // Use &lt; and &gt; for safety
        .replace(/>/g, "&gt;");

    // Format timestamp
    let timestamp = '';
    if (message.createdAt) {
        try {
            const date = new Date(message.createdAt);
            // Simple HH:MM AM/PM format
            timestamp = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } catch (e) {
            console.error("Error formatting date:", e);
            timestamp = 'Invalid date'; // Fallback for invalid date format
        }
    }

    return `
        <div id="message-${messageId}" class="message flex flex-col mb-2.5 ${messageAlign} ${optimisticClass}">
            <div class="bubble p-2.5 px-3.5 rounded-t-2xl ${isMine ? 'rounded-bl-2xl' : 'rounded-br-2xl'} max-w-[70%] break-words shadow-sm text-[0.95rem] ${bubbleColor}">
                <!-- Username and Timestamp on the same line -->
                <div class="flex justify-between items-baseline mb-0.5">
                    <strong class="text-xs ${isMine ? 'text-gray-600' : 'text-gray-200'}">${senderName}</strong>
                    <span class="text-[0.65rem] ml-2 ${isMine ? 'text-gray-500' : 'text-gray-300'}">${timestamp}</span>
                </div>
                <p class="mt-0 mb-0 text-sm">${sanitizedContent}</p>
                <!-- Timestamp removed from here -->
            </div>
        </div>
    `;
}

// Show "no more messages" notice with Tailwind
function showNoMoreMessagesNotice() {
    // Prevent adding multiple notices
    if (messagesDiv.querySelector('.no-more-messages')) return;

    const notice = document.createElement('div');
    notice.classList.add('no-more-messages', 'text-center', 'text-gray-500', 'my-2.5', 'text-sm', 'italic');
    notice.textContent = 'You’ve reached the beginning of the conversation.';
    messagesDiv.insertAdjacentElement('afterbegin', notice);
}

// Scroll to bottom helper
function scrollToBottom() {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// --- Modal handlers (Using Tailwind classes) ---
document.getElementById('open-new-chat').addEventListener('click', () => {
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex'); // Make it flex for centering
    }
    if (modalBackdrop) {
        modalBackdrop.classList.remove('hidden');
    }
     // Clear previous selections and search
     document.getElementById('new-chat-form').reset();
     document.getElementById('user-search').value = '';
     document.querySelectorAll('#user-list .user-checkbox').forEach(div => div.style.display = ''); // Show all users
});

document.getElementById('close-modal').addEventListener('click', () => {
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    if (modalBackdrop) {
        modalBackdrop.classList.add('hidden');
    }
});
// Close modal if backdrop is clicked (optional)
if (modalBackdrop) {
    modalBackdrop.addEventListener('click', () => {
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        modalBackdrop.classList.add('hidden');
    });
}
// --- End Modal Handlers ---

// Start new chat form submission (no Tailwind changes needed here)
document.getElementById('new-chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showSpinner();

    const checkboxes = document.querySelectorAll('#user-list input[name="userIds"]:checked');
    const userIds = Array.from(checkboxes).map(cb => cb.value);
    const groupName = document.getElementById('group-name').value.trim();

    if (userIds.length === 0) {
        hideSpinner();
        alert('Please select at least one user.');
        return;
    }

    try {
        const res = await fetch('/chat/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds, groupName }) // Backend expects this structure
        });

        const chat = await res.json(); // Returns the newly created/found chat object

        if (res.ok && chat && chat._id) {
             // Close modal (using Tailwind classes)
             if (modal) {
                 modal.classList.add('hidden');
                 modal.classList.remove('flex');
             }
             if (modalBackdrop) {
                 modalBackdrop.classList.add('hidden');
             }

            // --- Dynamically add to sidebar ---
            const chatSidebarList = document.querySelector('.chat-sidebar > div.space-y-2'); // Target the list container
            if(chatSidebarList) {
                 // Avoid adding duplicates if it already exists (e.g., a private chat)
                 const existingRoom = chatSidebarList.querySelector(`.chat-room[data-id="${chat._id}"]`);
                 if (!existingRoom) {
                    const newChatDiv = document.createElement('div');
                    newChatDiv.classList.add('chat-room', 'bg-white', 'p-2.5', 'mt-2', 'rounded-lg', 'cursor-pointer', 'transition', 'duration-200', 'ease-in-out', 'hover:bg-[#38761d]', 'hover:text-white', 'group'); // Added group
                    newChatDiv.dataset.id = chat._id;

                    let roomHTML = '';
                     if (chat.isGroupChat) {
                         roomHTML = `<strong class="text-[#38761d] group-hover:text-white">[Group]</strong> ${chat.groupName || 'Unnamed Group'}`; // Use hex color
                     } else {
                         const otherUser = chat.users.find(u => u._id.toString() !== currentUserId);
                         roomHTML = otherUser ? `${otherUser.username} <span class="text-xs text-gray-500 group-hover:text-gray-200">(${otherUser.roles || 'User'})</span>` : 'New Chat';
                     }
                     newChatDiv.innerHTML = roomHTML;

                    newChatDiv.addEventListener('click', async () => {
                        // Logic to switch chat (same as existing room click handler)
                         currentChatId = newChatDiv.dataset.id;
                         localStorage.setItem('activeChatId', currentChatId);
                         socket.emit('joinRoom', currentChatId);
                         messagesPage = 1;
                         allMessagesLoaded = false;
                         loadedMessageIds.clear();
                         loadMessages();
                         document.querySelectorAll('.chat-room').forEach(r => r.classList.remove('bg-gray-200', 'text-black')); // Use neutral active state
                         newChatDiv.classList.add('bg-gray-200', 'text-black'); // Apply neutral active state
                    });
                     chatSidebarList.appendChild(newChatDiv); // Add to the list container
                     newChatDiv.click(); // Automatically switch to the new chat
                 } else {
                     existingRoom.click(); // Switch to the existing chat
                 }
            }
             // --- End dynamic add ---

        } else {
            alert(chat.error || 'Failed to start chat.');
        }
    } catch (err) {
        console.error('❌ Start new chat error:', err);
        alert('An error occurred while starting the chat.');
    } finally {
        hideSpinner();
    }
});

// User search inside modal (visibility toggle updated)
document.getElementById('user-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const userCheckboxes = document.querySelectorAll('#user-list .user-checkbox');

    userCheckboxes.forEach(checkboxDiv => {
        const label = checkboxDiv.querySelector('label');
        const text = label.textContent.toLowerCase();
        // Use Tailwind's hidden class
        if (text.includes(query)) {
            checkboxDiv.classList.remove('hidden');
        } else {
            checkboxDiv.classList.add('hidden');
        }
    });
});


// Auto-load last active or first chat on page load
window.addEventListener('DOMContentLoaded', () => {
    showSpinner(); // Show spinner on initial load
    const savedChatId = localStorage.getItem('activeChatId');
    let chatToClick = null;

    if (savedChatId) {
        // Set currentChatId early so the 'connect' handler can use it if needed
        currentChatId = savedChatId;
        console.log(`[DEBUG] Restored currentChatId from localStorage: ${currentChatId}`);
        chatToClick = document.querySelector(`.chat-room[data-id="${savedChatId}"]`);
    }
    // If no saved chat or saved chat not found, find the first one
    if (!chatToClick) {
        chatToClick = document.querySelector('.chat-room');
        if (chatToClick) {
            // Set currentChatId if loading the first chat
            currentChatId = chatToClick.dataset.id;
            console.log(`[DEBUG] Set currentChatId to first chat: ${currentChatId}`);
        }
    }

    // If the socket is already connected when DOMContentLoaded runs, ensure it joins the room.
    // If it connects later, the 'connect' event handler will manage joining.
    if (socket.connected && currentChatId) {
        console.log(`[DEBUG] Socket already connected on load. Emitting joinRoom for ${currentChatId}`);
        socket.emit('joinRoom', currentChatId);
    }

    if (chatToClick) {
        // Simulate click to load messages and set active styles, but avoid re-emitting joinRoom
        // We manually set currentChatId and emit joinRoom above or in the 'connect' handler
        const roomElement = chatToClick;
        messagesPage = 1;
        allMessagesLoaded = false;
        loadedMessageIds.clear();
        loadMessages(); // Load messages for the determined chat
        document.querySelectorAll('.chat-room').forEach(r => r.classList.remove('bg-gray-200', 'text-black'));
        roomElement.classList.add('bg-gray-200', 'text-black');
    } else {
        // No chats available
        messagesDiv.innerHTML = '<p class="text-center text-gray-500">Select a chat or start a new one.</p>';
        hideSpinner(); // Hide spinner if no chats to load
    }
});