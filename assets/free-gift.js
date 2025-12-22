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
    giftLabel: 'Quà tặng miễn phí',
    giftMessage: 'Chúc mừng! Bạn được tặng quà miễn phí'
  };

  let isProcessing = false;
  let lastCartItemCount = -1;

  /**
   * Check if cart qualifies for free gift
   */
  function checkQualification(cart) {
    if (!CONFIG.enabled || !CONFIG.giftVariantId) {
      return false;
    }

    // Filter out gift items when calculating
    const nonGiftItems = cart.items.filter(item =>
      item.product_id != CONFIG.giftProductId &&
      !(item.properties && item.properties._is_free_gift === 'true')
    );

    if (nonGiftItems.length === 0) return false;

    switch (CONFIG.trigger) {
      case 'any':
        return nonGiftItems.length > 0;

      case 'collection':
        if (!CONFIG.triggerCollectionHandle) return false;
        return nonGiftItems.some(item => {
          const tags = item.properties?._collections || '';
          return tags.toLowerCase().includes(CONFIG.triggerCollectionHandle.toLowerCase());
        });

      case 'minimum':
        const cartTotal = nonGiftItems.reduce((sum, item) => sum + item.final_line_price, 0);
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
    return cart.items.some(item =>
      item.variant_id == CONFIG.giftVariantId ||
      (item.properties && item.properties._is_free_gift === 'true')
    );
  }

  /**
   * Add gift to cart
   */
  async function addGift() {
    if (isProcessing) return;
    isProcessing = true;

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
        showToast(CONFIG.giftMessage);
        refreshCartDrawer();
      } else {
        console.error('[FreeGift] Error adding gift');
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
    // Method 1: Dispatch events
    document.dispatchEvent(new CustomEvent('cart:refresh'));
    document.dispatchEvent(new CustomEvent('cart:updated'));

    // Method 2: Force reload cart drawer content using Section Rendering API
    setTimeout(() => {
      const cartDrawer = document.querySelector('.cart-drawer');
      if (!cartDrawer) return;

      const section = cartDrawer.closest('[id^="shopify-section"]');
      const sectionId = section ? section.id.replace('shopify-section-', '') : 'cart-drawer';

      fetch(`${window.location.pathname}?section_id=${sectionId}`)
        .then(res => res.text())
        .then(html => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');

          const newBox = doc.querySelector('.cart-drawer-box');
          const currentBox = cartDrawer.querySelector('.cart-drawer-box');

          if (newBox && currentBox) {
            currentBox.innerHTML = newBox.innerHTML;
            reinitCartDrawerEvents();
            document.dispatchEvent(new CustomEvent('cart:rendered'));
          } else {
            const newContent = doc.querySelector('.cart-drawer');
            if (newContent) {
              const wasActive = cartDrawer.classList.contains('active');
              cartDrawer.innerHTML = newContent.innerHTML;
              if (wasActive) {
                cartDrawer.classList.add('active');
              }
              reinitCartDrawerEvents();
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
   */
  function reinitCartDrawerEvents() {
    if (typeof addCartDrawerListeners === 'function') {
      addCartDrawerListeners();
    } else {
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

    updateCartIconCount();
  }

  /**
   * Update cart icon count from current cart state
   */
  async function updateCartIconCount() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      const count = cart.item_count;

      if (typeof updateCartItemCounts === 'function') {
        updateCartItemCounts(count);
      } else {
        document.querySelectorAll('.cart.cart-icon--basket1 div, .cart.cart-icon--basket2 div, .cart.cart-icon--basket3 div, .cart-count, [data-cart-count]').forEach(el => {
          el.textContent = count;
        });
      }
    } catch (error) {
      console.error('[FreeGift] Error updating cart icon:', error);
    }
  }

  /**
   * Main function to check and manage gift
   */
  async function checkAndManageGift() {
    if (!CONFIG.enabled) return;

    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();

      if (cart.item_count === lastCartItemCount && lastCartItemCount !== -1) {
        return;
      }
      lastCartItemCount = cart.item_count;

      const qualifies = checkQualification(cart);
      const giftInCart = isGiftInCart(cart);

      if (qualifies && !giftInCart && CONFIG.mode === 'auto') {
        await addGift();
      } else if (!qualifies && giftInCart) {
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
    const existingToast = document.querySelector('.free-gift-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'free-gift-toast';
    toast.innerHTML = `
      <span class="free-gift-toast-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 12 20 22 4 22 4 12"></polyline>
          <rect x="2" y="7" width="20" height="5"></rect>
          <line x1="12" y1="22" x2="12" y2="7"></line>
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
        </svg>
      </span>
      <span class="free-gift-toast-text">${message}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
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

      const url = args[0];
      if (typeof url === 'string' &&
        (url.includes('/cart/add') ||
          url.includes('/cart/change') ||
          url.includes('/cart/update') ||
          url.includes('/cart/clear'))) {
        setTimeout(checkAndManageGift, 800);
      }

      return response;
    };
  }

  /**
   * Initialize event listeners
   */
  function init() {
    hookFetch();

    document.addEventListener('cart:updated', () => {
      setTimeout(checkAndManageGift, 500);
    });

    document.addEventListener('cart:refresh', () => {
      setTimeout(checkAndManageGift, 500);
    });

    document.addEventListener('submit', (e) => {
      if (e.target.matches('form[action="/cart/add"]')) {
        setTimeout(checkAndManageGift, 1500);
      }
    });

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.classList && mutation.target.classList.contains('cart-drawer')) {
          if (mutation.target.classList.contains('active') ||
            mutation.target.style.display !== 'none') {
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
      const addBtn = e.target.closest('.free-gift-add-btn');
      if (addBtn) {
        e.preventDefault();
        e.stopPropagation();

        addBtn.disabled = true;
        addBtn.textContent = 'Đang thêm...';

        try {
          await addGift();
        } catch (err) {
          console.error('[FreeGift] Error:', err);
        } finally {
          addBtn.disabled = false;
          addBtn.textContent = 'Thêm quà';
        }
      }
    }, true);

    setTimeout(checkAndManageGift, 1000);
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for external use
  window.FreeGift = {
    check: checkAndManageGift,
    addGift: addGift,
    config: CONFIG
  };

})();
