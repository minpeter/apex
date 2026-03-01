# oh-my-openclaw

OpenClaw 설정 프리셋 관리 도구.

## 이것은 무엇인가요?
oh-my-openclaw는 셀프 호스팅 AI 에이전트 게이트웨이인 [OpenClaw](https://github.com/minpeter/openclaw)의 설정 프리셋을 관리하는 CLI 유틸리티입니다. `openclaw.json` 오버라이드와 워크스페이스 마크다운 파일을 번들로 묶어, 단일 명령으로 다양한 에이전트 성격, 도구 세트, 모델 구성 간에 전환할 수 있습니다.

## 빠른 시작

### 설치
전제 조건: [Bun](https://bun.sh)

1. 저장소를 클론합니다
2. 의존성을 설치합니다:
   ```bash
   bun install
   ```
3. 바이너리를 빌드합니다:
   ```bash
   bun run build:compile
   ```
4. `dist/oh-my-openclaw`에 생성된 바이너리를 PATH에 추가하거나 직접 실행합니다.

### 기본 워크플로우
1. **목록 조회** 사용 가능한 프리셋 확인: `oh-my-openclaw list`
2. **비교** 현재 설정과 프리셋 비교: `oh-my-openclaw diff apex`
3. **적용** 프리셋 적용: `oh-my-openclaw apply apex`
4. **설치** apex 빠른 설치: `oh-my-openclaw install`
5. **내보내기** 현재 설정을 새 프리셋으로 저장: `oh-my-openclaw export my-custom-setup`
6. **적용** GitHub에서 프리셋 적용: `oh-my-openclaw apply minpeter/demo-researcher`

## 명령어

### list
모든 내장 및 사용자 정의 프리셋을 나열합니다.
```bash
oh-my-openclaw list
```
**출력 예시:**
```
Available presets:

  apex [builtin]
    All-in-one power assistant with full capabilities (all-in-one, power, assistant)
    v1.0.0
```

### apply
프리셋을 OpenClaw 설정에 적용합니다. 프리셋의 JSON 설정을 `openclaw.json`에 병합하고, 번들된 워크스페이스 파일(`AGENTS.md` 등)을 `.openclaw` 디렉토리에 복사하며, 번들된 스킬을 `~/.agents/skills/`에 설치합니다. `<preset>` 인자는 로컬 프리셋 이름, GitHub 축약형(`owner/repo`), 또는 전체 GitHub URL(`https://github.com/owner/repo`)을 사용할 수 있습니다.
```bash
oh-my-openclaw apply <preset> [options]
```
- **인자:** `<preset>` - 적용할 프리셋 이름.
- **플래그:**
  - `--dry-run`: 실제 변경 없이 변경될 내용만 표시합니다.
  - `--no-backup`: 현재 설정의 백업 생성을 건너뜁니다 (기본값: 백업 생성).
  - `--clean`: 적용 전에 기존 설정 및 워크스페이스 파일을 제거합니다 (클린 설치).
  - `--force`: 이미 로컬에 캐시된 원격 프리셋도 강제로 다시 다운로드합니다.

### install
apex 프리셋을 설치합니다 (`apply apex`의 단축 명령).
```bash
oh-my-openclaw install [options]
```
- **플래그:**
  - `--dry-run`: 실제 변경 없이 변경될 내용만 표시합니다.
  - `--no-backup`: 백업 생성을 건너뜁니다.
  - `--clean`: 적용 전에 기존 설정 및 워크스페이스 파일을 제거합니다.

### export
현재 `openclaw.json`과 워크스페이스 마크다운 파일을 재사용 가능한 새 프리셋으로 저장합니다.
```bash
oh-my-openclaw export <name> [options]
```
- **인자:** `<name>` - 새 프리셋의 이름.
- **플래그:**
  - `--description <desc>`: 짧은 설명을 추가합니다.
  - `--version <ver>`: 버전을 지정합니다 (기본값: 1.0.0).
  - `--force`: 동일한 이름의 기존 프리셋을 덮어씁니다.

### diff
현재 설정과 특정 프리셋 간의 구조적 비교를 표시합니다.
```bash
oh-my-openclaw diff <preset> [options]
```
- **플래그:**
  - `--json`: 비교 결과를 JSON 형식으로 출력합니다.

## 내장 프리셋

| 이름 | 설명 | 사용 사례 |
| :--- | :--- | :--- |
| **apex** | 모든 기능을 갖춘 올인원 파워 어시스턴트 | 100% 모든 기능을 포함한 단일 내장 프리셋. |

## 작동 방식

### 딥 머지 의미론
프리셋을 적용할 때, oh-my-openclaw는 `openclaw.json`에 대해 딥 머지 전략을 사용합니다:
- **스칼라 (문자열, 숫자, 불리언):** 기존 값을 덮어씁니다.
- **객체:** 재귀적으로 병합됩니다.
- **배열:** 프리셋의 배열로 완전히 대체됩니다.
- **Null:** 대상 설정에서 해당 키를 삭제합니다.

### 민감 필드 보호
비밀 정보의 우발적 노출을 방지하기 위해, 내보내기 및 비교 시 특정 필드가 필터링됩니다. 해당 필드는 다음과 같습니다:
- `auth`, `env`, `meta`
- `gateway.auth`
- `hooks.token`
- `models.providers.*.apiKey`
- `channels.*.botToken`, `channels.*.token`

### 자동 백업
변경 사항을 적용하기 전에, oh-my-openclaw는 `~/.openclaw/oh-my-openclaw/backups/`에 타임스탬프가 포함된 백업을 생성합니다 (`openclaw.json` 및 워크스페이스 파일 대체 시 워크스페이스 백업 포함).

## 커스텀 프리셋 만들기
프리셋은 `~/.openclaw/oh-my-openclaw/`에 저장됩니다. `preset.json5` 파일과 관련 마크다운 파일(`AGENTS.md`, `SOUL.md` 등)이 포함된 디렉토리를 생성하여 수동으로 만들 수 있습니다.

### 프리셋 형식 예시 (`preset.json5`)
```json5
{
  name: "my-preset",
  description: "My custom configuration",
  version: "1.0.0",
  config: {
    identity: {
      name: "CustomBot",
      emoji: "🤖"
    }
  },
  workspaceFiles: ["AGENTS.md"]
}
```

## 원격 프리셋

별도의 로컬 설정 없이 공개 GitHub 저장소에서 직접 프리셋을 적용할 수 있습니다.

### 사용법

```bash
# 축약형으로 적용 (owner/repo)
oh-my-openclaw apply minpeter/demo-researcher

# 전체 GitHub URL로 적용
oh-my-openclaw apply https://github.com/minpeter/demo-researcher

# 강제 재다운로드 (로컬 캐시 무시)
oh-my-openclaw apply minpeter/demo-researcher --force
```

원격 프리셋은 자동으로 `~/.openclaw/oh-my-openclaw/presets/owner--repo/`에 사용자 프리셋으로 캐시됩니다. 이후 적용 시 `--force`를 지정하지 않으면 캐시된 버전을 재사용합니다.

> **참고**: 공개 GitHub 저장소만 지원됩니다. 비공개 저장소는 인증이 필요하며 현재 지원되지 않습니다.

## 프리셋의 스킬

프리셋은 OpenClaw 에이전트 스킬을 번들로 포함할 수 있습니다. 프리셋을 적용하면, `skills` 필드에 나열된 스킬이 자동으로 `~/.agents/skills/`에 복사되어 `openclaw skills list`에서 사용할 수 있게 됩니다.

### 충돌 처리

대상 위치에 스킬이 이미 존재하는 경우:
- **대화형 (TTY)**: 덮어쓰기 확인 프롬프트가 표시됩니다 (`[y/N]`).
- **비대화형 (non-TTY / CI)**: 기존 스킬이 경고와 함께 건너뛰어집니다.
- **`--force` 플래그**: 프롬프트 없이 기존 스킬을 덮어씁니다.

### 스킬이 포함된 프리셋 형식

```json5
{
  name: "my-preset",
  description: "My preset with skills",
  version: "1.0.0",
  skills: ["my-skill"],  // skills/ 하위의 스킬 디렉토리 이름
  config: { ... },
  workspaceFiles: ["AGENTS.md"]
}
```

스킬은 프리셋의 `skills/<name>/` 디렉토리에 저장되며 `SKILL.md` 파일을 포함해야 합니다.

## 개발
- **전제 조건:** Bun
- **의존성 설치:** `bun install`
- **린트 실행:** `bun run lint`
- **테스트 실행:** `bun test`
- **타입 체크:** `bun run typecheck`
- **바이너리 빌드:** `bun run build:compile`

## 아키텍처
- `src/core/`: 머지 전략, 백업 시스템, 민감 필드 필터링 등 핵심 로직.
- `src/commands/`: CLI 명령어 구현 (`list`, `apply`, `export`, `diff`, `install`).
- `src/presets/`: 내장 프리셋 템플릿 및 매니페스트.

## 라이선스
MIT
