document.addEventListener('DOMContentLoaded', () => { // Wrap in DOMContentLoaded

  // --- Modal Elements ---
  const uploadModal = document.getElementById('uploadModal');
  const openUploadBtn = document.getElementById('openModalBtn');
  const closeUploadBtn = document.getElementById('closeModalBtn');
  const modalUploadForm = document.getElementById('modal-upload-form');

  const viewModal = document.getElementById('viewFilesModal');
  const closeViewModalBtn = document.getElementById('closeViewModalBtn');
  const previewArea = document.getElementById('previewArea');

  const addFilesModal = document.getElementById('addFilesModal');
  const closeAddFilesModalBtn = document.getElementById('closeAddFilesModalBtn');
  const addFilesForm = document.getElementById('add-files-form');
  const addFilesFolderIdInput = document.getElementById('add-files-folder-id');

  // --- Helper Functions for Modals (using Tailwind classes) ---
  function openModal(modalElement) {
      if (modalElement) {
          modalElement.classList.remove('hidden');
          // Optionally add flex if needed for centering, but depends on your EJS structure
          // modalElement.classList.add('flex');
          document.body.classList.add('overflow-hidden'); // Prevent body scroll
      }
  }

  function closeModal(modalElement) {
      if (modalElement) {
          modalElement.classList.add('hidden');
          // modalElement.classList.remove('flex');
          document.body.classList.remove('overflow-hidden');
      }
  }

  // --- Event Listeners for Create Folder Modal ---
  if (openUploadBtn) {
      openUploadBtn.addEventListener('click', () => openModal(uploadModal));
  }
  if (closeUploadBtn) {
      closeUploadBtn.addEventListener('click', () => closeModal(uploadModal));
  }
  // Close modal on outside click
  if (uploadModal) {
      uploadModal.addEventListener('click', (e) => {
          if (e.target === uploadModal) {
              closeModal(uploadModal);
          }
      });
  }

  // Create Folder Form Submission
  if (modalUploadForm) {
      modalUploadForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const form = e.target;
          const formData = new FormData(form);

          // Basic check if folder name is provided
           if (!formData.get('folderName')?.trim()) {
               alert('Folder name is required.');
               return;
           }

          try {
              // Show spinner maybe?
              const res = await fetch('/upload', { // Ensure endpoint matches archiveRoutes.js
                  method: 'POST',
                  body: formData,
              });

              if (res.ok) {
                  closeModal(uploadModal);
                  window.location.reload(); // Reload to see the new folder
              } else {
                  const errorData = await res.json();
                  alert(`Upload failed: ${errorData.error || 'Unknown error'}`);
              }
          } catch (err) {
              console.error('Upload error:', err);
              alert('An error occurred during upload.');
          } finally {
              // Hide spinner
          }
      });
  }

  // --- Filter Logic ---
  const filterBtn = document.getElementById('filterBtn');
  if (filterBtn) {
      filterBtn.addEventListener('click', () => {
          const searchInput = document.getElementById('searchInput');
          const monthSelect = document.getElementById('filterMonth');
          const yearSelect = document.getElementById('filterYear');
          const foldersContainer = document.getElementById('folders-container'); // Assuming this container exists

          if (!searchInput || !monthSelect || !yearSelect || !foldersContainer) return; // Exit if elements are missing

          const search = searchInput.value.toLowerCase();
          const month = monthSelect.value; // Month is 0-11 or ""
          const year = yearSelect.value; // Year is YYYY or ""

          foldersContainer.querySelectorAll('.folder').forEach(folder => {
              const name = folder.dataset.name || ''; // Default to empty string
              const dateString = folder.dataset.date;
              let date = null;
              let matchMonth = true;
              let matchYear = true;

              if (dateString) {
                  try { date = new Date(dateString); } catch(e) { console.error("Invalid date", dateString)}
              }

              if(date && !isNaN(date.getTime())) { // Check if date is valid
                  matchMonth = !month || date.getMonth().toString() === month;
                  matchYear = !year || date.getFullYear().toString() === year;
              } else if (month || year) {
                  // If filtering by date but folder has no valid date, hide it
                  matchMonth = false;
                  matchYear = false;
              }


              const matchName = name.includes(search);

              // Use Tailwind's hidden class for visibility
              if (matchName && matchMonth && matchYear) {
                  folder.classList.remove('hidden');
              } else {
                  folder.classList.add('hidden');
              }
          });
      });
  }

  // --- Folder Click -> Open View Files Modal ---
  const folderHeaders = document.querySelectorAll('.folder-header');
  if (folderHeaders.length > 0 && viewModal && previewArea) {
      folderHeaders.forEach(header => {
          // Ensure click targets the header or elements within, but not the delete button
          header.addEventListener('click', (e) => {
              if (e.target.closest('.delete-folder-btn')) {
                  return; // Don't open modal if delete button is clicked
              }
              const folder = header.closest('.folder');
              if (!folder) return;

              const files = JSON.parse(folder.dataset.files || '[]');
              const folderId = folder.dataset.id;
              const folderName = folder.dataset.name || 'Folder'; // Get folder name

              // Set the folder ID on the modal delete button
              const modalDeleteBtn = viewModal.querySelector('.modal-delete-btn');
               if (modalDeleteBtn) {
                  modalDeleteBtn.dataset.id = folderId;
                  // Also set folder name for confirmation message
                  modalDeleteBtn.dataset.foldername = folderName;
               }


              openModal(viewModal);
              renderFileList(files, folderId, folderName); // Pass folderName
          });
      });
  }

  // Render file list inside the View Files Modal
  function renderFileList(files, folderId, folderName) { // Added folderName
      if (!previewArea) return;
      previewArea.innerHTML = ''; // Clear previous content

      if (files.length === 0) {
          previewArea.innerHTML = '<p class="text-center text-gray-500 py-4">No files in this folder.</p>';
          return;
      }

      // Use Tailwind grid for layout
      const listContainer = document.createElement('div');
      listContainer.className = 'file-list-modal grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mt-4'; // Responsive grid

      files.forEach(file => {
          const fileName = decodeURIComponent(file.split('/').pop()); // Decode URL component
          const fileExt = fileName.split('.').pop()?.toLowerCase() || '';

          // Thumbnail container with relative positioning for delete button
          const thumbContainer = document.createElement('div');
          thumbContainer.className = 'file-thumb relative flex flex-col items-center text-center group'; // Added group for hover effect
          thumbContainer.title = fileName; // Show full name on hover

          let fileElement;

          // Create thumbnail based on file type
           if (/\.(jpg|jpeg|png|gif|webp|avif)$/i.test(fileExt)) {
               fileElement = document.createElement('img');
               fileElement.src = file; // Use direct URL for images
               fileElement.alt = fileName;
               fileElement.className = 'archive-thumb w-20 h-20 md:w-24 md:h-24 object-cover rounded-md cursor-pointer border border-gray-200';
               fileElement.addEventListener('click', () => previewSingleFile(file, files, folderId, folderName)); // Click thumb to preview
           } else if (/\.(mp4|webm|ogg|mov)$/i.test(fileExt)) {
               fileElement = document.createElement('video');
               // Can't reliably show video thumbnail, use generic icon
               fileElement.className = 'archive-thumb w-20 h-20 md:w-24 md:h-24 object-contain rounded-md cursor-pointer border border-gray-200 bg-gray-100 flex items-center justify-center';
               fileElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>'; // Play icon
               fileElement.addEventListener('click', () => previewSingleFile(file, files, folderId, folderName)); // Click icon to preview
           } else {
               // Generic file icon, make it clickable for preview/download
               fileElement = document.createElement('div'); // Use a div container
               fileElement.className = 'archive-thumb w-20 h-20 md:w-24 md:h-24 object-contain rounded-md cursor-pointer border border-gray-200 bg-gray-100 flex items-center justify-center';
               fileElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" /></svg>'; // Document icon
               fileElement.addEventListener('click', () => previewSingleFile(file, files, folderId, folderName)); // Click icon to preview
           }

          thumbContainer.appendChild(fileElement);

          // File name display (truncated)
          const nameElement = document.createElement('div');
          nameElement.className = 'file-name text-center text-[10px] md:text-xs mt-1 w-20 md:w-24 truncate';
          nameElement.textContent = fileName;
          thumbContainer.appendChild(nameElement);

          // Delete button (shown on group hover) - Check user role
           if (document.body.dataset.userId) { // Simple check if user seems logged in (adapt as needed)
              const deleteBtn = document.createElement('button');
              deleteBtn.innerHTML = '×'; // Use times symbol
              deleteBtn.className = 'delete-file-btn absolute top-0 right-0 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity';
              deleteBtn.title = `Delete ${fileName}`;
              deleteBtn.dataset.folder = folderId;
              deleteBtn.dataset.url = file; // Store the full URL to delete
              deleteBtn.addEventListener('click', handleDeleteFile); // Use named handler
              thumbContainer.appendChild(deleteBtn);
          }

          listContainer.appendChild(thumbContainer);
      });

      previewArea.appendChild(listContainer);
  }

   // Handler for deleting a file
   async function handleDeleteFile(e) {
      e.stopPropagation(); // Prevent opening preview
      const button = e.currentTarget;
      const folderId = button.dataset.folder;
      const fileUrl = button.dataset.url;
      const fileName = decodeURIComponent(fileUrl.split('/').pop());

      if (!confirm(`Are you sure you want to delete this file: ${fileName}?`)) return;

      try {
          // showSpinner(); // Optional: show spinner
          const res = await fetch(`/archives/${folderId}/files`, { // Ensure endpoint matches archiveRoutes.js
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileUrl: fileUrl }) // Send URL in body
          });

          if (res.ok) {
              // alert('File deleted.'); // Optional feedback
              // Remove the thumbnail from the modal view dynamically
              button.closest('.file-thumb').remove();
              // You might need to update the folder's data-files attribute on the main page
              // or simply rely on page reload later. For now, just update modal.
              // Check if folder is now empty in modal
              const remainingThumbs = previewArea.querySelectorAll('.file-thumb');
               if (remainingThumbs.length === 0) {
                   renderFileList([], folderId, ''); // Re-render with empty state
               }

          } else {
              const errorData = await res.json();
              alert(`Failed to delete file: ${errorData.error || 'Unknown error'}`);
          }
      } catch (err) {
          console.error('File delete error:', err);
          alert('An error occurred while deleting the file.');
      } finally {
          // hideSpinner();
      }
  }


  // Preview single file in the View Files Modal
  function previewSingleFile(file, allFiles, folderId, folderName) { // Added folderName
      if (!previewArea) return;
      previewArea.innerHTML = ''; // Clear grid view

      const wrapper = document.createElement('div');
      wrapper.className = 'single-preview flex flex-col items-center w-full'; // Full width

      const fileExt = file.split('.').pop()?.toLowerCase() || '';
      let previewElement;

       // Back Button
       const backBtn = document.createElement('button');
       backBtn.innerHTML = '← Back to Folder'; // Left arrow
       backBtn.className = 'back-button self-start mb-3 px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 cursor-pointer font-semibold text-sm';
       backBtn.addEventListener('click', () => {
           renderFileList(allFiles, folderId, folderName); // Go back to grid view
       });
       wrapper.appendChild(backBtn);


      // Determine preview type
      if (/\.(jpg|jpeg|png|gif|webp|avif)$/i.test(fileExt)) {
          previewElement = document.createElement('img');
          previewElement.src = file;
          previewElement.alt = "File preview";
          previewElement.className = 'full-preview max-w-full max-h-[70vh] object-contain rounded-lg'; // contain ensures visibility
      } else if (/\.(mp4|webm|ogg|mov)$/i.test(fileExt)) {
          previewElement = document.createElement('video');
          previewElement.src = file;
          previewElement.controls = true;
          previewElement.autoplay = false; // Autoplay can be annoying
          previewElement.className = 'full-preview max-w-full max-h-[70vh] rounded-lg';
      } else if (fileExt === 'pdf') {
          previewElement = document.createElement('iframe');
          previewElement.src = file; // Most browsers can display PDFs directly
          previewElement.className = 'full-preview w-full h-[75vh] border-none rounded-lg';
      } else if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(fileExt)) {
          // Google Docs Viewer Embed (requires file to be publicly accessible)
          previewElement = document.createElement('iframe');
          previewElement.src = `https://docs.google.com/gview?url=${encodeURIComponent(file)}&embedded=true`;
          previewElement.className = 'full-preview w-full h-[75vh] border-none rounded-lg';
      } else {
          // Fallback for other file types - show icon and download link
          previewElement = document.createElement('div');
          previewElement.className = 'text-center p-5 border border-dashed border-gray-300 rounded-lg'
          const icon = document.createElement('img');
          icon.src = '/img/file.png'; // Generic file icon
          icon.alt = 'File icon';
          icon.className = 'w-16 h-16 mx-auto mb-3 text-gray-400'; // Tailwind styling
          const link = document.createElement('a');
          link.href = file;
          link.target = '_blank'; // Open in new tab
          link.download = decodeURIComponent(file.split('/').pop()); // Suggest original filename
          link.textContent = `Download ${decodeURIComponent(file.split('/').pop())}`;
          link.className = 'block mt-2 text-blue-600 hover:underline';
          previewElement.appendChild(icon);
          previewElement.appendChild(link);
      }

      wrapper.appendChild(previewElement);
      previewArea.appendChild(wrapper);
  }


  // Close View Files Modal
  if (closeViewModalBtn) {
      closeViewModalBtn.addEventListener('click', () => closeModal(viewModal));
  }
  if (viewModal) {
      viewModal.addEventListener('click', (e) => {
          if (e.target === viewModal) {
              closeModal(viewModal);
          }
      });
       // Add Delete Folder listener to the button INSIDE the view modal
      const modalDeleteBtn = viewModal.querySelector('.modal-delete-btn');
      if (modalDeleteBtn) {
          modalDeleteBtn.addEventListener('click', handleDeleteFolder); // Use named handler
      }
  }

   // --- Folder Delete Logic (Handler Function) ---
   async function handleDeleteFolder(e) {
      const button = e.currentTarget;
      const folderId = button.dataset.id;
      const folderName = button.dataset.foldername || 'this folder'; // Get name from dataset

      if (!folderId) {
          console.error("Delete button clicked, but no folder ID found.");
          return;
      }

      if (!confirm(`Are you sure you want to delete "${folderName}" and all its contents? This action cannot be undone.`)) return;

      try {
          // showSpinner();
          const res = await fetch(`/archives/${folderId}`, { // Ensure endpoint matches archiveRoutes.js
              method: 'DELETE',
          });

          if (res.ok) {
              alert('Folder deleted successfully.');
              closeModal(viewModal); // Close the modal
              // Remove folder from the main page dynamically
               const folderElement = document.querySelector(`.folder[data-id="${folderId}"]`);
               if (folderElement) {
                  folderElement.remove();
               } else {
                   window.location.reload(); // Fallback to reload if element not found
               }
          } else {
               const errorData = await res.json();
               alert(`Failed to delete folder: ${errorData.error || 'Unknown error'}`);
          }
      } catch (err) {
          console.error('Delete folder error:', err);
          alert('An error occurred while deleting the folder.');
      } finally {
          // hideSpinner();
      }
  }

  // --- Add Files Modal Logic ---
  if (addFilesModal && closeAddFilesModalBtn && addFilesForm) {
      // Open Modal
      document.querySelectorAll('.add-files-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
               // Prevent the folder header click event from firing
              e.stopPropagation();
              const folderId = btn.getAttribute('data-id');
              if (addFilesFolderIdInput) addFilesFolderIdInput.value = folderId; // Set hidden input
              openModal(addFilesModal);
          });
      });

      // Close Modal
      closeAddFilesModalBtn.addEventListener('click', () => closeModal(addFilesModal));
      addFilesModal.addEventListener('click', (e) => {
          if (e.target === addFilesModal) {
              closeModal(addFilesModal);
          }
      });

      // Form Submission
      addFilesForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const folderId = addFilesFolderIdInput.value;
           if (!folderId) {
               alert("Error: Folder ID is missing.");
               return;
           }
          const formData = new FormData(addFilesForm);
           // Check if files were selected
          if (!formData.has('files') || !formData.get('files').name) {
               alert("Please select files to upload.");
               return;
          }

          try {
              // showSpinner();
              const res = await fetch(`/archives/${folderId}/add-files`, { // Ensure endpoint matches
                  method: 'POST',
                  body: formData,
              });

              if (res.ok) {
                  alert('Files added successfully!');
                  closeModal(addFilesModal);
                  window.location.reload(); // Reload to see updated folder contents
              } else {
                  const errorData = await res.json();
                  alert(`Failed to add files: ${errorData.error || 'Unknown error'}`);
              }
          } catch (err) {
              console.error('Add files error:', err);
              alert('Error adding files.');
          } finally {
              // hideSpinner();
          }
      });
  }

}); // End DOMContentLoaded