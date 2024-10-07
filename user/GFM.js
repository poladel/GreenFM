document.addEventListener("DOMContentLoaded", function() {
    // Get references to the "BE A BLOCKTIMER" and "JOIN GREEN FM" links
    var blocktimerLink = document.getElementById("blocktimer-link");
    var joingreenfmLink = document.getElementById("joingreenfm-link");

    // Handle all sidebar link clicks (except "BE A BLOCKTIMER" and "JOIN GREEN FM")
    var menuLinks = document.querySelectorAll('.sidebar .menu li a');
    menuLinks.forEach(function(link) {
        link.addEventListener("click", function(event) {
            var sectionId = this.getAttribute('href').substring(1); // Get section ID from the href

            // Show forms dynamically only if it's for blocktimer or join forms
            if (sectionId === "blocktimer-form" || sectionId === "joingreenfm-form") {
                // SPA logic to show forms dynamically
                event.preventDefault(); // Prevent default navigation
                if (sectionId === "blocktimer-form") {
                    showBlocktimerForm();
                } else if (sectionId === "joingreenfm-form") {
                    showJoinGreenFMForm();
                }
            } 
            // Other links will now function normally, allowing page navigation
        });
    });

    // No need to prevent default behavior for "BE A BLOCKTIMER" and "JOIN GREEN FM" links
    blocktimerLink.addEventListener("click", function(event) {
        // Let the default behavior of the link proceed to load "6-blocktimer.html"
    });

    joingreenfmLink.addEventListener("click", function(event) {
        // Let the default behavior of the link proceed to load "7-joingreenfm.html"
    });

    // Functions for displaying forms dynamically (for future use)
    function showBlocktimerForm() {
        var sections = document.querySelectorAll(".content-container > div");
        sections.forEach(function(section) {
            section.style.display = "none";
        });
        var blocktimerForm = document.getElementById("blocktimer-form");
        if (blocktimerForm) {
            blocktimerForm.style.display = "block";
        }
    }

    function showJoinGreenFMForm() {
        var sections = document.querySelectorAll(".content-container > div");
        sections.forEach(function(section) {
            section.style.display = "none";
        });
        var joingreenfmForm = document.getElementById("joingreenfm-form");
        if (joingreenfmForm) {
            joingreenfmForm.style.display = "block";
        }
    }

    // Example of setting the active class dynamically
    document.querySelectorAll('.menu a').forEach(link => {
        if (link.href === window.location.href) {
            link.classList.add('active');
        }
    });
});
