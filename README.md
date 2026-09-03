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
| work | none — the tiles sit on white | none |
| about | one starburst, on the photo's bottom-right corner | same |
| contact | one interlocking band under the copy, even margins all round | same interlocking pattern, smaller, filling everything below the copy |

Every placement is now a fixed composition rather than a generated one:
the home collage and the contact band both come from the Figma frames. The
generated scatter that used to draw the work page's circles is gone with
them.

Shapes still settle against keep-out rectangles — on the home screen the
name and nav plates, tested as true rotated rectangles rather than bounding
boxes, padded by the same gap used between shapes so the spacing reads
evenly across shapes *and* rectangles.

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

## Filling the white space

On the phone the triangle isn't placed by hand: `emptiestPoint()` sweeps
the visible frame after the other shapes have settled and drops it at the
point furthest from every shape and from both plates, so it lands in
whatever gap the composition leaves. The search is confined to the
visible frame — off-screen corners are trivially "empty" and would just
banish the shape out of sight.

The desktop home keeps the exact Figma composition, triangle included;
only the plate spacing is adjusted there.

## The contact band

The desktop contact page is one interlocking band: n upright triangles
whose bases share a bottom line, and n-1 inverted ones whose bases share a
top line, nested in the gaps. Every triangle is the same size.

They are laid out on a perfect tessellation of pitch `w` and then shrunk
by `SHRINK` about their own centroids, which opens an even white gutter
everywhere without moving either alignment line — the 541 box is built so
the drawn centroid *is* the box centre, so the shrink is just a smaller
box at the same point. Note the drawn triangle is 468.52 x 405.75 inside
that 541 box, so the tessellation works from the drawing, not the box.

Sizing gives the same gap on all four sides. After the shrink the band
draws `w(n - g)` wide and `r*w(1 - 2g/3)` tall, so

    W - w(n - g)  ==  Hr - r*w(1 - 2g/3)

fixes `w` for a given n — and it holds for *every* n, so the margin comes
out equal all round whatever count is chosen. n only decides how big the
triangles are: fewer means larger, and a larger band leaves a smaller
margin. The code takes the fewest that still keeps a 40u margin, which
holds the triangles near their Figma size instead of letting a wide,
shallow window shave the band into a sawtooth strip of small ones.

Measured at 1440x900: 5 upright and 4 inverted, every one 249u wide, the
four margins all 54.3u, one bottom line and one top line.

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

The photo and the copy column both span one band, centred in the space
under the header, so the gap from the header down to "Who I am" and to the
top of the photo is the same as the gap from "Read My CV Here" and the
foot of the photo down to the bottom of the page — four equal gaps. The
column is a flex column with the CV link pushed to its foot, which keeps
that link exactly level with the bottom of the photo. Its type and spacing
are a fixed fraction of its own width (`--acol`) so the block keeps the
Figma proportions and always fits. The starburst hangs off the photo's
corner by a fixed ratio, so it always runs past the page's bottom-right
corner.

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

## The work page has no background

The circles were removed: they never sat well against the tiles across
window sizes. `work.html` has no `.vectors` layer, and `scatter()` — the
hex-lattice-plus-gap-filling placer that drew them — went with it, since
the work page was its only caller.

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

The photo and the copy column both span one band, centred in the space
under the header, so the gap from the header down to "Who I am" and to the
top of the photo is the same as the gap from "Read My CV Here" and the
foot of the photo down to the bottom of the page — four equal gaps. The
column is a flex column with the CV link pushed to its foot, which keeps
that link exactly level with the bottom of the photo. Its type and spacing
are a fixed fraction of its own width (`--acol`) so the block keeps the
Figma proportions and always fits. The starburst hangs off the photo's
corner by a fixed ratio, so it always runs past the page's bottom-right
corner.

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

## The work page background

Circles only, sized just under half the page wide and spread so roughly
one lands every two-and-a-bit page widths of scroll — most running off an
edge, a few sitting whole in the middle.

Two of `scatter()`'s options are set here rather than left to their
defaults, both for the same reason: at this size the page is only about
one cell wide, so anything that widens the lattice starves it of candidate
points.

- **`cell` (850) is deliberately below `big + gap`.** Letting it default
  skipped whole rows and left a 1754u band of page with nothing in it. A
  tighter lattice offers more places to try while `gap` still keeps the
  circles apart, which evens out the rhythm — the largest vertical gap
  drops to 855u.
- **`bleed` (220) is fixed rather than scaled off the cell.** The default
  grows with the cell, and at this spacing it pushed the lattice so far
  off-frame that no circle landed whole inside the page at all.

Measured at 1440 wide: 11 circles, 605u across, 5 of them fully inside the
page, largest vertical gap 855u.

## Work page spacing

`--gap` (34u) is the margin round the grid *and* the space between every
tile, so the spacing is even on all four sides. The split row's columns
are `796.1fr : 541.9fr`, solved so that `1.3811a = 1.9663b + gap` — the
tall tile ends up exactly as high as the two square ones plus the gap
between them.

## Still to fill in

- `Read My CV Here` (about) and every work tile link point at `#`.
