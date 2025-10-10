import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/prisma";
import { admin } from "better-auth/plugins";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",

  secret: process.env.BETTER_AUTH_SECRET!,

  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") || []) 
  ],

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, 
    },
    expiresIn: 60 * 60 * 24 * 7, 
    updateAge: 60 * 60 * 24, 
  },
  plugins: [
    admin({
      adminRoles: ["admin"],
      defaultRole: "user",
    }),
  ],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      accessType: "offline",
      prompt: "select_account consent",
    },
  },
});
