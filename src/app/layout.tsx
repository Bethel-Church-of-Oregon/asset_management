import type { Metadata, Viewport } from 'next';
import { APP_NAME, ORG_NAME } from '@/lib/app-info';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    // 탭 제목이 지나치게 길어지지 않도록 하위 페이지는 기관명만 덧붙입니다.
    template: `%s · ${ORG_NAME}`,
  },
  description: '교회 비품·자산 등록, 바코드 라벨 출력, 스캔 조회 및 수리 이력 관리',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e3fa8',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
