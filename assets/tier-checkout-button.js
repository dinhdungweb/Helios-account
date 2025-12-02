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
    console.log('[TierCheckoutButton] Setting up click interceptor...');
    
    // Method 1: Intercept ALL clicks and check if it's a checkout action
    document.addEventListener('click', function(e) {
      console.log('[TierCheckoutButton] Click detected on:', e.target);
      
      // Check various checkout button types
      const target = e.target.closest(
        'button[name="checkout"], ' +
        'input[name="checkout"], ' +
        'a[href*="/checkout"], ' +
        '.shopify-payment-button__button, ' +
        '[data-shopify-buttoncontainer] button, ' +
        'button[type="submit"][form*="product"]'
      );
      
      if (target) {
        console.log('[TierCheckoutButton] Checkout button detected:', target);
        
        // Check if it's a form submission
        const form = target.closest('form');
        if (form && form.action && form.action.includes('/cart/add')) {
          console.log('[TierCheckoutButton] Add to cart form, will intercept after add');
          // Let it add to cart first, then intercept
          return;
        }
        
        // If it's a direct checkout link/button
        if (target.href && target.href.includes('/checkout')) {
          e.preventDefault();
          e.stopPropagation();
          
          console.log('[TierCheckoutButton] Intercepting checkout link, redirecting with discount:', discountCode);
          window.location.href = `/checkout?discount=${encodeURIComponent(discountCode)}`;
          return;
        }
        
        // If it's a checkout button (not link)
        if (target.name === 'checkout' || target.classList.contains('shopify-payment-button__button')) {
          e.preventDefault();
          e.stopPropagation();
          
          console.log('[TierCheckoutButton] Intercepting checkout button, redirecting with discount:', discountCode);
          window.location.href = `/checkout?discount=${encodeURIComponent(discountCode)}`;
          return;
        }
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
    
    // Method 3: Intercept Shopify dynamic checkout
    // Override Shopify.PaymentButton if it exists
    if (window.Shopify && window.Shopify.PaymentButton) {
      console.log('[TierCheckoutButton] Intercepting Shopify.PaymentButton');
      const originalInit = window.Shopify.PaymentButton.init;
      window.Shopify.PaymentButton.init = function() {
        console.log('[TierCheckoutButton] PaymentButton.init called');
        const result = originalInit.apply(this, arguments);
        
        // Modify all payment buttons after init
        setTimeout(() => {
          document.querySelectorAll('.shopify-payment-button__button').forEach(btn => {
            btn.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              console.log('[TierCheckoutButton] Payment button clicked, redirecting with discount');
              window.location.href = `/checkout?discount=${encodeURIComponent(discountCode)}`;
            }, true);
          });
        }, 100);
        
        return result;
      };
    }
  }
  
  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', interceptCheckout);
  } else {
    interceptCheckout();
  }
  
})();
