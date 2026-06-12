// The basic wall shape (in local coordinates, z is up)
const Snowpile_SHAPE = [
  [0.0, 0.0, 0.0],
  [0.0, 0.0, 0.7],
  [0.0, 0.3, 1.0],
  [0.0, 0.6, 1.0],
  [0.0, 1.0, 0.7],
  [0.0, 1.0, 0.0],
  [0.0, 0.0, 0.0],
];

const Satteldach_SHAPE = [
  [0.0, 0.0, 0.0],
  [0.0, 0.0, 0.7],
  [0.0, 0.5, 1.0],
  [0.0, 1.0, 0.7],
  [0.0, 1.0, 0.0],
  [0.0, 0.0, 0.0],
];

const Nurdach_SHAPE = [
  [0.0, 0.0, 0.0],
  [0.0, 0.5, 1.0],
  [0.0, 1.0, 0.0],
  [0.0, 0.0, 0.0],
];

const Pultdach_SHAPE = [
  [0.0, 0.0, 0.0],
  [0.0, 0.0, 1.0],
  [0.0, 1.0, 0.7],
  [0.0, 1.0, 0.0],
  [0.0, 0.0, 0.0],
];

const Pultdach_versetzt_SHAPE = [
  [0.0, 0.0, 0.0],
  [0.0, 0.0, 1.0],
  [0.0, 0.5, 1.0],
  [0.0, 0.5, 0.9],
  [0.0, 1.0, 0.7],
  [0.0, 1.0, 0.0],
  [0.0, 0.0, 0.0],
];

const Flachdach_SHAPE = [
  [0.0, 0.0, 0.0],
  [0.0, 0.0, 1.0],
  [0.0, 1.0, 1.0],
  [0.0, 1.0, 0.0],
  [0.0, 0.0, 0.0],
];

const Butterfly_SHAPE = [
  [0.0, 0.0, 0.0],
  [0.0, 0.0, 1.0],
  [0.0, 0.5, 0.9],
  [0.0, 1.0, 1.0],
  [0.0, 1.0, 0.0],
  [0.0, 0.0, 0.0],
];

// Tonnendach arc from [0.0, 0.0, 0.9] to [0.0, 1.0, 0.9] with radius 0.5
const Bogendach_SHAPE = [
  [0.0, 0.0, 0.0],
  [0.0, 0.0, 0.849992],
  // Arc points (y, z) along a semicircle
  [0.0, 0.05, 0.879381],
  [0.0, 0.1, 0.907048],
  [0.0, 0.15, 0.932256],
  [0.0, 0.2, 0.954294],
  [0.0, 0.25, 0.97238],
  [0.0, 0.3, 0.985921],
  [0.0, 0.35, 0.994294],
  [0.0, 0.4, 0.997],
  [0.0, 0.45, 0.999],
  [0.0, 0.5, 1],
  [0.0, 0.55, 0.999],
  [0.0, 0.6, 0.997],
  [0.0, 0.65, 0.994294],
  [0.0, 0.7, 0.985921],
  [0.0, 0.75, 0.97238],
  [0.0, 0.8, 0.954294],
  [0.0, 0.85, 0.932256],
  [0.0, 0.9, 0.907048],
  [0.0, 0.95, 0.879381],
  [0.0, 1.0, 0.849992],
  [0.0, 1.0, 0.0],
  [0.0, 0.0, 0.0],
];

const Mansarddach_SHAPE = [
  [0.0, 0.0, 0.0],
  [0.0, 0.0, 0.7],
  [0.0, 0.2, 0.925],
  [0.0, 0.5, 1.0],
  [0.0, 0.8, 0.925],
  [0.0, 1.0, 0.7],
  [0.0, 1.0, 0.0],
  [0.0, 0.0, 0.0],
];

const Frackdach_SHAPE = [
  [0.0, 0.0, 0.0],
  [0.0, 0.0, 0.8],
  [0.0, 0.9, 1.0],
  [0.0, 1.0, 0.85],
  [0.0, 1.0, 0.0],
  [0.0, 0.0, 0.0],
];

const Sheddach_SHAPE = [
  [0.0, 0.0, 0.0],
  [0.0, 0.0, 0.85],
  [0.0, 0.25, 1.0],
  [0.0, 0.25, 0.85],
  [0.0, 0.5, 1.0],
  [0.0, 0.5, 0.85],
  [0.0, 0.75, 1.0],
  [0.0, 0.75, 0.85],
  [0.0, 1.0, 1.0],
  [0.0, 1.0, 0.0],
  [0.0, 0.0, 0.0],
];

const Paralleldach_SHAPE = [
  [0.0, 0.0, 0.0],
  [0.0, 0.0, 0.85],
  [0.0, 0.166666, 1.0],
  [0.0, 0.333333, 0.85],
  [0.0, 0.5, 1.0],
  [0.0, 0.666666, 0.85],
  [0.0, 0.833333, 1.0],
  [0.0, 1.0, 0.85],
  [0.0, 1.0, 0.0],
  [0.0, 0.0, 0.0],
];

const Grabendach_SHAPE = [
  [0.0, 0.0, 0.0],
  [0.0, 0.0, 1.0],
  [0.0, 0.166666, 0.85],
  [0.0, 0.333333, 1],
  [0.0, 0.5, 0.85],
  [0.0, 0.666666, 1],
  [0.0, 0.833333, 0.85],
  [0.0, 1.0, 1],
  [0.0, 1.0, 0.0],
  [0.0, 0.0, 0.0],
];

const roofTypes = [
  { name: 'Snowpile', shape: Snowpile_SHAPE, i18n: 'snowpile' },
  { name: 'Satteldach', shape: Satteldach_SHAPE, i18n: 'saddleRoof' },
  { name: 'Nurdach', shape: Nurdach_SHAPE, i18n: 'nurRoof' },
  { name: 'Pultdach', shape: Pultdach_SHAPE, i18n: 'pentRoof' },
  {
    name: 'Pultdach versetzt',
    shape: Pultdach_versetzt_SHAPE,
    i18n: 'offsetShedRoof',
  },
  { name: 'Flachdach', shape: Flachdach_SHAPE, i18n: 'flatRoof' },
  { name: 'Butterfly', shape: Butterfly_SHAPE, i18n: 'butterflyRoof' },
  { name: 'Tonnendach', shape: Bogendach_SHAPE, i18n: 'barrelRoof' },
  { name: 'Mansarddach', shape: Mansarddach_SHAPE, i18n: 'mansardRoof' },
  { name: 'Frackdach', shape: Frackdach_SHAPE, i18n: 'saltboxRoof' },
  { name: 'Sheddach', shape: Sheddach_SHAPE, i18n: 'shedRoof' },
  { name: 'Paralleldach', shape: Paralleldach_SHAPE, i18n: 'parallelRoof' },
  { name: 'Grabendach', shape: Grabendach_SHAPE, i18n: 'gableOnGableRoof' },
];

export default roofTypes;
