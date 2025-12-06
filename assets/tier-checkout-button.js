/**
 * Tier Pricing Checkout Button
 * Create custom "Mua ngay" button that applies tier discount
 */

(function () {
  'use strict';

  function initTierCheckout() {
    // Wait a bit for tier-pricing-wrapper to be rendered by Liquid
    setTimeout(() => {
      // Find ALL tier-pricing-wrappers on page
      const allWrappers = document.querySelectorAll('.tier-pricing-wrapper');
      
      // Filter to find wrapper for MAIN PRODUCT only (exclude cart drawer, recommendations)
      let tierWrapper = null;
      for (const wrapper of allWrappers) {
        // Skip if wrapper is inside cart drawer or recommendations
        if (wrapper.closest('.cart-drawer, [data-recommend], .recommend-products, .cart-items')) {
          continue;
        }
        
        // Check if wrapper is in main product area
        const isInProductArea = wrapper.closest('.product-area, .product-single, main.main-content, .product-template');
        if (isInProductArea) {
          tierWrapper = wrapper;
          break;
        }
      }
      
      if (!tierWrapper) {
        return;
      }

      const tierDiscount = parseFloat(tierWrapper.dataset.tierDiscount || 0);
      const hasCustomer = tierWrapper.dataset.hasCustomer === 'true';
      const customerTier = tierWrapper.dataset.customerTier || '';

      // Only show custom button if customer has tier discount
      if (!hasCustomer || tierDiscount === 0) {
        return;
      }

      // Store tier info in sessionStorage IMMEDIATELY for other scripts to use
      if (customerTier) {
        sessionStorage.setItem('helios_customer_tier', customerTier);
        sessionStorage.setItem('helios_tier_discount_percent', tierDiscount);
      }

      // Hide Shopify dynamic checkout buttons
      const dynamicButtons = document.querySelectorAll('.shopify-payment-button');

      dynamicButtons.forEach(btn => {
        btn.style.display = 'none';
      });

      // Create custom checkout buttons
      createCustomCheckoutButtons();
    }, 100); // Small delay to ensure DOM is ready
  }

  function createCustomCheckoutButtons() {
    // Find all product forms
    const productForms = document.querySelectorAll('form[action*="/cart/add"]');

    productForms.forEach((form) => {
      // Check if button already exists
      if (form.querySelector('.tier-checkout-button')) {
        return;
      }

      // Find add to cart button
      const addToCartBtn = form.querySelector('button[name="add"], input[name="add"], button[type="submit"]');

      if (!addToCartBtn) {
        return;
      }

      // Don't show "Mua ngay" if product is sold out or unavailable
      if (addToCartBtn.disabled || addToCartBtn.classList.contains('disabled')) {
        return;
      }

      // Check if button text indicates sold out or pre-order
      const btnText = (addToCartBtn.textContent || addToCartBtn.value || '').toLowerCase();
      if (btnText.includes('hết hàng') || btnText.includes('sold out') || 
          btnText.includes('unavailable') || btnText.includes('pre-order') ||
          btnText.includes('đặt trước')) {
        return;
      }

      // Force add to cart button to be block and full width
      addToCartBtn.style.display = 'block';
      addToCartBtn.style.width = '100%';

      // Create custom "Mua ngay" button
      const checkoutBtn = document.createElement('button');
      checkoutBtn.type = 'button';
      checkoutBtn.className = 'button tier-checkout-button';
      checkoutBtn.textContent = 'Mua ngay';
      checkoutBtn.style.cssText = `
        width: 100%;
        padding: 18px 30px;
        margin-top: 10px;
        background-color: #fab320;
        color: #000000;
        border: 1px solid #fab320;
        border-radius: 4px;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: block;
      `;

      // Hover effects
      checkoutBtn.addEventListener('mouseenter', function () {
        if (!this.disabled) {
          this.style.backgroundColor = '#000000';
          this.style.color = '#fab320';
        }
      });

      checkoutBtn.addEventListener('mouseleave', function () {
        if (!this.disabled) {
          this.style.backgroundColor = '#fab320';
          this.style.color = '#000000';
        }
      });

      // Click handler
      checkoutBtn.addEventListener('click', async function (e) {
        e.preventDefault();

        const originalText = this.textContent;
        this.disabled = true;
        this.textContent = 'Đang xử lý...';
        this.style.opacity = '0.6';

        try {
          // Get form data
          const formData = new FormData(form);
          const variantId = parseInt(formData.get('id'));
          const quantity = parseInt(formData.get('quantity') || 1);

          // Get discount from tier-pricing-wrapper on MAIN PRODUCT page
          let tierWrapper = null;
          const allWrappers = document.querySelectorAll('.tier-pricing-wrapper');
          for (const wrapper of allWrappers) {
            // Skip wrappers from cart drawer or recommendations
            if (wrapper.closest('.cart-drawer, [data-recommend], .recommend-products, .cart-items')) {
              continue;
            }
            // Check if wrapper is in main product area
            const isInProductArea = wrapper.closest('.product-area, .product-single, main.main-content, .product-template');
            if (isInProductArea) {
              tierWrapper = wrapper;
              break;
            }
          }
          
          const tierDiscount = tierWrapper ? parseFloat(tierWrapper.dataset.tierDiscount || 0) : 0;
          
          // Get variant price from page (ORIGINAL price, not discounted)
          let variantPrice = 0;
          
          // Try to get price from window.product (most reliable)
          if (typeof window.product !== 'undefined') {
            const variant = window.product.variants.find(v => v.id == variantId);
            if (variant) {
              variantPrice = variant.price; // Original price in cents
            }
          }
          
          // Fallback: Get ORIGINAL price from tier-price-original (not tier-price-final!)
          if (variantPrice === 0 && tierWrapper) {
            // Get original price from wrapper data or DOM
            const originalPriceEl = document.querySelector('.price-area .tier-price-original .theme-money');
            if (originalPriceEl) {
              const priceText = originalPriceEl.textContent.replace(/[^\d]/g, '');
              variantPrice = parseInt(priceText) || 0;
            } else {
              // If no tier discount shown, get from tier-price-final (which is original price)
              const finalPriceEl = document.querySelector('.price-area .tier-price-final .theme-money');
              if (finalPriceEl && tierDiscount === 0) {
                const priceText = finalPriceEl.textContent.replace(/[^\d]/g, '');
                variantPrice = parseInt(priceText) || 0;
              }
            }
          }
          
          // If still no price, throw error
          if (variantPrice === 0) {
            throw new Error('Could not determine product price');
          }
          
          // Trigger draft order immediately with single item (Buy Now = only this product)
          const event = new CustomEvent('tier:create-draft-order', {
            detail: {
              buyNowMode: true, // Flag to indicate "Buy Now" - single item only
              singleItem: {
                variant_id: variantId,
                quantity: quantity,
                price: variantPrice,
                discount_percent: tierDiscount
              }
            }
          });
          document.dispatchEvent(event);

        } catch (error) {
          console.error('[TierCheckoutButton] Error:', error);
          alert('Có lỗi xảy ra. Vui lòng thử lại!');
          this.disabled = false;
          this.textContent = originalText;
          this.style.opacity = '1';
        }
      });

      // Wrap button in a div to force new line
      const buttonWrapper = document.createElement('div');
      buttonWrapper.style.cssText = `
        clear: both;
        display: block;
        width: 100%;
        margin-top: 10px;
      `;
      buttonWrapper.appendChild(checkoutBtn);

      // Remove margin-top from button since wrapper has it
      checkoutBtn.style.marginTop = '0';

      // Insert wrapper after add to cart button
      addToCartBtn.parentNode.insertBefore(buttonWrapper, addToCartBtn.nextSibling);
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTierCheckout);
  } else {
    initTierCheckout();
  }

  // Re-initialize on section load (for AJAX)
  document.addEventListener('shopify:section:load', initTierCheckout);

  // Watch for new forms being added
  const observer = new MutationObserver(function (mutations) {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          if (node.matches && node.matches('form[action*="/cart/add"]')) {
            setTimeout(initTierCheckout, 100);
            break;
          } else if (node.querySelector && node.querySelector('form[action*="/cart/add"]')) {
            setTimeout(initTierCheckout, 100);
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
