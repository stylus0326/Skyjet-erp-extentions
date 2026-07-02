---
name: clean-redundant-code
description: Detects and cleans up leftover code blocks, redundant duplicates, or hanging braces/brackets from file replacements, preventing compilation or syntax errors.
---

# Clean Redundant Code & Syntax Check

This skill ensures that whenever code replacements or edits are performed, no leftover duplicate blocks, hanging braces/parentheses, or syntax errors are left behind.

## Best Practices for Edits and Replacements

### 1. Pre-Replacement Scoping
- Always identify the exact bounds of the function, class, or object being replaced.
- Ensure the `TargetContent` in `replace_file_content` or `multi_replace_file_content` covers the *entire* block that is being rewritten, including all its closing symbols (`}`, `)`, `]`, `});`).
- Never leave trailing remnants of the old function/callback outside the replaced range.

### 2. Post-Replacement Verification
Immediately after performing any file edit:
- **Inspect the surrounding lines** of the modified area. Check up to 30 lines before and after.
- Check for duplicate structural symbols like `});` or `}` that were originally part of the old callback.
- Run type check, compiler, or build commands (`npm run build`, `npm run lint`, etc.) to let the compiler verify syntax correctness.

### 3. Checklist for Eliminating Redundancy
- Did the original block have nested callbacks? If so, did the replacement delete all nested closing wrappers?
- Are there duplicate function declarations or import statements?
- Are there unreferenced variable parameters or leftover imports that might trigger lint errors?
- If a compilation error like "Unexpected token" or "Expected }" occurs, immediately look for matching braces around the modified line.
