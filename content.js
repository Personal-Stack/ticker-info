// Refactored Content script for ticker detection with single dropdown menu
class TickerDetector {
  constructor() {
    this.tickerRegex = /\b([A-Z]{1,5})\b/g;
    this.processedNodes = new WeakSet();
    this.processedTickers = new Set(); // Track already processed tickers
    this.dropdownMenu = null;
    this.currentTicker = null;
    
    // Performance optimization properties
    this.batchSize = 100; // Process nodes in batches
    this.maxProcessingTime = 32; // Max 32ms per batch
    this.processingQueue = [];
    this.isProcessing = false;
    this.processedCount = 0;
    this.maxNodes = 5000; // Increased limit
    this.rerunTimer = null; // Timer for automatic rerun
    
    // Check if we should run on this page
    if (this.shouldRunOnPage()) {
      this.init();
    }
  }

  shouldRunOnPage() {
    // Skip if already initialized to prevent duplicates
    if (this.isInitialized || document.querySelector('.ticker-info-symbol')) {
      console.log('TickerDetector: Skipping - already initialized or ticker symbols found');
      return false;
    }

    // Skip extension pages, settings, and system pages
    const url = window.location.href;
    if (url.startsWith('chrome://') || 
        url.startsWith('chrome-extension://') || 
        url.startsWith('moz-extension://') || 
        url.startsWith('edge://') || 
        url.startsWith('about:')) {
      console.log('TickerDetector: Skipping - system/extension page');
      return false;
    }

    // Skip pages that are likely not content pages
    const hostname = window.location.hostname;
    if (hostname === 'localhost' && window.location.pathname.includes('settings')) {
      console.log('TickerDetector: Skipping - settings page');
      return false;
    }

    // Check if page has meaningful text content
    const bodyText = document.body?.textContent || '';
    if (bodyText.trim().length < 100) {
      console.log('TickerDetector: Skipping - insufficient content');
      return false;
    }

    console.log('TickerDetector: Running on page:', url);
    return true;
  }

  init() {
    this.isInitialized = true;
    this.createDropdownMenu();
    this.setupTickerClickHandlers();
    this.setupGlobalClickHandler();
    
    if (document.readyState === 'complete') {
      this.scanAndHighlightTickers();
    } else {
      window.addEventListener('load', () => {
        this.scanAndHighlightTickers();
      });
    }
    
    // Schedule automatic rerun after 20 seconds to catch AJAX-loaded content
    this.scheduleRerun();
    
    this.observeChanges();
  }

