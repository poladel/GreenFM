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

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitButton = document.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    // Reset Errors
    emailError.textContent = "";
    usernameError.textContent = "";
    passwordError.textContent = "";

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
        if (data.errors) {
            emailError.textContent = data.errors.email;
            usernameError.textContent = data.errors.username;
            passwordError.textContent = data.errors.password;
        }
        if (data.user) {
            location.assign('/');
        }
    } catch (err) {
        console.log(err);
    }
}); 