# DESIGN SYSTEM — BEAUTY MARKETPLACE
# Le fichier qui donne à Claude le niveau visuel de Lovable/v0.
# Colle-le dans chaque session qui touche à l'UI.

---

## IDENTITÉ VISUELLE

```
Nom          : BeautyConnect
Feeling      : Premium · Dark · Visuel · Communauté
Références   : Instagram Dark + LinkedIn + Airbnb
Police       : SF Pro Display (iOS) / Roboto (Android) / Inter (Web)
Thème        : Dark mode par défaut (fond #0A0A0A)
Accent       : Coral #D85A30
```

---

## TOKENS — LA LOI DES VALEURS

### Couleurs
```typescript
// packages/config/src/tokens.ts

export const colors = {
  // Backgrounds — du plus sombre au plus clair
  bg: {
    base:    '#0A0A0A',   // fond principal de l'app
    surface: '#111111',   // cards, écrans
    elevated:'#1A1A1A',   // cards surélevées, modals
    input:   '#1E1E1E',   // champs de saisie
    border:  '#2A2A2A',   // séparateurs, bordures
    hover:   '#252525',   // états hover
  },

  // Brand
  brand: {
    primary:  '#D85A30',  // coral — CTA, accents, badges actifs
    light:    '#FF8C5A',  // coral clair — hover, gradients
    dark:     '#993C1D',  // coral foncé — pressed states
  },

  // Disponibilité — toujours ces couleurs, jamais d'autres
  availability: {
    now:        '#1D9E75',  // vert — disponible maintenant
    nowBg:      'rgba(29,158,117,0.15)',
    nowBorder:  'rgba(29,158,117,0.30)',
    today:      '#378ADD',  // bleu — disponible aujourd'hui
    todayBg:    'rgba(55,138,221,0.15)',
    todayBorder:'rgba(55,138,221,0.30)',
    weekend:    '#EF9F27',  // amber — ce weekend
    weekendBg:  'rgba(239,159,39,0.15)',
    none:       '#555555',  // gris — non disponible
  },

  // Sémantique
  semantic: {
    success: '#1D9E75',
    error:   '#E24B4A',
    warning: '#EF9F27',
    info:    '#378ADD',
  },

  // Texte
  text: {
    primary:   '#FFFFFF',
    secondary: '#888888',
    tertiary:  '#555555',
    disabled:  '#333333',
    inverse:   '#0A0A0A',
  },
} as const
```

### Espacement
```typescript
export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  '2xl': 32,
  '3xl': 48,
} as const
```

### Bordures
```typescript
export const radius = {
  sm:   8,   // chips, badges, inputs
  md:  12,   // cards secondaires
  lg:  16,   // cards principales
  xl:  20,   // modals, bottom sheets
  full: 999, // pills, avatars circulaires
} as const
```

### Typographie
```typescript
export const typography = {
  // Tailles
  size: {
    xs:   10,
    sm:   11,
    base: 12,
    md:   13,
    lg:   15,
    xl:   17,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
  },
  // Poids
  weight: {
    regular: '400',
    medium:  '500',
    semibold:'600',
    bold:    '700',
  },
  // Line heights
  leading: {
    tight:  1.2,
    normal: 1.5,
    relaxed:1.7,
  },
} as const
```

---

## COMPOSANTS — ANATOMIE EXACTE

### Button
```tsx
// 4 variants, toujours les mêmes
// primary  → bg coral, texte blanc
// secondary→ bg #1E1E1E, texte blanc, border #2A2A2A
// ghost    → transparent, texte coral, border coral 40%
// danger   → bg rouge 15%, texte rouge, border rouge 30%

<TouchableOpacity
  style={{
    height: 48,                        // hauteur fixe — jamais variable
    borderRadius: 14,
    backgroundColor: '#D85A30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  }}
  activeOpacity={0.8}                  // toujours 0.8, jamais 0.5 ou 1
>
  <Text style={{
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  }}>
    {label}
  </Text>
</TouchableOpacity>

// État loading → ActivityIndicator blanc à la place du texte
// État disabled → opacity: 0.4, pas de changement de couleur
```

