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
    const tierScope = tierWrapper ? tierWrapper.dataset.tierScope : 'all';
    
    console.log('[TierCartDrawer] Checking discount for:', item.product_title, 'Scope:', tierScope);
    
    // Try to get product data
    let productData = null;
    try {
      const productResponse = await fetch(`/products/${item.handle}.js`);
      productData = await productResponse.json();
    } catch (error) {
      console.warn('[TierCartDrawer] Could not fetch product data:', error);
    }
    
    const productTags = productData ? productData.tags : (item.product_tags || []);
    
    // Check for product-specific discount from tags (PRIORITY 1)
    const tierNameNormalized = customerTier.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
    const tagPrefix = `tier-${tierNameNormalized}-`;
    
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
    
    // Check if product qualifies for default tier discount based on scope (PRIORITY 2)
    let itemApplies = false;
    
    switch (tierScope) {
      case 'all':
        itemApplies = true;
        break;
        
      case 'tagged':
        // Check if product has allowed tags
        const allowedTags = tierWrapper.dataset.tierAllowedTags?.split(',').map(t => t.trim().toLowerCase()) || [];
        itemApplies = productTags.some(tag => allowedTags.includes(tag.toLowerCase()));
        break;
        
      case 'collections':
        // Check if product is in allowed collections
        const allowedCollections = tierWrapper.dataset.tierAllowedCollections?.split(',').map(c => c.trim().toLowerCase()) || [];
        // Note: cart item doesn't have collections data, so we check product data
        if (productData && productData.collections) {
          itemApplies = productData.collections.some(col => allowedCollections.includes(col.handle.toLowerCase()));
        }
        break;
        
      case 'exclude_tagged':
        // Apply to all except excluded tags
        const excludedTags = tierWrapper.dataset.tierAllowedTags?.split(',').map(t => t.trim().toLowerCase()) || [];
        itemApplies = !productTags.some(tag => excludedTags.includes(tag.toLowerCase()));
        break;
    }
    
    if (itemApplies) {
      console.log('[TierCartDrawer] Default tier discount applies:', item.product_title, defaultDiscount + '%');
      return defaultDiscount;
    }
    
    // No discount applies
    console.log('[TierCartDrawer] No discount applies:', item.product_title);
    return 0;
  }
  
  function updateDiscountDisplay(customerTier, totalDiscount) {
    // Find all footer rows
    const footerRows = document.querySelectorAll('.cart-drawer-footer-row');
    
    // Find the discount row (contains "Giảm giá")
    let discountRow = null;
    footerRows.forEach(row => {
      const h3 = row.querySelector('h3');
      if (h3 && h3.textContent.includes('Giảm giá')) {
        discountRow = row;
      }
    });
    
    if (!discountRow) {
      console.log('[TierCartDrawer] Discount row not found');
      return;
    }
    
    // Find the discount amount span
    const discountSpan = discountRow.querySelector('span');
    if (discountSpan) {
      // Format discount amount
      const formattedDiscount = formatMoney(totalDiscount);
      discountSpan.textContent = `- ${formattedDiscount}`;
      console.log('[TierCartDrawer] Updated discount display:', formattedDiscount);
    }
    
    // Also update total
    updateTotalDisplay(totalDiscount);
  }
  
  function updateTotalDisplay(totalDiscount) {
    // Find total row
    const footerRows = document.querySelectorAll('.cart-drawer-footer-row');
    let totalRow = null;
    let subtotalAmount = 0;
    
    footerRows.forEach(row => {
      const h3 = row.querySelector('h3');
      if (h3 && h3.textContent.includes('Tổng phụ')) {
        const span = row.querySelector('span');
        if (span) {
          // Parse subtotal amount
          const amountText = span.textContent.replace(/[^\d]/g, '');
          subtotalAmount = parseInt(amountText, 10);
        }
      }
      if (h3 && h3.textContent.includes('Tổng cộng')) {
        totalRow = row;
      }
    });
    
    if (totalRow && subtotalAmount > 0) {
      const newTotal = subtotalAmount - totalDiscount;
      const formattedTotal = formatMoney(newTotal);
      const totalSpan = totalRow.querySelector('span');
      if (totalSpan) {
        totalSpan.textContent = formattedTotal;
        console.log('[TierCartDrawer] Updated total:', formattedTotal);
      }
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
