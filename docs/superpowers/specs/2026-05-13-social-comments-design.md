# Spec: Bình luận bài viết social

## Bối cảnh

Feed social hiện có bài viết, ảnh, anime liên quan, like, sửa/xóa bài viết và các nút hành động cơ bản. Nút bình luận trong `SocialPostCard` hiện chưa có hành vi. Người dùng muốn thêm tính năng bình luận theo layout tham khảo dạng modal, nhưng giữ style hiện tại của Animez, không thêm select `Phù hợp nhất` và không thêm các action dưới từng bình luận.

## Quyết định đã chốt

- Bấm nút `Bình luận` trên bài viết sẽ mở modal chi tiết bài viết.
- Modal giữ phong cách visual hiện tại của web, dùng Tailwind.
- Bình luận hỗ trợ bình luận cấp 1 và trả lời 1 tầng.
- Mọi người có thể xem bình luận của bài public.
- Chỉ người đã đăng nhập mới được gửi bình luận hoặc trả lời.
- Làm luôn phần lưu/gửi bình luận, không chỉ dựng layout tĩnh.
- Không thêm select sắp xếp `Phù hợp nhất`.
- Không thêm các action dưới bình luận như thích, trả lời nhanh, chỉnh sửa hay xóa trong phase này.

## Phạm vi

Trong phạm vi:

- Thêm schema Supabase cho bình luận bài viết.
- Thêm RLS để public đọc bình luận của bài public, authenticated user tạo bình luận.
- Thêm API hoặc server action để tải và tạo bình luận.
- Thêm `comment_count` vào dữ liệu feed.
- Thêm modal bình luận mở từ `SocialPostCard`.
- Hiển thị cây bình luận 2 cấp: comment gốc và reply trực tiếp.
- Thêm ô nhập bình luận trong modal.
- Cập nhật i18n cho tiếng Việt, tiếng Anh và tiếng Nhật nếu các namespace hiện tại yêu cầu đủ locale.

Ngoài phạm vi:

- Like bình luận.
- Sửa/xóa bình luận.
- Sắp xếp bình luận theo phù hợp nhất.
- Realtime comments.
- Notification khi có bình luận.
- Mention, sticker, GIF, ảnh trong bình luận.
- Trang chi tiết bài viết riêng.

## Thiết kế dữ liệu

### `social_post_comments`

```sql
id uuid primary key default gen_random_uuid()
post_id uuid not null references public.social_posts(id) on delete cascade
user_id uuid not null references auth.users(id) on delete cascade
parent_id uuid references public.social_post_comments(id) on delete cascade
body text not null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
deleted_at timestamptz
```

Ràng buộc đề xuất:

- `body` sau khi trim dài 1-1.000 ký tự.
- `parent_id` null là bình luận gốc.
- `parent_id` khác null là reply.
- Reply chỉ sâu 1 tầng. Server action sẽ chặn nếu `parent_id` trỏ tới một comment đã có `parent_id`.
- Bình luận bị soft delete về sau có thể giữ lại để không làm đứt thread, nhưng phase này chưa có UI xóa.

Index:

```sql
create index social_post_comments_post_created_idx
  on public.social_post_comments (post_id, created_at asc)
  where deleted_at is null;

create index social_post_comments_parent_created_idx
  on public.social_post_comments (parent_id, created_at asc)
  where deleted_at is null;
```

RLS:

- `select`: anon/authenticated đọc được comment nếu bài viết public và chưa xóa.
- `insert`: authenticated user được tạo comment với `user_id = auth.uid()` nếu bài viết đọc được.
- `update/delete`: chưa mở trong phase này.

## Dữ liệu feed

RPC `get_public_social_feed` sẽ trả thêm:

```ts
comment_count: number;
```

`comment_count` đếm các comment chưa bị xóa của bài viết, bao gồm cả reply. `SocialFeedPost` và `/api/feed` sẽ normalize field này về `0` nếu thiếu để tránh lỗi khi migration chưa chạy.

## Data flow

