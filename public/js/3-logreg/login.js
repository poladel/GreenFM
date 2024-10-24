const form = document.querySelector('.login-form');
const usernameError = document.querySelector('.username-error');
const passwordError = document.querySelector('.password-error');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset Errors
    usernameError.textContent = "";
    passwordError.textContent = "";

    const username = form.username.value;
    const password = form.password.value;

    try {
        const res = await fetch('/LogIn', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await res.json();
        console.log(data);
        if (data.errors) {
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