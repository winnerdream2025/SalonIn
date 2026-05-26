# SALONIN — COMPLETE UI SYSTEM
# Version 2.0 — Luxury · Precise · Zero AI fingerprint
# Every detail. Every state. Every interaction.
# This file is the law for all UI work.

---

## BRAND IDENTITY

```
Name         : Salonin
Logo mark    : "Salon" [theme primary] + "in" [#D85A30 always]
Feeling      : Luxury · Editorial · Community · Confident
Reference    : The Row meets LinkedIn — clean, intentional, premium
NOT          : Corporate SaaS / Generic marketplace / Cluttered dashboard
```

---

## THE TWO MODES — PRECISE TOKENS

### Dark Mode (default)
```typescript
export const dark = {
  // 5 background levels — never skip levels
  bg: {
    app:      '#080808',  // absolute base — StatusBar, SafeAreaView
    screen:   '#0F0F0F',  // screen background
    card:     '#161616',  // cards, list items
    elevated: '#1E1E1E',  // modals, sheets, inputs
    overlay:  '#252525',  // hover states, pressed
  },
  // Borders — always 0.5px
  border: {
    subtle:  'rgba(255,255,255,0.06)',  // barely visible separation
    default: 'rgba(255,255,255,0.10)',  // standard card border
    strong:  'rgba(255,255,255,0.18)',  // emphasis, focused inputs
  },
  // Text — 4 levels
  text: {
    primary:   '#FFFFFF',
    secondary: '#9A9A9A',
    tertiary:  '#5A5A5A',
    disabled:  '#363636',
    inverse:   '#080808',
  },
} as const
```

### Light Mode
```typescript
export const light = {
  bg: {
    app:      '#FFFFFF',
    screen:   '#F7F6F3',  // warm white — not cold gray
    card:     '#FFFFFF',
    elevated: '#FFFFFF',
    overlay:  '#F2F1EE',
  },
  border: {
    subtle:  'rgba(0,0,0,0.05)',
    default: 'rgba(0,0,0,0.09)',
    strong:  'rgba(0,0,0,0.15)',
  },
  text: {
    primary:   '#0F0F0F',
    secondary: '#6B6B6B',
    tertiary:  '#ABABAB',
    disabled:  '#D0D0D0',
    inverse:   '#FFFFFF',
  },
} as const
```

### Brand — identical in both modes
```typescript
export const brand = {
  primary:   '#D85A30',   // coral — CTAs, active states, accents
  light:     '#E8734E',   // hover
  dark:      '#B84820',   // pressed
  ghost:     'rgba(216,90,48,0.12)',  // ghost bg dark
  ghostLight:'rgba(216,90,48,0.08)',  // ghost bg light
  white:     '#FFFFFF',   // text on brand bg always white
}

// Availability — identical both modes (colored pills adapt via opacity)
export const avail = {
  now:     { solid:'#1D9E75', text:'#2DD4A0', bg:'rgba(29,158,117,0.15)',  border:'rgba(29,158,117,0.25)' },
  today:   { solid:'#378ADD', text:'#60B4FF', bg:'rgba(55,138,221,0.15)',  border:'rgba(55,138,221,0.25)' },
  weekend: { solid:'#EF9F27', text:'#FABC4E', bg:'rgba(239,159,39,0.15)',  border:'rgba(239,159,39,0.25)' },
  none:    { solid:'#555555', text:'#777777', bg:'rgba(85,85,85,0.12)',    border:'rgba(85,85,85,0.20)'   },
} as const
```

---

## TYPOGRAPHY — EVERY LEVEL

```typescript
export const type = {
  // Sizes — iOS SF Pro / Android Roboto / Web Inter
  size: {
    '2xs': 10,
    xs:    11,
    sm:    12,
    base:  13,
    md:    14,
    lg:    16,
    xl:    18,
    '2xl': 22,
    '3xl': 28,
    '4xl': 34,
  },
  weight: {
    regular:  '400' as const,
    medium:   '500' as const,
    semibold: '600' as const,
    bold:     '700' as const,
    black:    '800' as const,
  },
  tracking: {
    tight:  -0.5,
    normal:  0,
    wide:    0.3,
    widest:  0.8,
  },
  leading: {
    none:    1.0,
    tight:   1.2,
    snug:    1.35,
    normal:  1.5,
    relaxed: 1.65,
  },
}
```

