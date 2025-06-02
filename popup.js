// Default options
const defaultOptions = {
  format: 'jpeg',
  quality: 90,
  resize: false,
  maxWidth: 1920,
  maxHeight: 1080,
  maintainAspectRatio: true,
  filenamePrefix: 'cleaned_',
  addDateToFilename: false,
  removeAllExif: true,
  keepCopyright: false
};

// State management
let currentFiles = [];
let options = { ...defaultOptions };
let fileHistory = [];

// DOM Elements
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const processBtn = document.getElementById('process-btn');
const statusDiv = document.getElementById('status');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const fileList = document.getElementById('file-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// Initialize the popup
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved options
  const savedOptions = await chrome.storage.sync.get('options');
  if (savedOptions.options) {
    options = { ...defaultOptions, ...savedOptions.options };
    applyOptionsToUI();
  }

  // Load file history
  const savedHistory = await chrome.storage.local.get('fileHistory');
  if (savedHistory.fileHistory) {
    fileHistory = savedHistory.fileHistory;
    updateFileHistory();
  }

  // Setup event listeners
  setupEventListeners();
});

// Setup all event listeners
function setupEventListeners() {
  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // File upload area
  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', handleDragOver);
  uploadArea.addEventListener('dragleave', handleDragLeave);
  uploadArea.addEventListener('drop', handleDrop);
  fileInput.addEventListener('change', handleFileSelect);

  // Process button
  processBtn.addEventListener('click', processFiles);

  // Options
  document.getElementById('resize-checkbox').addEventListener('change', toggleResizeOptions);
  document.getElementById('quality-slider').addEventListener('input', updateQualityValue);
  document.getElementById('save-options-btn').addEventListener('click', saveOptions);

  // History
  clearHistoryBtn.addEventListener('click', clearHistory);
}

