document.addEventListener('DOMContentLoaded', () => {
    const form2 = document.getElementById('joingreenfmForm2');

    form2.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        // Gather form data
        const formData = new FormData(form2);
        const data = Object.fromEntries(formData.entries());

        try {
            // Send POST request to the backend
            const response = await fetch('/JoinGFM-Step2', { // Replace with your actual endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok) {
                // Handle success
                alert('Successfully submitted your application!');
                // Redirect or perform any other action as needed
                window.location.href = '/JoinGFM-Step3'; // Replace with your success page
<<<<<<< HEAD
=======
            } else if (result.redirect) {
                alert(`Error: ${result.error}`);
                // Redirect to Step 1 if specified in response
                window.location.href = result.redirect;
>>>>>>> 80eba51d7ac3ee255d8536f92a19d99e89c0bb79
            } else {
                // Handle errors
                alert(`Error: ${result.error || 'Something went wrong'}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('There was a problem with the submission. Please try again.');
        }
    });
});
