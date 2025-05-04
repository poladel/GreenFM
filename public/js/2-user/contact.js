document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent default form submission

    // Show loading state immediately
    Swal.fire({
        title: 'Sending...',
        text: 'Please wait while we send your message.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    // Capture form data
    const formData = new URLSearchParams(new FormData(e.target));

    // Send form data to the server
    const response = await fetch('/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const result = await response.text();

    // Clear the message field only
    document.getElementById('message').value = '';

    // Close the loading state before showing the final result
    Swal.close();

    // Show SweetAlert notification immediately
    if (response.ok) {
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: result, // "Feedback sent successfully!"
        showConfirmButton: false, // Remove the "OK" button
        timer: 1500, // Auto-close after 1.5 seconds
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: result, // "Error sending feedback."
        showConfirmButton: false, // Remove the "OK" button
        timer: 1500, // Auto-close after 1.5 seconds
      });
    }
  });