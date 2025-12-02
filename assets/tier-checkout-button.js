/**
 * Tier Pricing Checkout Button
 * Intercept add to cart and redirect to checkout with tier discount
 */

(function() {
  'use strict';
  
  console.log('[TierCheckoutButton] Script loaded');
  
  // Intercept all checkout/cart actions
  function interceptCheckout() {
    const discountCode = sessionStorage.getItem('helios_tier_discount');
    
    if (!discountCode) {
      console.log('[TierCheckoutButton] No discount code in sessionStorage');
      return;
    }
    
    console.log('[TierCheckoutButton] Active discount code:', discountCode);
    
    // Method 1: Intercept checkout button clicks
    document.addEventListener('click', function(e) {
      const target = e.target.closest('button[name="checkout"], a[href*="/checkout"]');
      
      if (target) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('[TierCheckoutButton] Checkout button clicked, redirecting with discount:', discountCode);
        window.location.href = `/checkout?discount=${encodeURIComponent(discountCode)}`;
      }
    }, true);
    
    // Method 2: Modify all checkout links
    function updateCheckoutLinks() {
      const checkoutLinks = document.querySelectorAll('a[href*="/checkout"]');
      checkoutLinks.forEach(link => {
        if (!link.dataset.tierModified) {
          const url = new URL(link.href, window.location.origin);
          url.searchParams.set('discount', discountCode);
          link.href = url.toString();
          link.dataset.tierModified = 'true';
          console.log('[TierCheckoutButton] Modified checkout link:', link.href);
        }
      });
    }
    
    updateCheckoutLinks();
    
    // Watch for new links
    const observer = new MutationObserver(updateCheckoutLinks);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', interceptCheckout);
  } else {
    interceptCheckout();
  }
  
})();
