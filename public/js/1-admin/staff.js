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
    const recurringCheckbox = document.getElementById('recurringCheckbox');
    const specificDateContainer = document.getElementById('specificDateContainer');
    const specificDateDropdown = document.getElementById('specificDateDropdown');
    const weekFilterDropdown = document.getElementById('week-filter');
    let currentApplicationPeriod = null;

    // --- Define fetchApplicationPeriod function ---
    const fetchApplicationPeriod = async (key) => {
        try {
            // Adjust the URL to match your actual backend route for getting the period
            const response = await fetch(`/admin/application-period?key=${encodeURIComponent(key)}`);

            if (response.status === 404) {
                console.log(`Application period with key "${key}" not found.`);
                return null; // Return null if not found
            }
            if (!response.ok) {
                // Throw an error for other non-successful responses
                throw new Error(`Failed to fetch application period: ${response.statusText}`);
            }
            const data = await response.json();
            return data; // Return the fetched period data
        } catch (error) {
            console.error('Error in fetchApplicationPeriod:', error);
            // Depending on how you want to handle errors downstream, you might return null or re-throw
            return null;
        }
    };

    // --- Define Display Existing Application Period ---
    const displayExistingApplicationPeriod = () => {
        const existingPeriodElement = document.getElementById('existingApplicationPeriod');
        const currentYear = new Date().getFullYear();

        if (currentApplicationPeriod) {
            const { startDate, endDate } = currentApplicationPeriod;
            const startYear = new Date(startDate).getFullYear();
            const endYear = new Date(endDate).getFullYear();

            // Check if the period falls within the current display year (optional, but good practice)
            // This logic might need adjustment depending on how you want to display cross-year periods
            if (startYear === currentYear || endYear === currentYear) { // Adjusted to show if start OR end is in current year
                // FIX: Pass the original ISO string directly to new Date()
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

    // --- Define Function to Populate Week Dropdown ---
    const populateWeekDropdown = () => {
        weekFilterDropdown.innerHTML = ''; // Clear previous options

        if (!currentApplicationPeriod || !currentApplicationPeriod.startDate || !currentApplicationPeriod.endDate) {
            weekFilterDropdown.innerHTML = '<option value="">Period Not Set</option>';
            weekFilterDropdown.disabled = true;
            return;
        }

        // FIX: Pass the original ISO string directly to new Date()
        const startDate = new Date(currentApplicationPeriod.startDate);
        const endDate = new Date(currentApplicationPeriod.endDate);

        // Check if dates are valid after parsing
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
             console.error("Invalid start or end date parsed in populateWeekDropdown:", currentApplicationPeriod.startDate, currentApplicationPeriod.endDate);
             weekFilterDropdown.innerHTML = '<option value="">Invalid Period Dates</option>';
             weekFilterDropdown.disabled = true;
             return;
        }


        let currentWeekStart = new Date(startDate);

        // Adjust currentWeekStart to the beginning of its week (e.g., Monday)
        const dayOfWeek = currentWeekStart.getDay(); // 0=Sun, 1=Mon, ...
        const diff = currentWeekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
        currentWeekStart.setDate(diff);
        currentWeekStart.setHours(0, 0, 0, 0); // Normalize time

        let weekIndex = 0;
        while (currentWeekStart <= endDate) {
            const weekEnd = new Date(currentWeekStart);
            weekEnd.setDate(currentWeekStart.getDate() + 6); // Get end of the week (Sunday)

            // Ensure the week start is not after the overall period end date before adding
            if (currentWeekStart > endDate) break;

            const displayEndDate = weekEnd > endDate ? endDate : weekEnd;

            const option = document.createElement('option');
            const weekStartDateString = currentWeekStart.toISOString().split('T')[0]; // YYYY-MM-DD
            option.value = weekStartDateString;

            const formatOptions = { month: 'short', day: 'numeric' };
            const startText = currentWeekStart.toLocaleDateString('en-US', formatOptions);
            const endText = displayEndDate.toLocaleDateString('en-US', formatOptions);
            option.textContent = `Week of ${startText} - ${endText}`;

            weekFilterDropdown.appendChild(option);

            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
            weekIndex++;
        }

        weekFilterDropdown.disabled = weekIndex === 0;
        // Removed the call to handleWeekChange from here, it's called later in fetchAndStoreApplicationPeriod
    };

    // --- Define fetchSchedules function ---
    // Moved UP
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

    // --- Define displaySchedules function ---
    // --- FIX: Rewritten to handle weeklyData { recurring, overrides } ---
    const displaySchedules = (weeklyData, weekStartDateString) => {
        console.log('Displaying weekly availability:', weeklyData);
        const { recurring, overrides } = weeklyData;
        const weekStart = new Date(weekStartDateString + 'T00:00:00'); // Parse week start in local time

        // Create a lookup map for overrides: "YYYY-MM-DD_HH:MM-HH:MM" -> override object
        const overrideMap = new Map();
        overrides.forEach(override => {
            // Assuming override.date is already in "YYYY-MM-DD" format from backend
            const key = `${override.date}_${override.time}`;
            overrideMap.set(key, override);
        });

        // Create a lookup map for recurring schedules: "DayName_HH:MM-HH:MM" -> schedule object
        const recurringMap = new Map();
        recurring.forEach(schedule => {
            const key = `${schedule.day}_${schedule.time}`;
            recurringMap.set(key, schedule);
        });


        // Iterate through each button in the grid
        scheduleButtons.forEach(button => {
            const dayName = button.getAttribute('data-day'); // e.g., "Monday"
            const time = button.getAttribute('data-time'); // e.g., "7:00-8:00"

            // Calculate the specific date for this button within the current week
            const dayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(dayName);
            let buttonDate = new Date(weekStart); // Create mutable copy
            const weekStartDayIndex = weekStart.getDay(); // 0=Sun, 1=Mon

            // Calculate days to add based on local time start of week
            let daysToAdd = dayIndex - weekStartDayIndex;
             if (daysToAdd < 0) {
                 daysToAdd += 7;
             }
            buttonDate.setDate(buttonDate.getDate() + daysToAdd); // Modify buttonDate

            // --- FIX: Format buttonDateString using local components ---
            const year = buttonDate.getFullYear();
            const month = (buttonDate.getMonth() + 1).toString().padStart(2, '0');
            const day = buttonDate.getDate().toString().padStart(2, '0');
            const buttonDateString = `${year}-${month}-${day}`; // Correct YYYY-MM-DD based on local date
            // --- End of FIX ---

            // Determine the status based on overrides first, then recurring
            const overrideKey = `${buttonDateString}_${time}`; // Key uses local date string
            const recurringKey = `${dayName}_${time}`;

            let isAvailable = true;
            let buttonText = '';
            let scheduleDetails = null; // To hold either override or recurring details

            const override = overrideMap.get(overrideKey); // Check map using local date string key
            const recurringSchedule = recurringMap.get(recurringKey);

            if (override) {
                // Override exists for this specific date and time
                scheduleDetails = override;
                if (override.status === 'available') {
                    isAvailable = true;
                    buttonText = ''; // Slot is available due to override
                    console.log(`Override found for ${overrideKey}: AVAILABLE`); // Debugging
                } else { // status === 'unavailable'
                    isAvailable = false;
                    buttonText = `${override.subject} (${override.roomNum})`; // Slot is booked by override
                    console.log(`Override found for ${overrideKey}: UNAVAILABLE`); // Debugging
                }
            } else if (recurringSchedule) {
                // No override, but a recurring schedule exists for this day and time
                scheduleDetails = recurringSchedule;
                isAvailable = false;
                buttonText = `${recurringSchedule.subject} (${recurringSchedule.roomNum})`; // Slot is booked by recurring rule
                 console.log(`No override for ${buttonDateString}_${time}, using recurring for ${recurringKey}`); // Debugging
            } else {
                // No override and no recurring schedule
                isAvailable = true;
                buttonText = ''; // Slot is available by default
                 console.log(`No override or recurring for ${buttonDateString}_${time}`); // Debugging
            }

            // Update button appearance
            button.textContent = buttonText;
            button.disabled = false; // Re-enable button
            if (isAvailable) {
                button.classList.remove('schedulebtn');
                button.classList.add('availablebtn');
            } else {
                button.classList.remove('availablebtn');
                button.classList.add('schedulebtn');
            }

            // Optional: Store details on the button if needed for the modal later
            // button.dataset.scheduleDetails = JSON.stringify(scheduleDetails);
        });
    };

    // --- Define Function to Handle Week Change ---
    const handleWeekChange = async () => {
        const selectedWeekStartDate = weekFilterDropdown.value;
        const selectedDepartment = departmentFilter.value;

        if (!selectedWeekStartDate || !selectedDepartment) {
            console.log("Week or department not selected.");
            // Clear the grid or show a message
            scheduleButtons.forEach(button => {
                button.textContent = '';
                button.classList.remove('schedulebtn');
                button.classList.add('availablebtn');
                button.disabled = true; // Disable if no selection
            });
            return;
        }

        console.log(`Fetching weekly availability for week starting: ${selectedWeekStartDate}, Department: ${selectedDepartment}`);

        try {
            // --- FIX: Fetch combined data from the new endpoint ---
            const response = await fetch(`/admin/weekly-schedule?weekStart=${selectedWeekStartDate}&department=${encodeURIComponent(selectedDepartment)}`);
            if (!response.ok) {
                throw new Error('Failed to fetch weekly availability');
            }
            const weeklyData = await response.json(); // Contains { recurring: [...], overrides: [...] }

            // --- FIX: Pass the combined data to displaySchedules ---
            displaySchedules(weeklyData, selectedWeekStartDate); // Pass week start date too

        } catch (error) {
            console.error("Error fetching/displaying weekly schedule:", error);
            // Clear the grid or show an error message
             scheduleButtons.forEach(button => {
                button.textContent = 'Error';
                button.classList.remove('schedulebtn');
                button.classList.add('availablebtn');
                button.disabled = true; // Disable buttons on error
            });
        }
    };

    // --- Fetch Application Period ---
    const fetchAndStoreApplicationPeriod = async () => {
        try {
            currentApplicationPeriod = await fetchApplicationPeriod('JoinGFM');
            console.log("Fetched application period:", currentApplicationPeriod);
            if (currentApplicationPeriod) {
                populateWeekDropdown();
                weekFilterDropdown.disabled = false;
                displayExistingApplicationPeriod();
                if (weekFilterDropdown.options.length > 0 && weekFilterDropdown.value) {
                     handleWeekChange(); // Call to load initial week data
                }
            } else {
                weekFilterDropdown.innerHTML = '<option value="">No Active Period</option>';
                weekFilterDropdown.disabled = true;
                displayExistingApplicationPeriod();
            }
        } catch (error) {
            console.error("Failed to fetch application period on load:", error);
            weekFilterDropdown.innerHTML = '<option value="">Error Loading Period</option>';
            weekFilterDropdown.disabled = true;
            displayExistingApplicationPeriod();
        }
    };

    // --- Define fetchUserData function ---
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

    // --- Execute Initial Fetch ---
    await fetchAndStoreApplicationPeriod(); // Fetch on initial load

    // --- Get User Data ---
    const user = await fetchUserData();

    // --- Initial Setup based on User/Data ---
    if (user && user.roles === 'Admin') {
        routeSettingsFields.forEach(field => {
            field.disabled = false;
        });
    }

    // --- Add Event Listeners ---
    departmentFilter.addEventListener('change', handleWeekChange);
    weekFilterDropdown.addEventListener('change', handleWeekChange);

    // --- Define populateDateDropdownForOverride ---
    const populateDateDropdownForOverride = () => {
        specificDateDropdown.innerHTML = '<option value="">Loading dates...</option>'; // Clear previous

        if (!currentApplicationPeriod || !currentApplicationPeriod.startDate || !currentApplicationPeriod.endDate) {
            console.error("Application period data is not available.");
            specificDateDropdown.innerHTML = '<option value="">Error: Period not set</option>';
            // Optionally try fetching again if needed, but it should be fetched on load
            return;
        }

        const startDate = new Date(currentApplicationPeriod.startDate + 'T00:00:00'); // Use T00:00:00 to avoid timezone issues affecting the date part
        const endDate = new Date(currentApplicationPeriod.endDate + 'T00:00:00');

        specificDateDropdown.innerHTML = '<option value="">Select a date</option>'; // Reset with placeholder

        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const option = document.createElement('option');
            const dateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
            option.value = dateString;
            // Display format: "Friday, May 2, 2025"
            option.textContent = currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            specificDateDropdown.appendChild(option);
            currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
        }
    };

    // --- Modal Opening Logic ---
    scheduleButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const day = button.getAttribute('data-day'); // e.g., "Friday"
            const time = button.getAttribute('data-time'); // e.g., "7:00-8:00"

            // 1. Reset Modal State
            recurringCheckbox.checked = true; // Default to recurring
            specificDateContainer.style.display = 'none'; // Hide date dropdown
            specificDateDropdown.required = false;
            specificDateDropdown.innerHTML = ''; // Clear dropdown options
            document.getElementById('scheduleForm').reset(); // Clear form fields
            document.getElementById('day').value = day; // Set hidden day field
            document.getElementById('time').value = time; // Set hidden time field

            // --- FIX: Remove previously added dynamic buttons ---
            const buttonContainer = scheduleForm.querySelector('.modal-buttons');
            const existingDeleteButton = buttonContainer.querySelector('.delete-button');
            if (existingDeleteButton) {
                existingDeleteButton.remove();
            }
            const existingMakeAvailableButton = buttonContainer.querySelector('.make-available-button');
            if (existingMakeAvailableButton) {
                existingMakeAvailableButton.remove();
            }
            // --- End of FIX ---

            const saveButton = scheduleForm.querySelector('button[type="submit"]');


            try {
                // 2. Fetch RECURRING schedule data for context
                const currentYear = new Date().getFullYear();
                const currentDepartment = departmentFilter.value;
                const response = await fetch(`/admin/schedule?day=${encodeURIComponent(day)}&time=${encodeURIComponent(time)}&year=${currentYear}&department=${encodeURIComponent(currentDepartment)}`);

                if (!response.ok && response.status !== 404) {
                    throw new Error('Failed to fetch schedule data');
                }
                const schedule = response.status === 404 ? null : await response.json();

                // 3. Populate Modal based on Recurring Data (or lack thereof)
                document.getElementById('adminName').value = `${user.lastName}, ${user.firstName} ${user.middleInitial ?? ''} ${user.suffix ?? ''}`;

                if (schedule) { // Existing RECURRING schedule found
                    document.getElementById('cys').value = schedule.cys;
                    document.getElementById('subject').value = schedule.subject;
                    document.getElementById('roomNum').value = schedule.roomNum;

                    saveButton.textContent = 'Edit Recurring';
                    saveButton.onclick = (e) => {
                        e.preventDefault();
                        handleFormSubmit(schedule._id);
                    };

                    // Add Delete button for the RECURRING schedule
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Delete Recurring';
                    deleteButton.classList.add('delete-button'); // Ensure class is present
                    deleteButton.type = 'button';
                    deleteButton.onclick = async () => {
                        if (confirm('Are you sure you want to delete this recurring weekly schedule?')) {
                            await deleteSchedule(schedule._id);
                            modal.style.display = 'none';
                            const schedules = await fetchSchedules(currentYear, currentDepartment);
                            displaySchedules(schedules);
                        }
                    };
                    buttonContainer.appendChild(deleteButton); // Append AFTER potential removal

                    // Add "Make Available This Week" button
                    const makeAvailableButton = document.createElement('button');
                    makeAvailableButton.textContent = 'Make Available This Week';
                    makeAvailableButton.classList.add('make-available-button'); // Ensure class is present
                    makeAvailableButton.type = 'button';
                    makeAvailableButton.onclick = async () => {
                        // --- DEBUGGING START ---
                        const selectedWeekStartDate = weekFilterDropdown.value;
                        console.log("--- Make Available Click ---");
                        console.log("Selected Week Dropdown Value:", selectedWeekStartDate);
                        console.log("Recurring Schedule Day:", schedule.day);
                        console.log("Recurring Schedule Time:", schedule.time);
                        console.log("Admin User:", user);
                        // --- DEBUGGING END ---

                        if (!selectedWeekStartDate) {
                            alert('Please select a week from the "View Week" dropdown first.');
                            return;
                        }
                        // Check if selectedWeekStartDate is a valid date string format if needed
                        if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedWeekStartDate)) {
                             alert('Invalid week selected in dropdown.');
                             console.error("Invalid date format from week dropdown:", selectedWeekStartDate);
                             return;
                        }

                        if (confirm(`Are you sure you want to make the recurring slot (${schedule.day} ${schedule.time}) available for the week starting ${selectedWeekStartDate}? This cannot be undone easily.`)) {
                            // Pass the confirmed selectedWeekStartDate to the function
                            await makeRecurringAvailableForWeek(schedule, selectedWeekStartDate, user);
                            modal.style.display = 'none';
                            await handleWeekChange(); // Refresh the view
                        }
                    };
                    buttonContainer.appendChild(makeAvailableButton); // Append AFTER potential removal

                } else { // No existing RECURRING schedule for this slot
                    saveButton.textContent = 'Save';
                     saveButton.onclick = (e) => {
                        e.preventDefault();
                        handleFormSubmit(null);
                    };
                    // No dynamic buttons needed if creating new
                }

                // 4. Show the modal
                modal.style.display = 'block';

            } catch (error) {
                console.error('Error opening modal or fetching schedule data:', error);
                alert('Failed to load schedule data.');
            }
        });
    });

    const makeRecurringAvailableForWeek = async (recurringSchedule, weekStartDateString, adminUser) => {
        try {
            // 1. Determine the target date within the week
            const weekStart = new Date(weekStartDateString + 'T00:00:00'); // Parse week start in local time
            const recurringDayString = recurringSchedule.day;
            const recurringDayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(recurringDayString);

            if (recurringDayIndex === -1) {
                throw new Error(`Invalid day name found in recurring schedule: ${recurringDayString}`);
            }

            let targetDate = new Date(weekStart); // Create a mutable copy
            const weekStartDayIndex = weekStart.getDay();

            // Calculate the difference in days, handling wrap-around
            let daysToAdd = recurringDayIndex - weekStartDayIndex;
            if (daysToAdd < 0) {
                daysToAdd += 7;
            }

            console.log(`Calculating target date: weekStart=${weekStart.toDateString()}, recurringDay=${recurringDayString}(${recurringDayIndex}), weekStartDayIndex=${weekStartDayIndex}, daysToAdd=${daysToAdd}`);

            // Apply the calculated difference
            targetDate.setDate(targetDate.getDate() + daysToAdd); // Modify the targetDate object

            // --- FIX: Format using local date components ---
            const year = targetDate.getFullYear();
            const month = (targetDate.getMonth() + 1).toString().padStart(2, '0'); // getMonth is 0-indexed, pad with '0'
            const day = targetDate.getDate().toString().padStart(2, '0'); // pad with '0'
            const targetDateString = `${year}-${month}-${day}`; // Correct YYYY-MM-DD based on local date
            // --- End of FIX ---

            console.log(`Calculated targetDateString (local): ${targetDateString}`); // Updated log

            // 2. Prepare data for the backend
            const overrideData = {
                recurringDay: recurringDayString,
                time: recurringSchedule.time,
                department: recurringSchedule.department,
                year: recurringSchedule.year, // Keep the recurring year or use targetDate.getFullYear()? Decide based on backend logic. Using recurring year for now.
                targetDate: targetDateString, // Use the correctly formatted local date string
                // Pass admin details
                lastName: adminUser.lastName,
                firstName: adminUser.firstName,
                middleInitial: adminUser.middleInitial,
                suffix: adminUser.suffix
            };

            console.log('Sending override data:', overrideData);


            // 3. Call the new backend endpoint
            const response = await fetch('/admin/schedule-override/make-available', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(overrideData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to make slot available.');
            }

            const result = await response.json();
            alert(result.message || 'Slot successfully marked as available for the specified date.');

        } catch (error) {
            console.error('Error in makeRecurringAvailableForWeek:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // --- Define Form Handlers ---
    const saveNewSchedule = async (modal, formData) => { // Accept formData
        // formData already validated in handleFormSubmit
        try {
            const response = await fetch('/admin/schedule', { // Endpoint for RECURRING
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (!response.ok) throw new Error('Failed to save recurring schedule');
            alert('Recurring schedule saved successfully!');
            modal.style.display = 'none';
            // Refresh schedule display
            const schedules = await fetchSchedules(formData.year, formData.department);
            displaySchedules(schedules);
        } catch (error) {
            console.error('Error saving recurring schedule:', error);
            alert(`Error: ${error.message}`);
        }
    };

    const editSchedule = async (id, modal, formData) => { // Accept formData
         // formData already validated in handleFormSubmit
        try {
            // Only send fields that can be edited for recurring (cys, subject, roomNum)
            const updateData = {
                cys: formData.cys,
                subject: formData.subject,
                roomNum: formData.roomNum,
            };
            const response = await fetch(`/admin/schedule/${id}`, { // Endpoint for RECURRING
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            });
            if (!response.ok) throw new Error('Failed to update recurring schedule');
            alert('Recurring schedule updated successfully!');
            modal.style.display = 'none';
            // Refresh schedule display
            const schedules = await fetchSchedules(new Date().getFullYear(), formData.department);
            displaySchedules(schedules);
        } catch (error) {
            console.error('Error updating recurring schedule:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // deleteSchedule remains largely the same for recurring, using the ID
    const deleteSchedule = async (id) => { // Assuming this is the correct delete function needed
        try {
            const response = await fetch(`/admin/schedule/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete schedule');
            }

            alert('Schedule deleted successfully!');

            // Refresh schedule display after deletion
            const currentYear = new Date().getFullYear();
            const currentDepartment = departmentFilter.value;
            const schedules = await fetchSchedules(currentYear, currentDepartment);
            displaySchedules(schedules);

        } catch (error) {
            console.error('Error deleting schedule:', error);
            alert('Failed to delete schedule.');
        }
    };


    // --- NEW Function for Saving/Updating Overrides ---
    const saveOrUpdateOverride = async (overrideData, modal) => {
        // This function assumes your backend endpoint can handle create/update (upsert)
        // Or you might need separate logic/endpoints for create vs update vs delete override
        try {
            // *** IMPORTANT: Use a DIFFERENT endpoint for overrides ***
            const response = await fetch('/admin/schedule-override', {
                method: 'POST', // Or PUT if your backend prefers for upsert/update
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(overrideData),
            });

            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.error || 'Failed to save schedule override');
            }

            alert(`Schedule override for ${overrideData.date} at ${overrideData.time} saved successfully!`);
            modal.style.display = 'none';

            // ** How to refresh display? **
            // This is the tricky part. The main grid shows recurring.
            // You might need to fetch BOTH recurring and overrides and combine them
            // in displaySchedules, or just accept that the grid won't immediately reflect
            // the specific date override without a more complex display logic update.
            console.warn("Override saved. Refreshing recurring schedule display, but it may not show specific date changes.");
            const schedules = await fetchSchedules(overrideData.year, overrideData.department);
            displaySchedules(schedules); // Refresh recurring view

        } catch (error) {
            console.error('Error saving schedule override:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // --- Centralized Form Submit Handler ---
    const handleFormSubmit = async (scheduleId) => {
        const isRecurring = recurringCheckbox.checked;
        const originalDay = document.getElementById('day').value;
        const originalTime = document.getElementById('time').value;
        const specificDate = specificDateDropdown.value;
        const currentDepartment = departmentFilter.value;
        const currentYear = new Date().getFullYear();

        const commonFormData = {
            cys: document.getElementById('cys').value,
            subject: document.getElementById('subject').value,
            roomNum: document.getElementById('roomNum').value,
            department: currentDepartment,
            // Include admin details if needed by backend consistently
            lastName: user.lastName,
            firstName: user.firstName,
            middleInitial: user.middleInitial,
            suffix: user.suffix,
        };

        // Basic validation for common fields
        if (!commonFormData.cys || !commonFormData.subject || !commonFormData.roomNum) {
            alert('Please fill in CYS, Subject, and Room Number.');
            return;
        }

        if (isRecurring) {
            // --- Handle RECURRING Save/Edit ---
            const recurringData = {
                ...commonFormData,
                day: originalDay,
                time: originalTime,
                year: currentYear,
            };

            if (scheduleId) { // Editing existing recurring
                await editSchedule(scheduleId, modal, recurringData); // Pass data to edit function
            } else { // Saving new recurring
                await saveNewSchedule(modal, recurringData); // Pass data to save function
            }
        } else {
            // --- Handle SPECIFIC DATE Override (Create/Update) ---
            if (!specificDate) {
                alert('Please select a specific date when "Recurring Schedule" is unchecked.');
                return;
            }
            const overrideData = {
                ...commonFormData,
                date: specificDate,
                time: originalTime, // Use the time slot originally clicked
                year: new Date(specificDate).getFullYear(), // Year from the specific date
                status: 'unavailable' // Assuming saving an override marks it as unavailable
            };
            // Use a dedicated function/endpoint for overrides
            await saveOrUpdateOverride(overrideData, modal);
        }
    };

    // --- Close modal ---
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // --- Route settings form submission ---
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

                // --- FIX: Re-fetch and update UI ---
                // Re-fetch the latest data from the backend to update currentApplicationPeriod
                await fetchAndStoreApplicationPeriod();
                // fetchAndStoreApplicationPeriod now handles calling:
                // - displayExistingApplicationPeriod()
                // - populateWeekDropdown()
                // --- End of FIX ---

                // Optionally clear fields or keep them disabled until period ends
                // startDateInput.value = ''; // Decide if you want to clear on success
                // endDateInput.value = '';

                // Re-enable fields
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

