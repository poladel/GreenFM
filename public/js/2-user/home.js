function showToast(message) {
    const toast = document.getElementById("toast");
    if (toast) {
        toast.textContent = message;
        // Apply show classes
        toast.classList.remove("invisible", "opacity-0", "bottom-[-100px]");
        toast.classList.add("visible", "opacity-100", "bottom-[30px]"); // Or bottom-10, etc.

        // Set timeout to hide
        setTimeout(() => {
            toast.classList.remove("visible", "opacity-100", "bottom-[30px]");
            toast.classList.add("invisible", "opacity-0", "bottom-[-100px]");
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateScheduleList();

    // Check if the admin-only elements exist
    const addImageButton = document.getElementById('add-image-button');
    const addVideoButton = document.getElementById('add-video-button');
    const imageInput = document.getElementById('image-input');
    const videoInput = document.getElementById('video-input');
    const postForm = document.getElementById('post-form');
    const closeModalButton = document.querySelector('.close-modal');

    // Add event listeners only if the elements exist
    if (addImageButton && imageInput) {
        addImageButton.addEventListener('click', () => {
            imageInput.click();
        });
    }

    if (addVideoButton && videoInput) {
        addVideoButton.addEventListener('click', () => {
            videoInput.click();
        });
    }

    if (imageInput) {
        imageInput.addEventListener('change', function () {
            const files = this.files;
            if (!files.length) return;

            for (let file of files) {
                if (file.type.startsWith('image/')) {
                    previewFile(file, 'image');
                }
            }
        });
    }

    if (videoInput) {
        videoInput.addEventListener('change', function () {
            if (this.files.length > 0) {
                previewFile(this.files[0], 'video');
            }
        });
    }

    if (postForm) {
        postForm.addEventListener('submit', async function (e) {
            e.preventDefault();
    
            const imageInput = document.getElementById('image-input');
            const videoInput = document.getElementById('video-input');
            const titleValue = document.getElementById('post-title').value.trim();
            const textValue = document.querySelector('.post-textbox').value.trim();

            // Check number of images
            if (imageInput.files.length > 6) {
                showToast("You can upload a maximum of 6 images.");
                return;
            }

            // Check image file sizes (20MB = 20 * 1024 * 1024)
            for (let file of imageInput.files) {
                if (file.size > 20 * 1024 * 1024) {
                    showToast(`Image "${file.name}" exceeds the 20MB size limit.`);
                    return;
                }
            }

            // Check video file size (20MB = 20 * 1024 * 1024)
            if (videoInput.files.length > 0) {
                const videoFile = videoInput.files[0];
                if (videoFile.size > 20 * 1024 * 1024) {
                    showToast(`Video "${videoFile.name}" exceeds the 20MB size limit.`);
                    return;
                }
            }

            const formData = new FormData();
            formData.append('title', titleValue);
            formData.append('text', textValue);

            for (let file of imageInput.files) {
                formData.append('media', file);
            }

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
                    window.location.reload();
                    postForm.reset();
                    document.getElementById('preview-container').innerHTML = '';
                } else {
                    alert(result.error || 'Failed to post');
                }
            } catch (error) {
                alert("Something went wrong!");
            }
        });
    } else {
        console.warn("Element with ID 'post-form' not found. This is expected if no admin is logged in.");
    }

    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => {
            const modal = document.getElementById('media-modal');
            const modalVideo = document.getElementById('modal-video');

            if (modal) {
                modal.classList.add('hidden'); // Hide modal
                modal.classList.remove('flex');
            }

            // Stop video if it's playing
            if (modalVideo) {
                modalVideo.pause();
                modalVideo.currentTime = 0;
            }

            // Re-enable scrolling
            document.body.style.overflow = '';
        });
    } else {
        console.warn("Element with class 'close-modal' not found.");
    }

    // Navigate left and right in modal
    const leftArrow = document.querySelector('.left-arrow');
    const rightArrow = document.querySelector('.right-arrow');

    if (leftArrow) {
        leftArrow.addEventListener('click', () => navigateMedia(-1));
    } else {
        console.warn("Element with class 'left-arrow' not found.");
    }

    if (rightArrow) {
        rightArrow.addEventListener('click', () => navigateMedia(1));
    } else {
        console.warn("Element with class 'right-arrow' not found.");
    }

    // Open modal when clicking on an image/video in a post
    document.addEventListener('click', (event) => {
        const modal = document.getElementById('media-modal');
        if (!modal) {
            console.warn("Modal element not found.");
            return;
        }

        if (event.target.classList.contains('post-media-img')) {
            currentMediaList = Array.from(event.target.parentElement.getElementsByClassName('post-media-img'))
                .map(img => img.src);
            openMediaModal(event.target.src, 'image');
        } else if (event.target.classList.contains('post-media')) {
            openMediaModal(event.target.src, 'video');
        }
    });
});

