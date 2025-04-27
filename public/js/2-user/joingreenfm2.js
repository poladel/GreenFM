document.addEventListener('DOMContentLoaded', async () => {
    // --- Get data from elements or data attributes if needed ---
    // Example: If department/year are stored in hidden inputs or data attributes
    const departmentElement = document.getElementById('preferredDepartmentHidden');
    const yearElement = document.getElementById('currentYearHidden');
    const preferredDepartment = departmentElement ? departmentElement.value : null;
    const currentYear = yearElement ? yearElement.value : null;
    const dayDropdown = document.getElementById('preferredDate');
    const timeDropdown = document.getElementById('preferredTime');

    let availableSlotsCache = null; // Store ALL potentially available slots
    let bookedSlotsSet = new Set(); // Store keys ('YYYY-MM-DD_HH:MM-HH:MM') of booked slots

    // <<< Initialize Socket.IO >>>
    const socket = io({
        auth: {
            // Send JWT token if available for potential server-side user identification
            token: document.cookie.split('jwt=')[1]?.split(';')[0]
        }
    });

    socket.on('connect', () => console.log('Join GFM Step 2 Socket Connected:', socket.id));
    socket.on('disconnect', () => console.log('Join GFM Step 2 Socket Disconnected'));

    // <<< Listen for Assessment Slot Updates >>>
    socket.on('assessmentSlotUpdate', async (data) => { // Make listener async if needed for fetches inside
        console.log('Received assessmentSlotUpdate:', data);
        const { action, slot } = data;

        if (!slot || !slot.date || !slot.time || !slot.department || !slot.year) {
            console.warn("Received incomplete slot update data:", data);
            return;
        }

        // Only process updates relevant to the current view
        if (slot.department !== preferredDepartment || slot.year.toString() !== currentYear) {
            console.log("Slot update ignored (wrong dept/year).");
            return;
        }

        const dateTimeKey = `${slot.date}_${slot.time}`;
        let needsDayDropdownUpdate = false; // Flag to check if day dropdown needs refresh

        // Update bookedSlotsSet and availableSlotsCache based on action
        if (action === 'booked') {
            bookedSlotsSet.add(dateTimeKey);
            console.log(`Slot ${dateTimeKey} marked as booked.`);
            if(availableSlotsCache) {
                const cachedSlot = availableSlotsCache.find(s => s.date === slot.date && s.time === slot.time);
                if(cachedSlot) cachedSlot.application = slot.application;
            }
            // Booking might make the last slot of a day unavailable, potentially needing day update
            needsDayDropdownUpdate = true;

        } else if (action === 'deleted') { // Admin deleted an *available* slot
            bookedSlotsSet.delete(dateTimeKey);
            if (availableSlotsCache) {
                availableSlotsCache = availableSlotsCache.filter(s => !(s.date === slot.date && s.time === slot.time));
            }
            console.log(`Slot ${dateTimeKey} removed from available list.`);
            needsDayDropdownUpdate = true; // Deleting a slot might make a day unavailable

        } else if (action === 'created') { // Admin added a new available slot
             bookedSlotsSet.delete(dateTimeKey);
             if (availableSlotsCache && !availableSlotsCache.some(s => s.date === slot.date && s.time === slot.time)) {
                 availableSlotsCache.push({ _id: slot._id, date: slot.date, time: slot.time, department: slot.department, year: slot.year, application: null }); // Add full slot if possible
             }
             console.log(`Slot ${dateTimeKey} added to available list.`);
             needsDayDropdownUpdate = true; // Adding a slot might make a day available

        } else if (action === 'unbooked') { // Handle case where admin makes a booked slot available again
            bookedSlotsSet.delete(dateTimeKey);
            console.log(`Slot ${dateTimeKey} marked as unbooked.`);
            if(availableSlotsCache) {
                const cachedSlot = availableSlotsCache.find(s => s.date === slot.date && s.time === slot.time);
                if(cachedSlot) cachedSlot.application = null; // Mark as unbooked in cache
                // If slot wasn't in cache (e.g., initial fetch failed), maybe add it? Or rely on full refresh.
            }
            needsDayDropdownUpdate = true; // Unbooking might make a day available again
        }
         // Add more actions if needed


        // --- Refresh Dropdowns ---
        const previouslySelectedDate = dayDropdown.value; // Store current selection

        // 1. Refresh Day Dropdown if needed
        if (needsDayDropdownUpdate) {
            console.log("Slot update requires refreshing day dropdown.");
            // Fetch the latest assessment period in case it changed (optional, depends on app logic)
            // currentAssessmentPeriod = await fetchAssessmentPeriod(currentYear); // Uncomment if needed
            if (!currentAssessmentPeriod) {
                 console.error("Cannot refresh day dropdown, assessment period data missing.");
                 return; // Or handle error appropriately
            }
            populateDayDropdown(availableSlotsCache, currentAssessmentPeriod, bookedSlotsSet);

            // Attempt to restore previous selection if still valid
            const newOptions = Array.from(dayDropdown.options);
            const previousOption = newOptions.find(opt => opt.value === previouslySelectedDate);
            if (previousOption && !previousOption.disabled) {
                dayDropdown.value = previouslySelectedDate;
                console.log(`Restored selected date: ${previouslySelectedDate}`);
            } else if (previouslySelectedDate) {
                console.log(`Previously selected date ${previouslySelectedDate} is no longer valid. Resetting time dropdown.`);
                // If previous date is gone/disabled, clear time dropdown
                 timeDropdown.innerHTML = '<option value="" disabled selected>Select a date first</option>';
                 timeDropdown.disabled = true;
            }
        }

        // 2. Refresh Time Dropdown based on the *final* selected date
        const currentSelectedDate = dayDropdown.value; // Get value *after* potential day refresh
        if (currentSelectedDate) {
             console.log("Refreshing time dropdown for date:", currentSelectedDate);
             populateTimeDropdown(currentSelectedDate, availableSlotsCache);
        } else if (!needsDayDropdownUpdate && previouslySelectedDate === slot.date) {
             // If day dropdown wasn't updated, but the update affected the selected date's times
             console.log("Slot update affects selected date's times. Refreshing time dropdown.");
             populateTimeDropdown(previouslySelectedDate, availableSlotsCache);
        }
        // --- End Refresh Dropdowns ---

    });
    // <<< End Listener >>>

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
    const populateDayDropdown = (availableSlots, assessmentPeriod, currentBookedSlots) => { // Pass booked set
         dayDropdown.innerHTML = '<option value="" disabled selected>Select Assessment Day</option>';
         dayDropdown.disabled = true;

         if (!assessmentPeriod?.startDate || !assessmentPeriod?.endDate) {
             dayDropdown.innerHTML = '<option value="" disabled selected>Assessment period not defined</option>';
             return;
         }
         if (!Array.isArray(availableSlots)) { // Check if it's an array
             dayDropdown.innerHTML = '<option value="" disabled selected>Error loading slots</option>';
             return;
         }

         // Get assessment period boundaries
         const assessmentStart = parseDateStringToLocalMidnight(assessmentPeriod.startDate);
         const assessmentEnd = parseDateStringToLocalMidnight(assessmentPeriod.endDate);

         // Get today's date for filtering past dates
         const today = new Date();
         const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

         if (isNaN(assessmentStart.getTime()) || isNaN(assessmentEnd.getTime())) {
              dayDropdown.innerHTML = '<option value="" disabled selected>Invalid assessment period dates</option>';
              return;
         }

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
                 const hasUnbookedTime = timesForThisDate.some(time => !currentBookedSlots.has(`${dateStr}_${time}`));
                 if (hasUnbookedTime) {
                     isDateSelectable = true; // Enable date if it's in the future and has at least one unbooked slot
                 }
             }
             // --- End Check ---

             option.disabled = !isDateSelectable;
             if (isDateSelectable) hasSelectableOptions = true;

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
    const populateTimeDropdown = (selectedDateString, availableSlots) => { // Pass available slots
        timeDropdown.innerHTML = '<option value="" disabled selected>Select Time</option>';
        timeDropdown.disabled = true; // Disable initially

        if (!selectedDateString || !Array.isArray(availableSlots)) return; // Check array

        const timesForDate = availableSlots
            .filter(slot => slot.date === selectedDateString)
            .map(slot => slot.time)
            .sort(); // Sort for consistent order

        if (timesForDate.length === 0) {
            timeDropdown.innerHTML = '<option value="" disabled selected>No times listed for this date</option>';
            return;
        }

        let hasEnabledOptions = false;

        timesForDate.forEach(time => {
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time; // Display format HH:MM-HH:MM

            // --- Check against the fetched bookedSlotsSet ---
            const dateTimeKey = `${selectedDateString}_${time}`;
            if (bookedSlotsSet.has(dateTimeKey)) { // Check global set
                option.disabled = true;
                option.textContent += " (Booked)";
                option.style.color = 'grey';
            } else {
                option.disabled = false;
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

    // --- UPDATE: Main Logic - Ensure currentAssessmentPeriod is stored globally ---
    let currentAssessmentPeriod = null; // Define globally within DOMContentLoaded scope

    try {
        // Fetch concurrently
        const [fetchedPeriod, fetchedAvailableSlots, fetchedBookedSlotsSet] = await Promise.all([
            fetchAssessmentPeriod(currentYear),
            fetchAvailableAssessmentSlots(preferredDepartment, currentYear),
            fetchBookedSlots(preferredDepartment, currentYear)
        ]);

        currentAssessmentPeriod = fetchedPeriod; // Store fetched period globally
        availableSlotsCache = fetchedAvailableSlots;
        bookedSlotsSet = fetchedBookedSlotsSet;

        if (!currentAssessmentPeriod) throw new Error(`Assessment period for ${currentYear} not found.`);

        populateDayDropdown(availableSlotsCache, currentAssessmentPeriod, bookedSlotsSet);

        if (dayDropdown.disabled) timeDropdown.disabled = true;

        // --- Handle Day Selection Change ---
        dayDropdown.addEventListener('change', () => {
             const selectedDateString = dayDropdown.value;
             if (selectedDateString) {
                 // Pass availableSlotsCache (or availableSlots) to populateTimeDropdown
                 populateTimeDropdown(selectedDateString, availableSlotsCache); // Use cache
             } else {
                 timeDropdown.innerHTML = '<option value="" disabled selected>Select a date first</option>';
                 timeDropdown.disabled = true;
             }
        });

    } catch (error) {
        console.error('Error initializing schedule selection:', error);
        dayDropdown.innerHTML = `<option value="" disabled selected>Error: ${error.message}</option>`;
        dayDropdown.disabled = true;
        timeDropdown.disabled = true;
    }

    // --- Form Submission Logic (keep as is) ---
    const form2 = document.getElementById('joingreenfmForm2');
    form2.addEventListener('submit', async (event) => {
        event.preventDefault();
        const selectedDate = dayDropdown.value;
        const selectedTime = timeDropdown.value;
        const submitButton = form2.querySelector('button[type="submit"]');

        if (!selectedDate || dayDropdown.selectedIndex <= 0 || dayDropdown.options[dayDropdown.selectedIndex]?.disabled) {
             alert('Please select an available assessment date.'); return;
        }
        if (!selectedTime || timeDropdown.selectedIndex <= 0 || timeDropdown.options[timeDropdown.selectedIndex]?.disabled) {
             alert('Please select an available assessment time.'); return;
        }

        const payload = {
            schoolYear: currentYear,
            preferredSchedule: { date: selectedDate, time: selectedTime }
        };
        console.log('Submitting payload:', payload);

        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';

        try {
            const response = await fetch('/JoinGFM-Step2', { // Ensure route matches backend
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json(); // Expect { success: boolean, message: string, redirectUrl?: string }

            if (result.success) {
                alert(result.message || 'Schedule selected successfully!');
                window.location.href = result.redirectUrl || '/JoinGFM-Step3'; // Redirect on success
            } else {
                // Handle specific errors like 409 Conflict (slot booked)
                if (response.status === 409) {
                    alert(result.message || 'This slot was just booked. Please select another.');
                    // Refresh available slots to reflect the conflict
                    bookedSlotsSet.add(`${selectedDate}_${selectedTime}`); // Manually mark as booked
                    populateTimeDropdown(selectedDate, availableSlotsCache); // Refresh time dropdown
                } else {
                    alert(`Error: ${result.message || 'An unknown error occurred.'}`);
                }
                submitButton.disabled = false; // Re-enable button on failure
                submitButton.textContent = 'NEXT';
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('There was a network problem submitting your selection. Please try again.');
            submitButton.disabled = false; // Re-enable button on network error
            submitButton.textContent = 'NEXT';
        }
    });

}); // End DOMContentLoaded
