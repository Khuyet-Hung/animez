import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ToastProvider } from "@/components/common/ToastProvider";
import { routing } from "@/i18n/routing";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering & distribute locale to all Server Components
  setRequestLocale(locale);

  return (
    <NextIntlClientProvider>
      <ToastProvider>{children}</ToastProvider>
    </NextIntlClientProvider>
  );
}