//----------Media Modal----------//
let currentMediaIndex = 0;
let currentMediaList = [];

// Example modification for openMediaModal
function openMediaModal(src, type) {
    const modal = document.getElementById('media-modal');
    const modalImage = document.getElementById('modal-image'); // Ensure these are defined or fetched
    const modalVideo = document.getElementById('modal-video'); // Ensure these are defined or fetched

    if (!modal || !modalImage || !modalVideo) return;

    // Set src and display block/none for image/video
    if (type === 'image') {
        modalImage.src = src;
        modalImage.style.display = 'block';
        modalVideo.style.display = 'none';
        modalVideo.pause(); // Pause video if switching to image
        modalVideo.currentTime = 0;
    } else if (type === 'video') {
        modalVideo.src = src;
        modalVideo.style.display = 'block';
        modalImage.style.display = 'none';
    }

    currentMediaIndex = currentMediaList.indexOf(src);
    modal.classList.remove('hidden'); // Show modal
    modal.classList.add('flex'); // Use flex to center

    document.body.style.overflow = 'hidden'; // Disable body scroll
}

 // Similar changes for Status Modal open/close functions
  function openStatusModal() {
      document.getElementById('status-modal').classList.remove('hidden');
      document.getElementById('status-modal').classList.add('flex'); // Or grid if needed
  }
  function closeStatusModal() {
      document.getElementById('status-modal').classList.add('hidden');
       document.getElementById('status-modal').classList.remove('flex');
  }

function navigateMedia(direction) {
    if (currentMediaList.length > 1) {
        currentMediaIndex = (currentMediaIndex + direction + currentMediaList.length) % currentMediaList.length;
        document.getElementById('modal-image').src = currentMediaList[currentMediaIndex];
    }
}

let imageFiles = []; // Store selected image files
let videoFile = null; // Store selected video file

function previewFile(file, type) {
    const previewContainer = document.getElementById('preview-container');
    if (!previewContainer) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const previewWrapper = document.createElement('div');
        // Tailwind for preview wrapper: relative, size, maybe bg
        previewWrapper.className = 'preview-wrapper relative w-[120px] h-auto border rounded-lg overflow-hidden';

        let mediaElement;
        if (type === 'image') {
            mediaElement = document.createElement('img');
            mediaElement.src = e.target.result;
            // Tailwind for image: full size within wrapper, rounded
            mediaElement.className = 'w-full h-auto block rounded-lg';
        } else if (type === 'video') {
            mediaElement = document.createElement('video');
            mediaElement.src = e.target.result;
            mediaElement.controls = true;
             // Tailwind for video
            mediaElement.className = 'w-full h-auto block rounded-lg';
        }

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button'; // Prevent form submission
        deleteButton.innerText = '✕'; // Use '✕' for smaller look
         // Tailwind for delete button: absolute positioning, style
         deleteButton.className = 'delete-btn absolute top-1 right-1 p-1 bg-red-600/80 text-white text-xs rounded-full leading-none w-5 h-5 flex items-center justify-center hover:bg-red-700';
        deleteButton.onclick = (event) => {
             event.stopPropagation(); // Prevent triggering other clicks
             removeFile(file, type, previewWrapper); // Pass wrapper to remove
         };


        previewWrapper.appendChild(mediaElement);
        previewWrapper.appendChild(deleteButton);
        previewContainer.appendChild(previewWrapper);

        // Store file logic remains the same...
         if (type === 'image') imageFiles.push(file);
         else if (type === 'video') videoFile = file;
    };
    reader.readAsDataURL(file);
}

