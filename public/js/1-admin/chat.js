// --- Define consistent classes (SINGLE DECLARATION) ---
// Ensure these match your desired active/inactive states
const ACTIVE_CHAT_CLASSES = ['bg-green-800', 'text-white', 'font-bold']; // Correct active classes
const INACTIVE_CHAT_CLASSES = ['bg-white', 'hover:bg-green-700', 'hover:text-white']; // Base inactive classes (adjust if needed)

// --- Global Variables ---
let currentChatId = null;
let messagesPage = 1;
let loadingMore = false;
let allMessagesLoaded = false;
let loadedMessageIds = new Set();

const socket = io();
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
const archiveChatBtn = document.getElementById('archive-chat-btn'); // Archive button in dropdown (updated ID)
const openArchivedChatsBtn = document.getElementById('open-archived-chats'); // Button to open archived modal
const archivedModal = document.getElementById('archived-chats-modal'); // Archived modal itself
const archivedModalBackdrop = document.getElementById('archived-modal-backdrop'); // Archived modal backdrop
const closeArchivedModalBtn = document.getElementById('close-archived-modal'); // Button to close archived modal
const archivedChatListDiv = document.getElementById('archived-chat-list'); // Div to list archived chats

let currentChatIsGroup = false; // Track if the current chat is a group chat
let currentChatCreatorId = null; // Track the creator ID of the current chat

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

    // --- Join all rooms listed in the sidebar ---
    const chatRooms = document.querySelectorAll('.chat-room');
    console.log(`[DEBUG] Found ${chatRooms.length} chat rooms in sidebar. Joining rooms...`);
    chatRooms.forEach(room => {
        const roomId = room.dataset.id;
        if (roomId) {
            console.log(`[DEBUG] Emitting joinRoom for initial room: ${roomId}`);
            socket.emit('joinRoom', roomId);
            // --- ADD THIS LOG ---
            console.log(`[CLIENT DEBUG] Emitted joinRoom(${roomId}) on connect.`);
            // --- END ADDED LOG ---
        }
    });
    // --- End Join all rooms ---

    // If a chat was already active (e.g., from localStorage), rejoin its room upon connection/reconnection
    // This ensures the *current* chat is definitely joined, even if it wasn't in the initial list for some reason.
    if (currentChatId) {
        console.log(`[DEBUG] Rejoining active room ${currentChatId} after connection.`);
        socket.emit('joinRoom', currentChatId);
         // --- ADD THIS LOG ---
         console.log(`[CLIENT DEBUG] Emitted joinRoom(${currentChatId}) for active chat on connect.`);
         // --- END ADDED LOG ---
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
if (archiveChatBtn) { // Updated variable name
    archiveChatBtn.addEventListener('click', async () => { // Updated variable name
        chatOptionsDropdown.classList.add('hidden'); // Hide dropdown
        if (!currentChatId) return;

        // Changed confirmation message
        const confirmation = confirm(`Are you sure you want to archive this chat? It will be hidden from your inbox.`);
        if (confirmation) {
            showSpinner();
            try {
                // Updated endpoint and method
                const res = await fetch(`/chat/${currentChatId}/archive`, { method: 'PUT' });
                if (res.ok) {
                    // Success handled by socket event 'chatArchived'
                    console.log(`[DEBUG] Archive request for chat ${currentChatId} successful.`);
                } else {
                    const errorData = await res.json();
                    alert(`Failed to archive chat: ${errorData.error || 'Unknown error'}`);
                }
            } catch (err) {
                console.error('❌ Error archiving chat:', err);
                alert('An error occurred while archiving the chat.');
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

// --- Archived Chats Modal Logic ---
if (openArchivedChatsBtn && archivedModal && archivedModalBackdrop && closeArchivedModalBtn && archivedChatListDiv) {
    openArchivedChatsBtn.addEventListener('click', async () => {
        archivedModal.classList.remove('hidden');
        archivedModal.classList.add('flex');
        archivedModalBackdrop.classList.remove('hidden');
        archivedChatListDiv.innerHTML = '<p class="text-center text-gray-500 py-4">Loading archived chats...</p>'; // Show loading state

        try {
            const res = await fetch('/chat/archived');
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const archivedChats = await res.json();
            renderArchivedChats(archivedChats);
        } catch (err) {
            console.error('❌ Error fetching archived chats:', err);
            archivedChatListDiv.innerHTML = '<p class="text-center text-red-500 py-4">Failed to load archived chats.</p>';
        }
    });

    closeArchivedModalBtn.addEventListener('click', closeArchivedModal);
    archivedModalBackdrop.addEventListener('click', closeArchivedModal);
}

function closeArchivedModal() {
    if (archivedModal) {
        archivedModal.classList.add('hidden');
        archivedModal.classList.remove('flex');
    }
    if (archivedModalBackdrop) {
        archivedModalBackdrop.classList.add('hidden');
    }
}

function renderArchivedChats(chats) {
    if (!archivedChatListDiv) return;
    archivedChatListDiv.innerHTML = ''; // Clear previous content

    if (!chats || chats.length === 0) {
        archivedChatListDiv.innerHTML = '<p class="text-center text-gray-500 py-4">No archived chats found.</p>';
        return;
    }

    chats.forEach(chat => {
        const chatDiv = document.createElement('div');
        chatDiv.classList.add('archived-chat-item', 'flex', 'items-center', 'justify-between', 'bg-gray-100', 'p-3', 'rounded-lg');
        chatDiv.dataset.id = chat._id;

        let chatNameHTML = '';
        if (chat.isGroupChat) {
            chatNameHTML = `<strong class="text-green-700">[Group]</strong> ${chat.groupName || 'Unnamed Group'}`;
        } else {
            const otherUser = chat.users.find(u => u._id.toString() !== currentUserId);
            chatNameHTML = otherUser ? `${otherUser.username} <span class="text-xs text-gray-500 ml-1">(${otherUser.roles || 'User'})</span>` : 'Chat with Unknown User';
        }

        chatDiv.innerHTML = `
            <div class="flex-grow mr-2 truncate">${chatNameHTML}</div>
            <button class="unarchive-btn bg-blue-500 hover:bg-blue-700 text-white text-xs font-bold py-1 px-2 rounded-full transition duration-200" data-id="${chat._id}">Unarchive</button>
        `;

        // Add event listener for the unarchive button
        const unarchiveBtn = chatDiv.querySelector('.unarchive-btn');
        if (unarchiveBtn) {
            unarchiveBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent potential parent clicks
                const chatIdToUnarchive = e.target.dataset.id;
                await handleUnarchive(chatIdToUnarchive);
            });
        }

        archivedChatListDiv.appendChild(chatDiv);
    });
}

async function handleUnarchive(chatId) {
    showSpinner(); // Show spinner during the process
    try {
        const res = await fetch(`/chat/${chatId}/unarchive`, { method: 'PUT' });
        const result = await res.json();

        if (res.ok) {
            console.log(`[DEBUG] Unarchive request for chat ${chatId} successful.`);
            // Remove from modal (handled by socket event 'chatUnarchived')
            // Add back to main list (handled by socket event 'chatUnarchived')
            // Close modal after successful unarchive
            closeArchivedModal();
        } else {
            alert(`Failed to unarchive chat: ${result.error || 'Unknown error'}`);
        }
    } catch (err) {
        console.error('❌ Error unarchiving chat:', err);
        alert('An error occurred while unarchiving the chat.');
    } finally {
        hideSpinner();
    }
}
// --- End Archived Chats Modal Logic ---

// --- Define consistent classes ---

// Handle chat room click
document.querySelectorAll('.chat-room').forEach(room => {
    room.addEventListener('click', async () => {
        const newChatId = room.dataset.id;
        const creatorId = room.dataset.creatorId; // Get creator ID from data attribute

        // Only proceed if the chat ID actually changes
        if (newChatId !== currentChatId) {
            console.log(`[DEBUG] Joining new room: ${newChatId}`);

            // --- Update active state styling ---
            // 1. Find previously active room
            const previouslyActiveRoom = document.querySelector('.chat-room.active-chat'); // Add a marker class 'active-chat'
            if (previouslyActiveRoom) {
                previouslyActiveRoom.classList.remove('active-chat', ...ACTIVE_CHAT_CLASSES);
                previouslyActiveRoom.classList.add(...INACTIVE_CHAT_CLASSES);
                // --- REMOVE old notification style cleanup ---
                // previouslyActiveRoom.classList.remove('font-bold', 'text-green-600');
            }

            // 2. Apply new active state to the clicked room
            room.classList.remove(...INACTIVE_CHAT_CLASSES); // Remove base inactive classes
            room.classList.add('active-chat', ...ACTIVE_CHAT_CLASSES); // Apply correct active classes
            // --- REMOVE old notification style cleanup ---
            // room.classList.remove('font-bold', 'text-green-600');

            // --- HIDE UNREAD DOT on the newly active room ---
            const unreadDot = room.querySelector('.unread-dot');
            if (unreadDot) {
                unreadDot.classList.add('hidden');
            }
            // --- END HIDE UNREAD DOT ---

            // --- End Update active state styling ---


            // --- Update global state and load data ---
            currentChatId = newChatId;
            currentChatCreatorId = creatorId || null; // Store creator ID
            localStorage.setItem('activeChatId', currentChatId);
            socket.emit('joinRoom', currentChatId); // Emit join for the new room
            messagesPage = 1; // Reset page for new chat
            allMessagesLoaded = false; // Reset flag
            loadedMessageIds.clear(); // Clear loaded message tracking
            loadMessages();
            // --- End Update global state ---


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
            // Show/hide dropdown options based on chat type and creator
            if (chatOptionsBtn) chatOptionsBtn.classList.remove('hidden'); // Show gear icon
            if (renameChatBtn) renameChatBtn.classList.toggle('hidden', !currentChatIsGroup); // Show rename only for groups

            // Show archive button (always available for participants)
            if (archiveChatBtn) archiveChatBtn.classList.remove('hidden');
            // --- End Update Header and Options ---

        } else {
            console.log(`[DEBUG] Clicked already active room: ${currentChatId}. No join emitted.`);
            // Ensure the active styles are correctly applied even if clicking the same room again
            // (This helps if some other action incorrectly removed styles)
            room.classList.remove(...INACTIVE_CHAT_CLASSES);
            room.classList.add('active-chat', ...ACTIVE_CHAT_CLASSES);
            // --- REMOVE old notification style cleanup ---
            // room.classList.remove('font-bold', 'text-green-600');

             // --- HIDE UNREAD DOT (just in case it was somehow visible) ---
             const unreadDot = room.querySelector('.unread-dot');
             if (unreadDot) {
                 unreadDot.classList.add('hidden');
             }
             // --- END HIDE UNREAD DOT ---
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
    // --- Keep this log at the very beginning ---
    console.log(`[RECEIVER DEBUG] newMessage event received on client ${currentUserId} for chat ${message?.chat}`);
    // --- ADD LOG TO INSPECT MESSAGE ---
    console.log('[RECEIVER DEBUG] Raw message object:', message);
    // --- END ADD LOG ---

    // --- THIS IS THE CORRECT HANDLER (around line 553) ---
    console.log('[DEBUG] Received newMessage event:', message);
    console.log(`[DEBUG] Current active chat ID: ${currentChatId}`);
    console.log(`[DEBUG] Message belongs to chat ID: ${message.chat}`);
    // --- DEBUGGING END ---

    // Ensure message object and chat ID are valid
    // --- ADJUST VALIDATION FOR SYSTEM MESSAGES ---
    if (!message || !message.chat || !message.createdAt || (!message.sender && !message.isSystemMessage)) {
        console.warn('[DEBUG] Received invalid, incomplete, or non-system message without sender:', message);
        return; // Ignore if it's not a valid user message OR a valid system message
    }
    // --- END ADJUST VALIDATION ---

    // --- Update Timestamp and Re-sort ---
    const chatSidebarList = document.querySelector('.chat-sidebar > div.space-y-2'); // Container for chat rooms
    // --- MODIFY: Use system message's createdAt for sorting ---
    const roomElement = chatSidebarList?.querySelector(`.chat-room[data-id="${message.chat}"]`);
    const messageTimestamp = message.createdAt; // Use the message's own timestamp

    if (roomElement && chatSidebarList && messageTimestamp) { // Check messageTimestamp
        // 1. Update the timestamp data attribute ONLY IF this message is newer
        const currentTimestamp = roomElement.dataset.latestMessageTimestamp || '1970-01-01T00:00:00.000Z';
        if (messageTimestamp > currentTimestamp) {
             roomElement.dataset.latestMessageTimestamp = messageTimestamp;
             console.log(`[DEBUG] Updated timestamp for chat ${message.chat} to ${messageTimestamp}`);
             // 2. Re-sort the entire sidebar only if timestamp was updated
             sortChatSidebar();
             console.log(`[DEBUG] Re-sorted sidebar after new message for ${message.chat}.`);
        } else {
             console.log(`[DEBUG] Received older message for chat ${message.chat}. Sidebar not re-sorted.`);
        }


        // 3. Adjust styles AFTER sorting (or if no sort happened)
        // Find the element again *after* potential sorting
        const potentiallyMovedRoomElement = chatSidebarList.querySelector(`.chat-room[data-id="${message.chat}"]`);
        if (potentiallyMovedRoomElement) {
             const unreadDot = potentiallyMovedRoomElement.querySelector('.unread-dot'); // Find the dot

             if (message.chat === currentChatId) {
                console.log(`[DEBUG] Style check: Room ${message.chat} IS the active chat. Ensuring active styles.`);
                // Ensure active styles are present
                potentiallyMovedRoomElement.classList.remove(...INACTIVE_CHAT_CLASSES);
                potentiallyMovedRoomElement.classList.add('active-chat', ...ACTIVE_CHAT_CLASSES);
                // --- HIDE DOT (should already be hidden, but ensure) ---
                if (unreadDot) unreadDot.classList.add('hidden');

            } else {
                console.log(`[DEBUG] Style check: Room ${message.chat} is NOT the active chat. Ensuring inactive styles and showing unread dot.`);
                // Ensure inactive styles are present
                potentiallyMovedRoomElement.classList.remove('active-chat', ...ACTIVE_CHAT_CLASSES);
                potentiallyMovedRoomElement.classList.add(...INACTIVE_CHAT_CLASSES);
                // --- SHOW DOT ---
                if (unreadDot) unreadDot.classList.remove('hidden');
            }
        }

    } else if (!roomElement) {
        console.warn(`[DEBUG] Could not find chat room element for ${message.chat} to update timestamp or sort.`);
    } else if (!messageTimestamp) {
        console.warn(`[DEBUG] Message for chat ${message.chat} lacks createdAt timestamp. Cannot sort.`);
    }
    // --- End Update Timestamp and Re-sort ---


    // --- Process message content ---
    if (message.chat === currentChatId) {
        // --- Logic for ACTIVE chat ---
        console.log('[DEBUG] Message IS for the currently active chat.');
        // --- Check if sender exists before comparing ID (for system messages) ---
        const isOwnMessage = message.sender && message.sender._id === currentUserId;
        console.log(`[DEBUG] Is own message? ${isOwnMessage}`);

        // If it's the sender's own message (and not a system message), remove the optimistic placeholder(s)
        if (isOwnMessage && !message.isSystemMessage) {
            const optimisticElements = messagesDiv.querySelectorAll('.optimistic-message');
            console.log(`[DEBUG] Found ${optimisticElements.length} optimistic message(s) to remove.`);
            optimisticElements.forEach(el => {
                el.remove();
            });
        }

        // Check if the message ID is already tracked to prevent duplicates
        if (!loadedMessageIds.has(message._id)) {
            console.log(`[DEBUG] Message ID ${message._id} is NOT in loadedMessageIds Set. Adding message to DOM.`);
            messagesDiv.insertAdjacentHTML('beforeend', renderMessage(message, currentUserId, false));
            loadedMessageIds.add(message._id);
            scrollToBottom();
        } else {
            console.log(`[DEBUG] Message ID ${message._id} IS already in loadedMessageIds Set. Skipping render to avoid duplicate.`);
            // Optional: Clean up failed optimistic style if needed
            const existingElement = document.getElementById(`message-${message._id}`);
            if (existingElement && !message.isSystemMessage) { // Don't remove styles from system messages
                existingElement.classList.remove('opacity-50', 'border', 'border-red-500');
            }
        }
        // --- End Logic for ACTIVE chat ---

    }
    // else { // Highlighting for inactive chats is handled above
    //     console.log('[DEBUG] Message is NOT for the currently active chat. Highlighting handled post-sort.');
    // }
});

// Listen for newly created chats where the current user is a participant
socket.on('newChatCreated', (chat) => {
    console.log('[DEBUG] Received newChatCreated event:', chat);

    const chatSidebarList = document.querySelector('.chat-sidebar > div.space-y-2');
    if (!chatSidebarList) {
        console.error('[DEBUG] Chat sidebar list not found.');
        return;
    }

    // --- Define chatElement variable ---
    let chatElement = null; // Variable to hold the chat room DOM element
    let isNewElement = false; // Flag to track if we created a new element

    // Check if the chat room already exists in the sidebar
    const existingRoom = chatSidebarList.querySelector(`.chat-room[data-id="${chat._id}"]`);
    if (existingRoom) {
        // --- If chat exists, update timestamp ---
        console.log(`[DEBUG] Chat room ${chat._id} already exists. Updating timestamp.`);
        // Update timestamp if available (might be same as createdAt)
        existingRoom.dataset.latestMessageTimestamp = chat.updatedAt || chat.createdAt || new Date().toISOString();
        chatElement = existingRoom; // Assign existing room to chatElement
        // --- End modification ---
    } else {
        // --- Create the new chat room element ---
        isNewElement = true;
        const newChatDiv = document.createElement('div');
        // Add base classes + group class + relative positioning for dot
        newChatDiv.classList.add('chat-room', 'relative', 'bg-white', 'p-2.5', 'mt-2', 'rounded-lg', 'cursor-pointer', 'transition', 'duration-200', 'ease-in-out', 'hover:bg-green-700', 'hover:text-white', 'group');
        newChatDiv.dataset.id = chat._id;
        // --- Store creator ID on the element ---
        newChatDiv.dataset.creatorId = chat.creator ? chat.creator._id.toString() : '';
        // --- Store initial timestamp ---
        newChatDiv.dataset.latestMessageTimestamp = chat.createdAt || new Date().toISOString(); // Use creation time

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

        // --- ADD UNREAD DOT SPAN ---
        const unreadDotSpan = document.createElement('span');
        unreadDotSpan.className = 'unread-dot w-2.5 h-2.5 bg-blue-500 rounded-full absolute top-2 right-2 hidden';
        newChatDiv.appendChild(unreadDotSpan);
        // --- END ADD UNREAD DOT SPAN ---

        // Attach the click listener (same logic as existing rooms and dynamically added rooms)
        newChatDiv.addEventListener('click', async () => {
            const newChatId = newChatDiv.dataset.id;
            const creatorId = newChatDiv.dataset.creatorId; // Get creator ID from data attribute

            // Only proceed if the chat ID actually changes
            if (newChatId !== currentChatId) {
                console.log(`[DEBUG] Joining new room: ${newChatId}`);

                // --- Update active state styling ---
                // 1. Find previously active room
                const previouslyActiveRoom = document.querySelector('.chat-room.active-chat'); // Add a marker class 'active-chat'
                if (previouslyActiveRoom) {
                    previouslyActiveRoom.classList.remove('active-chat', ...ACTIVE_CHAT_CLASSES);
                    previouslyActiveRoom.classList.add(...INACTIVE_CHAT_CLASSES);
                    // --- REMOVE old notification style cleanup ---
                    // previouslyActiveRoom.classList.remove('font-bold', 'text-green-600');
                }

                // 2. Apply new active state to the clicked room
                room.classList.remove(...INACTIVE_CHAT_CLASSES); // Remove base inactive classes
                room.classList.add('active-chat', ...ACTIVE_CHAT_CLASSES); // Apply correct active classes
                // --- REMOVE old notification style cleanup ---
                // room.classList.remove('font-bold', 'text-green-600');

                // --- HIDE UNREAD DOT on the newly active room ---
                const unreadDot = room.querySelector('.unread-dot');
                if (unreadDot) {
                    unreadDot.classList.add('hidden');
                }
                // --- END HIDE UNREAD DOT ---
                // --- End Update active state styling ---


                // --- Update global state and load data ---
                currentChatId = newChatId;
                currentChatCreatorId = creatorId || null; // Store creator ID
                localStorage.setItem('activeChatId', currentChatId);
                socket.emit('joinRoom', currentChatId); // Emit join for the new room
                messagesPage = 1; // Reset page for new chat
                allMessagesLoaded = false; // Reset flag
                loadedMessageIds.clear(); // Clear loaded message tracking
                loadMessages();
                // --- End Update global state ---


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
                // Show/hide dropdown options based on chat type and creator
                if (chatOptionsBtn) chatOptionsBtn.classList.remove('hidden'); // Show gear icon
                if (renameChatBtn) renameChatBtn.classList.toggle('hidden', !currentChatIsGroup); // Show rename only for groups

                // Show archive button (always available for participants)
                if (archiveChatBtn) archiveChatBtn.classList.remove('hidden');
                // --- End Update Header and Options ---

            } else {
                console.log(`[DEBUG] Clicked already active room: ${currentChatId}. No join emitted.`);
                // Ensure the active styles are correctly applied even if clicking the same room again
                // (This helps if some other action incorrectly removed styles)
                room.classList.remove(...INACTIVE_CHAT_CLASSES);
                room.classList.add('active-chat', ...ACTIVE_CHAT_CLASSES);
                // --- REMOVE old notification style cleanup ---
                // room.classList.remove('font-bold', 'text-green-600');
                 // --- HIDE UNREAD DOT ---
                 const unreadDot = room.querySelector('.unread-dot');
                 if (unreadDot) {
                     unreadDot.classList.add('hidden');
                 }
                 // --- END HIDE UNREAD DOT ---
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

        // --- Append TEMPORARILY ---
        chatSidebarList.appendChild(newChatDiv); // Append to end initially
        chatElement = newChatDiv; // Assign the new element

        // Optional: Add a visual cue that it's a new chat? (e.g., temporary highlight)
        newChatDiv.classList.add('animate-pulse'); // Example: Add a pulse animation
        setTimeout(() => {
            newChatDiv.classList.remove('animate-pulse'); // Remove animation after a delay
        }, 3000); // Adjust time as needed
    }

    // --- Re-sort the sidebar ---
    sortChatSidebar(); // <-- CALL SORT FUNCTION
    console.log(`[DEBUG] Re-sorted sidebar after ${isNewElement ? 'adding' : 'updating'} chat ${chat._id}.`);

    // --- Auto-click if current user is the creator ---
    // Find the element *again* after sorting
    const finalChatElement = chatSidebarList.querySelector(`.chat-room[data-id="${chat._id}"]`);
    if (finalChatElement && chat.creator && chat.creator._id === currentUserId) {
        console.log(`[DEBUG] Current user is creator of chat ${chat._id}. Simulating click.`);
        // Use setTimeout to ensure the element is fully in the DOM and listener attached
        setTimeout(() => {
            finalChatElement.click();
        }, 0);
    }
    // --- End auto-click ---
});

// Remove or comment out the 'chatDeleted' listener
/*
socket.on('chatDeleted', (deletedChatId) => {
    console.log(`[DEBUG] Received chatDeleted event for chat ID: ${deletedChatId}`);
    // ... (old logic) ...
});
*/

// Add new listener for 'chatArchived'
socket.on('chatArchived', (archivedChatId) => {
    console.log(`[DEBUG] Received chatArchived event for chat ID: ${archivedChatId}`);
    const roomElement = document.querySelector(`.chat-room[data-id="${archivedChatId}"]`);
    if (roomElement) {
        roomElement.remove(); // Remove from this user's sidebar
        console.log(`[DEBUG] Removed archived chat room ${archivedChatId} from sidebar.`);
    }

    // If the archived chat was the currently active one, reset the view
    if (archivedChatId === currentChatId) {
        currentChatId = null;
        currentChatIsGroup = false;
        currentChatCreatorId = null; // Reset creator ID
        localStorage.removeItem('activeChatId');
        messagesDiv.innerHTML = '<p class="text-center text-gray-500">Select a chat to start messaging.</p>';
        if (chatHeaderName) chatHeaderName.textContent = 'Select a chat';
        if (chatOptionsBtn) chatOptionsBtn.classList.add('hidden'); // Hide gear icon
        if (chatOptionsDropdown) chatOptionsDropdown.classList.add('hidden'); // Hide dropdown
        messageInput.value = ''; // Clear message input
        // Optionally, trigger sidebar toggle on mobile if needed
    }

    // Also remove from the archived modal if it's open
    const archivedItem = archivedChatListDiv?.querySelector(`.archived-chat-item[data-id="${archivedChatId}"]`);
    if (archivedItem) {
        archivedItem.remove();
        // Check if modal is now empty
        if (archivedChatListDiv && archivedChatListDiv.children.length === 0) {
             archivedChatListDiv.innerHTML = '<p class="text-center text-gray-500 py-4">No archived chats found.</p>';
        }
    }
});

// Add listener for 'chatUnarchived'
socket.on('chatUnarchived', (unarchivedChat) => {
    if (!unarchivedChat || !unarchivedChat._id) return;
    const chatId = unarchivedChat._id;
    console.log(`[DEBUG] Received chatUnarchived event for chat ID: ${chatId}`);

    // Remove from the archived modal if it's open
    const archivedItem = archivedChatListDiv?.querySelector(`.archived-chat-item[data-id="${chatId}"]`);
    if (archivedItem) {
        archivedItem.remove();
         // Check if modal is now empty
        if (archivedChatListDiv && archivedChatListDiv.children.length === 0) {
             archivedChatListDiv.innerHTML = '<p class="text-center text-gray-500 py-4">No archived chats found.</p>';
        }
    }

    // Add back to the main sidebar list if it doesn't exist
    const chatSidebarList = document.querySelector('.chat-sidebar > div.space-y-2');
    if (chatSidebarList) {
        let roomElement = chatSidebarList.querySelector(`.chat-room[data-id="${chatId}"]`);
        let isNewElement = false;

        if (!roomElement) {
            isNewElement = true;
            // Create and append the chat room element (similar logic to newChatCreated)
            const newChatDiv = document.createElement('div');
            // Add relative positioning
            newChatDiv.classList.add('chat-room', 'relative', 'bg-white', 'p-2.5', 'mt-2', 'rounded-lg', 'cursor-pointer', 'transition', 'duration-200', 'ease-in-out', 'hover:bg-green-700', 'hover:text-white', 'group');
            newChatDiv.dataset.id = chatId;
            newChatDiv.dataset.creatorId = unarchivedChat.creator ? unarchivedChat.creator._id.toString() : '';
            // --- Store timestamp (use updatedAt or a recent time) ---
            // Ideally, the backend sends the timestamp of the *last message* in unarchivedChat
            newChatDiv.dataset.latestMessageTimestamp = unarchivedChat.lastMessageTimestamp || unarchivedChat.updatedAt || new Date().toISOString();

            let roomHTML = '';
            if (unarchivedChat.isGroupChat) {
                roomHTML = `<strong class="text-green-700 group-hover:text-white group-[.active-chat]:text-gray-200">[Group]</strong> ${unarchivedChat.groupName || 'Unnamed Group'}`;
            } else {
                const otherUser = unarchivedChat.users.find(u => u._id.toString() !== currentUserId);
                roomHTML = otherUser ? `${otherUser.username} <span class="text-xs text-gray-500 group-hover:text-gray-200 group-[.active-chat]:text-gray-200 ml-1">(${otherUser.roles || 'User'})</span>` : 'Chat with Unknown User';
            }
            newChatDiv.innerHTML = roomHTML;

            // --- ADD UNREAD DOT SPAN ---
            const unreadDotSpan = document.createElement('span');
            unreadDotSpan.className = 'unread-dot w-2.5 h-2.5 bg-blue-500 rounded-full absolute top-2 right-2 hidden';
            newChatDiv.appendChild(unreadDotSpan);
            // --- END ADD UNREAD DOT SPAN ---


            // Attach click listener (copied and adapted from newChatCreated)
            newChatDiv.addEventListener('click', async () => {
                const newChatId = newChatDiv.dataset.id;
                const creatorId = newChatDiv.dataset.creatorId;

                if (newChatId !== currentChatId) {
                    console.log(`[DEBUG] Joining unarchived room: ${newChatId}`);

                    // Deactivate previous
                    const previouslyActiveRoom = document.querySelector('.chat-room.active-chat');
                    if (previouslyActiveRoom) {
                        previouslyActiveRoom.classList.remove('active-chat', ...ACTIVE_CHAT_CLASSES);
                        previouslyActiveRoom.classList.add(...INACTIVE_CHAT_CLASSES);
                        // --- REMOVE old notification style cleanup ---
                        // previouslyActiveRoom.classList.remove('font-bold', 'text-green-600');
                    }

                    // Activate current (use newChatDiv)
                    newChatDiv.classList.remove(...INACTIVE_CHAT_CLASSES);
                    newChatDiv.classList.add('active-chat', ...ACTIVE_CHAT_CLASSES);
                    // --- REMOVE old notification style cleanup ---
                    // newChatDiv.classList.remove('font-bold', 'text-green-600');

                    // --- HIDE UNREAD DOT ---
                    const unreadDot = newChatDiv.querySelector('.unread-dot');
                    if (unreadDot) {
                        unreadDot.classList.add('hidden');
                    }
                    // --- END HIDE UNREAD DOT ---

                    // ... (rest of click handler: Update state, load messages, update header) ...
                    currentChatId = newChatId;
                    currentChatCreatorId = creatorId || null;
                    localStorage.setItem('activeChatId', currentChatId);
                    socket.emit('joinRoom', currentChatId);
                    messagesPage = 1;
                    allMessagesLoaded = false;
                    loadedMessageIds.clear();
                    loadMessages();

                    currentChatIsGroup = unarchivedChat.isGroupChat;
                    if (chatHeaderName) {
                        const nameElement = newChatDiv.cloneNode(true);
                        const roleSpan = nameElement.querySelector('span');
                        const groupStrong = nameElement.querySelector('strong');
                        const dotSpan = nameElement.querySelector('.unread-dot'); // Also remove dot for header
                        if (roleSpan) roleSpan.remove();
                        if (groupStrong) groupStrong.remove(); // Remove [Group] prefix for header
                        chatHeaderName.textContent = nameElement.textContent.trim();
                    }
                    if (chatOptionsBtn) chatOptionsBtn.classList.remove('hidden');
                    if (renameChatBtn) renameChatBtn.classList.toggle('hidden', !currentChatIsGroup);
                    if (archiveChatBtn) archiveChatBtn.classList.remove('hidden');

                } else {
                    console.log(`[DEBUG] Clicked already active (unarchived) room: ${currentChatId}. No join emitted.`);
                     // Ensure styles are correct
                     newChatDiv.classList.remove(...INACTIVE_CHAT_CLASSES);
                     newChatDiv.classList.add('active-chat', ...ACTIVE_CHAT_CLASSES);
                     // --- REMOVE old notification style cleanup ---
                     // newChatDiv.classList.remove('font-bold', 'text-green-600');
                     // --- HIDE UNREAD DOT ---
                     const unreadDot = newChatDiv.querySelector('.unread-dot');
                     if (unreadDot) {
                         unreadDot.classList.add('hidden');
                     }
                     // --- END HIDE UNREAD DOT ---
                }

                // Hide sidebar on small screens
                if (window.innerWidth < 768 && sidebarContainer && chatAreaContainer && !sidebarContainer.classList.contains('hidden')) {
                    sidebarContainer.classList.add('hidden');
                    chatAreaContainer.classList.remove('hidden');
                    if (sidebarToggleBtn) sidebarToggleBtn.textContent = 'Show Inbox';
                }
            });

            // --- Append TEMPORARILY ---
            chatSidebarList.appendChild(newChatDiv); // Append to end initially
            roomElement = newChatDiv;
            newChatDiv.classList.add('animate-pulse');
            setTimeout(() => {
                newChatDiv.classList.remove('animate-pulse');
            }, 3000);
        } else {
            // If it already exists (edge case?), update its timestamp
            console.log(`[DEBUG] Unarchived chat room ${chatId} already exists. Updating timestamp.`);
            // Update timestamp
            roomElement.dataset.latestMessageTimestamp = unarchivedChat.lastMessageTimestamp || unarchivedChat.updatedAt || new Date().toISOString();
        }

        // --- Re-sort the sidebar ---
        sortChatSidebar(); // <-- CALL SORT FUNCTION
        console.log(`[DEBUG] Re-sorted sidebar after ${isNewElement ? 'adding' : 'updating'} unarchived chat ${chatId}.`);
    }
});

// Listen for renamed chats
socket.on('chatRenamed', (updatedChat) => {
    // --- Add Log ---
    console.log(`[RENAME CLIENT DEBUG] Received chatRenamed event for chat ID: ${updatedChat._id} with new name: ${updatedChat.groupName}`);
    // --- End Log ---

    const roomElement = document.querySelector(`.chat-room[data-id="${updatedChat._id}"]`);
    if (roomElement) {
        // --- Rebuild the inner HTML completely, including the dot ---
        let roomHTML = '';
        if (updatedChat.isGroupChat) {
            // Check if this room is currently active to apply correct text color for [Group]
            const isActive = roomElement.classList.contains('active-chat');
            const groupStrongClass = isActive ? 'text-gray-200' : 'text-green-700';
            roomHTML = `<strong class="${groupStrongClass} group-hover:text-white">[Group]</strong> ${updatedChat.groupName || 'Unnamed Group'}`;
        } else {
            // This part shouldn't be reached if only groups can be renamed, but included for completeness
            const otherUser = updatedChat.users.find(u => u._id.toString() !== currentUserId);
            // Check if this room is currently active to apply correct text color for role span
            const isActive = roomElement.classList.contains('active-chat');
            const roleSpanClass = isActive ? 'text-gray-200' : 'text-gray-500';
            roomHTML = otherUser ? `${otherUser.username} <span class="text-xs ${roleSpanClass} group-hover:text-gray-200 ml-1">(${otherUser.roles || 'User'})</span>` : 'Chat with Unknown User';
        }

        // Add the unread dot span (always hidden initially after rename, messaging will show it if needed)
        roomHTML += `<span class="unread-dot w-2.5 h-2.5 bg-blue-500 rounded-full absolute top-2 right-2 hidden"></span>`;

        roomElement.innerHTML = roomHTML; // Replace the entire inner content
        console.log(`[RENAME CLIENT DEBUG] Updated chat room ${updatedChat._id} name and structure in sidebar.`);
        // --- End Rebuild ---
    } else {
         console.warn(`[RENAME CLIENT DEBUG] Could not find room element for chat ID: ${updatedChat._id} to update name.`);
    }

    // If the renamed chat is the currently active one, update the header and options
    if (updatedChat._id === currentChatId) {
        console.log(`[RENAME CLIENT DEBUG] Renamed chat ${updatedChat._id} is the active chat. Updating header.`);
        if (chatHeaderName) {
            chatHeaderName.textContent = updatedChat.groupName || 'Unnamed Group'; // Update header directly
        }
        // Update creator ID and button visibility
        currentChatCreatorId = updatedChat.creator ? updatedChat.creator._id.toString() : null;
        if (archiveChatBtn) archiveChatBtn.classList.remove('hidden');
        if (renameChatBtn) renameChatBtn.classList.toggle('hidden', !updatedChat.isGroupChat); // Should remain visible for group chat
    }
});

// --- END Socket Listeners ---

// Function to select a chat room
/*
function selectChatRoom(chatId, roomElement) {
    console.log(`[DEBUG] Selecting chat room: ${chatId}`);
    const messagesContainer = document.getElementById('messagesContainer');
    const messageInputContainer = document.getElementById('messageInputContainer');
    const chatHeader = document.getElementById('chatHeader');
    const chatHeaderTitle = document.getElementById('chatHeaderTitle');
    const chatHeaderIcons = document.getElementById('chatHeaderIcons');
    const renameChatBtn = document.getElementById('renameChatBtn');
    const archiveChatBtn = document.getElementById('archiveChatBtn'); // Assuming you have this ID

    // --- Clear previous active state ---
    const previouslyActiveRoom = document.querySelector('.chat-room-item.active-chat');
    if (previouslyActiveRoom) {
        previouslyActiveRoom.classList.remove('active-chat', ...ACTIVE_CHAT_CLASSES);
        previouslyActiveRoom.classList.add(...INACTIVE_CHAT_CLASSES); // Apply inactive styles
        // Ensure data attribute is removed if you use it
        // previouslyActiveRoom.removeAttribute('data-active');
    }
    // --- End Clear previous active state ---

    // --- Set new active state ---
    if (roomElement) {
        // Remove potential inactive classes before applying active ones
        roomElement.classList.remove(...INACTIVE_CHAT_CLASSES);
        roomElement.classList.add('active-chat', ...ACTIVE_CHAT_CLASSES); // Apply new active state
        // Ensure data attribute is set if you use it
        // roomElement.setAttribute('data-active', 'true');

        currentChatId = chatId; // Update the global currentChatId

        // Update chat header
        const chatData = findChatDataById(chatId); // Helper function to get chat details
        if (chatData) {
            chatHeaderTitle.textContent = getChatName(chatData, currentUserId); // Use helper
            // Show/hide rename button based on group chat status
            if (renameChatBtn) {
                renameChatBtn.style.display = chatData.isGroupChat ? 'inline-block' : 'none';
            }
             // Update archive button data-id
             if (archiveChatBtn) {
                archiveChatBtn.setAttribute('data-id', chatId);
                archiveChatBtn.style.display = 'inline-block'; // Always show for selected chat? Adjust as needed
            }

        } else {
            chatHeaderTitle.textContent = 'Select a Chat';
             if (renameChatBtn) renameChatBtn.style.display = 'none';
             if (archiveChatBtn) archiveChatBtn.style.display = 'none';
        }
        chatHeader.classList.remove('hidden'); // Show header
        chatHeaderIcons.classList.remove('hidden'); // Show icons

        // Fetch and display messages
        fetchMessages(chatId);
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom

        // Show message input
        messageInputContainer.classList.remove('hidden');

        // Join the Socket.IO room for this chat
        console.log(`[DEBUG] Emitting joinRoom for ${chatId}`);
        socket.emit('joinRoom', chatId);

    } else {
        // Handle case where roomElement is not found (e.g., on initial load before selection)
        currentChatId = null;
        messagesContainer.innerHTML = '<p class="text-center text-gray-500">Select a chat to view messages.</p>';
        messageInputContainer.classList.add('hidden');
        chatHeader.classList.add('hidden'); // Hide header if no chat selected
        chatHeaderIcons.classList.add('hidden'); // Hide icons
    }
}
*/

// --- Helper function to find chat data (if needed) ---
/* // REMOVE THIS FUNCTION
function findChatDataById(chatId) {
    // Assuming you have a way to access the chat list data, e.g., a global variable `allChats`
    // This is just an example, adapt to how you store chat data on the client
    if (window.allChats && Array.isArray(window.allChats)) {
        return window.allChats.find(chat => chat._id === chatId);
    }
    // Fallback: try finding data from the element itself if stored there
    const roomElement = document.querySelector(`.chat-room-item[data-chat-id="${chatId}"]`);
    if (roomElement && roomElement.dataset.chatData) {
        try {
            return JSON.parse(roomElement.dataset.chatData);
        } catch (e) {
            console.error("Error parsing chat data from element:", e);
        }
    }
    return null;
}
*/ // END REMOVE FUNCTION


// --- Ensure message sending doesn't mess with styles ---
/* // REMOVE THIS LISTENER
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = messageInput.value.trim();

    if (content && currentChatId) {
        console.log(`[DEBUG] Sending message to chat ${currentChatId}`);
        try {
            const response = await fetch(`/chat/${currentChatId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add authorization header if needed
                },
                body: JSON.stringify({ content }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Send message error:', errorData.error || response.statusText);
                // Display error to user if needed
                return; // Stop processing if send failed
            }

            // Message sent successfully via HTTP, Socket.IO 'newMessage' event will handle UI update
            messageInput.value = ''; // Clear input field

            // --- IMPORTANT: Do NOT modify chat list item classes here ---
            // The active state should only change when selectChatRoom is called.

        } catch (error) {
            console.error('Network error sending message:', error);
            // Display network error to user if needed
        }
    }
});
*/ // END REMOVE LISTENER

// --- Ensure receiving messages doesn't mess with styles ---
/* // REMOVE THIS LISTENER
socket.on('newMessage', (message) => {
    console.log('[DEBUG] Received newMessage event:', message);
    // Check if the message belongs to the currently selected chat
    if (message.chat === currentChatId) {
        appendMessage(message); // Append message to the UI
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll down
    } else {
        // Optionally, update unread count or indicator for the non-active chat
        const chatRoomItem = document.querySelector(`.chat-room-item[data-chat-id="${message.chat}"]`);
        if (chatRoomItem) {
            // Example: Add a subtle indicator
            let unreadIndicator = chatRoomItem.querySelector('.unread-indicator');
            if (!unreadIndicator) {
                unreadIndicator = document.createElement('span');
                unreadIndicator.classList.add('unread-indicator', 'ml-2', 'w-2', 'h-2', 'bg-blue-500', 'rounded-full', 'inline-block');
                // Find a suitable place to append it, e.g., after the chat name
                const chatNameElement = chatRoomItem.querySelector('.chat-name'); // Assuming you have this class
                if (chatNameElement) {
                    chatNameElement.parentNode.insertBefore(unreadIndicator, chatNameElement.nextSibling);
                }
            }
             // Update last message preview if you have one
             const lastMessageElement = chatRoomItem.querySelector('.last-message'); // Assuming you have this
             if (lastMessageElement) {
                 lastMessageElement.textContent = message.content.substring(0, 30) + (message.content.length > 30 ? '...' : '');
                 lastMessageElement.classList.remove('text-gray-500'); // Make it less faded if needed
                 lastMessageElement.classList.add('text-gray-700', 'font-medium');
             }
             // Update timestamp
             const timestampElement = chatRoomItem.querySelector('.chat-timestamp'); // Assuming you have this
             if (timestampElement) {
                 timestampElement.textContent = formatTimestamp(message.timestamp || new Date()); // Use helper
             }

             // --- IMPORTANT: Do NOT modify active/inactive classes here ---
        }
    }
     // Move the chat item to the top of the list (optional)
     const chatToMove = document.querySelector(`.chat-room-item[data-chat-id="${message.chat}"]`);
     const chatList = document.getElementById('chatList'); // Assuming chat list has this ID
     if (chatToMove && chatList && chatList.firstChild !== chatToMove) {
         chatList.insertBefore(chatToMove, chatList.firstChild);
     }
});
*/ // END REMOVE LISTENER

// --- Add this helper function if you don't have one ---
/* // REMOVE THIS FUNCTION
function formatTimestamp(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } else {
        // Check if yesterday
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        }
        // Older than yesterday
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
}
*/ // END REMOVE FUNCTION

// Render one message using Tailwind classes
// Added isOptimistic flag and handling for system messages
function renderMessage(message, currentUserId, isOptimistic = false) {

    // --- Handle System Messages ---
    if (message.isSystemMessage) {
        const messageId = message._id || `system_${Date.now()}`;
        // Basic HTML sanitization
        const sanitizedContent = (message.content || '')
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        return `
            <div id="message-${messageId}" class="message system-message flex justify-center my-2.5">
                <span class="text-center text-gray-500 text-xs italic bg-gray-100 px-2 py-1 rounded-full shadow-sm">
                    ${sanitizedContent}
                </span>
            </div>
        `;
    }
    // --- End Handle System Messages ---


    // --- Regular User Message Rendering ---
    const isMine = message.sender && message.sender._id === currentUserId;
    const messageAlign = isMine ? 'items-end' : 'items-start';
    const bubbleColor = isMine ? 'bg-gray-100 text-gray-800' : 'bg-green-700 text-white';
    const senderName = isMine ? 'You' : (message.sender ? message.sender.username : 'Unknown');
    const messageId = isOptimistic ? message._id : (message._id || `received_${Date.now()}`);
    const optimisticClass = isOptimistic ? 'optimistic-message' : '';

    // Basic HTML sanitization
    const sanitizedContent = (message.content || '')
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Format timestamp
    let timestamp = '';
    if (message.createdAt) {
        try {
            const date = new Date(message.createdAt);
            timestamp = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } catch (e) {
            console.error("Error formatting date:", e);
            timestamp = 'Invalid date';
        }
    }

    return `
        <div id="message-${messageId}" class="message flex flex-col mb-2.5 ${messageAlign} ${optimisticClass}">
            <div class="bubble p-2.5 px-3.5 rounded-t-2xl ${isMine ? 'rounded-bl-2xl' : 'rounded-br-2xl'} max-w-[70%] break-words shadow-sm text-[0.95rem] ${bubbleColor}">
                <div class="flex justify-between items-baseline mb-0.5">
                    <strong class="text-xs ${isMine ? 'text-gray-600' : 'text-gray-200'}">${senderName}</strong>
                    <span class="text-[0.65rem] ml-2 ${isMine ? 'text-gray-500' : 'text-gray-300'}">${timestamp}</span>
                </div>
                <p class="mt-0 mb-0 text-sm">${sanitizedContent}</p>
            </div>
        </div>
    `;
    // --- End Regular User Message Rendering ---
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

            // --- Ensure chat appears and is selected for creator (Fallback/Primary) ---
            console.log(`[DEBUG] Chat creation request successful for ${chat._id}. Ensuring UI update for creator.`);

            // Use a minimal delay to allow potential socket 'newChatCreated' event to process first
            setTimeout(() => {
                const chatSidebarList = document.querySelector('.chat-sidebar > div.space-y-2');
                if (!chatSidebarList) {
                    console.error("[DEBUG] Chat sidebar list not found in timeout.");
                    hideSpinner(); // Hide spinner if we can't proceed
                    return;
                }

                let chatElement = chatSidebarList.querySelector(`.chat-room[data-id="${chat._id}"]`);
                let isNewElement = false;

                // If the element wasn't added by the socket event, create it manually
                if (!chatElement) {
                    isNewElement = true;
                    console.log(`[DEBUG] Chat element ${chat._id} not found via socket, creating manually.`);
                    // Create and append the new chat room element (logic adapted from newChatCreated)
                    const newChatDiv = document.createElement('div');
                    // Add relative positioning
                    newChatDiv.classList.add('chat-room', 'relative', ...INACTIVE_CHAT_CLASSES, 'p-2.5', 'mt-2', 'rounded-lg', 'cursor-pointer', 'transition', 'duration-200', 'ease-in-out', 'group');
                    newChatDiv.dataset.id = chat._id;
                    newChatDiv.dataset.creatorId = chat.creator ? chat.creator._id.toString() : '';
                    // --- Store initial timestamp ---
                    newChatDiv.dataset.latestMessageTimestamp = chat.createdAt || new Date().toISOString();

                    let roomHTML = '';
                    if (chat.isGroupChat) {
                        roomHTML = `<strong class="text-green-700 group-hover:text-white group-[.active-chat]:text-gray-200">[Group]</strong> ${chat.groupName || 'Unnamed Group'}`;
                    } else {
                        const otherUser = chat.users.find(u => u._id.toString() !== currentUserId);
                        roomHTML = otherUser ? `${otherUser.username} <span class="text-xs text-gray-500 group-hover:text-gray-200 group-[.active-chat]:text-gray-200 ml-1">(${otherUser.roles || 'User'})</span>` : 'Chat with Unknown User';
                    }
                    newChatDiv.innerHTML = roomHTML;

                    // --- ADD UNREAD DOT SPAN ---
                    const unreadDotSpan = document.createElement('span');
                    unreadDotSpan.className = 'unread-dot w-2.5 h-2.5 bg-blue-500 rounded-full absolute top-2 right-2 hidden';
                    newChatDiv.appendChild(unreadDotSpan);
                    // --- END ADD UNREAD DOT SPAN ---


                    // Attach click listener (logic adapted from newChatCreated)
                    newChatDiv.addEventListener('click', async () => {
                        const newChatId = newChatDiv.dataset.id;
                        const creatorId = newChatDiv.dataset.creatorId;

                        if (newChatId !== currentChatId) {
                            console.log(`[DEBUG] Joining new room: ${newChatId}`);

                            // Deactivate previous
                            const previouslyActiveRoom = document.querySelector('.chat-room.active-chat');
                            if (previouslyActiveRoom) {
                                previouslyActiveRoom.classList.remove('active-chat', ...ACTIVE_CHAT_CLASSES);
                                previouslyActiveRoom.classList.add(...INACTIVE_CHAT_CLASSES);
                                // --- REMOVE old notification style cleanup ---
                                // previouslyActiveRoom.classList.remove('font-bold', 'text-green-600');
                            }

                            // Activate current (use newChatDiv)
                            newChatDiv.classList.remove(...INACTIVE_CHAT_CLASSES);
                            newChatDiv.classList.add('active-chat', ...ACTIVE_CHAT_CLASSES);
                            // --- REMOVE old notification style cleanup ---
                            // newChatDiv.classList.remove('font-bold', 'text-green-600');

                            // --- HIDE UNREAD DOT ---
                            const unreadDot = newChatDiv.querySelector('.unread-dot');
                            if (unreadDot) {
                                unreadDot.classList.add('hidden');
                            }
                            // --- END HIDE UNREAD DOT ---

                            // ... (rest of click handler: Update state, load messages, update header) ...
                            currentChatId = newChatId;
                            currentChatCreatorId = creatorId || null;
                            localStorage.setItem('activeChatId', currentChatId);
                            socket.emit('joinRoom', currentChatId);
                            messagesPage = 1;
                            allMessagesLoaded = false;
                            loadedMessageIds.clear();
                            loadMessages();

                            currentChatIsGroup = newChatDiv.textContent.includes('[Group]');
                            if (chatHeaderName) {
                                const nameElement = newChatDiv.cloneNode(true);
                                const roleSpan = nameElement.querySelector('span');
                                const groupStrong = nameElement.querySelector('strong');
                                const dotSpan = nameElement.querySelector('.unread-dot'); // Also remove dot for header
                                if (roleSpan) roleSpan.remove();
                                if (groupStrong) groupStrong.remove(); // Remove [Group] prefix for header
                                chatHeaderName.textContent = nameElement.textContent.trim();
                            }
                            if (chatOptionsBtn) chatOptionsBtn.classList.remove('hidden');
                            if (renameChatBtn) renameChatBtn.classList.toggle('hidden', !currentChatIsGroup);
                            if (archiveChatBtn) archiveChatBtn.classList.remove('hidden');

                        } else {
                            console.log(`[DEBUG] Clicked already active room: ${currentChatId}. No join emitted.`);
                            // Ensure styles are correct
                            newChatDiv.classList.remove(...INACTIVE_CHAT_CLASSES);
                            newChatDiv.classList.add('active-chat', ...ACTIVE_CHAT_CLASSES);
                            // --- REMOVE old notification style cleanup ---
                            // newChatDiv.classList.remove('font-bold', 'text-green-600');
                             // --- HIDE UNREAD DOT ---
                             const unreadDot = newChatDiv.querySelector('.unread-dot');
                             if (unreadDot) {
                                 unreadDot.classList.add('hidden');
                             }
                             // --- END HIDE UNREAD DOT ---
                        }

                        // Hide sidebar on small screens
                        if (window.innerWidth < 768 && sidebarContainer && chatAreaContainer && !sidebarContainer.classList.contains('hidden')) {
                            sidebarContainer.classList.add('hidden');
                            chatAreaContainer.classList.remove('hidden');
                            if (sidebarToggleBtn) {
                                sidebarToggleBtn.textContent = 'Show Inbox';
                            }
                        }
                    });

                    // --- Append TEMPORARILY ---
                    chatSidebarList.appendChild(newChatDiv); // Append to end initially
                    chatElement = newChatDiv;
                    newChatDiv.classList.add('animate-pulse');
                    setTimeout(() => {
                        newChatDiv.classList.remove('animate-pulse');
                    }, 3000);
                } // --- End create/append block ---

                // --- Re-sort the sidebar ---
                sortChatSidebar(); // <-- CALL SORT FUNCTION
                console.log(`[DEBUG] Re-sorted sidebar after ${isNewElement ? 'adding' : 'updating'} chat ${chat._id}.`);

                // --- Auto-click if current user is the creator ---
                // Find the element *again* after sorting
                const finalChatElement = chatSidebarList.querySelector(`.chat-room[data-id="${chat._id}"]`);
                if (finalChatElement && chat.creator && chat.creator._id === currentUserId) {
                    console.log(`[DEBUG] Current user is creator of chat ${chat._id}. Simulating click.`);
                    // Use setTimeout to ensure the element is fully in the DOM and listener attached
                    setTimeout(() => {
                        finalChatElement.click();
                    }, 0);
                }
                // --- End auto-click ---
            }, 50); // Delay remains
            // --- End Ensure chat appears ---

        } else {
            alert(chat.error || 'Failed to start chat.');
        }
    } catch (err) {
        console.error('❌ Start new chat error:', err);
        alert('An error occurred while starting the chat.');
    } finally {
        // Ensure spinner is hidden regardless of path
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


// --- Reusable Sidebar Sorting Function ---
function sortChatSidebar() {
    const chatSidebarList = document.querySelector('.chat-sidebar > div.space-y-2');
    if (chatSidebarList) {
               const chatRooms = Array.from(chatSidebarList.querySelectorAll('.chat-room'));

        chatRooms.sort((a, b) => {
            const timestampA = a.dataset.latestMessageTimestamp || '1970-01-01T00:00:00.000Z'; // Fallback for sorting
            const timestampB = b.dataset.latestMessageTimestamp || '1970-01-01T00:00:00.000Z'; // Fallback for sorting

            // Compare timestamps descending (newest first)
            // ISO strings can be compared directly
            return timestampB.localeCompare(timestampA);
        });

        // Re-append sorted rooms
        chatRooms.forEach(room => chatSidebarList.appendChild(room)); // Append in sorted order
        // console.log('[DEBUG] Sorted chat sidebar.'); // Optional: uncomment for debugging sort calls
    }
}
// --- End Reusable Sidebar Sorting Function ---


// Auto-load last active or first chat on page load
window.addEventListener('DOMContentLoaded', () => {
    // --- Sort Chat List by Latest Message Timestamp ---
    // NOTE: For initial sorting to work correctly, the server-side template
    // MUST render the 'data-latest-message-timestamp' attribute with the
    // correct ISO timestamp of the last message for each chat room element.
    sortChatSidebar(); // <-- CALL SORT FUNCTION
    console.log('[DEBUG] Initial sort of chat sidebar on load.');
    // --- End Sort Chat List ---


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
         // Reset button text for desktop view if needed
         if (sidebarToggleBtn) {
             sidebarToggleBtn.textContent = 'Hide Inbox'; // Or whatever the default text is
         }
    }
});