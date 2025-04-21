document.addEventListener('DOMContentLoaded', async () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const departmentFilter = document.getElementById('department-filter');
    const scheduleRows = document.querySelectorAll('#schedule-body tr');

    // Fetch user data from the server
    const fetchUserData = async () => {
        try {
            const response = await fetch('/user'); // Adjust the endpoint to match your backend
            if (!response.ok) throw new Error('Failed to fetch user data');
            return await response.json();
        } catch (error) {
            console.error('Error fetching user data:', error);
            return null;
        }
    };

    const user = await fetchUserData();
    console.log('Fetched user:', user);

    if (user) {
        if (user.roles === 'Admin') {
            // Display only the Admin's department in the dropdown
            departmentFilter.innerHTML = `
                <option value="${user.department}">${capitalize(user.department)}</option>
            `;
            departmentFilter.value = user.department; // Set the default value
        } else {
            // Disable all buttons for non-Admin users
            scheduleButtons.forEach(button => {
                button.disabled = true;
            });
        }
    } else {
        console.error('User data not available');
    }

    // Tab functionality
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Dropdown filter functionality
    departmentFilter.addEventListener('change', () => {
        const selectedDepartment = departmentFilter.value;

        scheduleRows.forEach(row => {
            row.style.display = 'table-row'; // Reset all rows to visible

            if (selectedDepartment !== 'all') {
                const cells = row.querySelectorAll('td[data-department]');
                let rowMatches = false;

                cells.forEach(cell => {
                    if (cell.getAttribute('data-department') === selectedDepartment) {
                        rowMatches = true;
                    }
                });

                if (!rowMatches) {
                    row.style.display = 'none'; // Hide rows that don't match
                }
            }
        });
    });

    // Helper function to capitalize the first letter of a string
    function capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
});