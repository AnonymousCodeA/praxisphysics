export const categories = [
  { slug: 'mechanics',        title: 'Mechanics',        blurb: 'Kinematics, forces, energy, rotation, oscillations.', tag: '1 LIVE' },
  { slug: 'thermodynamics',   title: 'Thermodynamics',   blurb: 'Heat, gases, kinetic theory, entropy.',               tag: 'SOON' },
  { slug: 'electromagnetism', title: 'Electromagnetism', blurb: 'Circuits, fields, magnetism, induction.',             tag: '2 LIVE' },
  { slug: 'waves-optics',     title: 'Waves & optics',   blurb: 'Interference, diffraction, lenses, sound.',           tag: '1 LIVE' },
  { slug: 'modern-physics',   title: 'Modern physics',   blurb: 'Quanta, atoms, nuclei, relativity.',                  tag: 'SOON' },
  { slug: 'mixed-bag',        title: 'Mixed bag',        blurb: 'Cross-topic experiments and one-offs.',               tag: 'SOON' },
];

// Individual simulations, keyed by category slug. Add to these as you build them.
export const simulations = {
  mechanics: [
    {
      slug: 'pendulum',
      title: 'Pendulum',
      blurb: 'Measure g from small oscillations, then chase the amplitude series.',
      status: 'live',
      href: '/simulations/pendulum',
    },
  ],
  electromagnetism: [
    {
      slug: 'circuits',
      title: 'RC Circuits',
      blurb: 'Measure a capacitance from its decay, then chase one too fast to follow.',
      status: 'live',
      href: '/simulations/circuits',
    },
    {
      slug: 'circuits-nonlinear',
      title: 'Non-Linear Circuit Elements',
      blurb: 'Find B from a heated thermistor, then chase a capacitance that depends on voltage.',
      status: 'live',
      href: '/simulations/circuits-nonlinear',
    },
  ],
  'waves-optics': [
    {
      slug: 'diffraction-grating',
      title: 'Diffraction grating',
      blurb: 'Orders, angles, and the limit of d sin theta = m lambda.',
      status: 'live',
    },
  ],
};
