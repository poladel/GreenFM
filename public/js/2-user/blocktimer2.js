/*----------------------FORM 2 SUBMISSION---------------------*/
document.addEventListener('DOMContentLoaded', () => {
    const form2 = document.getElementById('blocktimerForm2');

    form2.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        const formData = new FormData(form2); // Gather form data
        const data = Object.fromEntries(formData.entries()); // Convert to a plain object

        // Convert 'notApplicable' fields from string to boolean
        data.coProponent = {
            lastName: data.coProponentLastName || undefined,
            firstName: data.coProponentFirstName || undefined,
            mi: data.coProponentMi || undefined,
            cys: data.coProponentCys || undefined,
            notApplicable: !!data.coProponentNotApplicable, // Convert to boolean
        };

        data.facultyStaff = {
            lastName: data.facultyStaffLastName || undefined,
            firstName: data.facultyStaffFirstName || undefined,
            mi: data.facultyStaffMi || undefined,
            department: data.facultyStaffDepartment || undefined,
            notApplicable: !!data.facultyStaffNotApplicable, // Convert to boolean
        };

        try {
            // Send POST request to the backend
            const response = await fetch('/JoinBlocktimer-Step2', { // Replace with your actual endpoint
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
                window.location.href = '/JoinBlocktimer-Step3'; // Replace with your success page
            } else if (result.redirect) {
                alert(`Error: ${result.error}`);
                // Redirect to Step 1 if specified in response
                window.location.href = result.redirect;
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

