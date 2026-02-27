# MCP Upgrade Research for `advanced-mcp-features` (Spec `2025-11-25` + SDK releases since Oct 2025)

## Executive summary

- This workshop still teaches and links to MCP spec `2025-06-18` in many places, while current MCP is `2025-11-25`.
- The **highest-impact new concepts not currently represented here** are:
  1. **Sampling with tools** (`tools` + `toolChoice`),
  2. **URL-mode elicitation** (including `URLElicitationRequiredError` and completion notifications),
  3. **Tasks** (durable async request lifecycle: `tasks/get`, `tasks/result`, `tasks/list`, `tasks/cancel`),
  4. **Icons metadata** across tools/resources/resource templates/prompts,
  5. **Updated capability negotiation** (`sampling.tools`, `elicitation.form/url`, `tasks.*`),
  6. **JSON Schema 2020-12 as default dialect** expectations.
- Workshop code currently pins `@modelcontextprotocol/sdk` to `^1.24.3`; latest is `v1.27.1`.

## Scope and evidence used

### Spec evidence

- MCP spec changelog for `2025-11-25`:
  - https://modelcontextprotocol.io/specification/2025-11-25/changelog
- MCP source repo tag comparison basis:
  - tags: `2025-06-18`, `2025-11-25` in `modelcontextprotocol/modelcontextprotocol`
  - no newer dated protocol revision tags after `2025-11-25` at time of research
- File-level review focused on:
  - `client/elicitation`
  - `client/sampling`
  - `server/tools`, `server/resources`, `server/prompts`
  - `basic/transports`, `basic/authorization`, `basic/index`
  - `basic/utilities/tasks`

### SDK evidence (requested via `gh`)

- Release list and notes from:
  - `gh release list --repo modelcontextprotocol/typescript-sdk --limit 100`
  - `gh api repos/modelcontextprotocol/typescript-sdk/releases?per_page=100`
- Time window reviewed: **all releases since 2025-10-01** through current (`v1.27.1`).

### Workshop-specific evidence

- Current workshop docs and code in this repo:
  - Root and exercise READMEs
  - Elicitation, sampling, long-running tasks, and changes module source/tests
- Series context from Epic AI site:
  - Four-workshop lineup links found on the series page:
    - `/workshops/mcp-fundamentals-mtezq`
    - `/workshops/advanced-mcp-features-flccv`
    - `/workshops/mcp-ui-aubv9`
    - `/workshops/mcp-auth-ddk2h`

---

## What changed in MCP spec `2025-11-25` that affects this workshop

### Added (directly relevant)

1. **Sampling tool use support**
   - Added `tools` and `toolChoice` to `sampling/createMessage`.
   - Added `sampling.tools` capability negotiation.
   - This is a direct expansion of the existing Sampling module and should be taught here.

2. **URL-mode elicitation**
   - Elicitation now supports `mode: "url"` in addition to form mode.
   - Added URL completion notification (`notifications/elicitation/complete`).
   - Added `URLElicitationRequiredError` (`-32042`) for blocked flows.
   - This is a direct expansion of the existing Elicitation module.

3. **Tasks utility (experimental)**
   - New task lifecycle and methods:
     - `tasks/get`
     - `tasks/result`
     - `tasks/list`
     - `tasks/cancel`
     - `notifications/tasks/status`
   - Adds durable async patterns beyond progress/cancellation notifications.
   - Strong fit for the Long Running Tasks module.

4. **Icons metadata support**
   - Tools/resources/resource templates/prompts can now expose `icons`.
   - Relevant to how capabilities are presented in clients and in dynamic update flows.
   - Belongs partly here, but likely deeper treatment in MCP UI workshop.

### Changed (directly relevant)

1. **Elicitation schema model expanded**
   - `EnumSchema`/`ElicitResult` evolved for:
     - titled/untitled enums
     - single-select and multi-select enum patterns
     - primitive default values support
   - Existing elicitation examples in this workshop are form-only boolean confirmations, so this is currently underrepresented.

2. **JSON Schema dialect expectations**
   - Default dialect is now **JSON Schema 2020-12** when `$schema` is omitted.
   - Affects tool input/output schema teaching in Advanced Tools and Sampling.

