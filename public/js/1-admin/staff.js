document.addEventListener('DOMContentLoaded', async () => {
    // --- State Variables ---
    let currentApplicationPeriod = null;
    let currentAssessmentPeriod = null;
    let currentYear = new Date().getFullYear().toString(); // Use string for consistency
    let currentSelectedSubmissionId = null;
    let currentSlotsForWeek = []; // Cache slots for schedule tab updates

    // <<< Initialize Socket.IO >>>
    const socket = io();

    // --- Element References ---
    const existingApplicationPeriodElement = document.getElementById('existingApplicationPeriod');
    const existingAssessmentPeriodElement = document.getElementById('existingAssessmentPeriod');
    const weekFilterDropdown = document.getElementById('weekFilter');
    const departmentFilter = document.getElementById('departmentFilter');
    const submissionYearFilter = document.getElementById('submissionYearFilter');
    const submissionStatusFilter = document.getElementById('submissionStatusFilter');
    const submissionDepartmentFilter = document.getElementById('submissionDepartmentFilter');
    const submissionsTableBody = document.getElementById('submissionsTableBody');
    const submissionDetailContentInline = document.getElementById('submissionDetailContentInline');
    const scheduleModal = document.getElementById('scheduleModal'); // Assuming this exists
    const applicationDetailsView = document.getElementById('applicationDetailsView'); // Assuming this exists
    const scheduleModalCloseButton = document.getElementById('scheduleModalCloseBtn'); // <<< ADD THIS LINE (Adjust ID if needed)
    const periodSettingsForm = document.getElementById('periodSettingsForm'); // Assuming this exists
    const submissionResultUpdate = document.getElementById('submissionResultUpdate'); // Assuming this exists
    const saveSubmissionResultBtn = document.getElementById('saveSubmissionResultBtn'); // Assuming this exists
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    // <<< CORRECT THE SELECTOR HERE >>>
    const scheduleButtons = document.querySelectorAll('#scheduleGrid .schedule-button'); // Use #scheduleGrid (capital G)


    // --- Function to populate week dropdown ---
    const populateWeekDropdown = () => {
        if (!weekFilterDropdown) return false;

        weekFilterDropdown.disabled = true;
        weekFilterDropdown.innerHTML = '<option value="">Assessment Period Not Set</option>';

        if (!currentAssessmentPeriod?.startDate || !currentAssessmentPeriod?.endDate) {
            console.warn("Cannot populate week dropdown: Assessment period start/end date missing.");
            return false;
        }

        const periodStartDate = parseDateStringToLocalMidnight(currentAssessmentPeriod.startDate);
        const periodEndDate = parseDateStringToLocalMidnight(currentAssessmentPeriod.endDate);

        if (isNaN(periodStartDate.getTime()) || isNaN(periodEndDate.getTime())) {
             console.warn("Cannot populate week dropdown: Invalid assessment period dates.");
             return false;
        }

        weekFilterDropdown.innerHTML = '<option value="">Select Week</option>';

        let currentIterationDate = new Date(periodStartDate);
        // Adjust to the start of the week (Sunday) containing the period start date
        currentIterationDate.setDate(currentIterationDate.getDate() - currentIterationDate.getDay());

        let addedOptions = 0;
        const addedWeekValues = new Set(); // Prevent duplicate week values if period spans multiple weeks partially

        // Iterate through weeks that overlap with the period
        while (currentIterationDate <= periodEndDate) {
            // <<< FIX: Format local date components directly for the value >>>
            const y = currentIterationDate.getFullYear();
            const m = (currentIterationDate.getMonth() + 1).toString().padStart(2, '0');
            const d = currentIterationDate.getDate().toString().padStart(2, '0');
            const weekStartDateValue = `${y}-${m}-${d}`; // Sunday YYYY-MM-DD in local time
            // <<< END FIX >>>


            // Prevent adding the same week start value multiple times
            if (!addedWeekValues.has(weekStartDateValue)) {
                let firstSchoolDayInPeriod = null;
                let lastSchoolDayInPeriod = null;

                // Check Monday (1) to Friday (5) of this week
                for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
                    const checkDate = new Date(currentIterationDate);
                    checkDate.setDate(checkDate.getDate() + dayOffset);

                    // Check if this school day falls within the actual assessment period
                    if (checkDate >= periodStartDate && checkDate <= periodEndDate) {
                        if (!firstSchoolDayInPeriod) {
                            firstSchoolDayInPeriod = new Date(checkDate); // Store the Date object
                        }
                        lastSchoolDayInPeriod = new Date(checkDate); // Update last valid school day
                    }
                }

                // Only add the week if it contains a school day within the period
                if (firstSchoolDayInPeriod) {
                    const displayFormat = { month: 'short', day: 'numeric' };
                    // Format the first and last relevant school days for display
                    const optionText = `${firstSchoolDayInPeriod.toLocaleDateString('en-US', displayFormat)} - ${lastSchoolDayInPeriod.toLocaleDateString('en-US', displayFormat)}`;
                    // Use the correctly formatted local Sunday date string as value
                    const option = new Option(optionText, weekStartDateValue);
                    weekFilterDropdown.add(option);
                    addedOptions++;
                    addedWeekValues.add(weekStartDateValue); // Mark this week value as added
                }
            }

            // Move to the next week's Sunday
            currentIterationDate.setDate(currentIterationDate.getDate() + 7);
        }

        if (addedOptions > 0) {
            weekFilterDropdown.disabled = false;
            return true;
        } else {
            weekFilterDropdown.innerHTML = '<option value="">No School Weeks Available</option>';
            return false;
        }
    };
    // --- End populateWeekDropdown ---


    // --- Function to update displayed periods ---
    const updateDisplayedPeriods = () => {
        if (existingApplicationPeriodElement) {
            if (currentApplicationPeriod) {
                const appStart = currentApplicationPeriod.startDate ? new Date(currentApplicationPeriod.startDate).toLocaleDateString() : 'N/A';
                const appEnd = currentApplicationPeriod.endDate ? new Date(currentApplicationPeriod.endDate).toLocaleDateString() : 'N/A';
                existingApplicationPeriodElement.textContent = `Current Application Period (${currentApplicationPeriod.year}): ${appStart} - ${appEnd}`;
            } else {
                existingApplicationPeriodElement.textContent = 'Current Application Period: Not Set';
            }
        }
        if (existingAssessmentPeriodElement) {
             if (currentAssessmentPeriod) {
                const assessStart = currentAssessmentPeriod.startDate ? new Date(currentAssessmentPeriod.startDate).toLocaleDateString() : 'N/A';
                const assessEnd = currentAssessmentPeriod.endDate ? new Date(currentAssessmentPeriod.endDate).toLocaleDateString() : 'N/A';
                existingAssessmentPeriodElement.textContent = `Current Assessment Period (${currentAssessmentPeriod.year}): ${assessStart} - ${assessEnd}`;
            } else {
                existingAssessmentPeriodElement.textContent = 'Current Assessment Period: Not Set';
            }
        }
        // Also update the values in the period settings form if needed
        const appStartDateInput = document.getElementById('applicationStartDate');
        const appEndDateInput = document.getElementById('applicationEndDate');
        const assessStartDateInput = document.getElementById('assessmentStartDate');
        const assessEndDateInput = document.getElementById('assessmentEndDate');

        if (appStartDateInput && currentApplicationPeriod?.startDate) appStartDateInput.valueAsDate = new Date(currentApplicationPeriod.startDate);
        if (appEndDateInput && currentApplicationPeriod?.endDate) appEndDateInput.valueAsDate = new Date(currentApplicationPeriod.endDate);
        if (assessStartDateInput && currentAssessmentPeriod?.startDate) assessStartDateInput.valueAsDate = new Date(currentAssessmentPeriod.startDate);
        if (assessEndDateInput && currentAssessmentPeriod?.endDate) assessEndDateInput.valueAsDate = new Date(currentAssessmentPeriod.endDate);

    };
    // --- End function ---


    // --- Socket Event Listeners ---
    socket.on('connect', () => {
        console.log('Admin Staff Page Socket Connected:', socket.id);
    });

    socket.on('disconnect', () => {
        console.log('Admin Staff Page Socket Disconnected');
    });

    // <<< Listen for Assessment Slot Updates >>>
    socket.on('assessmentSlotUpdate', (data) => {
        console.log('Admin received assessmentSlotUpdate:', data);
        const { action, slot } = data;
        const currentWeek = weekFilterDropdown.value;
        const currentDept = departmentFilter.value;
        const currentTab = document.querySelector('.tab-button.active')?.dataset.tab;

        // Only update schedule grid if relevant and schedule tab is active
        if (currentTab === 'schedule-tab' && slot.department === currentDept && slot.year.toString() === currentAssessmentPeriod?.year.toString()) {
            // Check if the slot's date falls within the selected week (more robust check needed)
            // Simple check: just refresh if the week dropdown has a value
            if (currentWeek) {
                console.log("Relevant slot update received for schedule tab. Refreshing week view.");
                handleWeekChange(); // Re-fetch and re-render the week's schedule
            }
        }
    });

    // <<< Listen for New Staff Submissions >>>
    socket.on('newStaffSubmission', (submissionData) => {
        console.log('Admin received newStaffSubmission:', submissionData);
        const currentYearFilterVal = submissionYearFilter.value; // Use the filter value
        const currentStatus = submissionStatusFilter.value;
        const currentDept = submissionDepartmentFilter.value;
        const currentTab = document.querySelector('.tab-button.active')?.dataset.tab;

        // Only add if submissions tab is active and filters match
        if (currentTab === 'submissions-tab' &&
            submissionData.schoolYear === currentYearFilterVal && // Compare with filter value
            (currentStatus === 'All' || submissionData.result === currentStatus) &&
            (currentDept === 'All' || submissionData.preferredDepartment === currentDept))
        {
            console.log("New submission matches filters. Adding row.");
            // Add row to table (or re-fetch for simplicity)
            // Simpler: Re-fetch and re-render
            handleSubmissionFilterChange();
        }
    });

    // <<< ADD Listener for Application Period Updates >>>
    socket.on('applicationPeriodUpdated', (updatedPeriod) => {
        console.log('Received applicationPeriodUpdated:', updatedPeriod);
        // Update state only if the year matches the currently viewed year (if applicable)
        // For simplicity, let's assume we always update if the year matches the global currentYear
        if (updatedPeriod && updatedPeriod.year.toString() === currentYear) {
            currentApplicationPeriod = updatedPeriod;
            console.log('Updated currentApplicationPeriod:', currentApplicationPeriod);
            updateDisplayedPeriods(); // Update the UI
            // Potentially re-evaluate schedule/submission visibility based on new dates
            // e.g., call handleWeekChange() if schedule tab is active
        }
    });

    // <<< ADD Listener for Assessment Period Updates >>>
    socket.on('assessmentPeriodUpdated', (updatedPeriod) => {
        console.log('Received assessmentPeriodUpdated:', updatedPeriod);
        if (updatedPeriod && updatedPeriod.year.toString() === currentYear) {
            currentAssessmentPeriod = updatedPeriod;
            console.log('Updated currentAssessmentPeriod:', currentAssessmentPeriod);
            updateDisplayedPeriods();

            console.log("Repopulating week dropdown due to assessment period update.");
            const populated = populateWeekDropdown(); // Repopulate

            // <<< Select first week and load schedule if populated >>>
            if (populated && weekFilterDropdown.options.length > 1) { // Check if weeks were added
                weekFilterDropdown.selectedIndex = 1; // Select the first actual week
                console.log("Defaulting to first week:", weekFilterDropdown.value);
                // Trigger schedule load if schedule tab is active
                const activeTab = document.querySelector('.tab-button.active')?.dataset.tab;
                if (activeTab === 'schedule-tab') {
                    console.log("Schedule tab active, loading schedule for the first week.");
                    handleWeekChange(); // Load schedule for the newly selected first week
                }
            }
            // <<< End select first week >>>
        }
    });
    // --- End Socket Event Listeners ---


    // --- Helper Functions ---
    const parseDateStringToLocalMidnight = (dateStr) => {
        // Helper to parse YYYY-MM-DD to local midnight Date object
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
    const fetchApplicationPeriod = async (key = 'JoinGFM', year = null) => {
        try {
            let url = `/admin/application-period?key=${key}`; // FIX: Use singular 'application-period'
            if (year) url += `&year=${year}`;
            console.log("Fetching application period from:", url);
            const response = await fetch(url);
            console.log(`[fetchApplicationPeriod] Response Status: ${response.status}`); // More specific log

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`[fetchApplicationPeriod] Application period not found for key=${key}, year=${year}`);
                    return null; // Explicitly return null on 404
                }
                let errorText = `Status: ${response.statusText}`;
                try {
                    errorText = await response.text();
                } catch (textError) {
                    console.error("[fetchApplicationPeriod] Could not read error response text:", textError);
                }
                console.error(`[fetchApplicationPeriod] Failed (${response.status}): ${errorText}`);
                throw new Error(`Failed to fetch application period: ${response.statusText}`);
            }

            const data = await response.json();
            console.log("[fetchApplicationPeriod] Data received:", data); // Log the parsed data
            if (typeof data === 'undefined') {
                console.warn("[fetchApplicationPeriod] response.json() resulted in undefined. Returning null.");
                return null;
            }
            return data;

        } catch (error) {
            console.error('[fetchApplicationPeriod] Error caught:', error);
            return null; // Explicitly return null on any error
        }
    };

    const fetchAssessmentPeriod = async (year = null) => {
         try {
            let url = `/admin/assessment-period`; // FIX: Use singular 'assessment-period'
            if (year) url += `?year=${year}`;
            console.log("Fetching assessment period from URL:", url);
            const response = await fetch(url);
            console.log(`[fetchAssessmentPeriod] Response Status: ${response.status}`); // More specific log

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`[fetchAssessmentPeriod] Assessment period not found for year ${year}`);
                    return null; // Explicitly return null on 404
                }
                let errorText = `Status: ${response.statusText}`;
                try {
                    errorText = await response.text();
                } catch (textError) {
                     console.error("[fetchAssessmentPeriod] Could not read error response text:", textError);
                }
                console.error(`[fetchAssessmentPeriod] Failed (${response.status}): ${errorText}`);
                throw new Error(`Failed to fetch assessment period: ${response.statusText}`);
            }

            const data = await response.json();
            console.log("[fetchAssessmentPeriod] Data received:", data); // Log the parsed data
            if (typeof data === 'undefined') {
                console.warn("[fetchAssessmentPeriod] response.json() resulted in undefined. Returning null.");
                return null;
            }
            return data;

        } catch (error) {
            console.error('[fetchAssessmentPeriod] Error caught:', error);
            return null; // Explicitly return null on any error
        }
    };

    // --- Schedule Display and Interaction ---

    // Fetch and display slots for the selected week/department
    const handleWeekChange = async () => {
        // Store fetched slots in currentSlotsForWeek
        const selectedWeekStartDate = weekFilterDropdown.value;
        const currentDepartment = departmentFilter.value;
        // Ensure currentYear is correctly set (e.g., from assessment period or default)
        const yearToFetch = currentAssessmentPeriod ? currentAssessmentPeriod.year.toString() : new Date().getFullYear().toString();

        if (!selectedWeekStartDate || !currentDepartment) {
            currentSlotsForWeek = []; // Clear cache
            displaySchedules([], null); // Clear grid
            return;
        }

        console.log(`Fetching slots for week: ${selectedWeekStartDate}, Dept: ${currentDepartment}, Year: ${yearToFetch}`);
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
            currentSlotsForWeek = await response.json(); // Update cache
            console.log("Fetched slots for week:", currentSlotsForWeek);

            // Pass the fetched slots to displaySchedules
            displaySchedules(currentSlotsForWeek, selectedWeekStartDate);

        } catch (error) {
            console.error('Error fetching slots for week:', error);
            currentSlotsForWeek = []; // Clear cache on error
            displaySchedules([], null); // Clear grid
            // Optionally display error message
        }
    };

    // Update the grid based on fetched slots
    const displaySchedules = (slotsForWeek = [], weekStartDateString = null) => {
        const slotMap = new Map();
        slotsForWeek.forEach(slot => {
            const slotYear = typeof slot.year === 'number' ? slot.year.toString() : slot.year;
            // Ensure date is in YYYY-MM-DD format before using as key
            const slotDateKey = slot.date.includes('T') ? slot.date.split('T')[0] : slot.date;
            const key = `${slotDateKey}_${slot.time}`;
            slotMap.set(key, { ...slot, year: slotYear });
        });

        const isWeeklyView = !!weekStartDateString;
        let periodStartDate = null; // <<< Use period start date
        let periodEndDate = null;
        let weekStart = null; // Sunday of the selected week

        // <<< Get period start date as well >>>
        if (currentAssessmentPeriod?.startDate) {
             periodStartDate = parseDateStringToLocalMidnight(currentAssessmentPeriod.startDate);
        }
        if (currentAssessmentPeriod?.endDate) {
            periodEndDate = parseDateStringToLocalMidnight(currentAssessmentPeriod.endDate);
        }
        if (isWeeklyView) {
            weekStart = parseDateStringToLocalMidnight(weekStartDateString); // Parse the week start date string (Sunday)
        }

        // Ensure weekStart is a valid date before proceeding
        if (!isWeeklyView || !weekStart || isNaN(weekStart.getTime())) {
             console.warn("displaySchedules: Invalid or missing weekStartDateString", weekStartDateString);
             // Optionally clear the grid or show an error message
             scheduleButtons.forEach(button => {
                 button.classList.add('past');
                 button.textContent = 'Error';
                 button.disabled = true;
                 button.onclick = null;
             });
             return;
        }

        const weekStartDayIndex = weekStart.getDay(); // Should always be 0 (Sunday)

        // <<< Make sure scheduleButtons is defined before this loop >>>
        if (!scheduleButtons || scheduleButtons.length === 0) {
            console.error("displaySchedules: Could not find schedule buttons in the DOM.");
            return; // Stop if buttons aren't found
        }

        scheduleButtons.forEach(button => { // <<< Now scheduleButtons should be defined
            const dayName = button.dataset.day; // "Monday", "Tuesday", etc.
            const time = button.dataset.time;

            let dateString = '';
            let buttonDate = new Date(NaN);
            const dayIndices = { "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 0 };
            const targetDayIndex = dayIndices[dayName];

            // Calculate date for this button based on the week's Sunday start
            if (typeof targetDayIndex === 'number') {
                buttonDate = new Date(weekStart); // Start from the week's Sunday
                buttonDate.setDate(buttonDate.getDate() + targetDayIndex); // Add offset to get to target day

                const y = buttonDate.getFullYear();
                const m = (buttonDate.getMonth() + 1).toString().padStart(2, '0');
                const d = buttonDate.getDate().toString().padStart(2, '0');
                dateString = `${y}-${m}-${d}`;
                button.dataset.date = dateString;
            } else {
                button.dataset.date = '';
            }

            const key = `${dateString}_${time}`;
            const slotData = slotMap.get(key);

            button.classList.remove('available', 'booked', 'past', 'implicitly-available');
            button.disabled = true;
            button.textContent = time;
            // <<< REMOVE ALL button.onclick assignments from here >>>
            // button.onclick = null; // Keep this reset if using addEventListener, otherwise remove

            // --- Refined Validity Checks ---
            const isValidButtonDate = !isNaN(buttonDate.getTime());
            const isSchoolDay = targetDayIndex >= 1 && targetDayIndex <= 5; // Monday to Friday

            // Check if the button's date falls within the assessment period boundaries
            const isInPeriod = isValidButtonDate &&
                               (!periodStartDate || buttonDate >= periodStartDate) &&
                               (!periodEndDate || buttonDate <= periodEndDate);

            // Check if the button's date is in the past relative to the start of today
            const today = new Date();
            const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const isPastDate = isValidButtonDate && buttonDate < startOfToday;
            // --- End Refined Checks ---


            // Determine button state ONLY if it's a valid date and a school day
            if (isValidButtonDate && isSchoolDay) {
                if (isInPeriod) { // Is this school day within the assessment period?
                    if (isPastDate) { // Is it a past school day within the period?
                         button.classList.add('past');
                         button.textContent = 'Past';
                         // Keep disabled
                    } else { // It's a future or current school day within the period
                        if (slotData) { // Slot exists in DB
                            if (slotData.application) { // Booked
                                button.classList.add('booked');
                                button.textContent = `${slotData.applicantName || 'Booked'} (${slotData.applicantSection || 'N/A'})`;
                                button.disabled = false;
                                // <<< Set data attributes for the main listener >>>
                                button.dataset.slotId = ''; // Clear slotId
                                button.dataset.applicationId = typeof slotData.application === 'object' && slotData.application !== null
                                                                ? slotData.application._id
                                                                : slotData.application; // Store application ID
                                // button.onclick = () => showApplicationDetails(appId); // <<< REMOVE
                            } else { // Available
                                button.classList.add('available');
                                button.textContent = 'Available';
                                button.disabled = false;
                                // <<< Set data attributes for the main listener >>>
                                button.dataset.slotId = slotData._id; // Store slot ID for deletion
                                button.dataset.applicationId = ''; // Clear applicationId
                                // button.onclick = () => deleteAvailableSlot(slotData._id); // <<< REMOVE
                            }
                        } else { // Slot doesn't exist in DB - implicitly available future slot
                            button.classList.add('implicitly-available');
                            button.disabled = false;
                            button.textContent = ''; // Blank text
                            // <<< Set data attributes for the main listener >>>
                            button.dataset.slotId = ''; // Clear slotId
                            button.dataset.applicationId = ''; // Clear applicationId
                            // button.onclick = () => makeSlotAvailableForAssessment(dateString, time, departmentFilter.value, currentAssessmentPeriod?.year); // <<< REMOVE
                        }
                    }
                } else { // School day, but outside the assessment period
                    button.classList.add('past'); // Style as unavailable/past
                    button.textContent = 'N/A';
                    button.dataset.slotId = ''; // Clear attributes
                    button.dataset.applicationId = '';
                    // Keep disabled
                }
            } else { // Not a school day (Sat/Sun) or invalid date calculation
                 button.classList.add('past'); // Style as unavailable/past
                 button.textContent = ''; // Blank text for Sat/Sun
                 button.dataset.slotId = ''; // Clear attributes
                 button.dataset.applicationId = '';
                 // Keep disabled
            }
        });
    };
    // --- End displaySchedules ---

    // --- Submission Tab Functions ---
    const fetchDistinctSubmissionYears = async () => {
        try {
            const response = await fetch('/admin/submission-years'); // Ensure this route exists and is mounted correctly
            if (!response.ok) {
                throw new Error(`Failed to fetch submission years: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching submission years:', error);
            return [currentYear]; // Fallback
        }
    };

    const populateSubmissionYearFilter = (years) => {
        if (!submissionYearFilter) return;
        submissionYearFilter.innerHTML = '';
        let currentYearExists = false;
        years.forEach(year => {
            const option = new Option(year, year);
            submissionYearFilter.add(option);
            if (year === currentYear) {
                currentYearExists = true;
            }
        });
        if (currentYearExists) {
            submissionYearFilter.value = currentYear;
        } else if (years.length > 0) {
            submissionYearFilter.value = years[0];
            // currentYear = years[0]; // Don't change the global currentYear based on submissions only
        } else {
             submissionYearFilter.innerHTML = '<option value="">No Data</option>';
             submissionYearFilter.disabled = true;
        }
    };

    const fetchSubmissions = async () => {
        if (!submissionYearFilter || !submissionStatusFilter || !submissionDepartmentFilter) {
            console.error("Submission filter elements not found.");
            return [];
        }
        const year = submissionYearFilter.value;
        const status = submissionStatusFilter.value;
        const department = submissionDepartmentFilter.value;

        if (!year) {
            console.log("Submission year not selected.");
            if (submissionsTableBody) submissionsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 15px;">Please select a year.</td></tr>`;
            return [];
        }

        try {
            const url = `/admin/submissions?year=${year}&status=${status}&department=${encodeURIComponent(department)}`;
            console.log("Fetching submissions from:", url);
            const response = await fetch(url); // Ensure this route exists and is mounted correctly
            if (!response.ok) {
                throw new Error(`Failed to fetch submissions: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching submissions:', error);
            if (submissionsTableBody) {
                submissionsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red; padding: 15px;">Error loading submissions.</td></tr>`;
            }
            return [];
        }
    };

    const renderSubmissionsTable = (submissions) => {
        if (!submissionsTableBody) return;
        submissionsTableBody.innerHTML = '';

        if (!submissions || submissions.length === 0) {
            submissionsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 15px;">No submissions found matching the criteria.</td></tr>`;
            return;
        }

        submissions.forEach(sub => {
            const row = submissionsTableBody.insertRow();
            const name = `${sub.lastName}, ${sub.firstName}${sub.middleInitial ? ' ' + sub.middleInitial + '.' : ''}${sub.suffix ? ' ' + sub.suffix : ''}`;
            row.insertCell().textContent = name;
            row.insertCell().textContent = sub.studentNumber;
            row.insertCell().textContent = sub.preferredDepartment;
            row.insertCell().textContent = sub.result;
            const actionCell = row.insertCell();
            actionCell.style.textAlign = 'center';
            const selectButton = document.createElement('button');
            selectButton.textContent = 'Select';
            selectButton.classList.add('select-submission-btn');
            selectButton.dataset.id = sub._id;
            selectButton.addEventListener('click', handleSelectSubmission);
            actionCell.appendChild(selectButton);
        });
    };

    // --- NEW: Function to clear/reset the detail view ---
    const clearSubmissionDetailView = () => {
        if (submissionDetailContentInline) {
            // Find elements by data-field attribute
            const fullNameField = submissionDetailContentInline.querySelector('[data-field="fullName"]');
            const otherFields = submissionDetailContentInline.querySelectorAll('[data-field]:not([data-field="fullName"])');

            if (fullNameField) {
                fullNameField.value = '--- Select a submission ---'; // Set value for input/textarea
            }
            otherFields.forEach(field => {
                field.value = '---'; // Set value for input/textarea
            });
        }
        if (submissionResultUpdate) {
            submissionResultUpdate.value = 'Pending'; // Reset dropdown
            submissionResultUpdate.disabled = true; // Disable dropdown
        }
        if (saveSubmissionResultBtn) {
            saveSubmissionResultBtn.disabled = true; // Disable save button
        }
        currentSelectedSubmissionId = null; // Clear selection ID
        // De-highlight selected row (optional)
        if (submissionsTableBody) {
            submissionsTableBody.querySelectorAll('tr.selected-row').forEach(row => row.classList.remove('selected-row'));
        }
    };

    // --- MODIFIED: Clear detail view when filters change ---
    const handleSubmissionFilterChange = async () => {
        clearSubmissionDetailView(); // Clear details first
        const submissions = await fetchSubmissions();
        renderSubmissionsTable(submissions);
    };

    // --- NEW: Reusable function to fetch and display submission details by ID ---
    const displaySubmissionDetailsById = async (submissionId) => {
        if (!submissionId) {
            console.error("No submission ID provided to displaySubmissionDetailsById");
            clearSubmissionDetailView(); // Clear view if ID is missing
            return false; // Indicate failure
        }

        console.log("Fetching and displaying details for submission:", submissionId);
        showSpinner(); // Show spinner while fetching

        try {
            // Fetch full submission details using the ID
            const response = await fetch(`/admin/submissions?id=${submissionId}`); // Use existing endpoint
            if (!response.ok) throw new Error(`Failed to fetch submission details: ${response.statusText}`);

            const submissions = await response.json(); // Expecting an array
            if (!submissions || submissions.length === 0) throw new Error('Submission details not found.');
            const details = submissions[0];

            // Populate the inline view using input/textarea values
            if (submissionDetailContentInline) {
                // Helper function to set value safely
                const setFieldValue = (fieldName, value) => {
                    const field = submissionDetailContentInline.querySelector(`[data-field="${fieldName}"]`);
                    if (field) {
                        field.value = value || 'N/A'; // Set value, fallback to 'N/A'
                    } else {
                        console.warn(`Field with data-field="${fieldName}" not found.`);
                    }
                };

                // Populate fields using data-field attributes
                setFieldValue('fullName', `${details.lastName}, ${details.firstName}${details.middleInitial ? ' ' + details.middleInitial + '.' : ''}${details.suffix ? ' ' + details.suffix : ''}`);
                setFieldValue('studentNumber', details.studentNumber);
                setFieldValue('dlsudEmail', details.dlsudEmail);
                setFieldValue('college', details.college);
                setFieldValue('program', details.program);
                setFieldValue('collegeYearSection', details.collegeYear && details.section ? `${details.collegeYear} / ${details.section}` : 'N/A');
                setFieldValue('facebookUrl', details.facebookUrl);
                setFieldValue('affiliatedOrgsList', details.affiliatedOrgsList?.notApplicable ? 'N/A' : details.affiliatedOrgsList?.listInput);
                setFieldValue('preferredDepartment', details.preferredDepartment);
                // Format schedule display
                let scheduleText = 'N/A';
                if (details.preferredSchedule && details.preferredSchedule.date && details.preferredSchedule.time) {
                     try {
                         const scheduleDate = new Date(details.preferredSchedule.date);
                         scheduleText = `${scheduleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${details.preferredSchedule.time})`;
                     } catch (e) {
                         scheduleText = `${details.preferredSchedule.date} (${details.preferredSchedule.time})`; // Fallback
                     }
                }
                setFieldValue('preferredSchedule', scheduleText);
                setFieldValue('schoolYear', details.schoolYear);
                setFieldValue('staffApplicationReasons', details.staffApplicationReasons);
                setFieldValue('departmentApplicationReasons', details.departmentApplicationReasons);
                setFieldValue('greenFmContribution', details.greenFmContribution);

                // Set and enable the result dropdown and save button
                if (submissionResultUpdate) {
                    submissionResultUpdate.value = details.result;
                    submissionResultUpdate.disabled = false; // Enable
                }
                 if (saveSubmissionResultBtn) {
                    saveSubmissionResultBtn.disabled = false; // Enable
                }
                currentSelectedSubmissionId = submissionId; // Update the currently selected ID
                return true; // Indicate success
            } else {
                console.error("Submission detail content area not found.");
                return false; // Indicate failure
            }

        } catch (error) {
            console.error("Error fetching/displaying submission details:", error);
            alert(`Error loading submission details: ${error.message}`);
            clearSubmissionDetailView(); // Clear view on error
            return false; // Indicate failure
        } finally {
            hideSpinner(); // Hide spinner
        }
    };
    // --- End new reusable function ---

    // --- Modify handleSelectSubmission to use the new function ---
    const handleSelectSubmission = async (event) => {
        const button = event.target;
        const submissionId = button.dataset.id;
        if (!submissionId) return;

        // Highlight selected row (optional)
        if (submissionsTableBody) {
            submissionsTableBody.querySelectorAll('tr.selected-row').forEach(row => row.classList.remove('selected-row'));
            button.closest('tr')?.classList.add('selected-row');
        }

        await displaySubmissionDetailsById(submissionId); // Call the reusable function
    };
    // --- End modification ---

    // --- Function to Save Submission Result ---
    const handleSaveSubmissionResult = async () => {
        if (!currentSelectedSubmissionId) {
            alert("Please select a submission first.");
            return;
        }
        if (!submissionResultUpdate) {
            console.error("Result update dropdown not found.");
            alert("Error: Result dropdown element is missing.");
            return;
        }

        const newResult = submissionResultUpdate.value;

        // <<< ADD CHECK FOR 'Pending' >>>
        if (newResult === 'Pending') {
            alert("Please select either 'Accepted' or 'Rejected' to save the result.");
            return; // Stop execution if 'Pending' is selected
        }
        // <<< END CHECK >>>

        console.log(`Attempting to save result "${newResult}" for submission ID: ${currentSelectedSubmissionId}`);
        showSpinner();

        try {
            const response = await fetch(`/admin/submissions/${currentSelectedSubmissionId}/result`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ result: newResult })
            });

            // ... (rest of the try block) ...
             if (!response.ok) {
                // <<< Improved Error Handling for non-JSON responses >>>
                let errorData;
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    errorData = await response.json();
                } else {
                    // Handle HTML or text responses (like the 404 page)
                    const errorText = await response.text();
                    console.error("Non-JSON error response:", errorText);
                    errorData = { message: `Server returned non-JSON response (Status: ${response.status})` };
                }
                throw new Error(errorData.message || `Failed to update result (${response.status})`);
            }
            // <<< End Improved Error Handling >>>


            const updatedSubmission = await response.json();
            console.log("Submission result updated successfully:", updatedSubmission);
            alert(`Submission result updated to "${newResult}".`);

            // Optional: Update the table row visually (or rely on socket event if implemented)
            if (submissionsTableBody) {
                const rowButton = submissionsTableBody.querySelector(`button.select-submission-btn[data-id="${currentSelectedSubmissionId}"]`);
                const row = rowButton?.closest('tr');
                if (row && row.cells.length > 3) { // Ensure row and cell exist
                    row.cells[3].textContent = newResult; // Update the result cell (index 3)
                }
            }

        } catch (error) {
            console.error("Error saving submission result:", error);
            alert(`Error saving result: ${error.message}`);
        } finally {
            hideSpinner();
        }
    };
    // --- End Function to Save Submission Result ---


    // --- Function to Handle Tab Switching ---
    const handleTabSwitch = async (event) => {
        const clickedButton = event.currentTarget; // The button the listener is attached to
        const targetTabId = clickedButton.dataset.tab; // e.g., 'schedule-tab', 'submissions-tab'

        if (!targetTabId) {
            console.error("Clicked tab button is missing data-tab attribute.");
            return;
        }

        // Remove 'active' from all buttons and panes
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));

        // Add 'active' to the clicked button and corresponding pane
        clickedButton.classList.add('active');
        const targetPane = document.getElementById(targetTabId);
        if (targetPane) {
            targetPane.classList.add('active');
        } else {
            console.error(`Could not find tab pane with ID: ${targetTabId}`);
            return; // Stop if pane not found
        }

        console.log(`Switched to tab: ${targetTabId}`);

        // Load data for the newly activated tab
        if (targetTabId === 'schedule-tab') {
            // Load schedule data if week is selected
            if (weekFilterDropdown && weekFilterDropdown.value) {
                await handleWeekChange();
            } else {
                // Optionally clear schedule grid or show message
                displaySchedules([], null);
            }
        } else if (targetTabId === 'submissions-tab') {
            // Load submissions data
            await handleSubmissionFilterChange();
        } else if (targetTabId === 'settings-tab') {
            // Load settings data or perform actions if needed
            // e.g., fetch periods again if they might change elsewhere
            // await updateDisplayedPeriods(); // Maybe just update display
        }
    };
    // --- End Function to Handle Tab Switching ---


    // --- Event Listeners ---

    // Schedule Tab Listeners
    if (weekFilterDropdown) weekFilterDropdown.addEventListener('change', handleWeekChange);
    if (departmentFilter) departmentFilter.addEventListener('change', handleWeekChange);

    // <<< ADD DECLARATION HERE, right before use >>>
    const scheduleTableBody = document.getElementById('schedule-body');

    console.log("DEBUG: Checking scheduleTableBody before listener:", typeof scheduleTableBody, scheduleTableBody);

    try {
        scheduleTableBody.addEventListener('click', async (event) => {
            if (!event.target.matches('.schedule-button')) {
                return;
            }
            const btn = event.target;
            event.preventDefault();
            if (btn.disabled) {
                console.log("Clicked a disabled slot.");
                return;
            }

            const slotId = btn.dataset.slotId;
            const applicationId = btn.dataset.applicationId; // This is the ApplyStaff (_id)

            // --- MODIFIED LOGIC FOR BOOKED SLOTS ---
            if (applicationId) { // Case 1: Booked slot
                console.log("Clicked booked slot, switching to submissions tab for application:", applicationId);

                // 1. Switch Tab UI
                const submissionsTabButton = document.querySelector('.tab-button[data-tab="submissions-tab"]');
                const scheduleTabButton = document.querySelector('.tab-button[data-tab="schedule-tab"]');
                const submissionsPane = document.getElementById('submissions-tab');
                const schedulePane = document.getElementById('schedule-tab');

                if (submissionsTabButton && scheduleTabButton && submissionsPane && schedulePane) {
                    scheduleTabButton.classList.remove('active');
                    submissionsTabButton.classList.add('active');
                    schedulePane.classList.remove('active');
                    submissionsPane.classList.add('active');
                    console.log("Switched UI to Submissions tab."); // Add log
                } else {
                    console.error("Could not find tab elements to switch.");
                    return; // Stop if tabs can't be switched
                }

                // <<< ADD STEP 2: Load the submissions table content >>>
                console.log("Triggering submission table load...");
                await handleSubmissionFilterChange(); // This fetches and renders the table
                console.log("Submission table load triggered.");
                // <<< END ADD STEP 2 >>>


                // 3. Fetch and Populate Details for the specific application
                console.log("Populating details for specific application:", applicationId);
                const success = await displaySubmissionDetailsById(applicationId);

                // 4. Optional: Scroll to the detail view
                if (success && submissionDetailContentInline) { // Check element exists
                    console.log("Scrolling detail view into view.");
                    submissionDetailContentInline.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }

                // 5. Optional: Highlight row in submissions table (if visible)
                if (success && submissionsTableBody) { // Check element exists
                     console.log("Attempting to highlight row in table for:", applicationId);
                     submissionsTableBody.querySelectorAll('tr.selected-row').forEach(row => row.classList.remove('selected-row'));
                     // Find the button within the newly rendered table
                     const rowButton = submissionsTableBody.querySelector(`button.select-submission-btn[data-id="${applicationId}"]`);
                     if (rowButton) {
                         rowButton.closest('tr')?.classList.add('selected-row');
                         console.log("Highlighted row.");
                     } else {
                         console.log("Row button not found in table after render.");
                     }
                }


            // --- KEEP EXISTING LOGIC for available/implicitly-available ---
            } else if (btn.classList.contains('available') && slotId) {
                 console.log("Clicked available slot, confirming deletion for slot:", slotId);
                 const time = btn.dataset.time;
                 const buttonDateString = btn.dataset.date;
                 const confirmationMessage = `${buttonDateString} - ${time} is marked as available. Do you want to make it unavailable again?`;
                 if (confirm(confirmationMessage)) {
                     await deleteAvailableSlot(slotId);
                 } else {
                     console.log("User cancelled deleting available slot.");
                 }

            } else if (btn.classList.contains('implicitly-available')) {
                 console.log("Clicked implicitly available slot.");
                 const time = btn.dataset.time;
                 const buttonDateString = btn.dataset.date;
                 const currentDept = departmentFilter.value;
                 const year = currentAssessmentPeriod ? currentAssessmentPeriod.year.toString() : new Date().getFullYear().toString();

                 if (!buttonDateString) {
                      console.error("Button is missing pre-calculated data-date attribute.", btn);
                      alert("Could not determine the date for this slot. Please refresh.");
                      return;
                 }

                 let actualDayName = 'Unknown Day';
                 try {
                     const buttonDateObject = parseDateStringToLocalMidnight(buttonDateString);
                     if (!isNaN(buttonDateObject.getTime())) {
                         actualDayName = buttonDateObject.toLocaleDateString('en-US', { weekday: 'long' });
                     } else {
                          console.error("Could not parse button date string:", buttonDateString);
                     }
                 } catch (e) {
                     console.error("Error parsing button date string to get day name:", e);
                 }

                 if (confirm(`Mark ${actualDayName}, ${time} (${buttonDateString}) as available for assessment in ${currentDept}?`)) {
                     await makeSlotAvailableForAssessment(buttonDateString, time, currentDept, year);
                 } else {
                     console.log("User cancelled marking slot available.");
                 }
            }
        });
        console.log("DEBUG: Event listener attached successfully.");
    } catch (error) {
         console.error("DEBUG: Error attaching event listener:", error);
    }
    // --- End modification ---

    if (scheduleModalCloseButton) scheduleModalCloseButton.addEventListener('click', () => { if (scheduleModal) scheduleModal.style.display = 'none'; if (applicationDetailsView) applicationDetailsView.style.display = 'none'; });

    // --- Update savePeriods function ---
    const savePeriods = async () => {
        if (!periodSettingsForm) return false;

        // --- Get references to your form inputs ---
        const appStartDateInput = document.getElementById('applicationStartDate');
        const appEndDateInput = document.getElementById('applicationEndDate');
        const assessStartDateInput = document.getElementById('assessmentStartDate');
        const assessEndDateInput = document.getElementById('assessmentEndDate');

        // Check if essential date inputs exist
        if (!appStartDateInput || !appEndDateInput || !assessStartDateInput || !assessEndDateInput) {
            alert("Error: One or more period setting input fields are missing in the HTML.");
            return false;
        }

        // Read date values
        const appStartDate = appStartDateInput.value;
        const appEndDate = appEndDateInput.value;
        const assessStartDate = assessStartDateInput.value;
        const assessEndDate = assessEndDateInput.value;

        // --- Derive Year ---
        let year = null;
        if (appStartDate) {
            year = new Date(appStartDate).getFullYear();
        } else if (assessStartDate) {
            year = new Date(assessStartDate).getFullYear();
        }
        if (!year && (appStartDate || assessStartDate)) {
             alert("Could not determine the year from the provided start dates. Please ensure dates are valid.");
             return false;
        }

        // --- Basic Validation ---
        if ((appStartDate && !appEndDate) || (!appStartDate && appEndDate)) { alert("Please provide both start and end dates for the Application Period, or leave both blank."); return false; }
        if ((assessStartDate && !assessEndDate) || (!assessStartDate && assessEndDate)) { alert("Please provide both start and end dates for the Assessment Period, or leave both blank."); return false; }
        if (appStartDate && appEndDate && new Date(appEndDate) < new Date(appStartDate)) { alert("Application Period end date cannot be before the start date."); return false; }
        if (assessStartDate && assessEndDate && new Date(assessEndDate) < new Date(assessStartDate)) { alert("Assessment Period end date cannot be before the start date."); return false; }

        // <<< ADD THIS VALIDATION >>>
        if (appStartDate && assessStartDate && new Date(assessStartDate) <= new Date(appStartDate)) {
            alert("Assessment Period start date must be after the Application Period start date.");
            return false; // Prevent saving
        }
        // <<< END ADDED VALIDATION >>>

        // --- End Validation ---

        showSpinner();
        let success = true;
        let appSaved = false;
        let assessSaved = false;

        try {
            // --- Save Application Period (if dates provided) ---
            if (appStartDate && appEndDate && year) {
                console.log(`Saving Application Period for ${year}: ${appStartDate} - ${appEndDate}`);
                const appPayload = {
                    key: 'JoinGFM',
                    year: year,
                    startDate: appStartDate,
                    endDate: appEndDate
                };
                // Use POST or PUT depending on your backend route setup
                const appResponse = await fetch(`/admin/application-period`, { // <<< Full path
                    method: 'POST', // Or 'PUT'
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(appPayload)
                });

                if (!appResponse.ok) {
                    const errorData = await appResponse.json();
                    // Add specific conflict handling if needed for ApplicationPeriod endpoint
                    throw new Error(`Failed to save Application Period: ${errorData.error || errorData.message || appResponse.statusText}`);
                }
                console.log("Application Period saved successfully.");
                appSaved = true;
            } else {
                 console.log("Skipping Application Period save (dates not provided or year missing).");
            }

            // --- Save Assessment Period (if dates provided) ---
            if (assessStartDate && assessEndDate && year) {
                console.log(`Saving Assessment Period for ${year}: ${assessStartDate} - ${assessEndDate}`);
                const assessPayload = {
                    year: year,
                    startDate: assessStartDate,
                    endDate: assessEndDate
                };
                 // Use POST or PUT depending on your backend route setup
                const assessResponse = await fetch(`/admin/assessment-period`, { // <<< Full path
                    method: 'POST', // Or 'PUT'
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(assessPayload)
                });

                if (!assessResponse.ok) {
                    const errorData = await assessResponse.json();
                     // Add specific conflict handling if needed for AssessmentPeriod endpoint
                    throw new Error(`Failed to save Assessment Period: ${errorData.error || errorData.message || assessResponse.statusText}`);
                }
                console.log("Assessment Period saved successfully.");
                assessSaved = true;
            } else {
                 console.log("Skipping Assessment Period save (dates not provided or year missing).");
            }

            // --- Final Alert ---
            if (appSaved || assessSaved) {
                alert("Period settings saved successfully!");
            } else {
                alert("No period dates were provided to save.");
                success = false;
            }

        } catch (error) {
            console.error("Error saving period settings:", error);
            alert(`Error saving settings: ${error.message}`);
            success = false;
        } finally {
            hideSpinner();
        }
        return success;
    };
    // --- End savePeriods function ---

    // Period Settings Form Listener
    if (periodSettingsForm) {
        periodSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Period settings form submitted."); // Updated log

            // <<< CALL the save function and refresh if successful >>>
            const savedSuccessfully = await savePeriods();
            if (savedSuccessfully) {
                console.log("Refreshing page data after saving periods.");
                // Don't call initializeAdminPage directly, rely on socket events for updates
                // await initializeAdminPage(); // Refresh data on the page
            }
            // <<< END CALL >>>
        });
     }

    // Submission Tab Listeners
    if (submissionYearFilter) submissionYearFilter.addEventListener('change', handleSubmissionFilterChange);
    if (submissionStatusFilter) submissionStatusFilter.addEventListener('change', handleSubmissionFilterChange);
    if (submissionDepartmentFilter) submissionDepartmentFilter.addEventListener('change', handleSubmissionFilterChange);
    if (saveSubmissionResultBtn) saveSubmissionResultBtn.addEventListener('click', handleSaveSubmissionResult); // <<< Line 1040 (approx) - Now the function exists

    // Tab Button Listeners
    tabButtons.forEach(button => button.addEventListener('click', handleTabSwitch));

    // --- Initialization ---
    const initializeAdminPage = async () => {
        showSpinner();
        try {
            // Fetch initial periods
            currentApplicationPeriod = await fetchApplicationPeriod('JoinGFM', currentYear);
            currentAssessmentPeriod = await fetchAssessmentPeriod(currentYear);
            console.log(`Assigned application period for ${currentYear}:`, currentApplicationPeriod);
            console.log(`Assigned assessment period for ${currentYear}:`, currentAssessmentPeriod);

            updateDisplayedPeriods(); // Update display on initial load

            // Populate week dropdown initially
            const populated = populateWeekDropdown();

            // Fetch initial submission years
            const submissionYears = await fetchDistinctSubmissionYears();
            populateSubmissionYearFilter(submissionYears);

            // <<< NEW: Set initial department filter based on admin >>>
            if (departmentFilter) {
                const adminDepartment = document.body.dataset.adminDepartment;
                if (adminDepartment) {
                    // Check if the admin's department is a valid option
                    const optionExists = Array.from(departmentFilter.options).some(opt => opt.value === adminDepartment);
                    if (optionExists) {
                        departmentFilter.value = adminDepartment;
                        console.log(`Set initial department filter to admin's department: ${adminDepartment}`);
                    } else {
                        console.warn(`Admin's department "${adminDepartment}" not found in dropdown options. Using default.`);
                        // Optionally set to a default or leave as is
                    }
                } else {
                    console.log("Admin department not found in page data. Using default dropdown value.");
                }
            } else {
                console.warn("Department filter dropdown not found.");
            }
            // <<< END NEW >>>


            // Select first week if populated
            let initialWeekLoaded = false;
            if (populated && weekFilterDropdown.options.length > 1) {
                weekFilterDropdown.selectedIndex = 1; // Select the first actual week
                console.log("Defaulting to first week on initial load:", weekFilterDropdown.value);
                initialWeekLoaded = true;
            }

            // Load initial data based on active tab (will now use the potentially updated department filter)
            const activeTab = document.querySelector('.tab-button.active')?.dataset.tab;
            if (activeTab === 'schedule-tab' && initialWeekLoaded) {
                 console.log("Initial load: Schedule tab active and first week selected. Calling handleWeekChange.");
                 await handleWeekChange();
            } else if (activeTab === 'submissions-tab') {
                 console.log("Initial load: Submissions tab active. Calling handleSubmissionFilterChange.");
                 await handleSubmissionFilterChange();
            }

        } catch (error) {
            console.error("Initialization failed:", error);
            alert("Failed to initialize admin page data.");
        } finally {
            hideSpinner();
        }
    };
    // --- End Initialization ---

    // Initial call
    await initializeAdminPage();

}); // End DOMContentLoaded