---

## SPACING & GEOMETRY

```typescript
export const space = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48,
}

export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl':24,
  full: 9999,
}

// Touch targets — ALWAYS minimum 44pt per Apple HIG
export const MIN_TOUCH = 44
```

---

## SAFE AREA & BOTTOM NAV — PHONE ADAPTATION

```typescript
// Critical — every screen must handle this
// useSafeAreaInsets() from react-native-safe-area-context

const Screen = () => {
  const insets = useSafeAreaInsets()

  // Bottom padding = max(insets.bottom, 16) + tabBarHeight if has tabs
  // Phones with no home button (iPhone X+, most Android 2022+):
  //   insets.bottom ≈ 34pt
  // Phones with hardware nav bar (older Android):
  //   insets.bottom ≈ 0 (system bar is outside app)
  // Phones with gesture nav (Android 10+):
  //   insets.bottom ≈ 16–24pt

  return (
    <View style={{
      flex: 1,
      paddingTop: insets.top,
      paddingBottom: Math.max(insets.bottom, 16),
    }}>
      ...
    </View>
  )
}

// Tab bar height accounts for safe area
const TAB_BAR_HEIGHT = 56  // icon + label area
// Total tab bar visual = TAB_BAR_HEIGHT + insets.bottom
// Content must pad by this total to avoid being hidden

// ScrollView content: always
contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 16 }}
```

---

## OVERFLOW & TEXT TRUNCATION — ZERO TOLERANCE

```typescript
// Every text that could overflow MUST have:
// numberOfLines + ellipsizeMode

// Worker name in card
<Text numberOfLines={1} ellipsizeMode="tail">
  {worker.name}
</Text>

// Bio or description
<Text numberOfLines={2} ellipsizeMode="tail">
  {worker.bio}
</Text>

// Salon name in job post header
<Text numberOfLines={1} ellipsizeMode="tail" style={{ flex: 1 }}>
  {job.salonName}
</Text>

// RULE: any Text inside a flex container with fixed width
// MUST have flex: 1 OR maxWidth AND numberOfLines
// Never allow a sibling to be pushed off screen

// Card row pattern — always safe
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
  <Avatar size={44} />           // fixed width
  <View style={{ flex: 1, minWidth: 0 }}>  // ← minWidth: 0 critical
    <Text numberOfLines={1}>{name}</Text>
    <Text numberOfLines={1}>{spec}</Text>
  </View>
  <View style={{ flexShrink: 0 }}>  // fixed right side
    <Text>{distance}</Text>
  </View>
</View>
```

---

## INTERACTION STATES — EVERY TOUCH

```typescript
// Pressable — always use this, not TouchableOpacity
<Pressable
  onPress={onPress}
  style={({ pressed }) => ({
    opacity: pressed ? 0.75 : 1,
    transform: [{ scale: pressed ? 0.985 : 1 }],
    // transition via Reanimated for smoothness
  })}
>

// With Reanimated (preferred for cards)
const scale = useSharedValue(1)
const animStyle = useAnimatedStyle(() => ({
  transform: [{ scale: withTiming(scale.value, { duration: 120 }) }],
}))
const onPressIn = () => { scale.value = 0.97 }
const onPressOut = () => { scale.value = 1.0 }

// Haptics — always on primary actions
import * as Haptics from 'expo-haptics'

// Light: card tap, filter select
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

// Medium: send message, apply to job, toggle availability
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

// Heavy: destructive action confirm, report submit
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)

// Success notification: job applied, message sent
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
```

---

## NAVIGATION FLOW — COMPLETE

