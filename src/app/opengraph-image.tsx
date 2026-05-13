import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = '풀림 플래너 — 시험까지의 시간을 설계하는 AI';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// 풀림 블루(#3B6FF6) 그라디언트 + 레몬(#E6FF4C) 액센트.
// 카카오톡·디스코드·트위터·Slack 등에서 링크 임베드 시 노출.
export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background: 'linear-gradient(135deg, #3B6FF6 0%, #1E3FA8 100%)',
          color: 'white',
          fontFamily: 'system-ui, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -200,
            right: -200,
            width: 600,
            height: 600,
            borderRadius: 999,
            background: 'radial-gradient(circle, rgba(230,255,76,0.28) 0%, transparent 70%)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'rgba(255,255,255,0.12)',
              fontSize: 44,
            }}
          >
            🗓️
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 4,
                color: '#E6FF4C',
                textTransform: 'uppercase',
              }}
            >
              Pullim Planner
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
              by curea
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', zIndex: 1 }}>
          <div
            style={{
              fontSize: 108,
              fontWeight: 900,
              letterSpacing: -3,
              lineHeight: 1.05,
              color: 'white',
            }}
          >
            풀림 플래너
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 44,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.92)',
              lineHeight: 1.3,
            }}
          >
            시험까지의 시간을 설계하는 AI
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 26,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.65)',
              lineHeight: 1.5,
              maxWidth: 900,
            }}
          >
            시험 일정을 입력하면 AI가 분 단위로 학습 계획을 짭니다
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: '#E6FF4C',
              }}
            />
            <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
              시간표 · 학습 블록 · 컨디션 · 번아웃 케어
            </div>
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 2,
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            pullim.app
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
