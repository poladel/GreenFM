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

    // Fetch application period data from the server
    const fetchApplicationPeriod = async (key) => {
        try {
            const response = await fetch(`/admin/application-period?key=${key}`);
            if (!response.ok) throw new Error('Failed to fetch application period data');
            return await response.json();
        } catch (error) {
            console.error('Error fetching application period data:', error);
            return null;
        }
    };

    // Fetch and display the existing application period
    const displayExistingApplicationPeriod = async () => {
        const applicationPeriod = await fetchApplicationPeriod('JoinGFM');
        const existingPeriodElement = document.getElementById('existingApplicationPeriod');

        if (applicationPeriod) {
            const { startDate, endDate } = applicationPeriod;

            // Get the current year
            const currentYear = new Date().getFullYear();

            // Check if both startDate and endDate are within the current year
            const startYear = new Date(startDate).getFullYear();
            const endYear = new Date(endDate).getFullYear();

            if (startYear === currentYear && endYear === currentYear) {
                const formattedStartDate = new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                const formattedEndDate = new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

                existingPeriodElement.textContent = `${currentYear} Application Period: ${formattedStartDate} - ${formattedEndDate}`;
            } else {
                existingPeriodElement.textContent = `No application period set for ${currentYear}.`;
            }
        } else {
            existingPeriodElement.textContent = `No application period set for ${currentYear}.`;
        }
    };

    // Call the function on page load
    displayExistingApplicationPeriod();

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
                if (!response.ok) {
                    if (response.status === 404) {
                        console.warn(`No schedule found for ${day} at ${time}.`);
                    } else {
                        throw new Error('Failed to fetch schedule data');
                    }
                }

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

        const key = 'JoinGFM';
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!key || !startDate || !endDate) {
            alert('Please fill in all fields (start date and end date).');
            return;
        }

        // --- Date Validation ---
        const startDateTime = new Date(startDate);
        const endDateTime = new Date(endDate);
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); // Normalize current date

        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
             alert('Invalid date format provided.');
             return;
        }
        if (endDateTime < startDateTime) {
            alert('End Date must be after Start Date.');
            return;
        }

        const targetYear = startDateTime.getFullYear();

        // --- Pre-submission Checks ---
        try {
            // Fetch the current settings to check status
            const existingPeriod = await fetchApplicationPeriod(key);

            if (existingPeriod) {
                const existingStartDate = new Date(existingPeriod.startDate);
                const existingEndDate = new Date(existingPeriod.endDate);
                existingEndDate.setHours(23, 59, 59, 999); // Include whole end day

                // Check 1: Is the current date within the existing active period?
                if (currentDate >= existingStartDate && currentDate <= existingEndDate) {
                    alert('Cannot add application period during an active application period. Please wait until the period ends.');
                    return; // Stop submission
                }

                // Check 2: Is the target year's period already finished?
                const existingPeriodYear = existingStartDate.getFullYear();
                if (targetYear === existingPeriodYear && currentDate > existingEndDate) {
                     alert(`An application period for ${targetYear} has already concluded. You cannot set a new period for this year.`);
                     return; // Stop submission
                }
            }

            // --- If checks pass, proceed with confirmation and submission ---

            // Format the dates for confirmation message
            const formatDate = (dateStr) => {
                const options = { year: 'numeric', month: 'long', day: '2-digit' };
                // Adjust for potential timezone issues by parsing as UTC if needed, or ensure input is treated consistently
                const dateObj = new Date(dateStr + 'T00:00:00'); // Treat input as local time start of day
                return new Intl.DateTimeFormat('en-US', options).format(dateObj);
            };

            const formattedStartDate = formatDate(startDate);
            const formattedEndDate = formatDate(endDate);

            // Ask for confirmation (initial attempt, no force flag)
            let confirmation = confirm(
                `Do you want to set ${formattedStartDate} - ${formattedEndDate} as the GFM Application Period?`
            );

            if (!confirmation) {
                // Clear the fields if the user cancels initially
                startDateInput.value = '';
                endDateInput.value = '';
                return;
            }

            // --- Attempt to Save (potentially triggering backend confirmation) ---
            await saveApplicationPeriod(key, startDate, endDate, false); // Initial attempt with force = false

        } catch (error) {
            // Handle errors during pre-check fetch (less likely)
            console.error('Error during pre-submission checks:', error);
            alert('An error occurred while checking existing settings. Please try again.');
        }
    });

    // --- Separate function to handle saving and potential confirmation ---
    const saveApplicationPeriod = async (key, startDate, endDate, force) => {
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');

        // Disable form fields during submission attempt
        routeSettingsFields.forEach(field => { field.disabled = true; });

        try {
            const response = await fetch('/admin/application-period', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, startDate, endDate, force }), // Include force flag
            });

            const data = await response.json(); // Always try to parse JSON

            if (response.ok) { // Status 200-299
                alert(data.message || 'GFM Application Period saved successfully!');
                displayExistingApplicationPeriod(); // Refresh the displayed period
                // Optionally clear fields or keep them disabled until period ends
                // startDateInput.value = ''; // Decide if you want to clear on success
                // endDateInput.value = '';
                // Keep fields disabled if needed based on new period? Re-enable based on logic?
                // For now, let's re-enable if successful and not within a new active period (simplification)
                 routeSettingsFields.forEach(field => { field.disabled = false; });


            } else if (response.status === 409 && data.conflict) {
                // Backend detected conflict, ask for confirmation again
                console.warn('Backend detected conflict:', data.message);
                const forceConfirmation = confirm(data.message + "\n\nDo you want to overwrite?"); // Show backend message

                if (forceConfirmation) {
                    // Resend with force = true
                    await saveApplicationPeriod(key, startDate, endDate, true);
                } else {
                    // User cancelled overwrite
                    alert('Operation cancelled.');
                    startDateInput.value = ''; // Clear fields on cancellation
                    endDateInput.value = '';
                    routeSettingsFields.forEach(field => { field.disabled = false; }); // Re-enable fields
                }
            } else {
                 // Handle other errors (400, 403, 500 etc.)
                 throw new Error(data.error || data.message || `Failed to save settings (Status: ${response.status})`);
            }

        } catch (error) {
            console.error('Error saving application period:', error);
            alert(`Error: ${error.message}`);
            // Re-enable fields on error
            routeSettingsFields.forEach(field => { field.disabled = false; });
        }
    };

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

    // Helper function to capitalize the first letter of a string
    /*function capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }*/
});

