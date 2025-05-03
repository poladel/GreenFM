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
const sidebarToggleBtn = document.getElementById('sidebar-toggle'); // Get toggle button
const sidebarContainer = document.getElementById('chat-sidebar-container'); // Get sidebar
const chatAreaContainer = document.querySelector('.chat-area'); // Get chat area
const messageInput = document.getElementById('message-input'); // Get the textarea
const messageForm = document.getElementById('message-form'); // Get the form
const chatHeaderName = document.getElementById('chat-name'); // Get chat name element
const chatOptionsBtn = document.getElementById('chat-options-btn'); // Gear button
const chatOptionsDropdown = document.getElementById('chat-options-dropdown'); // Dropdown menu
const renameChatBtn = document.getElementById('rename-chat-btn'); // Rename button in dropdown
const deleteChatBtn = document.getElementById('delete-chat-btn'); // Delete button in dropdown

let currentChatIsGroup = false; // Track if the current chat is a group chat

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

// --- Sidebar Toggle Logic ---
if (sidebarToggleBtn && sidebarContainer && chatAreaContainer) {
    sidebarToggleBtn.addEventListener('click', () => {
        const isSidebarHidden = sidebarContainer.classList.toggle('hidden');
        chatAreaContainer.classList.toggle('hidden', !isSidebarHidden); // Hide chat area if sidebar is NOT hidden

        // Optional: Change button text based on state
        if (isSidebarHidden) {
            sidebarToggleBtn.textContent = 'Show Inbox';
        } else {
            sidebarToggleBtn.textContent = 'Hide Inbox';
        }
    });

    // Ensure initial state on small screens (sidebar hidden, chat area visible)
    // Note: Tailwind's `md:flex` and `md:flex-1` handle visibility on larger screens
    if (window.innerWidth < 768) { // Tailwind's md breakpoint
        sidebarContainer.classList.add('hidden');
        chatAreaContainer.classList.remove('hidden');
        sidebarToggleBtn.textContent = 'Show Inbox';
    }
}
// --- END Sidebar Toggle Logic ---

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

// --- Chat Options Dropdown Logic ---
if (chatOptionsBtn && chatOptionsDropdown) {
    chatOptionsBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent closing immediately
        chatOptionsDropdown.classList.toggle('hidden');
    });

    // Close dropdown if clicking outside
    document.addEventListener('click', (e) => {
        if (!chatOptionsDropdown.classList.contains('hidden') && !chatOptionsBtn.contains(e.target) && !chatOptionsDropdown.contains(e.target)) {
            chatOptionsDropdown.classList.add('hidden');
        }
    });
}

// --- Action Handlers ---
if (deleteChatBtn) {
    deleteChatBtn.addEventListener('click', async () => {
        chatOptionsDropdown.classList.add('hidden'); // Hide dropdown
        if (!currentChatId) return;

        const confirmation = confirm(`Are you sure you want to delete this chat? This action cannot be undone.`);
        if (confirmation) {
            showSpinner();
            try {
                const res = await fetch(`/chat/${currentChatId}`, { method: 'DELETE' });
                if (res.ok) {
                    // Success handled by socket event 'chatDeleted'
                    console.log(`[DEBUG] Delete request for chat ${currentChatId} successful.`);
                    // No need to emit from client, server emits after successful deletion
                } else {
                    const errorData = await res.json();
                    alert(`Failed to delete chat: ${errorData.error || 'Unknown error'}`);
                }
            } catch (err) {
                console.error('❌ Error deleting chat:', err);
                alert('An error occurred while deleting the chat.');
            } finally {
                hideSpinner();
            }
        }
    });
}

