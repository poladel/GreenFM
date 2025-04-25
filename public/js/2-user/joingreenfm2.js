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

    // --- NEW: Fetch Assessment Period ---
    const fetchAssessmentPeriod = async (key) => {
        try {
            // Use the assessment period endpoint
            const response = await fetch(`/admin/assessment-period?key=${key}`);
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

    // --- NEW: Fetch Weekly Availability ---
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

    // --- Helper Function to get Dates within Period (Keep as is) ---
    const getDatesInPeriod = (startDate, endDate, targetYear) => {
        const dates = [];
        let currentDate = new Date(startDate);
        const lastDate = new Date(endDate);
        lastDate.setHours(23, 59, 59, 999);
        while (currentDate <= lastDate) {
            if (currentDate.getFullYear() === targetYear) {
                const dayOfWeek = currentDate.getDay();
                if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
                    dates.push(new Date(currentDate));
                }
            }
            if (currentDate.getFullYear() > targetYear) break;
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return dates;
    };

    // --- Populate Day Dropdown (Keep as is) ---
    const populateDayDropdown = (dates) => {
        dayDropdown.innerHTML = '<option value="" disabled selected>Select Date</option>';
        if (dates.length === 0) {
            dayDropdown.innerHTML = `<option value="" disabled selected>No available dates found for ${currentYear}</option>`;
            dayDropdown.disabled = true;
            return;
        }
        dayDropdown.disabled = false;
        dates.forEach(date => {
            const option = document.createElement('option');
            const dateString = date.toISOString().split('T')[0];
            const dayOfWeek = daysOfWeek[date.getDay()];
            option.value = dateString;
            option.textContent = `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - ${dayOfWeek}`;
            option.dataset.dayOfWeek = dayOfWeek;
            dayDropdown.appendChild(option);
        });
    };

    // --- REWRITE: Populate Time Dropdown ---
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

    // --- Main Logic ---
    try {
        // --- FIX: Fetch Assessment Period instead of Application Period ---
        const assessmentPeriod = await fetchAssessmentPeriod('GFMAssessment'); // Use assessment key

        if (!assessmentPeriod) {
            console.warn('No assessment period found or failed to fetch.');
            // Update error message
            dayDropdown.innerHTML = '<option value="" disabled selected>Assessment period not set</option>';
            dayDropdown.disabled = true;
            timeDropdown.disabled = true;
            return;
        }
        // --- End FIX ---

        // --- FIX: Use assessmentPeriod dates ---
        const assessmentDates = getDatesInPeriod(assessmentPeriod.startDate, assessmentPeriod.endDate, currentYear);
        populateDayDropdown(assessmentDates);
        // --- End FIX ---

        if (dayDropdown.disabled) {
            timeDropdown.disabled = true;
        }

        // --- MODIFY: Handle Day Selection Change (Keep as is) ---
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

    // --- Form Submission Logic (Keep as is) ---
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
