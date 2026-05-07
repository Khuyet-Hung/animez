# Kế hoạch triển khai trang lướt feed social

## Mục tiêu

Hiển thị các bài viết social đã được tạo từ trang detail anime thành một feed public có thể lướt liên tục. Phase đầu ưu tiên đúng dữ liệu, phân trang ổn định, UI dễ đọc và dễ mở rộng sang like/comment/following sau này.

## Phạm vi MVP

Trong phạm vi:

- Trang `/[locale]/feed` hiển thị bài viết public mới nhất.
- Feed đọc từ `social_posts`, `social_post_anime`, `social_post_images` và thông tin tác giả tối thiểu từ `profiles`.
- Dùng cursor pagination theo `created_at` và `id`.
- Dùng TanStack Query `useInfiniteQuery` cho client feed.
- Có loading, empty, error và retry state.
- Sau khi tạo bài thành công, feed có thể được invalidate/refetch.

Ngoài phạm vi MVP:

- Like, comment, share, bookmark.
- Ranking cá nhân hóa.
- Following feed.
- Moderation/report.
- Trang chi tiết bài viết.
- Realtime update.
- Backend/service feed riêng.

## Quyết định kiến trúc

### Nơi đặt logic chọn bài feed

Logic quyết định bài nào được hiển thị nên đặt ở Supabase RPC. Lý do:

- Gần dữ liệu và tận dụng index/RLS.
- Dễ kiểm soát điều kiện public/deleted.
- Dễ join dữ liệu liên quan trước khi trả cho API.
- Không đẩy rule lọc quan trọng xuống client component.

Next.js API route chỉ đóng vai trò normalize response và bảo vệ contract frontend.

Client chỉ chịu trách nhiệm cache, infinite scroll và render.

### Có cần backend riêng không?

Chưa cần. Với MVP public newest feed, Next.js API route + Supabase RPC là đủ. Backend riêng chỉ nên cân nhắc khi có ranking cá nhân hóa nặng, precompute feed, queue/background jobs, hoặc traffic đủ lớn để Supabase query trực tiếp không còn phù hợp.

## Phase 1: Data Contract và RPC

### Mục tiêu

Tạo nguồn dữ liệu feed ổn định, trả về đúng shape cho API và tránh duplicate khi phân trang.

### Công việc

- [ ] Thêm migration Supabase cho function `get_public_social_feed`.
- [ ] Function nhận `cursor_created_at timestamptz default null`, `cursor_id uuid default null`, `limit_count integer default 20`.
- [ ] Function chỉ lấy bài `visibility = 'public'` và `deleted_at is null`.
- [ ] Sort theo `created_at desc, id desc`.
- [ ] Áp cursor:
  - không có cursor: lấy page đầu.
  - có cursor: lấy bài có `(created_at, id)` nhỏ hơn cursor cuối.
- [ ] Join author từ `profiles`.
- [ ] Join anime theo `social_post_anime`, sort `sort_order asc`.
- [ ] Join images theo `social_post_images`, sort `sort_order asc`.
- [ ] Trả author tối thiểu: `user_id`, `username`, `display_name`, `avatar_url`.
- [ ] Trả post: `id`, `caption`, `description`, `created_at`, `updated_at`.
- [ ] Trả anime snapshot: `anime_id`, `role`, `episode`, `title_romaji`, `title_english`, `cover_image`, `format`, `season_year`, `sort_order`.
- [ ] Trả images: `id`, `public_url`, `width`, `height`, `sort_order`.
- [ ] Grant execute cho `anon` và `authenticated`.

### Acceptance criteria

- [ ] Anonymous user gọi RPC đọc được bài public.
- [ ] Bài `deleted_at is not null` không xuất hiện.
- [ ] Cursor page 2 không duplicate bài page 1.
- [ ] Bài có nhiều ảnh/phim phụ trả đúng thứ tự.

## Phase 2: API Route Feed

### Mục tiêu

Có API ổn định cho client gọi, tách frontend khỏi chi tiết RPC.

### Công việc

- [ ] Tạo `src/app/api/feed/route.ts`.
- [ ] Parse query params:
  - `cursorCreatedAt`
  - `cursorId`
  - `limit`
