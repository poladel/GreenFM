document.addEventListener('DOMContentLoaded', function () {
  class ForumApp {
    constructor() {
      this.selectedFiles = [];
      this.cacheElements();
      this.init();
    }

    cacheElements() {
      this.elements = {
        postForm: document.getElementById('post-form'),
        previewContainer: document.getElementById('preview-container'),
        postsContainer: document.getElementById('posts-container'),
        imageInput: document.getElementById('image-input'),
        videoInput: document.getElementById('video-input'),
        fileInput: document.getElementById('file-input'),
        addImageBtn: document.getElementById('add-image-button'),
        addVideoBtn: document.getElementById('add-video-button'),
        addFileBtn: document.getElementById('add-file-button'),
        postTitle: document.getElementById('post-title'),
        postContent: document.getElementById('post-content'),
        postButton: document.getElementById('postButton')
      };

      this.isAuthenticated = this.elements.postButton?.dataset.authenticated === 'true';
    }

    init() {
      if (!this.checkRequiredElements()) return;
      this.setupEventListeners();
      this.loadPosts();
    }

    checkRequiredElements() {
      const required = ['postForm', 'postsContainer', 'postButton', 'postTitle', 'postContent'];
      return required.every(el => !!this.elements[el]);
    }

    setupEventListeners() {
      this.elements.addImageBtn?.addEventListener('click', () => this.elements.imageInput.click());
      this.elements.addVideoBtn?.addEventListener('click', () => this.elements.videoInput.click());
      this.elements.addFileBtn?.addEventListener('click', () => this.elements.fileInput.click());
      this.elements.imageInput?.addEventListener('change', (e) => this.handleFileSelect(e));
      this.elements.videoInput?.addEventListener('change', (e) => this.handleFileSelect(e));
      this.elements.fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));
      this.elements.postForm.addEventListener('submit', (e) => this.handlePostSubmit(e));
    }

    handleFileSelect(event) {
      const files = event.target.files;
      if (!files?.length) return;
      Array.from(files).forEach(file => this.createPreview(file));
    }

    createPreview(file) {
      const previewItem = document.createElement('div');
      previewItem.className = 'preview-item';
      let preview;
      if (file.type.startsWith('image/')) {
        preview = document.createElement('img');
        preview.src = URL.createObjectURL(file);
        preview.className = 'preview-thumbnail';
      } else {
        preview = document.createElement('div');
        preview.textContent = file.name;
      }
      previewItem.appendChild(preview);
      this.elements.previewContainer.appendChild(previewItem);
    }

    async handlePostSubmit(e) {
      e.preventDefault();
      if (!this.isAuthenticated) return alert('Please log in.');

      const formData = new FormData();
      formData.append('title', this.elements.postTitle.value);
      formData.append('text', this.elements.postContent.value);

      [...this.elements.imageInput.files, ...this.elements.videoInput.files,  ].forEach(file => {
        formData.append('media', file);
      });

      try {
        const res = await fetch('/posts', {
          method: 'POST',
          credentials: 'include',
          body: formData
        });

        if (!res.ok) throw new Error('Post failed');
        this.elements.postForm.reset();
        this.elements.previewContainer.innerHTML = '';
        this.loadPosts();
      } catch (error) {
        console.error('Post error:', error);
        alert('Error submitting post');
      }
    }

    async loadPosts() {
      try {
        const response = await fetch('/posts', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to load posts');
        const data = await response.json();
        this.renderPosts(data.posts);
      } catch (error) {
        console.error('Error loading posts:', error);
        this.elements.postsContainer.innerHTML = `<div class="error">Unable to load posts.</div>`;
      }
    }

    renderPosts(posts) {
      this.elements.postsContainer.innerHTML = posts.map(post => {
        const mediaContent = post.media?.map(media => {
          if (!media.url) return '';
          if (media.type === 'image') {
            return `<img src="${media.url}" class="post-media" />`;
          } else if (media.type === 'video') {
            return `<video controls controlsList="nodownload" oncontextmenu="return false" class="post-media"><source src="${media.url}" type="video/mp4"></video>`;

          } else {
            return `<a href="${media.url}" target="_blank">${media.url}</a>`;
          }
        }).join('') || '';
    
        return `
          <div class="post" data-id="${post._id}">
        <p class="post-author">${post.userId?.username || 'Unknown'}</p>
        <h3>${post.title}</h3>
        <p>${post.text}</p>
        <div class="media-block">${mediaContent}</div>

        <!-- Buttons aligned right -->
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
          <button class="like-button ${post.liked ? 'liked' : ''}" 
                  onclick="toggleLike('${post._id}', this)"
                  onmouseover="this.style.backgroundColor='#e74c3c'; this.style.color='white';"
                  onmouseout="this.style.backgroundColor='white'; this.style.color='#e74c3c';">
            ❤️ <span class="like-count">${post.likes?.length || 0}</span>
          </button>

          <button class="comment-toggle-button"
                  onclick="toggleCommentInput('${post._id}')"
                  style="background-color: white; border: 2px solid #2c7a7b; color: #2c7a7b; padding: 6px 16px; border-radius: 9999px; font-weight: bold; display: flex; align-items: center; gap: 6px; transition: all 0.3s ease;"
                  onmouseover="this.style.backgroundColor='#2c7a7b'; this.style.color='white';"
                  onmouseout="this.style.backgroundColor='white'; this.style.color='#2c7a7b';">
            💬 Comment
          </button>
        </div>

        <div class="interaction-panel" data-post-id="${post._id}">
          <div class="comment-input-wrapper" id="comment-input-wrapper-${post._id}" style="display: none; margin-top: 0.5rem;">
            <textarea class="comment-input" placeholder="Write a comment..."></textarea>
            <div style="display: flex; justify-content: flex-end; margin-top: 0.5rem;">
              <button onclick="submitComment('${post._id}', this)" style="padding: 0.4rem 1rem;">Post Comment</button>
            </div>
          </div>
          <div class="comments-list" id="comments-${post._id}"></div>
        </div>
      </div>
        `;
      }).join('');
    
      document.querySelectorAll('.interaction-panel').forEach(panel => {
        const postId = panel.dataset.postId;
        const container = panel.querySelector(`#comments-${postId}`);
        if (container) this.loadComments(postId, container);
      });
    }

    async loadComments(postId, container) {
      try {
        const res = await fetch(`/posts/${postId}/comments`, { credentials: 'include' });
        const data = await res.json();
        const comments = data.comments || [];

        container.innerHTML = comments.map(c => `
          <div class="comment-item">
            <div class="comment-header">
              <span class="comment-author">${c.userId?.username || 'Anonymous'}</span>
              <span class="comment-date">${c.createdAt ? new Date(c.createdAt).toLocaleString() : 'Just now'}</span>
            </div>
            <p class="comment-text">${c.text}</p>
          </div>
        `).join('');
      } catch (error) {
        console.error('Load comments error:', error);
        container.innerHTML = '<div class="no-comments">Failed to load comments.</div>';
      }
    }
  }

  window.toggleLike = async function (postId, button) {
    try {
      const res = await fetch(`/posts/${postId}/like`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await res.json();
      if (data.success) {
        const countSpan = button.querySelector('.like-count');
        countSpan.textContent = data.likeCount;
        button.classList.toggle('liked', data.liked);
      } else {
        alert('Failed to like.');
      }
    } catch (err) {
      console.error('Like toggle error:', err);
      alert('Error liking post.');
    }
  };

  window.submitComment = async function (postId, button) {
    const panel = button.closest('.interaction-panel');
    const textarea = panel.querySelector('.comment-input');
    const commentsList = panel.querySelector(`#comments-${postId}`);
    const text = textarea.value.trim();
    if (!text) return;

    try {
      const response = await fetch(`/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text })
      });

      const result = await response.json();
      if (result.success) {
        textarea.value = '';
        const app = new ForumApp();
        app.loadComments(postId, commentsList);
      } else {
        alert('Comment failed');
      }
    } catch (err) {
      console.error('Comment error:', err);
      alert('Error posting comment.');
    }
  };

  window.toggleCommentInput = function (postId) {
    const wrapper = document.getElementById(`comment-input-wrapper-${postId}`);
    if (wrapper) wrapper.style.display = wrapper.style.display === 'none' ? 'block' : 'none';
  };

  new ForumApp();
});
