# Hướng dẫn: Tier Product-Specific Discount

## 🎯 Tính năng

Cho phép mỗi sản phẩm có % giảm giá riêng cho từng hạng thành viên, override % mặc định.

## 📝 Cách sử dụng

### 1. Setup Discount Codes trên Shopify

Tạo các discount codes theo format: `AUTO_{TIER}_{PERCENT}`

**Ví dụ:**
```
AUTO_GOLD_5     → 5% off
AUTO_GOLD_10    → 10% off (mặc định)
AUTO_GOLD_15    → 15% off
AUTO_GOLD_20    → 20% off
AUTO_GOLD_25    → 25% off

AUTO_PLATINUM_10 → 10% off
AUTO_PLATINUM_15 → 15% off (mặc định)
AUTO_PLATINUM_20 → 20% off
AUTO_PLATINUM_25 → 25% off

AUTO_DIAMOND_15  → 15% off
AUTO_DIAMOND_20  → 20% off (mặc định)
AUTO_DIAMOND_25  → 25% off
AUTO_DIAMOND_30  → 30% off
```

### 2. Tag sản phẩm

Thêm tag vào sản phẩm theo format: `tier-{tier_name}-{percent}`

**Ví dụ:**

**Sản phẩm A** (giảm giá đặc biệt cho GOLD):
- Tag: `tier-gold-20`
- Kết quả:
  - GOLD: 20% (thay vì 10% mặc định)
  - PLATINUM: 15% (dùng mặc định)
  - DIAMOND: 20% (dùng mặc định)

**Sản phẩm B** (giảm giá đặc biệt cho nhiều tier):
- Tags: `tier-gold-25`, `tier-platinum-30`
- Kết quả:
  - GOLD: 25% (override)
  - PLATINUM: 30% (override)
  - DIAMOND: 20% (dùng mặc định)

**Sản phẩm C** (không có tag đặc biệt):
- Không có tag tier
- Kết quả:
  - GOLD: 10% (mặc định từ settings)
  - PLATINUM: 15% (mặc định từ settings)
  - DIAMOND: 20% (mặc định từ settings)

### 3. Format tag

**Quy tắc:**
- Format: `tier-{tier_name}-{percent}`
- Tier name: Viết thường, không dấu
- Percent: Số nguyên từ 1-100

**Ví dụ hợp lệ:**
- ✅ `tier-gold-15`
- ✅ `tier-platinum-20`
- ✅ `tier-diamond-25`
- ✅ `tier-black-diamond-30`

**Ví dụ không hợp lệ:**
- ❌ `tier-GOLD-15` (viết hoa)
- ❌ `tier-gold-15%` (có ký tự %)
- ❌ `tier_gold_15` (dùng underscore)
- ❌ `gold-15` (thiếu prefix tier-)

## 🔄 Cách hoạt động

### Logic ưu tiên:

```
1. Kiểm tra product tag: tier-{tier}-{percent}
   ↓
2. Nếu có → Dùng % từ tag
   ↓
3. Nếu không → Dùng % mặc định từ settings
```

### Ví dụ flow:

**Customer: GOLD (10% mặc định)**

**Sản phẩm 1** (tag: `tier-gold-20`):
```
1. Detect tag: tier-gold-20
2. Extract: 20%
3. Apply code: AUTO_GOLD_20
4. Hiển thị: Giảm 20%
```

**Sản phẩm 2** (không có tag):
```
1. Không có tag đặc biệt
2. Dùng mặc định: 10%
3. Apply code: AUTO_GOLD
4. Hiển thị: Giảm 10%
```

## 📊 Ví dụ thực tế

### Case 1: Sản phẩm mới - Giảm giá mạnh

**Sản phẩm:** Nhẫn mới ra mắt
**Mục tiêu:** Tăng sales cho GOLD và PLATINUM

**Tags:**
- `tier-gold-25`
- `tier-platinum-30`