```
AUTH FLOW
─────────
/              → check auth → redirect
/(auth)/login  → email + password → /(tabs)
/(auth)/register → role select → name/email/pass → /(tabs)
/(auth)/role-select → picker → register

WORKER FLOW
───────────
/(tabs)/          DiscoveryFeedScreen
  → /worker/[id]  WorkerProfileScreen (public)
  → /chat/[id]    ChatScreen

/(tabs)/jobs      JobFeedScreen
  → /jobs/[id]    JobDetailScreen (full)

/(tabs)/messages  ConversationsListScreen
  → /chat/[id]    ChatScreen

/(tabs)/profile   WorkerOwnProfileScreen
  → /worker/edit  EditProfileScreen
  → /worker/portfolio  PortfolioUploadScreen
  → /onboarding   (if profile incomplete)

SALON FLOW
──────────
/(tabs)/          DiscoveryFeedScreen (browse workers)
/(tabs)/jobs      JobFeedScreen (own posts)
  → /jobs/create  CreateJobPostScreen
  → /jobs/[id]    JobDetailScreen

/(tabs)/messages  ConversationsListScreen
/(tabs)/profile   SalonOwnProfileScreen
  → /salon/edit   SalonEditScreen
  → /jobs/create  CreateJobPostScreen

SHARED
──────
/salon/[id]     SalonProfileScreen (public)
/worker/[id]    WorkerProfileScreen (public)
/onboarding     OnboardingScreen (first time worker)
```

---

## SCREEN TEMPLATES — EXACT STRUCTURE

### Standard Screen (no tabs)
```tsx
const StandardScreen = () => {
  const insets = useSafeAreaInsets()
  const { theme } = useTheme()

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg.screen }}>
      {/* Header — always 56pt content + status bar inset */}
      <View style={{
        paddingTop: insets.top,
        backgroundColor: theme.bg.screen,
        borderBottomWidth: 0.5,
        borderBottomColor: theme.border.subtle,
      }}>
        <View style={{
          height: 56,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <BackButton />
          <HeaderTitle numberOfLines={1} />
          <HeaderAction />
        </View>
      </View>

      {/* Content */}
      <FlashList
        data={items}
        renderItem={renderItem}
        estimatedItemSize={80}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 8,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
        }}
      />
    </View>
  )
}
```

### Tab Screen
```tsx
const TabScreen = () => {
  const insets = useSafeAreaInsets()
  const { theme } = useTheme()
  // No paddingTop needed — tab navigator handles it

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg.screen }}>
      {/* Sticky top bar (search, filters) */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <SearchBar />
        <FilterChips />
      </View>

      <FlashList
        contentContainerStyle={{
          paddingHorizontal: 16,
          // TAB_BAR_HEIGHT + insets.bottom clears the tab bar
          paddingBottom: 56 + insets.bottom + 16,
        }}
      />
    </View>
  )
}
```

---

## LOGIN SCREEN — EXACT SPEC (VALIDATED DESIGN)

```tsx
// Keep the current design. Exact spec for reproduction:

// Background: theme.bg.screen (dark: #0F0F0F, light: #F7F6F3)
// No decorative elements — pure typography focus

// Layout (vertical, centered, paddingHorizontal: 24):
//
// [STATUS BAR]
// [safe area top]
//
// ── top section ──────────────────────── flex: 1 justify: flex-end
//   Logo mark (Salonin, 28px, weight 800, letterSpacing: -0.8)
//   "Salon" in theme.text.primary + "in" in #D85A30
//   Space: 8pt
//   Tagline: "Your beauty career, connected."
//   13px, theme.text.secondary, weight 400
//
// ── form section ─────────────────────── marginTop: 48
//   Label: "Email"
//   10px, theme.text.tertiary, weight 600, letterSpacing: 0.6, uppercase
//   Space: 8pt
//   Input (email)
//   Space: 16pt
//   Label: "Password"
//   Space: 8pt
//   Input (password, secureTextEntry)
//   Space: 8pt
//   "Forgot password?" — right aligned
//   12px, #D85A30, weight 500
//
// ── CTA ──────────────────────────────── marginTop: 32
//   Button primary full-width "Sign in"
//   Height: 52pt (slightly taller than standard for primary CTA)
//
// ── footer ───────────────────────────── marginTop: 24, marginBottom: insets.bottom + 16
//   "Don't have an account?" + "Create one" link
//   13px center, secondary + #D85A30

// Input spec:
// height: 52pt
// backgroundColor: theme.bg.elevated
// borderWidth: 1, borderColor: theme.border.default
// borderRadius: 12
// paddingHorizontal: 16
// fontSize: 15, color: theme.text.primary
// focus: borderColor = #D85A30
// error: borderColor = #E24B4A, error text below 11px #E24B4A
// keyboardAppearance: theme matches system
```

