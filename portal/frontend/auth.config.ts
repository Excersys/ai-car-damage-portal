import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  providers: [],
  callbacks: {
    authorized: async ({ auth, request: { nextUrl } }) => {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard')

      if (isOnDashboard) {
        return isLoggedIn
      }
      return true
    },
  },
} satisfies NextAuthConfig
