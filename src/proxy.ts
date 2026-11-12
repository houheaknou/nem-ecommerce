import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Coarse route gating only (admin area / account area). Fine-grained
// permission checks happen server-side in every action and page.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
