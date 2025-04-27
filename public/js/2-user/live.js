const socket = io(); // Connect to server

socket.emit('joinRoom', 'live-comments-room'); // 🛠️ ADD THIS LINE!

const commentForm = document.getElementById('commentForm');
const commentInput = document.getElementById('commentInput');
const commentsDiv = document.getElementById('comments');

// Submit new comment
commentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const comment = commentInput.value.trim();
    if (comment !== '') {
        socket.emit('newComment', comment);
        commentInput.value = '';
    }
});

// Listen for incoming comments
socket.on('newComment', (data) => {
    const { text, createdAt } = data;
    const commentElement = document.createElement('div');

    const time = new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    commentElement.innerHTML = `<strong>[${time}]</strong> ${text}`;
    commentElement.style.padding = '5px 0';
    commentsDiv.appendChild(commentElement);

    // Auto-scroll
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

