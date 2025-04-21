function showToast(message) {
    const toast = document.getElementById("toast");
    if (toast) {
        toast.textContent = message;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
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

    if (postForm) {
        postForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            console.log('Post form submitted');
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
                    loadPosts();
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
                modal.style.display = 'none';
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

function openMediaModal(src, type) {
    const modal = document.getElementById('media-modal');
    const modalImage = document.getElementById('modal-image');
    const modalVideo = document.getElementById('modal-video');

    if (!modal || !modalImage || !modalVideo) {
        console.warn("Modal elements not found.");
        return;
    }

    if (type === 'image') {
        modalImage.src = src;
        modalImage.style.display = 'block';
        modalVideo.style.display = 'none';
    } else if (type === 'video') {
        modalVideo.src = src;
        modalVideo.style.display = 'block';
        modalImage.style.display = 'none';
    }

    currentMediaIndex = currentMediaList.indexOf(src);
    modal.style.display = 'flex';

    // Disable scrolling
    document.body.style.overflow = 'hidden';
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

    if (type === 'image' && file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.maxWidth = '100px';
            img.style.margin = '5px';
            img.style.borderRadius = '8px';

            // Create a delete button for the image preview
            const deleteButton = document.createElement('button');
            deleteButton.innerText = 'Delete';
            deleteButton.classList.add('delete-btn');
            deleteButton.onclick = () => removeFile(file, 'image', img);

            const previewWrapper = document.createElement('div');
            previewWrapper.classList.add('preview-wrapper');
            previewWrapper.appendChild(img);
            previewWrapper.appendChild(deleteButton);

            previewContainer.appendChild(previewWrapper);

            // Store the file for later submission
            imageFiles.push(file);
        };
        reader.readAsDataURL(file);
    } else if (type === 'video' && file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const video = document.createElement('video');
            video.src = e.target.result;
            video.controls = true;
            video.style.maxWidth = '200px';

            // Create a delete button for the video preview
            const deleteButton = document.createElement('button');
            deleteButton.innerText = 'Delete';
            deleteButton.classList.add('delete-btn');
            deleteButton.onclick = () => removeFile(file, 'video', video);

            const previewWrapper = document.createElement('div');
            previewWrapper.classList.add('preview-wrapper');
            previewWrapper.appendChild(video);
            previewWrapper.appendChild(deleteButton);

            previewContainer.appendChild(previewWrapper);

            // Store the file for later submission
            videoFile = file;
        };
        reader.readAsDataURL(file);
    }
}

function removeFile(file, type, previewElement) {
    const previewContainer = document.getElementById('preview-container');

    // Remove the file from the preview
    previewContainer.removeChild(previewElement.parentElement);

    // Remove the file from the stored files array
    if (type === 'image') {
        imageFiles = imageFiles.filter(f => f !== file);
    } else if (type === 'video') {
        videoFile = null;
    }
}

// Handle form submission
document.getElementById('post-form').addEventListener('submit', async function (e) {
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
                    ? window.user.roles.includes('Admin')
                    : window.user.roles === 'Admin'));

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

    // Update "Live Now" section
    function updateLiveNow() {
        const live = getCurrentLive(); // Get the current live show
        const container = document.getElementById("live-now-content");
        const link = document.getElementById("live-now-link");

        if (live) {
            container.innerHTML = `
                <p style="margin: 0 0 8px;"><strong>${live.start} - ${live.title}</strong></p>
            `;
            link.href = "/live";
            link.style.display = "inline-block"; // Show the "Go to live" button
        } else {
            container.innerHTML = `<p>No live show at the moment.</p>`; // No live show message
            link.style.display = "none"; // Hide the "Go to live" button
        }
    }

    // 🚀 On page load
    fetchSchedule().then(() => {
        updateLiveNow();
        setInterval(updateLiveNow, 60000); // Keep updating every minute
    });
