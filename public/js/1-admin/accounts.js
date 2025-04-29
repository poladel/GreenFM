document.addEventListener('DOMContentLoaded', function () {
    console.log("accounts.js (Tailwind version) script started.");

    // --- Socket.IO Setup ---
    let socket;
    if (typeof io === 'undefined') {
        console.error("Socket.IO client library (io) not found. Check script inclusion in the EJS file.");
    } else {
        console.log("Socket.IO client library (io) found. Attempting connection...");
        try {
            socket = io(); // Connect to the server hosting the page

            socket.on('connect', () => {
                console.log('Admin Accounts Socket Connected:', socket.id);
            });

            socket.on('connect_error', (err) => {
                console.error('Admin Accounts Socket Connection Error:', err.message, err.data);
            });

            socket.on('disconnect', (reason) => {
                console.log('Admin Accounts Socket Disconnected:', reason);
                // Optional: Implement reconnection logic if needed
            });

            // Listen for real-time updates from the server (e.g., if another admin modifies a user)
            socket.on('userAccountUpdated', (updatedUserData) => {
                console.log('Received userAccountUpdated via socket:', updatedUserData);
                handleUserUpdate(updatedUserData);
            });

            socket.on('userAccountDeleted', (deletedUserId) => {
                console.log('Received userAccountDeleted via socket:', deletedUserId);
                handleUserDelete(deletedUserId);
            });

            console.log("Socket.IO event listeners attached.");

        } catch (error) {
            console.error("Error during Socket.IO initialization:", error);
        }
    }
    // --- End Socket.IO Setup ---

    const searchInput = document.getElementById('user-search');
    const tableBody = document.querySelector('#user-table tbody');
    let allUsers = []; // To store all users fetched initially

    // Form elements
    const form = document.getElementById('manage-account-form');
    const userIdInput = form.querySelector('#userId'); // Hidden input to store ID
    const usernameInput = form.querySelector('#username');
    const emailInput = form.querySelector('#email');
    const lastNameInput = form.querySelector('#lastName');
    const firstNameInput = form.querySelector('#firstName');
    const middleInitialInput = form.querySelector('#middleInitial');
    const suffixInput = form.querySelector('#suffix');
    const dlsudEmailInput = form.querySelector('#dlsudEmail');
    const studentNumberInput = form.querySelector('#studentNumber');
    const rolesSelect = form.querySelector('#roles');
    const departmentSelect = form.querySelector('#department');
    const cancelButton = form.querySelector('#cancel-button');
    const submitButton = form.querySelector('#submit-button');

    // Fetch all users on page load
    fetchAllUsers();

    // Add event listener for search input
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const searchTerm = searchInput.value.toLowerCase();
            filterUsers(searchTerm);
        });
    } else {
        console.error("Search input #user-search not found.");
    }

    // Function to fetch all users
    async function fetchAllUsers() {
        console.log("Fetching all users...");
        try {
            // Use the correct API endpoint defined in your routes (e.g., /users or /api/users)
            const response = await fetch('/users'); // Adjust if your API route is different
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allUsers = await response.json();
            console.log("Users fetched:", allUsers.length);
            populateTable(allUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-red-500">Error loading users.</td></tr>';
            }
        }
    }

    // Function to populate the table
    function populateTable(users) {
        if (!tableBody) {
            console.error("Table body #user-table tbody not found.");
            return;
        }
        tableBody.innerHTML = ''; // Clear existing rows
        if (users.length === 0) {
            // Colspan: 3 below md, 4 below lg, 6 at lg+
            tableBody.innerHTML = '<tr><td colspan="3" class="md:colspan-4 lg:colspan-6 p-4 text-center text-gray-500">No users found.</td></tr>';
            return;
        }
        users.forEach(user => {
            const row = document.createElement('tr');
            row.classList.add('hover:bg-gray-50'); // Add hover effect
            const displayRoles = Array.isArray(user.roles) ? user.roles.join(', ') : (user.roles || 'N/A');
            // Apply responsive classes to table data cells
            row.innerHTML = `
                <td class="hidden lg:table-cell p-2.5 border-b border-gray-300 text-sm">${user.lastName || ''}</td>
                <td class="hidden lg:table-cell p-2.5 border-b border-gray-300 text-sm">${user.firstName || ''}</td>
                <td class="p-2.5 border-b border-gray-300 text-sm">${user.username}</td>
                <td class="hidden md:table-cell p-2.5 border-b border-gray-300 text-sm">${user.email}</td>
                <td class="p-2.5 border-b border-gray-300 text-sm">${displayRoles}</td>
                <td class="p-2.5 border-b border-gray-300 text-sm whitespace-nowrap">
                    <button class="edit-btn py-1 px-3 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs transition duration-150 mr-1" data-id="${user._id}">Edit</button>
                    <button class="delete-btn py-1 px-3 bg-red-500 text-white rounded hover:bg-red-600 text-xs transition duration-150" data-id="${user._id}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Add event listeners to new buttons
        addTableButtonListeners();
    }

    // Function to filter users based on search term
    function filterUsers(searchTerm) {
        const filteredUsers = allUsers.filter(user => {
            // Safeguard: Check if user object and essential properties exist before accessing them
            if (!user) {
                console.warn("Skipping invalid user object in filter:", user);
                return false; // Skip this invalid entry
            }

            const searchLower = searchTerm.toLowerCase();

            // Use default empty strings to prevent errors if properties are missing/null
            const usernameMatch = (user.username || '').toLowerCase().includes(searchLower);
            const emailMatch = (user.email || '').toLowerCase().includes(searchLower);
            const roleString = (Array.isArray(user.roles) ? user.roles.join(' ') : user.roles || '').toLowerCase();
            const roleMatch = roleString.includes(searchLower);
            const nameMatch = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchLower);

            return usernameMatch || emailMatch || roleMatch || nameMatch;
        });
        populateTable(filteredUsers);
    }

    // Function to add event listeners to edit and delete buttons
    function addTableButtonListeners() {
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.removeEventListener('click', handleEditClick); // Prevent duplicate listeners
            button.addEventListener('click', handleEditClick);
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.removeEventListener('click', handleDeleteClick); // Prevent duplicate listeners
            button.addEventListener('click', handleDeleteClick);
        });
    }

    // Handle Edit button click
    function handleEditClick(event) {
        const userId = event.target.dataset.id;
        const user = allUsers.find(u => u._id === userId);
        if (user) {
            populateForm(user);
            enableFormEditing();
            // Optional: Scroll to the form or highlight it
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            console.error(`User with ID ${userId} not found in local list.`);
        }
    }

    // Handle Delete button click
    async function handleDeleteClick(event) {
        const userId = event.target.dataset.id;
        const user = allUsers.find(u => u._id === userId);
        if (!user) {
             console.error(`User with ID ${userId} not found for deletion.`);
             Toastify({ 
                text: "User not found.", 
                duration: 3000, 
                gravity: "top", 
                position: "right", 
                backgroundColor: "#407133", // Updated background color
                style: { // Add style for text color
                    color: "white"
                }
            }).showToast();
             return;
        }

        // Confirmation using a simple browser confirm, or replace with SweetAlert/Toastify confirmation logic
        if (!confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
            return; // User cancelled
        }

        // Optional: Add loading state to the specific delete button if desired
        const deleteButton = event.target;
        deleteButton.disabled = true;
        deleteButton.textContent = 'Deleting...'; // Simple text change

        console.log(`Attempting to delete user ${userId}`);
        try {
            // Adjust API endpoint if needed
            const response = await fetch(`/users/${userId}`, { method: 'DELETE' });

            // Check content type before parsing (important if server sends HTML on error)
            const contentType = response.headers.get("content-type");
            let responseData = {}; // Default to empty object

            if (contentType && contentType.indexOf("application/json") !== -1) {
                responseData = await response.json(); // Parse JSON if available
            } else if (!response.ok) {
                 // If not JSON and not ok, try to get text for error message
                 const responseText = await response.text();
                 console.error("Received non-JSON error response:", response.status, responseText);
                 throw new Error(responseText || `Delete failed with status: ${response.status}`);
            }


            if (!response.ok) {
                // Use message from JSON if available, otherwise throw generic error
                throw new Error(responseData.message || `Delete failed with status: ${response.status}`);
            }

            console.log(`User ${userId} deleted successfully via API.`);

            // Update UI locally (or rely solely on socket event if preferred)
            handleUserDelete(userId);

            Toastify({
                text: `User "${user.username}" deleted successfully.`,
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "#407133", // Updated background color
                style: { // Add style for text color
                    color: "white"
                }
            }).showToast();

        } catch (error) {
            console.error('Error deleting user:', error);
            Toastify({
                text: `Failed to delete user: ${error.message}`,
                duration: 5000,
                gravity: "top",
                position: "right",
                backgroundColor: "#407133", // Updated background color
                style: { // Add style for text color
                    color: "white"
                }
            }).showToast();
            // Restore button state on error
            deleteButton.disabled = false;
            deleteButton.textContent = 'Delete';
        }
        // Note: Button state is not restored on success because the row is removed.
    }

    // Populate form with user data
    function populateForm(user) {
        if (!form) return;
        userIdInput.value = user._id;
        usernameInput.value = user.username || '';
        emailInput.value = user.email || '';
        lastNameInput.value = user.lastName || '';
        firstNameInput.value = user.firstName || '';
        middleInitialInput.value = user.middleInitial || '';
        suffixInput.value = user.suffix || '';
        dlsudEmailInput.value = user.dlsudEmail || '';
        studentNumberInput.value = user.studentNumber || '';

        // Handle roles (might be string or array, take the first role for simplicity in dropdown)
        const userRole = Array.isArray(user.roles) ? user.roles[0] : user.roles;
        rolesSelect.value = userRole || ''; // Set dropdown value

        departmentSelect.value = user.department || ''; // Populate department

        // Enable/disable department based on role
        toggleDepartmentField(rolesSelect.value);
    }

    // Toggle Department Field based on Role
    function toggleDepartmentField(selectedRole) {
        if (selectedRole === 'User' || selectedRole === '') {
            departmentSelect.value = ''; // Clear department if role is User or empty
            departmentSelect.disabled = true;
            departmentSelect.classList.add('bg-gray-200', 'cursor-not-allowed');
            departmentSelect.classList.remove('bg-white'); // Use bg-white or bg-gray-50 for enabled
        } else {
            departmentSelect.disabled = false;
            departmentSelect.classList.remove('bg-gray-200', 'cursor-not-allowed');
            departmentSelect.classList.add('bg-white');
        }
    }

    // Add event listener to roles dropdown to toggle department field
    if (rolesSelect) {
        rolesSelect.addEventListener('change', (e) => {
            toggleDepartmentField(e.target.value);
        });
    }

    // --- Form State Management ---

    function applyInputStyles(inputElement, enabled) {
        if (!inputElement) return;
        if (enabled) {
            inputElement.readOnly = false;
            inputElement.classList.remove('bg-gray-200', 'text-gray-500', 'cursor-not-allowed');
            inputElement.classList.add('bg-white', 'text-gray-700'); // Use bg-white or bg-gray-50
        } else {
            inputElement.readOnly = true;
            inputElement.classList.add('bg-gray-200', 'text-gray-500', 'cursor-not-allowed');
            inputElement.classList.remove('bg-white', 'text-gray-700');
        }
    }

    function applySelectStyles(selectElement, enabled) {
        if (!selectElement) return;
        selectElement.disabled = !enabled;
        if (enabled) {
            selectElement.classList.remove('bg-gray-200', 'text-gray-500', 'cursor-not-allowed');
            selectElement.classList.add('bg-white', 'text-gray-700'); // Use bg-white or bg-gray-50
            // Remove SVG background setting for enabled state
            selectElement.style.backgroundImage = `url(...)`;
        } else {
            selectElement.classList.add('bg-gray-200', 'text-gray-500', 'cursor-not-allowed');
            selectElement.classList.remove('bg-white', 'text-gray-700');
            // Remove SVG background setting for disabled state
            // selectElement.style.backgroundImage = `url(...)`;
        }
        // Special handling for department based on role
        if (selectElement.id === 'department' && enabled) {
             toggleDepartmentField(rolesSelect.value); // Re-apply logic when enabling form
        } else if (selectElement.id === 'department' && !enabled) {
             selectElement.disabled = true; // Ensure department is disabled when form is disabled
             selectElement.classList.add('bg-gray-200', 'cursor-not-allowed');
             selectElement.classList.remove('bg-white');
        }
    }

    function applyButtonStyles(buttonElement, enabled) {
        if (!buttonElement) return;
        buttonElement.disabled = !enabled;
        if (enabled) {
            // Remove disabled styles, add enabled styles
            buttonElement.classList.remove('bg-gray-400', 'cursor-not-allowed', 'opacity-50');
            if (buttonElement.id === 'submit-button') {
                buttonElement.classList.add('bg-green-600', 'hover:bg-green-700');
            } else if (buttonElement.id === 'cancel-button') {
                buttonElement.classList.add('bg-gray-500', 'hover:bg-gray-600');
            }
        } else {
            // Add disabled styles, remove enabled styles
            buttonElement.classList.add('bg-gray-400', 'cursor-not-allowed', 'opacity-50');
             if (buttonElement.id === 'submit-button') {
                buttonElement.classList.remove('bg-green-600', 'hover:bg-green-700');
            } else if (buttonElement.id === 'cancel-button') {
                buttonElement.classList.remove('bg-gray-500', 'hover:bg-gray-600');
            }
        }
    }

    // Enable form fields for editing
    function enableFormEditing() {
        // Keep username and email read-only as they often shouldn't be changed here
        applyInputStyles(usernameInput, false); // Keep username read-only
        applyInputStyles(emailInput, false);    // Keep email read-only

        applyInputStyles(lastNameInput, true);
        applyInputStyles(firstNameInput, true);
        applyInputStyles(middleInitialInput, true);
        applyInputStyles(suffixInput, true);
        applyInputStyles(dlsudEmailInput, true);
        applyInputStyles(studentNumberInput, true);
        applySelectStyles(rolesSelect, true);
        applySelectStyles(departmentSelect, true); // Will be re-evaluated by toggleDepartmentField

        applyButtonStyles(cancelButton, true);
        applyButtonStyles(submitButton, true);
    }

    // Disable form fields
    function disableFormEditing() {
        applyInputStyles(usernameInput, false);
        applyInputStyles(emailInput, false);
        applyInputStyles(lastNameInput, false);
        applyInputStyles(firstNameInput, false);
        applyInputStyles(middleInitialInput, false);
        applyInputStyles(suffixInput, false);
        applyInputStyles(dlsudEmailInput, false);
        applyInputStyles(studentNumberInput, false);
        applySelectStyles(rolesSelect, false);
        applySelectStyles(departmentSelect, false);

        applyButtonStyles(cancelButton, false);
        applyButtonStyles(submitButton, false);
    }

    // Reset form to initial state
    function resetForm() {
        if (!form) return;
        form.reset();
        userIdInput.value = ''; // Clear hidden user ID
        clearErrors();
        disableFormEditing();
    }

     // Clear error messages
     function clearErrors() {
        if (!form) return;
        // Adjust selectors based on your EJS error message structure
        form.querySelectorAll('.error-message').forEach(el => el.textContent = '');
        form.querySelectorAll('.border-red-500').forEach(el => el.classList.remove('border-red-500')); // Remove red border
    }

    // Handle Cancel button click
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            const userId = userIdInput.value;
            if (userId) {
                // If editing, repopulate with original data from local store
                const user = allUsers.find(u => u._id === userId);
                if (user) {
                    populateForm(user);
                } else {
                    // User might have been deleted in the meantime
                    resetForm();
                }
            } else {
                // If not editing, just reset
                resetForm();
            }
            clearErrors();
            disableFormEditing(); // Always disable editing after cancelling
        });
    }

    // Handle Submit button click (Update User)
    if (submitButton) {
        submitButton.addEventListener('click', async function() {
            const userId = userIdInput.value;
            // Prevent action if no user selected or button already processing
            if (!userId || submitButton.disabled || submitButton.dataset.processing === 'true') return;

            clearErrors(); // Clear previous errors

            // --- Add Loading State ---
            submitButton.disabled = true;
            submitButton.dataset.processing = 'true'; // Custom attribute to track state
            const originalButtonText = submitButton.innerHTML; // Store original content
            // Example: Replace text with spinner (requires Font Awesome or similar)
            submitButton.innerHTML = `
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
            `;
            // --- End Loading State ---


            // Basic Validation & Data Prep
            const rolesValue = rolesSelect.value;
            const departmentValue = departmentSelect.value;

            if (!rolesValue) {
                 showError(rolesSelect, 'Role is required.');
                 return;
            }
            if ((rolesValue === 'Staff' || rolesValue === 'Admin') && !departmentValue) {
                showError(departmentSelect, 'Department is required for Staff/Admin.');
                return; // Prevent submission
            }

            const updatedData = {
                // username: usernameInput.value, // Usually not updated here
                // email: emailInput.value,       // Usually not updated here
                lastName: lastNameInput.value.trim(),
                firstName: firstNameInput.value.trim(),
                middleInitial: middleInitialInput.value.trim(),
                suffix: suffixInput.value.trim(),
                dlsudEmail: dlsudEmailInput.value.trim(),
                studentNumber: studentNumberInput.value.trim(),
                roles: rolesValue, // Send single role string
                // Only send department if it's relevant for the role
                department: (rolesValue === 'Staff' || rolesValue === 'Admin') ? departmentValue : ''
            };

            console.log(`Attempting to update user ${userId} with data:`, updatedData);

            try {
                // Adjust API endpoint if needed
                const response = await fetch(`/users/${userId}`, {
                    method: 'PATCH', // Use PATCH for partial updates
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData)
                });

                // Check content type before parsing
                const contentType = response.headers.get("content-type");
                let responseData;

                if (contentType && contentType.indexOf("application/json") !== -1) {
                    responseData = await response.json(); // Parse as JSON
                } else {
                    // Not JSON, likely an HTML error page or other issue
                    const responseText = await response.text();
                    console.error("Received non-JSON response:", response.status, responseText);
                    throw new Error(`Server returned an unexpected response (Status: ${response.status}). Check server logs or network tab.`);
                }


                if (!response.ok) {
                    console.error("Update failed:", responseData);
                    // Display validation errors from server (keep existing logic)
                    if (responseData.errors && Array.isArray(responseData.errors)) {
                       // ... existing error display logic ...
                       responseData.errors.forEach(err => {
                            const fieldMap = { // Map server field names to form element IDs if different
                                roles: rolesSelect,
                                department: departmentSelect,
                                lastName: lastNameInput,
                                firstName: firstNameInput,
                                // Add other fields as needed
                            };
                            const element = fieldMap[err.path] || form.querySelector(`#${err.path}`); // Fallback to ID selector
                            if (element) {
                                showError(element, err.msg);
                            } else {
                                console.warn(`Could not find element for error path: ${err.path}`);
                            }
                        });
                    } else {
                         // Use message from JSON if available, otherwise generic error
                         throw new Error(responseData.message || `Update failed with status: ${response.status}`);
                    }
                     // Prevent further execution if there are errors
                     // Make sure to return here so finally block runs, but success code doesn't
                     return;
                }

                console.log("User updated successfully via API:", responseData);
                Toastify({
                    text: "User updated successfully.",
                    duration: 3000,
                    close: true,
                    gravity: "top",
                    position: "right",
                    backgroundColor: "#407133", // Updated background color
                    style: { // Add style for text color
                        color: "white"
                    },
                    stopOnFocus: true,
                }).showToast();
                resetForm(); // Reset and disable form

                // Update the user in the local list and UI
                // Ensure responseData from successful PATCH is valid before passing
                 if (responseData && responseData._id) {
                    handleUserUpdate(responseData); // Use the data returned from the API
                 } else {
                     console.warn("API update successful, but response data missing _id. Fetching all users to refresh.");
                     await fetchAllUsers(); // Fallback to refetching all users
                 }

            } catch (error) {
                console.error('Error updating user:', error);
                Toastify({
                    text: `Failed to update user: ${error.message}`,
                    duration: 5000,
                    close: true,
                    gravity: "top",
                    position: "right",
                    backgroundColor: "#407133", // Updated background color
                    style: { // Add style for text color
                        color: "white"
                    },
                    stopOnFocus: true,
                }).showToast();
            } finally {
                 // --- Remove Loading State ---
                 // Check if the form wasn't reset (meaning an error occurred and we want to keep it editable)
                 if (userIdInput.value === userId) { // Check if still editing the same user
                     submitButton.disabled = false; // Re-enable on error
                     enableFormEditing(); // Ensure form stays editable on error
                 } else {
                     // Form was reset on success, button should remain disabled via disableFormEditing()
                     // Or explicitly disable if resetForm doesn't handle it fully
                     submitButton.disabled = true;
                 }
                 submitButton.innerHTML = originalButtonText; // Restore original content
                 delete submitButton.dataset.processing; // Remove processing state attribute
                 // --- End Remove Loading State ---
            }
        });
    }

    // Function to show error message near an input/select
    function showError(element, message) {
        // Find or create an error message element (assuming it's a sibling or has a specific class/ID structure)
        let errorElement = element.parentElement.querySelector('.error-message');
        if (!errorElement) {
            // Create if it doesn't exist (adjust structure as needed)
            errorElement = document.createElement('p');
            errorElement.className = 'error-message text-red-500 text-xs mt-1';
            element.parentElement.appendChild(errorElement);
        }
        errorElement.textContent = message;
        element.classList.add('border-red-500'); // Add red border to highlight error
    }

    // --- Helper functions for real-time updates ---
    function handleUserUpdate(updatedUserData) {
        // Safeguard: Ensure we have valid data with an ID
        if (!updatedUserData || !updatedUserData._id) {
            console.error("handleUserUpdate received invalid or incomplete data:", updatedUserData);
            return; // Do nothing if data is invalid
        }

        // 1. Update the user in the global allUsers array
        const userIndex = allUsers.findIndex(user => user._id === updatedUserData._id);
        if (userIndex !== -1) {
            // Merge updated data - ensure roles is handled correctly if API returns string/array
            const rolesFromServer = updatedUserData.roles;
            allUsers[userIndex] = {
                ...allUsers[userIndex],
                ...updatedUserData,
                // Ensure roles in local store matches expected format (e.g., string for this script)
                roles: Array.isArray(rolesFromServer) ? rolesFromServer[0] : rolesFromServer
            };
            console.log(`Updated user ${updatedUserData._id} in local array.`);
        } else {
            // If user wasn't in the list (e.g., created elsewhere), add them
            // Ensure the data being pushed is reasonably complete (at least has username for filtering)
             if (updatedUserData.username) {
                 allUsers.push(updatedUserData);
                 console.log(`Added new user ${updatedUserData._id} to local array.`);
             } else {
                 console.warn(`Attempted to add new user ${updatedUserData._id} but username was missing. Skipping add.`);
             }
        }

        // 2. Re-render the table based on the current filter
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        filterUsers(searchTerm); // filterUsers already has safeguards

        // 3. Optional: Update the form if this user is currently being edited
        const selectedUserId = userIdInput.value;
        if (selectedUserId === updatedUserData._id) {
            console.log(`Updated user ${updatedUserData._id} is currently selected. Refreshing form.`);
            // Ensure the user still exists in the updated list before populating
            const userToPopulate = allUsers.find(u => u._id === selectedUserId);
            if (userToPopulate) {
                populateForm(userToPopulate); // Repopulate with the updated data
            } else {
                console.warn(`User ${selectedUserId} not found in allUsers after update. Resetting form.`);
                resetForm();
            }
            // Keep the form enabled if it was enabled before the update
            // enableFormEditing(); // Or decide based on workflow
        }
    }

    function handleUserDelete(deletedUserId) {
         // 1. Remove user from the local list
        const initialLength = allUsers.length;
        allUsers = allUsers.filter(u => u._id !== deletedUserId);
        if (allUsers.length < initialLength) {
             console.log(`Removed user ${deletedUserId} from local array.`);
        }

        // 2. Re-render the table based on the current filter
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        filterUsers(searchTerm);

        // 3. Reset form if the deleted user was being edited
        const selectedUserId = userIdInput.value;
         if (selectedUserId === deletedUserId) {
            console.log(`User ${deletedUserId} being edited was deleted. Resetting form.`);
            resetForm();
        }
    }

    // --- Initial state ---
    if (form) {
        disableFormEditing(); // Start with the form disabled
    } else {
        console.error("Manage account form #manage-account-form not found.");
    }

});