---

## CREATE ACCOUNT SCREEN — EXACT SPEC (VALIDATED DESIGN)

```tsx
// Same visual language as login.
// 3 screens in a flow — progress indicator at top

// STEP 1 — Role selection
// ─────────────────────────────────────────
// Back button top left
// Progress: 3 dots — active dot = #D85A30, inactive = theme.border.default
//
// Title: "I am a..." 28px weight 800 letterSpacing: -0.8
// Subtitle: "Choose how you'll use Salonin" 14px secondary
//
// Two cards, full width, stacked:
// ┌─────────────────────────────────────┐
// │  [icon scissors 24px]               │
// │  Beauty Professional          ›     │
// │  Find salons & grow your career     │
// └─────────────────────────────────────┘
// ┌─────────────────────────────────────┐
// │  [icon building-store 24px]         │
// │  Salon Owner                  ›     │
// │  Find and hire talented pros        │
// └─────────────────────────────────────┘
//
// Card selected state: border 1.5px #D85A30, bg brand.ghost
// Card unselected: border 0.5px theme.border.default, bg theme.bg.card

// STEP 2 — Personal info
// ─────────────────────────────────────────
// Same header + progress (dot 2 active)
// Title: "Create your account"
// Fields: Full name / Email / Password / Confirm password
// Button: "Continue"

// STEP 3 — (Workers only) Quick profile
// ─────────────────────────────────────────
// Title: "Your specialty"
// Subtitle: "Pick your main skill — you can add more later"
// Grid of specialty pills (2 columns):
// [ Hair braiding ] [ Nail tech    ]
// [ Makeup artist ] [ Lash tech    ]
// [ Barber        ] [ Hairstylist  ]
// Selected: bg #D85A30, text white
// Unselected: bg theme.bg.elevated, text secondary
// Button: "Get started →" (haptic Medium on tap)
```

---

## WORKER CARD — COMPLETE SPEC

```tsx
// Container
// bg: theme.bg.card
// border: 0.5px theme.border.default
// borderRadius: 18
// padding: 14
// marginBottom: 8
// Pressable: scale 0.97 onPressIn, haptic Light

// Layout: row, alignItems: flex-start, gap: 12

// LEFT: Avatar 52×52 borderRadius: 15
//   Photo if available (Image, resizeMode: cover)
//   Initials gradient if no photo
//   Verified badge: absolute bottom:-3 right:-3
//     16×16 circle, bg:#1D9E75, border:2px theme.bg.card
//     Text "✓" 8px white bold

// CENTER: flex:1 minWidth:0
//   Name: 14px weight:700 letterSpacing:-0.2 numberOfLines:1
//   Spec line: 11px secondary — "[specialty] · [N] yrs exp · [city]"
//     numberOfLines:1 ellipsizeMode:tail
//   Space: 7pt
//   Tags row: flex-wrap, gap:5
//     AvailabilityBadge (pill with dot)
//     Skill tags (max 2): 9px bg:rgba(fff,0.06) color:secondary

// RIGHT: flex-shrink:0, alignItems:flex-end, gap:5
//   Distance: 11px tertiary
//   Rating: row gap:3, "★ 4.9" 11px weight:700 #EF9F27
//   Jobs done: 9px tertiary e.g. "47 jobs"
//   Message btn: bg:#D85A30 borderRadius:8 px:10 py:5
//     "Message" 10px white weight:700
//     haptic Medium on press

// Skeleton: same layout, shimmer on each element
// isLoading=true → show skeleton, no real data rendered
```

---

## SALON CARD — COMPLETE SPEC

