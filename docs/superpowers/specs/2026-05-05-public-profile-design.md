# Spec: Public Profile và danh sách anime công khai

## Bối cảnh

Animez hiện có Supabase Auth, bảng `anime_list_entries` cho My List cá nhân, RLS giới hạn user chỉ đọc/sửa/xóa dữ liệu của chính mình, và UI thêm/sửa anime từ trang detail, hero, card. Người dùng đã có khả năng lưu anime với status, score, progress, notes và snapshot anime tối thiểu.

Mục tiêu tiếp theo là phát triển trang profile để người khác có thể xem gu anime của user. Hướng đã chốt là profile kèm danh sách công khai, nhưng riêng tư mặc định. User phải chủ động bật công khai trước khi người khác xem được.

## Quyết định đã chốt

- Dùng hướng **Profile + danh sách công khai**.
- Profile/list riêng tư mặc định.
- User tự bật công khai trong trang `/profile`.
- URL công khai dùng dạng `/u/[username]`.
- Public list chỉ lộ dữ liệu cần thiết: title, poster, status, score, progress, format/year, updated date.
- Không công khai `notes`, `tags`, `started_at`, `finished_at`, rewatch fields trong phase đầu.
- Không mở RLS public trực tiếp trên bảng `anime_list_entries`.
- Public page đọc qua RPC hoặc view whitelist cột public.

## Phạm vi

### Trong phạm vi phase này

- Thêm bảng `profiles`.
- Tạo hoặc cập nhật profile cá nhân tại `/profile`.
- Cho user sửa username, display name, bio, avatar URL và bật/tắt public.
- Tạo trang public `/u/[username]`.
- Hiển thị public profile header, thống kê list và anime list theo tab status.
- Đảm bảo người ngoài không đọc được cột private trong `anime_list_entries`.
- Thêm i18n cho các label profile/list mới.

### Ngoài phạm vi phase này

- Follow/follower.
- Comment trên profile.
- Activity feed xã hội.
- So sánh độ hợp gu giữa user.
- Favorite/top anime riêng.
- Import/export list.
- Public notes/tags theo từng entry.
- Trang settings phức tạp tách riêng.

## Thiết kế dữ liệu

### Bảng `profiles`

Tạo bảng `public.profiles`:

```sql
id uuid primary key references auth.users(id) on delete cascade
username text unique not null
display_name text not null
avatar_url text
bio text not null default ''
is_public boolean not null default false
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Ràng buộc:

- `username` dài 3-24 ký tự.
- `username` chỉ gồm chữ thường, số, `_`, `-`.
- `display_name` dài 1-40 ký tự.
- `bio` tối đa 160 ký tự.
- `username` không thuộc danh sách reserved: `profile`, `login`, `register`, `search`, `anime`, `admin`, `api`.

RLS:

- `select`: user đọc profile của chính mình; anonymous/authenticated đọc profile nếu `is_public = true`.
- `insert`: authenticated user chỉ tạo profile với `id = auth.uid()`.
- `update`: authenticated user chỉ sửa profile của chính mình.
- `delete`: không cần policy public; nếu cần xóa thì xử lý theo account deletion.

### Public list RPC/view

Không mở public select cho `anime_list_entries`. Thay vào đó tạo RPC hoặc view chỉ trả về whitelist:

- `anime_id`
- `status`
- `score`
- `progress_episodes`
- `total_episodes`
- `title_romaji`
- `title_english`
- `cover_image`
- `format`
- `season_year`
- `updated_at`

RPC nhận:

- `profile_username text`
- `entry_status text default null`
- `limit_count integer default 50`
- `offset_count integer default 0`

RPC chỉ trả dữ liệu nếu profile tồn tại và `is_public = true`.

## Kiến trúc ứng dụng

### Route `/profile`

Trang private cho user đang đăng nhập.

Hành vi:

- Nếu chưa đăng nhập, redirect tới `/login?next=/profile`.
- Nếu user chưa có profile, tạo profile mặc định từ `user_metadata.display_name` hoặc prefix email.
- Hiển thị form sửa `username`, `display_name`, `bio`, `avatar_url`.
- Hiển thị toggle `is_public`.
- Hiển thị public URL preview `/u/[username]`.
- Hiển thị thống kê My List của chính user.
- Hiển thị preview một số entry gần đây.

Implementation nên ưu tiên Server Component cho initial data. Form tương tác có thể là Client Component nhỏ.

### Route `/u/[username]`

Trang public cho người khác xem.

Hành vi:

- Nếu username không tồn tại, hiển thị not found.
- Nếu profile tồn tại nhưng chưa public, hiển thị trạng thái private, không lộ list.
- Nếu public, hiển thị header profile, stats và list anime.
- Filter status qua query param `?status=completed` để URL có thể share.
- Sort mặc định theo `updated_at desc`.

### Component đề xuất

- `src/components/profile/ProfileSettingsForm.tsx`
- `src/components/profile/ProfileHeader.tsx`
- `src/components/profile/ProfileStats.tsx`
- `src/components/profile/PublicAnimeList.tsx`
- `src/lib/profile/validators.ts`
- `src/types/profile.ts`

Chỉ dùng `useMemo`, `useCallback`, `memo` khi có lý do rõ ràng: handler truyền sâu, tính toán list/stat tốn chi phí, hoặc component con memo hóa thật sự. Không dùng tràn lan.

## UI

Giữ phong cách hiện tại của Animez:

- Nền tối `#0a0a0f`, surface `#111118`, border `#1a1a24`.
- Accent `#f49e0b`.
- Tailwind là ưu tiên chính.
- Radius nhỏ, không dùng card lồng card.
- Layout thiên về dashboard/list rõ ràng, không làm landing page.

