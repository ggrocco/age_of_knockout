# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The project guide (commands, URL params, architecture, what-else-to-update checklist, browser-testing rule,
deployment) is shared with other agents in `AGENTS.md`, imported here. Edit shared guidance there, not here.

@AGENTS.md

## Claude Code specifics

Browser verification (the required step in AGENTS.md "Testing in the browser"):

1. Start the server with `preview_start` (name `my-age`, defined in `.claude/launch.json`: `node serve.js 8000`).
   Don't run it via Bash.
2. Drive the page with the built-in browser tools (`mcp__Claude_Browser__*`), not the Chrome extension unless asked:
   `navigate` to `http://localhost:8000/?...`, `computer` screenshot, `read_console_messages` (must be free of
   errors), `javascript_tool` for state (`window.__app.match.game` is the live sim).
3. Phone layout: `?touch=1` plus `resize_window` to 402x874 and 874x402; reset the viewport with preset `desktop`
   afterwards.
4. In a worktree, port 8000 may already be served from another checkout. Before trusting a screenshot, `curl` a file
   you changed from the server and diff it against your copy.

Built-in browser screenshots are returned to you, not saved. To put a screenshot in the repo (e.g. for
`docs/screenshots/`), capture it with a tool that writes files, such as the Chrome DevTools MCP `take_screenshot`
with `filePath`, or a headless Chrome driven over CDP (`Page.captureScreenshot`).
