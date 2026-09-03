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
  width), except the photo's RIGHT inset, which is `68 * var(--u)` so its
  edge lands on the header nav plate's. Both are "68", but in different
  units — using `--au` there put the photo 14px past the header. Photo pinned bottom-right; starburst hangs off its corner so it
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

## The work page has no background

The circles are gone from the work page — they never sat well against the
tiles across window sizes. `work.html` carries no `.vectors` layer at all,
so `paintVectors` returns at its first line there.

`scatter()` and `mulberry32()` went with them: the work page was their only
caller, so both were dead once the circles were dropped, together with the
header keep-out rect that had been added to hold circles off the wordmark.
That is about 140 lines. All of it is in the history if the pattern is ever
wanted back — the lattice, the gap-filling sweep and the tuning notes are
in the commit that removed it.

`.vectors` still carries the home collage and the contact tessellation, and
about keeps an empty layer (its starburst lives in the markup).

## Project page spacing

Every gap in the title -> copy -> image rhythm comes from one token,
`--vstep` (32u desktop, 18u on a phone), and each gap is a margin on the
element above it and nothing else. Measured on all four page shapes at 1440
and 390, every gap on a page resolves to exactly one value.

Two things had made it uneven:

- The stacked intro was a grid, so its **row gap stacked on top of the
  title's own margin** — title -> copy came out 70u there against 30u on the
  split pages. Only the split intro is a grid now, and only for its columns.
- `.project figure{margin:0}` sat *after* `.project-copy figure`, and at
  equal specificity the later rule wins, so the small poster in mfah's copy
  column had **no top margin at all** and sat flush against the text. The
  reset is hoisted above it now. Watch for this if another figure rule is
  added — put it after the reset, or it silently loses.

## opencall is a stacked page

Its title and copy run full width above the work, like bloodondot, and the
two posters sit side by side in one `cols-2` row instead of one beside the
copy and one in a section below. They come out 504x652 each, together
spanning the content column exactly, 200u to 1240u.

## The split heroes sit at the right margin

Where the height cap bites, a picture is narrower than its box. Every image
is pulled to the left of its box except the hero beside the copy on a split
page, which is pulled to the RIGHT: its column ends at the page's own inset,
so this lines the hero's right edge up with the full-width images below it —
200u on both, measured on cla, jsa, mfah and opencall. The slack falls
between the copy and the hero, where it reads as the gutter.

Scaling the hero up to fill its column instead was not an option: these are
portraits, and at full column width they run taller than the window, which
is what the height cap exists to prevent.

mfah's square post used to sit in the copy column, bottom-aligned with the
poster. It has its own **Post Version** section now, so the flex column and
`align-items:stretch` that made that alignment work are gone — nothing else
ever put a figure in the copy column.

## How wide the work pages run

Both the work grid and the project columns are 1040u of the 1440u page,
with 200u down each side, so the images run narrower and leave air on both
edges. Tiles and images also drop 96u below the header rather than sitting
right under it.

**The work grid is scaled, not just inset.** `--k` (0.758) multiplies the
grid's width *and* its `--gap` together. The split row's column ratios
(796.1fr : 541.9fr) were solved against the ratio of gap to row width, so
narrowing the row while holding the gap fixed would stop the tall tile
lining up with the two stacked beside it — about 8u out. Scaling both keeps
it exact: measured 833.4 against 833.4 at 1440x845.

## The contact page's one gap

The heading and the list are **one group**, keeping the frame's own 26u
between them, and that group sits centred between the foot of "Chloe Cheuk"
and the top of the triangles.

**Centred by ink, not by boxes.** A box edge is not where the letters are:
the line box adds half leading at both ends, and inside the em the ascent
and descent are only partly used. "Chloe Cheuk" has no descender, so its
box runs 38px past the last letter, and the heading's box starts 12px above
its capitals — 50px of invisible air above the group. "Instagram" has a g,
so its box stops 1.7px short. Equal box gaps therefore looked badly
lopsided, about 93px above against 45px below, which is what the user saw.
`inkSlack()` measures that slack off canvas font metrics and the solve
balances the ink instead. Measured equal to the eye at 1440x845 (93/93),
1512x845 (82/82) and 1920x1080 (107/107); the box gaps behind those are 43
against 91, 30 against 81, and 41 against 105.

