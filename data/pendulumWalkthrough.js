// The pendulum's GUIDED walkthrough: a tutorial through one way of doing
// Part A, from the bench to six lengths in the table. Part A only — Part B
// has no walkthrough and no offer, so a student who finished Part A guided
// carries it to a different deliverable unaided. That is the point.
//
// It never tells the student how many oscillations to time: step 8's answer
// uses twenty only to illustrate the arithmetic, and says the choice is
// theirs. Where a step turns on an idea rather than a
// control, it asks first: `q` is shown, and `a` sits behind a disclosure
// (GuideQ) for the student to open once they've formed a guess — never
// printed alongside the question.
//
// `target` names what the mark points at (resolved to an element or a
// canvas point in PendulumLab.js). `advance` names the condition that moves
// the walkthrough on (evaluated in PendulumWalkthrough.js from bench and
// table state that already exists), or 'next' for a NEXT button. `pane` is
// the narrow-screen tab the target lives in. Ending the last step returns
// to SELF.

// The part the walkthrough belongs to (a part `key` in data/pendulumGuide.js).
export const pendulumWalkthroughPart = 'parta';

export const pendulumWalkthrough = [
  {
    target: 'bench',
    pane: 'sim',
    advance: 'next',
    text: 'This walks you through one way of doing Part A, one step at a time. Part B has no walkthrough — that one is yours. You can switch to SELF at any point.',
  },
  {
    target: 'instruments',
    pane: 'sim',
    advance: 'scaleOn',
    text: 'Bring the SCALE to the bench. Anything in this row can be added or removed at any time.',
  },
  {
    target: 'length',
    pane: 'sim',
    advance: 'lengthChanged',
    text: 'Set a length with this slider. The bench doesn’t show you the number — you read it off the scale.',
  },
  {
    target: 'scale',
    pane: 'sim',
    advance: 'lensUsed',
    text: 'Press and hold on the scale to magnify it. The scale is divided in millimetres.',
  },
  {
    target: 'bob',
    pane: 'sim',
    advance: 'bobDisplaced',
    text: 'Drag the bob to one side to set a release angle. Add the ANGLE PLATE if you want to measure it.',
  },
  {
    target: 'controls',
    pane: 'sim',
    advance: 'swinging',
    text: 'RELEASE lets it go. While it’s swinging the same button reads STOP, which halts it where it is. HANG STRAIGHT returns it to vertical.',
  },
  {
    target: 'instruments',
    pane: 'sim',
    advance: 'stopwatchOn',
    text: 'Bring the STOPWATCH to the bench.',
    q: 'One oscillation is the bob doing what, exactly?',
    a: 'Out, back, and past the same point travelling the same way again. Half a swing is not an oscillation, and getting this wrong puts your period out by a factor of two.',
  },
  {
    target: 'stopwatch',
    pane: 'sim',
    advance: 'stopwatchTimed',
    text: 'Start the watch as the bob passes the lowest point, and stop it after a whole number of oscillations.',
    q: 'Why time many oscillations rather than one?',
    a: 'Your reaction time is about the same whether you time one swing or twenty, so spreading it across twenty makes it twenty times smaller as a fraction of the answer. How many you choose is up to you.',
  },
  {
    target: 'table',
    pane: 'data',
    advance: 'next',
    text: 'Your readings go in the table. Add columns with + COL and name them by typing. The plot draws whichever two columns you choose.',
  },
  {
    target: 'table',
    pane: 'data',
    advance: 'fiveRows',
    text: 'Time that same length again, four more times, and put all five readings in the table.',
    q: 'What do five readings tell you that one doesn’t?',
    a: 'The spread between them is the size of your timing error. A single reading tells you nothing about how well you can time.',
  },
  {
    target: 'table',
    pane: 'data',
    advance: 'columnRenamed',
    text: 'Add the columns you need with + COL, and name them by typing.',
    q: 'If T₀ has an uncertainty ΔT₀, what is the uncertainty in T₀²?',
    a: 'Δ(T₀²) = 2T₀ΔT₀. Squaring doubles the relative uncertainty.',
  },
  {
    target: 'table',
    pane: 'data',
    advance: 'sixLengths',
    text: 'Now repeat for at least six different lengths.',
  },
];
