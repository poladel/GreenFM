document.getElementById('add-image-button').addEventListener('click', () => {
    document.getElementById('image-input').click();
});

document.getElementById('add-document-button').addEventListener('click', () => {
    document.getElementById('document-input').click();
});

// Show file previews, handle image & video file selection
document.getElementById('image-input').addEventListener('change', function () {
    const file = this.files[0];
    if (file.type.startsWith('image/')) {
        previewFile(file, 'image');
    } else if (file.type.startsWith('video/')) {
        previewFile(file, 'video');
    }
});

document.getElementById('document-input').addEventListener('change', function () {
    previewFile(this.files[0], 'document');
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
    } else if (type === 'document' && file) {
        const docPreview = document.createElement('p');
        docPreview.textContent = `Selected file: ${file.name}`;
        previewContainer.appendChild(docPreview);
    }
}

// Handle form submission
document.getElementById('post-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    const textValue = document.querySelector('.post-textbox').value;
    formData.append('text', textValue);

    const mediaInput = document.getElementById('image-input');
    if (mediaInput.files.length > 0) {
        const file = mediaInput.files[0];
        formData.append('media', file);
    }

    const docInput = document.getElementById('document-input');
    if (docInput.files.length > 0) {
        formData.append('document', docInput.files[0]);
    }

    try {
        const response = await fetch('/post', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            alert('Post uploaded successfully!');
            console.log("Server Response:", result);
            loadPosts(); // Refresh timeline
            document.getElementById('post-form').reset();
            document.getElementById('preview-container').innerHTML = ''; // Clear preview
        } else {
            console.error("Failed to post:", result);
            alert('Failed to post');
        }
    } catch (error) {
        console.error("Error:", error);
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

        console.log("Fetched Posts:", posts); // Debugging log

        const container = document.getElementById('posts-container');

        if (!Array.isArray(posts)) {
            console.error("Invalid posts data:", posts);
            return;
        }

        container.innerHTML = posts.map(post => `
            <div class="post">
                <p><strong>${post.userId?.username || 'Unknown User'}</strong></p>
                <p>${post.text || ''}</p>
                ${post.media ? `<img src="${post.media}" class="post-media">` : ''}
                ${post.document ? `<a href="${post.document}" target="_blank">📄 Download Document</a>` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error("Failed to load posts:", error);
    }
}

loadPosts();
