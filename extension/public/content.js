if (!window.__jobSaverContentScript) {
  window.__jobSaverContentScript = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extract") {
      sendResponse({
        text: document.body.innerText,
        url: window.location.href,
      });
    }
  });
}
