document.addEventListener('DOMContentLoaded', async () => {
    // --- Element References ---
    const scheduleGrid = document.getElementById('scheduleGrid');
    const scheduleButtons = scheduleGrid ? Array.from(scheduleGrid.querySelectorAll('.schedule-button')) : [];
    const weekFilterDropdown = document.getElementById('weekFilter'); // Ensure this ID matches your EJS
    const departmentFilter = document.getElementById('departmentFilter'); // Ensure this ID matches your EJS
    const modal = document.getElementById('scheduleModal');
    const closeModalButton = modal?.querySelector('.close'); // Use optional chaining
    const applicationDetailsView = document.getElementById('applicationDetailsView');
    // const scheduleFormView = document.getElementById('scheduleFormView'); // Remove if form view is gone

    // Keep existing display elements for periods if they exist in your EJS
    const existingApplicationPeriodElement = document.getElementById('existingApplicationPeriod');
    const existingAssessmentPeriodElement = document.getElementById('existingAssessmentPeriod');

    // --- State Variables ---
    let currentApplicationPeriod = null;
    let currentAssessmentPeriod = null;
    let currentYear = new Date().getFullYear();

    // --- Helper Functions ---

    // Helper to parse YYYY-MM-DD to local midnight Date object
    const parseDateStringToLocalMidnight = (dateStr) => {
        if (!dateStr) return new Date(NaN);
        const parts = dateStr.split('-');
        if (parts.length !== 3) return new Date(NaN);
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const day = parseInt(parts[2], 10);
        if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date(NaN);
        return new Date(year, month, day);
    };

    // --- Period Fetching and Display ---

    // Fetch Application Period (Keep if needed for display or validation)
    const fetchApplicationPeriod = async (key = 'JoinGFM', year = null) => {
        try {
            let url = `/admin/application-period?key=${key}`;
            if (year) url += `&year=${year}`;
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error(`Failed to fetch application period: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching application period:', error);
            return null;
        }
    };

    // Fetch Assessment Period (Crucial for week dropdown)
    const fetchAssessmentPeriod = async (year = null) => {
        try {
            let url = `/admin/assessment-period`; // Base URL
            if (year) {
                // --- FIX: Use '?' to start query string ---
                url += `?year=${year}`;
                // --- END FIX ---
            }
            console.log("Fetching assessment period from URL:", url); // Add log to verify
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`Assessment period not found for year ${year}`);
                    return null; // Not found is okay, handle it later
                }
                // Log error details for other statuses
                const errorText = await response.text();
                console.error(`Failed to fetch assessment period (${response.status}): ${errorText}`);
                throw new Error(`Failed to fetch assessment period: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching assessment period:', error);
            return null;
        }
    };

    // Display Existing Application Period (Keep if element exists)
    const displayExistingApplicationPeriod = () => {
        if (!existingApplicationPeriodElement) return;
        if (currentApplicationPeriod) {
            const start = currentApplicationPeriod.startDate ? new Date(currentApplicationPeriod.startDate).toLocaleDateString() : 'N/A';
            const end = currentApplicationPeriod.endDate ? new Date(currentApplicationPeriod.endDate).toLocaleDateString() : 'N/A';
            existingApplicationPeriodElement.textContent = `Current Application Period (${currentApplicationPeriod.year}): ${start} - ${end}`;
        } else {
            existingApplicationPeriodElement.textContent = `No application period set for ${currentYear}.`;
        }
    };

    // Display Existing Assessment Period (Keep if element exists)
    const displayExistingAssessmentPeriod = () => {
        if (!existingAssessmentPeriodElement) return;
        if (currentAssessmentPeriod) {
            const start = currentAssessmentPeriod.startDate ? new Date(currentAssessmentPeriod.startDate).toLocaleDateString() : 'N/A';
            const end = currentAssessmentPeriod.endDate ? new Date(currentAssessmentPeriod.endDate).toLocaleDateString() : 'N/A';
            existingAssessmentPeriodElement.textContent = `Current Assessment Period (${currentAssessmentPeriod.year}): ${start} - ${end}`;
        } else {
            existingAssessmentPeriodElement.textContent = `No assessment period set for ${currentYear}.`;
        }
    };

    // Populate Week Dropdown based on Assessment Period
    const populateWeekDropdown = () => {
        if (!weekFilterDropdown) { // <--- weekFilterDropdown is null here
             console.error("Week filter dropdown not found."); // <--- This log appears
             return false; // <--- Function stops here
        }
        weekFilterDropdown.innerHTML = '<option value="" disabled selected>Select Week</option>'; // Reset
        weekFilterDropdown.disabled = true; // Disable initially

        if (!currentAssessmentPeriod || !currentAssessmentPeriod.startDate || !currentAssessmentPeriod.endDate) {
            weekFilterDropdown.innerHTML = '<option value="" disabled selected>Set Assessment Period</option>';
            return false; // Indicate population failed
        }

        const startDate = parseDateStringToLocalMidnight(currentAssessmentPeriod.startDate);
        const endDate = parseDateStringToLocalMidnight(currentAssessmentPeriod.endDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.error("Invalid assessment period dates.");
            weekFilterDropdown.innerHTML = '<option value="" disabled selected>Invalid Period Dates</option>';
            return false;
        }

        let currentWeekStart = new Date(startDate);
        // Adjust currentWeekStart to the beginning of its week (e.g., Sunday)
        currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Assumes week starts Sunday

        let weekCount = 0;
        while (currentWeekStart <= endDate) {
            // ... (code to create and add option) ...
            const weekEnd = new Date(currentWeekStart);
            weekEnd.setDate(weekEnd.getDate() + 6); // Saturday

            // Format the value as YYYY-MM-DD for the start of the week (Sunday)
            const startYear = currentWeekStart.getFullYear();
            const startMonth = (currentWeekStart.getMonth() + 1).toString().padStart(2, '0');
            const startDay = currentWeekStart.getDate().toString().padStart(2, '0');
            const weekStartDateString = `${startYear}-${startMonth}-${startDay}`;

            // Format the display text (e.g., "Apr 27 - May 03")
            const optionText = `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            const option = new Option(optionText, weekStartDateString);
            weekFilterDropdown.add(option);
            weekCount++;

            // Move to the next week's start
            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        }

        if (weekCount > 0) {
            weekFilterDropdown.disabled = false; // Enable if weeks were added
            // --- NEW: Select the first week automatically ---
            weekFilterDropdown.selectedIndex = 1; // Select the first actual week option
            // --- END NEW ---
            return true; // Indicate population succeeded
        } else {
             weekFilterDropdown.innerHTML = '<option value="" disabled selected>No Weeks in Period</option>';
             return false;
        }
    };


    // --- Schedule Display and Interaction ---

    // Fetch and display slots for the selected week/department
    const handleWeekChange = async () => {
        const selectedWeekStartDate = weekFilterDropdown.value;
        const currentDepartment = departmentFilter.value;
        // Ensure currentYear is correctly set (e.g., from assessment period or default)
        const yearToFetch = currentAssessmentPeriod ? currentAssessmentPeriod.year.toString() : new Date().getFullYear().toString();

        if (!selectedWeekStartDate || !currentDepartment) {
            console.log("Week or department not selected.");
            displaySchedules([]); // Clear grid
            return;
        }

        console.log(`Fetching available assessment slots for week starting: ${selectedWeekStartDate}, Department: ${currentDepartment}, Year: ${yearToFetch}`);
        try {
            // Fetch slots marked as available (including booked ones with populated data)
            const response = await fetch(`/admin/assessment-slots/for-week?weekStart=${selectedWeekStartDate}&department=${encodeURIComponent(currentDepartment)}&year=${yearToFetch}`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`No assessment slots found marked available for week ${selectedWeekStartDate}, Dept: ${currentDepartment}`);
                    // Still call displaySchedules to render the grid correctly for the week, just with no slots marked/booked
                    displaySchedules([], selectedWeekStartDate);
                    return;
                }
                 // Log error response for debugging other issues
                 const errorText = await response.text();
                 console.error("Error response text:", errorText);
                throw new Error(`Failed to fetch available assessment slots for week (Status: ${response.status})`);
            }
            const slotsForWeek = await response.json(); // Array of AssessmentSlot documents (some with populated 'application')
            console.log(`Fetched ${slotsForWeek.length} slots for the week.`);

            // Pass the fetched slots to displaySchedules
            displaySchedules(slotsForWeek, selectedWeekStartDate);

        } catch (error) {
            console.error('Error fetching/displaying available assessment slots for week:', error);
            alert(`Error loading schedule view: ${error.message}`);
            displaySchedules([]); // Display empty grid on error
        }
    };

    // Update the grid based on fetched slots
    const displaySchedules = (slotsForWeek = [], weekStartDateString = null) => {
        const slotMap = new Map();
        slotsForWeek.forEach(slot => {
            const key = `${slot.date}_${slot.time}`;
            slotMap.set(key, slot);
        });

        // --- DEBUG: Log the created map ---
        console.log("Slot Map for week:", weekStartDateString, slotMap);
        // --- END DEBUG ---

        const isWeeklyView = weekStartDateString;

        // --- DEBUG: Log if it's considered a weekly view ---
        console.log("Is Weekly View:", isWeeklyView);
        // --- END DEBUG ---


        scheduleButtons.forEach(button => {
            const dayName = button.getAttribute('data-day');
            const time = button.getAttribute('data-time'); // Get button's time

            // --- DEBUG: Log button attributes ---
            console.log(`Processing Button: Day=${dayName}, Time=${time}`);
            // --- END DEBUG ---


            button.textContent = '';
            button.disabled = false; // Reset disabled state
            button.className = 'schedule-button availablebtn';
            button.dataset.applicationDetails = '';

            if (isWeeklyView) {
                let buttonDateString = '';
                try {
                    // ... (date calculation logic - keep as is) ...
                    const dayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(dayName);
                    if (dayIndex === -1) throw new Error(`Invalid day name: ${dayName}`);
                    let buttonDate = parseDateStringToLocalMidnight(weekStartDateString);
                    if (isNaN(buttonDate.getTime())) throw new Error(`Invalid week start date: ${weekStartDateString}`);
                    const weekStartDayIndex = buttonDate.getDay();
                    let daysToAdd = dayIndex - weekStartDayIndex;
                    buttonDate.setDate(buttonDate.getDate() + daysToAdd);
                    const year = buttonDate.getFullYear();
                    const month = (buttonDate.getMonth() + 1).toString().padStart(2, '0');
                    const day = buttonDate.getDate().toString().padStart(2, '0');
                    buttonDateString = `${year}-${month}-${day}`;

                    // --- DEBUG: Log calculated button date ---
                    console.log(`   Calculated Date: ${buttonDateString}`);
                    // --- END DEBUG ---


                } catch (e) {
                    console.error("Error calculating date for button in displaySchedules", e);
                    button.disabled = true; // Disable on error
                    button.className = 'schedule-button';
                    return;
                }

                const slotKey = `${buttonDateString}_${time}`; // Construct lookup key

                // --- DEBUG: Log the key being looked up ---
                console.log(`   Looking up key: ${slotKey}`);
                // --- END DEBUG ---

                const slotData = slotMap.get(slotKey);

                if (slotData) {
                    // --- DEBUG: Log if a slot was found ---
                    console.log(`      MATCH FOUND for key: ${slotKey}`, slotData);
                    // --- END DEBUG ---

                    if (slotData.application) {
                        // ... (booked logic - keep as is) ...
                        button.classList.remove('availablebtn', 'marked-available');
                        button.classList.add('bookedbtn');
                        // ... set textContent, dataset ...
                    } else {
                        // ... (marked-available logic - keep as is) ...
                         button.classList.remove('availablebtn');
                         button.classList.add('marked-available');
                         // --- DEBUG: Log class change ---
                         console.log(`      Marked as available. New classes: ${button.className}`);
                         // --- END DEBUG ---
                    }
                } else {
                     // --- DEBUG: Log if no slot was found ---
                     console.log(`      No match for key: ${slotKey}`);
                     // --- END DEBUG ---
                    // Button remains 'availablebtn'
                }
            } else {
                // Not in weekly view
                 button.className = 'schedule-button availablebtn';
                 button.disabled = true; // Disable if not in weekly view
            }

            // --- DEBUG: Log final button state ---
            console.log(`   Final state for ${dayName} ${time}: Disabled=${button.disabled}, Classes=${button.className}`);
            // --- END DEBUG ---

        });
    }; // End displaySchedules

    // Function to mark a slot as available via API call
    const makeSlotAvailableForAssessment = async (date, time, department, year) => {
        console.log(`Attempting to mark available: ${date}, ${time}, ${department}, ${year}`);
        try {
            const response = await fetch('/admin/assessment-slots', { // POST to the admin endpoint
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, time, department, year }),
            });

            const result = await response.json();

            if (!response.ok) {
                // Throw error including message from backend
                throw new Error(result.message || `Failed to save slot (Status: ${response.status})`);
            }

            alert(result.message || 'Slot marked as available successfully!');

            // Refresh the schedule view to show the change immediately
            await handleWeekChange();

        } catch (error) {
            console.error('Error marking slot available:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // --- Event Listeners ---

    // Listen for changes on the week and department filters
    if (weekFilterDropdown) {
        weekFilterDropdown.addEventListener('change', handleWeekChange);
    } else {
        console.error("Week filter dropdown element not found.");
    }
    if (departmentFilter) {
        departmentFilter.addEventListener('change', handleWeekChange);
    } else {
        console.error("Department filter element not found.");
    }


    // Add click listeners to schedule buttons
    scheduleButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const isBookedButton = button.classList.contains('bookedbtn');

            if (isBookedButton) {
                // --- Handle Booked Button Click (Show Applicant Modal) ---
                console.log("Booked slot clicked.");
                const appDataString = button.dataset.applicationDetails;
                if (appDataString && applicationDetailsView && modal) {
                    try {
                        const appDetails = JSON.parse(appDataString);
                        console.log("Populating modal with:", appDetails);

                        // Populate modal fields
                        applicationDetailsView.querySelector('#appName').value = appDetails.name;
                        applicationDetailsView.querySelector('#appSection').value = appDetails.section;
                        applicationDetailsView.querySelector('#appEmail').value = appDetails.dlsudEmail;
                        applicationDetailsView.querySelector('#appStudentNum').value = appDetails.studentNumber;
                        applicationDetailsView.querySelector('#appDepartment').value = appDetails.preferredDepartment;
                        const scheduleField = applicationDetailsView.querySelector('#appPreferredSchedule');
                        if (scheduleField) scheduleField.value = appDetails.preferredSchedule;

                        // Show the applicant details view and the modal
                        applicationDetailsView.style.display = 'block';
                        // if (scheduleFormView) scheduleFormView.style.display = 'none'; // Hide other view if present
                        modal.style.display = 'block';

                    } catch (e) {
                        console.error("Error parsing/displaying application details:", e);
                        alert("Could not display applicant details.");
                    }
                } else {
                    console.error("Could not retrieve application details from button dataset or modal elements not found.");
                    // Optionally provide more specific feedback if elements are missing
                    if (!applicationDetailsView) console.error("applicationDetailsView element not found");
                    if (!modal) console.error("scheduleModal element not found");
                    alert("Could not retrieve applicant details.");
                }
            } else {
                // --- Handle Available/Marked Available Button Click (Mark as Available) ---
                const dayName = button.getAttribute('data-day');
                const time = button.getAttribute('data-time');
                const selectedWeekStartDate = weekFilterDropdown.value;
                const isWeekViewActive = selectedWeekStartDate && !weekFilterDropdown.disabled;
                const currentDepartment = departmentFilter.value;

                if (!isWeekViewActive) {
                    alert("Please select a specific week from the 'View Week' dropdown to mark a slot as available.");
                    return;
                }
                if (!currentDepartment) {
                    alert("Please select a department.");
                    return;
                }

                // Calculate the specific date for the clicked button
                let clickedButtonDateString = '';
                let formattedClickedButtonDate = '';
                let clickedButtonYear = '';
                try {
                    const dayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(dayName);
                    if (dayIndex === -1) throw new Error(`Invalid day name: ${dayName}`);

                    let buttonDate = parseDateStringToLocalMidnight(selectedWeekStartDate);
                    if (isNaN(buttonDate.getTime())) throw new Error(`Invalid week start date: ${selectedWeekStartDate}`);

                    const weekStartDayIndex = buttonDate.getDay();
                    let daysToAdd = dayIndex - weekStartDayIndex;
                    // No adjustment needed if week starts Sunday

                    buttonDate.setDate(buttonDate.getDate() + daysToAdd);

                    clickedButtonYear = buttonDate.getFullYear().toString();
                    const month = (buttonDate.getMonth() + 1).toString().padStart(2, '0');
                    const day = buttonDate.getDate().toString().padStart(2, '0');
                    clickedButtonDateString = `${clickedButtonYear}-${month}-${day}`;

                    formattedClickedButtonDate = buttonDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

                } catch (dateError) {
                    console.error("Error calculating specific date for button click:", dateError);
                    alert("Error determining the date for this slot.");
                    return; // Stop if date calculation fails
                }

                // Confirmation Alert
                const confirmation = confirm(`Make ${formattedClickedButtonDate} (${time}) available for assessment in the ${currentDepartment} department?`);

                if (confirmation) {
                    // Call function to save to DB
                    await makeSlotAvailableForAssessment(clickedButtonDateString, time, currentDepartment, clickedButtonYear);
                } else {
                    console.log("Operation cancelled by admin.");
                }
            }
        }); // End button click listener
    }); // End scheduleButtons.forEach

    // --- Modal Close Logic ---
    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
            if (applicationDetailsView) applicationDetailsView.style.display = 'none';
            // if (scheduleFormView) scheduleFormView.style.display = 'none'; // Hide if exists
        });
    } else {
        console.warn("Modal close button not found.");
    }
    // Close modal if clicking outside the content
    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            if (modal) modal.style.display = 'none';
            if (applicationDetailsView) applicationDetailsView.style.display = 'none';
            // if (scheduleFormView) scheduleFormView.style.display = 'none'; // Hide if exists
        }
    });

    // --- Initial Setup Function ---
    const fetchAndStorePeriods = async () => {
        currentYear = new Date().getFullYear(); // Ensure current year is up-to-date
        try {
            // Fetch periods specifically for the CURRENT year
            currentApplicationPeriod = await fetchApplicationPeriod('JoinGFM', currentYear);
            currentAssessmentPeriod = await fetchAssessmentPeriod(currentYear);

            console.log(`Fetched application period for ${currentYear}:`, currentApplicationPeriod);
            console.log(`Fetched assessment period for ${currentYear}:`, currentAssessmentPeriod);

            // Populate dropdown based on Assessment Period for the current year
            const populated = populateWeekDropdown(); // This now selects the first week if available

            // Display existing periods (if elements exist)
            displayExistingApplicationPeriod();
            displayExistingAssessmentPeriod();

            // If dropdown was populated (and first week selected) AND a department is selected, trigger initial load
            // Otherwise, ensure the grid is cleared/disabled
            if (populated && departmentFilter.value) { // Check departmentFilter.value here
                console.log("Initial load: Populated and department selected. Calling handleWeekChange."); // Add log
                await handleWeekChange(); // This will use the automatically selected first week
            } else {
                 console.log("Initial load: Not populated or department not selected. Clearing grid."); // Add log
                 displaySchedules([]); // Ensure grid is cleared/disabled initially
            }

        } catch (error) {
            console.error("Error during initial period fetching:", error);
            if (weekFilterDropdown) {
                weekFilterDropdown.innerHTML = '<option value="" disabled selected>Error loading periods</option>';
                weekFilterDropdown.disabled = true;
            }
             displaySchedules([]); // Clear grid on error
        }
    };

    // --- Initial Load ---
    fetchAndStorePeriods(); // Fetch periods and potentially trigger initial schedule load

}); // End DOMContentLoaded