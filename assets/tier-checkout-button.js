/**
 * Tier Pricing Checkout Button
 * Create custom "Mua ngay" button that applies tier discount
 */

(function () {
  'use strict';

  console.log('[TierCheckoutButton] Script loaded');

  function initTierCheckout() {
    console.log('[TierCheckoutButton] Initializing...');

    // Wait a bit for tier-pricing-wrapper to be rendered by Liquid
    setTimeout(() => {
      // Find ALL tier-pricing-wrappers on page
      const allWrappers = document.querySelectorAll('.tier-pricing-wrapper');
      console.log('[TierCheckoutButton] Found tier wrappers:', allWrappers.length);
      
      // Filter to find wrapper for MAIN PRODUCT only (exclude cart drawer, recommendations)
      let tierWrapper = null;
      for (const wrapper of allWrappers) {
        // Skip if wrapper is inside cart drawer or recommendations
        if (wrapper.closest('.cart-drawer, [data-recommend], .recommend-products, .cart-items')) {
          console.log('[TierCheckoutButton] Skipping wrapper from cart/recommend');
          continue;
        }
        
        // Check if wrapper is in main product area
        const isInProductArea = wrapper.closest('.product-area, .product-single, main.main-content, .product-template');
        if (isInProductArea) {
          tierWrapper = wrapper;
          console.log('[TierCheckoutButton] Found wrapper in main product area');
          break;
        }
      }
      
      if (!tierWrapper) {
        console.log('[TierCheckoutButton] No tier wrapper found for main product, exiting');
        return;
      }

      const tierDiscount = parseFloat(tierWrapper.dataset.tierDiscount || 0);
      const hasCustomer = tierWrapper.dataset.hasCustomer === 'true';
      const customerTier = tierWrapper.dataset.customerTier || '';

      console.log('[TierCheckoutButton] Main product tier info:', {
        tierDiscount,
        hasCustomer,
        customerTier
      });

      // Only show custom button if customer has tier discount
      if (!hasCustomer || tierDiscount === 0) {
        console.log('[TierCheckoutButton] No customer or zero discount for this product, exiting');
        return;
      }

      console.log('[TierCheckoutButton] ✓ Customer has tier discount, creating custom button');

      // Store tier info in sessionStorage IMMEDIATELY for other scripts to use
      if (customerTier) {
        sessionStorage.setItem('helios_customer_tier', customerTier);
        sessionStorage.setItem('helios_tier_discount_percent', tierDiscount);
        console.log('[TierCheckoutButton] Stored tier info in sessionStorage:', { customerTier, tierDiscount });
      }

      // Hide Shopify dynamic checkout buttons
      const dynamicButtons = document.querySelectorAll('.shopify-payment-button');
      console.log('[TierCheckoutButton] Found Shopify payment buttons:', dynamicButtons.length);

      dynamicButtons.forEach(btn => {
        btn.style.display = 'none';
        console.log('[TierCheckoutButton] Hidden Shopify payment button');
      });

      // Create custom checkout buttons
      createCustomCheckoutButtons();
    }, 100); // Small delay to ensure DOM is ready
  }

  function createCustomCheckoutButtons() {
    // Find all product forms
    const productForms = document.querySelectorAll('form[action*="/cart/add"]');
    console.log('[TierCheckoutButton] Found product forms:', productForms.length);

    productForms.forEach((form, index) => {
      console.log(`[TierCheckoutButton] Processing form ${index}`);

      // Check if button already exists
      if (form.querySelector('.tier-checkout-button')) {
        console.log('[TierCheckoutButton] Button already exists, skipping');
        return;
      }

      // Find add to cart button
      const addToCartBtn = form.querySelector('button[name="add"], input[name="add"], button[type="submit"]');

      if (!addToCartBtn) {
        console.log('[TierCheckoutButton] No add to cart button found');
        return;
      }

      console.log('[TierCheckoutButton] Found add to cart button:', addToCartBtn);

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
        console.log('[TierCheckoutButton] Mua ngay clicked');

        const originalText = this.textContent;
        this.disabled = true;
        this.textContent = 'Đang xử lý...';
        this.style.opacity = '0.6';

        try {
          // Get form data
          const formData = new FormData(form);

          console.log('[TierCheckoutButton] Adding to cart...');

          // Add to cart
          const response = await fetch('/cart/add.js', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error('Failed to add to cart');
          }

          const data = await response.json();
          console.log('[TierCheckoutButton] Added to cart:', data);

          // Always use draft order for tier customers
          console.log('[TierCheckoutButton] Customer has tier, using draft order');
          
          // Get discount from tier-pricing-wrapper on MAIN PRODUCT page (not cart/recommend)
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
          
          console.log('[TierCheckoutButton] Product tier discount:', tierDiscount, 'from wrapper:', !!tierWrapper);
          
          // Wait a bit for cart to update, then trigger draft order
          setTimeout(() => {
            console.log('[TierCheckoutButton] Dispatching tier:create-draft-order event');
            const event = new CustomEvent('tier:create-draft-order', {
              detail: {
                productDiscount: tierDiscount,
                fromProductPage: true,
                variantId: data.variant_id // Pass variant_id to match in cart
              }
            });
            document.dispatchEvent(event);
            console.log('[TierCheckoutButton] Event dispatched with discount:', tierDiscount, 'variant:', data.variant_id);
          }, 800); // Wait 800ms for cart to update

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

      console.log('[TierCheckoutButton] ✓ Created custom Mua ngay button');
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
