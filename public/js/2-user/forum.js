// --- Toast Notification Function ---
function showToast(message, type = "success") {
	const toastContainer = document.getElementById("toast-container");
	if (!toastContainer) {
		console.error("Toast container not found!");
		return;
	}

	const toast = document.createElement("div");
	const bgColor = type === "success" ? "bg-green-600" : "bg-red-600";
	// Tailwind classes for the toast - Changed initial translate-y
	toast.className = `toast ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg text-sm transition-all duration-300 ease-in-out transform -translate-y-4 opacity-0 max-w-full`;
	toast.innerText = message;

	toastContainer.appendChild(toast);

	// Animate in - Changed remove class
	requestAnimationFrame(() => {
		toast.classList.remove("-translate-y-4", "opacity-0");
		toast.classList.add("translate-y-0", "opacity-100");
	});

	// Remove toast after 3 seconds - Changed add class
	setTimeout(() => {
		toast.classList.add("opacity-0", "-translate-y-4");
		toast.addEventListener("transitionend", () => {
			toast.remove();
		});
	}, 3000);
}

// --- Forum App Class ---
document.addEventListener("DOMContentLoaded", function () {
	const FILE_UPLOAD_LIMITS = window.FILE_UPLOAD_LIMITS || {
		fileSize: 10485760,
		files: 6,
	}; // Fallback

	class ForumApp {
		constructor() {
			this.currentUserId = window.currentUserId || null;
			this.currentUserRoles = window.currentUserRoles || []; // Store user roles
			this.selectedFiles = [];
			this.editPostId = null;
			this.isLoadingPosts = false;
			this.currentPage = 1;

			// *** Bind 'this' for methods called directly from event listeners or async contexts ***
			this.loadPosts = this.loadPosts.bind(this);
			this.handlePostSubmit = this.handlePostSubmit.bind(this);
			this.handlePollSubmit = this.handlePollSubmit.bind(this);
			this.handleFileSelect = this.handleFileSelect.bind(this); // Bind file handler too
			// Other methods called via delegation (like toggleLike, editPostHandler etc.)
			// usually don't need explicit binding here if the delegation logic calls them correctly (e.g., this.toggleLike(...)).
			// If you were passing `this.toggleLike` directly as a callback, you *would* bind it.

			this.cacheElements(); // Cache elements after binding potentially needed methods
			this.init();
			console.log("Forum App Initialized. User ID:", this.currentUserId, "Roles:", this.currentUserRoles);
		}

		cacheElements() {
			this.elements = {
				postForm: document.getElementById("post-form"),
				previewContainer: document.getElementById("preview-container"),
				postsContainer: document.getElementById("posts-container"),
				imageInput: document.getElementById("image-input"),
				videoInput: document.getElementById("video-input"),
				postTitleInput: document.getElementById("post-title"),
				postTextInput: document.getElementById("post-text"),
				postButton: document.getElementById("postButton"),
				pollForm: document.getElementById("poll-form"),
				addOptionBtn: document.getElementById("add-option-button"),
				pollOptionsWrapper: document.getElementById(
					"poll-options-wrapper"
				),
				pollQuestionInput: document.getElementById("poll-question"),
				paginationContainer: document.getElementById(
					"pagination-container"
				),
			};
		}

		init() {
			if (this.elements.postsContainer) {
				this.setupEventListeners();
				this.loadPosts(this.currentPage);
			} else {
				console.error(
					"Posts container not found. Forum app cannot fully initialize."
				);
			}
		}

		setupEventListeners() {
			// Use the bound methods for direct listeners
			this.elements.imageInput?.addEventListener(
				"change",
				this.handleFileSelect
			);
			this.elements.videoInput?.addEventListener(
				"change",
				this.handleFileSelect
				);
			// REMOVED custom click listeners for add-image-button and add-video-button
			/*
			document
				.getElementById("add-image-button")
				?.addEventListener("click", (event) => {
					event.preventDefault(); // Prevent default button action
					this.elements.imageInput?.click(); // Trigger the hidden input click
				});
			document
				.getElementById("add-video-button")
				?.addEventListener("click", (event) => {
					event.preventDefault(); // Prevent default button action
					this.elements.videoInput?.click(); // Trigger the hidden input click
				});
			*/
			this.elements.postForm?.addEventListener(
				"submit",
				this.handlePostSubmit
			);
			this.elements.addOptionBtn?.addEventListener("click", () =>
				this.handleAddPollOption()
			); // Arrow func ok here
			this.elements.pollForm?.addEventListener(
				"submit",
				this.handlePollSubmit
			);
            // Add listener for removing poll options using event delegation
            this.elements.pollOptionsWrapper?.addEventListener('click', (event) => {
                if (event.target.classList.contains('remove-poll-option-btn')) {
                    this.removePollOption(event.target);
                }
            });

			// Event delegation - calls methods using 'this' correctly
			this.elements.postsContainer?.addEventListener("click", (event) => {
				const target = event.target;
				const postElement = target.closest(".post");
				const postId = postElement?.dataset.id;
				const commentItem = target.closest(".comment"); // Changed selector to .comment
				const commentId = commentItem?.dataset.commentId;

				const likeButton = target.closest(".like-button");
				const commentToggleButton = target.closest(
					".comment-toggle-button"
				);
				const postCommentSubmitButton = target.closest(
					".post-comment-submit" // Corrected class name if needed
				);
				const editButton = target.closest(".post-edit-btn");
				const deleteButton = target.closest(".post-delete-btn");
				const pollOptionItem = target.closest(".poll-option-item-clickable"); // New target: the LI element
				const commentEditButton = target.closest(".comment-edit-btn");
				const commentDeleteButton = target.closest(
					".comment-delete-btn"
				);
				const reportButton = target.closest(".report-button");
				const mediaItem = target.closest(
					".post-media-img, .post-media-video"
				);
                // Find comment save/cancel buttons within the specific comment item
                const commentSaveButton = target.closest(".comment-save-btn");
                const commentCancelButton = target.closest(".comment-cancel-btn");


				if (likeButton && postId) {
					this.toggleLike(postId, likeButton);
				} else if (commentToggleButton && postId) {
					this.toggleCommentInput(postId);
				} else if (postCommentSubmitButton && postId) {
                    // Ensure the button itself is passed, not just the target
					this.submitComment(postId, postCommentSubmitButton);
				} else if (editButton && postId) {
					this.editPostHandler(editButton);
				} else if (deleteButton && postId) {
					this.safeDeletePost(postId, deleteButton);
				} else if (pollOptionItem && postId) { // New condition for LI click
                    // Check if the item is disabled (e.g., user already voted)
                    if (pollOptionItem.classList.contains('disabled')) {
                        console.log("Poll option item is disabled.");
                        return; // Don't proceed if disabled
                    }
                    // --- DEBUGGING ---
                    const optionIndex = pollOptionItem.dataset.optionIndex;
                    console.log(`Poll option LI clicked! Post ID: ${postId}, Option Index: ${optionIndex}`);
                    // --- END DEBUGGING ---
					this.votePoll(postId, parseInt(optionIndex, 10), pollOptionItem); // Pass the LI element
				} else if (commentEditButton && postId && commentId) {
                    this.editCommentHandler(postId, commentId, commentEditButton);
                } else if (commentDeleteButton && postId && commentId) {
                    this.safeDeleteComment(postId, commentId, commentDeleteButton);
                } else if (commentSaveButton && postId && commentId) {
                    const editFormWrapper = commentSaveButton.closest('.comment-edit-form-wrapper');
                    const editInput = editFormWrapper?.querySelector('.comment-edit-input');
                    const commentContent = commentItem?.querySelector('.comment-content-area'); // Corrected selector
                    const actionButtons = commentItem?.querySelector('.comment-actions');
                    if (editInput && commentContent && editFormWrapper && actionButtons) {
                        this.saveCommentEdit(postId, commentId, editInput, commentContent, editFormWrapper, actionButtons);
                    }
                } else if (commentCancelButton && commentId) { // postId might not be strictly needed for cancel
                    const editFormWrapper = commentCancelButton.closest('.comment-edit-form-wrapper');
                    const commentContent = commentItem?.querySelector('.comment-content-area'); // Corrected selector
                    const actionButtons = commentItem?.querySelector('.comment-actions');
                    if (commentContent && editFormWrapper && actionButtons) {
                        this.cancelCommentEdit(commentContent, editFormWrapper, actionButtons);
                    }
                } else if (reportButton && postId) {
					this.reportPost(postId, reportButton);
				} else if (mediaItem && typeof openMediaModal === "function") {
					this.updateCurrentMediaList(mediaItem);
					const initialIndex = window.currentMediaList.findIndex(
						(src) => src === mediaItem.src
					);
					openMediaModal(initialIndex >= 0 ? initialIndex : 0);
				}
			});
		}

		updateCurrentMediaList(clickedMediaElement) {
			const postMediaContainer = clickedMediaElement.closest(
				".post-media-container"
			); // Changed selector
			if (postMediaContainer) {
				const mediaElements = Array.from(
					postMediaContainer.querySelectorAll(
						".post-media-img, .post-media-video"
					)
				);
				window.currentMediaList = mediaElements.map((el) => el.src);
				console.log(
					"Updated media list for modal:",
					window.currentMediaList
				);
			} else {
				window.currentMediaList = [clickedMediaElement.src];
			}
		}

		handleFileSelect(event) {
			/* ... Same logic ... */ const files = event.target.files;
			const inputType =
				event.target.id === "video-input" ? "video" : "image";
			if (files.length > 0) {
				const filesToAdd = Array.from(files);
				if (inputType === "video") {
					if (filesToAdd.length > 1) {
						showToast("Only one video file per post.", "error");
						event.target.value = null;
						return;
					}
					const existingVideo = this.selectedFiles.find((f) =>
						f.type.startsWith("video/")
					);
					if (existingVideo) {
						showToast(
							"Only one video allowed. Remove existing first.",
							"error"
						);
						event.target.value = null;
						return;
					}
				}
				const currentFileCount = this.selectedFiles.length;
				const totalAfterAdd = currentFileCount + filesToAdd.length;
				if (totalAfterAdd > FILE_UPLOAD_LIMITS.files) {
					showToast(
						`Max ${FILE_UPLOAD_LIMITS.files} files.`,
						"error"
					);
					event.target.value = null;
					return;
				}
				for (const file of filesToAdd) {
					if (file.size > FILE_UPLOAD_LIMITS.fileSize) {
						showToast(
							`File "${file.name}" > ${
								FILE_UPLOAD_LIMITS.fileSize / (1024 * 1024)
							}MB.`,
							"error"
						);
						event.target.value = null;
						return;
					}
					if (
						!file.type.startsWith("image/") &&
						!file.type.startsWith("video/")
					) {
						showToast(`Unsupported type: "${file.name}".`, "error");
						event.target.value = null;
						return;
					}
				}
				this.selectedFiles.push(...filesToAdd);
				this.previewFiles();
			}
			event.target.value = null;
		}
		previewFiles() {
			/* ... Same logic ... */ if (!this.elements.previewContainer)
				return;
			this.elements.previewContainer.innerHTML = "";
			this.selectedFiles.forEach((file, index) => {
				const reader = new FileReader();
				reader.onload = (e) => {
					const filePreviewWrapper = document.createElement("div");
					filePreviewWrapper.className =
						"file-preview relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden shadow";
					let mediaPreview;
					if (file.type.startsWith("image/")) {
						mediaPreview = document.createElement("img");
						mediaPreview.src = e.target.result;
						mediaPreview.alt = file.name;
						mediaPreview.className =
							"preview-image w-full h-full object-cover";
					} else if (file.type.startsWith("video/")) {
						mediaPreview = document.createElement("video");
						mediaPreview.src = e.target.result;
						mediaPreview.className =
							"preview-video w-full h-full object-cover";
						mediaPreview.muted = true;
					}
					const removeButton = document.createElement("button");
					removeButton.type = "button";
					removeButton.innerHTML = "✕";
					removeButton.className =
						"remove-file-btn absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center bg-black/50 text-white text-xs rounded-full leading-none cursor-pointer hover:bg-black/75";
					removeButton.dataset.index = index;
					removeButton.onclick = (event) => {
						event.stopPropagation();
						this.removeFile(index);
					};
					if (mediaPreview)
						filePreviewWrapper.appendChild(mediaPreview);
					filePreviewWrapper.appendChild(removeButton);
					this.elements.previewContainer.appendChild(
						filePreviewWrapper
					);
				};
				reader.readAsDataURL(file);
			});
		}
		removeFile(indexToRemove) {
			/* ... Same logic ... */ this.selectedFiles.splice(
				indexToRemove,
				1
			);
			this.previewFiles();
			console.log("Files after removal:", this.selectedFiles);
		}
		handleAddPollOption() {
			if (!this.elements.pollOptionsWrapper) return;
			const currentCount = this.elements.pollOptionsWrapper.querySelectorAll('.poll-option-input-group').length;

			if (currentCount >= 5) {
				showToast("Max 5 options.", "error");
				return;
			}

            // Create wrapper div
            const wrapperDiv = document.createElement('div');
            wrapperDiv.className = 'poll-option-input-group flex items-center gap-2';

            // Create input
			const input = document.createElement("input");
			input.type = "text";
			input.name = "options[]";
			input.placeholder = `Option ${currentCount + 1}`;
			input.required = true; // Make added options required too
			input.className = "flex-grow p-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-sm";

            // Create remove button
            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.innerHTML = '&times;'; // Multiplication sign as 'X'
            removeButton.className = 'remove-poll-option-btn text-red-500 hover:text-red-700 text-xl font-bold leading-none p-1';
            // removeButton.onclick = () => this.removePollOption(removeButton); // Direct listener also works, but delegation is set up

            // Append input and button to wrapper
            wrapperDiv.appendChild(input);
            wrapperDiv.appendChild(removeButton);

            // Append wrapper to the main container
			this.elements.pollOptionsWrapper.appendChild(wrapperDiv);

            // Enable remove buttons if more than 2 options exist
            this.updateRemoveOptionButtons();
		}

        removePollOption(button) {
            if (!this.elements.pollOptionsWrapper) return;

            const currentCount = this.elements.pollOptionsWrapper.querySelectorAll('.poll-option-input-group').length;
            if (currentCount <= 2) {
                showToast("Minimum 2 options required.", "error");
                return;
            }

            const optionGroup = button.closest('.poll-option-input-group');
            if (optionGroup) {
                optionGroup.remove();
                // Re-evaluate which remove buttons should be enabled/visible
                this.updateRemoveOptionButtons();
            }
        }

        updateRemoveOptionButtons() {
            if (!this.elements.pollOptionsWrapper) return;
            const optionGroups = this.elements.pollOptionsWrapper.querySelectorAll('.poll-option-input-group');
            const currentCount = optionGroups.length;
            const canRemove = currentCount > 2;
            const canAdd = currentCount < 5; // Check if we can add more

            optionGroups.forEach((group, index) => {
                const removeBtn = group.querySelector('.remove-poll-option-btn');
                if (removeBtn) {
                    if (canRemove) {
                        removeBtn.classList.remove('hidden'); // Show button
                        removeBtn.disabled = false;
                    } else {
                        removeBtn.classList.add('hidden'); // Hide button
                        removeBtn.disabled = true;
                    }
                }
                // Update placeholder text in case order changes (optional)
                const input = group.querySelector('input[name="options[]"]');
                if (input) {
                    input.placeholder = `Option ${index + 1}`;
                }
            });

            // Enable/disable the "Add Option" button
            if (this.elements.addOptionBtn) {
                this.elements.addOptionBtn.disabled = !canAdd;
                if (!canAdd) {
                    this.elements.addOptionBtn.classList.add('opacity-50', 'cursor-not-allowed');
                } else {
                    this.elements.addOptionBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            }
        }

		async handlePollSubmit(e) {
			/* ... Same logic ... */ e.preventDefault();
			if (!this.elements.pollForm) return;
			const question = this.elements.pollQuestionInput.value.trim();
			const options = [
				// Find inputs within the wrappers
				...this.elements.pollOptionsWrapper.querySelectorAll(
					'.poll-option-input-group input[name="options[]"]'
				),
			]
				.map((input) => input.value.trim())
				.filter((opt) => opt); // Filter out empty options before validation

			if (!question || options.length < 2) {
				return showToast(
					"Poll requires a question and at least 2 non-empty options.",
					"error"
				);
			}
			const submitPollButton = this.elements.pollForm.querySelector(
				'button[type="submit"]'
			);
			if (submitPollButton) submitPollButton.disabled = true;
			try {
				const res = await fetch("/poll", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ question, options }),
				});
				const data = await res.json();
				if (res.ok && data.success) {
					showToast("✅ Poll posted!");
					this.resetPollForm();
					this.loadPosts();
				} else {
					throw new Error(data.message || data.error || "Failed");
				}
			} catch (err) {
				showToast(`❌ Error: ${err.message}`, "error");
			} finally {
				if (submitPollButton) submitPollButton.disabled = false;
			}
		}
		resetPollForm() {
			if (!this.elements.pollForm || !this.elements.pollOptionsWrapper) return;
			this.elements.pollForm.reset();

			// Reset to only the initial two options using the new structure
			this.elements.pollOptionsWrapper.innerHTML = `
                <div class="poll-option-input-group flex items-center gap-2">
                    <label for="poll-option-1" class="sr-only">Option 1</label>
                    <input type="text" id="poll-option-1" name="options[]" placeholder="Option 1" required class="flex-grow p-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-sm">
                    <button type="button" class="remove-poll-option-btn text-red-500 hover:text-red-700 text-xl font-bold leading-none p-1 hidden">&times;</button>
                </div>
                <div class="poll-option-input-group flex items-center gap-2">
                    <label for="poll-option-2" class="sr-only">Option 2</label>
                    <input type="text" id="poll-option-2" name="options[]" placeholder="Option 2" required class="flex-grow p-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-sm">
                    <button type="button" class="remove-poll-option-btn text-red-500 hover:text-red-700 text-xl font-bold leading-none p-1 hidden">&times;</button>
                </div>
            `;
            // Ensure remove buttons are correctly hidden initially
            this.updateRemoveOptionButtons();
		}
		resetPostForm() {
			/* ... Same logic ... */ if (this.elements.postForm)
				this.elements.postForm.reset();
			this.selectedFiles = [];
			if (this.elements.previewContainer)
				this.elements.previewContainer.innerHTML = "";
			if (this.elements.imageInput) this.elements.imageInput.value = null;
			if (this.elements.videoInput) this.elements.videoInput.value = null;
		}
		async handlePostSubmit(e) {
			/* ... Same logic ... */ e.preventDefault();
			if (!this.elements.postForm || !this.elements.postTitleInput)
				return;
			const title = this.elements.postTitleInput.value.trim();
			const text = this.elements.postTextInput?.value.trim();
			if (!title) return showToast("Post title is required.", "error");
			const formData = new FormData();
			formData.append("title", title);
			if (text) formData.append("text", text);
			if (this.selectedFiles.length > FILE_UPLOAD_LIMITS.files)
				return showToast(
					`Max ${FILE_UPLOAD_LIMITS.files} files.`,
					"error"
				);
			const videoFiles = this.selectedFiles.filter((f) =>
				f.type.startsWith("video/")
			);
			if (videoFiles.length > 1)
				return showToast("Only one video file allowed.", "error");
			this.selectedFiles.forEach((file) =>
				formData.append("media", file)
			);
			const postSubmitButton = this.elements.postButton;
			if (postSubmitButton) {
				postSubmitButton.disabled = true;
				postSubmitButton.textContent = "Posting...";
			}
			try {
				const res = await fetch("/posts", {
					method: "POST",
					body: formData,
					credentials: "include",
				});
				const data = await res.json();
				if (res.ok && data.success) {
					showToast("✅ Post created!");
					this.resetPostForm();
					this.loadPosts();
				} else {
					throw new Error(data.error || data.message || "Failed");
				}
			} catch (err) {
				showToast(`❌ Error: ${err.message}`, "error");
			} finally {
				if (postSubmitButton) {
					postSubmitButton.disabled = false;
					postSubmitButton.textContent = "Post";
				}
			}
		}
		async loadPosts(page = 1) {
			/* ... Uses 'this.renderPagination' correctly ... */ if (
				this.isLoadingPosts ||
				!this.elements.postsContainer
			)
				return;
			this.isLoadingPosts = true;
			this.currentPage = page;
			this.elements.postsContainer.innerHTML =
				'<p class="text-center text-gray-500 py-10">Loading posts...</p>';
			try {
				const response = await fetch(`/posts?page=${page}&limit=5`, {
					credentials: "include",
				});
				if (!response.ok)
					throw new Error(`HTTP error! status: ${response.status}`);
				const data = await response.json();
				if (!data.success || !Array.isArray(data.posts))
					throw new Error("Invalid response format.");
				this.renderPosts(data.posts);
				this.renderPagination(data.totalPages, data.currentPage);
			} catch (error) {
				console.error("Error loading posts:", error);
				this.elements.postsContainer.innerHTML = `<div class="text-center text-red-500 p-4 border border-red-200 rounded bg-red-50">Error: ${error.message}.</div>`;
				this.renderPagination(0, 1);
			} finally {
				this.isLoadingPosts = false;
			}
		}
		renderPosts(posts) {
			/* ... Uses this.createPostElement ... */ if (
				!this.elements.postsContainer
			)
				return;
			this.elements.postsContainer.innerHTML = "";
			if (posts.length === 0) {
				this.elements.postsContainer.innerHTML =
					'<p class="text-center text-gray-500 py-10">No posts found.</p>';
				return;
			}
			posts.forEach((post) => {
				if (!post || !post._id) {
					console.warn("Skipping invalid post:", post);
					return;
				}
				const postElement = this.createPostElement(post);
				this.elements.postsContainer.appendChild(postElement);
				this.loadComments(
					post._id,
					postElement.querySelector(".comments-list")
				);
			});
		}
		createPostElement(post) {
			/* ... Uses this.getGridMediaClasses etc. ... */ const div =
				document.createElement("div");
			div.className =
				"post bg-white rounded-xl shadow-md mb-6 flex flex-col relative p-5";
			div.dataset.id = post._id;

			const isOwner =
				post.userId && post.userId._id === this.currentUserId;
			// Check if user is owner OR Admin
			const canModify = isOwner || this.currentUserRoles.includes('Admin') || this.currentUserRoles.includes('Staff');

			const createdAt = post.createdAt
				? new Date(post.createdAt).toLocaleString("en-US", {
						month: "short",
						day: "numeric",
						year: "numeric",
						hour: "2-digit",
						minute: "2-digit",
						hour12: true,
				  })
				: "Date unavailable";
			const likeCount = Array.isArray(post.likes) ? post.likes.length : 0;
			const userLiked =
				post.likes && this.currentUserId
					? post.likes.some(
							(likeId) => likeId.toString() === this.currentUserId
					  )
					: false;
			const pollSectionHTML = post.poll?.question
				? this.renderPollSection(post)
				: ""; // Use 'this'

			const gridClasses = this.getGridMediaClasses(post.media); // Use 'this'
			const mediaHTML = (post.media || [])
				.slice(0, 6)
				.map((media, index) => {
					const itemSpecificClass = this.getGridItemClasses(
						post.media?.length || 0,
						media,
						index
					); // Use 'this'
					const mediaHeightClass = itemSpecificClass.includes(
						"h-full"
					)
						? "h-full"
						: "h-[280px]";
					const objectFitClass =
						(post.media?.length === 1 && media.type === "image") ||
						(post.media?.length === 0 && media.type === "video")
							? "object-contain bg-gray-100"
							: "object-cover";
					const bgClass = media.type === "video" ? "bg-black" : "";
					const mediaType =
						media.mimeType ||
						(media.type === "video" ? "video/mp4" : "image/webp");
					if (!media || !media.url) {
						console.warn(
							"Skipping media item due to missing URL:",
							media
						);
						return "";
					}
					return media.type === "image"
						? `<img src="${media.url}" alt="Post media" class="post-media-img w-full ${mediaHeightClass} ${objectFitClass} rounded-[15px] shadow-sm cursor-pointer ${itemSpecificClass}" loading="lazy">`
						: `<video controls class="post-media-video w-full ${mediaHeightClass} ${objectFitClass} rounded-[15px] shadow-sm ${bgClass} ${itemSpecificClass}" oncontextmenu="return false;" preload="metadata"><source src="${media.url}" type="${mediaType}"></video>`;
				})
				.join("");

			// Use canModify for both Edit and Delete buttons
			div.innerHTML = `
                            <div class="post-item w-full"> <div class="post-info"> <div class="post-header flex justify-between items-start mb-1"> <h3 class="text-lg font-bold text-gray-800">${
								post.title
							}</h3> </div> <p class="post-author text-sm font-semibold text-green-700 mb-2">By: ${
				post.userId?.username || "Unknown User"
			}</p> ${
				post.text
					? `<p class="post-text text-base text-gray-700 mb-3 whitespace-pre-wrap">${post.text}</p>`
					: ""
			} <p class="post-date text-[11px] text-gray-400 absolute top-5 right-5">${createdAt}</p> <div class="post-media-container mt-3 grid gap-2 ${gridClasses}">${mediaHTML}</div> </div> ${pollSectionHTML} <div class="post-actions flex gap-2.5 items-center mt-2.5 flex-wrap border-t border-gray-200 pt-3"> <button class="like-button flex items-center gap-1 ${
				userLiked ? "text-red-500" : "text-gray-500"
			} hover:text-red-400 transition duration-200 text-sm bg-gray-100 hover:bg-gray-200 py-1.5 px-3 rounded-[10px]"> <span>❤️</span> <span class="like-count font-medium">${likeCount}</span> </button> <button class="comment-toggle-button text-green-600 hover:underline text-sm flex items-center gap-1 bg-gray-100 hover:bg-gray-200 py-1.5 px-3 rounded-[10px]"> <span>💬</span> Comment </button> ${
				canModify // Use canModify here
					? `<button class="post-edit-btn bg-blue-100 text-blue-600 hover:bg-blue-200 px-2 py-1 rounded text-xs font-medium transition duration-200">Edit</button> <button class="post-delete-btn bg-red-100 text-red-600 hover:bg-red-200 px-2 py-1 rounded text-xs font-medium transition duration-200">Delete</button>`
					: ""
			} <button class="report-button text-xs text-gray-500 hover:text-red-600 hover:underline flex items-center gap-1 ml-auto bg-gray-100 hover:bg-gray-200 py-1 px-2 rounded-[10px]" data-post-id="${
				post._id
			}"> <span>🚩</span> Report </button> </div> <div class="post-comments mt-4 pt-2.5 border-t border-gray-300"> <div class="comment-input-wrapper hidden mt-2" id="comment-input-wrapper-${
				post._id
			}"> <form class="flex gap-2 items-center"> <input type="text" class="comment-input flex-grow p-2 border border-gray-300 rounded-[10px] text-sm bg-gray-100 text-gray-800 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" placeholder="Write a comment..." required> <button type="submit" class="post-comment-submit comment-btn py-2 px-3.5 bg-[#00722A] text-white border-none rounded-[10px] font-bold cursor-pointer text-sm hover:bg-[#00591F]">Comment</button> </form> </div> <div class="comments-list mt-2.5 space-y-2" id="comments-${
				post._id
			}"></div> </div> </div> `;
			return div;
		}
		getGridMediaClasses(media) {
			/* ... Same logic ... */ const count = media
				? media.filter((m) => m && m.url).length
				: 0;
			if (count === 0) return "hidden";
			if (count === 1) return "grid-cols-1";
			if (count === 2) return "grid-cols-2";
			if (count === 3) return "grid-cols-[2fr_1fr] grid-rows-2";
			if (count === 4) return "grid-cols-2 grid-rows-2";
			return "grid-cols-3 grid-rows-2";
		}
		getGridItemClasses(mediaCount, mediaItem, index) {
			/* ... Same logic ... */ if (mediaCount === 3 && index === 0)
				return "row-span-2 col-span-1";
			return "col-span-1 row-span-1";
		}
		renderPollSection(post) {
			/* ... Uses 'this.currentUserId' ... */ if (
				!post.poll ||
				!post.poll.options
			)
				return "";
			const totalVotes = post.poll.options.reduce(
				(sum, option) => sum + (option.votes?.length || 0),
				0
			);
			const userHasVoted = post.poll.options.some((opt) =>
				opt.votes?.some(
					(voteUserId) => voteUserId.toString() === this.currentUserId
				)
			);
			const canVote = this.currentUserId && !userHasVoted;
			const optionsHTML = post.poll.options
				.map((opt, index) => {
					const percentage =
						totalVotes > 0
							? ((opt.votes?.length || 0) / totalVotes) * 100
							: 0;
					const isVotedOption = opt.votes?.some(
						(voteUserId) =>
							voteUserId.toString() === this.currentUserId
					);
					const votedClass = isVotedOption
						? "border-green-500 ring-2 ring-green-300"
						: "border-gray-300";
                    const itemDisabledClass = !canVote ? "disabled opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"; // Class for LI if disabled

                    // Add poll-option-item-clickable and data-option-index to LI
                    // Add itemDisabledClass to LI
                    // Remove poll-option-button class and data-option-index from button
					return `<li data-option-index="${index}" class="poll-option-item poll-option-item-clickable relative flex flex-col sm:flex-row justify-between items-center bg-white border ${votedClass} p-2 sm:p-3 rounded-lg shadow-sm transition duration-200 mb-2 ${itemDisabledClass}">
                                <span class="poll-option-text text-left w-full sm:w-auto text-gray-800 font-medium text-sm sm:text-base mb-2 sm:mb-0 mr-0 sm:mr-3 px-2 py-1">
                                    ${opt.text || "?"}
                                </span>
                                <div class="vote-bar-wrapper flex items-center w-full sm:flex-1">
                                    <div class="vote-bar-container w-full h-3 sm:h-4 bg-gray-200 rounded-full relative overflow-hidden mr-2">
                                        <div class="vote-bar h-full bg-gradient-to-r from-teal-400 to-green-500 rounded-full transition-all duration-500 ease-out" style="width: ${percentage.toFixed(1)}%;"></div>
                                        <span class="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-bold text-white mix-blend-difference">${percentage.toFixed(0)}%</span>
                                    </div>
                                    <span class="vote-count text-xs text-gray-500 w-16 text-right flex-shrink-0">${opt.votes?.length || 0} votes</span>
                                </div>
                            </li>`;
				})
				.join("");
			return `<div class="post-poll mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-inner"><h5 class="text-base sm:text-lg font-semibold text-gray-800 mb-3">${
				post.poll.question
			}</h5><ul class="poll-options space-y-1 sm:space-y-2">${optionsHTML}</ul>${userHasVoted ? '<p class="text-xs text-center text-green-600 mt-2">You voted.</p>' : ""}<p class="text-xs text-center text-gray-500 mt-2">Total Votes: ${totalVotes}</p></div>`;
		}
		renderPagination(totalPages, currentPage) {
			/* ... Uses 'this.loadPosts' ... */ if (
				!this.elements.paginationContainer
			)
				return;
			this.elements.paginationContainer.innerHTML = "";
			if (totalPages <= 1) return;
			const createButton = (
				page,
				text,
				isActive = false,
				isDisabled = false
			) => {
				const btn = document.createElement("button");
				btn.textContent = text;
				const baseClasses =
					"px-3 py-1 border rounded-md text-sm transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
				const activeClasses =
					"bg-green-600 text-white border-green-600 cursor-default";
				const inactiveClasses =
					"bg-white text-green-600 border-green-600 hover:bg-green-50";
				btn.className = `${baseClasses} ${
					isActive ? activeClasses : inactiveClasses
				}`;
				btn.disabled = isDisabled || isActive;
				if (!isDisabled && !isActive) {
					btn.onclick = () => this.loadPosts(page);
				}
				return btn;
			};
			const createEllipsis = () => {
				const ellipsis = document.createElement("span");
				ellipsis.textContent = "...";
				ellipsis.className = "px-2 py-1 text-gray-500 text-sm";
				return ellipsis;
			};
			this.elements.paginationContainer.appendChild(
				createButton(currentPage - 1, "Prev", false, currentPage === 1)
			);
			const maxPagesToShow = 5;
			if (totalPages <= maxPagesToShow + 2) {
				for (let i = 1; i <= totalPages; i++)
					this.elements.paginationContainer.appendChild(
						createButton(i, i.toString(), i === currentPage)
					);
			} else {
				this.elements.paginationContainer.appendChild(
					createButton(1, "1", 1 === currentPage)
				);
				if (currentPage > 3)
					this.elements.paginationContainer.appendChild(
						createEllipsis()
					);
				const startPage = Math.max(2, currentPage - 1);
				const endPage = Math.min(totalPages - 1, currentPage + 1);
				for (let i = startPage; i <= endPage; i++)
					this.elements.paginationContainer.appendChild(
						createButton(i, i.toString(), i === currentPage)
					);
				if (currentPage < totalPages - 2)
					this.elements.paginationContainer.appendChild(
						createEllipsis()
					);
				this.elements.paginationContainer.appendChild(
					createButton(
						totalPages,
						totalPages.toString(),
						totalPages === currentPage
					)
				);
			}
			this.elements.paginationContainer.appendChild(
				createButton(
					currentPage + 1,
					"Next",
					false,
					currentPage === totalPages
				)
			);
		}
		async loadComments(postId, container) {
			/* ... Uses this.renderComment ... */ if (!container) return;
			container.innerHTML =
				'<p class="text-xs text-gray-400 italic pl-2">Loading comments...</p>';
			try {
				const res = await fetch(`/posts/${postId}/comments`, {
					credentials: "include",
				});
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const data = await res.json();
				if (!data.success || !Array.isArray(data.comments))
					throw new Error("Invalid comment data");
				const comments = data.comments || [];
				if (comments.length === 0) {
					container.innerHTML =
						'<p class="text-xs text-gray-500 italic pl-2">No comments yet.</p>';
					return;
				}
				container.innerHTML = comments
					.map((c) => this.renderComment(postId, c))
					.join("");
			} catch (error) {
				console.error(`Load comments error:`, error);
				container.innerHTML =
					'<p class="text-xs text-red-500 italic pl-2">Failed to load.</p>';
			}
		}
        renderComment(postId, comment) {
            const isOwner = comment.userId && comment.userId._id === this.currentUserId;
            // Determine if the user can delete (owner or specific roles)
            // Example: Add Admin/Staff check if needed
            const canDelete = isOwner; // || (window.userRoles && (window.userRoles.includes('Admin') || window.userRoles.includes('Staff')));
            const canEdit = isOwner;
            const commentDate = comment.createdAt ? new Date(comment.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '';

            // Use Flexbox for the header to better control spacing
            return `
                <div class="comment bg-gray-50 p-2 rounded-lg text-sm border-b border-gray-200 last:border-b-0" id="comment-${comment._id}" data-comment-id="${comment._id}">
                    <div class="comment-header flex justify-between items-start mb-1">
                        <strong class="text-green-700 font-semibold mr-2 flex-shrink-0">${comment.userId?.username || 'Anonymous'}</strong>
                        <div class="flex items-center gap-2 flex-shrink-0">
                            <span class="text-xs text-gray-400">${commentDate}</span>
                            <div class="comment-actions flex gap-2"> 
                                ${canEdit ? `<button class="comment-edit-btn bg-none border-none cursor-pointer text-xs text-blue-600 hover:underline p-0">Edit</button>` : ''}
                                ${canDelete ? `<button class="comment-delete-btn bg-none border-none cursor-pointer text-xs text-red-600 hover:underline p-0">Delete</button>` : ''}
                            </div>
                        </div>
                    </div>
                     <div class="comment-content-area"> 
                         <p class="comment-text ml-1 text-gray-800 break-words whitespace-pre-wrap">${comment.text}</p>
                     </div>
                    <div class="comment-edit-form-wrapper hidden mt-1">
                        <textarea class="comment-edit-input w-full p-1.5 text-sm rounded-[10px] border border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-none" rows="2">${comment.text}</textarea>
                        <div class="flex justify-end gap-1 mt-1">
                            <button class="comment-save-btn py-1 px-2.5 rounded-[10px] border-none bg-[#00722A] text-white font-bold cursor-pointer text-xs hover:bg-[#00591F]">Save</button>
                            <button class="comment-cancel-btn py-1 px-2.5 rounded-[10px] border-none bg-gray-400 hover:bg-gray-500 text-white font-bold cursor-pointer text-xs">Cancel</button>
                        </div>
                    </div>
                </div>`;
        }
		toggleCommentInput(postId) {
			/* ... Same logic ... */ const wrapper = document.getElementById(
				`comment-input-wrapper-${postId}`
			);
			wrapper?.classList.toggle("hidden");
			if (!wrapper?.classList.contains("hidden"))
				wrapper.querySelector(".comment-input")?.focus();
		}
		async submitComment(postId, button) {
			/* ... Same logic ... */ const form = button.closest("form");
			const textarea = form?.querySelector(".comment-input");
			const commentsList = document.getElementById(`comments-${postId}`);
			const text = textarea?.value.trim();
			if (!text || !form || !textarea || !commentsList) return;
			button.disabled = true;
			button.textContent = "Posting...";
			try {
				const res = await fetch(`/posts/${postId}/comment`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ text }),
				});
				const data = await res.json();
				if (res.ok && data.success && data.comment) {
					textarea.value = "";
					this.toggleCommentInput(postId);
					const noCommentsMsg =
						commentsList.querySelector("p.text-gray-500");
					if (noCommentsMsg) noCommentsMsg.remove();
					commentsList.insertAdjacentHTML(
						"beforeend",
						this.renderComment(postId, data.comment)
					);
					showToast("✅ Comment posted!");
				} else {
					throw new Error(data.error || "Failed");
				}
			} catch (err) {
				showToast(`❌ Error: ${err.message}`, "error");
			} finally {
				button.disabled = false;
				button.textContent = "Comment";
			}
		}
		toggleLike(postId, button) {
			/* ... Same logic ... */ if (!this.currentUserId) {
				showToast("Log in to like.", "error");
				return;
			}
			const likeCountSpan = button.querySelector(".like-count");
			const currentCount = parseInt(likeCountSpan.textContent || "0", 10);
			const liked = button.classList.contains("text-red-500");
			likeCountSpan.textContent = liked
				? currentCount - 1
				: currentCount + 1;
			button.classList.toggle("text-red-500", !liked);
			button.classList.toggle("text-gray-500", liked);
			fetch(`/posts/${postId}/like`, {
				method: "POST",
				credentials: "include",
			})
				.then((res) =>
					res.ok
						? res.json()
						: res.json().then((err) => Promise.reject(err))
				)
				.then((data) => {
					if (!data.success) throw new Error(data.error || "Failed");
					likeCountSpan.textContent = data.likes
						? data.likes.length
						: currentCount;
					const serverLiked =
						data.likes && this.currentUserId
							? data.likes.some(
									(id) => id.toString() === this.currentUserId
							  )
							: false;
					button.classList.toggle("text-red-500", serverLiked);
					button.classList.toggle("text-gray-500", !serverLiked);
				})
				.catch((err) => {
					showToast(`❌ Like error: ${err.message}`, "error");
					likeCountSpan.textContent = currentCount;
					button.classList.toggle("text-red-500", liked);
					button.classList.toggle("text-gray-500", !liked);
				});
		}
		editPostHandler(button) {
			const postEl = button.closest(".post");
			const postId = postEl?.dataset.id;
			if (!postEl || !postId) return;

			const titleEl = postEl.querySelector("h3.text-lg"); // More specific selector
			const textEl = postEl.querySelector(".post-text");
			const mediaContainer = postEl.querySelector(".post-media-container");
			const pollContainer = postEl.querySelector(".post-poll");
			// Target the main actions container instead of a non-existent wrapper
			const actionsContainer = postEl.querySelector(".post-actions");
			const editButton = actionsContainer?.querySelector(".post-edit-btn");
			const deleteButton = actionsContainer?.querySelector(".post-delete-btn");

			if (!titleEl || !actionsContainer || !editButton) {
				console.error("Required elements for editing not found in post:", postId);
				return; // Stop if essential elements are missing
			}

			const originalTitle = titleEl.innerText;
			const originalText = textEl ? textEl.innerText : "";

			// --- Create Inputs ---
			const titleInput = document.createElement("input");
			titleInput.className = "post-title-input w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-lg font-bold text-gray-800 mt-1 mb-2"; // Adjusted class
			titleInput.value = originalTitle;
			titleEl.replaceWith(titleInput);

			let textInput = null;
			if (textEl) {
				textInput = document.createElement("textarea");
				textInput.className = "post-text-input w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-sm mb-3 resize-y"; // Adjusted class
				textInput.value = originalText;
				textEl.replaceWith(textInput);
			} else {
				// If no text element existed, create one for editing if needed (optional)
				// textInput = document.createElement('textarea'); ...
				// titleInput.insertAdjacentElement('afterend', textInput); // Insert after title
			}

			// --- Hide Media/Poll ---
			if (mediaContainer) mediaContainer.style.display = "none";
			if (pollContainer) pollContainer.style.display = "none";

			// --- Create and Replace Buttons ---
			const saveButton = document.createElement("button");
			saveButton.className = "edit-save-btn bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition duration-200";
			saveButton.textContent = "Save";
			saveButton.onclick = () => this.savePostEdit(postId, titleInput, textInput, mediaContainer, pollContainer, actionsContainer, originalTitle, originalText);

			const cancelButton = document.createElement("button");
			cancelButton.className = "edit-cancel-btn bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs font-medium transition duration-200";
			cancelButton.textContent = "Cancel";
			cancelButton.onclick = () => this.cancelPostEdit(postId, titleInput, textInput, mediaContainer, pollContainer, actionsContainer, originalTitle, originalText);

			// Replace edit and delete buttons with save and cancel
			editButton.replaceWith(saveButton);
			if (deleteButton) {
				deleteButton.replaceWith(cancelButton); // Replace delete with cancel
			} else {
				saveButton.insertAdjacentElement('afterend', cancelButton); // If no delete button, insert cancel after save
			}

			titleInput.focus();
		}

		async savePostEdit(postId, titleInput, textInput, mediaContainer, pollContainer, actionsContainer, originalTitle, originalText) {
			const updatedTitle = titleInput.value.trim();
			const updatedText = textInput ? textInput.value.trim() : null; // Handle case where textInput might be null

			if (!updatedTitle) return showToast("Title required.", "error");

			const saveButton = actionsContainer.querySelector(".edit-save-btn");
			if (saveButton) {
				saveButton.disabled = true;
				saveButton.textContent = "Saving...";
			}

			try {
				const payload = { title: updatedTitle };
				// Only include text if it was present or added
				if (updatedText !== null) {
					payload.text = updatedText;
				}

				const res = await fetch(`/posts/${postId}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify(payload),
				});
				const data = await res.json();

				if (res.ok && data.success) {
					showToast("✅ Post updated!");

					// --- Restore Title ---
					const newTitleEl = document.createElement("h3");
					newTitleEl.className = "text-lg font-bold text-gray-800"; // Match original class
					newTitleEl.innerText = updatedTitle;
					titleInput.replaceWith(newTitleEl);

					// --- Restore Text (if applicable) ---
					if (textInput) {
						const newTextEl = document.createElement("p");
						newTextEl.className = "post-text text-base text-gray-700 mb-3 whitespace-pre-wrap"; // Match original class
						newTextEl.innerText = updatedText;
						textInput.replaceWith(newTextEl);
					} else if (updatedText) {
						// If text was added during edit, create the element
						const newTextEl = document.createElement("p");
						newTextEl.className = "post-text text-base text-gray-700 mb-3 whitespace-pre-wrap";
						newTextEl.innerText = updatedText;
						// Insert after the title element
						newTitleEl.insertAdjacentElement('afterend', newTextEl);
					}

					// --- Restore Media/Poll Display ---
					if (mediaContainer) mediaContainer.style.display = "grid"; // Or 'block' if it wasn't grid originally
					if (pollContainer) pollContainer.style.display = "block";

					// --- Restore Buttons ---
					this.restoreEditDeleteButtons(actionsContainer);

				} else {
					throw new Error(data.error || "Failed to update post");
				}
			} catch (err) {
				showToast(`❌ Error updating post: ${err.message}`, "error");
				// Optionally revert UI changes or keep in edit mode
				if (saveButton) {
					saveButton.disabled = false;
					saveButton.textContent = "Save";
				}
			}
		}

		cancelPostEdit(postId, titleInput, textInput, mediaContainer, pollContainer, actionsContainer, originalTitle, originalText) {
			// --- Restore Title ---
			const originalTitleEl = document.createElement("h3");
			originalTitleEl.className = "text-lg font-bold text-gray-800"; // Match original class
			originalTitleEl.innerText = originalTitle;
			titleInput.replaceWith(originalTitleEl);

			// --- Restore Text (if applicable) ---
			if (textInput) {
				const originalTextEl = document.createElement("p");
				originalTextEl.className = "post-text text-base text-gray-700 mb-3 whitespace-pre-wrap"; // Match original class
				originalTextEl.innerText = originalText;
				textInput.replaceWith(originalTextEl);
			} else {
				// If textInput was null (meaning no original text), ensure no stray textarea remains
				// (This case might not be needed if textInput creation is handled carefully)
			}


			// --- Restore Media/Poll Display ---
			if (mediaContainer) mediaContainer.style.display = "grid"; // Or 'block'
			if (pollContainer) pollContainer.style.display = "block";

			// --- Restore Buttons ---
			this.restoreEditDeleteButtons(actionsContainer);
		}

		// Helper function to restore original Edit/Delete buttons
		restoreEditDeleteButtons(actionsContainer) {
			const saveButton = actionsContainer.querySelector(".edit-save-btn");
			const cancelButton = actionsContainer.querySelector(".edit-cancel-btn");

			if (!saveButton || !cancelButton) return; // Already restored or error

			const editButton = document.createElement("button");
			editButton.className = "post-edit-btn bg-blue-100 text-blue-600 hover:bg-blue-200 px-2 py-1 rounded text-xs font-medium transition duration-200";
			editButton.textContent = "Edit";
			// Note: The onclick handler is added via event delegation in setupEventListeners

			const deleteButton = document.createElement("button");
			deleteButton.className = "post-delete-btn bg-red-100 text-red-600 hover:bg-red-200 px-2 py-1 rounded text-xs font-medium transition duration-200";
			deleteButton.textContent = "Delete";
			// Note: The onclick handler is added via event delegation

			saveButton.replaceWith(editButton);
			cancelButton.replaceWith(deleteButton);
		}

		async safeDeletePost(postId, button) {
			/* ... Same logic ... */ if (!confirm("Delete post?")) return;
			try {
				const res = await fetch(`/posts/${postId}`, {
					method: "DELETE",
					credentials: "include",
				});
				const data = await res.json();
				if (res.ok && data.success) {
					button.closest(".post")?.remove();
					showToast("🗑️ Post deleted!");
				} else {
					throw new Error(data.error || "Failed");
				}
			} catch (err) {
				showToast(`❌ Error: ${err.message}`, "error");
			}
		}
		editCommentHandler(postId, commentId, button) {
			/* ... Uses classes from renderComment ... */
            // Use closest('.comment') to ensure we get the right parent
			const commentItem = button.closest(".comment");
			if (!commentItem) return;
            // Corrected selector for content area
			const commentContentArea = commentItem.querySelector(".comment-content-area");
			const editFormWrapper = commentItem.querySelector(
				".comment-edit-form-wrapper"
			);
			const editInput = editFormWrapper?.querySelector(
				".comment-edit-input"
			);
			const actionButtons = commentItem.querySelector(".comment-actions"); // Actions div itself

			if (
				!commentContentArea || // Check the content area
				!editFormWrapper ||
				!editInput ||
				!actionButtons
			) {
                console.error("Missing elements for comment edit:", { commentContentArea, editFormWrapper, editInput, actionButtons });
				return;
            }

			commentContentArea.classList.add("hidden"); // Hide the content area
			actionButtons.classList.add("hidden"); // Hide the actions div

            // Ensure the original text is correctly fetched
			const commentTextElement = commentContentArea.querySelector(".comment-text");
            if (commentTextElement) {
                editInput.value = commentTextElement.textContent.trim(); // Use trim()
            } else {
                console.warn("Could not find .comment-text element to get original value.");
                editInput.value = ''; // Fallback
            }

			editFormWrapper.classList.remove("hidden");
			editInput.focus();

            // Note: Save/Cancel handlers are now managed by event delegation in setupEventListeners
            // No need to add .onclick handlers here anymore.
		}

		async saveCommentEdit(
			postId,
			commentId,
			editInput,
			commentContentArea, // Use the content area div
			editFormWrapper,
			actionButtons
		) {
			/* ... Same logic ... */ const updatedText = editInput.value.trim();
			if (!updatedText) return showToast("Comment empty.", "error");
			const saveBtn = editFormWrapper.querySelector(".comment-save-btn");
			saveBtn.disabled = true;
			saveBtn.textContent = "Saving...";
			try {
				const res = await fetch(
					`/posts/${postId}/comments/${commentId}`, // Corrected endpoint if needed
					{
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						credentials: "include",
						body: JSON.stringify({ text: updatedText }),
					}
				);
				const data = await res.json();
				if (res.ok && data.success) {
					showToast("✅ Comment updated!");
                    // Update the text within the content area
					const textElement = commentContentArea.querySelector(".comment-text");
                    if (textElement) {
                        textElement.textContent = updatedText;
                    }
					this.cancelCommentEdit( // Call cancel to revert UI state
						commentContentArea,
						editFormWrapper,
						actionButtons
					);
				} else {
					throw new Error(data.error || "Failed");
				}
			} catch (err) {
				showToast(`❌ Error: ${err.message}`, "error");
			} finally {
				saveBtn.disabled = false;
				saveBtn.textContent = "Save";
			}
		}

		cancelCommentEdit(commentContentArea, editFormWrapper, actionButtons) { // Use content area div
			/* ... Same logic ... */ editFormWrapper.classList.add("hidden");
			commentContentArea.classList.remove("hidden"); // Show the content area
			actionButtons.classList.remove("hidden"); // Show the actions div
		}

		async safeDeleteComment(postId, commentId, button) {
			/* ... Same logic ... */ if (!confirm("Delete comment?")) return;
			try {
				const res = await fetch(
					`/posts/${postId}/comments/${commentId}`,
					{ method: "DELETE", credentials: "include" }
				);
				const data = await res.json();
				if (res.ok && data.success) {
					button.closest(".comment-item")?.remove();
					showToast("🗑️ Comment deleted!");
				} else {
					throw new Error(data.error || "Failed");
				}
			} catch (err) {
				showToast(`❌ Error: ${err.message}`, "error");
				button.disabled = false;
				button.classList.remove("opacity-50", "cursor-not-allowed");
			}
		}
		async votePoll(postId, optionIndex, listItem) { // Parameter is now the LI element
			/* ... Same logic ... */ if (!this.currentUserId) {
				showToast("Log in to vote.", "error");
				return;
			}

            // --- Get Option Text for Confirmation ---
            const optionTextElement = listItem.querySelector('.poll-option-text');
            const optionText = optionTextElement ? optionTextElement.textContent.trim() : 'this option'; // Fallback text

            // --- Confirmation Dialog ---
            // Use template literal to include the option text
            if (!confirm(`Are you sure you want to vote for "${optionText}"? You cannot change your vote later.`)) {
                return; // Stop if user cancels
            }
            // --- End Confirmation ---

            const pollOptionsList = listItem.closest("ul.poll-options"); // Find parent UL from the LI
            // Find all clickable list items within the same poll
            const allPollItems = pollOptionsList
                ? pollOptionsList.querySelectorAll("li.poll-option-item-clickable")
                : [];

            // Disable all list items in this poll temporarily
            allPollItems.forEach((item) => {
                item.classList.add('disabled', 'opacity-60', 'cursor-not-allowed');
            });

			try {
				const res = await fetch("/poll/vote", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ postId, optionIndex }),
				});
				const data = await res.json();
				if (res.ok && data.success && data.poll) {
					showToast("✅ Vote submitted!");
                    const postElement = listItem.closest(".post");					const pollContainer =
						postElement?.querySelector(".post-poll");
					if (pollContainer) {
						const updatedPostData = {
							_id: postId,
							poll: data.poll,
                            // Include other necessary post fields if renderPollSection needs them
                            // (though it currently only seems to use poll and currentUserId)
						};
						pollContainer.outerHTML =
							this.renderPollSection(updatedPostData);
                        // Note: After re-rendering, the 'disabled' classes added above are gone,
                        // but the new renderPollSection will correctly apply disabled classes
                        // based on the updated 'userHasVoted' status.
					} else {
						this.loadPosts(this.currentPage); // Fallback: reload posts if container not found
					}
				} else {
                    // Re-enable items only if it wasn't a "duplicate vote" error
					if (
						res.status !== 400 ||
						!data.message?.includes("already voted")
					) {
                        // Re-enable only the items that *should* be clickable (i.e., not disabled by render logic)
                        allPollItems.forEach((item) => {
                            // Check if the item *wasn't* originally disabled by the render logic
                            // A simple way is to check if it has the 'cursor-pointer' class which renderPollSection adds to clickable items
                            if (item.classList.contains('cursor-pointer')) {
                                item.classList.remove('disabled', 'opacity-60', 'cursor-not-allowed');
                            }
                        });
                    }
					throw new Error(data.message || data.error || "Failed");
				}
			} catch (err) {
				showToast(`❌ Vote Error: ${err.message}`, "error");
                // Ensure items are re-enabled on other errors too
                allPollItems.forEach((item) => {
                    // Re-enable if it should be clickable
                    if (item.classList.contains('cursor-pointer')) {
                         item.classList.remove('disabled', 'opacity-60', 'cursor-not-allowed');
                    }
                });
			}
		}
		async reportPost(postId, button) {
			/* ... Same logic ... */ if (!this.currentUserId)
				return showToast("Log in to report.", "error");
			if (!confirm("Report post?")) return;
			button.disabled = true;
			button.classList.add("opacity-50", "cursor-not-allowed");
			try {
				const reason = prompt("Reason (optional):");
				const res = await fetch(`/posts/${postId}/report`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ reason: reason || "No reason" }),
				});
				const data = await res.json();
				if (res.ok && data.success) {
					showToast("✅ Post reported.");
				} else {
					throw new Error(data.error || "Failed");
				}
			} catch (err) {
				showToast(`❌ Error: ${err.message}`, "error");
				button.disabled = false;
				button.classList.remove("opacity-50", "cursor-not-allowed");
			}
		}
	}

	window.app = new ForumApp(); // Initialize
    // Initial check for remove buttons and add button state on page load
    if (window.app && window.app.elements.pollOptionsWrapper) {
        window.app.updateRemoveOptionButtons();
    }
}); // End DOMContentLoaded
