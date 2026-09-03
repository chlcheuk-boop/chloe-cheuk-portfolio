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

## Desktop tidy-up (contact, about, home)

**Contact** — the desktop tessellation is gone; `triangleBand()` builds one
interlocking band under the copy instead. Equal margin on all four sides,
one shared bottom line for the upright triangles and one shared top line
for the inverted ones, every triangle the same size. See the README for
the sizing solve. `CONTACT_FIGMA` was deleted with it.

**About** — the photo and the copy column now span one band centred in the
space under the header, so four gaps are equal: header to "Who I am",
header to the top of the photo, "Read My CV Here" to the bottom of the
page, and the foot of the photo to the bottom of the page. Measured at
1440x900: all four are 50.4px, and the column shares the photo's top
(223.4) and bottom (849.6) lines exactly.

**Home** — the desktop triangle sits 45u left and 45u down from where the
settle leaves it (`HOME_TRI_NUDGE`). The repel off the name plate, not the
Figma origin, is what fixes that shape's resting place — it moves it from
(688.8, 484.8) to (791.5, 262.8) — so moving the origin would just be
undone; the nudge is applied after the settle instead. Checked on drawn
geometry, not bounding boxes: 92.9u clear of the nearest plate and 73.5u
of the nearest shape, no overlaps. (A rotated triangle's bounding box is
614x620 against a 468x406 drawing, so a box test reports false contacts.)

Home scaling itself needed no change: it already scales
proportionally, and this was verified rather than assumed. Both the text
and the vectors are sized in `--u`, and every frame-relative position is
constant. Measured at 1440x900, 1200x1000, 1920x1080 and 1600x760 (aspect
1.20 to 2.11, `--u` from 0.717 to 1.019), each shape's centre as a
fraction of the 1440x1060 frame held to within 0.0006, and the settled
plates sat at the same frame coordinates (name 662, nav 492.3) every time.

Worth knowing for any future attempt: `space()` / `repel()` / `separate()`
use only distances *between* shapes and plates, so they are translation
invariant — settling in frame coordinates and settling in viewport
coordinates give bit-identical results. An A/B of the two at the same
window confirmed it. What does change with the window is how much of the
composition the window crops: `--u` scales to *fit*, so on a window wider
than 1440:1060 the shapes meant to bleed off the edge sit inside white
margins instead. If the home page still looks wrong, that framing is the
thing to change, not the placement maths.

## Project pages

Nine pages, `work-<slug>.html`, one per work tile, built from `Desktop - 6`
and `8..15` of `~/Downloads/Untitled (4).fig`. Every tile on the work page
now links to its own page instead of `#`.

**Getting them out of the .fig.** Same trick as the first file — it is a
ZIP whose `canvas.fig` is kiwi binary (schema chunk raw deflate, data chunk
zstd). `scratchpad/figdec.py` decodes it to JSON; the decoder walks the
node tree, accumulates each node's transform up to its root frame, and
sorts by y then x to recover reading order. Two things made this easy:
image fills carry a human `name` ("cla branding", "designclubpost-14"), and
grouping images whose y agree within 40u recovers the rows exactly.

Watch out for **stacked duplicates**: `Desktop - 8` has CLA images sitting
underneath the JSA ones at identical coordinates. The extractor keeps the
last node at each position, which is the one drawn on top.

**Images.** 48 of the file's 98 images are used. They came out at up to
4096px and 75MB total, so they are resampled to 2000px max and JPEG q82 —
19MB, 0.6-4.1MB per page, all `loading="lazy"`. Originals are in the
scratchpad if a bigger export is ever wanted.

**Two intro shapes**, taken from the frames: copy beside a portrait hero
(cla, jsa, design-club, mfah, opencall) or copy above a full-width hero
(the two sebios, bloodondot, glitched). Each split page carries its own
column ratio from its frame in `--split`. `.project` has 96u of top
padding so the title lands on the frame's own 269 line.

## Image rows and stacking

`.img-row` is a grid of `repeat(var(--cols), minmax(0,1fr))`, so every cell
is an equal fraction and every image fills its cell — the images share a
width whatever their proportions, and `height:auto` keeps each one's
aspect ratio. `minmax(0,1fr)` rather than `1fr` matters: `1fr` is
`minmax(auto,1fr)` and a wide image would refuse to shrink below its
intrinsic width and overflow the row.

A three-up row runs out of room before a two-up, so it collapses first, at
1200px; below the site's own 1024 breakpoint every row is stacked. Verified
by measuring in an iframe at 1440, 1200, 1100, 1000, 768 and 390: columns
go 3->1 and 2->2->1 as expected, every row reports one distinct width, every
image holds its aspect ratio to within 2%, and no page overflows
horizontally.

Note this is deliberate per the request: a stacked portrait image fills the
full column width, so the 396x704 JSA story graphics get tall on a phone.

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
