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
const CHAT_LAST_VIEWED_KEY = 'chatLastViewedTimestamps'; // localStorage key

const socket = io();
// --- CHANGE: Use dataset.userId consistently ---
const currentUserId = document.body.dataset.userId;
// --- END CHANGE ---
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
// --- ADD MEMBER MANAGEMENT ELEMENTS ---
const seeMembersBtn = document.getElementById('see-members-btn'); // See Members button in dropdown
const membersModal = document.getElementById('members-modal'); // The members modal itself
const membersModalBackdrop = document.getElementById('members-modal-backdrop'); // Members modal backdrop
const closeMembersModalBtn = document.getElementById('close-members-modal'); // Close button for members modal
const currentMembersListDiv = document.getElementById('current-members-list'); // Div for current members
const potentialMembersListDiv = document.getElementById('potential-members-list'); // Div for potential members to add
const addMemberSearchInput = document.getElementById('add-member-search'); // Search input for adding members
// --- END MEMBER MANAGEMENT ELEMENTS ---
const openArchivedChatsBtn = document.getElementById('open-archived-chats'); // Button to open archived modal
const archivedModal = document.getElementById('archived-chats-modal'); // Archived modal itself
const archivedModalBackdrop = document.getElementById('archived-modal-backdrop'); // Archived modal backdrop
const closeArchivedModalBtn = document.getElementById('close-archived-modal'); // Button to close archived modal
const archivedChatListDiv = document.getElementById('archived-chat-list'); // Div to list archived chats

let currentChatIsGroup = false; // Track if the current chat is a group chat
let currentChatCreatorId = null; // Track the creator ID of the current chat

console.log('👤 Current User ID:', currentUserId);

// --- LocalStorage Helper Functions ---
function getChatLastViewedTimestamps() {
    try {
        const data = localStorage.getItem(CHAT_LAST_VIEWED_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error("Error reading chat timestamps from localStorage:", e);
        return {};
    }
}

function updateChatLastViewedTimestamp(chatId, timestamp) {
    if (!chatId || !timestamp) return;
    try {
        const timestamps = getChatLastViewedTimestamps();
        timestamps[chatId] = timestamp;
        localStorage.setItem(CHAT_LAST_VIEWED_KEY, JSON.stringify(timestamps));
        console.log(`[LocalStorage] Updated last viewed timestamp for ${chatId} to ${timestamp}`);

        // --- ADD THIS LOG ---
        console.log(`[CLIENT EMIT] Attempting to emit 'updateLastViewed' for chat ${chatId}`);
        // --- END ADD THIS LOG ---
        socket.emit('updateLastViewed', { chatId: chatId }); // Emit event to server

    } catch (e) {
        console.error("Error saving chat timestamp to localStorage:", e);
    }
}
// --- End LocalStorage Helper Functions ---


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
        // On small screens, toggling sidebar also toggles chat area visibility
        if (window.innerWidth < 768) {
            chatAreaContainer.classList.toggle('hidden', !isSidebarHidden);
        } else {
            // On larger screens, ensure chat area is always visible when toggling sidebar
            chatAreaContainer.classList.remove('hidden');
        }


        // Optional: Change button text based on state
        if (isSidebarHidden) {
            sidebarToggleBtn.textContent = 'Show Sidebar';
        } else {
            sidebarToggleBtn.textContent = 'Hide Sidebar';
        }
    });

    // Ensure initial state on small screens (sidebar hidden, chat area visible)
    // Note: Tailwind's `md:flex` and `md:flex-1` handle visibility on larger screens
    if (window.innerWidth < 768) { // Tailwind's md breakpoint
        sidebarContainer.classList.add('hidden');
        chatAreaContainer.classList.remove('hidden');
        sidebarToggleBtn.textContent = 'Show Sidebar';
    } else {
        // Ensure initial state on large screens (sidebar visible, chat area visible)
        sidebarContainer.classList.remove('hidden'); // Explicitly remove hidden if starting large
        chatAreaContainer.classList.remove('hidden'); // Explicitly remove hidden if starting large
        sidebarToggleBtn.textContent = 'Hide Sidebar'; // Default text for large screens
    }

    // --- ADD RESIZE LISTENER ---
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
            // If screen becomes large (md breakpoint or larger)
            // Ensure both sidebar and chat area are visible, overriding any 'hidden' class from JS toggle
            sidebarContainer.classList.remove('hidden');
            chatAreaContainer.classList.remove('hidden');
            // Reset button text to default for large screens
            sidebarToggleBtn.textContent = 'Hide Sidebar';
        } else {
            // If screen becomes small (< md breakpoint)
            // Re-apply the state based on whether the sidebar *was* hidden just before resize
            // If sidebar is currently NOT hidden (meaning it was visible on large screen), hide it.
            if (!sidebarContainer.classList.contains('hidden')) {
                 sidebarContainer.classList.add('hidden');
                 chatAreaContainer.classList.remove('hidden'); // Ensure chat area is visible
                 sidebarToggleBtn.textContent = 'Show Sidebar';
            }
            // If it was already hidden (e.g., user clicked Hide on small screen), leave it hidden.
            // The button text should already be 'Show Sidebar' in this case.
        }
    });
    // --- END RESIZE LISTENER ---
}
// --- END Sidebar Toggle Logic ---

// --- Socket Connection Handling ---
socket.on('connect', () => {
    console.log(`[DEBUG] Socket connected with ID: ${socket.id}`);

    // --- AUTHENTICATE FIRST ---
    if (currentUserId) {
        console.log(`[DEBUG] Emitting authenticate event for user: ${currentUserId}`);
        socket.emit('authenticate', currentUserId); // Emit authentication immediately
    } else {
        console.error('[DEBUG] Cannot authenticate: currentUserId is missing.');
        // Handle cases where user ID might not be available (e.g., redirect to login)
        return; // Prevent further actions if not authenticated
    }
    // --- END AUTHENTICATE ---

    // --- REMOVE: Initial room joining logic moved to after auth_success ---
    /*
    // --- Join all rooms listed in the sidebar ---
    const chatRooms = document.querySelectorAll('.chat-room');
    console.log(`[DEBUG] Found ${chatRooms.length} chat rooms in sidebar. Joining rooms...`);
    chatRooms.forEach(room => {
        const roomId = room.dataset.id;
        if (roomId) {
            console.log(`[DEBUG] Emitting joinRoom for initial room: ${roomId}`);
            socket.emit('joinRoom', roomId);
            console.log(`[CLIENT DEBUG] Emitted joinRoom(${roomId}) on connect.`);
        }
    });
    // --- End Join all rooms ---

    // If a chat was already active (e.g., from localStorage), rejoin its room upon connection/reconnection
    if (currentChatId) {
        console.log(`[DEBUG] Rejoining active room ${currentChatId} after connection.`);
        socket.emit('joinRoom', currentChatId);
         console.log(`[CLIENT DEBUG] Emitted joinRoom(${currentChatId}) for active chat on connect.`);
    }
    */
    // --- END REMOVE ---
});

