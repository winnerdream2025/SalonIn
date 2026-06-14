export interface WorldCity {
  id: string
  name: string
  country: string
  countryCode: string
  flag: string
  state?: string
  lat: number
  lng: number
}

export const WORLD_CITIES: WorldCity[] = [
  // United States — priority markets first
  { id: 'dmv',           name: 'Washington DC / DMV', country: 'United States', countryCode: 'US', state: 'DC', flag: '🇺🇸', lat: 38.9072,  lng: -77.0369  },
  { id: 'atlanta',       name: 'Atlanta',              country: 'United States', countryCode: 'US', state: 'GA', flag: '🇺🇸', lat: 33.7490,  lng: -84.3880  },
  { id: 'houston',       name: 'Houston',              country: 'United States', countryCode: 'US', state: 'TX', flag: '🇺🇸', lat: 29.7604,  lng: -95.3698  },
  { id: 'miami',         name: 'Miami',                country: 'United States', countryCode: 'US', state: 'FL', flag: '🇺🇸', lat: 25.7617,  lng: -80.1918  },
  { id: 'new-york',      name: 'New York City',        country: 'United States', countryCode: 'US', state: 'NY', flag: '🇺🇸', lat: 40.7128,  lng: -74.0060  },
  { id: 'los-angeles',   name: 'Los Angeles',          country: 'United States', countryCode: 'US', state: 'CA', flag: '🇺🇸', lat: 34.0522,  lng: -118.2437 },
  { id: 'chicago',       name: 'Chicago',              country: 'United States', countryCode: 'US', state: 'IL', flag: '🇺🇸', lat: 41.8781,  lng: -87.6298  },
  { id: 'dallas',        name: 'Dallas',               country: 'United States', countryCode: 'US', state: 'TX', flag: '🇺🇸', lat: 32.7767,  lng: -96.7970  },
  { id: 'charlotte',     name: 'Charlotte',            country: 'United States', countryCode: 'US', state: 'NC', flag: '🇺🇸', lat: 35.2271,  lng: -80.8431  },
  { id: 'philadelphia',  name: 'Philadelphia',         country: 'United States', countryCode: 'US', state: 'PA', flag: '🇺🇸', lat: 39.9526,  lng: -75.1652  },
  { id: 'detroit',       name: 'Detroit',              country: 'United States', countryCode: 'US', state: 'MI', flag: '🇺🇸', lat: 42.3314,  lng: -83.0458  },
  { id: 'baltimore',     name: 'Baltimore',            country: 'United States', countryCode: 'US', state: 'MD', flag: '🇺🇸', lat: 39.2904,  lng: -76.6122  },
  { id: 'memphis',       name: 'Memphis',              country: 'United States', countryCode: 'US', state: 'TN', flag: '🇺🇸', lat: 35.1495,  lng: -90.0490  },
  { id: 'new-orleans',   name: 'New Orleans',          country: 'United States', countryCode: 'US', state: 'LA', flag: '🇺🇸', lat: 29.9511,  lng: -90.0715  },
  { id: 'las-vegas',     name: 'Las Vegas',            country: 'United States', countryCode: 'US', state: 'NV', flag: '🇺🇸', lat: 36.1699,  lng: -115.1398 },
  { id: 'orlando',       name: 'Orlando',              country: 'United States', countryCode: 'US', state: 'FL', flag: '🇺🇸', lat: 28.5383,  lng: -81.3792  },
  { id: 'boston',        name: 'Boston',               country: 'United States', countryCode: 'US', state: 'MA', flag: '🇺🇸', lat: 42.3601,  lng: -71.0589  },
  { id: 'phoenix',       name: 'Phoenix',              country: 'United States', countryCode: 'US', state: 'AZ', flag: '🇺🇸', lat: 33.4484,  lng: -112.0740 },
  { id: 'seattle',       name: 'Seattle',              country: 'United States', countryCode: 'US', state: 'WA', flag: '🇺🇸', lat: 47.6062,  lng: -122.3321 },
  { id: 'denver',        name: 'Denver',               country: 'United States', countryCode: 'US', state: 'CO', flag: '🇺🇸', lat: 39.7392,  lng: -104.9903 },

  // Canada
  { id: 'toronto',    name: 'Toronto',   country: 'Canada', countryCode: 'CA', state: 'ON', flag: '🇨🇦', lat: 43.6532, lng: -79.3832  },
  { id: 'montreal',   name: 'Montréal',  country: 'Canada', countryCode: 'CA', state: 'QC', flag: '🇨🇦', lat: 45.5017, lng: -73.5673  },
  { id: 'vancouver',  name: 'Vancouver', country: 'Canada', countryCode: 'CA', state: 'BC', flag: '🇨🇦', lat: 49.2827, lng: -123.1207 },
  { id: 'calgary',    name: 'Calgary',   country: 'Canada', countryCode: 'CA', state: 'AB', flag: '🇨🇦', lat: 51.0447, lng: -114.0719 },

  // United Kingdom
  { id: 'london',     name: 'London',     country: 'United Kingdom', countryCode: 'GB', flag: '🇬🇧', lat: 51.5074, lng: -0.1278 },
  { id: 'manchester', name: 'Manchester', country: 'United Kingdom', countryCode: 'GB', flag: '🇬🇧', lat: 53.4808, lng: -2.2426 },
  { id: 'birmingham', name: 'Birmingham', country: 'United Kingdom', countryCode: 'GB', flag: '🇬🇧', lat: 52.4862, lng: -1.8904 },

  // France
  { id: 'paris-fr',   name: 'Paris',      country: 'France', countryCode: 'FR', flag: '🇫🇷', lat: 48.8566, lng: 2.3522 },
  { id: 'lyon',       name: 'Lyon',       country: 'France', countryCode: 'FR', flag: '🇫🇷', lat: 45.7640, lng: 4.8357 },
  { id: 'marseille',  name: 'Marseille',  country: 'France', countryCode: 'FR', flag: '🇫🇷', lat: 43.2965, lng: 5.3698 },

  // Germany / Netherlands / Belgium
  { id: 'berlin',     name: 'Berlin',     country: 'Germany',     countryCode: 'DE', flag: '🇩🇪', lat: 52.5200, lng: 13.4050 },
  { id: 'munich',     name: 'Munich',     country: 'Germany',     countryCode: 'DE', flag: '🇩🇪', lat: 48.1351, lng: 11.5820 },
  { id: 'amsterdam',  name: 'Amsterdam',  country: 'Netherlands', countryCode: 'NL', flag: '🇳🇱', lat: 52.3676, lng: 4.9041  },
  { id: 'brussels',   name: 'Brussels',   country: 'Belgium',     countryCode: 'BE', flag: '🇧🇪', lat: 50.8503, lng: 4.3517  },

  // Africa
  { id: 'lagos',         name: 'Lagos',          country: 'Nigeria',       countryCode: 'NG', flag: '🇳🇬', lat: 6.5244,   lng: 3.3792   },
  { id: 'abuja',         name: 'Abuja',           country: 'Nigeria',       countryCode: 'NG', flag: '🇳🇬', lat: 9.0579,   lng: 7.4951   },
  { id: 'accra',         name: 'Accra',           country: 'Ghana',         countryCode: 'GH', flag: '🇬🇭', lat: 5.6037,   lng: -0.1870  },
  { id: 'nairobi',       name: 'Nairobi',         country: 'Kenya',         countryCode: 'KE', flag: '🇰🇪', lat: -1.2921,  lng: 36.8219  },
  { id: 'johannesburg',  name: 'Johannesburg',    country: 'South Africa',  countryCode: 'ZA', flag: '🇿🇦', lat: -26.2041, lng: 28.0473  },
  { id: 'cape-town',     name: 'Cape Town',       country: 'South Africa',  countryCode: 'ZA', flag: '🇿🇦', lat: -33.9249, lng: 18.4241  },
  { id: 'dakar',         name: 'Dakar',           country: 'Senegal',       countryCode: 'SN', flag: '🇸🇳', lat: 14.7167,  lng: -17.4677 },
  { id: 'abidjan',       name: 'Abidjan',         country: "Côte d'Ivoire", countryCode: 'CI', flag: '🇨🇮', lat: 5.3600,   lng: -4.0083  },
  { id: 'douala',        name: 'Douala',          country: 'Cameroon',      countryCode: 'CM', flag: '🇨🇲', lat: 4.0511,   lng: 9.7679   },
  { id: 'yaounde',       name: 'Yaoundé',         country: 'Cameroon',      countryCode: 'CM', flag: '🇨🇲', lat: 3.8480,   lng: 11.5021  },
  { id: 'casablanca',    name: 'Casablanca',      country: 'Morocco',       countryCode: 'MA', flag: '🇲🇦', lat: 33.5731,  lng: -7.5898  },

  // Caribbean
  { id: 'kingston',       name: 'Kingston',        country: 'Jamaica',             countryCode: 'JM', flag: '🇯🇲', lat: 17.9970, lng: -76.7936 },
  { id: 'port-au-prince', name: 'Port-au-Prince',  country: 'Haiti',               countryCode: 'HT', flag: '🇭🇹', lat: 18.5944, lng: -72.3074 },
  { id: 'port-of-spain',  name: 'Port of Spain',   country: 'Trinidad & Tobago',   countryCode: 'TT', flag: '🇹🇹', lat: 10.6549, lng: -61.5019 },

  // Asia / Middle East
  { id: 'dubai',      name: 'Dubai',     country: 'UAE',       countryCode: 'AE', flag: '🇦🇪', lat: 25.2048, lng: 55.2708  },
  { id: 'singapore',  name: 'Singapore', country: 'Singapore', countryCode: 'SG', flag: '🇸🇬', lat: 1.3521,  lng: 103.8198 },

  // South America
  { id: 'sao-paulo',       name: 'São Paulo',       country: 'Brazil', countryCode: 'BR', flag: '🇧🇷', lat: -23.5505, lng: -46.6333 },
  { id: 'rio-de-janeiro',  name: 'Rio de Janeiro',  country: 'Brazil', countryCode: 'BR', flag: '🇧🇷', lat: -22.9068, lng: -43.1729 },

  // Oceania
  { id: 'sydney',     name: 'Sydney',    country: 'Australia', countryCode: 'AU', state: 'NSW', flag: '🇦🇺', lat: -33.8688, lng: 151.2093 },
  { id: 'melbourne',  name: 'Melbourne', country: 'Australia', countryCode: 'AU', state: 'VIC', flag: '🇦🇺', lat: -37.8136, lng: 144.9631 },
]

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const findNearestCity = (lat: number, lng: number): WorldCity => {
  let nearest = WORLD_CITIES[0]!
  let minDist = Infinity
  for (const city of WORLD_CITIES) {
    const d = haversineKm(lat, lng, city.lat, city.lng)
    if (d < minDist) {
      minDist = d
      nearest = city
    }
  }
  return nearest
}

export const searchCities = (query: string): WorldCity[] => {
  if (!query.trim()) return WORLD_CITIES.slice(0, 20)
  const q = query.toLowerCase().trim()
  return WORLD_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      (c.state?.toLowerCase().includes(q) ?? false),
  ).slice(0, 30)
}

export const getCityById = (id: string): WorldCity | undefined =>
  WORLD_CITIES.find((c) => c.id === id)

export const getCityLabel = (id: string | null | undefined): string => {
  if (!id) return 'Location'
  const c = getCityById(id)
  if (!c) return id.toUpperCase()
  return c.countryCode === 'US' ? c.name : `${c.flag} ${c.name}`
}
