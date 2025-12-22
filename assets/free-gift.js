/**
 * Free Gift Handler
 * Automatically manages free gift in cart based on qualification conditions
 * Compatible with Tier Discount system
 */
(function() {
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

  /**
   * Check if cart qualifies for free gift
   */
  function checkQualification(cart) {
    if (!CONFIG.enabled || !CONFIG.giftVariantId) return false;

    // Filter out gift items when calculating
    const nonGiftItems = cart.items.filter(item => 
      item.product_id != CONFIG.giftProductId
    );

    if (nonGiftItems.length === 0) return false;

    switch (CONFIG.trigger) {
      case 'any':
        return nonGiftItems.length > 0;

      case 'collection':
        // Check if any item is from trigger collection
        // Note: cart.items doesn't have collection info directly
        // We rely on product tags containing collection handle
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
      item.properties?._is_free_gift === 'true'
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
        triggerCartRefresh();
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
        item.properties?._is_free_gift === 'true'
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
        triggerCartRefresh();
      }
    } catch (error) {
      console.error('[FreeGift] Error removing gift:', error);
    } finally {
      isProcessing = false;
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
   * Trigger cart refresh event
   */
  function triggerCartRefresh() {
    document.dispatchEvent(new CustomEvent('cart:refresh'));
    document.dispatchEvent(new CustomEvent('cart:updated'));
  }

  /**
   * Initialize event listeners
   */
  function init() {
    // Listen for cart updates
    document.addEventListener('cart:updated', () => {
      setTimeout(checkAndManageGift, 500);
    });

    document.addEventListener('cart:refresh', () => {
      setTimeout(checkAndManageGift, 500);
    });

    // Listen for add to cart forms
    document.addEventListener('submit', (e) => {
      if (e.target.matches('form[action="/cart/add"]')) {
        setTimeout(checkAndManageGift, 1000);
      }
    });

    // Initial check
    checkAndManageGift();
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
