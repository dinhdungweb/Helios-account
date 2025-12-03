/**
 * Tier Cart Drawer
 * Update cart drawer to show correct tier discount with product-specific support
 */

(function() {
  'use strict';
  
  console.log('[TierCartDrawer] Script loaded');
  
  async function updateCartDrawer() {
    console.log('[TierCartDrawer] Updating cart drawer...');
    
    // Liquid template already calculated discount correctly
    // We just need to update checkout button behavior
    
    // Get customer tier info
    const customerTier = sessionStorage.getItem('helios_customer_tier');
    
    if (!customerTier) {
      console.log('[TierCartDrawer] No customer tier found');
      return;
    }
    
    console.log('[TierCartDrawer] Customer tier:', customerTier);
    
    // Check if cart has mixed discounts by checking tier-pricing-wrapper in cart items
    const hasMixedDiscounts = await checkForMixedDiscounts();
    
    console.log('[TierCartDrawer] Has mixed discounts:', hasMixedDiscounts);
    
    // Update checkout button
    updateCheckoutButton(hasMixedDiscounts);
  }
  
  async function checkForMixedDiscounts() {
    // Check all cart item wrappers for different discount percentages
    const itemWrappers = document.querySelectorAll('.cart-drawer-item .tier-pricing-wrapper');
    
    if (itemWrappers.length === 0) return false;
    
    let firstDiscount = null;
    
    for (const wrapper of itemWrappers) {
      const discount = parseFloat(wrapper.dataset.tierDiscount || 0);
      
      if (firstDiscount === null) {
        firstDiscount = discount;
      } else if (firstDiscount !== discount) {
        console.log('[TierCartDrawer] Mixed discounts detected:', firstDiscount, 'vs', discount);
        return true;
      }
    }
    
    return false;
  }
  

  
  function updateCheckoutButton(hasMixedDiscounts) {
    const checkoutButtons = document.querySelectorAll('.cart-drawer a[href*="/checkout"], .cart-drawer button[name="checkout"]');
    
    checkoutButtons.forEach(btn => {
      if (hasMixedDiscounts) {
        // Will use draft order - handled by tier-draft-order.js
        console.log('[TierCartDrawer] Mixed discounts detected, will use draft order');
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