```tsx
// Container: borderRadius:18 overflow:hidden
// Pressable: scale 0.97, haptic Light

// COVER AREA: height:80, overflow:hidden
//   If photoUrls[0]: Image resizeMode:cover
//   Else: gradient from salon name hash (deterministic)
//   Dark gradient overlay bottom: linear rgba(0,0,0,0) → rgba(0,0,0,0.4)
//   "Hiring now" pill — absolute top:10 right:12
//     bg:#D85A30 borderRadius:20 px:10 py:4
//     row: dot 5px #fff + "Hiring now" 9px white weight:700
//     Only shown if isHiring === true

// BODY: padding: 12 14
//   ROW: salon avatar (40×40 borderRadius:12 mt:-24 border:2px theme.bg.card)
//        + name column
//   Name: 14px weight:700 letterSpacing:-0.2 numberOfLines:1
//   Location + distance: 10px tertiary numberOfLines:1

//   Specialties: flex-wrap row gap:5 mt:8
//     Each: 9px bg:rgba(fff,0.06) color:secondary px:8 py:3 borderRadius:20
//     Max 3 shown + "+N more" if overflow

//   Footer: row justify:space-between mt:10
//     Left: "N open positions" — N in #D85A30 weight:700, rest secondary 10px
//     Right: "View salon" button
//       bg:brand.ghost border:0.5px rgba(D85A30,0.3)
//       borderRadius:8 px:12 py:5
//       "View salon" 10px #D85A30 weight:700
```

---

## JOB POST CARD — COMPLETE SPEC

```tsx
// Container: bg:theme.bg.card border:0.5px theme.border.default
// borderRadius:18 padding:14 Pressable scale 0.97 haptic Light

// TOP ROW: salon info + optional urgent badge
//   Salon avatar: 34×34 borderRadius:10
//   Name: 11px secondary numberOfLines:1
//   Location: 10px tertiary numberOfLines:1
//   URGENT badge (if isUrgent): absolute or flex-end
//     bg:rgba(239,159,39,0.15) border:0.5px rgba(239,159,39,0.3)
//     borderRadius:20 px:9 py:3
//     dot 4px #EF9F27 + "Urgent" 9px #FABC4E weight:700

// TITLE: mt:10 mb:4
//   15px weight:700 letterSpacing:-0.2 numberOfLines:2 ellipsizeMode:tail

// SPEC ROW: gap:6
//   Specialty pill: 10px secondary bg:rgba(fff,0.05)
//   Type pill: 10px #60B4FF bg:rgba(55,138,221,0.12)

// DETAIL GRID: 2×2 mt:10 mb:12 gap:8
//   Each cell: bg:rgba(fff,0.03) borderRadius:10 padding:8 10
//   Label: 9px tertiary uppercase letterSpacing:0.06
//   Value: 12px white weight:700
//   Pay value specifically: color #D85A30

// FOOTER: row justify:space-between
//   Left: expiry text 10px tertiary "Expires in N days"
//          if < 2 days: color #E24B4A (urgency)
//   Right column:
//     "Apply now" button: bg:#D85A30 borderRadius:10 px:20 py:8
//       12px white weight:800 haptic Medium
//     "N applied" below: 9px tertiary text-align:right
//       if > 10 applied: color #EF9F27 (social proof)
```

---

## BOTTOM NAVIGATION — ADAPTIVE SPEC

```tsx
// apps/mobile/app/(tabs)/_layout.tsx

// Visual height: 56pt (icon + label area, no safe area)
// Total height: 56 + insets.bottom (system handles gesture area)

// Tab bar style:
// backgroundColor: theme.bg.card
// borderTopWidth: 0.5
// borderTopColor: theme.border.subtle
// paddingBottom: 0  ← insets handled by tabBarStyle.paddingBottom = insets.bottom
// elevation: 0 (Android — no shadow, flat)
// shadowOpacity: 0 (iOS)

// Each tab item:
// Icon: 22px, active: #D85A30, inactive: theme.text.disabled
// Label: 9px weight:600, active: #D85A30, inactive: theme.text.disabled
// Active indicator: 3pt dot below icon (dark mode only)
//   View 4×4 borderRadius:2 bg:#D85A30 mt:2

// Tab order: Discover · Jobs · Messages · Profile
// Icon map:
//   Discover  → ti-compass (or custom grid icon)
//   Jobs      → ti-briefcase
//   Messages  → ti-message-2
//   Profile   → ti-user

// Phones with hardware back button (Android):
//   The system navbar is BELOW the safe area
//   insets.bottom = 0 on these devices
//   Add explicit paddingBottom: 8 minimum to avoid cramped feel

// Phones without home indicator (modern Android gesture nav):
//   insets.bottom typically 16-24
//   Tab bar sits above the gesture zone naturally

// iPhone with home bar:
//   insets.bottom = 34
//   Tab bar content at 56pt, total bar = 90pt
```

