# 잃어버린 13지파의 후예

교회 가족 수련회용 모바일 보물찾기 게임. Next.js 16 + Upstash Redis (via Vercel Marketplace).

## 빠른 시작 (개발)

```bash
# Vercel 프로젝트 연결 후 환경변수 끌어오기
npx vercel link
npx vercel env pull .env.local
npm install
npm run dev
```

## 행사 전 준비

```bash
# 1. KV에 보물 60개 시드
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app npm run seed -- 60

# 2. QR 인쇄용 PNG 생성
npm run qr

# 3. out/qr/treasure-NN.png 60장을 50x50mm 스티커로 인쇄

# 4. mp3 10개를 public/audio/ 에 복사 (생성 가이드: public/audio/README.md)

# 5. Vercel 배포
npx vercel --prod

# 6. 행사 시작 직전 /admin → "게임 시작"
```

## 행사 후 정리

`/admin` → "전체 리셋" → KV 초기화 (다음 행사용)