- [ ] Clamp `limit` trong khoảng hợp lý, ví dụ 1-30.
- [ ] Gọi Supabase server client và RPC `get_public_social_feed`.
- [ ] Normalize response thành:

```ts
interface SocialFeedPage {
  items: SocialFeedPost[];
  nextCursor: {
    createdAt: string;
    id: string;
  } | null;
}
```

- [ ] Nếu số item trả về nhỏ hơn limit thì `nextCursor = null`.
- [ ] Nếu lỗi RPC thì trả status 500 với message ngắn.

### Acceptance criteria

- [ ] `GET /api/feed` trả page đầu.
- [ ] `GET /api/feed?cursorCreatedAt=...&cursorId=...` trả page tiếp.
- [ ] API không leak field không dùng.
- [ ] API trả JSON nhất quán khi empty/error.

## Phase 3: Type và TanStack Query Setup

### Mục tiêu

Chuẩn bị cache client cho infinite feed.

### Công việc

- [ ] Cài `@tanstack/react-query`.
- [ ] Tạo `src/components/common/QueryProvider.tsx`.
- [ ] Bọc `QueryProvider` trong `src/app/[locale]/layout.tsx`, bên trong hoặc cùng cấp `ToastProvider`.
- [ ] Thêm type feed vào `src/types/social.ts`.
- [ ] Tạo `src/hooks/useSocialFeed.ts`.
- [ ] Hook dùng `useInfiniteQuery`.
- [ ] Query key đề xuất: `["social-feed", locale]`.
- [ ] `queryFn` gọi `/api/feed`.
- [ ] `getNextPageParam` đọc `nextCursor`.
- [ ] Thiết lập `staleTime` vừa phải, ví dụ 30-60 giây.

### Acceptance criteria

- [ ] Feed page đầu load qua TanStack Query.
- [ ] Khi gọi next page, cache giữ các page đã tải.
- [ ] Refresh route không làm vỡ provider.
- [ ] TypeScript không cần `any` cho dữ liệu feed chính.

## Phase 4: UI Trang Feed

### Mục tiêu

Tạo trải nghiệm lướt feed hoàn chỉnh, phù hợp style Animez hiện tại.

### Công việc

- [ ] Tạo `src/app/[locale]/feed/page.tsx`.
- [ ] Page render `Navbar`, nội dung feed, `Footer`.
- [ ] Tạo `src/components/social/feed/SocialFeedPage.tsx`.
- [ ] Tạo `src/components/social/feed/SocialFeedList.tsx`.
- [ ] Tạo `src/components/social/feed/SocialPostCard.tsx`.
- [ ] Tạo `src/components/social/feed/SocialPostAnime.tsx`.
- [ ] Tạo `src/components/social/feed/SocialPostImages.tsx`.
- [ ] Tạo skeleton loading cho post card.
- [ ] Tạo empty state khi không có bài.
- [ ] Tạo error state với nút retry.
- [ ] Tạo infinite scroll bằng `IntersectionObserver`.
- [ ] Hiển thị author, thời gian tương đối hoặc formatted date.
- [ ] Hiển thị caption nổi bật, description nhỏ hơn.
- [ ] Hiển thị anime chính như một khối rõ ràng có poster/title/episode.
- [ ] Hiển thị anime phụ dạng compact list.
- [ ] Hiển thị ảnh theo grid:
  - 1 ảnh: full width.
  - 2 ảnh: 2 cột.
  - 3-4 ảnh: grid gọn.
  - >4 ảnh: hiển thị tối đa 4 ảnh và overlay số ảnh còn lại.
- [ ] Dùng `next/image` nếu URL R2 public tương thích config; nếu chưa cấu hình domain thì quyết định giữa update `next.config.ts` hoặc dùng `unoptimized`.

### Acceptance criteria

- [ ] Feed đọc tốt trên mobile và desktop.
- [ ] Text không tràn khỏi card.
- [ ] Ảnh không làm layout shift quá mạnh.
- [ ] Kéo cuối danh sách tự tải page tiếp.
- [ ] Không có nested card gây rối thị giác.

## Phase 5: Điều hướng và tích hợp tạo bài

### Mục tiêu

