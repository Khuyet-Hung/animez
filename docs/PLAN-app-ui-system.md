# Kế hoạch chuẩn hóa theme và App UI components

Ngày tạo: 2026-05-14

## Mục tiêu

Hiện tại app đang hard-code màu sắc, bo góc, border, surface và trạng thái hover ở nhiều component. Mục tiêu của kế hoạch này là tạo một hệ thống style tập trung để sau này đổi giao diện dễ hơn, đồng thời refactor dần các màn hiện có mà không làm gián đoạn behavior.

Kết quả mong muốn:

- Theme token được định nghĩa tập trung trong `src/app/globals.css`.
- Các UI primitive dạng `App*` được đặt trong `src/components/ui`.
- Các màn hiện có dùng lại component chung thay vì hard-code Tailwind class lặp lại.
- File todo riêng theo dõi trạng thái refactor qua nhiều phiên làm việc.

## Nguyên tắc triển khai

- Ưu tiên Tailwind class và Tailwind v4 `@theme`.
- Không thêm thư viện mới nếu chưa cần. Repo đã có `clsx`, trước mắt dùng `clsx` qua helper `cn`.
- Không refactor toàn bộ app trong một lần lớn. Làm theo module để dễ review và dễ rollback.
- Không gom mọi màu vào token. Chỉ token hóa màu thuộc design system.
- Giữ nguyên behavior hiện tại, chỉ chuẩn hóa giao diện và API component.
- Component UI chung phải nhỏ, dễ đọc, không tạo abstraction quá sớm.
- Dùng `useMemo`, `useCallback`, `memo` có chọn lọc, không thêm chỉ để "tối ưu" hình thức.

## Phạm vi không token hóa

Các trường hợp sau có thể giữ nguyên hard-code:

- Màu trong SVG cờ, logo Google, asset tĩnh.
- Màu trạng thái semantic rõ nghĩa như `red-500`, `green-500`, `blue-500` nếu chỉ dùng cho error/success/status.
- Màu động từ API, ví dụ `anime.coverImage?.color`.
- Shadow hoặc hiệu ứng đặc thù chỉ xuất hiện ở một component và không phải pattern chung.

## Giai đoạn 1: Theme tokens

File chính: `src/app/globals.css`

Mở rộng `@theme` theo vai trò UI, không đặt tên theo màu cụ thể.

Nhóm màu đề xuất:

```css
@theme {
  --color-bg: #0a0a0f;
  --color-bg-muted: #0d0d14;
  --color-surface: #111118;
  --color-surface-muted: #0f0f16;
  --color-surface-elevated: #171720;

  --color-border: #1a1a24;
  --color-border-strong: #2a2a35;
  --color-border-soft: #242432;

  --color-fg: #ffffff;
  --color-fg-soft: #d1d5db;
  --color-fg-muted: #9ca3af;
  --color-fg-subtle: #5f6472;
  --color-fg-disabled: #4a4a5a;

  --color-brand: #f49e0b;
  --color-brand-hover: #d68a09;
  --color-brand-soft: #f6b13b;
  --color-brand-fg: #0a0a0f;

  --radius-ui-xs: 0.125rem;
  --radius-ui-sm: 0.25rem;
  --radius-ui-md: 0.5rem;
  --radius-ui-lg: 0.75rem;
  --radius-ui-xl: 1rem;
  --radius-ui-pill: 9999px;
}
```

Các token cũ như `primary`, `surface-dark`, `border-dark` có thể giữ tạm để tránh phá code đang dùng. Sau khi refactor xong có thể dọn dần.

## Giai đoạn 2: Helper className

File đề xuất: `src/lib/cn.ts`

Mục tiêu là thống nhất cách nối className cho component UI.

```ts
import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
```

Chưa dùng `tailwind-merge` hoặc `class-variance-authority` ở bước đầu. Khi component variant nhiều và có xung đột class, có thể cân nhắc sau.

## Giai đoạn 3: App UI core components

