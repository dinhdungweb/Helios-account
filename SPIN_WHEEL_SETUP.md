# Hướng dẫn Setup Vòng Quay May Mắn

## Tính năng đã thêm:

1. ✅ Chỉ khách hàng đã đăng nhập mới được quay
2. ✅ Chỉ khách hàng hạng SILVER trở lên được quay
3. ✅ Mỗi khách hàng được quay 1 lần mỗi ngày (reset lúc 00:00)

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

### 3. Kiểm tra đã quay hôm nay chưa
- Kiểm tra localStorage: `lucky_wheel_date_{customer_id}` (lưu ngày quay)
- So sánh với ngày hiện tại (format: YYYY-MM-DD)
- Nếu đã quay hôm nay → Hiển thị countdown đến 00:00

### 4. Sau khi quay
- Lưu ngày quay vào localStorage
- Lưu phần thưởng và timestamp
- Vô hiệu hóa nút quay (đến hết ngày)
- Hiển thị kết quả

### 5. Reset tự động
- Mỗi ngày lúc 00:00, khách hàng có thể quay lại
- Countdown hiển thị thời gian còn lại

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
3. Sau khi quay xong → Nút bị vô hiệu hóa, hiển thị "ĐÃ QUAY HÔM NAY"
4. Reload trang → Vẫn không quay được, hiển thị countdown
5. Đợi đến 00:00 ngày hôm sau → Được quay lại
6. Đăng xuất và đăng nhập tài khoản khác → Được quay (mỗi tài khoản riêng biệt)

## Lưu ý:

- Hạng khách hàng được tính từ `customer.tags` hoặc `total_spent`
- LocalStorage lưu theo customer ID và ngày nên mỗi khách có trạng thái riêng
- Reset tự động lúc 00:00 mỗi ngày (theo giờ máy khách)
- Countdown hiển thị thời gian còn lại đến lượt quay tiếp theo
- Nếu khách xóa localStorage có thể quay lại (để chặn hoàn toàn cần backend)

## Dữ liệu lưu trong localStorage:

- `lucky_wheel_date_{customer_id}`: Ngày quay gần nhất (YYYY-MM-DD)
- `lucky_wheel_prize_{customer_id}`: Phần thưởng đã trúng
- `lucky_wheel_prize_date_{customer_id}`: Timestamp đầy đủ của lần quay
