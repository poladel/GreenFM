document.addEventListener('DOMContentLoaded', async () => {
    // --- Get data from elements or data attributes if needed ---
    // Example: If department/year are stored in hidden inputs or data attributes
    const departmentElement = document.getElementById('preferredDepartmentHidden'); // Assuming you add hidden input
    const yearElement = document.getElementById('currentYearHidden'); // Assuming you add hidden input
    const preferredDepartment = departmentElement ? departmentElement.value : null;
    const currentYear = yearElement ? yearElement.value : null;
    // --- OR --- Get them some other way if available in the DOM

    if (!preferredDepartment || !currentYear) {
        console.error("Could not determine preferred department or current year from the page.");
        // Handle error appropriately - maybe disable dropdowns
        return;
    }

    console.log('Preferred Department:', preferredDepartment);
    console.log('Current Year:', currentYear);

    const dayDropdown = document.getElementById('preferredDate');
    const timeDropdown = document.getElementById('preferredTime');
    timeDropdown.disabled = true;

    let availableSlotsCache = null;
    let bookedSlotsSet = new Set();

    // --- fetchBookedSlots function (keep as is) ---
    const fetchBookedSlots = async (department, year) => {
        try {
            console.log(`Fetching BOOKED slots for Dept: ${department}, Year: ${year}`);
            const response = await fetch(`/booked-slots?department=${encodeURIComponent(department)}&year=${year}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch booked slots: ${response.statusText}`);
            }
            const bookedSlotsRaw = await response.json();
            console.log(`Fetched ${bookedSlotsRaw.length} booked slots.`);
            // Create the Set for efficient lookup
            return new Set(bookedSlotsRaw.map(slot => `${slot.date}_${slot.time}`));
        } catch (error) {
            console.error('Error fetching booked slots:', error);
            // Decide how to handle this - maybe allow booking but risk conflicts, or disable form?
            alert('Warning: Could not load information about already booked slots. Please be careful when selecting.');
            return new Set(); // Return empty set on error
        }
    };

    // --- fetchAssessmentPeriod function (keep as is) ---
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

    // --- fetchAvailableAssessmentSlots function (keep as is) ---
    // IMPORTANT: Ensure this endpoint returns ALL slots marked available by admin for the dept/year,
    // regardless of whether they are booked or not, for the logic below to work correctly.
    // If it currently only returns *unbooked* slots, the logic won't know which times *could* have existed.
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

    // --- parseDateStringToLocalMidnight function (keep as is) ---
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

    // --- UPDATE: populateDayDropdown ---
    const populateDayDropdown = (availableSlots, assessmentPeriod, bookedSlots) => { // Added bookedSlots parameter
        dayDropdown.innerHTML = '<option value="" disabled selected>Select Assessment Day</option>';
        dayDropdown.disabled = true;

        if (!assessmentPeriod) {
            dayDropdown.innerHTML = '<option value="" disabled selected>Assessment period not defined</option>';
            return;
        }
        if (!availableSlots) {
            dayDropdown.innerHTML = '<option value="" disabled selected>No available slots</option>';
            return; // Added check
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

        // Create a Map of dates (YYYY-MM-DD) to an array of available times for that date
        const availableSlotsByDate = new Map();
        availableSlots.forEach(slot => {
            if (!availableSlotsByDate.has(slot.date)) {
                availableSlotsByDate.set(slot.date, []);
            }
            availableSlotsByDate.get(slot.date).push(slot.time);
        });
        console.log("Available slots grouped by date:", availableSlotsByDate);

        let hasSelectableOptions = false;
        let currentDate = new Date(assessmentStart);

        while (currentDate <= assessmentEnd) {
            // Format date as YYYY-MM-DD
            const year = currentDate.getFullYear();
            const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
            const day = currentDate.getDate().toString().padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const option = document.createElement('option');
            option.value = dateStr;
            option.textContent = currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

            const isFuture = currentDate >= startOfToday;
            const timesForThisDate = availableSlotsByDate.get(dateStr); // Get potential times for this date

            // --- Check if the date should be enabled ---
            let isDateSelectable = false;
            if (isFuture && timesForThisDate && timesForThisDate.length > 0) {
                // Check if *at least one* time slot for this date is NOT booked
                const hasUnbookedTime = timesForThisDate.some(time => {
                    const dateTimeKey = `${dateStr}_${time}`;
                    return !bookedSlots.has(dateTimeKey); // Check if it's NOT in the booked set
                });

                if (hasUnbookedTime) {
                    isDateSelectable = true; // Enable date if it's in the future and has at least one unbooked slot
                }
            }
            // --- End Check ---

            if (isDateSelectable) {
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
    // --- End UPDATE ---

    // --- populateTimeDropdown function (keep as is) ---
    // This function correctly handles disabling booked times based on bookedSlotsSet
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

        let hasEnabledOptions = false;

        timesForDate.forEach(time => {
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time; // Display the time

            // --- Check against the fetched bookedSlotsSet ---
            const dateTimeKey = `${selectedDateString}_${time}`;
            if (bookedSlotsSet.has(dateTimeKey)) { // Use the Set fetched earlier
                option.disabled = true;
                option.style.color = 'grey';
            } else {
                option.disabled = false;
                option.style.color = '';
                hasEnabledOptions = true;
            }
            // --- End Check ---

            timeDropdown.appendChild(option);
        });

        if (hasEnabledOptions) {
            timeDropdown.disabled = false;
        } else {
             timeDropdown.innerHTML = '<option value="" disabled selected>All times booked for this date</option>';
             timeDropdown.disabled = true;
        }
    };

    // --- Main Logic ---
    try {
        // Fetch assessment period, available slots, AND booked slots
        // Use Promise.all to fetch concurrently
        const [assessmentPeriod, availableSlots, fetchedBookedSlotsSet] = await Promise.all([
            fetchAssessmentPeriod(currentYear),
            fetchAvailableAssessmentSlots(preferredDepartment, currentYear), // Ensure this fetches ALL potentially available slots
            fetchBookedSlots(preferredDepartment, currentYear)
        ]);

        // Assign the fetched booked slots set
        bookedSlotsSet = fetchedBookedSlotsSet;
        console.log('Booked Slots Set:', bookedSlotsSet); // Log the booked slots

        if (!assessmentPeriod) {
            console.error(`Assessment period for ${currentYear} not found or failed to load.`);
            dayDropdown.innerHTML = '<option value="" disabled selected>Error loading assessment period</option>';
            dayDropdown.disabled = true;
            timeDropdown.disabled = true;
            return; // Stop execution if period is missing
        }

        // --- UPDATE Call Site ---
        // Pass availableSlots AND bookedSlotsSet to populateDayDropdown
        populateDayDropdown(availableSlots, assessmentPeriod, bookedSlotsSet);
        // --- End UPDATE ---

        if (dayDropdown.disabled) {
            timeDropdown.disabled = true;
        }

        // --- Handle Day Selection Change ---
        dayDropdown.addEventListener('change', () => {
             const selectedDateString = dayDropdown.value;
             if (selectedDateString) {
                 // Pass availableSlotsCache (or availableSlots) to populateTimeDropdown
                 populateTimeDropdown(selectedDateString, availableSlotsCache || availableSlots);
             } else {
                 timeDropdown.innerHTML = '<option value="" disabled selected>Select Time</option>';
                 timeDropdown.disabled = true;
             }
        });

    } catch (error) {
        console.error('Error initializing schedule selection:', error);
        dayDropdown.innerHTML = '<option value="" disabled selected>Error loading schedule data</option>';
        dayDropdown.disabled = true;
        timeDropdown.disabled = true;
    }

    // --- Form Submission Logic (keep as is) ---
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
