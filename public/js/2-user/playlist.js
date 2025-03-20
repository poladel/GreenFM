document.getElementById("playlistForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const songTitle = document.getElementById("songTitle").value;
    const singer = document.getElementById("singer").value;

    const response = await fetch("/playlist/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songTitle, singer })
    });

    const result = await response.json();
    if (result.success) {
        location.reload();
    } else {
        alert(result.message);
    }
});