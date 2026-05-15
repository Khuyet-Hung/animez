# AnimeZ.site - Performance Analysis Report

## Tổng Quan

Dựa trên:

* Lighthouse DevTools
* WebPageTest
* Waterfall analysis
* Asset breakdown
* JavaScript profiling

Website hiện tại KHÔNG gặp vấn đề nghiêm trọng về architecture frontend, nhưng đang có bottleneck lớn ở image delivery và external dependency.

---

# 1. Performance Score Thấp Trong Lighthouse Mobile

## Hiện trạng

* Lighthouse Performance Score: ~55
* Largest Contentful Paint (LCP): ~10.2s (DevTools)
* Total Blocking Time (TBT): ~570ms
* Speed Index: ~4.7s

Tuy nhiên:

WebPageTest cho kết quả tốt hơn đáng kể:

* LCP: ~3.6s
* TBT: ~41ms
* Fully Loaded: ~3.5s

=> Chênh lệch này cho thấy:

* Website không thực sự quá chậm
* Lighthouse DevTools đang phạt mạnh mobile throttling + external image loading

---

# 2. Vấn Đề Lớn Nhất: External Image Bottleneck

## Root Cause

Website đang phụ thuộc nhiều vào:

```text
s4.anilist.co
```

Đây là CDN ảnh external của AniList.

## Dữ liệu thực tế

### Asset Breakdown

* Total image bytes: ~1.3MB
* Riêng s4.anilist.co:

  * ~962KB
  * 16 requests

### Kết quả

* External DNS lookup
* TLS handshake
* Không kiểm soát cache
* Không optimize theo device size
* LCP image render muộn

---

# 3. Largest Contentful Paint (LCP) Cao

## Hiện trạng

LCP trong Lighthouse:

* ~10.2s

LCP trong WebPageTest:

* ~3.6s

## Root Cause

LCP element gần như chắc chắn là:

* Hero banner anime
  hoặc
* Trending anime image

Các image này:

* được load từ external CDN
* kích thước lớn
* không preload
* chưa optimize cho mobile

---

# 4. Image Payload Quá Lớn

## Hiện trạng

Image payload:

* ~1.3MB

Đối với mobile:

* khá nặng cho first screen rendering

## Khả năng cao đang xảy ra

* Load full-size banner
* Ảnh có độ phân giải quá cao
* Chưa dùng responsive image
* Chưa resize theo viewport
* Chưa preload đúng LCP image

---

# 5. Quá Nhiều External Requests

## Domains external

Hiện tại website request tới:

* s4.anilist.co
* googlesyndication.com
* doubleclick.net
* adtrafficquality.google

## Tác động

* Tăng network latency
* Tăng DNS/TLS overhead
* Tăng contention trên mobile network
* Giảm stability của performance

---

# 6. AdSense Đang Tăng Network Cost

## Hiện trạng

Google Ads requests:

* ~254KB

## Tác động

Không phải bottleneck chính,
nhưng:

* tăng request count
* tăng JS execution
* ảnh hưởng mobile performance

---

# 7. JavaScript Không Quá Tệ

## Đây là điểm tốt

WebPageTest cho thấy:

* JS execution ~600ms
* TBT ~41ms

=> frontend architecture tương đối ổn.

Website KHÔNG gặp:

* hydration disaster
* main-thread blocking nghiêm trọng
* React rendering issue lớn

---

# 8. CSS Được Optimize Khá Tốt

## Hiện trạng

CSS payload:

* ~13KB

=> Đây là điểm mạnh.

Website không bị:

* CSS bloat
* render-blocking CSS nghiêm trọng

---

# 9. CLS = 0 (Rất Tốt)

## Hiện trạng

Cumulative Layout Shift:

* 0

## Ý nghĩa

Website:

* không bị layout jump
* không bị UI shifting
* có visual stability tốt

Đây là một điểm mạnh đáng giữ.

---

# 10. CPU Và Main Thread Tương Đối Ổn

## WebPageTest

CPU Busy Time:

* ~3219ms

Nhưng:

* scripting chỉ ~608ms
* TBT chỉ ~41ms

=> CPU không phải bottleneck chính.

---

# 11. Số Lượng Request Tương Đối Cao

## Hiện trạng

Total requests:

* 76 requests

## Tác động

* tăng network overhead
* tăng waterfall depth
* ảnh hưởng mobile network

---

# 12. Hiện Tại Website Đang Bị Gì?

## KHÔNG PHẢI

❌ React architecture tệ
❌ Hydration quá nặng
❌ JS execution disaster
❌ Main-thread blocking nghiêm trọng
❌ Render-blocking CSS lớn

---

## THỰC SỰ LÀ

✅ External image latency
✅ Image payload lớn
✅ LCP image chưa optimize
✅ External CDN dependency
✅ Quá nhiều image request
✅ Mobile throttling bị Lighthouse phạt mạnh

---

# 13. Kết Luận Quan Trọng

## WebPageTest phản ánh thực tế chính xác hơn

Website:

* thực tế khá ổn
* có architecture frontend tương đối clean
* không bị JS bottleneck nghiêm trọng

---

## Bottleneck chính hiện tại

### 1. External image delivery

### 2. LCP image optimization

### 3. Image payload size

### 4. External request latency

---

# 14. Ước Lượng Sau Khi Optimize

Nếu:

* optimize image delivery
* preload hero image
* resize đúng kích thước mobile
* giảm external dependency

thì có thể đạt:

* LCP ~2–3s
* Lighthouse Mobile ~80–90

mà không cần rewrite architecture.

---

# 15. Mức Độ Ưu Tiên

## Critical

* Hero/LCP image optimization
* External image strategy

## High

* Lazy loading cho image grid
* Giảm image payload

## Medium

* AdSense optimization
* Request reduction

## Low

* JavaScript micro-optimization
* CSS optimization thêm

---

# Tổng Kết Cuối

Website hiện tại:

* có frontend architecture khá ổn
* JS execution tương đối tốt
* visual stability tốt

Nhưng đang bị:

* external image bottleneck
* image delivery chưa tối ưu
* mobile throttling impact

Đây là vấn đề phổ biến của anime/media websites sử dụng external CDN image.
