# Spec: Hệ thống gợi ý anime cá nhân hóa

## Bối cảnh

Animez hiện có hệ thống danh sách anime cá nhân qua bảng `anime_list_entries`, trang profile với tab `Danh sách`, trang chi tiết anime, tìm kiếm AniList và endpoint `/api/anime/suggestions` dùng cho autocomplete theo từ khóa. Tính năng mới cần tạo một hệ thống gợi ý anime dựa trên danh sách đã lưu của người dùng, có lưu phiên phân tích vào database để có thể tiếp tục sau khi reload, thoát web hoặc mở trang chi tiết anime.

Mục tiêu của phase này là xây dựng luồng đề xuất cá nhân hóa đầu tiên, có quota tạo phiên, có trạng thái phiên rõ ràng và có nền thuật toán đủ mở để sau này thêm phân tích sâu hơn.

## Phạm vi

- Thêm nút `Gợi ý anime` tại trang profile, trong tab `Danh sách`.
- Tạo phiên phân tích anime cá nhân hóa từ danh sách hiện có của user.
- Mỗi user chỉ có một phiên gợi ý đang hoạt động.
- Mỗi phiên sinh sẵn 30 anime ứng viên đã được xếp hạng.
- Lưu phiên và item đề xuất vào Supabase để resume đúng trạng thái.
- Giới hạn tạo mới tối đa 3 phiên trong mỗi tháng lịch.
- Hiển thị từng anime một thay vì grid nhiều kết quả.
- Hỗ trợ các hành động: `Đã xem rồi`, `Không hợp gu`, `Thêm vào dự định xem`, `Xem chi tiết`, `Tạo phân tích mới`.

## Ngoài phạm vi

- Mô hình machine learning hoặc embedding.
- Đồng bộ với tài khoản AniList/MyAnimeList thật.
- Dùng tag do người dùng tự nhập trong `anime_list_entries.tags`.
- Trang quản lý danh sách anime `Không hợp gu`.
- Tín hiệu âm theo genre/format tương tự anime bị đánh dấu không hợp gu.
- Giải thích thuật toán chi tiết bằng biểu đồ nâng cao.

## Quy tắc phiên gợi ý

Một tài khoản chỉ có một phiên `active`. Nếu user mở profile và còn phiên active, UI phải mở lại phiên này thay vì tạo phân tích mới. Việc mở lại phiên hiện hành không tốn quota.

Muốn tạo phân tích mới, user phải kết thúc phiên hiện tại trước. Hành động `Tạo phân tích mới` sẽ đánh dấu phiên hiện tại là đã thay thế/kết thúc, sau đó tạo phiên mới nếu quota tháng còn lượt.

Quota tính theo tháng lịch. Ví dụ tháng 05/2026 tính từ `2026-05-01 00:00` đến trước `2026-06-01 00:00`. Mỗi user có tối đa 3 phiên được tạo trong khoảng này.

## Hành động trong phiên

### Đã xem rồi

Khi user bấm `Đã xem rồi`:

- Thêm anime hiện tại vào `anime_list_entries`.
- `status = "completed"`.
- `score = 0`.
- Nếu AniList có `episodes`, lưu `total_episodes = episodes` và `progress_episodes = episodes`.
- Nếu AniList không có `episodes`, lưu `total_episodes = null` và `progress_episodes = 0`.
- Đánh dấu item trong phiên là `marked_completed`.
- Chuyển sang anime pending tiếp theo.
- Phiên vẫn `active`.

Anime này về sau không được đề xuất lại vì đã nằm trong danh sách của user.

### Không hợp gu

Khi user bấm `Không hợp gu`:

- Lưu anime vào bảng không quan tâm lâu dài.
- Đánh dấu item trong phiên là `not_interested`.
- Chuyển sang anime pending tiếp theo.
- Phiên vẫn `active`.

MVP chỉ loại trừ chính anime đó trong các phiên sau. Không dùng lựa chọn này để giảm trọng số genre/format tương tự vì dễ làm thuật toán lệch quá mạnh.

### Thêm vào dự định xem

Khi user bấm `Thêm vào dự định xem`:

- Thêm anime hiện tại vào `anime_list_entries`.
- `status = "plan_to_watch"`.
- `score = 0`.
- `progress_episodes = 0`.
- Lưu snapshot anime tối thiểu giống luồng thêm anime hiện có.
- Đánh dấu item trong phiên là `added_plan_to_watch`.
- Kết thúc phiên hiện tại.

### Xem chi tiết

Khi user bấm `Xem chi tiết`, app điều hướng đến trang chi tiết anime. Phiên không kết thúc. Khi user quay lại profile, phiên vẫn hiển thị anime hiện tại nếu item chưa được xử lý.

### Tạo phân tích mới

Khi user bấm `Tạo phân tích mới`:

- Kết thúc phiên active hiện tại.
- Kiểm tra quota tháng.
- Nếu còn quota, tạo phiên mới.
- Nếu hết quota, hiển thị trạng thái hết lượt phân tích trong tháng.

## Thuật toán MVP

Thuật toán dùng toàn bộ danh sách anime của user, nhưng mỗi entry có trọng số theo trạng thái để phản ánh độ tin cậy của tín hiệu:

- `completed`: 100
- `watching`: 80
- `plan_to_watch`: 30
- `on_hold`: 20
- `dropped`: 10

`score` của user chỉ điều chỉnh trong giới hạn của trạng thái. Vì vậy một anime `dropped` dù score cao vẫn là tín hiệu yếu hơn nhiều so với anime `completed` hoặc `watching`.

Hệ số điểm đề xuất ban đầu:

- `score 9-10`: nhân `1.2`
- `score 7-8`: nhân `1.0`
- `score 5-6`: nhân `0.7`
- `score 1-4`: nhân `0.3`
- `score 0`: nhân `0.8`

Công thức tín hiệu entry:

```ts
entryWeight = statusWeight * scoreMultiplier
```

Nguồn metadata dùng trong MVP:

- `genres`: tín hiệu gu chính.
- `format`: TV, MOVIE, OVA, ONA, SPECIAL.
- `seasonYear`: giúp nhận biết thiên hướng anime mới/cũ.
- `averageScore`: dùng để xếp hạng phụ, không phải gu cá nhân.
- `popularity`: dùng để xếp hạng phụ, không phải gu cá nhân.

Không dùng `anime_list_entries.tags` vì tag tự nhập đã bị bỏ khỏi hướng sản phẩm. Thiết kế module phân tích phải chừa điểm mở rộng để sau này thêm AniList `tags`, `studios`, `source`, `duration`.

## Hồ sơ phân tích

Khi tạo phiên, server tạo một `profile_snapshot` từ danh sách hiện tại:

- Tổng số anime đầu vào.
- Tổng trọng số hữu dụng.
- Top genres kèm điểm.
- Top formats kèm điểm.
- Khoảng năm/thiên hướng năm.
- Danh sách anime đã loại trừ.
- Mức tự tin: `low | medium | high`.

Nếu danh sách quá ít dữ liệu hoặc metadata thiếu, hệ thống vẫn cho tạo phiên. Trường hợp này fallback sang trending/popular của AniList, loại trừ anime đã có trong list và anime đã `not_interested`, đồng thời đặt mức tự tin thấp hơn.

## Search fields

Phiên cần lưu `search_fields` để minh bạch và phục vụ debug:

```json
{
  "genres": ["Action", "Drama"],
  "formats": ["TV"],
  "yearRange": { "from": 2016, "to": 2026 },
  "sortCandidates": ["SCORE_DESC", "POPULARITY_DESC", "TRENDING_DESC"],
  "confidence": "medium"
}
```

Các field này không phải contract UI cố định, nhưng giúp tái hiện lý do tạo phiên và mở đường cho giải thích kết quả sau này.

## Xếp hạng ứng viên

Ứng viên lấy từ AniList theo nhiều truy vấn nhỏ dựa trên `search_fields`, sau đó hợp nhất và loại trùng. Hệ thống loại bỏ:

- Anime đã có trong `anime_list_entries`.
- Anime đã nằm trong `anime_not_interested`.
- Anime trùng lặp trong cùng batch ứng viên.
- Anime adult nếu AniList hỗ trợ filter `isAdult: false`.