// Tab switching
function switchTab(tabId) {
  tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });
  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tabId}-tab`);
  });
}

// File handling
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  uploadArea.classList.remove('dragover');
  
  const files = Array.from(e.dataTransfer.files).filter(file => 
    file.type.startsWith('image/') || 
    file.name.toLowerCase().endsWith('.heic') || 
    file.name.toLowerCase().endsWith('.heif')
  );
  if (files.length > 0) {
    currentFiles = files;
    updateProcessButton();
    showStatus(`${files.length} image(s) selected`, 'success');
  }
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files).filter(file => 
    file.type.startsWith('image/') || 
    file.name.toLowerCase().endsWith('.heic') || 
    file.name.toLowerCase().endsWith('.heif')
  );
  if (files.length > 0) {
    currentFiles = files;
    updateProcessButton();
    showStatus(`${files.length} image(s) selected`, 'success');
  }
}

// Process files
async function processFiles() {
  if (currentFiles.length === 0) return;

  processBtn.disabled = true;
  showStatus('Processing images...', 'info');
  
  // Show progress container
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  progressContainer.style.display = 'block';

  try {
    for (let i = 0; i < currentFiles.length; i++) {
      const file = currentFiles[i];
      const progress = ((i / currentFiles.length) * 100).toFixed(0);
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `Processing: ${progress}% (${i + 1}/${currentFiles.length})`;
      
      let processedBlob;
      const filename = generateFilename(file.name);
      
      // Check if the file is HEIC/HEIF
      if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
        // Convert HEIC/HEIF to JPEG
        processedBlob = await convertHeicToJpeg(file);
      } else {
        // Process regular image
        processedBlob = await processImage(file);
      }
      
      // Save the file
      await saveFile(processedBlob, filename);
      
      // Add to history
      addToHistory(file.name, filename);
    }

    progressBar.style.width = '100%';
    progressText.textContent = 'Processing: 100%';
    showStatus('All images processed successfully!', 'success');
    currentFiles = [];
    updateProcessButton();
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    processBtn.disabled = false;
    // Hide progress container after a short delay
    setTimeout(() => {
      progressContainer.style.display = 'none';
      progressBar.style.width = '0%';
      progressText.textContent = 'Processing: 0%';
    }, 2000);
  }
}

// Image processing
async function processImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = calculateDimensions(img.width, img.height);
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        blob => resolve(blob),
        `image/${options.format}`,
        options.quality / 100
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// Function to convert HEIC/HEIF to JPEG
async function convertHeicToJpeg(file) {
  try {
    // Create a worker to handle the conversion
    const worker = new Worker('heic-worker.js');
    
    return new Promise((resolve, reject) => {
      worker.onmessage = (e) => {
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          resolve(e.data.blob);
        }
        worker.terminate();
      };
      
      worker.onerror = (error) => {
        reject(new Error(`Worker error: ${error.message}`));
        worker.terminate();
      };
      
      // Send the file to the worker
      worker.postMessage({
        file: file,
        quality: options.quality / 100
      });
    });
  } catch (error) {
    throw new Error(`Failed to convert HEIC file: ${error.message}`);
  }
}

// Helper functions
function calculateDimensions(width, height) {
  if (!options.resize) return { width, height };

  let newWidth = width;
  let newHeight = height;

  if (width > options.maxWidth) {
    newWidth = options.maxWidth;
    if (options.maintainAspectRatio) {
      newHeight = (height * options.maxWidth) / width;
    }
  }

  if (height > options.maxHeight) {
    newHeight = options.maxHeight;
    if (options.maintainAspectRatio) {
      newWidth = (width * options.maxHeight) / height;
    }
  }

  return { width: newWidth, height: newHeight };
}

function generateFilename(originalName) {
  const date = options.addDateToFilename ? `_${new Date().toISOString().split('T')[0]}` : '';
  const extension = options.format;
  const baseName = originalName.split('.')[0];
  return `${options.filenamePrefix}${baseName}${date}.${extension}`;
}

async function saveFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  await chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: false
  });
  URL.revokeObjectURL(url);
}

// UI updates
function updateProcessButton() {
  processBtn.disabled = currentFiles.length === 0;
}

function showStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
}

function toggleResizeOptions() {
  const resizeOptions = document.getElementById('resize-options');
  const resizeOptionsHeight = document.getElementById('resize-options-height');
  const isChecked = document.getElementById('resize-checkbox').checked;
  
  resizeOptions.style.display = isChecked ? 'flex' : 'none';
  resizeOptionsHeight.style.display = isChecked ? 'flex' : 'none';
}

function updateQualityValue() {
  const value = document.getElementById('quality-slider').value;
  document.getElementById('quality-value').textContent = `${value}%`;
}

// Options management
function applyOptionsToUI() {
  document.getElementById('format-select').value = options.format;
  document.getElementById('quality-slider').value = options.quality;
  document.getElementById('quality-value').textContent = `${options.quality}%`;
  document.getElementById('resize-checkbox').checked = options.resize;
  document.getElementById('max-width').value = options.maxWidth;
  document.getElementById('max-height').value = options.maxHeight;
  document.getElementById('aspect-ratio-checkbox').checked = options.maintainAspectRatio;
  document.getElementById('filename-prefix').value = options.filenamePrefix;
  document.getElementById('add-date-checkbox').checked = options.addDateToFilename;
  document.getElementById('remove-all-exif').checked = options.removeAllExif;
  document.getElementById('keep-copyright').checked = options.keepCopyright;
  
  toggleResizeOptions();
}

async function saveOptions() {
  options = {
    format: document.getElementById('format-select').value,
    quality: parseInt(document.getElementById('quality-slider').value),
    resize: document.getElementById('resize-checkbox').checked,
    maxWidth: parseInt(document.getElementById('max-width').value),
    maxHeight: parseInt(document.getElementById('max-height').value),
    maintainAspectRatio: document.getElementById('aspect-ratio-checkbox').checked,
    filenamePrefix: document.getElementById('filename-prefix').value,
    addDateToFilename: document.getElementById('add-date-checkbox').checked,
    removeAllExif: document.getElementById('remove-all-exif').checked,
    keepCopyright: document.getElementById('keep-copyright').checked
  };

  await chrome.storage.sync.set({ options });
  showStatus('Options saved successfully!', 'success');
}

// History management
function addToHistory(originalName, processedName) {
  fileHistory.unshift({
    originalName,
    processedName,
    timestamp: new Date().toISOString()
  });
  
  // Keep only last 50 entries
  if (fileHistory.length > 50) {
    fileHistory = fileHistory.slice(0, 50);
  }
  
  updateFileHistory();
  chrome.storage.local.set({ fileHistory });
}

function updateFileHistory() {
  fileList.innerHTML = fileHistory.map(file => `
    <div class="file-item">
      <div class="file-name">${file.originalName}</div>
      <div class="file-actions">
        <button class="file-action" onclick="openFile('${file.processedName}')">Open</button>
        <button class="file-action" onclick="deleteFromHistory('${file.processedName}')">Delete</button>
      </div>
    </div>
  `).join('');
}

async function clearHistory() {
  if (confirm('Are you sure you want to clear the file history?')) {
    fileHistory = [];
    updateFileHistory();
    await chrome.storage.local.remove('fileHistory');
    showStatus('History cleared', 'success');
  }
}

function openFile(filename) {
  chrome.downloads.open(`${options.outputDir}/${filename}`);
}

async function deleteFromHistory(filename) {
  fileHistory = fileHistory.filter(file => file.processedName !== filename);
  updateFileHistory();
  await chrome.storage.local.set({ fileHistory });
  showStatus('File removed from history', 'success');
} 