// --- ADD: Listen for Authentication Success ---
socket.on('auth_success', (data) => {
    console.log(`[DEBUG] Authentication successful for user: ${data.userId}. Proceeding with setup.`);

    // --- Join all rooms listed in the sidebar AFTER successful auth ---
    const chatRooms = document.querySelectorAll('.chat-room');
    console.log(`[DEBUG] Found ${chatRooms.length} chat rooms in sidebar. Joining rooms post-auth...`);
    chatRooms.forEach(room => {
        const roomId = room.dataset.id;
        if (roomId) {
            console.log(`[DEBUG] Emitting joinRoom for initial room: ${roomId}`);
            socket.emit('joinRoom', roomId);
            console.log(`[CLIENT DEBUG] Emitted joinRoom(${roomId}) post-auth.`);
        }
    });
    // --- End Join all rooms ---

    // Rejoin active chat room if necessary
    if (currentChatId) {
        console.log(`[DEBUG] Rejoining active room ${currentChatId} post-auth.`);
        socket.emit('joinRoom', currentChatId);
        console.log(`[CLIENT DEBUG] Emitted joinRoom(${currentChatId}) for active chat post-auth.`);
    }

    // --- Trigger initial global unread check AFTER successful auth ---
    console.log("[DEBUG] Emitting 'checkGlobalUnread' after successful authentication.");
    socket.emit('checkGlobalUnread');
    // --- END Trigger ---

});
// --- END Listen for Authentication Success ---

// --- ADD: Listen for Authentication Failure ---
socket.on('auth_failure', (data) => {
    console.error(`[DEBUG] Authentication failed: ${data.error}. Chat functionality may be limited.`);
    // Optionally, display a message to the user or disable chat features
});
// --- END Listen for Authentication Failure ---


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

// --- ADD See Members Button Listener ---
if (seeMembersBtn) {
    seeMembersBtn.addEventListener('click', () => {
        console.log('[DEBUG] See Members button clicked.'); // <-- ADD LOG
        chatOptionsDropdown.classList.add('hidden'); // Hide main dropdown
        if (!currentChatId || !currentChatIsGroup) {
            console.log('[DEBUG] See Members button: No current group chat selected.'); // <-- ADD LOG
            return;
        }
        openMembersModal();
    });
}
// --- END See Members Button Listener ---
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

// --- Members Modal Logic ---
async function openMembersModal() {
    console.log('[DEBUG] openMembersModal function called.'); // <-- ADD LOG
    if (!membersModal || !membersModalBackdrop || !currentMembersListDiv || !potentialMembersListDiv || !currentChatId) {
        console.error('[DEBUG] Members modal elements or currentChatId missing:', {
            membersModalExists: !!membersModal,
            backdropExists: !!membersModalBackdrop,
            currentListExists: !!currentMembersListDiv,
            potentialListExists: !!potentialMembersListDiv,
            currentChatId
        }); // <-- ADD DETAILED LOG
        return;
    }

    membersModal.classList.remove('hidden');
    membersModal.classList.add('flex');
    membersModalBackdrop.classList.remove('hidden');
    currentMembersListDiv.innerHTML = '<p class="text-center text-gray-500 py-2">Loading members...</p>';
    potentialMembersListDiv.innerHTML = '<p class="text-center text-gray-500 py-2">Loading users...</p>';
    if (addMemberSearchInput) addMemberSearchInput.value = ''; // Clear search

    try {
        const res = await fetch(`/chat/${currentChatId}/members`);
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const { members, potentialUsers, creatorId } = await res.json();
        renderMembersModalLists(members, potentialUsers, creatorId);

    } catch (err) {
        console.error('❌ Error fetching chat members:', err);
        currentMembersListDiv.innerHTML = '<p class="text-center text-red-500 py-2">Failed to load members.</p>';
        potentialMembersListDiv.innerHTML = '<p class="text-center text-red-500 py-2">Failed to load users.</p>';
    }
}

function closeMembersModal() {
    if (membersModal) {
        membersModal.classList.add('hidden');
        membersModal.classList.remove('flex');
    }
    if (membersModalBackdrop) {
        membersModalBackdrop.classList.add('hidden');
    }
}

function renderMembersModalLists(members, potentialUsers, creatorId) {
    if (!currentMembersListDiv || !potentialMembersListDiv) return;

    // Render Current Members
    currentMembersListDiv.innerHTML = '';
    if (!members || members.length === 0) {
        currentMembersListDiv.innerHTML = '<p class="text-center text-gray-500 py-2">No members found.</p>';
    } else {
        members.forEach(member => {
            const isCreator = member._id === creatorId;
            const isSelf = member._id === currentUserId;
            // Determine if the current user can remove this member
            // Rule: Creator or Admin can remove anyone except the creator. Non-creator/admin cannot remove anyone.
            // Simplified: Only creator can remove anyone (except self/creator). Adjust if Admins should also remove.
            const canRemove = currentUserId === creatorId && !isCreator && !isSelf;

            const memberDiv = document.createElement('div');
            memberDiv.className = 'flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded mb-1';
            memberDiv.innerHTML = `
                <span class="text-sm ${isCreator ? 'font-bold text-green-700' : ''} ${isSelf ? 'italic' : ''}">
                    ${member.username} ${isCreator ? '(Creator)' : ''} ${isSelf ? '(You)' : ''}
                </span>
                ${canRemove ? `<button class="remove-member-btn bg-red-500 hover:bg-red-700 text-white text-xs font-bold py-0.5 px-1.5 rounded-full transition duration-200" data-user-id="${member._id}" data-username="${member.username}">Remove</button>` : ''}
            `;
            currentMembersListDiv.appendChild(memberDiv);
        });
        // Add remove button listeners
        currentMembersListDiv.querySelectorAll('.remove-member-btn').forEach(btn => {
            btn.addEventListener('click', handleRemoveMember);
        });
    }

    // Render Potential Users to Add
    potentialMembersListDiv.innerHTML = '';
    if (!potentialUsers || potentialUsers.length === 0) {
        potentialMembersListDiv.innerHTML = '<p class="text-center text-gray-500 py-2">No users available to add.</p>';
    } else {
        potentialUsers.forEach(user => {
            const userDiv = document.createElement('div');
            // Add data-username for search filtering
            userDiv.className = 'potential-user-item flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded mb-1';
            userDiv.dataset.username = user.username.toLowerCase(); // For search

            // --- ADD CHECK for user.roles ---
            const rolesText = Array.isArray(user.roles) && user.roles.length > 0
                ? `(${user.roles.join(', ')})`
                : '(No Roles)'; // Default text if roles are missing or not an array
            // --- END CHECK ---

            userDiv.innerHTML = `
                <span class="text-sm">${user.username} <span class="text-xs text-gray-500">${rolesText}</span></span>
                <button class="add-member-btn bg-blue-500 hover:bg-blue-700 text-white text-xs font-bold py-0.5 px-1.5 rounded-full transition duration-200" data-user-id="${user._id}" data-username="${user.username}">Add</button>
            `;
            potentialMembersListDiv.appendChild(userDiv);
        });
        // Add add button listeners
        potentialMembersListDiv.querySelectorAll('.add-member-btn').forEach(btn => {
            btn.addEventListener('click', handleAddMember);
        });
    }
}

