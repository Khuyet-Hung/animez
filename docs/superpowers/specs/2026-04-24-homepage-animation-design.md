# Spec: Homepage Animation Cinematic

## Bối cảnh

Animez hiện có homepage gồm các khối chính:

- Hero banner nổi bật ở đầu trang.
- Section `Trending` dùng `HorizontalScroll`.
- Section `Top All Time` dùng grid card.
- Hệ card anime tái sử dụng qua nhiều page.

Stack hiện tại phù hợp để triển khai animation bằng `framer-motion` vì dự án đã cài sẵn thư viện này cùng với Next.js, React và Tailwind. Mục tiêu không phải làm homepage thành một landing page quá phô diễn, mà tạo cảm giác cinematic đậm hơn khi người dùng vào trang và tương tác với nội dung.

## Mục tiêu

- Tạo cảm giác "anime trailer" khi vừa vào homepage.
- Tăng độ sống động cho card và section khi cuộn.
- Giữ việc duyệt nội dung nhanh, không hy sinh khả năng đọc và điều hướng.
- Tái sử dụng được một phần animation cho các page khác sau này.

## Ngoài phạm vi

- Không thêm animation phức tạp cho toàn site trong phase này.
- Không dùng timeline scroll nặng, pin section, hoặc scene-based storytelling kiểu landing page marketing.
- Không thêm thư viện mới như GSAP ở phase đầu.
- Không thay đổi layout, nội dung, hoặc luồng dữ liệu hiện có.

## Cách tiếp cận được chọn

Chọn hướng `cinematic có kiểm soát`, kết hợp:

- Entrance animation cho hero.
- Scroll reveal cho section và nhóm card.
- Hover animation nhất quán cho anime card.

Lý do chọn:

- Phù hợp với homepage hiện tại hơn scroll-heavy animation.
- Tận dụng được `framer-motion` mà không làm code phức tạp quá mức.
- Dễ kiểm soát hiệu năng trên mobile và danh sách card dài.

## Phương án đã cân nhắc

### 1. Scroll-heavy cinematic

Đặc điểm:

- Hero, title và card đều phụ thuộc mạnh vào scroll progress.
- Có thể dùng parallax sâu, scrub animation, hoặc pin section.

Ưu điểm:

- Tạo ấn tượng mạnh.

Nhược điểm:

- Dễ làm homepage chậm và khó tune trên mobile.
- Không phù hợp với mục tiêu duyệt nội dung nhanh.

### 2. Hover + entrance tối giản

Đặc điểm:

- Chủ yếu tập trung vào lúc page load và khi rê chuột.

Ưu điểm:

- Dễ triển khai, ít rủi ro.

Nhược điểm:

- Thiếu chiều sâu cinematic khi người dùng cuộn qua các section.

### 3. Mix entrance + hover + scroll nhẹ

Đây là phương án được chọn.

Ưu điểm:

- Giữ được cảm giác premium khi vào trang.
- Vẫn có chuyển động khi cuộn nhưng không gây mệt.
- Dễ kiểm soát phạm vi và tái sử dụng.

## Kiến trúc animation

### 1. HeroSection

Mục tiêu:

- Hero phải là điểm nhấn thị giác lớn nhất trên homepage.

Hiệu ứng:

- Banner image: `opacity` từ `0 -> 1`, `scale` từ khoảng `1.06 -> 1`.
- Overlay gradient: fade-in chậm hơn image một nhịp để tạo chiều sâu.
- Nội dung text: badge, score, genre, title, description, CTA xuất hiện theo `stagger`.
- Scroll parallax nhẹ cho background hero, biên độ nhỏ để không ảnh hưởng readability.

Nguyên tắc:

- Title và CTA phải luôn dễ đọc.
- Không làm text chạy quá xa hoặc quá chậm.
- Không loop animation liên tục trong hero.

### 2. Section Reveal

Áp dụng cho:

- `Trending`
- `Top All Time`

Hiệu ứng:

- Section heading trượt nhẹ từ trái sang và fade vào.
- Nội dung section reveal khi vào viewport lần đầu.
- Card trong mỗi section vào theo `stagger`, tránh đồng loạt.

Nguyên tắc:

- Mỗi section chỉ animate một lần.
- `Trending` và `Top All Time` dùng cùng pattern để giao diện nhất quán.

### 3. AnimeCard Hover System

Mục tiêu:

- Khi rê chuột vào card, người dùng cảm thấy card "sống" hơn nhưng vẫn rõ nội dung.

Hiệu ứng:

- Card nhấc lên nhẹ bằng `translateY`.
- Poster scale lên nhẹ.
- Shadow đậm hơn.
- Border hoặc glow màu brand `#f49e0b` tăng nhẹ.
- Overlay gradient fade-in.
- CTA trong overlay hiện ra nhanh hơn image scale để cảm giác phản hồi tốt.

Nguyên tắc:

- Không tilt quá mạnh.
- Chỉ dùng transform và opacity làm chính.
- Hiệu ứng hover phải gọn để không làm card rung hoặc mất ổn định bố cục.

