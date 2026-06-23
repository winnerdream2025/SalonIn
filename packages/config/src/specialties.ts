export interface Specialty {
  id: string
  label: string
  categoryId: string
}

export interface SpecialtyCategory {
  id: string
  label: string
}

export const SPECIALTY_CATEGORIES: SpecialtyCategory[] = [
  { id: 'hair',     label: 'Hair' },
  { id: 'nails',    label: 'Nails' },
  { id: 'lashes',   label: 'Lashes' },
  { id: 'makeup',   label: 'Makeup' },
  { id: 'barber',   label: 'Barber' },
  { id: 'skincare', label: 'Skincare' },
]

export const BEAUTY_SPECIALTIES: Specialty[] = [
  // ── Hair ────────────────────────────────────────────────────────────────────
  { id: 'knotless-braids',  label: 'Knotless Braids',  categoryId: 'hair' },
  { id: 'box-braids',       label: 'Box Braids',       categoryId: 'hair' },
  { id: 'feed-in-braids',   label: 'Feed-in Braids',   categoryId: 'hair' },
  { id: 'cornrows',         label: 'Cornrows',         categoryId: 'hair' },
  { id: 'locs',             label: 'Locs',             categoryId: 'hair' },
  { id: 'faux-locs',        label: 'Faux Locs',        categoryId: 'hair' },
  { id: 'loc-maintenance',  label: 'Loc Maintenance',  categoryId: 'hair' },
  { id: 'natural-hair',     label: 'Natural Hair',     categoryId: 'hair' },
  { id: 'blowout',          label: 'Blowout',          categoryId: 'hair' },
  { id: 'silk-press',       label: 'Silk Press',       categoryId: 'hair' },
  { id: 'relaxer',          label: 'Relaxer',          categoryId: 'hair' },
  { id: 'color',            label: 'Color',            categoryId: 'hair' },
  { id: 'balayage',         label: 'Balayage',         categoryId: 'hair' },
  { id: 'highlights',       label: 'Highlights',       categoryId: 'hair' },
  { id: 'weave-sew-in',     label: 'Weave/Sew-in',     categoryId: 'hair' },
  { id: 'wigs',             label: 'Wigs',             categoryId: 'hair' },
  { id: 'wig-install',      label: 'Wig Install',      categoryId: 'hair' },
  { id: 'extensions',       label: 'Extensions',       categoryId: 'hair' },
  { id: 'twists',           label: 'Twists',           categoryId: 'hair' },
  { id: 'twist-out',        label: 'Twist Out',        categoryId: 'hair' },
  { id: 'bantu-knots',      label: 'Bantu Knots',      categoryId: 'hair' },
  { id: 'crochet-braids',   label: 'Crochet Braids',   categoryId: 'hair' },
  { id: 'frontal-sew-in',   label: 'Frontal Sew-in',   categoryId: 'hair' },
  { id: 'quick-weave',      label: 'Quick Weave',      categoryId: 'hair' },
  { id: 'curly-cut',        label: 'Curly Cut',        categoryId: 'hair' },
  { id: 'vivid-color',      label: 'Vivid Color',      categoryId: 'hair' },
  // ── Nails ───────────────────────────────────────────────────────────────────
  { id: 'gel-nails',        label: 'Gel Nails',        categoryId: 'nails' },
  { id: 'acrylic-nails',    label: 'Acrylic Nails',    categoryId: 'nails' },
  { id: 'nail-art',         label: 'Nail Art',         categoryId: 'nails' },
  { id: 'dip-powder',       label: 'Dip Powder',       categoryId: 'nails' },
  { id: 'press-on-nails',   label: 'Press-on Nails',   categoryId: 'nails' },
  { id: 'pedicure',         label: 'Pedicure',         categoryId: 'nails' },
  { id: 'manicure',         label: 'Manicure',         categoryId: 'nails' },
  { id: 'nail-repair',      label: 'Nail Repair',      categoryId: 'nails' },
  // ── Lashes ──────────────────────────────────────────────────────────────────
  { id: 'classic-lashes',   label: 'Classic Lashes',   categoryId: 'lashes' },
  { id: 'volume-lashes',    label: 'Volume Lashes',    categoryId: 'lashes' },
  { id: 'hybrid-lashes',    label: 'Hybrid Lashes',    categoryId: 'lashes' },
  { id: 'lash-lift',        label: 'Lash Lift',        categoryId: 'lashes' },
  { id: 'lash-tint',        label: 'Lash Tint',        categoryId: 'lashes' },
  { id: 'mega-volume',      label: 'Mega Volume',      categoryId: 'lashes' },
  // ── Makeup ──────────────────────────────────────────────────────────────────
  { id: 'bridal-makeup',    label: 'Bridal Makeup',    categoryId: 'makeup' },
  { id: 'editorial-makeup', label: 'Editorial Makeup', categoryId: 'makeup' },
  { id: 'airbrush-makeup',  label: 'Airbrush Makeup',  categoryId: 'makeup' },
  { id: 'event-makeup',     label: 'Event Makeup',     categoryId: 'makeup' },
  { id: 'natural-makeup',   label: 'Natural Makeup',   categoryId: 'makeup' },
  { id: 'glam-makeup',      label: 'Glam Makeup',      categoryId: 'makeup' },
  { id: 'sfx',              label: 'SFX',              categoryId: 'makeup' },
  // ── Barber ──────────────────────────────────────────────────────────────────
  { id: 'fades',            label: 'Fades',            categoryId: 'barber' },
  { id: 'taper-fade',       label: 'Taper Fade',       categoryId: 'barber' },
  { id: 'lineups',          label: 'Lineups',          categoryId: 'barber' },
  { id: 'beard-trim',       label: 'Beard Trim',       categoryId: 'barber' },
  { id: 'beard-design',     label: 'Beard Design',     categoryId: 'barber' },
  { id: 'kids-cuts',        label: 'Kids Cuts',        categoryId: 'barber' },
  { id: 'hair-coloring',    label: 'Hair Coloring',    categoryId: 'barber' },
  { id: 'hot-towel-shave',  label: 'Hot Towel Shave',  categoryId: 'barber' },
  // ── Skincare ────────────────────────────────────────────────────────────────
  { id: 'facials',          label: 'Facials',          categoryId: 'skincare' },
  { id: 'waxing',           label: 'Waxing',           categoryId: 'skincare' },
  { id: 'threading',        label: 'Threading',        categoryId: 'skincare' },
  { id: 'chemical-peels',   label: 'Chemical Peels',   categoryId: 'skincare' },
  { id: 'microdermabrasion',label: 'Microdermabrasion',categoryId: 'skincare' },
  { id: 'lash-brows',       label: 'Lash Brows',       categoryId: 'skincare' },
  { id: 'brow-lamination',  label: 'Brow Lamination',  categoryId: 'skincare' },
]

export const SPECIALTY_BY_ID: Record<string, Specialty> = Object.fromEntries(
  BEAUTY_SPECIALTIES.map((s) => [s.id, s]),
)

export const SPECIALTIES_BY_CATEGORY: Record<string, Specialty[]> = BEAUTY_SPECIALTIES.reduce(
  (acc, s) => {
    if (!acc[s.categoryId]) acc[s.categoryId] = []
    acc[s.categoryId]!.push(s)
    return acc
  },
  {} as Record<string, Specialty[]>,
)

export const specialtyLabel = (id: string | null | undefined): string => {
  if (id == null) return ''
  return SPECIALTY_BY_ID[id]?.label ?? id
}

export const ALL_SPECIALTIES = BEAUTY_SPECIALTIES

export const ALL_SPECIALTY_IDS = BEAUTY_SPECIALTIES.map((s) => s.id)
