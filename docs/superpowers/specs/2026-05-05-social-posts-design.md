# Spec: Tạo bài viết social từ màn detail anime

## Bối cảnh

Animez hiện dùng Next.js App Router, React, Tailwind, Supabase Auth, Supabase Database và Supabase Storage cho avatar. Trang detail anime đã có dữ liệu AniList đầy đủ, nút thêm vào My List và flow đăng nhập. Tính năng social đầu tiên sẽ là tạo bài viết từ màn detail anime, sau đó mở rộng dần sang feed, profile posts, like, comment và bookmark.

Mục tiêu của phase này là tạo nền dữ liệu đúng để sau này mở rộng, nhưng UI và hành vi vẫn gọn: người dùng đang ở trang detail có thể mở modal và đăng bài về anime đang xem.

## Quyết định đã chốt

- Bài viết bắt buộc có `caption`.
- Bài viết bắt buộc có đúng 1 phim chính.
- Khi tạo từ màn detail, anime hiện tại là phim chính mặc định.
- Người dùng được đổi phim chính, nhưng không được để trống.
- Phim phụ optional, có thể không có hoặc có nhiều phim.
- Ảnh optional, có thể không có hoặc có nhiều ảnh.
- `description` optional.
- Ảnh bài viết lưu bằng Cloudflare R2.
- Supabase vẫn là nơi lưu user, bài viết, quan hệ phim và metadata ảnh.

## Phạm vi phase này

Trong phạm vi:

- Thêm schema Supabase cho bài viết social.
- Thêm cấu hình và helper upload ảnh lên Cloudflare R2.
- Thêm server action/API tạo bài viết.
- Thêm nút tạo bài viết ở màn detail anime.
- Thêm modal tạo bài viết với phim chính mặc định.
- Validate caption, phim chính, phim phụ và ảnh.
- Lưu metadata ảnh vào Supabase sau khi upload R2.

Ngoài phạm vi:

- Feed social tổng.
- Trang chi tiết bài viết.
- Like, comment, share, repost, bookmark.
- Chỉnh sửa hoặc xóa bài viết.
- Moderation/report.
- Notification.
- Upload video.

## Thiết kế dữ liệu

### `social_posts`

```sql
id uuid primary key default gen_random_uuid()
user_id uuid not null references auth.users(id) on delete cascade
caption text not null
description text not null default ''
visibility text not null default 'public'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
deleted_at timestamptz
```

Ràng buộc đề xuất:

- `caption` sau khi trim dài 1-280 ký tự.
- `description` sau khi trim tối đa 2.000 ký tự.
- `visibility` trong phase đầu chỉ cần `public`, nhưng dùng cột này để sau này thêm `followers` hoặc `private`.

RLS:

- Authenticated user được tạo bài với `user_id = auth.uid()`.
- User được đọc bài của mình.
- Anonymous/authenticated được đọc bài `visibility = 'public'` và `deleted_at is null`.
- Update/delete có thể chưa mở trong phase này nếu chưa làm UI sửa/xóa.

### `social_post_anime`

```sql
id uuid primary key default gen_random_uuid()
post_id uuid not null references public.social_posts(id) on delete cascade
anime_id bigint not null
role text not null
episode integer
title_romaji text
title_english text
cover_image text
format text
season_year integer
sort_order integer not null default 0
created_at timestamptz not null default now()
```

Ràng buộc đề xuất:

- `role` chỉ nhận `primary` hoặc `supporting`.
- Mỗi `post_id` bắt buộc có đúng 1 phim `primary`.
- Dùng unique partial index để đảm bảo mỗi bài chỉ có tối đa 1 phim chính:

```sql
create unique index social_post_anime_one_primary_idx
on public.social_post_anime (post_id)
where role = 'primary';
```

- Không cho trùng `anime_id` trong cùng một bài.
- `episode` null hoặc >= 0.
- Phim phụ giới hạn tối đa 5 ở tầng server action để giữ UI/feed nhẹ.