### WorkerCard
```tsx
// Structure obligatoire — ne jamais dévier
<TouchableOpacity style={{
  backgroundColor: '#1A1A1A',
  borderRadius: 16,
  padding: 12,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
}}>

  {/* Avatar — toujours 44x44, borderRadius 14 */}
  <View style={{
    width: 44, height: 44,
    borderRadius: 14,
    backgroundColor: gradientFallback,  // si pas de photo
    overflow: 'hidden',
  }}>
    {photoUrl
      ? <Image source={{ uri: photoUrl }} style={{ width: 44, height: 44 }}/>
      : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
          {initials}
        </Text>
    }
  </View>

  {/* Infos — flex:1 pour prendre l'espace */}
  <View style={{ flex: 1 }}>
    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginBottom: 2 }}>
      {name}
    </Text>
    <Text style={{ color: '#888', fontSize: 10, marginBottom: 5 }}>
      {specialty} · {experienceYears} yrs
    </Text>
    <View style={{ flexDirection: 'row', gap: 4 }}>
      <AvailabilityBadge status={availability} />
      {specialties.slice(0,1).map(s => <SkillBadge key={s} label={s} />)}
    </View>
  </View>

  {/* Méta — distance + rating */}
  <View style={{ alignItems: 'flex-end', gap: 4 }}>
    <Text style={{ color: '#555', fontSize: 9 }}>{formatDistance(distanceMiles)}</Text>
    <RatingChip rating={rating} />
  </View>

</TouchableOpacity>
```

### AvailabilityBadge
```tsx
// Source de vérité pour les couleurs de disponibilité
const CONFIG = {
  NOW:          { label: 'Available now',     bg: 'rgba(29,158,117,.2)',  text: '#2DD4A0', dot: '#1D9E75' },
  TODAY:        { label: 'Available today',   bg: 'rgba(55,138,221,.2)',  text: '#60B4FF', dot: '#378ADD' },
  WEEKEND:      { label: 'This weekend',      bg: 'rgba(239,159,39,.2)',  text: '#FABC4E', dot: '#EF9F27' },
  NOT_AVAILABLE:{ label: 'Not available',     bg: 'rgba(85,85,85,.2)',    text: '#666',    dot: '#444'    },
}

// Rendu :
<View style={{
  flexDirection: 'row', alignItems: 'center', gap: 4,
  backgroundColor: config.bg,
  borderRadius: 20,
  paddingVertical: 3, paddingHorizontal: 8,
}}>
  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: config.dot }}/>
  <Text style={{ color: config.text, fontSize: 9, fontWeight: '600' }}>
    {config.label}
  </Text>
</View>
```

### Input
```tsx
<View>
  {label && (
    <Text style={{ color: '#888', fontSize: 11, fontWeight: '600',
                   marginBottom: 6, letterSpacing: 0.04 }}>
      {label.toUpperCase()}
    </Text>
  )}
  <TextInput
    style={{
      backgroundColor: '#1E1E1E',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 14,
      color: '#fff',
      borderWidth: 1,
      borderColor: isFocused ? '#D85A30' : error ? '#E24B4A' : '#2A2A2A',
    }}
    placeholderTextColor="#555"
    // toujours keyboardAppearance="dark" sur iOS
    keyboardAppearance="dark"
  />
  {error && (
    <Text style={{ color: '#E24B4A', fontSize: 10, marginTop: 4 }}>
      {error}
    </Text>
  )}
</View>
```

### BottomSheet (filtres, actions)
```tsx
// Toujours via @gorhom/bottom-sheet
// Background : #111, handle : #333
// Jamais de modal plein écran pour des actions secondaires

<BottomSheet
  backgroundStyle={{ backgroundColor: '#111', borderRadius: 24 }}
  handleIndicatorStyle={{ backgroundColor: '#333', width: 36 }}
  snapPoints={['40%', '80%']}
>
  <BottomSheetView style={{ padding: 20 }}>
    {content}
  </BottomSheetView>
</BottomSheet>
```

