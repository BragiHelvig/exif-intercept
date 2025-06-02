importScripts('heic2any.min.js');

onmessage = async function(e) {
  try {
    const { file, quality } = e.data;
    
    // Convert HEIC to JPEG
    const convertedBlob = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: quality
    });
    
    // Send the converted blob back to the main thread
    postMessage({ blob: convertedBlob });
  } catch (error) {
    postMessage({ error: error.message });
  }
}; 