if (renameChatBtn) {
    renameChatBtn.addEventListener('click', async () => {
        chatOptionsDropdown.classList.add('hidden'); // Hide dropdown
        if (!currentChatId || !currentChatIsGroup) return;

        const currentName = chatHeaderName.textContent.replace('[Group]', '').trim(); // Get current name from header
        const newName = prompt("Enter the new group name:", currentName);

        if (newName && newName.trim() !== '' && newName.trim() !== currentName) {
            const confirmation = confirm(`Rename group to "${newName.trim()}"?`);
            if (confirmation) {
                showSpinner();
                try {
                    const res = await fetch(`/chat/${currentChatId}/rename`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ groupName: newName.trim() })
                    });
                    if (res.ok) {
                        // Success handled by socket event 'chatRenamed'
                        console.log(`[DEBUG] Rename request for chat ${currentChatId} successful.`);
                         // No need to emit from client, server emits after successful rename
                    } else {
                        const errorData = await res.json();
                        alert(`Failed to rename chat: ${errorData.error || 'Unknown error'}`);
                    }
                } catch (err) {
                    console.error('❌ Error renaming chat:', err);
                    alert('An error occurred while renaming the chat.');
                } finally {
                    hideSpinner();
                }
            }
        } else if (newName !== null) { // User didn't cancel but entered empty or same name
            alert("Please enter a valid new name different from the current one.");
        }
    });
}
// --- End Action Handlers ---

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
            // Update active state styling
            document.querySelectorAll('.chat-room').forEach(r => r.classList.remove('bg-green-800', 'text-white')); // Remove new active state
            room.classList.add('bg-green-800', 'text-white'); // Apply new active state

            // --- Update Header and Options ---
            currentChatIsGroup = room.textContent.includes('[Group]'); // Check if it's a group chat
            if (chatHeaderName) {
                // Extract name, removing the role span or [Group] prefix
                const nameElement = room.cloneNode(true);
                const roleSpan = nameElement.querySelector('span');
                const groupStrong = nameElement.querySelector('strong');
                if (roleSpan) roleSpan.remove();
                if (groupStrong) groupStrong.remove(); // Remove [Group] prefix for header
                chatHeaderName.textContent = nameElement.textContent.trim();
            }
            // Show/hide dropdown options based on chat type
            if (chatOptionsBtn) chatOptionsBtn.classList.remove('hidden'); // Show gear icon
            if (renameChatBtn) renameChatBtn.classList.toggle('hidden', !currentChatIsGroup); // Show rename only for groups
            if (deleteChatBtn) deleteChatBtn.classList.remove('hidden'); // Always show delete for now
            // --- End Update Header and Options ---

        } else {
            console.log(`[DEBUG] Clicked already active room: ${currentChatId}. No join emitted.`);
        }

        // --- Hide sidebar on small screens ---
        // --- NEW: Hide sidebar and show chat area on small screens after clicking a room ---
        if (window.innerWidth < 768 && sidebarContainer && chatAreaContainer && !sidebarContainer.classList.contains('hidden')) {
            sidebarContainer.classList.add('hidden');
            chatAreaContainer.classList.remove('hidden');
            if (sidebarToggleBtn) {
                sidebarToggleBtn.textContent = 'Show Inbox';
            }
        }
        // --- END NEW ---
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


// --- Textarea Auto-Resize and Enter Key Submission ---
if (messageInput && messageForm) {
    const initialHeight = messageInput.style.height; // Store initial height

    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto'; // Temporarily shrink to get correct scrollHeight
        const scrollHeight = messageInput.scrollHeight;
        // Consider border/padding if needed, but scrollHeight usually accounts for it
        messageInput.style.height = `${scrollHeight}px`;

        // Optional: Reset to initial height if empty
        if (messageInput.value.trim() === '') {
            messageInput.style.height = initialHeight;
        }
    });

    messageInput.addEventListener('keydown', (e) => {
        // Submit on Enter key press (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent newline in textarea
            messageForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); // Trigger form submission
        }
    });

     // Reset height after form submission
     messageForm.addEventListener('submit', () => {
        // Use setTimeout to allow the value to clear before resetting height
        setTimeout(() => {
            messageInput.style.height = initialHeight;
        }, 0);
    });
}
// --- END Textarea Auto-Resize ---

// Send new message
messageForm.addEventListener('submit', async e => { // Changed selector to messageForm
    e.preventDefault();
    // const input = document.getElementById('message-input'); // Already have messageInput
    const content = messageInput.value.trim(); // Use messageInput
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
    messageInput.value = ''; // Clear input immediately
    // Height reset is handled by the 'submit' listener added above

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
            // Optionally, restore input value: messageInput.value = content;
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
        // Optionally, restore input value: messageInput.value = content;
    }
});

// --- Socket Listeners ---

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
            // Changed text-blue-600 to text-green-600
            roomElement.classList.add('font-bold', 'text-green-600'); // Example notification style
        }
    }
});

