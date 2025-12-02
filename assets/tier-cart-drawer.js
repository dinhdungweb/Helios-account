/**
 * Tier Cart Drawer
 * Update cart drawer to show correct tier discount
 */

(function() {
  'use strict';
  
  console.log('[TierCartDrawer] Script loaded');
  
  function updateCartDrawer() {
    console.log('[TierCartDrawer] Updating cart drawer...');
    
    // Get current discount code from sessionStorage
    const discountCode = sessionStorage.getItem('helios_tier_discount');
    const discountSource = sessionStorage.getItem('helios_tier_discount_source');
    
    if (!discountCode) {
      console.log('[TierCartDrawer] No discount code found');
      return;
    }
    
    console.log('[TierCartDrawer] Discount code:', discountCode, 'Source:', discountSource);
    
    // Update discount code display in cart drawer
    const discountDisplays = document.querySelectorAll('.cart-drawer [data-discount-code], .cart-drawer .discount-code');
    discountDisplays.forEach(el => {
      el.textContent = discountCode;
      console.log('[TierCartDrawer] Updated discount display');
    });
    
    // Update checkout button to include discount
    const checkoutButtons = document.querySelectorAll('.cart-drawer a[href*="/checkout"], .cart-drawer button[name="checkout"]');
    checkoutButtons.forEach(btn => {
      if (btn.tagName === 'A') {
        const url = new URL(btn.href, window.location.origin);
        url.searchParams.set('discount', discountCode);
        btn.href = url.toString();
        console.log('[TierCartDrawer] Updated checkout link:', btn.href);
      }
    });
    
    // Update cart totals to reflect tier pricing
    updateCartTotals();
    
    // Add discount info if not exists
    addDiscountInfo(discountCode);
  }
  
  async function updateCartTotals() {
    try {
      // Get all tier-pricing wrappers in cart
      const cartItems = document.querySelectorAll('.cart-drawer .cart-item, .cart-drawer [class*="cart__item"]');
      let totalAfterTier = 0;
      
      cartItems.forEach(item => {
        const tierWrapper = item.querySelector('.tier-pricing-wrapper');
        if (tierWrapper) {
          const tierPriceFinal = tierWrapper.querySelector('.tier-price-final .theme-money');
          const quantityInput = item.querySelector('input[type="number"], [name*="quantity"]');
          
          if (tierPriceFinal && quantityInput) {
            // Extract price from text (remove currency symbols)
            const priceText = tierPriceFinal.textContent.replace(/[^\d]/g, '');
            const price = parseInt(priceText) || 0;
            const quantity = parseInt(quantityInput.value) || 1;
            
            totalAfterTier += price * quantity;
            console.log('[TierCartDrawer] Item:', { price, quantity, subtotal: price * quantity });
          }
        }
      });
      
      console.log('[TierCartDrawer] Total after tier pricing:', totalAfterTier);
      
      // Update subtotal display
      const subtotalElements = document.querySelectorAll('.cart-drawer [class*="subtotal"], .cart-drawer [class*="tổng-phụ"], .cart-drawer [class*="tong-phu"]');
      subtotalElements.forEach(el => {
        const priceEl = el.querySelector('[class*="price"], [class*="money"]');
        if (priceEl) {
          priceEl.textContent = formatMoney(totalAfterTier);
          console.log('[TierCartDrawer] Updated subtotal display');
        }
      });
      
    } catch (error) {
      console.error('[TierCartDrawer] Error updating cart totals:', error);
    }
  }
  
  function formatMoney(cents) {
    return new Intl.NumberFormat('vi-VN').format(cents) + ' VND';
  }
  
  function addDiscountInfo(discountCode) {
    const cartDrawer = document.querySelector('.cart-drawer');
    if (!cartDrawer) return;
    
    // Check if discount info already exists
    if (cartDrawer.querySelector('.tier-discount-info')) {
      return;
    }
    
    // Find totals section
    const totalsSection = cartDrawer.querySelector('.cart-drawer__footer, .cart-totals, [class*="total"]');
    if (!totalsSection) return;
    
    // Create discount info element
    const discountInfo = document.createElement('div');
    discountInfo.className = 'tier-discount-info';
    discountInfo.style.cssText = `
      padding: 12px 0;
      border-top: 1px solid #e0e0e0;
      margin-top: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #fab320;
      font-size: 14px;
    `;
    
    discountInfo.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0;">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
      </svg>
      <span>Mã giảm giá <strong>${discountCode}</strong> sẽ được áp dụng khi thanh toán</span>
    `;
    
    // Insert before checkout button
    const checkoutBtn = totalsSection.querySelector('a[href*="/checkout"], button[name="checkout"]');
    if (checkoutBtn) {
      checkoutBtn.parentNode.insertBefore(discountInfo, checkoutBtn);
      console.log('[TierCartDrawer] Added discount info');
    }
  }
  
  // Initialize
  function init() {
    updateCartDrawer();
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
      
      // Also watch for class changes (drawer opening)
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (target.classList && target.classList.contains('cart-drawer')) {
          setTimeout(updateCartDrawer, 100);
        }
      }
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
  
  // Listen for cart updates
  document.addEventListener('cart:updated', updateCartDrawer);
  document.addEventListener('cart:refresh', updateCartDrawer);
  
  // Listen for Shopify cart events
  if (typeof Shopify !== 'undefined' && Shopify.theme) {
    document.addEventListener('shopify:cart:update', updateCartDrawer);
  }
  
})();
