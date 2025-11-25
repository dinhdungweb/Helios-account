/**
 * Tier Pricing - Final Solution
 * Intercept jQuery .html() to prevent theme from overriding tier pricing
 */

(function() {
  'use strict';
  
  let tierInfo = null;
  let isReady = false;
  
  // Extract tier info from initial render
  function extractTierInfo() {
    const wrapper = document.querySelector('.tier-pricing-wrapper');
    if (wrapper && !tierInfo) {
      tierInfo = {
        tier: wrapper.dataset.customerTier || '',
        discount: parseFloat(wrapper.dataset.tierDiscount || 0) / 100,
        hasCustomer: wrapper.dataset.hasCustomer === 'true'
      };
      return true;
    }
    return false;
  }
  
  // Build tier pricing HTML
  function buildTierHTML(variant) {
    if (!tierInfo) return null;
    
    const tierPrice = Math.round(variant.price * (1 - tierInfo.discount));
    const formatMoney = (cents) => {
      if (typeof theme !== 'undefined' && theme.Shopify && theme.Shopify.formatMoney) {
        return theme.Shopify.formatMoney(cents, theme.money_format_with_code_preference || theme.money_format);
      }
      return new Intl.NumberFormat('vi-VN').format(cents / 100) + ' VND';
    };
    
    const tierSlug = tierInfo.tier.toLowerCase().replace(/\s+/g, '-');
    let html = '<div class="tier-pricing-wrapper tier-pricing-injected" data-tier="' + tierInfo.tier + '">';
    
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
      html += '<svg class="tier-badge-icon" width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/></svg>';
      html += ' -' + Math.round(tierInfo.discount * 100) + '% ' + tierInfo.tier;
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
              const tierHTML = buildTierHTML(variant);
              if (tierHTML) {
                return originalHtml.call(this, tierHTML);
              }
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
    
    // Retry if not ready
    if (!isReady) {
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
  
  // Listen for quickbuy modal open
  if (typeof $ !== 'undefined') {
    $(document).on('modalOpen', '#quick-buy-modal', function() {
      reinitForModal();
    });
    
    // Also listen for DOM changes in modal
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1 && (node.matches('.product-area') || node.querySelector('.product-area'))) {
              reinitForModal();
            }
          });
        }
      });
    });
    
    // Observe modal container
    const modalContainer = document.querySelector('#quick-buy-modal');
    if (modalContainer) {
      observer.observe(modalContainer, {
        childList: true,
        subtree: true
      });
    }
  }
  
  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
