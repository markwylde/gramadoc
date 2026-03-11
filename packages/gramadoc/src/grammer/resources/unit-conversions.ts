export type UnitSystem = 'metric' | 'imperial' | 'us-customary'

export interface UnitConversionUnit {
  singular: string
  plural: string
  symbols: readonly string[]
  system: UnitSystem
}

export interface UnitConversionPair {
  quantity: 'distance' | 'length' | 'mass' | 'temperature' | 'volume'
  source: UnitConversionUnit
  target: UnitConversionUnit
  approximateFactor?: number
  approximateOffset?: number
  editorialNote?: string
}

export interface UnitConversionProfile {
  id: 'general-imperial' | 'us-customary'
  label: string
  preferredSystems: readonly UnitSystem[]
  pairs: readonly UnitConversionPair[]
}

const kilometreUnit = {
  singular: 'kilometre',
  plural: 'kilometres',
  symbols: ['km', 'kilometre', 'kilometres', 'kilometer', 'kilometers'],
  system: 'metric',
} as const satisfies UnitConversionUnit

const mileUnit = {
  singular: 'mile',
  plural: 'miles',
  symbols: ['mi', 'mile', 'miles'],
  system: 'imperial',
} as const satisfies UnitConversionUnit

const metreUnit = {
  singular: 'metre',
  plural: 'metres',
  symbols: ['m', 'metre', 'metres', 'meter', 'meters'],
  system: 'metric',
} as const satisfies UnitConversionUnit

const footUnit = {
  singular: 'foot',
  plural: 'feet',
  symbols: ['ft', 'foot', 'feet'],
  system: 'imperial',
} as const satisfies UnitConversionUnit

const kilogramUnit = {
  singular: 'kilogram',
  plural: 'kilograms',
  symbols: ['kg', 'kilogram', 'kilograms'],
  system: 'metric',
} as const satisfies UnitConversionUnit

const poundUnit = {
  singular: 'pound',
  plural: 'pounds',
  symbols: ['lb', 'lbs', 'pound', 'pounds'],
  system: 'imperial',
} as const satisfies UnitConversionUnit

const litreUnit = {
  singular: 'litre',
  plural: 'litres',
  symbols: ['l', 'litre', 'litres', 'liter', 'liters'],
  system: 'metric',
} as const satisfies UnitConversionUnit

const imperialGallonUnit = {
  singular: 'imperial gallon',
  plural: 'imperial gallons',
  symbols: ['imp gal'],
  system: 'imperial',
} as const satisfies UnitConversionUnit

const usGallonUnit = {
  singular: 'US gallon',
  plural: 'US gallons',
  symbols: ['gal', 'gallon', 'gallons'],
  system: 'us-customary',
} as const satisfies UnitConversionUnit

const celsiusUnit = {
  singular: 'degree Celsius',
  plural: 'degrees Celsius',
  symbols: ['°c', 'celsius', 'degree celsius', 'degrees celsius'],
  system: 'metric',
} as const satisfies UnitConversionUnit

const fahrenheitUnit = {
  singular: 'degree Fahrenheit',
  plural: 'degrees Fahrenheit',
  symbols: ['°f', 'fahrenheit', 'degree fahrenheit', 'degrees fahrenheit'],
  system: 'us-customary',
} as const satisfies UnitConversionUnit

export const commonMetricImperialPairs = [
  {
    quantity: 'distance',
    source: kilometreUnit,
    target: mileUnit,
    approximateFactor: 0.621371,
    editorialNote:
      'Useful when a document is written for an imperial-first audience.',
  },
  {
    quantity: 'length',
    source: metreUnit,
    target: footUnit,
    approximateFactor: 3.28084,
    editorialNote:
      'Best offered as an editorial aid, not a core grammar correction.',
  },
  {
    quantity: 'mass',
    source: kilogramUnit,
    target: poundUnit,
    approximateFactor: 2.20462,
  },
  {
    quantity: 'temperature',
    source: celsiusUnit,
    target: fahrenheitUnit,
    approximateFactor: 1.8,
    approximateOffset: 32,
  },
  {
    quantity: 'volume',
    source: litreUnit,
    target: usGallonUnit,
    approximateFactor: 0.264172,
    editorialNote:
      'The US gallon differs from the imperial gallon, so the locale target must stay explicit.',
  },
] as const satisfies readonly UnitConversionPair[]

export const baseUnitConversionProfile = {
  id: 'general-imperial',
  label: 'Base editorial unit conversions',
  preferredSystems: ['imperial'],
  pairs: [
    commonMetricImperialPairs[0],
    commonMetricImperialPairs[1],
    commonMetricImperialPairs[2],
  ],
} as const satisfies UnitConversionProfile

export const variantUnitConversionProfiles = [
  {
    id: 'general-imperial',
    label: 'General imperial editorial suggestions',
    preferredSystems: ['imperial'],
    pairs: [
      commonMetricImperialPairs[0],
      commonMetricImperialPairs[1],
      commonMetricImperialPairs[2],
      {
        quantity: 'volume',
        source: litreUnit,
        target: imperialGallonUnit,
        approximateFactor: 0.219969,
        editorialNote:
          'Use for general imperial audiences where UK-style gallon sizing is expected.',
      },
    ],
  },
  {
    id: 'us-customary',
    label: 'US customary editorial suggestions',
    preferredSystems: ['us-customary', 'imperial'],
    pairs: [
      commonMetricImperialPairs[0],
      commonMetricImperialPairs[1],
      commonMetricImperialPairs[2],
      commonMetricImperialPairs[3],
      commonMetricImperialPairs[4],
    ],
  },
] as const satisfies readonly UnitConversionProfile[]
