# Spec: Hệ thống My List Anime

## Bối cảnh

Animez hiện là ứng dụng Next.js App Router, React 19, Tailwind 4, `next-intl`, Supabase Auth và dữ liệu anime từ AniList. Người dùng đã có luồng đăng nhập/đăng ký, trang tìm kiếm, trang chủ, card anime và trang chi tiết anime. Trang chi tiết và hero hiện có nút thêm vào danh sách nhưng chưa có lớp dữ liệu hoặc UI quản lý list cá nhân.

Mục tiêu dài hạn là xây hệ thống My List đầy đủ theo tinh thần MyAnimeList: người dùng lưu anime, phân loại trạng thái xem, chấm điểm, theo dõi tiến độ, ghi chú, xem thống kê và có thể công khai profile/list. Spec này tập trung vào Phase 1-3 để tạo lõi ổn định trước khi mở rộng.

## Phạm vi Phase 1-3

### Phase 1: Nền dữ liệu

- Tạo bảng Supabase lưu entry list cá nhân theo từng user.
- Bật RLS để user chỉ thao tác dữ liệu của chính mình.
- Định nghĩa enum/trạng thái và ràng buộc dữ liệu tương thích với mô hình MAL-like.
- Thêm file SQL/migration trong repo để schema không chỉ tồn tại trên Supabase Dashboard.

### Phase 2: Add/Edit từ trang chi tiết

- Thay nút placeholder `Add to List` trên trang chi tiết anime bằng UI thật.
- Người dùng đã đăng nhập có thể thêm anime vào list và chỉnh các trường cơ bản.
- Người dùng chưa đăng nhập được dẫn tới login và quay lại trang hiện tại sau khi đăng nhập.
- Sau khi reload, trạng thái list của anime vẫn đúng.

### Phase 3: Quick action trên card và hero

- Thêm thao tác nhanh ở `AnimeCard` và `HeroSection`.
- Quick add mặc định đưa anime vào `plan_to_watch`.
- Nếu anime đã có trong list, UI hiển thị trạng thái hiện tại thay vì chỉ hiển thị nút thêm.
- Click quick action trên card không được kích hoạt navigation của link card.

## Ngoài phạm vi Phase 1-3

- Trang `/my-list` đầy đủ.
- Thống kê cá nhân.
- Public profile/list.
- So sánh gu giữa người dùng.
- Import/export CSV.
- Đồng bộ với tài khoản MyAnimeList hoặc AniList thật.
- Activity feed và recommendation cá nhân hóa.

Các phần này sẽ được làm ở phase sau, dựa trên schema và service/hook từ Phase 1-3.

## Cách tiếp cận được chọn

Chọn một bảng lõi `anime_list_entries` để lưu toàn bộ trạng thái My List của user. Không tạo bảng `favorites` riêng trong phase này, vì favorite đơn giản sẽ dễ trùng nghĩa với `plan_to_watch`, `completed` hoặc các trạng thái cá nhân khác. Nếu sau này cần "favorite/top anime" theo nghĩa profile highlight, có thể thêm bảng hoặc trường riêng sau.

Metadata anime vẫn lấy từ AniList theo `anime_id`. Ở Phase 1-3 chỉ lưu snapshot tối thiểu nếu cần phục vụ list sau này; không copy toàn bộ dữ liệu AniList vào database nội bộ.

## Thiết kế dữ liệu

### Enum trạng thái

Trạng thái chính:

- `watching`
- `completed`
- `on_hold`
- `dropped`
- `plan_to_watch`

Các label UI sẽ được dịch qua `messages/*.json`.

### Bảng `anime_list_entries`

Cột đề xuất:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `anime_id bigint not null`
- `status text not null default 'plan_to_watch'`
- `score smallint not null default 0`
- `progress_episodes integer not null default 0`
- `total_episodes integer`
- `started_at date`
- `finished_at date`
- `is_rewatching boolean not null default false`
- `rewatch_count integer not null default 0`
- `rewatch_value smallint not null default 0`
- `priority smallint not null default 0`
- `tags text[] not null default '{}'`
- `notes text not null default ''`
- `title_romaji text`
- `title_english text`
- `cover_image text`
- `format text`
- `season text`
- `season_year integer`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Ràng buộc:

- Unique `(user_id, anime_id)`.
- `score` trong khoảng `0-10`, trong đó `0` là chưa chấm điểm.
- `progress_episodes >= 0`.
- `total_episodes is null or total_episodes >= 0`.
- `progress_episodes <= total_episodes` khi `total_episodes` có giá trị, nếu không cần cho phép anime đang chiếu chưa rõ tổng tập thì validate ở app layer.
- `rewatch_count >= 0`.
- `rewatch_value` trong khoảng `0-5`.
- `priority` trong khoảng `0-2`.
- `status` chỉ nhận các giá trị trong enum trạng thái.

Snapshot fields như `title_romaji`, `cover_image`, `format`, `season`, `season_year` giúp trang `/my-list` sau này render nhanh hơn và ít phụ thuộc vào batch fetch AniList. Đây là snapshot phục vụ UI, không phải nguồn dữ liệu anime chính.