3. **Tool naming guidance formalized**
   - Naming format guidance now explicitly documented.
   - Current workshop names are generally compatible, but the rule should be taught.

4. **Tool validation error guidance**
   - Clarified: input validation errors should be surfaced as **tool execution errors** (self-correctable) rather than protocol errors.
   - Important for exercises that teach robust tool UX and model correction loops.

5. **Transport behavior clarifications**
   - Streamable HTTP/SSE polling and disconnection semantics were clarified.
   - This workshop is mostly stdio-oriented, so this is lower priority here, higher priority for Fundamentals/Remote transport teaching.

### Added/changed but mostly for other workshops

1. **Authorization and discovery upgrades**
   - OpenID Connect discovery support
   - Incremental scope consent via `WWW-Authenticate`
   - OAuth Client ID Metadata Documents
   - RFC9728 alignment/fallback behavior
   - This maps primarily to MCP Auth workshop.

### Removed (impact check)

- No major removals in the `2025-11-25` changelog materially impacting this workshop’s current scope.
- Main impact is additive + behavior clarifications.

---

## What is currently missing in this workshop

### New concepts that should be represented

1. **Sampling with tools loop**
   - Current Sampling exercises call `createMessage` without `tools`/`toolChoice`.
   - Missing: capability checks for `sampling.tools`, iterative tool-use flow, and tool result constraints.

2. **URL elicitation**
   - Current elicitation exercises are form-only and use `elicitation: {}` capability style.
   - Missing: mode-specific capability negotiation (`form`/`url`), URL safety model, and `URLElicitationRequiredError` handling.

3. **Tasks-based async lifecycle**
   - Current long-running module teaches progress notifications + cancellation tokens.
   - Missing: durable request lifecycle with tasks APIs and retrieval semantics.

4. **Icons and richer implementation metadata**
   - Workshop discusses annotations/title, but not icon metadata for tool/resource/prompt/template discovery.
   - Missing UI-facing metadata strategy.

5. **Updated capability granularity**
   - Missing explicit teaching for:
     - `sampling.tools`
     - `sampling.context` behavior constraints
     - `elicitation.form` / `elicitation.url`
     - `tasks.*` capabilities and tool-level task support.

6. **JSON Schema 2020-12 implications**
   - Structured output and schema exercises do not currently frame dialect expectations.

---

## TypeScript SDK releases since Oct 2025: significant changes to represent

Below are the notable changes from `typescript-sdk` releases since 2025-10 that materially affect workshop content/design.

### Core alignment releases (most curriculum-relevant)

1. **1.21.0 (2025-10-30)**
   - Tool error behavior fix aligns with spec intent:
     - return `CallToolResult` with `isError: true` instead of protocol-level failure for invalid tool/schema situations.
   - Add pluggable JSON schema validator providers (advanced infra relevance).

2. **1.22.0 (2025-11-13)**
   - SEP-986 tool naming support.
   - SEP-1034/SEP-1330 elicitation defaults + enum compatibility.
   - SEP-1319 request payload decoupling (typing/schema architecture shift).
   - `registerTool` accepts `ZodType<object>` for input/output.

3. **1.23.0 (2025-11-25)**
   - SEP-1036 URL elicitation.
   - SEP-1577 sampling with tools.
   - SEP-1613 JSON Schema 2020-12 handling.
   - SEP-1699 SSE polling support.
   - URL client metadata registration + insufficient scope upscoping/auth updates.
   - Marks old `elicitInput` overload deprecated.

4. **1.24.0 (2025-12-02)**
   - SEP-1686 tasks implementation.
   - SEP-1046 client credentials (auth-focused).
   - Additional SSE/task handling utilities.

5. **1.24.1 / 1.24.2 / 1.24.3**
   - Protocol version update to `2025-11-25`.
   - Optional resource annotations.
   - Backward-compatibility fixes around SSE priming behavior.

### Post-1.24.3 updates (important if this workshop upgrades to latest SDK)

1. **1.25.x**
   - Spec compliance tightening (removal of loose/passthrough types).
   - Added fetch transport.
   - Protocol date validation.
   - Security fix: UriTemplate ReDoS backport (`v1.25.2`).