// Listen for newly created chats where the current user is a participant
socket.on('newChatCreated', (chat) => {
    console.log('[DEBUG] Received newChatCreated event:', chat);

    const chatSidebarList = document.querySelector('.chat-sidebar > div.space-y-2');
    if (!chatSidebarList) {
        console.error('[DEBUG] Chat sidebar list not found.');
        return;
    }

    // Check if the chat room already exists in the sidebar
    const existingRoom = chatSidebarList.querySelector(`.chat-room[data-id="${chat._id}"]`);
    if (existingRoom) {
        console.log(`[DEBUG] Chat room ${chat._id} already exists in the sidebar. Skipping.`);
        return;
    }

    // --- Create and append the new chat room element (similar to createNewChat success) ---
    const newChatDiv = document.createElement('div');
    // Add base classes + group class for hover/active states
    newChatDiv.classList.add('chat-room', 'bg-white', 'p-2.5', 'mt-2', 'rounded-lg', 'cursor-pointer', 'transition', 'duration-200', 'ease-in-out', 'hover:bg-green-700', 'hover:text-white', 'group');
    newChatDiv.dataset.id = chat._id;

    let roomHTML = '';
    if (chat.isGroupChat) {
        // Apply selected state styling for the [Group] text
        roomHTML = `<strong class="text-green-700 group-hover:text-white group-[.bg-green-800]:text-gray-200">[Group]</strong> ${chat.groupName || 'Unnamed Group'}`;
    } else {
        // Find the other user in a private chat
        const otherUser = chat.users.find(u => u._id.toString() !== currentUserId);
        if (otherUser) {
            // Apply selected state styling for the role span
            roomHTML = `${otherUser.username} <span class="text-xs text-gray-500 group-hover:text-gray-200 group-[.bg-green-800]:text-gray-200 ml-1">(${otherUser.roles || 'User'})</span>`;
        } else {
            roomHTML = 'Chat with Unknown User'; // Fallback
        }
    }
    newChatDiv.innerHTML = roomHTML;

    // Attach the click listener (same logic as existing rooms and dynamically added rooms)
    newChatDiv.addEventListener('click', async () => {
        const newChatId = newChatDiv.dataset.id;
        if (newChatId !== currentChatId) {
            console.log(`[DEBUG] Joining new room from dynamically added chat: ${newChatId}`);
            currentChatId = newChatId;
            localStorage.setItem('activeChatId', currentChatId);
            socket.emit('joinRoom', currentChatId);
            messagesPage = 1;
            allMessagesLoaded = false;
            loadedMessageIds.clear();
            loadMessages();
            // Update active state styling
            document.querySelectorAll('.chat-room').forEach(r => r.classList.remove('bg-green-800', 'text-white'));
            newChatDiv.classList.add('bg-green-800', 'text-white');

            // --- Update Header and Options ---
            currentChatIsGroup = chat.isGroupChat; // Use chat data
            if (chatHeaderName) {
                const nameElement = newChatDiv.cloneNode(true);
                const roleSpan = nameElement.querySelector('span');
                const groupStrong = nameElement.querySelector('strong');
                if (roleSpan) roleSpan.remove();
                if (groupStrong) groupStrong.remove();
                chatHeaderName.textContent = nameElement.textContent.trim();
            }
            if (chatOptionsBtn) chatOptionsBtn.classList.remove('hidden');
            if (renameChatBtn) renameChatBtn.classList.toggle('hidden', !currentChatIsGroup);
            if (deleteChatBtn) deleteChatBtn.classList.remove('hidden');
            // --- End Update Header and Options ---
        } else {
             console.log(`[DEBUG] Clicked already active dynamically added room: ${currentChatId}. No join emitted.`);
        }

        // Hide sidebar on small screens after click
        if (window.innerWidth < 768 && sidebarContainer && chatAreaContainer && !sidebarContainer.classList.contains('hidden')) {
            sidebarContainer.classList.add('hidden');
            chatAreaContainer.classList.remove('hidden');
            if (sidebarToggleBtn) {
                sidebarToggleBtn.textContent = 'Show Inbox';
            }
        }
    });

    // Append the new chat room to the sidebar list
    chatSidebarList.appendChild(newChatDiv);
    console.log(`[DEBUG] Dynamically added new chat room ${chat._id} to sidebar.`);

    // Optional: Add a visual cue that it's a new chat? (e.g., temporary highlight)
    newChatDiv.classList.add('animate-pulse'); // Example: Add a pulse animation
    setTimeout(() => {
        newChatDiv.classList.remove('animate-pulse'); // Remove animation after a delay
    }, 3000); // Adjust time as needed

});

