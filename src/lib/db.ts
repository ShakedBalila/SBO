import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const globalDb = globalThis as unknown as { prisma?: PrismaClient; databaseUrl?: string };
export const db = (globalDb.databaseUrl === process.env.DATABASE_URL ? globalDb.prisma : undefined) ?? new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 })
});
if (process.env.NODE_ENV !== "production") { globalDb.prisma = db; globalDb.databaseUrl = process.env.DATABASE_URL; }
