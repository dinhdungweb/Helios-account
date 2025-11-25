# Hướng Dẫn Giới Hạn Phạm Vi Tier Pricing

## Tổng Quan

Bây giờ bạn có thể giới hạn tier pricing chỉ áp dụng cho một số sản phẩm hoặc collections cụ thể thay vì toàn bộ store.

## Cách Cấu Hình

### Bước 1: Vào Theme Settings

1. Đăng nhập Shopify Admin
2. Vào **Online Store → Themes → Customize**
3. Mở **Theme Settings** (biểu tượng bánh răng)
4. Tìm section **"Tier Pricing"**

### Bước 2: Chọn Phạm Vi Áp Dụng

Trong phần **"Giới Hạn Áp Dụng"**, bạn sẽ thấy dropdown **"Áp dụng cho"** với 4 tùy chọn:

#### Option 1: Tất cả sản phẩm (Mặc định)
- Tier pricing áp dụng cho toàn bộ sản phẩm trong store
- Không cần cấu hình thêm

#### Option 2: Sản phẩm có tag cụ thể
- Chỉ áp dụng cho sản phẩm có tag bạn chỉ định
- **Cách dùng:**
  1. Chọn "Sản phẩm có tag cụ thể"
  2. Nhập tags vào ô **"Product Tags"** (phân cách bằng dấu phẩy)
  3. Ví dụ: `tier-pricing, vip-product, premium`

**Thêm tag cho sản phẩm:**
- Vào **Products → [Chọn sản phẩm]**
- Scroll xuống phần **"Tags"**
- Thêm tag (VD: `tier-pricing`)
- Save

#### Option 3: Collections cụ thể
- Chỉ áp dụng cho sản phẩm trong collections bạn chỉ định
- **Cách dùng:**
  1. Chọn "Collections cụ thể"
  2. Nhập collection handles vào ô **"Collection Handles"** (phân cách bằng dấu phẩy)
  3. Ví dụ: `vip-collection, premium-products`

**Tìm Collection Handle:**
- Vào **Products → Collections → [Chọn collection]**
- Xem URL: `https://admin.shopify.com/store/[store-name]/collections/[handle]`
- Handle là phần cuối của URL (VD: `vip-collection`)

#### Option 4: Loại trừ sản phẩm có tag
- Áp dụng cho TẤT CẢ sản phẩm TRỪ những sản phẩm có tag bạn chỉ định
- **Cách dùng:**
  1. Chọn "Loại trừ sản phẩm có tag"
  2. Nhập tags cần loại trừ vào ô **"Product Tags"**
  3. Ví dụ: `no-tier, sale-item`

## Ví Dụ Thực Tế

### Ví Dụ 1: Chỉ áp dụng cho sản phẩm VIP

**Cấu hình:**
- Áp dụng cho: `Sản phẩm có tag cụ thể`
- Product Tags: `vip, premium, exclusive`

**Kết quả:**
- Chỉ sản phẩm có tag `vip`, `premium`, hoặc `exclusive` mới hiển thị giá tier
- Các sản phẩm khác hiển thị giá bình thường

### Ví Dụ 2: Áp dụng cho collection "Sản phẩm cao cấp"

**Cấu hình:**
- Áp dụng cho: `Collections cụ thể`
- Collection Handles: `san-pham-cao-cap, vip-products`

**Kết quả:**
- Chỉ sản phẩm trong 2 collections này mới có tier pricing
- Sản phẩm ở collections khác hiển thị giá bình thường

### Ví Dụ 3: Loại trừ sản phẩm đang sale

**Cấu hình:**
- Áp dụng cho: `Loại trừ sản phẩm có tag`
- Product Tags: `sale, clearance, no-discount`

**Kết quả:**
- Tất cả sản phẩm có tier pricing TRỪ những sản phẩm có tag `sale`, `clearance`, hoặc `no-discount`

## Lưu Ý Quan Trọng

### 1. Cart Drawer
- Cart drawer sẽ tự động tính toán giảm giá chỉ cho các sản phẩm đủ điều kiện
- Sản phẩm không đủ điều kiện vẫn tính giá bình thường

### 2. Tags Phân Biệt Hoa Thường
- Tags KHÔNG phân biệt hoa thường
- `VIP`, `vip`, `Vip` đều giống nhau

### 3. Khoảng Trắng
- Hệ thống tự động loại bỏ khoảng trắng thừa
- `vip, premium` = `vip,premium` = `vip , premium`

### 4. Multiple Tags/Collections
- Sản phẩm chỉ cần có 1 trong các tags/collections được chỉ định
- Logic: OR (hoặc), không phải AND (và)

### 5. Product JSON
- JavaScript sẽ kiểm tra tags từ product JSON
- Collections không luôn có trong product JSON, nên Liquid template sẽ xử lý chính

## Kiểm Tra Hoạt Động

### Test 1: Kiểm tra sản phẩm có tier pricing
1. Thêm tag `tier-pricing` cho 1 sản phẩm
2. Cấu hình: Áp dụng cho "Sản phẩm có tag cụ thể", tags: `tier-pricing`
3. Vào trang sản phẩm đó → Phải thấy giá tier và badge
4. Vào sản phẩm khác (không có tag) → Phải thấy giá bình thường

### Test 2: Kiểm tra cart
1. Thêm 2 sản phẩm vào cart: 1 có tier pricing, 1 không
2. Mở cart drawer
3. Kiểm tra tổng tiền: chỉ sản phẩm có tier pricing được giảm giá

### Test 3: Kiểm tra collection
1. Tạo collection "VIP Products" (handle: `vip-products`)
2. Thêm vài sản phẩm vào collection
3. Cấu hình: Collections cụ thể, handles: `vip-products`
4. Vào collection page → Tất cả sản phẩm phải có tier pricing
5. Vào collection khác → Không có tier pricing

## Troubleshooting

### Tier pricing không hiển thị
- ✅ Kiểm tra "Bật Tier Pricing" đã được bật
- ✅ Kiểm tra customer đã đăng nhập
- ✅ Kiểm tra customer có tier (tags hoặc total spent)
- ✅ Kiểm tra sản phẩm có đúng tag/collection theo cấu hình
- ✅ Xóa cache trình duyệt và reload

### Tier pricing hiển thị sai sản phẩm
- ✅ Kiểm tra lại tags của sản phẩm (Products → [Product] → Tags)
- ✅ Kiểm tra collection handles (phải đúng chính xác)
- ✅ Kiểm tra không có khoảng trắng thừa trong settings

### Cart tính sai
- ✅ Reload lại cart drawer
- ✅ Kiểm tra console log (F12) xem có lỗi không
- ✅ Kiểm tra từng item trong cart có đúng tag/collection không

## Debug Mode

Mở Console (F12) và xem log:
```javascript
// Sẽ thấy thông tin tier pricing
Helios Tier Discount: {
  code: "BLACK-DIAMOND-20",
  totalSpent: 150000000,
  tier: "BLACK DIAMOND"
}
```

## Hỗ Trợ

Nếu gặp vấn đề, cung cấp thông tin sau:
1. Cấu hình tier pricing (screenshot)
2. Tags của sản phẩm test
3. Collection handles (nếu dùng)
4. Console log (F12)
5. Screenshot lỗi