Điểm xếp hạng ứng viên nên gồm:

- Genre match score.
- Format match score.
- Year affinity score.
- AniList average score bonus.
- AniList popularity bonus.

Mỗi phiên lưu 30 item có rank từ 1 đến 30. UI luôn lấy item `pending` có rank nhỏ nhất để hiển thị.

## Schema đề xuất

### `anime_recommendation_sessions`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `status text not null default 'active'`
- `profile_snapshot jsonb not null default '{}'`
- `search_fields jsonb not null default '{}'`
- `current_rank integer not null default 1`
- `created_at timestamptz not null default now()`
- `completed_at timestamptz`
- `updated_at timestamptz not null default now()`

Ràng buộc:

- `status in ('active', 'completed', 'replaced', 'exhausted')`
- Chỉ một session `active` cho mỗi `user_id`. Có thể dùng partial unique index:

```sql
create unique index anime_recommendation_sessions_one_active_per_user_idx
  on public.anime_recommendation_sessions (user_id)
  where status = 'active';
```

Index quota:

```sql
create index anime_recommendation_sessions_user_created_idx
  on public.anime_recommendation_sessions (user_id, created_at desc);
```

### `anime_recommendation_items`

- `id uuid primary key default gen_random_uuid()`
- `session_id uuid not null references public.anime_recommendation_sessions(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `anime_id bigint not null`
- `rank integer not null`
- `match_score numeric not null default 0`
- `state text not null default 'pending'`
- `state_changed_at timestamptz`
- `reason jsonb not null default '{}'`
- `title_romaji text`
- `title_english text`
- `cover_image text`
- `format text`
- `episodes integer`
- `season_year integer`
- `average_score integer`
- `popularity integer`
- `genres text[] not null default '{}'`
- `created_at timestamptz not null default now()`

Ràng buộc:

- `state in ('pending', 'not_interested', 'marked_completed', 'added_plan_to_watch', 'skipped')`
- Unique `(session_id, anime_id)`
- Unique `(session_id, rank)`

`user_id` được lưu dư có chủ đích để RLS đơn giản và tránh phải join trong policy.

### `anime_not_interested`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `anime_id bigint not null`
- `title_romaji text`
- `title_english text`
- `cover_image text`
- `format text`
- `created_at timestamptz not null default now()`

Ràng buộc:

- Unique `(user_id, anime_id)`

## RLS

Tất cả bảng mới phải bật RLS.

Policy tối thiểu:

- User chỉ đọc session của chính mình.
- User chỉ tạo/cập nhật/kết thúc session của chính mình.
- User chỉ đọc/cập nhật item thuộc chính mình.
- User chỉ đọc/thêm/xóa `not_interested` của chính mình.

Các thao tác tạo session và xử lý item nên đi qua route handler hoặc server action để giữ logic quota, session active và upsert list nhất quán.

## API và server actions

Các thao tác đề xuất nên nằm trong module riêng, ví dụ:

- `src/lib/anime-recommendations/analyzer.ts`
- `src/lib/anime-recommendations/ranking.ts`
- `src/lib/anime-recommendations/actions.ts`
- `src/app/api/anime/recommendations/session/route.ts`

Các hành động cần có:

- `getActiveRecommendationSession()`
- `createRecommendationSession()`
- `markRecommendationCompleted(itemId)`
- `markRecommendationNotInterested(itemId)`
- `addRecommendationToPlan(itemId)`
- `replaceRecommendationSession()`

Các action phải kiểm tra lại user từ Supabase Auth trên server, không tin `user_id` từ client.

## UI

Nút `Gợi ý anime` nằm trong tab `Danh sách` của profile, gần tiêu đề hoặc cụm filter status. UI nên dùng Tailwind và giữ phong cách hiện tại: nền tối, border nhỏ, accent `#f49e0b`, radius nhỏ.

Khi có phiên active, hiển thị một panel đề xuất:

- Poster anime.
- Title.
- Format, năm, số tập.
- Genre chính.
- Điểm match hoặc nhãn mức phù hợp.
- Các nút hành động:
  - `Đã xem rồi`
  - `Không hợp gu`
  - `Thêm vào dự định xem`
  - `Xem chi tiết`
  - `Tạo phân tích mới`

