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
      // Get all cart items (not recommend products)
      const cartItems = document.querySelectorAll('.cart-drawer-items > .cart-drawer-item');
      console.log('[TierCartDrawer] Found cart items:', cartItems.length);
      
      let totalOriginal = 0;
      let totalAfterTier = 0;
      
      cartItems.forEach((item, index) => {
        const tierWrapper = item.querySelector('.tier-pricing-wrapper');
        console.log(`[TierCartDrawer] Item ${index}:`, {
          hasTierWrapper: !!tierWrapper,
          element: item
        });
        
        if (tierWrapper) {
          // Get original price (before tier discount)
          const tierPriceOriginal = tierWrapper.querySelector('.tier-price-original .theme-money');
          // Get final price (after tier discount)
          const tierPriceFinal = tierWrapper.querySelector('.tier-price-final .theme-money');
          const quantityInput = item.querySelector('input[type="number"], [name*="quantity"]');
          
          if (quantityInput) {
            const quantity = parseInt(quantityInput.value) || 1;
            
            // Extract final price
            let finalPrice = 0;
            if (tierPriceFinal) {
              const finalPriceText = tierPriceFinal.textContent.replace(/[^\d]/g, '');
              finalPrice = parseInt(finalPriceText) || 0;
            }
            
            // Extract original price
            let originalPrice = 0;
            if (tierPriceOriginal) {
              const originalPriceText = tierPriceOriginal.textContent.replace(/[^\d]/g, '');
              originalPrice = parseInt(originalPriceText) || 0;
            }
            
            // If no original price, try to get from compare_at_price or use final price
            if (originalPrice === 0) {
              const comparePrice = tierWrapper.querySelector('.tier-price-compare .theme-money');
              if (comparePrice) {
                const comparePriceText = comparePrice.textContent.replace(/[^\d]/g, '');
                originalPrice = parseInt(comparePriceText) || finalPrice;
              } else {
                // No discount, original = final
                originalPrice = finalPrice;
              }
            }
            
            totalOriginal += originalPrice * quantity;
            totalAfterTier += finalPrice * quantity;
            
            console.log('[TierCartDrawer] Item:', { 
              hasOriginal: !!tierPriceOriginal,
              hasFinal: !!tierPriceFinal,
              originalPrice, 
              finalPrice, 
              quantity, 
              originalSubtotal: originalPrice * quantity,
              finalSubtotal: finalPrice * quantity
            });
          }
        }
      });
      
      const totalDiscount = totalOriginal - totalAfterTier;
      
      console.log('[TierCartDrawer] Totals:', {
        original: totalOriginal,
        afterTier: totalAfterTier,
        discount: totalDiscount
      });
      
      // Update cart footer displays
      const cartFooter = document.querySelector('.cart-drawer footer, .cart-drawer-footer, .cart-drawer__footer');
      if (!cartFooter) {
        console.log('[TierCartDrawer] ✗ Cart footer not found');
        return;
      }
      
      const footerRows = cartFooter.querySelectorAll('.cart-drawer-footer-row');
      console.log('[TierCartDrawer] Found footer rows:', footerRows.length);
      
      footerRows.forEach((row, index) => {
        const heading = row.querySelector('h3');
        const priceSpan = row.querySelector('span');
        
        if (heading && priceSpan) {
          const headingText = heading.textContent.trim();
          console.log(`[TierCartDrawer] Row ${index}: "${headingText}" = "${priceSpan.textContent.trim()}"`);
          
          // Update "Tổng phụ" (subtotal - original price before any discount)
          if (headingText.includes('Tổng phụ')) {
            // Only update if we have valid total
            if (totalOriginal > 0) {
              const newValue = formatMoney(totalOriginal);
              priceSpan.textContent = newValue;
              console.log(`[TierCartDrawer] ✓ Updated "Tổng phụ": ${newValue}`);
            } else {
              console.log(`[TierCartDrawer] ⚠️ Skipping "Tổng phụ" update (totalOriginal = 0), keeping Liquid value: ${priceSpan.textContent}`);
            }
          }
          
          // Update "Giảm giá DIAMOND" or any tier discount row
          else if (headingText.includes('Giảm giá') && !headingText.includes('khác')) {
            if (totalDiscount > 0 && totalOriginal > 0) {
              const discountPercent = Math.round((totalDiscount / totalOriginal) * 100);
              const tierName = sessionStorage.getItem('helios_customer_tier') || 'DIAMOND';
              
              heading.innerHTML = `Giảm giá ${tierName} (-${discountPercent}%)`;
              priceSpan.textContent = '- ' + formatMoney(totalDiscount);
              console.log(`[TierCartDrawer] ✓ Updated discount: -${formatMoney(totalDiscount)} (${discountPercent}%)`);
            } else {
              console.log(`[TierCartDrawer] ⚠️ Skipping discount update (totalDiscount = ${totalDiscount}), keeping Liquid value`);
            }
          }
          
          // Update "Tổng cộng" (final total after discount)
          else if (headingText.includes('Tổng cộng')) {
            if (totalAfterTier >= 0 && totalOriginal > 0) {
              const newValue = formatMoney(totalAfterTier);
              priceSpan.textContent = newValue;
              console.log(`[TierCartDrawer] ✓ Updated "Tổng cộng": ${newValue}`);
            } else {
              console.log(`[TierCartDrawer] ⚠️ Skipping "Tổng cộng" update, keeping Liquid value: ${priceSpan.textContent}`);
            }
          }
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
