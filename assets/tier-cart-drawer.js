/**
 * Tier Cart Drawer
 * Update cart drawer to show correct tier discount
 */

(function() {
  'use strict';
  
  console.log('[TierCartDrawer] Script loaded');
  
  function updateCartDrawer() {
    console.log('[TierCartDrawer] Updating cart drawer...');
    
    // Get current discount code from sessionStorage
    const discountCode = sessionStorage.getItem('helios_tier_discount');
    const discountSource = sessionStorage.getItem('helios_tier_discount_source');
    
    if (!discountCode) {
      console.log('[TierCartDrawer] No discount code found');
      return;
    }
    
    console.log('[TierCartDrawer] Discount code:', discountCode, 'Source:', discountSource);
    
    // Update checkout button to include discount
    const checkoutButtons = document.querySelectorAll('.cart-drawer a[href*="/checkout"], .cart-drawer button[name="checkout"]');
    checkoutButtons.forEach(btn => {
      if (btn.tagName === 'A') {
        const url = new URL(btn.href, window.location.origin);
        url.searchParams.set('discount', discountCode);
        btn.href = url.toString();
        console.log('[TierCartDrawer] Updated checkout link:', btn.href);
      }
    });
  }
  
  // Initialize with delay
  function init() {
    setTimeout(updateCartDrawer, 300);
  }
  
  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Watch for cart drawer opening
  const observer = new MutationObserver(function(mutations) {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          if (node.classList && (node.classList.contains('cart-drawer') || node.querySelector('.cart-drawer'))) {
            setTimeout(updateCartDrawer, 100);
            break;
          }
        }
      }
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Listen for cart updates
  document.addEventListener('cart:updated', updateCartDrawer);
  document.addEventListener('cart:refresh', updateCartDrawer);
  
})();
