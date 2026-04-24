# PLAN: Forgot Password Reset Flow

## Background

Luồng quên mật khẩu hiện tại:
1. ✅ User vào `/forgot-password` → nhập email → Supabase gửi email reset
2. ✅ Email chứa link dạng: `{origin}/auth/callback?next=/reset-password&token_hash=...&type=recovery`
3. ❌ **THIẾU**: `/auth/callback` route handler — thư mục tồn tại nhưng **TRỐNG**, không có `route.ts`
4. ✅ Trang `/reset-password` đã có với `ResetPasswordForm.tsx` hoàn chỉnh

**Root cause:** `ForgotPasswordForm.tsx` gửi `redirectTo: .../auth/callback?next=/reset-password`, nhưng không có API route nào xử lý callback này để exchange token → set session → redirect sang `/reset-password`.

---

## Phân tích luồng Supabase

Khi user nhấn link trong email, Supabase redirect đến:
```
/auth/callback?token_hash=<hash>&type=recovery&next=/reset-password
```

Route handler cần:
1. Lấy `token_hash` và `type` từ query params
2. Gọi `supabase.auth.verifyOtp({ token_hash, type })` để exchange token → tạo session
3. Redirect user sang `/{locale}/reset-password` (có kèm locale)
4. Xử lý lỗi nếu token hết hạn hoặc invalid

---

## Proposed Changes

### Phase 1: Tạo Auth Callback Route Handler

#### [NEW] `src/app/auth/callback/route.ts`

Route handler xử lý OTP exchange cho:
- Email confirmation (`type=signup`)
- Password recovery (`type=recovery`)  
- Magic link (`type=magiclink`)

```
Logic:
  - Đọc token_hash + type + next từ searchParams
  - verifyOtp() → nếu OK: redirect sang next (có locale)
  - Nếu error: redirect sang /auth/error?message=...
```

> **Lưu ý về locale:** URL trong email KHÔNG có locale prefix (origin là gốc app). Khi redirect từ callback, cần thêm locale mặc định `/vi` hoặc đọc từ cookie.

---

### Phase 2: Xử lý Locale trong Callback

Callback URL không có locale (vì redirect từ email). Cần:
- Đọc cookie `NEXT_LOCALE` (do next-intl set) nếu có
- Fallback về `vi` (defaultLocale theo routing config)
- Redirect sang `/{locale}/reset-password`

---

### Phase 3: Middleware — đảm bảo `/reset-password` có thể truy cập

Hiện tại `reset-password` route KHÔNG nằm trong `PROTECTED_ROUTES`. Điều này là đúng vì user cần truy cập trang này TRƯỚC KHI có session đầy đủ (session tạm thời sau OTP exchange). Không cần thay đổi middleware.

---

### Phase 4: Kiểm tra i18n

Trang `reset-password` đang dùng `getTranslations("auth")` — tất cả keys đã có trong `en.json` và cần check `vi.json`:
- `resetPassword`, `resetPasswordDesc`, `newPassword`, `confirmNewPassword`
- `resetPasswordButton`, `resetPasswordSuccess`, `resetPasswordError`, `passwordMismatch`, `passwordTooShort`

---

## Files To Create/Modify

| File | Action | Mô tả |
|------|--------|--------|
| `src/app/auth/callback/route.ts` | **[NEW]** | Route handler chính — exchange OTP token, tạo session, redirect |

> **Chỉ cần tạo 1 file duy nhất.** Tất cả components và pages đã có sẵn và hoàn chỉnh.

---

## Verification Plan

### Manual Testing (Step-by-step)

1. Chạy dev server: `npm run dev` (đang chạy)
2. Vào `http://localhost:3000/vi/forgot-password`
3. Nhập email đã đăng ký → nhấn **Send reset link**
4. Kiểm tra email → click link reset password
5. **Expected:** Bị redirect về `http://localhost:3000/vi/reset-password`
6. Nhập mật khẩu mới (≥6 ký tự) → nhấn Update password
7. **Expected:** Hiện thông báo thành công → tự redirect về `/vi/login` sau 2.5s
8. Thử đăng nhập với mật khẩu mới → **Expected:** Đăng nhập thành công

### Error Cases

| Scenario | Expected |
|----------|----------|
| Link đã hết hạn | Redirect về `/auth/error` hoặc trang lỗi |
| Token invalid | Hiện thông báo lỗi |
| Truy cập `/reset-password` không qua email link | Form hiện nhưng khi submit sẽ báo lỗi (không có session) |

---

## Estimated Effort

- **1 file mới** (~35 dòng)
- **Thời gian ước tính:** 15 phút
