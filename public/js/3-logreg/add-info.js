/*--------------------------------- REGISTER FORM 2 ---------------------------------*/
// register2.js for the second registration form
const form2 = document.getElementById('registerForm2');

form2.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const lastName = form2.lastName.value;
    const firstName = form2.firstName.value;
    const mi = form2.mi.value;
    const dlsuD = form2.dlsuD.value === 'true'; // Convert to boolean
    const dlsudEmail = form2.dlsudEmail.value;

    try {
        const res = await fetch('/Register/Additional-Info', {
            method: 'POST',
            body: JSON.stringify({ lastName, firstName, mi, dlsuD, dlsudEmail }),
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

/*--------------------------------- DLSU-D EMAIL ---------------------------------*/
    const emailInput = document.getElementById('dlsudEmail');
    const domain = "@dlsud.edu.ph";
    
    // Flag to indicate if we should append the domain
    let shouldAppendDomain = true;

    // Function to append the domain if it doesn't already exist
    function appendDomain() {
        // Only append the domain if the user starts typing and the input doesn't already end with the domain
        if (emailInput.value.length > 0 && !emailInput.value.endsWith(domain)) {
            emailInput.value = emailInput.value.replace(domain, "") + domain;
            // Set the cursor position just before the domain
            emailInput.setSelectionRange(emailInput.value.length - domain.length, emailInput.value.length - domain.length);
        }
    }

    // Event listener for input event
    emailInput.addEventListener("input", function (event) {
        // Allow backspace and delete to work normally
        if (
            event.inputType === "deleteContentBackward" ||
            event.inputType === "deleteContentForward"
        ) {
            // Don't apply appending while deleting
            shouldAppendDomain = false;
            return;
        }

        // Append the domain only if we're not deleting
        if (shouldAppendDomain) {
            appendDomain();
        }
    });

    // Reset the flag on keydown to allow appending again
    emailInput.addEventListener("keydown", function () {
        shouldAppendDomain = true; // Allow appending on keydown
    });

    // Ensure the domain is appended when the input loses focus
    emailInput.addEventListener("blur", function () {
        appendDomain();
    });