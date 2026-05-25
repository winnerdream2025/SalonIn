# CONVENTIONS DE CODE — BEAUTY MARKETPLACE
> Ajoute ce fichier à ton master prompt OU colle-le après.
> Claude doit respecter ces règles AVANT d'écrire la moindre ligne.

---

## RÈGLE 0 — AVANT DE CRÉER QUOI QUE CE SOIT

Avant de créer un composant, hook, service ou util, Claude doit :
1. Vérifier si quelque chose d'équivalent existe déjà (te demander si nécessaire)
2. Étendre l'existant plutôt que d'en créer un nouveau
3. Justifier si une nouvelle abstraction est vraiment nécessaire

---

## NOMMAGE — LA LOI

### Fichiers
```
PascalCase   →  composants React         WorkerCard.tsx
camelCase    →  hooks, utils, services   useWorkerFeed.ts, formatDistance.ts
kebab-case   →  dossiers                 worker-profile/, job-posts/
UPPER_SNAKE  →  constantes               MILES_TO_METERS, MAX_RADIUS
```

### Variables & fonctions
```typescript
// ✅ Verbes clairs pour les fonctions
getWorkerById()       // lecture simple
findNearbyWorkers()   // recherche avec critères
createJobPost()       // création
updateAvailability()  // mise à jour
deleteAccount()       // suppression

// ❌ Jamais
fetchWorker()         // fetch = HTTP, pas logique métier
workerData()          // data n'apporte rien
handleWorker()        // trop vague
```

### Composants UI
```typescript
// ✅ Nom = ce que c'est, pas ce qu'il fait
WorkerCard            // une carte affichant un worker
AvailabilityBadge     // un badge de disponibilité
JobPostItem           // un élément de liste de job
SalonHeader           // header d'un profil salon

// ❌ Jamais
WorkerProfileCard     // redondant (Card suffit)
WorkerListItem        // trop générique
WorkerComponent       // inutile
```

### Props
```typescript
// ✅ Cohérence absolue sur les props communes
interface CardProps {
  onPress: () => void        // mobile — toujours onPress
  onClick: () => void        // web — toujours onClick
  isLoading: boolean         // toujours is + adjectif
  isDisabled: boolean
  size: 'sm' | 'md' | 'lg'  // toujours size, jamais variant pour la taille
  variant: 'default' | 'outlined' | 'ghost'  // toujours variant pour le style
}

// ❌ Jamais mélanger
onTap / onTouch / handlePress   // choisir onPress et tenir
loading / isFetching / pending  // choisir isLoading et tenir
```

---

## COMPOSANTS UI — HIÉRARCHIE STRICTE

```
packages/ui/src/
├── primitives/          # Atomes — jamais de logique métier
│   ├── Button.tsx
│   ├── Text.tsx
│   ├── Avatar.tsx
│   ├── Badge.tsx
│   ├── Input.tsx
│   └── Divider.tsx
│
├── components/          # Molécules — composent les primitives
│   ├── WorkerCard.tsx
│   ├── SalonCard.tsx
│   ├── JobPostCard.tsx
│   ├── AvailabilityBadge.tsx
│   ├── PortfolioGrid.tsx
│   └── MessageBubble.tsx
│
├── layouts/             # Organismes — layout et navigation
│   ├── ScreenLayout.tsx
│   ├── FeedLayout.tsx
│   └── ProfileLayout.tsx
│
└── index.ts             # Export centralisé — TOUJOURS importer depuis ici
```

### Règle des composants partagés
```typescript
// ✅ Toujours importer depuis le package
import { WorkerCard, Button, Avatar } from '@beauty/ui'

// ❌ Jamais importer en chemin relatif entre apps
import { WorkerCard } from '../../packages/ui/src/WorkerCard'
import { Button } from '../components/Button'
```

