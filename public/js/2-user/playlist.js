document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("playlistForm");
    const genreButtons = document.querySelectorAll(".genre-btn");
    const songItems = document.querySelectorAll(".song-item");
    const songList = document.querySelector(".song-list");

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
                        event.target.closest(".song-item").remove(); // Remove song from UI without reload
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
});
