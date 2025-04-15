document.getElementById('add-image-button').addEventListener('click', () => {
    document.getElementById('image-input').click();
});

document.getElementById('add-video-button').addEventListener('click', () => {
    document.getElementById('video-input').click();
});

// Show file previews, handle image & video file selection
document.getElementById('image-input').addEventListener('change', function () {
    const files = this.files;

    if (!files.length) return;

    for (let file of files) {
        if (file.type.startsWith('image/')) {
            previewFile(file, 'image');
        }
    }
});

document.getElementById('video-input').addEventListener('change', function () {
    previewFile(this.files[0], 'video');
});

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
document.getElementById('post-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    const titleValue = document.getElementById('post-title').value.trim();
    const textValue = document.querySelector('.post-textbox').value.trim();

    formData.append('title', titleValue);
    formData.append('text', textValue);

    const mediaInput = document.getElementById('image-input');
    for (let file of mediaInput.files) {
        formData.append('media', file);
    }

    const videoInput = document.getElementById('video-input');
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

// Fetch posts and display them
async function loadPosts() {
    try {
        const response = await fetch('/posts'); // Fetch posts from the server
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const posts = await response.json();
        const container = document.getElementById('posts-container');
        
        if (Array.isArray(posts) && posts.length > 0) {
            container.innerHTML = posts.map(post => {
                let mediaContent = '';

                if (post.media && post.media.length > 0) {
                    mediaContent = post.media.map(image => `<img src="${image}" class="post-media-img" />`).join('');
                }

                if (post.video) {
                    mediaContent += `<video src="${post.video}" controls class="post-media"></video>`;
                }

                return `
                    <div class="post" id="post-${post._id}">
                        <p><strong>${post.title}</strong></p>
                        <p>${post.text}</p>
                        <div class="post-media">
                            ${mediaContent}
                        </div>
                        <div class="post-actions">
                            <button class="edit-btn" onclick="editPost('${post._id}', '${post.title}', '${post.text}')">Edit</button>
                            <button class="delete-btn" onclick="deletePost('${post._id}')">Delete</button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<p>No posts available.</p>';
        }
    } catch (error) {
        const container = document.getElementById('posts-container');
        container.innerHTML = '<p>Failed to load posts. Please try again later.</p>';
        console.error('Failed to load posts:', error);
    }
}

// Call the loadPosts function when the page is loaded
window.addEventListener('DOMContentLoaded', loadPosts);

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

//----------Media Modal----------//

let currentMediaIndex = 0;
let currentMediaList = [];

// Open modal when clicking on an image/video in a post
document.addEventListener('click', (event) => {
    if (event.target.classList.contains('post-media-img')) {
        currentMediaList = Array.from(event.target.parentElement.getElementsByClassName('post-media-img'))
            .map(img => img.src);
        openMediaModal(event.target.src, 'image');
    } else if (event.target.classList.contains('post-media')) {
        openMediaModal(event.target.src, 'video');
    }
});

function openMediaModal(src, type) {
    const modal = document.getElementById('media-modal');
    const modalImage = document.getElementById('modal-image');
    const modalVideo = document.getElementById('modal-video');

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

document.querySelector('.close-modal').addEventListener('click', () => {
    const modal = document.getElementById('media-modal');
    const modalVideo = document.getElementById('modal-video');

    modal.style.display = 'none';

    // Stop video if it's playing
    modalVideo.pause();
    modalVideo.currentTime = 0;

    // Re-enable scrolling
    document.body.style.overflow = '';
});

// Close modal
document.querySelector('.close-modal').addEventListener('click', () => {
    document.getElementById('media-modal').style.display = 'none';
});

// Navigate left and right in modal
document.querySelector('.left-arrow').addEventListener('click', () => navigateMedia(-1));
document.querySelector('.right-arrow').addEventListener('click', () => navigateMedia(1));

function navigateMedia(direction) {
    if (currentMediaList.length > 1) {
        currentMediaIndex = (currentMediaIndex + direction + currentMediaList.length) % currentMediaList.length;
        document.getElementById('modal-image').src = currentMediaList[currentMediaIndex];
    }
}


//-------Schedule-----------//
   // Initialize as empty — filled from DB
    let weekSchedule = {};

    // 🟢 Fetch schedule from MongoDB
    function fetchSchedule() {
        fetch('/api/schedule')
            .then(res => res.json())
            .then(data => {
                if (data) {
                    weekSchedule = data;
                    renderScheduleList();
                }
            })
            .catch(err => console.error("Failed to fetch schedule:", err));
    }

    // 🟢 Save schedule to MongoDB
    function saveSchedule() {
        console.log("Sending weekSchedule:", weekSchedule); // 👈 Add this here

        fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(weekSchedule)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                console.log("✅ Schedule saved!");
            } else {
                console.warn("⚠️ Schedule not saved properly:", data);
            }
        })
        .catch(err => console.error("Failed to save schedule:", err));
    } 

    // Show schedule on the page (used when page loads or when saving)
    function renderScheduleList() {
        const list = document.getElementById("schedule-list");
        list.innerHTML = "";

        const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const today = days[new Date().getDay()];

        if (weekSchedule[today]) {
            weekSchedule[today]
                .sort((a, b) => parseTime(a.start) - parseTime(b.start))
                .forEach(slot => {
                    const li = document.createElement("li");
                    li.textContent = `${slot.start} - ${slot.end} | ${slot.title}`;
                    list.appendChild(li);
                });
        } else {
            list.innerHTML = "<li>No shows scheduled today.</li>";
        }
    }

    // Toggle edit form
    document.getElementById("edit-schedule-btn").addEventListener("click", () => {
        const form = document.getElementById("schedule-form");
        form.style.display = form.style.display === "none" ? "block" : "none";

        // Pre-fill form with current values
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        days.forEach(day => {
            const daySection = form.querySelector(`[data-day="${day}"]`);
            const slotsContainer = daySection.querySelector('.slots');
            slotsContainer.innerHTML = ''; // Clear any existing slots

            // Check if there are any slots for this day and render them
            if (weekSchedule[day] && weekSchedule[day].length > 0) {
                weekSchedule[day].forEach(slot => {
                    const slotElement = document.createElement("div");
                    slotElement.className = "slot";
                    slotElement.innerHTML = `
                        <input type="time" class="slot-start" value="${slot.start}" required>
                        <input type="time" class="slot-end" value="${slot.end}" required>
                        <input type="text" class="slot-title" value="${slot.title}" placeholder="Show Title" required>
                        <button type="button" class="remove-slot-btn">✖</button>
                    `;
                    slotsContainer.appendChild(slotElement);

                    // Remove slot functionality
                    slotElement.querySelector(".remove-slot-btn").addEventListener("click", () => {
                        slotElement.remove();
                    });
                });
            } else {
                // If no slots for the day, you can add a default "No slots" message if needed
                slotsContainer.innerHTML = '<p>No live shows scheduled</p>';
            }
        });
    });

    // Save form data to weekSchedule + DB
    document.getElementById("schedule-form").addEventListener("submit", (e) => {
        e.preventDefault();
        weekSchedule = gatherFormData();
        renderScheduleList();
        saveSchedule();
        e.target.style.display = "none"; // Hide form after saving
    }); 

    // Capitalize string (e.g., "monday" → "Monday")
    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function gatherFormData() {
        const form = document.getElementById("schedule-form");
        const data = {};
    
        // Loop through each day (Monday to Friday)
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(day => {
            const daySection = form.querySelector(`[data-day="${day}"]`);
            const slots = [];
    
            // Gather all slots for this day
            daySection.querySelectorAll('.slot').forEach(slotEl => {
                const start = slotEl.querySelector('.slot-start').value;
                const end = slotEl.querySelector('.slot-end').value;
                const title = slotEl.querySelector('.slot-title').value;
                if (start && end && title) {
                    slots.push({ start, end, title });
                }
            });
    
            // Assign gathered slots to the respective day
            data[day] = slots;
        });
    
        return data;
    }    

    document.querySelectorAll(".add-slot-btn").forEach(button => {
        button.addEventListener("click", () => {
            const container = button.previousElementSibling;
            const slot = document.createElement("div");
            slot.className = "slot";
            slot.innerHTML = `
                <input type="time" class="slot-start" required>
                <input type="time" class="slot-end" required>
                <input type="text" class="slot-title" placeholder="Show Title" required>
                <button type="button" class="remove-slot-btn">✖</button>
            `;
            container.appendChild(slot);
    
            slot.querySelector(".remove-slot-btn").addEventListener("click", () => {
                slot.remove();
            });
        });
    });

//-----Live Now-----//
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
