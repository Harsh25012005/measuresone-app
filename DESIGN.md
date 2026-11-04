# TrueFit Design System: "Indigo Ink"

Source of truth in code: `src/theme/tokens.ts` (values), `global.css` (CSS variables for NativeWind), `tailwind.config.js` (class names), `lib/theme.ts` (hex for icon colours). `scripts/check-design-rules.js` fails the build if the CSS variables drift from the tokens, or if a screen uses an out-of-range radius, a shadow, an elevation or a gradient.

The user is a busy tailor, often one-handed, often not tech-savvy, and the app must read well in English, Gujarati and Hindi.

---

## 1. Principles

1. **Flat and calm.** Depth comes from 1px borders, background tints and spacing. Never shadows, elevation or gradients.
2. **One primary colour.** Indigo is the only brand colour. Green, amber and red are reserved for meaning (success, warning, error) and are never used for decoration.
3. **Glanceable.** Every order row says who, what, when due, status and money owed without opening it.
4. **Few taps.** Smart defaults, one-screen forms, swipe shortcuts. Confirmation only for destructive actions.
5. **Colour is never the only cue.** Every status has an icon or text as well.

---

## 2. Colour

### 2.1 Palette

| Token | Light | Dark | Use |
|---|---|---|---|
| `primary` | `#3340B8` | `#8E9BFF` | Primary buttons, links, active tab, focus ring, selected |
| `primaryDark` | `#28339A` | `#AAB4FF` | Pressed primary, text on tint |
| `primaryLight` (tint) | `#E8EAFB` | `#1C2142` | Selected rows/chips, "in progress" badge |
| `onPrimary` | `#FFFFFF` | `#0D1033` | Text/icons on `primary` |
| `background` | `#F7F8FB` | `#0D0F15` | Screen background |
| `surface` | `#FFFFFF` | `#151821` | Cards, sheets, inputs, tab bar |
| `surfaceSubtle` | `#EFF1F6` | `#1C202B` | Pressed rows, secondary fills, skeletons |
| `text` | `#12141C` | `#ECEEF4` | Body and titles |
| `textMuted` | `#565D70` | `#A3AABD` | Secondary text, labels |
| `textFaint` | `#6E7589` | `#8089A0` | Placeholders, metadata (still 4.5:1 on surface) |
| `border` | `#DDE1EA` | `#2A2F3D` | 1px borders on cards, inputs, buttons |
| `borderSubtle` | `#E9ECF2` | `#20242F` | Row dividers |
| `success` / tint | `#12724A` / `#E4F3EC` | `#4CC38A` / `#12261D` | Ready, Paid |
| `warning` / tint | `#8A5300` / `#FBF0DC` | `#E8A93A` / `#2B2111` | Due today, partial payment |
| `danger` / tint | `#BC2F2F` / `#FBE9E7` | `#FF8A80` / `#2E1816` | Late, unpaid, destructive |

All text/background pairs above were measured at ≥ 4.5:1 and are asserted by `__tests__/tokens.test.ts` (text 17.3:1, muted 6.2:1, onPrimary 8.2:1, primary on tint 6.9:1 in light mode; all ≥ 5.1:1 in dark).

### 2.2 Status and payment badges

| State | Background | Text | Icon |
|---|---|---|---|
| Received (`order_taken`) | surfaceSubtle + border | text | `clock` |
| In progress (`cutting`, `stitching`) | primaryLight | primaryDark | `scissors` |
| Ready | success tint | success | `circle-check` |
| Delivered | background + border | textMuted | `truck` |
| Late (derived) | danger tint | danger | `alert-triangle` |
| Due today (derived) | warning tint | warning | `clock` |
| Paid | success tint | success | `check` |
| Partial | warning tint | warning | `coin` |
| Unpaid | danger tint | danger | `alert-circle` |

### 2.3 Rules
- Screens never contain hex values. Use classes (`bg-surface`, `text-ink`, `text-muted`, `border-line`, `bg-primary`, `text-danger`...) or `useTheme().colors`.
- The legacy Tailwind palettes (`gray`, `cream`, `charcoal`, `terracotta`, `forest`) are removed. Only the semantic names above (and the `primary` scale) exist.

---

## 3. Typography

**Latin and digits:** Plus Jakarta Sans (400, 500, 600, 700).
**Gujarati:** Noto Sans Gujarati. **Hindi:** Noto Sans Devanagari. Same four weights.
`fontFamilyFor(language, weight)` in `tokens.ts` returns the right file. The `Text` primitive (Phase B) applies it from the active i18n language, so screens never pick fonts.

| Role | sp | Weight | Line height Latin / Indic | Use |
|---|---|---|---|---|
| `caption` (xs) | 12 | 600 | 1.4 / 1.6 | Badges, metadata |
| `label` (sm) | 14 | 600 | 1.4 / 1.6 | Field labels, helper text, chips |
| `body` (base) | 16 | 400 | 1.4 / 1.6 | Default text, inputs |
| `bodyLg` (md) | 18 | 600 | 1.4 / 1.6 | List titles, button text |
| `title` (lg) | 20 | 700 | 1.3 / 1.5 | Screen titles, sheet titles |
| `headline` (xl) | 24 | 700 | 1.3 / 1.5 | Section numbers |
| `display` | 32 | 700 | 1.2 / 1.4 | Big counts and amounts |

