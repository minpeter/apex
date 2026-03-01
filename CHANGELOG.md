# oh-my-openclaw

## 1.1.2

### Patch Changes

- 66fa226: Fix export command writing preset manifest twice during export
- eac8e88: Run fixNodePathIfNeeded only on macOS to avoid unnecessary path manipulation on other platforms
- 345af8d: Validate owner/repo format before attempting git clone to provide clear error messages

## 1.1.1

### Patch Changes

- 885472c: Add secret value pattern detection to sensitive filter. Detects Discord bot tokens, Slack/OpenAI/Anthropic/Groq/xAI API keys, GitHub PATs, npm tokens, and JWTs by value pattern regardless of field path.

## 1.1.0

### Minor Changes

- ec2aaac: Initial npm release - CLI tool for managing OpenClaw agent presets
