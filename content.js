// Content script to detect and highlight ticker symbols
class TickerDetector {
  constructor() {
    this.tickerRegex = /\$?([A-Z]{1,5})\b/g;
    this.commonStockSymbols = new Set([
      'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA', 'BRK', 'UNH',
      'JNJ', 'JPM', 'V', 'PG', 'HD', 'MA', 'CVX', 'ABBV', 'BAC', 'PFE', 'KO',
      'AVGO', 'PEP', 'TMO', 'COST', 'MRK', 'WMT', 'DHR', 'VZ', 'ABT', 'ADBE',
      'CRM', 'NFLX', 'AMD', 'INTC', 'CMCSA', 'ORCL', 'XOM', 'NKE', 'TXN', 'QCOM'
    ]);
    this.processedNodes = new WeakSet();
    this.dropdown = null;
    this.init();
  }

  init() {
    this.createDropdown();
    this.scanAndHighlightTickers();
    this.observeChanges();
  }

  createDropdown() {
    // Create single reusable dropdown
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'ticker-info-menu';
    this.dropdown.style.position = 'fixed';
    this.dropdown.style.display = 'none';
    this.dropdown.style.zIndex = '10000';

    // Create menu items structure
    const menuItems = [
      { id: 'finviz', label: 'Search on Finviz', icon: '📊' },
      { id: 'google', label: 'Search on Google', icon: '🔍' },
      { id: 'yahoo', label: 'Search on Yahoo Finance', icon: '💰' },
      { id: 'perplexity', label: 'Search on Perplexity', icon: '🤖' }
    ];

    menuItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.className = 'ticker-info-menu-item';
      menuItem.innerHTML = `${item.icon} ${item.label}`;
      menuItem.dataset.platform = item.id;
      this.dropdown.appendChild(menuItem);
    });

    // Add close button
    const closeBtn = document.createElement('div');
    closeBtn.className = 'ticker-info-close';
    closeBtn.innerHTML = '✖';
    closeBtn.addEventListener('click', () => this.hideDropdown());
    this.dropdown.appendChild(closeBtn);

    document.body.appendChild(this.dropdown);

    // Setup outside click handler
    this.setupOutsideClickHandler();
  }

  setupOutsideClickHandler() {
    document.addEventListener('click', (e) => {
      if (this.dropdown.style.display === 'block' && !this.dropdown.contains(e.target)) {
        this.hideDropdown();
      }
    });
  }

  scanAndHighlightTickers() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip script and style elements
          const parent = node.parentElement;
          if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      if (!this.processedNodes.has(node) && node.textContent.trim()) {
        textNodes.push(node);
      }
    }

    textNodes.forEach(textNode => this.processTextNode(textNode));
  }

  processTextNode(textNode) {
    const text = textNode.textContent;
    const matches = [...text.matchAll(this.tickerRegex)];
    
    if (matches.length === 0) {
      this.processedNodes.add(textNode);
      return;
    }

    let lastIndex = 0;
    const fragment = document.createDocumentFragment();
    
    matches.forEach(match => {
      const ticker = match[1];
      const fullMatch = match[0];
      const startIndex = match.index;
      
      // Add text before the match
      if (startIndex > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, startIndex)));
      }
      
      // Create ticker element if it looks like a valid ticker
      if (this.isLikelyTicker(ticker, fullMatch)) {
        const tickerElement = this.createTickerElement(ticker, fullMatch);
        fragment.appendChild(tickerElement);
      } else {
        fragment.appendChild(document.createTextNode(fullMatch));
      }
      
      lastIndex = startIndex + fullMatch.length;
    });
    
    // Add remaining text
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    
    textNode.parentNode.replaceChild(fragment, textNode);
    this.processedNodes.add(textNode);
  }

  isLikelyTicker(ticker, fullMatch) {
    // Check if it's a known ticker or has $ prefix
    return this.commonStockSymbols.has(ticker) || fullMatch.startsWith('$');
  }

  createTickerElement(ticker, fullMatch) {
    const span = document.createElement('span');
    span.className = 'ticker-info-symbol';
    span.textContent = fullMatch;
    span.dataset.ticker = ticker;
    span.title = `Click to search for ${ticker} information`;
    
    span.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showTickerDropdown(ticker, e.target);
    });
    
    return span;
  }

  showTickerDropdown(ticker, tickerElement) {
    // Position dropdown next to the ticker element
    const rect = tickerElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    this.dropdown.style.left = `${rect.left + scrollLeft}px`;
    this.dropdown.style.top = `${rect.bottom + scrollTop + 2}px`;
    this.dropdown.style.display = 'block';

    // Update menu items with ticker-specific URLs
    const menuItems = this.dropdown.querySelectorAll('.ticker-info-menu-item');
    menuItems.forEach(item => {
      const platform = item.dataset.platform;
      let url;
      
      switch (platform) {
        case 'finviz':
          url = `https://finviz.com/quote.ashx?t=${ticker}&p=d`;
          break;
        case 'google':
          url = `https://www.google.com/search?q=${ticker}+stock`;
          break;
        case 'yahoo':
          url = `https://finance.yahoo.com/quote/${ticker}`;
          break;
        case 'perplexity':
          url = `https://www.perplexity.ai/search?q=${ticker}+stock+analysis`;
          break;
      }
      
      // Remove existing click listeners and add new one
      const newItem = item.cloneNode(true);
      newItem.addEventListener('click', () => {
        window.open(url, '_blank');
        this.hideDropdown();
      });
      item.parentNode.replaceChild(newItem, item);
    });
  }

  hideDropdown() {
    this.dropdown.style.display = 'none';
  }

  observeChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            this.processTextNode(node);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Scan new element for text nodes
            const walker = document.createTreeWalker(
              node,
              NodeFilter.SHOW_TEXT,
              {
                acceptNode: (textNode) => {
                  const parent = textNode.parentElement;
                  if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
                    return NodeFilter.FILTER_REJECT;
                  }
                  return this.processedNodes.has(textNode) ? 
                    NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
                }
              }
            );

            let textNode;
            while (textNode = walker.nextNode()) {
              this.processTextNode(textNode);
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new TickerDetector());
} else {
  new TickerDetector();
}