### `social_post_images`

```sql
id uuid primary key default gen_random_uuid()
post_id uuid not null references public.social_posts(id) on delete cascade
storage_provider text not null default 'r2'
storage_key text not null
public_url text not null
mime_type text not null
size_bytes integer not null
width integer
height integer
sort_order integer not null default 0
created_at timestamptz not null default now()
```

Ràng buộc đề xuất:

- `storage_provider = 'r2'` trong phase đầu.
- `mime_type` chỉ nhận `image/jpeg`, `image/png`, `image/webp`.
- `size_bytes > 0`.
- `storage_key` unique.
- Giới hạn MVP: tối đa 6 ảnh/bài, tối đa 5 MB/ảnh.

## Cloudflare R2

Ảnh dùng Cloudflare R2 vì chi phí thấp và phù hợp social về sau. Theo docs Cloudflare R2 pricing đã kiểm tra ngày 05/05/2026, free tier Standard Storage có 10 GB-month/tháng, 1 triệu Class A operations/tháng, 10 triệu Class B operations/tháng và không tính phí egress internet.

Biến môi trường:

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=
```

Phase đầu nên dùng server upload trực tiếp lên R2 thay vì presigned upload:

- Server kiểm soát auth, mime type, dung lượng và số lượng ảnh.
- Dễ rollback: nếu insert bài viết thất bại thì xóa các object vừa upload.
- Ít rủi ro hơn khi chưa có rate limit và moderation.

Khi traffic lớn hơn, có thể đổi sang presigned upload mà không cần đổi schema vì DB đã lưu `storage_key` và `public_url`.

## UI/UX

### Nút tạo bài viết ở detail

Thêm nút `Tạo bài viết` cạnh nhóm action hiện có trong `src/app/[locale]/anime/[id]/page.tsx`.

Hành vi:

- Chưa đăng nhập: mở prompt đăng nhập hoặc dẫn tới `/login?next=<current-path>`.
- Đã đăng nhập: mở modal tạo bài viết.
- Anime detail hiện tại được truyền vào modal làm phim chính mặc định.

### Modal tạo bài viết

Thứ tự form đề xuất:

1. `caption`: textarea ngắn, bắt buộc.
2. Phim chính: hiển thị poster, title, episode input và nút đổi phim.
3. Phim phụ: danh sách phim phụ, nút thêm phim, optional.
4. `description`: textarea dài hơn, optional.
5. Ảnh: file picker nhiều ảnh, preview ảnh, nút bỏ từng ảnh, optional.
6. Footer: hủy và đăng bài.

Không dùng card lồng card. Modal dùng Tailwind, giữ phong cách nền tối hiện tại: surface `#111118`, border `#1a1a24`, accent `#f49e0b`.

## Data flow

1. User bấm `Tạo bài viết` trên detail anime.
2. Client mở modal với anime hiện tại là phim chính.
3. User nhập caption, tập, description, phim phụ và ảnh nếu có.
4. Submit form lên server action hoặc route handler.
5. Server kiểm tra auth.
6. Server validate caption, description, phim chính, phim phụ và ảnh.
7. Server upload ảnh lên R2 nếu có.
8. Server insert `social_posts`.
9. Server insert `social_post_anime` với 1 primary và các supporting.
10. Server insert `social_post_images`.
11. Nếu bước insert thất bại sau khi upload ảnh, server xóa object R2 đã upload.
12. UI đóng modal và báo đăng thành công.

## Validation

Caption:

- Trim.
- Bắt buộc.
- Tối đa 280 ký tự.

Description:

- Trim.
- Optional.
- Tối đa 2.000 ký tự.

Phim chính:

- Bắt buộc.
- Có đúng 1 phim chính.
- Cần có `anime_id`.
- Nên lưu snapshot title, cover, format, season year để feed không phụ thuộc realtime AniList.

Phim phụ:

- Optional.
- Không trùng phim chính.
- Không trùng nhau.
- Tối đa 5 phim.

