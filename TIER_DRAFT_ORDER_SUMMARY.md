# 📦 Tier Draft Order - Complete Integration Summary

## 🎯 Tính Năng

Tạo draft order với **line item discounts** cho products có tier-specific discount tags, thay vì dùng discount code.

### Tại Sao Cần?

- ✅ Discount code chỉ apply cho toàn đơn hàng (order-level)
- ✅ Line item discount cho phép discount khác nhau cho từng product
- ✅ Hỗ trợ product-specific promotions cho từng tier

## 📁 Files Đã Tạo/Cập Nhật

### Backend (Vercel)
```
api/
└── create-draft-order.js          ← API endpoint tạo draft order
```

### Frontend (Shopify Theme)
```
assets/
├── tier-draft-order.js            ← ✅ Main logic tạo draft order
├── tier-checkout-button.js        ← ✅ Updated: detect product-specific discount
├── tier-product-discount.js       ← Existing: display discount
├── tier-cart-drawer.js            ← Existing: update cart prices
└── tier-pricing-final.js          ← Existing: main tier logic

layout/
└── theme.liquid                   ← ✅ Updated: include tier-draft-order.js
```

### Documentation
```
TIER_DRAFT_ORDER_TEST.md           ← Test guide với 4 test cases
PRODUCT_TAG_SETUP.md               ← Hướng dẫn setup product tags
INTEGRATION_CHECKLIST.md           ← Checklist verify tích hợp
TIER_DRAFT_ORDER_SUMMARY.md        ← File này
```

## 🔄 Flow Hoạt Động

### Scenario 1: Product Có Tier-Specific Tag

```
User clicks "Mua ngay"
    ↓
Add to cart
    ↓
Check product tags
    ↓
Found: tier-diamond-25
    ↓
Trigger: tier:create-draft-order event
    ↓
tier-draft-order.js:
  - Get cart items
  - Fetch product tags for each item
  - Calculate discount per item
  - Call API: POST /api/create-draft-order
    ↓
Backend API:
  - Create draft order in Shopify
  - Apply line item discounts
  - Return invoice_url
    ↓
Frontend:
  - Clear cart
  - Redirect to invoice_url
    ↓
Customer completes payment on invoice page
```

### Scenario 2: Product Không Có Tier-Specific Tag

```
User clicks "Mua ngay"
    ↓
Add to cart
    ↓
Check product tags
    ↓
Not found: tier-{tier}-{percent}
    ↓
Standard checkout flow
    ↓
Redirect: /checkout?discount=HELIOS_DIAMOND_20
```

## 🏷️ Product Tag Format

### Format
```
tier-{tier_name}-{discount_percent}
```

### Examples
```
tier-diamond-25        → Diamond tier: 25% discount
tier-platinum-20       → Platinum tier: 20% discount
tier-gold-15           → Gold tier: 15% discount
tier-blackdiamond-30   → Black Diamond: 30% discount
```

### Rules
- Lowercase only
- No spaces, no underscores
- Percent: 1-100
- Separator: hyphen `-`

## 🔧 Configuration

### Vercel Environment Variables
```bash
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
```

### API Endpoint
```javascript
// In tier-draft-order.js
const API_ENDPOINT = 'https://helios-tier-pricing-api-h543.vercel.app/api/create-draft-order';
```

## 🧪 Quick Test

### 1. Setup Product
```
1. Go to: Shopify Admin → Products
2. Select a product
3. Add tag: tier-diamond-25
4. Save
```

### 2. Test Checkout
```
1. Login as Diamond tier customer
2. Go to product page
3. Open browser console (F12)
4. Click "Mua ngay"
5. Watch console logs
6. Should redirect to invoice page
```

### 3. Verify Draft Order
```
1. Go to: Shopify Admin → Orders → Drafts
2. Find the draft order
3. Check line item discount: 25%
4. Check total price
```

## 📊 Key Functions

### tier-draft-order.js

```javascript
// Main function
createDraftOrderCheckout()
  - Get cart items
  - Calculate discounts
  - Call API
  - Redirect to invoice

// Get discount for each item
getItemTierDiscount(item)
  - Fetch product tags
  - Check for tier-specific tag
  - Return discount percent

// Check if cart has product-specific discounts
checkCartForProductSpecificDiscounts()
  - Loop through cart items
  - Check each product's tags
  - Return true/false
```

