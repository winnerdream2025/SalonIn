export const BEAUTY_PROFESSIONALS: Record<string, string[]> = {
  'Hair': [
    'Hairstylist',
    'Colorist',
    'Braider',
    'Barber',
    'Natural Hair Specialist',
    'Loc Technician',
    'Wig Specialist',
    'Extension Specialist',
  ],
  'Nails': [
    'Nail Technician',
    'Nail Artist',
    'Pedicurist',
  ],
  'Esthetics': [
    'Esthetician',
    'Waxing Specialist',
    'Lash Technician',
    'Brow Specialist',
    'Microblading Artist',
  ],
  'Spa & Wellness': [
    'Massage Therapist',
    'Skincare Specialist',
    'Body Treatment Specialist',
  ],
  'Makeup': [
    'Makeup Artist',
    'Bridal Specialist',
    'Editorial/Fashion MUA',
    'Airbrush Specialist',
  ],
  'Management': [
    'Salon Manager',
    'Front Desk Receptionist',
    'Salon Assistant',
    'Salon Coordinator',
  ],
  'Other': [],
}

export const ALL_PROFESSIONALS = Object.values(BEAUTY_PROFESSIONALS).flat()

export const PROFESSIONAL_CATEGORIES = Object.keys(BEAUTY_PROFESSIONALS)
