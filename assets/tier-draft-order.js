/**
 * Tier Draft Order Handler
 * Create draft order with line item discounts via backend API
 */

(function () {
  'use strict';

  const API_ENDPOINT = 'https://helios-tier-pricing-api-h543.vercel.app/api/create-draft-order';

  console.log('[TierDraftOrder] Script loaded');

  // Listen for draft order creation event
  function setupEventListeners() {
    document.addEventListener('tier:create-draft-order', async function (e) {
      console.log('[TierDraftOrder] Draft order event received', e.detail);

      try {
        // Pass event detail (may contain productDiscount from product page)
        await createDraftOrderCheckout(e.detail);
      } catch (error) {
        console.error('[TierDraftOrder] Error:', error);
        alert('Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại!');
      }
    });
  }

  // Also intercept cart drawer checkout button
  function interceptCartCheckout() {
    document.addEventListener('click', async function (e) {
      const checkoutBtn = e.target.closest('[name="checkout"], .cart__checkout-button, .cart-drawer__checkout');

      if (checkoutBtn) {
        // Check if customer has tier (always use draft order for tier customers)
        const shouldUseDraftOrder = await checkShouldUseDraftOrder();

        if (shouldUseDraftOrder) {
          e.preventDefault();
          e.stopPropagation();

          console.log('[TierDraftOrder] Customer has tier, using draft order');

          const originalText = checkoutBtn.textContent || checkoutBtn.value;
          checkoutBtn.disabled = true;
          if (checkoutBtn.textContent) {
            checkoutBtn.textContent = 'Đang xử lý...';
          } else {
            checkoutBtn.value = 'Đang xử lý...';
          }

          try {
            await createDraftOrderCheckout();
          } catch (error) {
            console.error('[TierDraftOrder] Error:', error);
            alert('Có lỗi xảy ra. Vui lòng thử lại!');
            checkoutBtn.disabled = false;
            if (checkoutBtn.textContent) {
              checkoutBtn.textContent = originalText;
            } else {
              checkoutBtn.value = originalText;
            }
          }
        }
      }
    }, true);
  }

  async function checkShouldUseDraftOrder() {
    const customerTier = sessionStorage.getItem('helios_customer_tier');
    // If customer has tier, ALWAYS use draft order to ensure correct pricing
    return !!customerTier;
  }

  async function createDraftOrderCheckout(eventDetail) {
    console.log('[TierDraftOrder] Creating draft order...', eventDetail);

    // Get current cart
    const cartResponse = await fetch('/cart.js');
    const cart = await cartResponse.json();

    console.log('[TierDraftOrder] Current cart:', cart);

    if (!cart.items || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // Get customer info
    const customerId = getCustomerId();
    const customerEmail = getCustomerEmail();

    if (!customerId && !customerEmail) {
      throw new Error('Customer information not found');
    }

    // Build items with tier discounts
    const items = await Promise.all(cart.items.map(async (item, index) => {
      let discountPercent = 0;
      let foundWrapper = false;
      
      // PRIORITY 1: If called from product page "Mua ngay" button, use provided discount
      // Match by variant_id (not index, as adding existing item increases quantity)
      if (eventDetail && eventDetail.fromProductPage && eventDetail.variantId && item.variant_id === eventDetail.variantId) {
        discountPercent = eventDetail.productDiscount || 0;
        console.log('[TierDraftOrder] Got discount from product page event:', { 
          product: item.product_title, 
          variant: item.variant_id,
          percent: discountPercent,
          source: 'product_page_event'
        });
        foundWrapper = true; // Mark as found to skip other checks
      }
      
      // PRIORITY 2: Try to get discount from cart drawer (if available)
      // Match by variant_id, NOT by index
      if (!foundWrapper) {
        const cartItems = document.querySelectorAll('.cart-drawer-item');
        for (const cartItem of cartItems) {
          const variantIdAttr = cartItem.dataset.variantId || cartItem.getAttribute('data-variant-id');
          if (variantIdAttr && parseInt(variantIdAttr) === item.variant_id) {
            const wrapper = cartItem.querySelector('.tier-pricing-wrapper');
            if (wrapper) {
              foundWrapper = true;
              discountPercent = parseFloat(wrapper.dataset.tierDiscount || 0);
              console.log('[TierDraftOrder] Got discount from cart drawer:', { 
                product: item.product_title, 
                variant: item.variant_id,
                percent: discountPercent,
                source: 'cart_drawer_wrapper'
              });
              break;
            }
          }
        }
      }
      
      // PRIORITY 3: Only calculate discount if wrapper NOT found
      // If wrapper found with discount=0, trust Liquid's scope check
      if (!foundWrapper) {
        discountPercent = await getItemTierDiscount(item);
        console.log('[TierDraftOrder] Calculated discount:', { 
          product: item.product_title, 
          percent: discountPercent,
          source: 'calculated'
        });
      }

      return {
        variant_id: item.variant_id,
        quantity: item.quantity,
        price: item.price / 100, // Convert from cents to dollars
        discount_percent: discountPercent
      };
    }));

    console.log('[TierDraftOrder] Items with discounts:', items);

    // Call backend API
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_id: customerId,
        customer_email: customerEmail,
        items: items
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create draft order');
    }

    const data = await response.json();
    console.log('[TierDraftOrder] Draft order created:', data);

    // Clear cart before redirecting
    await fetch('/cart/clear.js', { method: 'POST' });

    // Redirect to invoice
    window.location.href = data.invoice_url;
  }

  async function getItemTierDiscount(item) {
    // Get customer tier
    const customerTier = sessionStorage.getItem('helios_customer_tier');
    if (!customerTier) return 0;

    // Fetch full product data to get tags
    let productTags = [];
    try {
      const productResponse = await fetch(`/products/${item.handle}.js`);
      const productData = await productResponse.json();
      productTags = productData.tags || [];
    } catch (error) {
      console.warn('[TierDraftOrder] Could not fetch product tags:', error);
      // Fallback to item.product_tags if available
      productTags = item.product_tags || [];
    }

    console.log('[TierDraftOrder] Product tags:', { product: item.product_title, tags: productTags });

    // Check for product-specific discount from tags
    const tierNameNormalized = customerTier.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
    const tagPrefix = `tier-${tierNameNormalized}-`;

    for (const tag of productTags) {
      const tagLower = tag.toLowerCase().trim();
      if (tagLower.startsWith(tagPrefix)) {
        const parts = tagLower.split('-');
        if (parts.length === 3) {
          const percent = parseInt(parts[2], 10);
          if (percent > 0 && percent <= 100) {
            console.log('[TierDraftOrder] Product-specific discount:', { product: item.product_title, percent });
            return percent;
          }
        }
      }
    }

    // Check if tier pricing applies to this product based on scope
    const tierScope = sessionStorage.getItem('helios_tier_scope') || 'all';
    const allowedTags = sessionStorage.getItem('helios_tier_tags') || '';
    const allowedCollections = sessionStorage.getItem('helios_tier_collections') || '';

    const applies = checkTierApplies(tierScope, allowedTags, allowedCollections, productTags, item);

    if (!applies) {
      console.log('[TierDraftOrder] Tier pricing does not apply to this product (scope mismatch):', item.product_title);
      return 0;
    }

    // Use default tier discount
    const defaultDiscount = getDefaultTierDiscount(customerTier);
    console.log('[TierDraftOrder] Default tier discount:', { product: item.product_title, percent: defaultDiscount });
    return defaultDiscount;
  }

  function checkTierApplies(scope, allowedTagsStr, allowedCollectionsStr, productTags, item) {
    // All products
    if (scope === 'all') return true;

    // Tagged products
    if (scope === 'tagged') {
      if (!allowedTagsStr) return false;
      const allowedTags = allowedTagsStr.split(',').map(t => t.trim().toLowerCase());
      const pTags = productTags.map(t => t.toLowerCase());
      return allowedTags.some(tag => pTags.includes(tag));
    }

    // Collections
    if (scope === 'collections') {
      if (!allowedCollectionsStr) return false;
      // Note: /products/handle.js does NOT return collections data
      // We CANNOT verify collections in JS reliably
      // IMPORTANT: This function should ONLY be called when wrapper is NOT found in cart drawer
      // If wrapper exists, we trust Liquid's scope check (which CAN check collections)
      // If we reach here (no wrapper), we must be conservative and return FALSE
      // to avoid applying discount to products outside allowed collections
      console.log('[TierDraftOrder] Cannot verify collections scope in JS, returning false for safety');
      return false;
    }

    // Exclude tagged
    if (scope === 'exclude_tagged') {
      if (!allowedTagsStr) return true;
      const excludedTags = allowedTagsStr.split(',').map(t => t.trim().toLowerCase());
      const pTags = productTags.map(t => t.toLowerCase());
      return !excludedTags.some(tag => pTags.includes(tag));
    }

    return false;
  }

  function getDefaultTierDiscount(tierName) {
    // Try to get config from sessionStorage
    const configStr = sessionStorage.getItem('helios_tier_config');
    if (configStr) {
      try {
        const config = JSON.parse(configStr);
        const discount = config[tierName.toUpperCase()];
        if (discount !== undefined) {
          return discount;
        }
      } catch (e) {
        console.warn('[TierDraftOrder] Invalid tier config in sessionStorage:', e);
      }
    }

    // Fallback to hardcoded values if config is missing
    // These should match your theme settings
    const tierDiscounts = {
      'BLACK DIAMOND': 20,
      'BLACKDIAMOND': 20,
      'DIAMOND': 20,
      'PLATINUM': 15,
      'GOLD': 10,
      'SILVER': 7,
      'MEMBER': 5
    };

    return tierDiscounts[tierName.toUpperCase()] || 0;
  }

  function getCustomerId() {
    // Try to get from meta tag or global variable
    const metaCustomerId = document.querySelector('meta[name="customer-id"]');
    if (metaCustomerId) {
      return metaCustomerId.content;
    }

    if (typeof window.ShopifyAnalytics !== 'undefined' && window.ShopifyAnalytics.meta) {
      return window.ShopifyAnalytics.meta.page.customerId;
    }

    return null;
  }

  function getCustomerEmail() {
    // Try to get from meta tag or global variable
    const metaEmail = document.querySelector('meta[name="customer-email"]');
    if (metaEmail) {
      return metaEmail.content;
    }

    return null;
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setupEventListeners();
      interceptCartCheckout();
    });
  } else {
    setupEventListeners();
    interceptCartCheckout();
  }

})();
