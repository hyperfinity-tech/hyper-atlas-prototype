---
name: hyper-design
description: Apply Hyperfinity brand guidelines to ensure all AI-generated content follows correct color schemes, typography, and visual identity. Use this skill when creating any visual assets, UI components, marketing materials, or branded content for Hyperfinity.
---

This skill provides brand guidelines for Hyperfinity to ensure consistent visual identity across all AI-generated content. All creations must adhere to these standards.

## Brand Overview

Hyperfinity is a contemporary B2B SaaS brand with a modern, minimalist aesthetic. The visual identity emphasizes accessibility, clean layouts, and sophisticated color-blocking with vibrant accents against neutral backgrounds.

## Color Palette

### Primary Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Hyper Pink | `#F85AA4` | Primary brand color, CTAs, highlights |
| Hyper Pink Hover | `#C64882` | Hover states for pink elements |
| Hyper Blue | `#3976DD` | Secondary actions, links |
| Hyper Blue Dark | `#2D73FF` | Hover states for blue elements |

### Accent Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Hyper Teal | `#3FEAC8` | Success states, highlights, buttons |
| Hyper Teal Dark | `#32BBA1` | Hover states for teal elements |

### Neutral Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Black | `#000000` | Primary text, backgrounds |
| White | `#FFFFFF` | Backgrounds, inverse text |
| Gray | `#B1A6A6` | Secondary text, muted elements |

### CSS Variables Template

```css
:root {
  --hyper-pink: #F85AA4;
  --hyper-pink-hover: #C64882;
  --hyper-blue: #3976DD;
  --hyper-blue-dark: #2D73FF;
  --hyper-teal: #3FEAC8;
  --hyper-teal-dark: #32BBA1;
  --hyper-black: #000000;
  --hyper-white: #FFFFFF;
  --hyper-gray: #B1A6A6;
}
```

## Typography

### Primary Fonts

| Font | Weight | Usage |
|------|--------|-------|
| **Rebond Grotesque** | Regular (400), Semi-Bold (600) | Headings, display text |
| **Roobert** | Regular (400), Bold (700) | Body text, UI elements |
| **Red Hat Display** | Bold (700) | Navigation, tabs |

### Font Stack

```css
--font-display: 'Rebond Grotesque', sans-serif;
--font-body: 'Roobert', sans-serif;
--font-nav: 'Red Hat Display', sans-serif;
```

### Typography Scale

- **H1**: Rebond Grotesque Semi-Bold, 48-72px
- **H2**: Rebond Grotesque Semi-Bold, 36-48px
- **H3**: Rebond Grotesque Regular, 24-32px
- **Body**: Roobert Regular, 16-18px
- **Navigation**: Red Hat Display Bold, 24px
- **Small/Caption**: Roobert Regular, 14px

## Visual Elements

### Signature Dots

Hyperfinity uses circular dots as a distinctive design accent:
- **Size**: 16px diameter
- **Style**: Black outline with pink (`#F85AA4`) fill
- **Usage**: Decorative elements, list markers, visual anchors

### Button Styles

**Primary Button (Teal)**
```css
.btn-primary {
  background: #3FEAC8;
  color: #000000;
  border-radius: 8px;
  transition: background 0.2s ease;
}
.btn-primary:hover {
  background: #32BBA1;
}
```

**Secondary Button (Pink)**
```css
.btn-secondary {
  background: #F85AA4;
  color: #FFFFFF;
  border-radius: 8px;
  transition: background 0.2s ease;
}
.btn-secondary:hover {
  background: #C64882;
}
```

**Tertiary Button (Blue)**
```css
.btn-tertiary {
  background: #3976DD;
  color: #FFFFFF;
  border-radius: 8px;
  transition: background 0.2s ease;
}
.btn-tertiary:hover {
  background: #2D73FF;
}
```

## Design Principles

1. **Clean & Minimal**: Prioritize whitespace and clear visual hierarchy
2. **Bold Color Blocking**: Use vibrant accent colors strategically against neutral backgrounds
3. **Geometric Precision**: Incorporate clean shapes, particularly circles and rounded rectangles
4. **Animated Illustrations**: Use SVG graphics with subtle animations where appropriate
5. **Accessibility First**: Ensure sufficient color contrast and readable typography

## Do's and Don'ts

### Do
- Use the defined color palette consistently
- Maintain generous whitespace
- Apply hover states to interactive elements
- Use Rebond Grotesque for headlines
- Include signature dot accents where appropriate

### Don't
- Introduce colors outside the brand palette
- Use gradients (the brand favors solid color blocking)
- Mix too many accent colors in one component
- Use generic fonts like Arial, Helvetica, or Inter
- Overcrowd layouts with too many elements

## Logo Usage

The Hyperfinity wordmark is a horizontal logotype in dark typography. Always maintain adequate clear space around the logo and never distort or recolor it outside approved variations.
