import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

const uid = () => crypto.randomUUID();

// ─── Cuenta Catalyst por defecto — acceso directo solo con correo ───
const CATALYST_EMAIL = "incubadoracatalyst@gmail.com";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@email.com" },
      },
      async authorize(credentials) {
        // Acceso directo: solo el correo, sin contraseña (app local/LAN)
        const email = ((credentials?.email as string) || CATALYST_EMAIL).trim().toLowerCase();
        if (!email.includes("@")) return null;

        // Find or create user in database
        let user = db.select().from(users).where(eq(users.email, email)).get();

        if (!user) {
          const id = uid();
          const name =
            email === CATALYST_EMAIL ? "Catalyst Incubadora" : email.split("@")[0];
          db.insert(users)
            .values({
              id,
              name,
              email,
              image: null,
            })
            .run();
          user = { id, name, email, emailVerified: null, image: null };
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
