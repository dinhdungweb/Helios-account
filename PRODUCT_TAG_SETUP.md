# Product Tag Setup - Tier-Specific Discounts

## 📌 Tag Format

```
tier-{tier_name}-{discount_percent}
```

**Rules:**
- Tier name: lowercase, no spaces, no underscores
- Discount percent: integer từ 1-100
- Dấu phân cách: dấu gạch ngang `-`

## 🏷️ Tag Examples

### Diamond Tier (25% discount)
```
tier-diamond-25
tier-blackdiamond-25
```

### Platinum Tier (20% discount)
```
tier-platinum-20
```

### Gold Tier (15% discount)
```
tier-gold-15
```

### Silver Tier (10% discount)
```
tier-silver-10
```

### Member Tier (5% discount)
```
tier-member-5
```

## 🎯 Use Cases

### Case 1: Sản Phẩm Đặc Biệt Cho VIP
Product: "Limited Edition Watch"
- Tag: `tier-diamond-30`
- Result: Diamond members được 30% thay vì 20% default

### Case 2: Flash Sale Cho Tier Cao
Product: "Premium Headphones"
- Tag: `tier-platinum-25`
- Tag: `tier-diamond-30`
- Result: 
  - Platinum: 25% discount
  - Diamond: 30% discount
  - Other tiers: default discount

### Case 3: Clearance Sale
Product: "Last Season Jacket"
- Tag: `tier-member-20`
- Result: Tất cả members (kể cả tier thấp) được 20%

## 📝 How to Add Tags

### Trong Shopify Admin:

1. **Single Product:**
   - Go to: Products → [Select Product]
   - Scroll to "Tags" section
   - Add tag: `tier-diamond-25`
   - Click "Save"

2. **Bulk Edit:**
   - Go to: Products
   - Select multiple products (checkbox)
   - Click "Actions" → "Add tags"
   - Enter: `tier-diamond-25`
   - Click "Add tags"

3. **Via CSV Import:**
   ```csv
   Handle,Tags
   premium-watch,"tier-diamond-30, luxury, limited"
   gold-necklace,"tier-platinum-25, jewelry"
   ```

## 🔄 Tier Name Mapping

Code tự động normalize tier names:

| Customer Tier | Normalized | Tag Format |
|--------------|------------|------------|
| BLACK DIAMOND | blackdiamond | tier-blackdiamond-XX |
| Diamond | diamond | tier-diamond-XX |
| PLATINUM | platinum | tier-platinum-XX |
| Gold | gold | tier-gold-XX |
| Silver | silver | tier-silver-XX |
| Member | member | tier-member-XX |

**Note:** Spaces và underscores được remove, convert to lowercase

## ⚠️ Important Notes

### Priority Rules:
1. **Product-specific tag** (tier-diamond-25) → Highest priority
2. **Default tier discount** (from theme settings) → Fallback
3. **No discount** → If no tier or guest user

### Multiple Tags:
- Product có thể có nhiều tier tags
- Mỗi tier sẽ thấy discount riêng của mình
- Example:
  ```
  tier-diamond-30
  tier-platinum-25
  tier-gold-20
  ```

### Invalid Tags (Ignored):
```
❌ tier-diamond-25%  (có ký tự %)
❌ tier-diamond-abc  (không phải số)
❌ tier-diamond-150  (> 100%)
❌ tier-diamond-0    (0%)
❌ tier diamond 25   (có spaces)
❌ TIER-DIAMOND-25   (uppercase - sẽ work nhưng nên dùng lowercase)
```

### Valid Tags:
```
✅ tier-diamond-25
✅ tier-blackdiamond-30
✅ tier-platinum-20
✅ tier-gold-15
✅ tier-silver-10
✅ tier-member-5
✅ tier-diamond-1    (minimum 1%)
✅ tier-diamond-100  (maximum 100%)
```

## 🧪 Testing Tags

### Test if Tag Works:

1. **Add tag to product**
2. **Login as customer with that tier**
3. **Open browser console**
4. **Add product to cart**
5. **Check logs:**
   ```javascript
   [TierDraftOrder] Product tags: { product: "...", tags: [...] }
   [TierDraftOrder] Product-specific discount: { product: "...", percent: 25 }
   ```

### Quick Test Script:
```javascript
// Run in browser console
const tier = 'diamond';
const tags = ['tier-diamond-25', 'luxury', 'limited'];
const tierNameNormalized = tier.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
const tagPrefix = `tier-${tierNameNormalized}-`;

const matchedTag = tags.find(tag => tag.toLowerCase().startsWith(tagPrefix));
console.log('Matched tag:', matchedTag);

if (matchedTag) {
  const parts = matchedTag.split('-');
  const percent = parseInt(parts[2], 10);
  console.log('Discount percent:', percent);
}
```

## 📊 Reporting

### Find Products with Tier Tags:

**Shopify Admin Search:**
```
tag:tier-diamond-*
tag:tier-platinum-*
tag:tier-gold-*
```

**Export Products:**
1. Products → Export
2. Filter by tag
3. Analyze in Excel/Sheets

## 🎨 Best Practices

1. **Consistent Naming:**
   - Always use lowercase
   - Always use format: `tier-{tier}-{percent}`

2. **Document Your Tags:**
   - Keep a spreadsheet of products with special discounts
   - Note expiry dates for promotional discounts

3. **Regular Cleanup:**
   - Remove expired promotional tags
   - Update discount percentages seasonally

4. **Test Before Launch:**
   - Test with real customer accounts
   - Verify discounts in draft orders
   - Check invoice amounts

5. **Monitor Usage:**
   - Track which products use tier-specific discounts
   - Analyze conversion rates
   - Adjust discounts based on performance
