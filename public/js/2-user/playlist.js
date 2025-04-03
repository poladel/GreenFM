document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("playlistForm");
    const songTable = document.getElementById("song-table");
    const genreFilter = document.getElementById("genre-filter");
    const songTableRows = document.querySelectorAll("#song-table tbody tr");

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

    // Handle song table actions
    if (songTable) {
        songTable.addEventListener("click", async (event) => {
            // Handle "Delete" button click
            if (event.target.classList.contains("delete-btn")) {
                console.log("Delete button clicked");
                console.log("Song ID:", event.target.dataset.id);
                event.preventDefault(); // Prevent default button behavior

                const songId = event.target.dataset.id;

                const confirmDelete = confirm("Are you sure you want to delete this song?");
                if (!confirmDelete) return;

                try {
                    const response = await fetch(`/playlist/delete/${songId}`, {
                        method: "DELETE"
                    });

                    const result = await response.json();
                    if (result.success) {
                        location.reload(); // Refresh page after deletion
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

    if (genreFilter) {
        genreFilter.addEventListener("change", (event) => {
            const selectedGenre = event.target.value;

            songTableRows.forEach((row) => {
                const rowGenre = row.getAttribute("data-genre");

                if (selectedGenre === "All" || rowGenre === selectedGenre) {
                    row.style.display = ""; // Show the row
                } else {
                    row.style.display = "none"; // Hide the row
                }
            });
        });
    }
});