// Listen for deleted chats
socket.on('chatDeleted', (deletedChatId) => {
    console.log(`[DEBUG] Received chatDeleted event for chat ID: ${deletedChatId}`);
    const roomElement = document.querySelector(`.chat-room[data-id="${deletedChatId}"]`);
    if (roomElement) {
        roomElement.remove();
        console.log(`[DEBUG] Removed chat room ${deletedChatId} from sidebar.`);
    }

    // If the deleted chat was the currently active one, reset the view
    if (deletedChatId === currentChatId) {
        currentChatId = null;
        currentChatIsGroup = false;
        localStorage.removeItem('activeChatId');
        messagesDiv.innerHTML = '<p class="text-center text-gray-500">Select a chat to start messaging.</p>';
        if (chatHeaderName) chatHeaderName.textContent = 'Select a chat';
        if (chatOptionsBtn) chatOptionsBtn.classList.add('hidden'); // Hide gear icon
        if (chatOptionsDropdown) chatOptionsDropdown.classList.add('hidden'); // Hide dropdown
        messageInput.value = ''; // Clear message input
        // Optionally, trigger sidebar toggle on mobile if needed
    }
});

// Listen for renamed chats
socket.on('chatRenamed', (updatedChat) => {
    console.log(`[DEBUG] Received chatRenamed event for chat ID: ${updatedChat._id}`);
    const roomElement = document.querySelector(`.chat-room[data-id="${updatedChat._id}"]`);
    if (roomElement) {
        // Rebuild the inner HTML for the chat room
        let roomHTML = '';
        if (updatedChat.isGroupChat) {
            roomHTML = `<strong class="text-green-700 group-hover:text-white group-[.bg-green-800]:text-gray-200">[Group]</strong> ${updatedChat.groupName || 'Unnamed Group'}`;
        } else {
            // This part shouldn't be reached if only groups can be renamed, but included for completeness
            const otherUser = updatedChat.users.find(u => u._id.toString() !== currentUserId);
            roomHTML = otherUser ? `${otherUser.username} <span class="text-xs text-gray-500 group-hover:text-gray-200 group-[.bg-green-800]:text-gray-200 ml-1">(${otherUser.roles || 'User'})</span>` : 'Chat with Unknown User';
        }
        roomElement.innerHTML = roomHTML;
        console.log(`[DEBUG] Updated chat room ${updatedChat._id} name in sidebar.`);
    }

    // If the renamed chat is the currently active one, update the header
    if (updatedChat._id === currentChatId) {
        if (chatHeaderName) {
            chatHeaderName.textContent = updatedChat.groupName || 'Unnamed Group'; // Update header directly
        }
    }
});


