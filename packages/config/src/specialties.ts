export const BEAUTY_SPECIALTIES: Record<string, string[]> = {
  'Hair': [
    'Knotless braids',
    'Box braids',
    'Feed-in braids',
    'Cornrows',
    'Locs',
    'Faux locs',
    'Loc maintenance',
    'Natural hair',
    'Blowout',
    'Silk press',
    'Relaxer',
    'Color',
    'Balayage',
    'Highlights',
    'Weave/Sew-in',
    'Wigs',
    'Extensions',
    'Twists',
    'Bantu knots',
    'Crochet braids',
  ],
  'Nails': [
    'Gel nails',
    'Acrylic nails',
    'Nail art',
    'Dip powder',
    'Press-on nails',
    'Pedicure',
    'Manicure',
    'Nail repair',
  ],
  'Lashes': [
    'Classic lashes',
    'Volume lashes',
    'Hybrid lashes',
    'Lash lift',
    'Lash tint',
    'Mega volume',
  ],
  'Makeup': [
    'Bridal makeup',
    'Editorial makeup',
    'Airbrush makeup',
    'Event makeup',
    'Natural makeup',
    'Glam makeup',
  ],
  'Barber': [
    'Fades',
    'Lineups',
    'Beard trim',
    'Beard design',
    'Kids cuts',
    'Hair coloring',
    'Hot towel shave',
  ],
  'Skincare': [
    'Facials',
    'Waxing',
    'Threading',
    'Chemical peels',
    'Microdermabrasion',
    'Lash brows',
  ],
  'Other': [],
}

// Flat list for search/filter
export const ALL_SPECIALTIES = Object.values(BEAUTY_SPECIALTIES).flat()

// Categories list
export const SPECIALTY_CATEGORIES = Object.keys(BEAUTY_SPECIALTIES)
