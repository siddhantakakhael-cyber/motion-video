/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  // `npm run build` stays a normal Node server build; the Pages workflow sets
  // STATIC_EXPORT=1 to emit a fully static `out/` folder instead.
  ...(staticExport ? { output: "export", trailingSlash: true } : {}),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