function removeFile(fileToRemove, type, wrapperElement) {
    // Remove the preview element
    wrapperElement.remove();

    // Remove file from internal tracking array/variable
    if (type === 'image') {
         imageFiles = imageFiles.filter(f => f !== fileToRemove);
         // Also remove from the actual file input if possible/needed
         const imageInput = document.getElementById('image-input');
         // Create a new DataTransfer object, add remaining files, and assign to input
          if (imageInput) {
             const dataTransfer = new DataTransfer();
             imageFiles.forEach(f => dataTransfer.items.add(f));
             imageInput.files = dataTransfer.files;
          }

    } else if (type === 'video') {
         videoFile = null;
         const videoInput = document.getElementById('video-input');
          if (videoInput) videoInput.value = ''; // Clear video input
    }
     console.log("Remaining image files:", imageFiles);
     console.log("Video file:", videoFile);
}

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
    try {
        const response = await fetch(`/post/${postId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: newTitle,
                text: newText
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Post updated successfully!');
            window.location.reload();
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
                window.location.reload();
            } else {
                alert(result.error || 'Failed to delete post');
            }
        } catch (error) {
            alert('Failed to delete post');
        }
    }
}

//----------Like Function----------//
async function toggleLike(postId) {
    try {
        const response = await fetch(`/post/${postId}/like`, {
            method: 'POST'
        });

        const data = await response.json();

        if (response.ok) {
            const likeCountEl = document.getElementById(`like-count-${postId}`);
            likeCountEl.textContent = data.likeCount;

            const likeBtn = document.getElementById(`like-btn-${postId}`);
            likeBtn.style.color = data.liked ? 'red' : 'black';
        } else {
            alert(data.error || 'Failed to like post');
        }
    } catch (err) {
        alert('Error liking post');
        console.error(err);
    }
}

//------Comment Funtion-------//
async function submitComment(event, postId) {
    event.preventDefault();

    const form = event.target;
    const input = form.querySelector('.comment-input');
    const text = input.value.trim();

    if (!text) return;

    try {
        const res = await fetch(`/post/${postId}/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });

        const result = await res.json();

        if (res.ok) {
            const commentList = document.getElementById(`comments-${postId}`);
            const newComment = document.createElement('div');
            newComment.classList.add('comment');
            newComment.id = `comment-${result.comment._id}`;

            // Check permissions
            const canDelete = window.user &&
                (window.user.username === result.comment.username ||
                (Array.isArray(window.user.roles)
                ? (window.user.roles.includes('Admin') || window.user.roles.includes('Staff'))
                : (window.user.roles === 'Admin' || window.user.roles === 'Staff')));

            newComment.innerHTML = `
                <strong>${result.comment.username}:</strong> ${result.comment.text}
                ${canDelete ? `<button class="delete-comment-btn" onclick="deleteComment('${postId}', '${result.comment._id}')">🗑️</button>` : ''}
            `;

            window.location.reload();
            input.value = '';
        } else {
            alert(result.error || 'Failed to post comment.');
        }
    } catch (err) {
        console.error('Error posting comment:', err);
        alert('Failed to post comment.');
    }
}

async function deleteComment(postId, commentId) {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    console.log(`Attempting to delete comment: PostId=${postId}, CommentId=${commentId}`);

    try {
        const res = await fetch(`/post/${postId}/comment/${commentId}`, {
            method: 'DELETE'
        });

        const result = await res.json();

        if (res.ok) {
            const commentElement = document.getElementById(`comment-${commentId}`);
            if (commentElement) commentElement.remove();
        } else {
            alert(result.error || 'Failed to delete comment.');
        }
    } catch (err) {
        console.error('Error deleting comment:', err);
        alert('Failed to delete comment.');
    }
}

function enableEditComment(postId, commentId) {
    const commentElement = document.getElementById(`comment-${commentId}`);
    const form = commentElement.querySelector('.edit-comment-form');
    const textDisplay = commentElement.querySelector('.comment-text');

    textDisplay.style.display = 'none';
    form.style.display = 'block';
}

function cancelEditComment(commentId) {
    const commentElement = document.getElementById(`comment-${commentId}`);
    const form = commentElement.querySelector('.edit-comment-form');
    const textDisplay = commentElement.querySelector('.comment-text');

    form.style.display = 'none';
    textDisplay.style.display = 'inline';
}

