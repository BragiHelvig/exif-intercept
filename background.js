// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'processImage') {
    // Handle image processing requests
    processImage(message.data)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Will respond asynchronously
  }
});

// Function to process an image
async function processImage(data) {
  try {
    const response = await fetch(data.url);
    const blob = await response.blob();
    
    // Create a canvas to process the image
    const img = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    // Convert to blob with specified format and quality
    const processedBlob = await canvas.convertToBlob({
      type: `image/${data.format}`,
      quality: data.quality / 100
    });
    
    return {
      success: true,
      blob: processedBlob
    };
  } catch (error) {
    throw new Error('Failed to process image: ' + error.message);
  }
} 