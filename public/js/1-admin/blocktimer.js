async function refreshSchedule(selectedYear) {
    console.log("Refreshing schedule for year:", selectedYear); // Debugging log
    try {
        const response = await fetch(`/schedule?schoolYear=${selectedYear}`);
        if (!response.ok) throw new Error("Failed to fetch schedules");

        const schedules = await response.json();
        console.log(`Schedules for ${selectedYear}:`, schedules); // Debugging log

        // Clear existing schedule buttons
        const scheduleButtons = document.querySelectorAll(".availablebtn");
        scheduleButtons.forEach((button) => {
            button.textContent = "";
            button.classList.remove("schedulebtn");
            delete button.dataset.scheduleId;
        });

        // Populate buttons with updated schedule data
        schedules.forEach((schedule) => {
            const button = document.querySelector(
                `.availablebtn[data-day="${schedule.day}"][data-time="${schedule.time}"]`
            );
            if (button) {
                console.log("Updating button for schedule:", schedule);
                button.textContent = schedule.showDetails.title;
                button.classList.add("schedulebtn");
                button.dataset.scheduleId = schedule._id;
            }
        });
    } catch (error) {
        console.error("Error updating schedule buttons:", error);
    }
}
/*-----SCHEDULE TAB-----*/
const modal = document.getElementById("scheduleModal");

