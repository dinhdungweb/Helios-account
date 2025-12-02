# Hướng Dẫn Test Tier Draft Order

## 🎯 Mục Đích
Test flow tạo draft order với line item discounts cho products có tier-specific discount tags.

## 📋 Chuẩn Bị

### 1. Backend API
- ✅ Đã deploy tại: https://helios-tier-pricing-api-h543.vercel.app
- ✅ Endpoint: `/api/create-draft-order`

### 2. Frontend Files
- ✅ `assets/tier-draft-order.js` - Xử lý draft order creation
- ✅ `assets/tier-checkout-button.js` - Detect product-specific discount
- ✅ `layout/theme.liquid` - Đã include scripts

### 3. Product Setup
Cần có product với tag theo format: `tier-{tier}-{percent}`

**Ví dụ:**
- `tier-diamond-25` - Diamond tier được 25% discount
- `tier-platinum-20` - Platinum tier được 20% discount
- `tier-gold-15` - Gold tier được 15% discount

## 🧪 Test Cases

### Test 1: Product Có Tier-Specific Discount

**Setup:**
1. Tạo/chọn 1 product
2. Add tag: `tier-diamond-25`
3. Login với customer có tier "Diamond" hoặc "BLACK DIAMOND"

**Steps:**
1. Vào product page
2. Click "Mua ngay"
3. Quan sát console logs

**Expected Result:**
```
[TierCheckoutButton] Mua ngay clicked
[TierCheckoutButton] Adding to cart...
[TierCheckoutButton] Added to cart: {...}
[TierCheckoutButton] Found product-specific discount tag: tier-diamond-25
[TierCheckoutButton] Product has specific discount, using draft order
[TierDraftOrder] Draft order event received
[TierDraftOrder] Creating draft order...
[TierDraftOrder] Current cart: {...}
[TierDraftOrder] Product-specific discount: { product: "...", percent: 25 }
[TierDraftOrder] Items with discounts: [...]
[TierDraftOrder] Draft order created: { invoice_url: "..." }
→ Redirect to Shopify invoice page
```

### Test 2: Product Không Có Tier-Specific Discount

**Setup:**
1. Chọn product KHÔNG có tag `tier-{tier}-{percent}`
2. Login với customer có tier bất kỳ

**Steps:**
1. Vào product page
2. Click "Mua ngay"

**Expected Result:**
```
[TierCheckoutButton] Mua ngay clicked
[TierCheckoutButton] Using standard checkout with discount: HELIOS_DIAMOND_20
→ Redirect to /checkout?discount=HELIOS_DIAMOND_20
```

### Test 3: Cart Checkout với Mixed Products

**Setup:**
1. Add 2 products vào cart:
   - Product A: có tag `tier-diamond-25`
   - Product B: không có tier-specific tag
2. Login với Diamond tier

**Steps:**
1. Mở cart drawer
2. Click "Thanh toán" / "Checkout"

**Expected Result:**
```
[TierDraftOrder] Cart has product-specific discount, using draft order
[TierDraftOrder] Creating draft order...
[TierDraftOrder] Product-specific discount: { product: "Product A", percent: 25 }
[TierDraftOrder] Default tier discount: { product: "Product B", percent: 20 }
→ Draft order created with both discounts
→ Redirect to invoice
```

### Test 4: Guest User (No Tier)

**Setup:**
1. Logout hoặc dùng incognito
2. Product có tag `tier-diamond-25`

**Steps:**
1. Vào product page
2. Click "Thêm vào giỏ" → "Thanh toán"

**Expected Result:**
- Không có "Mua ngay" button (chỉ có standard checkout)
- Checkout bình thường không có discount
- Không trigger draft order

## 🔍 Debug Checklist

### Console Logs
Mở Chrome DevTools → Console tab để xem logs:
- `[TierCheckoutButton]` - Checkout button actions
- `[TierDraftOrder]` - Draft order creation
- `[TierPricing]` - Tier detection

### Network Tab
Check API calls:
1. `POST /cart/add.js` - Add to cart
2. `GET /products/{handle}.js` - Fetch product tags
3. `GET /cart.js` - Get cart data
4. `POST https://helios-tier-pricing-api-h543.vercel.app/api/create-draft-order` - Create draft order

### Common Issues

**Issue 1: "Customer information not found"**
- Check: `getCustomerId()` và `getCustomerEmail()` có return value không
- Fix: Đảm bảo customer đã login

**Issue 2: "Failed to create draft order"**
- Check Network tab → Response từ API
- Verify: Shopify API credentials trong Vercel env vars
- Check: API logs trong Vercel dashboard

**Issue 3: Draft order không có discount**
- Check: Product tags format đúng chưa (`tier-{tier}-{percent}`)
- Check: Customer tier trong sessionStorage
- Check: Console logs để xem discount được detect không

**Issue 4: Redirect về cart thay vì invoice**
- Check: API response có `invoice_url` không
- Check: Draft order status trong Shopify admin

## 📊 Verify Results

### Trong Shopify Admin:
1. Go to: Orders → Drafts
2. Tìm draft order vừa tạo
3. Check:
   - ✅ Customer đúng
   - ✅ Products đúng
   - ✅ Line item discounts đúng %
   - ✅ Total price đã trừ discount

### Invoice Page:
1. Customer thấy:
   - Products với giá đã discount
   - Total amount đúng
   - Payment options
2. Customer có thể complete payment

## 🎉 Success Criteria

- ✅ Product với tier-specific tag → Draft order
- ✅ Product không có tag → Standard checkout
- ✅ Mixed cart → Draft order với correct discounts
- ✅ Guest user → Standard checkout (no discount)
- ✅ Draft order có correct line item discounts
- ✅ Customer có thể thanh toán qua invoice

## 🚀 Next Steps

Sau khi test thành công:
1. Test với nhiều tier khác nhau
2. Test với nhiều products trong cart
3. Test edge cases (empty cart, invalid tags, etc.)
4. Monitor Vercel logs để track API usage
5. Setup error tracking (Sentry, LogRocket, etc.)
