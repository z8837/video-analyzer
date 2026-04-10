# Codex Video Analyzer

로컬 비디오 파일을 [Codex CLI](https://github.com/openai/codex)(OpenAI)로 일괄 분석하고, 결과를 탐색할 수 있는 데스크탑 앱입니다.

## 주요 기능

- **폴더 기반 비디오 스캔** — 루트 폴더를 선택하면 하위 폴더를 재귀 탐색하여 비디오 파일을 트리 구조로 표시
- **Codex CLI 기반 자동 분석** — 비디오 메타데이터(ffprobe)를 사전 추출한 뒤, Codex CLI를 통해 프레임 추출 및 AI 분석 수행
- **병렬 분석** — 최대 3개 워커가 동시에 분석을 수행하여 처리 시간 단축
- **분석 라이브러리** — 분석 완료된 비디오를 카드 그리드로 탐색, 다중 필터 검색 지원
- **키워드 점프** — 분석 결과에 포함된 키워드 시점으로 비디오 플레이어에서 바로 이동

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Electron + React 19 + Vite |
| 언어 | TypeScript (ES Modules) |
| AI 분석 | OpenAI Codex CLI |
| 미디어 처리 | ffmpeg / ffprobe |
| 패키징 | electron-builder (macOS DMG/ZIP, Windows NSIS, Linux AppImage) |

## 분석 파이프라인

1. 루트 폴더 선택 → 재귀적으로 비디오 파일 스캔
2. "분석 시작" 클릭 → ffprobe로 각 비디오의 메타데이터(해상도, 길이, FPS 등) 사전 추출
3. Codex CLI를 병렬 워커로 실행 (`codex exec`)하고 worker별 작업 JSON은 프롬프트에 인라인으로 전달
4. Codex가 프레임을 추출/분석하고 JSON 결과 반환
5. 결과를 파싱하여 `analyze/_library/{폴더}/{비디오}.md`로 저장
6. 실시간 진행률과 실행 로그를 IPC 이벤트로 렌더러에 전송

## 사전 요구사항

- **Node.js** 24+
- **Codex CLI** 설치 및 인증 (`codex login`)
- **ffmpeg + ffprobe**
  - macOS: 미설치 시 자동 설치 시도 (Homebrew)
  - Windows: 사전 설치 필요

> API 키 없이 ChatGPT 로그인 기반으로 동작합니다. `codex login`으로 로그인을 완료해야 합니다.


## 프로젝트 구조

```
├── electron/
│   ├── main.mjs          # 메인 프로세스 (파일 I/O, Codex 실행, IPC 핸들러)
│   └── preload.cjs       # IPC 브릿지 (window.codexVideoAnalyzer)
├── src/
│   ├── App.tsx            # React 메인 컴포넌트
│   ├── App.css            # 스타일시트
│   ├── types.ts           # TypeScript 타입 정의
│   └── global.d.ts        # IPC API 타입 선언
├── codex-assets/
│   └── instructions.md    # Codex CLI 프롬프트 템플릿
└── package.json
```

## 런타임 파일 구조

분석 실행 시 루트 폴더 내에 다음 구조가 생성됩니다:

```
<루트 폴더>/
  analyze/
    progress.json           # 분석 진행률
    _library/
      <폴더명>/
        <비디오명>.md        # 비디오별 분석 결과 (한국어)
```

실행 로그는 분석 중 루트 폴더에 자동 저장하지 않습니다. 앱의 실행 로그 창에서 `events.log`만 사용자가 선택한 위치로 저장할 수 있습니다.