Trạng thái cần có:

- Đang tạo phân tích.
- Đang xử lý hành động.
- Hết quota tháng.
- Không còn ứng viên trong phiên.
- Lỗi AniList hoặc lỗi Supabase.

## i18n

Thêm key vào `messages/vi.json`, `messages/en.json`, `messages/ja.json`, ưu tiên namespace `profile` hoặc namespace mới `recommendations`.

Key tiếng Việt cần có:

- `recommendAnime`
- `recommendationSession`
- `creatingRecommendation`
- `remainingMonthlySessions`
- `quotaExceeded`
- `alreadyWatched`
- `notMyTaste`
- `addToPlanToWatch`
- `viewDetails`
- `createNewAnalysis`
- `continueSession`
- `noCandidatesLeft`
- `recommendationFailed`
- `lowConfidence`
- `mediumConfidence`
- `highConfidence`

## Kiểm thử

Kiểm thử thủ công chính:

- User chưa đăng nhập không vào được profile.
- User không có phiên active bấm `Gợi ý anime` thì tạo phiên mới nếu còn quota.
- Reload profile vẫn mở lại phiên active.
- Bấm `Xem chi tiết` rồi quay lại profile vẫn giữ phiên.
- Bấm `Đã xem rồi` thì anime được thêm vào list với `completed`, score 0 và chuyển item tiếp theo.
- Bấm `Không hợp gu` thì anime được lưu vào `anime_not_interested` và không xuất hiện ở phiên sau.
- Bấm `Thêm vào dự định xem` thì anime được thêm vào list với `plan_to_watch` và phiên kết thúc.
- Bấm `Tạo phân tích mới` kết thúc phiên cũ và tạo phiên mới nếu còn quota.
- Tạo quá 3 phiên trong cùng tháng thì bị chặn.
- Hai user khác nhau không đọc/sửa session hoặc item của nhau.
- List ít dữ liệu vẫn tạo được phiên bằng fallback trending/popular.

Kiểm thử hồi quy:

- Profile tab list vẫn phân trang, lọc status và sửa/xóa entry bình thường.
- Trang chi tiết anime vẫn render đúng.
- Search và card anime không bị ảnh hưởng.
- Endpoint autocomplete `/api/anime/suggestions` vẫn hoạt động như cũ.

## Rủi ro

### Quota bị bypass

Nếu logic quota chỉ nằm ở client, user có thể gọi API trực tiếp. Quota phải được kiểm tra ở server và nên dùng transaction hoặc xử lý idempotent khi tạo session.

### Tạo trùng phiên active

Nhiều request song song có thể tạo hai phiên. Partial unique index `one_active_per_user` là lớp bảo vệ bắt buộc.

### AniList rate limit

Tạo phiên có thể cần nhiều query. Nên batch query vừa phải, cache kết quả ngắn hạn khi có thể và chỉ tạo 30 item sau khi hợp nhất ứng viên.

### Dữ liệu snapshot cũ

Item đề xuất lưu snapshot title/cover/format để resume nhanh. Trang chi tiết vẫn lấy dữ liệu mới từ AniList, nên snapshot cũ được chấp nhận.

### Chất lượng gợi ý thấp khi list ít dữ liệu

Fallback trending/popular giúp luôn có kết quả, nhưng cần hiển thị mức tự tin thấp để không tạo cảm giác hệ thống hiểu sai gu.

## Tiêu chí hoàn thành

- Có migration Supabase cho ba bảng đề xuất, RLS, index quota và partial unique active session.
- Profile có nút `Gợi ý anime` trong tab `Danh sách`.
- User tạo, resume và kết thúc phiên gợi ý được.
- Mỗi phiên lưu 30 item đã xếp hạng.
- Quota 3 phiên/tháng được enforce ở server.
- Các hành động trong phiên cập nhật DB và UI đúng.
- Anime đã có trong list hoặc đã `Không hợp gu` không được đề xuất lại.
- Thuật toán MVP dùng status weight, score multiplier và metadata AniList đã chốt.
- UI dùng Tailwind, giữ phong cách hiện tại và có i18n cơ bản.
