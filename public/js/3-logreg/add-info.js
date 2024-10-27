/*--------------------------------- REGISTER FORM 2 ---------------------------------*/
// register2.js for the second registration form
const form2 = document.getElementById('registerForm2');

form2.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const lastName = form2['last-name'].value;
    const firstName = form2['first-name'].value;
    const mi = form2['mi'].value;
    const dlsuD = form2.dlsuD.value === 'true'; // Convert to boolean
    const studentNumber = form2.studentNumber.value;

    try {
        const res = await fetch('/Register/Additional-Info', {
            method: 'POST',
            body: JSON.stringify({ lastName, firstName, mi, dlsuD, studentNumber }),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        
        // Handle success or error responses
        if (data.success) {
            // Redirect or show a success message
            location.assign('/'); // Redirect to home page
        }
    } catch (err) {
        console.error(err);
    }
});