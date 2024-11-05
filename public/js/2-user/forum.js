document.getElementById('postButton').addEventListener('click', function() {
    const isAuthenticated = this.getAttribute('data-authenticated') === 'true';
    if (isAuthenticated) {
        alert('Post submitted');
        console.log('Post Submitted');
        // Additional logic for submitting the post can be added here
    } else {
        document.getElementById('loginPopup').style.display = 'flex';
    }
});

// Logic to close the modal
document.querySelector('.close-button').addEventListener('click', function() {
    document.getElementById('loginPopup').style.display = 'none';
});