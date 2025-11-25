# Tóm Tắt Thay Đổi - Tier Pricing Scope

## 📋 Tổng Quan

Đã thêm tính năng **giới hạn phạm vi áp dụng** cho Tier Pricing. Bây giờ bạn có thể chọn áp dụng tier pricing cho:
- ✅ Tất cả sản phẩm (mặc định)
- ✅ Chỉ sản phẩm có tag cụ thể
- ✅ Chỉ sản phẩm trong collections cụ thể
- ✅ Tất cả sản phẩm TRỪ những sản phẩm có tag cụ thể

---

## 📝 Files Đã Thay Đổi

### 1. `config/settings_schema.json`
**Thêm mới:**
- Setting `tier_pricing_scope` - Dropdown chọn phạm vi áp dụng
- Setting `tier_pricing_product_tags` - Nhập product tags
- Setting `tier_pricing_collection_handles` - Nhập collection handles

**Vị trí:** Ngay sau setting `tier_pricing_enabled`

### 2. `snippets/tier-price.liquid`
**Thêm mới:**
- Logic kiểm tra phạm vi áp dụng (70+ dòng code)
- Hỗ trợ 4 modes: all, tagged, collections, exclude_tagged
- Data attributes cho JavaScript: `data-tier-scope`, `data-tier-allowed-tags`, `data-tier-allowed-collections`

**Cách hoạt động:**
```liquid
{% if tier_scope == 'tagged' %}
  {% comment %} Kiểm tra product.tags {% endcomment %}
{% elsif tier_scope == 'collections' %}
  {% comment %} Kiểm tra product.collections {% endcomment %}
{% endif %}
```

### 3. `snippets/cart-drawer.liquid`
**Thêm mới:**
- Logic tính toán tier discount cho từng item trong cart
- Chỉ áp dụng discount cho items đủ điều kiện
- Tách `cart_tier_total` và `cart_non_tier_total`

**Cách hoạt động:**
```liquid
{% for item in cart.items %}
  {% if item_applies %}
    {% comment %} Áp dụng tier discount {% endcomment %}
  {% else %}
    {% comment %} Giá bình thường {% endcomment %}
  {% endif %}
{% endfor %}
```

### 4. `assets/tier-pricing-final.js`
**Thêm mới:**
- Function `checkTierApplies(product)` - Kiểm tra sản phẩm có đủ điều kiện
- Đọc scope và tags từ data attributes
- Fallback về giá bình thường nếu không đủ điều kiện

**Thay đổi:**
- `buildTierHTML(variant, product)` - Thêm parameter `product`
- Extract thêm `scope`, `allowedTags`, `allowedCollections` từ DOM

### 5. `snippets/tier-auto-discount.liquid`
**Thêm mới:**
- Lưu scope info vào sessionStorage
- `helios_tier_scope`, `helios_tier_tags`, `helios_tier_collections`

**Lưu ý:** Auto discount vẫn apply cho toàn bộ cart (Shopify limitation)

---

## 🎯 Cách Sử Dụng

### Bước 1: Cấu hình trong Theme Settings

```
1. Vào Shopify Admin → Themes → Customize
2. Mở Theme Settings → Tier Pricing
3. Chọn "Áp dụng cho": [Chọn 1 trong 4 options]
4. Nhập tags hoặc collection handles (tùy option)
5. Save
```

### Bước 2: Tag Sản Phẩm (Nếu dùng option 2 hoặc 4)

```
1. Vào Products → [Chọn sản phẩm]
2. Scroll xuống "Tags"
3. Thêm tag (VD: tier-pricing)
4. Save
```

### Bước 3: Kiểm Tra

```
1. Đăng nhập với customer có tier
2. Vào trang sản phẩm
3. Kiểm tra có hiển thị tier pricing không
```

---

## 🔧 Technical Details

### Logic Flow

```
1. User vào trang sản phẩm
   ↓
2. Liquid template kiểm tra:
   - tier_pricing_enabled = true?
   - tier_scope = ?
   - product có đủ điều kiện?
   ↓
3. Nếu đủ điều kiện:
   - Render tier-pricing-wrapper với data attributes
   - JavaScript extract tier info
   ↓
4. Khi user đổi variant:
   - JavaScript intercept jQuery .html()
   - Kiểm tra lại điều kiện
   - Build tier HTML hoặc regular HTML
   ↓
5. Khi add to cart:
   - Cart drawer loop qua items
   - Kiểm tra từng item
   - Tính discount riêng cho từng item
```

