/**
 * Tier Product-Specific Discount Handler
 * Detect product tags and apply appropriate discount code
 */

(function() {
  'use strict';
  
  console.log('[TierProductDiscount] Script loaded');
  
  // Get customer tier from tier-auto-discount
  const defaultDiscountCode = sessionStorage.getItem('helios_tier_discount');
  const customerTier = sessionStorage.getItem('helios_customer_tier');
  
  console.log('[TierProductDiscount] Initial check:', {
    defaultDiscountCode,
    customerTier,
    hasDiscount: !!defaultDiscountCode,
    hasTier: !!customerTier,
    allSessionStorage: Object.keys(sessionStorage).reduce((acc, key) => {
      if (key.startsWith('helios_')) acc[key] = sessionStorage.getItem(key);
      return acc;
    }, {})
  });
  
  if (!defaultDiscountCode || !customerTier) {
    console.log('[TierProductDiscount] ⚠️ No tier discount or customer tier found, exiting');
    console.log('[TierProductDiscount] Customer needs to be logged in with a tier to use product-specific discounts');
    return; // No tier discount
  }
  
  console.log('[TierProductDiscount] ✓ Customer has tier, proceeding with product discount check');
  
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
    
    console.log('[TierProductDiscount] Searching for product-specific discount:', {
      tierName,
      tierNameNormalized,
      tagPrefix,
      productTags
    });
    
    for (const tag of productTags) {
      const tagLower = tag.toLowerCase().trim();
      if (tagLower.startsWith(tagPrefix)) {
        const parts = tagLower.split('-');
        if (parts.length === 3) {
          const percent = parseInt(parts[2], 10);
          if (percent > 0 && percent <= 100) {
            // Format: TIERNAME + PERCENT (e.g., DIAMOND25, GOLD15)
            const discountCode = `${tierName.toUpperCase().replace(/\s+/g, '')}${percent}`;
            console.log('[TierProductDiscount] Found product-specific discount:', {
              tag,
              percent,
              discountCode
            });
            return {
              percent: percent,
              code: discountCode
            };
          }
        }
      }
    }
    
    console.log('[TierProductDiscount] No product-specific discount found');
    return null;
  }
  
  /**
   * Update discount code for current product
   */
  function updateProductDiscount() {
    console.log('[TierProductDiscount] Starting updateProductDiscount');
    console.log('[TierProductDiscount] Default discount code:', defaultDiscountCode);
    console.log('[TierProductDiscount] Customer tier:', customerTier);
    
    // Try to get product data from page
    let productTags = [];
    
    // Method 1: From tier-pricing-wrapper data attribute
    // Strategy: Find wrapper with product tags, prioritize main product area
    
    const allWrappers = document.querySelectorAll('.tier-pricing-wrapper');
    console.log('[TierProductDiscount] Found total wrappers:', allWrappers.length);
    
    // Separate wrappers by location
    const mainWrappers = [];
    const otherWrappers = [];
    
    allWrappers.forEach((wrapper, i) => {
      const inCart = wrapper.closest('.cart-drawer, [data-recommend], .recommend-products, .cart-recommendations');
      const hasTags = wrapper.dataset.productTags && wrapper.dataset.productTags.trim();
      
      console.log(`[TierProductDiscount] Wrapper ${i}:`, {
        hasTags: !!hasTags,
        tags: wrapper.dataset.productTags,
        productId: wrapper.dataset.productId,
        inCart: !!inCart,
        location: inCart ? 'cart/recommend' : 'main'
      });
      
      if (hasTags) {
        if (inCart) {
          otherWrappers.push(wrapper);
        } else {
          mainWrappers.push(wrapper);
        }
      }
    });
    
    console.log('[TierProductDiscount] Wrappers with tags:', {
      inMain: mainWrappers.length,
      inOther: otherWrappers.length
    });
    
    // Priority: main area first, then others
    const wrapperToUse = mainWrappers[0] || otherWrappers[0];
    
    if (wrapperToUse && wrapperToUse.dataset.productTags) {
      productTags = wrapperToUse.dataset.productTags.split(',').map(t => t.trim()).filter(t => t);
      console.log('[TierProductDiscount] ✓ Using wrapper with tags:', {
        location: mainWrappers[0] ? 'main' : 'cart/recommend',
        tags: productTags
      });
    } else {
      console.log('[TierProductDiscount] ✗ No wrapper with tags found');
    }
    
    // Method 2: From product JSON
    if (productTags.length === 0) {
      const productJsonEl = document.querySelector('[data-product-json]');
      if (productJsonEl) {
        try {
          const productData = JSON.parse(productJsonEl.textContent);
          productTags = productData.tags || [];
          console.log('[TierProductDiscount] Tags from product JSON:', productTags);
        } catch (e) {
          console.log('[TierProductDiscount] Error parsing product JSON:', e);
        }
      }
    }
    
    // Method 3: From meta tags
    if (productTags.length === 0) {
      const metaTags = document.querySelector('meta[property="product:tag"]');
      if (metaTags) {
        productTags = metaTags.content.split(',').map(t => t.trim()).filter(t => t);
        console.log('[TierProductDiscount] Tags from meta:', productTags);
      }
    }
    
    // Method 4: From window.product (if theme exposes it)
    if (productTags.length === 0 && typeof window.product !== 'undefined') {
      productTags = window.product.tags || [];
      console.log('[TierProductDiscount] Tags from window.product:', productTags);
    }
    
    console.log('[TierProductDiscount] Final product tags:', productTags);
    
    // Check for product-specific discount
    const productDiscount = getProductSpecificDiscount(productTags, customerTier);
    
    if (productDiscount) {
      // Use product-specific discount code
      console.log('[TierProductDiscount] ✓ Applying product-specific discount:', productDiscount.code);
      sessionStorage.setItem('helios_tier_discount', productDiscount.code);
      sessionStorage.setItem('helios_tier_discount_percent', productDiscount.percent);
      sessionStorage.setItem('helios_tier_discount_source', 'product_tag');
    } else {
      // Reset to default tier discount code
      console.log('[TierProductDiscount] No product-specific discount, resetting to default:', defaultDiscountCode);
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
