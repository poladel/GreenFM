document.addEventListener('DOMContentLoaded', function() {
    const postForm = document.getElementById('post-form');

    // Handle the form submission
    postForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const videoUrl = document.getElementById('video-url').value;
        const imageUrl = document.getElementById('image-url').value;
        const description = document.getElementById('description').value;

        const data = {
            videoUrl,
            imageUrl,
            description,
        };

        // Send the form data to the server via POST
        fetch('/admin/add-post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => response.json())
        .then(data => {
            // Handle successful post creation (you can show a success message or redirect)
            console.log('Success:', data);
            window.location.href = '/admin/archives';  // Redirect to the archives page
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    });
});
