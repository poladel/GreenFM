document.getElementById('add-image-button').addEventListener('click', () => {
    document.getElementById('image-input').click();
});

document.getElementById('add-video-button').addEventListener('click', () => {
    document.getElementById('video-input').click();
});

// Show file previews, handle image & video file selection
document.getElementById('image-input').addEventListener('change', function () {
    const files = this.files;
    
    if (!files.length) return;

    for (let file of files) {
        if (file.type.startsWith('image/')) {
            previewFile(file, 'image');
        }
    }
});

document.getElementById('video-input').addEventListener('change', function () {
    previewFile(this.files[0], 'video');
});

function previewFile(file, type) {
    const previewContainer = document.getElementById('preview-container');

    if (type === 'image' && file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.maxWidth = '100px';
            img.style.margin = '5px';
            img.style.borderRadius = '8px';
            previewContainer.appendChild(img);  // Append instead of replacing
        };
        reader.readAsDataURL(file);
    } else if (type === 'video' && file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const video = document.createElement('video');
            video.src = e.target.result;
            video.controls = true;
            video.style.maxWidth = '200px';
            previewContainer.appendChild(video);  // Append instead of replacing
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
    for (let file of mediaInput.files) {
        formData.append('media', file);
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
        console.log("🟢 Fetched Posts:", posts);

        const container = document.getElementById('posts-container');

        if (!Array.isArray(posts)) {
            console.error("🔴 Invalid posts data:", posts);
            return;
        }

        container.innerHTML = posts.map(post => {
            let mediaContent = '';

            if (post.media && post.media.length > 0) {
                mediaContent = post.media.map(image => `<img src="${image}" class="post-media">`).join('');
            }

            if (post.video) {
                mediaContent += `<video src="${post.video}" controls class="post-media"></video>`;
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