async function handleAddMember(e) {
    const button = e.target;
    const userIdToAdd = button.dataset.userId;
    const usernameToAdd = button.dataset.username;
    if (!currentChatId || !userIdToAdd) return;

    const confirmation = confirm(`Add ${usernameToAdd} to the group?`);
    if (!confirmation) return;

    button.disabled = true; // Prevent double clicks
    button.textContent = 'Adding...';

    try {
        const res = await fetch(`/chat/${currentChatId}/members/add`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userIdToAdd })
        });
        const result = await res.json();
        if (res.ok) {
            console.log(`[DEBUG] Add member request successful for user ${userIdToAdd}`);
            // UI update will be handled by socket event 'memberAdded'
            // Remove user from potential list locally for immediate feedback
            button.closest('.potential-user-item')?.remove();
            // Check if potential list is now empty
             if (potentialMembersListDiv && potentialMembersListDiv.children.length === 0) {
                 potentialMembersListDiv.innerHTML = '<p class="text-center text-gray-500 py-2">No users available to add.</p>';
             }
        } else {
            alert(`Failed to add member: ${result.error || 'Unknown error'}`);
            button.disabled = false;
            button.textContent = 'Add';
        }
    } catch (err) {
        console.error('❌ Error adding member:', err);
        alert('An error occurred while adding the member.');
        button.disabled = false;
        button.textContent = 'Add';
    }
}

async function handleRemoveMember(e) {
    const button = e.target;
    const userIdToRemove = button.dataset.userId;
    const usernameToRemove = button.dataset.username;
    if (!currentChatId || !userIdToRemove) return;

    const confirmation = confirm(`Are you sure you want to remove ${usernameToRemove} from the group?`);
    if (!confirmation) return;

    button.disabled = true; // Prevent double clicks
    button.textContent = 'Removing...';

    try {
        const res = await fetch(`/chat/${currentChatId}/members/remove`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userIdToRemove })
        });
        const result = await res.json();
        if (res.ok) {
            console.log(`[DEBUG] Remove member request successful for user ${userIdToRemove}`);
            // UI update will be handled by socket event 'memberRemoved'
            // Remove member from current list locally for immediate feedback
            button.closest('.flex')?.remove();
             // Check if current list is now empty (unlikely but possible)
             if (currentMembersListDiv && currentMembersListDiv.children.length === 0) {
                 currentMembersListDiv.innerHTML = '<p class="text-center text-gray-500 py-2">No members found.</p>';
             }
        } else {
            alert(`Failed to remove member: ${result.error || 'Unknown error'}`);
            button.disabled = false;
            button.textContent = 'Remove';
        }
    } catch (err) {
        console.error('❌ Error removing member:', err);
        alert('An error occurred while removing the member.');
        button.disabled = false;
        button.textContent = 'Remove';
    }
}

// Search/Filter for adding members
if (addMemberSearchInput && potentialMembersListDiv) {
    addMemberSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        potentialMembersListDiv.querySelectorAll('.potential-user-item').forEach(item => {
            const username = item.dataset.username || '';
            if (username.includes(query)) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
    });
}


// Add listeners for closing the members modal
if (closeMembersModalBtn) {
    closeMembersModalBtn.addEventListener('click', closeMembersModal);
}
if (membersModalBackdrop) {
    membersModalBackdrop.addEventListener('click', closeMembersModal);
}
// --- End Members Modal Logic ---


// --- Global Unread Status Function ---
/* // Commented out - This logic should be handled by menu.ejs based on server events
function updateGlobalUnreadStatus() {
    // Get the element *inside* the function, or ensure it's passed/available globally *after* DOMContentLoaded
    const globalDot = document.getElementById('global-chat-unread-dot');
    if (!globalDot) {
        console.warn('[Chat.js] Global unread dot element not found.');
        return;
    }

    // Check if *any* individual chat room dot is visible (i.e., does NOT have the 'hidden' class)
    const anyUnread = document.querySelector('.chat-room .unread-dot:not(.hidden)');

    if (anyUnread) {
        // console.log('[Chat.js] Found unread chats, showing global dot.');
        globalDot.classList.remove('hidden');
    } else {
        // console.log('[Chat.js] No unread chats found, hiding global dot.');
        globalDot.classList.add('hidden');
    }
}
*/
// --- End Global Unread Status Function ---


