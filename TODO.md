# MCP Spec Update TODO

These notes assume the videos were recorded against the 2025-06-18 MCP spec and
should be refreshed for the 2025-11-25 release plus likely June 2026 changes.

Sources to re-check before recording:

- 2025-11-25 changelog:
  https://modelcontextprotocol.io/specification/2025-11-25/changelog
- Draft schema:
  https://modelcontextprotocol.io/specification/draft/schema
- SEP-1577 Sampling with Tools:
  https://modelcontextprotocol.io/seps/1577--sampling-with-tools
- SEP-1686 Tasks:
  https://modelcontextprotocol.io/seps/1686-tasks
- SEP-2260 request association:
  https://modelcontextprotocol.io/seps/2260-Require-Server-requests-to-be-associated-with-Client-requests
- SEP-2557 Tasks stabilization PR:
  https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2557
- SEP-2575 stateless MCP PR:
  https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2575

## Recommended Strategy

This workshop should absorb most of the post-September spec changes. Keep the
overall workshop, but change the shape of three modules:

1. Expand `02.elicitation` to cover the new form schema rules and URL mode.
2. Expand `03.sampling` to cover sampling with tools and request association.
3. Replace or heavily reframe `04.long-running-tasks` around the new Tasks
   primitive instead of only progress and cancellation.

The lowest-work version is to keep existing exercise folders and rename/rewrite
their READMEs plus code goals. The highest-value version is to make Tasks the
center of exercise 04, with progress/cancellation as supporting details.

## Global Updates

- [ ] Update all spec links from `2025-06-18` to the current released spec once
  the June 2026 release lands. Until then, use `2025-11-25` for stable features
  and link to draft/SEP docs only where necessary.
- [ ] Add a root README callout that advanced MCP features have uneven client
  support and that users should verify support in their target host.
- [ ] Audit schemas for JSON Schema 2020-12 compatibility. Add `$schema` only
  where a non-default dialect is intentional.
- [ ] Add a short mention that server-to-client requests such as
  `sampling/createMessage`, `elicitation/create`, and `roots/list` must be
  associated with an originating client request. This is likely to become a
  hard requirement in the June 2026 cycle.
- [ ] If the June stateless transport proposal lands, add a short conceptual
  note to the introduction. Do not rewrite every exercise around it unless the
  TypeScript SDK API forces that change.

## Exercise 01: Advanced Tools

- [ ] Add the 2025-11 tool naming guidance to the tool annotations discussion:
  1-64 chars, case-sensitive, ASCII letters/digits plus `_`, `-`, `.`, and `/`.
- [ ] Add one example of `icons` metadata for a tool if the SDK supports it.
  Keep the existing safety annotations exercise intact.
- [ ] Review structured output examples for the current `structuredContent` and
  `outputSchema` API in the TypeScript SDK.
- [ ] Ensure validation failures are described as tool execution errors visible
  to the model, not protocol errors.
- [ ] If HTTP header standardization lands in June, optionally add a short
  advanced note that tool schemas may use `x-mcp-header` for infrastructure
  routing. Do not make it an exercise unless there is SDK support.

## Exercise 02: Elicitation

- [ ] Replace all `enumNames` examples with standards-based enum schemas:
  use plain `enum` when values are display-ready and `oneOf` or `anyOf` with
  `const` plus `title` when display labels differ from stored values.
- [ ] Add a multi-select elicitation example returning `string[]`.
- [ ] Add `mode: "form"` to form elicitation examples if the current SDK/spec
  requires explicit modes.
- [ ] Add a new URL mode section. It should explain that URL elicitation is for
  sensitive or out-of-band interactions such as third-party OAuth, payments, or
  API key setup, and that secrets must not pass through the MCP client.
- [ ] Add a small URL mode exercise if client/inspector support is good enough.
  If not, add a README-only exercise and keep the code focused on form mode.
- [ ] Include `notifications/elicitation/complete` and the URL elicitation
  required error (`-32042`) in the conceptual material.
- [ ] Add the request association warning: elicitation should be nested inside
  an originating tool/resource/prompt request, not fired from a background task.

## Exercise 03: Sampling

- [ ] Update the simple sampling exercise to check `clientCapabilities.sampling`
  before calling `createMessage`.
- [ ] Avoid `includeContext: "thisServer"` or `"allServers"` in new material.
  Those modes are soft-deprecated unless the client explicitly advertises
  `sampling.context`.
- [ ] Add a second exercise or rewrite `02.problem.advanced` around sampling
  with tools:
  - declare `clientCapabilities.sampling.tools`
  - pass `tools` and `toolChoice`
  - handle `ToolUseContent`
  - execute the selected tool server-side
  - send `ToolResultContent` back into the next sampling call
  - handle `stopReason: "toolUse"`
- [ ] Update parsing code because sampling result `content` may be a single
  content block or an array of content blocks.
- [ ] Add the request association warning: sampling is only valid while handling
  a client-originated request such as `tools/call`, `resources/read`, or
  `prompts/get`.
- [ ] Keep server-side logging in this module if it still fits, but consider
  moving it to a shorter sidebar so the new sampling-with-tools material has
  room.

## Exercise 04: Long Running Tasks

- [ ] Rename the module to `04.tasks` if possible. The current "long running
  tasks" title accidentally conflicts with the new protocol-level Tasks feature
  while only teaching progress and cancellation.
- [ ] Replace the main exercise path with protocol Tasks once the June version is
  stable. Progress notifications and cancellation should become supporting
  concepts inside a Tasks flow.
- [ ] Teach the 2025-11 experimental model only as history if June changes land.
  The likely June direction from SEP-2557 is:
  - task creation can be returned directly from ordinary requests
  - `tasks/get` becomes the polling and result retrieval API
  - `tasks/result` is removed or no longer central
  - `tasks/list` is likely removed
  - `ttl` is likely seconds, while poll interval remains milliseconds
  - `requestState` may exist for stateless/sessionless implementations
- [ ] Do not build new videos around the 2025-11 experimental
  `tasks/result` flow unless June slips and the SDK does not expose the
  stabilization work.
- [ ] Keep cancellation, but update it to task cancellation if the final spec
  provides `tasks/cancel`; otherwise keep `notifications/cancelled` as the
  request-level primitive and explain how it relates to tasks.
- [ ] If client support is weak, make the implementation use a small local test
  harness instead of depending on host UI support.

## Exercise 05: Changes

- [ ] Keep `list_changed` notifications and resource subscriptions; they remain
  valuable and are not superseded by Tasks.
- [ ] Add optional `icons` metadata to a dynamic tool/resource/prompt example and
  show that metadata changes should trigger the appropriate `list_changed`
  notification.
- [ ] If stateless/sessionless MCP lands in June, verify that any examples using
  in-memory subscriptions still make sense. Add a callout that subscriptions are
  connection/session sensitive and may require persistent transport support.

## Things To Defer

- Full OAuth Client ID Metadata Documents belong in `mcp-auth`.
- MCP Apps belongs in `mcp-ui`/`mcp-apps`.
- Transport-level stateless architecture probably deserves a separate future
  module, unless June changes make it unavoidable in the SDK.
