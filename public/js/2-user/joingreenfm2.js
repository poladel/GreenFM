document.addEventListener('DOMContentLoaded', async () => {
    // --- Existing variables ---
    console.log('Preferred Department:', preferredDepartment);
    console.log('Current Year:', currentYear); // Assuming this is the target application year

    const dayDropdown = document.getElementById('day');
    const timeDropdown = document.getElementById('time');
    timeDropdown.disabled = true; // Disable time dropdown initially

    const allTimes = [
        "7:00-8:00", "8:00-9:00", "9:00-10:00", "10:00-11:00",
        "11:00-12:00", "12:00-1:00", "1:00-2:00", "2:00-3:00",
        "3:00-4:00", "4:00-5:00", "5:00-6:00", "6:00-7:00",
    ];
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    // --- Cache for weekly availability data ---
    const weeklyAvailabilityCache = new Map();

    // --- Fetch Application Period (Keep for potential future use, but not used for dates now) ---
    const fetchApplicationPeriod = async (key) => {
        try {
            const response = await fetch(`/admin/application-period?key=${key}`);
            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error('Failed to fetch application period data');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching application period data:', error);
            return null;
        }
    };

    // --- Fetch Assessment Period ---
    // --- FIX: Modify to accept and use year ---
    const fetchAssessmentPeriod = async (year = null) => { // Accept optional year
        try {
            let url = `/admin/assessment-period`;
            if (year) {
                url += `?year=${year}`; // Append year if provided
            }
            // Use the assessment period endpoint with the potentially modified URL
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error('Failed to fetch assessment period data');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching assessment period data:', error);
            return null;
        }
    };
    // --- End FIX ---

    // --- Fetch Weekly Availability ---
    const fetchWeeklyAvailability = async (weekStartDate, department) => {
        // Check cache first
        const cacheKey = `${weekStartDate}_${department}`;
        if (weeklyAvailabilityCache.has(cacheKey)) {
            console.log(`Using cached availability for week ${weekStartDate}`);
            return weeklyAvailabilityCache.get(cacheKey);
        }

        console.log(`Fetching weekly availability for week ${weekStartDate}, Dept: ${department}`);
        try {
            // Use the endpoint that returns combined recurring and override data
            // IMPORTANT: Ensure this endpoint is accessible to users or create a user-specific version
            const response = await fetch(`/admin/weekly-schedule?weekStart=${weekStartDate}&department=${encodeURIComponent(department)}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch weekly availability: ${response.statusText}`);
            }
            const data = await response.json(); // Should return { recurring: [...], overrides: [...] }
            console.log(`Fetched availability for week ${weekStartDate}:`, data);
            weeklyAvailabilityCache.set(cacheKey, data); // Store in cache
            return data;
        } catch (error) {
            console.error('Error fetching weekly availability:', error);
            return { recurring: [], overrides: [] }; // Return empty structure on error
        }
    };

    // --- Helper Function to get Dates within Period ---
    const getDatesInPeriod = (startDateStr, endDateStr, targetYear) => {
        const dates = [];
        let currentDate = new Date(startDateStr);
        const lastDate = new Date(endDateStr);
        lastDate.setHours(23, 59, 59, 999);
        while (currentDate <= lastDate) {
            if (currentDate.getFullYear() === targetYear) {
                const dayOfWeek = currentDate.getDay();
                if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
                    dates.push(new Date(currentDate).toISOString().split('T')[0]); // Store as YYYY-MM-DD
                }
            }
            if (currentDate.getFullYear() > targetYear) break;
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return dates;
    };

    // --- Populate Day Dropdown ---
    const populateDayDropdown = (dates) => {
        dayDropdown.innerHTML = '<option value="" disabled selected>Select Assessment Day</option>'; // Clear previous options

        if (!dates || dates.length === 0) {
            dayDropdown.innerHTML = '<option value="" disabled selected>No available dates</option>';
            dayDropdown.disabled = true;
            return;
        }

        dates.forEach(dateStr => {
            const dateObj = parseDateStringToLocalMidnight(dateStr);
            const option = document.createElement('option');
            option.value = dateStr; // Value is YYYY-MM-DD
            // Format for display (e.g., "Monday, April 28")
            option.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
            dayDropdown.appendChild(option);
        });
        dayDropdown.disabled = false;
    };

    // --- Populate Time Dropdown ---
    const populateTimeDropdown = (selectedDateString, weeklyData) => {
        timeDropdown.innerHTML = '<option value="" disabled selected>Select Time</option>';
        timeDropdown.disabled = false;

        const { recurring, overrides } = weeklyData;
        const selectedDate = new Date(selectedDateString + 'T00:00:00'); // Ensure correct parsing
        const selectedDayOfWeek = daysOfWeek[selectedDate.getDay()];

        // Create lookup maps for efficiency within this function call
        const overrideMap = new Map();
        overrides.forEach(override => {
            // Key: "YYYY-MM-DD_HH:MM-HH:MM"
            const key = `${override.date}_${override.time}`;
            overrideMap.set(key, override);
        });

        const recurringMap = new Map();
        recurring.forEach(schedule => {
            // Key: "DayName_HH:MM-HH:MM"
            const key = `${schedule.day}_${schedule.time}`;
            recurringMap.set(key, schedule);
        });

        console.log(`Populating times for ${selectedDateString} (${selectedDayOfWeek})`);

        allTimes.forEach(time => {
            const option = document.createElement('option');
            option.value = time;

            let isAvailable = true;
            let reason = "Available"; // For debugging

            // 1. Check for specific override for this DATE and time
            const overrideKey = `${selectedDateString}_${time}`;
            const override = overrideMap.get(overrideKey);

            if (override) {
                // An override exists, it takes precedence
                if (override.status === 'available') {
                    isAvailable = true;
                    reason = "Override: Available";
                } else { // 'unavailable'
                    isAvailable = false;
                    reason = `Override: Unavailable (${override.subject})`;
                }
            } else {
                // 2. No override, check for recurring schedule for this DAY and time
                const recurringKey = `${selectedDayOfWeek}_${time}`;
                const recurringSchedule = recurringMap.get(recurringKey);
                if (recurringSchedule) {
                    isAvailable = false; // Recurring schedule makes it unavailable by default
                    reason = `Recurring: Unavailable (${recurringSchedule.subject})`;
                } else {
                    // No override and no recurring schedule
                    isAvailable = true;
                    reason = "Available (Default)";
                }
            }

            // Set option text and disabled status
            if (isAvailable) {
                option.textContent = time;
                option.disabled = false;
            } else {
                option.textContent = `${time} (Unavailable)`;
                option.disabled = true;
            }
            // console.log(`  Time ${time}: ${reason}`); // Optional: Log reason for each slot
            timeDropdown.appendChild(option);
        });
    };

    // --- Helper to get Week Start Date (Monday) ---
    const getWeekStartDate = (date) => {
        const d = new Date(date);
        const day = d.getDay(); // 0=Sun, 1=Mon, ...
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        d.setDate(diff);
        return d.toISOString().split('T')[0]; // Return YYYY-MM-DD
    };

    // --- Hardcode 'today' for testing ---
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()); // Midnight local time

    // --- Helper to parse date string YYYY-MM-DD to local midnight Date object ---
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

    // --- Main Logic ---
    try {
        // --- FIX: Pass currentYear to fetchAssessmentPeriod ---
        const assessmentPeriod = await fetchAssessmentPeriod(currentYear); // Pass the target year
        // --- End FIX ---

        if (!assessmentPeriod || !assessmentPeriod.startDate || !assessmentPeriod.endDate) {
            console.warn('No valid assessment period found or failed to fetch.');
            dayDropdown.innerHTML = '<option value="" disabled selected>Assessment period not set</option>';
            dayDropdown.disabled = true;
            timeDropdown.disabled = true;
            return;
        }

        // Generate all dates within the assessment period
        let allAssessmentDates = getDatesInPeriod(assessmentPeriod.startDate, assessmentPeriod.endDate, currentYear);
        console.log("Initial assessment dates:", allAssessmentDates); // Log initial dates

        // --- FIX: Filter out 'today' if it falls within the assessment period ---
        const assessmentStart = parseDateStringToLocalMidnight(assessmentPeriod.startDate);
        const assessmentEnd = parseDateStringToLocalMidnight(assessmentPeriod.endDate);
        let filteredAssessmentDates = allAssessmentDates; // Start with all dates

        if (!isNaN(assessmentStart.getTime()) && !isNaN(assessmentEnd.getTime()) &&
            startOfToday >= assessmentStart && startOfToday <= assessmentEnd)
        {
            console.log(`Filtering: Today (${startOfToday.toDateString()}) is within the assessment period [${assessmentStart.toDateString()} - ${assessmentEnd.toDateString()}]. Removing dates <= today.`);
            // Filter out today and any past dates within the period
            filteredAssessmentDates = allAssessmentDates.filter(dateStr => {
                const dateObj = parseDateStringToLocalMidnight(dateStr);
                return dateObj > startOfToday; // Keep only dates strictly after today
            });
            console.log("Filtered assessment dates:", filteredAssessmentDates); // Log filtered dates
        } else {
             console.log(`Not filtering: Today (${startOfToday.toDateString()}) is NOT within the assessment period [${assessmentStart.toDateString()} - ${assessmentEnd.toDateString()}].`);
        }
        // --- End FIX ---

        // Populate the dropdown with the filtered dates
        populateDayDropdown(filteredAssessmentDates); // Use the filtered list

        if (dayDropdown.disabled) {
            timeDropdown.disabled = true;
        }

        // --- Handle Day Selection Change ---
        dayDropdown.addEventListener('change', async () => {
             const selectedDateString = dayDropdown.value;

             if (selectedDateString) {
                 timeDropdown.innerHTML = '<option value="" disabled selected>Loading times...</option>'; // Show loading state
                 timeDropdown.disabled = true;

                 // Calculate week start and fetch/get weekly data
                 const weekStartDate = getWeekStartDate(selectedDateString);
                 const weeklyData = await fetchWeeklyAvailability(weekStartDate, preferredDepartment);

                 // Populate time dropdown based on the specific date and fetched weekly data
                 populateTimeDropdown(selectedDateString, weeklyData);
             } else {
                 timeDropdown.innerHTML = '<option value="" disabled selected>Select Time</option>';
                 timeDropdown.disabled = true;
             }
        });

    } catch (error) {
        console.error('Error initializing schedule selection:', error);
        dayDropdown.innerHTML = '<option value="" disabled selected>Error loading schedule</option>';
        dayDropdown.disabled = true;
        timeDropdown.disabled = true;
    }

    // --- Form Submission Logic ---
    const form2 = document.getElementById('joingreenfmForm2');
    form2.addEventListener('submit', async (event) => {
        event.preventDefault();
        const selectedDate = dayDropdown.value;
        const selectedTime = timeDropdown.value;
        if (!selectedDate) { alert('Please select a preferred date.'); return; }
        if (!selectedTime) { alert('Please select a preferred time.'); return; }
        const payload = {
            schoolYear: currentYear,
            preferredSchedule: { date: selectedDate, time: selectedTime }
        };
        console.log('Submitting payload:', payload);
        try {
            const response = await fetch('/JoinGFM-Step2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (response.ok) {
                alert('Successfully submitted your application!');
                window.location.href = '/JoinGFM-Step3';
            } else if (result.redirect) {
                alert(`Error: ${result.error}`);
                window.location.href = result.redirect;
            } else {
                 let errorMessage = `Error: ${result.error || 'Something went wrong'}`;
                 if (result.details) {
                     errorMessage += '\nDetails:\n' + Object.entries(result.details)
                         .map(([field, message]) => `- ${field}: ${message}`)
                         .join('\n');
                 }
                 alert(errorMessage);
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('There was a problem with the submission. Please check the console and try again.');
        }
    });

}); // End DOMContentLoaded
