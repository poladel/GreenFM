/*--------------------------------- REGISTER FORM 2 ---------------------------------*/
// register2.js for the second registration form
const form2 = document.getElementById('registerForm2');

form2.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const lastName = form2['last-name'].value;
    const firstName = form2['first-name'].value;
    const mi = form2['mi'].value;
    const dlsuD = form2.dlsuD.checked; // Assuming this is a checkbox; use .checked for boolean
    const studentNumber = form2.studentNumber.value;

    try {
        const res = await fetch('/Register/Additional-Info', {
            method: 'POST',
            body: JSON.stringify({ lastName, firstName, mi, dlsuD, studentNumber }),
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await res.json();

        // Handle success or error responses
        if (res.ok) {
            // Handle successful response
            if (data.success) {
                location.assign('/'); // Redirect to home page
            }
        } else {
            // Handle error response
            alert(data.error); // Show alert with the error message
            window.location.href = '/Register'; // Redirect back to the Register page
        }
    } catch (err) {
        console.error('Error:', err);
        alert('An unexpected error occurred. Please try again.'); // General error alert
        window.location.href = '/Register'; // Redirect back to the Register page
    }
});


/*--------------------------------- STUDENT NUMBER ---------------------------------*/
const dlsuDCheckbox = document.getElementById('dlsuD');
const studentNumberContainer = document.getElementById('studentNumberContainer');

// Function to toggle the visibility of the student number input
function toggleStudentNumberVisibility() {
    if (dlsuDCheckbox.checked) {
        studentNumberContainer.style.display = 'block'; // Show input if checkbox is checked
    } else {
        studentNumberContainer.style.display = 'none'; // Hide input if checkbox is not checked
    }
}

// Initial check to set visibility on page load
toggleStudentNumberVisibility();

// Add change event listener to the checkbox
if (dlsuDCheckbox) {
    dlsuDCheckbox.addEventListener('change', toggleStudentNumberVisibility);
}

