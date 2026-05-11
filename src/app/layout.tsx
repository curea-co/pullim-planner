import type { Metadata, Viewport } from 'next';
import { Geist_Mono } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

// Pretendard는 globals.css의 CDN @import로 로드 (한글 가변폰트).
// 영문 모노스페이스는 next/font로 자체 호스팅.
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const SITE_TITLE = '풀림 플래너 — 시험까지의 시간을 설계하는 AI';
const SITE_DESCRIPTION =
  '시험 일정을 입력하면 AI가 분 단위로 학습 계획을 짭니다. 풀림 플래너는 고등학생을 위한 AI 학습 플래너입니다.';

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: '풀림 플래너',
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '풀림 플래너',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#3B6FF6',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      className={`${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-full font-sans">
        <TooltipProvider delay={120}>{children}</TooltipProvider>
        <Toaster position="top-center" closeButton richColors />
      </body>
    </html>
  );
}
