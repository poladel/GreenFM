const socket = io(); 
socket.emit('joinRoom', 'live-comments-room');

const commentForm = document.getElementById('commentForm');
const commentInput = document.getElementById('commentInput');
const commentsDiv = document.getElementById('comments');

let username = 'Anonymous'; // Default if not logged in

// Fetch username
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

        comments.forEach(comment => {
            const time = new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const commentElement = document.createElement('div');
            commentElement.innerHTML = `<strong>[${time}] ${comment.username || 'Anonymous'}:</strong> ${comment.text}`;
            commentElement.style.padding = '5px 0';
            commentsDiv.appendChild(commentElement);
        });

        commentsDiv.scrollTop = commentsDiv.scrollHeight;
    } catch (err) {
        console.error('Failed to load username or comments', err);
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
    const { text, createdAt, username } = data;
    const commentElement = document.createElement('div');

    const time = new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    commentElement.innerHTML = `<strong>[${time}] ${username || 'Anonymous'}:</strong> ${text}`;
    commentElement.style.padding = '5px 0';
    commentsDiv.appendChild(commentElement);

    commentsDiv.scrollTop = commentsDiv.scrollHeight;
});

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/live/comments');
        const comments = await res.json();

        comments.forEach(comment => {
            const time = new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const commentElement = document.createElement('div');
            commentElement.innerHTML = `<strong>[${time}]</strong> ${comment.text}`;
            commentElement.style.padding = '5px 0';
            commentsDiv.appendChild(commentElement);
        });

        commentsDiv.scrollTop = commentsDiv.scrollHeight;
    } catch (err) {
        console.error('Failed to load old comments', err);
    }
});

const commentsBox = document.querySelector('.comments-box');

function scrollToBottom() {
    commentsBox.scrollTop = commentsBox.scrollHeight;
}