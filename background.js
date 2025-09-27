// Background script for Ticker Info extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Ticker Info extension installed');
});

// Handle extension icon click (if needed for future features)
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab.url);
});

// Optional: Add context menu items (alternative to in-page menu)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'ticker-info-search',
    title: 'Search ticker info for "%s"',
    contexts: ['selection']
  });
});

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
      });
    }
  }
});