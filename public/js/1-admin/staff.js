document.addEventListener('DOMContentLoaded', async () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const departmentFilter = document.getElementById('department-filter');
    const scheduleRows = document.querySelectorAll('#schedule-body tr');
    const scheduleButtons = document.querySelectorAll('.availablebtn'); // Ensure these exist or handle null
    // --- Get references to modal elements ---
    const modal = document.getElementById('scheduleModal');
    const modalContent = modal.querySelector('.modal-content'); // Get the inner content area
    const closeModalButton = modal.querySelector('.close'); // Keep the close button reference
    // --- Remove references to specific divs/forms if rebuilding content ---
    // const applicationDetailsDiv = ...
    // const scheduleForm = ...
    // const applicantNameInput = ... etc.

    const recurringCheckbox = document.getElementById('recurringCheckbox');
    const specificDateContainer = document.getElementById('specificDateContainer');
    const specificDateDropdown = document.getElementById('specificDateDropdown');
    const weekFilterDropdown = document.getElementById('week-filter');
    const specificDateDisplay = document.getElementById('specificDateDisplay');
    const specificDateValue = document.getElementById('specificDateValue');
    const periodSettingsForm = document.getElementById('periodSettingsForm'); // Use this ID

    // Keep existing display elements
    const existingApplicationPeriodElement = document.getElementById('existingApplicationPeriod');
    const existingAssessmentPeriodElement = document.getElementById('existingAssessmentPeriod');

    // Keep period variables
    let currentApplicationPeriod = null;
    let currentAssessmentPeriod = null;

    // --- NEW: Define Helpers in Outer Scope ---
    const isSameOrAfterLocal = (date1, date2Str) => {
        if (!date1 || !date2Str) return false; // Add check for date1 validity
        const d2 = new Date(date2Str);
        if (isNaN(d2.getTime())) return false;
        const d1Start = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate()); // Compare start of day
        const d2Start = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
        return d1Start >= d2Start;
    };

    const isSameOrBeforeLocal = (date1, date2Str) => {
         if (!date1 || !date2Str) return false; // Add check for date1 validity
         const d2 = new Date(date2Str);
         if (isNaN(d2.getTime())) return false;
         const d1Start = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate()); // Compare start of day
         const d2Start = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
         return d1Start <= d2Start;
    };
    // --- End Helper Definitions ---


    // --- Define fetchApplicationPeriod function ---
    const fetchApplicationPeriod = async (key, year = null) => { // Add optional year parameter
        try {
            let url = `/admin/application-period?key=${encodeURIComponent(key)}`;
            if (year) {
                url += `&year=${year}`; // Append year if provided
            }
            const response = await fetch(url); // Use modified URL

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

    // --- NEW: Define fetchAssessmentPeriod function ---
    const fetchAssessmentPeriod = async (year = null) => { // Add optional year parameter
        try {
            let url = `/admin/assessment-period`;
            if (year) {
                url += `?year=${year}`; // Append year if provided
            }
            const response = await fetch(url); // Use modified URL
            if (response.status === 404) {
                console.log(`Assessment period not found.`);
                return null;
            }
            if (!response.ok) {
                throw new Error(`Failed to fetch assessment period: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error in fetchAssessmentPeriod:', error);
            return null;
        }
    };

    // --- Define Display Existing Application Period ---
    const displayExistingApplicationPeriod = () => {
        const currentYear = new Date().getFullYear();
        if (currentApplicationPeriod) {
            const { startDate, endDate } = currentApplicationPeriod;
            const startYear = new Date(startDate).getFullYear();
            const endYear = new Date(endDate).getFullYear();

            // --- DEBUGGING ---
            console.log("App Period Check:", { currentYear, startYear, endYear, condition: (startYear === currentYear || endYear === currentYear) });
            // --- END DEBUGGING ---

            if (startYear === currentYear || endYear === currentYear) { // Show if start OR end is in current year
                const formattedStartDate = new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                const formattedEndDate = new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                // --- FIX: Use the correct variable name ---
                existingApplicationPeriodElement.textContent = `${currentYear} Application Period: ${formattedStartDate} - ${formattedEndDate}`;
            } else {
                // --- DEBUGGING ---
                console.log("App Period: ELSE block executed!");
                // --- END DEBUGGING ---
                existingApplicationPeriodElement.textContent = `No application period set for ${currentYear}.`;
            }
        } else {
            // --- FIX: Use the correct variable name ---
            existingApplicationPeriodElement.textContent = `No application period set for ${currentYear}.`;
        }
    };

    // --- NEW: Define Display Existing Assessment Period ---
    const displayExistingAssessmentPeriod = () => {
        const currentYear = new Date().getFullYear();
        if (currentAssessmentPeriod) {
            const { startDate, endDate } = currentAssessmentPeriod;
            const startYear = new Date(startDate).getFullYear();
            const endYear = new Date(endDate).getFullYear();

             // --- DEBUGGING ---
             console.log("Assess Period Check:", { currentYear, startYear, endYear, condition: (startYear === currentYear || endYear === currentYear) });
             // --- END DEBUGGING ---

            if (startYear === currentYear || endYear === currentYear) {
                const formattedStartDate = new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                const formattedEndDate = new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                existingAssessmentPeriodElement.textContent = `${currentYear} Assessment Period: ${formattedStartDate} - ${formattedEndDate}`;
            } else {
                 // --- DEBUGGING ---
                 console.log("Assess Period: ELSE block executed!");
                 // --- END DEBUGGING ---
                existingAssessmentPeriodElement.textContent = `No assessment period set for ${currentYear}.`;
            }
        } else {
            existingAssessmentPeriodElement.textContent = `No assessment period set for ${currentYear}.`;
        }
    };

    // --- MODIFY: Populate Week Dropdown ---
    const populateWeekDropdown = () => {
        weekFilterDropdown.innerHTML = ''; // Clear previous options
        const currentYear = new Date().getFullYear();

        // --- Use currentAssessmentPeriod ---
        if (!currentAssessmentPeriod || !currentAssessmentPeriod.startDate || !currentAssessmentPeriod.endDate) {
            weekFilterDropdown.innerHTML = '<option value="">Assessment Period Not Set</option>';
            weekFilterDropdown.disabled = true;
            return false; // Indicate no valid period for current year
        }

        const startDate = new Date(currentAssessmentPeriod.startDate);
        const originalEndDate = new Date(currentAssessmentPeriod.endDate); // Original end date of assessment

        // Calculate Effective End Date (Friday of the week containing original end date)
        let effectiveEndDate = new Date(originalEndDate);
        const endDayOfWeekOriginal = originalEndDate.getDay();
        const daysToAddForFriday = 5 - endDayOfWeekOriginal;
        effectiveEndDate.setDate(originalEndDate.getDate() + daysToAddForFriday);
        effectiveEndDate.setHours(23, 59, 59, 999);
        // --- End Calculation ---

        const startYear = startDate.getFullYear();
        const effectiveEndYear = effectiveEndDate.getFullYear();

        if (startYear !== currentYear && effectiveEndYear !== currentYear) {
             weekFilterDropdown.innerHTML = `<option value="">No Assessment Period Set for ${currentYear}</option>`;
             weekFilterDropdown.disabled = true;
             return false; // Indicate no valid period for current year
        }
        if (isNaN(startDate.getTime()) || isNaN(originalEndDate.getTime())) {
             console.error("Invalid assessment period dates:", currentAssessmentPeriod.startDate, currentAssessmentPeriod.endDate);
             weekFilterDropdown.innerHTML = '<option value="">Invalid Assessment Dates</option>';
             weekFilterDropdown.disabled = true;
             return false; // Indicate invalid dates
        }


        let currentWeekStart = new Date(startDate);

        // Adjust currentWeekStart to the beginning of its week (Monday)
        const dayOfWeekStart = currentWeekStart.getDay(); // 0=Sun, 1=Mon, ...
        const diff = currentWeekStart.getDate() - dayOfWeekStart + (dayOfWeekStart === 0 ? -6 : 1); // Adjust to Monday
        currentWeekStart.setDate(diff);
        currentWeekStart.setHours(0, 0, 0, 0); // Normalize time

        let weekIndex = 0;
        while (currentWeekStart <= effectiveEndDate) { // Loop using effective end date
            // --- Calculate Friday for display ---
            const weekFriday = new Date(currentWeekStart);
            weekFriday.setDate(currentWeekStart.getDate() + 4); // Monday + 4 days = Friday
            // --- End Friday calculation ---

            // Calculate the actual end of the week (Sunday) for loop condition check
            const weekEndSunday = new Date(currentWeekStart);
            weekEndSunday.setDate(currentWeekStart.getDate() + 6);

            // Ensure the week start is not after the overall period end date before adding
            if (currentWeekStart > effectiveEndDate) break;

            // Only add weeks that are relevant to the current year
            // Use weekEndSunday for the relevance check to include weeks ending in the current year
            if (currentWeekStart.getFullYear() === currentYear || weekEndSunday.getFullYear() === currentYear) {
                // --- Adjust display end date if Friday goes past the period end ---
                const displayEndDateText = weekFriday > effectiveEndDate ? effectiveEndDate : weekFriday;
                // --- End adjustment ---

                const option = document.createElement('option');
                const weekStartDateString = currentWeekStart.toISOString().split('T')[0]; // YYYY-MM-DD (Value is still Monday)
                option.value = weekStartDateString;

                const formatOptions = { month: 'short', day: 'numeric' };
                const startText = currentWeekStart.toLocaleDateString('en-US', formatOptions);
                // --- Use displayEndDateText (Friday or period end) for text ---
                const endText = displayEndDateText.toLocaleDateString('en-US', formatOptions);
                option.textContent = `Week of ${startText} - ${endText}`; // Display Mon - Fri (or end date)
                // --- End text change ---

                weekFilterDropdown.appendChild(option);
                weekIndex++;
            }


            currentWeekStart.setDate(currentWeekStart.getDate() + 7); // Move to next Monday
        }

        weekFilterDropdown.disabled = weekIndex === 0;
        if (weekIndex === 0) {
             weekFilterDropdown.innerHTML = `<option value="">No Assessment Weeks Available for ${currentYear}</option>`;
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

    // --- NEW: Define fetchApplicationsForWeek function ---
    const fetchApplicationsForWeek = async (weekStartDate, department) => {
        try {
            const response = await fetch(`/admin/applications-for-week?weekStart=${weekStartDate}&department=${encodeURIComponent(department)}`);
            if (!response.ok) {
                throw new Error('Failed to fetch applications for the week');
            }
            const data = await response.json();
            console.log(`Fetched ${data.length} applications for week ${weekStartDate}:`, data);
            return data; // Should be an array of application objects
        } catch (error) {
            console.error('Error fetching applications for week:', error);
            return []; // Return empty array on error
        }
    };
    // --- End NEW ---

    // --- Define displaySchedules function ---
    // --- FIX: Accept applicationsData ---
    const displaySchedules = (scheduleData, applicationsData = [], weekStartDateString = null) => {
        let recurring = [];
        let overrides = [];
        let overrideMap = new Map();
        let recurringMap = new Map();
        // --- NEW: Application Map ---
        let applicationMap = new Map();
        // --- End NEW ---

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

            // --- NEW: Create lookup map for applications: "YYYY-MM-DD_HH:MM-HH:MM" -> application object ---
            applicationsData.forEach(app => {
                if (app.preferredSchedule && app.preferredSchedule.date && app.preferredSchedule.time) {
                    const key = `${app.preferredSchedule.date}_${app.preferredSchedule.time}`;
                    applicationMap.set(key, app);
                }
            });
            // --- End NEW ---

        } else {
            console.log('Displaying only recurring schedules:', scheduleData);
            recurring = scheduleData; // Assume scheduleData is just the recurring array
            // No applications to map in recurring-only view
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
            let isApplicationSlot = false; // Flag
            let buttonClass = 'availablebtn'; // Default class

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

                // --- Check for Application FIRST ---
                const applicationKey = `${buttonDateString}_${time}`;
                const application = applicationMap.get(applicationKey);

                if (application) {
                    isApplicationSlot = true;
                    isAvailable = false; // Occupied by an application
                    // Format name: LastName, FirstName M. Suffix
                    const middle = application.middleInitial ? ` ${application.middleInitial}.` : '';
                    const suffix = application.suffix ? ` ${application.suffix}` : '';
                    // --- FIX: Use section ---
                    buttonText = `${application.lastName}, ${application.firstName}${middle}${suffix} (${application.section || 'N/A'})`; // Add section
                    // --- End FIX ---
                    scheduleDetails = application; // Store application details if needed
                    // --- FIX: Set buttonClass ---
                    buttonClass = 'applicationbtn'; // Set class for application
                    // --- End FIX ---
                    console.log(`Application found for ${applicationKey}: ${buttonText}`); // Debugging
                }
                // --- End Application Check ---
                else { // --- Only check overrides/recurring if NO application ---
                    // Determine the status based on overrides first, then recurring
                    const overrideKey = `${buttonDateString}_${time}`; // Key uses local date string
                    const override = overrideMap.get(overrideKey); // Check map using local date string key

                    if (override) {
                        // Override exists for this specific date and time
                        scheduleDetails = override;
                        if (override.status === 'available') {
                            isAvailable = true;
                            buttonText = ''; // Slot is available due to override
                            buttonClass = 'availablebtn'; // Set class
                        } else { // status === 'unavailable'
                            isAvailable = false;
                            buttonText = `${override.subject} (${override.roomNum})`; // Slot is booked by override
                            buttonClass = 'schedulebtn'; // Set class
                        }
                    } else if (recurringSchedule) {
                        // No override, but a recurring schedule exists for this day and time
                        scheduleDetails = recurringSchedule;
                        isAvailable = false;
                        buttonText = `${recurringSchedule.subject} (${recurringSchedule.roomNum})`; // Slot is booked by recurring rule
                        buttonClass = 'schedulebtn'; // Set class
                    } else {
                        // No application, no override, and no recurring schedule
                        isAvailable = true;
                        buttonText = ''; // Slot is available by default
                        buttonClass = 'availablebtn'; // Set class (already default, but explicit)
                    }
                } // --- End else block (no application) ---

            } else {
                 // Not a weekly view, just check recurring
                 if (recurringSchedule) {
                    scheduleDetails = recurringSchedule;
                    isAvailable = false;
                    buttonText = `${recurringSchedule.subject} (${recurringSchedule.roomNum})`; // Slot is booked by recurring rule
                    buttonClass = 'schedulebtn'; // Set class
                 } else {
                    isAvailable = true;
                    buttonText = '';
                    buttonClass = 'availablebtn'; // Set class (already default, but explicit)
                 }
            }


            // Update button appearance
            button.textContent = buttonText;
            // --- Always enable buttons for interaction ---
            button.disabled = false;
            // --- ---
            // --- FIX: Set class based on determined state ---
            button.className = 'schedule-button ' + buttonClass; // Reset classes and apply the correct one
            // --- End FIX ---

            // Optional: Store details on the button if needed for the modal later
            // button.dataset.scheduleDetails = JSON.stringify(scheduleDetails);
        });

    }; // End displaySchedules

    // --- Define Function to Handle Week Change ---
    const handleWeekChange = async () => {
        const selectedWeekStartDate = weekFilterDropdown.value;
        const selectedDepartment = departmentFilter.value;
        const currentYear = new Date().getFullYear().toString(); // Get current year as string

        // Always enable buttons when department changes or week changes
        scheduleButtons.forEach(button => button.disabled = false);

        if (selectedWeekStartDate && !weekFilterDropdown.disabled) {
            // A valid week is selected for the current year, fetch weekly data AND applications
            console.log(`Fetching weekly availability and applications for week starting: ${selectedWeekStartDate}, Department: ${selectedDepartment}`);
            try {
                // Fetch both concurrently
                const [weeklyDataResponse, applicationsResponse] = await Promise.all([
                    fetch(`/admin/weekly-schedule?weekStart=${selectedWeekStartDate}&department=${encodeURIComponent(selectedDepartment)}`),
                    fetch(`/admin/applications-for-week?weekStart=${selectedWeekStartDate}&department=${encodeURIComponent(selectedDepartment)}`)
                ]);

                if (!weeklyDataResponse.ok) throw new Error('Failed to fetch weekly availability');
                if (!applicationsResponse.ok) throw new Error('Failed to fetch applications for week');

                const weeklyData = await weeklyDataResponse.json(); // Contains { recurring: [...], overrides: [...] }
                const applicationsData = await applicationsResponse.json(); // Contains [...]

                // --- Pass both datasets to displaySchedules ---
                displaySchedules(weeklyData, applicationsData, selectedWeekStartDate);

            } catch (error) {
                console.error("Error fetching/displaying weekly schedule or applications:", error);
                 scheduleButtons.forEach(button => {
                    button.textContent = 'Error';
                    button.classList.remove('schedulebtn', 'applicationbtn'); // Remove both potential classes
                    button.classList.add('availablebtn');
                    // Keep buttons enabled even on error
                });
            }
        } else {
             // No valid week selected (or dropdown disabled), fetch only recurring for the current year
             console.log(`No valid week selected. Fetching recurring schedules for year: ${currentYear}, Department: ${selectedDepartment}`);
             try {
                 const recurringData = await fetchRecurringSchedules(currentYear, selectedDepartment);
                 // --- Pass only recurring data (applicationsData is null/empty) ---
                 displaySchedules(recurringData, [], null); // Pass empty array for applications
             } catch (error) {
                 console.error("Error fetching/displaying recurring schedules:", error);
                 scheduleButtons.forEach(button => {
                    button.textContent = 'Error';
                    button.classList.remove('schedulebtn', 'applicationbtn'); // Remove both potential classes
                    button.classList.add('availablebtn');
                    // Keep buttons enabled even on error
                });
             }
        }
    };

    // --- Fetch Application Period ---
    // --- MODIFY: Fetch and Store Periods ---
    const fetchAndStorePeriods = async () => {
        const currentYear = new Date().getFullYear(); // Get the current year
        try {
            // Fetch periods specifically for the CURRENT year
            currentApplicationPeriod = await fetchApplicationPeriod('JoinGFM', currentYear);
            currentAssessmentPeriod = await fetchAssessmentPeriod(currentYear); // Pass current year

            console.log(`Fetched application period for ${currentYear}:`, currentApplicationPeriod);
            console.log(`Fetched assessment period for ${currentYear}:`, currentAssessmentPeriod);

            // Populate dropdown based on Assessment Period for the current year
            const populated = populateWeekDropdown(); // Uses currentAssessmentPeriod (now for current year)
            // Display existing periods (will now use current year data if found)
            displayExistingApplicationPeriod();
            displayExistingAssessmentPeriod();

            // Load schedule view based on dropdown state
            await handleWeekChange(); // Logic remains the same, relies on dropdown state

        } catch (error) {
            console.error(`Failed to fetch periods for ${currentYear} on load:`, error);
            // Fallback logic (try to display whatever might have been fetched, load recurring)
            weekFilterDropdown.innerHTML = '<option value="">Error Loading Periods</option>';
            weekFilterDropdown.disabled = true;
            displayExistingApplicationPeriod(); // Display based on potentially null data
            displayExistingAssessmentPeriod(); // Display based on potentially null data
            await handleWeekChange(); // Attempt to load recurring view
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
    await fetchAndStorePeriods();
    const user = await fetchUserData();

    // --- Initial Setup based on User/Data ---
    // Use periodSettingsForm here
    const periodSettingsFields = periodSettingsForm ? periodSettingsForm.querySelectorAll('input, button') : [];
    if (user && user.roles === 'Admin') {
        periodSettingsFields.forEach(field => field.disabled = false);
    } else if (periodSettingsFields.length > 0) {
        periodSettingsFields.forEach(field => field.disabled = true);
    }

    // --- Add Event Listeners (Keep schedule/modal related) ---
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
            const dayName = button.getAttribute('data-day');
            const time = button.getAttribute('data-time');
            const selectedWeekStartDate = weekFilterDropdown.value;
            const isWeekViewActive = selectedWeekStartDate && !weekFilterDropdown.disabled;
            const isApplicationButton = button.classList.contains('applicationbtn');

            // --- Calculate the specific date (keep this logic) ---
            let clickedButtonDateString = '';
            let formattedClickedButtonDate = '';
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
                }
            }
            // --- End date calculation ---

            // 1. Clear previous modal content (keep the close button)
            modalContent.innerHTML = ''; // Clear everything inside
            modalContent.appendChild(closeModalButton); // Re-add the close button

            // 2. Dynamically build content based on button type
            if (isApplicationButton) {
                // --- Build Application View ---
                console.log("Application button clicked. Building application view.");

                // Create Title
                const title = document.createElement('h2');
                title.textContent = 'Applicant Information';
                modalContent.appendChild(title);

                // Retrieve application data
                const applicationKey = `${clickedButtonDateString}_${time}`;
                const application = applicationMap.get(applicationKey);

                if (application) {
                    console.log("Populating modal with application data:", application);

                    // Function to create labeled read-only input
                    const createReadOnlyField = (labelText, value) => {
                        const div = document.createElement('div');
                        div.style.marginBottom = '10px'; // Add some spacing
                        const label = document.createElement('label');
                        label.textContent = labelText;
                        label.style.display = 'block'; // Ensure label is on its own line
                        const input = document.createElement('input');
                        input.type = 'text';
                        input.value = value || 'N/A';
                        input.readOnly = true;
                        input.style.width = '95%'; // Adjust width as needed
                        div.appendChild(label);
                        div.appendChild(input);
                        return div;
                    };

                    // Format name
                    const middle = application.middleInitial ? ` ${application.middleInitial}.` : '';
                    const suffix = application.suffix ? ` ${application.suffix}` : '';
                    const fullName = `${application.lastName}, ${application.firstName}${middle}${suffix}`;

                    // Append fields
                    modalContent.appendChild(createReadOnlyField('Name:', fullName));
                    modalContent.appendChild(createReadOnlyField('DLSU-D Email:', application.dlsudEmail));
                    modalContent.appendChild(createReadOnlyField('Student Number:', application.studentNumber));
                    modalContent.appendChild(createReadOnlyField('Section:', application.section));
                    modalContent.appendChild(createReadOnlyField('Preferred Department:', application.preferredDepartment));

                } else {
                    console.error(`Could not find application data for key: ${applicationKey}`);
                    const errorMsg = document.createElement('p');
                    errorMsg.textContent = 'Error: Could not load applicant details.';
                    errorMsg.style.color = 'red';
                    modalContent.appendChild(errorMsg);
                    // Optionally return here if you don't want to show the modal on error
                    // return;
                }

            } else {
                // --- Build Schedule Edit/Create View ---
                console.log("Regular schedule button clicked. Building schedule form view.");

                // Create Title
                const title = document.createElement('h2');
                title.textContent = 'Schedule Slot Details';
                modalContent.appendChild(title);

                // Create the form element dynamically (or clone a template if you prefer)
                const form = document.createElement('form');
                form.id = 'scheduleForm'; // Assign ID for potential later reference

                // Add form fields (Admin Name, CYS, Subject, RoomNum, Recurring Checkbox, Specific Date)
                // Example for Admin Name (read-only)
                const adminDiv = document.createElement('div');
                const adminLabel = document.createElement('label');
                adminLabel.textContent = 'Admin:';
                const adminInput = document.createElement('input');
                adminInput.type = 'text';
                adminInput.id = 'adminName'; // Keep IDs if needed
                adminInput.name = 'adminName';
                adminInput.readOnly = true;
                adminInput.value = `${user.lastName}, ${user.firstName} ${user.middleInitial ?? ''} ${user.suffix ?? ''}`;
                adminDiv.appendChild(adminLabel);
                adminDiv.appendChild(adminInput);
                form.appendChild(adminDiv);

                // Example for CYS (editable)
                const cysDiv = document.createElement('div');
                const cysLabel = document.createElement('label');
                cysLabel.textContent = 'CYS:';
                const cysInput = document.createElement('input');
                cysInput.type = 'text';
                cysInput.id = 'cys';
                cysInput.name = 'cys';
                cysDiv.appendChild(cysLabel);
                cysDiv.appendChild(cysInput);
                form.appendChild(cysDiv);

                // ... Add Subject, RoomNum fields similarly ...
                 const subjectDiv = document.createElement('div');
                 const subjectLabel = document.createElement('label');
                 subjectLabel.textContent = 'Subject:';
                 const subjectInput = document.createElement('input');
                 subjectInput.type = 'text';
                 subjectInput.id = 'subject';
                 subjectInput.name = 'subject';
                 subjectDiv.appendChild(subjectLabel);
                 subjectDiv.appendChild(subjectInput);
                 form.appendChild(subjectDiv);

                 const roomNumDiv = document.createElement('div');
                 const roomNumLabel = document.createElement('label');
                 roomNumLabel.textContent = 'Room Number:';
                 const roomNumInput = document.createElement('input');
                 roomNumInput.type = 'text';
                 roomNumInput.id = 'roomNum';
                 roomNumInput.name = 'roomNum';
                 roomNumDiv.appendChild(roomNumLabel);
                 roomNumDiv.appendChild(roomNumInput);
                 form.appendChild(roomNumDiv);


                // Add Recurring Checkbox and Specific Date Container
                // (This part is more complex to build dynamically, ensure IDs match event listeners)
                const recurringDiv = document.createElement('div');
                const recurringInput = document.createElement('input');
                recurringInput.type = 'checkbox';
                recurringInput.id = 'recurringCheckbox';
                recurringInput.name = 'recurring';
                recurringInput.checked = true; // Default checked
                const recurringLabel = document.createElement('label');
                recurringLabel.htmlFor = 'recurringCheckbox';
                recurringLabel.textContent = ' Recurring Weekly Schedule';
                recurringDiv.appendChild(recurringInput);
                recurringDiv.appendChild(recurringLabel);
                form.appendChild(recurringDiv);

                const specificDateDiv = document.createElement('div');
                specificDateDiv.id = 'specificDateContainer';
                specificDateDiv.style.display = 'none'; // Initially hidden
                const specificDateLabel = document.createElement('label');
                specificDateLabel.textContent = 'Specific Date:';
                const specificDateDisplayInput = document.createElement('input');
                specificDateDisplayInput.type = 'text';
                specificDateDisplayInput.id = 'specificDateDisplay';
                specificDateDisplayInput.readOnly = true;
                const specificDateValueInput = document.createElement('input'); // Hidden input
                specificDateValueInput.type = 'hidden';
                specificDateValueInput.id = 'specificDateValue';
                specificDateValueInput.name = 'specificDateValue';
                specificDateDiv.appendChild(specificDateLabel);
                specificDateDiv.appendChild(specificDateDisplayInput);
                specificDateDiv.appendChild(specificDateValueInput);
                form.appendChild(specificDateDiv);


                // Add hidden fields for day and time
                const dayInput = document.createElement('input');
                dayInput.type = 'hidden';
                dayInput.id = 'day';
                dayInput.name = 'day';
                dayInput.value = dayName;
                form.appendChild(dayInput);

                const timeInput = document.createElement('input');
                timeInput.type = 'hidden';
                timeInput.id = 'time';
                timeInput.name = 'time';
                timeInput.value = time;
                form.appendChild(timeInput);

                // Add Button Container
                const buttonContainer = document.createElement('div');
                buttonContainer.classList.add('modal-buttons');
                form.appendChild(buttonContainer);

                // Add Save Button (initial state)
                const saveButton = document.createElement('button');
                saveButton.type = 'submit';
                saveButton.textContent = 'Save';
                buttonContainer.appendChild(saveButton);

                // Append the form to the modal content
                modalContent.appendChild(form);

                // --- Now, fetch recurring data and populate/adjust buttons ---
                try {
                    const currentYear = new Date().getFullYear();
                    const currentDepartment = departmentFilter.value;
                    const response = await fetch(`/admin/schedule?day=${encodeURIComponent(dayName)}&time=${encodeURIComponent(time)}&year=${currentYear}&department=${encodeURIComponent(currentDepartment)}`);
                    if (!response.ok && response.status !== 404) throw new Error('Failed to fetch schedule data');
                    const schedule = response.status === 404 ? null : await response.json();

                    if (schedule) { // Existing RECURRING schedule found
                        // Populate form fields
                        form.querySelector('#cys').value = schedule.section;
                        form.querySelector('#subject').value = schedule.subject;
                        form.querySelector('#roomNum').value = schedule.roomNum;

                        // Adjust Save button
                        saveButton.textContent = 'Edit Recurring';
                        saveButton.onclick = (e) => { e.preventDefault(); handleFormSubmit(schedule._id); }; // Pass ID for editing

                        // Add Delete button
                        const deleteButton = document.createElement('button');
                        deleteButton.textContent = 'Delete Recurring';
                        deleteButton.classList.add('delete-button');
                        deleteButton.type = 'button';
                        deleteButton.onclick = async () => { /* ... delete logic ... */ };
                        buttonContainer.appendChild(deleteButton);

                        // Add "Make Available This Week" button
                        if (isWeekViewActive && clickedButtonDateString) {
                            const makeAvailableButton = document.createElement('button');
                            makeAvailableButton.textContent = 'Make Available This Week';
                            makeAvailableButton.classList.add('make-available-button');
                            makeAvailableButton.type = 'button';
                            makeAvailableButton.onclick = async () => { /* ... make available logic ... */ };
                            buttonContainer.appendChild(makeAvailableButton);
                        }
                    } else { // No existing RECURRING schedule
                        saveButton.onclick = (e) => { e.preventDefault(); handleFormSubmit(null); }; // Pass null ID for saving new
                    }

                    // Re-attach event listener for the dynamically created checkbox
                    const newRecurringCheckbox = form.querySelector('#recurringCheckbox');
                    if (newRecurringCheckbox) {
                         newRecurringCheckbox.addEventListener('change', () => {
                            // Copy the logic from the original recurringCheckbox listener
                            const isChecked = newRecurringCheckbox.checked;
                            const weekSelected = weekFilterDropdown.value && !weekFilterDropdown.disabled;
                            const specificDateContainer = form.querySelector('#specificDateContainer'); // Find within this form
                            const specificDateDisplay = form.querySelector('#specificDateDisplay');
                            const specificDateValue = form.querySelector('#specificDateValue');

                            if (!isChecked) {
                                if (!weekSelected) {
                                    alert("Please select a valid week from the 'View Week' dropdown to set a specific date schedule.");
                                    newRecurringCheckbox.checked = true; // Prevent unchecking
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
                                    newRecurringCheckbox.checked = true; // Re-check the box
                                }
                            } else {
                                specificDateContainer.style.display = 'none';
                                specificDateDisplay.value = '';
                                specificDateValue.value = '';
                            }
                        });
                    }


                } catch (error) {
                    console.error('Error fetching schedule data for modal:', error);
                    const errorMsg = document.createElement('p');
                    errorMsg.textContent = 'Error: Failed to load schedule details.';
                    errorMsg.style.color = 'red';
                    modalContent.appendChild(errorMsg);
                    // Optionally return
                    // return;
                }
            } // --- End else block (regular button) ---

            // 3. Show the modal
            modal.style.display = 'block';

        }); // End button click listener
    }); // End scheduleButtons.forEach

    // --- IMPORTANT: Update handleFormSubmit to find elements within the dynamic form ---
    const handleFormSubmit = async (scheduleId) => {
        // Find the form within the currently displayed modal content
        const form = modalContent.querySelector('#scheduleForm');
        if (!form) {
            console.error("Cannot submit, schedule form not found in modal.");
            return;
        }

        const isRecurring = form.querySelector('#recurringCheckbox').checked;
        const originalDay = form.querySelector('#day').value;
        const originalTime = form.querySelector('#time').value;
        const specificDate = form.querySelector('#specificDateValue').value;
        const currentDepartment = departmentFilter.value;
        const currentYear = new Date().getFullYear(); // Year for recurring

        const commonFormData = {
            cys: form.querySelector('#cys').value, // Get value from dynamic form
            subject: form.querySelector('#subject').value,
            roomNum: form.querySelector('#roomNum').value,
            department: currentDepartment,
            // Include admin details if needed by backend consistently
            lastName: user.lastName,
            firstName: user.firstName,
            middleInitial: user.middleInitial,
            suffix: user.suffix,
        };

        // Basic validation for common fields
        if (!commonFormData.section || !commonFormData.subject || !commonFormData.roomNum) {
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

    // --- Close modal listener remains the same ---
    closeModalButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // --- Modify Combined Period Settings Form Submission ---
    if (periodSettingsForm) {
        periodSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            periodSettingsFields.forEach(field => field.disabled = true); // Disable form during submission

            const appKey = 'JoinGFM';
            const assessKey = 'GFMAssessment';
            const appStartDateInput = document.getElementById('appStartDate');
            const appEndDateInput = document.getElementById('appEndDate');
            const assessStartDateInput = document.getElementById('assessStartDate');
            const assessEndDateInput = document.getElementById('assessEndDate');

            const appStartDate = appStartDateInput.value;
            const appEndDate = appEndDateInput.value;
            const assessStartDate = assessStartDateInput.value;
            const assessEndDate = assessEndDateInput.value;

            // --- Combined Validation ---
            if (!appStartDate || !appEndDate || !assessStartDate || !assessEndDate) {
                alert('Please fill in all start and end dates for both periods.');
                periodSettingsFields.forEach(field => field.disabled = false);
                return;
            }

            // --- Date Validation ---
            const appStartDateTime = new Date(appStartDate); // Renamed for clarity
            const appEndDateTime = new Date(appEndDate);     // Renamed for clarity
            const assessStartDateTime = new Date(assessStartDate);
            const assessEndDateTime = new Date(assessEndDate);
            const currentDate = new Date();
            const currentDayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()); // Start of today

            if (isNaN(appStartDateTime.getTime()) || isNaN(appEndDateTime.getTime()) || isNaN(assessStartDateTime.getTime()) || isNaN(assessEndDateTime.getTime())) {
                 alert('Invalid date format provided.');
                 periodSettingsFields.forEach(field => field.disabled = false);
                 return;
            }

            // --- NEW: Check Application Start Date vs Current Date ---
            if (appStartDateTime < currentDayStart) {
                 alert('Application Period start date cannot be set before the current date.');
                 periodSettingsFields.forEach(field => field.disabled = false);
                 return; // Stop if invalid
            }
            // --- End NEW ---

            if (appEndDateTime < appStartDateTime) {
                alert('Application End Date must be on or after Application Start Date.');
                periodSettingsFields.forEach(field => field.disabled = false);
                return;
            }
             if (assessEndDateTime < assessStartDateTime) {
                alert('Assessment End Date must be on or after Assessment Start Date.');
                periodSettingsFields.forEach(field => field.disabled = false);
                return;
            }
            // --- FIX: Moved Assessment Start Date Check Higher ---
            if (assessStartDateTime < appStartDateTime) {
                 alert('Assessment Period start date must be on or after the Application Period start date.');
                 periodSettingsFields.forEach(field => field.disabled = false);
                 return; // Stop if invalid
            }
            // --- End FIX ---

            // --- NEW: Check Assessment End Date vs Application End Date ---
            if (assessEndDateTime < appEndDateTime) {
                 alert('Assessment Period end date must be on or after the Application Period end date.');
                 periodSettingsFields.forEach(field => field.disabled = false);
                 return; // Stop if invalid
            }
            // --- End NEW ---

            const targetYear = appStartDateTime.getFullYear(); // Use app start date year as target

            // --- Frontend Pre-submission Checks (Active/Concluded) ---
            try {
                // Fetch the LATEST settings by key to check status
                const latestPeriod = await fetchApplicationPeriod(appKey); // Gets the most recently saved/updated

                if (latestPeriod) {
                    // Active Check
                    if (isSameOrAfterLocal(currentDayStart, latestPeriod.startDate) && isSameOrBeforeLocal(currentDayStart, latestPeriod.endDate)) {
                        alert('Cannot add/modify application period during an active application period. Please wait until the period ends.');
                        periodSettingsFields.forEach(field => field.disabled = false); // Re-enable form
                        return; // Stop submission
                    }

                    // Concluded Check
                    const latestStartDate = new Date(latestPeriod.startDate);
                    if (!isNaN(latestStartDate.getTime())) {
                        const latestPeriodYear = latestStartDate.getFullYear();
                        if (targetYear === latestPeriodYear && isSameOrAfterLocal(currentDayStart, latestPeriod.endDate) && !isSameOrBeforeLocal(currentDayStart, latestPeriod.endDate)) {
                             alert(`An application period for ${targetYear} has already concluded. You cannot set a new period for this year.`);
                             periodSettingsFields.forEach(field => field.disabled = false); // Re-enable form
                             return; // Stop submission
                        }
                    } else {
                        console.warn("Could not parse latestPeriod.startDate for concluded check:", latestPeriod.startDate);
                    }
                }

                // --- If ALL checks pass, proceed with confirmation ---

                const formatDate = (dateStr) => {
                    const options = { year: 'numeric', month: 'long', day: '2-digit' };
                    const [year, month, day] = dateStr.split('-').map(Number);
                    const dateObj = new Date(year, month - 1, day);
                    return new Intl.DateTimeFormat('en-US', options).format(dateObj);
                };
                const formattedAppStart = formatDate(appStartDate);
                const formattedAppEnd = formatDate(appEndDate);
                const formattedAssessStart = formatDate(assessStartDate);
                const formattedAssessEnd = formatDate(assessEndDate);

                // --- FIX: Updated Confirmation Message ---
                let confirmationMessage = `You want to set Application and Assessment Period for ${targetYear}:\n\n` +
                                          `Application: ${formattedAppStart} - ${formattedAppEnd}\n` +
                                          `Assessment: ${formattedAssessStart} - ${formattedAssessEnd}\n\n` +
                                          `Proceed?`;
                // --- End FIX ---

                let confirmation = confirm(confirmationMessage);

                if (!confirmation) {
                    // Don't clear inputs, just re-enable
                    periodSettingsFields.forEach(field => field.disabled = false);
                    return; // Stop if user cancels
                }

                // --- Attempt to Save (backend decides create/update/conflict) ---
                await saveCombinedPeriods({ appKey, appStartDate, appEndDate, assessKey, assessStartDate, assessEndDate, force: false }); // Initial attempt with force = false

            } catch (error) {
                console.error('Error during pre-submission checks or save:', error);
                alert(error.message || 'An error occurred. Please try again.');
                periodSettingsFields.forEach(field => field.disabled = false); // Re-enable form on error
            }
        });
    } else {
        console.warn("Period Settings Form not found.");
    }

    // --- Function to Save Combined Periods ---
    const saveCombinedPeriods = async (periodData) => {
        // periodData contains: appKey, appStartDate, appEndDate, assessKey, assessStartDate, assessEndDate, force
        try {
            // Use the Application Period POST endpoint, modified to accept assessment data
            const response = await fetch('/admin/application-period', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(periodData), // Send all data
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message || 'Application and Assessment Periods saved successfully!');
                await fetchAndStorePeriods(); // Re-fetch latest and update UI
                periodSettingsFields.forEach(field => field.disabled = false); // Re-enable form

            } else if (response.status === 409 && data.conflict) { // Handle potential overwrite conflict from backend
                console.warn('Backend detected conflict:', data.message);
                const forceConfirmation = confirm(data.message + "\n\nDo you want to overwrite?");

                if (forceConfirmation) {
                    // Resend with force = true
                    await saveCombinedPeriods({ ...periodData, force: true });
                } else {
                    alert('Operation cancelled.');
                    // Don't clear inputs, just re-enable
                    periodSettingsFields.forEach(field => field.disabled = false);
                }
            } else {
                 // Handle other errors (400, 403, 500 etc.)
                 throw new Error(data.error || data.message || `Failed to save periods (Status: ${response.status})`);
            }

        } catch (error) {
            // Re-enable fields if save fails after confirmation
            periodSettingsFields.forEach(field => field.disabled = false);
            // Re-throw the error to be caught by the outer handler which shows the alert
            throw error;
        }
    };

    // --- Tab functionality ---
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