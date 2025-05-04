document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("playlistForm");
    const genreButtons = document.querySelectorAll(".genre-btn");
    const songList = document.querySelector(".song-list");
    const mostRequestedContainer = document.querySelector(".most-requested-container ol");
    // Get user email if available (needed for like button state)
    const currentUserEmail = document.body.dataset.userEmail || null; // Assuming email is added to body data attribute
    // Get user roles if available
    const currentUserRoles = (document.body.dataset.userRoles || '').split(',').filter(role => role); // Get roles as an array

    // --- Socket.IO Connection ---
    let socket;
    if (typeof io !== 'undefined') {
        socket = io();

        socket.on('connect', () => {
            console.log('Playlist Socket Connected:', socket.id);
        });

        socket.on('disconnect', () => {
            console.log('Playlist Socket Disconnected');
        });

        // --- Socket Event Listeners ---
        socket.on('playlistUpdated', (newSongData) => {
            console.log('Received playlistUpdated:', newSongData);
            addSongToList(newSongData); // Add the new song to the UI
            fetchTopSongs(); // Refresh top songs list
        });

        socket.on('songDeleted', (data) => {
            console.log('Received songDeleted:', data);
            removeSongFromList(data.songId); // Remove the song from the UI
            fetchTopSongs(); // Refresh top songs list
        });

        socket.on('songLiked', (data) => {
            console.log('Received songLiked:', data);
            updateLikeButton(data.songId, data.likesCount, data.userEmail, data.liked); // Update the specific like button
            fetchTopSongs(); // Refresh top songs list
        });
        // --- End Socket Event Listeners ---

    } else {
        console.error("Socket.IO client library not found.");
    }
    // --- END Socket.IO Connection ---


    // Handle Song Recommendation Form Submission
    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const submitButton = form.querySelector("button[type='submit']");
            submitButton.disabled = true; // Prevent multiple clicks

            const songTitle = document.getElementById("songTitle").value.trim();
            const singer = document.getElementById("singer").value.trim();
            const genre = document.getElementById("genre").value.trim();

            if (!songTitle || !singer || !genre) {
                alert("Please fill in all fields.");
                submitButton.disabled = false;
                return;
            }

            try {
                const response = await fetch("/playlist/recommend", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ songTitle, singer, genre })
                });

                // Check if request was successful (status 201) or conflict (409) or other error
                if (response.status === 201) {
                    form.reset(); // Clear form on success
                    // UI update is handled by the 'playlistUpdated' socket event
                } else {
                    const result = await response.json(); // Parse error message
                    alert(result.message || `Error: ${response.statusText}`);
                    if (response.status === 401) { // Unauthorized
                        window.location.href = "/LogIn";
                    }
                }
            } catch (error) {
                 console.error("Error submitting recommendation:", error);
                 alert("An error occurred while submitting your request.");
            } finally {
                 submitButton.disabled = false;
            }
        });
    }

    // Handle Delete Song Click (Event Delegation)
    if (songList) {
        songList.addEventListener("click", async (event) => {
            const deleteButton = event.target.closest(".delete-btn");
            if (deleteButton) {
                event.preventDefault();

                const songItem = deleteButton.closest(".song-item");
                const songId = songItem?.dataset.songId;

                if (!songId) {
                    console.error("Error: No song ID found on song item.");
                    return;
                }

                const confirmDelete = confirm("Are you sure you want to delete this song?");
                if (!confirmDelete) return;

                // Add visual feedback
                deleteButton.disabled = true;
                deleteButton.textContent = '...';

                try {
                    const response = await fetch(`/playlist/delete/${songId}`, { method: "DELETE" });
                    // No need to check result.success here, socket event handles UI update
                    if (!response.ok) {
                        // Handle error case if needed (e.g., show alert)
                        const result = await response.json();
                        alert("Failed to delete the song: " + (result.message || 'Unknown error'));
                        deleteButton.disabled = false; // Restore button on failure
                        deleteButton.textContent = '❌';
                    }
                    // On success, socket event 'songDeleted' will trigger UI removal
                } catch (error) {
                    console.error("Error deleting song:", error);
                    alert("An error occurred while deleting the song.");
                    deleteButton.disabled = false; // Restore button on error
                    deleteButton.textContent = '❌';
                }
            }
        });
    }

    // Handle Like Song Click (Event Delegation)
    if (songList) {
        songList.addEventListener("click", async (event) => {
            const likeButton = event.target.closest(".fav-btn");
            if (likeButton) {
                event.preventDefault();

                const songItem = likeButton.closest(".song-item");
                const songId = songItem?.dataset.songId;

                if (!songId) {
                    console.error("Error: Song ID is undefined on the song item.");
                    return;
                }

                // Add visual feedback
                const originalContent = likeButton.innerHTML;
                likeButton.innerHTML = '...';
                likeButton.disabled = true;

                try {
                    const response = await fetch(`/playlist/like/${songId}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" }
                    });

                    if (!response.ok) {
                        const result = await response.json();
                        console.error("Failed to toggle like:", result.message);
                        alert("Failed to like the song. " + (result.message || ''));
                        likeButton.innerHTML = originalContent; // Restore on failure
                        likeButton.disabled = false;
                    }
                    // On success, socket event 'songLiked' will trigger UI update
                } catch (error) {
                    console.error("Error toggling like:", error);
                    alert("An error occurred while toggling the like.");
                    likeButton.innerHTML = originalContent; // Restore on error
                    likeButton.disabled = false;
                }
                // No finally block needed here as socket handles the final state
            }
        });
    }

    // Handle Genre Filter (Modified to handle dynamic elements)
    genreButtons.forEach(button => {
        button.addEventListener("click", () => {
            const selectedGenre = button.dataset.genre;

            // Update Active Button Styles
            genreButtons.forEach(btn => {
                btn.classList.remove("active", "bg-[#00722A]", "text-white");
                btn.classList.add("bg-gray-100", "text-gray-700");
            });
            button.classList.add("active", "bg-[#00722A]", "text-white");
            button.classList.remove("bg-gray-100", "text-gray-700");

            // Filter Songs - Get current song items
            const currentSongItems = songList.querySelectorAll(".song-item");
            currentSongItems.forEach(song => {
                if (selectedGenre === "All" || song.dataset.genre === selectedGenre) {
                    song.style.display = "flex"; // Show matching songs
                } else {
                    song.style.display = "none"; // Hide non-matching songs
                }
            });
        });
    });

    // --- Function to create song item HTML ---
    function createSongItemHTML(songData) {
        // Ensure songData and nested properties exist
        const songId = songData?._id || '';
        const genre = songData?.genre || 'Others';
        const link = songData?.link || '#';
        const title = songData?.title || 'Untitled';
        const singer = songData?.singer || 'Unknown Artist';
        const requesterUsername = songData?.user?.username || 'Unknown';
        const requesterEmail = songData?.user?.email || null; // Email of the user who requested the song
        const likesArray = Array.isArray(songData?.likes) ? songData.likes : [];
        const likesCount = likesArray.length;

        // currentUserEmail and currentUserRoles are available from the outer scope
        const userLiked = currentUserEmail ? likesArray.some(like => like.email === currentUserEmail) : false;

        // Check if the current user can delete: is the owner OR is an Admin/Staff
        const isOwner = currentUserEmail && requesterEmail === currentUserEmail;
        // Explicitly check the global currentUserRoles array
        const isAdminOrStaff = Array.isArray(currentUserRoles) && (currentUserRoles.includes('Admin') || currentUserRoles.includes('Staff'));
        const canDelete = isOwner || isAdminOrStaff;

        // Debugging log (optional, remove after confirming fix)
        console.log(`[createSongItemHTML] Song: ${title}, Requester: ${requesterEmail}, CurrentUser: ${currentUserEmail}, Roles: ${currentUserRoles}, isOwner: ${isOwner}, isAdminOrStaff: ${isAdminOrStaff}, canDelete: ${canDelete}`);


        return `
            <div class="song-item flex items-center justify-between bg-gray-100 p-2.5 rounded-[10px]" data-genre="${genre}" data-song-id="${songId}">
                <div class="song-info flex items-center gap-2.5">
                    <div class="song-thumbnail w-10 h-10 bg-gray-300 rounded-md flex-shrink-0"></div>
                    <div class="song-text flex flex-col">
                        <p class="song-title font-bold text-gray-800 text-base mb-0 leading-tight">
                            <a href="${link}" target="_blank" class="text-blue-600 hover:underline">${title}</a>
                        </p>
                        <p class="song-artist text-sm text-gray-900 font-light mt-0 mb-0 leading-tight">by: ${singer}</p>
                        <p class="song-requester text-xs text-gray-500 mt-0.5 leading-tight">Requested by ${requesterUsername}</p>
                    </div>
                </div>
                <div class="song-actions flex gap-2.5 items-center">
                    ${canDelete ? `<button class="delete-btn bg-transparent border-none cursor-pointer text-lg p-1 hover:text-red-600">❌</button>` : ''}
                    ${currentUserEmail ? `
                        <button class="fav-btn bg-transparent border-none cursor-pointer text-base p-1 flex items-center gap-1 ${userLiked ? 'text-red-500' : 'text-gray-500'} hover:text-red-400">
                            <span>❤️</span>
                            <span>${likesCount}</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // --- Function to add a song to the list ---
    function addSongToList(songData) {
        if (!songList) return;
        // Check if song already exists in the DOM to prevent duplicates from potential race conditions
        if (songList.querySelector(`[data-song-id="${songData._id}"]`)) {
            console.log(`Song ${songData._id} already exists in the list. Skipping add.`);
            return;
        }

        const songHTML = createSongItemHTML(songData);
        // Add to the top of the list for newest first
        songList.insertAdjacentHTML('afterbegin', songHTML);

        // Re-apply filter if needed
        const activeGenreButton = document.querySelector('.genre-btn.active');
        const selectedGenre = activeGenreButton ? activeGenreButton.dataset.genre : 'All';
        const newSongElement = songList.querySelector(`[data-song-id="${songData._id}"]`);
        if (newSongElement && selectedGenre !== 'All' && songData.genre !== selectedGenre) {
            newSongElement.style.display = 'none';
        }
        // Remove "empty" message if present
        const emptyMessage = songList.querySelector('.empty-playlist-message');
        if (emptyMessage) emptyMessage.remove();
    }

    // --- Function to remove a song from the list ---
    function removeSongFromList(songId) {
        if (!songList) return;
        const songElement = songList.querySelector(`.song-item[data-song-id="${songId}"]`);
        if (songElement) {
            songElement.remove();
        }
        // Add "empty" message if list becomes empty
        if (songList.children.length === 0) {
             songList.innerHTML = '<p class="text-center text-gray-500 py-4 empty-playlist-message">The playlist is currently empty.</p>';
        }
    }

    // --- Function to update like button state ---
    function updateLikeButton(songId, likesCount, userEmailWhoLiked, likedStatus) {
        if (!songList) return;
        const songElement = songList.querySelector(`.song-item[data-song-id="${songId}"]`);
        if (!songElement) return;

        const likeButton = songElement.querySelector('.fav-btn');
        if (likeButton) {
            // Update count for everyone
            likeButton.innerHTML = `<span>❤️</span> <span>${likesCount}</span>`;
            likeButton.disabled = false; // Ensure button is enabled after update

            // Update color only if the update is relevant to the current user viewing the page
            if (currentUserEmail === userEmailWhoLiked) {
                if (likedStatus) {
                    likeButton.classList.add('text-red-500');
                    likeButton.classList.remove('text-gray-500');
                } else {
                    likeButton.classList.remove('text-red-500');
                    likeButton.classList.add('text-gray-500');
                }
            }
        }
    }
    // --- END ADDED FUNCTIONS ---


    async function fetchTopSongs() {
        try {
            const response = await fetch("/playlist/top-songs");
            const result = await response.json();

            if (result.success && mostRequestedContainer) {
                mostRequestedContainer.innerHTML = ""; // Clear the list
                if (result.topSongs.length === 0) {
                    mostRequestedContainer.innerHTML = "<li>No songs requested yet.</li>";
                } else {
                    result.topSongs.forEach((song) => {
                        const listItem = document.createElement("li");
                        const songLink = document.createElement("a");
                        songLink.href = song.link || '#'; // Use link or fallback
                        songLink.target = "_blank";
                        songLink.textContent = `${song.title} by ${song.singer} (${song.likesCount} likes)`;
                        songLink.classList.add("hover:underline", "text-blue-600"); // Add styling
                        listItem.appendChild(songLink);
                        mostRequestedContainer.appendChild(listItem);
                    });
                }
            } else if (mostRequestedContainer) {
                console.error("Failed to fetch top songs.");
                mostRequestedContainer.innerHTML = "<li>Error loading top songs.</li>";
            }
        } catch (error) {
            console.error("Error fetching top songs:", error);
             if (mostRequestedContainer) {
                mostRequestedContainer.innerHTML = "<li>Error loading top songs.</li>";
            }
        }
    }

    // Fetch top songs on page load
    fetchTopSongs();

    // Add empty message if initially empty (check after initial render)
    if (songList && songList.children.length === 0) {
         songList.innerHTML = '<p class="text-center text-gray-500 py-4 empty-playlist-message">The playlist is currently empty.</p>';
    }
});
