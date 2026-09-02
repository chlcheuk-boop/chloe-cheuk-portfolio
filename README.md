# Chloe Cheuk — portfolio

Static site. No build step: open `index.html`, or serve the folder
(`python3 -m http.server`).

```
index.html      home      work.html   work
about.html      about me  contact.html contact
css/styles.css  js/main.js  images/
```

## Design tokens (read out of the Figma file, not eyeballed)

| token | value | where |
|---|---|---|
| purple starburst | `#BF7AB8` | 20-point star (4 overlapping 5-point stars) |
| teal circle | `#7AB6BF` | 599 × 599 |
| tan triangle | `#BF947A` | Figma regular polygon, `count: 3`, 541 × 541 |
| plate / nav bar | `#E3D0C4` | `#BF947A` at 44 % over white, flattened |
| divider | `#D9D9D9` | |
| headings + nav | Instrument Serif, 128 px name / 48 px nav | |
| body | Instrument Sans 24 px, leading 1.28 | |
| tile corner radius | 17 | |

## Scaling

`--u` is one pixel of the 1440-wide Figma frame:

```css
--u: calc(100vw / 1440);
```

Every size and offset is `calc(N * var(--u))`, so the whole design grows on
larger screens and shrinks on smaller ones with all spacing ratios intact.
The work grid additionally uses `fr` columns, percentage gaps and
`aspect-ratio`, so tiles stay exact fractions of the real content width.

Mobile (≤ 899 px) switches `--u` to a 390-wide phone frame, capped at
1.25 px so tablet-width windows don't balloon the type.

## Layout source

Positions come straight from the Figma frames — e.g. the work grid is
`34` left margin, `1372` content, `59` row gap; CLA is `803 × 1109` at
`(34, 232)`; the nav plate is `678 × 103` at `(694, 70)`. The rotated home
elements reproduce the Figma matrices (`18.74°` name, `-40.70°` nav,
`48.63°` triangle).

## Features

1. Current page is italicised in the nav (`aria-current="page"`).
2. Instrument Serif headings / Instrument Sans body.
3. Proportional scaling — see above.
4. Mobile: nav bar at the top, name directly below, vectors smaller.
5. Home intro: vectors drop into place (staggered), the name rises and the
   nav drops in. Respects `prefers-reduced-motion`.
6. Work tiles show a rounded caption below-right of the cursor
   (`data-project` / `data-roles` in `work.html`).
7. Work tiles scale to 1.022 on hover.

## Vector placement

| page | desktop | mobile |
|---|---|---|
| home | the exact Figma collage (3 starbursts, 3 circles, 1 triangle) | six large shapes from the mockup, one off each edge |
| work | circles only — fewer and much larger (958 wide at 1440) | circles only |
| about | one starburst, on the photo's bottom-right corner | same |
| contact | the Figma triangle tessellation | same interlocking pattern, smaller, filling everything below the copy |

`scatter()` in `js/main.js` lays shapes out in two passes:

1. **An even hexagonal lattice** — cell = one shape plus its gap, every
   other row offset half a cell, each centre nudged off the lattice by
   `jitter` (a small fraction of a cell) so it reads hand-placed rather
   than gridded.
2. **A gap-filling sweep** at half-cell steps that drops a shape into any
   hole the lattice left. The spacing tests still apply, so anything it
   adds is a full gap from its neighbours — it removes empty patches
   without crowding.

Throughout, no two shapes overlap, no two of the same kind are
neighbours (skipped when a page uses one kind, as work does), and
keep-out rectangles stay clear — on the home screen the name and nav
plates, tested as true rotated rectangles rather than bounding boxes,
padded by the same gap used between shapes so the spacing reads evenly
across shapes *and* rectangles. The lattice starts far enough off-frame
that solid shape bodies, not just spike tips, run over every edge.

Figma rotates a node about its top-left corner, so `HOME_FIGMA` converts
each box origin to a true centre by pushing the box centre through the
same rotation. Each shape keeps its own colour throughout: purple
starburst, teal circle, tan triangle.

## Giving the plates room

`space()` in `js/main.js` takes the fixed home layouts and settles them
against two rules that pull in opposite directions:

- `repel()` pushes each shape straight away from the name and nav plates
  until it clears them by a set margin;
- `separate()` pushes any two shapes apart that repel has nudged together.

Applying each once leaves the other unsatisfied, so they alternate until
they settle. `plateRects()` reads each plate's true resting rectangle from
its layout box plus its computed `transform` — not `getBoundingClientRect`,
which during the intro would include the animation's `translate` offset,
and for a rotated plate would only give an axis-aligned box. The rects are
shifted out of the centred stage into the vector layer's own coordinate
space before comparing.

Measured on the finished layouts (drawn geometry, not bounding boxes):
desktop clears the plates by ~99px and ~101px, the phone by ~31px, with no
shape overlapping another on either.

## Home always fits

The home screen is a fixed composition — 1440 x 1060 on desktop,
390 x 780 on a phone — scaled to *fit* the window and centred:

```css
body[data-page="home"]{ --u: min(calc(100vw / 1440), calc(100vh / 1060)); }
```

so the name and nav plates are always fully visible, never scrolled. Both
plates wrap their own text, so they size themselves to however many nav
links they hold. On a phone they keep the same rotated-rectangle
treatment as the desktop composition.

## The about page

The photograph and starburst are driven by `--au`, taken from the
available height but never wider than the Figma frame allows:

```css
--au: min(calc((100vh - var(--header-h)) / 851), calc(100vw / 1440));
```

The photo is pinned to the bottom-right and the starburst hangs off its
corner by a fixed ratio, so the starburst always runs past the page's
bottom-right corner. The copy column is anchored to the same bottom line,
which puts the foot of "Read My CV Here" exactly level with the foot of
the photo, and its type and spacing are a fixed fraction of its own width
(`--acol`) so the block keeps the Figma proportions and always fits.

On a phone the column stacks, and the gap under "Chloe Cheuk" matches the
gap between "Read My CV Here" and the photograph.

## Animation

Each home vector travels in, overshoots its mark, bounces back and
settles — driven by keyframes (`vec-fall`, `vec-from-left`,
`vec-from-right`) that ride on the `translate` property, so the element's
own `transform` (its Figma position and rotation) is untouched.

- **Desktop** — they fall from above.
- **Phone** — each slides in from whichever side it sits nearer to; JS
  tags every shape `data-from="left|right"` and CSS picks the matching
  keyframes.

The two plates only *shift* into place — no bounce: the name rises, the
nav drops, both on a plain ease-out.
Once it has played, `.intro-done` disables the animation so a resize
repaint can't replay it. Honours `prefers-reduced-motion`, and falls back
to a timeout if `requestAnimationFrame` is throttled (background tab).

Note: the home page has no images, so `load` fires almost immediately —
repainting the vectors there would tear the intro down mid-flight, so
only pages whose height depends on images get that second pass.

## Breakpoint

Phones **and tablets** (≤ 1024px) get the phone treatment throughout,
including the tilted-plate home composition.

## Work page spacing

`--gap` (34u) is the margin round the grid *and* the space between every
tile, so the spacing is even on all four sides. The split row's columns
are `796.1fr : 541.9fr`, solved so that `1.3811a = 1.9663b + gap` — the
tall tile ends up exactly as high as the two square ones plus the gap
between them.

## Still to fill in

- `Read My CV Here` (about) and every work tile link point at `#`.
