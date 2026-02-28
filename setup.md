# Openclaw Installation Prompt

Install Openclaw in the current directory so it's immediately ready to use.

1. Install Openclaw:
   - `git clone https://github.com/openclaw/openclaw.git`
   - Run `pnpm install`
2. Install private-oh-my-openclaw:
   - `git clone https://github.com/minpeter/private-oh-my-openclaw.git`
   - Run `bun install`
   - Run `bun run build:compile`
   - Run `./dist/oh-my-openclaw apply developer`
3. Immediately after installation, verify it works with the following commands:
   - `openclaw --help`
   - `oh-my-openclaw list`
4. If a command fails (permissions/version/auth/PATH), automatically:
   - Diagnose the cause,
   - Apply a minimal fix,
   - Retry,
   - Report exactly what was changed.
5. Messenger channel setup:
   - Ask the user: "Which messenger do you use? If you have a bot token, please share it as well."
   - If the user provides a token → Register it directly with `openclaw channels add`.
   - If the user only answers with the messenger name and has no token → Guide them through the creation process step by step:
     - Telegram: Message @BotFather with /newbot → Copy the token
     - Discord: discord.com/developers → New Application → Create Bot → Copy the token → Invite to server
     - WhatsApp: Only QR code connection is needed
     - After each step, confirm "Have you completed this?" before proceeding to the next
     → Once the token is received, register it with `openclaw channels add`.
   - If the user doesn't use any messenger → Skip, and let them know they can add one later with `openclaw channels add`.
6. AI model authentication:
   - Inform the user of available AI providers:
     - Anthropic (Claude), OpenAI, Google Gemini, Mistral, xAI (Grok)
     - OpenRouter, KiloCode, Together, HuggingFace, Venice, Moonshot
     - Ollama (local, free), Qwen (free OAuth tier)
     - Free models via OpenRouter: DeepSeek-R1, Llama 3.3, Qwen VL, etc.
     - Free models via KiloCode: GLM-5, MiniMax-M2.5, etc.
     - GitHub Copilot tokens can also be used
   - Ask: "Which AI provider and API key would you like to use? If you don't have one, I can recommend free options."
   - If an API key is provided → Configure it with `openclaw onboard` or `openclaw config set`.
   - If no API key is available → Recommend one of the free options (OpenRouter free models, Qwen OAuth, Ollama local) and guide the setup.
7. Wrap-up:
   - After installation is complete, guide the user on next steps:
     - Provide the command to run the gateway with `openclaw gateway run`
     - Send a test message from the registered messenger to verify the response
     - If issues arise, diagnose with `openclaw status --deep`
