import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const globalDb = globalThis as unknown as { prisma?: PrismaClient; databaseUrl?: string };
const ssl = process.env.SUPABASE_CA_CERT === "bundled"
  ? { ca: readFileSync(join(process.cwd(), "certs", "supabase-ca.crt"), "utf8"), rejectUnauthorized: true }
  : undefined;

export const db = (globalDb.databaseUrl === process.env.DATABASE_URL ? globalDb.prisma : undefined) ?? new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000, ssl })
});
if (process.env.NODE_ENV !== "production") { globalDb.prisma = db; globalDb.databaseUrl = process.env.DATABASE_URL; }
