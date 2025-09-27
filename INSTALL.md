# Installation Guide

## Installing the Ticker Info Chrome Extension

### Method 1: Developer Mode (Recommended for now)

1. **Download or Clone the Repository**
   ```bash
   git clone https://github.com/Personal-Stack/ticker-info.git
   cd ticker-info
   ```

2. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Navigate to `chrome://extensions/`
   - Alternatively, go to Chrome Menu > More Tools > Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the Extension**
   - Click "Load unpacked"
   - Select the `ticker-info` folder (the one containing `manifest.json`)
   - The extension should now appear in your extensions list

5. **Verify Installation**
   - The extension icon should appear in your Chrome toolbar
   - Visit any webpage with ticker symbols to test functionality

### Testing the Extension

1. **Open the Test Page**
   - Navigate to the `test.html` file included in the extension folder
   - Or visit any financial website like Yahoo Finance, MarketWatch, etc.

2. **Look for Highlighted Tickers**
   - Ticker symbols (like AAPL, MSFT, $GOOGL) should appear with a blue background
   - These are now clickable elements

3. **Click on Any Ticker**
   - A menu will appear with four search options:
     - 📊 Search on Finviz
     - 🔍 Search on Google
     - 💰 Search on Yahoo Finance
     - 🤖 Search on Perplexity

4. **Test Dynamic Content**
   - The extension also works with content loaded after page load
   - Try websites with live stock tickers or news feeds

### Supported Ticker Formats

- **Standard**: AAPL, MSFT, GOOGL, TSLA
- **Dollar-prefixed**: $AAPL, $MSFT, $GOOGL
- **Length**: 1-5 uppercase characters
- **Context-aware**: Only detects likely stock symbols, not random uppercase words

### Troubleshooting

**Extension not working:**
- Make sure Developer mode is enabled
- Refresh the webpage after installing the extension
- Check that the extension is enabled in chrome://extensions/

**Tickers not highlighting:**
- The extension focuses on well-known stock symbols
- Make sure the ticker is in uppercase format
- Some abbreviations may not be recognized to avoid false positives

**Menu not appearing:**
- Try clicking directly on the highlighted ticker symbol
- Check if popup blockers are interfering
- Refresh the page and try again

### Future Updates

The extension will be submitted to the Chrome Web Store for easier installation. Check back for updates!