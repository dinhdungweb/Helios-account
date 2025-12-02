# Hướng dẫn Deploy Tier Draft Order System

## Tổng quan
System này cho phép tạo draft order với line item discounts cho từng sản phẩm theo tier của customer.

## Cấu trúc Files

### Backend API
- `api/create-draft-order.js` - Serverless function tạo draft order

### Frontend Scripts
- `assets/tier-draft-order.js` - Xử lý draft order creation
- `assets/tier-checkout-button.js` - Custom checkout button với logic routing
- `assets/tier-product-discount.js` - Hiển thị discount theo product tags

### Theme Integration
- `layout/theme.liquid` - Load scripts
- `snippets/tier-price.liquid` - Hiển thị giá tier

## Bước 1: Setup Shopify Admin API

### 1.1. Tạo Custom App
1. Vào Shopify Admin → Settings → Apps and sales channels
2. Click "Develop apps" → "Create an app"
3. Đặt tên: "Helios Tier Pricing API"

### 1.2. Configure API Scopes
Vào tab "Configuration" và enable các scopes:
- `write_draft_orders` - Tạo draft orders
- `read_products` - Đọc thông tin products
- `read_customers` - Đọc thông tin customers

### 1.3. Install App và lấy Access Token
1. Click "Install app"
2. Copy "Admin API access token" (chỉ hiện 1 lần)
3. Lưu token này để dùng cho Vercel

### 1.4. Lấy Shop Domain
- Format: `your-store.myshopify.com`

## Bước 2: Deploy Backend lên Vercel

### 2.1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2.2. Login Vercel
```bash
vercel login
```

### 2.3. Deploy lần đầu
```bash
vercel
```

Chọn:
- Set up and deploy? **Y**
- Which scope? Chọn account của bạn
- Link to existing project? **N**
- Project name? `helios-tier-pricing-api`
- Directory? `./` (current directory)

### 2.4. Set Environment Variables
```bash
vercel env add SHOPIFY_SHOP
```
Nhập: `your-store.myshopify.com`

```bash
vercel env add SHOPIFY_ACCESS_TOKEN
```
Nhập: Access token từ bước 1.3

Chọn environment: **Production, Preview, Development** (all)

### 2.5. Deploy Production
```bash
vercel --prod
```

Lưu lại URL production (ví dụ: `https://helios-tier-pricing-api.vercel.app`)

## Bước 3: Update Frontend với API URL

### 3.1. Update tier-draft-order.js
File đã được config để dùng relative path `/api/create-draft-order`

Nếu cần dùng absolute URL:
```javascript
const API_ENDPOINT = 'https://your-vercel-app.vercel.app/api/create-draft-order';
```

### 3.2. Test API
```bash
curl -X POST https://your-vercel-app.vercel.app/api/create-draft-order \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "123456789",
    "items": [
      {
        "variant_id": "987654321",
        "quantity": 2,
        "price": 100,
        "discount_percent": 15
      }
    ]
  }'
```

## Bước 4: Setup Product Tags cho Product-Specific Discounts

### Format Tag
```
tier-{tier_name}-{discount_percent}
```

### Ví dụ
- `tier-diamond-25` - Diamond tier được 25% discount
- `tier-platinum-20` - Platinum tier được 20% discount
- `tier-gold-15` - Gold tier được 15% discount

### Cách thêm tags
1. Vào Shopify Admin → Products
2. Chọn product cần set discount
3. Thêm tag theo format trên
4. Save

## Bước 5: Test Flow

### 5.1. Test Product-Specific Discount
1. Login với customer có tier (ví dụ: Diamond)
2. Vào product có tag `tier-diamond-25`
3. Click "Mua ngay"
4. Kiểm tra console logs
5. Verify redirect đến draft order invoice

### 5.2. Test Standard Checkout
1. Login với customer có tier
2. Vào product KHÔNG có product-specific tag
3. Click "Mua ngay"
4. Verify redirect đến checkout với discount code

### 5.3. Test Cart Checkout
1. Add nhiều products vào cart (có cả product-specific discount)
2. Vào cart drawer
3. Click checkout
4. Verify tự động dùng draft order nếu có product-specific discount

## Bước 6: Monitor và Debug

### 6.1. Vercel Logs
```bash
vercel logs
```

### 6.2. Browser Console
Mở DevTools → Console để xem logs:
- `[TierDraftOrder]` - Draft order operations
- `[TierCheckoutButton]` - Checkout button logic
- `[TierProductDiscount]` - Product discount display

### 6.3. Common Issues

**Issue: API returns 401 Unauthorized**
- Check SHOPIFY_ACCESS_TOKEN đúng chưa
- Verify app có đủ scopes

**Issue: Draft order không có discount**
- Check product tags format đúng chưa
- Verify customer tier trong sessionStorage
- Check console logs để xem discount calculation

**Issue: Redirect về checkout thay vì draft order**
- Verify product có tag product-specific discount
- Check `checkProductSpecificDiscount()` function

## Bước 7: Production Checklist

- [ ] Shopify Custom App đã được install
- [ ] API scopes đã được config đúng
- [ ] Vercel environment variables đã được set
- [ ] API endpoint đã được test
- [ ] Product tags đã được thêm cho products cần discount
- [ ] Frontend scripts đã được load trong theme.liquid
- [ ] Test flow với customer có tier
- [ ] Test flow với customer không có tier
- [ ] Monitor Vercel logs sau deploy

## Maintenance

### Update API
```bash
# Make changes to api/create-draft-order.js
vercel --prod
```

### Update Frontend
1. Edit files trong `assets/`
2. Upload lên Shopify theme
3. Test trên development theme trước
4. Publish lên production theme

### Rollback
```bash
vercel rollback
```

## Support

Nếu có vấn đề:
1. Check Vercel logs: `vercel logs`
2. Check browser console logs
3. Verify Shopify API credentials
4. Test API endpoint trực tiếp với curl

## Notes

- Draft orders có thời hạn 30 ngày
- Customer phải thanh toán qua invoice URL
- Line item discounts được apply trực tiếp, không dùng discount codes
- System tự động clear cart sau khi tạo draft order thành công