### RLS

Policy cần có:

- `select`: `user_id = auth.uid()`
- `insert`: `user_id = auth.uid()`
- `update`: `user_id = auth.uid()`
- `delete`: `user_id = auth.uid()`

Không cho public đọc bảng này trong Phase 1-3. Public list sẽ được thiết kế riêng ở phase sau với privacy setting.

### Trigger `updated_at`

Thêm trigger Supabase/Postgres để tự cập nhật `updated_at` khi entry thay đổi. UI sort theo lần cập nhật gần nhất ở phase sau sẽ dựa vào trường này.

## Kiến trúc ứng dụng

### Module dữ liệu

Tạo các module đề xuất:

- `src/types/anime-list.ts`
- `src/lib/anime-list/constants.ts`
- `src/lib/anime-list/normalizers.ts`
- `src/hooks/useAnimeListEntry.ts`
- `src/components/anime-list/AnimeListButton.tsx`
- `src/components/anime-list/AnimeListEditor.tsx`

`types/anime-list.ts` định nghĩa:

- `AnimeListStatus`
- `AnimeListEntry`
- `AnimeListEntryInput`
- `AnimeListQuickAddInput`

`constants.ts` định nghĩa status options, score options, priority options, rewatch options.

`normalizers.ts` nhận `AnimeMedia` và tạo payload snapshot tối thiểu để insert/update.

### Hook `useAnimeListEntry`

Hook client chịu trách nhiệm:

- Nhận `anime: AnimeMedia` hoặc tối thiểu `animeId`.
- Đọc auth state từ `useAuth`.
- Fetch entry hiện tại theo `(user_id, anime_id)`.
- Cung cấp:
  - `entry`
  - `loading`
  - `saving`
  - `error`
  - `needsLogin`
  - `quickAdd()`
  - `saveEntry(input)`
  - `deleteEntry()`

Hook chỉ nên dùng `useCallback` cho các hàm được truyền xuống component con hoặc dùng trong dependency quan trọng. Không dùng `useMemo/useCallback` tràn lan cho các phép tính rẻ.

### Component `AnimeListButton`

Dùng lại ở detail, hero và card.

Props chính:

- `anime: AnimeMedia`
- `variant: "detail" | "hero" | "card"`
- `className?: string`

Hành vi:

- Chưa đăng nhập: mở prompt login hoặc điều hướng tới login với `next`.
- Chưa có entry: click quick add vào `plan_to_watch`.
- Đã có entry: hiển thị status hiện tại và có affordance để mở editor.
- Khi đang lưu: disable nút để tránh double submit.

Với `variant="card"`, click handler phải gọi `event.preventDefault()` và `event.stopPropagation()` để không làm card chuyển trang.

### Component `AnimeListEditor`

Editor có thể là modal hoặc drawer đơn giản, chưa cần dependency mới.

Trường trong Phase 2:

- Status
- Score
- Progress episodes
- Started date
- Finished date
- Priority
- Tags
- Notes

Trường có thể ẩn dưới "More" nếu UI quá dày:

- Rewatching
- Rewatch count
- Rewatch value

Hành vi tự động:

- Nếu status đổi sang `completed` và anime có `total_episodes`, set `progress_episodes = total_episodes` nếu progress đang thấp hơn.
- Nếu status đổi sang `completed` mà `finished_at` trống, set ngày hiện tại ở client.
- Nếu status đổi sang `watching` mà `started_at` trống, set ngày hiện tại ở client.
- Nếu progress đạt total episodes, gợi ý chuyển sang `completed`, nhưng không tự đổi nếu user đang cố ý giữ trạng thái khác.

## UI Touchpoints

### Trang chi tiết anime

File liên quan: `src/app/[locale]/anime/[id]/page.tsx`

Thay nút `Add to List` bằng `AnimeListButton variant="detail"`.

Yêu cầu:

- Giữ phong cách Tailwind hiện tại: nền tối, accent `#f49e0b`, border `#1a1a24`, radius nhỏ.
- Label rõ:
  - `Add to List`
  - `Plan to Watch`
  - `Watching`
  - `Completed`
  - `Edit List Entry`
- Không làm layout phần title/meta bị nhảy khi trạng thái load xong.

### Hero section

File liên quan: `src/components/anime/HeroSection.tsx`

Nút `addToWatchlist` hiện tại trở thành quick add. Vì hero đang là client component, có thể dùng hook trực tiếp thông qua `AnimeListButton`.

Yêu cầu:

- Nếu chưa có entry, label là watchlist/add.
- Nếu đã có entry, hiển thị status hiện tại.
- Không làm chậm render hero quá mức; fetch entry chỉ chạy sau khi auth state sẵn sàng.

### Anime card

File liên quan: `src/components/anime/AnimeCard.tsx`

Thêm nút icon-only trong overlay hoặc góc poster.

Yêu cầu:

