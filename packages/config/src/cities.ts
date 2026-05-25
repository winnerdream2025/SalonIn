export const SUPPORTED_CITIES = {
  dmv:     { id: 'dmv',     name: 'DMV (DC/MD/VA)', active: true  },
  atlanta: { id: 'atlanta', name: 'Atlanta',         active: true  },
  houston: { id: 'houston', name: 'Houston',         active: false },
  miami:   { id: 'miami',   name: 'Miami',           active: false },
} as const

export type CityId = keyof typeof SUPPORTED_CITIES
