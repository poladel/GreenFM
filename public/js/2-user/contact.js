document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent default form submission

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

  const formData = new URLSearchParams(new FormData(e.target));

    const response = await fetch('/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const result = await response.text();

    document.getElementById('message').value = '';

    Swal.fire({
      icon: response.ok ? 'success' : 'error',
      title: response.ok ? 'Success!' : 'Oops...',
      text: result,
      showConfirmButton: false,
      timer: 1500
    });