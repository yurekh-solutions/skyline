# Quick Stock Image Download Guide

## 🚀 Fast Track: Download All Images in 30 Minutes

### Method 1: Unsplash (Best Quality, Free)

Visit these direct Unsplash links and click "Download free":

#### Hero Images:
1. **Mumbai Bridge**: https://unsplash.com/s/photos/mumbai-bandra-worli-sea-link
2. **Office Interior**: https://unsplash.com/s/photos/modern-office-mumbai
3. **Documents**: https://unsplash.com/s/photos/business-documents-desk

#### Government Services:
4. **GST/Tax**: https://unsplash.com/s/photos/tax-documents-india
5. **Certificates**: https://unsplash.com/s/photos/certificate-document
6. **Passport**: https://unsplash.com/s/photos/indian-passport
7. **Food License**: https://unsplash.com/s/photos/restaurant-kitchen
8. **Driving**: https://unsplash.com/s/photos/driving-license-car

#### Business/Company:
9. **Handshake**: https://unsplash.com/s/photos/business-partnership
10. **Office Team**: https://unsplash.com/s/photos/office-team-india
11. **Startup**: https://unsplash.com/s/photos/startup-office-india

#### Finance/Loans:
12. **Personal Finance**: https://unsplash.com/s/photos/personal-finance-india
13. **Home Buying**: https://unsplash.com/s/photos/house-keys-india
14. **Car Purchase**: https://unsplash.com/s/photos/new-car-india
15. **Business Growth**: https://unsplash.com/s/photos/business-growth

#### Insurance:
16. **Family**: https://unsplash.com/s/photos/indian-family
17. **Health**: https://unsplash.com/s/photos/health-insurance
18. **Car Insurance**: https://unsplash.com/s/photos/car-protection

#### Travel:
19. **Bus Travel**: https://unsplash.com/s/photos/luxury-bus-india
20. **Tour**: https://unsplash.com/s/photos/india-tourism
21. **Airport**: https://unsplash.com/s/photos/airport-business-travel

---

### Method 2: Pexels (Good Alternative)

Similar searches on Pexels:
- https://www.pexels.com/search/mumbai/
- https://www.pexels.com/search/indian%20office/
- https://www.pexels.com/search/business%20documents/
- https://www.pexels.com/search/indian%20family/

---

### Method 3: AI Generation (Best for Custom)

Use **Bing Image Creator** (FREE):
https://www.bing.com/images/create

Steps:
1. Go to Bing Image Creator
2. Copy prompt from IMAGE-REQUIREMENTS.md
3. Paste and click "Create"
4. Download generated image
5. Repeat for each image needed

**Example prompt to try:**
```
Professional photograph of Mumbai's Bandra-Worli Sea Link during daytime, 
clear blue sky, modern cable-stayed bridge, wide angle, bright optimistic 
mood, high quality, ultra realistic
```

---

### Method 4: Bulk Download Tool

If you want to automate, create a simple Python script:

```python
# download_images.py
import requests
import os

UNSPLASH_ACCESS_KEY = "YOUR_KEY_HERE"  # Get free key from unsplash.com/developers

images_to_download = {
    'mumbai-daylight.jpg': 'mumbai bandra worli sea link',
    'office-reception.jpg': 'modern office reception',
    'gst-registration.jpg': 'tax documents calculator',
    # Add more...
}

for filename, query in images_to_download.items():
    url = f"https://api.unsplash.com/photos/random?query={query}&client_id={UNSPLASH_ACCESS_KEY}"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        img_url = data['urls']['regular']
        img_data = requests.get(img_url).content
        
        with open(f'assets/img/{filename}', 'wb') as f:
            f.write(img_data)
        print(f"✓ Downloaded: {filename}")
    else:
        print(f"✗ Failed: {filename}")
```

Run with: `python download_images.py`

---

## 📦 Quick Setup Checklist

1. **Create directories:**
```bash
mkdir -p assets/img/services
mkdir -p assets/img/team
mkdir -p assets/img/process
```

2. **Download hero image:** (Most important!)
   - Search "Mumbai Bandra Worli Sea Link" on Unsplash
   - Download highest resolution
   - Save as `mumbai-daylight.jpg` in `assets/img/`

3. **Use placeholder generator:**
   - Open `generate-placeholder-images.html` in browser
   - Download all placeholders
   - Save to `assets/img/`

4. **Replace gradually:**
   - Start with hero image
   - Then service page images
   - Finally team photos and icons

---

## 🎯 Priority Order

### Phase 1 (Essential - Do First):
1. ✅ mumbai-daylight.jpg (Hero)
2. ✅ mumbai-daylight-800.jpg (Mobile hero)
3. ✅ office-reception.jpg (About page)
4. ✅ team-working.jpg (About page)

### Phase 2 (Service Pages - Do Next):
5. GST, LLP, PAN card images
6. Loan-related images
7. Insurance images
8. Travel images

### Phase 3 (Enhancement - Do Last):
9. Process step images
10. Team member photos
11. Office photos
12. Icon images

---

## 💡 Pro Tips

1. **Optimize before upload:**
   - Use https://tinypng.com/
   - Reduce file size by 60-70%
   - Keep quality at 85%

2. **Consistent style:**
   - Choose images with similar lighting
   - Prefer warm tones (matches design)
   - Avoid overly dark or bright images

3. **Indian context:**
   - Use images showing Indian people
   - Indian currency (₹) in financial images
   - Recognizable Mumbai landmarks

4. **Mobile-friendly:**
   - Test images look good on small screens
   - Ensure text on images is readable
   - Consider portrait orientation alternatives

---

## 🆓 Completely Free Resources

**No signup required:**
- Unsplash.com
- Pexels.com  
- Pixabay.com
- Burst.shopify.com

**Free with signup:**
- Bing Image Creator (AI)
- Leonardo.ai (50 free/day)
- Playground AI (Free tier)

**Note:** Always check license before commercial use!

---

## ⚡ Emergency: Need Images NOW?

1. Open `generate-placeholder-images.html`
2. Download ALL placeholders (takes 5 minutes)
3. Upload to website
4. Site is functional with professional placeholders
5. Replace with real images gradually

**Placeholders look professional and maintain aspect ratios!**

---

Need help? The placeholders are already styled to match your design! 🎨
