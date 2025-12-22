/**
 * Free Gift Handler
 * Automatically manages free gift in cart based on qualification conditions
 * Compatible with Tier Discount system
 */
(function () {
  'use strict';

  // Config will be set from Liquid template
  const CONFIG = window.FREE_GIFT_CONFIG || {
    enabled: false,
    mode: 'auto',
    trigger: 'any',
    triggerCollectionId: null,
    triggerProductId: null,
    minimumAmount: 0,
    giftProductId: null,
    giftVariantId: null,
    giftQuantity: 1,
    giftLabel: '🎁 Quà tặng miễn phí',
    giftMessage: 'Chúc mừng! Bạn được tặng quà miễn phí'
  };

  let isProcessing = false;
  let lastCartItemCount = -1;

  console.log('[FreeGift] Config loaded:', CONFIG);

  /**
   * Check if cart qualifies for free gift
   */
  function checkQualification(cart) {
    if (!CONFIG.enabled || !CONFIG.giftVariantId) {
      console.log('[FreeGift] Not enabled or no gift variant:', CONFIG.enabled, CONFIG.giftVariantId);
      return false;
    }

    // Filter out gift items when calculating
    const nonGiftItems = cart.items.filter(item =>
      item.product_id != CONFIG.giftProductId &&
      !(item.properties && item.properties._is_free_gift === 'true')
    );

    console.log('[FreeGift] Non-gift items:', nonGiftItems.length);

    if (nonGiftItems.length === 0) return false;

    switch (CONFIG.trigger) {
      case 'any':
        console.log('[FreeGift] Trigger: any, qualifies: true');
        return nonGiftItems.length > 0;

      case 'collection':
        // Check if any item is from trigger collection
        if (!CONFIG.triggerCollectionHandle) return false;
        return nonGiftItems.some(item => {
          const tags = item.properties?._collections || '';
          return tags.toLowerCase().includes(CONFIG.triggerCollectionHandle.toLowerCase());
        });

      case 'minimum':
        const cartTotal = nonGiftItems.reduce((sum, item) => sum + item.final_line_price, 0);
        console.log('[FreeGift] Trigger: minimum, total:', cartTotal, 'required:', CONFIG.minimumAmount);
        return cartTotal >= CONFIG.minimumAmount;

      case 'product':
        return nonGiftItems.some(item => item.product_id == CONFIG.triggerProductId);

      default:
        return false;
    }
  }

  /**
   * Check if gift is already in cart
   */
  function isGiftInCart(cart) {
    const found = cart.items.some(item =>
      item.variant_id == CONFIG.giftVariantId ||
      (item.properties && item.properties._is_free_gift === 'true')
    );
    console.log('[FreeGift] Gift in cart:', found);
    return found;
  }

  /**
   * Add gift to cart
   */
  async function addGift() {
    if (isProcessing) {
      console.log('[FreeGift] Already processing, skip');
      return;
    }
    isProcessing = true;

    console.log('[FreeGift] Adding gift to cart, variant:', CONFIG.giftVariantId);

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            id: CONFIG.giftVariantId,
            quantity: CONFIG.giftQuantity,
            properties: {
              '_is_free_gift': 'true',
              '_gift_label': CONFIG.giftLabel
            }
          }]
        })
      });

      if (response.ok) {
        console.log('[FreeGift] Gift added successfully');
        showToast(CONFIG.giftMessage);
        // Refresh cart drawer
        refreshCartDrawer();
      } else {
        const error = await response.json();
        console.error('[FreeGift] Error adding gift:', error);
      }
    } catch (error) {
      console.error('[FreeGift] Error adding gift:', error);
    } finally {
      isProcessing = false;
    }
  }

  /**
   * Remove gift from cart
   */
  async function removeGift(cart) {
    if (isProcessing) return;
    isProcessing = true;

    try {
      const giftItem = cart.items.find(item =>
        item.variant_id == CONFIG.giftVariantId ||
        (item.properties && item.properties._is_free_gift === 'true')
      );

      if (giftItem) {
        console.log('[FreeGift] Removing gift from cart');
        await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: giftItem.key,
            quantity: 0
          })
        });
        refreshCartDrawer();
      }
    } catch (error) {
      console.error('[FreeGift] Error removing gift:', error);
    } finally {
      isProcessing = false;
    }
  }

  /**
   * Refresh cart drawer content
   */
  function refreshCartDrawer() {
    console.log('[FreeGift] Refreshing cart drawer...');

    // Method 1: Dispatch events
    document.dispatchEvent(new CustomEvent('cart:refresh'));
    document.dispatchEvent(new CustomEvent('cart:updated'));

    // Method 2: Force reload cart drawer content using Section Rendering API
    setTimeout(() => {
      const cartDrawer = document.querySelector('.cart-drawer');
      if (!cartDrawer) return;

      // Find the parent section
      const section = cartDrawer.closest('[id^="shopify-section"]');
      const sectionId = section ? section.id.replace('shopify-section-', '') : 'cart-drawer';

      console.log('[FreeGift] Reloading section:', sectionId);

      fetch(`${window.location.pathname}?section_id=${sectionId}`)
        .then(res => res.text())
        .then(html => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');

          // Only update the cart-drawer-box content, keep drawer wrapper intact
          const newBox = doc.querySelector('.cart-drawer-box');
          const currentBox = cartDrawer.querySelector('.cart-drawer-box');

          if (newBox && currentBox) {
            currentBox.innerHTML = newBox.innerHTML;
            console.log('[FreeGift] Cart drawer content refreshed successfully');
            // Re-attach event listeners
            reinitCartDrawerEvents();
            document.dispatchEvent(new CustomEvent('cart:rendered'));
          } else {
            // Fallback: update entire drawer but preserve active state
            const newContent = doc.querySelector('.cart-drawer');
            if (newContent) {
              const wasActive = cartDrawer.classList.contains('active');
              cartDrawer.innerHTML = newContent.innerHTML;
              if (wasActive) {
                cartDrawer.classList.add('active');
              }
              reinitCartDrawerEvents();
              console.log('[FreeGift] Cart drawer refreshed (fallback)');
            }
          }
        })
        .catch(err => {
          console.error('[FreeGift] Error refreshing drawer:', err);
        });
    }, 500);
  }

  /**
   * Re-init cart drawer events after refresh
   * Calls theme's addCartDrawerListeners() function
   */
  function reinitCartDrawerEvents() {
    console.log('[FreeGift] Re-initializing cart drawer events...');

    // Call theme's native addCartDrawerListeners function
    if (typeof addCartDrawerListeners === 'function') {
      console.log('[FreeGift] Calling theme addCartDrawerListeners()');
      addCartDrawerListeners();
    } else {
      console.warn('[FreeGift] addCartDrawerListeners not found, using fallback');
      // Fallback: manually attach close button event
      const closeBtn = document.querySelector('#btn-close, .cart-drawer-header-right-close');
      if (closeBtn) {
        closeBtn.onclick = function () {
          const drawer = document.querySelector('.cart-drawer');
          if (drawer) {
            drawer.classList.remove('cart-drawer--active');
            drawer.classList.remove('active');
          }
        };
      }
    }
  }

  /**
   * Main function to check and manage gift
   */
  async function checkAndManageGift() {
    if (!CONFIG.enabled) {
      console.log('[FreeGift] Feature disabled');
      return;
    }

    try {
      console.log('[FreeGift] Checking cart...');
      const response = await fetch('/cart.js');
      const cart = await response.json();

      // Prevent duplicate checks
      if (cart.item_count === lastCartItemCount && lastCartItemCount !== -1) {
        console.log('[FreeGift] Cart unchanged, skip');
        return;
      }
      lastCartItemCount = cart.item_count;

      const qualifies = checkQualification(cart);
      const giftInCart = isGiftInCart(cart);

      console.log('[FreeGift] Qualifies:', qualifies, 'Gift in cart:', giftInCart, 'Mode:', CONFIG.mode);

      if (qualifies && !giftInCart && CONFIG.mode === 'auto') {
        console.log('[FreeGift] Adding gift...');
        await addGift();
      } else if (!qualifies && giftInCart) {
        console.log('[FreeGift] Removing gift...');
        await removeGift(cart);
      }
    } catch (error) {
      console.error('[FreeGift] Error checking cart:', error);
    }
  }

  /**
   * Show toast notification
   */
  function showToast(message) {
    // Remove existing toast
    const existingToast = document.querySelector('.free-gift-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'free-gift-toast';
    toast.innerHTML = `
      <span class="free-gift-toast-icon">🎁</span>
      <span class="free-gift-toast-text">${message}</span>
    `;
    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('show'), 100);

    // Animate out
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Hook into fetch to detect cart changes
   */
  function hookFetch() {
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);

      // Check if this is a cart-related request
      const url = args[0];
      if (typeof url === 'string' &&
        (url.includes('/cart/add') ||
          url.includes('/cart/change') ||
          url.includes('/cart/update') ||
          url.includes('/cart/clear'))) {
        console.log('[FreeGift] Cart API called:', url);
        // Wait a bit then check gift
        setTimeout(checkAndManageGift, 800);
      }

      return response;
    };
    console.log('[FreeGift] Fetch hooked');
  }

  /**
   * Initialize event listeners
   */
  function init() {
    console.log('[FreeGift] Initializing...');

    // Hook fetch to detect cart changes
    hookFetch();

    // Listen for cart events
    document.addEventListener('cart:updated', () => {
      console.log('[FreeGift] cart:updated event received');
      setTimeout(checkAndManageGift, 500);
    });

    document.addEventListener('cart:refresh', () => {
      console.log('[FreeGift] cart:refresh event received');
      setTimeout(checkAndManageGift, 500);
    });

    // Listen for add to cart forms
    document.addEventListener('submit', (e) => {
      if (e.target.matches('form[action="/cart/add"]')) {
        console.log('[FreeGift] Add to cart form submitted');
        setTimeout(checkAndManageGift, 1500);
      }
    });

    // Listen for cart drawer open
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.classList && mutation.target.classList.contains('cart-drawer')) {
          if (mutation.target.classList.contains('active') ||
            mutation.target.style.display !== 'none') {
            console.log('[FreeGift] Cart drawer opened');
            setTimeout(checkAndManageGift, 300);
          }
        }
      });
    });

    const cartDrawer = document.querySelector('.cart-drawer');
    if (cartDrawer) {
      observer.observe(cartDrawer, {
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }

    // Listen for "Thêm quà" button click (checkbox mode)
    document.addEventListener('click', async (e) => {
      console.log('[FreeGift] Click event:', e.target);
      const addBtn = e.target.closest('.free-gift-add-btn');
      if (addBtn) {
        console.log('[FreeGift] Add button clicked!');
        e.preventDefault();
        e.stopPropagation();

        addBtn.disabled = true;
        addBtn.textContent = 'Đang thêm...';

        try {
          console.log('[FreeGift] Calling addGift()...');
          await addGift();
          console.log('[FreeGift] Gift added successfully!');
        } catch (err) {
          console.error('[FreeGift] Error:', err);
        } finally {
          addBtn.disabled = false;
          addBtn.textContent = 'Thêm quà';
        }
      }
    }, true); // Use capture phase

    // Initial check after a short delay
    setTimeout(checkAndManageGift, 1000);

    console.log('[FreeGift] Initialized successfully');
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for external use and debugging
  window.FreeGift = {
    check: checkAndManageGift,
    addGift: addGift,
    config: CONFIG,
    debug: () => console.log('[FreeGift] Config:', CONFIG)
  };

})();
