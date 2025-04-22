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

      // 🔁 Centralize delete comment logic
      document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn') && e.target.dataset.commentId) {
          const postId = e.target.dataset.postId;
          const commentId = e.target.dataset.commentId;
          const commentItem = e.target.closest('.comment-item');

          if (!confirm('Are you sure you want to delete this comment?')) return;

          try {
            const res = await fetch(`/posts/${postId}/comments/${commentId}`, {
              method: 'DELETE',
              credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
              commentItem.remove();
              showToast('🗑️ Comment deleted!');
            } else {
              showToast('❌ Failed to delete comment', 'error');
            }
          } catch (err) {
            console.error('Comment delete error:', err);
            showToast('❌ Error deleting comment', 'error');
          }
        }
      });
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
      if (isImage) preview.src = URL.createObjectURL(file);
      else preview.textContent = file.name;
      previewItem.appendChild(preview);
      this.elements.previewContainer.appendChild(previewItem);
    }

    async handlePostSubmit(e) {
      e.preventDefault();
      if (!this.isAuthenticated) return alert('Please log in.');

      const formData = new FormData();
      formData.append('title', this.elements.postTitle.value);
      formData.append('text', this.elements.postContent.value);
      [...this.elements.imageInput.files, ...this.elements.videoInput.files].forEach(file => formData.append('media', file));

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
        const filteredPosts = data.posts.filter(p => !p.isDeleted);
        this.renderPosts(filteredPosts);
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
              <div class="edit-delete-buttons" style="margin-left:auto;">
                <button class="edit-btn" onclick="editPost('${post._id}')">✏️ Edit</button>
                <button class="delete-btn" onclick="safeDeletePost('${post._id}', this)">🗑️ Delete</button>
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
        const comments = data.comments?.filter(c => !c.isDeleted) || [];
        container.innerHTML = comments.map(c => `
          <div class="comment-item">
            <div class="comment-header" style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <span class="comment-author">${c.userId?.username || 'Anonymous'}</span>
                <span class="comment-date">${new Date(c.createdAt).toLocaleString('en-US')}</span>
              </div>
              ${c.userId?._id === this.currentUserId ? `
              <div class="edit-delete-buttons" style="display: flex; gap: 4px;">
                <button class="edit-btn" type="button" onclick="window.editComment('${postId}', '${c._id}', this)">✏️</button>
                <button class="delete-btn" type="button" data-post-id="${postId}" data-comment-id="${c._id}">🗑️</button>
              </div>` : ''}
            </div>
            <p class="comment-text" data-comment-id="${c._id}">${c.text}</p>
          </div>
        `).join('');
      } catch (error) {
        console.error('Load comments error:', error);
        container.innerHTML = '<div class="no-comments">Failed to load comments.</div>';
      }
    }
  }

  new ForumApp();
});