---

## PATTERNS D'ÉCRAN — RÈGLES DE LAYOUT

### Structure obligatoire d'un écran
```tsx
// Chaque écran suit exactement ce pattern
const Screen = () => (
  <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0A' }}>

    {/* Header — hauteur fixe 56px */}
    <View style={{ height: 56, paddingHorizontal: 16,
                   flexDirection: 'row', alignItems: 'center',
                   justifyContent: 'space-between' }}>
      <HeaderLeft />
      <HeaderTitle />
      <HeaderRight />
    </View>

    {/* Contenu scrollable */}
    <FlashList
      data={items}
      renderItem={renderItem}
      estimatedItemSize={72}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    />

    {/* CTA flottant si nécessaire */}
    <FloatingCTA />

  </SafeAreaView>
)

// FlashList obligatoire (jamais FlatList pour de vraies listes)
// paddingBottom: 100 pour ne pas être caché par la bottom nav
```

### Bottom Navigation
```tsx
// Toujours 4 onglets — jamais 3, jamais 5
// Discover · Jobs · Messages · Profile
// Hauteur : 60px + SafeArea bottom
// Fond : #111 avec borderTop #1E1E1E
// Icônes : Phosphor Icons (cohérent iOS + Android)
```

### Empty States
```tsx
// Obligatoire sur tous les écrans avec liste
// Jamais de texte seul — toujours icône + titre + sous-titre + CTA
<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
  <View style={{ width: 64, height: 64, borderRadius: 20,
                 backgroundColor: '#1E1E1E', alignItems: 'center',
                 justifyContent: 'center', marginBottom: 16 }}>
    <Icon name="search" size={28} color="#555" />
  </View>
  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
    No workers nearby
  </Text>
  <Text style={{ color: '#888', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
    Try increasing your search radius or checking back later.
  </Text>
</View>
```

### Skeleton Loaders
```tsx
// Obligatoire — jamais de spinner seul pour les listes
// Utiliser react-native-reanimated pour le shimmer
// Reproduire exactement la structure du composant réel

const WorkerCardSkeleton = () => (
  <View style={{ backgroundColor: '#1A1A1A', borderRadius: 16,
                 padding: 12, flexDirection: 'row', gap: 10 }}>
    <ShimmerBox style={{ width: 44, height: 44, borderRadius: 14 }} />
    <View style={{ flex: 1, gap: 6 }}>
      <ShimmerBox style={{ height: 12, width: '60%', borderRadius: 6 }} />
      <ShimmerBox style={{ height: 10, width: '40%', borderRadius: 5 }} />
      <ShimmerBox style={{ height: 18, width: '30%', borderRadius: 9 }} />
    </View>
  </View>
)
// Afficher 4-5 skeletons empilés pendant le chargement
```

---

## ANIMATIONS — RÈGLES

```typescript
// Bibliothèque : react-native-reanimated 3 (jamais Animated API native)

// Durées standard
const DURATION = {
  fast:   150,  // feedback immédiat (press, toggle)
  normal: 250,  // transitions d'état
  slow:   400,  // entrées d'écran, modals
}

// Courbes standard
const EASING = {
  standard: Easing.bezier(0.4, 0, 0.2, 1),  // Material standard
  decelerate: Easing.bezier(0, 0, 0.2, 1),  // entrées
  accelerate: Easing.bezier(0.4, 0, 1, 1),  // sorties
}

// Règles :
// ✅ FadeIn sur les listes au chargement (staggered par item)
// ✅ Spring sur les BottomSheets
// ✅ Scale 0.97 sur les press (activeOpacity: 0.8)
// ❌ Jamais d'animation > 400ms
// ❌ Jamais d'animation sur les listes longues (perf)
// ❌ Jamais de flip, rotate, ou effets 3D
```

---

## NAVIGATION — EXPO ROUTER