Thư mục chính: `src/components/ui`

### `AppButton`

Mục tiêu:

- Thay các button chính, phụ, ghost, destructive.
- Hỗ trợ `isLoading`, `leftIcon`, `rightIcon`, `fullWidth`.

Variant đề xuất:

- `primary`: brand background, dùng cho CTA chính.
- `secondary`: surface + border, dùng cho hành động phụ.
- `ghost`: nền trong suốt, dùng cho menu/action nhẹ.
- `danger`: dùng cho destructive action.
- `link`: dùng cho action dạng text.

Size đề xuất:

- `sm`: cao 9 hoặc 10 tùy context.
- `md`: cao 11, default cho form.
- `lg`: cao 12.
- `icon`: nút vuông.

### `AppIconButton`

Mục tiêu:

- Dùng cho close, menu, back, like/comment/share, carousel previous/next.
- Bắt buộc truyền `aria-label`.

Variant đề xuất:

- `default`: border + text muted.
- `ghost`: nền trong suốt.
- `brand`: brand tint.
- `danger`: destructive.

### `AppInput`

Mục tiêu:

- Chuẩn hóa input trong auth, profile settings, search, anime-list editor.
- Hỗ trợ `error`, `leftIcon`, `rightSlot` nếu cần.

### `AppTextarea`

Mục tiêu:

- Dùng cho profile bio, comments, post caption, notes.
- Chuẩn hóa resize, focus, disabled, placeholder.

### `AppSelect`

Mục tiêu:

- Chuẩn hóa native select hiện có trong filter và anime-list.
- Chưa cần custom dropdown phức tạp ở bước đầu.

### `AppPanel`

Mục tiêu:

- Thay các block `rounded border bg...` lặp lại.

Variant đề xuất:

- `default`: surface + border.
- `muted`: bg-muted + border.
- `elevated`: surface + border-strong + shadow.
- `interactive`: hover border brand.

### `AppBadge`

Mục tiêu:

- Dùng cho status anime list, genre, filter chip, label brand, score.

Variant đề xuất:

- `brand`
- `neutral`
- `success`
- `warning`
- `danger`
- `info`

### `AppAvatar`

Mục tiêu:

- Dùng chung cho auth menu, profile, social post/comment.
- Hỗ trợ image URL và fallback initials.

Size đề xuất:

- `xs`, `sm`, `md`, `lg`, `xl`.

### `AppSpinner`

Mục tiêu:

- Loader nhỏ trong button, fetch state, inline loading.

### `AppSkeleton`

Mục tiêu:

- Loading placeholder cho card, post, profile block.

## Giai đoạn 4: App UI overlay/state components

Tạo sau khi core component ổn định.

### `AppDialog`

Mục tiêu:

- Modal thường: comment modal, image viewer side panel, anime list editor.
- Cung cấp frame/header/body/footer nhất quán.

Ghi chú:

- Nếu cần accessibility nâng cao, cân nhắc dùng Radix/shadcn sau. Bước đầu có thể chỉ refactor modal hiện có nếu đã tự quản lý keyboard/focus.

### `AppAlertDialog`

Mục tiêu:

- Xác nhận xóa post, hủy chỉnh sửa, destructive action.

### `AppTooltip`

Mục tiêu:

- Tooltip cho icon button và navigation action.
- Nếu chỉ cần hover đơn giản, có thể tạo bằng CSS/Tailwind trước.
- Nếu cần keyboard/focus đầy đủ, cân nhắc Radix Tooltip.

### `AppEmptyState`

Mục tiêu:

- Chuẩn hóa empty posts, empty comments, empty recommendations, empty search.

### `AppErrorState`

Mục tiêu:

- Chuẩn hóa load failed, retry button, message.

### `AppSectionHeader`

Mục tiêu:

- Header có title, description, action slot.
- Dùng trong profile, anime detail, social feed, recommendations.

## Giai đoạn 5: Thứ tự refactor module

### 1. Auth

Files dự kiến:

- `src/components/auth/LoginForm.tsx`
- `src/components/auth/RegisterForm.tsx`
- `src/components/auth/ForgotPasswordForm.tsx`
- `src/components/auth/ResetPasswordForm.tsx`
- `src/app/[locale]/(auth)/login/page.tsx`
- `src/app/[locale]/(auth)/register/page.tsx`
- `src/app/[locale]/(auth)/forgot-password/page.tsx`
- `src/app/[locale]/(auth)/reset-password/page.tsx`

Lý do làm trước:

- Input, button, panel lặp lại nhiều.
- Phạm vi dễ kiểm tra.
- Ít phụ thuộc layout phức tạp.

### 2. Profile

Files dự kiến:

- `src/app/[locale]/profile/page.tsx`
- `src/app/[locale]/u/[username]/page.tsx`
- `src/components/profile/ProfileDashboard.tsx`
- `src/components/profile/ProfileStats.tsx`
- `src/components/profile/ProfileSettingsForm.tsx`
- `src/components/profile/ProfilePostsList.tsx`
- `src/components/profile/ProfileAvatar.tsx`

### 3. Recommendations

Files dự kiến:

- `src/app/[locale]/profile/recommendations/page.tsx`
- `src/app/[locale]/profile/recommendations/loading.tsx`
- `src/components/recommendations/RecommendationLoading.tsx`
- `src/components/recommendations/RecommendationSessionPanel.tsx`

### 4. Layout

Files dự kiến:

- `src/components/layout/Navbar.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/auth/AuthButton.tsx`

### 5. Search

Files dự kiến:

- `src/components/search/SearchBar.tsx`
- `src/components/search/FilterPanel.tsx`

### 6. Anime và anime-list

Files dự kiến:

- `src/components/anime/AnimeCard.tsx`
- `src/components/anime/HeroSection.tsx`
- `src/components/anime/TrailerModalButton.tsx`
- `src/app/[locale]/anime/[id]/page.tsx`
- `src/components/anime-list/AnimeListButton.tsx`
- `src/components/anime-list/AnimeListEditor.tsx`
- `src/lib/anime-list/constants.ts`

### 7. Social

Files dự kiến:

- `src/components/social/CreatePostButton.tsx`
- `src/components/social/feed/SocialFeedPage.tsx`
- `src/components/social/feed/SocialFeedList.tsx`
- `src/components/social/feed/SocialPostCard.tsx`
- `src/components/social/feed/SocialPostCommentsModal.tsx`
- `src/components/social/feed/SocialPostImageViewer.tsx`
- `src/components/social/feed/SocialPostImages.tsx`
- `src/components/social/feed/SocialPostAnime.tsx`

Lý do để sau:

- Nhiều state động.
- Nhiều modal và interaction.
- Dễ phát sinh regression nếu refactor trước khi core component ổn định.

## Chiến lược kiểm tra

Sau mỗi module refactor:

1. Chạy `npm run lint`.
2. Kiểm tra TypeScript qua build nếu thay đổi nhiều file hoặc có component generic.
3. Nếu có dev server, kiểm tra nhanh các màn bị ảnh hưởng.

Sau toàn bộ refactor:

1. Search hard-code còn lại:
   - `#[0-9a-fA-F]{3,8}`
   - `bg-[#`
   - `text-[#`
   - `border-[#`
   - `rounded-`
2. Phân loại các hard-code còn lại: hợp lệ hay cần refactor.
3. Cập nhật `docs/TODO-app-ui-system.md`.

## Quy ước cập nhật tài liệu

- Khi bắt đầu một module, đánh dấu checklist tương ứng trong `docs/TODO-app-ui-system.md`.
- Khi hoàn thành module, ghi lại file đã refactor và ghi chú còn nợ nếu có.
- Nếu phát hiện component UI mới cần thêm, cập nhật cả kế hoạch này và todo.
- Không xóa checklist đã hoàn thành; giữ lại để các phiên chat sau đọc được lịch sử.