- Trên desktop hiển thị rõ khi hover.
- Trên mobile vẫn có vùng bấm đủ lớn.
- Không đặt text dài trong card overlay gây vỡ layout.
- Dùng icon từ `lucide-react` khi phù hợp.

## Luồng người dùng

### Thêm anime lần đầu

1. User đăng nhập.
2. User bấm `Add to List`.
3. App insert entry với status mặc định `plan_to_watch`.
4. UI chuyển sang trạng thái đã lưu.
5. User có thể mở editor để sửa score/progress/status.

### Cập nhật entry

1. User mở editor.
2. User chỉnh status, score, progress hoặc notes.
3. App validate input ở client.
4. App update Supabase.
5. UI hiển thị entry mới và clear lỗi.

### Chưa đăng nhập

1. User bấm add/list action.
2. App không gửi request database.
3. App điều hướng hoặc hiển thị prompt login.
4. Login URL có `next` để quay lại trang đang xem.

## i18n

Thêm namespace `animeList` vào `messages/vi.json`, `messages/en.json`, `messages/ja.json`.

Nhóm key cần có:

- `addToList`
- `editListEntry`
- `removeFromList`
- `saved`
- `saving`
- `loginRequiredTitle`
- `loginRequiredDescription`
- `goToLogin`
- `status.watching`
- `status.completed`
- `status.on_hold`
- `status.dropped`
- `status.plan_to_watch`
- `score`
- `progress`
- `startedAt`
- `finishedAt`
- `priority`
- `tags`
- `notes`
- `rewatch`
- `save`
- `cancel`
- `delete`
- `updateFailed`
- `loadFailed`

## Kiểm thử

Kiểm thử thủ công Phase 1-3:

- User chưa đăng nhập bấm add ở detail thì được yêu cầu đăng nhập.
- User đăng nhập bấm add ở detail thì tạo entry `plan_to_watch`.
- Reload detail vẫn hiển thị entry đã lưu.
- User mở editor, đổi status sang `watching`, lưu thành công.
- User nhập score ngoài `0-10` thì không submit.
- User nhập progress âm thì không submit.
- User bấm quick add ở hero thì tạo entry.
- User bấm quick action ở card không bị điều hướng ngoài ý muốn.
- User xóa entry thì UI quay về trạng thái chưa lưu.
- User A không đọc/sửa/xóa được entry của User B qua Supabase client.

Kiểm thử hồi quy:

- Trang chủ vẫn render hero/trending/top list.
- Trang search vẫn render `AnimeCard`.
- Trang detail vẫn render trailer, relations, recommendations.
- Navbar auth state không bị ảnh hưởng.

## Rủi ro

### Snapshot anime bị cũ

Snapshot title/poster có thể lệch với AniList sau này. Chấp nhận trong Phase 1-3 vì snapshot chỉ phục vụ UI list nhanh. Trang detail vẫn lấy dữ liệu mới từ AniList.

### Nhiều instance cùng một anime không đồng bộ tức thì

Nếu cùng anime xuất hiện ở hero và card, mỗi component có thể fetch state riêng. Phase đầu chấp nhận. Sau này có thể thêm context/cache nhẹ nếu thật sự cần.

### Form editor quá dày

Editor MAL-like có nhiều trường. Phase 2 nên ưu tiên status, score, progress và notes; các trường rewatch/priority/tags có thể nằm trong khu vực mở rộng.

### RLS cấu hình sai

Đây là rủi ro bảo mật chính. Phase 1 phải có SQL policy rõ ràng và test bằng hai user hoặc Supabase SQL editor.

## Roadmap sau Phase 1-3

### Phase 4: Trang `/my-list`

- Tabs theo status.
- Bảng/card danh sách cá nhân.
- Search trong list cá nhân.
- Sort theo title, score, updated date, start date.
- Pagination hoặc infinite load.

### Phase 5: Editor đầy đủ

- Hoàn thiện toàn bộ field giống MAL.
- Auto transition thông minh hơn.
- Batch update nếu cần.

### Phase 6: Thống kê cá nhân

- Tổng anime.
- Tổng tập đã xem.
- Tổng thời lượng ước tính.
- Điểm trung bình.
- Distribution điểm.
- Count theo status.

### Phase 7: Public profile/list

- Privacy setting.
- Public profile page.
- Recent updates.
- Favorite/top anime riêng.

### Phase 8: Social và nâng cao

- Compare compatibility.
- Import/export CSV.
- Recommendation dựa trên list.
- Activity feed.

## Tiêu chí hoàn thành Phase 1-3

- Có schema Supabase và RLS cho `anime_list_entries`.
- User đã đăng nhập thêm/sửa/xóa entry từ trang detail được.
- Hero và AnimeCard có quick action hoạt động.
- Trạng thái entry vẫn đúng sau reload.
- User chưa đăng nhập được dẫn tới login hợp lý.
- UI dùng Tailwind và giữ phong cách hiện tại của Animez.
- Không có regression rõ ở home, search, detail và auth.
