---
name: Vibrant Academic Arcade
colors:
  surface: '#f8f9ff'
  surface-dim: '#c7dcf7'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef4ff'
  surface-container: '#e4efff'
  surface-container-high: '#daeaff'
  surface-container-highest: '#d0e4ff'
  on-surface: '#061d30'
  on-surface-variant: '#3f4a36'
  inverse-surface: '#1e3246'
  inverse-on-surface: '#e9f1ff'
  outline: '#6f7b64'
  outline-variant: '#becbb1'
  surface-tint: '#2b6c00'
  primary: '#2b6c00'
  on-primary: '#ffffff'
  primary-container: '#58cc02'
  on-primary-container: '#1e5000'
  inverse-primary: '#6be026'
  secondary: '#8c5000'
  on-secondary: '#ffffff'
  secondary-container: '#fd9500'
  on-secondary-container: '#633700'
  tertiary: '#4f5f7d'
  on-tertiary: '#ffffff'
  tertiary-container: '#a4b4d7'
  on-tertiary-container: '#364663'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#87fe45'
  primary-fixed-dim: '#6be026'
  on-primary-fixed: '#082100'
  on-primary-fixed-variant: '#1f5100'
  secondary-fixed: '#ffdcbf'
  secondary-fixed-dim: '#ffb872'
  on-secondary-fixed: '#2d1600'
  on-secondary-fixed-variant: '#6a3b00'
  tertiary-fixed: '#d7e2ff'
  tertiary-fixed-dim: '#b7c7ea'
  on-tertiary-fixed: '#0a1b37'
  on-tertiary-fixed-variant: '#374764'
  background: '#f8f9ff'
  on-background: '#061d30'
  surface-variant: '#d0e4ff'
typography:
  headline-xl:
    fontFamily: Nunito Sans
    fontSize: 40px
    fontWeight: '900'
    lineHeight: 48px
  headline-xl-mobile:
    fontFamily: Nunito Sans
    fontSize: 30px
    fontWeight: '900'
    lineHeight: 36px
  headline-lg:
    fontFamily: Nunito Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Nunito Sans
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 32px
  headline-md:
    fontFamily: Nunito Sans
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 32px
  headline-sm:
    fontFamily: Nunito Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Nunito Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-md:
    fontFamily: Nunito Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-sm:
    fontFamily: Nunito Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-lg:
    fontFamily: Nunito Sans
    fontSize: 15px
    fontWeight: '800'
    lineHeight: 20px
    letterSpacing: 0.5px
  label-md:
    fontFamily: Nunito Sans
    fontSize: 13px
    fontWeight: '800'
    lineHeight: 18px
    letterSpacing: 0.4px
  label-sm:
    fontFamily: Nunito Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.3px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 2rem
  margin: 1rem
  margin-desktop: 2.5rem
  space-xs: 0.375rem
  space-sm: 0.75rem
  space-md: 1.25rem
  space-lg: 2rem
  space-xl: 3rem
---

## Brand & Style

This design system translates the high-engagement, tactile gamification of modern language-learning apps into the high-stakes world of university grade defense and assignment coaching. Designed for college students balancing deadlines, rubric ambiguity, and academic pressure, the interface dispels panic through an encouraging, energetic, and physical visual language.

The aesthetic fuses **Tactile / Skeuomorphic Micro-interactions** with a crisp, modern vector layout. Key traits include:
- **Physical "Squishy" Micro-interactions:** Interactive elements behave like physical plastic blocks with thick bottom extrusion borders that physically depress (`translate-y-1` or `translate-y-1.5`) when clicked or tapped.
- **Empathetic Gamification:** High-stress moments (approaching deadlines, failing grades) are demystified into actionable quests, streak achievements, and friendly mascot interventions.
- **High-Clarity Chunking:** Dense academic feedback and AI critique are partitioned into bite-sized, digestible cards with high contrast, chunky pill tags, and bold signposting.

## Colors

The palette utilizes high-saturation primary and accent tones anchored by an authoritative deep navy.

- **Primary Feather Green (`#58CC02`):** Communicates mastery, successful thesis statements, assignment milestones completed, and confident academic progress.
  - Hover state: `#46A302`
  - 3D bottom extrusion / active rim: `#459E02`
  - Subtle tinted background: `#D7FFB8`
- **Secondary Flame Orange (`#FF9600`):** Used for dynamic daily streak counters, high-focus defense sessions, and urgent assignment timers.
  - Deep active rim: `#D97706`
  - Sub-variant / Fire Red: `#FF4B4B` (Bottom rim: `#EA2B2B`) for grade danger alerts and critical plagiarism warnings.
- **Owl Night Navy (`#1B2B47`):** Serves as the primary typography color, authoritative card headers, and mascot focus states, delivering scholarly balance against vibrant accents.
- **Supporting Tones:**
  - **Warning Yellow (`#FFC800`):** Grade ambiguity, revision needed (rim: `#E5A500`).
  - **Surface White (`#FFFFFF`):** High-opacity card layers.
  - **Canvas Grey (`#F7F9FA`):** Low-strain, neutral backdrop separating extruded UI layers.
  - **Card Outline Border (`#E5E7EB`):** High-definition 2px outlines separating components.

## Typography

The type system is powered by **Nunito Sans**, delivering rounded, friendly geometric geometry that avoids looking childish while significantly softening the clinical stress of academic evaluation.

