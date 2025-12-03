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
      // Check if tier pricing wrapper exists with valid discount
      const tierWrapper = document.querySelector('.tier-pricing-wrapper');
      if (!tierWrapper) {
        console.log('[TierCheckoutButton] No tier wrapper found, exiting');
        return;
      }

      const tierDiscount = parseFloat(tierWrapper.dataset.tierDiscount || 0);
      const hasCustomer = tierWrapper.dataset.hasCustomer === 'true';
      const customerTier = tierWrapper.dataset.customerTier || '';

      console.log('[TierCheckoutButton] Tier info:', {
        tierDiscount,
        hasCustomer,
        customerTier
      });

      // Only show custom button if customer has tier discount
      if (!hasCustomer || tierDiscount === 0) {
        console.log('[TierCheckoutButton] No customer or zero discount, exiting');
        return;
      }

      console.log('[TierCheckoutButton] ✓ Customer has tier discount, creating custom button');

      // Store tier info in sessionStorage for other scripts to use
      if (customerTier) {
        sessionStorage.setItem('helios_customer_tier', customerTier);
        sessionStorage.setItem('helios_tier_discount_percent', tierDiscount);
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

  async function checkProductSpecificDiscount(cartItem) {
    const customerTier = sessionStorage.getItem('helios_customer_tier');
    if (!customerTier) return false;

    try {
      // Fetch product data
      const productResponse = await fetch(`/products/${cartItem.handle}.js`);
      const productData = await productResponse.json();

      const tierNameNormalized = customerTier.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
      const tagPrefix = `tier-${tierNameNormalized}-`;

      // Check if product has tier-specific tag
      for (const tag of productData.tags || []) {
        const tagLower = tag.toLowerCase().trim();
        if (tagLower.startsWith(tagPrefix)) {
          console.log('[TierCheckoutButton] Found product-specific discount tag:', tag);
          return true;
        }
      }
    } catch (error) {
      console.warn('[TierCheckoutButton] Could not check product tags:', error);
    }

    return false;
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

          // Check if customer has tier (always use draft order for tier customers)
          const customerTier = sessionStorage.getItem('helios_customer_tier');

          // Always use draft order for tier customers (handled by tier-draft-order.js)
          console.log('[TierCheckoutButton] Customer has tier, using draft order');
          console.log('[TierCheckoutButton] Dispatching tier:create-draft-order event');
          const event = new CustomEvent('tier:create-draft-order');
          document.dispatchEvent(event);
          console.log('[TierCheckoutButton] Event dispatched');

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
