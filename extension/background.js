// background.js (service worker)
chrome.runtime.onInstalled.addListener(() => {
  console.log('PhishEye installed');
});

// listen for requests from content script to capture & analyze
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'capture_and_check') {
    // capture visible tab (fast, local)
    chrome.tabs.captureVisibleTab({format: 'png'}, dataUrl => {
      if (chrome.runtime.lastError) {
        sendResponse({ok:false, error: chrome.runtime.lastError.message});
        return;
      }
      // return screenshot to content script for local analysis
      sendResponse({ok:true, screenshot: dataUrl});
    });
    // indicate we'll send a response asynchronously
    return true;
  }
});
