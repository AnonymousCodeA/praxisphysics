export const categories = [
  { slug: 'mechanics',        title: 'Mechanics',        blurb: 'Kinematics, forces, energy, rotation, oscillations.', tag: 'SOON' },
  { slug: 'thermodynamics',   title: 'Thermodynamics',   blurb: 'Heat, gases, kinetic theory, entropy.',               tag: 'SOON' },
  { slug: 'electromagnetism', title: 'Electromagnetism', blurb: 'Circuits, fields, magnetism, induction.',             tag: 'SOON' },
  { slug: 'waves-optics',     title: 'Waves & optics',   blurb: 'Interference, diffraction, lenses, sound.',           tag: '1 LIVE' },
  { slug: 'modern-physics',   title: 'Modern physics',   blurb: 'Quanta, atoms, nuclei, relativity.',                  tag: 'SOON' },
  { slug: 'mixed-bag',        title: 'Mixed bag',        blurb: 'Cross-topic experiments and one-offs.',               tag: 'SOON' },
];

// Individual simulations, keyed by category slug. Add to these as you build them.
export const simulations = {
  'waves-optics': [
    {
      slug: 'diffraction-grating',
      title: 'Diffraction grating',
      blurb: 'Orders, angles, and the limit of d sin theta = m lambda.',
      status: 'live',
    },
  ],
};
