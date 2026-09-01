# HomeOps MCP

**HomeOps MCP** is a voice-first household maintenance memory designed as a simulated **Alexa+** experience for the 2026 Amazon Developer Hackathon.

A user can say things like:

- “Remember the dryer vent and clean it every 6 months.”
- “I changed the HVAC filter today.”
- “What’s due?”
- “When did I last change the HVAC filter?”

HomeOps converts those spoken life-admin updates into durable maintenance records, service history, due dates, and a concise household maintenance brief.

## Why it matters

Home maintenance is usually tracked in memory, paper manuals, scattered notes, or not at all. The work itself is often simple; remembering *when* it is due is the failure point. HomeOps makes the conversational surface useful as a durable household memory rather than another checklist that must be manually maintained.

## What is implemented

- MCP server using **Streamable HTTP** and protocol version `2025-11-25`
- MCP methods: `initialize`, `ping`, `tools/list`, and `tools/call`
- Six household-maintenance tools with JSON Schemas
- Voice-capable Alexa+ simulation in the browser using Web Speech APIs when available
- Natural-language command parsing that works without any paid model/API
- Local JSON persistence
- Due/overdue calculations and maintenance history
- Responsive demo UI
- Node built-in test suite
- MIT license

## Architecture

```text
Browser voice/text
      |
      v
Alexa+ simulation UI
      |
      v
Natural-language intent router
      |
      +--------------------+
      |                    |
      v                    v
MCP tool layer <------ /mcp Streamable HTTP
      |
      v
Local household JSON store
```

The web demo and the MCP endpoint deliberately share the same tool implementation, so the demo is not a mockup: every command changes the same durable state exposed through MCP.

## Requirements

- Node.js 20+
- No npm packages are required
- No paid API keys are required
- No Amazon hardware is required for the simulated Alexa+ path

## Run

```bash
npm start
```

Open:

```text
http://localhost:8787
```

MCP endpoint:

```text
http://localhost:8787/mcp
```

## Test

```bash
npm test
```

## MCP quick check

Initialize:

```bash
curl -s http://localhost:8787/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"demo","version":"1"}}}'
```

List tools:

```bash
curl -s http://localhost:8787/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

Call a tool:

```bash
curl -s http://localhost:8787/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_due","arguments":{"horizonDays":30}}}'
```

## Privacy design

The demo is local-first. It does not send household records to a third-party model. The project intentionally avoids passwords, access codes, financial account information, and other secrets.

## Hackathon track

Primary track: **Alexa+**  
Mini challenge: **Open Source**

The project is a new open-source project created during the Amazon Developer Hackathon submission window.

## License

MIT
