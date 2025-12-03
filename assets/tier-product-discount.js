/**
 * Tier Product-Specific Discount Handler
 * Detect product tags and apply appropriate discount code
 */

(function() {
  'use strict';
  // Get customer tier from tier-auto-discount
  const defaultDiscountCode = sessionStorage.getItem('helios_tier_discount');
  const customerTier = sessionStorage.getItem('helios_customer_tier');
  
  if (!defaultDiscountCode || !customerTier) {
    return; // No tier discount
  }
  /**
   * Extract discount percent from product tags
   * Format: tier-{tier_name}-{percent}
   * Example: tier-gold-15, tier-platinum-20, tier-blackdiamond-25
   */
  function getProductSpecificDiscount(productTags, tierName) {
    if (!productTags || !Array.isArray(productTags)) {
      return null;
    }
    
    // Normalize tier name (remove spaces, underscores, lowercase)
    const tierNameNormalized = tierName.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
    const tagPrefix = `tier-${tierNameNormalized}-`;
    for (const tag of productTags) {
      const tagLower = tag.toLowerCase().trim();
      if (tagLower.startsWith(tagPrefix)) {
        const parts = tagLower.split('-');
        if (parts.length === 3) {
          const percent = parseInt(parts[2], 10);
          if (percent > 0 && percent <= 100) {
            // Format: TIERNAME + PERCENT (e.g., DIAMOND25, GOLD15)
            const discountCode = `${tierName.toUpperCase().replace(/\s+/g, '')}${percent}`;
            return {
              percent: percent,
              code: discountCode
            };
          }
        }
      }
    }
    return null;
  }
  
  /**
   * Update discount code for current product
   */
  function updateProductDiscount() {
    // Try to get product data from page
    let productTags = [];
    
    // Method 1: From tier-pricing-wrapper data attribute
    // Strategy: Find wrapper with product tags, prioritize main product area
    
    const allWrappers = document.querySelectorAll('.tier-pricing-wrapper');
    // Separate wrappers by location
    const mainWrappers = [];
    const otherWrappers = [];
    
    allWrappers.forEach((wrapper, i) => {
      const inCart = wrapper.closest('.cart-drawer, [data-recommend], .recommend-products, .cart-recommendations');
      const hasTags = wrapper.dataset.productTags && wrapper.dataset.productTags.trim();
      if (hasTags) {
        if (inCart) {
          otherWrappers.push(wrapper);
        } else {
          mainWrappers.push(wrapper);
        }
      }
    });
    // Priority: main area first, then others
    const wrapperToUse = mainWrappers[0] || otherWrappers[0];
    
    if (wrapperToUse && wrapperToUse.dataset.productTags) {
      productTags = wrapperToUse.dataset.productTags.split(',').map(t => t.trim()).filter(t => t);
    } else {
    }
    
    // Method 2: From product JSON
    if (productTags.length === 0) {
      const productJsonEl = document.querySelector('[data-product-json]');
      if (productJsonEl) {
        try {
          const productData = JSON.parse(productJsonEl.textContent);
          productTags = productData.tags || [];
        } catch (e) {
        }
      }
    }
    
    // Method 3: From meta tags
    if (productTags.length === 0) {
      const metaTags = document.querySelector('meta[property="product:tag"]');
      if (metaTags) {
        productTags = metaTags.content.split(',').map(t => t.trim()).filter(t => t);
      }
    }
    
    // Method 4: From window.product (if theme exposes it)
    if (productTags.length === 0 && typeof window.product !== 'undefined') {
      productTags = window.product.tags || [];
    }
    // Check for product-specific discount
    const productDiscount = getProductSpecificDiscount(productTags, customerTier);
    
    if (productDiscount) {
      // Use product-specific discount code
      sessionStorage.setItem('helios_tier_discount', productDiscount.code);
      sessionStorage.setItem('helios_tier_discount_percent', productDiscount.percent);
      sessionStorage.setItem('helios_tier_discount_source', 'product_tag');
    } else {
      // Reset to default tier discount code
      sessionStorage.setItem('helios_tier_discount', defaultDiscountCode);
      sessionStorage.setItem('helios_tier_discount_source', 'default');
      // Remove product-specific percent
      sessionStorage.removeItem('helios_tier_discount_percent');
    }
  }
  
  // Initialize on page load with delay to ensure tier-pricing-wrapper is rendered
  function init() {
    // Wait longer for all tier-price snippets to render
    setTimeout(updateProductDiscount, 500);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Also run after window load (everything is ready)
  window.addEventListener('load', function() {
    setTimeout(updateProductDiscount, 200);
  });
  
  // Re-check on variant change
  document.addEventListener('variant:change', function() {
    setTimeout(updateProductDiscount, 100);
  });
  
  // Watch for tier-pricing-wrapper being added (for quick view, AJAX, etc.)
  const observer = new MutationObserver(function(mutations) {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          if (node.classList && node.classList.contains('tier-pricing-wrapper')) {
            setTimeout(updateProductDiscount, 50);
            break;
          } else if (node.querySelector && node.querySelector('.tier-pricing-wrapper')) {
            setTimeout(updateProductDiscount, 50);
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
  
})();