- Numbers (money, dates, measurements, order numbers) use tabular figures.
- Sizes are `sp` and scale with the OS. Layouts must keep working at 200%: no fixed heights on text containers, rows grow, text wraps (max 2 lines for titles with ellipsis, then the detail screen shows everything).
- Currency format is `₹1,23,456` (Indian grouping) via `lib/format.ts`.

---

## 4. Spacing, size and radius

- **Spacing scale:** 2, 4, 8, 12, 16, 24, 32, 48. Screen side padding 16. Gap between cards 12. Gap between sections 24.
- **Touch targets:** at least 48 × 48 dp (`min-h-touch`, `min-w-touch`). Visual icons can be smaller if the hit area is 48 (use `hitSlop`).
- **Radius (only 2, 3 or 4 px):**

| Value | Elements |
|---|---|
| 2px | Chips, badges, checkbox, thumbnails, sheet grab handle, progress bars |
| 3px | Inputs, dropdowns, avatars, segmented control, toggle, radio, list row press state |
| 4px | Buttons, cards, bottom sheets, dialogs, toasts, tab bar, images |
| `radius.dot` / `rounded-dot` | Status dots only (the one allowed circle) |

`rounded-full`, `radius.full` and large Tailwind radii resolve to 4px so legacy code stays compliant.

- **Borders:** 1px `border` on cards, inputs, buttons. 1px `borderSubtle` between rows. 2px `primary` for focus and selected input/card.
- **Elevation:** none. Sheets are separated from the screen by a scrim (50% `text` colour overlay) and a 1px top border.
- **Gradients:** none.

---

## 5. Motion and haptics

- Press feedback 150ms (background changes to `surfaceSubtle`, no scale).
- Sheets and screen transitions 200ms; expanding sections 250ms. Easing `cubic-bezier(.2,.8,.2,1)`.
- Honour reduce-motion: when the OS setting is on, replace movement with an instant change or a 100ms fade.
- Haptics (light) on: mark ready/delivered, save success, swipe commit, stepper. Medium on destructive confirmation. Never on scroll or on every key.

---

## 6. Icons

Tabler icons only, via `components/ui/Icon.tsx`. Stroke 1.75 at 20 or 24 px, `currentColor` from tokens. Icons beside text are decorative; icon-only buttons need an `accessibilityLabel`.

---

## 7. Components (built in Phase B in `src/components/ui/`; live demo in `screens/ComponentShowcaseScreen.tsx`)

Every interactive component supports: default, pressed, focused (2px primary ring), disabled (text and border at 40%, still readable at 3:1), loading, error, selected where it applies.

| Component | Spec |
|---|---|
| `Button` | Variants: primary (fill), secondary (surface + 1px border), tonal (primaryLight), danger (danger tint), ghost. Sizes: default 48 high, large 56 high (primary action bars). Radius 4. Loading replaces the label with a spinner and keeps width. |
| `IconButton` | 48 × 48 hit area, 40 × 40 visual, 1px border optional. Radius 4. |
| `InputField` | 48 high, radius 3, 1px border. Label above (14/600), helper or error text below (error has an icon). Prefix/suffix slots (`+91`, `₹`). Correct `keyboardType`, `returnKeyType`, `autoComplete` per field. Inline validation on blur, never while typing the first time. |
| `NumberStepper` | − value + with 48 high buttons; long-press repeats; supports 0.5 steps for measurements. |
| `Dropdown` / `Picker sheet` | Opens a sheet with search; recents first. |
| `SegmentedControl` | Radius 3 container, 4 → 3 selected segment fill `primaryLight` with 1px primary border. |
| `Chip` | 48 hit area, 36 visual, radius 2. Selected: primaryLight fill, primary border, check icon. |
| `Badge` | Radius 2, 12/600, icon + text (see §2.2). |
| `Card` | Surface, 1px border, radius 4, padding 16. Pressable cards use `surfaceSubtle` pressed state. |
| `ListRow` | Min 64 high, 16 padding, 1px bottom divider. Slots: leading (avatar/icon), title, subtitle, meta, trailing. |
| `SwipeRow` | Right swipe reveals the next-status action (Ready/Deliver, success/primary fill), left swipe reveals Call and WhatsApp. Commit at 40% with haptic. Undo toast for 5s. |
| `Avatar` | Initials on primaryLight, radius 3, sizes 32/40/56. |
| `Checkbox`, `Radio`, `Toggle` | 24 visual (radius 2 / 3 / 3), 48 hit area. Toggle is a 3px-radius track with a 3px-radius thumb. |
| `SearchBar` | 48 high, radius 3, search icon, clear button, optional mic. |
| `Sheet` | Radius 4 on top corners, grab handle 36 × 4 (radius 2), scrim, max height 90%, sticky action bar. |
| `Dialog` | Radius 4, used only for destructive confirmations. |
| `Toast` | Radius 4, bottom above tab bar, 4s, optional Undo button. Announced to screen readers. |
| `EmptyState` | Tabler icon, title, one line of help, one primary action. |
| `Skeleton` | `surfaceSubtle` blocks with radius 3, 150ms opacity pulse (static when reduce-motion). |
| `SyncChip` | In the header: synced (check), syncing (spinner), offline (cloud-off + "N pending"), error (alert). |
| `TabBar` | 4 tabs + centre Add, surface fill, 1px top border, labels always shown, 56 high plus inset. |
| `Text` | The only text primitive. Variants caption/label/body/bodyLg/title/headline/display, tones default/muted/faint/primary/success/warning/danger/onPrimary/inverse, `tabular`. Applies the per-language font and line height. |
| `Header` | Title 20/700, back button 48, up to two actions. Large title on tab roots. |

