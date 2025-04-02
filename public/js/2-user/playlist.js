document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("playlistForm");
    const playlist = document.getElementById("playlist");
    const genreSelect = document.getElementById("genre-select");
    const songTable = document.getElementById("song-table");

    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault(); // Prevent default form submission

            // Disable the button to prevent double clicks
            const submitButton = form.querySelector("button[type='submit']");
            submitButton.disabled = true;

            const songTitle = document.getElementById("songTitle").value;
            const singer = document.getElementById("singer").value;
            const genre = document.getElementById("genre").value; // Ensure genre is included

            const response = await fetch("/playlist/recommend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ songTitle, singer, genre }) // Include genre in the request body
            });

            const result = await response.json();
            if (result.success) {
                location.reload();
            } else {
                alert(result.message);
                if (result.message.includes("logged in")) {
                    window.location.href = "/LogIn"; // Redirect to login
                }
            }

            // Re-enable the button after the request is completed
            submitButton.disabled = false;
        }, { once: true }); // Ensures the event listener is added only once
    }

    // Delete song from playlist
    if (playlist) {
        playlist.addEventListener("click", async (event) => {
            if (event.target.classList.contains("delete-btn")) {
                const songId = event.target.dataset.id;

                const confirmDelete = confirm("Are you sure you want to delete this song?");
                if (!confirmDelete) return;

                const response = await fetch(`/playlist/delete/${songId}`, {
                    method: "DELETE"
                });

                const result = await response.json();
                if (result.success) {
                    location.reload(); // Refresh page after deletion
                } else {
                    alert("Failed to delete the song.");
                }
            }
        });
    }

    // Fetch and display songs by genre
    if (genreSelect) {
        genreSelect.addEventListener("change", async () => {
            const genre = genreSelect.value;
            try {
                const response = await fetch(`/songs/${genre}`);
                const songs = await response.json();

                // Clear existing rows
                songTable.innerHTML = `
                    <tr>
                        <th>Title</th>
                        <th>Artist</th>
                        <th>Genre</th>
                    </tr>
                `;

                // Populate table with songs
                songs.forEach((song) => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${song.title}</td>
                        <td>${song.artist}</td>
                        <td>${song.genre}</td>
                    `;
                    songTable.appendChild(row);
                });
            } catch (err) {
                console.error("Failed to fetch songs:", err);
            }
        });
    }
});