document.addEventListener("DOMContentLoaded", async () => {
    const scheduleButtons = document.querySelectorAll(".availablebtn");
    const scheduleForm = document.getElementById("scheduleForm");
    const closeModal = document.querySelector(".close");
    const saveButton = document.getElementById("saveButton");
    const deleteButton = document.getElementById("deleteButton");
    const currentYear = new Date().getFullYear();
    const schoolYearDropdown = document.getElementById("schoolYear");
    const modalSchoolYearDropdown = document.getElementById("modalSchoolYear");
    const submissionSchoolYearDropdown = document.getElementById("submissionSchoolYear");

    // Set the dropdown to the current year
    schoolYearDropdown.value = currentYear;
    console.log("Initial schoolYearDropdown value:", schoolYearDropdown.value);

    // Event listener to filter schedules based on the selected school year
    schoolYearDropdown.addEventListener("change", async () => {
        const selectedYear = schoolYearDropdown.value;
        console.log("Selected schoolYearDropdown value (on change):", selectedYear);
    
        // Update the modalSchoolYearDropdown to match the selected year
        modalSchoolYearDropdown.value = selectedYear;
    
        // Synchronize the selected attribute of the options
        Array.from(modalSchoolYearDropdown.options).forEach((option) => {
            option.selected = option.value === selectedYear;
        });
    
        if (!modalSchoolYearDropdown.value) {
            console.error(`Value ${selectedYear} not found in modalSchoolYearDropdown options.`);
        }
    
        console.log("Updated modalSchoolYearDropdown value (on change):", modalSchoolYearDropdown.value);
    
        // Refresh the schedule for the selected year
        await refreshSchedule(selectedYear);
    });

    // Initial load of schedules for the current school year
    await refreshSchedule(currentYear);

    // Fetch schedules from the server
    try {
        const response = await fetch("/schedule");
        if (!response.ok) throw new Error("Failed to fetch schedules");

        const schedules = await response.json();
        console.log("Fetched schedules:", schedules); // Debugging log

        // Populate buttons with schedule data
        schedules.forEach((schedule) => {
            const button = document.querySelector(
                `.availablebtn[data-day="${schedule.day}"][data-time="${schedule.time}"]`
            );
            if (button) {
                button.textContent = schedule.showDetails.title; // Use the correct field for the title
                button.classList.add("schedulebtn");
                button.dataset.scheduleId = schedule._id;
            }
        });
    } catch (error) {
        console.error("Error fetching schedules:", error);
    }

    // Open modal on button click
    scheduleButtons.forEach((button) => {
        button.addEventListener("click", async () => {
            console.log("Button clicked:", button.dataset); // Debugging log

            const day = button.dataset.day;
            const time = button.dataset.time;
            const scheduleId = button.dataset.scheduleId;

            if (!scheduleId) {
                const selectedYear = schoolYearDropdown.value;
            
                // Dynamically rebuild the dropdown options
                const options = Array.from(modalSchoolYearDropdown.options).map((option) => {
                    return `<option value="${option.value}" ${option.value === selectedYear ? "selected" : ""}>${option.textContent}</option>`;
                });
            
                modalSchoolYearDropdown.innerHTML = options.join(""); // Rebuild the dropdown options
            
                console.log("Updated modalSchoolYearDropdown value:", modalSchoolYearDropdown.value);
            }

            if (scheduleId) {
                try {
                    const response = await fetch(`/schedule/${scheduleId}`);
                    if (!response.ok) throw new Error("Failed to fetch schedule details");

                    const schedule = await response.json();
                    console.log("Fetched schedule:", schedule); // Debugging log


                    // Set modal dropdown to the year from the database
                    modalSchoolYearDropdown.value = schedule.schoolYear || schoolYearDropdown.value;

                    scheduleForm.dataset.scheduleId = schedule._id; // Set the schedule ID
                    scheduleForm.dataset.day = schedule.day;
                    scheduleForm.dataset.time = schedule.time;

                    // Populate modal field
                    document.getElementById("showTitle").value = schedule.showDetails.title || "";
                    document.getElementById("show-description").value = schedule.showDetails.description || "";
                    document.getElementById("showObjectives").value = schedule.showDetails.objectives || "";

                    // Populate show type checkboxes
                    const showTypeCheckboxes = document.querySelectorAll("input[name='showDetails.type[]']");
                    showTypeCheckboxes.forEach((checkbox) => {
                        checkbox.checked = schedule.showDetails.type.includes(checkbox.value);
                    });

                    // Handle "Other" checkbox and input
                    const otherCheckbox = document.getElementById("other");
                    const otherInput = document.getElementById("other-input");
                    const otherValue = schedule.showDetails.type.find((type) => {
                        return !Array.from(showTypeCheckboxes).some((cb) => cb.value === type);
                    });

                    if (otherValue) {
                        otherCheckbox.checked = true;
                        otherInput.value = otherValue;
                        otherInput.disabled = false;
                    } else {
                        otherCheckbox.checked = false;
                        otherInput.value = "";
                        otherInput.disabled = true;
                    }

                    // Populate executive producer fields
                    document.getElementById("execProducerLastName").value = schedule.executiveProducer.lastName || "";
                    document.getElementById("execProducerFirstName").value = schedule.executiveProducer.firstName || "";
                    document.getElementById("execProducerMI").value = schedule.executiveProducer.mi || "";
                    document.getElementById("execProducerSuffix").value = schedule.executiveProducer.suffix || "";
                    document.getElementById("execProducerCYS").value = schedule.executiveProducer.cys || "";

                    // Populate creative staff fields
                    document.getElementById("creativeStaffLastName").value = schedule.creativeStaff.lastName || "";
                    document.getElementById("creativeStaffFirstName").value = schedule.creativeStaff.firstName || "";
                    document.getElementById("creativeStaffMI").value = schedule.creativeStaff.mi || "";
                    document.getElementById("creativeStaffSuffix").value = schedule.creativeStaff.suffix || "";
                    document.getElementById("creativeStaffCYS").value = schedule.creativeStaff.cys || "";

                    // Populate hosts
                    const hostsContainer = document.getElementById("hosts-container");
                    hostsContainer.innerHTML = ""; // Clear existing hosts
                    schedule.hosts.forEach((host, index) => {
                        const hostDiv = document.createElement("div");
                        hostDiv.className = "name-section host-input";
                        hostDiv.innerHTML = `
                            <input type="text" name="hosts[${index}].lastName" value="${host.lastName}" placeholder="Last Name" required>
                            <input type="text" name="hosts[${index}].firstName" value="${host.firstName}" placeholder="First Name" required>
                            <input type="text" name="hosts[${index}].mi" value="${host.mi}" placeholder="M.I.">
                            <input type="text" name="hosts[${index}].suffix" value="${host.suffix}" placeholder="Suffix">
                            <input type="text" name="hosts[${index}].cys" value="${host.cys}" placeholder="CYS">
                        `;
                        hostsContainer.appendChild(hostDiv);
                    });

                    // Populate technical staff
                    const technicalContainer = document.getElementById("technical-container");
                    technicalContainer.innerHTML = ""; // Clear existing technical staff
                    schedule.technicalStaff.forEach((tech, index) => {
                        const techDiv = document.createElement("div");
                        techDiv.className = "name-section technical-input";
                        techDiv.innerHTML = `
                            <input type="text" name="technicalStaff[${index}].lastName" value="${tech.lastName}" placeholder="Last Name" required>
                            <input type="text" name="technicalStaff[${index}].firstName" value="${tech.firstName}" placeholder="First Name" required>
                            <input type="text" name="technicalStaff[${index}].mi" value="${tech.mi}" placeholder="M.I.">
                            <input type="text" name="technicalStaff[${index}].suffix" value="${tech.suffix}" placeholder="Suffix">
                            <input type="text" name="technicalStaff[${index}].cys" value="${tech.cys}" placeholder="CYS">
                        `;
                        technicalContainer.appendChild(techDiv);
                    });

                    saveButton.textContent = "Edit";
                    deleteButton.style.display = "inline-block";
                } catch (error) {
                    console.error("Error fetching schedule details:", error);
                }
            } else {
                scheduleForm.dataset.scheduleId = "";
                scheduleForm.dataset.day = day;
                scheduleForm.dataset.time = time;
                scheduleForm.reset();

                // Clear dynamically added hosts while keeping the default structure
                const hostsContainer = document.getElementById("hosts-container");
                const hostInputs = hostsContainer.querySelectorAll(".host-input");
                hostInputs.forEach((hostInput, index) => {
                    if (index > 0) {
                        hostsContainer.removeChild(hostInput); // Remove all but the first default host input
                    } else {
                        // Reset the default host input fields
                        hostInput.querySelector("input[name='hosts[0].lastName']").value = "";
                        hostInput.querySelector("input[name='hosts[0].firstName']").value = "";
                        hostInput.querySelector("input[name='hosts[0].mi']").value = "";
                        hostInput.querySelector("input[name='hosts[0].suffix']").value = "";
                        hostInput.querySelector("input[name='hosts[0].cys']").value = "";
                    }
                });

                // Clear dynamically added technical staff while keeping the default structure
                const technicalContainer = document.getElementById("technical-container");
                const technicalInputs = technicalContainer.querySelectorAll(".technical-input");
                technicalInputs.forEach((technicalInput, index) => {
                    if (index > 0) {
                        technicalContainer.removeChild(technicalInput); // Remove all but the first default technical input
                    } else {
                        // Reset the default technical input fields
                        technicalInput.querySelector("input[name='technicalStaff[0].lastName']").value = "";
                        technicalInput.querySelector("input[name='technicalStaff[0].firstName']").value = "";
                        technicalInput.querySelector("input[name='technicalStaff[0].mi']").value = "";
                        technicalInput.querySelector("input[name='technicalStaff[0].suffix']").value = "";
                        technicalInput.querySelector("input[name='technicalStaff[0].cys']").value = "";
                    }
                });

                saveButton.textContent = "Save";
                deleteButton.style.display = "none";
            }

            modal.style.display = "block";
        });
    });

    closeModal.addEventListener("click", () => {
        modal.style.display = "none";
    });

    document.getElementById("scheduleForm").addEventListener("saveButton", function (event) {
        const checkboxes = document.querySelectorAll("input[name^='showDetails']");
        const otherCheckbox = document.getElementById("other");
        const otherInput = document.getElementById("other-input");
        let isChecked = false;

        checkboxes.forEach((checkbox) => {
            if (checkbox.checked) {
                isChecked = true;
            }
        });

        if (!isChecked) {
            alert("Please choose at least one type of show.");
            event.preventDefault();
            return;
        }

        if (otherCheckbox.checked && otherInput.value.trim() === "") {
            alert("Please specify other type of show.");
            event.preventDefault();
            return;
        }
    });

    const checkbox = document.getElementById("other");
    const input = document.getElementById("other-input");

    function toggleOtherInputs() {
        const isChecked = checkbox.checked;
        input.disabled = !isChecked;
    }

    toggleOtherInputs();
    checkbox.addEventListener("change", toggleOtherInputs);

    let hostIndex = 1;
    let technicalIndex = 1;

    function addHost() {
        const hostsContainer = document.getElementById("hosts-container");
        const currentHosts = hostsContainer.getElementsByClassName("host-input").length;

        if (currentHosts < 4) {
            const newHostDiv = document.createElement("div");
            newHostDiv.className = "name-section host-input";

            newHostDiv.innerHTML = `
                <input type="text" name="hosts[${hostIndex}].lastName" placeholder="Last Name" required>
                <input type="text" name="hosts[${hostIndex}].firstName" placeholder="First Name" required>
                <input type="text" name="hosts[${hostIndex}].mi" placeholder="M.I.">
                <input type="text" name="hosts[${hostIndex}].suffix" placeholder="Suffix">
                <input type="text" name="hosts[${hostIndex}].cys" placeholder="CYS">
                <button type="button" class="remove-host">Remove</button>
            `;

            hostsContainer.appendChild(newHostDiv);

            newHostDiv.querySelector(".remove-host").addEventListener("click", function () {
                hostsContainer.removeChild(newHostDiv);
                updateHostIndices();
                toggleAddHostButton();
            });

            hostIndex++;
        }
        toggleAddHostButton();
    }

    function updateHostIndices() {
        const hostsContainer = document.getElementById("hosts-container");
        const hostInputs = hostsContainer.getElementsByClassName("host-input");

        for (let i = 0; i < hostInputs.length; i++) {
            const inputs = hostInputs[i].getElementsByTagName("input");
            inputs[0].name = `hosts[${i}].lastName`;
            inputs[1].name = `hosts[${i}].firstName`;
            inputs[2].name = `hosts[${i}].mi`;
            inputs[3].name = `hosts[${i}].suffix`;
            inputs[4].name = `hosts[${i}].cys`;
        }
    }

    function toggleAddHostButton() {
        const hostsContainer = document.getElementById("hosts-container");
        const addHostButton = document.getElementById("add-host");
        const currentHosts = hostsContainer.getElementsByClassName("host-input").length;

        addHostButton.disabled = currentHosts >= 4;
    }

    function addTechnical() {
        const technicalContainer = document.getElementById("technical-container");
        const currentTechnical = technicalContainer.getElementsByClassName("technical-input").length;

        if (currentTechnical < 2) {
            const newTechnicalDiv = document.createElement("div");
            newTechnicalDiv.className = "name-section technical-input";

            newTechnicalDiv.innerHTML = `
                <input type="text" name="technicalStaff[${technicalIndex}].lastName" placeholder="Last Name" required>
                <input type="text" name="technicalStaff[${technicalIndex}].firstName" placeholder="First Name" required>
                <input type="text" name="technicalStaff[${technicalIndex}].mi" placeholder="M.I.">
                <input type="text" name="technicalStaff[${technicalIndex}].suffix" placeholder="Suffix">
                <input type="text" name="technicalStaff[${technicalIndex}].cys" placeholder="CYS">
                <button type="button" class="remove-technical">Remove</button>
            `;

            technicalContainer.appendChild(newTechnicalDiv);

            newTechnicalDiv.querySelector(".remove-technical").addEventListener("click", function () {
                technicalContainer.removeChild(newTechnicalDiv);
                updateTechnicalIndices();
                toggleAddTechnicalButton();
            });

            technicalIndex++;
        }
        toggleAddTechnicalButton();
    }

    function updateTechnicalIndices() {
        const technicalContainer = document.getElementById("technical-container");
        const technicalInputs = technicalContainer.getElementsByClassName("technical-input");

        for (let i = 0; i < technicalInputs.length; i++) {
            const inputs = technicalInputs[i].getElementsByTagName("input");
            inputs[0].name = `technicalStaff[${i}].lastName`;
            inputs[1].name = `technicalStaff[${i}].firstName`;
            inputs[2].name = `technicalStaff[${i}].mi`;
            inputs[3].name = `technicalStaff[${i}].suffix`;
            inputs[4].name = `technicalStaff[${i}].cys`;
        }
    }

    function toggleAddTechnicalButton() {
        const technicalContainer = document.getElementById("technical-container");
        const addTechnicalButton = document.getElementById("add-technical");
        const currentTechnical = technicalContainer.getElementsByClassName("technical-input").length;

        addTechnicalButton.disabled = currentTechnical >= 2;
    }

    document.getElementById("add-host").addEventListener("click", addHost);
    document.getElementById("add-technical").addEventListener("click", addTechnical);

    toggleAddHostButton();
    toggleAddTechnicalButton();

    saveButton.addEventListener("click", async (e) => {
        e.preventDefault(); // Prevent default form submission

        // Validate show type selection
        const selectedTypes = Array.from(document.querySelectorAll("input[name='showDetails.type[]']:checked")).map(cb => cb.value);
        const otherCheckbox = document.getElementById("other");
        const otherInput = document.getElementById("other-input");

        if (selectedTypes.length === 0) {
            alert("Please choose at least one type of show.");
            return;
        }

        if (otherCheckbox.checked && otherInput.value.trim() === "") {
            alert("Please specify the 'Other' type of show.");
            return;
        }

        // If "Other" is selected, add its value to the selected types
        if (otherCheckbox.checked) {
            selectedTypes.push(otherInput.value.trim());
        }

        // Collect form data
        const formData = new FormData(scheduleForm);
        formData.append("day", scheduleForm.dataset.day);
        formData.append("time", scheduleForm.dataset.time);

        // Convert FormData to JSON object
        const data = Object.fromEntries(formData.entries());

        // Add nested objects for showDetails, executiveProducer, hosts, technicalStaff, and creativeStaff
        data.showDetails = {
            title: document.getElementById("showTitle").value,
            type: selectedTypes, // Use the validated and updated selected types
            description: document.getElementById("show-description").value,
            objectives: document.getElementById("showObjectives").value
        };

        data.executiveProducer = {
            lastName: document.getElementById("execProducerLastName").value,
            firstName: document.getElementById("execProducerFirstName").value,
            mi: document.getElementById("execProducerMI").value,
            suffix: document.getElementById("execProducerSuffix").value,
            cys: document.getElementById("execProducerCYS").value
        };

        data.hosts = Array.from(document.querySelectorAll(".host-input")).map(host => ({
            lastName: host.querySelector("input[name$='.lastName']").value,
            firstName: host.querySelector("input[name$='.firstName']").value,
            mi: host.querySelector("input[name$='.mi']").value,
            suffix: host.querySelector("input[name$='.suffix']").value,
            cys: host.querySelector("input[name$='.cys']").value
        }));

        data.technicalStaff = Array.from(document.querySelectorAll(".technical-input")).map(tech => ({
            lastName: tech.querySelector("input[name$='.lastName']").value,
            firstName: tech.querySelector("input[name$='.firstName']").value,
            mi: tech.querySelector("input[name$='.mi']").value,
            suffix: tech.querySelector("input[name$='.suffix']").value,
            cys: tech.querySelector("input[name$='.cys']").value
        }));

        data.creativeStaff = {
            lastName: document.getElementById("creativeStaffLastName").value,
            firstName: document.getElementById("creativeStaffFirstName").value,
            mi: document.getElementById("creativeStaffMI").value,
            suffix: document.getElementById("creativeStaffSuffix").value,
            cys: document.getElementById("creativeStaffCYS").value
        };

        // Add schoolYear
        data.schoolYear = new Date().getFullYear().toString();

        // Determine if this is a new schedule or an update
        const scheduleId = scheduleForm.dataset.scheduleId;
        const method = scheduleId ? "PATCH" : "POST";
        const url = scheduleId ? `/schedule/${scheduleId}` : "/schedule";

        try {
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert(scheduleId ? "Schedule updated successfully!" : "Schedule saved successfully!");
                modal.style.display = "none";

                // Dynamically update the schedule buttons
                const selectedYear = document.getElementById("schoolYear").value;
                await refreshSchedule(selectedYear);
            } else {
                alert("Failed to save schedule.");
            }
        } catch (error) {
            console.error("Error saving schedule:", error);
        }
    });

    const preferredDayDropdown = document.getElementById("preferredDay");
    const preferredTimeDropdown = document.getElementById("preferredTime");

    // Fetch existing schedules from the server
    let existingSchedules = [];
    try {
        const response = await fetch("/schedule");
        if (!response.ok) throw new Error("Failed to fetch schedules");
        existingSchedules = await response.json();
    } catch (error) {
        console.error("Error fetching schedules:", error);
    }

    // Define available times for each day
    const availableTimes = {
        Monday: ["9:10-9:55", "10:00-10:55", "11:00-11:55", "1:00-1:55", "2:00-2:55", "3:00-3:55", "4:00-4:50"],
        Tuesday: ["9:10-9:55", "10:00-10:55", "11:00-11:55", "1:00-1:55", "2:00-2:55", "3:00-3:55", "4:00-4:50"],
        Wednesday: ["9:10-9:55", "10:00-10:55", "11:00-11:55", "1:00-1:55", "2:00-2:55", "3:00-3:55", "4:00-4:50"],
        Thursday: ["9:10-9:55", "10:00-10:55", "11:00-11:55", "1:00-1:55", "2:00-2:55", "3:00-3:55", "4:00-4:50"],
        Friday: ["9:10-9:55", "10:00-10:55", "11:00-11:55", "12:01-12:55", "1:00-1:55", "2:00-2:55", "3:00-3:55", "4:00-4:50"]
    };

    // Event listener for day selection
    preferredDayDropdown.addEventListener("change", () => {
        const selectedDay = preferredDayDropdown.value;

        // Clear and enable the time dropdown
        preferredTimeDropdown.innerHTML = '<option value="" disabled selected>Select a time</option>';
        preferredTimeDropdown.disabled = false;

        // Filter out times that are already occupied
        const occupiedTimes = existingSchedules
            .filter(schedule => schedule.day === selectedDay)
            .map(schedule => schedule.time);

        // Populate the time dropdown with available times for the selected day
        if (availableTimes[selectedDay]) {
            availableTimes[selectedDay].forEach((time) => {
                if (!occupiedTimes.includes(time)) {
                    const option = document.createElement("option");
                    option.value = time;
                    option.textContent = time;
                    preferredTimeDropdown.appendChild(option);
                }
            });
        }
    });

    // Initial load of submissions for the current year
    submissionSchoolYearDropdown.value = currentYear;
    // Load submissions for the current year on page load
    await loadSubmissions();

    // Add event listener to reload submissions when the year changes
    submissionSchoolYearDropdown.addEventListener("change", async () => {
        await loadSubmissions(); // Reload submissions for the selected year
    });
});

