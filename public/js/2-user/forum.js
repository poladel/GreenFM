document.addEventListener('DOMContentLoaded', function () {
    class ForumApp {
      constructor() {
        this.selectedFiles = [];  // Initialize this as an array for file uploads
        this.currentUserId = window.currentUserId || null;  // Get the current user ID
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
      }
  
      checkRequiredElements() {
        const required = ['postForm', 'postsContainer', 'postButton', 'postTitle'];
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
  
      handleFileSelect(event) {
        const files = event.target.files;
        if (files.length) {
          this.selectedFiles = Array.from(files);  // Ensure it's an array
          this.previewFiles();
        }
      }
  
      previewFiles() {
        this.elements.previewContainer.innerHTML = ''; // Clear existing previews
        this.selectedFiles.forEach((file, index) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const filePreview = document.createElement('div');
            filePreview.className = 'file-preview relative';
      
            // Display image preview
            if (file.type.startsWith('image/')) {
              filePreview.innerHTML = `
                <div class="preview-item relative">
                  <img src="${e.target.result}" alt="${file.name}" class="preview-image" />
                  <button class="remove-file-btn absolute top-0 right-0 p-2 text-white bg-gray-800 rounded-full" data-index="${index}">✖</button>
                </div>`;
            } 
            // Display video preview
            else if (file.type.startsWith('video/')) {
              filePreview.innerHTML = `
                <div class="preview-item relative">
                  <video controls class="preview-video w-full max-w-md rounded shadow mx-auto" oncontextmenu="return false">
                    <source src="${e.target.result}" type="${file.type}">
                  </video>
                  <button class="remove-file-btn absolute top-0 right-0 p-2 text-white bg-gray-800 rounded-full" data-index="${index}">✖</button>
                </div>`;
            }
      
            // Append the preview to the container
            this.elements.previewContainer.appendChild(filePreview);
      
            // Attach event listener to remove button (X)
            const removeButton = filePreview.querySelector('.remove-file-btn');
            removeButton.addEventListener('click', () => this.removeFile(index));
          };
          reader.readAsDataURL(file);
        });
      }
      
      removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.previewFiles(); // Re-render the previews
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
        const options = [...this.elements.pollOptionsWrapper.querySelectorAll('input')].map(input => input.value.trim()).filter(opt => opt);
      
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
      
          // Ensure the response is valid JSON
          if (!res.ok) {
            throw new Error(`Server error: ${res.statusText}`);
          }
      
          const data = await res.json(); // Process the JSON response
      
          // Check if the poll was successfully posted
          if (data.success) {
            showToast('✅ Poll posted!');
            this.resetPollForm();
            this.loadPosts();  // Reload posts after the poll has been posted successfully
          } else {
            // Handle unsuccessful submission
            showToast('❌ Failed to post poll', 'error');
          }
        } catch (err) {
          console.error('Poll submit error:', err);
          showToast('❌ Error submitting poll', 'error');
        }
      }
          
  
      resetPollForm() {
        this.elements.pollForm.reset();
        this.elements.pollOptionsWrapper.innerHTML = ` 
          <input type="text" name="pollOptions[]" placeholder="Option 1" class="w-full p-2 border rounded poll-input" required>
          <input type="text" name="pollOptions[]" placeholder="Option 2" class="w-full p-2 border rounded poll-input" required>
        `;
      }
  
      resetPostForm() {
        this.elements.postTitle.value = ''; // Reset post title
        this.selectedFiles = []; // Clear selected files
        this.previewFiles(); // Clear file previews
      }
  
      editPost(postId, title) {
        this.editPostId = postId;  // Store postId for editing
        this.elements.postTitle.value = title;  // Set the current title in the form
      }
  
      async handlePostSubmit(e) {
        e.preventDefault();
      
        const title = this.elements.postTitle.value.trim();
      
        if (!title) {
          return showToast('Please enter a title for the post.', 'error');
        }
      
        // Create a FormData instance
        const formData = new FormData();
        formData.append('title', title);
      
        // Check if there are selected files (image/video)
        if (this.selectedFiles.length > 0) {
          this.selectedFiles.forEach(file => {
            formData.append('media', file);  // Attach files to form data
          });
        }
      
        try {
          // Send POST request with form data to the server
          const res = await fetch('/posts', {
            method: 'POST',
            body: formData,  // Send form data with media
            credentials: 'include',
          });
      
          const data = await res.json();
      
          if (data.success) {
            showToast('✅ Post created successfully!');
            this.resetPostForm();
            this.loadPosts(); // Refresh the posts with updated content
          } else {
            showToast('❌ Failed to create post', 'error');
          }
        } catch (err) {
          console.error('Error creating post:', err);
          showToast('❌ Error creating post', 'error');
        }
      }
  
      async loadPosts(page = 1) {
        try {
          const response = await fetch(`/posts?page=${page}`, { credentials: 'include' });
          const data = await response.json();
      
          if (!data.success || !Array.isArray(data.posts)) {
            throw new Error('Invalid post response');
          }
      
          const filteredPosts = data.posts.filter(p => !p.isDeleted || p.isDeleted === undefined);
      
          this.renderPosts(filteredPosts);  // Render the posts dynamically without page refresh
          this.renderPagination(data.totalPages, data.currentPage);
        } catch (error) {
          console.error('Error loading posts:', error);
          this.elements.postsContainer.innerHTML = `<div class="error">Unable to load posts.</div>`;
        }
      }
  
      renderPosts(posts) {
        this.elements.postsContainer.innerHTML = '';  // Clear existing posts
    
        posts.forEach(post => {
            if (!post || !post._id) return;  // Skip invalid posts
    
            const div = document.createElement('div');
            div.className = 'post';
            div.dataset.id = post._id;
    
            const showControls = post.userId && post.userId._id === this.currentUserId;
            const userHasVoted = post.poll?.options?.some(o => o.votes?.some(v => v.toString() === this.currentUserId));
    
            // Format createdAt for date display
            const createdAt = post.createdAt
                ? new Date(post.createdAt).toLocaleString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                })
                : '';
    
            const likeCount = Array.isArray(post.likes) ? post.likes.length : 0;
    
            // Render Poll Section if it exists
            let pollSection = '';
            if (post.poll?.question) {
                pollSection = this.renderPollSection(post, userHasVoted);
            }
    
            div.innerHTML = `
                <div class="post-header flex justify-between items-start">
                    <div>
                        <p class="post-author text-green-700 font-bold text-lg">${post.userId?.username || 'Unknown'}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-500 mb-1">${createdAt}</p>
                        <div class="edit-delete-buttons flex gap-2 justify-end">
                            ${showControls
                                ? `
                                    <button class="edit-btn bg-blue-500 text-white px-2 py-1 rounded" onclick="editPost('${post._id}')">Edit</button>
                                    <button class="delete-btn bg-red-500 text-white px-2 py-1 rounded" onclick="safeDeletePost('${post._id}', this)">Delete</button>
                                  `
                                : ``
                            }
                        </div>
                    </div>
                </div>
    
                <h4 class="post-title text-l text-gray-800 mt-2">${post.title}</h4>
    
                <div class="post-media-container mt-3">
                    ${(post.media || []).map(media => media.type === 'image' ? 
                        `<img src="${media.url}" class="post-media post-image w-full max-w-md rounded-lg shadow-md mx-auto" />` : 
                        `<video controls class="post-media w-full max-w-md rounded shadow mx-auto" oncontextmenu="return false">
                            <source src="${media.url}" type="video/mp4">
                        </video>`).join('')}
                </div>
    
                ${pollSection}
    
                <div class="post-actions mt-4 flex space-x-4">
                    <button class="like-button ${post.liked ? 'liked text-red-500' : 'text-gray-500'}" onclick="toggleLike('${post._id}', this)">
                        ❤️ <span class="like-count">${likeCount}</span>
                    </button>
                    <button class="comment-toggle-button text-green-600 hover:underline" onclick="toggleCommentInput('${post._id}')">💬 Comment</button>
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
    
            // Highlight the voted option if user has voted
            if (userHasVoted) {
                const votedOptionButton = div.querySelector('.poll-options button');
                if (votedOptionButton) {
                    votedOptionButton.classList.add('voted'); // Apply the 'voted' class to the voted option
                }
            }
    
            // Append the newly created post div to the container
            this.elements.postsContainer.appendChild(div);
    
            // Load comments for each post
            this.loadComments(post._id, div.querySelector(`#comments-${post._id}`));
        });
    }
    

    renderPollSection(post) {
        // Calculate the total number of votes across all options
        const totalVotes = post.poll.options.reduce((sum, option) => sum + option.votes.length, 0);
      
        return `
          <div class="post-poll mt-4 text-center p-4 bg-gradient-to-r from-blue-500 via-teal-400 to-green-500 rounded-lg shadow-lg">
            <div class="text-xl font-semibold text-white mb-3">${post.poll.question}</div>
            <ul class="poll-options space-y-3 max-w-md mx-auto text-white">
              ${post.poll.options.map((opt, index) => {
                // Calculate the percentage of votes for this option
                const percentage = totalVotes ? (opt.votes.length / totalVotes) * 100 : 0;  // Handle division by zero
      
                return `
                  <li class="flex justify-start items-center bg-white border border-gray-300 px-4 py-3 rounded-xl shadow-md transition-transform transform hover:scale-105 relative">
                    <button class="text-left w-full text-gray-800 font-medium hover:bg-green-100 p-2 rounded-lg transition duration-300"
                      onclick="votePoll('${post._id}', ${index})">
                      Vote
                    </button>
                    <div class="vote-bar-container flex-1 ml-3 bg-gray-300 rounded-full relative">
                      <div class="vote-bar" style="width: ${percentage}%;"></div>
                      <span class="text-sm text-gray-500 ml-3 vote-count">${opt.votes.length} votes</span>
                    </div>
                  </li>
                `;
              }).join('')}
            </ul>
          </div>
        `;
      }
      
       
  
      renderPagination(totalPages, currentPage) {
        const paginationContainer = this.elements.paginationContainer;
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
  
          container.innerHTML = comments.map(c => `
            <div class="comment-item">
              <div class="comment-header flex justify-between items-center">
                <div class="text-sm">
                  <span class="font-bold text-green-600 text-lg">${c.userId?.username || 'Anonymous'}</span>
                  <span class="ml-2 text-xs text-gray-500">${new Date(c.createdAt).toLocaleString('en-US')}</span>
                </div>
                <div class="edit-delete-buttons flex gap-2">
                  <button class="edit-btn" onclick="window.editComment('${postId}', '${c._id}', this)"></button>
                  <button class="delete-btn" onclick="window.safeDeleteComment('${postId}', '${c._id}', this)"></button>
                </div>
              </div>
              <p class="comment-text text-gray-700 mt-1" data-comment-id="${c._id}">${c.text}</p>
            </div>`).join('');
        } catch (error) {
          console.error('Load comments error:', error);
          container.innerHTML = '<div class="text-red-600">Failed to load comments.</div>';
        }
      }
    }
    
  
    // Initialize the app
    window.app = new ForumApp();
  });
  
  //-----------------------------------------------------------------------------------------------------------------------------------------//
  //-----------------------------------------------------------------------------------------------------------------------------------------//
  //-----------------------------------------------------------------------------------------------------------------------------------------//
  
  
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
  
  window.editPost = function (postId) {
    const postEl = document.querySelector(`.post[data-id="${postId}"]`);
    if (!postEl) return;
  
    const titleEl = postEl.querySelector('.post-title');
    const originalTitle = titleEl.innerText;
  
    // Replace with input for title only
    const titleInput = document.createElement('input');
    titleInput.className = 'post-title-input w-full border p-2 rounded mb-2';
    titleInput.value = originalTitle;
  
    titleEl.replaceWith(titleInput);
  
    // Hide media and poll sections during edit (if they exist)
    const mediaEl = postEl.querySelector('.post-media-container');
    const pollEl = postEl.querySelector('.post-poll');
    
    if (mediaEl) {
      mediaEl.style.display = 'none';
    }
    if (pollEl) {
      pollEl.style.display = 'none';
    }
  
    // Replace buttons with Save and Cancel
    const buttonsWrapper = postEl.querySelector('.edit-delete-buttons');
    buttonsWrapper.innerHTML = '';
  
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Save';
    saveBtn.className = 'edit-btn bg-green-600 text-white px-3 py-1 rounded';
    saveBtn.onclick = async () => {
      const updatedTitle = titleInput.value.trim();
      if (!updatedTitle) return showToast('❌ Title is required.', 'error');
  
      try {
        const res = await fetch(`/posts/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ title: updatedTitle })
        });
        const data = await res.json();
  
        if (data.success) {
          showToast('✅ Post updated!');
  
          // Replace input back with updated title
          const updatedTitleEl = document.createElement('h3');
          updatedTitleEl.className = 'post-title font-bold text-xl text-gray-800 mt-2';
          updatedTitleEl.innerText = updatedTitle;
  
          titleInput.replaceWith(updatedTitleEl);
  
          // Restore media and poll sections if they exist
          if (mediaEl) {
            mediaEl.style.display = 'block';
          }
          if (pollEl) {
            pollEl.style.display = 'block';
          }
  
          // Restore buttons
          buttonsWrapper.innerHTML = `
            <button class="edit-btn bg-blue-500 text-white px-2 py-1 rounded" onclick="editPost('${postId}')">✏️ Edit</button>
            <button class="delete-btn bg-red-500 text-white px-2 py-1 rounded" onclick="safeDeletePost('${postId}', this)">🗑️ Delete</button>
          `;
        } else {
          showToast('❌ Failed to update post', 'error');
        }
      } catch (err) {
        console.error('Update error:', err);
        showToast('❌ Error updating post', 'error');
      }
    };
  
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '✖ Cancel';
    cancelBtn.className = 'delete-btn bg-gray-300 text-black px-3 py-1 rounded';
    cancelBtn.onclick = () => window.app.loadPosts();  // Reload posts without saving changes
  
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
          button.classList.toggle('liked');  // Toggles the 'liked' class to change the button's state
          
          // Show different toast messages based on whether it's a like or unlike
          const message = button.classList.contains('liked') 
            ? '❤️ Liked post!' 
            : '💔 Unliked post!';
          
          showToast(data.message || message);
        } else {
          window.showToast('Failed to like/unlike post (invalid response)', 'error');
          console.warn('Like API response:', data);
        }
      })
      .catch(err => {
        console.error('Like error:', err);
        window.showToast('Error liking/unliking post', 'error');
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
                  <button class="edit-btn" type="button" onclick="window.editComment('${postId}', '${data.comment._id}', this)"></button>
                  <button class="delete-btn" type="button" data-post-id="${postId}" data-comment-id="${data.comment._id}"></button>
                </div>
              ` : ''}
            </div>
            <p class="comment-text" data-comment-id="${data.comment._id}">${data.comment.text}</p>
          </div>`;
  
        commentsList.innerHTML += commentHTML;
        showToast('Comment posted!');
      } else {
        showToast('Failed to comment', 'error');
      }
    } catch (err) {
      console.error('Submit comment error:', err);
      showToast('Error posting comment', 'error');
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
          showToast('Comment updated!');
        } else {
          showToast('Failed to update comment', 'error');
        }
      } catch (err) {
        console.error('Comment update error:', err);
        showToast('Error updating comment', 'error');
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
  
  function vote(index) {
    voteCounts[index]++;
    document.getElementById(`count-${index}`).textContent = voteCounts[index];
    showPollToast('Vote submitted!');
  }
  
  window.votePoll = async function(postId, optionIndex) {
    try {
        // Send the vote request to the server
        const res = await fetch('/poll/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ postId, optionIndex })
        });

        const data = await res.json();

        if (data.success) {
            showToast('✅ Vote submitted!');

            // Update the vote count for the selected option
            const voteCountElement = document.getElementById(`vote-count-${postId}-${optionIndex}`);
            if (voteCountElement) {
                voteCountElement.textContent = `${data.poll.options[optionIndex].votes.length} votes`;
            }

            // Get all the poll option buttons for this post
            const pollOptionsButtons = document.querySelectorAll(`#post-${postId} .poll-options button`);

            // Get the bar container for the selected option
            const selectedOptionBar = document.querySelector(`#post-${postId} .poll-options li:nth-child(${optionIndex + 1}) .vote-bar .bar`);
            
            if (selectedOptionBar) {
                // Calculate the width of the bar based on the percentage of votes
                const totalVotes = data.poll.totalVotes; // Assuming you pass the total votes count
                const selectedVotes = data.poll.options[optionIndex].votes.length;
                const percentage = (selectedVotes / totalVotes) * 100;

                // Animate the width of the bar to show the new percentage of votes
                selectedOptionBar.style.transition = 'width 0.5s ease'; // Smooth transition for bar width change
                selectedOptionBar.style.width = `${percentage}%`; // Update the width of the bar

                // Keep the color consistent (you can customize this color as needed)
                selectedOptionBar.style.backgroundColor = '#10b981'; // Green color for the bar
            }

            // Optionally, reload posts to reflect the latest data
            await window.app.loadPosts(); // Refresh the posts with updated vote data
        } else {
            showToast('You have already voted.', 'error');
        }
    } catch (err) {
        console.error('Vote error:', err);
        showToast('❌ Error submitting vote', 'error');
    }
};

  
  
  window.editPoll = function (postId) {
    const postEl = document.querySelector(`.post[data-id="${postId}"]`);
    if (!postEl) return;
  
    const pollContainer = postEl.querySelector('.post-poll');
    if (!pollContainer) return;
  
    const questionText = pollContainer.querySelector('.poll-question-text')?.innerText;
    const pollOptions = [...pollContainer.querySelectorAll('.poll-options li')]
      .map(li => li.innerText.replace(/\s+\d+ votes$/, '').trim());
  
    const titleInput = postEl.querySelector('.post-title-input');
    const textArea = postEl.querySelector('.post-textbox');
  
    if (titleInput) titleInput.disabled = true;
    if (textArea) textArea.disabled = true;
  
    // Clear the existing poll container
    pollContainer.innerHTML = '';
  
    // Create editable question input
    const questionInput = document.createElement('input');
    questionInput.className = 'post-title-input poll-question-input w-full p-2 border rounded mb-2';
    questionInput.value = questionText || '';
    pollContainer.appendChild(questionInput);
  
    // Create editable options
    const optionWrapper = document.createElement('div');
    optionWrapper.className = 'space-y-2';
    pollOptions.forEach(opt => {
      const input = document.createElement('input');
      input.className = 'w-full p-2 border rounded';
      input.value = opt;
      optionWrapper.appendChild(input);
    });
    pollContainer.appendChild(optionWrapper);
  
    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Save Poll';
    saveBtn.className = 'mt-3 bg-green-600 text-white px-4 py-2 rounded';
    saveBtn.onclick = async () => {
      const updatedQuestion = questionInput.value.trim();
      const updatedOptions = [...optionWrapper.querySelectorAll('input')].map(i => i.value.trim()).filter(Boolean);
  
      if (!updatedQuestion || updatedOptions.length < 2) {
        return showToast('❌ At least 2 options required', 'error');
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
          setTimeout(() => location.reload(), 300);
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
  
  
  function confirmVote(postId, optionIndex, optionText) {
    selectedPostId = postId;
    selectedOptionIndex = optionIndex;
    selectedOptionText = optionText;
  
    const modal = document.getElementById('confirmVoteModal');
    modal.querySelector('#vote-confirm-text').textContent = `Are you sure you want to vote for: "${optionText}"? You cannot change your vote later.`;
    modal.classList.remove('hidden');
  }
  
  function closeVoteModal() {
    selectedPostId = null;
    selectedOptionIndex = null;
    selectedOptionText = null;
    document.getElementById('confirmVoteModal').classList.add('hidden');
  }
  
  function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      container.style.position = 'fixed';
      container.style.bottom = '10px';
      container.style.left = '50%';
      container.style.transform = 'translateX(-50%)';
      container.style.zIndex = '1000';
      document.body.appendChild(container);
    }
  
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.backgroundColor = type === 'success' ? 'green' : 'red';
    toast.style.color = 'white';
    toast.style.padding = '10px';
    toast.style.margin = '5px 0';
    toast.style.borderRadius = '5px';
    toast.style.fontSize = '14px';
    
    toast.innerText = message;
  
    document.getElementById('toast-container').appendChild(toast);
  
    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
  