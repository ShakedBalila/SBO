import type { NextConfig } from "next";
const config: NextConfig = {
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  outputFileTracingIncludes: { "/*": ["./certs/supabase-ca.crt"] },
  poweredByHeader: false,
  devIndicators: false,
  allowedDevOrigins: (process.env.APP_ORIGINS ?? '').split(',').filter(Boolean).map(origin => new URL(origin.trim()).hostname),
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "same-origin" }
    ] }];
  }
};
export default config;
