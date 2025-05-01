const socket = io(); 
socket.emit('joinRoom', 'live-comments-room');

const commentForm = document.getElementById('commentForm');
const commentInput = document.getElementById('commentInput');
const commentsDiv = document.getElementById('comments');

let username = 'Anonymous'; // Default if not logged in

// Fetch username and load initial comments
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/live/username');
        const data = await res.json();
        if (data.username) {
            username = data.username;
        }

        // Load old comments
        const commentsRes = await fetch('/live/comments');
        const comments = await commentsRes.json();

        // Clear the placeholder before adding comments
        commentsDiv.innerHTML = ''; // Clear "Loading..." text

        if (comments.length === 0) {
            // Optionally, add back a "No comments yet" message if desired
            const noCommentsElement = document.createElement('p');
            noCommentsElement.className = 'text-center text-gray-400 italic m-auto';
            noCommentsElement.textContent = 'No comments yet...';
            commentsDiv.appendChild(noCommentsElement);
        } else {
            comments.forEach(comment => {
                const time = new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const commentElement = document.createElement('div');
                // Apply Tailwind classes for styling if needed
                commentElement.className = 'text-sm break-words'; // Example styling
                commentElement.innerHTML = `<strong class="text-green-700">[${time}] ${comment.username || 'Anonymous'}:</strong> ${comment.text}`;
                // commentElement.style.padding = '5px 0'; // Can remove if using Tailwind classes
                commentsDiv.appendChild(commentElement);
            });
        }

        commentsDiv.scrollTop = commentsDiv.scrollHeight;
    } catch (err) {
        console.error('Failed to load username or comments', err);
        // Display error in the comments div
        commentsDiv.innerHTML = '<p class="text-center text-red-500 italic m-auto">Error loading comments.</p>';
    }
});

// Submit new comment
commentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const comment = commentInput.value.trim();
    if (comment !== '') {
        socket.emit('newComment', { text: comment, username });
        commentInput.value = '';
    }
});

// Listen for new comments
socket.on('newComment', (data) => {
    // Check if the placeholder/no comments message is currently displayed and remove it
    const placeholder = commentsDiv.querySelector('p.text-center');
    if (placeholder) {
        placeholder.remove();
    }

    const { text, createdAt, username } = data;
    const commentElement = document.createElement('div');
    const time = new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Apply Tailwind classes for styling if needed
    commentElement.className = 'text-sm break-words'; // Example styling
    commentElement.innerHTML = `<strong class="text-green-700">[${time}] ${username || 'Anonymous'}:</strong> ${text}`;
    // commentElement.style.padding = '5px 0'; // Can remove if using Tailwind classes
    commentsDiv.appendChild(commentElement);

    // Scroll to bottom only if the user is already near the bottom
    const isScrolledToBottom = commentsDiv.scrollHeight - commentsDiv.clientHeight <= commentsDiv.scrollTop + 1; // +1 for tolerance
    if (isScrolledToBottom) {
        commentsDiv.scrollTop = commentsDiv.scrollHeight;
    }
});

const commentsBox = document.querySelector('.comments-box');

function scrollToBottom() {
    commentsBox.scrollTop = commentsBox.scrollHeight;
}