---

## CHAT SCREEN — INTERACTION SPEC

```tsx
// Input bar at bottom — critical for keyboard handling
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
  keyboardVerticalOffset={headerHeight + insets.top}
>
  <FlashList
    inverted  // newest at bottom
    // paddingBottom: 8 (input bar clears itself via KeyboardAvoidingView)
  />

  {/* Input bar */}
  <View style={{
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Math.max(insets.bottom, 12),
    borderTopWidth: 0.5,
    borderTopColor: theme.border.subtle,
    backgroundColor: theme.bg.card,
    gap: 8,
  }}>
    <TextInput
      multiline
      maxLength={1000}
      style={{
        flex: 1,
        minHeight: 40,
        maxHeight: 120,  // ← caps at 5 lines, then scrolls
        backgroundColor: theme.bg.elevated,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        color: theme.text.primary,
      }}
    />
    <Pressable onPress={sendMessage} /* haptic Medium */>
      {/* Send icon 32×32 circle bg:#D85A30 */}
    </Pressable>
  </View>
</KeyboardAvoidingView>
```

---

## LOADING STATES — UNIFIED PATTERN

```tsx
// RULE: Never show a blank screen or spinner alone
// Always show skeleton that matches the real layout

// Feed screens: 5 skeleton cards (pre-render before data)
// Profile screens: skeleton hero + skeleton sections
// Chat: 8 skeleton bubbles alternating left/right

// Shimmer animation:
// Reanimated loop: opacity 0.4 → 0.9 → 0.4, duration 1400ms, easing sine
// Color dark:  from #1E1E1E to #2A2A2A
// Color light: from #EBEBEB to #F5F5F5

// Pull to refresh:
// RefreshControl tintColor: #D85A30 (iOS spinner color)
// colors: ['#D85A30'] (Android)

// Empty states — ALWAYS:
// Icon in rounded box (64×64 borderRadius:20 bg:theme.bg.elevated)
// Title 16px weight:700 primary
// Subtitle 13px secondary centered lineHeight:1.5
// CTA button if action possible
```

---

## NAVIGATION TRANSITIONS — SPEC

```tsx
// Stack screens: slide from right (default Expo Router)
// Modal screens (sheets, create job): slide from bottom
// Auth screens: fade (no spatial relationship)

// Expo Router config in _layout.tsx:
{
  screenOptions: {
    animation: 'slide_from_right',      // default
    gestureEnabled: true,               // swipe back always on
    gestureDirection: 'horizontal',
    headerShown: false,                 // always false — custom headers
    contentStyle: { backgroundColor: theme.bg.screen },
  }
}

// Modal screens override:
<Stack.Screen
  name="jobs/create"
  options={{
    animation: 'slide_from_bottom',
    presentation: 'modal',
  }}
/>

// Back gesture sensitivity — no change needed, iOS default is good
// Android: system back button always works via Expo Router
```

---

## COMPONENT NAMING — LAW

```
Every file:     PascalCase.tsx
Every hook:     useXxx.ts (camelCase with use prefix)
Every screen:   XxxScreen.tsx
Every store:    xxxStore.ts
Exports:        always named, never default in packages/ui

Prop naming:
  onPress       → always (never onTap, onTouch, onClick in RN)
  isLoading     → boolean loading state
  isDisabled    → boolean disabled state
  onLongPress   → long press handler (optional)
  size          → 'sm' | 'md' | 'lg'
  variant       → 'primary' | 'secondary' | 'ghost' | 'danger'
```

---

## WHAT TO SEND CLAUDE FOR EACH SCREEN

