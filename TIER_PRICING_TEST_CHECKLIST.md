# Checklist Kiểm Tra Tier Pricing Scope

## ✅ Chuẩn Bị

### 1. Tạo Sản Phẩm Test
- [ ] Tạo sản phẩm A: thêm tag `tier-pricing`
- [ ] Tạo sản phẩm B: không có tag
- [ ] Tạo sản phẩm C: thêm tag `no-tier`

### 2. Tạo Collection Test
- [ ] Tạo collection "VIP Products" (handle: `vip-products`)
- [ ] Thêm 2-3 sản phẩm vào collection này
- [ ] Tạo collection "Regular Products" (handle: `regular-products`)
- [ ] Thêm 2-3 sản phẩm vào collection này

### 3. Tạo Test Customer
- [ ] Tạo customer test với email: test@example.com
- [ ] Thêm tag tier (VD: `BLACK DIAMOND`)
- [ ] Hoặc set total_spent >= ngưỡng tier

---

## 🧪 Test Case 1: Tất Cả Sản Phẩm (Mặc định)

### Cấu hình:
```
Tier Pricing: ✅ Bật
Áp dụng cho: Tất cả sản phẩm
```

### Kiểm tra:
- [ ] Vào trang sản phẩm A → Có tier pricing ✅
- [ ] Vào trang sản phẩm B → Có tier pricing ✅
- [ ] Vào trang sản phẩm C → Có tier pricing ✅
- [ ] Thêm cả 3 vào cart → Tất cả đều được giảm giá ✅

**Kết quả mong đợi:** Tất cả sản phẩm đều có tier pricing

---

## 🧪 Test Case 2: Chỉ Sản Phẩm Có Tag

### Cấu hình:
```
Tier Pricing: ✅ Bật
Áp dụng cho: Sản phẩm có tag cụ thể
Product Tags: tier-pricing
```

### Kiểm tra:
- [ ] Vào trang sản phẩm A (có tag `tier-pricing`) → Có tier pricing ✅
- [ ] Vào trang sản phẩm B (không có tag) → KHÔNG có tier pricing ❌
- [ ] Vào trang sản phẩm C (tag khác) → KHÔNG có tier pricing ❌
- [ ] Thêm A + B vào cart → Chỉ A được giảm giá ✅

**Kết quả mong đợi:** Chỉ sản phẩm A có tier pricing

### Kiểm tra Multiple Tags:
```
Product Tags: tier-pricing, vip, premium
```
- [ ] Thêm tag `vip` cho sản phẩm B
- [ ] Reload trang sản phẩm B → Có tier pricing ✅

---

## 🧪 Test Case 3: Collections Cụ Thể

### Cấu hình:
```
Tier Pricing: ✅ Bật
Áp dụng cho: Collections cụ thể
Collection Handles: vip-products
```

### Kiểm tra:
- [ ] Vào collection "VIP Products" → Tất cả sản phẩm có tier pricing ✅
- [ ] Vào collection "Regular Products" → KHÔNG có tier pricing ❌
- [ ] Vào trang sản phẩm trong VIP collection → Có tier pricing ✅
- [ ] Vào trang sản phẩm KHÔNG trong VIP collection → KHÔNG có tier pricing ❌

**Kết quả mong đợi:** Chỉ sản phẩm trong VIP collection có tier pricing

### Kiểm tra Multiple Collections:
```
Collection Handles: vip-products, premium-collection
```
- [ ] Tạo collection "Premium Collection" (handle: `premium-collection`)
- [ ] Sản phẩm trong cả 2 collections đều có tier pricing ✅

---

## 🧪 Test Case 4: Loại Trừ Sản Phẩm

### Cấu hình:
```
Tier Pricing: ✅ Bật
Áp dụng cho: Loại trừ sản phẩm có tag
Product Tags: no-tier, sale
```

### Kiểm tra:
- [ ] Vào trang sản phẩm A (không có tag `no-tier`) → Có tier pricing ✅
- [ ] Vào trang sản phẩm B (không có tag `no-tier`) → Có tier pricing ✅
- [ ] Vào trang sản phẩm C (có tag `no-tier`) → KHÔNG có tier pricing ❌
- [ ] Thêm A + C vào cart → Chỉ A được giảm giá ✅

**Kết quả mong đợi:** Tất cả sản phẩm có tier pricing TRỪ sản phẩm C

---

## 🧪 Test Case 5: Cart Drawer

### Cấu hình:
```
Tier Pricing: ✅ Bật
Áp dụng cho: Sản phẩm có tag cụ thể
Product Tags: tier-pricing
```

