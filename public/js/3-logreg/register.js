const passwordInput = document.getElementById('password');

// Add event listener for password input
passwordInput.addEventListener('input', function () {
    const password = passwordInput.value;

    // Validate password requirements
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[~`!@#$%^&*()_+=\[\]{}|\\:;"'<>,.?/]/.test(password)
    };

    // Update label styles based on requirements
    document.getElementById('password-length').style.color = requirements.length ? 'green' : 'red';
    document.getElementById('password-uppercase').style.color = requirements.uppercase ? 'green' : 'red';
    document.getElementById('password-lowercase').style.color = requirements.lowercase ? 'green' : 'red';
    document.getElementById('password-number').style.color = requirements.number ? 'green' : 'red';
    document.getElementById('password-special').style.color = requirements.special ? 'green' : 'red';
});

const form = document.querySelector('.register-form');
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
        if (data.user) {
            location.assign('/'); // Redirect to home or another page
        }
    } catch (err) {
        console.log(err);
    } finally {
        // Re-enable the submit button regardless of success or failure
        submitButton.disabled = false;
    }
});

// Password Validation Box
document.addEventListener('DOMContentLoaded', function () {
    const passwordInput = document.getElementById('password');
    const passwordValidation = document.getElementById('passwordValidation');

    passwordInput.addEventListener('focus', function () {
        passwordValidation.style.display = 'block'; // Show validation box when focusing on the password input
    });

    passwordInput.addEventListener('input', function () {
        const password = passwordInput.value;
        
        // Check password requirements
        const lengthValid = password.length >= 8;
        const uppercaseValid = /[A-Z]/.test(password);
        const lowercaseValid = /[a-z]/.test(password);
        const numberValid = /[0-9]/.test(password);
        const specialValid = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        // Update the requirement list
        document.getElementById('password-length').className = lengthValid ? 'password-requirement valid' : 'password-requirement invalid';
        document.getElementById('password-uppercase').className = uppercaseValid ? 'password-requirement valid' : 'password-requirement invalid';
        document.getElementById('password-lowercase').className = lowercaseValid ? 'password-requirement valid' : 'password-requirement invalid';
        document.getElementById('password-number').className = numberValid ? 'password-requirement valid' : 'password-requirement invalid';
        document.getElementById('password-special').className = specialValid ? 'password-requirement valid' : 'password-requirement invalid';
    });

    passwordInput.addEventListener('blur', function () {
        passwordValidation.style.display = 'none'; // Hide validation box when input loses focus
    });
});