```
TASK — [Screen name]

DESIGN SYSTEM: SALONIN v2.0 (this file is in context)
THEME: adapts to system (dark/light via useTheme())
GUARDIAN: [paste current registry]

Screen: [name]
Route: [path]
Data source: [hook name] from [endpoint]

Requirements:
- Safe area handling via useSafeAreaInsets()
- All text: numberOfLines where overflow possible
- All cards: Pressable with scale animation + haptic
- Skeleton loader matching exact layout
- Empty state with icon + title + subtitle + CTA
- Pull to refresh (where applicable)
- Bottom nav clearance: paddingBottom = 56 + insets.bottom + 16
- Zero hardcoded colors — all via useTheme()
- Adapt to both dark and light mode

Do NOT create any component that exists in @salonin/ui.
Do NOT hardcode any color.
Provide guardian update block at end.
```

---

## CHECKLIST — BEFORE EVERY PR

```
□ All Text that can overflow has numberOfLines
□ All flex rows have minWidth: 0 on the flex:1 child
□ All colors via useTheme() — zero hardcoded hex
□ Safe area insets applied (top + bottom)
□ Tab screens: paddingBottom = 56 + insets.bottom + 16
□ Pressable: scale animation + haptic feedback
□ Loading state: skeleton matching real layout
□ Empty state: icon + title + subtitle
□ Pull to refresh: tintColor #D85A30
□ Both dark AND light mode tested mentally
□ No AI fingerprint comments
□ No component recreated that exists in @salonin/ui
□ Guardian update block provided
```

---

## AVATAR SYSTEM — LOI ABSOLUE

```typescript
// packages/ui/src/primitives/Avatar.tsx
// RÈGLE : cercle UNIQUEMENT, jamais de carré
// RÈGLE : si pas de photo → cercle vide, fond neutre
// JAMAIS d'initiales, JAMAIS de texte placeholder

interface AvatarProps {
  uri?: string | null        // photo URL depuis Cloudinary
  size: 28 | 40 | 52 | 68 | 80  // tailles fixes seulement
  isVerified?: boolean
  style?: ViewStyle
}

export const Avatar = ({ uri, size, isVerified, style }: AvatarProps) => {
  const { theme, isDark } = useTheme()

  return (
    <View style={[{ position: 'relative', width: size, height: size }, style]}>
      {uri ? (
        // Photo — cercle avec image
        <Image
          source={{ uri }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,  // parfaitement circulaire
          }}
          resizeMode="cover"
        />
      ) : (
        // Pas de photo — cercle vide, rien d'autre
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.06)'   // dark: très subtil
              : 'rgba(0,0,0,0.06)',         // light: très subtil
            borderWidth: 0.5,
            borderColor: isDark
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(0,0,0,0.08)',
          }}
        />
        // RIEN D'AUTRE ici — pas d'icône, pas de texte, pas d'initiales
      )}

      {/* Badge vérifié — seulement si isVerified=true */}
      {isVerified && (
        <View style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: size <= 40 ? 14 : 17,
          height: size <= 40 ? 14 : 17,
          borderRadius: 999,
          backgroundColor: '#1D9E75',
          borderWidth: 2,
          borderColor: theme.bg.card,  // fond de la carte parente
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 7, color: '#fff', fontWeight: '800' }}>✓</Text>
        </View>
      )}
    </View>
  )
}
```

---

## RESPONSIVE BREAKPOINTS — WEB (Next.js)

```typescript
// Tailwind breakpoints dans packages/config/tailwind.config.js
screens: {
  sm: '375px',   // mobile web
  md: '768px',   // tablet
  lg: '1024px',  // laptop
  xl: '1280px',  // desktop
}

// Worker feed grid — adaptatif
// Mobile  (< 768px) : 1 colonne, full width cards, même layout que app mobile
// Tablet  (768-1024): 2 colonnes, pas de sidebar, cards horizontales
// Desktop (> 1024px): sidebar 240px fixe + 3 colonnes grid

// CSS Grid obligatoire:
// mobile:  grid-template-columns: 1fr
// tablet:  grid-template-columns: repeat(2, 1fr)
// desktop: grid-template-columns: 240px 1fr
//           inner grid: repeat(3, minmax(0, 1fr))

// RÈGLE overflow sur web:
// Chaque carte: overflow: hidden
// Chaque texte: white-space: nowrap; overflow: hidden; text-overflow: ellipsis
// Chaque flex row: min-width: 0 sur le child flex-1
```

---

## OVERFLOW PREVENTION — CHECKLIST EXHAUSTIVE