---

## 8. Screen layouts (target)

- **Home ("today")**: header (shop name, SyncChip, notifications) → search bar → four count cards (Late, Due today, Ready to give, To collect ₹) that open the filtered Orders list → "Do now" list of order rows with swipe actions → bottom: New order button.
- **Orders**: search → segmented control (Active · Late · Due · Ready · Done) → sort/filter sheet button → order rows grouped by due date (Late, Today, Tomorrow, Later). Row: order no. + customer, garment × qty, due-date cue, status badge, balance (red if > 0).
- **New order (one screen)**: Customer (recents, search, add) → Garment quick-pick chips (last used first) + quantity stepper → delivery chips (+3, +7, +10 days, last used preselected, date picker) → Total, Advance (suggested last rate shown as helper text only) → collapsed "More details" (photos, notes, book no., rush) → sticky Save bar with live balance.
- **Order detail**: header with order no. and status badge → customer row (call, WhatsApp) → progress stepper with one primary next-step button → items and photos → payments (Record payment sheet) → bill actions.
- **Customers**: search → recents → alphabetical list with balance badge. Detail: contact header with call/WhatsApp, pinned New order and Measure, balance card, tabs for Orders, Measurements, Bills.
- **Measurements**: garment tabs → numeric keypad, Enter moves to the next field, ± 0.5 stepper, previous value shown under each field → sticky Save.
- **More**: grouped lists (Shop, Staff and money, Measurements, App: language, theme, sync, sign out).
- **Auth / onboarding**: single-purpose screens, one primary button at the bottom, language picker visible on the first screen.

---

## 9. Accessibility

- Contrast: text ≥ 4.5:1, UI boundaries and icons ≥ 3:1 (checked in tests for text pairs).
- Touch targets ≥ 48 dp.
- Every icon-only button, swipe action and badge has an `accessibilityLabel` (translated). Swipe actions also exist as buttons in the row's long-press/overflow menu (TalkBack cannot swipe).
- Order of focus follows reading order; sheets trap focus and restore it on close.
- Works at 200% font scale and in Gujarati/Hindi (taller line height).
- Tab bar labels (five per row) are capped at 150% font scale so they never wrap or collide; every other text scales fully.
- Reduce-motion respected (see §5); stack, tab and sheet transitions switch off with it. Dark mode is a first-class theme, not an afterthought.

---

## 10. Internationalisation

All strings live in `locales/{en,gu,hi}/*.json` and must exist in all three languages (checked by the lint step once the locale script lands in Phase B). Never concatenate translated fragments; use interpolation. Allow 40% longer text in Gujarati and Hindi.

---

## 11. Checks

- `npm run typecheck`
- `npm run lint` runs ESLint, `scripts/check-design-rules.js` (radius, shadows, gradients, chart bar rounding, token sync), `scripts/check-locales.js` (gu/hi have every key en has) and `scripts/check-a11y.js` (every Pressable has a role, every TextInput and Image a label).
- `npm test` runs Jest (token contrast, radius tokens, font mapping, primitives, tab bar).
- The design-rules script keeps a `PENDING` list for known violations; it is empty as of Phase C and should stay empty.

---

## 12. States and performance

- **Loading:** skeleton rows/blocks that match the final layout (`Skeleton`, `SkeletonList`); a spinner only for short in-place waits. Lists keep showing old data while refreshing.
- **Empty:** `EmptyState` with an icon, one line of help and one action.
- **Error:** a failed first load shows `EmptyState` with "Could not load" and Retry (Orders, Clients); later failures show an error toast and keep the data on screen.
- **Offline / sync:** `SyncChip` on Home; Orders and Clients show it next to the count only when offline, uploading or failed (`SyncNotice`).
- **Lists:** FlatList/SectionList with memoised rows (`OrderRow`), the filter/sort/group pipeline in `lib/orderList.ts` (5,000 orders in ~10ms; guarded by `__tests__/orderList.test.ts`), one `Intl.Collator` for name sorting.
- **Dark mode:** every colour is a token or a theme class, so there is no per-screen dark styling to maintain; contrast of every text pair is asserted in tests for both palettes.
