const uploadModal = document.getElementById('uploadModal');
const openUploadBtn = document.getElementById('openModalBtn');
const closeUploadBtn = document.getElementById('closeModalBtn');

openUploadBtn?.addEventListener('click', () => {
  uploadModal.style.display = 'block';
  document.body.classList.add('modal-open');
});
closeUploadBtn?.addEventListener('click', () => {
  uploadModal.style.display = 'none';
  document.body.classList.remove('modal-open');
});
window.addEventListener('click', (e) => {
  if (e.target === uploadModal) {
    uploadModal.style.display = 'none';
    document.body.classList.remove('modal-open');
  }
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
      document.body.classList.remove('modal-open');
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
    const folderId = folder.dataset.id;

    viewModal.style.display = 'block';
    document.body.classList.add('modal-open');
    renderFileList(files, folderId);
  });
});

function renderFileList(files, folderId) {
  previewArea.innerHTML = '';

  if (files.length === 0) {
    previewArea.innerHTML = '<p>No files in this folder.</p>';
    return;
  }

  const listContainer = document.createElement('div');
  listContainer.className = 'file-list-modal';

  files.forEach(file => {
    const fileName = file.split('/').pop();
    const fileExt = fileName.split('.').pop().toLowerCase();
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
      // Document or unknown file → show file icon wrapped in download link
      const link = document.createElement('a');
      link.href = file;
      link.download = fileName;
      link.target = '_blank';
    
      const icon = document.createElement('img');
      icon.src = '../img/file.png';
      icon.alt = 'File icon';
      icon.className = 'archive-thumb';
    
      link.appendChild(icon);
      inner = link;
    }    

    thumb.appendChild(inner);

    const name = document.createElement('div');
    name.className = 'file-name';
    name.textContent = fileName;
    thumb.appendChild(name);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.className = 'delete-file-btn';
    deleteBtn.dataset.folder = folderId;
    deleteBtn.dataset.url = file;
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this file?')) return;
      try {
        const res = await fetch(`/archives/${folderId}/files`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: file })
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

    thumb.appendChild(deleteBtn);
    thumb.addEventListener('click', () => previewSingleFile(file, files, folderId));
    listContainer.appendChild(thumb);
  });

  previewArea.appendChild(listContainer);
}

function previewSingleFile(file, allFiles, folderId) {
  previewArea.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'single-preview';

  const fileExt = file.split('.').pop().toLowerCase();

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
  } else if (fileExt === 'pdf') {
    const iframe = document.createElement('iframe');
    inner.src = '../img/file.png';
    iframe.src = file;
    iframe.className = 'full-preview';
    iframe.style.height = '80vh';
    wrapper.appendChild(iframe);
  } else if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(fileExt)) {
    const iframe = document.createElement('iframe');
    inner.src = '../img/file.png';
    iframe.src = `https://docs.google.com/gview?url=${encodeURIComponent(file)}&embedded=true`;
    iframe.className = 'full-preview';
    iframe.style.height = '80vh';
    wrapper.appendChild(iframe);
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
    renderFileList(allFiles, folderId);
  });

  previewArea.appendChild(backBtn);
  previewArea.appendChild(wrapper);
}

// Close view modal
closeViewModalBtn?.addEventListener('click', () => {
  viewModal.style.display = 'none';
  document.body.classList.remove('modal-open');
});
window.addEventListener('click', (e) => {
  if (e.target === viewModal) {
    viewModal.style.display = 'none';
    document.body.classList.remove('modal-open');
  }
});

// Folder delete
document.querySelectorAll('.delete-folder-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
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

// Add files to folder modal
const addFilesModal = document.getElementById('addFilesModal');
const closeAddFilesModalBtn = document.getElementById('closeAddFilesModalBtn');
const addFilesForm = document.getElementById('add-files-form');
const addFilesFolderIdInput = document.getElementById('add-files-folder-id');

document.querySelectorAll('.add-files-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const folderId = btn.getAttribute('data-id');
    addFilesFolderIdInput.value = folderId;
    addFilesModal.style.display = 'block';
    document.body.classList.add('modal-open');
  });
});

closeAddFilesModalBtn?.addEventListener('click', () => {
  addFilesModal.style.display = 'none';
  document.body.classList.remove('modal-open');
});
window.addEventListener('click', (e) => {
  if (e.target === addFilesModal) {
    addFilesModal.style.display = 'none';
    document.body.classList.remove('modal-open');
  }
});

addFilesForm?.addEventListener('submit', async (e) => {
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
      document.body.classList.remove('modal-open');
      window.location.reload();
    } else {
      alert('Failed to add files.');
    }
  } catch (err) {
    console.error('Add files error:', err);
    alert('Error adding files.');
  }
});
