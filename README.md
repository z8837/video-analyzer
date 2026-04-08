# Codex Video Analyzer

Codex CLI를 로컬에서 호출해서 선택한 영상 폴더만 분석하고, 결과를 GUI에서 검색/필터/미리보기까지 할 수 있게 만든 데스크톱 앱입니다.

## 핵심 기능

- 라이브러리 루트 폴더를 선택하면 영상이 들어 있는 하위 폴더 목록을 자동 수집
- 원하는 폴더만 골라 `Codex CLI`로 분석 실행
- 결과를 `analyze/index.md`, `analyze/results.json`, 개별 `.md`, 샘플 이미지로 저장
- `음식`, `셀카`, `산책` 같은 키워드/태그로 검색 및 필터링
- 결과 목록 클릭 시 앱 안에서 바로 영상 재생
- 외부 플레이어 열기, 파일 위치 열기 지원

## 전제 조건

로컬 백엔드나 별도 API 서버는 필요하지 않습니다. 대신 각 환경에 아래가 준비되어 있어야 합니다.

1. `Node.js 24+`
2. `Codex CLI`
3. `ffmpeg`와 `ffprobe`
4. `codex login`으로 ChatGPT 로그인 완료

중요:
- API 키 없이 쓰는 구성이므로 모델은 `gpt-5.4` 별칭을 사용합니다.
- `ChatGPT 로그인 기반 Codex CLI`에서는 `gpt-5.4-2026-03-05` 같은 스냅샷 모델을 직접 고정할 수 없습니다.
- reasoning은 앱 내부에서 `xhigh`로 고정합니다.

## 설치

```bash
npm install
```

## 개발 실행

```bash
npm run dev
```

## 배포 빌드

```bash
npm run dist
```

macOS에서 DMG를 만들 때:

```bash
npm run dist:mac
```

주의:
- Windows 설치 파일은 Windows에서 빌드하는 것이 가장 안전합니다.
- macOS DMG는 macOS에서 빌드해야 합니다.
- 범용 macOS 패키지는 `npm run dist:mac`으로 빌드합니다.
- Apple Silicon 전용 패키지는 `npm run dist:mac:arm64`를 사용합니다.
- 자세한 절차는 `MACOS-BUILD.md`를 참고하세요.

## 사용 방법

1. 앱을 실행합니다.
2. 상단에서 `Codex 실행 파일`, `ffmpeg 실행 파일` 경로를 확인합니다.
   - macOS에서 Finder로 앱을 열었을 때 PATH가 잡히지 않으면 절대경로를 넣으세요.
   - 예: `/opt/homebrew/bin/codex`, `/opt/homebrew/bin/ffmpeg`
3. `저장 및 점검`을 누르면 도구 경로를 저장하고 상태를 다시 점검합니다.
   - macOS에서는 `ffmpeg` 또는 `ffprobe`가 없을 때 Homebrew로 `ffmpeg` 자동 설치를 시도합니다.
   - `Codex`, `ChatGPT 로그인`, `ffmpeg`, `ffprobe`가 모두 준비되지 않으면 분석 버튼은 비활성화됩니다.
4. `라이브러리 선택`으로 영상 폴더들의 상위 루트를 고릅니다.
5. 왼쪽 목록에서 분석할 폴더 하나를 선택합니다.
6. `이 폴더 분석`을 누르면 해당 폴더의 바로 아래 영상만 분석합니다.
   - 분석이 필요한 파일이 여러 개면 기본값으로 최대 4개를 병렬 처리합니다.
   - 분석 대상이 4개 이하면 파일 수만큼만 실행합니다.
7. 분석이 끝나면 가운데 결과 목록에서 검색/필터링하고, 오른쪽에서 바로 재생합니다.

## 결과 파일

분석은 선택한 폴더 안에 아래 구조로 저장됩니다.

```text
selected-folder/
  analyze/
    runs/
      2026-04-08T06-32-10-123Z-root/
        run.json
        events.log
        worker-01.task.json
        worker-01.stdout.log
        worker-01.stderr.log
        worker-01.last-message.txt
    index.md
    results.json
    _overview.jpg
    20230622_231747.md
    samples/
      20230622_231747.jpg
```

## 다른 환경으로 옮기기

이 프로젝트 폴더 자체를 복사하면 됩니다. 단, 옮긴 환경에서도 아래는 별도로 준비해야 합니다.

- `npm install`
- `Codex CLI` 설치
- `ffmpeg` 설치
- `codex login`

즉, 복사 대상은 앱 프로젝트이고 인증 정보 파일을 복사해서 배포하는 방식은 권장하지 않습니다.

## 내부 동작 방식

- Electron 메인 프로세스가 `codex exec`를 직접 호출합니다.
- 선택한 폴더를 현재 작업 디렉터리로 지정합니다.
- 앱에 포함된 `codex-assets/instructions.md`로 분석 포맷을 고정합니다.
- 결과 브라우저는 `analyze/results.json`을 기준으로 렌더링합니다.

## 확인한 사항

- 샘플 폴더 1개 영상 대상으로 `analyze/results.json`, `index.md`, 개별 Markdown, 샘플 이미지 생성까지 확인했습니다.
- 결과물 검색과 태그 필터는 `results.json` 기반으로 동작합니다.