2. **1.26.0**
   - Security advisory fix:
     - cross-client response data leak risk when sharing server/transport instances.

3. **1.27.x**
   - Tasks streaming methods for elicitation/sampling.
   - OAuth discovery caching utilities.
   - Conformance-focused improvements.
   - Example command-injection hardening fix (`v1.27.1`).

---

## Placement recommendations across the 4-workshop series

### A) Keep/add in **Advanced MCP Features** (this repo)

1. **Sampling with tools** (new lesson or extension of Sampling advanced step)
2. **URL elicitation** (extend Elicitation module beyond form mode)
3. **Tasks for long-running operations** (expand/replace part of current long-running strategy)
4. **Capability granularity updates** (elicitation modes, sampling tools, tasks)
5. **Tool execution error semantics and model self-correction loops**
6. **Spec-date refresh to `2025-11-25` and SDK upgrade notes**

### B) Better in **MCP Auth**

1. OIDC discovery integration details
2. `WWW-Authenticate` scope challenge and step-up flow
3. OAuth Client ID Metadata Documents
4. Client credentials updates (M2M)
5. Protected Resource Metadata fallback mechanics

### C) Better in **MCP UI**

1. Icon metadata design and rendering strategies
2. Metadata-driven affordances (`title`, `description`, `icons`) in UI clients
3. URL elicitation consent UX patterns (shared with Advanced Features)

### D) Better in **MCP Fundamentals**

1. JSON Schema 2020-12 baseline expectations
2. Tool naming guidance as foundational convention
3. Transport-level Streamable HTTP/SSE polling semantics

---

## Concrete update backlog proposal (starting point)

### Phase 0: alignment sweep (fast)

1. Update all exercise links from `2025-06-18` to `2025-11-25`.
2. Add a short “spec delta since 2025-06-18” callout in workshop intro.
3. Decide SDK target baseline:
   - minimum recommended: `^1.24.3` (already in repo),
   - preferred for refreshed launch: `^1.27.1` after compatibility pass.

### Phase 1: curriculum-critical feature additions

1. Add **Sampling with tools** exercise path:
   - request `tools` + `toolChoice`,
   - validate tool-use loop behavior,
   - test with `sampling.tools` capability gating.
2. Expand **Elicitation**:
   - teach form + URL modes,
   - include `URLElicitationRequiredError` handling pattern,
   - include security constraints and safe URL handling.
3. Expand **Long Running Tasks**:
   - introduce tasks lifecycle (`create` -> `get` -> `result`/`cancel`),
   - compare tasks vs progress-only notifications,
   - include task metadata (`related-task`) and polling strategy.

### Phase 2: metadata and UX upgrades

1. Add icons to at least one tool/resource/prompt/template flow.
2. Teach how list-changed notifications relate to metadata/icon updates.
3. Add client-facing display precedence guidance (title/annotations/name/icons).

### Phase 3: hardening and compatibility

1. Add tests for updated capability negotiation:
   - `elicitation.form`/`url`
   - `sampling.tools`
   - `tasks.requests.*`
2. Validate behavior under newer strict SDK typing/spec compliance.
3. Capture security notes from relevant SDK security fixes as teaching footnotes.

---

## Repo-specific observations to address in the update

1. Exercise docs currently point to old spec date (`2025-06-18`) in many modules.
2. Elicitation code/tests use form-only patterns and generic `elicitation: {}` capability checks.
3. Sampling exercises use plain `createMessage` requests and do not cover tool-enabled sampling.
4. Long-running exercises currently focus on progress/cancel notifications; no tasks API coverage.
5. Package dependencies pin `@modelcontextprotocol/sdk` around `^1.24.3` and `zod` v3.

---

## Recommended immediate next step

Create a small planning PR that does only:

1. spec-link/date updates (`2025-11-25`),
2. a new “Spec delta” section in workshop intro,
3. TODO markers in the 3 affected modules:
   - Elicitation (URL mode),
   - Sampling (tools + toolChoice),
   - Long-running tasks (tasks API).

Then do feature additions as separate PRs per module to reduce risk and review load.

