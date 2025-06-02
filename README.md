# EXIF Intercept Chrome Extension

A Chrome extension that automatically removes EXIF data from photos before they are uploaded to social media platforms.

## Features

- Automatically detects image uploads
- Removes EXIF data from images before they are sent
- Simple toggle to enable/disable the extension
- Works across multiple social media platforms
- Preserves image quality while removing metadata

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension icon should appear in your Chrome toolbar

## Usage

1. Click the extension icon in your Chrome toolbar to open the popup
2. Use the toggle to enable/disable EXIF removal
3. The extension will automatically process images when you upload them to any website
4. The status indicator will show whether the extension is active

## How it Works

The extension intercepts file uploads and processes images through a canvas element, which naturally strips EXIF data while maintaining image quality. This happens automatically in the background, so you don't need to do anything special - just upload your photos as usual.

## Privacy

This extension:
- Only processes images that you explicitly choose to upload
- Does not store or transmit your images to any external servers
- All processing happens locally in your browser
- Does not collect any personal data

## License

MIT License 