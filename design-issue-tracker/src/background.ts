// Background service worker for the extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('Design Issue Tracker extension installed');
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ status: 'ok' });
  }
});
