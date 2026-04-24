# Spec: Anime Favorites After Login

## Bối cảnh

Animez hiện đã có:

- Xác thực người dùng bằng Supabase Auth trên cả client và server.
- Route guard cho các khu vực cần đăng nhập qua `middleware.ts`.
- Dữ liệu anime lấy từ AniList.
- Giao diện hiển thị anime qua `AnimeCard` và trang chi tiết anime.

Hiện tại trang chi tiết đã có nút placeholder `Thêm vào danh sách`, nhưng dự án chưa có lớp dữ liệu để lưu trạng thái anime yêu thích theo từng tài khoản. `AnimeCard` cũng chưa có điểm chạm để người dùng thao tác nhanh với mục yêu thích.

## Mục tiêu

- Cho phép người dùng đã đăng nhập thêm hoặc bỏ anime khỏi danh sách yêu thích.
- Lưu dữ liệu yêu thích theo tài khoản để giữ trạng thái sau khi tải lại trang hoặc đăng nhập trên thiết bị khác.
- Hiển thị và thao tác được nút yêu thích ở:
  - Trang chi tiết anime.
  - `AnimeCard`, với icon trái tim nằm bên trái CTA `Xem chi tiết`.
- Nếu người dùng chưa đăng nhập, hiển thị prompt yêu cầu đăng nhập và cung cấp CTA để chuyển tới trang đăng nhập rồi quay lại trang hiện tại.

## Ngoài phạm vi

- Chưa triển khai trang `/watchlist` hoặc trang danh sách yêu thích riêng.
- Chưa đồng bộ thời gian thực giữa nhiều instance của cùng một anime trên toàn bộ trang.
- Chưa thêm hệ thống toast hoặc notification framework mới.
- Chưa lưu metadata anime đầy đủ trong cơ sở dữ liệu cục bộ; chỉ lưu khóa nhận diện anime.

## Cách tiếp cận được chọn

Chọn lưu yêu thích bằng một bảng riêng trong Supabase, dùng một bản ghi cho mỗi cặp `user_id` và `anime_id`.

Lý do chọn:

- Phù hợp với mô hình quan hệ và dễ mở rộng cho `/watchlist` sau này.
- Đồng bộ tốt giữa nhiều thiết bị vì dữ liệu nằm ở backend.
- Query đơn giản, kiểm soát bằng RLS rõ ràng.
- Không làm phình `user_metadata` của Supabase Auth.

## Các phương án đã cân nhắc

### 1. Bảng `user_favorites` trong Supabase

Đây là phương án được chọn.

Ưu điểm:

- Rõ mô hình dữ liệu.
- Dễ query, insert, delete.
- Phù hợp khi sau này cần danh sách, phân trang, sắp xếp theo thời gian thêm.

Nhược điểm:

- Cần tạo schema SQL và RLS policy.

### 2. Lưu vào `user_metadata`

Ưu điểm:

- Không cần thêm bảng mới.

Nhược điểm:

- Cập nhật cả object metadata cho mỗi lần đổi trạng thái.
- Khó query và không phù hợp khi danh sách tăng lên.
- Không thuận tiện cho các màn hình danh sách sau này.

### 3. Lưu local trước, đồng bộ sau

Ưu điểm:

- Có thể cho cảm giác rất nhanh ở client.

Nhược điểm:

- Tăng độ phức tạp do phải merge giữa local và remote.
- Không cần thiết cho phạm vi hiện tại.

## Thiết kế dữ liệu

### Bảng `user_favorites`

Các cột tối thiểu:

- `user_id uuid not null`
- `anime_id bigint not null`
- `created_at timestamptz not null default now()`

Ràng buộc:

- Khóa chính hoặc unique composite trên `(user_id, anime_id)`.
- `user_id` tham chiếu `auth.users(id)` với hành vi xóa cascade để dọn dữ liệu khi tài khoản bị xóa.

Mục tiêu dữ liệu:

- Mỗi người dùng chỉ có tối đa một bản ghi cho một anime.
- Không lưu trùng.
- Không lưu thêm title, image, score ở phase này vì các dữ liệu đó đã lấy từ AniList.

### RLS

Cần bật RLS cho bảng và thêm các policy:

