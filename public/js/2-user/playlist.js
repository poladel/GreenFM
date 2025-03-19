document.getElementById('playlistForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('title').value;
    const artist = document.getElementById('artist').value;

    const response = await fetch('/playlist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, artist })
    });

    const data = await response.json();
    if (data.success) {
        location.reload();
    } else {
        alert('Error adding song');
    }
});