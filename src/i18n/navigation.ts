import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware navigation utilities.
// Use these instead of next/link and next/navigation throughout the app.
export const { Link, useRouter, usePathname, redirect } = createNavigation(routing);