  createDropdownMenu() {
    // Create single reusable dropdown menu
    this.dropdownMenu = document.createElement('div');
    this.dropdownMenu.className = 'ticker-dropdown-menu';
    this.dropdownMenu.style.cssText = `
      position: fixed;
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08);
      z-index: 10000;
      padding: 8px;
      min-width: 240px;
      max-width: 300px;
      display: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      font-size: 14px;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    `;

    // Create menu items
    const menuItems = [
      { label: 'View on Finviz', icon: '📊', urlTemplate: 'https://finviz.com/quote.ashx?t={ticker}&p=d' },
      { label: 'Search on Google', icon: '🔍', urlTemplate: 'https://www.google.com/search?q={ticker}+stock' },
      { label: 'View on Yahoo Finance', icon: '💰', urlTemplate: 'https://finance.yahoo.com/quote/{ticker}' },
      { label: 'Perplexity Recent News', icon: '📰', urlTemplate: 'https://www.perplexity.ai/search?q={ticker}+news+today+yesterday' }
    ];

    // Add refresh tickers option
    const refreshItem = {
      label: 'Refresh Tickers',
      icon: '🔄',
      action: 'refresh'
    };

    menuItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.className = 'ticker-dropdown-item';
      menuItem.style.cssText = `
        padding: 12px 16px;
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        color: #374151;
        margin: 2px 4px;
      `;
      
      menuItem.innerHTML = `${item.icon} ${item.label}`;
      menuItem.dataset.urlTemplate = item.urlTemplate;
      
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.backgroundColor = '#3b82f6';
        menuItem.style.color = '#ffffff';
        menuItem.style.transform = 'translateY(-1px)';
        menuItem.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.25)';
      });
      
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.backgroundColor = 'transparent';
        menuItem.style.color = '#374151';
        menuItem.style.transform = 'translateY(0)';
        menuItem.style.boxShadow = 'none';
      });
      
      menuItem.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.currentTicker) {
          const url = item.urlTemplate.replace('{ticker}', this.currentTicker);
          window.open(url, '_blank');
        }
        this.hideDropdown();
      });
      
      this.dropdownMenu.appendChild(menuItem);
    });

    // Add refresh option with separator
    const separator = document.createElement('div');
    separator.style.cssText = `
      height: 1px;
      background: #e2e8f0;
      margin: 8px 4px;
    `;
    this.dropdownMenu.appendChild(separator);

    const refreshMenuItem = document.createElement('div');
    refreshMenuItem.className = 'ticker-dropdown-item';
    refreshMenuItem.style.cssText = `
      padding: 12px 16px;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 500;
      color: #374151;
      margin: 2px 4px;
    `;
    
    refreshMenuItem.innerHTML = `${refreshItem.icon} ${refreshItem.label}`;
    
    refreshMenuItem.addEventListener('mouseenter', () => {
      refreshMenuItem.style.backgroundColor = '#10b981';
      refreshMenuItem.style.color = '#ffffff';
      refreshMenuItem.style.transform = 'translateY(-1px)';
      refreshMenuItem.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
    });
    
    refreshMenuItem.addEventListener('mouseleave', () => {
      refreshMenuItem.style.backgroundColor = 'transparent';
      refreshMenuItem.style.color = '#374151';
      refreshMenuItem.style.transform = 'translateY(0)';
      refreshMenuItem.style.boxShadow = 'none';
    });
    
    refreshMenuItem.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Run shadow DOM debug if shift key is held
      if (e.shiftKey) {
        this.debugShadowDOM();
      } else {
        this.refreshTickers();
      }
      
      this.hideDropdown();
    });
    
    this.dropdownMenu.appendChild(refreshMenuItem);

    // Add ticker info header (will be updated dynamically)
    const header = document.createElement('div');
    header.className = 'ticker-header';
    header.style.cssText = `
      padding: 12px 16px 8px 16px;
      border-bottom: 2px solid #e2e8f0;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 6px;
      font-size: 16px;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-align: center;
    `;
    this.dropdownMenu.insertBefore(header, this.dropdownMenu.firstChild);

    document.body.appendChild(this.dropdownMenu);
  }

  setupGlobalClickHandler() {
    document.addEventListener('click', (e) => {
      if (!this.dropdownMenu.contains(e.target) && 
          !e.target.classList.contains('ticker-wrapper') &&
          !e.target.classList.contains('ticker-btn')) {
        this.hideDropdown();
      }
    });
  }

  scanAndHighlightTickers() {
    if (this.processedCount >= this.maxNodes) {
      return;
    }

    // Reset processed tickers for each full scan
    this.processedTickers.clear();

    const allTextNodes = [];
    let nodeCount = 0;

    // Scan regular DOM
    const regularNodes = this.scanDomForTextNodes(document.body);
    allTextNodes.push(...regularNodes.slice(0, this.maxNodes - nodeCount));
    nodeCount += regularNodes.length;

    // Scan Shadow DOM if we haven't hit the limit
    if (nodeCount < this.maxNodes) {
      const shadowNodes = this.scanShadowDoms(document.body);
      allTextNodes.push(...shadowNodes.slice(0, this.maxNodes - nodeCount));
    }

    this.processingQueue = allTextNodes;
    this.processBatch();
  }

  scanDomForTextNodes(root) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent || 
              parent.tagName === 'SCRIPT' || 
              parent.tagName === 'STYLE' ||
              parent.classList.contains('ticker-wrapper') ||
              parent.classList.contains('ticker-btn') ||
              parent.classList.contains('ticker-dropdown-menu') ||
              (node.textContent && node.textContent.length > 1000)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes = [];
    let node;
    let nodeCount = 0;
    
    while ((node = walker.nextNode()) && nodeCount < this.maxNodes) {
      if (!this.processedNodes.has(node) && node.textContent && node.textContent.trim().length > 1) {
        textNodes.push(node);
        nodeCount++;
      }
    }

    return textNodes;
  }

  scanShadowDoms(root) {
    const shadowTextNodes = [];
    const shadowRoots = this.getAllShadowRoots(root);
    
    console.log(`TickerDetector: Processing ${shadowRoots.length} shadow roots`);
    
    shadowRoots.forEach((shadowRoot, index) => {
      try {
        const shadowNodes = this.scanDomForTextNodes(shadowRoot);
        shadowTextNodes.push(...shadowNodes);
        console.log(`TickerDetector: Shadow root ${index + 1} yielded ${shadowNodes.length} text nodes`);
        
        // Also log some sample text content for debugging
        if (shadowNodes.length > 0) {
          const sampleText = shadowNodes.slice(0, 3).map(node => 
            node.textContent.trim().substring(0, 50)
          ).join(', ');
          console.log(`TickerDetector: Sample text from shadow root: ${sampleText}`);
        }
        
      } catch (error) {
        // Some shadow roots might be inaccessible due to security restrictions
        console.debug('TickerDetector: Could not access shadow root:', error);
      }
    });

    console.log(`TickerDetector: Total shadow DOM text nodes: ${shadowTextNodes.length}`);
    return shadowTextNodes;
  }

  getAllShadowRoots(root) {
    const shadowRoots = [];
    
    console.log('TickerDetector: Scanning for shadow roots...');
    
    // Method 1: Use querySelectorAll to find all elements, then check for shadow roots
    const allElements = root.querySelectorAll('*');
    console.log(`TickerDetector: Checking ${allElements.length} elements for shadow roots`);
    
    allElements.forEach(element => {
      if (element.shadowRoot) {
        console.log('TickerDetector: Found open shadow root on:', element.tagName);
        shadowRoots.push(element.shadowRoot);
        // Recursively scan inside shadow root for nested shadow roots
        const nestedShadowRoots = this.getAllShadowRoots(element.shadowRoot);
        shadowRoots.push(...nestedShadowRoots);
      }
    });
    
    // Method 2: Also try to detect closed shadow roots by looking for common patterns
    try {
      // Look for elements that might have closed shadow roots
      const potentialShadowHosts = root.querySelectorAll('*');
      potentialShadowHosts.forEach(element => {
        // Check if element has children but no visible content (potential closed shadow root)
        if (element.children.length === 0 && 
            element.textContent.trim() === '' && 
            getComputedStyle(element).display !== 'none' &&
            element.offsetWidth > 0 && 
            element.offsetHeight > 0) {
          
          // Try to access shadow root through various means
          try {
            // Some frameworks expose shadow root in different ways
            const potentialShadow = element.shadowRoot || 
                                   element._shadowRoot || 
                                   element.__shadowRoot;
            
            if (potentialShadow && !shadowRoots.includes(potentialShadow)) {
              console.log('TickerDetector: Found potential closed shadow root on:', element.tagName);
              shadowRoots.push(potentialShadow);
            }
          } catch (e) {
            // Ignore access errors for closed shadow roots
          }
        }
      });
    } catch (e) {
      console.debug('TickerDetector: Error in closed shadow root detection:', e);
    }
    
    console.log(`TickerDetector: Found ${shadowRoots.length} shadow roots total`);
    return shadowRoots;
  }

  scanAllShadowDomsInElement(element) {
    const shadowTextNodes = [];
    
    // Check if this element itself has a shadow root
    if (element.shadowRoot) {
      try {
        const shadowNodes = this.scanDomForTextNodes(element.shadowRoot);
        shadowTextNodes.push(...shadowNodes);
      } catch (error) {
        console.debug('TickerDetector: Could not access shadow root in new element:', error);
      }
    }
    
    // Check all child elements for shadow roots
    const childElements = element.querySelectorAll('*');
    childElements.forEach(childElement => {
      if (childElement.shadowRoot) {
        try {
          const shadowNodes = this.scanDomForTextNodes(childElement.shadowRoot);
          shadowTextNodes.push(...shadowNodes);
        } catch (error) {
          console.debug('TickerDetector: Could not access child shadow root:', error);
        }
      }
    });
    
    return shadowTextNodes;
  }

  processBatch() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const startTime = performance.now();
    let processed = 0;

    // Process nodes until we hit time limit or batch size
    while (this.processingQueue.length > 0 && processed < this.batchSize) {
      const currentTime = performance.now();
      if (currentTime - startTime > this.maxProcessingTime) {
        break; // Time limit reached
      }

      const textNode = this.processingQueue.shift();
      
      // Skip if node is no longer valid with comprehensive checks
      if (textNode && 
          textNode.nodeType === Node.TEXT_NODE &&
          textNode.isConnected && 
          textNode.parentNode && 
          textNode.parentNode.nodeType === Node.ELEMENT_NODE &&
          !this.processedNodes.has(textNode)) {
        this.processTextNode(textNode);
        this.processedCount++;
      }
      processed++;

      // Stop if we've hit the total node limit
      if (this.processedCount >= this.maxNodes) {
        this.processingQueue = []; // Clear queue
        break;
      }
    }

    this.isProcessing = false;

    // Schedule next batch if there are more nodes
    if (this.processingQueue.length > 0) {
      requestAnimationFrame(() => this.processBatch());
    }
  }

  processTextNode(textNode) {
    if (!textNode || !textNode.isConnected || !textNode.parentNode) {
      return;
    }

    const parent = textNode.parentElement;
    if (!parent || 
        parent.tagName === 'SCRIPT' || 
        parent.tagName === 'STYLE' ||
        parent.querySelector('.ticker-wrapper')) {
      this.processedNodes.add(textNode);
      return;
    }

    const text = textNode.textContent;
    if (!text || text.length < 2 || text.length > 1000) {
      this.processedNodes.add(textNode);
      return;
    }

    this.tickerRegex.lastIndex = 0;
    const matches = [...text.matchAll(this.tickerRegex)];
    
    if (matches.length === 0) {
      this.processedNodes.add(textNode);
      return;
    }

    try {
      let newHTML = text;
      
      // Replace tickers with wrapper spans (only first occurrence)
      matches.reverse().forEach(match => {
        const ticker = match[1];
        const fullMatch = match[0];
        const startIndex = match.index;
        
        if (ticker.length >= 2 && ticker.length <= 5) {
          // Only add button if we haven't seen this ticker before
          if (!this.processedTickers.has(ticker)) {
            // Create a wrapper that includes the original text and a small button
            const tickerWrapper = '<span class="ticker-wrapper" data-ticker="' + ticker + '">' + 
                                fullMatch + 
                                '<span class="ticker-btn">💹</span>' +
                                '</span>';
            newHTML = newHTML.slice(0, startIndex) + tickerWrapper + newHTML.slice(startIndex + fullMatch.length);
            this.processedTickers.add(ticker); // Mark as processed
          }
          // If already processed, leave as plain text (no replacement)
        }
      });

      if (newHTML !== text && parent.innerHTML !== undefined) {
        // Simple replacement approach
        const originalHTML = parent.innerHTML;
        const textHTML = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        parent.innerHTML = originalHTML.replace(textHTML, newHTML);
      }
    } catch (error) {
      // Fallback: do nothing if replacement fails
    }

    this.processedNodes.add(textNode);
  }

  setupTickerClickHandlers() {
    // Use event delegation for better performance
    document.addEventListener('click', (e) => {
      // Handle clicks on ticker buttons
      if (e.target.classList.contains('ticker-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const wrapper = e.target.parentElement;
        if (wrapper && wrapper.classList.contains('ticker-wrapper')) {
          const ticker = wrapper.dataset.ticker;
          this.showDropdown(ticker, wrapper);
        }
      }
      // Also handle clicks on the wrapper itself
      else if (e.target.classList.contains('ticker-wrapper')) {
        e.preventDefault();
        e.stopPropagation();
        const ticker = e.target.dataset.ticker;
        this.showDropdown(ticker, e.target);
      }
    });
  }

  showDropdown(ticker, element) {
    this.hideDropdown();
    this.currentTicker = ticker;
    
    const rect = element.getBoundingClientRect();
    const dropdown = this.dropdownMenu;
    
    // Update header with ticker name
    const header = dropdown.querySelector('.ticker-header');
    if (header) {
      header.textContent = `$${ticker}`;
    }
    
    // Position dropdown with better placement logic
    dropdown.style.display = 'block';
    
    // Calculate optimal position
    const dropdownRect = dropdown.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 8;
    
    // Adjust if dropdown would go off-screen
    if (left + dropdownRect.width > window.innerWidth - 10) {
      left = window.innerWidth - dropdownRect.width - 10;
    }
    if (top + dropdownRect.height > window.innerHeight - 10) {
      top = rect.top - dropdownRect.height - 8;
    }
    
    dropdown.style.left = Math.max(10, left) + 'px';
    dropdown.style.top = Math.max(10, top) + 'px';
    
    // Add entrance animation
    dropdown.style.opacity = '0';
    dropdown.style.transform = 'scale(0.95) translateY(-10px)';
    
    requestAnimationFrame(() => {
      dropdown.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
      dropdown.style.opacity = '1';
      dropdown.style.transform = 'scale(1) translateY(0)';
    });
  }

  hideDropdown() {
    if (this.dropdownMenu) {
      this.dropdownMenu.style.display = 'none';
    }
  }

  refreshTickers() {
    console.log('TickerDetector: Refreshing tickers...');
    
    // Reset counters and tracking
    this.processedCount = 0;
    this.processedTickers.clear();
    this.processedNodes = new WeakSet();
    this.processingQueue = [];
    
    // Scan for new tickers
    this.scanAndHighlightTickers();
  }

  // Debug method to test Shadow DOM detection
  debugShadowDOM() {
    console.log('=== SHADOW DOM DEBUG ===');
    
    // Test basic shadow root detection
    const allElements = document.querySelectorAll('*');
    let shadowCount = 0;
    
    allElements.forEach(element => {
      if (element.shadowRoot) {
        shadowCount++;
        console.log('Found shadow root on:', element.tagName, element.className || element.id || '(no class/id)');
        
        // Try to scan content in this shadow root
        const shadowContent = element.shadowRoot.textContent;
        if (shadowContent && shadowContent.trim()) {
          console.log('Shadow content preview:', shadowContent.trim().substring(0, 100));
        }
      }
    });
    
    console.log(`Total shadow roots found: ${shadowCount}`);
    
    // Test if we can create a simple shadow root for testing
    try {
      const testDiv = document.createElement('div');
      testDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: red; color: white; padding: 10px; z-index: 99999;';
      const shadow = testDiv.attachShadow({mode: 'open'});
      shadow.innerHTML = 'AAPL TSLA MSFT Test Shadow DOM';
      document.body.appendChild(testDiv);
      
      console.log('Test shadow element created - check top-right corner');
      
      // Clean up after 5 seconds
      setTimeout(() => {
        document.body.removeChild(testDiv);
        console.log('Test shadow element removed');
      }, 5000);
      
    } catch (e) {
      console.log('Could not create test shadow element:', e);
    }
    
    console.log('=== END SHADOW DOM DEBUG ===');
  }

  scheduleRerun() {
    // Clear existing timer if any
    if (this.rerunTimer) {
      clearTimeout(this.rerunTimer);
    }
    
    // Schedule rerun after 20 seconds to catch AJAX content
    this.rerunTimer = setTimeout(() => {
      console.log('TickerDetector: Automatic rerun after 20 seconds...');
      this.refreshTickers();
    }, 20000);
  }

  observeChanges() {
    const observer = new MutationObserver((mutations) => {
      // Debounce mutations to avoid excessive processing
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
      }

      this.debounceTimeout = setTimeout(() => {
        this.handleMutations(mutations);
      }, 100); // 100ms debounce
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  handleMutations(mutations) {
    // Skip if we've processed too many nodes already
    if (this.processedCount >= this.maxNodes) {
      return;
    }

    const newTextNodes = [];
    let nodeCount = 0;
    const maxMutationNodes = 100; // Limit nodes per mutation batch

    mutations.forEach((mutation) => {
      if (nodeCount >= maxMutationNodes) return;

      mutation.addedNodes.forEach((node) => {
        if (nodeCount >= maxMutationNodes) return;

        // Skip processing if node contains existing ticker symbols
        if (node.nodeType === Node.ELEMENT_NODE && 
            node.querySelector && node.querySelector('.ticker-info-symbol')) {
          return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
          if (node.textContent && node.textContent.trim() && 
              node.textContent.length < 5000) {
            newTextNodes.push(node);
            nodeCount++;
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // Scan new element for text nodes (regular DOM)
          const regularNodes = this.scanDomForTextNodes(node).slice(0, maxMutationNodes - nodeCount);
          newTextNodes.push(...regularNodes);
          nodeCount += regularNodes.length;

          // Also scan for shadow DOM content if we haven't hit the limit
          if (nodeCount < maxMutationNodes) {
            const shadowNodes = this.scanShadowDoms(node).slice(0, maxMutationNodes - nodeCount);
            newTextNodes.push(...shadowNodes);
            nodeCount += shadowNodes.length;
          }
        }
      });
    });

    // Add to processing queue instead of processing immediately
    if (newTextNodes.length > 0) {
      this.processingQueue.push(...newTextNodes);
      if (!this.isProcessing) {
        requestAnimationFrame(() => this.processBatch());
      }
    }
  }
}

// Initialize when page is fully loaded
if (document.readyState === 'complete') {
  // Page is already fully loaded
  new TickerDetector();
} else if (document.readyState === 'interactive') {
  // DOM is loaded but resources might still be loading
  window.addEventListener('load', () => new TickerDetector());
} else {
  // Document is still loading
  window.addEventListener('load', () => new TickerDetector());
}
