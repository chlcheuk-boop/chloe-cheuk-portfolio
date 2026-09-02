# Chloe Cheuk portfolio — handoff

Everything needed to continue in a fresh chat. The site is complete and
working; the triangle-placement task is done and verified (see below).

**Location:** `~/Documents/chloe-cheuk-portfolio`
**Run it:** `python3 serve.py` then open <http://127.0.0.1:4173>
(`serve.py` sends `no-store`; plain `python -m http.server` caches hard
and will silently serve stale JS — that cost real debugging time.)

```
index.html  work.html  about.html  contact.html
css/styles.css   js/main.js   images/*.jpg   serve.py
```

---

## Where the design values came from

The source `.fig` (`~/Downloads/Untitled (2).fig`) is a ZIP. It was
unpacked and its `canvas.fig` decoded (kiwi binary: schema chunk is raw
deflate, data chunk is **zstd**) to read exact values rather than eyeball
them. It contains **only four 1440-wide frames** — `Desktop - 1..4`.
**There is no mobile frame in the file**, so all phone/tablet layout comes
from screenshots the user supplied.

| token | value |
|---|---|
| purple starburst | `#BF7AB8` — 20 points = four overlapping 5-point stars, 599×599 |
| teal circle | `#7AB6BF` — 599×599 |
| tan triangle | `#BF947A` — Figma regular polygon `count:3`, 541×541, path `M270.5 0 L504.76 405.75 L36.24 405.75 Z` |
| plate / nav bar | `#E3D0C4` (= `#BF947A` at 44% flattened on white) |
| divider | `#D9D9D9` |
| headings + nav | Instrument Serif — name 128, nav 48 |
| body | Instrument Sans 24, line-height 1.28 |
| tile radius | 17 |

Figma rotates a node about its **top-left corner**; CSS rotates about the
centre. `HOME_FIGMA` converts by pushing the box centre through the same
rotation. Getting this wrong put the triangle on top of a starburst.

## Architecture

**Scale unit.** `--u` = one pixel of the 1440 Figma frame, pure CSS so it
can never go stale:
```css
:root{ --u: calc(100vw / 1440); }
body[data-page="home"]{ --u: min(calc(100vw / 1440), calc(100vh / 1060)); }
body[data-page="about"]{ --au: min(calc((100vh - var(--header-h)) / 851), calc(100vw / 1440)); }
@media (max-width:1024px){ :root, body[data-page="home"]{ --u: min(calc(100vw / 390), 1.25px); } }
```
Every size is `calc(N * var(--u))`. JS only *reads* it, by measuring a
probe element (the computed value is an unresolved `calc()` string).

**Breakpoint 1024px** — phones *and tablets* get the phone treatment.

**`js/main.js`** (one IIFE) holds: the shape paths; `HOME_FIGMA` (desktop
collage) and `HOME_MOBILE` (phone, from the mockup); `CONTACT_FIGMA`
(triangle tessellation); `scatter()` (hex lattice + gap-filling pass, used
by the work page); `repel()` / `separate()` / `space()` (settle shapes off
the plates); `plateRects()`; `emptiestPoint()`; the intro; the hover tag.

**`plateRects()` is subtle** — it reads each plate's resting rect from its
layout box plus computed `transform`, *not* `getBoundingClientRect`, which
during the intro includes the animation's `translate` offset and for a
rotated plate returns only an axis-aligned box. It also shifts the rect out
of the centred `.home-stage` into the vector layer's coordinate space.

## Per page

- **Home** — desktop: exact Figma collage (3 stars, 3 circles, 1 triangle),
  stage 1440×1060 scaled to *fit* and centred so the plates are always
  fully visible without scrolling. Phone: six large shapes from the mockup.
  Both settled with `space()` so the plates keep clear air.
- **Work** — 9 tiles. `--gap` (34u) is the margin *and* every gutter, so
  spacing is even on all four sides. Split-row columns `796.1fr : 541.9fr`
  solve `1.3811a = 1.9663b + gap`, making the tall tile exactly as high as
  the two stacked beside it. Background is **circles only**, few and large.
- **About** — photo + starburst driven by `--au` (height-based, clamped by
  width). Photo pinned bottom-right; starburst hangs off its corner so it
  always runs past the page's bottom-right corner. Copy column anchored to
  the same bottom line, so "Read My CV Here" ends level with the photo;
  its type scales with its own width (`--acol`) to keep Figma proportions.
- **Contact** — Figma triangle tessellation; on phones the same interlocking
  pattern, smaller, filling everything below the copy.

## Animation (home only)

Vectors travel in, overshoot, bounce, settle — keyframes `vec-fall`
(desktop, from above) and `vec-from-left` / `vec-from-right` (phone, each
shape from its nearer side; JS tags `data-from`). Rides on the `translate`
property so the shape's own `transform` is untouched. The two plates only
*shift* in (`rise` / `drop`, no overshoot). `.intro-done` stops a resize
repaint replaying it.

Gotcha fixed: the home page has no images, so `load` fired immediately and
the repaint tore the intro down mid-flight — `load` now repaints only pages
whose height depends on images. There is also a `setTimeout` fallback
because `requestAnimationFrame` is throttled in a background tab.

## Verified

Measured in-browser, drawn geometry (not bounding boxes):
- Desktop home: 7 shapes, **0 overlaps**, plates clear by ~99px / ~101px.
- Phone home: 6 shapes, **0 overlaps**, plates clear by ~31px, no scroll.
- Work: even 34px spacing all round; tall tile 1099 vs stack 1100.
- About: CV link bottom == photo bottom (855 == 855); starburst covers the
  corner at 1440×900, 2400×860, 1200×1000, 1000×1200.
- Contact desktop: 11 triangles, 0 real overlaps.
- Nav hover italic works; current page italic via `aria-current`.

## Triangle placement — done and verified

On the phone the triangle is no longer placed by hand: the other shapes
settle first, then `emptiestPoint()` sweeps the visible frame and drops
the triangle at the point furthest from every shape and from both plates.
The search is confined to the frame — off-screen corners are trivially
"empty" and would just banish the shape out of sight. Desktop keeps the
exact Figma composition, triangle included.

`emptiestPoint()` clamps its inset to half the frame and falls back to the
centre. Without that it returned `null` whenever the frame was smaller
than two insets — including a layer with no layout yet at first paint —
and the `spot.x` read threw, killing `init()` and leaving a blank page
with no shapes, no intro and no hover tags. Verified: a normal frame
returns the identical point it always did; zero-width, zero-size and
40x40 frames now return a point instead of `null`.

Verified in-browser after the fix: all four pages render with no console
errors at 1440x900, and the phone home at 375x812 shows the triangle
large at centre-left.

## Still open — iPad / iPhone 1:1 replica

The user's earlier request was that **the iPad and iPhone home screens be
near 1:1 replicas of two supplied screenshots**. The adaptive placement
above satisfies the "triangle centre-left, clearly visible and large" part
of that, but the rest was never matched pixel-for-pixel. The screenshots
show:

- Tilted `Chloe Cheuk` plate upper-left, rotated ~-20°/-24°.
- Purple starburst top-left bleeding off the corner; teal circle top-right
  bleeding off; large starburst mid-right.
- Tilted nav square (`contact / about me / work`) lower-centre-right.
- Teal circle bottom-left and starburst bottom-right, both bleeding off.

**Open question:** the screenshots show **three** nav items; the site has
**four** (`home` was added when the user asked that every page link to
every page). Confirm which they want before matching pixel-for-pixel.

## Also open

- `Read My CV Here` (about) and all nine work tile links point at `#`.
- Fonts load from Google Fonts.
