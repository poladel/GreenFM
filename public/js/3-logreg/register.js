/*--------------------------------- VALIDATION BOX ---------------------------------*/
document.addEventListener('DOMContentLoaded', function () {
    const passwordInput = document.getElementById('password');
    const passwordValidation = document.getElementById('passwordValidation');

    // Helper function to update requirement styling
    function updateRequirement(elementId, isValid) {
        const element = document.getElementById(elementId);
        if (element) {
            // Remove previous Tailwind color classes and potentially the base class if needed
            element.classList.remove('text-green-500', 'text-red-500', 'text-gray-800'); // Adjust base class if different
            if (isValid) {
                element.classList.add('text-green-500'); // Tailwind valid color
            } else {
                element.classList.add('text-red-500'); // Tailwind invalid color
            }
            // Ensure the base class for structure/icons remains if it was removed
            // Note: Removed adding 'password-requirement' back here as Tailwind classes handle styling.
            // If 'password-requirement' has other structural styles, add it back.
        }
    }


    if (passwordInput && passwordValidation) {
        // Show the password validation box when the password input is focused
        passwordInput.addEventListener('focus', function () {
            // Only show if not all requirements are already met
            const password = passwordInput.value;
            const lengthValid = password.length >= 8;
            const uppercaseValid = /[A-Z]/.test(password);
            const lowercaseValid = /[a-z]/.test(password);
            const numberValid = /[0-9]/.test(password);
            const specialValid = /[!@#$%^&*(),.?":{}|<>]/.test(password);
            const allValid = lengthValid && uppercaseValid && lowercaseValid && numberValid && specialValid;

            if (!allValid) {
                console.log("Password input focused, showing validation");
                passwordValidation.classList.remove('hidden'); // Show using Tailwind
            } else {
                 console.log("Password input focused, but validation already met");
            }
        });

        // Hide the password validation box when the password input loses focus
        passwordInput.addEventListener('blur', function () {
            console.log("Password input lost focus");
            // Add a small delay to allow clicking inside the validation box if needed
            setTimeout(() => {
                 passwordValidation.classList.add('hidden'); // Hide using Tailwind
            }, 150); // 150ms delay
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

            // Update the requirement list using the helper function
            updateRequirement('password-length', lengthValid);
            updateRequirement('password-uppercase', uppercaseValid);
            updateRequirement('password-lowercase', lowercaseValid);
            updateRequirement('password-number', numberValid);
            updateRequirement('password-special', specialValid);

            // Check if all requirements are met
            const allValid = lengthValid && uppercaseValid && lowercaseValid && numberValid && specialValid;

            // Hide the validation box if all requirements are met
            if (allValid) {
                console.log("All password requirements met, hiding validation box.");
                passwordValidation.classList.add('hidden');
            } else {
                 // If requirements become unmet while typing, ensure the box is shown (if focused)
                 // Check if the input currently has focus before removing 'hidden'
                 if (document.activeElement === passwordInput) {
                    passwordValidation.classList.remove('hidden');
                 }
            }
        });

        // Optional: Initial check or styling setup if needed when the page loads
        // Example: Set initial state based on empty input (all invalid)
        // updateRequirement('password-length', false);
        // updateRequirement('password-uppercase', false);
        // ... etc. or rely on initial EJS classes
    }
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
            submitButton.disabled = false;
        }

        // If registration is successful
        if (data.success) {
            location.assign('/Register/Additional-Info'); // Redirect to additional info page
        }
    } catch (err) {
        console.log(err);
        submitButton.disabled = false;
    }
});
