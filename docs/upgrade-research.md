# MCP Upgrade Research for `advanced-mcp-features` (Spec `2025-11-25` + SDK releases since Oct 2025)

## Executive summary

- Product direction for this refresh: **do not optimize for backwards compatibility**. Teach MCP as it is now, using current protocol semantics and current SDK behavior.
- This workshop still teaches and links to MCP spec `2025-06-18` in many places, while current MCP is `2025-11-25`.
- The **highest-impact new concepts not currently represented here** are:
  1. **Sampling with tools** (`tools` + `toolChoice`),
  2. **URL-mode elicitation** (including `URLElicitationRequiredError` and completion notifications),
  3. **Tasks** (durable async request lifecycle: `tasks/get`, `tasks/result`, `tasks/list`, `tasks/cancel`),
  4. **Icons metadata** across tools/resources/resource templates/prompts,
  5. **Updated capability negotiation** (`sampling.tools`, `elicitation.form/url`, `tasks.*`),
  6. **JSON Schema 2020-12 as default dialect** expectations.
- Workshop code currently pins `@modelcontextprotocol/sdk` to `^1.24.3`; latest is `v1.27.1`.
- Recommended target baseline for this refresh: **latest `@modelcontextprotocol/sdk` (`v1.27.1`) + current dated spec (`2025-11-25`)** until a newer dated spec is published.

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

## Update policy for this refresh (explicit)

This update should be done with a **current-spec-only** posture:

1. **No backwards-compatibility teaching burden** in exercises.
   - Teach modern capability shapes and modern request structures directly.
1. **Do not center deprecated or legacy APIs** in workshop code.
   - Legacy behavior may be mentioned briefly in notes, but not used as core implementation patterns.
1. **Prefer explicit modern protocol usage**, even where older fallbacks remain legal.
   - Example: use explicit elicitation mode semantics and modern capability negotiation.
1. **Track draft only as a short-horizon release risk**, not as main curriculum baseline.
   - Baseline remains latest dated release unless/until draft is promoted.

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

## Draft-spec watchlist (if draft became the next release next week)

Based on draft changelog + schema/doc diffs against `2025-11-25`, these are the meaningful items to pre-account for:

1. **Capabilities gain optional `extensions` field**
   - Added to both `ClientCapabilities` and `ServerCapabilities`.
   - Impact: low-to-medium. Mostly additive, but examples/teaching that show capability objects should be updated to avoid looking stale immediately.

2. **`_meta` reserves OpenTelemetry trace context keys**
   - Draft explicitly reserves `traceparent`, `tracestate`, and `baggage` for trace propagation.
   - Impact: low. Mainly docs/teaching guidance, but important to avoid using these keys for custom metadata.

3. **Sampling section adds stronger operational clarifications**
   - Tools passed via `sampling.createMessage` are request-scoped (not necessarily registered server tools).
   - Additional normative clarity around message sequencing, tool result matching, and result fields.
   - Impact: medium for this workshop because Sampling is a core module.

4. **No protocol method churn detected vs `2025-11-25`**
   - No added/removed RPC method names in schema diff.
   - Impact: low risk of immediate rewrite for method inventory.

5. **Tasks still experimental in draft**
   - Semantics remain potentially fluid.
   - Impact: medium. We should teach tasks as powerful but evolving, with explicit “experimental” framing.

6. **Security-best-practices references are moving toward tutorials/docs paths**
   - Link targets in draft docs reference `/docs/tutorials/security/security_best_practices` rather than dated spec-local paths.
   - Impact: low-to-medium. Use stable URLs in workshop text to avoid another round of link churn.

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

## Recommended actions to take (clear checklist)

These are ordered and intended to be executed as-is.

### 1) Lock the update policy (decision)

1. Declare in the workshop repo that this refresh is **current-spec-only** and **not backwards-compatibility-focused**.
2. Set baseline to:
   - MCP dated spec: `2025-11-25`
   - SDK: latest stable (`@modelcontextprotocol/sdk` `v1.27.1`)

### 2) Do immediate alignment edits (same PR batch)

1. Update all workshop links from `2025-06-18` to `2025-11-25`.
2. Add a brief “what changed since 2025-06-18” section to workshop intro.
3. Remove/replace legacy capability examples where they imply old-style patterns as the default.

### 3) Implement the 3 curriculum-critical upgrades (separate PRs)

1. **Sampling module:** add tool-enabled sampling (`tools` + `toolChoice`) with explicit capability gating.
2. **Elicitation module:** add URL mode + `URLElicitationRequiredError` + completion notification flow.
3. **Long-running module:** add task lifecycle (`task` request metadata, `tasks/get`, `tasks/result`, `tasks/list`, `tasks/cancel`) and compare against progress/cancellation notifications.

### 4) Make the content draft-resilient now (small cost, high payoff)

1. Add a short note in capability sections that `extensions` may appear (and should be treated as additive/optional).
2. Add `_meta` guidance that custom metadata must avoid reserved trace keys (`traceparent`, `tracestate`, `baggage`).
3. Use stable security best-practices links (`/docs/tutorials/security/security_best_practices`) where possible.

### 5) Add verification gates before release

1. Add/adjust tests for:
   - `sampling.tools` negotiation and constraints,
   - elicitation mode handling (`form`/`url`),
   - task method flows and task metadata handling.
2. Run module-scoped tests for all changed exercises.
3. Run one end-to-end smoke pass in MCP Inspector for each upgraded module path.

### 6) Release sequencing

1. Ship docs/spec-link alignment first.
2. Ship module upgrades incrementally (Sampling -> Elicitation -> Tasks) to keep review and rollback simple.
3. Publish a short “what changed” note to learners stating this is a current-spec refresh, not a legacy compatibility release.

---

## Repo-specific observations to address in the update

1. Exercise docs currently point to old spec date (`2025-06-18`) in many modules.
2. Elicitation code/tests use form-only patterns and generic `elicitation: {}` capability checks.
3. Sampling exercises use plain `createMessage` requests and do not cover tool-enabled sampling.
4. Long-running exercises currently focus on progress/cancel notifications; no tasks API coverage.
5. Package dependencies pin `@modelcontextprotocol/sdk` around `^1.24.3` and `zod` v3.

