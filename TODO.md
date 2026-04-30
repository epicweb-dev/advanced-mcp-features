# MCP Spec Update TODO

These notes assume the videos were recorded against the 2025-06-18 MCP spec and
should be refreshed for the 2025-11-25 release plus likely June 2026 changes.

Sources to re-check before recording:

- 2025-11-25 changelog:
  https://modelcontextprotocol.io/specification/2025-11-25/changelog
- Draft schema: https://modelcontextprotocol.io/specification/draft/schema
- SEP-1577 Sampling with Tools:
  https://modelcontextprotocol.io/seps/1577--sampling-with-tools
- SEP-1686 Tasks: https://modelcontextprotocol.io/seps/1686-tasks
- SEP-2260 request association:
  https://modelcontextprotocol.io/seps/2260-Require-Server-requests-to-be-associated-with-Client-requests
- SEP-2557 Tasks stabilization PR:
  https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2557
- SEP-2575 stateless MCP PR:
  https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2575

## Video Impact Legend

- `[video required]`: the current video teaches materially inaccurate guidance
  and should be rerecorded or replaced.
- `[verify transcript]`: inspect the named segment before deciding; current
  evidence was incomplete or conditional.
- `[content-only]`: update README/code/comments/callouts; the existing video can
  remain.
- `[video if ...]`: video work depends on choosing that larger rewrite.

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

- [x] [content-only] Update all spec links from `2025-06-18` to the current
      released spec once the June 2026 release lands. Until then, use
      `2025-11-25` for stable features and link to draft/SEP docs only where
      necessary.
- [x] [content-only] Add a root README callout that advanced MCP features have
      uneven client support and that users should verify support in their target
      host.
- [x] [content-only] Audit schemas for JSON Schema 2020-12 compatibility. Add
      `$schema` only where a non-default dialect is intentional.
- [x] [content-only] Add a short mention that server-to-client requests such as
      `sampling/createMessage`, `elicitation/create`, and `roots/list` must be
      associated with an originating client request. This is likely to become a
      hard requirement in the June 2026 cycle.
- [x] [content-only] If the June stateless transport proposal lands, add a short
      conceptual note to the introduction. Do not rewrite every exercise around
      it unless the TypeScript SDK API forces that change.

## Exercise 01: Advanced Tools

- [x] [content-only] Add the 2025-11 tool naming guidance to the tool
      annotations discussion: 1-64 chars, case-sensitive, ASCII letters/digits
      plus `_`, `-`, `.`, and `/`.
- [x] [content-only] Add one example of `icons` metadata for a tool if the SDK
      supports it. Keep the existing safety annotations exercise intact.
      Checked: the protocol type supports tool `icons`, but the current
      high-level `registerTool` helper used in the workshop does not expose it;
      added a note instead of forcing lower-level APIs into this exercise.
- [x] [content-only] Review structured output examples for the current
      `structuredContent` and `outputSchema` API in the TypeScript SDK.
- [x] [content-only] Ensure validation failures are described as tool execution
      errors visible to the model, not protocol errors.
- [x] [content-only] If HTTP header standardization lands in June, optionally
      add a short advanced note that tool schemas may use `x-mcp-header` for
      infrastructure routing. Do not make it an exercise unless there is SDK
      support. Checked: not added to exercises because there is no stable SDK
      support to teach yet.

## Exercise 02: Elicitation

- [ ] [verify transcript] Replace all `enumNames` examples with standards-based
      enum schemas: use plain `enum` when values are display-ready and `oneOf`
      or `anyOf` with `const` plus `title` when display labels differ from
      stored values. The README has `enumNames`; verify whether the intro video
      shows or narrates that schema. Content updated: README no longer uses
      `enumNames`; intro transcript is still unavailable, so video verification
      remains open. Re-checked with Epicshop MCP: the intro transcript still
      returns "Transcripts not available." The step problem and solution
      transcripts are available and do not mention `enumNames`.
- [x] [content-only] Add a multi-select elicitation example returning
      `string[]`.
- [x] [verify transcript] Add `mode: "form"` to form elicitation examples if the
      current SDK/spec requires explicit modes. If a solution video visibly
      builds the old request, consider a short video patch; otherwise keep this
      content-only. Checked: current SDK keeps `mode` optional for form requests
      for backwards compatibility; written examples now prefer `mode: "form"`.