### `/profile`

Các khối chính:

- Header tài khoản: avatar, display name, username, email.
- Form profile settings.
- Toggle công khai.
- Link preview public profile.
- Stats strip.
- Recent list preview.

### `/u/[username]`

Các khối chính:

- Public profile header: avatar, display name, `@username`, bio.
- Stats strip: total anime, watching, completed, plan to watch, average score, total watched episodes.
- Tabs status: All, Watching, Completed, On Hold, Dropped, Plan to Watch.
- Anime list compact: poster, title, format/year, status badge, score, progress.

## Data flow

### User tạo/sửa profile

1. User vào `/profile`.
2. Server lấy Supabase session.
3. Nếu chưa login, redirect login.
4. Server lấy profile theo `auth.uid()`.
5. Nếu chưa có profile, tạo profile mặc định.
6. User sửa form và submit.
7. Server action hoặc route handler validate input.
8. App update `profiles`.
9. UI refresh và hiển thị public link nếu username hợp lệ.

### Người ngoài xem public profile

1. User mở `/u/[username]`.
2. Server query profile theo username.
3. Nếu không tồn tại, not found.
4. Nếu `is_public = false`, render private state.
5. Nếu public, server gọi RPC/view public list.
6. UI render profile, stats và list.

## Validation

Username:

- Normalize về lowercase.
- Trim khoảng trắng.
- Regex: `^[a-z0-9_-]{3,24}$`.
- Chặn reserved usernames.
- Check unique ở database.

Display name:

- Trim.
- 1-40 ký tự.

Bio:

- Trim.
- Tối đa 160 ký tự.

Avatar URL:

- Optional.
- Nếu có, phải là URL hợp lệ.
- Nếu URL lỗi ảnh khi render, UI fallback về initials.

## Xử lý lỗi

- Username trùng: báo lỗi trong form.
- Username sai format: báo lỗi trong form.
- Profile private: public route hiển thị “Profile này chưa công khai”.
- Profile không tồn tại: not found.
- RPC/list lỗi: vẫn render header profile nếu có, list hiển thị lỗi tải dữ liệu.
- User chưa login vào `/profile`: redirect login.
- Tạo profile mặc định thất bại: hiển thị lỗi và không cho lưu settings cho tới khi retry.

## i18n

Thêm namespace `profile` vào `messages/vi.json`, `messages/en.json`, `messages/ja.json`.

Key chính:

- `title`
- `publicTitle`
- `settings`
- `username`
- `displayName`
- `bio`
- `avatarUrl`
- `publicToggle`
- `publicToggleDescription`
- `publicUrl`
- `save`
- `saving`
- `saved`
- `privateProfile`
- `profileNotFound`
- `invalidUsername`
- `usernameTaken`
- `reservedUsername`
- `invalidDisplayName`
- `bioTooLong`
- `invalidAvatarUrl`
- `stats.totalAnime`
- `stats.watching`
- `stats.completed`
- `stats.planToWatch`
- `stats.averageScore`
- `stats.watchedEpisodes`
- `tabs.all`

## Kiểm thử thủ công

- User chưa đăng nhập vào `/profile` bị redirect tới `/login?next=/profile`.
- User mới đăng nhập vào `/profile` được tạo profile mặc định.
- User sửa username hợp lệ và mở được `/u/[username]`.
- Username trùng bị chặn.
- Username sai format bị chặn.
- Username reserved bị chặn.
- Khi `is_public = false`, `/u/[username]` không hiển thị list.
- Khi `is_public = true`, `/u/[username]` hiển thị profile và anime list public.
- Người ngoài không thấy `notes`, `tags`, `started_at`, `finished_at`, rewatch fields.
- Filter `?status=completed` hoạt động.
- Stats khớp với dữ liệu trong `anime_list_entries`.
- Add/edit anime list hiện tại vẫn hoạt động.
- Navbar profile link vẫn mở `/profile`.

## Rủi ro

### Lộ dữ liệu private

Rủi ro lớn nhất là vô tình public bảng `anime_list_entries`. Giải pháp là không mở public select trực tiếp, chỉ dùng RPC/view whitelist cột.

### Username mặc định bị trùng

Email prefix có thể trùng. Khi auto-create profile, app cần sinh suffix ngắn hoặc fallback như `user-xxxxxx`.

### Public URL thay đổi khi đổi username

Phase đầu chấp nhận URL cũ không còn hoạt động sau khi đổi username. Nếu sau này cần ổn định URL, có thể thêm bảng username history hoặc redirect aliases.

### Snapshot anime cũ

Public list dùng snapshot từ `anime_list_entries`, có thể lệch với AniList. Chấp nhận ở phase đầu vì trang detail vẫn lấy dữ liệu mới từ AniList.

## Tiêu chí hoàn thành

- Có migration cho `profiles`, RLS và public list RPC/view.
- `/profile` cho phép user quản lý public profile.
- `/u/[username]` hiển thị public profile/list khi `is_public = true`.
- Profile riêng tư mặc định.
- Public list không lộ notes/tags hoặc cột private.
- UI dùng Tailwind và khớp phong cách hiện tại.
- Có i18n cho ít nhất vi/en/ja.
- Không làm hỏng flow auth và My List hiện tại.
