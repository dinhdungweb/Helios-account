/**
 * Tier Pricing Checkout Button
 * Replace Shopify dynamic checkout with custom button that applies tier discount
 */

(function() {
  'use strict';
  
  // Wait for tier pricing to be ready
  function initTierCheckout() {
    // Get discount code from sessionStorage (set by tier-auto-discount.liquid)
    const discountCode = sessionStorage.getItem('helios_tier_discount');
    
    if (!discountCode) {
      // No tier discount, don't modify anything
      return;
    }
    
    // Check if tier pricing wrapper exists (means customer is logged in with tier)
    const tierWrapper = document.querySelector('.tier-pricing-wrapper');
    if (!tierWrapper) return;
    
    const tierDiscount = parseFloat(tierWrapper.dataset.tierDiscount || 0);
    const hasCustomer = tierWrapper.dataset.hasCustomer === 'true';
    
    // Only proceed if customer has tier discount
    if (!hasCustomer || tierDiscount === 0) {
      return;
    }
    
    // Hide Shopify dynamic checkout buttons
    const dynamicButtons = document.querySelectorAll('.shopify-payment-button');
    dynamicButtons.forEach(btn => {
      btn.style.display = 'none';
    });
    
    // Create custom checkout button
    createCustomCheckoutButton(discountCode);
  }
  
  function createCustomCheckoutButton(discountCode) {
    // Find all product forms
    const productForms = document.querySelectorAll('form[action*="/cart/add"]');
    
    productForms.forEach(form => {
      const actionDiv = form.querySelector('.product-detail__form__action');
      if (!actionDiv) return;
      
      // Check if custom button already exists
      if (actionDiv.querySelector('.tier-checkout-button')) return;
      
      // Check if action div has flexbox layout (buttons in same row)
      const hasFlexLayout = actionDiv.classList.contains('product-detail__form__options--with-quantity') || 
                           window.getComputedStyle(actionDiv).display === 'flex';
      
      // Create custom checkout button
      const checkoutBtn = document.createElement('button');
      checkoutBtn.type = 'button';
      checkoutBtn.className = 'button tier-checkout-button';
      checkoutBtn.textContent = 'Mua ngay';
      
      // Apply styles based on layout
      if (hasFlexLayout) {
        // Same row layout - use flex
        checkoutBtn.style.cssText = `
          flex: 1;
          margin-left: 10px;
          padding: 18px 30px;
          background-color: #fab320;
          color: #000000;
          border: 1px solid #fab320;
          border-radius: var(--btn-border-radius, 4px);
          font-weight: 400;
          line-height: 1.25em;
          transition: opacity 0.3s, color 0.3s, background-color 0.3s, border-color 0.3s;
          cursor: pointer;
        `;
      } else {
        // Stacked layout - full width
        checkoutBtn.style.cssText = `
          margin-top: 10px;
          width: 100%;
          padding: 18px 30px;
          background-color: #fab320;
          color: #000000;
          border: 1px solid #fab320;
          border-radius: var(--btn-border-radius, 4px);
          font-weight: 400;
          line-height: 1.25em;
          transition: opacity 0.3s, color 0.3s, background-color 0.3s, border-color 0.3s;
          cursor: pointer;
        `;
      }
      
      // Add hover effect
      checkoutBtn.addEventListener('mouseenter', function() {
        if (!this.disabled) {
          this.style.backgroundColor = '#000000';
          this.style.color = '#fab320';
        }
      });
      
      checkoutBtn.addEventListener('mouseleave', function() {
        if (!this.disabled) {
          this.style.backgroundColor = '#fab320';
          this.style.color = '#000000';
        }
      });
      
      // Add click handler
      checkoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        handleTierCheckout(form, discountCode);
      });
      
      // Insert after add to cart button
      const addButton = actionDiv.querySelector('button[type="submit"]');
      if (addButton) {
        addButton.parentNode.insertBefore(checkoutBtn, addButton.nextSibling);
      }
    });
  }
  
  async function handleTierCheckout(form, discountCode) {
    const button = form.querySelector('.tier-checkout-button');
    const originalText = button.textContent;
    
    try {
      // Disable button
      button.disabled = true;
      button.textContent = 'Đang xử lý...';
      
      // Get form data
      const formData = new FormData(form);
      
      // Add to cart
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to add to cart');
      }
      
      // Redirect to checkout with discount code
      window.location.href = `/checkout?discount=${encodeURIComponent(discountCode)}`;
      
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Có lỗi xảy ra. Vui lòng thử lại!');
      button.disabled = false;
      button.textContent = originalText;
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTierCheckout);
  } else {
    initTierCheckout();
  }
  
  // Re-initialize on AJAX page changes (if theme uses AJAX)
  document.addEventListener('shopify:section:load', initTierCheckout);
  
})();