```typescript
// Mobile React Native
// ─────────────────────────────────────────
// TOUJOURS sur tout Text qui peut déborder:
numberOfLines={1}     // une ligne max
ellipsizeMode="tail"  // ... à la fin

// TOUJOURS sur le conteneur flex qui a un enfant flex:1
style={{ flex: 1, minWidth: 0 }}
// Sans minWidth: 0, le text peut pousser les éléments frères hors écran

// Pattern safe pour toute rangée avec avatar + texte + meta:
<View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
  <Avatar size={50} uri={photo} />         {/* taille fixe */}
  <View style={{ flex:1, minWidth:0 }}>    {/* prend l'espace restant */}
    <Text numberOfLines={1}>{name}</Text>
    <Text numberOfLines={1}>{spec}</Text>
  </View>
  <View style={{ flexShrink:0 }}>          {/* ne rétrécit jamais */}
    <Text>{distance}</Text>
    <Button label="Message" size="sm" />
  </View>
</View>

// Web Next.js / HTML
// ─────────────────────────────────────────
// Toujours:
overflow: hidden
white-space: nowrap
text-overflow: ellipsis
// Sur le parent flex:
min-width: 0
// Sur les grids:
grid-template-columns: repeat(N, minmax(0, 1fr))
// minmax(0, 1fr) critique — sans le 0, les colonnes peuvent dépasser
```

---

## SAFE AREA — TOUS LES CAS

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Chaque screen root:
const { top, bottom } = useSafeAreaInsets()

// Screen sans tabs (stack screen):
<View style={{ flex:1, paddingTop: top }}>
  <ScrollView contentContainerStyle={{ paddingBottom: bottom + 24 }} />
</View>

// Screen avec tabs (tab screen):
// Le tab bar fait 56pt de contenu + bottom inset
// Donc le ScrollView doit avoir:
contentContainerStyle={{ paddingBottom: 56 + bottom + 16 }}

// Chat screen (input collé en bas):
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={top + 56}
>
  <FlashList inverted ... />
  <View style={{ paddingBottom: Math.max(bottom, 12) }}>
    {/* Input bar */}
  </View>
</KeyboardAvoidingView>

// Android sans safe area (vieux téléphones avec boutons hardware):
// bottom = 0 → paddingBottom: max(bottom, 16) garantit un minimum
paddingBottom: Math.max(bottom, 16)

// iPhone avec home bar (iPhone X+):
// bottom = 34pt automatiquement via useSafeAreaInsets()
// Rien à faire de spécial — le hook gère tout
```

---

## PROMPT TYPE POUR IMPLÉMENTER CE SYSTÈME

```
TASK — Avatar system refactor + overflow fix

Read .windsurf/rules/03-design-system.md fully before starting.

1. packages/ui/src/primitives/Avatar.tsx
   - Change shape: square borderRadius → circle (borderRadius: size/2)
   - Remove all initials/placeholder text logic
   - No photo → empty circle with subtle bg, nothing inside
   - Keep isVerified badge (circle absolute bottom-right)
   - Keep all 4 skeleton variants

2. Apply overflow prevention to ALL existing components in packages/ui:
   - WorkerCard: name numberOfLines=1, spec numberOfLines=1, flex:1 minWidth:0
   - SalonCard: name numberOfLines=1, desc numberOfLines=2
   - JobPostCard: title numberOfLines=2, salonName numberOfLines=1
   - ConversationItem: lastMessage numberOfLines=1
   Check EVERY Text in every component file.

3. Web (apps/web/src/components/):
   - WorkerCard.tsx: add overflow:hidden, text-overflow:ellipsis, min-width:0
   - JobPostCard.tsx: same
   - All flex rows: min-width:0 on flex:1 children

4. Responsive grid (apps/web/src/app/workers/page.tsx):
   CSS Grid: mobile 1col, tablet 2col, desktop sidebar+3col
   Use minmax(0, 1fr) on all grid columns

Rules:
- Do NOT change any color, spacing, or font — only shape and overflow
- Do NOT break any [DONE] prop contract
- Avatar circle applies to ALL sizes (28, 40, 52, 68, 80)
- Run turbo type-check after
- Provide guardian update block
```