Kết nối feed với luồng tạo bài hiện tại.

### Công việc

- [ ] Thêm link `Feed` vào `Navbar`.
- [ ] Thêm i18n key cho nav/feed ở `messages/vi.json`, `messages/en.json`, `messages/ja.json`.
- [ ] Trong `CreatePostButton`, sau khi publish thành công, invalidate query `["social-feed"]` nếu QueryProvider có mặt.
- [ ] Cân nhắc thêm CTA tạo bài trên feed:
  - Phase này có thể chỉ dẫn user sang trang anime detail để tạo bài.
  - Hoặc thêm nút mở modal tạo bài không có initial anime nếu muốn cho phép chọn anime chính từ feed.
- [ ] Đảm bảo route login `next` hoạt động khi user chưa đăng nhập.

### Acceptance criteria

- [ ] Navbar có link đến `/feed`.
- [ ] Sau khi tạo bài, quay sang feed có thể thấy bài mới sau refetch.
- [ ] Không phá flow tạo bài hiện tại ở anime detail.

## Phase 6: i18n, kiểm thử và tối ưu

### Mục tiêu

Hoàn thiện trải nghiệm và giảm rủi ro regression.

### Công việc

- [ ] Thêm namespace `feed` vào cả 3 file message.
- [ ] Kiểm tra anonymous và authenticated user.
- [ ] Kiểm tra bài không ảnh, một ảnh, nhiều ảnh.
- [ ] Kiểm tra bài có phim phụ và không có phim phụ.
- [ ] Kiểm tra profile private: feed vẫn hiển thị author tối thiểu theo RPC nếu đó là quyết định sản phẩm.
- [ ] Kiểm tra pagination không duplicate.
- [ ] Chạy `npm run lint`.
- [ ] Chạy `npm run build`.
- [ ] Chạy dev server và kiểm tra UI bằng browser.

### Acceptance criteria

- [ ] Lint pass.
- [ ] Build pass.
- [ ] Feed hoạt động trên mobile và desktop.
- [ ] Không có lỗi console rõ ràng khi load và load more.

## Phase 7: Mở rộng sau MVP

### Có thể làm tiếp

- [ ] Profile posts: hiển thị bài của một user trên `/u/[username]`.
- [ ] Anime posts: hiển thị bài liên quan anime trên `/anime/[id]`.
- [ ] Like/bookmark bằng `useMutation` và optimistic update.
- [ ] Comment thread.
- [ ] Soft delete bài viết.
- [ ] Report/moderation.
- [ ] Following feed.
- [ ] Ranking score đơn giản:

```text
score = recency_weight + engagement_weight
```

- [ ] Ranking cá nhân hóa theo anime trong list, genre, user follows.
- [ ] Precompute feed bằng job nếu query realtime quá nặng.

## Rủi ro và lưu ý

- RPC join nhiều bảng có thể phình nếu trả quá nhiều bài mỗi page. MVP nên giới hạn 10-20 bài/lần.
- `profiles` hiện có RLS theo public/owner. Feed cần quyết định rõ: bài public có luôn lộ author tối thiểu không. Nếu có, RPC `security definer` phải chỉ trả field cần thiết.
- R2 image domain cần được cấu hình cho `next/image`, hoặc dùng `unoptimized` nhất quán với các ảnh external hiện tại.
- Cursor phải dùng cả `created_at` và `id`; chỉ dùng `created_at` có thể duplicate/miss khi nhiều bài cùng timestamp.
- TanStack Query cache không thay thế cache server. Đây chỉ là cache phiên client.

## Definition of Done

- [ ] Có migration RPC feed.
- [ ] Có API `/api/feed`.
- [ ] Có type feed đầy đủ.
- [ ] Có TanStack Query provider và hook `useSocialFeed`.
- [ ] Có route `/[locale]/feed`.
- [ ] Có UI post card hiển thị author, text, anime, images.
- [ ] Có infinite scroll.
- [ ] Có loading, empty, error, retry state.
- [ ] Có i18n cho vi/en/ja.
- [ ] Navbar dẫn được đến feed.
- [ ] Publish bài không làm hỏng feed cache.
- [ ] Lint/build pass hoặc ghi rõ blocker.
