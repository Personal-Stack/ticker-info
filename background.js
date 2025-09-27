// Background script for Ticker Info extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Ticker Info extension installed');
  
  // Set up extension icon behavior if chrome.action is available
  if (chrome.action) {
    try {
      chrome.action.setBadgeText({ text: 'T' });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } catch (error) {
      console.error('Error setting up chrome.action:', error);
    }
  }
});

// Handle extension icon click (if needed for future features)
if (chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener((tab) => {
    console.log('Extension icon clicked on tab:', tab.url);
    // Inject content script if not already present
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        if (!document.querySelector('.ticker-info-symbol')) {
          // Re-initialize ticker detector
          if (window.TickerDetector) {
            new window.TickerDetector();
          }
        }
      }
    }).catch(error => {
      console.error('Error executing script:', error);
    });
  });
}

// Optional: Add context menu items (alternative to in-page menu)
chrome.runtime.onInstalled.addListener(() => {
  // Clear existing context menus first
  chrome.contextMenus.removeAll(() => {
    if (chrome.contextMenus) {
      try {
        chrome.contextMenus.create({
          id: 'ticker-info-search',
          title: 'Search ticker info for "%s"',
          contexts: ['selection']
        });
      } catch (error) {
        console.error('Error creating context menu:', error);
      }
    }
  });
});

if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'ticker-info-search') {
      const selectedText = info.selectionText.trim();
      // Check if selection looks like a ticker
      const tickerMatch = selectedText.match(/\$?([A-Z]{1,5})\b/);
      if (tickerMatch) {
        const ticker = tickerMatch[1];
        // Open Finviz by default
        chrome.tabs.create({
          url: `https://finviz.com/quote.ashx?t=${ticker}&p=d`
        }).catch(error => {
          console.error('Error creating tab:', error);
        });
      }
    }
  });
}

// Handle service worker errors
self.addEventListener('error', (event) => {
  console.error('Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service worker unhandled rejection:', event.reason);
});