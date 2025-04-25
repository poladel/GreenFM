document.addEventListener('DOMContentLoaded', async () => {
    console.log('Preferred Department:', preferredDepartment);
    console.log('Current Year:', currentYear);

    const dayDropdown = document.getElementById('day');
    const timeDropdown = document.getElementById('time');
    timeDropdown.disabled = true; // Disable time dropdown initially

    let availableSlotsCache = null; // Store the fetched slots

    const fetchAssessmentPeriod = async (year = null) => {
        try {
            let url = `/admin/assessment-period`;
            if (year) url += `?year=${year}`;
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

    const fetchAvailableAssessmentSlots = async (department, year) => {
        // Use cache if available
        if (availableSlotsCache) return availableSlotsCache;

        console.log(`Fetching available assessment slots for Dept: ${department}, Year: ${year}`);
        try {
            // --- THIS FETCH MUST SUCCEED AND RETURN JSON FOR THE REST TO WORK ---
            const response = await fetch(`/assessment-slots?department=${encodeURIComponent(department)}&year=${year}`);
            if (!response.ok) {
                // Log the actual response text if it's not JSON
                const text = await response.text();
                console.error('Failed response text:', text);
                throw new Error(`Failed to fetch available slots: ${response.statusText}`);
            }
            const slots = await response.json();
            console.log(`Fetched ${slots.length} available slots:`, slots);
            availableSlotsCache = slots;
            return slots;
        } catch (error) {
            console.error('Error fetching available assessment slots:', error);
            // Display error to user in dropdown
            dayDropdown.innerHTML = '<option value="" disabled selected>Error loading available slots</option>';
            dayDropdown.disabled = true;
            timeDropdown.disabled = true;
            return []; // Return empty array on error
        }
    };

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

    // --- REWRITE: Populate Day Dropdown ---
    const populateDayDropdown = (availableSlots, assessmentPeriod) => {
        dayDropdown.innerHTML = '<option value="" disabled selected>Select Assessment Day</option>';
        dayDropdown.disabled = true; // Disable until populated

        if (!assessmentPeriod) {
            dayDropdown.innerHTML = '<option value="" disabled selected>Assessment period not defined</option>';
            return;
        }

        // Get assessment period boundaries
        const assessmentStart = parseDateStringToLocalMidnight(assessmentPeriod.startDate);
        const assessmentEnd = parseDateStringToLocalMidnight(assessmentPeriod.endDate);

        if (isNaN(assessmentStart.getTime()) || isNaN(assessmentEnd.getTime())) {
             dayDropdown.innerHTML = '<option value="" disabled selected>Invalid assessment period dates</option>';
             return;
        }

        // Get today's date for filtering past dates
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        // Create a Set of dates (YYYY-MM-DD) that have available slots
        const availableDatesSet = new Set(availableSlots.map(slot => slot.date));
        console.log("Dates with available slots:", availableDatesSet);

        let hasSelectableOptions = false;

        // Loop through each day within the assessment period
        let currentDate = new Date(assessmentStart); // Start from the beginning of the period
        while (currentDate <= assessmentEnd) {
            // Format date as YYYY-MM-DD
            const year = currentDate.getFullYear();
            const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
            const day = currentDate.getDate().toString().padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const option = document.createElement('option');
            option.value = dateStr;
            option.textContent = currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

            // Check if this date is valid and has available slots
            const isAvailable = availableDatesSet.has(dateStr);
            const isFuture = currentDate >= startOfToday; // Allow today

            if (isAvailable && isFuture) {
                // Date is valid, in the future (or today), and has slots -> ENABLED
                option.disabled = false;
                hasSelectableOptions = true;
            } else {
                // Date has no slots OR is in the past -> DISABLED
                option.disabled = true;
                // Optional: Add styling or text indication for disabled options
                // option.textContent += " (No slots)";
                // option.style.color = 'grey';
            }

            dayDropdown.appendChild(option);

            // Move to the next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Final check and enable/disable dropdown
        if (hasSelectableOptions) {
            dayDropdown.disabled = false;
        } else {
            dayDropdown.innerHTML = '<option value="" disabled selected>No upcoming assessment slots available</option>';
            dayDropdown.disabled = true;
        }
    };
    // --- End REWRITE ---

    const populateTimeDropdown = (selectedDateString, availableSlots) => {
        timeDropdown.innerHTML = '<option value="" disabled selected>Select Time</option>';
        timeDropdown.disabled = true; // Disable initially

        if (!selectedDateString || !availableSlots) return;

        const timesForDate = availableSlots
            .filter(slot => slot.date === selectedDateString)
            .map(slot => slot.time)
            .sort();

        if (timesForDate.length === 0) {
            timeDropdown.innerHTML = '<option value="" disabled selected>No times available for this date</option>';
            return; // Keep disabled
        }

        timesForDate.forEach(time => {
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time; // Display the time
            option.disabled = false; // All listed times are available
            timeDropdown.appendChild(option);
        });
        timeDropdown.disabled = false; // Enable if times found
    };

    // --- Main Logic ---
    try {
        // Fetch assessment period FIRST
        const assessmentPeriod = await fetchAssessmentPeriod(currentYear);

        if (!assessmentPeriod) {
            console.error(`Assessment period for ${currentYear} not found or failed to load.`);
            dayDropdown.innerHTML = '<option value="" disabled selected>Error loading assessment period</option>';
            dayDropdown.disabled = true;
            timeDropdown.disabled = true;
            return; // Stop execution if period is missing
        }

        // THEN fetch available slots
        const availableSlots = await fetchAvailableAssessmentSlots(preferredDepartment, currentYear);

        // Populate day dropdown based on the full period and mark availability
        populateDayDropdown(availableSlots, assessmentPeriod);

        if (dayDropdown.disabled) {
            timeDropdown.disabled = true;
        }

        // --- Handle Day Selection Change ---
        dayDropdown.addEventListener('change', () => {
             const selectedDateString = dayDropdown.value;
             if (selectedDateString) {
                 populateTimeDropdown(selectedDateString, availableSlotsCache); // Use cache
             } else {
                 timeDropdown.innerHTML = '<option value="" disabled selected>Select Time</option>';
                 timeDropdown.disabled = true;
             }
        });

    } catch (error) {
        // Catch errors from Promise.all or subsequent steps if any
        console.error('Error initializing schedule selection:', error);
        dayDropdown.innerHTML = '<option value="" disabled selected>Error loading schedule data</option>';
        dayDropdown.disabled = true;
        timeDropdown.disabled = true;
    }

    // --- Form Submission Logic (remains the same) ---
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
