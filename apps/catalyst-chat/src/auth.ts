import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { db } from "./db";
import { users, accounts } from "./db/schema";
import { eq, and } from "drizzle-orm";

const uid = () => crypto.randomUUID();

// Build providers based on configured credentials
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const providers: any[] = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providers.push(Google({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
  }) as any);
}

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    })
  );
}

// Email magic link: requires EMAIL_SERVER to be configured
// When configured, uncomment:
// import Email from "next-auth/providers/email";
// if (process.env.EMAIL_SERVER) {
//   providers.push(Email({
//     server: process.env.EMAIL_SERVER,
//     from: process.env.EMAIL_FROM || "Catalyst Chat <noreply@catalyst.ai>",
//   }));
// }

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      // Upsert user
      const existing = db
        .select()
        .from(users)
        .where(eq(users.email, user.email))
        .get();

      if (!existing) {
        db.insert(users)
          .values({
            id: uid(),
            name: user.name || user.email.split("@")[0],
            email: user.email,
            image: user.image,
          })
          .run();
      } else if (user.name || user.image) {
        db.update(users)
          .set({
            name: user.name || existing.name,
            image: user.image || existing.image,
          })
          .where(eq(users.email, user.email))
          .run();
      }

      // Link OAuth account
      if (account && account.provider !== "email") {
        const currentUser =
          existing ||
          db.select().from(users).where(eq(users.email, user.email)).get();
        if (currentUser) {
          const existingAccount = db
            .select()
            .from(accounts)
            .where(
              and(
                eq(accounts.provider, account.provider),
                eq(accounts.providerAccountId, account.providerAccountId)
              )
            )
            .get();
          if (!existingAccount) {
            db.insert(accounts)
              .values({
                id: uid(),
                userId: currentUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state as string,
              })
              .run();
          }
        }
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = db
          .select()
          .from(users)
          .where(eq(users.email, user.email))
          .get();
        if (dbUser) {
          token.sub = dbUser.id;
          token.email = dbUser.email;
          token.name = dbUser.name;
          token.picture = dbUser.image;
        }
      }
      // For subsequent calls, look up by email from token
      if (!token.sub && token.email) {
        const dbUser = db
          .select()
          .from(users)
          .where(eq(users.email, token.email))
          .get();
        if (dbUser) {
          token.sub = dbUser.id;
          token.name = dbUser.name;
          token.picture = dbUser.image;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
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
