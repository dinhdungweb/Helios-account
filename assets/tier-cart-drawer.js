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
    
    // Get cart data
    const cartResponse = await fetch('/cart.js');
    const cart = await cartResponse.json();
    
    console.log('[TierCartDrawer] Cart items:', cart.items.length);
    
    // Calculate discount for each item
    let totalDiscount = 0;
    let hasMixedDiscounts = false;
    let firstItemDiscount = null;
    
    for (const item of cart.items) {
      const itemDiscount = await getItemTierDiscount(item, customerTier);
      const itemDiscountAmount = item.final_line_price * (itemDiscount / 100);
      totalDiscount += itemDiscountAmount;
      
      console.log('[TierCartDrawer] Item:', item.product_title, 'Discount:', itemDiscount + '%', 'Amount:', itemDiscountAmount);
      
      // Check for mixed discounts
      if (firstItemDiscount === null) {
        firstItemDiscount = itemDiscount;
      } else if (firstItemDiscount !== itemDiscount) {
        hasMixedDiscounts = true;
      }
    }
    
    console.log('[TierCartDrawer] Total discount:', totalDiscount, 'Has mixed:', hasMixedDiscounts);
    
    // Update discount display in cart footer
    updateDiscountDisplay(customerTier, totalDiscount);
    
    // Update checkout button
    updateCheckoutButton(hasMixedDiscounts);
  }
  
  async function getItemTierDiscount(item, customerTier) {
    // Get default tier discount from settings (from tier-price wrapper)
    const tierWrapper = document.querySelector('.tier-pricing-wrapper');
    const defaultDiscount = tierWrapper ? parseFloat(tierWrapper.dataset.tierDiscount || 0) : 0;
    
    // Check for product-specific discount from tags
    const tierNameNormalized = customerTier.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
    const tagPrefix = `tier-${tierNameNormalized}-`;
    
    // Try to get product tags
    let productTags = [];
    try {
      const productResponse = await fetch(`/products/${item.handle}.js`);
      const productData = await productResponse.json();
      productTags = productData.tags || [];
    } catch (error) {
      console.warn('[TierCartDrawer] Could not fetch product tags:', error);
      productTags = item.product_tags || [];
    }
    
    // Check for product-specific tag
    for (const tag of productTags) {
      const tagLower = tag.toLowerCase().trim();
      if (tagLower.startsWith(tagPrefix)) {
        const parts = tagLower.split('-');
        if (parts.length === 3) {
          const percent = parseInt(parts[2], 10);
          if (percent > 0 && percent <= 100) {
            console.log('[TierCartDrawer] Product-specific discount:', item.product_title, percent + '%');
            return percent;
          }
        }
      }
    }
    
    // Return default discount
    return defaultDiscount;
  }
  
  function updateDiscountDisplay(customerTier, totalDiscount) {
    // Find discount row in cart footer
    const discountRow = document.querySelector('.cart-drawer-footer-row:has(h3)');
    if (!discountRow) return;
    
    // Find the discount amount span
    const discountSpan = discountRow.querySelector('span');
    if (discountSpan) {
      // Format discount amount
      const formattedDiscount = formatMoney(totalDiscount);
      discountSpan.textContent = `- ${formattedDiscount}`;
      console.log('[TierCartDrawer] Updated discount display:', formattedDiscount);
    }
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
  
  function formatMoney(cents) {
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
      return Shopify.formatMoney(cents, theme.money_format || '{{amount}} VND');
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(cents / 100);
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