async function editComment(event, postId, commentId) {
    event.preventDefault();

    const commentElement = document.getElementById(`comment-${commentId}`);
    const input = commentElement.querySelector('.edit-comment-input');
    const newText = input.value.trim();

    if (!newText) return;

    try {
        const res = await fetch(`/post/${postId}/comment/${commentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: newText })
        });

        const result = await res.json();

        if (res.ok) {
            const textDisplay = commentElement.querySelector('.comment-text');
            textDisplay.textContent = newText;
            cancelEditComment(commentId);
        } else {
            alert(result.error || 'Failed to edit comment.');
        }
    } catch (err) {
        console.error('Error editing comment:', err);
        alert('Error editing comment.');
    }
}

//-------Search & Filter-----------//
// Add currentPage variable
let currentPage = 1;
const postsPerPage = 20; // Or get this from backend if configurable

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    const filterMonth = document.getElementById("filterMonth");
    const filterYear = document.getElementById("filterYear");
    const filterBtn = document.getElementById("filterBtn");
    const postsContainer = document.getElementById("posts-container");
    const paginationControls = document.getElementById("pagination-controls");

    // --- Updated fetchPosts function ---
    const fetchPosts = async (query = {}, page = 1) => {
        // Add pagination parameters to the query
        query.page = page;
        query.limit = postsPerPage;
        currentPage = page; // Update current page

        const params = new URLSearchParams(query);
        try {
            // Assuming the endpoint now returns { html: '...', currentPage: ..., totalPages: ... }
            const res = await fetch(`/posts-filter?${params}`);
            const data = await res.json(); // Expect JSON response

            if (res.ok) {
                postsContainer.innerHTML = data.html; // Update posts list
                renderPaginationControls(data.currentPage, data.totalPages, query); // Update pagination
            } else {
                console.error("Failed to fetch posts:", data.error);
                postsContainer.innerHTML = '<p class="text-red-500">Error loading posts.</p>';
                paginationControls.innerHTML = ''; // Clear pagination on error
            }
        } catch (error) {
            console.error("Error during fetch:", error);
            postsContainer.innerHTML = '<p class="text-red-500">Error loading posts.</p>';
            paginationControls.innerHTML = ''; // Clear pagination on error
        }
    };

    // --- Render Pagination Controls ---
    const renderPaginationControls = (currentPage, totalPages, currentQuery) => {
        paginationControls.innerHTML = ''; // Clear existing controls

        if (totalPages <= 1) return; // No controls needed for 1 or 0 pages

        // Previous Button
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.className = 'px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                fetchPosts(currentQuery, currentPage - 1);
            }
        });
        paginationControls.appendChild(prevButton);

        // Page Info (Optional: Add page number links here if desired)
        const pageInfo = document.createElement('span');
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        pageInfo.className = 'text-sm text-gray-600';
        paginationControls.appendChild(pageInfo);

        // Next Button
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.className = 'px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                fetchPosts(currentQuery, currentPage + 1);
            }
        });
        paginationControls.appendChild(nextButton);
    };

    // --- Update Event Listeners ---
    searchInput.addEventListener("input", () => {
        // Reset to page 1 when searching
        fetchPosts({ search: searchInput.value }, 1);
    });

    filterBtn.addEventListener("click", () => {
        // Reset to page 1 when filtering
        fetchPosts({
            month: filterMonth.value,
            year: filterYear.value,
            search: searchInput.value // Keep search term if present
        }, 1);
    });

    // Initial load pagination (if data is passed from backend)
    // This assumes 'currentPage' and 'totalPages' are available globally or passed differently
    // If not, the initial renderPaginationControls call might need adjustment
    // or rely solely on the first fetchPosts call if filters are applied initially.
    // Example: If initial data is embedded:
    // const initialCurrentPage = parseInt(paginationControls.dataset.currentPage || '1');
    // const initialTotalPages = parseInt(paginationControls.dataset.totalPages || '1');
    // renderPaginationControls(initialCurrentPage, initialTotalPages, {});

}); // End DOMContentLoaded

//-------Scheduled Shows-----------//
function updateScheduleList() {
    const scheduleList = document.getElementById('schedule-list');

    // Clear the existing list
    scheduleList.innerHTML = '<li>Loading schedule...</li>';

    // Fetch today's schedule
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[now.getDay()]; // Dynamically get today's day
    console.log(`Today is: ${today}`); // Debugging log

    // Fetch the current school year from the schoolYearController
    fetch('/schoolYear')
        .then((res) => {
            if (!res.ok) {
                throw new Error(`Failed to fetch school year: ${res.status}`);
            }
            return res.json();
        })
        .then((data) => {
            console.log('School year data:', data); // Debugging log
            let schoolYear = data.schoolYear;

            // Normalize the schoolYear format to "2024-2025"
            schoolYear = schoolYear.split('/')[1].split(' ')[0] + '-' + schoolYear.split('/')[2];
            console.log('Normalized school year:', schoolYear); // Debugging log

            // Use the fetched school year to get the schedule
            return fetch(`/schedule?day=${today}&schoolYear=${schoolYear}`);
        })
        .then((res) => {
            if (!res.ok) {
                throw new Error(`Failed to fetch schedule: ${res.status}`);
            }
            return res.json();
        })
        .then((todaySchedule) => {
            console.log('Today\'s schedule:', todaySchedule); // Debugging log

            if (todaySchedule && todaySchedule.length > 0) {
                scheduleList.innerHTML = ''; // Clear the loading message
                todaySchedule.forEach((item) => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `${item.time}: ${item.showDetails.title}`;
                    scheduleList.appendChild(listItem);
                });
            } else {
                // If no schedule is available
                scheduleList.innerHTML = '<li>No schedule available.</li>';
            }
        })
        .catch((err) => {
            console.error('Failed to fetch schedule:', err);
            scheduleList.innerHTML = '<li>Error loading schedule. Please try again later.</li>';
        });
}

//-----Live Now-----//
// 🟢 Fetch schedule from MongoDB
function fetchSchedule() {
    fetch('/schedule')
        .then(res => res.json())
        .then(data => {
            if (data) {
                weekSchedule = data;
                renderScheduleList();
            }
        })
        .catch(err => console.error("Failed to fetch schedule:", err));
}
    // Parse time in "HH:MM"
    function parseTime(str) {
        const [h, m] = str.split(":").map(Number);
        return h * 60 + m;
    }

    // Determine current live show
    function getCurrentLive() {
        const now = new Date();

        // Convert to PH time (UTC+8)
        const utc = now.getTime() + now.getTimezoneOffset() * 60000;
        const phTime = new Date(utc + 3600000 * 8);  // PH time (UTC+8)

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[phTime.getDay()];

        const currentMinutes = phTime.getHours() * 60 + phTime.getMinutes();
        console.log(`Current time (in minutes): ${currentMinutes}`);

        if (!weekSchedule[today]) return null;

        const todaySchedule = weekSchedule[today].sort((a, b) => parseTime(a.start) - parseTime(b.start));

        console.log(`Today's schedule: `, todaySchedule);

        for (let i = 0; i < todaySchedule.length; i++) {
            const showStart = parseTime(todaySchedule[i].start);
            const showEnd = parseTime(todaySchedule[i].end);
            console.log(`Checking show ${todaySchedule[i].title}: start ${showStart}, end ${showEnd}`);

            // Check if the current time is between start and end times
            if (currentMinutes >= showStart && currentMinutes < showEnd) {
                return todaySchedule[i];
            }
        }

        return null; // No live show at the moment
    }

    // LIVE NOW!
    async function fetchStatus() {
        const res = await fetch('/status');
        const data = await res.json();
        const statusEl = document.getElementById('status-indicator');
        const subtextEl = document.getElementById('live-now-subtext');
        const linkEl = document.getElementById('live-now-link');

        if (data.live) {
            statusEl.textContent = 'LIVE NOW!';
            statusEl.className = 'status-live';
            subtextEl.textContent = ''; // Clear subtext
            linkEl.style.display = 'inline-block';
        } else {
            statusEl.textContent = 'OFFLINE';
            statusEl.className = 'status-offline';
            subtextEl.textContent = 'No live broadcast available.';
            linkEl.style.display = 'none';
        }
    }

    async function setStatus(live) {
        const res = await fetch('/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ live })
        });
        const data = await res.json();
        if (data.success) {
            fetchStatus();
            closeStatusModal();
        } else {
            alert(data.error || "Failed to update status.");
        }
    }

    function openStatusModal() {
        document.getElementById('status-modal').style.display = 'flex';
    }

    function closeStatusModal() {
        document.getElementById('status-modal').style.display = 'none';
    }

    window.addEventListener('DOMContentLoaded', fetchStatus);

    // 🚀 On page load
    fetchSchedule().then(() => {
        updateLiveNow();
        setInterval(updateLiveNow, 60000); // Keep updating every minute
    });
