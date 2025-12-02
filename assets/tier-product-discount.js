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
   * Example: tier-gold-15, tier-platinum-20
   */
  function getProductSpecificDiscount(productTags, tierName) {
    if (!productTags || !Array.isArray(productTags)) {
      return null;
    }
    
    const tierNameLower = tierName.toLowerCase();
    const tagPrefix = `tier-${tierNameLower}-`;
    
    for (const tag of productTags) {
      const tagLower = tag.toLowerCase();
      if (tagLower.startsWith(tagPrefix)) {
        const parts = tagLower.split('-');
        if (parts.length === 3) {
          const percent = parseInt(parts[2], 10);
          if (percent > 0 && percent <= 100) {
            return {
              percent: percent,
              code: `AUTO_${tierName.toUpperCase()}_${percent}`
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
    
    // Method 1: From product JSON (most reliable)
    const productJsonEl = document.querySelector('[data-product-json]');
    if (productJsonEl) {
      try {
        const productData = JSON.parse(productJsonEl.textContent);
        productTags = productData.tags || [];
      } catch (e) {
        console.error('Error parsing product JSON:', e);
      }
    }
    
    // Method 2: From meta tags
    if (productTags.length === 0) {
      const metaTags = document.querySelector('meta[property="product:tag"]');
      if (metaTags) {
        productTags = metaTags.content.split(',').map(t => t.trim());
      }
    }
    
    // Check for product-specific discount
    const productDiscount = getProductSpecificDiscount(productTags, customerTier);
    
    if (productDiscount) {
      // Use product-specific discount code
      sessionStorage.setItem('helios_tier_discount', productDiscount.code);
      sessionStorage.setItem('helios_tier_discount_percent', productDiscount.percent);
      sessionStorage.setItem('helios_tier_discount_source', 'product_tag');
    } else {
      // Use default tier discount code
      sessionStorage.setItem('helios_tier_discount', defaultDiscountCode);
      sessionStorage.setItem('helios_tier_discount_source', 'default');
    }
  }
  
  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateProductDiscount);
  } else {
    updateProductDiscount();
  }
  
  // Re-check on variant change
  document.addEventListener('variant:change', updateProductDiscount);
  
})();
