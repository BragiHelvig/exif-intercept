// Function to create a notification element
function createNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px;
    border-radius: 5px;
    background-color: ${type === 'success' ? '#4caf50' : '#2196f3'};
    color: white;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 9999;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    transition: opacity 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Monitor file input elements
document.addEventListener('change', function(event) {
  if (event.target.type === 'file') {
    const files = event.target.files;
    if (files.length > 0) {
      // Check if any of the files are images
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      
      if (imageFiles.length > 0) {
        // Notify the background script about the file selection
        chrome.runtime.sendMessage({
          type: 'FILE_SELECTED',
          files: imageFiles.map(file => ({
            name: file.name,
            type: file.type,
            size: file.size
          }))
        });
        
        // Show notification to user
        createNotification('EXIF data will be removed from your images before upload', 'info');
      }
    }
  }
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === 'PROCESSING_COMPLETE') {
    createNotification('EXIF data has been removed from your images', 'success');
  }
}); 