### Chuẩn bị:
- Sản phẩm A (có tag `tier-pricing`): 1,000,000 VND
- Sản phẩm B (không có tag): 500,000 VND
- Tier discount: 20%

### Kiểm tra:
- [ ] Thêm sản phẩm A vào cart
- [ ] Mở cart drawer
- [ ] Kiểm tra giá A: 800,000 VND (giảm 20%) ✅
- [ ] Thêm sản phẩm B vào cart
- [ ] Kiểm tra giá B: 500,000 VND (không giảm) ✅
- [ ] Tổng cộng: 1,300,000 VND ✅
- [ ] Hiển thị "Giảm giá [TIER]": -200,000 VND ✅

**Kết quả mong đợi:** 
- Subtotal: 1,500,000 VND
- Tier discount: -200,000 VND (chỉ áp dụng cho A)
- Total: 1,300,000 VND

---

## 🧪 Test Case 6: Quickbuy Modal

### Cấu hình:
```
Tier Pricing: ✅ Bật
Áp dụng cho: Sản phẩm có tag cụ thể
Product Tags: tier-pricing
```

### Kiểm tra:
- [ ] Vào collection page
- [ ] Click quickbuy cho sản phẩm A (có tag) → Có tier pricing ✅
- [ ] Click quickbuy cho sản phẩm B (không có tag) → KHÔNG có tier pricing ❌
- [ ] Đổi variant trong modal → Giá tier cập nhật đúng ✅

---

## 🧪 Test Case 7: Auto Discount Code

### Cấu hình:
```
Tier Pricing: ✅ Bật
Áp dụng cho: Sản phẩm có tag cụ thể
Product Tags: tier-pricing
```

### Kiểm tra:
- [ ] Đăng nhập với customer có tier
- [ ] Thêm sản phẩm A (có tag) vào cart
- [ ] Click "Checkout"
- [ ] Kiểm tra URL có `?discount=BLACK-DIAMOND-20` ✅
- [ ] Discount code tự động apply ✅

**Lưu ý:** Auto discount vẫn apply cho toàn bộ cart, nhưng giá hiển thị chỉ giảm cho sản phẩm đủ điều kiện.

---

## 🧪 Test Case 8: Guest User (Không đăng nhập)

### Kiểm tra:
- [ ] Logout
- [ ] Vào trang sản phẩm bất kỳ → KHÔNG có tier pricing ❌
- [ ] Giá hiển thị bình thường ✅

**Kết quả mong đợi:** Tier pricing chỉ hiển thị khi đăng nhập

---

## 🧪 Test Case 9: Customer Không Có Tier

### Chuẩn bị:
- Customer không có tag tier
- Total spent < ngưỡng tier thấp nhất

### Kiểm tra:
- [ ] Đăng nhập với customer này
- [ ] Vào trang sản phẩm → KHÔNG có tier pricing ❌
- [ ] Giá hiển thị bình thường ✅

---

## 🧪 Test Case 10: Responsive Mobile

### Kiểm tra:
- [ ] Mở DevTools (F12) → Toggle device toolbar
- [ ] Chọn iPhone/Android
- [ ] Kiểm tra tier badge hiển thị đúng ✅
- [ ] Font size tự động nhỏ lại ✅
- [ ] Cart drawer hiển thị đúng ✅

---

## 🐛 Debug Checklist

Nếu có lỗi, kiểm tra:

### Console Log (F12)
- [ ] Không có lỗi JavaScript
- [ ] Thấy log: `Helios Tier Discount: {...}`
- [ ] tierInfo có đúng scope và tags

### Network Tab
- [ ] File `tier-pricing-final.js` load thành công
- [ ] File `tier-pricing.css` load thành công

### Elements Tab
- [ ] `.tier-pricing-wrapper` có đúng data attributes:
  - `data-tier-scope`
  - `data-tier-allowed-tags`
  - `data-tier-allowed-collections`

### Settings
- [ ] Theme settings đã Save
- [ ] Tier pricing enabled = true
- [ ] Scope đã chọn đúng
- [ ] Tags/Collections đã nhập đúng (không có khoảng trắng thừa)

---

## ✅ Kết Luận

Sau khi test xong tất cả cases:
- [ ] Tất cả test cases PASS
- [ ] Không có lỗi trong console
- [ ] Giá hiển thị đúng
- [ ] Cart tính toán đúng
- [ ] Mobile responsive OK

**Ngày test:** _______________
**Người test:** _______________
**Kết quả:** ⭐⭐⭐⭐⭐
