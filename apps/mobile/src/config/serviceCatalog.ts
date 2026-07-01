export interface CatalogCategory {
  id: string
  label: string
  services: string[]
}

export const SERVICE_CATALOG: CatalogCategory[] = [
  {
    id: 'womens-haircut',
    label: "Women's Haircut",
    services: ['Bang Trim', "Women's Cut", "Women's Trim", "Women's Dry Cut"],
  },
  {
    id: 'mens-haircut',
    label: "Men's Haircut",
    services: ["Men's Cut", "Men's Trim", 'Neck Trim'],
  },
  {
    id: 'kids',
    label: 'Kids',
    services: ["Kid's Braids", "Kid's Style", "Kid's Cut"],
  },
  {
    id: 'hair-color',
    label: 'Hair Color',
    services: [
      'All Over Color', 'Bleach and Tone', 'Carmelizing Color', 'Color Correction',
      'Double Process Color', 'Hair Tint', 'Partial Color', 'Permanent Color',
      'Root Touch Up', 'Semi Permanent Color', 'Single Process Color', 'Toner', 'Touch Ups',
    ],
  },
  {
    id: 'highlights',
    label: 'Highlights',
    services: [
      'Babylights', 'Full Balayage', 'Full Foil Highlights', 'Full Highlights',
      'Lowlights', 'Ombre', 'Partial Balayage', 'Partial Foil Highlights', 'Partial Highlights',
    ],
  },
  {
    id: 'style',
    label: 'Style',
    services: [
      'Additional Extension Add-On', 'Blowout', 'Braid Bar Style',
      'Flat Iron', 'Style', 'Updo', 'Wand / Barrel Curls',
    ],
  },
  {
    id: 'hair-treatments',
    label: 'Hair Treatments',
    services: [
      'Clarifying Treatment', 'Deep Conditioning Treatment', 'Hair Glaze Treatment',
      'Malibu Treatment', 'Olaplex Treatment', 'Protein Treatment',
      'Scalp Treatment', 'Smoothing Treatment', 'Trichology Treatment',
    ],
  },
  {
    id: 'natural-hair',
    label: 'Natural Hair',
    services: [
      'Cellophane / Clear Rinse', 'Hot Oil Treatment', 'Natural Coils', 'Natural Flexi Rods',
      'Natural Perm Rods', 'Natural Style', 'Natural Treatments', 'Natural Twists',
      'Silk Press', 'Spiral Set', 'Takedown', 'Transitioning Cut',
    ],
  },
  {
    id: 'weaves',
    label: 'Weaves',
    services: [
      'Closure Sew In', 'Full Sew In', 'Full Weave', 'Invisible Part Sew In',
      'Lace Closure Sew In', 'Netting', 'Partial Sew In', 'Partial Weave',
      'Quick Weave', 'Sew-in maintenance', 'Silk Closure Sew in', 'Takedown',
      'Tracking / Single Track Sew-In', 'Versatile Sew In', 'Weave maintenance',
    ],
  },
  {
    id: 'extensions',
    label: 'Extensions',
    services: [
      'Bonding Hair Extensions', 'Extension Coloring', 'Extension Trimming', 'Extensions',
      'Feather Extensions', 'Full Set', 'Fusion Braid Extensions', 'Glue in Extensions',
      'Loc Extensions', 'Micro Ring Extensions', 'Microlinks Extensions', 'Partial Set', 'Tinsel Extensions',
    ],
  },
  {
    id: 'braids',
    label: 'Braids',
    services: [
      'Box Braids', 'Braids', 'Cornrows', 'Crochet Braids', 'Ghana Braids',
      'Goddess Braids', 'Individual Braids', 'Poetic Justice Braids', 'Tree Braids', 'Yarn Braids',
    ],
  },
  {
    id: 'chemical-perms',
    label: 'Chemical Perms',
    services: ['Curling', 'Perm', 'Straightening'],
  },
  {
    id: 'curling-treatments',
    label: 'Curling Treatments',
    services: ['Air Wave', 'American Wave', 'Digital Perm', 'Wave'],
  },
  {
    id: 'knots',
    label: 'Knots',
    services: ['Bantu Knots', 'Knots', 'Zulu Knots'],
  },
  {
    id: 'locs',
    label: 'Locs',
    services: ['Dreadlocks', 'Loc Coils', 'Loc Maintenance', 'Loc Style'],
  },
  {
    id: 'relaxers',
    label: 'Relaxers',
    services: ['Relaxer', 'Relaxer Retouch', 'Relaxer Touch Up', 'Special Event Makeup', 'Virgin Relaxer'],
  },
  {
    id: 'sets-styles',
    label: 'Sets & Styles',
    services: ['Feathering', 'Flexi Rods', 'Perm Rods', 'Rinse', 'Roller Set', 'Shampoo and Style', 'Silk Wrap', 'Wet Set'],
  },
  {
    id: 'special-occasion-style',
    label: 'Special Occasion Style',
    services: ['Consultation', 'Styling', 'Travel Fee', 'Updo'],
  },
  {
    id: 'straightening-treatments',
    label: 'Straightening Treatments',
    services: ['Brazilian Blowout', 'Japanese Hair Straightening', 'Keratin Treatment'],
  },
  {
    id: 'twists',
    label: 'Twists',
    services: [
      'Comb Twist', 'Flat Twists', 'Havana Twists', 'Kinky Twist', 'Loc Re-twist',
      'Marley Twist', 'Nubian Twists', 'Senegalese Twist', 'Twist Out',
    ],
  },
  {
    id: 'wigs',
    label: 'Wigs',
    services: ['Wig', 'Wig Install', 'Wig Maintenance'],
  },
  {
    id: 'mens-color',
    label: "Men's Color",
    services: ['Bigen', 'Bigen Beard', 'Gray Blending'],
  },
  {
    id: 'eyebrows',
    label: 'Eyebrows',
    services: [
      'Eyebrow Shaping', 'Eyebrow Tattooing', 'Eyebrow Threading',
      'Eyebrow Tinting', 'Eyebrow Trim', 'Eyebrow Tweeze', 'Eyebrow Wax',
    ],
  },
  {
    id: 'eyelashes',
    label: 'Eyelashes',
    services: [
      'Eyelash Curl / Perm', 'Eyelash Extension Removal', 'Eyelash Extensions',
      'Eyelash Fill', 'Eyelash Full Set', 'Eyelash Tint', 'Individual Lashes', 'Strip Lashes',
    ],
  },
  {
    id: 'permanent-makeup',
    label: 'Permanent Makeup',
    services: [
      'Consultation', 'Eyebrow: Microblading', 'Eyebrow: Tattooing', 'Follow Up',
      'Lips', 'Lower Eye Liner', 'Microblading', 'Microblading Touch Up', 'Touch Ups', 'Upper Eye Liner',
    ],
  },
  {
    id: 'skincare',
    label: 'Skincare',
    services: [
      'Acne Facial', 'Anti-aging Treatment', 'Back Facial', 'Body Wrap',
      'Brightening Treatment', 'Calming Treatment', 'Chemical peel', 'Clearing Treatment',
      'Dermaplaning', 'Ear Candeling', 'Enzyme Peel', 'Exfoliating Treatment',
      'Extraction', 'Facial', 'Glycolic Peel', 'Hydrating Treatment',
      'Microdermabrasion', 'MicroNeedling', 'Oxygen Facial',
      'Rejuvenation Treatment', 'Resurfacing Treatment', 'Skincare Consultation',
    ],
  },
  {
    id: 'sugaring',
    label: 'Sugaring',
    services: [
      'Arm Sugaring', 'Back Sugaring', 'Bikini Sugaring', 'Brazilian Sugaring',
      'Brow Sugaring', 'Butt Sugaring', 'Chest Sugaring', 'Chin Sugaring',
      'Ear Sugaring', 'Full Body Sugaring', 'Full Face Sugaring', 'Half arm Sugaring',
      'Half leg Sugaring', 'Knuckle / Finger Sugaring', 'Leg Sugaring', 'Lip Sugaring',
      "Men's Back Sugaring", "Men's Brazilian Sugaring", "Men's Chest Sugaring",
      'Neck Sugaring', 'Nose Sugaring', 'Stomach Sugaring', 'Toe Sugaring', 'Underarm Sugaring',
    ],
  },
  {
    id: 'tanning',
    label: 'Tanning',
    services: ['Airbrush Tanning', 'Face and Decollete Tanning', 'Spray Tan', 'Tanning Bed', 'UV Free Tan'],
  },
  {
    id: 'waxing',
    label: 'Waxing',
    services: [
      'Arm Wax', 'Back Wax', 'Bikini Wax', 'Brazilian Wax', 'Brow Wax',
      'Butt Wax', 'Chest Wax', 'Chin Wax', 'Ear Wax', 'French Wax',
      'Full Body Wax', 'Full Face Wax', 'Full leg Wax', 'Half arm Wax', 'Half leg wax',
      'Knuckle Wax / Finger Wax', 'Lip Wax', "Men's Back Wax", "Men's Brazilian Wax",
      "Men's Chest Wax", 'Neck Wax', 'Nose Wax', 'Stomach Wax', 'Toe Wax',
      'Underarm Wax', 'Vajacial', 'Vajazzle',
    ],
  },
  {
    id: 'barber',
    label: 'Barber',
    services: [
      'Beard Trim', 'Buzz Cut', 'Design', 'Edge Up', 'Fade',
      'Hot Towel Service', 'Line Up', 'Mustache Trim', 'Razoring', 'Shave', 'Sideburn Shave',
    ],
  },
  {
    id: 'makeup',
    label: 'Makeup',
    services: [
      'Airbrush Application', 'Basic Makeup Application', 'Eyes Only', 'Face Painting',
      'False Lashes', 'Full Face Glam', 'Full Face Make-Up', 'Full Makeup Application',
      'One on One makeup lesson', 'Photoshoot Makeup', 'Prom Makeup',
      'Special Effects Makeup', 'Special Occasion Makeup',
    ],
  },
  {
    id: 'special-occasion-makeup',
    label: 'Special Occasion Makeup',
    services: [
      'Airbrush Application', 'Bridal Consultation', 'Bridal Makeup', 'Bridal Party',
      'Consultation', 'Makeup Application', 'Makeup Lesson', 'Travel Fee',
    ],
  },
  {
    id: 'manicure',
    label: 'Manicure',
    services: [
      'Acrylic Fill', 'Acrylic Nails', 'Acrylic Overlay', 'Gel Extension', 'Gel Fill',
      'Gel Manicure', 'Gel Overlay', 'Hand Paraffin treatment', 'Manicure + Pedicure',
      'Manicure - Buff / No Polish', 'Manicure - French', 'Manicure - Nail Art',
      'Manicure - Polish', 'Manicure - Soak Off / Removal', 'Nail Repair',
      'Polish Change', 'Sculpture Overlay', 'Shellac Manicure', 'Silk wraps',
      'Spa Manicure', 'Tip Overlay',
    ],
  },
  {
    id: 'pedicure',
    label: 'Pedicure',
    services: [
      'Callus Removal', 'Foot Paraffin treatment', 'Gel Extension', 'Gel Pedicure', 'Pedicure',
      'Pedicure - Buff / No Polish', 'Pedicure - French', 'Pedicure - Nail Art',
      'Pedicure - Polish', 'Pedicure - Soak-Off / Removal', 'Shellac Pedicure', 'Spa Pedicure',
    ],
  },
  {
    id: 'massage',
    label: 'Massage',
    services: [],
  },
  {
    id: 'wellness',
    label: 'Wellness',
    services: ['Acupuncture', 'Consultation', 'Cupping', 'Gua Sha/Spooning/Coining', 'Moxa / Moxabution', 'Travel Fee'],
  },
  {
    id: 'image-consulting',
    label: 'Image Consulting',
    services: ['Closet Audit', 'Fashion Consulting', 'Personal Shopping', 'Personal Styling'],
  },
  {
    id: 'pet-grooming',
    label: 'Pet Grooming',
    services: [],
  },
  {
    id: 'photography',
    label: 'Photography',
    services: [],
  },
  {
    id: 'tattooing',
    label: 'Tattooing',
    services: [],
  },
  {
    id: 'teeth-whitening',
    label: 'Teeth Whitening',
    services: [],
  },
  {
    id: 'travel-services',
    label: 'Travel Services',
    services: [],
  },
  {
    id: 'virtual',
    label: 'Virtual',
    services: [],
  },
  {
    id: 'diy',
    label: 'DIY',
    services: [
      'DIY Bang Trim', 'DIY Barrel Curls', 'DIY Blowout', 'DIY Braids', 'DIY Color',
      'DIY Consultation', 'DIY Deep Conditioning Treatment', 'DIY Eyebrow Shaping',
      'DIY Flat Iron', 'DIY Haircut', 'DIY Lashes', 'DIY Loc Maintenance', 'DIY Men\'s Cut',
      'DIY Nails', 'DIY Natural Flexi Rods', 'DIY Natural Style', 'DIY Neck Trim',
      'DIY Root Touch Up', 'DIY Roots', 'DIY Shampoo', 'DIY Skincare', 'DIY Skincare Consultation',
      'DIY Style', 'DIY Styling', 'DIY Trim', 'DIY Twist Out', 'DIY Twists',
      'DIY Wand Curls', "DIY Women's Cut", "DIY Women's Trim",
    ],
  },
  {
    id: 'at-home',
    label: 'At Home',
    services: [
      'At Home Bang Trim', 'At Home Barrel Curls', 'At Home Blowout', 'At Home Braids',
      'At Home Color', 'At Home Deep Conditioning Treatment', 'At Home Eyebrow Shaping',
      'At Home Flat Iron', 'At Home Haircut', 'At Home Lashes', 'At Home Loc Maintenance',
      "At Home Men's Cut", 'At Home Nails', 'At Home Natural Flexi Rods', 'At Home Natural Style',
      'At Home Neck Trim', 'At Home Root Touch Up', 'At Home Roots', 'At Home Shampoo',
      'At Home Skincare', 'At Home Skincare Consultation', 'At Home Style', 'At Home Styling',
      'At Home Trim', 'At Home Twist Out', 'At Home Twists', 'At Home Wand Curls',
      "At Home Women's Cut", "At Home Women's Trim",
    ],
  },
  {
    id: 'tutorial',
    label: 'Tutorial',
    services: [
      'Bang Trim Tutorial', 'Barrel Curls Tutorial', 'Blowout Tutorial', 'Braids Tutorial',
      'Color Tutorial', 'Deep Conditioning Treatment Tutorial', 'Eyebrow Shaping Tutorial',
      'Flat Iron Tutorial', 'Haircut Tutorial', 'Lashes Tutorial', 'Loc Maintenance Tutorial',
      "Men's Cut Tutorial", 'Nails Tutorial', 'Natural Flexi Rods Tutorial', 'Natural Style Tutorial',
      'Neck Trim Tutorial', 'Root Touch Up Tutorial', 'Roots Tutorial', 'Shampoo Tutorial',
      'Skincare Tutorial', 'Style Tutorial', 'Styling Tutorial', 'Trim Tutorial',
      'Twist Out Tutorial', 'Twists Tutorial', 'Wand Curls Tutorial',
      "Women's Cut Tutorial", "Women's Trim Tutorial",
    ],
  },
  {
    id: 'lesson',
    label: 'Lesson',
    services: [
      'Bang Trim Lesson', 'Barrel Curls Lesson', 'Blowout Lesson', 'Braids Lesson',
      'Color Lesson', 'Deep Conditioning Treatment Lesson', 'Eyebrow Shaping Lesson',
      'Flat Iron Lesson', 'Haircut Lesson', 'Lashes Lesson', 'Loc Maintenance Lesson',
      "Men's Cut Lesson", 'Nails Lesson', 'Natural Flexi Rods Lesson', 'Natural Style Lesson',
      'Neck Trim Lesson', 'Root Touch Up Lesson', 'Roots Lesson', 'Shampoo Lesson',
      'Skincare Lesson', 'Style Lesson', 'Styling Lesson', 'Trim Lesson',
      'Twist Out Lesson', 'Twists Lesson', 'Wand Curls Lesson',
      "Women's Cut Lesson", "Women's Trim Lesson",
    ],
  },
]

