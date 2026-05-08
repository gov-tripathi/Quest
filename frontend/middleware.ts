import { type NextRequest, NextResponse } from "next/server";

// Auth is handled client-side in layout.tsx (supports both Supabase and guest mode).
// Middleware just ensures the response passes through without interference.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