Episode:

- Optional.
- Nếu nhập thì phải là số nguyên >= 0.
- Gắn theo từng phim trong `social_post_anime`.

Ảnh:

- Optional.
- Tối đa 6 ảnh.
- Chỉ nhận JPEG, PNG, WebP.
- Tối đa 5 MB/ảnh.

## Lỗi và rollback

- Chưa đăng nhập: trả về lỗi `loginRequired`.
- Thiếu caption: lỗi field `caption`.
- Thiếu phim chính: lỗi field `primaryAnime`.
- Ảnh sai định dạng: lỗi field `images`.
- Upload R2 lỗi: không insert bài viết, trả lỗi upload.
- Insert DB lỗi sau upload: xóa các object R2 đã upload rồi trả lỗi tạo bài.
- Xóa R2 rollback lỗi: vẫn trả lỗi tạo bài, nhưng log server để sau này dọn rác bằng job.

## i18n

Thêm namespace hoặc key cho social post trong `messages/vi.json`, `messages/en.json`, `messages/ja.json`.

Key chính:

- `social.createPost`
- `social.createPostTitle`
- `social.caption`
- `social.captionPlaceholder`
- `social.description`
- `social.descriptionPlaceholder`
- `social.primaryAnime`
- `social.supportingAnime`
- `social.changeAnime`
- `social.addSupportingAnime`
- `social.episode`
- `social.images`
- `social.publish`
- `social.publishing`
- `social.published`
- `social.loginRequiredTitle`
- `social.loginRequiredDescription`
- `social.errors.captionRequired`
- `social.errors.primaryAnimeRequired`
- `social.errors.imageTooLarge`
- `social.errors.invalidImageType`
- `social.errors.createFailed`

## Kiểm thử thủ công

- User chưa đăng nhập bấm `Tạo bài viết` thì thấy yêu cầu đăng nhập.
- User đã đăng nhập mở modal từ detail thì anime hiện tại là phim chính.
- Không nhập caption thì không đăng được.
- Không có phim chính thì không đăng được.
- Có caption và phim chính, không có ảnh, không có phim phụ vẫn đăng được.
- Có phim phụ thì lưu đúng role `supporting`.
- Phim phụ trùng phim chính bị chặn.
- Ảnh sai định dạng bị chặn.
- Ảnh vượt dung lượng bị chặn.
- Tạo bài có nhiều ảnh thì ảnh upload lên R2 và metadata lưu trong Supabase.
- Khi DB insert thất bại sau upload, object R2 vừa upload được xóa.
- Flow My List và detail hiện tại không bị ảnh hưởng.

## Rủi ro

### Chi phí và abuse ảnh

R2 rẻ nhưng social upload có thể bị abuse. MVP cần giới hạn số ảnh, dung lượng ảnh và yêu cầu đăng nhập. Sau này nên thêm rate limit, moderation và job dọn object không còn record DB.

### Feed cần query hiệu quả

Schema tách bảng giúp mở rộng, nhưng feed sau này cần index theo `created_at`, `user_id`, `visibility` và có thể cần denormalized counters cho like/comment.

### Snapshot anime lỗi thời

Post lưu snapshot title/cover tại thời điểm tạo. Dữ liệu có thể lệch AniList sau này, nhưng feed ổn định hơn và không cần gọi AniList cho mỗi bài.

## Tiêu chí hoàn thành

- Có migration cho `social_posts`, `social_post_anime`, `social_post_images`, index và RLS.
- Có helper R2 cấu hình bằng env.
- Có server action/API tạo bài viết với validate và rollback ảnh.
- Có nút tạo bài viết ở màn detail.
- Có modal tạo bài viết với phim chính mặc định, phim phụ optional và ảnh optional.
- UI dùng Tailwind và khớp phong cách hiện tại.
- Có i18n cho vi/en/ja.
- Chạy được lint/build hoặc báo rõ nếu không chạy được.