**Kết quả:**
- GOLD: 25% (thay vì 10%)
- PLATINUM: 30% (thay vì 15%)
- DIAMOND: 20% (giữ nguyên)

### Case 2: Sản phẩm cao cấp - Giảm ít

**Sản phẩm:** Nhẫn kim cương
**Mục tiêu:** Chỉ giảm cho DIAMOND

**Tags:**
- `tier-diamond-10`

**Kết quả:**
- GOLD: 10% (mặc định)
- PLATINUM: 15% (mặc định)
- DIAMOND: 10% (thay vì 20%)

### Case 3: Flash sale - Tất cả tier giảm mạnh

**Sản phẩm:** Sản phẩm sale
**Mục tiêu:** Giảm mạnh cho tất cả

**Tags:**
- `tier-gold-30`
- `tier-platinum-35`
- `tier-diamond-40`

**Kết quả:**
- GOLD: 30%
- PLATINUM: 35%
- DIAMOND: 40%

## ⚙️ Technical Details

### Files đã thêm/sửa:

1. **snippets/tier-price.liquid**
   - Thêm logic đọc product tags
   - Override tier_discount nếu có tag

2. **snippets/tier-auto-discount.liquid**
   - Lưu customer tier vào sessionStorage

3. **assets/tier-product-discount.js** (NEW)
   - Detect product tags
   - Update discount code theo sản phẩm

4. **layout/theme.liquid**
   - Load tier-product-discount.js

### SessionStorage keys:

- `helios_tier_discount`: Discount code hiện tại
- `helios_customer_tier`: Tên tier (GOLD, PLATINUM, etc.)
- `helios_tier_discount_percent`: % giảm giá
- `helios_tier_discount_source`: Nguồn (product_tag hoặc default)

## 🧪 Testing

### Test 1: Sản phẩm có tag đặc biệt

1. Tạo sản phẩm test
2. Thêm tag: `tier-gold-20`
3. Tạo discount code: `AUTO_GOLD_20` (20% off)
4. Đăng nhập với tài khoản GOLD
5. Vào trang sản phẩm
6. Kiểm tra:
   - Giá hiển thị giảm 20%
   - Console: `sessionStorage.getItem('helios_tier_discount')` → `AUTO_GOLD_20`

### Test 2: Sản phẩm không có tag

1. Tạo sản phẩm test (không tag)
2. Đăng nhập với tài khoản GOLD
3. Vào trang sản phẩm
4. Kiểm tra:
   - Giá hiển thị giảm 10% (mặc định)
   - Console: `sessionStorage.getItem('helios_tier_discount')` → `AUTO_GOLD`

### Test 3: Checkout

1. Thêm sản phẩm có tag vào giỏ
2. Click "Mua ngay" hoặc checkout
3. Kiểm tra: Mã giảm giá tự động apply đúng

## 📌 Lưu ý

1. **Phải tạo discount code trước** khi tag sản phẩm
2. **Tier name** trong tag phải khớp với settings (viết thường)
3. **Percent** phải là số nguyên (1-100)
4. **Một sản phẩm** có thể có nhiều tag cho nhiều tier
5. **Không có tag** → Dùng % mặc định (backward compatible)

## 🚀 Bulk Tagging

Để tag hàng loạt sản phẩm, dùng:

1. **Shopify Admin** → Products → Bulk Editor
2. **Shopify Flow** (nếu có Plus)
3. **CSV Import/Export**
4. **Shopify API** (cho số lượng lớn)

## 🔧 Troubleshooting

**Vấn đề:** Giá không đổi khi có tag

**Giải pháp:**
1. Kiểm tra tag format đúng chưa
2. Kiểm tra discount code đã tạo chưa
3. Hard refresh (Ctrl + Shift + R)
4. Check console: `sessionStorage.getItem('helios_tier_discount')`

**Vấn đề:** Checkout không apply mã

**Giải pháp:**
1. Kiểm tra discount code còn active không
2. Kiểm tra usage limit
3. Kiểm tra minimum order value
4. Check console có lỗi không