### tier-checkout-button.js

```javascript
// Check if product has tier-specific discount
checkProductSpecificDiscount(cartItem)
  - Fetch product data
  - Check tags
  - Return true/false

// Create "Mua ngay" button
createCustomCheckoutButtons(discountCode)
  - Find product forms
  - Create custom button
  - Add click handler
  - Trigger draft order or standard checkout
```

## 🎨 UI/UX

### "Mua ngay" Button
- Color: Gold (#fab320)
- Hover: Black background, gold text
- Loading state: "Đang xử lý..."
- Disabled during processing

### Console Logs
```
[TierCheckoutButton] - Checkout button actions
[TierDraftOrder] - Draft order creation
[TierPricing] - Tier detection
[TierProductDiscount] - Product discount display
```

## 🚨 Error Handling

### Frontend
```javascript
try {
  await createDraftOrderCheckout();
} catch (error) {
  console.error('[TierDraftOrder] Error:', error);
  alert('Có lỗi xảy ra. Vui lòng thử lại!');
  // Restore button state
}
```

### Backend
```javascript
// Validate input
if (!customer_id && !customer_email) {
  return res.status(400).json({ error: 'Customer required' });
}

// Handle Shopify API errors
if (!response.ok) {
  const errorData = await response.json();
  return res.status(500).json({ 
    error: 'Failed to create draft order',
    details: errorData 
  });
}
```

## 📈 Monitoring

### What to Monitor
- API response times
- Draft order creation success rate
- Invoice completion rate
- Error rates

### Vercel Logs
```
1. Go to: Vercel Dashboard
2. Select project
3. Click "Logs" tab
4. Filter by function: create-draft-order
```

### Browser Console
```javascript
// Check tier detection
sessionStorage.getItem('helios_customer_tier')

// Check discount code
sessionStorage.getItem('helios_tier_discount')

// Check customer info
console.log(getCustomerId(), getCustomerEmail())
```

## ✅ Integration Status

- [x] Backend API created
- [x] Backend API deployed to Vercel
- [x] Frontend scripts created
- [x] Frontend scripts included in theme
- [x] Documentation created
- [ ] Environment variables configured
- [ ] Test product created with tags
- [ ] End-to-end testing completed
- [ ] Production deployment

## 📚 Documentation Files

1. **TIER_DRAFT_ORDER_TEST.md**
   - 4 test cases chi tiết
   - Debug checklist
   - Success criteria

2. **PRODUCT_TAG_SETUP.md**
   - Tag format và examples
   - Use cases
   - Best practices

3. **INTEGRATION_CHECKLIST.md**
   - Step-by-step verification
   - Common issues
   - Sign-off checklist

4. **TIER_DRAFT_ORDER_SUMMARY.md** (this file)
   - Complete overview
   - Quick reference

## 🎯 Next Steps

1. **Configure Vercel Environment Variables**
   ```
   SHOPIFY_STORE_DOMAIN
   SHOPIFY_ACCESS_TOKEN
   ```

2. **Create Test Product**
   - Add tag: `tier-diamond-25`

3. **Test with Real Customer**
   - Login as Diamond tier
   - Complete checkout flow

4. **Verify Draft Order**
   - Check in Shopify Admin
   - Verify discounts applied

5. **Monitor & Optimize**
   - Watch Vercel logs
   - Track conversion rates
   - Adjust discounts as needed

## 🆘 Support

### Common Questions

**Q: Tại sao dùng draft order thay vì discount code?**
A: Discount code chỉ apply cho toàn đơn, không thể có discount khác nhau cho từng product.

**Q: Customer có thể edit draft order không?**
A: Không, customer chỉ có thể thanh toán hoặc cancel.

**Q: Draft order có expire không?**
A: Có, default là 30 ngày. Có thể config trong Shopify settings.

**Q: Có thể dùng cho wholesale không?**
A: Có, rất phù hợp cho wholesale với discount khác nhau cho từng product.

### Contact

- Vercel Dashboard: https://vercel.com/dashboard
- Shopify Admin: https://[your-store].myshopify.com/admin
- API Endpoint: https://helios-tier-pricing-api-h543.vercel.app

---

**Last Updated:** December 2, 2025
**Version:** 1.0.0
**Status:** ✅ Ready for Testing
