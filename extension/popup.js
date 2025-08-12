document.getElementById('run-check').addEventListener('click', async () => {
  document.getElementById('status').textContent = 'capturing...';
  chrome.tabs.query({active:true,currentWindow:true}, tabs=>{
    const tab = tabs[0];
    chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: () => {
        // trigger detection in content script by dispatching a simple custom event
        window.dispatchEvent(new Event('phish_eye_manual_check'));
      }
    });
    document.getElementById('status').textContent = 'requested';
  });
});