### Anatomie d'un composant partagé
```typescript
// packages/ui/src/components/WorkerCard.tsx

import { View, Text, Pressable } from 'react-native'
import { Avatar } from '../primitives/Avatar'
import { AvailabilityBadge } from './AvailabilityBadge'
import type { WorkerProfile } from '@beauty/types'

// Props explicites et typées — jamais de spreading incontrôlé
interface WorkerCardProps {
  worker: WorkerProfile
  distanceMiles?: number
  onPress: () => void
  isLoading?: boolean
}

// Export nommé — jamais export default dans packages/ui
export const WorkerCard = ({
  worker,
  distanceMiles,
  onPress,
  isLoading = false,
}: WorkerCardProps) => {
  if (isLoading) return <WorkerCardSkeleton />

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-xl p-4 border border-gray-100 active:opacity-80"
    >
      <View className="flex-row items-center gap-3">
        <Avatar uri={worker.photoUrl} size="md" fallback={worker.name[0]} />
        <View className="flex-1">
          <Text className="font-semibold text-base text-gray-900">
            {worker.name}
          </Text>
          <Text className="text-sm text-gray-500">
            {worker.specialties[0]}
            {distanceMiles != null && ` · ${distanceMiles.toFixed(1)} mi`}
          </Text>
        </View>
        <AvailabilityBadge status={worker.availability} />
      </View>
    </Pressable>
  )
}

// Skeleton intégré dans le même fichier
const WorkerCardSkeleton = () => (
  <View className="bg-white rounded-xl p-4 border border-gray-100">
    <View className="flex-row items-center gap-3">
      <View className="w-10 h-10 rounded-full bg-gray-200" />
      <View className="flex-1 gap-2">
        <View className="h-4 bg-gray-200 rounded w-32" />
        <View className="h-3 bg-gray-200 rounded w-20" />
      </View>
    </View>
  </View>
)
```

---

## HOOKS — PATTERN OBLIGATOIRE

```typescript
// apps/mobile/src/hooks/useWorkerFeed.ts
// apps/web/src/hooks/useWorkerFeed.ts
// MÊME interface, même logique — juste l'import du router differ

import { useQuery } from '@tanstack/react-query'
import { workersApi } from '@beauty/api-client'
import type { FindNearbyWorkersDto } from '@beauty/types'

// Clés de query centralisées — jamais de string inline
export const workerQueryKeys = {
  all: ['workers'] as const,
  nearby: (params: FindNearbyWorkersDto) =>
    ['workers', 'nearby', params] as const,
  profile: (id: string) => ['workers', id] as const,
}

export const useNearbyWorkers = (params: FindNearbyWorkersDto) => {
  return useQuery({
    queryKey: workerQueryKeys.nearby(params),
    queryFn: () => workersApi.findNearby(params),
    staleTime: 60_000,        // 60s — cohérent avec le cache Redis
    enabled: !!params.cityId, // jamais de requête sans cityId
  })
}
```

---

## STATE MANAGEMENT — DÉCISION TREE

```
Donnée vient du serveur ?
  → OUI → React Query (useQuery / useMutation)
          Jamais de useState pour stocker une réponse API

Donnée est locale à UN composant ?
  → OUI → useState

Donnée est partagée entre plusieurs composants ?
  → OUI → Zustand store
          1 store par domaine métier (workerStore, authStore, locationStore)
          Jamais de store global "appStore" fourre-tout
```

```typescript
// packages/stores/src/locationStore.ts
import { create } from 'zustand'

interface LocationStore {
  cityId: string | null
  lat: number | null
  lng: number | null
  setCityId: (cityId: string) => void
  setLocation: (lat: number, lng: number) => void
}

export const useLocationStore = create<LocationStore>((set) => ({
  cityId: null,
  lat: null,
  lng: null,
  setCityId: (cityId) => set({ cityId }),
  setLocation: (lat, lng) => set({ lat, lng }),
}))
```

---

## UTILS — CATALOGUE COMPLET (NE PAS RECRÉER)

