# omok-game 기술소개서

이 문서는 **omok-game** 웹 오목 프로젝트의 디렉토리 구조, 아키텍처, 핵심 모듈·데이터 흐름을 정리한 기술 소개서입니다.

| 항목 | 내용 |
|------|------|
| 스택 | Next.js 15 (App Router), React 19, TypeScript, Socket.IO, Tailwind CSS |
| 규칙 | 15×15, 렌주식 흑 금수(삼삼·사사·장목), 흑 정확히 5목 / 백 5목 이상 |
| 모드 | 로컬 2인, AI 대전, 실시간 온라인 |
| 부가 | 계정·친구·초대, 대국 기록·리플레이 |
| 영속화 | `data/` 하위 JSON 파일 (Git 제외) |

---

## 1. 전체 아키텍처

```
브라우저 (React)
  ├── HTTP + Cookie (omok_session)  →  App Router /api/*
  └── Socket.IO Client              →  동일 포트 실시간 이벤트
                 │
                 ▼
           server.ts
  ├── http.Server
  │     ├── GET/POST /api/rooms/:id   (커스텀, RoomManager 직결)
  │     └── 그 외 → Next.js RequestHandler
  └── Socket.IO Server
        └── setupSocketHandlers(io)
              ├── RoomManager   (메모리 Map)
              ├── presence      (메모리 Map, globalThis)
              └── auth / friends / records (파일 스토어)
```

### 왜 커스텀 서버인가

- Socket.IO와 Next.js가 **같은 Node 프로세스·같은 포트**에서 동작해야 함
- 온라인 방 상태(`roomManager`)를 소켓 핸들러와 HTTP(`/api/rooms`)가 **공유**해야 함
- 엔트리: `server.ts` → `tsx server.ts` (`npm run dev` / `npm start`)

### 클라이언트 Provider 스택

`app/layout.tsx` 기준:

1. **AuthProvider** — 로그인 유저 상태
2. **OmokSocketProvider** — 소켓 연결·playerId·presence 등록
3. **InviteListener** — 전역 초대 팝업·폴링

---

## 2. 디렉토리 구조

```
omok-game/
├── server.ts                 # Next + HTTP + Socket.IO 엔트리
├── package.json
├── next.config.ts            # 터널/LAN allowedDevOrigins
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.example
├── README.md
├── docs/
│   └── TECHNICAL.md          # 본 기술소개서
│
├── app/                      # Next.js App Router
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx              # 홈
│   ├── local/page.tsx
│   ├── local-ai/page.tsx
│   ├── online/
│   │   ├── page.tsx          # 로비
│   │   └── room/[roomId]/page.tsx
│   ├── login/ · register/
│   ├── friends/
│   ├── replay/ · replay/[id]/
│   └── api/                  # REST API (세션·친구·초대·기록)
│
├── components/               # UI·게임·인증·초대 컴포넌트
├── hooks/
│   ├── useOmokSocket.ts
│   └── useSaveFinishedGame.ts
│
├── lib/
│   ├── game/                 # 순수 규칙·상태 머신
│   ├── ai/                   # AI 수 선택
│   ├── online/               # 방·소켓·presence·초대
│   ├── auth/                 # 유저·세션·쿠키
│   ├── friends/              # 친구 관계
│   └── records/              # 대국 기록·리플레이 복원
│
└── scripts/
    ├── lan-url.mjs           # LAN / sslip.io 안내
    ├── tunnel.mjs            # Cloudflare 터널
    └── dev-fresh.mjs         # 포트 정리 + .next 삭제 + 재시작
```

런타임 데이터 (`.gitignore`):

```
data/
├── users/          # 계정
├── sessions/       # 세션 토큰
├── friendships/    # 친구 요청·관계
└── records/        # 대국 기록 JSON
```

---

## 3. 핵심 모듈 해설

### 3.1 게임 규칙 — `lib/game`

| 파일 | 역할 |
|------|------|
| `types.ts` | `BOARD_SIZE=15`, `WIN_LENGTH=5`, `Stone`, `GameState`, `Move`, `MoveRejectReason` |
| `board.ts` | 빈 보드, 착수/무르기(immutable), `checkWin`, `getWinningLine` |
| `forbidden.ts` | 흑 금수: 장목·쌍삼·쌍사 (`getBlackForbiddenReason`) |
| `game.ts` | `playMove`, `undoMove`, `getMoveRejectReason`, `createInitialState` |

**상태 (`GameState`)**

- `board`, `currentPlayer`, `phase` (`playing` | `finished`)
- `winner`, `winningCells`, `lastMove`, `history`

**승리**

- 흑: 정확히 5목 (6목 이상은 장목 금수 쪽으로 처리)
- 백: 5목 이상

**금수 (흑만)**

1. 장목(6+) → 거부  
2. 그 수가 **정확히 5목 승리**면 금수보다 승리 우선 → 허용  
3. 쌍사 → `double_four`  
4. 쌍삼(열린 삼 2축 이상, 사삼 허용) → `double_three`

로컬·AI·온라인 서버가 **동일 순수 함수**를 사용해 규칙 불일치를 방지합니다.

