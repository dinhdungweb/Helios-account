# Hướng dẫn Setup Vòng Quay May Mắn

## Tính năng đã thêm:

1. ✅ Chỉ khách hàng đã đăng nhập mới được quay
2. ✅ Chỉ khách hàng hạng SILVER trở lên được quay
3. ✅ Mỗi khách hàng chỉ được quay 1 lần (lưu trong localStorage)

## Logic phân hạng:

- **MEMBER**: < 3,000,000 VND (không được quay)
- **SILVER**: 3,000,000 - 5,999,999 VND ✅
- **GOLD**: 6,000,000 - 9,999,999 VND ✅
- **PLATINUM**: 10,000,000 - 19,999,999 VND ✅
- **DIAMOND**: 20,000,000 - 99,999,999 VND ✅
- **BLACK DIAMOND**: ≥ 100,000,000 VND ✅

## Cách hoạt động:

### 1. Kiểm tra đăng nhập
- Nếu chưa đăng nhập → Hiển thị nút "Đăng nhập"

### 2. Kiểm tra hạng
- Lấy hạng từ customer tags hoặc tính từ `total_spent`
- Nếu < SILVER → Thông báo chưa đủ hạng

### 3. Kiểm tra đã quay chưa
- Kiểm tra localStorage: `lucky_wheel_spun_{customer_id}`
- Kiểm tra metafield (optional): `customer.metafields.custom.lucky_wheel_spun`

### 4. Sau khi quay
- Lưu vào localStorage
- Vô hiệu hóa nút quay
- Hiển thị kết quả

## Setup Metafield (Optional - để đồng bộ giữa các thiết bị):

### Bước 1: Tạo Metafield Definition
1. Vào Shopify Admin → Settings → Custom data → Customers
2. Click "Add definition"
3. Điền thông tin:
   - **Name**: Lucky Wheel Spun
   - **Namespace and key**: `custom.lucky_wheel_spun`
   - **Type**: True or false
   - **Description**: Đánh dấu khách hàng đã quay vòng quay may mắn

### Bước 2: Tạo Shopify Flow hoặc App để cập nhật Metafield
Vì Liquid không thể cập nhật metafield từ frontend, bạn cần:

**Option 1: Sử dụng Shopify Flow (nếu có Shopify Plus)**
- Trigger: Khi có webhook từ form submit
- Action: Update customer metafield

**Option 2: Tạo Custom App**
- Tạo app với quyền write customer metafields
- Endpoint để nhận request từ frontend
- Cập nhật metafield khi khách quay

**Option 3: Chỉ dùng localStorage (đơn giản nhất)**
- Hiện tại code đã dùng localStorage
- Hoạt động tốt cho hầu hết trường hợp
- Lưu ý: Khách có thể xóa localStorage để quay lại (nếu muốn chặn hoàn toàn cần dùng metafield)

## Test:

1. Đăng nhập với tài khoản MEMBER → Không được quay
2. Đăng nhập với tài khoản SILVER → Được quay 1 lần
3. Sau khi quay xong → Nút bị vô hiệu hóa
4. Reload trang → Vẫn không quay được nữa
5. Đăng xuất và đăng nhập tài khoản khác → Được quay lại

## Lưu ý:

- Hạng khách hàng được tính từ `customer.tags` hoặc `total_spent`
- LocalStorage lưu theo customer ID nên mỗi khách có trạng thái riêng
- Nếu khách xóa localStorage có thể quay lại (để chặn hoàn toàn cần backend)
