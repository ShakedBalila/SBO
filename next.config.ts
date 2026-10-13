import type { NextConfig } from "next";
const config: NextConfig = {
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  outputFileTracingIncludes: { "/*": ["./certs/supabase-ca.crt"] },
  poweredByHeader: false,
  serverExternalPackages: ['pdf-parse','@napi-rs/canvas','mammoth','exceljs'],
  devIndicators: false,
  allowedDevOrigins: (process.env.APP_ORIGINS ?? '').split(',').filter(Boolean).map(origin => new URL(origin.trim()).hostname),
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "same-origin" }
      ,{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }
      ,{ key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" }
      ,{ key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; img-src 'self' data: blob: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co https://api.openfoodfacts.org https://fdc.nal.usda.gov; worker-src 'self' blob:; upgrade-insecure-requests".replace("script-src 'self' 'unsafe-inline';",process.env.NODE_ENV==='development'?"script-src 'self' 'unsafe-inline' 'unsafe-eval';":"script-src 'self' 'unsafe-inline';") }
    ] }];
  }
};
export default config;
