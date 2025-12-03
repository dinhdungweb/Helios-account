/**
 * Tier Cart Drawer
 * Update cart drawer to show correct tier discount with product-specific support
 */

(function() {
  'use strict';
  
  console.log('[TierCartDrawer] Script loaded');
  
  async function updateCartDrawer() {
    console.log('[TierCartDrawer] Updating cart drawer...');
    
    // Get customer tier info
    const customerTier = sessionStorage.getItem('helios_customer_tier');
    
    if (!customerTier) {
      console.log('[TierCartDrawer] No customer tier found');
      return;
    }
    
    console.log('[TierCartDrawer] Customer tier:', customerTier);
    
    // ALWAYS use draft order when customer has tier discount
    // This ensures accurate line item discounts and prevents discount code
    // from applying to items outside scope
    console.log('[TierCartDrawer] Customer has tier, will use draft order for accurate pricing');
    
    // Update checkout button to trigger draft order
    updateCheckoutButton(true); // Always true = always use draft order
  }
  

  
  function updateCheckoutButton(hasMixedDiscounts) {
    const checkoutButtons = document.querySelectorAll('.cart-drawer a[href*="/checkout"], .cart-drawer button[name="checkout"]');
    
    checkoutButtons.forEach(btn => {
      if (hasMixedDiscounts) {
        // Will use draft order - handled by tier-draft-order.js
        // DO NOT add discount code to URL
        console.log('[TierCartDrawer] Mixed discounts or items outside scope detected, will use draft order');
        
        // Remove discount from URL if it was added before
        if (btn.tagName === 'A' && btn.href.includes('discount=')) {
          const url = new URL(btn.href, window.location.origin);
          url.searchParams.delete('discount');
          btn.href = url.toString();
          console.log('[TierCartDrawer] Removed discount from checkout link');
        }
      } else {
        // Standard checkout with discount code
        const discountCode = sessionStorage.getItem('helios_tier_discount');
        if (discountCode && btn.tagName === 'A') {
          const url = new URL(btn.href, window.location.origin);
          url.searchParams.set('discount', discountCode);
          btn.href = url.toString();
          console.log('[TierCartDrawer] Updated checkout link:', btn.href);
        }
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
