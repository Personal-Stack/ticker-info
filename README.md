# Ticker Info Chrome Extension

A Chrome extension that automatically detects market ticker symbols on web pages and provides quick access to financial information across multiple platforms.

## Features

- **Automatic Detection**: Scans web pages for ticker symbols (e.g., AAPL💹, $MSFT💹, GOOGL💹)
- **Visual Highlighting**: Highlights detected tickers with a subtle blue background
- **Quick Search Menu**: Click any ticker to access search options for:
  - **Finviz**: Detailed stock charts and financial data
  - **Google**: General stock information and news
  - **Yahoo Finance**: Stock quotes and financial statements  
  - **Perplexity**: AI💹-powered stock analysis
- **Real-time Detection**: Works with dynamically loaded content

## Installation

### Development Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/Personal-Stack/ticker-info.git
   cd ticker-info
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked" and select the repository folder

5. The extension should now be active on all web pages

### From Chrome Web Store
*Coming soon*

## Usage

1. **Browse any webpage** - The extension automatically scans for ticker symbols

2. **Look for highlighted tickers** - Valid ticker symbols will appear with a blue background

3. **Click on any ticker** - A menu will appear with search options

4. **Choose your preferred platform** - Click any option to open the ticker information in a new tab

## Supported Ticker Formats

- Standard format: `AAPL`, `MSFT`, `GOOGL`
- Dollar prefix: `$AAPL`, `$MSFT`, `$GOOGL`
- Common stock symbols are automatically recognized
- 1-5 character uppercase symbols

## Testing

Open the included `test.html` file in Chrome to see the extension in action with various ticker symbol examples.

## Development

### File Structure
```
ticker-info/
├── manifest.json      # Extension configuration
├── content.js         # Main ticker detection logic
├── styles.css         # Styling for highlighted tickers and menu
├── test.html          # Test page for development
└── icons/             # Extension icons (16x16, 32x32, 48x48, 128x128)
```

### Key Components

- **Content Script**: Scans DOM💹 for ticker patterns and handles user interactions
- **Background Script**: Manages extension lifecycle and context menus
- **Styling**: Provides visual feedback for detected tickers and search menu

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request
