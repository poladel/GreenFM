document.getElementById('add-image-button').addEventListener('click', () => {
    document.getElementById('image-input').click();
});

document.getElementById('add-video-button').addEventListener('click', () => {
    document.getElementById('video-input').click();
});

// Show file previews, handle image & video file selection
document.getElementById('image-input').addEventListener('change', function () {
    const file = this.files[0];
    if (file.type.startsWith('image/')) {
        previewFile(file, 'image');
    }
});

document.getElementById('video-input').addEventListener('change', function () {
    previewFile(this.files[0], 'video');
});

function previewFile(file, type) {
    const previewContainer = document.getElementById('preview-container');
    previewContainer.innerHTML = ''; // Clear previous preview

    if (type === 'image' && file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.maxWidth = '100px';
            previewContainer.appendChild(img);
        };
        reader.readAsDataURL(file);
    } else if (type === 'video' && file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const video = document.createElement('video');
            video.src = e.target.result;
            video.controls = true;
            video.style.maxWidth = '200px';
            previewContainer.appendChild(video);
        };
        reader.readAsDataURL(file);
    }
}

// Handle form submission
document.getElementById('post-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    const titleValue = document.getElementById('post-title').value.trim();  
    const textValue = document.querySelector('.post-textbox').value.trim();

    formData.append('title', titleValue);  
    formData.append('text', textValue);

    const mediaInput = document.getElementById('image-input');
    if (mediaInput.files.length > 0) {
        formData.append('media', mediaInput.files[0]);
    }

    const videoInput = document.getElementById('video-input');
    if (videoInput.files.length > 0) {
        formData.append('video', videoInput.files[0]);
    }

    try {
        const response = await fetch('/post', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            alert('Post uploaded successfully!');
            loadPosts();  
            document.getElementById('post-form').reset();
            document.getElementById('preview-container').innerHTML = ''; 
        } else {
            alert(result.error || 'Failed to post');
        }
    } catch (error) {
        alert("Something went wrong!");
    }
});

// Fetch posts and display them
async function loadPosts() {
    try {
        const response = await fetch('/posts');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const posts = await response.json();
        console.log("🟢 Fetched Posts:", posts); // Debugging

        const container = document.getElementById('posts-container');

        if (!Array.isArray(posts)) {
            console.error("🔴 Invalid posts data:", posts);
            return;
        }

        container.innerHTML = posts.map(post => {
            let mediaContent = '';

            if (post.media) {
                if (post.media.endsWith('.mp4') || post.media.endsWith('.webm') || post.media.endsWith('.ogg')) {
                    // If the media is a video
                    mediaContent = `<video src="${post.media}" controls class="post-media"></video>`;
                } else {
                    // If the media is an image
                    mediaContent = `<img src="${post.media}" class="post-media">`;
                }
            }

            return `
                <div class="post">
                    <p><strong>${post.title ? post.title : 'Untitled Post'}</strong></p>
                    <p>${post.text || ''}</p>
                    ${mediaContent}
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("🔴 Failed to load posts:", error);
    }
}

loadPosts();
