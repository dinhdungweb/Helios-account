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
      
      // Create wrapper div for checkout button (to force new row)
      const checkoutWrapper = document.createElement('div');
      checkoutWrapper.className = 'tier-checkout-wrapper';
      checkoutWrapper.style.cssText = `
        width: 100%;
        margin-top: -14px;
        margin-bottom: 24px;
      `;
      
      // Create custom checkout button
      const checkoutBtn = document.createElement('button');
      checkoutBtn.type = 'button';
      checkoutBtn.className = 'button tier-checkout-button';
      checkoutBtn.textContent = 'Mua ngay';
      checkoutBtn.style.cssText = `
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
      
      // Add button to wrapper
      checkoutWrapper.appendChild(checkoutBtn);
      
      // Insert wrapper after action div (new row)
      if (actionDiv.nextSibling) {
        actionDiv.parentNode.insertBefore(checkoutWrapper, actionDiv.nextSibling);
      } else {
        actionDiv.parentNode.appendChild(checkoutWrapper);
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
  
  // Re-initialize when quick view modal opens
  document.addEventListener('click', function(e) {
    const quickBuyBtn = e.target.closest('[data-cc-quick-buy]');
    if (quickBuyBtn) {
      // Wait for tier-pricing-final.js to finish rendering tier wrapper
      // Try multiple times with increasing delays
      const checkAndInit = function(attempt, maxAttempts) {
        if (attempt > maxAttempts) return;
        
        setTimeout(function() {
          const modal = document.querySelector('#quick-buy-modal');
          const tierWrapper = modal ? modal.querySelector('.tier-pricing-wrapper') : null;
          
          if (tierWrapper) {
            // Tier wrapper found, init checkout button
            initTierCheckout();
          } else if (attempt < maxAttempts) {
            // Not found yet, try again
            checkAndInit(attempt + 1, maxAttempts);
          }
        }, 300 * attempt); // 300ms, 600ms, 900ms, 1200ms, 1500ms
      };
      
      checkAndInit(1, 5);
    }
  });
  
  // Also observe for tier-pricing-wrapper being added to modal
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) {
            // Check if tier-pricing-wrapper was added
            if (node.classList && node.classList.contains('tier-pricing-wrapper')) {
              setTimeout(initTierCheckout, 100);
            }
            // Or if it's inside the added node
            else if (node.querySelector && node.querySelector('.tier-pricing-wrapper')) {
              setTimeout(initTierCheckout, 100);
            }
          }
        });
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
})();
