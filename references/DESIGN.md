---
name: Commercial Pulse
colors:
  surface: '#FFFFFF'
  surface-dim: '#c9dcf4'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef4ff'
  surface-container: '#e4efff'
  surface-container-high: '#daeaff'
  surface-container-highest: '#d2e4fd'
  on-surface: '#0a1d2e'
  on-surface-variant: '#424752'
  inverse-surface: '#203244'
  inverse-on-surface: '#e9f1ff'
  outline: '#727784'
  outline-variant: '#c2c6d5'
  surface-tint: '#0f5bbd'
  primary: '#004697'
  on-primary: '#ffffff'
  primary-container: '#145dbf'
  on-primary-container: '#cddbff'
  inverse-primary: '#adc6ff'
  secondary: '#0058bc'
  on-secondary: '#ffffff'
  secondary-container: '#0070eb'
  on-secondary-container: '#fefcff'
  tertiary: '#005338'
  on-tertiary: '#ffffff'
  tertiary-container: '#006e4b'
  on-tertiary-container: '#67f4b7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004494'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a41'
  on-secondary-fixed-variant: '#004493'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0a1d2e'
  surface-variant: '#d2e4fd'
  page-bg: '#F4F7FB'
  border-subtle: '#E2E8F0'
  accent-light: '#EAF2FF'
  text-secondary: '#526477'
  status-warning: '#F59E0B'
  status-danger: '#EF4444'
  whatsapp-green: '#25D366'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system establishes a high-performance, conversion-oriented SaaS aesthetic crafted for business development professionals, agency founders, and independent consultants operating in Mozambique. The visual tone balances enterprise trust with agile local commerce: clean, approachable, high-contrast, and pragmatic. It avoids gratuitous ornamentation, favoring high-legibility typographic scale, clear visual hierarchy, and instant tactile feedback for rapid data scanning and WhatsApp-driven outreach.

### Design Movement & Aesthetic
The interface draws from Modern SaaS with structural utilitarianism:
- **Crisp Surfaces**: Pure white cards layered over a tinted neutral canvas (`#F4F7FB`), avoiding dense gradients in favor of sharp spatial separation.
- **Micro-tactility**: Interactive elements use 8px–12px curvature, soft hairline borders, and localized ambient elevation to convey clickable certainty.
- **Localized Precision**: UI treatments are tailored for Mozambican commercial contexts—structured indicators for regional telephone codes (+258), Meticais (MT) currency displays, and provincial taxonomy badges.

## Colors

The palette is tuned for data density and immediate affordance recognition under varying display environments.

### Roles & Intent
- **Primary (`#145DBF`)**: Reserved for high-intent actions—primary CTAs, confirmed selections, and actionable states. High-contrast white text is mandatory.
- **Secondary (`#1877F2`)**: Applied to interactive brand iconography, active navigation states, selected filter tags, and focal links.
- **Accent Light (`#EAF2FF`)**: Soft container wash for active tab indicators, icon badges, and selected item backdrops.
- **Neutral / Canvas**:
  - `page-bg` (`#F4F7FB`): Cool tinted background reducing eye strain during deep prospecting sessions.
  - `surface` (`#FFFFFF`): Elevated card and drawer surfaces.
  - `border-subtle` (`#E2E8F0`): Hairline dividers and component bounding boxes.
- **Text Tiers**:
  - `text-primary` (`#142638`): Deep charcoal-navy for maximum contrast on headlines, labels, and company identifiers.
  - `text-secondary` (`#526477`): Slate neutral for auxiliary metadata, timestamps, and address sub-lines.
- **Functional Semantics**:
  - `tertiary` / Success (`#10B981`): Verified leads, active registries, and positive delivery status.
  - Warning (`#F59E0B`): Potential duplicate, unverified contact, and pipeline cautions.
  - Danger (`#EF4444`): Closed/lost deals, broken URLs, and invalid phone formats.
  - WhatsApp Accent (`#25D366`): Targeted exclusively at WhatsApp direct triggers and preview states.

## Typography

The typographic hierarchy relies on **Plus Jakarta Sans** for display, interactive, and body copy, supplemented with **JetBrains Mono** strictly for numeric data formats (+258 dialing sequences, NUIT registry identifiers, and MT monetary figures).

### Implementation Rules
- **Numbers & Pricing**: Currency declarations (`12.500 MT`) require tabular numeral alignment using `font-variant-numeric: tabular-nums` to maintain tabular scan integrity across lead lists.
- **Metadata Tightness**: Subtext, province labels, and category chips must strictly adhere to `label-sm` with slight tracking (`0.02em`) to ensure legibility on compact mobile screens.
- **Copy Density**: Paragraph line-height is locked between 1.4x and 1.5x to preserve spatial efficiency within prospect preview panes.

