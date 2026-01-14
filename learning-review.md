# Advanced MCP Features Workshop - Learning Review

## Exercise 1.1: Annotations

**no notes.**

The exercise clearly explains the purpose and semantics of tool annotations. The helper type (`ToolAnnotations`) is a particularly nice touch that prevents common mistakes with annotation defaults. The exercise reinforced understanding of when to use `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint`.

---

## Exercise 1.2: Structured Output

**no notes.**

The exercise builds naturally on the previous one. The pattern of adding `outputSchema` and `structuredContent` is well explained with clear examples. The callout about including structuredContent as text for backwards compatibility with clients that don't support structured output is particularly useful practical advice.

---

## Exercise 2.1: Elicit Confirmation

**no notes.**

The exercise clearly explains the elicitation pattern for human-in-the-loop confirmations. The capability check (`capabilities?.elicitation`) before attempting elicitation is a key pattern that ensures graceful degradation for clients that don't support this feature.

---

## Exercise 3.1: Simple Sampling

**Issue found:** The test file in the problem directory expects `mimeType` in the content object, but the solution doesn't include it. This causes the test to fail even with a correct implementation. The test file should be updated to match the solution.

Otherwise, the exercise effectively demonstrates the basic sampling pattern - checking capabilities, sending a `createMessage` request, and logging the response.

---

## Exercise 3.2: Advanced Sampling Prompt

**Issue found:** The problem test file expects `mimeType: 'application/json'` which the SDK strips out. The test should be updated to match the solution. The README acknowledges this issue correctly, but the test file was not updated accordingly.

The exercise provides excellent guidance on prompt engineering for structured outputs, including example JSON for testing and a clear workflow for iterating on prompts.

---

## Exercise 4.1: Progress Updates

**Issue found:** Same mimeType test issue carried over from previous exercise.

Otherwise, the exercise clearly demonstrates the progress notification pattern. The onProgress callback pattern is elegant and the integration with ffmpeg's output parsing is a practical real-world example.

---

## Exercise 4.2: Cancellation

**Issue found:** Same mimeType test issue carried over from previous exercise.

The exercise excellently demonstrates the AbortController/AbortSignal pattern for cancellation. The integration with child process management (killing ffmpeg) is a practical real-world scenario. The cleanup pattern using `finally` to remove the event listener is a good practice.

---

## Exercise 5.1: List Changed

**Issue found:** Same mimeType test issue carried over from previous exercise.

The exercise clearly demonstrates how to use the listChanged capability for prompts. The pattern of checking enabled state before enabling/disabling to avoid redundant notifications is a nice best practice.

---

## Exercise 5.2: Resource Template List Changed

**Issue found:** Same mimeType test issue carried over from previous exercise.

The exercise demonstrates how to notify clients when resource lists change. The use of `sendResourceListChanged()` when data sources (database, videos) change is a clear pattern.

---

## Exercise 5.3: Subscriptions

**Issue found:** Same mimeType test issue carried over from previous exercise.

The exercise excellently demonstrates resource subscriptions - a key feature for real-time updates. The implementation covers:
1. Setting up request handlers for `SubscribeRequestSchema` and `UnsubscribeRequestSchema`
2. Tracking subscribed URIs in a Set
3. Sending `notifications/resources/updated` when subscribed resources change
4. Properly handling both database changes (entries, tags) and video changes

The pattern of checking if a URI is in the subscription set before sending notifications is clean and efficient. The exercise ties together concepts from throughout the workshop.

---

## Overall Workshop Feedback

**Recurring Issue:** The test file in each exercise's problem directory has an incorrect expectation for `mimeType: 'application/json'` in the sampling content. The SDK strips `mimeType` from text content (as noted in the README), but the test file expects it to be present. This causes tests to fail with correct implementations and requires manually fixing the test file for every exercise from 3.1 onwards. The problem test files should be updated to match the solution test files.

**Positive aspects:**
- Excellent progressive difficulty curve building MCP knowledge
- Clear explanations of MCP concepts with practical examples
- Good use of capability checks for graceful degradation
- Real-world ffmpeg integration demonstrates practical application
- Clean separation of concerns in code organization

---
