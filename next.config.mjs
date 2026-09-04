/** @type {import('next').NextConfig} */
const nextConfig = {
  // 기본값은 `.next` 입니다. 개발 서버(`npm run dev`)가 `.next` 를 개발 모드로
  // 계속 덮어쓰기 때문에, 개발 서버를 켜 둔 채로 프로덕션 빌드를 확인하려면
  // 출력 폴더를 따로 지정합니다 — `NEXT_DIST_DIR=.next-verify npm run build`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  // `pg` is only loaded when DATABASE_URL points at a non-Neon host (local
  // development). Keeping it external stops the bundler from tracing it into
  // the serverless output.
  serverExternalPackages: ['pg'],
};

export default nextConfig;
