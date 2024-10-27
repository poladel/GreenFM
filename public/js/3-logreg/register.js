/*--------------------------------- VALIDATION BOX ---------------------------------*/
document.addEventListener('DOMContentLoaded', function () {
    const passwordInput = document.getElementById('password');
    const passwordValidation = document.getElementById('passwordValidation');

    // Show the password validation box when the password input is focused
    passwordInput.addEventListener('focus', function () {
        console.log("Password input focused");
        passwordValidation.style.display = 'block'; // Show validation box when focusing on the password input
    });

    // Hide the password validation box when the password input loses focus
    passwordInput.addEventListener('blur', function () {
        console.log("Password input lost focus");
        passwordValidation.style.display = 'none'; // Hide validation box when input loses focus
    });

    // Validate password requirements on input
    passwordInput.addEventListener('input', function () {
        const password = passwordInput.value;

        // Check password requirements
        const lengthValid = password.length >= 8;
        const uppercaseValid = /[A-Z]/.test(password);
        const lowercaseValid = /[a-z]/.test(password);
        const numberValid = /[0-9]/.test(password);
        const specialValid = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        console.log(`Password length: ${password.length}, Uppercase: ${uppercaseValid}, Lowercase: ${lowercaseValid}, Number: ${numberValid}, Special character: ${specialValid}`);

        // Update the requirement list
        document.getElementById('password-length').className = lengthValid ? 'password-requirement valid' : 'password-requirement invalid';
        document.getElementById('password-uppercase').className = uppercaseValid ? 'password-requirement valid' : 'password-requirement invalid';
        document.getElementById('password-lowercase').className = lowercaseValid ? 'password-requirement valid' : 'password-requirement invalid';
        document.getElementById('password-number').className = numberValid ? 'password-requirement valid' : 'password-requirement invalid';
        document.getElementById('password-special').className = specialValid ? 'password-requirement valid' : 'password-requirement invalid';
    });
});

/*--------------------------------- REGISTER FORM 1 ---------------------------------*/
const form = document.getElementById('registerForm');
const emailError = document.querySelector('.email-error');
const usernameError = document.querySelector('.username-error');
const passwordError = document.querySelector('.password-error');

// Function to clear error messages
const clearErrors = () => {
    emailError.textContent = "";
    usernameError.textContent = "";
    passwordError.textContent = "";
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitButton = document.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    // Clear previous errors
    clearErrors();

    const email = form.email.value;
    const username = form.username.value;
    const password = form.password.value;

    try {
        const res = await fetch('/Register', {
            method: 'POST',
            body: JSON.stringify({ email, username, password }),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await res.json();
        console.log(data);

        // If there are errors, display them
        if (data.errors) {
            emailError.textContent = data.errors.email || '';  // Use fallback to avoid undefined
            usernameError.textContent = data.errors.username || '';
            passwordError.textContent = data.errors.password || '';
        }

        // If registration is successful
        if (data.success) {
            location.assign('/Register/Additional-Info'); // Redirect to additional info page
        }
    } catch (err) {
        console.log(err);
    }
});