- `select`: người dùng chỉ đọc favorite của chính họ.
- `insert`: người dùng chỉ thêm bản ghi với `user_id = auth.uid()`.
- `delete`: người dùng chỉ xóa bản ghi của chính họ.

## Kiến trúc component và state

### 1. Hook `useFavorites(animeId)`

Tạo một hook client để đóng gói logic yêu thích:

- Đọc trạng thái đăng nhập từ `useAuth()`.
- Kiểm tra anime hiện tại đã được lưu chưa.
- Cung cấp API dùng lại:
  - `isFavorite`
  - `isPending`
  - `errorMessage`
  - `toggleFavorite()`
  - `needsLogin`

Hook sẽ:

- Gọi Supabase client để `select` bản ghi hiện có khi user đã đăng nhập.
- `insert` khi thêm yêu thích.
- `delete` khi bỏ yêu thích.
- Dùng optimistic update để phản hồi nhanh.
- Hoàn tác state nếu request thất bại.

Không dùng global store ở phase này để giữ thay đổi nhỏ, dễ hiểu và dễ kiểm soát.

### 2. Component `FavoriteButton`

Tạo component client dùng lại được cho các điểm chạm khác nhau.

Props tối thiểu:

- `animeId`
- `variant`: `card` | `detail`
- `className` nếu cần tinh chỉnh layout

Hành vi:

- Render icon trái tim rỗng hoặc đầy theo `isFavorite`.
- Disable trong lúc request đang chạy.
- Tự xử lý trường hợp chưa đăng nhập bằng prompt nội bộ.
- Với `variant="detail"` hiển thị cả label.
- Với `variant="card"` ưu tiên icon-only để giữ card gọn.

### 3. Prompt đăng nhập

Không thêm dependency mới. Dùng prompt inline nhẹ trong chính `FavoriteButton`.

Nội dung prompt:

- Thông báo người dùng cần đăng nhập để lưu anime yêu thích.
- Một nút CTA sang trang đăng nhập.
- Giữ `next` bằng URL hiện tại để sau khi đăng nhập có thể quay về đúng trang đang thao tác.

## Điểm chạm UI

### 1. Trang chi tiết anime

Thay nút placeholder hiện tại bằng `FavoriteButton` bản `detail`.

Yêu cầu UI:

- Vẫn giữ phong cách nút hiện có.
- Có label rõ ràng:
  - `Yêu thích`
  - `Đã yêu thích`
- Có trạng thái đang xử lý để tránh double click.

### 2. `AnimeCard`

Thêm `FavoriteButton` bản `card` trong lớp overlay của card.

Vị trí:

- Nằm bên trái CTA `Xem chi tiết`.
- Là một nút overlay riêng, không phá layout card.

Yêu cầu tương tác:

- Bấm tim không được kích hoạt điều hướng của `Link`.
- Cần `preventDefault()` và `stopPropagation()` trên sự kiện click của nút tim.
- Trên desktop nút có thể nổi bật hơn khi hover, nhưng trên mobile vẫn phải nhìn thấy và bấm được.

## Luồng hoạt động

### Khi người dùng đã đăng nhập

1. Component mount.
2. Hook kiểm tra trạng thái favorite theo `anime_id` và `user.id`.
3. Nếu chưa có bản ghi, hiển thị tim rỗng.
4. Nếu đã có bản ghi, hiển thị tim đầy.
5. Khi người dùng bấm:
   - Nếu đang chưa favorite, UI chuyển sang trạng thái đã favorite ngay rồi gửi `insert`.
   - Nếu đang favorite, UI chuyển sang trạng thái chưa favorite ngay rồi gửi `delete`.
6. Nếu request lỗi, hoàn tác UI và hiển thị thông báo lỗi ngắn.

### Khi người dùng chưa đăng nhập

1. Người dùng bấm nút tim.
2. Không gửi request tới bảng favorite.
3. Hiển thị prompt yêu cầu đăng nhập.
4. Prompt có CTA sang `/login?next=<current-path>`.

## Xử lý lỗi và trạng thái bất thường

- Nếu `select`, `insert` hoặc `delete` thất bại:
  - Hoàn tác optimistic state.
  - Hiển thị thông báo ngắn: không thể cập nhật mục yêu thích.
