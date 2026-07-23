# omok-game

Next.js 기반 15×15 표준 오목 웹 게임입니다. 로컬 대국, AI 대전, 실시간 온라인을 지원합니다.

## 기능

- **로컬 대전** — 같은 기기에서 흑/백 번갈아 두기
- **AI 대전** — 난이도별 AI, 챌린지 연속 승리
- **온라인 대전** — 방 코드 또는 친구/닉네임 초대 (Socket.IO)
- **계정** — 닉네임·비밀번호 가입/로그인 (게스트도 로컬·AI·방 코드 이용 가능)
- **친구** — 친구 요청·수락 후 초대
- **리플레이** — 로그인한 사용자가 참가한 종료 대국만 열람
- **규칙** — 흑 금수(33·44·장목), 무르기(상대 동의), 온라인에서 상대 퇴장 시 잔류 측 승리

## 요구 사항

- Node.js 20+ 권장

## 시작하기

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 으로 접속합니다.

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 (커스텀 `server.ts` + Socket.IO) |
| `npm run dev:fresh` | `.next` 캐시 삭제 후 재시작 |
| `npm run dev:public` | 개발 서버 + Cloudflare 터널 (외부 접속) |
| `npm run build` | 프로덕션 빌드 |
| `npm start` | 빌드 후 서버 실행 |
| `npm test` | Vitest 단위 테스트 |
| `npm run lint` | ESLint |

## 환경 변수

`.env.example`을 참고해 `.env`를 만들 수 있습니다.

| 변수 | 설명 |
|------|------|
| `PORT` | 서버 포트 (기본 `3000`) |
| `BIND_HOST` | 바인딩 주소 (기본 `0.0.0.0`) |
| `NEXT_PUBLIC_SOCKET_URL` | 터널/도메인 접속 시 소켓 URL (비우면 현재 origin 사용) |

## 프로젝트 구조

```
app/           # Next.js App Router 페이지·API
components/    # UI 컴포넌트
hooks/         # 클라이언트 훅
lib/           # 게임·AI·인증·온라인·기록 로직
scripts/       # 개발 유틸 (LAN URL, 터널, fresh 재시작)
server.ts      # Next + Socket.IO 커스텀 서버
docs/          # 기술 문서
```

대국 기록·계정 데이터는 `data/`에 JSON으로 저장되며 Git에 포함되지 않습니다.

아키텍처·모듈·데이터 흐름의 자세한 설명은 [docs/TECHNICAL.md](docs/TECHNICAL.md)(기술소개서)를 참고하세요.

## 라이선스

Private