// Duration options (minutes) matching StyleSeat's picker
export const DURATION_OPTIONS: { label: string; value: number }[] = [
  { label: '5 Minutes', value: 5 },
  { label: '10 Minutes', value: 10 },
  { label: '15 Minutes', value: 15 },
  { label: '20 Minutes', value: 20 },
  { label: '25 Minutes', value: 25 },
  { label: '30 Minutes', value: 30 },
  { label: '35 Minutes', value: 35 },
  { label: '40 Minutes', value: 40 },
  { label: '45 Minutes', value: 45 },
  { label: '50 Minutes', value: 50 },
  { label: '55 Minutes', value: 55 },
  { label: '1 Hour', value: 60 },
  { label: '1 Hour 15 Minutes', value: 75 },
  { label: '1 Hour 30 Minutes', value: 90 },
  { label: '1 Hour 45 Minutes', value: 105 },
  { label: '2 Hours', value: 120 },
  { label: '2 Hours 30 Minutes', value: 150 },
  { label: '3 Hours', value: 180 },
  { label: '3 Hours 30 Minutes', value: 210 },
  { label: '4 Hours', value: 240 },
  { label: '4 Hours 30 Minutes', value: 270 },
  { label: '5 Hours', value: 300 },
  { label: '5 Hours 30 Minutes', value: 330 },
  { label: '6 Hours', value: 360 },
]

export function durationLabel(minutes: number): string {
  const opt = DURATION_OPTIONS.find((o) => o.value === minutes)
  if (opt) return opt.label
  if (minutes < 60) return `${minutes} Minutes`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} Hour${h > 1 ? 's' : ''} ${m} Minutes` : `${h} Hour${h > 1 ? 's' : ''}`
}