The metrics are the fallback font's until the webfont lands, so contact
repaints on `document.fonts.ready`. Only contact — repainting home there
would tear down the intro mid-flight.

Making the heading-to-list gap match the outer ones was an earlier attempt
and it read wrong: it spread the group out instead of moving it.

**The gap cannot be set independently of the band.** The band's margin falls
out of its own geometry and depends on the room left under the copy, which
depends on the gap — so writing a gap into the CSS and reading the margin
back would need iterating to a fixed point. `contactRhythm()` solves both at
once instead: asking for the band's equal margin to equal the gap rearranges
to

    S = [ (n-g)(Ph - K) - A*W - 2*delta*D ] / [ 3(n-g) - 2A ]

with `A = r(1 - 2g/3)`, `D = n - g - A`, and `delta` the difference in ink
slack above and below the group; the band's margin is then `S + delta`.

with n only deciding how big the triangles come out. JS writes S into
`--cgap`, and `--cwm` carries the wordmark's overhang below the header box,
which the heading's padding has to make up before the gap starts.

**K is measured, not summed.** It is where the group's foot would sit with
no air above it, taken by subtracting the gap currently above the heading
from the list's foot. The group's own internal spacing stays inside K, which
is what keeps it a group. Adding up the wordmark, heading and list heights
instead missed the trailing margin inside the list and left the band's
bottom margin at 125u against 44u everywhere else.

Mobile is untouched: it overrides both gaps and keeps its own multi-band
pattern from `triangleBands()`.

## Capping tall images

The brief is that a whole image should be visible without scrolling, so
`--imgmax` is a share of the window, not of the page.

**95vh, not 80.** At full column width the landscape boards come to 92-95%
of an 845px window — 780u for the Blood on Dot board, 803u for the pain
cube and the glitched boards — so a tighter cap was shrinking them off the
right margin for nothing, since they fit the screen either way. Portraits
are still capped and always will be: at column width the CLA branding board
runs 173% of the window and the opencall poster 159%. `.project
img` is `width:100%; max-height:var(--imgmax)` with `object-fit:contain`
and `object-position:left top`, so the box takes its column but is never
taller than the cap, and the picture letterboxes inside it at its own
aspect ratio, left-aligned.

**The box must keep `width:100%`.** Sizing it to the picture with
`width:auto` was tried and it broke lazy loading: an image that has not
loaded has no definite width to size from, so every one collapsed to 0x0,
reserved no space, and the page had no height. With `width:100%` the
width/height attributes give the box its ratio up front — measured 325x578
reserved per JSA story graphic before any had loaded. Only the horizontal
remainder is dead space, and it is white, so it looks the same either way.

Nothing is exempt any more. The hero beside the copy used to be, to hold
its frame's column exactly, but that let opencall's run 885px tall in an
845px window.

Note this trades against the equal-width rule below: a stacked portrait no
longer fills the same width as a stacked landscape, and a capped image
leaves space to its right. Deliberate, and it mostly bites on desktop —
at phone widths the column is narrow enough that little reaches the cap.

## Image rows and stacking

`.img-row` is a grid of `repeat(var(--cols), minmax(0,1fr))`, so every cell
is an equal fraction and every image fills its cell — the images share a
width whatever their proportions, and `height:auto` keeps each one's
aspect ratio. `minmax(0,1fr)` rather than `1fr` matters: `1fr` is
`minmax(auto,1fr)` and a wide image would refuse to shrink below its
intrinsic width and overflow the row.

Rows stack only at the site's own 1024 breakpoint. A three-up row used to
collapse at 1200 as well, but the only one is the JSA Instagram stories,
which should read as a set across the row at any desktop width. Verified at
1440, 1200, 1100 and 1025 (three columns, one row, equal widths) and at
1000 and 390 (stacked), with aspect ratios holding and no page overflowing
horizontally.
Note this is deliberate per the request: a stacked portrait image fills the
full column width, so the 396x704 JSA story graphics get tall on a phone.

## Home: one scale, covering, anchored to the bottom

`--u` on the home page is `max(100vw/1440, 100vh/1060)` — cover — and the
plates and the shapes both ride on it. **They must share a scale.** The
shapes are placed *against* the plates, so an earlier attempt to fit the
plates and cover the shapes left the plates looking small and stranded
among oversized shapes, which is what the user flagged from a screenshot.