- Nếu session hết hạn trong lúc thao tác:
  - Xem như trạng thái chưa đăng nhập.
  - Hiển thị prompt đăng nhập.
- Nếu cùng lúc có nhiều nút favorite cho cùng một anime trên cùng màn hình:
  - Phase này không đảm bảo đồng bộ tức thì giữa mọi instance.
  - Mỗi instance quản lý trạng thái độc lập theo vòng đời riêng của nó.

## i18n

Thêm key mới cho `messages/vi.json` và `messages/en.json`.

Nhóm nội dung cần có:

- Label nút:
  - `favorite`
  - `favorited`
  - `addToFavorites`
  - `removeFromFavorites`
- Prompt đăng nhập:
  - `loginRequiredTitle`
  - `loginRequiredDescription`
  - `goToLogin`
- Thông báo lỗi:
  - `favoriteUpdateFailed`

Có thể tách nhóm message riêng như `favorites` hoặc đặt trong `detail` và `card` tùy cách tổ chức hiện có. Khuyến nghị tạo namespace riêng để tái sử dụng giữa detail và card.

## Tổ chức code đề xuất

- `src/hooks/useFavorites.ts`
- `src/components/anime/FavoriteButton.tsx`
- Cập nhật [src/components/anime/AnimeCard.tsx](/d:/MyProjects/animez/src/components/anime/AnimeCard.tsx)
- Cập nhật [src/app/[locale]/anime/[id]/page.tsx](/d:/MyProjects/animez/src/app/[locale]/anime/[id]/page.tsx)
- Cập nhật file message `vi/en`
- Thêm tài liệu SQL hoặc migration cho Supabase nếu repo đang quản lý schema trong mã nguồn

Nếu repo chưa có thư mục migration chuẩn, vẫn cần ít nhất một file SQL tài liệu hóa schema để tránh cấu hình chỉ tồn tại trên dashboard Supabase.

## Kiểm thử

Kiểm thử thủ công tối thiểu:

- Đăng nhập, thêm favorite từ trang chi tiết.
- Đăng nhập, bỏ favorite từ trang chi tiết.
- Đăng nhập, toggle favorite từ `AnimeCard`.
- Chưa đăng nhập, bấm tim từ detail hiện prompt và CTA login.
- Chưa đăng nhập, bấm tim từ card hiện prompt và CTA login.
- Đăng nhập xong quay lại đúng trang qua `next`.
- Tải lại trang sau khi thêm favorite vẫn giữ đúng trạng thái.

Kiểm thử hồi quy:

- Card vẫn điều hướng bình thường khi bấm vào vùng ngoài nút tim.
- Nút tim không làm hỏng hover overlay hiện có.
- Trang chi tiết không bị lệch layout sau khi thay nút placeholder.

## Rủi ro và cách giảm thiểu

### 1. Bị bấm lặp nhiều lần

Rủi ro:

- Gửi nhiều request liên tiếp, tạo trạng thái đua.

Giảm thiểu:

- Khóa nút trong lúc request đang chạy.

### 2. Mất đồng bộ giữa nhiều instance

Rủi ro:

- Cùng một anime xuất hiện ở nhiều nơi nhưng không đổi trạng thái đồng thời.

Giảm thiểu:

- Chấp nhận trong phase đầu.
- Khi mở rộng có thể thêm store chia sẻ hoặc cache invalidation nhẹ.

### 3. Logic login redirect không nhất quán giữa locale

Rủi ro:

- Điều hướng sai locale hoặc mất `next`.

Giảm thiểu:

- Dùng URL hiện tại để tạo `next`.
- Tái sử dụng pattern redirect đang có trong flow đăng nhập hiện tại.

## Tiêu chí hoàn thành

- Người dùng đăng nhập có thể thêm và bỏ favorite từ trang detail và `AnimeCard`.
- Trạng thái favorite được giữ sau khi tải lại trang.
- Người dùng chưa đăng nhập nhận được prompt đăng nhập có CTA chuyển trang và giữ `next`.
- Nút tim trên card nằm bên trái CTA `Xem chi tiết` và không kích hoạt điều hướng ngoài ý muốn.
- Không phát sinh regression rõ ràng ở layout card, hover overlay, hoặc trang chi tiết.
