const uploadModal = document.getElementById('uploadModal');
const openUploadBtn = document.getElementById('openModalBtn');
const closeUploadBtn = document.getElementById('closeModalBtn');

openUploadBtn?.addEventListener('click', () => {
  uploadModal.style.display = 'block';
});
closeUploadBtn?.addEventListener('click', () => {
  uploadModal.style.display = 'none';
});
window.addEventListener('click', (e) => {
  if (e.target === uploadModal) uploadModal.style.display = 'none';
});

document.getElementById('modal-upload-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  try {
    const res = await fetch('/upload', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      uploadModal.style.display = 'none';
      window.location.reload();
    } else {
      alert('Upload failed.');
    }
  } catch (err) {
    console.error('Upload error:', err);
    alert('An error occurred during upload.');
  }
});

// Filter logic
document.getElementById('filterBtn')?.addEventListener('click', () => {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const month = document.getElementById('filterMonth').value;
  const year = document.getElementById('filterYear').value;

  document.querySelectorAll('.folder').forEach(folder => {
    const name = folder.dataset.name;
    const date = new Date(folder.dataset.date);

    const matchName = name.includes(search);
    const matchMonth = !month || date.getMonth().toString() === month;
    const matchYear = !year || date.getFullYear().toString() === year;

    folder.style.display = (matchName && matchMonth && matchYear) ? '' : 'none';
  });
});

// Folder click → open file list modal
const viewModal = document.getElementById('viewFilesModal');
const closeViewModalBtn = document.getElementById('closeViewModalBtn');
const previewArea = document.getElementById('previewArea');

document.querySelectorAll('.folder-header').forEach(header => {
  header.addEventListener('click', () => {
    const folder = header.closest('.folder');
    const files = JSON.parse(folder.dataset.files || '[]');

    // Show modal
    viewModal.style.display = 'block';
    renderFileList(files);
  });
});

function renderFileList(files) {
  previewArea.innerHTML = '';

  if (files.length === 0) {
    previewArea.innerHTML = '<p>No files in this folder.</p>';
    return;
  }

  const listContainer = document.createElement('div');
  listContainer.className = 'file-list-modal';

  files.forEach(file => {
    const fileName = file.split('/').pop();
    const thumb = document.createElement('div');
    thumb.className = 'file-thumb';

    let inner;
    if (/\.(jpg|jpeg|png|gif)$/i.test(file)) {
      inner = document.createElement('img');
      inner.src = file;
      inner.className = 'archive-thumb';
    } else if (/\.(mp4|webm|ogg)$/i.test(file)) {
      inner = document.createElement('video');
      inner.src = file;
      inner.className = 'archive-thumb';
      inner.muted = true;
    } else {
      inner = document.createElement('a');
      inner.href = file;
      inner.textContent = 'Download';
      inner.target = '_blank';
    }

    thumb.appendChild(inner);
    const name = document.createElement('div');
    name.className = 'file-name';
    name.textContent = fileName;
    thumb.appendChild(name);

    thumb.addEventListener('click', () => previewSingleFile(file));
    listContainer.appendChild(thumb);
  });

  previewArea.appendChild(listContainer);
}

function previewSingleFile(file) {
  previewArea.innerHTML = ''; // clear current
  const wrapper = document.createElement('div');
  wrapper.className = 'single-preview';

  if (/\.(jpg|jpeg|png|gif)$/i.test(file)) {
    const img = document.createElement('img');
    img.src = file;
    img.className = 'full-preview';
    wrapper.appendChild(img);
  } else if (/\.(mp4|webm|ogg)$/i.test(file)) {
    const video = document.createElement('video');
    video.src = file;
    video.controls = true;
    video.autoplay = true;
    video.className = 'full-preview';
    wrapper.appendChild(video);
  } else {
    const link = document.createElement('a');
    link.href = file;
    link.target = '_blank';
    link.textContent = 'Download File';
    wrapper.appendChild(link);
  }

  const backBtn = document.createElement('button');
  backBtn.textContent = '←';
  backBtn.className = 'back-button';
  backBtn.addEventListener('click', () => {
    renderFileList(JSON.parse(document.querySelector('.folder[data-files]').dataset.files || '[]'));
  });

  previewArea.appendChild(backBtn);
  previewArea.appendChild(wrapper);
}

// Close modal
closeViewModalBtn.addEventListener('click', () => {
  viewModal.style.display = 'none';
});
window.addEventListener('click', (e) => {
  if (e.target === viewModal) viewModal.style.display = 'none';
});

document.getElementById("openModalBtn").addEventListener("click", () => {
    document.body.classList.add("modal-open");
  });
  
  document.getElementById("closeModalBtn").addEventListener("click", () => {
    document.body.classList.remove("modal-open");
  });
  
  document.getElementById("closeViewModalBtn").addEventListener("click", () => {
    document.body.classList.remove("modal-open");
  });
  
  document.querySelectorAll('.delete-folder-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const folderId = btn.getAttribute('data-id');
      if (!confirm('Are you sure you want to delete this folder?')) return;
  
      try {
        const res = await fetch(`/archives/${folderId}`, {
          method: 'DELETE',
        });
  
        if (res.ok) {
          alert('Folder deleted successfully.');
          window.location.reload();
        } else {
          alert('Failed to delete folder.');
        }
      } catch (err) {
        console.error('Delete error:', err);
        alert('An error occurred while deleting.');
      }
    });
  });


  document.querySelectorAll('.delete-file-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const folderId = btn.dataset.folder;
      const fileUrl = btn.dataset.url;
  
      if (!confirm('Delete this file?')) return;
  
      try {
        const res = await fetch(`/archives/${folderId}/files`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl })
        });
  
        if (res.ok) {
          alert('File deleted.');
          window.location.reload();
        } else {
          alert('Failed to delete file.');
        }
      } catch (err) {
        console.error('File delete error:', err);
        alert('An error occurred.');
      }
    });
  });

const addFilesModal = document.getElementById('addFilesModal');
const closeAddFilesModalBtn = document.getElementById('closeAddFilesModalBtn');
const addFilesForm = document.getElementById('add-files-form');
const addFilesFolderIdInput = document.getElementById('add-files-folder-id');

document.querySelectorAll('.add-files-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const folderId = btn.getAttribute('data-id');
    addFilesFolderIdInput.value = folderId;
    addFilesModal.style.display = 'block';
  });
});

closeAddFilesModalBtn.addEventListener('click', () => {
  addFilesModal.style.display = 'none';
});
window.addEventListener('click', (e) => {
  if (e.target === addFilesModal) addFilesModal.style.display = 'none';
});

addFilesForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const folderId = addFilesFolderIdInput.value;
  const formData = new FormData(addFilesForm);

  try {
    const res = await fetch(`/archives/${folderId}/add-files`, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      alert('Files added successfully!');
      addFilesModal.style.display = 'none';
      window.location.reload();
    } else {
      alert('Failed to add files.');
    }
  } catch (err) {
    console.error('Add files error:', err);
    alert('Error adding files.');
  }
});
