# Pendulum experiment — plan

## Model (ground truth, never shown to the student)

Inextensible taut string, point bob, no small-angle approximation:

    θ'' = -(g/L)·sin θ

- Velocity Verlet, fixed dt = 1/500 s, accumulator driven by wall-clock
  time so the period never depends on frame rate.
- Undamped, or light enough that ten swings cost under 0.5% of amplitude.
- A string only pulls: taut to 90°, slack beyond. Cap release at 85°.
  Do not raise this cap — the model is wrong above 90°.
- g, L and bob radius are constants the student never sees.

**Equation 4 (the amplitude series) must NOT appear in the code.**
T = T₀(1 + α·sin²(φ₀/2) + β·sin⁴(φ₀/2) + …) is what the student is
discovering. Computing it would make the experiment circular.

## Verification (do this before any UI)

Check the integrator against the exact period:

    T = T₀ / AGM(1, cos(φ₀/2))

AGM = arithmetic-geometric mean; iterate a←(a+b)/2, b←√(ab) five times.
Compare simulated vs exact across 5°–85°. True values: α = 1/4, β = 9/64.

## Observation layer

Readings pass through instruments that quantize and perturb. Noise is
drawn once per TRIAL from a session-seeded PRNG, never per frame.

| Instrument | Resolution | Error |
|---|---|---|
| Stopwatch | 0.01 s | student's own reaction time — do not synthesise |
| Photogate | 1 ms | none; triggers twice per period |
| Ruler | 1 mm | fixed session zero offset; reads to string end, not bob centre |
| Angle plate | 1° | fixed session offset of the printed scale from true vertical |

Systematics are placed deliberately:
- Length and stopwatch errors hit Part A, cancel in Part B (α, β are
  ratios of T to T₀).
- Angle plate offset is harmless in Part A, bites Part B via sin²(φ₀/2).
- Bob-centre length error falls out of the ruler geometry for free.

## Part A — measure g

Small amplitude, vary length, time many oscillations, repeat.
Linearise T² vs L; gradient gives g. Reaction-time limited, so the
lesson is repeats and averaging. Ruler offset and bob radius both
appear in the intercept.

## Part B — the amplitude series

Fix length, vary release angle. Below ~30° for T₀ and α; 30°–85° for β.

The stopwatch cannot resolve this — at 60° the β term is 0.9% of the
period, under reaction-time scatter. Switching to the photogate is the
intended discovery. The guide prompts them to check precision against
the size of the effect before collecting data; it must not name the
instrument. The 85° cap keeps them out of the range where the truncated
series fails.

## Page structure

Mobile-first: tabs (problem / table / lab / plot) that expand into a
draggable split on desktop. Build the tab version first.

- Left: problem statement, thin guide, student-built table with
  free-typed columns, answer box reporting percentage error without
  revealing the true value.
- Right: the pendulum, an instrument menu, the plot.

Instruments are global components; each experiment declares what they
can couple to. The thermometer opens and reads room temperature.

## The plot is deliberately manual

No auto-fit, no computed gradient, no auto-scaling. The student chooses
axis ranges, drags two fit lines (steepest and shallowest, so gradient
uncertainty falls out), and reads the gradient off the line. Click
anywhere to read coordinates. This mirrors what graph paper forces and
what the exam marks.

## Build order

1. Model + AGM verification — a script printing simulated vs exact.
2. Stopwatch + table — Part A end to end.
3. Plot with draggable lines.
4. Photogate + angle plate — Part B.

Part A working completely beats both parts half-built.
