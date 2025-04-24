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
        postButton: document.getElementById('postButton'),
        pollForm: document.getElementById('poll-form'),
        addOptionBtn: document.getElementById('add-option-button'),
        pollOptionsWrapper: document.getElementById('poll-options-wrapper'),
        pollQuestionInput: document.getElementById('poll-question'),
        pollResults: document.getElementById('poll-results')
      };
      this.isAuthenticated = this.elements.postButton?.dataset.authenticated === 'true';
    }

    init() {
      if (!this.checkRequiredElements()) return;
      this.setupEventListeners();
      this.loadPosts();
      setTimeout(() => this.loadPosts(), 200); // Show the newly posted poll

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
      this.elements.addOptionBtn?.addEventListener('click', () => this.handleAddPollOption());
      this.elements.pollForm?.addEventListener('submit', (e) => this.handlePollSubmit(e));
    }

    handleAddPollOption() {
      const currentCount = this.elements.pollOptionsWrapper.querySelectorAll('input').length;
      if (currentCount >= 5) return alert('You can only add up to 5 options.');

      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'pollOptions[]';
      input.placeholder = `Option ${currentCount + 1}`;
      input.className = 'w-full p-2 border rounded poll-input mt-1';
      this.elements.pollOptionsWrapper.appendChild(input);
    }

    async handlePollSubmit(e) {
      e.preventDefault();
      const question = this.elements.pollQuestionInput.value.trim();
      const options = [...this.elements.pollOptionsWrapper.querySelectorAll('input')]
        .map(input => input.value.trim())
        .filter(opt => opt);
    
      if (!question || options.length < 2) {
        return showToast('❌ Enter a question and at least 2 options', 'error');
      }
    
      try {
        const res = await fetch('/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ question, options })
        });
        const data = await res.json();
    
        if (data.success) {
          showToast('✅ Poll posted!');
          
          // Reset form
          this.elements.pollForm.reset();
          this.elements.pollOptionsWrapper.innerHTML = `
            <input type="text" name="pollOptions[]" placeholder="Option 1" class="w-full p-2 border rounded poll-input" required>
            <input type="text" name="pollOptions[]" placeholder="Option 2" class="w-full p-2 border rounded poll-input" required>
          `;
    
          // 🔁 Dynamically reload posts to show the newly created poll
          this.loadPosts();
        } else {
          showToast('❌ Failed to post poll', 'error');
        }
      } catch (err) {
        console.error('Poll submit error:', err);
        showToast('❌ Error submitting poll', 'error');
      }
    }
    

    async loadPolls() {
      try {
        const res = await fetch('/poll');
        const data = await res.json();
        if (data.success && data.polls.length > 0) {
          const poll = data.polls[0];
          this.elements.pollQuestionInput.value = poll.question;
          this.elements.pollResults.innerHTML = '';
          poll.options.forEach((opt, i) => {
            const result = document.createElement('div');
            result.className = 'flex justify-between items-center border p-2 rounded my-1';
            result.innerHTML = `
              <span>${opt.text}</span>
              <span class="text-sm text-gray-600">${opt.votes} votes</span>
            `;
            this.elements.pollResults.appendChild(result);
          });
        }
      } catch (error) {
        console.error('Error loading poll results:', error);
      }
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

  const question = this.elements.pollQuestionInput?.value.trim();
  const options = [...this.elements.pollOptionsWrapper?.querySelectorAll('input[name="pollOptions[]"]')]
    .map(input => input.value.trim())
    .filter(opt => opt);

  if (question && options.length >= 2) {
    formData.append('pollQuestion', question);
    options.forEach(opt => formData.append('pollOptions[]', opt));
  }

  try {
    const res = await fetch('/posts', { method: 'POST', credentials: 'include', body: formData });
    const data = await res.json();

    if (!data.success) throw new Error('Post failed');

    this.elements.postTitle.value = '';
    this.elements.postContent.value = '';
    this.elements.imageInput.value = '';
    this.elements.videoInput.value = '';
    this.elements.previewContainer.innerHTML = '';

    // ✅ Add slight delay before reloading posts to ensure post is saved
    setTimeout(() => this.loadPosts(), 300);

    showToast('✅ Post submitted successfully!', 'success');
  } catch (error) {
    console.error('Post error:', error);
    alert('Error submitting post');
  }
}


    async loadPosts(page = 1) {
      try {
        const response = await fetch(`/posts?page=${page}`, { credentials: 'include' });
        const data = await response.json();
        if (!data.success || !Array.isArray(data.posts)) throw new Error('Invalid post response');
        const filteredPosts = data.posts.filter(p => !p.isDeleted || p.isDeleted === undefined);
        this.renderPosts(filteredPosts);
        this.renderPagination(data.totalPages, data.currentPage);
      } catch (error) {
        console.error('Error loading posts:', error);
        this.elements.postsContainer.innerHTML = `<div class="error">Unable to load posts.</div>`;
      }
    }

    renderPosts(posts) {
      this.elements.postsContainer.innerHTML = '';
      posts.forEach(post => {
        const div = document.createElement('div');
        div.className = 'post';
        div.dataset.id = post._id;
    
        const showControls = post.userId && post.userId._id === this.currentUserId;
        const userHasVoted = post.poll?.options?.some(o =>
          o.votes?.some(v => v.toString() === this.currentUserId)
        );
    
        // Poll section (conditional: edit, or add poll)
        let pollSection = '';
        if (post.poll?.question) {
          pollSection = `
            <div class="post-poll mt-4 p-3 bg-gray-50 border border-gray-300 rounded-lg" data-post-id="${post._id}">
              <p class="font-semibold mb-2">📊 <span class="poll-question-text">${post.poll.question}</span></p>
              <ul class="poll-options space-y-1">
                ${post.poll.options.map((opt, i) => {
                  return userHasVoted
                    ? `<li class="flex justify-between items-center border px-2 py-1 rounded">
                        <span>${opt.text}</span>
                        <span class="text-sm text-gray-500">${opt.votes?.length || 0} votes</span>
                       </li>`
                    : `<li>
                        <button onclick="votePoll('${post._id}', ${i})" class="w-full text-left px-3 py-1 border rounded hover:bg-green-50">
                          ${opt.text}
                        </button>
                       </li>`;
                }).join('')}
              </ul>
              ${showControls && !userHasVoted ? `
                <div class="text-right mt-3">
                  <button onclick="editPoll('${post._id}', '${post.poll.question}', ${JSON.stringify(post.poll.options).replace(/"/g, '&quot;')})"
                    class="text-sm text-blue-600 hover:underline">✏️ Edit Poll</button>
                </div>` : ''}
            </div>
          `;
        } else if (showControls) {
          pollSection = `
            <div class="text-right mt-4">
              <button onclick="addPollToPost('${post._id}')" class="text-sm text-green-600 hover:underline">➕ Add Poll</button>
            </div>`;
        }
    
        div.innerHTML = `
          <div class="post-header">
            <p class="post-author text-green-700 font-bold text-lg">${post.userId?.username || 'Unknown'}</p>
            ${showControls ? `
              <div class="edit-delete-buttons" style="margin-left:auto;">
                <button class="edit-btn bg-blue-500 text-white px-2 py-1 rounded" onclick="editPost('${post._id}')">✏️ Edit</button>
                <button class="delete-btn bg-red-500 text-white px-2 py-1 rounded" onclick="safeDeletePost('${post._id}', this)">🗑️ Delete</button>
              </div>` : ''}
          </div>
    
          <h3 class="post-title font-bold text-xl text-gray-800 mt-2">${post.title}</h3>
          <p class="post-text text-gray-700 mt-1">${post.text}</p>
    
          <div class="post-media-container mt-3">
            ${post.media.map(media => media.type === 'image'
              ? `<img src="${media.url}" class="post-media post-image w-full max-w-md rounded-lg shadow-md" />`
              : `<video controls class="post-media w-full max-w-md rounded shadow" oncontextmenu="return false">
                   <source src="${media.url}" type="video/mp4">
                 </video>`
            ).join('')}
          </div>
    
          ${pollSection}
    
          <div class="post-actions mt-4 flex space-x-4">
            <button class="like-button ${post.liked ? 'liked text-red-500' : 'text-gray-500'}" onclick="toggleLike('${post._id}', this)">
              ❤️ <span class="like-count">${post.likes?.length || 0}</span>
            </button>
            <button class="comment-toggle-button text-blue-600 hover:underline" onclick="toggleCommentInput('${post._id}')">💬 Comment</button>
          </div>
    
          <div class="interaction-panel mt-4" data-post-id="${post._id}">
            <div class="comment-input-wrapper" id="comment-input-wrapper-${post._id}" style="display: none;">
              <textarea class="comment-input w-full p-2 border border-gray-300 rounded" placeholder="Write a comment..."></textarea>
              <div class="comment-button-wrap mt-2">
                <button class="bg-green-600 text-white px-3 py-1 rounded" onclick="submitComment('${post._id}', this)">Post Comment</button>
              </div>
            </div>
            <div class="comments-list mt-4 space-y-2" id="comments-${post._id}"></div>
          </div>
        `;
    
        this.elements.postsContainer.appendChild(div);
        this.loadComments(post._id, div.querySelector(`#comments-${post._id}`));
      });
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

    async loadComments(postId, container) {
      try {
        const res = await fetch(`/posts/${postId}/comments`, { credentials: 'include' });
        const data = await res.json();
        const comments = data.comments?.filter(c => !c.isDeleted) || [];
    
        container.innerHTML = comments.map(c => {
          const isOwner = c.userId?._id === window.currentUserId;
    
          return `
            <div class="comment-item">
              <div class="comment-header flex justify-between items-center">
                <div class="text-sm">
                  <span class="font-bold text-green-600 text-lg">${c.userId?.username || 'Anonymous'}</span>
                  <span class="ml-2 text-xs text-gray-500">${new Date(c.createdAt).toLocaleString('en-US')}</span>
                </div>
                ${isOwner ? `
                  <div class="edit-delete-buttons flex gap-2">
                    <button class="edit-btn" onclick="window.editComment('${postId}', '${c._id}', this)">✏️</button>
                    <button class="delete-btn" onclick="window.safeDeleteComment('${postId}', '${c._id}', this)">🗑️</button>
                  </div>
                ` : ''}
              </div>
              <p class="comment-text text-gray-700 mt-1" data-comment-id="${c._id}">${c.text}</p>
            </div>
          `;
        }).join('');
    
      } catch (error) {
        console.error('Load comments error:', error);
        container.innerHTML = '<div class="text-red-600">Failed to load comments.</div>';
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


function vote(index) {
  voteCounts[index]++;
  document.getElementById(`count-${index}`).textContent = voteCounts[index];
  showPollToast('✅ Vote submitted!');
}

function showPollToast(message) {
  const toast = document.getElementById('poll-toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 300);
  }, 2000);
}



// ===== POST FUNCTIONS =====
window.editPost = function (postId) {
  const postEl = document.querySelector(`.post[data-id="${postId}"]`);
  const titleEl = postEl.querySelector('.post-title');
  const textEl = postEl.querySelector('.post-text');
  const pollEl = postEl.querySelector('.post-poll');
  const originalTitle = titleEl.innerText;
  const originalText = textEl.innerText;

  // Only allow edit if not editing poll
  if (postEl.querySelector('.poll-question-input')) return;

  // Create editable inputs
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
        showToast('✅ Post updated!');
        location.reload();
      } else {
        showToast('❌ Failed to update post', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('❌ Error updating post', 'error');
    }
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '✖ Cancel';
  cancelBtn.className = 'delete-btn';
  cancelBtn.onclick = () => location.reload();

  buttonsWrapper.appendChild(saveBtn);
  buttonsWrapper.appendChild(cancelBtn);
};


  const buttonsWrapper = postEl.querySelector('.edit-delete-buttons');
  buttonsWrapper.innerHTML = '';

  const saveBtn = document.createElement('button');
  saveBtn.textContent = '💾 Save';
  saveBtn.className = 'edit-btn';
  saveBtn.onclick = async () => {
    const updatedTitle = titleInput.value.trim();
    const updatedText = textArea.value.trim();
    const updatedPollQuestion = pollEl?.querySelector('.poll-question-input')?.value.trim();
    const updatedPollOptions = pollInputs.map(i => i.value.trim()).filter(Boolean);

    if (!updatedTitle || !updatedText) return;

    try {
      const res = await fetch(`/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: updatedTitle,
          text: updatedText,
          ...(updatedPollQuestion && updatedPollOptions.length >= 2
            ? { poll: { question: updatedPollQuestion, options: updatedPollOptions } }
            : {})
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast('✅ Post updated!');
        location.reload(); // You can replace this with a rerender if you want smoother UX
      } else {
        showToast('❌ Failed to update post', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('❌ Error updating post', 'error');
    }
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '✖ Cancel';
  cancelBtn.className = 'delete-btn';
  cancelBtn.onclick = () => location.reload();

  buttonsWrapper.appendChild(saveBtn);
  buttonsWrapper.appendChild(cancelBtn);
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
        showToast(data.message || '❤️ Liked post!');
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

      // ✅ Check if user is authenticated and same user
      const isOwner = data.comment.userId?._id === window.currentUserId;

      const commentHTML = `
        <div class="comment-item">
          <div class="comment-header" style="display: flex; justify-content: space-between;">
            <div>
              <span class="comment-author">${data.comment.userId?.username || 'You'}</span>
              <span class="comment-date">${new Date(data.comment.createdAt).toLocaleString('en-US')}</span>
            </div>
            ${isOwner ? `
              <div class="edit-delete-buttons" style="display: flex; gap: 4px;">
                <button class="edit-btn" type="button" onclick="window.editComment('${postId}', '${data.comment._id}', this)">✏️</button>
                <button class="delete-btn" type="button" data-post-id="${postId}" data-comment-id="${data.comment._id}">🗑️</button>
              </div>
            ` : ''}
          </div>
          <p class="comment-text" data-comment-id="${data.comment._id}">${data.comment.text}</p>
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

window.votePoll = async function(postId, optionIndex) {
  try {
    const res = await fetch('/poll/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ postId, optionIndex })
    });

    const data = await res.json();
    if (data.success) {
      showToast('✅ Vote submitted!');
      setTimeout(() => {
        const app = new ForumApp(); // reload posts to update vote view
      }, 300);
    } else {
      showToast('❌ Unable to vote', 'error');
    }
  } catch (err) {
    console.error('Vote error:', err);
    showToast('❌ Error submitting vote', 'error');
  }
};

window.editPoll = function(postId) {
  const pollContainer = document.querySelector(`.post-poll[data-post-id="${postId}"]`);
  const questionText = pollContainer.querySelector('.poll-question-text').innerText;

  const questionInput = document.createElement('input');
  questionInput.type = 'text';
  questionInput.value = questionText;
  questionInput.className = 'w-full border border-gray-300 rounded px-2 py-1 mb-2';

  const optionsList = pollContainer.querySelector('ul.poll-options');
  const currentOptions = Array.from(optionsList.children).map(li => li.querySelector('span')?.innerText || '');

  const newOptionsWrapper = document.createElement('div');
  newOptionsWrapper.className = 'space-y-1';
  currentOptions.forEach((opt, i) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'w-full border rounded px-2 py-1';
    input.value = opt;
    newOptionsWrapper.appendChild(input);
  });

  const saveBtn = document.createElement('button');
  saveBtn.textContent = '💾 Save Poll';
  saveBtn.className = 'mt-2 bg-green-600 text-white px-3 py-1 rounded';
  saveBtn.onclick = async () => {
    const updatedQuestion = questionInput.value.trim();
    const updatedOptions = Array.from(newOptionsWrapper.querySelectorAll('input')).map(i => i.value.trim()).filter(Boolean);

    if (!updatedQuestion || updatedOptions.length < 2) {
      return showToast('❌ Enter a question and at least 2 options', 'error');
    }

    try {
      const res = await fetch(`/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          pollQuestion: updatedQuestion,
          pollOptions: updatedOptions
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Poll updated!');
        setTimeout(() => location.reload(), 300);
      } else {
        showToast('❌ Failed to update poll', 'error');
      }
    } catch (err) {
      console.error('Poll update error:', err);
      showToast('❌ Error updating poll', 'error');
    }
  };

  pollContainer.innerHTML = '';
  pollContainer.appendChild(questionInput);
  pollContainer.appendChild(newOptionsWrapper);
  pollContainer.appendChild(saveBtn);
};

window.editPoll = function (postId) {
  const postEl = document.querySelector(`.post[data-id="${postId}"]`);
  const pollContainer = postEl.querySelector('.post-poll');
  const pollQuestion = pollContainer.querySelector('.poll-question-text')?.innerText;
  const pollOptions = [...pollContainer.querySelectorAll('.poll-options li')].map(li =>
    li.innerText.replace(/\s+\d+ votes$/, '').trim()
  );

  const titleInput = postEl.querySelector('.post-title-input');
  const textArea = postEl.querySelector('.post-textbox');
  if (titleInput) titleInput.disabled = true;
  if (textArea) textArea.disabled = true;

  // Convert poll to editable fields
  pollContainer.innerHTML = '';

  const questionInput = document.createElement('input');
  questionInput.className = 'post-title-input poll-question-input';
  questionInput.value = pollQuestion || '';
  pollContainer.appendChild(questionInput);

  const optionWrapper = document.createElement('div');
  optionWrapper.className = 'space-y-1 mt-2';

  pollOptions.forEach(opt => {
    const input = document.createElement('input');
    input.className = 'w-full border rounded px-2 py-1';
    input.value = opt;
    optionWrapper.appendChild(input);
  });

  pollContainer.appendChild(optionWrapper);

  const saveBtn = document.createElement('button');
  saveBtn.textContent = '💾 Save Poll';
  saveBtn.className = 'mt-2 bg-green-600 text-white px-3 py-1 rounded';
  saveBtn.onclick = async () => {
    const updatedQuestion = questionInput.value.trim();
    const updatedOptions = [...optionWrapper.querySelectorAll('input')].map(i => i.value.trim()).filter(Boolean);

    if (!updatedQuestion || updatedOptions.length < 2) {
      return showToast('❌ Enter a question and at least 2 options', 'error');
    }

    try {
      const res = await fetch(`/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          poll: {
            question: updatedQuestion,
            options: updatedOptions
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Poll updated!');
        location.reload();
      } else {
        showToast('❌ Failed to update poll', 'error');
      }
    } catch (err) {
      console.error('Poll update error:', err);
      showToast('❌ Error updating poll', 'error');
    }
  };

  pollContainer.appendChild(saveBtn);
};


  // Populate modal fields
  document.getElementById('edit-poll-question').value = pollQuestion;
  const optionsWrapper = document.getElementById('edit-poll-options');
  optionsWrapper.innerHTML = '';
  pollOptions.forEach((text, i) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = text;
    input.className = 'w-full p-2 border border-gray-300 rounded';
    input.dataset.index = i;
    optionsWrapper.appendChild(input);
  });

  // Disable title and content fields
  const titleInput = postEl.querySelector('.post-title-input');
  const contentTextarea = postEl.querySelector('.post-textbox');
  if (titleInput) titleInput.disabled = true;
  if (contentTextarea) contentTextarea.disabled = true;

  document.getElementById('editPollModal').dataset.postId = postId;
  document.getElementById('editPollModal').classList.remove('hidden');
};


window.submitEditPoll = async function () {
  const modal = document.getElementById('editPollModal');
  const postId = modal.dataset.postId;
  const question = document.getElementById('edit-poll-question').value.trim();
  const options = [...document.querySelectorAll('#edit-poll-options input')]
    .map(input => input.value.trim())
    .filter(opt => opt);

  if (!question || options.length < 2) {
    showToast('❌ Question and at least 2 options are required.', 'error');
    return;
  }

  try {
    const res = await fetch(`/poll/update/${postId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ question, options })
    });

    const data = await res.json();
    if (data.success) {
      showToast('✅ Poll updated!');
      closeEditPollModal();
      setTimeout(() => {
        const app = new ForumApp();
      }, 200); // refresh post view
    } else {
      showToast('❌ Failed to update poll', 'error');
    }
  } catch (err) {
    console.error('Edit poll error:', err);
    showToast('❌ Error editing poll', 'error');
  }
};

window.closeEditPollModal = function () {
  const modal = document.getElementById('editPollModal');
  const postId = modal.dataset.postId;
  const postEl = document.querySelector(`.post[data-id="${postId}"]`);

  const titleInput = postEl?.querySelector('.post-title-input');
  const contentTextarea = postEl?.querySelector('.post-textbox');
  if (titleInput) titleInput.disabled = false;
  if (contentTextarea) contentTextarea.disabled = false;

  modal.classList.add('hidden');
};

window.startPostEdit = function(postId) {
  const postEl = document.querySelector(`.post[data-id="${postId}"]`);
  const titleInput = postEl.querySelector('.post-title-input');
  const textArea = postEl.querySelector('.post-textbox');

  if (titleInput && textArea) {
    titleInput.disabled = false;
    textArea.disabled = false;
  }

  showToast('📝 You can now edit the post.');
};

window.startPollEdit = function(postId) {
  const postEl = document.querySelector(`.post[data-id="${postId}"]`);
  const titleInput = postEl.querySelector('.post-title-input');
  const textArea = postEl.querySelector('.post-textbox');

  if (titleInput && textArea) {
    titleInput.disabled = true;
    textArea.disabled = true;
  }

  // Load poll values into modal
  const question = postEl.querySelector('.poll-question-text')?.innerText;
  const options = [...postEl.querySelectorAll('.poll-options li')].map(li => li.innerText.split(/\d+ votes/)[0].trim());

  document.getElementById('edit-poll-question').value = question || '';
  const optionsContainer = document.getElementById('edit-poll-options');
  optionsContainer.innerHTML = '';
  options.forEach(opt => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = opt;
    input.className = 'w-full border border-gray-300 rounded px-4 py-2';
    optionsContainer.appendChild(input);
  });

  // Store active post ID for editing
  window.activePollEditPostId = postId;
  document.getElementById('editPollModal').classList.remove('hidden');
};

window.startPollCreate = function(postId) {
  const postEl = document.querySelector(`.post[data-id="${postId}"]`);
  const titleInput = postEl.querySelector('.post-title-input');
  const textArea = postEl.querySelector('.post-textbox');

  if (titleInput && textArea) {
    titleInput.disabled = true;
    textArea.disabled = true;
  }

  showToast('➕ Ready to add a new poll.');
  // Optional: load a modal or inline poll form here
};

