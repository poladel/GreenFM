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
    const specificDateDisplay = document.getElementById('specificDateDisplay'); // Get the new display input
    const specificDateValue = document.getElementById('specificDateValue'); // Get the new hidden input
    let currentApplicationPeriod = null;
    let clickedButtonDateString = ''; // Variable to store the calculated date for the clicked button
    let formattedClickedButtonDate = ''; // Variable for display format

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
            // FIX: Pass the original ISO string directly to new Date()
            const startYear = new Date(startDate).getFullYear();
            const endYear = new Date(endDate).getFullYear();

            // Check if the period falls within the current display year
            if (startYear === currentYear || endYear === currentYear) { // Show if start OR end is in current year
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
        const currentYear = new Date().getFullYear();

        // ... (keep existing checks for currentApplicationPeriod and date validity) ...
        if (!currentApplicationPeriod || !currentApplicationPeriod.startDate || !currentApplicationPeriod.endDate) {
            weekFilterDropdown.innerHTML = '<option value="">Period Not Set</option>';
            weekFilterDropdown.disabled = true;
            return false; // Indicate no valid period for current year
        }
        const startDate = new Date(currentApplicationPeriod.startDate);
        const endDate = new Date(currentApplicationPeriod.endDate);
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();
        if (startYear !== currentYear && endYear !== currentYear) {
             weekFilterDropdown.innerHTML = `<option value="">No Period Set for ${currentYear}</option>`;
             weekFilterDropdown.disabled = true;
             return false; // Indicate no valid period for current year
        }
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
             console.error("Invalid start or end date parsed in populateWeekDropdown:", currentApplicationPeriod.startDate, currentApplicationPeriod.endDate);
             weekFilterDropdown.innerHTML = '<option value="">Invalid Period Dates</option>';
             weekFilterDropdown.disabled = true;
             return false; // Indicate invalid dates
        }


        let currentWeekStart = new Date(startDate);

        // Adjust currentWeekStart to the beginning of its week (Monday)
        const dayOfWeek = currentWeekStart.getDay(); // 0=Sun, 1=Mon, ...
        const diff = currentWeekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
        currentWeekStart.setDate(diff);
        currentWeekStart.setHours(0, 0, 0, 0); // Normalize time

        let weekIndex = 0;
        while (currentWeekStart <= endDate) {
            // --- Calculate Friday for display ---
            const weekFriday = new Date(currentWeekStart);
            weekFriday.setDate(currentWeekStart.getDate() + 4); // Monday + 4 days = Friday
            // --- End Friday calculation ---

            // Calculate the actual end of the week (Sunday) for loop condition check
            const weekEndSunday = new Date(currentWeekStart);
            weekEndSunday.setDate(currentWeekStart.getDate() + 6);

            // Ensure the week start is not after the overall period end date before adding
            if (currentWeekStart > endDate) break;

            // Only add weeks that are relevant to the current year
            // Use weekEndSunday for the relevance check to include weeks ending in the current year
            if (currentWeekStart.getFullYear() === currentYear || weekEndSunday.getFullYear() === currentYear) {
                // --- Adjust display end date if Friday goes past the period end ---
                const displayEndDate = weekFriday > endDate ? endDate : weekFriday;
                // --- End adjustment ---

                const option = document.createElement('option');
                const weekStartDateString = currentWeekStart.toISOString().split('T')[0]; // YYYY-MM-DD (Value is still Monday)
                option.value = weekStartDateString;

                const formatOptions = { month: 'short', day: 'numeric' };
                const startText = currentWeekStart.toLocaleDateString('en-US', formatOptions);
                // --- Use displayEndDate (Friday or period end) for text ---
                const endText = displayEndDate.toLocaleDateString('en-US', formatOptions);
                option.textContent = `Week of ${startText} - ${endText}`; // Display Mon - Fri (or end date)
                // --- End text change ---

                weekFilterDropdown.appendChild(option);
                weekIndex++;
            }


            currentWeekStart.setDate(currentWeekStart.getDate() + 7); // Move to next Monday
        }

        weekFilterDropdown.disabled = weekIndex === 0;
        if (weekIndex === 0) {
             weekFilterDropdown.innerHTML = `<option value="">No Weeks Available for ${currentYear}</option>`;
        }
        return weekIndex > 0; // Return true if weeks were populated
    };

    // --- Define fetchSchedules function (fetches ONLY recurring) ---
    const fetchRecurringSchedules = async (year, department) => {
        try {
            // Use the endpoint specifically for recurring schedules
            const response = await fetch(`/admin/schedules?year=${year}&department=${encodeURIComponent(department)}`);
            if (!response.ok) throw new Error('Failed to fetch recurring schedules');
            const data = await response.json();
            console.log('Fetched recurring schedules:', data); // Debugging
            return data; // Should be an array of recurring schedules
        } catch (error) {
            console.error('Error fetching recurring schedules:', error);
            return [];
        }
    };

    // --- Define displaySchedules function ---
    // --- FIX: Rewritten to handle weeklyData OR just recurringData ---
    const displaySchedules = (scheduleData, weekStartDateString = null) => {
        let recurring = [];
        let overrides = [];
        let overrideMap = new Map();
        let recurringMap = new Map();
        const isWeeklyView = weekStartDateString && scheduleData && typeof scheduleData === 'object' && 'recurring' in scheduleData;

        if (isWeeklyView) {
            console.log('Displaying weekly availability:', scheduleData);
            ({ recurring, overrides } = scheduleData); // Destructure from weeklyData
            const weekStart = new Date(weekStartDateString + 'T00:00:00'); // Parse week start in local time

            // Create lookup map for overrides: "YYYY-MM-DD_HH:MM-HH:MM" -> override object
            overrides.forEach(override => {
                const key = `${override.date}_${override.time}`;
                overrideMap.set(key, override);
            });
        } else {
            console.log('Displaying only recurring schedules:', scheduleData);
            recurring = scheduleData; // Assume scheduleData is just the recurring array
        }


        // Create a lookup map for recurring schedules: "DayName_HH:MM-HH:MM" -> schedule object
        recurring.forEach(schedule => {
            const key = `${schedule.day}_${schedule.time}`;
            recurringMap.set(key, schedule);
        });


        // Iterate through each button in the grid
        scheduleButtons.forEach(button => {
            const dayName = button.getAttribute('data-day'); // e.g., "Monday"
            const time = button.getAttribute('data-time'); // e.g., "7:00-8:00"

            let isAvailable = true;
            let buttonText = '';
            let scheduleDetails = null; // To hold either override or recurring details

            const recurringKey = `${dayName}_${time}`;
            const recurringSchedule = recurringMap.get(recurringKey);

            if (isWeeklyView) {
                // Calculate the specific date for this button within the current week
                const dayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(dayName);
                let buttonDate = new Date(weekStartDateString + 'T00:00:00'); // Use weekStartDateString
                const weekStartDayIndex = buttonDate.getDay(); // 0=Sun, 1=Mon

                let daysToAdd = dayIndex - weekStartDayIndex;
                 if (daysToAdd < 0) {
                     daysToAdd += 7;
                 }
                buttonDate.setDate(buttonDate.getDate() + daysToAdd); // Modify buttonDate

                const year = buttonDate.getFullYear();
                const month = (buttonDate.getMonth() + 1).toString().padStart(2, '0');
                const day = buttonDate.getDate().toString().padStart(2, '0');
                const buttonDateString = `${year}-${month}-${day}`; // Correct YYYY-MM-DD based on local date

                // Determine the status based on overrides first, then recurring
                const overrideKey = `${buttonDateString}_${time}`; // Key uses local date string
                const override = overrideMap.get(overrideKey); // Check map using local date string key

                if (override) {
                    // Override exists for this specific date and time
                    scheduleDetails = override;
                    if (override.status === 'available') {
                        isAvailable = true;
                        buttonText = ''; // Slot is available due to override
                        // console.log(`Override found for ${overrideKey}: AVAILABLE`); // Debugging
                    } else { // status === 'unavailable'
                        isAvailable = false;
                        buttonText = `${override.subject} (${override.roomNum})`; // Slot is booked by override
                        // console.log(`Override found for ${overrideKey}: UNAVAILABLE`); // Debugging
                    }
                } else if (recurringSchedule) {
                    // No override, but a recurring schedule exists for this day and time
                    scheduleDetails = recurringSchedule;
                    isAvailable = false;
                    buttonText = `${recurringSchedule.subject} (${recurringSchedule.roomNum})`; // Slot is booked by recurring rule
                    // console.log(`No override for ${buttonDateString}_${time}, using recurring for ${recurringKey}`); // Debugging
                } else {
                    // No override and no recurring schedule
                    isAvailable = true;
                    buttonText = ''; // Slot is available by default
                    // console.log(`No override or recurring for ${buttonDateString}_${time}`); // Debugging
                }
            } else {
                 // Not a weekly view, just check recurring
                 if (recurringSchedule) {
                    scheduleDetails = recurringSchedule;
                    isAvailable = false;
                    buttonText = `${recurringSchedule.subject} (${recurringSchedule.roomNum})`;
                 } else {
                    isAvailable = true;
                    buttonText = '';
                 }
            }


            // Update button appearance
            button.textContent = buttonText;
            // --- Always enable buttons for interaction ---
            button.disabled = false;
            // --- ---
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
        const currentYear = new Date().getFullYear().toString(); // Get current year as string

        // Always enable buttons when department changes or week changes
        scheduleButtons.forEach(button => button.disabled = false);

        if (selectedWeekStartDate && !weekFilterDropdown.disabled) {
            // A valid week is selected for the current year, fetch weekly data
            console.log(`Fetching weekly availability for week starting: ${selectedWeekStartDate}, Department: ${selectedDepartment}`);
            try {
                const response = await fetch(`/admin/weekly-schedule?weekStart=${selectedWeekStartDate}&department=${encodeURIComponent(selectedDepartment)}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch weekly availability');
                }
                const weeklyData = await response.json(); // Contains { recurring: [...], overrides: [...] }
                displaySchedules(weeklyData, selectedWeekStartDate); // Pass combined data and week start

            } catch (error) {
                console.error("Error fetching/displaying weekly schedule:", error);
                 scheduleButtons.forEach(button => {
                    button.textContent = 'Error';
                    button.classList.remove('schedulebtn');
                    button.classList.add('availablebtn');
                    // Keep buttons enabled even on error for potential recurring edits
                    // button.disabled = true;
                });
            }
        } else {
             // No valid week selected (or dropdown disabled), fetch only recurring for the current year
             console.log(`No valid week selected. Fetching recurring schedules for year: ${currentYear}, Department: ${selectedDepartment}`);
             try {
                 const recurringData = await fetchRecurringSchedules(currentYear, selectedDepartment);
                 displaySchedules(recurringData); // Pass only recurring data
             } catch (error) {
                 console.error("Error fetching/displaying recurring schedules:", error);
                 scheduleButtons.forEach(button => {
                    button.textContent = 'Error';
                    button.classList.remove('schedulebtn');
                    button.classList.add('availablebtn');
                    // Keep buttons enabled even on error
                    // button.disabled = true;
                });
             }
        }
    };

    // --- Fetch Application Period ---
    const fetchAndStoreApplicationPeriod = async () => {
        try {
            currentApplicationPeriod = await fetchApplicationPeriod('JoinGFM');
            console.log("Fetched application period:", currentApplicationPeriod);
            const populated = populateWeekDropdown(); // Populates and returns true if successful for current year
            displayExistingApplicationPeriod(); // Display the text regardless

            if (populated && weekFilterDropdown.value) {
                 // Valid period for current year exists and a week is selected, load weekly view
                 await handleWeekChange();
            } else {
                 // No valid period for current year or no week selected, load recurring view
                 await handleWeekChange(); // Will fetch recurring based on dropdown state
            }
        } catch (error) {
            console.error("Failed to fetch application period on load:", error);
            weekFilterDropdown.innerHTML = '<option value="">Error Loading Period</option>';
            weekFilterDropdown.disabled = true;
            displayExistingApplicationPeriod();
            // Attempt to load recurring view even on error
            await handleWeekChange();
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

    // --- Add Checkbox Event Listener ---
    recurringCheckbox.addEventListener('change', () => {
        const isChecked = recurringCheckbox.checked;
        const weekSelected = weekFilterDropdown.value && !weekFilterDropdown.disabled;

        if (!isChecked) {
            // Trying to uncheck (switch to specific date)
            if (!weekSelected) {
                alert("Please select a valid week from the 'View Week' dropdown to set a specific date schedule.");
                recurringCheckbox.checked = true; // Prevent unchecking
                return;
            }

            // A valid week is selected, proceed to show specific date
            if (clickedButtonDateString) { // Ensure a date was calculated when modal opened
                specificDateContainer.style.display = 'block';
                specificDateDisplay.value = formattedClickedButtonDate; // Show formatted date
                specificDateValue.value = clickedButtonDateString; // Set hidden input value
            } else {
                console.error("Cannot set specific date - clicked button date not calculated.");
                alert("Error: Could not determine the specific date for this slot. Please re-open the modal.");
                recurringCheckbox.checked = true; // Re-check the box
            }
        } else {
            // Checked - Hide specific date container and clear fields
            specificDateContainer.style.display = 'none';
            specificDateDisplay.value = '';
            specificDateValue.value = '';
        }
    });

    // --- Modal Opening Logic ---
    scheduleButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const dayName = button.getAttribute('data-day'); // e.g., "Friday"
            const time = button.getAttribute('data-time'); // e.g., "7:00-8:00"
            const selectedWeekStartDate = weekFilterDropdown.value;
            const isWeekViewActive = selectedWeekStartDate && !weekFilterDropdown.disabled;

            // --- Calculate the specific date for this button (only if in week view) ---
            clickedButtonDateString = ''; // Reset
            formattedClickedButtonDate = ''; // Reset

            if (isWeekViewActive) {
                // Only calculate specific date if a valid week is selected
                if (/^\d{4}-\d{2}-\d{2}$/.test(selectedWeekStartDate)) {
                    try {
                        const weekStart = new Date(selectedWeekStartDate + 'T00:00:00');
                        const dayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(dayName);
                        let buttonDate = new Date(weekStart);
                        const weekStartDayIndex = weekStart.getDay();
                        let daysToAdd = dayIndex - weekStartDayIndex;
                        if (daysToAdd < 0) daysToAdd += 7;
                        buttonDate.setDate(buttonDate.getDate() + daysToAdd);

                        // Store YYYY-MM-DD string
                        const year = buttonDate.getFullYear();
                        const month = (buttonDate.getMonth() + 1).toString().padStart(2, '0');
                        const day = buttonDate.getDate().toString().padStart(2, '0');
                        clickedButtonDateString = `${year}-${month}-${day}`;

                        // Store formatted string for display
                        formattedClickedButtonDate = buttonDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

                        console.log(`Calculated specific date for modal: ${clickedButtonDateString} (${formattedClickedButtonDate})`);

                    } catch (dateError) {
                        console.error("Error calculating specific date for button:", dateError);
                    }
                } else {
                     console.warn("Could not calculate specific date: Week dropdown value is invalid format.");
                }
            } else {
                 console.log("Not in week view, specific date not calculated.");
            }
            // --- End date calculation ---


            // 1. Reset Modal State
            recurringCheckbox.checked = true; // Default to recurring
            specificDateContainer.style.display = 'none'; // Hide date container initially
            specificDateDisplay.value = ''; // Clear display field
            specificDateValue.value = ''; // Clear hidden value field
            document.getElementById('scheduleForm').reset(); // Clear other form fields
            document.getElementById('day').value = dayName; // Set hidden day field
            document.getElementById('time').value = time; // Set hidden time field

            // --- FIX: Remove previously added dynamic buttons ---
            const buttonContainer = scheduleForm.querySelector('.modal-buttons');
            if (!buttonContainer) {
                console.error("Modal button container not found!");
                return; // Stop if container missing
            }
            const existingDeleteButton = buttonContainer.querySelector('.delete-button');
            if (existingDeleteButton) existingDeleteButton.remove();
            const existingMakeAvailableButton = buttonContainer.querySelector('.make-available-button');
            if (existingMakeAvailableButton) existingMakeAvailableButton.remove();
            // --- End of FIX ---

            const saveButton = scheduleForm.querySelector('button[type="submit"]');
            if (!saveButton) {
                console.error("Modal save button not found!");
                return; // Stop if save button missing
            }


            try {
                // 2. Fetch RECURRING schedule data for context (always needed)
                const currentYear = new Date().getFullYear();
                const currentDepartment = departmentFilter.value;
                const response = await fetch(`/admin/schedule?day=${encodeURIComponent(dayName)}&time=${encodeURIComponent(time)}&year=${currentYear}&department=${encodeURIComponent(currentDepartment)}`);
                if (!response.ok && response.status !== 404) throw new Error('Failed to fetch schedule data');
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
                        handleFormSubmit(schedule._id); // Pass ID for editing recurring
                    };

                    // Add Delete button for the RECURRING schedule
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Delete Recurring';
                    deleteButton.classList.add('delete-button'); // Ensure class is present
                    deleteButton.type = 'button';
                    deleteButton.onclick = async () => {
                        if (confirm('Are you sure you want to delete this recurring weekly schedule?')) {
                            await deleteSchedule(schedule._id); // Uses recurring endpoint
                            modal.style.display = 'none';
                            // Refresh view (will fetch recurring or weekly based on state)
                            await handleWeekChange();
                        }
                    };
                    buttonContainer.appendChild(deleteButton); // Append AFTER potential removal

                    // Add "Make Available This Week" button ONLY if in week view
                    if (isWeekViewActive && clickedButtonDateString) {
                        const makeAvailableButton = document.createElement('button');
                        makeAvailableButton.textContent = 'Make Available This Week';
                        makeAvailableButton.classList.add('make-available-button'); // Ensure class is present
                        makeAvailableButton.type = 'button';
                        makeAvailableButton.onclick = async () => {
                            // --- DEBUGGING START ---
                            console.log("--- Make Available Click ---");
                            console.log("Selected Week Dropdown Value:", selectedWeekStartDate);
                            console.log("Calculated Target Date:", clickedButtonDateString); // Use the date calculated for the modal
                            console.log("Recurring Schedule Day:", schedule.day);
                            console.log("Recurring Schedule Time:", schedule.time);
                            console.log("Admin User:", user);
                            // --- DEBUGGING END ---

                            if (confirm(`Are you sure you want to make the recurring slot (${schedule.day} ${schedule.time}) available specifically on ${formattedClickedButtonDate}? This creates an override.`)) {
                                // Pass the specific date calculated when opening the modal
                                await makeRecurringAvailableForDate(schedule, clickedButtonDateString, user); // Use specific date
                                modal.style.display = 'none';
                                await handleWeekChange(); // Refresh the view
                            }
                        };
                        buttonContainer.appendChild(makeAvailableButton); // Append AFTER potential removal
                    }


                } else { // No existing RECURRING schedule for this slot
                    saveButton.textContent = 'Save'; // Default to Save (could be recurring or specific)
                     saveButton.onclick = (e) => {
                        e.preventDefault();
                        handleFormSubmit(null); // Pass null ID for saving new
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

    // --- MODIFIED: Renamed and uses specific date ---
    const makeRecurringAvailableForDate = async (recurringSchedule, targetDateString, adminUser) => {
        try {
            // 1. Prepare data for the backend
            const overrideData = {
                recurringDay: recurringSchedule.day, // Still useful context for backend
                time: recurringSchedule.time,
                department: recurringSchedule.department,
                year: recurringSchedule.year,
                targetDate: targetDateString, // The specific date to make available
                // Pass admin details
                lastName: adminUser.lastName,
                firstName: adminUser.firstName,
                middleInitial: adminUser.middleInitial,
                suffix: adminUser.suffix
            };

            console.log('Sending availability override data:', overrideData);


            // 2. Call the backend endpoint to create an 'available' override
            const response = await fetch('/admin/schedule-override/make-available', { // Endpoint remains the same
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(overrideData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to make slot available.');
            }

            const result = await response.json();
            alert(result.message || `Slot successfully marked as available for ${targetDateString}.`);

        } catch (error) {
            console.error('Error in makeRecurringAvailableForDate:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // --- Define Form Handlers ---
    const saveNewSchedule = async (modal, formData) => { // Handles NEW RECURRING
        // formData already validated in handleFormSubmit
        try {
            const response = await fetch('/admin/schedule', { // Endpoint for RECURRING
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (!response.ok) {
                 const errorData = await response.json(); // Try to get error message
                 throw new Error(errorData.error || 'Failed to save recurring schedule');
            }
            alert('Recurring schedule saved successfully!');
            modal.style.display = 'none';
            // Refresh view
            await handleWeekChange();
        } catch (error) {
            console.error('Error saving recurring schedule:', error);
            alert(`Error: ${error.message}`);
        }
    };

    const editSchedule = async (id, modal, formData) => { // Handles EDIT RECURRING
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
            if (!response.ok) {
                 const errorData = await response.json(); // Try to get error message
                 throw new Error(errorData.error || 'Failed to update recurring schedule');
            }
            alert('Recurring schedule updated successfully!');
            modal.style.display = 'none';
            // Refresh view
            await handleWeekChange();
        } catch (error) {
            console.error('Error updating recurring schedule:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // deleteSchedule remains largely the same for recurring, using the ID
    const deleteSchedule = async (id) => { // Handles DELETE RECURRING
        try {
            const response = await fetch(`/admin/schedule/${id}`, { // Endpoint for RECURRING
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json(); // Try to get error message
                throw new Error(errorData.error || 'Failed to delete recurring schedule');
            }

            alert('Recurring schedule deleted successfully!');

            // Refresh view after deletion
            await handleWeekChange();

        } catch (error) {
            console.error('Error deleting recurring schedule:', error);
            alert(`Error: ${error.message}`);
        }
    };


    // --- NEW Function for Saving/Updating Overrides ---
    const saveOrUpdateOverride = async (overrideData, modal) => { // Handles SPECIFIC DATE save/update
        try {
            const response = await fetch('/admin/schedule-override', { // Endpoint for OVERRIDES
                method: 'POST', // Uses upsert logic on backend
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(overrideData),
            });

            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.error || 'Failed to save schedule override');
            }

            alert(`Schedule override for ${overrideData.date} at ${overrideData.time} saved successfully!`);
            modal.style.display = 'none';

            // Refresh view using handleWeekChange
            await handleWeekChange();

        } catch (error) {
            console.error('Error saving schedule override:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // --- Centralized Form Submit Handler ---
    const handleFormSubmit = async (scheduleId) => { // scheduleId is only relevant for EDITING recurring
        const isRecurring = recurringCheckbox.checked;
        const originalDay = document.getElementById('day').value; // Day name from button
        const originalTime = document.getElementById('time').value; // Time from button
        const specificDate = document.getElementById('specificDateValue').value; // Specific date (if !isRecurring)
        const currentDepartment = departmentFilter.value;
        const currentYear = new Date().getFullYear(); // Year for recurring

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
                year: currentYear.toString(), // Ensure year is string
            };

            if (scheduleId) { // Editing existing recurring
                await editSchedule(scheduleId, modal, recurringData);
            } else { // Saving new recurring
                await saveNewSchedule(modal, recurringData);
            }
        } else {
            // --- Handle SPECIFIC DATE Override (Create/Update) ---
            if (!specificDate) {
                alert('Could not determine the specific date for this slot. Please ensure a week is selected and re-open the modal.');
                return;
            }
            const overrideData = {
                ...commonFormData,
                date: specificDate, // Use the calculated specific date
                time: originalTime, // Use the time slot originally clicked
                year: new Date(specificDate).getFullYear().toString(), // Year from the specific date
                status: 'unavailable' // Saving an override via this form marks it as booked
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

    // --- SUBMISSIONS TAB ---
    
});

