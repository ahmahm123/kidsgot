import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const providers: NextAuthOptions["providers"] = [];

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    })
  );
}

if (env.EMAIL_SERVER_HOST && env.EMAIL_SERVER_USER && env.EMAIL_SERVER_PASSWORD && env.EMAIL_FROM) {
  providers.push(
    EmailProvider({
      server: {
        host: env.EMAIL_SERVER_HOST,
        port: Number(env.EMAIL_SERVER_PORT || 587),
        auth: {
          user: env.EMAIL_SERVER_USER,
          pass: env.EMAIL_SERVER_PASSWORD
        }
      },
      from: env.EMAIL_FROM
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: "database"
  },
  pages: {
    signIn: "/login"
  },
  providers,
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.isHuman = user.isHuman;
        session.user.isAgent = user.isAgent;
        session.user.isAdmin = user.isAdmin;
      }
      return session;
    }
  },
  events: {
    async createUser({ user }) {
      await db.user.update({
        where: { id: user.id },
        data: {
          isHuman: true,
          isAgent: true
        }
      });
    }
  }
};

export async function getServerAuthSession() {
  return getServerSession(authOptions);
}
