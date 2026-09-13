---
name: Apex Control
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bec8d2'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#88929b'
  outline-variant: '#3e4850'
  surface-tint: '#89ceff'
  primary: '#89ceff'
  on-primary: '#00344d'
  primary-container: '#0ea5e9'
  on-primary-container: '#003751'
  inverse-primary: '#006591'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#d88a00'
  on-tertiary-container: '#4a2c00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c9e6ff'
  primary-fixed-dim: '#89ceff'
  on-primary-fixed: '#001e2f'
  on-primary-fixed-variant: '#004c6e'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  code-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  table-header:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1440px
  sidebar-width: 260px
  gutter: 24px
  section-gap: 32px
  card-padding: 20px
---

## Brand & Style
The design system is engineered for high-stakes AI orchestration. It targets technical operators, developers, and data scientists who require a "Control Center" environment that feels authoritative, precise, and computationally powerful.

The style is **Corporate Modern with a Technical Edge**. It prioritizes data density without sacrificing clarity, utilizing a dark-mode-first approach to reduce eye strain during long monitoring sessions. The aesthetic is inspired by command-line interfaces and sophisticated aerospace dashboards, using subtle transparency, crisp lines, and a structured hierarchy to convey stability and intelligence.

## Colors
The palette is rooted in deep slates and navies to create a receding background that allows interactive elements and data points to pop.

- **Primary (Deep Tech Blue):** Used for primary actions, active states, and focus indicators.
- **Surface & Background:** A tiered system of `#020617` for the main canvas and `#0F172A` for elevated cards and panels.
- **Functional Accents:** Cyber Green (#10B981) specifically denotes "Active" or "Healthy" AI agents. Warning Amber (#F59E0B) and Error Red (#EF4444) are reserved for system alerts and critical failures.
- **Borders:** Low-contrast slate (#1E293B) is used to define structure without adding visual noise.

## Typography
Inter provides the foundation for the interface, chosen for its exceptional legibility in dense data environments. JetBrains Mono is introduced as a secondary font for technical strings, IDs, and status labels to reinforce the "Developer Tools" aesthetic.

- **Headlines:** Use tight letter-spacing and bold weights to establish a clear hierarchy.
- **Data Tables:** Use `table-header` for column titles to differentiate metadata from content.
- **Code/Labels:** All system-generated IDs, logs, and status badges must use `code-label` for a distinct technical feel.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. A fixed-width sidebar (260px) persists on the left, while the main content area utilizes a fluid grid that scales up to a maximum width of 1440px to ensure data doesn't become over-extended on ultra-wide monitors.

- **Desktop:** 12-column grid with 24px gutters.
- **Tablet:** 8-column grid with 16px gutters; sidebar collapses to an icon-only rail.
- **Mobile:** Single column with 16px margins.
- **Rhythm:** Use an 8px base unit for all padding and margins to maintain a consistent vertical rhythm.

## Elevation & Depth
In this dark "Control Center" environment, depth is communicated through **Tonal Layering** and **Low-Contrast Outlines** rather than heavy shadows.

- **Level 0 (Base):** `#020617` - The main application background.
- **Level 1 (Surface):** `#0F172A` - Cards, sidebar, and navigation bars. These feature a 1px solid border of `#1E293B`.
- **Level 2 (Overlay):** `#1E293B` - Modals, dropdowns, and tooltips. These use a subtle 10% primary-tinted shadow (0px 10px 15px -3px rgba(0,0,0,0.5)) to separate from the surface.
- **Active State:** Elements being interacted with may use a subtle inner glow or a primary color border-glow.

## Shapes
This design system uses a **Soft (0.25rem)** roundedness approach. This maintains a professional, "industrial" feel while avoiding the harshness of sharp corners.

- **Buttons & Inputs:** 4px (0.25rem) border radius.
- **Cards & Panels:** 8px (0.5rem) border radius for larger structural components.
- **Status Pills:** Fully rounded (capsule) for quick visual scanning.

## Components
- **Buttons:** Primary buttons use a solid Tech Blue background with white text. Secondary buttons use a ghost style (border only) to maintain hierarchy. 
- **Cards:** Defined by `#0F172A` backgrounds and `#1E293B` borders. Headers within cards should have a subtle bottom divider.
- **Status Indicators:** Small circular "pings" or badges. Use "Cyber Green" with a subtle outer glow for active AI agents.
- **Data Tables:** High-contrast rows. Alternate row striping is discouraged; use 1px horizontal dividers instead. Hover states should highlight the entire row in a slightly lighter navy.
- **Sidebar:** Darker than the main surface. Navigation items use a vertical primary-color bar on the left to indicate the active page.
- **Inputs:** Dark backgrounds with a 1px border. On focus, the border transitions to Primary Tech Blue with a subtle 2px outer glow.