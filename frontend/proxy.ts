import { NextRequest, NextResponse } from "next/server";




export function proxy(request: NextRequest) {

    const token = request.cookies?.get("token")?.value
    console.log(`token: %s`, token)
    const pathname = request.nextUrl.pathname 
    console.log(`path: %s`, pathname);
    
    if (pathname.startsWith("/explore") && !token) {
        return NextResponse.redirect(new URL("/scan", request.url))
    }

    
    if ((pathname === "/scan" || pathname === "/") && token) {
      return NextResponse.redirect(new URL("/explore", request.url));
    }

    return NextResponse.next()

}

export const config = {
    matcher: ["/explore/:path*", "/scan/:path*", "/"]
}