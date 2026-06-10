export type PayType =
  | 'COMMISSION'
  | 'BOOTH_RENTAL'
  | 'CHAIR_RENTAL'
  | 'SUITE_RENTAL'
  | 'HOURLY'
  | 'SALARY'
  | 'DAILY'
  | 'WEEKLY'
  | 'CUSTOM'

export const PAY_TYPES: { value: PayType; label: string; description: string }[] = [
  { value: 'COMMISSION',    label: 'Commission',    description: 'Percentage split on services' },
  { value: 'BOOTH_RENTAL',  label: 'Booth Rental',  description: 'Rent a booth in the salon' },
  { value: 'CHAIR_RENTAL',  label: 'Chair Rental',  description: 'Rent a styling chair' },
  { value: 'SUITE_RENTAL',  label: 'Suite Rental',  description: 'Rent a private suite' },
  { value: 'HOURLY',        label: 'Hourly',        description: 'Paid per hour worked' },
  { value: 'SALARY',        label: 'Salary',        description: 'Fixed salary pay' },
  { value: 'DAILY',         label: 'Daily Rate',    description: 'Paid per day' },
  { value: 'WEEKLY',        label: 'Weekly Rate',   description: 'Paid per week' },
  { value: 'CUSTOM',        label: 'Custom',        description: 'Custom pay arrangement' },
]

export const COMMISSION_SPLITS = [
  { value: 50, label: '50/50', sub: 'Even split' },
  { value: 55, label: '55/45', sub: 'You keep 55%' },
  { value: 60, label: '60/40', sub: 'You keep 60%' },
  { value: 65, label: '65/35', sub: 'You keep 65%' },
  { value: 70, label: '70/30', sub: 'You keep 70%' },
  { value: 75, label: '75/25', sub: 'You keep 75%' },
]

export type RentalFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'

export const RENTAL_FREQUENCIES: { value: RentalFrequency; label: string }[] = [
  { value: 'DAILY',   label: 'Per day' },
  { value: 'WEEKLY',  label: 'Per week' },
  { value: 'MONTHLY', label: 'Per month' },
]

export function buildPayString(opts: {
  payType: PayType
  commissionSplit?: number
  rate?: string
  rentalFrequency?: RentalFrequency
  customText?: string
}): string {
  switch (opts.payType) {
    case 'COMMISSION':
      return opts.commissionSplit
        ? `${opts.commissionSplit}/${100 - opts.commissionSplit} Commission`
        : 'Commission'
    case 'BOOTH_RENTAL':
    case 'CHAIR_RENTAL':
    case 'SUITE_RENTAL': {
      const typeLabel =
        opts.payType === 'BOOTH_RENTAL' ? 'Booth'
        : opts.payType === 'CHAIR_RENTAL' ? 'Chair'
        : 'Suite'
      const freq = RENTAL_FREQUENCIES.find((f) => f.value === opts.rentalFrequency)?.label ?? ''
      return opts.rate ? `$${opts.rate} ${freq} – ${typeLabel} Rental`.trim() : `${typeLabel} Rental`
    }
    case 'HOURLY':
      return opts.rate ? `$${opts.rate}/hr` : 'Hourly'
    case 'SALARY':
      return opts.rate ? `$${opts.rate}/yr` : 'Salary'
    case 'DAILY':
      return opts.rate ? `$${opts.rate}/day` : 'Daily Rate'
    case 'WEEKLY':
      return opts.rate ? `$${opts.rate}/wk` : 'Weekly Rate'
    case 'CUSTOM':
      return opts.customText?.trim() || 'Pay TBD'
  }
}
