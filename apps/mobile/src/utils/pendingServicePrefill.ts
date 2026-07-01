// Used to hand off a pre-fill from ServiceCatalogScreen back to ManageServicesScreen
// after router.back(), without needing a global store.

interface Prefill {
  name: string
  category: string
  isAddOn?: boolean
}

let _pending: Prefill | null = null

export const pendingServicePrefill = {
  set: (d: Prefill) => { _pending = d },
  consume: (): Prefill | null => { const v = _pending; _pending = null; return v },
}