```typescript
// Structure des routes
app/
├── (auth)/
│   ├── login.tsx
│   ├── register.tsx
│   └── role-select.tsx
├── (tabs)/
│   ├── _layout.tsx      ← bottom tabs config
│   ├── index.tsx        ← Discover
│   ├── jobs.tsx         ← Jobs feed
│   ├── messages.tsx     ← Conversations
│   └── profile.tsx      ← Mon profil
├── worker/
│   └── [id].tsx         ← Profil worker
├── salon/
│   └── [id].tsx         ← Profil salon
├── job/
│   └── [id].tsx         ← Détail job post
└── chat/
    └── [id].tsx         ← Conversation

// Transitions : slide pour push, fade pour modals
// Jamais de navigation sans animation
```

---

## RÈGLES ANTI "AI LOOK"

Ce qui rend un UI généré par IA reconnaissable (à éviter absolument) :

```
❌ Fond blanc avec cartes grises légères
❌ Couleurs trop saturées façon Material You par défaut
❌ Border radius uniforme partout (8px sur tout)
❌ Padding identique partout (16px sur tout)
❌ Icônes Material Design mélangées avec SF Symbols
❌ Texte trop petit pour compenser le manque de hiérarchie
❌ Boutons pleine largeur sur TOUS les écrans
❌ Séparateurs <hr> entre chaque élément de liste
❌ Loading spinner centré dans un écran vide
❌ Couleur primaire utilisée sur plus de 20% des éléments
```

Ce qui fait un UI premium :
```
✅ Dark mode avec profondeur (3 niveaux de fond distincts)
✅ Typographie avec hiérarchie forte (gros titres / petits détails)
✅ Espacement généreux et intentionnel (pas uniforme)
✅ Couleur accent utilisée avec parcimonie (CTA + statut actif)
✅ Images et avatars qui dominent visuellement
✅ Micro-interactions sur chaque touch (opacity, scale)
✅ Skeleton qui reproduit exactement la structure réelle
✅ Empty states soignés avec illustration et action claire
✅ Bottom sheets plutôt que modals pour actions secondaires
```

---

## FORMAT DE TÂCHE UI — COPIER-COLLER

```
DESIGN SYSTEM : [colle ce fichier ou indique qu'il est dans le contexte]
REGISTRE : [registre actuel]

TÂCHE UI :
Créer [NomEcran] sur [mobile | web | les deux]

ÉCRAN : [description de ce que l'écran fait]
DONNÉES : [quelles données sont affichées — depuis quel hook/endpoint]
INTERACTIONS : [liste des actions possibles]

RÈGLES VISUELLES :
- Fond : #0A0A0A (base) / #1A1A1A (cards)
- Police : SF Pro Display
- Accent : #D85A30
- Respecter les composants existants du registre
- Skeleton loader obligatoire
- Empty state obligatoire si liste

NE PAS CRÉER : [liste des composants existants à réutiliser]
```

---

## LIBRAIRIES UI AUTORISÉES — LISTE EXHAUSTIVE

```
Navigation      : expo-router
Listes perfs    : @shopify/flash-list
Bottom sheets   : @gorhom/bottom-sheet
Animations      : react-native-reanimated 3
Gestes          : react-native-gesture-handler
Images          : expo-image (cache auto, blurhash)
Icônes          : @phosphor-icons/react-native
Media picker    : expo-image-picker
Vidéo           : expo-video
Skeletons       : react-native-skeleton-placeholder OU reanimated custom
Haptics         : expo-haptics (feedback tactile sur actions importantes)

❌ Jamais : NativeBase, React Native Paper, React Native Elements
   (trop opinionated, difficile à customiser au niveau voulu)
❌ Jamais : react-native-vector-icons (utiliser @phosphor-icons)
❌ Jamais : Lottie pour des animations simples (overkill)
```

---

*Ce fichier + MASTER_PROMPT + CONVENTIONS + GUARDIAN
= Claude produit du code UI au niveau Lovable/v0 à chaque session.*
