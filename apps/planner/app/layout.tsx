import type { Metadata, Viewport } from 'next';
import { Geist_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/lib/auth/auth-context';
import './globals.css';

// Pretendard는 globals.css의 CDN @import로 로드 (한글 가변폰트).
// 영문 모노스페이스는 next/font로 자체 호스팅.
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const BRAND = '풀림 플래너';
const TAGLINE = '시험까지의 시간을 설계하는 AI';
const DESCRIPTION =
  '시험 일정을 입력하면 AI가 분 단위로 학습 계획을 짭니다. 풀림 플래너는 고등학생을 위한 AI 학습 플래너입니다.';

export const metadata: Metadata = {
  metadataBase: new URL('https://pullim-planner.vercel.app'),
  title: {
    default: `${BRAND} — ${TAGLINE}`,
    template: `%s | ${BRAND}`,
  },
  description: DESCRIPTION,
  applicationName: BRAND,
  keywords: [
    '풀림 플래너',
    'AI 학습 플래너',
    '시험 계획',
    '시간표',
    '고등학생 학습',
    '학습 블록',
    '컨디션 관리',
    '번아웃 케어',
    'Pullim',
    'Planner',
  ],
  authors: [{ name: 'curea' }],
  creator: 'curea',
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: BRAND,
    title: `${BRAND} — ${TAGLINE}`,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND} — ${TAGLINE}`,
    description: DESCRIPTION,
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
        <AuthProvider>
          <TooltipProvider delay={120}>{children}</TooltipProvider>
        </AuthProvider>
        <Toaster position="top-center" closeButton richColors />
        <Analytics />
      </body>
    </html>
  );
}
