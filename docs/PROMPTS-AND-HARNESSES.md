# Prompts, context, and a loop you can inspect

A harness is the environment around a model: repository access, instructions, tools, shell, browser, checks, and saved state. A model can suggest a globe. A harness can build it, run it, inspect a broken control, fix it, and leave evidence for the next session.

Use a coding environment that can read your local clone, edit files, run Node tests/builds, and inspect a browser. Codex, Claude Code, Copilot, and Gemini CLI are possible environments; their permissions and available browser tools differ. These prompts describe outcomes rather than assuming a particular slash command or plugin.

## Give it an evidence map

Start with README, HOW-IT-WAS-BUILT, the integration guide, `globe.config.json`, and a small feature spec. Keep private inputs outside public paths. Add your target framework/host, audience, preferred style, and the behavior you will review. Point to exact source files and commands rather than pasting an entire export into chat.

An MCP connection may help retrieve your own content or verified public metadata. It is a tool for gathering evidence, not a requirement for this project. Never assume connector availability or expose credentials in a prompt. This repo runs without an agent, MCP server, or model API key.

## Research your existing website

```text
Inspect my site repository and the WordPress export in the private input directory.
First inventory published content, routes, media, feeds, and public discussion.
Do not copy backups or unpublished records into public assets.
Write a migration spec with preservation requirements and measurable checks.
Mark missing evidence and unknown plugin behavior. Use the target host's actual
capabilities. Show a local prototype with representative old and new content.
```

## Integrate the globe

```text
Read hello-planet's README, integration guide, and implementation.
Integrate one globe into my existing layout and one tracker per document.
Start at zero; keep demo visitors and historical samples explicitly separate.
Use my public home coordinate, palette, and same-origin analytics endpoint.
Verify deduplication, privacy preferences, mobile layout, reduced motion,
keyboard controls, no-WebGL behavior, and an unavailable API.
Return changed files, commands/results, screenshots, and remaining limits.
Keep this local until I request deployment.
```

## Turn an idea into a spec

```text
I want a PC Globe inspired mode because learning about the world matters to me.
Use our existing city landmarks. Let me search by city or country, pick a place,
focus it, and open a source to learn more. Give me a random-place button.
Keep geography separate from visitor activity. No invented country facts.
Write a small spec and acceptance cases before implementing it.
```

The concrete example lives in [`specs/001-pc-globe-mode.md`](../specs/001-pc-globe-mode.md).

## Run a bounded implementation loop

```text
Read the spec and current verification notes. Choose one unfinished behavior.
Implement it with the smallest coherent change. Run relevant checks and inspect
it in the browser. If evidence shows a defect, fix it and repeat that check.
Do not weaken the acceptance criteria just to get a pass.
Stop when the agreed behavior passes, or when a specific external dependency
prevents progress. Record evidence and the exact next step for a fresh session.
Use at most three repair attempts on one unexplained failure before reporting
what you learned. Do not change deployment settings or production data.
```

A useful loop has a stopping condition. More iterations do not automatically mean more quality. Use a command budget, review checkpoint, or a small task list. Keep failures visible and distinguish tested behavior from plausible code.

## Ask for a review

```text
Review this change against the spec, not only against its implementation.
Try an empty search, unavailable API, WebGL failure, reduced motion, and a
390px viewport. Check that examples cannot become real statistics, that data
source labels remain accurate, and that screenshots match the claims.
Run the relevant tests and record exact results. Report issues before making
unrelated improvements. Confirm the release contains no private inputs.
```

## Leave a handoff

Save: intent, changed files, exact commands/results, screenshots, known limits, unresolved questions, and next action. A short checked-in `VERIFICATION.md` is more useful than “looks good.” Separate a local preview, a production-style build, and an actual deployment in every status report.

John's work connects these ideas across [builder-skills](https://github.com/automateyournetwork/builder-skills), [GAIT MCP](https://github.com/automateyournetwork/gait_mcp), [NetClaw](https://github.com/automateyournetwork/netclaw), and [educational game starter kits](https://github.com/automateyournetwork/NetworkingVideoGameStarterKit). None is a dependency for this counter. They are other places to explore how intent, tools, and feedback fit together.
