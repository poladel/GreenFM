document.addEventListener('DOMContentLoaded', function () {
  class ForumApp {
    constructor() {
      this.selectedFiles = [];
      this.currentUserId = window.currentUserId || null;
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
      this.elements.imageInput?.addEventListener('change', (e) => this.handleFileSelect(e));
      this.elements.videoInput?.addEventListener('change', (e) => this.handleFileSelect(e));
      document.getElementById('add-image-button')?.addEventListener('click', () => this.elements.imageInput.click());
      document.getElementById('add-video-button')?.addEventListener('click', () => this.elements.videoInput.click());
      this.elements.postForm?.addEventListener('submit', (e) => this.handlePostSubmit(e));
    }

    handleFileSelect(event) {
      const files = event.target.files;
      if (!files?.length) return;
      Array.from(files).forEach(file => this.createPreview(file));
    }

    createPreview(file) {
      const previewItem = document.createElement('div');
      previewItem.className = 'preview-item';

      const isImage = file.type.startsWith('image/');
      const preview = isImage ? document.createElement('img') : document.createElement('div');
      preview.className = isImage ? 'preview-thumbnail' : '';
      preview.src = isImage ? URL.createObjectURL(file) : null;
      preview.textContent = !isImage ? file.name : '';

      previewItem.appendChild(preview);
      this.elements.previewContainer.appendChild(previewItem);
    }

    async handlePostSubmit(e) {
      e.preventDefault();
      if (!this.isAuthenticated) return alert('Please log in.');

      const formData = new FormData();
      formData.append('title', this.elements.postTitle.value);
      formData.append('text', this.elements.postContent.value);

      [...this.elements.imageInput.files, ...this.elements.videoInput.files].forEach(file =>
        formData.append('media', file)
      );

      try {
        const res = await fetch('/posts', { method: 'POST', credentials: 'include', body: formData });
        if (!res.ok) throw new Error('Post failed');
        this.elements.postForm.reset();
        this.elements.previewContainer.innerHTML = '';
        this.loadPosts();
        showToast('✅ Post submitted successfully!', 'success');
      } catch (error) {
        console.error('Post error:', error);
        alert('Error submitting post');
      }
    }

    async loadPosts(page = 1) {
      try {
        const response = await fetch(`/posts?page=${page}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to load posts');
        const data = await response.json();
        this.renderPosts(data.posts);
        this.renderPagination(data.totalPages, data.currentPage);
      } catch (error) {
        console.error('Error loading posts:', error);
        this.elements.postsContainer.innerHTML = `<div class="error">Unable to load posts.</div>`;
      }
    }

    renderPagination(totalPages, currentPage) {
      const paginationContainer = document.getElementById('pagination-container');
      if (!paginationContainer) return;

      paginationContainer.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = `px-3 py-1 border rounded ${currentPage === i ? 'bg-green-700 text-white' : 'hover:bg-green-100'}`;
        btn.onclick = () => this.loadPosts(i);
        paginationContainer.appendChild(btn);
      }
    }

    renderPosts(posts) {
      this.elements.postsContainer.innerHTML = '';
      posts.forEach(post => {
        const div = document.createElement('div');
        div.className = 'post';
        div.dataset.id = post._id;

        const showControls = post.userId && post.userId._id === this.currentUserId;

        div.innerHTML = `
          <div class="post-header">
            <p class="post-author">${post.userId?.username || 'Unknown'}</p>
            ${showControls ? `
              <div class="edit-delete-buttons">
                <button class="edit-btn" onclick="editPost('${post._id}')">✏️ Edit</button>
                <button class="delete-btn" onclick="deletePost('${post._id}')">🗑️ Delete</button>
              </div>` : ''}
          </div>
          <h3 class="post-title">${post.title}</h3>
          <p class="post-text">${post.text}</p>
          <div class="post-media-container">
            ${post.media.map(media => media.type === 'image'
              ? `<img src="${media.url}" class="post-media post-image" />`
              : `<video controls class="post-media" oncontextmenu="return false"><source src="${media.url}" type="video/mp4"></video>`
            ).join('')}
          </div>
          <div class="post-actions">
            <button class="like-button ${post.liked ? 'liked' : ''}" onclick="toggleLike('${post._id}', this)">
              ❤️ <span class="like-count">${post.likes?.length || 0}</span>
            </button>
            <button class="comment-toggle-button" onclick="toggleCommentInput('${post._id}')">💬 Comment</button>
          </div>
          <div class="interaction-panel" data-post-id="${post._id}">
            <div class="comment-input-wrapper" id="comment-input-wrapper-${post._id}" style="display: none;">
              <textarea class="comment-input" placeholder="Write a comment..."></textarea>
              <div class="comment-button-wrap">
                <button onclick="submitComment('${post._id}', this)">Post Comment</button>
              </div>
            </div>
            <div class="comments-list" id="comments-${post._id}"></div>
          </div>`;

        this.elements.postsContainer.appendChild(div);
        this.loadComments(post._id, div.querySelector(`#comments-${post._id}`));
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
              <span class="comment-date">${new Date(c.createdAt).toLocaleString('en-US')}</span>
            </div>
            <p class="comment-text">${c.text}</p>
          </div>`).join('');
      } catch (error) {
        console.error('Load comments error:', error);
        container.innerHTML = '<div class="no-comments">Failed to load comments.</div>';
      }
    }
  }

  new ForumApp();
});

// ========= GLOBAL FUNCTIONS =========
let editPostId = null;

window.editPost = function (postId) {
  const postEl = document.querySelector(`.post[data-id="${postId}"]`);
  document.getElementById('edit-title').value = postEl.querySelector('.post-title')?.innerText || '';
  document.getElementById('edit-content').value = postEl.querySelector('.post-text')?.innerText || '';
  editPostId = postId;

  // ✅ Show modal and prevent body scroll
  document.getElementById('editPostModal').classList.add('show');
  document.body.classList.add('no-scroll');
};

window.closeEditModal = function () {
  document.getElementById('editPostModal').classList.remove('show');
  document.getElementById('edit-title').value = '';
  document.getElementById('edit-content').value = '';
  editPostId = null;

  // ✅ Restore body scroll
  document.body.classList.remove('no-scroll');
};


window.submitEditPost = async function () {
  const title = document.getElementById('edit-title').value.trim();
  const text = document.getElementById('edit-content').value.trim();
  if (!title || !text || !editPostId) return alert('Please fill out both fields.');

  try {
    const res = await fetch(`/posts/${editPostId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title, text })
    });

    const result = await res.json();
    if (result.success) {
      const el = document.querySelector(`.post[data-id="${editPostId}"]`);
      el.querySelector('.post-title').innerText = title;
      el.querySelector('.post-text').innerText = text;
      closeEditModal();
      showToast('✅ Post updated!', 'success');
    } else {
      showToast('❌ Failed to update post', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('❌ Error updating post', 'error');
  }
};

window.deletePost = async function (postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;

  try {
    const res = await fetch(`/posts/${postId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const result = await res.json();
    if (result.success) {
      document.querySelector(`.post[data-id="${postId}"]`).remove();
      showToast('🗑️ Post deleted successfully!', 'success');
    } else {
      showToast('❌ Failed to delete post', 'error');
    }
  } catch (err) {
    console.error('Delete error:', err);
    showToast('❌ Error deleting post', 'error');
  }
};

// LIKE toggle function
window.toggleLike = async function (postId, button) {
  try {
    const res = await fetch(`/posts/${postId}/like`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json();

    if (data.success) {
      const likeCount = button.querySelector('.like-count');
      if (data.liked) {
        button.classList.add('liked');
        likeCount.textContent = parseInt(likeCount.textContent) + 1;
      } else {
        button.classList.remove('liked');
        likeCount.textContent = parseInt(likeCount.textContent) - 1;
      }
    } else {
      showToast('❌ Like failed', 'error');
    }
  } catch (err) {
    console.error('Like error:', err);
    showToast('❌ Error liking post', 'error');
  }
};

// COMMENT submit function
window.submitComment = async function (postId, button) {
  const panel = button.closest('.interaction-panel');
  const textarea = panel.querySelector('.comment-input');
  const commentsList = panel.querySelector(`#comments-${postId}`);
  const text = textarea.value.trim();

  if (!text) return;

  try {
    const res = await fetch(`/posts/${postId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text }),
    });
    const data = await res.json();

    if (data.success && data.comment) {
      textarea.value = '';
      const comment = data.comment;
      const newComment = document.createElement('div');
      newComment.className = 'comment-item';
      newComment.innerHTML = `
        <div class="comment-header">
          <span class="comment-author">${comment.userId?.username || 'Anonymous'}</span>
          <span class="comment-date">${new Date(comment.createdAt).toLocaleString('en-US')}</span>
        </div>
        <p class="comment-text">${comment.text}</p>
      `;
      commentsList.appendChild(newComment);
      showToast('💬 Comment posted!', 'success');
    } else {
      showToast('❌ Failed to post comment', 'error');
    }
  } catch (err) {
    console.error('Comment error:', err);
    showToast('❌ Error posting comment', 'error');
  }
};

window.toggleCommentInput = function (postId) {
  const wrapper = document.getElementById(`comment-input-wrapper-${postId}`);
  if (wrapper) {
    wrapper.style.display = wrapper.style.display === 'none' ? 'block' : 'none';
  }
};

window.submitComment = async function (postId, button) {
  const panel = button.closest('.interaction-panel');
  const textarea = panel.querySelector('.comment-input');
  const commentsList = panel.querySelector(`#comments-${postId}`);
  const text = textarea.value.trim();

  if (!text) return;

  try {
    const res = await fetch(`/posts/${postId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text }),
    });

    const data = await res.json();

    if (data.success && data.comment) {
      // Append the comment
      const comment = data.comment;
      const newComment = document.createElement('div');
      newComment.className = 'comment-item';
      newComment.innerHTML = `
        <div class="comment-header">
          <span class="comment-author">${comment.userId?.username || 'Anonymous'}</span>
          <span class="comment-date">${new Date(comment.createdAt).toLocaleString('en-US')}</span>
        </div>
        <p class="comment-text">${comment.text}</p>
      `;
      commentsList.appendChild(newComment);
      textarea.value = '';
      showToast('💬 Comment posted!', 'success');
    } else {
      showToast('❌ Failed to post comment', 'error');
    }
  } catch (err) {
    console.error('Comment error:', err);
    showToast('❌ Error posting comment', 'error');
  }
};


function showToast(message, type = 'success', duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg z-50 text-white ${
    type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600'
  }`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), duration);
}