- **Headlines:** Set in `FontWeight: 800` and `900` with tighter tracking. Use for grading outcome declarations, quest names, and module milestones.
- **Body:** Kept at weight `500` to `600` for crisp readability across complex essay feedback, citation inspections, and rubric instructions.
- **Labels & Microcopy:** Rendered with `FontWeight: 800` in uppercase or pronounced sentence case for badges, defense phase tabs, and 3D push buttons.

## Layout & Spacing

The layout is built upon an adaptive 12-column fluid grid designed to frame gamified cards, quest pathways, and rubric sidebars.

- **Desktop (1024px+):** Max layout container bounded at `1280px`. Left rail pinned for navigation and streak tallies; central column dedicated to dynamic assignment workflows; right drawer reserved for AI coaching prompts and real-time defense grades.
- **Tablet (768px – 1023px):** Two-column collapsible view. Navigation collapses to a bottom dock or persistent header.
- **Mobile (<768px):** Single-column stack. Content takes full width with `margin: 1rem` and `gutter: 0.75rem`. Sticky bottom action bar anchored for defense triggers and submission checks.
- **Rhythm:** Generous inner component padding (`space-md` to `space-lg`) prevents cognitive overload when students inspect complex rubric requirements.

## Elevation & Depth

Visual hierarchy does not rely on traditional blurry box-shadows. Instead, depth is communicated through **Tactile Extrusion & Structural Stacking**:

- **Physical 3D Edges:** Interactive components leverage solid CSS box-shadows (`0 4px 0 0 [Base-Color]`) or explicit bottom borders (`border-b-4`) to produce a physical, pushable toy-like volume.
- **Card Layers:** Base cards sit on `#FFFFFF` with a crisp `2px solid #E5E7EB` border and an offset structural shadow of `0 4px 0 0 #E5E7EB`.
- **Active Depress Motion:** When pressed, buttons shift down (`transform: translateY(4px)`) while the bottom box-shadow flattens to `0 0 0 0 transparent`, delivering instant haptic satisfaction.
- **Overlay Modals:** Mascots, celebratory grade boosts, and defense dialogues sit atop a dark tinted wash (`rgba(27, 43, 71, 0.6)`) with high-contrast, double-bordered containers (`3px solid #1B2B47`).

## Shapes

Shapes emphasize welcoming, approachable curves:
- **Base Components (Inputs, Chips, Alert Banners):** Standardized with rounded corners (`rounded-xl` / 16px).
- **Cards & Modal Trays:** Formed with generous corners (`rounded-2xl` / 24px to `rounded-3xl` / 32px), creating smooth, pebble-like surfaces that elevate the tactile playfulness.
- **Pills:** All streak counters, grade status badges, and action buttons employ pill profiles (`rounded-full`) to contrast against rectangular writing and document inspection cards.

## Components

### 1. 3D Push Buttons
- **Primary (Green):** Background `#58CC02`, text `#FFFFFF`, bottom shadow `0 4px 0 0 #459E02`. Hover `#46A302`. Active `transform: translateY(4px); box-shadow: none;`.
- **Secondary (Orange):** Background `#FF9600`, text `#FFFFFF`, bottom shadow `0 4px 0 0 #D97706`.
- **Danger (Red):** Background `#FF4B4B`, text `#FFFFFF`, bottom shadow `0 4px 0 0 #EA2B2B`.
- **Subtle / Neutral:** Background `#FFFFFF`, text `#1B2B47`, border `2px solid #E5E7EB`, bottom shadow `0 4px 0 0 #E5E7EB`.

### 2. Mascot Speech Bubble
- White rounded container (`rounded-2xl`) bordered by `2px solid #E5E7EB` with a pseudo-element directional triangle pointer anchored to the mascot avatar.
- Houses playful, direct student coaching microcopy (e.g., *"Your thesis statement in paragraph 2 needs evidence to defend against Professor Park!"*).

### 3. Streak & Fuel Flame Indicators
- Pill containers with white background and `2px solid #E5E7EB`.
- Contains animated flame icon (`#FF9600`), numeric counter in Nunito Sans Black (`FontWeight: 900`), and label microcopy (`"DAY STREAK"` or `"DEFENSE READINESS"`).

### 4. Segmented Progress Bar
- Background track `#E5E7EB`, height `16px`, pill-shaped (`rounded-full`).
- Filled with `#58CC02` segmented into distinct academic milestones (Outline ➔ Draft ➔ Citation Audit ➔ Mock Defense).
- Includes an animated white linear highlight along the top edge of the filled bar for a glossy, gamified polish.

### 5. Assignment Mode Tabs
- Segmented control pills resting on `#F0F3F6`.
- Inactive tabs display `#5A6E85` without borders.
- Selected tab features `#FFFFFF`, `2px solid #E5E7EB`, `box-shadow: 0 3px 0 0 #E5E7EB`, and bold navy text (`#1B2B47`).

### 6. Defense Status Badges
- **Safe:** `#D7FFB8` background, `#459E02` border (`2px`), `#1B2B47` text.
- **Warning:** `#FEF3C7` background, `#FFC800` border (`2px`), `#B45309` text.
- **Danger:** `#FEE2E2` background, `#FF4B4B` border (`2px`), `#991B1B` text.