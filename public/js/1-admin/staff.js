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
        if (!weekFilterDropdown) {
             console.error("Week filter dropdown not found.");
             return false;
        }
        weekFilterDropdown.innerHTML = '<option value="" disabled selected>Select Week</option>'; // Reset
        weekFilterDropdown.disabled = true; // Disable initially

        if (!currentAssessmentPeriod || !currentAssessmentPeriod.startDate || !currentAssessmentPeriod.endDate) {
            weekFilterDropdown.innerHTML = '<option value="" disabled selected>Set Assessment Period</option>';
            return false;
        }

        const startDate = parseDateStringToLocalMidnight(currentAssessmentPeriod.startDate);
        const endDate = parseDateStringToLocalMidnight(currentAssessmentPeriod.endDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.error("Invalid assessment period dates.");
            weekFilterDropdown.innerHTML = '<option value="" disabled selected>Invalid Period Dates</option>';
            return false;
        }

        let currentWeekStart = new Date(startDate);
        // Adjust currentWeekStart to the beginning of its week (Sunday)
        currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());

        let weekCount = 0;
        while (currentWeekStart <= endDate) {
            // --- Calculate Monday and Friday for display ---
            const monday = new Date(currentWeekStart);
            monday.setDate(monday.getDate() + 1); // Monday is Sunday + 1 day

            const friday = new Date(currentWeekStart);
            friday.setDate(friday.getDate() + 5); // Friday is Sunday + 5 days
            // ---

            // Format the value as YYYY-MM-DD for the start of the week (Sunday)
            const startYear = currentWeekStart.getFullYear();
            const startMonth = (currentWeekStart.getMonth() + 1).toString().padStart(2, '0');
            const startDay = currentWeekStart.getDate().toString().padStart(2, '0');
            const weekStartDateString = `${startYear}-${startMonth}-${startDay}`; // Value remains Sunday start

            // --- Format the display text using Monday - Friday ---
            // Ensure the displayed dates are within the actual assessment period
            const displayStart = monday < startDate ? startDate : monday;
            const displayEnd = friday > endDate ? endDate : friday;

            // Only add the week if Monday is before or the same day as Friday AND Monday is within the period end date
            if (displayStart <= displayEnd && displayStart <= endDate) {
                const optionText = `${displayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${displayEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                const option = new Option(optionText, weekStartDateString);
                weekFilterDropdown.add(option);
                weekCount++;
            }
            // ---

            // Move to the next week's start (Sunday)
            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        }

        if (weekCount > 0) {
            weekFilterDropdown.disabled = false; // Enable if weeks were added
            weekFilterDropdown.selectedIndex = 1; // Select the first actual week option
            return true; // Indicate population succeeded
        } else {
             weekFilterDropdown.innerHTML = '<option value="" disabled selected>No Weekdays in Period</option>'; // Update message slightly
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

        const isWeeklyView = weekStartDateString;
        console.log("Is Weekly View:", isWeeklyView);


        scheduleButtons.forEach(button => {
            const dayName = button.getAttribute('data-day');
            const time = button.getAttribute('data-time');

            // --- Reset button state ---
            button.textContent = ''; // Clear previous text
            button.disabled = false;
            button.className = 'schedule-button availablebtn'; // Default to available
            button.dataset.applicationDetails = ''; // Clear previous data

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
                } catch (e) {
                    console.error("Error calculating date for button in displaySchedules", e);
                    button.disabled = true;
                    button.className = 'schedule-button';
                    return;
                }

                const slotKey = `${buttonDateString}_${time}`;
                const slotData = slotMap.get(slotKey);

                if (slotData) {
                    // --- DEBUG: Log the found slotData and its application field ---
                    console.log(`      MATCH FOUND for key: ${slotKey}`);
                    console.log(`      slotData.application:`, slotData.application); // Log the value
                    console.log(`      typeof slotData.application:`, typeof slotData.application); // Log the type
                    // --- END DEBUG ---

                    // Check if the slot is BOOKED (has populated application data)
                    if (slotData.application && typeof slotData.application === 'object') {
                        // This block executes for Paula's preferred slot IF populated
                        console.log(`      >>> Condition TRUE: Treating as BOOKED.`); // Add confirmation log
                        button.classList.remove('availablebtn', 'marked-available');
                        button.classList.add('bookedbtn');

                        // Construct name from the populated application object
                        const applicantName = `${slotData.application.lastName}, ${slotData.application.firstName}${slotData.application.middleInitial ? ' ' + slotData.application.middleInitial + '.' : ''}${slotData.application.suffix ? ' ' + slotData.application.suffix : ''}`;
                        const applicantSection = slotData.application.section;

                        button.textContent = `${applicantName}\n${applicantSection}`;
                        button.style.whiteSpace = 'pre-line';
                        button.style.fontSize = '0.7em';
                        button.style.lineHeight = '1.2';

                        // Store details for the modal (ensure all needed fields are in slotData.application)
                        const detailsForModal = {
                            lastName: slotData.application.lastName,
                            firstName: slotData.application.firstName,
                            middleInitial: slotData.application.middleInitial,
                            suffix: slotData.application.suffix,
                            section: slotData.application.section,
                            dlsudEmail: slotData.application.dlsudEmail,
                            studentNumber: slotData.application.studentNumber,
                            preferredDepartment: slotData.application.preferredDepartment,
                            preferredSchedule: `${slotData.application.preferredSchedule?.date} (${slotData.application.preferredSchedule?.time})`
                         };
                        button.dataset.applicationDetails = JSON.stringify(detailsForModal);

                    } else {
                        // Slot is marked available by admin OR population failed
                        console.log(`      >>> Condition FALSE: Treating as MARKED AVAILABLE.`); // Add confirmation log
                        button.classList.remove('availablebtn');
                        button.classList.add('marked-available');
                        button.textContent = 'Available';
                        button.dataset.slotId = slotData._id; // Keep slotId for deletion
                    }
                } else {
                    // Slot is implicitly available (not in DB)
                    // console.log(`      No match for key: ${slotKey}`); // Optional: uncomment if needed
                    delete button.dataset.slotId;
                }
            } else {
                // Not in weekly view
                button.className = 'schedule-button';
                button.disabled = true;
            }
        }); // End scheduleButtons.forEach
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

    // Function to delete an available slot via API call
    const deleteAvailableSlot = async (slotId) => {
        console.log(`Attempting to delete available slot: ${slotId}`);
        try {
            // --- NEW: Send DELETE request to backend ---
            const response = await fetch(`/admin/assessment-slots/${slotId}`, {
                method: 'DELETE',
                headers: {
                    // Add authentication headers if needed (e.g., JWT token)
                    'Content-Type': 'application/json' // Optional for DELETE, but good practice
                },
            });
            // --- END NEW ---

            const result = await response.json(); // Expect JSON response { message: "..." }

            if (!response.ok) {
                // Throw error including message from backend
                throw new Error(result.message || `Failed to delete slot (Status: ${response.status})`);
            }

            alert(result.message || 'Slot deleted successfully!');

            // Refresh the schedule view to show the change immediately
            await handleWeekChange();

        } catch (error) {
            console.error('Error deleting available slot:', error);
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
        // --- ENSURE 'async' IS PRESENT HERE ---
        button.addEventListener('click', async () => {
            const isBookedButton = button.classList.contains('bookedbtn');
            const isMarkedAvailableButton = button.classList.contains('marked-available');
            const isAvailableButton = button.classList.contains('availablebtn');

            if (isBookedButton) {
                // --- Handle Booked Button Click (Show Applicant Modal) ---
                console.log("Booked slot clicked.");
                const appDataString = button.dataset.applicationDetails;
                if (appDataString && applicationDetailsView && modal) {
                    try {
                        const appDetails = JSON.parse(appDataString);
                        console.log("Populating modal with:", appDetails);

                        // --- Populate modal fields with required details ---
                        const fullName = `${appDetails.lastName}, ${appDetails.firstName}${appDetails.middleInitial ? ' ' + appDetails.middleInitial + '.' : ''}${appDetails.suffix ? ' ' + appDetails.suffix : ''}`;

                        applicationDetailsView.querySelector('#appName').value = fullName; // Use constructed full name
                        applicationDetailsView.querySelector('#appSection').value = appDetails.section;
                        applicationDetailsView.querySelector('#appEmail').value = appDetails.dlsudEmail;
                        applicationDetailsView.querySelector('#appStudentNum').value = appDetails.studentNumber;
                        applicationDetailsView.querySelector('#appDepartment').value = appDetails.preferredDepartment;
                        applicationDetailsView.querySelector('#appPreferredSchedule').value = appDetails.preferredSchedule; // Use combined schedule string
                        // ---

                        // Show the applicant details view and the modal
                        applicationDetailsView.style.display = 'block';
                        modal.style.display = 'block';

                    } catch (e) {
                        console.error("Error parsing/displaying application details:", e);
                        alert("Could not display applicant details.");
                    }
                } else {
                    console.error("Could not retrieve application details from button dataset or modal elements not found.");
                    if (!applicationDetailsView) console.error("applicationDetailsView element not found");
                    if (!modal) console.error("scheduleModal element not found");
                    alert("Could not retrieve applicant details.");
                }
            } else if (isMarkedAvailableButton) {
                // --- Handle Marked Available Button Click (Confirm Unmarking) ---
                const dayName = button.getAttribute('data-day');
                const time = button.getAttribute('data-time');
                const selectedWeekStartDate = weekFilterDropdown.value;
                const isWeekViewActive = selectedWeekStartDate && !weekFilterDropdown.disabled;
                const currentDepartment = departmentFilter.value;
                const slotId = button.dataset.slotId; // Get slot ID

                if (!isWeekViewActive || !slotId) { // Check slotId too
                    alert("Please select a specific week and ensure the slot ID is available.");
                    return;
                }
                if (!currentDepartment) {
                    alert("Please select a department.");
                    return;
                }

                // Calculate the specific date for the clicked button
                let buttonDate; // Keep Date object for comparison
                let clickedButtonDateString = '';
                let formattedClickedButtonDate = '';
                let clickedButtonYear = '';
                try {
                    // ... (date calculation logic - keep as is) ...
                    const dayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(dayName);
                    if (dayIndex === -1) throw new Error(`Invalid day name: ${dayName}`);
                    buttonDate = parseDateStringToLocalMidnight(selectedWeekStartDate); // Assign to buttonDate
                    if (isNaN(buttonDate.getTime())) throw new Error(`Invalid week start date: ${selectedWeekStartDate}`);
                    const weekStartDayIndex = buttonDate.getDay();
                    let daysToAdd = dayIndex - weekStartDayIndex;
                    buttonDate.setDate(buttonDate.getDate() + daysToAdd);
                    clickedButtonYear = buttonDate.getFullYear().toString();
                    const month = (buttonDate.getMonth() + 1).toString().padStart(2, '0');
                    const day = buttonDate.getDate().toString().padStart(2, '0');
                    clickedButtonDateString = `${clickedButtonYear}-${month}-${day}`;
                    // Use a format that includes the day name if desired, or keep existing format
                    formattedClickedButtonDate = buttonDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

                } catch (dateError) {
                    console.error("Error calculating specific date for button click:", dateError);
                    alert("Error determining the date for this slot.");
                    return;
                }

                // --- Compare dates for deletion condition ---
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Set today to midnight for fair comparison

                if (today < buttonDate) {
                    // Current date is BEFORE the slot date - Allow deletion (unmarking)
                    // --- UPDATED Confirmation Message ---
                    const confirmationMessage = `${formattedClickedButtonDate} (${dayName}) ${time} is currently marked as available. Do you want to unmark it?`;
                    // --- END UPDATED ---
                    const confirmation = confirm(confirmationMessage);

                    if (confirmation) {
                        // Call function to delete the slot in DB
                        await deleteAvailableSlot(slotId);
                    } else {
                        console.log("Operation cancelled by admin.");
                    }
                } else {
                     // Current date is ON or AFTER the slot date - Prevent deletion
                     alert(`Cannot unmark an available schedule on or after its date (${formattedClickedButtonDate}).`);
                }

            } else if (isAvailableButton) {
                // --- Handle Available Button Click (Mark as Available) ---
                const dayName = button.getAttribute('data-day');
                const time = button.getAttribute('data-time');
                const selectedWeekStartDate = weekFilterDropdown.value;
                const isWeekViewActive = selectedWeekStartDate && !weekFilterDropdown.disabled;
                const currentDepartment = departmentFilter.value;

                if (!isWeekViewActive) {
                    alert("Please select a specific week from the 'View Week' dropdown to modify slot availability.");
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
                    // ... (date calculation logic - keep as is) ...
                    const dayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(dayName);
                    if (dayIndex === -1) throw new Error(`Invalid day name: ${dayName}`);
                    let buttonDate = parseDateStringToLocalMidnight(selectedWeekStartDate);
                    if (isNaN(buttonDate.getTime())) throw new Error(`Invalid week start date: ${selectedWeekStartDate}`);
                    const weekStartDayIndex = buttonDate.getDay();
                    let daysToAdd = dayIndex - weekStartDayIndex;
                    buttonDate.setDate(buttonDate.getDate() + daysToAdd);
                    clickedButtonYear = buttonDate.getFullYear().toString();
                    const month = (buttonDate.getMonth() + 1).toString().padStart(2, '0');
                    const day = buttonDate.getDate().toString().padStart(2, '0');
                    clickedButtonDateString = `${clickedButtonYear}-${month}-${day}`;
                    formattedClickedButtonDate = buttonDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

                } catch (dateError) {
                    console.error("Error calculating specific date for button click:", dateError);
                    alert("Error determining the date for this slot.");
                    return;
                }

                // Confirmation Alert - Adjust message based on current state if needed
                let confirmationMessage = `Make ${formattedClickedButtonDate} (${time}) available for assessment in the ${currentDepartment} department?`;
                const confirmation = confirm(confirmationMessage);

                if (confirmation) {
                    // Call function to save/update slot in DB
                    await makeSlotAvailableForAssessment(clickedButtonDateString, time, currentDepartment, clickedButtonYear);
                } else {
                    console.log("Operation cancelled by admin.");
                }
            }
        }); // --- END of async arrow function ---
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