---

### 3.2 AI — `lib/ai`

| 개념 | 설명 |
|------|------|
| `AiMode` | `beginner` / `intermediate` / `advanced` / `challenge` |
| `AiStrength` | 1–10 내부 강도 |
| `chooseByStrength` / `chooseAiMove` | 즉시 승리 → 차단 → 점수 풀에서 선택 |
| `strengthProfile` | 공격·수비·포크·지터 가중치 |
| `challengeStrengthFromStreak` | 챌린지 연승에 따라 강도 상승 |

플레이어는 흑, AI는 백. UI는 `AiOmokGame` + `AiDifficultyModal` / 챌린지 모달.

---

### 3.3 온라인 — `lib/online`

| 파일 | 역할 |
|------|------|
| `room-manager.ts` | `RoomManager`: 방 생성·입장·착수·무르기·리셋·퇴장 기권 |
| `socket.ts` | `setupSocketHandlers` — 모든 C2S 이벤트 처리 |
| `presence.ts` | userId ↔ socketId, pending 초대 (`globalThis`에 보관) |
| `events.ts` | ClientToServer / ServerToClient 타입 |
| `client.ts` | `getPlayerId`, `getSocketUrl` |
| `types.ts` | `Room`, `RoomPlayer`, `RoomSnapshot` 등 |
| `presence.ts` | `GameInvite`, userId↔socketId presence |

**방 상태 (`getRoomStatus`)**

| status | 조건 |
|--------|------|
| `waiting` | 백 미입장 |
| `ready` | 양측 입장, history 0 |
| `playing` | 대국 중 |
| `finished` | `phase === "finished"` |

**퇴장 처리**

- `markDisconnected`: 양측 입장·`playing` 중 한 명 끊김 → **잔류 측 승리**
- 대기 방(백 없음)은 방 유지(재접속 가능)

---

### 3.4 인증 — `lib/auth`

| 항목 | 내용 |
|------|------|
| 쿠키 | `omok_session` (httpOnly, sameSite=lax, 30일) |
| 비밀번호 | `scrypt` (`salt:hash`) |
| API용 | `getSessionUserFromRequest(request)` — Request 헤더 파싱 |
| RSC용 | `getSessionUser()` in `session-rsc.ts` — `cookies()` |

커스텀 서버(`tsx`) 환경에서 API가 `next/headers`의 `cookies()`를 쓰면 AsyncLocalStorage 오류가 나므로, **API는 Request 쿠키 파싱만 사용**합니다.

게스트: 로컬·AI·방 코드 온라인 가능.  
로그인 필요: 친구·닉네임 초대·리플레이.

---

### 3.5 친구 — `lib/friends`

- `requestFriend` / `respondFriendRequest`
- 상태: `pending` → `accepted` (거절 시 레코드 삭제)
- 저장: `data/friendships/*.json`
- UI: `/friends`, 온라인 로비에서 친구 초대

---

### 3.6 기록·리플레이 — `lib/records`

| 함수 | 역할 |
|------|------|
| `createGameRecord` | 신규 기록 생성 |
| `ensureOnlineRecord` | 방당 진행 중 기록 1건 보장 |
| `saveGameProgress` | 수순·승패·phase 동기화 |
| `closeOnlineRecord` | `game:reset` 전 이전 판 종료 |
| `listGameRecords` | `finishedOnly`, `participantUserId` 필터 |
| `userCanAccessRecord` | `participantIds` 포함 여부 |
| `buildStateAtMove` | 리플레이 커서까지 보드 복원 (금수 검사 생략) |

로컬/AI: 종료 시 `useSaveFinishedGame` → `POST /api/records` (게스트는 skip).  
온라인: 소켓에서 `syncRoomRecord`로 서버가 직접 저장.

---

## 4. 페이지·API 맵

### 페이지

| 경로 | 설명 |
|------|------|
| `/` | 홈 메뉴 |
| `/local` | 로컬 2인 (`OmokGame`) |
| `/local-ai` | AI (`AiOmokGame`, `?difficulty=`) |
| `/online` | 방 생성·입장·초대 로비 |
| `/online/room/[roomId]` | `OnlineOmokGame` |
| `/login` · `/register` | 계정 |
| `/friends` | 친구 |
| `/replay` · `/replay/[id]` | 목록·재생 (로그인 + 참가 기록만) |

### REST API (`app/api`)

| 경로 | 메서드 | 설명 |
|------|--------|------|
| `/api/auth/register` | POST | 가입 + 세션 쿠키 |
| `/api/auth/login` | POST | 로그인 |
| `/api/auth/logout` | POST | 로그아웃 |
| `/api/auth/me` | GET | 현재 유저 |
| `/api/friends` | GET | 친구·요청 목록 |
| `/api/friends/request` | POST | 친구 요청 |
| `/api/friends/respond` | POST | 수락/거절 |
| `/api/presence/register` | POST | 로그인 세션 + socketId로 presence 등록 |
| `/api/invites/pending` | GET | 대기 초대 목록 |
| `/api/records` | GET/POST | 내 기록 목록 / 저장 |
| `/api/records/[id]` | GET | 단건 (권한 검사) |