- [x] [content-only] Add a new URL mode section. It should explain that URL
      elicitation is for sensitive or out-of-band interactions such as
      third-party OAuth, payments, or API key setup, and that secrets must not
      pass through the MCP client.
- [x] [content-only] Add a small URL mode exercise if client/inspector support
      is good enough. If not, add a README-only exercise and keep the code
      focused on form mode. Added README-only material and kept code focused on
      form mode.
- [x] [content-only] Include `notifications/elicitation/complete` and the URL
      elicitation required error (`-32042`) in the conceptual material.
- [x] [content-only] Add the request association warning: elicitation should be
      nested inside an originating tool/resource/prompt request, not fired from
      a background task.

## Exercise 03: Sampling

- [x] [content-only] Update the simple sampling exercise to check
      `clientCapabilities.sampling` before calling `createMessage`.
- [x] [content-only] Avoid `includeContext: "thisServer"` or `"allServers"` in
      new material. Those modes are soft-deprecated unless the client explicitly
      advertises `sampling.context`. Transcript already cautions against
      `includeContext`.
- [x] [video if replacing advanced sampling] Add a second exercise or rewrite
      `02.problem.advanced` around sampling with tools:
  - declare `clientCapabilities.sampling.tools`
  - pass `tools` and `toolChoice`
  - handle `ToolUseContent`
  - execute the selected tool server-side
  - send `ToolResultContent` back into the next sampling call
  - handle `stopReason: "toolUse"` If sampling-with-tools is only an optional
    written addendum, keep it content-only. If it replaces the current advanced
    sampling lesson, rerecord. Kept this as a written addendum instead of
    replacing the existing lesson.
- [x] [content-only] Update parsing code because sampling result `content` may
      be a single content block or an array of content blocks.
- [x] [content-only] Add the request association warning: sampling is only valid
      while handling a client-originated request such as `tools/call`,
      `resources/read`, or `prompts/get`.
- [x] [content-only] Keep server-side logging in this module if it still fits,
      but consider moving it to a shorter sidebar so the new sampling-with-tools
      material has room.

## Exercise 04: Long Running Tasks

- [ ] [video required if Tasks-centered] Rename the module to `04.tasks` if
      possible. The current "long running tasks" title accidentally conflicts
      with the new protocol-level Tasks feature while only teaching progress and
      cancellation. Current videos frame this module around progress tokens,
      `notifications/progress`, `notifications/cancelled`, and
      `AbortController`.
- [ ] [video required if Tasks-centered] Replace the main exercise path with
      protocol Tasks once the June version is stable. Progress notifications and
      cancellation should become supporting concepts inside a Tasks flow.
- [ ] [video planning] Teach the 2025-11 experimental model only as history if
      June changes land. The likely June direction from SEP-2557 is:
  - task creation can be returned directly from ordinary requests
  - `tasks/get` becomes the polling and result retrieval API
  - `tasks/result` is removed or no longer central
  - `tasks/list` is likely removed
  - `ttl` is likely seconds, while poll interval remains milliseconds
  - `requestState` may exist for stateless/sessionless implementations
- [ ] [video planning] Do not build new videos around the 2025-11 experimental
      `tasks/result` flow unless June slips and the SDK does not expose the
      stabilization work.
- [ ] [video if task cancellation is demonstrated] Keep cancellation, but update
      it to task cancellation if the final spec provides `tasks/cancel`;
      otherwise keep `notifications/cancelled` as the request-level primitive
      and explain how it relates to tasks.
- [x] [content-only] If client support is weak, make the implementation use a
      small local test harness instead of depending on host UI support. Existing
      tests already exercise this module through local client/test harnesses, so
      no host UI dependency was added.

## Exercise 05: Changes

- [x] [content-only] Keep `list_changed` notifications and resource
      subscriptions; they remain valuable and are not superseded by Tasks.
- [x] [content-only] Add optional `icons` metadata to a dynamic
      tool/resource/prompt example and show that metadata changes should trigger
      the appropriate `list_changed` notification.
- [x] [content-only] If stateless/sessionless MCP lands in June, verify that any
      examples using in-memory subscriptions still make sense. Add a callout
      that subscriptions are connection/session sensitive and may require
      persistent transport support.

## Things To Defer

- Full OAuth Client ID Metadata Documents belong in `mcp-auth`.
- MCP Apps belongs in `mcp-ui`/`mcp-apps`.
- Transport-level stateless architecture probably deserves a separate future
  module, unless June changes make it unavoidable in the SDK.