```typescript
// packages/utils/src/geo.ts
export const MILES_TO_METERS = 1609.344  // constante officielle — une seule fois
export const milesToMeters = (miles: number) => miles * MILES_TO_METERS
export const metersToMiles = (meters: number) => meters / MILES_TO_METERS
export const formatDistance = (miles: number): string => {
  if (miles < 0.1) return 'Less than 0.1 mi'
  if (miles < 10) return `${miles.toFixed(1)} mi`
  return `${Math.round(miles)} mi`
}

// packages/utils/src/availability.ts
export const AVAILABILITY_LABELS: Record<Availability, string> = {
  NOW: 'Available now',
  TODAY: 'Available today',
  WEEKEND: 'Available this weekend',
  NOT_AVAILABLE: 'Not available',
}
export const AVAILABILITY_COLORS: Record<Availability, string> = {
  NOW: 'text-green-600',
  TODAY: 'text-blue-600',
  WEEKEND: 'text-amber-600',
  NOT_AVAILABLE: 'text-gray-400',
}

// packages/utils/src/format.ts
export const formatSalary = (value: string): string => ...
export const formatExperience = (years: number): string =>
  years === 0 ? 'New pro' :
  years === 1 ? '1 year exp.' :
  `${years} years exp.`

// packages/utils/src/date.ts
export const isJobExpired = (expiresAt: Date): boolean =>
  new Date(expiresAt) < new Date()
export const formatRelativeDate = (date: Date): string => ...
```

---

## TYPES PARTAGÉS — SOURCE DE VÉRITÉ

```typescript
// packages/types/src/index.ts — tout exporter depuis ici

// Re-export des types Prisma enrichis
export type { WorkerProfile, SalonProfile, JobPost, Message } from '@prisma/client'

// Types UI (pas dans Prisma)
export interface WorkerCardData {
  id: string
  name: string
  photoUrl: string | null
  specialties: string[]
  availability: Availability
  distanceMiles?: number
  rating?: number
  jobsCompleted: number
}

// DTOs partagés API ↔ client
export interface FindNearbyWorkersDto {
  lat: number
  lng: number
  radiusMiles: number
  cityId: string
  specialty?: string
  availability?: Availability
  employmentType?: EmploymentType
}

// Réponses API typées
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    cursor: string | null
    hasMore: boolean
  }
}
```

---

## COMMENT DEMANDER DU CODE À CLAUDE

### Format de tâche optimal
```
CONTEXTE EXISTANT :
- Composants dispo : WorkerCard, SalonCard, AvailabilityBadge (dans @beauty/ui)
- Hooks dispo : useNearbyWorkers, useLocationStore
- Types : WorkerProfile, FindNearbyWorkersDto (dans @beauty/types)

TÂCHE :
Créer l'écran WorkerFeedScreen pour mobile qui :
- Affiche la liste des workers via useNearbyWorkers
- Utilise WorkerCard pour chaque item
- Gère le state loading/empty/error
- Ne recrée aucun composant existant

CONTRAINTES :
- React Native + NativeWind
- Importer depuis @beauty/ui et @beauty/types
- Pagination cursor-based
```

### Ce que Claude fera correctement avec ce contexte
- Il utilisera `WorkerCard` au lieu d'en créer un nouveau
- Il importera depuis `@beauty/ui` et non en chemin relatif
- Il utilisera `useNearbyWorkers` au lieu de faire son propre fetch
- Il respectera les conventions de nommage définies

---

## CHECKLIST AVANT CHAQUE PR

Claude doit valider ces points avant de finaliser du code :

- [ ] Aucun composant recréé qui existe dans `packages/ui`
- [ ] Tous les imports entre apps passent par les alias `@beauty/*`
- [ ] Aucune logique utilitaire dupliquée (geo, format, date)
- [ ] Types définis dans `packages/types`, jamais dans une app
- [ ] State server = React Query, UI global = Zustand, local = useState
- [ ] `cityId` présent sur toutes les requêtes de données locales
- [ ] Nommage cohérent avec les conventions de ce fichier
- [ ] Skeleton loader intégré dans le composant (pas séparé)