deleteButton.addEventListener("click", async () => {
    const scheduleId = scheduleForm.dataset.scheduleId;

    console.log("Schedule ID to delete:", scheduleId); // Debugging log

    if (!scheduleId) {
        alert("No schedule selected to delete.");
        return;
    }

    const confirmDelete = confirm("Are you sure you want to delete this schedule?");
    if (!confirmDelete) return;

    try {
        const response = await fetch(`/schedule/${scheduleId}`, {
            method: "DELETE",
        });

        console.log("Delete response status:", response.status); // Debugging log

        if (response.ok) {
            alert("Schedule deleted successfully!");
            modal.style.display = "none";

            // Refresh the schedule buttons to reflect the deletion
            const selectedYear = document.getElementById("schoolYear").value;
            console.log("Refreshing schedule for year:", selectedYear); // Debugging log
            await refreshSchedule(selectedYear);
        } else {
            // Handle non-OK responses
            const errorData = await response.json();
            console.error("Failed to delete schedule:", errorData);
            alert("Failed to delete schedule.");
        }
    } catch (error) {
        // Only handle actual errors here
        console.error("Error deleting schedule:", error);
        alert("An error occurred while trying to delete the schedule.");
    }
});

/*-----SUBMISSIONS TAB-----*/
// Fetch and display submissions in the table
async function loadSubmissions() {
    try {
        const schoolYear = document.getElementById("submissionSchoolYear").value; // Get the selected school year
        const response = await fetch(`/submissions?schoolYear=${schoolYear}`); // Include schoolYear in the query
        if (!response.ok) throw new Error("Failed to fetch submissions");

        const submissions = await response.json();
        console.log(`Submissions for ${schoolYear}:`, submissions);

        const tableBody = document.getElementById("submissions-table-body");
        tableBody.innerHTML = ""; // Clear existing rows

        if (Array.isArray(submissions) && submissions.length > 0) {
            submissions.forEach((submission) => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${submission.showDetails?.title || "N/A"}</td>
                    <td>${submission.organizationName || "N/A"}</td>
                    <td>${submission.preferredSchedule?.day || "N/A"} ${submission.preferredSchedule?.time?.join(", ") || "N/A"}</td>
                    <td>${submission.result || "N/A"}</td>
                    <td><button type="button" class="select-btn" data-id="${submission._id}">Select</button></td>
                `;
                tableBody.appendChild(row);
            });

            // Add event listeners to "Select" buttons
            document.querySelectorAll(".select-btn").forEach((button) => {
                button.addEventListener("click", () =>
                    selectSubmission(button.dataset.id)
                );
            });
        } else {
            tableBody.innerHTML =
                '<tr><td colspan="4">No submissions available.</td></tr>';
        }
    } catch (error) {
        console.error("Error loading submissions:", error);
        document.getElementById("submissions-table-body").innerHTML =
            '<tr><td colspan="4">Failed to load submissions.</td></tr>';
    }
}

// Populate the form with the selected submission's details
async function selectSubmission(submissionId) {
	try {
		const response = await fetch(`/submissions/${submissionId}`);
		const submission = await response.json();

		// Populate the form fields
		document.getElementById("organizationName").value = submission.organizationName;
		document.getElementById("organizationType").value = submission.organizationType;
		document.getElementById("proponentName").value = `${submission.proponent.lastName}, ${submission.proponent.firstName} ${submission.proponent.middleInitial ?? ""} ${submission.proponent.suffix ?? ""}`;
		document.getElementById("proponentCYS").value = `${ submission.proponent.cys ?? "" }`;
		if (submission.coProponent.notApplicable) {
			document.getElementById("coProponentName").value = "N/A";
			document.getElementById("coProponentCYS").value = "N/A";
		} else {
			document.getElementById("coProponentName").value = `${submission.coProponent.lastName}, ${submission.coProponent.firstName} ${submission.coProponent.middleInitial ?? ""} ${submission.coProponent.suffix ?? ""}`;
			document.getElementById("coProponentCYS").value = `${submission.coProponent.cys ?? ""}`;
		}
		document.getElementById("executiveProducer").value = `${submission.executiveProducer.lastName}, ${submission.executiveProducer.firstName} ${submission.executiveProducer.middleInitial ?? ""} ${submission.executiveProducer.suffix ?? ""}`;
		document.getElementById("executiveProducerCYS").value = `${submission.executiveProducer.cys ?? ""}`;
		if (submission.facultyStaff.notApplicable) {
			document.getElementById("facultyStaff").value = "N/A";
			document.getElementById("facultyStaffDepartment").value = "N/A";
		} else {
			document.getElementById("facultyStaff").value = `${submission.facultyStaff.lastName}, ${submission.facultyStaff.firstName} ${submission.facultyStaff.middleInitial ?? ""} ${submission.facultyStaff.suffix ?? ""}`;
			document.getElementById("facultyStaffDepartment").value = `${submission.facultyStaff.cys ?? ""}`;
		}

		document.getElementById("host-container").innerHTML = "";

		// Iterate over the hosts array and populate the fields
		submission.hosts.forEach((host, index) => {
			const hostField = document.createElement("div");
			hostField.innerHTML = `
                <label for="host${index}">Host Name:</label>
                <input type="text" id="host${index}" name="host${index}" value="${host.lastName}, ${host.firstName} ${host.middleInitial ?? ""} ${host.suffix ?? ""}" readonly>
                <label for="hostCYS${index}">Host CYS:</label>
                <input type="text" id="hostCYS${index}" name="hostCYS${index}" value="${host.cys ?? ""}" readonly>`;
			document.getElementById("host-container").appendChild(hostField);
		});

		document.getElementById("technicalStaff-container").innerHTML = "";

		// Iterate over the hosts array and populate the fields
		submission.technicalStaff.forEach((technicalStaff, index) => {
			const technicalStaffField = document.createElement("div");
			technicalStaffField.innerHTML = `
                <label for="technicalStaff${index}">technicalStaff Name:</label>
                <input type="text" id="technicalStaff${index}" name="technicalStaff${index}" value="${technicalStaff.lastName}, ${technicalStaff.firstName} ${technicalStaff.middleInitial ?? ""} ${technicalStaff.suffix ?? ""}" readonly>
                <label for="technicalStaffCYS${index}">technicalStaff CYS:</label>
                <input type="text" id="technicalStaffCYS${index}" name="technicalStaffCYS${index}" value="${technicalStaff.cys ?? ""}" readonly>`;
			document.getElementById("technicalStaff-container").appendChild(technicalStaffField);
		});

		document.getElementById("creativeStaff").value = `${submission.creativeStaff.lastName}, ${submission.creativeStaff.firstName} ${submission.creativeStaff.middleInitial ?? ""} ${submission.creativeStaff.suffix ?? ""}`;
		document.getElementById("creativeStaffCYS").value = `${submission.creativeStaff.cys ?? ""}`;
		document.getElementById("dlsudEmail").value = submission.contactInfo.dlsudEmail;
		document.getElementById("contactEmail").value = submission.contactInfo.contactEmail;
		document.getElementById("contactFbLink").value = submission.contactInfo.contactFbLink;
		if (submission.contactInfo.crossposting === "Yes") {
			document.getElementById("FbLink").value = submission.contactInfo.fbLink;
			document.getElementById("FbLink-container").style.display = "block"; // Ensure it is visible
		} else {
			document.getElementById("FbLink-container").style.display = "none"; // Properly hide the element
			document.getElementById("FbLink").value = ""; // Clear the value to avoid stale data
		}
		if (submission.proponentSignature) {
			const proponentSignatureImg = document.getElementById("proponentSignature");
			proponentSignatureImg.src = submission.proponentSignature;
			proponentSignatureImg.style.display = "block"; // Show the image
		} else {
			document.getElementById("proponentSignature").style.display = "none"; // Hide the image
		}
		document.getElementById("show-title").value = submission.showDetails.title ;
		document.getElementById("showType").value = submission.showDetails.type;
		document.getElementById("showDescription").value = submission.showDetails.description;
		document.getElementById("show-objectives").value = submission.showDetails.objectives;
		// Populate the form fields
        document.getElementById("preferredDay").value = submission.preferredSchedule.day;

        // Populate the preferredTime dropdown with available times for the selected day
        const preferredDayDropdown = document.getElementById("preferredDay");
        const preferredTimeDropdown = document.getElementById("preferredTime");

        const availableTimes = {
            Monday: ["9:10-9:55", "10:00-10:55", "11:00-11:55", "1:00-1:55", "2:00-2:55", "3:00-3:55", "4:00-4:50"],
            Tuesday: ["9:10-9:55", "10:00-10:55", "11:00-11:55", "1:00-1:55", "2:00-2:55", "3:00-3:55", "4:00-4:50"],
            Wednesday: ["9:10-9:55", "10:00-10:55", "11:00-11:55", "1:00-1:55", "2:00-2:55", "3:00-3:55", "4:00-4:50"],
            Thursday: ["9:10-9:55", "10:00-10:55", "11:00-11:55", "1:00-1:55", "2:00-2:55", "3:00-3:55", "4:00-4:50"],
            Friday: ["9:10-9:55", "10:00-10:55", "11:00-11:55", "12:01-12:55", "1:00-1:55", "2:00-2:55", "3:00-3:55", "4:00-4:50"]
        };

        const selectedDay = submission.preferredSchedule.day;
        const selectedTime = submission.preferredSchedule.time;

        preferredDayDropdown.disabled = false; // Disable the day dropdown to prevent changes

        // Clear and enable the time dropdown
        preferredTimeDropdown.innerHTML = '<option value="" disabled>Select a time</option>';
        preferredTimeDropdown.disabled = false;

        // Populate the time dropdown with available times for the selected day
        if (availableTimes[selectedDay]) {
            availableTimes[selectedDay].forEach((time) => {
                const option = document.createElement("option");
                option.value = time;
                option.textContent = time;
                preferredTimeDropdown.appendChild(option);
            });
        }

        // Set the selected time
        preferredTimeDropdown.value = selectedTime;
		document.getElementById("result").value = submission.result;

        

		// Show the form
		document.getElementById("result").disabled = false;

		// Enable the "Cancel" and "Submit" buttons
		document.querySelector(".cancel-button").disabled = false;
		document.querySelector(".submit-button").disabled = false;

		document.querySelector(".submit-button").dataset.submissionId =
			submissionId;
	} catch (error) {
		console.error("Error fetching submission details:", error);
		alert("Failed to load submission details.");
	}
}

async function updateSubmission(submissionId) {
    const result = document.getElementById("result").value;
    const preferredDay = document.getElementById("preferredDay").value;
    const preferredTime = document.getElementById("preferredTime").value;

    if (result === "Pending") {
        alert("Please select a RESULT before submitting.");
        return;
    }

    if (!preferredTime || preferredTime === "Select a time") {
        alert("Please select a TIME before submitting.");
        return;
    }

    // Check if the preferred day and time are already occupied
    try {
        const response = await fetch(`/schedule?day=${preferredDay}&time=${preferredTime}`);
        if (!response.ok) throw new Error("Failed to check existing schedules");

        const existingSchedules = await response.json();
        if (existingSchedules.length > 0) {
            alert(`${preferredDay} (${preferredTime}) are already occupied by another schedule.`);
            return;
        }
    } catch (error) {
        console.error("Error checking existing schedules:", error);
        alert("An error occurred while checking the schedule availability.");
        return;
    }

    const updates = { result, preferredDay, preferredTime };

    try {
        const response = await fetch(`/submissions/${submissionId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(updates),
        });

        const resultData = await response.json();
        if (response.ok) {
            alert("Submission updated successfully!");

            if (result === "Accept") {
                const submissionResponse = await fetch(`/submissions/${submissionId}`);
                const submission = await submissionResponse.json();

                const scheduleData = {
                    day: submission.preferredSchedule.day,
                    time: submission.preferredSchedule.time.toString(),
                    showDetails: {
                        title: submission.showDetails.title,
                        type: submission.showDetails.type,
                        description: submission.showDetails.description,
                        objectives: submission.showDetails.objectives
                    },
                    executiveProducer: {
                        lastName: submission.executiveProducer.lastName,
                        firstName: submission.executiveProducer.firstName,
                        mi: submission.executiveProducer.middleInitial || "",
                        suffix: submission.executiveProducer.suffix || "",
                        cys: submission.executiveProducer.cys || ""
                    },
                    hosts: submission.hosts.map(host => ({
                        lastName: host.lastName,
                        firstName: host.firstName,
                        mi: host.middleInitial || "",
                        suffix: host.suffix || "",
                        cys: host.cys || ""
                    })),
                    technicalStaff: submission.technicalStaff.map(tech => ({
                        lastName: tech.lastName,
                        firstName: tech.firstName,
                        mi: tech.middleInitial || "",
                        suffix: tech.suffix || "",
                        cys: tech.cys || ""
                    })),
                    creativeStaff: {
                        lastName: submission.creativeStaff.lastName,
                        firstName: submission.creativeStaff.firstName,
                        mi: submission.creativeStaff.middleInitial || "",
                        suffix: submission.creativeStaff.suffix || "",
                        cys: submission.creativeStaff.cys || ""
                    },
                    schoolYear: new Date().getFullYear().toString()
                };

                console.log("Schedule data being sent:", scheduleData);

                const scheduleResponse = await fetch("/schedule", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(scheduleData),
                });

                if (scheduleResponse.ok) {
                    alert("Schedule saved successfully!");

                    const selectedYear = document.getElementById("schoolYear").value;
                    await refreshSchedule(selectedYear); // Refresh the schedule buttons
                } else {
                    const errorData = await scheduleResponse.json();
                    console.error("Failed to save schedule:", errorData);
                    alert("Failed to save schedule.");
                }
            }

            loadSubmissions(); // Reload the submissions table
            clearFields(); // Clear the form fields
        } else {
            alert(resultData.error || "Failed to update submission");
        }
    } catch (error) {
        console.error("Error updating submission:", error);
        alert("Failed to update submission");
    }
}

