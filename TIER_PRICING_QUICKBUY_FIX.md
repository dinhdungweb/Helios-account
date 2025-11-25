# Fix Tier Pricing trong Quickbuy Modal

## 🐛 Vấn Đề Phát Hiện

Tier pricing KHÔNG hoạt động trong quickbuy modal vì:

1. **Script chỉ load trên product page**
   - `tier-pricing-final.js` chỉ load khi `template.name == 'product'`
   - Quickbuy modal có thể mở từ collection/home page
   - Script không có sẵn để xử lý modal

2. **Event listener không đúng**
   - Code lắng nghe event `modalOpen` nhưng theme không trigger event này
   - MutationObserver cố observe `#quick-buy-modal` nhưng element chưa tồn tại khi page load

3. **Timing issue**
   - Modal được tạo động qua AJAX
   - Content được inject sau khi modal mở
   - Script cần reinit sau khi content load xong

## ✅ Giải Pháp Đã Áp Dụng

### 1. Load Script Trên Tất Cả Pages

**File:** `layout/theme.liquid`

**Trước:**
```liquid
{% if template.name == 'product' %}
  <script src="{{ 'tier-pricing-final.js' | asset_url }}" defer="defer"></script>
{% endif %}
```

**Sau:**
```liquid
<script src="{{ 'tier-pricing-final.js' | asset_url }}" defer="defer"></script>
```

**Lý do:** Quickbuy modal có thể mở từ bất kỳ page nào (collection, home, search...)

### 2. Cải Thiện Logic Detect Modal

**File:** `assets/tier-pricing-final.js`

**Thay đổi:**
- Lắng nghe click vào `[data-cc-quick-buy]` button
- Observe body để detect khi modal được tạo
- Detect khi `.product-area` được thêm vào modal
- Multiple fallbacks để đảm bảo reinit được trigger

**Code mới:**
```javascript
// Listen for quickbuy button clicks
$(document).on('click', '[data-cc-quick-buy]', function() {
  setTimeout(() => {
    const $modal = $('#quick-buy-modal');
    if ($modal.length && $modal.find('.product-area').length) {
      reinitForModal();
    }
  }, 500);
});

// Observe body for modal creation
const bodyObserver = new MutationObserver((mutations) => {
  // Detect modal creation and content injection
});
```

### 3. Tối Ưu Init Logic

**Thay đổi:**
- Kiểm tra xem page có tier pricing không trước khi init
- Tránh chạy logic không cần thiết trên pages không có tier pricing
- Giảm overhead performance

**Code mới:**
```javascript
function init() {
  const hasTierPricing = document.querySelector('.tier-pricing-wrapper');
  if (!hasTierPricing) {
    return; // Skip if no tier pricing
  }
  // ... rest of init logic
}
```

## 🔍 Cách Hoạt Động

### Flow Khi Mở Quickbuy Modal

```
1. User click vào quickbuy button ([data-cc-quick-buy])
   ↓
2. tier-pricing-final.js detect click event
   ↓
3. Wait 500ms cho modal load content
   ↓
4. Check nếu modal có .product-area
   ↓
5. Call reinitForModal()
   ↓
6. Reset tierInfo và isReady
   ↓
7. Re-run init() để extract tier info từ modal
   ↓
8. Install jQuery interceptor cho modal
   ↓
9. Tier pricing hoạt động trong modal ✅
```

### Backup Detection

Nếu click event miss, MutationObserver sẽ detect:
- Khi `#quick-buy-modal` được thêm vào DOM
- Khi `.product-area` được inject vào modal
- Trigger reinit ngay lập tức

## 🧪 Test Cases

### Test 1: Quickbuy từ Collection Page

**Setup:**
- Cấu hình: Áp dụng cho "Sản phẩm có tag cụ thể", tags: "tier-pricing"
- Sản phẩm A có tag "tier-pricing"
- Sản phẩm B không có tag

**Steps:**
1. Vào collection page
2. Click quickbuy button cho sản phẩm A
3. Modal mở ra

**Expected:**
- ✅ Modal hiển thị tier pricing cho sản phẩm A
- ✅ Giá tier đúng
- ✅ Badge tier hiển thị
- ✅ Khi đổi variant, giá tier cập nhật

**Steps:**
1. Close modal
2. Click quickbuy button cho sản phẩm B
3. Modal mở ra

**Expected:**
- ✅ Modal KHÔNG hiển thị tier pricing
- ✅ Giá bình thường hiển thị

### Test 2: Quickbuy từ Home Page

**Setup:**
- Featured collection section trên home page
- Sản phẩm có tier pricing

**Steps:**
1. Vào home page
2. Click quickbuy button

**Expected:**
- ✅ Modal hiển thị tier pricing
- ✅ Script đã được load
- ✅ Không có lỗi console

### Test 3: Multiple Quickbuy Opens

**Steps:**
1. Mở quickbuy cho sản phẩm A
2. Close modal
3. Mở quickbuy cho sản phẩm B
4. Close modal
5. Mở lại quickbuy cho sản phẩm A

**Expected:**
- ✅ Mỗi lần mở đều reinit đúng
- ✅ Tier info được extract lại
- ✅ Không có memory leak
- ✅ Không có lỗi console

### Test 4: Variant Change trong Modal

**Steps:**
1. Mở quickbuy modal
2. Đổi variant (size, color...)
3. Kiểm tra giá

**Expected:**
- ✅ Giá tier cập nhật theo variant mới
- ✅ Badge tier vẫn hiển thị
- ✅ Compare at price (nếu có) hiển thị đúng

