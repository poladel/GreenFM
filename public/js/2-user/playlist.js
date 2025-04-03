document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("playlistForm");
    const genreButtons = document.querySelectorAll(".genre-btn");
    const songItems = document.querySelectorAll(".song-item");
    const songList = document.querySelector(".song-list");
    const mostRequestedContainer = document.querySelector(".most-requested-container ol");

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

            const response = await fetch("/playlist/recommend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ songTitle, singer, genre })
            });

            const result = await response.json();
            if (result.success) {
                location.reload();
            } else {
                alert(result.message);
                if (result.message.includes("logged in")) {
                    window.location.href = "/LogIn";
                }
            }

            submitButton.disabled = false;
        });
    }

    // Handle Delete Song Click (Fix for Dynamic Elements)
    if (songList) {
        songList.addEventListener("click", async (event) => {
            if (event.target.classList.contains("delete-btn")) {
                event.preventDefault();

                const songId = event.target.dataset.id;
                if (!songId) {
                    console.error("Error: No song ID found.");
                    return;
                }

                const confirmDelete = confirm("Are you sure you want to delete this song?");
                if (!confirmDelete) return;

                try {
                    const response = await fetch(`/playlist/delete/${songId}`, { method: "DELETE" });

                    const result = await response.json();
                    if (result.success) {
                        // Remove song from the UI without reload
                        event.target.closest(".song-item").remove();

                        // Fetch and update the top songs list
                        fetchTopSongs();
                    } else {
                        alert("Failed to delete the song.");
                    }
                } catch (error) {
                    console.error("Error deleting song:", error);
                    alert("An error occurred while deleting the song.");
                }
            }
        });
    }

    // Handle Like Song Click
    if (songList) {
        songList.addEventListener("click", async (event) => {
            if (event.target.classList.contains("fav-btn")) {
                event.preventDefault();

                // Retrieve the song ID from the data-id attribute
                const songId = event.target.getAttribute("data-id");

                if (!songId) {
                    console.error("Error: Song ID is undefined.");
                    return;
                }

                try {
                    const response = await fetch(`/playlist/like/${songId}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" }
                    });

                    const result = await response.json();
                    if (result.success) {
                        // Update the like count on the button
                        const likesCount = result.likesCount;
                        event.target.textContent = `❤️ ${likesCount}`;

                        // Fetch and update the top songs list
                        fetchTopSongs();
                    } else {
                        alert("Failed to like the song.");
                    }
                } catch (error) {
                    console.error("Error toggling like:", error);
                    alert("An error occurred while toggling the like.");
                }
            }
        });
    }

    // Handle Genre Filter
    genreButtons.forEach(button => {
        button.addEventListener("click", () => {
            const selectedGenre = button.dataset.genre;

            // Update Active Button
            genreButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");

            // Filter Songs
            songItems.forEach(song => {
                if (selectedGenre === "All" || song.dataset.genre === selectedGenre) {
                    song.style.display = "flex";
                } else {
                    song.style.display = "none";
                }
            });
        });
    });

    async function fetchTopSongs() {
        try {
            const response = await fetch("/playlist/top-songs"); // Fetch top songs from the backend
            const result = await response.json();

            if (result.success) {
                mostRequestedContainer.innerHTML = ""; // Clear the list
                result.topSongs.forEach((song) => {
                    const listItem = document.createElement("li");

                    // Create a clickable link for the song
                    const songLink = document.createElement("a");
                    songLink.href = song.link; // Use the link from the database
                    songLink.target = "_blank"; // Open in a new tab
                    songLink.textContent = `${song.title} by ${song.singer} (${song.likesCount} likes)`;

                    listItem.appendChild(songLink);
                    mostRequestedContainer.appendChild(listItem);
                });
            } else {
                console.error("Failed to fetch top songs.");
            }
        } catch (error) {
            console.error("Error fetching top songs:", error);
        }
    }

    // Fetch top songs on page load
    fetchTopSongs();
});
