document.getElementById("liveForm").addEventListener("submit", function(e) {
        e.preventDefault();
        const link = document.getElementById("fbLiveLink").value;

        const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(link)}&show_text=0&autoplay=1&mute=0`;
        document.getElementById("livePlayer").innerHTML = `
            <iframe 
                src="${embedUrl}" 
                width="100%" 
                height="480" 
                style="border:none;overflow:hidden" 
                scrolling="no" 
                frameborder="0" 
                allowfullscreen="true" 
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share">
            </iframe>
        `;
});