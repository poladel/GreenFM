document.addEventListener('DOMContentLoaded', () => { // Wrap in DOMContentLoaded

  // <<< ADDED: Define Limits (mirror backend) >>>
  const MAX_FILE_SIZE_MB = 100;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const MAX_FILES_PER_FOLDER = 20; // <<< ADDED: Mirror backend limit
  // <<< END ADDED >>>

  // <<< ADDED: Socket.IO Connection >>>
  const socket = io(); // Connect to the server

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    // Optional: Authenticate if needed for user-specific updates (not strictly necessary for broadcasting archive changes)
    // const userId = document.body.dataset.userId; // Assuming you add user ID to body tag
    // if (userId) {
    //   socket.emit('authenticate', userId);
    // }
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });
  // <<< END Socket.IO Connection >>>

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
  const modalAddFilesBtn = document.getElementById('modalAddFilesBtn'); // <<< ADDED: Button inside view modal

  // <<< ADDED: Define foldersContainer at the top level >>>
  const foldersContainer = document.getElementById('folders-container');
  // <<< END ADDED >>>

  // <<< ADDED: Variables to store current view context >>>
  let currentViewFolderId = null;
  let currentViewFolderName = null;
  let currentViewFiles = []; // Store the array of file objects

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
          const submitButton = form.querySelector('button[type="submit"]');
          const originalButtonText = submitButton.textContent;
          const folderName = formData.get('folderName')?.trim();
          const filesInput = form.querySelector('input[type="file"]'); // Get the file input

          if (!folderName) {
              alert('Folder name is required.');
              return;
           }

          // <<< ADDED: Client-side file COUNT validation >>>
          const selectedFilesCount = filesInput?.files?.length || 0;
          if (selectedFilesCount > MAX_FILES_PER_FOLDER) {
              // <<< MODIFIED: Clarify the alert message >>>
              alert(`A folder cannot contain more than ${MAX_FILES_PER_FOLDER} files. You tried to create this folder with ${selectedFilesCount} files.`);
              // <<< END MODIFIED >>>
              return; // Stop submission
          }
          // <<< END ADDED >>>

          // <<< ADDED: Client-side file size validation >>>
          if (filesInput && filesInput.files.length > 0) {
              for (const file of filesInput.files) {
                  if (file.size > MAX_FILE_SIZE_BYTES) {
                      alert(`File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`);
                      return; // Stop submission
                  }
              }
          }
          // <<< END ADDED >>>

          // <<< ADDED: Pre-check folder name existence >>>
          submitButton.disabled = true;

          try {
              const checkRes = await fetch('/archives/check-foldername', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ folderName: folderName })
              });

              if (!checkRes.ok) {
                  // Handle non-2xx responses (like 409 Conflict or 500 Server Error)
                  const errorData = await checkRes.json();
                  alert(`Error: ${errorData.error || 'Could not verify folder name.'}`);
                  // Button/form reset handled in finally
                  return; // Stop the submission
              }

              // If check is OK (200), proceed with upload
              submitButton.textContent = 'Uploading...'; // Update button text

              // <<< MODIFIED: Changed fetch URL from '/upload' to '/archives' >>>
              const uploadRes = await fetch('/archives', {
                  method: 'POST',
                  body: formData, // Send the original form data including files
              });
              // <<< END MODIFIED >>>

              if (uploadRes.ok) {
                  closeModal(uploadModal);
                  // Form reset handled in finally
                  // Socket handles UI update
              } else {
                  // <<< MODIFIED: Attempt to parse JSON, fallback to text >>>
                  let errorData;
                  try {
                      errorData = await uploadRes.json();
                  } catch (jsonError) {
                      // If response is not JSON (like the HTML 404 page), read as text
                      const errorText = await uploadRes.text();
                      console.error("Non-JSON response received:", errorText); // Log the HTML/text
                      errorData = { error: `Server returned status ${uploadRes.status}. Check console for details.` };
                  }
                  alert(`Upload failed: ${errorData.error || 'Unknown error during upload.'}`);
                  // <<< END MODIFIED >>>
                  // Button/form reset handled in finally
              }

          } catch (err) {
              console.error('Folder creation error (check or upload):', err);
              alert('An error occurred during folder creation.');
              // Button/form reset handled in finally
          } finally {
              // <<< MODIFIED: Always reset button state and form >>>
              submitButton.disabled = false;
              submitButton.textContent = originalButtonText;
              form.reset(); // Reset the form fields (including file input)
              // <<< END MODIFIED >>>
          }
          // <<< END Pre-check and Upload Logic >>>
      });
  }

  // --- Filter Logic ---
  const filterBtn = document.getElementById('filterBtn');
  if (filterBtn) {
      filterBtn.addEventListener('click', () => {
          const searchInput = document.getElementById('searchInput');
          const monthSelect = document.getElementById('filterMonth');
          const yearSelect = document.getElementById('filterYear');
          // <<< REMOVED: const foldersContainer = document.getElementById('folders-container'); >>>

          // <<< MODIFIED: Check if foldersContainer exists (defined above) >>>
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
  // const folderHeaders = document.querySelectorAll('.folder-header');
  // if (folderHeaders.length > 0 && viewModal && previewArea) {
  //     folderHeaders.forEach(header => {
  //         // Ensure click targets the header or elements within, but not the delete button
  //         header.addEventListener('click', (e) => {
  //             // ... existing checks ...
  //             const folder = header.closest('.folder');
  //             if (!folder) return;

  //             // <<< MODIFIED: Parse files data (still expects JSON string of the array of objects) >>>
  //             let files = [];
  //             try {
  //                 files = JSON.parse(folder.dataset.files || '[]');
  //                 // Add validation if needed to ensure it's an array of objects with url/name
  //             } catch (parseError) {
  //                 console.error("Failed to parse folder files data:", parseError);
  //                 files = []; // Default to empty on error
  //             }
  //             const folderId = folder.dataset.id;
  //             const folderName = folder.dataset.name || 'Folder'; // Get folder name

  //             // <<< ADDED: Store current context >>>
  //             currentViewFolderId = folderId;
  //             currentViewFolderName = folderName;
  //             currentViewFiles = files; // Store the initial files array

  //             openModal(viewModal);
  //             renderFileList(files, folderId, folderName); // Pass array of objects
  //         });
  //     });
  // }
  // --- END REMOVED BLOCK ---


  // <<< ADDED: Event listener for delete buttons on the main folder cards >>>
  // NOTE: This block might also be redundant now due to delegation, but let's keep it for now
  // unless the delete button also causes issues.
  const mainDeleteFolderBtns = document.querySelectorAll('.folders-container .delete-folder-btn');
  if (mainDeleteFolderBtns.length > 0) {
      mainDeleteFolderBtns.forEach(btn => {
          // Set folder name on the button's dataset for the confirmation message
          const folderCard = btn.closest('.folder');
          if (folderCard) {
              btn.dataset.foldername = folderCard.dataset.name || 'this folder';
          }
          // Attach the existing handler
          btn.addEventListener('click', (e) => {
              e.stopPropagation(); // Prevent the folder header click event
              handleDeleteFolder(e); // Call the existing delete handler
          });
      });
  }


  // <<< ADDED: Helper function to create a folder card element >>>
  function createFolderCardElement(folderData) {
      const div = document.createElement('div');
      // <<< MODIFIED: Add min-height to ensure consistent card height even with wrapping names >>>
      div.className = 'folder bg-white rounded-[15px] shadow-md p-5 cursor-pointer transition duration-200 hover:-translate-y-1 flex flex-col justify-between min-h-[130px]'; // Added min-h-[130px] (adjust as needed)
      // <<< END MODIFIED >>>
      div.dataset.id = folderData._id;
      div.dataset.name = folderData.folderName ? folderData.folderName.toLowerCase() : 'untitled';
      div.dataset.date = new Date(folderData.createdAt).toISOString();
      div.dataset.files = JSON.stringify(folderData.files || []);

      // Determine if user can delete/rename (based on body attribute set in EJS)
      const canModify = document.body.dataset.canDeleteFiles === 'true'; // Use a more general name if rename uses same permission

      div.innerHTML = `
          <div class="folder-header flex items-start justify-between mb-4 gap-2.5"> <!-- Changed items-center to items-start -->
              <img src="/img/folder.png" alt="Folder Icon" class="folder-icon w-[30px] h-[30px] flex-shrink-0 mt-px"> <!-- Added mt-px for slight alignment -->
              
              <!-- <<< MODIFIED: Removed text truncation, added word break >>> -->
              <span class="folder-name text-base font-bold text-green-700 flex-1 break-words mr-1" title="${folderData.folderName}">${folderData.folderName}</span> 
              <!-- Removed: whitespace-nowrap, overflow-hidden, text-ellipsis. Added: break-words, mr-1 -->
              <!-- <<< END MODIFIED >>> -->

              <div class="folder-actions flex items-center gap-1 flex-shrink-0"> <!-- Added flex-shrink-0 -->
                  ${canModify ? `
                      <button class="rename-folder-btn text-blue-600 hover:text-blue-800 p-1" data-id="${folderData._id}" data-name="${folderData.folderName}" title="Rename Folder">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </button>
                  ` : ''}
                  ${canModify ? `
                      <button class="delete-folder-btn text-red-600 hover:text-red-800 p-1" data-id="${folderData._id}" data-foldername="${folderData.folderName || 'this folder'}" title="Delete Folder">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                      </button>
                  ` : ''}
              </div>
          </div>
          <div class="mt-auto pt-2 border-t border-gray-100 flex justify-between items-center">
              <p class="folder-date mt-0 mb-0 text-xs text-gray-500">Created: ${new Date(folderData.createdAt).toLocaleDateString()}</p>
          </div>
      `;

      // No need to attach listeners here, delegation handles it
      // Ensure foldername dataset is set on the delete button for delegation
      const deleteBtn = div.querySelector('.delete-folder-btn');
      if (deleteBtn) {
          deleteBtn.dataset.foldername = folderData.folderName || 'this folder';
      }
      // Ensure name dataset is set on the rename button for delegation
      const renameBtn = div.querySelector('.rename-folder-btn');
      if (renameBtn) {
          renameBtn.dataset.name = folderData.folderName;
      }


      return div;
  }
  // <<< END Helper function >>>

  // <<< ADDED: Named handler for folder header clicks >>>
  function handleFolderHeaderClick(e) {

      // <<< ADDED: Explicit check for clicks originating within action buttons >>>
      // This acts as a safeguard in case the main listener's return doesn't prevent this handler.
      if (e.target.closest('.folder-actions')) {
          console.log("[handleFolderHeaderClick] Click originated within .folder-actions. Preventing modal open.");
          return; // Stop execution if the click was on rename/delete button or their container
      }
      // <<< END ADDED CHECK >>>

      // <<< MODIFIED: Use e.target.closest('.folder') to get the folder element >>>
      const folder = e.target.closest('.folder');
      if (!folder) {
          console.log("[handleFolderHeaderClick] Click was not inside a .folder element. Exiting.");
          return;
      }

      console.log("[handleFolderHeaderClick] Proceeding to open modal for folder:", folder.dataset.id);

      let files = [];
      try {
          files = JSON.parse(folder.dataset.files || '[]');
      } catch (parseError) {
          console.error("Failed to parse folder files data:", parseError);
          files = [];
      }
      const folderId = folder.dataset.id;
      // <<< MODIFIED: Get name from folder.dataset.name (lowercase) or use title attribute for original case >>>
      const folderName = folder.querySelector('.folder-name')?.title || folder.dataset.name || 'Folder';

      currentViewFolderId = folderId;
      currentViewFolderName = folderName; // Store original case name
      currentViewFiles = files;

      openModal(viewModal);
      renderFileList(files, folderId, folderName);
  }
  // <<< END Named handler >>>

  // <<< MOVED: Helper function to handle folder rename >>>
  async function handleRenameFolder(e) {
      // <<< MODIFIED: Get button from e.target.closest() >>>
      const button = e.target.closest('.rename-folder-btn');
      if (!button) return;
      // <<< END MODIFIED >>>

      const folderId = button.dataset.id;
      const currentName = button.dataset.name;

      const newName = prompt(`Enter new name for folder "${currentName}":`, currentName);

      if (!newName || newName.trim() === '' || newName.trim() === currentName) {
          return; // Exit if cancelled, empty, or unchanged
      }

      const trimmedNewName = newName.trim();

      // Basic validation (optional, server does more)
      if (/[\\?%*:|"<>]/g.test(trimmedNewName)) {
          alert('Folder name contains invalid characters (\\ ? % * : | " < >).');
          return;
      }

      // Disable button temporarily (optional)
      button.disabled = true;

      try {
          const res = await fetch(`/archives/${folderId}/rename`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ newFolderName: trimmedNewName })
          });

          if (res.ok) {
              const data = await res.json();
              alert(`Folder renamed successfully to "${data.updatedFolder.folderName}"!`);
              // UI update will be handled by the socket listener
          } else {
              const errorData = await res.json();
              alert(`Failed to rename folder: ${errorData.error || 'Unknown server error'}`);
              button.disabled = false; // Re-enable on error
          }
      } catch (err) {
          console.error('Folder rename error:', err);
          alert('An error occurred while renaming the folder.');
          button.disabled = false; // Re-enable on error
      }
      // No finally block needed if UI update relies on socket
  }
  // <<< END MOVED handleRenameFolder >>>

  // --- Attach initial listeners using the named handler ---
  // <<< REMOVED: Initial loop attaching listeners directly to folder headers >>>
  // document.querySelectorAll('.folder-header').forEach(header => {
  //     header.addEventListener('click', handleFolderHeaderClick);
  // });
  // <<< END REMOVED >>>
  // <<< REMOVED: Initial loop attaching listeners directly to rename buttons >>>
  // document.querySelectorAll('.rename-folder-btn').forEach(btn => {
  //     btn.addEventListener('click', handleRenameFolder); // Now defined
  // });
  // <<< END REMOVED >>>
  // <<< REMOVED: Second loop attaching delete listeners >>>
  // document.querySelectorAll('.folders-container .delete-folder-btn').forEach(btn => {
  //     // Set folder name on the button's dataset for the confirmation message
  //     const folderCard = btn.closest('.folder');
  //     if (folderCard) {
  //         btn.dataset.foldername = folderCard.dataset.name || 'this folder';
  //     }
  //     // Attach the existing handler
  //     btn.addEventListener('click', (e) => {
  //         e.stopPropagation(); // Prevent the folder header click event
  //         handleDeleteFolder(e); // Call the existing delete handler
  //     });
  // });
  // <<< END REMOVED >>>
  // <<< ADDED: Event Delegation for All Folder Card Interactions >>>
  if (foldersContainer) {
      foldersContainer.addEventListener('click', (e) => { // Pass the original event 'e'

          // --- PRIORITIZE BUTTON CLICKS ---
          const renameButton = e.target.closest('.rename-folder-btn');
          if (renameButton) {
              console.log("[DELEGATION] Rename button detected.");
              e.stopPropagation();
              e.preventDefault();
              handleRenameFolder(e); // Handles rename logic (contains prompt)
              console.log("[DELEGATION] Returned from handleRenameFolder. EXECUTING RETURN."); // Log before return
              return; // *** CRUCIAL: Stop further processing in this listener ***
          }

          const deleteButton = e.target.closest('.delete-folder-btn');
          if (deleteButton) {
              console.log("[DELEGATION] Delete button detected.");
              e.stopPropagation();
              e.preventDefault();
              // ... (ensure foldername dataset logic) ...
              const folderCard = deleteButton.closest('.folder');
              if (folderCard && !deleteButton.dataset.foldername) {
                   const nameSpan = folderCard.querySelector('.folder-name');
                   deleteButton.dataset.foldername = nameSpan?.title || folderCard.dataset.name || 'this folder';
              }
              handleDeleteFolder(e); // Handles delete logic
              console.log("[DELEGATION] Returned from handleDeleteFolder. EXECUTING RETURN."); // Log before return
              return; // *** CRUCIAL: Stop further processing in this listener ***
          }

          // --- HANDLE HEADER CLICK (only if not a button click) ---
          // This code only runs if the click wasn't on rename or delete buttons (due to the 'return' statements above)
          console.log("[DELEGATION] No button click detected. Checking for general folder click..."); // Log before header check

          // <<< MODIFIED: Simplify the check >>>
          const folderElement = e.target.closest('.folder'); // Find the closest parent folder element

          // Check if the click occurred within *any* part of a folder card
          // AND wasn't handled by the button checks above (due to the 'return' statements).
          if (folderElement) {
              console.log("[DELEGATION] Click occurred within a folder card. Calling handleFolderHeaderClick...");
              // The handleFolderHeaderClick function itself contains a safeguard
              // to prevent opening if the click was specifically on the action buttons.
              handleFolderHeaderClick(e);
          } else {
              // This case should be rare if the listener is on foldersContainer,
              // but good for completeness.
              console.log("[DELEGATION] Click was outside any folder card. No action.");
          }
          // <<< END MODIFIED CHECK >>>

          console.log(`[DELEGATION END] Listener finished.`); // Log end
      });
  }
  // <<< END Event Delegation >>>

  // Render file list inside the View Files Modal
  function renderFileList(files, folderId, folderName) {
      // ... function content remains the same ...
      if (!previewArea) return;
      previewArea.innerHTML = '';

      currentViewFiles = files;

      // <<< MODIFIED: Simplify - Just update the dataset ID + ADD LOGGING >>>
      if (modalAddFilesBtn) {
          modalAddFilesBtn.dataset.id = folderId;
          // <<< ADDED: Log after setting dataset.id >>>
          console.log(`[renderFileList] Set modalAddFilesBtn.dataset.id to: ${folderId}. Current button dataset:`, modalAddFilesBtn.dataset);
          // <<< END ADDED >>>
      }
      // <<< END MODIFIED >>>

      if (!Array.isArray(files) || files.length === 0) {
          previewArea.innerHTML = '<p class="text-center text-gray-500 py-4">No files in this folder.</p>';
          return;
      }

      const listContainer = document.createElement('div');
      listContainer.className = 'file-list-modal grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mt-4';

      files.forEach(fileObject => {
          if (!fileObject || typeof fileObject !== 'object' || !fileObject.url || !fileObject.name) {
              console.warn('Skipping invalid file data:', fileObject);
              return;
          }
          const fileUrl = fileObject.url;
          const fileName = fileObject.name;
          const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
          const thumbContainer = document.createElement('div');
          thumbContainer.className = 'file-thumb relative flex flex-col items-center text-center group';
          thumbContainer.title = fileName;
          let fileElement;
          if (['png', 'gif', 'jpg', 'jpeg', 'webp', 'avif'].includes(fileExt)) {
              fileElement = document.createElement('img');
              fileElement.src = fileUrl;
              fileElement.alt = fileName;
              fileElement.className = 'archive-thumb w-20 h-20 md:w-24 md:h-24 object-cover rounded-md cursor-pointer border border-gray-200';
              fileElement.addEventListener('click', () => previewSingleFile(fileObject, files, folderId, folderName));
          } else if (['mp4', 'webm', 'ogg', 'mov'].includes(fileExt)) {
              // <<< MODIFIED: Video Thumbnail Handling >>>
              fileElement = document.createElement('video');
              // Apply styling classes
              fileElement.className = 'archive-thumb w-20 h-20 md:w-24 md:h-24 object-cover rounded-md cursor-pointer border border-gray-200 bg-gray-800'; // Use object-cover, adjust bg if needed
              fileElement.src = fileUrl; // Set the source
              fileElement.muted = true; // Mute for potential browser policies
              fileElement.preload = 'metadata'; // Hint to browser to load enough data for first frame/duration
              // REMOVED: fileElement.innerHTML = '<svg>...';
              fileElement.addEventListener('click', () => previewSingleFile(fileObject, files, folderId, folderName));
              // Optional: Add poster attribute if you have thumbnail images for videos
              // fileElement.poster = 'path/to/video-poster.jpg';
              // <<< END MODIFIED >>>
          } else {
              fileElement = document.createElement('div');
              fileElement.className = 'archive-thumb w-20 h-20 md:w-24 md:h-24 object-contain rounded-md cursor-pointer border border-gray-200 bg-gray-100 flex items-center justify-center';
              fileElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" /></svg>';
              fileElement.addEventListener('click', () => previewSingleFile(fileObject, files, folderId, folderName));
          }
          thumbContainer.appendChild(fileElement);
          const nameElement = document.createElement('div');
          nameElement.className = 'file-name text-center text-[10px] md:text-xs mt-1 w-20 md:w-24 truncate';
          nameElement.textContent = fileName;
          thumbContainer.appendChild(nameElement);
          if (document.body.dataset.canDeleteFiles === 'true') {
              const deleteBtn = document.createElement('button');
              deleteBtn.innerHTML = '×';
              deleteBtn.className = 'delete-file-btn absolute top-0 right-0 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold cursor-pointer transition-opacity';
              deleteBtn.title = `Delete ${fileName}`;
              deleteBtn.dataset.folder = folderId;
              deleteBtn.dataset.url = fileUrl;
              deleteBtn.addEventListener('click', handleDeleteFile); // Direct listener OK here as it's within the modal context
              thumbContainer.appendChild(deleteBtn);
          }
          listContainer.appendChild(thumbContainer);
      });
      previewArea.appendChild(listContainer);
  }

   // Handler for deleting a file (within modal)
   async function handleDeleteFile(e) {
      // ... function content remains the same ...
      e.stopPropagation();
      const button = e.currentTarget;
      const folderId = button.dataset.folder;
      const fileUrl = button.dataset.url;
      const fileName = button.closest('.file-thumb')?.title || decodeURIComponent(fileUrl.split('/').pop());
      if (!confirm(`Are you sure you want to delete this file: ${fileName}?`)) return;
      try {
          const res = await fetch(`/archives/${folderId}/files`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileUrl: fileUrl })
          });
          if (res.ok) {
              button.closest('.file-thumb').remove();
              const remainingThumbs = previewArea.querySelectorAll('.file-thumb');
               if (remainingThumbs.length === 0) {
                   renderFileList([], folderId, ''); // Re-render with empty state
               }
               // Socket 'archive_updated' will handle main page update
          } else {
              const errorData = await res.json();
              alert(`Failed to delete file: ${errorData.error || 'Unknown error'}`);
          }
      } catch (err) {
          console.error('File delete error:', err);
          alert('An error occurred while deleting the file.');
      }
  }


  // Handler for renaming a file (within modal)
  async function handleRenameFile(e, allFiles, folderName) {
      // ... function content remains the same ...
      const renameButton = e.currentTarget;
      const folderId = renameButton.dataset.folder;
      const originalUrl = renameButton.dataset.url;
      const originalFileName = renameButton.dataset.name;
      const originalExt = originalFileName.split('.').pop() || '';
      const backButton = renameButton.closest('.button-container')?.querySelector('.back-button');
      const newBaseName = prompt(`Enter new name for "${originalFileName}" (extension .${originalExt} will be kept):`);
      if (!newBaseName || newBaseName.trim() === '') return;
      if (/[\\?%*:|"<>]/g.test(newBaseName)) {
          alert('Filename contains invalid characters (\\ ? % * : | " < >).');
          return;
      }
      const newFileName = `${newBaseName.trim()}.${originalExt}`;
      const originalButtonText = renameButton.textContent;
      renameButton.disabled = true;
      renameButton.textContent = 'Renaming...';
      if (backButton) backButton.disabled = true;
      try {
          const res = await fetch(`/archives/${folderId}/files/rename`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ originalUrl: originalUrl, newFileName: newFileName })
          });
          if (res.ok) {
              const data = await res.json();
              alert(`File renamed successfully to "${data.updatedFile.name}"!`);
              const fileIndex = allFiles.findIndex(f => f && f.url === originalUrl);
              if (fileIndex !== -1) {
                  allFiles[fileIndex].url = data.updatedFile.url;
                  allFiles[fileIndex].name = data.updatedFile.name;
              } else {
                  console.warn("Could not find the original file in the allFiles array to update UI.");
              }
              renderFileList(allFiles, folderId, folderName); // Re-render grid
          } else {
              const errorData = await res.json();
              alert(`Failed to rename file: ${errorData.error || 'Unknown server error'}`);
              // Re-enable buttons on failure
              renameButton.disabled = false;
              renameButton.textContent = originalButtonText;
              if (backButton) backButton.disabled = false;
          }
      } catch (err) {
          console.error('File rename error:', err);
          alert('An error occurred while renaming the file.');
          // Re-enable buttons on error
          renameButton.disabled = false;
          renameButton.textContent = originalButtonText;
          if (backButton) backButton.disabled = false;
      } finally {
          // Ensure buttons are re-enabled if view wasn't re-rendered
          if (document.body.contains(renameButton)) {
             renameButton.disabled = false;
             renameButton.textContent = originalButtonText;
          }
          if (backButton && document.body.contains(backButton)) {
             backButton.disabled = false;
          }
      }
  }


  // Preview single file in the View Files Modal
  function previewSingleFile(fileObject, allFiles, folderId, folderName) {
      // ... function content remains the same ...
      if (!previewArea) return;
      previewArea.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.className = 'single-preview flex flex-col items-center w-full';
      const fileUrl = fileObject.url;
      const fileName = fileObject.name;
      const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
      let previewElement;
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'button-container flex justify-start items-center w-full mb-3 space-x-2';
      const backBtn = document.createElement('button');
      backBtn.innerHTML = '← Back to Folder';
      backBtn.className = 'back-button px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 cursor-pointer font-semibold text-sm';
      backBtn.addEventListener('click', () => renderFileList(allFiles, folderId, folderName));
      buttonContainer.appendChild(backBtn);
      if (document.body.dataset.canDeleteFiles === 'true') {
          const renameBtn = document.createElement('button');
          renameBtn.innerHTML = 'Rename';
          renameBtn.className = 'rename-file-btn px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer font-semibold text-sm';
          renameBtn.dataset.folder = folderId;
          renameBtn.dataset.url = fileObject.url;
          renameBtn.dataset.name = fileObject.name;
          renameBtn.addEventListener('click', (e) => handleRenameFile(e, allFiles, folderName));
          buttonContainer.appendChild(renameBtn);
      }
      wrapper.appendChild(buttonContainer);
      console.log('Previewing file:', fileUrl, 'Name:', fileName, 'Extension:', fileExt);
      if (['png', 'gif', 'jpg', 'jpeg', 'webp', 'avif'].includes(fileExt)) {
          previewElement = document.createElement('img');
          previewElement.src = fileUrl;
          previewElement.alt = fileName;
          previewElement.className = 'full-preview max-w-full max-h-[70vh] object-contain rounded-lg';
      } else if (['mp4', 'webm', 'ogg', 'mov'].includes(fileExt)) {
          previewElement = document.createElement('video');
          previewElement.src = fileUrl;
          previewElement.controls = true;
          previewElement.autoplay = false;
          previewElement.className = 'full-preview max-w-full max-h-[70vh] rounded-lg';
      } else if (fileExt === 'pdf') {
          previewElement = document.createElement('iframe');
          previewElement.src = fileUrl;
          previewElement.className = 'full-preview w-full h-[75vh] border-gray-300 border';
          const fallbackLink = document.createElement('a');
          fallbackLink.href = fileUrl;
          fallbackLink.target = '_blank';
          fallbackLink.textContent = `Download PDF: ${fileName}`;
          previewElement.appendChild(fallbackLink);
          const errorMsgContainer = document.createElement('div');
          errorMsgContainer.className = 'text-center mt-2 text-sm text-red-500';
          errorMsgContainer.innerHTML = `If preview doesn't load, <a href="${fileUrl}" target="_blank" class="underline">download the PDF</a>.`;
          wrapper.appendChild(previewElement);
          wrapper.appendChild(errorMsgContainer);
          previewArea.appendChild(wrapper);
          return;
      } else if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(fileExt)) {
          previewElement = document.createElement('div');
          previewElement.className = 'text-center p-5 border border-dashed border-gray-300 rounded-lg flex flex-col justify-center items-center min-h-[150px]';
          const link = document.createElement('a');
          link.href = fileUrl;
          link.target = '_blank';
          link.download = fileName;
          link.textContent = `Download ${fileExt.toUpperCase()}: ${fileName}`;
          link.className = 'block mt-2 text-blue-600 hover:underline font-semibold text-lg';
          previewElement.appendChild(link);
      } else {
          previewElement = document.createElement('div');
          previewElement.className = 'text-center p-5 border border-dashed border-gray-300 rounded-lg flex flex-col justify-center items-center min-h-[150px]';
          const link = document.createElement('a');
          link.href = fileUrl;
          link.target = '_blank';
          link.download = fileName;
          link.textContent = `Download ${fileName}`;
          link.className = 'block mt-2 text-blue-600 hover:underline font-semibold text-lg';
          previewElement.appendChild(link);
      }
      if (fileExt !== 'pdf') {
          wrapper.appendChild(previewElement);
          previewArea.appendChild(wrapper);
      }
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
  }

   // --- Folder Delete Logic (Handler Function) ---
   async function handleDeleteFolder(e) { // Receives the original event 'e'
      // <<< MODIFIED: Get button from e.target.closest() >>>
      const button = e.target.closest('.delete-folder-btn');
      if (!button) return; // Should not happen if delegation is correct, but safety check
      // <<< END MODIFIED >>>

      const folderId = button.dataset.id;
      const folderName = button.dataset.foldername || 'this folder'; // Get name from dataset

      if (!folderId) {
          console.error("Delete button clicked, but no folder ID found.");
          return;
      }

      // <<< MODIFIED: Moved fetch call inside the confirmation block >>>
      if (confirm(`Are you sure you want to delete "${folderName}" and all its contents? This action cannot be undone.`)) {
          try {
              // showSpinner();
              const res = await fetch(`/archives/${folderId}`, { // Ensure endpoint matches archiveRoutes.js
                  method: 'DELETE',
              });

              if (res.ok) {
                  alert('Folder deleted successfully.');
                  // UI update handled by socket listener
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
      } // <<< END Confirmation block >>>
  }

  // <<< ADDED: Handler function to open the Add Files modal >>>
  function handleOpenAddFilesModal(e) {
      const button = e.currentTarget; // This is modalAddFilesBtn
      // <<< ADDED: Log button element and its dataset directly >>>
      console.log('[handleOpenAddFilesModal] Executing handler.');
      console.log('[handleOpenAddFilesModal] Button Element:', button);
      console.log('[handleOpenAddFilesModal] Button Dataset at execution time:', button.dataset);
      // <<< END ADDED >>>
      const folderId = button.dataset.id; // Read the CURRENT dataset ID
      // <<< MODIFIED: Log the folder ID being used (using the variable) >>>
      console.log(`[ADD FILES MODAL OPEN] Opening 'Add Files' modal for Folder ID: ${folderId}. Setting this ID in the hidden input.`);
      // <<< END MODIFIED >>>
      if (addFilesFolderIdInput) addFilesFolderIdInput.value = folderId;
      openModal(addFilesModal);
  }

  // <<< ADDED: Attach listener ONCE after handler definition >>>
  if (modalAddFilesBtn) {
      modalAddFilesBtn.addEventListener('click', handleOpenAddFilesModal);
  }
  // <<< END ADDED >>>


  // --- Add Files Modal Logic ---
  if (addFilesModal && closeAddFilesModalBtn && addFilesForm) {
      closeAddFilesModalBtn.addEventListener('click', () => closeModal(addFilesModal));
      addFilesModal.addEventListener('click', (e) => {
          if (e.target === addFilesModal) closeModal(addFilesModal);
      });

      addFilesForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const form = e.target;
          const folderId = addFilesFolderIdInput.value;
          const submitButton = form.querySelector('button[type="submit"]');
          const originalButtonText = submitButton.textContent;
          const filesInput = form.querySelector('input[type="file"]'); // Get the file input

          if (!folderId) { alert("Error: Folder ID is missing."); return; }
          const formData = new FormData(addFilesForm);
          // <<< MODIFIED: Check file input directly for count >>>
          const selectedFilesCount = filesInput?.files?.length || 0;
          if (selectedFilesCount === 0) {
              alert("Please select files to upload.");
              return;
          }
          // <<< END MODIFIED >>>

          // <<< ADDED: Client-side file COUNT validation >>>
          // We also need to know how many files are *already* in the folder.
          // Let's get this from the `currentViewFiles` array which is updated when the modal opens.
          const currentFileCount = currentViewFiles.length;
          const totalFileCount = currentFileCount + selectedFilesCount;

          if (totalFileCount > MAX_FILES_PER_FOLDER) {
              // This message is already correct as it considers existing files.
              alert(`This folder already has ${currentFileCount} files. Adding ${selectedFilesCount} more would exceed the limit of ${MAX_FILES_PER_FOLDER} files.`);
              return; // Stop submission
          }
          // <<< END ADDED >>>

          // <<< ADDED: Client-side file size validation >>>
          if (filesInput && filesInput.files.length > 0) {
              for (const file of filesInput.files) {
                  if (file.size > MAX_FILE_SIZE_BYTES) {
                      alert(`File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`);
                      return; // Stop submission
                  }
              }
          }
          // <<< END ADDED >>>

          try {
              submitButton.disabled = true;
              submitButton.textContent = 'Uploading...';
              const res = await fetch(`/archives/${folderId}/add-files`, { method: 'POST', body: formData });
              if (res.ok) {
                  const updatedFolderData = await res.json();
                  alert('Files added successfully!');
                  closeModal(addFilesModal);
                  // Form reset handled in finally
                  const mainFolderCard = document.querySelector(`.folder[data-id="${folderId}"]`);
                  if (mainFolderCard) {
                      mainFolderCard.dataset.files = JSON.stringify(updatedFolderData.folder.files);
                  }
                  // Re-render view modal if it was open for this folder
                  if (!viewModal.classList.contains('hidden') && currentViewFolderId === folderId) {
                     renderFileList(updatedFolderData.folder.files, currentViewFolderId, currentViewFolderName);
                  }
                  // Socket 'archive_updated' will handle main page update if needed elsewhere
              } else {
                  const errorData = await res.json();
                  alert(`Failed to add files: ${errorData.error || 'Unknown error'}`);
                  // Keep modal open on failure, button/form reset in finally
              }
          } catch (err) {
              console.error('Add files error:', err);
              alert('Error adding files.');
              // Keep modal open on error, button/form reset in finally
          } finally {
              // <<< MODIFIED: Always reset button state and form >>>
              submitButton.disabled = false;
              submitButton.textContent = originalButtonText;
              form.reset(); // Reset the form fields (including file input)
              // <<< END MODIFIED >>>
          }
      });
  }

  // <<< ADDED: Socket Event Listeners >>>
  socket.on('archive_created', (newFolderData) => {
      console.log('Socket received: archive_created', newFolderData);
      if (!foldersContainer) return;
      const noArchivesMsg = foldersContainer.querySelector('.no-archives');
      if (noArchivesMsg) noArchivesMsg.remove();
      const newCard = createFolderCardElement(newFolderData);
      foldersContainer.prepend(newCard);
  });

  socket.on('archive_deleted', (data) => {
      console.log('Socket received: archive_deleted', data);
      if (!foldersContainer || !data.folderId) return;
      const folderToRemove = foldersContainer.querySelector(`.folder[data-id="${data.folderId}"]`);
      if (folderToRemove) folderToRemove.remove();
      if (foldersContainer.children.length === 0) {
          foldersContainer.innerHTML = '<p class="no-archives text-base text-gray-500 w-full col-span-full text-center py-10">No archives available yet.</p>';
      }
  });

  socket.on('archive_updated', (updatedFolderData) => {
      console.log('Socket received: archive_updated', updatedFolderData);
      if (!foldersContainer || !updatedFolderData?._id) return;
      const folderCard = foldersContainer.querySelector(`.folder[data-id="${updatedFolderData._id}"]`);
      if (folderCard) {
          folderCard.dataset.files = JSON.stringify(updatedFolderData.files || []);
      }
      if (!viewModal.classList.contains('hidden') && currentViewFolderId === updatedFolderData._id) {
          console.log('View modal is open for the updated folder, re-rendering file list...');
          renderFileList(updatedFolderData.files || [], updatedFolderData._id, updatedFolderData.folderName);
      }
  });

  socket.on('archive_renamed', (updatedFolderData) => {
      console.log('Socket received: archive_renamed', updatedFolderData);
      if (!foldersContainer || !updatedFolderData?._id) return;
      const folderCard = foldersContainer.querySelector(`.folder[data-id="${updatedFolderData._id}"]`);
      if (folderCard) {
          const folderNameSpan = folderCard.querySelector('.folder-name');
          const renameButton = folderCard.querySelector('.rename-folder-btn');
          const deleteButton = folderCard.querySelector('.delete-folder-btn');
          folderCard.dataset.name = updatedFolderData.folderName.toLowerCase();
          if (renameButton) renameButton.dataset.name = updatedFolderData.folderName;
          if (deleteButton) deleteButton.dataset.foldername = updatedFolderData.folderName;
          if (folderNameSpan) {
              folderNameSpan.textContent = updatedFolderData.folderName;
              folderNameSpan.title = updatedFolderData.folderName;
          }
          if (renameButton) renameButton.disabled = false;
          console.log(`UI updated for renamed folder: ${updatedFolderData._id}`);
      }
  });
  // <<< END Socket Event Listeners >>>


}); // End DOMContentLoaded