### Data Flow

```
Theme Settings
    ↓
tier_pricing_scope
tier_pricing_product_tags
tier_pricing_collection_handles
    ↓
Liquid Template (tier-price.liquid)
    ↓
HTML data-* attributes
    ↓
JavaScript (tier-pricing-final.js)
    ↓
tierInfo object
    ↓
checkTierApplies(product)
    ↓
buildTierHTML() or regular HTML
```

---

## ⚠️ Lưu Ý Quan Trọng

### 1. Product JSON Limitation
- Product JSON không luôn có `collections` array
- Nên dùng tags thay vì collections nếu có thể
- Collections check chủ yếu dựa vào Liquid template

### 2. Cart Discount
- Cart drawer tính đúng discount cho từng item
- Nhưng Shopify checkout vẫn apply discount code cho toàn cart
- Đây là limitation của Shopify (không thể apply discount cho từng item)

### 3. Performance
- Mỗi item trong cart phải loop qua tags/collections
- Nếu cart có nhiều items (>20), có thể hơi chậm
- Recommend: Dùng tags thay vì collections (nhanh hơn)

### 4. Cache
- Browser có thể cache JavaScript
- Nếu thay đổi settings không có hiệu lực, clear cache
- Hard reload: Ctrl + Shift + R (Windows) / Cmd + Shift + R (Mac)

---

## 🧪 Testing

Đã tạo 2 files hướng dẫn:

1. **TIER_PRICING_SCOPE_GUIDE.md**
   - Hướng dẫn chi tiết cách cấu hình
   - Ví dụ thực tế
   - Troubleshooting

2. **TIER_PRICING_TEST_CHECKLIST.md**
   - 10 test cases chi tiết
   - Checklist từng bước
   - Debug guide

---

## 🚀 Rollback (Nếu Cần)

Nếu muốn quay lại version cũ (áp dụng cho tất cả sản phẩm):

### Option 1: Dùng Settings
```
Áp dụng cho: Tất cả sản phẩm
```

### Option 2: Revert Code
```bash
# Revert các files đã thay đổi
git checkout HEAD~1 config/settings_schema.json
git checkout HEAD~1 snippets/tier-price.liquid
git checkout HEAD~1 snippets/cart-drawer.liquid
git checkout HEAD~1 assets/tier-pricing-final.js
git checkout HEAD~1 snippets/tier-auto-discount.liquid
```

---

## 📊 Impact Analysis

### Pros ✅
- Linh hoạt hơn trong việc áp dụng tier pricing
- Có thể test tier pricing với một số sản phẩm trước
- Tránh conflict với sản phẩm đang sale
- Tạo cảm giác exclusive cho sản phẩm VIP

### Cons ⚠️
- Code phức tạp hơn
- Cần cấu hình thêm (tags/collections)
- Performance có thể chậm hơn một chút (negligible)
- Cần test kỹ hơn

### Backward Compatibility ✅
- Hoàn toàn tương thích với code cũ
- Mặc định: "Tất cả sản phẩm" (giống như trước)
- Không cần thay đổi gì nếu muốn giữ nguyên behavior cũ

---

## 📞 Support

Nếu gặp vấn đề:

1. Kiểm tra Console (F12) xem có lỗi không
2. Kiểm tra settings đã save chưa
3. Kiểm tra product tags/collections đúng chưa
4. Xem file TIER_PRICING_SCOPE_GUIDE.md phần Troubleshooting
5. Chạy qua TIER_PRICING_TEST_CHECKLIST.md

---

## 📅 Version History

**Version 2.0** (Hôm nay)
- ✅ Thêm scope filtering
- ✅ Hỗ trợ tags và collections
- ✅ Cart drawer tính toán riêng từng item
- ✅ JavaScript check điều kiện

**Version 1.0** (Trước đây)
- Áp dụng cho tất cả sản phẩm
- Không có filtering

---

## ✅ Checklist Deploy

Trước khi deploy lên production:

- [ ] Test tất cả 10 test cases
- [ ] Kiểm tra không có lỗi JavaScript
- [ ] Test trên mobile
- [ ] Test với nhiều customers khác nhau
- [ ] Test cart với nhiều items
- [ ] Backup theme trước khi deploy
- [ ] Deploy lên theme test trước
- [ ] Có plan rollback nếu cần

**Ready to deploy!** 🚀
