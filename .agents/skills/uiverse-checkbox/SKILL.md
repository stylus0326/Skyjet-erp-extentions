---
name: uiverse-checkbox
description: Guidelines and design standards for using the premium Uiverse.io checkbox component with nebula swirl, sparkle, and rotate animations.
---

# Uiverse Checkbox Design Standard

This skill governs the custom checkbox component in the Skyjet ERP Helper system. It enforces styling, markup structure, and layout rules for unified premium checkboxes.

## Component Specification (React)

Create/import `CustomCheckbox` from `src/components/CustomCheckbox.tsx`:

```tsx
import React from 'react';

interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  checked,
  onChange,
  id,
}) => {
  return (
    <label className="custom-cb-container">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="custom-cb-wrapper">
        <div className="custom-cb-nebula-glow" />
        <div className="custom-cb-checkmark" />
        <div className="custom-cb-sparkle-container" />
      </div>
    </label>
  );
};
```

## Markup and Styling Constraints (Scaled Down Version)

To avoid collisions with global class names (like Tailwind's `.container`), prefix all class names with `custom-cb-`:
- Container: `.custom-cb-container` (relative position, inline-block, pointer cursor).
- Wrapper: `.custom-cb-wrapper` (relative position, 32px width and height, flex center).
- Checkmark: `.custom-cb-checkmark` (absolute position, 20px width and height, linear-gradient background).
- Glow: `.custom-cb-nebula-glow` (radial-gradient, 24px width and height).
- Sparkle: `.custom-cb-sparkle-container` (absolute position, full size).

### Animations Included
- Bounce: `custom-cb-bounce` when checked.
- Swirl: `custom-cb-swirl` rotation when checked.
- Twinkle: Sparkle particles animation.
- Pulse: Hover wrapper scaling.

## Usage Guidelines
1. Use `<CustomCheckbox />` for all standalone toggles, filter controls, and checkboxes in new layouts.
2. Pair the checkbox with a `<span onClick={() => onChange(!checked)}>Text Label</span>` inside a flex container to allow clicking both the checkbox and the label.
3. Make sure the container parent has adequate spacing/padding (`pl-1.5 pr-4 py-1`) to accommodate the 32px hover ripple wrapper area.
