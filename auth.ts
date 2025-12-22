import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: {
            email,
          },
        })

        if (!user || !user.passwordHash) {
          return null
        }

        const passwordsMatch = await bcrypt.compare(
          password,
          user.passwordHash
        )

        if (!passwordsMatch) {
          return null
        }

        return user
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
        if (user) {
            token.sub = user.id
        }
        return token
    },
    async session({ session, token }) {
        if (token.sub && session.user) {
            session.user.id = token.sub
        }
        return session
    }
  }
})