### 커스텀 HTTP (`server.ts`)

| 경로 | 설명 |
|------|------|
| `GET /api/rooms/:ROOMID` | 방 스냅샷(history 등) |
| `POST /api/rooms/:ROOMID?sync=1` | 기록 강제 동기화 |

---

## 5. 주요 컴포넌트

| 컴포넌트 | 역할 |
|----------|------|
| `HomeMenu` | 모드·친구·리플레이 진입 |
| `OmokBoard` | 15×15 보드, 금수/승 하이라이트 |
| `OmokGame` | 로컬 상태 (`useReducer` + `playMove`) |
| `AiOmokGame` | AI 턴·난이도·챌린지 |
| `OnlineOmokGame` | `room:join` / `game:play` / undo / `room:state` |
| `GameShell` / `GameNav` / `GameControls` / `GameStatus` | 레이아웃·조작·상태 표시 |
| `GameResultModal` / `UndoConsentModal` / `FloatingNotice` | 결과·무르기·알림 |
| `AuthBar` / `AuthProvider` | 로그인 UI·세션 |
| `OmokSocketProvider` | 소켓 수명주기, 로그인 시 재연결 |
| `InviteListener` | 초대 수신(소켓+폴링)·수락/거절 |
| `ReplayList` / `ReplayViewer` | 기록 목록·수순 재생 |
| `ShareAccessUrl` | LAN/터널 URL 공유 |
| `MobileBackButton` | 모바일 뒤로가기 |

---

## 6. 데이터 흐름

### 6.1 방 코드 온라인

```
A: room:create  →  RoomManager.createRoom (흑)
                 →  ensureOnlineRecord → ack → /online/room/{id}

B: room:join    →  백 배정 또는 동일 playerId 재접속
                 →  broadcastRoomState (양측 room:state)

착수: game:play → applyMove → syncRoomRecord → broadcast

무르기: game:undo:request → 상대 동의/거절 → undoMove (수락 시)

퇴장: disconnect → markDisconnected (기권 승 가능) → broadcast
```

### 6.2 친구/닉네임 초대

```
발신자  lobby
  invite:send { toUserId | toNickname }
       │
서버    createInvite → 상대 소켓 있으면 invite:received
       │              없으면 pending 보관
수신자  InviteListener (소켓 + GET /api/invites/pending 폴링)
       │
       invite:respond { accept: true }
       │
서버    createRoom + joinRoom (양측 좌석)
       invite:resolved → 발신자 방 이동
       ack(roomId) → 수신자 방 이동
```

**Presence 이중 경로**

1. 소켓 핸드셰이크 쿠키로 `setUserPresence`
2. 로그인 직후 `POST /api/presence/register` (쿠키·핸드셰이크 불일치 보완)

---

## 7. Socket 이벤트 요약

**Client → Server (대표)**

- `room:create` / `room:join`
- `game:play` / `game:reset`
- `game:undo:request` / `respond` / `cancel`
- `invite:send` / `invite:respond`

**Server → Client (대표)**

- `room:state`
- `game:error`
- `game:undo:requested` / `game:undo:result`
- `invite:received` / `invite:resolved`

타입 정의: `lib/online/events.ts`

---

## 8. 실행·환경

### npm 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | LAN 안내 + 개발 서버 |
| `npm run dev:fresh` | 포트 정리·캐시 삭제 후 재시작 |
| `npm run dev:public` | 서버 + Cloudflare 터널 |
| `npm run build` / `npm start` | 빌드 / 프로덕션 실행 |
| `npm test` | Vitest (`lib/**/*.test.ts`) |

### 환경 변수

| 변수 | 기본 | 용도 |
|------|------|------|
| `PORT` | `3000` | 리슨 포트 |
| `BIND_HOST` | `0.0.0.0` | 바인드 주소 |
| `NEXT_PUBLIC_SOCKET_URL` | (비움 → origin) | 터널/외부 도메인 소켓 URL |
| `NODE_ENV` | — | Next dev/prod |

`next.config.ts`에서 `*.trycloudflare.com`, `*.sslip.io` 등 개발 오리진을 허용합니다.

---

## 9. 설계 요약 (Source of Truth)

| 관심사 | 단일 진실 원천 |
|--------|----------------|
| 오목 규칙 | `lib/game` (순수 함수, 공유) |
| 온라인 방 | 프로세스 메모리 `roomManager` |
| Presence·초대 | 메모리 `presence` (`globalThis`) |
| 계정·친구·기록 | `data/**/*.json` |
| UI 모드 연결 | `OmokGame` / `AiOmokGame` / `OnlineOmokGame` |

메모리 기반 방·presence는 **단일 서버 인스턴스**를 전제로 합니다. 다중 인스턴스 배포 시 Redis 등 공유 스토어가 필요합니다.

---

## 10. 관련 문서

- 사용자용 빠른 시작: 루트 [`README.md`](../README.md)
- 저장소: https://github.com/SonSucheol/omok-game
