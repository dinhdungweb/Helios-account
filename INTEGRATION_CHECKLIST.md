# ✅ Integration Checklist - Tier Draft Order

## 📦 Backend (Vercel)

- [x] **API Endpoint Created**
  - File: `api/create-draft-order.js`
  - URL: `https://helios-tier-pricing-api-h543.vercel.app/api/create-draft-order`
  
- [ ] **Environment Variables Set**
  - `SHOPIFY_STORE_DOMAIN`
  - `SHOPIFY_ACCESS_TOKEN`
  - Verify in: Vercel Dashboard → Settings → Environment Variables

- [ ] **API Deployed**
  - Check: Visit https://helios-tier-pricing-api-h543.vercel.app/api/create-draft-order
  - Should return: Method not allowed (GET) or similar error
  - Test POST: Use Postman/Thunder Client

## 🎨 Frontend (Shopify Theme)

### JavaScript Files

- [x] **tier-draft-order.js**
  - Location: `assets/tier-draft-order.js`
  - Included in: `layout/theme.liquid` ✅
  - Functions:
    - `createDraftOrderCheckout()` - Main function
    - `getItemTierDiscount()` - Get discount per item
    - `checkCartForProductSpecificDiscounts()` - Check cart
    - Event listener: `tier:create-draft-order`

- [x] **tier-checkout-button.js**
  - Location: `assets/tier-checkout-button.js`
  - Included in: `layout/theme.liquid` ✅
  - Functions:
    - `checkProductSpecificDiscount()` - Check product tags
    - `createCustomCheckoutButtons()` - Create "Mua ngay" button
    - Triggers: `tier:create-draft-order` event

- [x] **tier-product-discount.js**
  - Location: `assets/tier-product-discount.js`
  - Included in: `layout/theme.liquid` ✅
  - Purpose: Display product-specific discount

- [x] **tier-cart-drawer.js**
  - Location: `assets/tier-cart-drawer.js`
  - Included in: `layout/theme.liquid` ✅
  - Purpose: Update cart drawer prices

- [x] **tier-pricing-final.js**
  - Location: `assets/tier-pricing-final.js`
  - Included in: `layout/theme.liquid` ✅
  - Purpose: Main tier pricing logic

### Liquid Files

- [x] **theme.liquid**
  - All scripts included in correct order
  - Scripts load with `defer="defer"`

- [x] **tier-auto-discount.liquid**
  - Snippet exists
  - Included in theme.liquid

## 🏷️ Product Setup

- [ ] **Test Product Created**
  - Product name: _____________
  - Handle: _____________
  - Tag added: `tier-diamond-25` (or similar)

- [ ] **Tag Format Verified**
  - Format: `tier-{tier}-{percent}`
  - Example: `tier-diamond-25`
  - Lowercase: ✓
  - No spaces: ✓
  - Valid percent (1-100): ✓

## 👤 Customer Setup

- [ ] **Test Customer Created**
  - Email: _____________
  - Tier tag: `Diamond` or `BLACK DIAMOND`
  - Can login: ✓

- [ ] **Customer Tier Detected**
  - Open browser console
  - Check: `sessionStorage.getItem('helios_customer_tier')`
  - Should return: "Diamond" or tier name

## 🧪 Testing

### Test 1: Product-Specific Discount

- [ ] Login as customer with tier
- [ ] Go to product with tier tag
- [ ] Open browser console (F12)
- [ ] Click "Mua ngay"
- [ ] Check console logs:
  ```
  [TierCheckoutButton] Found product-specific discount tag
  [TierDraftOrder] Draft order event received
  [TierDraftOrder] Creating draft order...
  [TierDraftOrder] Product-specific discount: {...}
  ```
- [ ] Redirected to Shopify invoice page
- [ ] Invoice shows correct discount

### Test 2: Standard Checkout

- [ ] Login as customer with tier
- [ ] Go to product WITHOUT tier tag
- [ ] Click "Mua ngay"
- [ ] Check console logs:
  ```
  [TierCheckoutButton] Using standard checkout with discount
  ```
- [ ] Redirected to `/checkout?discount=HELIOS_DIAMOND_20`

### Test 3: Cart Checkout

- [ ] Add product with tier tag to cart
- [ ] Open cart drawer
- [ ] Click "Thanh toán"
- [ ] Check console logs:
  ```
  [TierDraftOrder] Cart has product-specific discount
  ```
- [ ] Draft order created
- [ ] Redirected to invoice

### Test 4: Mixed Cart

- [ ] Add 2 products:
  - Product A: has tier tag
  - Product B: no tier tag
- [ ] Checkout
- [ ] Draft order created with both discounts
- [ ] Verify in Shopify Admin → Orders → Drafts

## 🔍 Verification

### Browser Console

- [ ] No JavaScript errors
- [ ] All scripts loaded:
  ```javascript
  [TierPricing] Script loaded
  [TierCheckoutButton] Script loaded
  [TierDraftOrder] Script loaded
  [TierProductDiscount] Script loaded
  [TierCartDrawer] Script loaded
  ```

### Network Tab

- [ ] `POST /cart/add.js` - Success (200)
- [ ] `GET /products/{handle}.js` - Success (200)
- [ ] `GET /cart.js` - Success (200)
- [ ] `POST https://helios-tier-pricing-api-h543.vercel.app/api/create-draft-order` - Success (200)

### Shopify Admin

- [ ] Draft order created
- [ ] Customer assigned
- [ ] Line items correct
- [ ] Line item discounts applied
- [ ] Total price correct
- [ ] Invoice URL works

## 🚨 Common Issues

### Issue: "Customer information not found"
- [ ] Check: Customer is logged in
- [ ] Check: `getCustomerId()` returns value
- [ ] Check: `getCustomerEmail()` returns value

### Issue: "Failed to create draft order"
- [ ] Check: Vercel API logs
- [ ] Check: Shopify API credentials
- [ ] Check: Network tab response

### Issue: No discount applied
- [ ] Check: Product tag format correct
- [ ] Check: Customer tier in sessionStorage
- [ ] Check: Console logs for discount detection

### Issue: Redirect to cart instead of invoice
- [ ] Check: API response has `invoice_url`
- [ ] Check: Draft order status in Shopify
- [ ] Check: Console logs for errors

## 📊 Success Criteria

- [x] Backend API deployed and accessible
- [x] All frontend scripts included in theme
- [x] Scripts load without errors
- [ ] Product-specific discount detected correctly
- [ ] Draft order created with line item discounts
- [ ] Customer redirected to invoice
- [ ] Customer can complete payment
- [ ] Order appears in Shopify admin

## 📝 Notes

**Deployment Date:** _____________

**Tested By:** _____________

**Issues Found:** 
- _____________
- _____________

**Next Steps:**
- _____________
- _____________

## 🎉 Ready for Production?

- [ ] All tests passed
- [ ] No console errors
- [ ] Draft orders created successfully
- [ ] Invoices work correctly
- [ ] Customer can complete payment
- [ ] Monitoring setup (optional)
- [ ] Error tracking setup (optional)

**Status:** ⏳ In Progress / ✅ Ready / ❌ Issues Found

**Sign-off:** _____________