// --- End Socket Listeners ---

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
            const chatSidebarList = document.querySelector('.chat-sidebar > div.space-y-2');
            if(chatSidebarList) {
                 const existingRoom = chatSidebarList.querySelector(`.chat-room[data-id="${chat._id}"]`);
                 if (!existingRoom) {
                    // ... (existing code for creating newChatDiv and roomHTML) ...

                    newChatDiv.addEventListener('click', async () => {
                        // ... (existing code for switching chat) ...
                         // Update active state styling
                         document.querySelectorAll('.chat-room').forEach(r => r.classList.remove('bg-green-800', 'text-white'));
                         newChatDiv.classList.add('bg-green-800', 'text-white');

                         // --- Update Header and Options ---
                         currentChatIsGroup = chat.isGroupChat; // Use chat data
                         if (chatHeaderName) {
                             const nameElement = newChatDiv.cloneNode(true);
                             const roleSpan = nameElement.querySelector('span');
                             const groupStrong = nameElement.querySelector('strong');
                             if (roleSpan) roleSpan.remove();
                             if (groupStrong) groupStrong.remove();
                             chatHeaderName.textContent = nameElement.textContent.trim();
                         }
                         if (chatOptionsBtn) chatOptionsBtn.classList.remove('hidden');
                         if (renameChatBtn) renameChatBtn.classList.toggle('hidden', !currentChatIsGroup);
                         if (deleteChatBtn) deleteChatBtn.classList.remove('hidden');
                         // --- End Update Header and Options ---

                        // --- Hide sidebar on small screens ---
                        // ... (existing code) ...
                    });
                     chatSidebarList.appendChild(newChatDiv);
                     newChatDiv.click(); // Automatically switch to the new chat
                 } else {
                     existingRoom.click(); // Switch to the existing chat
                     // --- Hide sidebar on small screens ---
                     // ... (existing code) ...
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
    // Don't show spinner immediately, only when a chat is clicked
    // showSpinner();

    // --- REMOVED AUTO-SELECTION LOGIC ---
    // const savedChatId = localStorage.getItem('activeChatId');
    // let chatToClick = null;
    //
    // if (savedChatId) {
    //     // Set currentChatId early so the 'connect' handler can use it if needed
    //     currentChatId = savedChatId;
    //     console.log(`[DEBUG] Restored currentChatId from localStorage: ${currentChatId}`);
    //     chatToClick = document.querySelector(`.chat-room[data-id="${savedChatId}"]`);
    // }
    // // If no saved chat or saved chat not found, find the first one
    // if (!chatToClick) {
    //     chatToClick = document.querySelector('.chat-room');
    //     if (chatToClick) {
    //         // Set currentChatId if loading the first chat
    //         currentChatId = chatToClick.dataset.id;
    //         console.log(`[DEBUG] Set currentChatId to first chat: ${currentChatId}`);
    //     }
    // }
    //
    // // If the socket is already connected when DOMContentLoaded runs, ensure it joins the room.
    // // If it connects later, the 'connect' event handler will manage joining.
    // if (socket.connected && currentChatId) {
    //     console.log(`[DEBUG] Socket already connected on load. Emitting joinRoom for ${currentChatId}`);
    //     socket.emit('joinRoom', currentChatId);
    // }
    //
    // if (chatToClick) {
    //     // Simulate click to load messages and set active styles, but avoid re-emitting joinRoom
    //     // We manually set currentChatId and emit joinRoom above or in the 'connect' handler
    //     const roomElement = chatToClick;
    //     messagesPage = 1;
    //     allMessagesLoaded = false;
    //     loadedMessageIds.clear();
    //     loadMessages(); // Load messages for the determined chat
    //     document.querySelectorAll('.chat-room').forEach(r => r.classList.remove('bg-gray-200', 'text-black'));
    //     roomElement.classList.add('bg-gray-200', 'text-black');
    //
    //     // --- NEW: Hide sidebar and show chat area on small screens after initial load ---
    //     if (window.innerWidth < 768 && sidebarContainer && chatAreaContainer && !sidebarContainer.classList.contains('hidden')) {
    //         sidebarContainer.classList.add('hidden');
    //         chatAreaContainer.classList.remove('hidden');
    //         if (sidebarToggleBtn) {
    //             sidebarToggleBtn.textContent = 'Show Inbox';
    //         }
    //     }
    //     // --- END NEW ---
    // } else {
    //     // No chats available
    //     messagesDiv.innerHTML = '<p class="text-center text-gray-500">Select a chat or start a new one.</p>';
    //     hideSpinner(); // Hide spinner if no chats to load
    // }
    // --- END REMOVED AUTO-SELECTION LOGIC ---

    // Set initial prompt in the message area and header
    messagesDiv.innerHTML = '<p class="text-center text-gray-500">Select a chat to start messaging.</p>';
    if (chatHeaderName) {
        chatHeaderName.textContent = 'Select a chat'; // Initial header text
    }
    // Ensure spinner is hidden if it was shown by mistake or by other logic
    hideSpinner();

    // Ensure correct initial state for mobile toggle
    if (window.innerWidth < 768 && sidebarContainer && chatAreaContainer) {
        sidebarContainer.classList.add('hidden'); // Start with sidebar hidden on mobile
        chatAreaContainer.classList.remove('hidden'); // Start with chat area visible on mobile
        if (sidebarToggleBtn) {
            sidebarToggleBtn.textContent = 'Show Inbox';
        }
    } else if (sidebarContainer && chatAreaContainer) {
         // Ensure correct state for desktop (sidebar visible, chat area visible)
         sidebarContainer.classList.remove('hidden');
         chatAreaContainer.classList.remove('hidden');
    }
});

// Auto-load last active or first chat on page load
window.addEventListener('DOMContentLoaded', () => {
    // ... (existing code for initial prompts and mobile toggle) ...
    // Ensure gear icon and dropdown are hidden initially
    if (chatOptionsBtn) chatOptionsBtn.classList.add('hidden');
    if (chatOptionsDropdown) chatOptionsDropdown.classList.add('hidden');
});