window.safeDeletePost = async function (postId, button) {
  if (!confirm('Are you sure you want to delete this post?')) return;

  try {
    const res = await fetch(`/posts/${postId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const data = await res.json();
    if (data.success) {
      button.closest('.post').remove();
      showToast('🗑️ Post deleted!');
    } else {
      showToast('❌ Failed to delete post', 'error');
    }
  } catch (err) {
    console.error('Post delete error:', err);
    showToast('❌ Error deleting post', 'error');
  }
};

window.safeDeleteComment = async function (postId, commentId, button) {
  if (!confirm('Are you sure you want to delete this comment?')) return;

  try {
    const res = await fetch(`/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const data = await res.json();
    if (data.success) {
      button.closest('.comment-item').remove();
      showToast('🗑️ Comment deleted!');
    } else {
      showToast('❌ Failed to delete comment', 'error');
    }
  } catch (err) {
    console.error('Comment delete error:', err);
    showToast('❌ Error deleting comment', 'error');
  }
};

// ===== POST FUNCTIONS =====
window.editPost = function (postId) {
  const postEl = document.querySelector(`.post[data-id="${postId}"]`);
  const titleEl = postEl.querySelector('.post-title');
  const textEl = postEl.querySelector('.post-text');
  const originalTitle = titleEl.innerText;
  const originalText = textEl.innerText;

  const titleInput = document.createElement('input');
  titleInput.className = 'post-title-input';
  titleInput.value = originalTitle;

  const textArea = document.createElement('textarea');
  textArea.className = 'post-textbox';
  textArea.value = originalText;

  titleEl.replaceWith(titleInput);
  textEl.replaceWith(textArea);

  const buttonsWrapper = postEl.querySelector('.edit-delete-buttons');
  buttonsWrapper.innerHTML = '';

  const saveBtn = document.createElement('button');
  saveBtn.textContent = '💾 Save';
  saveBtn.className = 'edit-btn';
  saveBtn.onclick = async () => {
    const updatedTitle = titleInput.value.trim();
    const updatedText = textArea.value.trim();
    if (!updatedTitle || !updatedText) return;

    try {
      const res = await fetch(`/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: updatedTitle, text: updatedText })
      });

      const data = await res.json();
      if (data.success) {
        const newTitle = document.createElement('h3');
        newTitle.className = 'post-title';
        newTitle.innerText = updatedTitle;

        const newText = document.createElement('p');
        newText.className = 'post-text';
        newText.innerText = updatedText;

        titleInput.replaceWith(newTitle);
        textArea.replaceWith(newText);

        buttonsWrapper.innerHTML = `
          <button class="edit-btn" onclick="editPost('${postId}')">✏️ Edit</button>
          <button class="delete-btn" onclick="deletePost('${postId}')">🗑️ Delete</button>
        `;

        showToast('✅ Post updated!');
      } else {
        showToast('❌ Failed to update post', 'error');
      }
    } catch (err) {
      console.error('Post update error:', err);
      showToast('❌ Error updating post', 'error');
    }
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '✖ Cancel';
  cancelBtn.className = 'delete-btn';
  cancelBtn.onclick = () => {
    titleInput.replaceWith(titleEl);
    textArea.replaceWith(textEl);
    buttonsWrapper.innerHTML = `
      <button class="edit-btn" onclick="editPost('${postId}')">✏️ Edit</button>
      <button class="delete-btn" onclick="deletePost('${postId}')">🗑️ Delete</button>
    `;
  };

  buttonsWrapper.appendChild(saveBtn);
  buttonsWrapper.appendChild(cancelBtn);
};

window.showToast = function(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg z-50 text-white ${type === 'error' ? 'bg-red-600' : 'bg-green-600'}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
};

window.toggleCommentInput = function(postId) {
  const inputWrapper = document.getElementById(`comment-input-wrapper-${postId}`);
  if (!inputWrapper) return;
  inputWrapper.style.display = inputWrapper.style.display === 'none' ? 'block' : 'none';
};

window.toggleLike = function(postId, button) {
  fetch(`/posts/${postId}/like`, {
    method: 'POST',
    credentials: 'include'
  })
    .then(res => res.json())
    .then(data => {
      if (data.success && Array.isArray(data.likes)) {
        const likeCountSpan = button.querySelector('.like-count');
        likeCountSpan.textContent = data.likes.length;
        button.classList.toggle('liked');
      } else {
        window.showToast('❌ Failed to like post (invalid response)', 'error');
        console.warn('Like API response:', data);
      }
    })
    .catch(err => {
      console.error('Like error:', err);
      window.showToast('❌ Error liking post', 'error');
    });
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
      body: JSON.stringify({ text })
    });

    const data = await res.json();
    if (data.success) {
      textarea.value = '';
      const commentHTML = `
        <div class="comment-item">
          <div class="comment-header" style="display: flex; justify-content: space-between;">
            <div>
              <span class="comment-author">${data.comment.userId?.username || 'You'}</span>
              <span class="comment-date">${new Date(data.comment.createdAt).toLocaleString('en-US')}</span>
            </div>
          </div>
          <p class="comment-text">${data.comment.text}</p>
        </div>`;
      commentsList.innerHTML += commentHTML;
      showToast('💬 Comment posted!');
    } else {
      showToast('❌ Failed to comment', 'error');
    }
  } catch (err) {
    console.error('Submit comment error:', err);
    showToast('❌ Error posting comment', 'error');
  }
};

window.editComment = async function (postId, commentId, button) {
  const commentItem = button.closest('.comment-item');
  const commentTextEl = commentItem.querySelector('.comment-text');
  const originalText = commentTextEl.innerText;

  const textarea = document.createElement('textarea');
  textarea.className = 'comment-input';
  textarea.value = originalText;
  commentTextEl.replaceWith(textarea);

  const buttonsWrapper = commentItem.querySelector('.edit-delete-buttons');
  buttonsWrapper.innerHTML = '';

  const saveBtn = document.createElement('button');
  saveBtn.textContent = '💾 Save';
  saveBtn.className = 'edit-btn';
  saveBtn.type = 'button';
  saveBtn.onclick = async () => {
    const updatedText = textarea.value.trim();
    if (!updatedText) return;

    try {
      const res = await fetch(`/posts/${postId}/comment/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: updatedText })
      });

      const data = await res.json();
      if (data.success) {
        const updatedP = document.createElement('p');
        updatedP.className = 'comment-text';
        updatedP.dataset.commentId = commentId;
        updatedP.innerText = updatedText;
        textarea.replaceWith(updatedP);

        buttonsWrapper.innerHTML = `
          <button class="edit-btn" onclick="window.editComment('${postId}', '${commentId}', this)" type="button">✏️</button>
          <button class="delete-btn" onclick="window.safeDeleteComment('${postId}', '${commentId}', this)" type="button">🗑️</button>
        `;
        showToast('✅ Comment updated!');
      } else {
        showToast('❌ Failed to update comment', 'error');
      }
    } catch (err) {
      console.error('Comment update error:', err);
      showToast('❌ Error updating comment', 'error');
    }
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '✖ Cancel';
  cancelBtn.className = 'delete-btn';
  cancelBtn.type = 'button';
  cancelBtn.onclick = () => {
    textarea.replaceWith(commentTextEl);
    buttonsWrapper.innerHTML = `
      <button class="edit-btn" onclick="window.editComment('${postId}', '${commentId}', this)" type="button">✏️</button>
      <button class="delete-btn" onclick="window.safeDeleteComment('${postId}', '${commentId}', this)" type="button">🗑️</button>
    `;
  };

  buttonsWrapper.appendChild(saveBtn);
  buttonsWrapper.appendChild(cancelBtn);
};

