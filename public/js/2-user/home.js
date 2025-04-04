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
        const response = await fetch('/posts'); // Assuming this route fetches all posts
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const posts = await response.json();
        const container = document.getElementById('posts-container');
        
        if (Array.isArray(posts)) {
            container.innerHTML = posts.map(post => {
                let mediaContent = '';

                if (post.media && post.media.length > 0) {
                    mediaContent = post.media.map(image => `<img src="${image}" class="post-media-img" />`).join('');
                }

                if (post.video) {
                    mediaContent += `<video src="${post.video}" controls class="post-media"></video>`;
                }

                return `
                    <div class="post" id="post-${post._id}">
                        <p><strong>${post.title}</strong></p>
                        <p>${post.text}</p>
                        <div class="post-media">
                            ${mediaContent}
                        </div>
                        <div class="post-actions">
                            <button class="edit-btn" onclick="editPost('${post._id}', '${post.title}', '${post.text}')">Edit</button>
                            <button class="delete-btn" onclick="deletePost('${post._id}')">Delete</button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            console.error("Invalid posts data:", posts);
        }
    } catch (error) {
        console.error('Failed to load posts:', error);
    }
}

// Call the loadPosts function when the page is loaded
window.addEventListener('DOMContentLoaded', loadPosts);

// Example of editPost and deletePost functions (to be implemented)
function editPost(postId, title, text) {
    console.log('Editing post', postId, title, text);
    // Add your logic for editing a post
}

function deletePost(postId) {
    console.log('Deleting post', postId);
    // Add your logic for deleting a post
}

loadPosts();

// Function to edit a post
async function editPost(postId, currentTitle, currentText) {
    console.log('Editing post', postId, currentTitle, currentText);
    
    const newTitle = prompt('Edit Title:', currentTitle);
    const newText = prompt('Edit Text:', currentText);

    if (newTitle !== null && newText !== null && newTitle.trim() && newText.trim()) {
        updatePost(postId, newTitle, newText);
    } else {
        alert('Both title and text are required.');
    }
}

// Function to update a post
async function updatePost(postId, newTitle, newText) {
    const formData = new FormData();
    formData.append('title', newTitle);
    formData.append('text', newText);

    console.log('Updating post:', postId);
    console.log('Title:', newTitle);
    console.log('Text:', newText);

    try {
        const response = await fetch(`/post/${postId}`, {
            method: 'PUT',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            alert('Post updated successfully!');
            loadPosts(); // Reload the posts
        } else {
            alert(result.error || 'Failed to update post');
        }
    } catch (error) {
        alert('Failed to update post');
    }
}

// Function to delete a post
async function deletePost(postId) {
    if (confirm('Are you sure you want to delete this post?')) {
        try {
            const response = await fetch(`/post/${postId}`, {
                method: 'DELETE'
            });
            const result = await response.json();

            if (response.ok) {
                alert('Post deleted successfully!');
                loadPosts(); // Reload the posts
            } else {
                alert(result.error || 'Failed to delete post');
            }
        } catch (error) {
            alert('Failed to delete post');
        }
    }
}