## Layout & Spacing

The layout is built upon an 8pt spatial baseline, adapting across breakpoints via a fluid 12-column grid.

### Breakpoints & Canvas Bounds
- **Desktop (1200px+)**: 12-column layout, max content container width 1440px, 32px canvas margin, 24px column gutters. Fixed left navigation (240px) with fluid dual-pane workspace (lead directory + prospect inspector).
- **Tablet (768px - 1199px)**: 8-column layout, 24px canvas margins, 16px gutters. Left navigation collapses into an icon dock (64px). Prospect preview shifts to an overlay sliding drawer.
- **Mobile (<768px)**: 4-column layout, 16px outer margin, 12px gutters. Primary workflow shifts to stacked view: feed list navigates to a full-screen outreach sheet with persistent sticky action bar for direct WhatsApp execution.

### Tap Targets
All interactive elements (filters, dialing icons, action chips, input rows) enforce an explicit minimum height of 44px on mobile devices.

## Elevation & Depth

Visual depth is achieved through delicate boundary definition paired with ambient, diffused drop shadows. Heavy blurs and floating colored halos are prohibited.

### Tiers of Depth
- **Level 0 (Base Canvas)**: Background color `#F4F7FB`. Flat, non-elevated.
- **Level 1 (Card & Section Surfaces)**: Background `#FFFFFF`, border `1px solid #E2E8F0`, shadow `0 1px 3px 0 rgba(20, 38, 56, 0.05), 0 1px 2px -1px rgba(20, 38, 56, 0.03)`.
- **Level 2 (Hovered Cards & Dropdowns)**: Background `#FFFFFF`, border `1px solid #CBD5E1`, shadow `0 4px 6px -1px rgba(20, 38, 56, 0.07), 0 2px 4px -2px rgba(20, 38, 56, 0.05)`.
- **Level 3 (Modals, WhatsApp Drawer, Sticky Bars)**: Background `#FFFFFF`, shadow `0 20px 25px -5px rgba(20, 38, 56, 0.1), 0 8px 10px -6px rgba(20, 38, 56, 0.04)`.

## Shapes

The design system standardizes on **Rounded (Level 2)** geometry:
- **Default (0.5rem / 8px)**: Primary form inputs, select dropdowns, utility buttons, and standard list items.
- **Large (0.75rem / 12px)**: Main prospecting cards, preview panels, and modal containers.
- **Pill (Fully rounded / 9999px)**: Reserved exclusively for status indicators, regional tags (e.g., `Maputo Cidade`), deal stage badges, and filter pills.

## Components

### Buttons
- **Primary**: Background `#145DBF`, text `#FFFFFF`, 8px border-radius. On hover: background `#0E4B9D`. Height 40px (desktop) / 44px (mobile). Font `label-md`.
- **Secondary / WhatsApp Action**: Background `#25D366`, text `#FFFFFF`. Hover: background `#1EBE5D`. Used strictly for "Enviar WhatsApp" or message dispatching.
- **Subtle / Outline**: Background `#FFFFFF`, border `1px solid #E2E8F0`, text `#142638`. Hover: background `#F4F7FB`.

### Chips & Badges
- **Province Chips**: Pill-shaped (`rounded-full`), height 24px, padding `0 10px`. Background `#EAF2FF`, text `#145DBF`, border `1px solid rgba(24, 119, 242, 0.2)`. Used for: Maputo Cidade, Sofala, Nampula, Tete, Cabo Delgado, etc.
- **Stage Badges**: Height 22px, padding `0 8px`, `label-sm`.
  - *Identified*: `#EAF2FF` text `#1877F2`.
  - *Contacted*: `#FEF3C7` text `#B45309`.
  - *Qualified*: `#D1FAE5` text `#065F46`.
  - *Lost*: `#FEE2E2` text `#991B1B`.

### Form Inputs & Search
- Surface `#FFFFFF`, border `1px solid #E2E8F0`, 8px corner radius. Focus ring: `2px solid #1877F2` with 2px offset.
- Phone input fields automatically affix the `+258` prefix in a fixed lead compartment styled with background `#F4F7FB` and text `#526477`.

### Cards & Prospect List Items
- Container `#FFFFFF`, 12px border radius, hairline `#E2E8F0`. 
- Padding: 16px internal padding. Left border can adopt a conditional 3px indicator stripe representing opportunity score (green for high conversion likelihood).

### WhatsApp Outreach Previewer
- Dedicated contextual panel mimicking message preview. Message bubble uses `#DCF8C6` (sent) with `#142638` text, showing dynamic template tag replacements (`{{nome}}`, `{{empresa}}`, `{{serviço}}`) highlighted in `#1877F2` pill tokens.