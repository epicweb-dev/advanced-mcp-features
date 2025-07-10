# Epic AI Workshop - Test File Updates Summary

## Exercise Test Status Summary

Based on testing each exercise, here's what tests should be included in each
step:

### Exercise 1: Advanced Tools

- **1.1 (annotations)**: Tool Definition, Tool annotations, ListChanged
  notifications (3 basic + 1 annotations)
- **1.2 (structured)**: All from 1.1 + Tool annotations and structured output
  (full version)

### Exercise 2: Elicitation

- **2.1 (solution)**: Tool Definition, ListChanged notifications (4 basic tests
  only)

### Exercise 3: Sampling

- **3.1 (simple)**: Tool Definition, Tool annotations and structured output,
  Elicitation: delete_entry confirmation, ListChanged notifications (7 tests)
- **3.2 (advanced)**: All from 3.1 + Sampling test (8 tests)

### Exercise 4: Long-running Tasks

- **4.1 (progress)**: All from 3.2 + Progress notification test (8 tests)
- **4.2 (cancellation)**: Same as 4.1 (8 tests)

### Exercise 5: Changes

- **5.1 (list-changed)**: Same as 4.1/4.2 (8 tests)
- **5.2 (resources-list-changed)**: Same as 5.1 (8 tests)
- **5.3 (subscriptions)**: All 10 tests (full implementation)

## Consistently Failing Tests (Not Implemented in Earlier Steps)

- **Resource subscriptions**: Only works in final step (5.3)
- **Elicitation: delete_tag decline**: Has implementation issues across multiple
  steps

## Pattern

Each exercise builds incrementally:

1. Basic tools + annotations → structured output → sampling → progress → changes
   → subscriptions
2. The final step (5.3) should have all tests passing as it's the reference
   implementation
