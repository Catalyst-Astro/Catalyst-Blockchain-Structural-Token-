import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

const uid = () => crypto.randomUUID();

// ─── Hardcoded Catalyst account ────────────────────────────────────
const CATALYST_EMAIL = "incubadoracatalyst@gmail.com";
const CATALYST_PASSWORD = "CuentaIncubadora1891@";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@email.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) return null;

        // Check against hardcoded account
        if (email !== CATALYST_EMAIL || password !== CATALYST_PASSWORD) {
          return null;
        }

        // Find or create user in database
        let user = db.select().from(users).where(eq(users.email, email)).get();

        if (!user) {
          const id = uid();
          db.insert(users)
            .values({
              id,
              name: "Catalyst Incubadora",
              email,
              image: null,
            })
            .run();
          user = { id, name: "Catalyst Incubadora", email, emailVerified: null, image: null };
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id!;
        token.email = user.email!;
        token.name = user.name!;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.email = token.email!;
        session.user.name = token.name!;
        session.user.image = token.picture;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
});