// --- SPINNER FUNCTIONS ---
function showSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'block';
}

function hideSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'none';
}
// --- END SPINNER FUNCTIONS ---

// --- Slot Interaction Functions (Placeholder - Implement actual logic) ---
async function deleteAvailableSlot(slotId) {
    console.log(`Attempting to delete available slot: ${slotId}`);
    showSpinner();
    try {
        const response = await fetch(`/admin/assessment-slots/${slotId}`, { method: 'DELETE' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to delete slot (${response.status})`);
        }
        console.log(`Slot ${slotId} deleted successfully.`);
        // No need to manually update UI, rely on socket event 'assessmentSlotUpdate'
        // handleWeekChange(); // Refresh schedule view
    } catch (error) {
        console.error('Error deleting available slot:', error);
        alert(`Error deleting slot: ${error.message}`);
    } finally {
        hideSpinner();
    }
}

async function makeSlotAvailableForAssessment(date, time, department, year) {
    console.log(`Attempting to mark slot as available: ${date}, ${time}, ${department}, ${year}`);

    // <<< REMOVE adminName retrieval and validation >>>
    /*
    const adminName = currentAdminNameObject;
    if (!date || !time || !department || !year || !adminName || !adminName.lastName || !adminName.firstName) {
        alert("Missing data (including admin name) to mark slot as available.");
        console.error("Missing data:", { date, time, department, year, adminName });
        return;
    }
    */
    // <<< Basic validation remains >>>
    if (!date || !time || !department || !year) {
        alert("Missing data to mark slot as available.");
        console.error("Missing data:", { date, time, department, year });
        return;
    }


    showSpinner();
    try {
        const response = await fetch('/admin/assessment-slots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // <<< REMOVE adminName from the body >>>
            body: JSON.stringify({ date, time, department, year })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to mark slot available (${response.status})`);
        }
        console.log(`Slot ${date}, ${time} marked available successfully.`);
        // No need to manually update UI, rely on socket event 'assessmentSlotUpdate'
        // handleWeekChange(); // Refresh schedule view
    } catch (error) {
        console.error('Error marking slot available:', error);
        alert(`Error marking slot available: ${error.message}`);
    } finally {
        hideSpinner();
    }
}
// --- End Slot Interaction Functions ---