1. User bấm nút `Bình luận` trên `SocialPostCard`.
2. Client mở `SocialPostCommentsModal` với dữ liệu bài viết hiện tại.
3. Modal tải danh sách bình luận của bài qua API hoặc query riêng, không ép feed chính tải toàn bộ comments.
4. API trả comment gốc kèm danh sách reply 1 tầng.
5. User nhập bình luận.
6. Nếu chưa đăng nhập, UI hiển thị trạng thái cần đăng nhập và không submit.
7. Nếu đã đăng nhập, submit gọi server action tạo bình luận.
8. Server validate `post_id`, `parent_id`, `body`, auth và quyền đọc bài viết.
9. Server insert comment.
10. Client invalidate query comments của bài và invalidate `social-feed` để cập nhật `comment_count`.

## Component

### `SocialPostCard`

Thay nút bình luận hiện tại bằng nút mở modal. Nút hiển thị `comment_count` nếu có, cùng style với các action hiện tại.

### `SocialPostCommentsModal`

Modal gồm:

- Header có tiêu đề dạng `Bài viết của {author}` và nút đóng.
- Vùng nội dung bài viết dùng lại layout/card con phù hợp với style hiện tại.
- Khu vực thống kê like/comment nếu đã có dữ liệu.
- Danh sách bình luận, không có select `Phù hợp nhất`.
- Ô nhập bình luận cố định ở cuối modal.

Modal cần responsive:

- Desktop: chiều rộng tối đa khoảng `720-860px`, danh sách bình luận scroll bên trong modal.
- Mobile: modal gần full screen, footer nhập bình luận nằm cuối.

### `SocialPostCommentList`

Nhận danh sách comments đã được normalize thành:

```ts
interface SocialPostComment {
  id: string;
  post_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  author: SocialFeedAuthor;
  replies: SocialPostComment[];
}
```

Render comment gốc và replies 1 tầng. Không render các action dưới bình luận trong phase này.

### `SocialPostCommentForm`

Form nhập text đơn giản:

- Textarea tự động vừa nội dung ở mức cơ bản hoặc chiều cao cố định nhỏ.
- Nút gửi dùng icon phù hợp từ `lucide-react`.
- Disabled khi đang gửi hoặc chưa đăng nhập.
- Validate client nhẹ để không gửi chuỗi rỗng.

## Validation và lỗi

Server action:

- `post_id` phải là UUID hợp lệ.
- `parent_id` null hoặc UUID hợp lệ.
- `body.trim()` bắt buộc và tối đa 1.000 ký tự.
- User phải đăng nhập.
- Bài viết phải tồn tại, public và chưa xóa.
- Nếu là reply, parent comment phải thuộc cùng `post_id`, chưa xóa và là comment gốc.

Thông báo lỗi cần có i18n:

- Cần đăng nhập để bình luận.
- Không thể tải bình luận.
- Không thể gửi bình luận.
- Bình luận không được để trống.
- Bình luận tối đa 1.000 ký tự.

## Kiểm thử thủ công

- User chưa đăng nhập mở modal và xem được bình luận.
- User chưa đăng nhập không gửi được bình luận.
- User đã đăng nhập gửi bình luận cấp 1 thành công.
- User đã đăng nhập gửi reply cho comment gốc thành công.
- Server chặn reply vào reply.
- Số bình luận trên card tăng sau khi gửi.
- Modal không hiển thị select `Phù hợp nhất`.
- Modal không hiển thị các action dưới từng bình luận.
- Giao diện không vỡ ở mobile và desktop.
- Like, sửa bài, xóa bài và tạo bài hiện có vẫn hoạt động.

## Rủi ro

- RPC feed có thể chậm hơn nếu đếm comment trực tiếp cho nhiều bài. Với MVP có thể dùng lateral count giống like hiện tại; nếu feed lớn hơn, cân nhắc denormalized counter.
- Không có realtime nên comment mới từ người khác không tự xuất hiện nếu modal đang mở.
- Chưa có xóa/sửa bình luận nên cần tránh tạo UI gợi ý các action chưa làm.

## Tiêu chí hoàn thành

- Có migration cho `social_post_comments`, index và RLS.
- Feed trả `comment_count`.
- Nút bình luận mở modal.
- Modal tải, hiển thị và gửi bình luận thật.
- Hỗ trợ comment gốc và reply 1 tầng.
- Không có select `Phù hợp nhất`.
- Không có action dưới từng bình luận.
- UI dùng Tailwind và khớp phong cách hiện tại.
- Lint/build hoặc kiểm thử liên quan chạy được, hoặc có báo cáo rõ nếu không chạy được.