// Add event listener to the "Submit" button
document.querySelector(".submit-button").addEventListener("click", () => {
	const submissionId =
		document.querySelector(".submit-button").dataset.submissionId;
	if (submissionId) {
		updateSubmission(submissionId);
	} else {
		alert("No submission selected");
	}
});

document.querySelector(".cancel-button").addEventListener("click", () => {
	clearFields();
});

// Load submissions on page load
document.addEventListener("DOMContentLoaded", loadSubmissions);

// Tab switching logic
document.querySelectorAll(".tab-button").forEach((button) => {
	button.addEventListener("click", () => {
		// Remove 'active' class from all buttons and tabs
		document
			.querySelectorAll(".tab-button")
			.forEach((btn) => btn.classList.remove("active"));
		document
			.querySelectorAll(".tab-pane")
			.forEach((tab) => tab.classList.remove("active"));

		// Add 'active' class to the clicked button and corresponding tab
		button.classList.add("active");
		document.getElementById(button.dataset.tab).classList.add("active");
	});
});

function clearFields() {
	// Clear all form fields
	document.getElementById("organizationName").value = "";
	document.getElementById("organizationType").value = "";
	document.getElementById("proponentName").value = "";
	document.getElementById("proponentCYS").value = "";
	document.getElementById("coProponentName").value = "";
	document.getElementById("coProponentCYS").value = "";
	document.getElementById("executiveProducer").value = "";
	document.getElementById("executiveProducerCYS").value = "";
	document.getElementById("facultyStaff").value = "";
	document.getElementById("facultyStaffDepartment").value = "";
	document.getElementById("host-container").innerHTML = "";
	document.getElementById("technicalStaff-container").innerHTML = "";
	document.getElementById("creativeStaff").value = "";
	document.getElementById("creativeStaffCYS").value = "";
	document.getElementById("dlsudEmail").value = "";
	document.getElementById("contactEmail").value = "";
	document.getElementById("contactFbLink").value = "";
	document.getElementById("FbLink").value = "";
	document.getElementById("FbLink-container").style.display = "none";
	document.getElementById("proponentSignature").style.display = "none";
	document.getElementById("showTitle").value = "";
	document.getElementById("showType").value = "";
	document.getElementById("showDescription").value = "";
	document.getElementById("showObjectives").value = "";
	document.getElementById("preferredDay").value = "";
	document.getElementById("preferredTime").value = "";

	// Disable the "Cancel" and "Submit" buttons
	document.querySelector(".cancel-button").disabled = true;
	document.querySelector(".submit-button").disabled = true;

	// Optionally, disable the form or reset any other state
	document.getElementById("result").disabled = true;
}
