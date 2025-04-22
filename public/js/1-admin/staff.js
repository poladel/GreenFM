document.addEventListener('DOMContentLoaded', async () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const departmentFilter = document.getElementById('department-filter');
    const scheduleRows = document.querySelectorAll('#schedule-body tr');
    const scheduleButtons = document.querySelectorAll('.availablebtn');
    const modal = document.getElementById('scheduleModal');
    const closeModal = document.querySelector('.close');
    const scheduleForm = document.getElementById('scheduleForm');
    const routeSettingsForm = document.getElementById('routeSettingsForm');
    const routeSettingsFields = routeSettingsForm.querySelectorAll('input, button'); 

    routeSettingsFields.forEach(field => {
        field.disabled = true;
    });

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

    if (user && user.roles === 'Admin') {
        routeSettingsFields.forEach(field => {
            field.disabled = false;
        });  
    }

    const fetchSchedules = async (year, department) => {
        try {
            const response = await fetch(`/admin/schedules?year=${year}&department=${department}`);
            if (!response.ok) throw new Error('Failed to fetch schedules');
            const data = await response.json();
            console.log('Fetched schedules:', data); // Debugging
            return data;
        } catch (error) {
            console.error('Error fetching schedules:', error);
            return [];
        }
    };

    const displaySchedules = (schedules) => {
        console.log('Schedules to display:', schedules); // Debugging
    
        // Clear all existing schedule buttons
        scheduleButtons.forEach(button => {
            button.textContent = ''; // Clear the text
            button.classList.remove('schedulebtn'); // Remove the "scheduled" class
            button.classList.add('availablebtn'); // Add the "available" class
        });
    
        // Display the new schedules
        schedules.forEach(schedule => {
            const button = Array.from(scheduleButtons).find(
                btn => {
                    console.log(`Checking button: day=${btn.getAttribute('data-day')}, time=${btn.getAttribute('data-time')}`);
                    return btn.getAttribute('data-day') === schedule.day &&
                           btn.getAttribute('data-time') === schedule.time;
                }
            );
    
            if (button) {
                console.log('Matched button:', button); // Debugging
                button.textContent = `${schedule.subject} (${schedule.roomNum})`;
                button.classList.remove('availablebtn'); // Remove the "available" class
                button.classList.add('schedulebtn'); // Add the "scheduled" class
            }
        });
    };

    if (user) {
        if (user.roles === 'Admin') {
            // Display only the Admin's department in the dropdown
            departmentFilter.innerHTML = `
                <option value="News and Public Affairs">News and Public Affairs</option>
                <option value="Music and Entertainment">Music and Entertainment</option>
                <option value="Operations and Logistics">Operations and Logistics</option>
                <option value="Creatives and Promotions">Creatives and Promotions</option>
            `;
            departmentFilter.value = user.department; // Set the default value

            // Enable all buttons for Admin users
            scheduleButtons.forEach(button => {
                button.disabled = false;
            });

            // Fetch and display schedules
            const currentYear = new Date().getFullYear();
            const schedules = await fetchSchedules(currentYear, user.department);
            displaySchedules(schedules);
        } else {
            const currentYear = new Date().getFullYear();
            const schedules = await fetchSchedules(currentYear, user.department);
            displaySchedules(schedules);
            
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
    departmentFilter.addEventListener('change', async () => {
        const selectedDepartment = departmentFilter.value;
        console.log('Selected department:', selectedDepartment); // Debugging

        const currentYear = new Date().getFullYear();
        const schedules = await fetchSchedules(currentYear, selectedDepartment);
        displaySchedules(schedules);
    });

    // Open modal on button click
    scheduleButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const day = button.getAttribute('data-day');
            const time = button.getAttribute('data-time');

            try {
                // Fetch the schedule data from the database
                const response = await fetch(`/admin/schedule?day=${encodeURIComponent(day)}&time=${encodeURIComponent(time)}`);
                if (!response.ok && response.status !== 404) throw new Error('Failed to fetch schedule data');
                const schedule = response.status === 404 ? null : await response.json();

                // Populate modal fields
                document.getElementById('day').value = day;
                document.getElementById('time').value = time;

                if (schedule) {
                    // If a schedule exists, populate the modal with the fetched data
                    document.getElementById('adminName').value = `${schedule.lastName}, ${schedule.firstName} ${schedule.middleInitial ?? ''} ${schedule.suffix ?? ''}`;
                    document.getElementById('cys').value = schedule.cys;
                    document.getElementById('subject').value = schedule.subject;
                    document.getElementById('roomNum').value = schedule.roomNum;

                    // Update the "Save" button to edit the schedule
                    const saveButton = scheduleForm.querySelector('button[type="submit"]');
                    saveButton.textContent = 'Edit';
                    saveButton.onclick = async (e) => {
                        e.preventDefault();
                        await editSchedule(schedule._id, modal); // Call the edit function
                    };

                    // Add a "Delete" button
                    const existingDeleteButton = scheduleForm.querySelector('.delete-button');
                    if (existingDeleteButton) {
                        existingDeleteButton.remove();
                    }

                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Delete';
                    deleteButton.classList.add('delete-button');
                    deleteButton.type = 'button';
                    deleteButton.onclick = async () => {
                        await deleteSchedule(schedule._id);
                        modal.style.display = 'none';
                    };
                    scheduleForm.appendChild(deleteButton);
                } else {
                    // If no schedule exists, clear the modal fields for creating a new schedule
                    document.getElementById('adminName').value = `${user.lastName}, ${user.firstName} ${user.middleInitial ?? ''} ${user.suffix ?? ''}`;
                    document.getElementById('cys').value = '';
                    document.getElementById('subject').value = '';
                    document.getElementById('roomNum').value = '';

                    // Update the "Save" button to create a new schedule
                    const saveButton = scheduleForm.querySelector('button[type="submit"]');
                    saveButton.textContent = 'Save';
                    saveButton.onclick = async (e) => {
                        e.preventDefault();
                        await saveNewSchedule(modal); // Call the save function
                    };

                    // Remove any existing "Delete" button
                    const existingDeleteButton = scheduleForm.querySelector('.delete-button');
                    if (existingDeleteButton) {
                        existingDeleteButton.remove();
                    }
                }

                // Show the modal
                modal.style.display = 'block';
            } catch (error) {
                console.error('Error fetching schedule data:', error);
                alert('Failed to fetch schedule data.');
            }
        });
    });

    // Close modal
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Submit form
    scheduleForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            lastName: user.lastName,
            firstName: user.firstName,
            middleInitial: user.middleInitial,
            suffix: user.suffix,
            cys: document.getElementById('cys').value,
            department: user.department,
            day: document.getElementById('day').value,
            time: document.getElementById('time').value,
            subject: document.getElementById('subject').value,
            roomNum: document.getElementById('roomNum').value,
            year: new Date().getFullYear(), // Assuming you want the current year
        };

        // Validate required fields
        if (!formData.cys || !formData.subject || !formData.roomNum) {
            alert('Please fill in all required fields.');
            return;
        }

        try {
            const response = await fetch('/admin/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error('Failed to save schedule');
            }

            alert('Schedule saved successfully!');
            modal.style.display = 'none'; // Close the modal

            // Update the button text with subject and room number
            const button = Array.from(scheduleButtons).find(
                btn => btn.getAttribute('data-day') === formData.day && btn.getAttribute('data-time') === formData.time
            );

            if (button) {
                button.textContent = `${formData.subject} (${formData.roomNum})`;
                button.classList.remove('availablebtn'); // Remove the existing class
                button.classList.add('schedulebtn'); // Add the new class
            }
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('Failed to save schedule.');
        }
    });

    const saveNewSchedule = async (modal) => {
        const formData = {
            lastName: user.lastName,
            firstName: user.firstName,
            middleInitial: user.middleInitial,
            suffix: user.suffix,
            cys: document.getElementById('cys').value,
            department: user.department,
            day: document.getElementById('day').value,
            time: document.getElementById('time').value,
            subject: document.getElementById('subject').value,
            roomNum: document.getElementById('roomNum').value,
            year: new Date().getFullYear(),
        };
    
        // Validate required fields
        if (!formData.cys || !formData.subject || !formData.roomNum) {
            alert('Please fill in all required fields.');
            return;
        }
    
        try {
            const response = await fetch('/admin/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
    
            if (!response.ok) {
                throw new Error('Failed to save schedule');
            }
    
            alert('Schedule saved successfully!');
            modal.style.display = 'none'; // Close the modal
    
            // Update the button text with subject and room number
            const button = Array.from(scheduleButtons).find(
                btn => btn.getAttribute('data-day') === formData.day && btn.getAttribute('data-time') === formData.time
            );
    
            if (button) {
                button.textContent = `${formData.subject} (${formData.roomNum})`;
                button.classList.remove('availablebtn');
                button.classList.add('schedulebtn');
            }
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('Failed to save schedule.');
        }
    };

    const editSchedule = async (id, modal) => {
        const formData = {
            cys: document.getElementById('cys').value,
            subject: document.getElementById('subject').value,
            roomNum: document.getElementById('roomNum').value,
        };
    
        // Validate required fields
        if (!formData.cys || !formData.subject || !formData.roomNum) {
            alert('Please fill in all required fields.');
            return;
        }
    
        try {
            const response = await fetch(`/admin/schedule/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
    
            if (!response.ok) {
                throw new Error('Failed to update schedule');
            }
    
            alert('Schedule updated successfully!');
            modal.style.display = 'none'; // Close the modal
    
            // Update the button text with the new subject and room number
            const button = Array.from(scheduleButtons).find(
                btn => btn.getAttribute('data-day') === document.getElementById('day').value &&
                       btn.getAttribute('data-time') === document.getElementById('time').value
            );
    
            if (button) {
                button.textContent = `${formData.subject} (${formData.roomNum})`;
            }
        } catch (error) {
            console.error('Error updating schedule:', error);
            alert('Failed to update schedule.');
        }
    };
    
    const deleteSchedule = async (id) => {
        try {
            const response = await fetch(`/admin/schedule/${id}`, {
                method: 'DELETE',
            });
    
            if (!response.ok) {
                throw new Error('Failed to delete schedule');
            }
    
            alert('Schedule deleted successfully!');
    
            // Clear the button text
            const button = Array.from(scheduleButtons).find(
                btn => btn.getAttribute('data-day') === document.getElementById('day').value &&
                       btn.getAttribute('data-time') === document.getElementById('time').value
            );
    
            if (button) {
                button.textContent = '';
            }
        } catch (error) {
            console.error('Error deleting schedule:', error);
            alert('Failed to delete schedule.');
        }
    };

    routeSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
    
        const key = 'JoinGFM'; // Get the key value from the form
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
    
        if (!key || !startDate || !endDate) {
            alert('Please fill in all fields (key, start date, and end date).');
            return;
        }

        // Disable buttons and populate inputs
        routeSettingsFields.forEach(field => {
            field.disabled = true;
        });

        // Populate inputs with the selected values
        document.getElementById('startDate').value = startDate;
        document.getElementById('endDate').value = endDate;

        try {
            const response = await fetch('/admin/route-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, startDate, endDate }),
            });
    
            if (!response.ok) {
                throw new Error('Failed to save route settings');
            }
    
            alert('Route settings saved successfully!');

            // Calculate the time period and re-enable buttons after the end date
            const now = new Date();
            const endDateTime = new Date(endDate).getTime();
            const timeUntilEnd = endDateTime - now.getTime();

            if (timeUntilEnd > 0) {
                setTimeout(() => {
                    routeSettingsFields.forEach(field => {
                        field.disabled = false;
                    });
                    scheduleButtons.forEach(button => {
                        button.disabled = false;
                    });
                }, timeUntilEnd);
            }
        } catch (error) {
            console.error('Error saving route settings:', error);
            alert('Failed to save route settings.');
        }
    });

    // Helper function to capitalize the first letter of a string
    /*function capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }*/
});