// --- REVISED: Handle chat room click
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
                console.log(`[DEBUG] Hid unread dot for newly active chat ${newChatId}`);
                // --- UPDATE GLOBAL DOT after hiding individual dot ---
                // updateGlobalUnreadStatus(); // Remove this call
                // --- END UPDATE ---
            }
            // --- END HIDE UNREAD DOT ---

            // --- UPDATE LAST VIEWED TIMESTAMP ---
            // Update timestamp *after* hiding the dot, using the latest known message time or now
            const latestTimestamp = room.dataset.latestMessageTimestamp || new Date().toISOString();
            updateChatLastViewedTimestamp(newChatId, latestTimestamp);
            // --- END UPDATE LAST VIEWED TIMESTAMP ---

            // --- End Update active state styling ---


            // --- Update global state and load data ---
            currentChatId = newChatId;
            currentChatCreatorId = creatorId || null; // Store creator ID
            localStorage.setItem('activeChatId', currentChatId); // Keep track of active chat ID itself
            socket.emit('joinRoom', currentChatId); // Emit join for the new room
            messagesPage = 1; // Reset page for new chat
            allMessagesLoaded = false; // Reset flag
            loadedMessageIds.clear(); // Clear loaded message tracking
            loadMessages();
            // --- End Update global state ---

            // --- SHOW MESSAGE FORM ---
            if (messageForm) {
                messageForm.classList.remove('hidden');
            }
            // --- END SHOW MESSAGE FORM ---


            // --- Update Header and Options ---
            currentChatIsGroup = room.textContent.includes('[Group]'); // Check if it's a group chat
            if (chatHeaderName) {
                // Extract name, removing the role span or [Group] prefix
                const nameElement = room.cloneNode(true);
                const roleSpan = nameElement.querySelector('span');
                const groupStrong = nameElement.querySelector('strong');
                const dotSpan = nameElement.querySelector('.unread-dot'); // Also remove dot for header text
                if (roleSpan) roleSpan.remove();
                if (groupStrong) groupStrong.remove();
                if (dotSpan) dotSpan.remove();
                chatHeaderName.textContent = nameElement.textContent.trim();
            }
            // Show/hide dropdown options based on chat type and creator
            if (chatOptionsBtn) chatOptionsBtn.classList.remove('hidden'); // Show gear icon
            if (renameChatBtn) renameChatBtn.classList.toggle('hidden', !currentChatIsGroup); // Show rename only for groups
            // --- ADD: Show/Hide See Members Button ---
            if (seeMembersBtn) seeMembersBtn.classList.toggle('hidden', !currentChatIsGroup);
            // --- END ADD ---

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
                 console.log(`[DEBUG] Ensured unread dot is hidden for already active chat ${currentChatId}`);
                 // --- UPDATE GLOBAL DOT after ensuring dot is hidden ---
                 // updateGlobalUnreadStatus(); // Remove this call
                 // --- END UPDATE ---
             }
             // --- END HIDE UNREAD DOT ---
        }

        // --- Hide sidebar on small screens ---
        // --- NEW: Hide sidebar and show chat area on small screens after clicking a room ---
        if (window.innerWidth < 768 && sidebarContainer && chatAreaContainer && !sidebarContainer.classList.contains('hidden')) {
            sidebarContainer.classList.add('hidden');
            chatAreaContainer.classList.remove('hidden');
            if (sidebarToggleBtn) {
                sidebarToggleBtn.textContent = 'Show Sidebar';
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

    // --- Store timestamp BEFORE sending ---
    const sentTimestamp = new Date().toISOString(); // Use current time as a close approximation
    // --- End Store timestamp ---

    // Optimistic UI update
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage = {
        _id: tempId, // Use temporary ID
        sender: { _id: currentUserId, username: 'You' },
        content: content,
        chat: currentChatId,
        createdAt: sentTimestamp // Use the stored timestamp
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

        if (!res.ok) {
            console.error('❌ Message send failed:', message.error);
            // Visually mark the optimistic message as failed
            const tempElement = document.getElementById(`message-${tempId}`);
            if (tempElement) {
                tempElement.classList.add('opacity-50', 'border', 'border-red-500'); // Example failure style
            }
            alert("Failed to send message: " + (message.error || 'Unknown error'));
            // Optionally, restore input value: messageInput.value = content;
        } else {
            // --- SUCCESS: Update localStorage immediately for sender ---
            // Use the timestamp from the server response if available, otherwise fallback
            // const finalTimestamp = message.createdAt || sentTimestamp; // Timestamp update now handled by newMessage listener
            // updateChatLastViewedTimestamp(currentChatId, finalTimestamp); // REMOVED THIS CALL
            // console.log(`[DEBUG] Sender updated localStorage timestamp for chat ${currentChatId} immediately after successful send.`); // REMOVED THIS LOG
            // --- END Update localStorage ---

            // Success: rely on socket listener 'newMessage' to replace optimistic message
            // The 'newMessage' handler will also update the timestamp again, which is fine.
        }
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
        // 1. Update the timestamp data attribute ALWAYS
        roomElement.dataset.latestMessageTimestamp = messageTimestamp; // Update with the new message time
        console.log(`[DEBUG] Updated dataset timestamp for chat ${message.chat} to ${messageTimestamp}`);
        // 2. Re-sort the entire sidebar
        sortChatSidebar();
        console.log(`[DEBUG] Re-sorted sidebar after new message for ${message.chat}.`);


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

                // --- UPDATE LAST VIEWED TIMESTAMP FOR ACTIVE CHAT ---
                // This confirms the user has seen this latest message because the chat is active
                updateChatLastViewedTimestamp(message.chat, messageTimestamp);
                // --- END UPDATE ---

            } else {
                console.log(`[DEBUG] Style check: Room ${message.chat} is NOT the active chat. Ensuring inactive styles and showing unread dot.`);
                // Ensure inactive styles are present
                potentiallyMovedRoomElement.classList.remove('active-chat', ...ACTIVE_CHAT_CLASSES);
                potentiallyMovedRoomElement.classList.add(...INACTIVE_CHAT_CLASSES);
                // --- SHOW DOT ---
                if (unreadDot) {
                    unreadDot.classList.remove('hidden');
                    console.log(`[DEBUG] Made unread dot visible for inactive chat ${message.chat}`);
                    // --- UPDATE GLOBAL DOT after showing individual dot ---
                    // updateGlobalUnreadStatus(); // Remove this call
                    // --- END UPDATE ---
                } else {
                    console.warn(`[DEBUG] Unread dot not found for inactive chat ${message.chat} after sorting.`);
                }
            }
        } else {
            console.warn(`[DEBUG] Could not find room element ${message.chat} after sorting to update styles/dot.`);
        }

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
    // else { // Logic for inactive chats (showing the dot) is handled above after sorting
    //     console.log('[DEBUG] Message is NOT for the currently active chat. Dot visibility handled post-sort.');
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
    const isCreator = chat.creator && chat.creator._id === currentUserId; // Check if current user is creator

    // Check if the chat room already exists in the sidebar
    const existingRoom = chatSidebarList.querySelector(`.chat-room[data-id="${chat._id}"]`);
    if (existingRoom) {
        // --- If chat exists, update timestamp ---
        console.log(`[DEBUG] Chat room ${chat._id} already exists. Updating timestamp.`);
        // --- FIX: Prioritize updatedAt for sorting ---
        const latestTimestamp = chat.updatedAt || chat.createdAt || new Date().toISOString();
        existingRoom.dataset.latestMessageTimestamp = latestTimestamp;
        // --- END FIX ---
        chatElement = existingRoom; // Assign existing room to chatElement

        // --- SHOW DOT if not creator and not active ---
        if (!isCreator && chat._id !== currentChatId) {
            const unreadDot = existingRoom.querySelector('.unread-dot');
            if (unreadDot) unreadDot.classList.remove('hidden');
            console.log(`[DEBUG] Showing dot for existing chat ${chat._id} (user not creator).`);
        }
        // --- UPDATE GLOBAL DOT ---
        // updateGlobalUnreadStatus(); // Remove this call
        // --- END UPDATE ---

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
        // --- FIX: Prioritize updatedAt for sorting ---
        const latestTimestamp = chat.updatedAt || chat.createdAt || new Date().toISOString();
        newChatDiv.dataset.latestMessageTimestamp = latestTimestamp; // Use update time if available
        // --- END FIX ---

        let roomHTML = '';
        if (chat.isGroupChat) {
            roomHTML = `<strong class="text-green-700 group-hover:text-white group-[.active-chat]:text-gray-200">[Group]</strong> ${chat.groupName || 'Unnamed Group'}`;
        } else {
            // Find the other user in a private chat
            const otherUser = chat.users.find(u => u._id.toString() !== currentUserId);
            roomHTML = otherUser ? `${otherUser.username} <span class="text-xs text-gray-500 group-hover:text-gray-200 group-[.active-chat]:text-gray-200 ml-1">(${otherUser.roles || 'User'})</span>` : 'Chat with Unknown User';
        }
        newChatDiv.innerHTML = roomHTML;

        // --- ADD UNREAD DOT SPAN ---
        const unreadDotSpan = document.createElement('span');
        // --- SHOW DOT if not creator ---
        const dotHiddenClass = isCreator ? 'hidden' : '';
        unreadDotSpan.className = `unread-dot w-2.5 h-2.5 bg-blue-500 rounded-full absolute top-2 right-2 ${dotHiddenClass}`;
        newChatDiv.appendChild(unreadDotSpan);
        if (!isCreator) {
             console.log(`[DEBUG] Showing dot for new chat ${chat._id} (user not creator).`);
             // --- UPDATE GLOBAL DOT ---
             // updateGlobalUnreadStatus(); // Remove this call
             // --- END UPDATE ---
        }
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
                // --- FIX: Use newChatDiv instead of room ---
                newChatDiv.classList.remove(...INACTIVE_CHAT_CLASSES); // Remove base inactive classes
                newChatDiv.classList.add('active-chat', ...ACTIVE_CHAT_CLASSES); // Apply correct active classes
                // --- END FIX ---
                // --- REMOVE old notification style cleanup ---
                // room.classList.remove('font-bold', 'text-green-600');

                // --- HIDE UNREAD DOT on the newly active room ---
                // --- FIX: Use newChatDiv instead of room ---
                const unreadDot = newChatDiv.querySelector('.unread-dot');
                // --- END FIX ---
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
                // --- FIX: Use newChatDiv instead of room ---
                currentChatIsGroup = newChatDiv.textContent.includes('[Group]'); // Check if it's a group chat
                // --- END FIX ---
                if (chatHeaderName) {
                    // Extract name, removing the role span or [Group] prefix
                    // --- FIX: Use newChatDiv instead of room ---
                    const nameElement = newChatDiv.cloneNode(true);
                    // --- END FIX ---
                    const roleSpan = nameElement.querySelector('span');
                    const groupStrong = nameElement.querySelector('strong');
                    const dotSpan = nameElement.querySelector('.unread-dot'); // Also remove dot for header
                    if (roleSpan) roleSpan.remove();
                    if (groupStrong) groupStrong.remove();
                    if (dotSpan) dotSpan.remove();
                    chatHeaderName.textContent = nameElement.textContent.trim();
                }
                // Show/hide dropdown options based on chat type and creator
                if (chatOptionsBtn) chatOptionsBtn.classList.remove('hidden'); // Show gear icon
                if (renameChatBtn) renameChatBtn.classList.toggle('hidden', !currentChatIsGroup); // Show rename only for groups
                // --- ADD: Show/Hide See Members Button ---
                if (seeMembersBtn) seeMembersBtn.classList.toggle('hidden', !currentChatIsGroup);
                // --- END ADD ---
                if (archiveChatBtn) archiveChatBtn.classList.remove('hidden');
                // --- End Update Header and Options ---

            } else {
                console.log(`[DEBUG] Clicked already active room: ${currentChatId}. No join emitted.`);
                // Ensure the active styles are correctly applied even if clicking the same room again
                // (This helps if some other action incorrectly removed styles)
                newChatDiv.classList.remove(...INACTIVE_CHAT_CLASSES);
                newChatDiv.classList.add('active-chat', ...ACTIVE_CHAT_CLASSES);
                // --- REMOVE old notification style cleanup ---
                // room.classList.remove('font-bold', 'text-green-600');
                 // --- HIDE UNREAD DOT ---
                 // --- FIX: Use newChatDiv instead of room ---
                 const unreadDot = newChatDiv.querySelector('.unread-dot');
                 // --- END FIX ---
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
                    sidebarToggleBtn.textContent = 'Show Sidebar';
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
    if (finalChatElement && isCreator) { // Use isCreator flag
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
        if (seeMembersBtn) seeMembersBtn.classList.add('hidden'); // Hide members button
        messageInput.value = ''; // Clear message input
        // --- HIDE MESSAGE FORM ---
        if (messageForm) {
            messageForm.classList.add('hidden');
        }
        // --- END HIDE MESSAGE FORM ---
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
    // ... (remove from archived modal) ...
    if (!unarchivedChat || !unarchivedChat._id) return;
    const chatId = unarchivedChat._id;
    console.log(`[DEBUG] Received chatUnarchived event for chat ID: ${chatId}`);

    const archivedItem = archivedChatListDiv?.querySelector(`.archived-chat-item[data-id="${chatId}"]`);
    if (archivedItem) {
        archivedItem.remove();
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
            const latestTimestamp = unarchivedChat.lastMessageTimestamp || unarchivedChat.updatedAt || new Date().toISOString();
            newChatDiv.dataset.latestMessageTimestamp = latestTimestamp;

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
            // --- Check if unread based on localStorage ---
            const lastViewedTimestamps = getChatLastViewedTimestamps();
            const lastViewed = lastViewedTimestamps[chatId];
            const isUnread = !lastViewed || latestTimestamp > lastViewed;
            const dotHiddenClass = isUnread ? '' : 'hidden';
            // --- End Check ---
            unreadDotSpan.className = `unread-dot w-2.5 h-2.5 bg-blue-500 rounded-full absolute top-2 right-2 ${dotHiddenClass}`;
            newChatDiv.appendChild(unreadDotSpan);
            if (isUnread) {
                 console.log(`[DEBUG] Showing dot for unarchived chat ${chatId} (unread).`);
                 // --- UPDATE GLOBAL DOT ---
                 // updateGlobalUnreadStatus(); // Remove this call
                 // --- END UPDATE ---
            }
            // --- END ADD UNREAD DOT SPAN ---


            // Attach click listener (copied and adapted from newChatCreated)
            newChatDiv.addEventListener('click', async () => {
                const newChatId = newChatDiv.dataset.id;
                const creatorId = newChatDiv.dataset.creatorId;

                if (newChatId !== currentChatId) {
                    console.log(`[DEBUG] Joining new room: ${newChatId}`);

                    // Deactivate previous
                    // ... (previous active room handling) ...
                    const previouslyActiveRoom = document.querySelector('.chat-room.active-chat');
                    if (previouslyActiveRoom) {
                        previouslyActiveRoom.classList.remove('active-chat', ...ACTIVE_CHAT_CLASSES);
                        previouslyActiveRoom.classList.add(...INACTIVE_CHAT_CLASSES);
                    }

                    // Activate current (use newChatDiv)
                    // ... (new active room handling) ...
                    newChatDiv.classList.remove(...INACTIVE_CHAT_CLASSES);
                    newChatDiv.classList.add('active-chat', ...ACTIVE_CHAT_CLASSES);

                    // --- HIDE UNREAD DOT ---
                    const unreadDot = newChatDiv.querySelector('.unread-dot');
                    if (unreadDot) {
                        unreadDot.classList.add('hidden');
                    }
                    // --- END HIDE UNREAD DOT ---

                    // --- UPDATE LAST VIEWED TIMESTAMP ---
                    updateChatLastViewedTimestamp(newChatId, new Date().toISOString());
                    // --- END UPDATE LAST VIEWED TIMESTAMP ---

                    // --- Update global state and load data ---
                    // ... (state update, socket emit, loadMessages) ...
                    currentChatId = newChatId;
                    currentChatCreatorId = creatorId || null;
                    localStorage.setItem('activeChatId', currentChatId);
                    socket.emit('joinRoom', currentChatId);
                    messagesPage = 1;
                    allMessagesLoaded = false;
                    loadedMessageIds.clear();
                    loadMessages();

                    // --- Update Header and Options ---
                    // ... (header/options update) ...
                    currentChatIsGroup = unarchivedChat.isGroupChat;
                    if (chatHeaderName) {
                        const nameElement = newChatDiv.cloneNode(true);
                        const roleSpan = nameElement.querySelector('span');
                        const groupStrong = nameElement.querySelector('strong');
                        const dotSpan = nameElement.querySelector('.unread-dot'); // Also remove dot for header
                        if (roleSpan) roleSpan.remove();
                        if (groupStrong) groupStrong.remove();
                        if (dotSpan) dotSpan.remove();
                        chatHeaderName.textContent = nameElement.textContent.trim();
                    }
                    if (chatOptionsBtn) chatOptionsBtn.classList.remove('hidden');
                    if (renameChatBtn) renameChatBtn.classList.toggle('hidden', !currentChatIsGroup);
                    if (seeMembersBtn) seeMembersBtn.classList.toggle('hidden', !currentChatIsGroup);
                    if (archiveChatBtn) archiveChatBtn.classList.remove('hidden');

                } else {
                    console.log(`[DEBUG] Clicked already active (unarchived) room: ${currentChatId}. No join emitted.`);
                     // ... (ensure active styles, hide dot) ...
                     newChatDiv.classList.remove(...INACTIVE_CHAT_CLASSES);
                     newChatDiv.classList.add('active-chat', ...ACTIVE_CHAT_CLASSES);
                     const unreadDot = newChatDiv.querySelector('.unread-dot');
                     if (unreadDot) {
                         unreadDot.classList.add('hidden');
                     }
                }

                // Hide sidebar on small screens
                // ... (sidebar hiding logic) ...
                if (window.innerWidth < 768 && sidebarContainer && chatAreaContainer && !sidebarContainer.classList.contains('hidden')) {
                    sidebarContainer.classList.add('hidden');
                    chatAreaContainer.classList.remove('hidden');
                    if (sidebarToggleBtn) {
                        sidebarToggleBtn.textContent = 'Show Sidebar';
                    }
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
            // If it already exists (edge case?), update its timestamp and check dot
            console.log(`[DEBUG] Unarchived chat room ${chatId} already exists. Updating timestamp and checking dot.`);
            // Update timestamp
            const latestTimestamp = unarchivedChat.lastMessageTimestamp || unarchivedChat.updatedAt || new Date().toISOString();
            roomElement.dataset.latestMessageTimestamp = latestTimestamp;
            // --- Check dot based on localStorage ---
            const lastViewedTimestamps = getChatLastViewedTimestamps();
            const lastViewed = lastViewedTimestamps[chatId];
            const isUnread = !lastViewed || latestTimestamp > lastViewed;
            const unreadDot = roomElement.querySelector('.unread-dot');
            if (unreadDot) {
                unreadDot.classList.toggle('hidden', !isUnread || chatId === currentChatId); // Hide if read OR active
                if (isUnread && chatId !== currentChatId) {
                    console.log(`[DEBUG] Showing dot for existing unarchived chat ${chatId} (unread).`);
                }
                // --- UPDATE GLOBAL DOT after potentially changing dot ---
                // updateGlobalUnreadStatus(); // Remove this call
                // --- END UPDATE ---
            }
            // --- End Check ---
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

        // Add the unread dot span (check localStorage status)
        const latestTimestamp = updatedChat.updatedAt || new Date().toISOString(); // Use updated timestamp
        roomElement.dataset.latestMessageTimestamp = latestTimestamp; // Update dataset
        const lastViewedTimestamps = getChatLastViewedTimestamps();
        const lastViewed = lastViewedTimestamps[updatedChat._id];
        const isUnread = !lastViewed || latestTimestamp > lastViewed;
        const isActive = roomElement.classList.contains('active-chat');
        const dotHiddenClass = !isUnread || isActive ? 'hidden' : ''; // Hide if read OR active
        roomHTML += `<span class="unread-dot w-2.5 h-2.5 bg-blue-500 rounded-full absolute top-2 right-2 ${dotHiddenClass}"></span>`;

        roomElement.innerHTML = roomHTML; // Replace the entire inner content
        console.log(`[RENAME CLIENT DEBUG] Updated chat room ${updatedChat._id} name and structure in sidebar. Dot hidden: ${dotHiddenClass !== ''}`);
        // --- UPDATE GLOBAL DOT after rebuilding dot ---
        // updateGlobalUnreadStatus(); // Remove this call
        // --- END UPDATE ---
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
        // --- ADD: Update See Members Button Visibility ---
        if (seeMembersBtn) seeMembersBtn.classList.toggle('hidden', !updatedChat.isGroupChat);
        // --- END ADD ---
        // Update last viewed timestamp since the user is actively viewing it
        updateChatLastViewedTimestamp(updatedChat._id, updatedChat.updatedAt || new Date().toISOString());
    }
});

// --- ADD Member Management Socket Listeners ---
socket.on('memberAdded', ({ chatId, addedUser, updatedMembers, creatorId }) => {
    console.log(`[SOCKET DEBUG] Received memberAdded for chat ${chatId}, user: ${addedUser.username}`);
    // Update members modal if it's open and for the current chat
    if (membersModal && !membersModal.classList.contains('hidden') && chatId === currentChatId) {
        // Re-render lists (simplest way to ensure consistency)
        // Fetch potential users again as the added user should be removed from that list
        openMembersModal(); // Re-fetch and re-render everything
    }
   


   
    // Optional: Update participant count in header if displayed
});

socket.on('memberRemoved', ({ chatId, removedUserId, updatedMembers, creatorId }) => {
    console.log(`[SOCKET DEBUG] Received memberRemoved for chat ${chatId}, user ID: ${removedUserId}`);
    // Update members modal if it's open and for the current chat
    if (membersModal && !membersModal.classList.contains('hidden') && chatId === currentChatId) {
         // Re-render lists
         openMembersModal(); // Re-fetch and re-render everything
    }
    // Optional: Update participant count in header if displayed

    // If the current user was the one removed
    if (removedUserId === currentUserId && chatId === currentChatId) {
        alert("You have been removed from this group.");
        // Reset UI similar to archiving the current chat
        currentChatId = null;
        currentChatIsGroup = false;
        currentChatCreatorId = null;
        localStorage.removeItem('activeChatId');
        messagesDiv.innerHTML = '<p class="text-center text-gray-500">Select a chat to start messaging.</p>';
        if (chatHeaderName) chatHeaderName.textContent = 'Select a chat';
        if (chatOptionsBtn) chatOptionsBtn.classList.add('hidden'); // Hide gear icon
        if (chatOptionsDropdown) chatOptionsDropdown.classList.add('hidden'); // Hide dropdown
        if (seeMembersBtn) seeMembersBtn.classList.add('hidden'); // Hide members button
        messageInput.value = ''; // Clear message input
        closeMembersModal(); // Close modal
        // --- HIDE MESSAGE FORM ---
        if (messageForm) {
            messageForm.classList.add('hidden');
        }
        // --- END HIDE MESSAGE FORM ---

        // Remove chat from sidebar
        const roomElement = document.querySelector(`.chat-room[data-id="${chatId}"]`);
        if (roomElement) {
            roomElement.remove();
        }
    }
});

// Listener for when the current user is removed from *any* chat (not necessarily the active one)
socket.on('chatRemovedFrom', (removedChatId) => {
    console.log(`[SOCKET DEBUG] Received chatRemovedFrom for chat ID: ${removedChatId}`);
    const roomElement = document.querySelector(`.chat-room[data-id="${removedChatId}"]`);
    if (roomElement) {
        roomElement.remove();
        console.log(`[DEBUG] Removed chat room ${removedChatId} from sidebar due to removal.`);
    }
    // If the removed chat was the active one, handle it (this might be redundant with 'memberRemoved' but safe)
    if (removedChatId === currentChatId) {
        // Reset UI
        currentChatId = null;
        currentChatIsGroup = false;
        currentChatCreatorId = null;
        localStorage.removeItem('activeChatId');
        messagesDiv.innerHTML = '<p class="text-center text-gray-500">Select a chat to start messaging.</p>';
        if (chatHeaderName) chatHeaderName.textContent = 'Select a chat';
        if (chatOptionsBtn) chatOptionsBtn.classList.add('hidden');
        if (chatOptionsDropdown) chatOptionsDropdown.classList.add('hidden');
        if (seeMembersBtn) seeMembersBtn.classList.add('hidden');
        messageInput.value = '';
        closeMembersModal();
        // --- HIDE MESSAGE FORM ---
        if (messageForm) {
            messageForm.classList.add('hidden');
        }
        // --- END HIDE MESSAGE FORM ---
    }
});
// --- END Member Management Socket Listeners ---


// --- Render one message using Tailwind classes
// Added isOptimistic flag and handling for system messages
function renderMessage(message, currentUserId, isOptimistic = false) {

    // --- Handle System Messages ---
    if (message.isSystemMessage) {
        const messageId = message._id || `system_${Date.now()}`;
        // Basic HTML sanitization
        const sanitizedContent = (message.content || '')
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // --- ADDED: Specific styling for member add/remove ---
        // You might want different icons or slightly different text color
        let systemStyle = "text-gray-500 bg-gray-100"; // Default for rename
        if (message.content.includes("added") || message.content.includes("removed")) {
            systemStyle = "text-blue-600 bg-blue-50"; // Style for member changes
        }
        // --- END ADDED ---

        return `
            <div id="message-${messageId}" class="message system-message flex justify-center my-2.5">
                <span class="text-center text-xs italic px-2 py-1 rounded-full shadow-sm ${systemStyle}">
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
                const isCreator = chat.creator && chat.creator._id === currentUserId; // Check if creator

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
                    const latestTimestamp = chat.createdAt || new Date().toISOString(); // Use creation time
                    newChatDiv.dataset.latestMessageTimestamp = latestTimestamp;

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
                    // --- Show dot if not creator ---
                    const dotHiddenClass = isCreator ? 'hidden' : '';
                    unreadDotSpan.className = `unread-dot w-2.5 h-2.5 bg-blue-500 rounded-full absolute top-2 right-2 ${dotHiddenClass}`;
                    newChatDiv.appendChild(unreadDotSpan);
                    if (!isCreator) {
                         console.log(`[DEBUG] Showing dot for manually created chat ${chat._id} (user not creator).`);
                         // --- UPDATE GLOBAL DOT ---
                         // updateGlobalUnreadStatus(); // Remove this call
                         // --- END UPDATE ---
                    }
                    // --- END ADD UNREAD DOT SPAN ---


                    // Attach click listener (logic adapted from newChatCreated)
                    newChatDiv.addEventListener('click', async () => {
                        const newChatId = newChatDiv.dataset.id;
                        const creatorId = newChatDiv.dataset.creatorId; // Get creator ID from data attribute

                        // Only proceed if the chat ID actually changes
                        if (newChatId !== currentChatId) {
                            console.log(`[DEBUG] Joining new room: ${newChatId}`);

                            // Deactivate previous
                            // ... (previous active room handling) ...
                            const previouslyActiveRoom = document.querySelector('.chat-room.active-chat');
                            if (previouslyActiveRoom) {
                                previouslyActiveRoom.classList.remove('active-chat', ...ACTIVE_CHAT_CLASSES);
                                previouslyActiveRoom.classList.add(...INACTIVE_CHAT_CLASSES);
                            }

                            // Activate current (use newChatDiv)
                            // ... (new active room handling) ...
                            newChatDiv.classList.remove(...INACTIVE_CHAT_CLASSES);
                            newChatDiv.classList.add('active-chat', ...ACTIVE_CHAT_CLASSES);

                            // --- HIDE UNREAD DOT ---
                            const unreadDot = newChatDiv.querySelector('.unread-dot');
                            if (unreadDot) {
                                unreadDot.classList.add('hidden');
                            }
                            // --- END HIDE UNREAD DOT ---

                            // --- UPDATE LAST VIEWED TIMESTAMP ---
                            updateChatLastViewedTimestamp(newChatId, new Date().toISOString());
                            // --- END UPDATE LAST VIEWED TIMESTAMP ---

                            // --- Update global state and load data ---
                            // ... (state update, socket emit, loadMessages) ...
                            currentChatId = newChatId;
                            currentChatCreatorId = creatorId || null;
                            localStorage.setItem('activeChatId', currentChatId);
                            socket.emit('joinRoom', currentChatId);
                            messagesPage = 1;
                            allMessagesLoaded = false;
                            loadedMessageIds.clear();
                            loadMessages();

                            // --- Update Header and Options ---
                            // ... (header/options update) ...
                            // --- FIX: Use chat object directly for group status ---
                            currentChatIsGroup = chat.isGroupChat;
                            // --- END FIX ---
                            if (chatHeaderName) {
                                const nameElement = newChatDiv.cloneNode(true);
                                const roleSpan = nameElement.querySelector('span');
                                const groupStrong = nameElement.querySelector('strong');
                                const dotSpan = nameElement.querySelector('.unread-dot'); // Also remove dot for header
                                if (roleSpan) roleSpan.remove();
                                if (groupStrong) groupStrong.remove();
                                if (dotSpan) dotSpan.remove();
                                chatHeaderName.textContent = nameElement.textContent.trim();
                            }
                            if (chatOptionsBtn) chatOptionsBtn.classList.remove('hidden');
                            if (renameChatBtn) renameChatBtn.classList.toggle('hidden', !currentChatIsGroup);
                            if (seeMembersBtn) seeMembersBtn.classList.toggle('hidden', !currentChatIsGroup);
                            if (archiveChatBtn) archiveChatBtn.classList.remove('hidden');

                        } else {
                            console.log(`[DEBUG] Clicked already active (manually created) room: ${currentChatId}. No join emitted.`);
                             // ... (ensure active styles, hide dot) ...
                             newChatDiv.classList.remove(...INACTIVE_CHAT_CLASSES);
                             newChatDiv.classList.add('active-chat', ...ACTIVE_CHAT_CLASSES);
                             const unreadDot = newChatDiv.querySelector('.unread-dot');
                             if (unreadDot) {
                                 unreadDot.classList.add('hidden');
                             }
                        }

                        // Hide sidebar on small screens (This is handled by the click handler itself)
                        // ... (sidebar hiding logic already present in click handler) ...
                        // --- REMOVE redundant logic here, keep it in the main click handler ---
                        /*
                        if (window.innerWidth < 768 && sidebarContainer && chatAreaContainer && !sidebarContainer.classList.contains('hidden')) {
                            sidebarContainer.classList.add('hidden');
                            chatAreaContainer.classList.remove('hidden');
                            if (sidebarToggleBtn) {
                                sidebarToggleBtn.textContent = 'Show Sidebar';
                            }
                        }
                        */
                       // --- END REMOVE ---
                    });

                    // --- Append TEMPORARILY ---
                    chatSidebarList.appendChild(newChatDiv); // Append to end initially
                    roomElement = newChatDiv;
                    newChatDiv.classList.add('animate-pulse');
                    setTimeout(() => {
                        newChatDiv.classList.remove('animate-pulse');
                    }, 3000);
                } // --- End create/append block ---

                // --- Re-sort the sidebar ---
                sortChatSidebar(); // <-- CALL SORT FUNCTION
                console.log(`[DEBUG] Re-sorted sidebar after ${isNewElement ? 'adding' : 'updating'} chat ${chat._id}.`);

                // --- Auto-click the chat ---
                // Find the element *again* after sorting
                const finalChatElement = chatSidebarList.querySelector(`.chat-room[data-id="${chat._id}"]`);
                if (finalChatElement) { // Click regardless of creator status now
                    console.log(`[DEBUG] Simulating click on newly created/found chat ${chat._id}.`);
                    // Use setTimeout to ensure the element is fully in the DOM and listener attached
                    setTimeout(() => {
                        finalChatElement.click();

                        // --- ADDED: Explicitly hide sidebar on small screens AFTER click ---
                        if (window.innerWidth < 768 && sidebarContainer && chatAreaContainer) {
                            console.log('[DEBUG] Small screen detected after new chat click. Hiding sidebar.');
                            sidebarContainer.classList.add('hidden');
                            chatAreaContainer.classList.remove('hidden');
                            if (sidebarToggleBtn) {
                                sidebarToggleBtn.textContent = 'Show Sidebar';
                            }
                        }
                        // --- END ADDED ---

                    }, 0); // Minimal delay is fine
                } else {
                    console.error(`[DEBUG] Could not find final chat element ${chat._id} after sorting to simulate click.`);
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
    // --- MOVE VARIABLE DECLARATION HERE ---
    // const globalChatUnreadDot = document.getElementById('global-chat-unread-dot'); // No longer needed here if fetched inside function

    // --- Sort Chat List by Latest Message Timestamp ---
    // NOTE: For initial sorting to work correctly, the server-side template
    // MUST render the 'data-latest-message-timestamp' attribute with the
    // correct ISO timestamp of the last message for each chat room element.
    sortChatSidebar(); // <-- CALL SORT FUNCTION
    console.log('[DEBUG] Initial sort of chat sidebar on load.');
    // --- End Sort Chat List ---


    // --- Check Unread Status on Load ---
    const lastViewedTimestamps = getChatLastViewedTimestamps();
    const chatRooms = document.querySelectorAll('.chat-room');
    console.log(`[DEBUG] Checking unread status for ${chatRooms.length} rooms on load.`);

    chatRooms.forEach(room => {
        const chatId = room.dataset.id;
        const latestTimestamp = room.dataset.latestMessageTimestamp;
        const lastViewed = lastViewedTimestamps[chatId];
        const unreadDot = room.querySelector('.unread-dot');

        // Check if latest message timestamp exists and is valid
        if (!latestTimestamp || latestTimestamp === '1970-01-01T00:00:00.000Z') {
            console.warn(`[DEBUG] Chat ${chatId} has missing or invalid latestMessageTimestamp. Skipping unread check.`);
            if (unreadDot) unreadDot.classList.add('hidden'); // Hide dot if timestamp is invalid
            return; // Skip if no valid timestamp
        }

        // --- MODIFIED UNREAD LOGIC WITH TOLERANCE ---
        let isUnread = false;
        if (!lastViewed) {
            // Never viewed before, definitely unread if there's a latest timestamp
            isUnread = true;
            console.log(`[DEBUG] Chat ${chatId} is unread (never viewed). Latest: ${latestTimestamp}`);
        } else {
            try {
                const latestDate = new Date(latestTimestamp);
                const lastViewedDate = new Date(lastViewed);
                const timeDifference = latestDate.getTime() - lastViewedDate.getTime();

                // Consider unread ONLY if latestTimestamp is significantly newer than lastViewed
                // Allow for a small tolerance (e.g., 1000ms = 1 second)
                if (timeDifference > 1000) { // If latest is more than 1 second newer
                    isUnread = true;
                    console.log(`[DEBUG] Chat ${chatId} is unread. Last viewed: ${lastViewed}, Latest: ${latestTimestamp}, Diff: ${timeDifference}ms`);
                } else {
                    // Otherwise (lastViewed is newer, same, or only slightly older), consider it read
                    console.log(`[DEBUG] Chat ${chatId} is considered READ. Last viewed: ${lastViewed}, Latest: ${latestTimestamp}, Diff: ${timeDifference}ms`);
                }
            } catch (e) {
                console.error(`[DEBUG] Error comparing dates for chat ${chatId}:`, e);
                // Default to hiding the dot if date comparison fails
                isUnread = false;
            }
        }
        // --- END MODIFIED UNREAD LOGIC ---


        if (isUnread) {
            // console.log(`[DEBUG] Chat ${chatId} is unread. Last viewed: ${lastViewed}, Latest: ${latestTimestamp}`); // Log moved inside logic
            if (unreadDot) {
                unreadDot.classList.remove('hidden');
            } else {
                console.warn(`[DEBUG] Unread dot element not found for chat ${chatId}.`);
            }
        } else {
            // Ensure dot is hidden if read
            if (unreadDot) {
                unreadDot.classList.add('hidden');
            }
        }
    });
    console.log('[DEBUG] Finished checking unread status on load.');
    // --- UPDATE GLOBAL DOT after initial check ---
    // updateGlobalUnreadStatus(); // This call will now work correctly
    // --- END UPDATE ---
    // --- End Check Unread Status ---

    // --- HIDE MESSAGE FORM INITIALLY ---
    if (messageForm) {
        messageForm.classList.add('hidden');
    }
    // --- END HIDE MESSAGE FORM INITIALLY ---

    // Set initial prompt in the message area and header
    messagesDiv.innerHTML = '<p class="text-center text-gray-500">Select a chat to start messaging.</p>';
    if (chatHeaderName) {
        chatHeaderName.textContent = 'Select a chat'; // Initial header text
    }
    // Ensure spinner is hidden if it was shown by mistake or by other logic
    hideSpinner();

    // Ensure correct initial state for mobile toggle (This is now handled better in the Sidebar Toggle Logic section)
    /* // REMOVE or comment out this block as it's redundant with the improved logic above
    if (window.innerWidth < 768 && sidebarContainer && chatAreaContainer) {
        sidebarContainer.classList.add('hidden'); // Start with sidebar hidden on mobile
        chatAreaContainer.classList.remove('hidden'); // Start with chat area visible on mobile
        if (sidebarToggleBtn) {
            sidebarToggleBtn.textContent = 'Show Sidebar';
        }
    } else if (sidebarContainer && chatAreaContainer) {
         // Ensure correct state for desktop (sidebar visible, chat area visible)
         sidebarContainer.classList.remove('hidden');
         chatAreaContainer.classList.remove('hidden');
         // Reset button text for desktop view if needed
         if (sidebarToggleBtn) {
             sidebarToggleBtn.textContent = 'Hide Sidebar'; // Or whatever the default text is
         }
    }
    */
});