### Test 5: Scope Filtering trong Modal

**Setup:**
- Cấu hình: Collections cụ thể "vip-products"
- Sản phẩm A trong collection "vip-products"
- Sản phẩm B không trong collection đó

**Steps:**
1. Mở quickbuy cho sản phẩm A
2. Kiểm tra tier pricing

**Expected:**
- ✅ Tier pricing hiển thị (vì trong collection)

**Steps:**
1. Close modal
2. Mở quickbuy cho sản phẩm B

**Expected:**
- ✅ Không có tier pricing (vì không trong collection)

## 🐛 Debug Guide

### Kiểm tra Script Load

**Console:**
```javascript
// Check if script loaded
console.log('tier-pricing-final.js loaded:', typeof tierInfo !== 'undefined');
```

### Kiểm tra Modal Detection

**Console:**
```javascript
// After clicking quickbuy button
setTimeout(() => {
  console.log('Modal exists:', $('#quick-buy-modal').length > 0);
  console.log('Product area exists:', $('#quick-buy-modal .product-area').length > 0);
  console.log('Tier wrapper exists:', $('#quick-buy-modal .tier-pricing-wrapper').length > 0);
}, 1000);
```

### Kiểm tra Tier Info

**Console:**
```javascript
// Check tier info in modal
$('#quick-buy-modal .tier-pricing-wrapper').data();
// Should show: tier, customerTier, tierDiscount, tierScope, etc.
```

### Common Issues

**Issue 1: Script không load**
```
Symptom: Tier pricing không hiển thị trong modal
Check: View page source → Search for "tier-pricing-final.js"
Fix: Đã fix bằng cách load script trên tất cả pages ✅
```

**Issue 2: Reinit không trigger**
```
Symptom: Modal mở nhưng giá không có tier discount
Check: Console log xem có "reinitForModal" được gọi không
Debug: Thêm console.log trong reinitForModal()
Fix: Đã fix bằng multiple detection methods ✅
```

**Issue 3: Timing issue**
```
Symptom: Đôi khi có tier pricing, đôi khi không
Check: Timing của AJAX request và reinit
Debug: Tăng timeout từ 300ms lên 500ms
Fix: Đã thêm multiple fallbacks ✅
```

**Issue 4: Scope không hoạt động**
```
Symptom: Tất cả sản phẩm đều có tier pricing trong modal
Check: Product parameter có được truyền vào tier-price snippet không
Debug: Xem HTML của modal, check data attributes
Fix: Đã fix ở update trước (thêm product parameter) ✅
```

## 📊 Performance Impact

### Before Fix
- Script chỉ load trên product page: ~15KB
- Quickbuy modal: Không có tier pricing

### After Fix
- Script load trên tất cả pages: ~15KB
- Impact: +15KB cho collection/home pages
- Benefit: Tier pricing hoạt động trong quickbuy modal ✅

### Optimization
- Script check `hasTierPricing` trước khi init
- Nếu không có tier pricing, skip toàn bộ logic
- Minimal overhead cho pages không dùng tier pricing

## ✅ Checklist

### Code Changes
- [x] Load script trên tất cả pages
- [x] Update modal detection logic
- [x] Add click event listener
- [x] Add MutationObserver for body
- [x] Optimize init logic
- [x] Add hasTierPricing check

### Testing
- [ ] Test quickbuy từ collection page
- [ ] Test quickbuy từ home page
- [ ] Test quickbuy từ search page
- [ ] Test multiple modal opens
- [ ] Test variant change trong modal
- [ ] Test scope filtering trong modal
- [ ] Test trên mobile
- [ ] Check console không có lỗi

### Documentation
- [x] Document vấn đề
- [x] Document giải pháp
- [x] Add test cases
- [x] Add debug guide

## 🚀 Deploy

### Pre-deploy Checklist
- [x] Code changes committed
- [ ] Test trên staging
- [ ] Test tất cả browsers
- [ ] Test mobile
- [ ] Performance check
- [ ] No console errors

### Deploy Steps
1. Backup theme
2. Deploy to test theme first
3. Test quickbuy modal thoroughly
4. If OK, deploy to live theme
5. Monitor for issues

### Rollback Plan
If issues occur:
```liquid
{% if template.name == 'product' %}
  <script src="{{ 'tier-pricing-final.js' | asset_url }}" defer="defer"></script>
{% endif %}
```

## 📝 Notes

### Why Load on All Pages?
- Quickbuy modal có thể mở từ bất kỳ đâu
- Collection pages, home page, search results đều có quickbuy buttons
- Không thể predict user sẽ mở modal từ page nào
- 15KB overhead là acceptable cho UX improvement

### Alternative Solutions Considered

**Option 1: Dynamic Script Loading**
```javascript
// Load script only when quickbuy clicked
$(document).on('click', '[data-cc-quick-buy]', function() {
  $.getScript('/assets/tier-pricing-final.js');
});
```
❌ Rejected: Timing issues, script might load too late

**Option 2: Inline Script in Modal**
```javascript
// Inject script into modal HTML
$modal.append('<script>/* tier pricing logic */</script>');
```
❌ Rejected: Code duplication, hard to maintain

**Option 3: Global Load (Chosen)**
```liquid
<script src="{{ 'tier-pricing-final.js' | asset_url }}" defer="defer"></script>
```
✅ Chosen: Simple, reliable, minimal overhead

---

**Updated:** Hôm nay
**Version:** 2.2
**Status:** ✅ Ready for testing