The frame is then taller than a wide window, and `.home-stage` is anchored
`bottom: 48px` rather than centred, because the design's content sits low
in the frame: the name plate ends 15u above the frame's bottom edge while
the top of the frame is mostly shapes bleeding off. Centring the overflow
cropped the name plate; cropping the empty top instead keeps it, and the
48px holds it off the window's edge. Measured 60-75px of clearance from
1100x700 up to 2560x1440.

`paintVectors` reads the frame origin off `.home-stage` rather than
centring its own copy — with the stage bottom-anchored, shapes centred
independently would sit in a different frame from the plates.

**Known edge cases, both inherent to covering.** At about 2.8:1 and wider
(2560x900) the nav plate's top corner goes 157px off the top; at 1.25:1 and
narrower (1280x1024) the name plate's right corner clips by 27px, which is
padding rather than text. Everything from 1100x700 through 1920x1080 and
2560x1440 is clean, with no white band on any edge and no scrolling.

Approaches tried and rejected before this, all measured:

- **Fit everything** (the original): white bands down the sides, ~180px
  each on a 14in MacBook.
- **Cover everything, centred**: the name plate lost 61% of itself at
  1440x900 and all of it at 2560x900.
- **Fit the plates, cover the shapes via two units**: the plates no longer
  sat where the shapes' frame expected them and `space()` pushed six of the
  seven shapes off the top.
- **Fit everything, then scale the finished vector layer to cover**: kept
  the plates safe and killed the white bands, but the shapes ran 1.3-2.3x
  the plates and the composition read wrong.

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

## The software line

Each project page carries a `.project-software` line under its title,
listing what the work was made in. It sits in the same `--vstep` rhythm as
everything else — one step under the title, one above the copy — so it
slots in without disturbing the even spacing (measured 32 desktop, 18
phone, on every page).

Seven of the nine came out of `~/Desktop/portfolio pdf version (2).pdf` and
its predecessor; the user gave CAMH (Adobe Illustrator) and the pain cube
(Blender, Figma, Adobe Illustrator, Adobe Photoshop) directly, as neither
is in the PDF.

**Reading that PDF:** raw stream extraction returns gibberish because the
fonts are subset with custom encodings, and the file is too large for the
Read tool. `scratchpad/pdftext.swift` — twenty lines of PDFKit, built with
`swiftc` — dumps the text per page correctly. Reach for that first next
time. Note the PDF's own text has letter-spacing artefacts ("Sof tware Us e
d", "Swif t"), so it needs reading rather than pasting.

**The line is Instrument Sans** (`var(--sans)`), the site's own sans, which
keeps it distinct from the serif titles.

## Link preview

Every page carries Open Graph and Twitter card tags, all pointing at
`images/preview.png` — the home page after its intro has settled, rendered
at 2400x1260 (2x of the 1200x630 card) with

    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
      --headless=new --window-size=1200,630 --force-device-scale-factor=2 \
      --virtual-time-budget=8000 --screenshot=preview.png \
      http://127.0.0.1:4173/index.html

`--virtual-time-budget` is what lets the intro run to its resting state
before the shot; without it the shapes are caught mid-flight. Re-run it if
the home composition changes.

**The URLs are absolute and hardcoded**, because a relative `og:image` is
ignored outright by every scraper. They currently read

    https://chlcheuk-boop.github.io/chloe-cheuk-portfolio

which is the GitHub Pages default for this repo. **Pages was not enabled
when this was written** — the API and the .github.io URL both 404 — so the
preview cannot resolve until it is turned on, or until the URLs are pointed
at wherever the site actually lives:

    grep -rl chlcheuk-boop.github.io *.html | xargs sed -i '' 's|https://chlcheuk-boop.github.io/chloe-cheuk-portfolio|https://YOUR-DOMAIN|g'

LinkedIn caches a preview per URL for around a week; its Post Inspector
(linkedin.com/post-inspector) forces a re-scrape after a change.

## Also open

- Fonts load from Google Fonts.
- `Read My CV Here` points at the CV on Google Drive. That link only works
  for visitors if the file's sharing is set to "anyone with the link".
