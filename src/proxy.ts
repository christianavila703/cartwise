import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// sends signed-out visitors of admin pages to the login page.
// the admin role is checked by the admin layout and every admin server action against the database,
// because the role in the session cookie can be stale until the session is refreshed
export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