### 4. Navbar Motion Nhẹ

Phạm vi:

- Logo hover.
- Search box focus.

Hiệu ứng:

- Logo scale nhẹ và tăng nhấn màu.
- Search box khi focus có cảm giác active rõ hơn qua border/glow hoặc scale rất nhỏ.

Nguyên tắc:

- Navbar không được cạnh tranh spotlight với hero.

## Thư viện

### `framer-motion`

Thư viện chính cho phase này.

Dùng cho:

- `motion.*`
- `variants`
- `whileHover`
- `whileInView`
- `AnimatePresence` nếu cần cho phần overlay hoặc state nhỏ
- `useScroll` và `useTransform` cho parallax nhẹ

Lý do:

- Đã có sẵn trong dự án.
- Phù hợp với React component model hiện tại.
- Đủ cho entrance, hover, reveal và scroll animation ở mức mong muốn.

### `lottie-react`

Không phải thư viện chính cho homepage animation phase này.

Chỉ nên dùng cho:

- loader
- accent animation nhỏ, tách biệt

Không dùng cho:

- reveal section
- animation card list
- các scene chính của homepage

### GSAP / ScrollTrigger

Không dùng trong phase này.

Chỉ cân nhắc khi sau này homepage cần:

- pinned scenes
- scrub timeline phức tạp
- scroll choreography chi tiết

## Tham số motion đề xuất

Đây là baseline để triển khai thống nhất, không phải giá trị khóa cứng:

- Hero entrance:
  - duration khoảng `0.8s - 1.0s`
  - easing mềm, ưu tiên `easeOut`
- Text stagger:
  - delay giữa item khoảng `0.06s - 0.1s`
- Section reveal:
  - duration khoảng `0.5s - 0.7s`
  - `y` dịch chuyển khoảng `16px - 24px`
- Card hover:
  - scale image khoảng `1.03 - 1.08`
  - translateY card khoảng `-4px đến -8px`
  - duration khoảng `0.2s - 0.35s`
- Parallax hero:
  - biên độ nhỏ, khoảng `0 -> 30px` hoặc `0 -> 40px`

## Yêu cầu kỹ thuật

- Chỉ ưu tiên animate `transform` và `opacity`.
- Mọi reveal trong viewport nên chạy `once`.
- Tôn trọng `prefers-reduced-motion`.
- Mobile phải giảm biên độ và thời lượng.
- Không animate quá nhiều lớp đồng thời trong cùng một viewport.
- Không làm ảnh hưởng đến thao tác scroll ngang của `HorizontalScroll`.

## Tổ chức code đề xuất

Nên tách motion config thành các đơn vị tái sử dụng nhỏ:

- Một file utility hoặc constants cho animation variants dùng chung.
- Hero có variants riêng.
- Card có hover variants dùng chung.
- Section reveal có variants dùng chung.

Mục tiêu:

- Tránh lặp magic numbers giữa nhiều component.
- Dễ tune animation mà không phải sửa rải rác.

## Kế hoạch triển khai đề xuất

### Phase 1

- Thêm hero entrance animation.
- Thêm section reveal cho homepage.
- Thêm hover animation cho `AnimeCard`.

### Phase 2

- Tinh chỉnh navbar motion nhẹ.
- Thêm parallax nhẹ cho hero nếu phase 1 ổn định.

### Phase 3

- Chuẩn hóa animation primitives để tái sử dụng sang search page hoặc detail page.

## Rủi ro và cách giảm thiểu

### 1. Motion quá tay

Rủi ro:

- Trang bị cảm giác "showcase" hơn là sản phẩm duyệt anime.

Giảm thiểu:

- Giữ biên độ nhỏ.
- Hero là nơi mạnh nhất, các khu vực khác tiết chế hơn.

### 2. Hiệu năng mobile

Rủi ro:

- Nhiều card animation cùng lúc gây giật.

Giảm thiểu:

- Animate `opacity` và `transform` là chính.
- Reveal theo section, không animate quá nhiều item đồng thời.

### 3. Mất tính nhất quán

Rủi ro:

- Mỗi component dùng một kiểu easing, duration khác nhau.

Giảm thiểu:

- Chuẩn hóa motion tokens/variants ngay từ đầu.

## Kiểm thử

- Kiểm tra homepage trên desktop và mobile viewport.
- Kiểm tra `prefers-reduced-motion`.
- Kiểm tra hover card không làm layout shift.
- Kiểm tra scroll ngang ở `Trending` vẫn mượt.
- Kiểm tra fallback khi không có image hoặc hero data.

## Tiêu chí hoàn thành

- Homepage có entrance animation rõ ràng nhưng không gây chậm.
- `HeroSection`, `Trending`, `Top All Time`, `AnimeCard` đều có motion nhất quán.
- Hover card tạo cảm giác premium hơn rõ rệt.
- Không phát sinh regression về layout hoặc tương tác chính.
