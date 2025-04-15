document.addEventListener('DOMContentLoaded', function () {
    let selectedFiles = [];
  
    const postForm = document.getElementById('post-form');
    const previewContainer = document.getElementById('preview-container');
    const postsContainer = document.getElementById('posts-container');
    const imagePreviewModal = document.getElementById('imagePreviewModal');
    const previewedImage = document.getElementById('previewed-image');
    const postButton = document.getElementById('postButton');
    const isAuthenticated = postButton.dataset.authenticated === 'true';
  
    // Upload triggers
    document.getElementById('add-image-button').addEventListener('click', () => {
      document.getElementById('image-input').click();
    });
    document.getElementById('add-video-button').addEventListener('click', () => {
      document.getElementById('video-input').click();
    });
    document.getElementById('add-file-button').addEventListener('click', () => {
      document.getElementById('file-input').click();
    });
  
    // File selection
    document.getElementById('image-input').addEventListener('change', handleFileSelect);
    document.getElementById('video-input').addEventListener('change', handleFileSelect);
    document.getElementById('file-input').addEventListener('change', handleFileSelect);
  
    function handleFileSelect(event) {
      const files = event.target.files;
      if (!files.length) return;
  
      Array.from(files).forEach(file => {
        if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) return;
        selectedFiles.push(file);
        createPreview(file);
      });
  
      event.target.value = '';
    }
  
    function createPreview(file) {
      const previewItem = document.createElement('div');
      previewItem.className = 'preview-item';
      previewItem.dataset.fileName = file.name;
  
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-preview';
      removeBtn.innerHTML = '×';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removePreview(previewItem, file);
      });
  
      if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.className = 'preview-thumbnail';
        img.addEventListener('click', () => previewImage(img.src));
        previewItem.appendChild(img);
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.controls = true;
        video.className = 'preview-thumbnail';
        previewItem.appendChild(video);
      } else {
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        fileInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
        previewItem.appendChild(fileInfo);
      }
  
      previewItem.appendChild(removeBtn);
      previewContainer.appendChild(previewItem);
    }
  
    function formatFileSize(bytes) {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  
    function removePreview(previewItem, file) {
      previewItem.remove();
      selectedFiles = selectedFiles.filter(f => f.name !== file.name || f.size !== file.size);
    }
  
    function previewImage(src) {
      previewedImage.src = src;
      imagePreviewModal.style.display = 'flex';
    }
  
    document.querySelector('#imagePreviewModal .close-button').addEventListener('click', () => {
      imagePreviewModal.style.display = 'none';
    });
    window.addEventListener('click', (event) => {
      if (event.target === imagePreviewModal) {
        imagePreviewModal.style.display = 'none';
      }
    });
  
    // Submit post
    postForm.addEventListener('submit', async function (e) {
      e.preventDefault();
  
      if (!isAuthenticated) {
        alert('Please log in to post');
        window.location.href = '/login';
        return;
      }
  
      const title = document.getElementById('post-title').value.trim();
      const text = document.getElementById('post-content').value.trim();
  
      if (!title && !text && selectedFiles.length === 0) {
        alert('Please add content to your post');
        return;
      }
  
      try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('text', text);
        selectedFiles.forEach(file => formData.append('media', file));
  
        const response = await fetch('/posts', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
  
        if (!response.ok) throw new Error('Failed to create post');
        const result = await response.json();
  
        postForm.reset();
        previewContainer.innerHTML = '';
        selectedFiles = [];
  
        loadPosts();
  
      } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Something went wrong!');
      }
    });
  
    // Load posts
    async function loadPosts() {
      try {
        postsContainer.innerHTML = '<div class="loading-posts">Loading posts...</div>';
        const response = await fetch('/posts', { credentials: 'include' });
  
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const posts = await response.json();
  
        if (!Array.isArray(posts)) {
          postsContainer.innerHTML = '<div class="error-message">Failed to load posts</div>';
          return;
        }
  
        if (posts.length === 0) {
          postsContainer.innerHTML = '<div class="no-posts">No posts yet. Be the first to share!</div>';
          return;
        }
  
        postsContainer.innerHTML = posts.map(post => {
          let mediaContent = '';
  
          if (post.media && post.media.length > 0) {
            mediaContent = post.media.map(media => {
              let mediaUrl = media.url;
              if (media.type === 'image' && mediaUrl.includes('res.cloudinary.com')) {
                mediaUrl = mediaUrl.replace('/upload/', '/upload/w_800,c_limit,q_auto,f_auto/');
              }
  
              if (media.type === 'image') {
                return `<div class="post-media-container">
                          <img src="${mediaUrl}" class="post-media post-image" 
                            onclick="document.getElementById('previewed-image').src='${mediaUrl}'; 
                            document.getElementById('imagePreviewModal').style.display='flex';">
                        </div>`;
              } else if (media.type === 'video') {
                return `<div class="post-media-container">
                          <video src="${mediaUrl}" class="post-media" controls></video>
                        </div>`;
              } else {
                return `<div class="post-media-container">
                          <a href="${mediaUrl}" target="_blank" class="post-file">
                            <i class="fas fa-file-download"></i> ${media.filename || 'Download File'}
                          </a>
                        </div>`;
              }
            }).join('');
          }
  
          return `
            <div class="post" data-id="${post._id}">
              <div class="post-header">
                <h3 class="post-title">${post.title || 'Untitled Post'}</h3>
                <small class="post-date">${new Date(post.createdAt).toLocaleString()}</small>
              </div>
              <div class="post-content">
                <p class="post-text">${post.text || ''}</p>
                ${mediaContent}
              </div>
              <div class="post-footer">
                <span class="post-author">Posted by ${post.userId?.username || 'Anonymous'}</span>
                <div class="post-actions">
                  <button class="post-action like-button">
                    <i class="far fa-thumbs-up"></i> <span class="like-text">Like</span> (<span class="like-count">0</span>)
                  </button>
                  <button class="post-action comment-button">
                    <i class="far fa-comment"></i> Comment
                  </button>
                </div>
              </div>
            </div>`;
        }).join('');
  
        setupLikeAndCommentHandlers();
      } catch (error) {
        console.error("Failed to load posts:", error);
        postsContainer.innerHTML = `<div class="error-message">Error loading posts. Please refresh the page.<br>${error.message}</div>`;
      }
    }
  
    // Setup like & comment handlers for dynamically loaded posts
    function setupLikeAndCommentHandlers() {
      document.querySelectorAll(".like-button").forEach(button => {
        button.addEventListener("click", () => {
          const countSpan = button.querySelector(".like-count");
          const textSpan = button.querySelector(".like-text");
          let count = parseInt(countSpan.textContent);
  
          if (button.classList.contains("liked")) {
            count--;
            button.classList.remove("liked");
            button.querySelector("i").classList.replace("fas", "far");
            textSpan.textContent = "Like";
          } else {
            count++;
            button.classList.add("liked");
            button.querySelector("i").classList.replace("far", "fas");
            textSpan.textContent = "Liked";
          }
  
          countSpan.textContent = count;
        });
      });
  
      document.querySelectorAll(".comment-button").forEach(button => {
        button.addEventListener("click", () => {
          alert("Comment feature coming soon!");
        });
      });
    }
  
    // Setup like/comment for the static EJS sample post
    function setupStaticHandlers() {
      setupLikeAndCommentHandlers(); // Reuse the same logic
    }
  
    // Initial load
    loadPosts();
    setupStaticHandlers(); // Also activate like/comment for the static post
  });
  