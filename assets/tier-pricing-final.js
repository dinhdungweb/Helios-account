/**
 * Tier Pricing - Final Solution
 * Intercept jQuery .html() to prevent theme from overriding tier pricing
 */

(function() {
  'use strict';
  
  let tierInfo = null;
  let isReady = false;
  
  // Extract tier info from initial render (MAIN PRODUCT only, not product blocks)
  function extractTierInfo() {
    // Find wrapper in MAIN PRODUCT area only (not product blocks/recommendations)
    let wrapper = null;
    const allWrappers = document.querySelectorAll('.tier-pricing-wrapper');
    
    for (const w of allWrappers) {
      // Skip wrappers from product blocks, recommendations, cart
      if (w.closest('.product-block, [data-cc-product-block], .recommend-products, .cart-drawer, .cart-items')) {
        continue;
      }
      // Check if wrapper is in main product area
      const isInProductArea = w.closest('.product-area, .product-single, main.main-content, .product-template');
      if (isInProductArea) {
        wrapper = w;
        break;
      }
    }
    
    if (wrapper && !tierInfo) {
      tierInfo = {
        tier: wrapper.dataset.customerTier || '',
        discount: parseFloat(wrapper.dataset.tierDiscount || 0) / 100,
        hasCustomer: wrapper.dataset.hasCustomer === 'true',
        scope: wrapper.dataset.tierScope || 'all',
        allowedTags: wrapper.dataset.tierAllowedTags || '',
        allowedCollections: wrapper.dataset.tierAllowedCollections || '',
        // Store ALL data attributes for later use
        allDataAttributes: Object.assign({}, wrapper.dataset)
      };
      return true;
    }
    return false;
  }
  
  // Check if tier pricing applies to current product
  function checkTierApplies(product) {
    if (!tierInfo) return false;
    
    const scope = tierInfo.scope;
    
    // All products
    if (scope === 'all') return true;
    
    // Tagged products
    if (scope === 'tagged') {
      if (!tierInfo.allowedTags) {
        return false;
      }
      const allowedTags = tierInfo.allowedTags.split(',').map(t => t.trim().toLowerCase());
      const productTags = (product.tags || []).map(t => t.toLowerCase());
      return allowedTags.some(tag => productTags.includes(tag));
    }
    
    // Collections
    if (scope === 'collections') {
      if (!tierInfo.allowedCollections) return false;
      const allowedCollections = tierInfo.allowedCollections.split(',').map(c => c.trim().toLowerCase());
      // Note: Product JSON doesn't always include collections, so we default to true
      // The Liquid template will handle the actual filtering
      return true;
    }
    
    // Exclude tagged
    if (scope === 'exclude_tagged') {
      if (!tierInfo.allowedTags) return true;
      const excludedTags = tierInfo.allowedTags.split(',').map(t => t.trim().toLowerCase());
      const productTags = (product.tags || []).map(t => t.toLowerCase());
      return !excludedTags.some(tag => productTags.includes(tag));
    }
    
    return false;
  }
  
  // Build tier pricing HTML
  function buildTierHTML(variant, product) {
    if (!tierInfo) return null;
    
    // Check if tier pricing applies to this product
    if (!checkTierApplies(product)) {
      // Don't replace HTML - keep original price from Liquid template
      return null;
    }
    
    const tierPrice = Math.round(variant.price * (1 - tierInfo.discount));
    const formatMoney = (cents) => {
      if (typeof theme !== 'undefined' && theme.Shopify && theme.Shopify.formatMoney) {
        return theme.Shopify.formatMoney(cents, theme.money_format_with_code_preference || theme.money_format);
      }
      return new Intl.NumberFormat('vi-VN').format(cents / 100) + ' VND';
    };
    
    const tierSlug = tierInfo.tier.toLowerCase().replace(/\s+/g, '-');
    
    // Build data attributes string from stored attributes
    let dataAttrs = 'data-tier="' + tierInfo.tier + '"';
    if (tierInfo.allDataAttributes) {
      for (const key in tierInfo.allDataAttributes) {
        if (key !== 'tier') { // Skip tier as we already added it
          const value = tierInfo.allDataAttributes[key];
          dataAttrs += ' data-' + key.replace(/([A-Z])/g, '-$1').toLowerCase() + '="' + (value || '').replace(/"/g, '&quot;') + '"';
        }
      }
    }
    
    let html = '<div class="tier-pricing-wrapper tier-pricing-injected" ' + dataAttrs + '>';
    
    html += '<div class="tier-pricing-prices">';
    
    // Tier price (hiển thị đầu tiên)
    const priceClass = tierInfo.discount > 0 ? 'tier-price-final tier-price-discounted' : 'tier-price-final';
    html += '<span class="' + priceClass + '"><span class="theme-money">' + formatMoney(tierPrice) + '</span></span>';
    
    // Original price
    if (tierInfo.discount > 0) {
      html += '<span class="tier-price-original"><span class="theme-money">' + formatMoney(variant.price) + '</span></span>';
    }
    
    // Compare at price
    if (variant.compare_at_price && variant.compare_at_price > variant.price) {
      html += '<span class="tier-price-compare"><span class="theme-money">' + formatMoney(variant.compare_at_price) + '</span></span>';
    }
    
    html += '</div>';
    
    // Badge (sau giá)
    if (tierInfo.discount > 0 && tierInfo.tier) {
      html += '<span class="tier-badge tier-badge--' + tierSlug + '">';
      html += '<svg class="tier-badge-icon" width="12" height="12" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21.89 2.119a2.084 2.084 0 0 0-1.486-.619h-5.762c-.378 0-.74.15-1.009.417L2.113 13.434a2.101 2.101 0 0 0 0 2.968l5.485 5.484a2.101 2.101 0 0 0 2.97 0l11.514-11.512c.267-.268.417-.63.418-1.008V3.6a2.074 2.074 0 0 0-.61-1.481ZM18 7.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" fill="currentColor"></path></svg>';
      html += ' - ' + Math.round(tierInfo.discount * 100) + '% ' + tierInfo.tier;
      html += '</span>';
    }
    
    html += '</div>';
    
    return html;
  }
  
  // Override jQuery .html() for .price-area
  function installInterceptor() {
    if (typeof jQuery === 'undefined' || typeof $ === 'undefined') {
      return false;
    }
    
    if (!tierInfo) {
      return false;
    }
    
    // Store original html method
    const originalHtml = $.fn.html;
    
    // Override html method
    $.fn.html = function(value) {
      // If this is .price-area and we're setting HTML (not getting)
      if (value !== undefined && this.hasClass('price-area')) {
        // Get current variant
        const variantInput = document.querySelector('.product-area [name="id"]');
        const productJson = document.querySelector('[id^="cc-product-json-"]');
        
        if (variantInput && productJson) {
          try {
            const product = JSON.parse(productJson.textContent);
            const variant = product.variants.find(v => v.id == variantInput.value);
            
            if (variant) {
              const tierHTML = buildTierHTML(variant, product);
              if (tierHTML) {
                // Tier pricing applies, replace with tier HTML
                return originalHtml.call(this, tierHTML);
              }
              // Tier pricing doesn't apply, use original HTML update
              // Fall through to call original method below
            }
          } catch (e) {
            // Fallback to original
          }
        }
      }
      
      // Call original method
      return originalHtml.apply(this, arguments);
    };
    
    return true;
  }
  
  // Initialize
  function init() {
    // Check if we're on a page that needs tier pricing
    const tierWrapper = document.querySelector('.tier-pricing-wrapper');
    if (!tierWrapper) {
      // No tier pricing on this page, skip initialization
      return;
    }
    
    // Check if tier pricing actually applies (has discount > 0 or has customer)
    const tierDiscount = parseFloat(tierWrapper.dataset.tierDiscount || 0);
    const hasCustomer = tierWrapper.dataset.hasCustomer === 'true';
    
    if (!hasCustomer || tierDiscount === 0) {
      // No customer or no discount, don't intercept
      return;
    }
    
    // Try to extract tier info
    if (extractTierInfo()) {
      // Try to install interceptor
      if (installInterceptor()) {
        isReady = true;
        
        // Trigger a variant change to apply tier pricing
        setTimeout(() => {
          if (typeof $ !== 'undefined') {
            const $variantInput = $('.product-area [name="id"]').first();
            if ($variantInput.length) {
              $variantInput.trigger('change.themeProductOptions');
            }
          }
        }, 200);
      }
    }
    
    // Retry if not ready (but only if tier pricing exists and applies)
    if (!isReady && tierWrapper && hasCustomer && tierDiscount > 0) {
      setTimeout(init, 100);
    }
  }
  
  // Re-initialize for dynamically loaded content (quickbuy modal)
  function reinitForModal() {
    // Reset state
    tierInfo = null;
    isReady = false;
    
    // Re-run init
    setTimeout(init, 100);
  }
  
  // Listen for quickbuy modal - observe body for modal creation
  if (typeof $ !== 'undefined') {
    // Listen for quickbuy button clicks
    $(document).on('click', '[data-cc-quick-buy]', function() {
      // Wait for modal to be created and content loaded
      setTimeout(() => {
        const $modal = $('#quick-buy-modal');
        if ($modal.length && $modal.find('.product-area').length) {
          reinitForModal();
        }
      }, 500);
    });
    
    // Also observe body for modal creation
    const bodyObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              // Check if this is the quickbuy modal
              if (node.id === 'quick-buy-modal' || node.querySelector('#quick-buy-modal')) {
                setTimeout(() => {
                  const $modal = $('#quick-buy-modal');
                  if ($modal.find('.product-area').length) {
                    reinitForModal();
                  }
                }, 300);
              }
              // Check if product-area was added inside modal
              else if (node.closest('#quick-buy-modal') && (node.matches('.product-area') || node.querySelector('.product-area'))) {
                reinitForModal();
              }
            }
          });
        }
      });
    });
    
    // Observe body for modal creation
    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
