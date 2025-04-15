// Fetch all users and populate the table
let allUsers = []; // Store all users globally for filtering

async function fetchUsers() {
    try {
        const response = await fetch('/users'); // Adjust the endpoint if necessary
        const users = await response.json();
        allUsers = users; // Store users globally
        renderUserTable(users); // Render the table with all users
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

// Render the user table
function renderUserTable(users) {
    const tableBody = document.querySelector('#user-table tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.lastName}</td>
            <td>${user.firstName}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.roles}</td>
            <td><button class="select-user-btn" data-id="${user._id}">Select</button></td>
        `;
        tableBody.appendChild(row);
    });

    // Add event listeners to "Select" buttons
    document.querySelectorAll('.select-user-btn').forEach(button => {
        button.addEventListener('click', () => selectUser(button.dataset.id));
    });
}

// Filter users based on search input
function filterUsers(searchTerm) {
    const filteredUsers = allUsers.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        return (
            user.username.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower) ||
            user.lastName.toLowerCase().includes(searchLower) ||
            user.firstName.toLowerCase().includes(searchLower)
        );
    });
    renderUserTable(filteredUsers); // Re-render the table with filtered users
}

// Add event listener to the search bar
document.getElementById('user-search').addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim();
    filterUsers(searchTerm);
});

// Populate the form with the selected user's data
async function selectUser(userId) {
    try {
        const response = await fetch(`/users/${userId}`); // Fetch user data from the server
        const user = await response.json();

        // Populate the form fields
        document.getElementById('username').value = user.username;
        document.getElementById('email').value = user.email;
        document.getElementById('lastName').value = user.lastName;
        document.getElementById('firstName').value = user.firstName;
        document.getElementById('middleInitial').value = user.middleInitial || '';
        document.getElementById('suffix').value = user.suffix || '';
        document.getElementById('dlsudEmail').value = user.dlsudEmail || '';
        document.getElementById('studentNumber').value = user.studentNumber || '';
        document.getElementById('roles').value = user.roles; // Set the dropdown value
        document.getElementById('department').value = user.department || ''; // Set the dropdown value

        document.getElementById('roles').disabled = false;

        // Apply logic for the "roles" dropdown
        if (user.roles === 'User') {
            document.getElementById('department').value = ''; // Clear the department field
            document.getElementById('department').disabled = true; // Disable the dropdown
        } else {
            document.getElementById('department').disabled = false; // Enable the dropdown
        }

        // Enable the "Cancel" and "Submit" buttons
        document.querySelector('.cancel-button').disabled = false;
        document.querySelector('.submit-button').disabled = false;

        // Set the userId in the Submit button's dataset
        document.querySelector('.submit-button').dataset.userId = userId;
    } catch (error) {
        console.error('Error fetching user details:', error);
    }
}

async function updateUser(userId) {
    const roles = document.getElementById('roles').value;
    const department = document.getElementById('department').value;

    // Validation: Ensure department is selected for Staff or Admin
    if ((roles === 'Staff' || roles === 'Admin') && !department) {
        alert('Please select a department for Staff or Admin.');
        return; // Prevent submission
    }

    const updates = { roles, department: department || '' };

    try {
        const response = await fetch(`/users/${userId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });

        const result = await response.json();
        if (response.ok) {
            alert('User updated successfully!');
            fetchUsers(); // Reload the user table
            clearFormFields(); // Clear the form fields
        } else {
            alert(result.error || 'Failed to update user');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        alert('Failed to update user');
    }
}

// Add event listener to the "Submit" button
document.querySelector('.submit-button').addEventListener('click', () => {
    const userId = document.querySelector('.submit-button').dataset.userId; // Get the selected user's ID
    if (userId) {
        updateUser(userId);
    } else {
        alert('No user selected');
    }
});

// Add event listener to the "Cancel" button
document.querySelector('.cancel-button').addEventListener('click', clearFormFields);

// Add event listener to the "roles" dropdown
document.getElementById('roles').addEventListener('change', () => {
    const roles = document.getElementById('roles').value;

    if (roles === 'User') {
        // Clear the department field and disable it
        document.getElementById('department').value = ''; // Clear the field
        document.getElementById('department').disabled = true; // Disable the dropdown
    } else {
        // Enable the department field for other roles
        document.getElementById('department').disabled = false;
    }
});

// Fetch users on page load
document.addEventListener('DOMContentLoaded', fetchUsers);

function clearFormFields() {
    // Clear the form fields
    document.getElementById('username').value = '';
    document.getElementById('email').value = '';
    document.getElementById('lastName').value = '';
    document.getElementById('firstName').value = '';
    document.getElementById('middleInitial').value = '';
    document.getElementById('suffix').value = '';
    document.getElementById('dlsudEmail').value = '';
    document.getElementById('studentNumber').value = '';
    document.getElementById('roles').value = ''; // Reset to default unselectable value
    document.getElementById('department').value = '';

    // Disable the Role and Department fields
    document.getElementById('roles').disabled = true;
    document.getElementById('department').disabled = true;

    // Disable the "Cancel" and "Submit" buttons
    document.querySelector('.cancel-button').disabled = true;
    document.querySelector('.submit-button').disabled = true;
}