# Quick Start Guide - Tier Draft Order System

## 🚀 Deploy trong 5 phút

### 1. Setup Shopify App (2 phút)

```
Shopify Admin → Settings → Apps → Develop apps → Create app
```

**App name:** Helios Tier Pricing API

**Scopes cần enable:**
- ✅ `write_draft_orders`
- ✅ `read_products`
- ✅ `read_customers`

**Install app** → Copy **Access Token**

### 2. Deploy Vercel (2 phút)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables
vercel env add SHOPIFY_SHOP
# Nhập: your-store.myshopify.com

vercel env add SHOPIFY_ACCESS_TOKEN
# Nhập: shpat_xxxxx (token từ bước 1)

# Deploy production
vercel --prod
```

**Lưu lại URL:** `https://your-app.vercel.app`

### 3. Setup Product Tags (1 phút)

Vào Shopify Admin → Products → Thêm tags:

```
tier-diamond-25
tier-platinum-20
tier-gold-15
```

Format: `tier-{tier_name}-{discount_percent}`

### 4. Test

1. Login với customer có tier
2. Vào product có tag discount
3. Click "Mua ngay"
4. ✅ Redirect đến draft order invoice

## 📋 Checklist

- [ ] Shopify app created với đúng scopes
- [ ] Vercel deployed với environment variables
- [ ] Product tags added
- [ ] Test với customer có tier
- [ ] Check Vercel logs: `vercel logs`

## 🐛 Troubleshooting

**API returns 401?**
→ Check SHOPIFY_ACCESS_TOKEN

**No discount applied?**
→ Check product tag format: `tier-{tier}-{percent}`

**Redirect to checkout instead of draft order?**
→ Verify product có tag product-specific discount

## 📚 Full Documentation

- [TIER_DRAFT_ORDER_DEPLOYMENT.md](./TIER_DRAFT_ORDER_DEPLOYMENT.md) - Chi tiết deployment
- [api/README.md](./api/README.md) - API documentation
- [TIER_PRODUCT_SPECIFIC_DISCOUNT.md](./TIER_PRODUCT_SPECIFIC_DISCOUNT.md) - Product discount guide

## 🎯 Next Steps

1. Test với nhiều products khác nhau
2. Monitor Vercel logs
3. Add thêm product tags theo nhu cầu
4. Customize discount percentages
