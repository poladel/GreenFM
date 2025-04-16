document.addEventListener('DOMContentLoaded', function () {
  // Main Forum App Class
  class ForumApp {
      constructor() {
          this.selectedFiles = [];
          this.currentPostId = null;
          this.cacheElements();
          this.init();
      }

      // Cache all DOM elements
      cacheElements() {
          this.elements = {
              postForm: document.getElementById('post-form'),
              previewContainer: document.getElementById('preview-container'),
              postsContainer: document.getElementById('posts-container'),
              imagePreviewModal: document.getElementById('imagePreviewModal'),
              previewedImage: document.getElementById('previewed-image'),
              postButton: document.getElementById('postButton'),
              postTitle: document.getElementById('post-title'),
              postContent: document.getElementById('post-content'),
              addImageBtn: document.getElementById('add-image-button'),
              addVideoBtn: document.getElementById('add-video-button'),
              addFileBtn: document.getElementById('add-file-button'),
              imageInput: document.getElementById('image-input'),
              videoInput: document.getElementById('video-input'),
              fileInput: document.getElementById('file-input'),
              commentModal: document.getElementById('commentModal'),
              commentText: document.getElementById('comment-text'),
              submitComment: document.getElementById('submit-comment'),
              commentsList: document.getElementById('comments-list')
          };

          this.isAuthenticated = this.elements.postButton?.dataset.authenticated === 'true';
      }

      // Initialize the app
      init() {
          if (!this.checkRequiredElements()) {
              console.error('Required elements are missing');
              return;
          }

          this.setupEventListeners();
          this.loadPosts();
      }

      // Verify all required elements exist
      checkRequiredElements() {
          const requiredElements = [
              'postForm', 'postsContainer', 'postButton',
              'postTitle', 'postContent'
          ];

          return requiredElements.every(el => {
              if (!this.elements[el]) {
                  console.error(`Missing required element: ${el}`);
                  return false;
              }
              return true;
          });
      }

      // Setup all event listeners
      setupEventListeners() {
          // Media buttons
          this.elements.addImageBtn?.addEventListener('click', () => this.elements.imageInput.click());
          this.elements.addVideoBtn?.addEventListener('click', () => this.elements.videoInput.click());
          this.elements.addFileBtn?.addEventListener('click', () => this.elements.fileInput.click());

          // File inputs
          this.elements.imageInput?.addEventListener('change', (e) => this.handleFileSelect(e));
          this.elements.videoInput?.addEventListener('change', (e) => this.handleFileSelect(e));
          this.elements.fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));

          // Modals
          document.querySelector('#imagePreviewModal .close-button')?.addEventListener('click', () => {
              this.elements.imagePreviewModal.style.display = 'none';
          });

          document.querySelector('#commentModal .close-button')?.addEventListener('click', () => {
              this.elements.commentModal.style.display = 'none';
          });

          window.addEventListener('click', (event) => {
              if (event.target === this.elements.imagePreviewModal) {
                  this.elements.imagePreviewModal.style.display = 'none';
              }
              if (event.target === this.elements.commentModal) {
                  this.elements.commentModal.style.display = 'none';
              }
          });

          // Form submission
          this.elements.postForm.addEventListener('submit', (e) => this.handlePostSubmit(e));

          // Textbox enhancements
          if (this.elements.postContent) {
            // Auto-resize
            this.elements.postContent.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
            
            // Focus styles
            this.elements.postContent.addEventListener('focus', function() {
                this.style.borderColor = '#00722A';
                this.style.boxShadow = '0 0 0 3px rgba(0, 114, 42, 0.1)';
            });
            
            this.elements.postContent.addEventListener('blur', function() {
                this.style.borderColor = '#ddd';
                this.style.boxShadow = 'none';
            });
        }
        
          // Comment submission
          this.elements.submitComment?.addEventListener('click', () => this.handleCommentSubmit());
      }

      // Handle file selection and preview creation
      handleFileSelect(event) {
          const files = event.target.files;
          if (!files?.length) return;

          Array.from(files).forEach(file => {
              if (this.selectedFiles.some(f =>
                  f.name === file.name &&
                  f.size === file.size &&
                  f.lastModified === file.lastModified
              )) return;

              this.selectedFiles.push(file);
              this.createPreview(file);
          });

          event.target.value = '';
      }

      // Create preview for the selected file
      createPreview(file) {
          const previewItem = document.createElement('div');
          previewItem.className = 'preview-item';
          previewItem.dataset.fileName = file.name;

          const removeBtn = document.createElement('button');
          removeBtn.className = 'remove-preview';
          removeBtn.innerHTML = '×';
          removeBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              this.removePreview(previewItem, file);
          });

          let preview;
          if (file.type.startsWith('image/')) {
              preview = document.createElement('img');
              preview.src = URL.createObjectURL(file);
              preview.className = 'preview-thumbnail';
              preview.addEventListener('click', () => this.previewImage(preview.src));
          } else if (file.type.startsWith('video/')) {
              preview = document.createElement('video');
              preview.src = URL.createObjectURL(file);
              preview.controls = true;
              preview.className = 'preview-thumbnail';
          } else {
              preview = document.createElement('div');
              preview.className = 'file-info';
              preview.innerHTML = `
                  <img src="../img/document-icon.png" alt="Document" style="width:30px;height:30px;">
                  <span style="font-size:12px;margin-top:5px;word-break:break-all;">${file.name}</span>
              `;
          }

          previewItem.appendChild(preview);
          previewItem.appendChild(removeBtn);
          this.elements.previewContainer.appendChild(previewItem);
      }

      // Format file size
      formatFileSize(bytes) {
          if (bytes < 1024) return `${bytes} B`;
          if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
          return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      }

      // Remove a preview item and update selected files
      removePreview(previewItem, file) {
          // Revoke object URL to prevent memory leaks
          const mediaElement = previewItem.querySelector('img, video');
          if (mediaElement && mediaElement.src.startsWith('blob:')) {
              URL.revokeObjectURL(mediaElement.src);
          }

          previewItem.remove();
          this.selectedFiles = this.selectedFiles.filter(f =>
              !(f.name === file.name && f.size === file.size && f.lastModified === file.lastModified)
          );
      }

      // Preview image in the modal
      previewImage(src) {
          this.elements.previewedImage.src = src;
          this.elements.imagePreviewModal.style.display = 'flex';
      }

      // Handle post submission
      async handlePostSubmit(e) {
          e.preventDefault();

          if (!this.isAuthenticated) {
              alert('Please log in to post');
              window.location.href = '/login';
              return;
          }

          const title = this.elements.postTitle.value.trim();
          const text = this.elements.postContent.value.trim();

          if (!title && !text && this.selectedFiles.length === 0) {
              alert('Please add content to your post');
              return;
          }

          // Add client-side validation for files
          const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
          const ALLOWED_TYPES = [
              'image/jpeg', 'image/png', 'image/gif',
              'video/mp4', 'video/webm',
              'application/pdf', 'text/plain'
          ];

          for (const file of this.selectedFiles) {
              if (file.size > MAX_FILE_SIZE) {
                  alert(`File ${file.name} is too large. Maximum size is 10MB.`);
                  return;
              }
              if (!ALLOWED_TYPES.includes(file.type)) {
                  alert(`File type ${file.type} is not allowed`);
                  return;
              }
          }

          try {
              const formData = new FormData();
              formData.append('title', title);
              formData.append('text', text);
              this.selectedFiles.forEach(file => formData.append('media', file));

              this.elements.postButton.disabled = true;
              this.elements.postButton.textContent = 'Posting...';

              const response = await fetch('/posts', {
                  method: 'POST',
                  body: formData,
                  credentials: 'include'
              });

              if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}));
                  const errorMsg = errorData.message ||
                      errorData.error ||
                      `Server error: ${response.status}`;
                  throw new Error(errorMsg);
              }

              // Reset form on success
              this.elements.postForm.reset();
              // Clean up object URLs before clearing
              document.querySelectorAll('.preview-thumbnail').forEach(preview => {
                  if (preview.src && preview.src.startsWith('blob:')) {
                      URL.revokeObjectURL(preview.src);
                  }
              });
              this.elements.previewContainer.innerHTML = '';
              this.selectedFiles = [];
              await this.loadPosts();

          } catch (error) {
              console.error('Post creation error:', error);
              alert(`Failed to create post: ${error.message}`);
          } finally {
              this.elements.postButton.disabled = false;
              this.elements.postButton.textContent = 'Post';
          }
      }

      // Load posts from the server
      async loadPosts() {
          try {
              this.elements.postsContainer.innerHTML = '<div class="loading-posts">Loading posts...</div>';

              const response = await fetch('/posts', {
                  credentials: 'include',
                  headers: {
                      'Cache-Control': 'no-cache' // Prevent caching
                  }
              });

              if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

              const posts = await response.json();

              if (!Array.isArray(posts)) {
                  throw new Error('Invalid posts data received');
              }

              this.renderPosts(posts);
          } catch (error) {
              console.error("Failed to load posts:", error);
              this.elements.postsContainer.innerHTML = `
                  <div class="error-message">
                      Error loading posts. Please refresh the page.<br>
                      ${error.message}
                  </div>
              `;
          }
      }

      // Render posts to the DOM
      renderPosts(posts) {
          if (posts.length === 0) {
              this.elements.postsContainer.innerHTML = `
                  <div class="no-posts">
                      No posts yet. Be the first to share!
                  </div>
              `;
              return;
          }

          this.elements.postsContainer.innerHTML = posts.map(post => {
              const mediaContent = post.media?.map(media => {
                  let mediaUrl = media.url;

                  // Optimize image URLs if using Cloudinary
                  if (media.type === 'image' && mediaUrl.includes('res.cloudinary.com')) {
                      mediaUrl = mediaUrl.replace('/upload/', '/upload/w_800,c_limit,q_auto,f_auto/');
                  }

                  if (media.type === 'image') {
                      return `
                          <div class="post-media-container">
                              <img src="${mediaUrl}" class="post-media post-image" 
                                  onclick="document.getElementById('previewed-image').src='${mediaUrl}'; 
                                  document.getElementById('imagePreviewModal').style.display='flex';">
                          </div>`;
                  } else if (media.type === 'video') {
                      return `
                          <div class="post-media-container">
                              <video src="${mediaUrl}" class="post-media" controls></video>
                          </div>`;
                  } else {
                      return `
                          <div class="post-media-container">
                              <a href="${mediaUrl}" target="_blank" class="post-file">
                                  <i class="fas fa-file-download"></i> ${media.filename || 'Download File'}
                              </a>
                          </div>`;
                  }
              }).join('') || '';

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
                              <button class="post-action like-button" data-post-id="${post._id}">
                                  <i class="far fa-thumbs-up"></i> 
                                  <span class="like-text">Like</span> 
                                  (<span class="like-count">${post.likes?.length || 0}</span>)
                              </button>
                              <button class="post-action comment-button" data-post-id="${post._id}">
                                  <i class="far fa-comment"></i> 
                                  <span class="comment-count">${post.comments?.length || 0}</span> Comments
                              </button>
                          </div>
                      </div>
                  </div>`;
          }).join('');

          this.setupLikeAndCommentHandlers();
      }

      setupLikeAndCommentHandlers() {
        document.querySelectorAll(".like-button").forEach(button => {
          // Initialize button state
          const isLiked = button.classList.contains("liked");
          const icon = button.querySelector("i");
          const textSpan = button.querySelector(".like-text");
          
          if (isLiked && icon) {
              icon.classList.replace("far", "fas");
              if (textSpan) textSpan.textContent = "Liked";
          }
  
          button.addEventListener("click", async (e) => {
              e.preventDefault();
              e.stopPropagation();
              
              const postId = button.dataset.postId;
              const icon = button.querySelector("i");
              const textSpan = button.querySelector(".like-text");
              const countSpan = button.querySelector(".like-count");
              
              if (!postId || !icon || !textSpan || !countSpan) return;
  
              try {
                  const action = button.classList.contains("liked") ? 'unlike' : 'like';
                  const response = await fetch(`/posts/${postId}/like`, {
                      method: 'POST',
                      credentials: 'include',
                      headers: {
                          'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ action })
                  });
  
                  if (!response.ok) throw new Error('Failed to like post');
  
                  const result = await response.json();
                  
                  if (result.success) {
                      // Immediate UI update
                      if (action === 'like') {
                          button.classList.add("liked");
                          icon.classList.replace("far", "fas");
                          textSpan.textContent = "Liked";
                      } else {
                          button.classList.remove("liked");
                          icon.classList.replace("fas", "far");
                          textSpan.textContent = "Like";
                      }
                      countSpan.textContent = result.likesCount;
                  }
              } catch (error) {
                  console.error('Error:', error);
                  alert(error.message || 'Failed to like post');
              }
          });
      });
      
          // Enhanced comment functionality
          document.querySelectorAll(".comment-button").forEach(button => {
            button.addEventListener("click", async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (!this.isAuthenticated) {
                    alert('Please log in to comment');
                    window.location.href = '/login';
                    return;
                }
    
                this.currentPostId = button.dataset.postId;
                
                // Show comment modal
                this.showCommentModal();
                
                // Load comments
                try {
                    const response = await fetch(`/posts/${this.currentPostId}/comments`, {
                        credentials: 'include'
                    });
                    
                    if (response.ok) {
                        const comments = await response.json();
                        this.renderComments(comments);
                    }
                } catch (error) {
                    console.error('Error loading comments:', error);
                    this.elements.commentsList.innerHTML = `
                        <div class="error-message">
                            Error loading comments. Please try again.
                        </div>
                    `;
                }
            });
        });
    }
    
    showCommentModal() {
        if (!this.elements.commentModal) return;
        
        this.elements.commentModal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling
        
        // Focus on comment textarea
        if (this.elements.commentText) {
            this.elements.commentText.value = '';
            this.elements.commentText.focus();
        }
    }
    
    hideCommentModal() {
        if (!this.elements.commentModal) return;
        
        this.elements.commentModal.style.display = 'none';
        document.body.style.overflow = ''; // Re-enable scrolling
    }

      // Handle comment submission
      async handleCommentSubmit() {
          const commentText = this.elements.commentText.value.trim();
          if (!commentText || !this.currentPostId) return;

          try {
              const response = await fetch(`/posts/${this.currentPostId}/comment`, {
                  method: 'POST',
                  credentials: 'include',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ text: commentText })
              });

              if (response.ok) {
                  const result = await response.json();
                  if (result.success) {
                      // Clear and reload comments
                      this.elements.commentText.value = '';
                      await this.loadCommentsForPost(this.currentPostId);

                      // Update comment count in the post
                      this.updateCommentCount(this.currentPostId, result.commentsCount);
                  }
              } else {
                  throw new Error('Failed to submit comment');
              }
          } catch (error) {
              console.error('Error submitting comment:', error);
              alert('Failed to submit comment');
          }
      }

      async loadCommentsForPost(postId) {
          try {
              const response = await fetch(`/posts/${postId}/comments`, {
                  credentials: 'include'
              });

              if (response.ok) {
                  const comments = await response.json();
                  this.renderComments(comments);
              }
          } catch (error) {
              console.error('Error loading comments:', error);
          }
      }

      updateCommentCount(postId, count) {
          const commentButton = document.querySelector(`.comment-button[data-post-id="${postId}"]`);
          if (commentButton) {
              const commentCountSpan = commentButton.querySelector(".comment-count");
              if (commentCountSpan) {
                  commentCountSpan.textContent = count;
              }
          }
      }

      renderComments(comments) {
          if (!this.elements.commentsList) return;

          this.elements.commentsList.innerHTML = comments.length > 0
              ? comments.map(comment => `
                  <div class="comment-item">
                      <div class="comment-header">
                          <span class="comment-author">${comment.userId?.username || 'Anonymous'}</span>
                          <span class="comment-date">${new Date(comment.createdAt).toLocaleString()}</span>
                      </div>
                      <p class="comment-text">${comment.text}</p>
                  </div>
              `).join('')
              : '<div class="no-comments">No comments yet. Be the first to comment!</div>';
      }
  }

  // Start the application
  new ForumApp();
});
