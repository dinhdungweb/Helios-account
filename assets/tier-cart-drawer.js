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
    
    // Add discount info notification
    addDiscountInfo(discountCode);
  }
  
  function addDiscountInfo(discountCode) {
    const cartDrawer = document.querySelector('.cart-drawer');
    if (!cartDrawer) return;
    
    // Check if discount info already exists
    if (cartDrawer.querySelector('.tier-discount-info')) {
      return;
    }
    
    // Find checkout button
    const checkoutBtn = cartDrawer.querySelector('a[href*="/checkout"], button[name="checkout"]');
    if (!checkoutBtn) return;
    
    // Create discount info element
    const discountInfo = document.createElement('div');
    discountInfo.className = 'tier-discount-info';
    discountInfo.style.cssText = `
      padding: 12px 16px;
      margin: 12px 0;
      display: flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #fab320 0%, #ff8c00 100%);
      color: #000;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
    `;
    
    discountInfo.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0;">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
      </svg>
      <span>Mã <strong>${discountCode}</strong> sẽ được áp dụng khi thanh toán</span>
    `;
    
    // Insert before checkout button
    checkoutBtn.parentNode.insertBefore(discountInfo, checkoutBtn);
    console.log('[TierCartDrawer] Added discount info notification');
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
