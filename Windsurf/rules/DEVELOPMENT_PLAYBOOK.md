# DEVELOPMENT PLAYBOOK — BEAUTY MARKETPLACE
# Du premier prompt à la production — Android + iOS + Web
# Ce document est la loi. Rien ne se fait hors de ce cadre.

---

## PHILOSOPHIE FONDAMENTALE

```
1 seule vérité    →  le monorepo
1 seul type       →  packages/types
1 seul style      →  packages/ui
1 seule API       →  apps/api
1 seul registre   →  GUARDIAN.md (mis à jour après chaque session)
```

Tout ce qui est dupliqué est un bug d'architecture, pas un choix.

---

## PHASE 0 — SETUP (Avant tout développement)
## Durée : 2 jours — 1 seule fois

### Étape 0.1 — Initialiser le monorepo
```
PROMPT À ENVOYER À CLAUDE :

Initialise le monorepo Turborepo pour le Beauty Marketplace.
Structure exacte attendue :

beauty-marketplace/
├── apps/
│   ├── mobile/          ← Expo SDK 51, React Native
│   ├── web/             ← Next.js 14 App Router
│   └── api/             ← NestJS 10
├── packages/
│   ├── ui/              ← composants partagés NativeWind
│   ├── types/           ← types TypeScript partagés
│   ├── utils/           ← fonctions utilitaires partagées
│   ├── api-client/      ← SDK axios typé auto-généré
│   └── config/          ← tsconfig, eslint, tailwind base
├── prisma/
│   └── schema.prisma
├── docker-compose.yml   ← PostgreSQL + Redis local
├── turbo.json
└── package.json         ← workspaces

Config obligatoire :
- TypeScript strict: true partout
- Path aliases : @beauty/ui, @beauty/types, @beauty/utils, @beauty/api-client
- ESLint + Prettier partagés depuis packages/config
- Husky pre-commit : lint + type-check

NE PAS encore créer de logique métier. Setup pur uniquement.
```

### Étape 0.2 — Schéma Prisma + Docker
```
PROMPT À ENVOYER À CLAUDE :

Dans prisma/schema.prisma, crée le schéma complet avec :
- User, WorkerProfile, SalonProfile, JobPost, JobApplication
- PortfolioItem, Conversation, ConversationParticipant, Message
- Enums : Role, Availability, EmploymentType, MediaType, AppStatus
- Champ location de type geography(Point, 4326) pour PostGIS
- cityId String sur WorkerProfile, SalonProfile, JobPost

Dans docker-compose.yml :
- PostgreSQL 15 avec extension PostGIS
- Redis 7
- Ports : 5432, 6379

Script d'init : active l'extension PostGIS + crée les index géo.
```

### Étape 0.3 — Types partagés
```
PROMPT À ENVOYER À CLAUDE :

Dans packages/types/src/index.ts, génère :
1. Re-export de tous les types Prisma
2. DTOs de requête : FindNearbyWorkersDto, CreateJobPostDto,
   UpdateAvailabilityDto, SendMessageDto
3. Types UI : WorkerCardData, SalonCardData, JobPostCardData
4. PaginatedResponse<T>, ApiResponse<T>, ApiError
5. CityId type depuis la config des villes supportées

Tout doit être exporté depuis packages/types/src/index.ts.
Aucun type dupliqué ailleurs dans le projet.
```

### Étape 0.4 — Design tokens & primitives UI
```
PROMPT À ENVOYER À CLAUDE :

Dans packages/ui/src/primitives/, crée les composants atomiques :
Button, Text, Avatar, Badge, Input, Divider, Skeleton, Card

Règles :
- NativeWind (fonctionne sur mobile ET web via Tailwind)
- Props strictement typées depuis @beauty/types
- Chaque composant exporte aussi son Skeleton intégré
- Export centralisé depuis packages/ui/src/index.ts

Palette de couleurs (dans packages/config/src/theme.ts) :
- primary: #D85A30 (coral)
- available-now: #1D9E75
- available-today: #378ADD
- available-weekend: #EF9F27
- not-available: #888780
```

### ✅ Checkpoint Phase 0
```
□ turbo build passe sans erreur
□ turbo type-check passe sans erreur
□ docker-compose up démarre Postgres + Redis
□ prisma migrate dev crée toutes les tables
□ Les 8 primitives UI s'affichent sur Expo Go et Next.js dev
□ Le registre GUARDIAN est initialisé avec tous les [TODO]
```

---

## PHASE 1 — AUTHENTIFICATION
## Durée : 3 jours

### Ordre de développement obligatoire :
```
API d'abord → Types ensuite → Mobile → Web
```

### Étape 1.1 — Auth API
```
PROMPT :

Module : auth
Plateforme : api (NestJS)
Fichiers à créer :
- apps/api/src/modules/auth/auth.module.ts
- apps/api/src/modules/auth/auth.service.ts
- apps/api/src/modules/auth/auth.controller.ts
- apps/api/src/modules/auth/dto/register.dto.ts
- apps/api/src/modules/auth/dto/login.dto.ts

Endpoints :
- POST /auth/register  → crée User + WorkerProfile ou SalonProfile selon role
- POST /auth/login     → retourne { accessToken, refreshToken, user }
- POST /auth/refresh   → renouvelle le JWT
- POST /auth/logout    → invalide le refresh token (Redis blacklist)

Auth : Supabase Auth pour la gestion des tokens JWT
Validation : class-validator sur tous les DTOs
Erreurs : exceptions typées (InvalidCredentialsException, etc.)

Ne pas créer de logique métier hors auth dans cette session.
```

### Étape 1.2 — SDK Client
```
PROMPT :

Dans packages/api-client/src/, crée le client HTTP typé :
- client.ts          ← instance axios avec intercepteurs JWT
- auth.api.ts        ← fonctions register(), login(), logout(), refresh()
- workers.api.ts     ← placeholder (corps vides, types corrects)
- salons.api.ts      ← placeholder
- jobs.api.ts        ← placeholder
- messages.api.ts    ← placeholder

Toutes les fonctions retournent Promise<ApiResponse<T>>
Les types viennent de @beauty/types — jamais redéfinis ici.
Export depuis packages/api-client/src/index.ts
```

### Étape 1.3 — Auth Mobile
```
PROMPT :

REGISTRE : [colle le registre ici]
FICHIERS EXISTANTS : auth.api.ts dans @beauty/api-client [DONE]

Crée le flow auth mobile :
- apps/mobile/src/store/authStore.ts (Zustand)
- apps/mobile/src/hooks/useAuth.ts
- apps/mobile/src/screens/auth/LoginScreen.tsx
- apps/mobile/src/screens/auth/RegisterScreen.tsx
- apps/mobile/src/screens/auth/RoleSelectScreen.tsx

Utilise : Input, Button de @beauty/ui
Utilise : login(), register() de @beauty/api-client
Navigation : Expo Router (file-based)

Ce qui doit rester intact : tous les packages/* déjà créés.
```

### Étape 1.4 — Auth Web
```
PROMPT :

REGISTRE : [colle le registre ici]
FICHIERS EXISTANTS : authStore [DONE] mobile, auth.api.ts [DONE]

Crée le flow auth web (Next.js App Router) :
- apps/web/src/app/(auth)/login/page.tsx
- apps/web/src/app/(auth)/register/page.tsx
- apps/web/src/store/authStore.ts  ← MÊME interface que mobile

Réutilise : Input, Button de @beauty/ui (même composants)
Réutilise : login(), register() de @beauty/api-client
Ne pas modifier authStore mobile — créer un équivalent web identique.
```

### ✅ Checkpoint Phase 1
```
□ Register worker → reçoit JWT → profil créé en DB
□ Register salon → reçoit JWT → profil créé en DB
□ Login → JWT valide → accès aux routes protégées
□ Mobile : LoginScreen + RegisterScreen fonctionnels sur iOS + Android
□ Web : /login + /register fonctionnels
□ Registre GUARDIAN mis à jour
```

---

## PHASE 2 — PROFILS
## Durée : 4 jours

### Étape 2.1 — Profils API
```
PROMPT :

Module : workers, salons
Plateforme : api

Endpoints workers :
- GET    /workers/:id          → profil complet
- PATCH  /workers/me           → mise à jour profil
- PATCH  /workers/availability → { availability: Availability }
- POST   /workers/location     → { lat, lng } → update PostGIS point

Endpoints salons :
- GET    /salons/:id
- PATCH  /salons/me
- PATCH  /salons/hiring-status → { isHiring: boolean }

Tous les endpoints protégés par JwtAuthGuard.
PATCH uniquement sur son propre profil (guard ownership).
```

### Étape 2.2 — Upload média
```
PROMPT :

Module : media
Plateforme : api

Service Cloudinary :
- uploadImage(file, folder) → retourne { url, publicId }
- uploadVideo(file, folder) → retourne { url, publicId, duration }
- deleteMedia(publicId)
- Resize auto : avatar → 200x200, portfolio → 800px max width

Endpoint :
- POST /media/upload → multipart/form-data → retourne { url }
- Limite : 10MB images, 50MB vidéos
- Types autorisés : jpg, png, webp, mp4, mov
```

### Étape 2.3 — Composants profil UI
```
PROMPT :

REGISTRE : [registre actuel]

Dans packages/ui/src/components/, crée :
- WorkerCard.tsx       props: WorkerCardData, onPress, isLoading
- SalonCard.tsx        props: SalonCardData, onPress, isLoading
- AvailabilityBadge.tsx props: status: Availability
- PortfolioGrid.tsx    props: items: PortfolioItem[], onPressItem
- PortfolioItem.tsx    props: item: PortfolioItem (image ou vidéo)

Règles :
- Skeleton intégré dans chaque composant
- NativeWind uniquement — pas de StyleSheet React Native
- Types depuis @beauty/types
- Export depuis packages/ui/src/index.ts

Ne pas modifier les primitives existantes (Button, Input, Avatar, etc.)
```

### Étape 2.4 — Écrans profil mobile
```
PROMPT :

REGISTRE : [registre actuel]
EXISTANT : WorkerCard, SalonCard, PortfolioGrid [DONE] dans @beauty/ui

Crée :
- apps/mobile/src/screens/profile/WorkerProfileScreen.tsx
- apps/mobile/src/screens/profile/EditProfileScreen.tsx
- apps/mobile/src/screens/profile/PortfolioUploadScreen.tsx

Utilise UNIQUEMENT les composants de @beauty/ui — ne rien recréer.
Utilise useWorkerProfile(id) hook (à créer si pas dans registre).
```

### ✅ Checkpoint Phase 2
```
□ Worker peut uploader photo + portfolio (image + vidéo)
□ Salon peut créer son profil complet
□ WorkerProfileScreen affiche toutes les infos + portfolio
□ Disponibilité modifiable depuis l'app
□ Les composants UI fonctionnent identiquement mobile + web
□ Registre mis à jour
```

---

## PHASE 3 — DISCOVERY (Le cœur du produit)
## Durée : 5 jours

### Étape 3.1 — Géolocalisation API
```
PROMPT :

Module : matching
Plateforme : api

Service MatchingService avec méthode findNearbyWorkers() :
- Requête PostGIS ST_DWithin pour le rayon
- Filtre cityId OBLIGATOIRE
- Filtre optionnel : specialty, availability, employmentType
- Résultats triés par distance ASC
- Cache Redis TTL 60s (clé : city:lat:lng:radius:filters)
- Invalidation cache si un worker change sa disponibilité
- Pagination cursor-based (pas offset)
- Limite : 50 résultats max

Endpoint : GET /workers/nearby
Params : lat, lng, radiusMiles, cityId, specialty?, availability?

Index PostGIS à créer dans la migration :
CREATE INDEX workers_location_idx
ON "WorkerProfile" USING GIST(location);
```

### Étape 3.2 — Feed Discovery Mobile
```
PROMPT :

REGISTRE : [registre actuel]
EXISTANT :
- WorkerCard [DONE] dans @beauty/ui
- GET /workers/nearby [DONE] dans api
- useLocationStore [DONE]

Crée :
- apps/mobile/src/hooks/useNearbyWorkers.ts
  → React Query, staleTime 60s, enabled si cityId présent
- apps/mobile/src/screens/feed/DiscoveryFeedScreen.tsx
  → FlatList avec WorkerCard
  → Filtre par specialty (BottomSheet)
  → Pull-to-refresh
  → Loading skeleton (WorkerCard isLoading)
  → Empty state si aucun résultat
  → Error state avec retry

NE PAS créer de nouveau composant Card — utiliser WorkerCard existant.
NE PAS modifier useLocationStore existant.
```

### Étape 3.3 — Feed Discovery Web
```
PROMPT :

REGISTRE : [registre actuel]
EXISTANT :
- WorkerCard [DONE] dans @beauty/ui
- useNearbyWorkers [DONE] mobile (recréer pour web, même interface)
- GET /workers/nearby [DONE]

Crée :
- apps/web/src/app/workers/page.tsx
  → Grid responsive (1 col mobile, 2 col tablet, 3 col desktop)
  → Même WorkerCard que mobile
  → Filtres dans sidebar
  → Infinite scroll (Intersection Observer)

WorkerCard fonctionne déjà sur web via NativeWind → ne pas recréer.
```

### Étape 3.4 — Hiring Posts
```
PROMPT :

REGISTRE : [registre actuel]

API :
- POST /jobs          → créer un post (salon uniquement)
- GET  /jobs          → liste avec filtres (cityId obligatoire)
- GET  /jobs/:id      → détail
- PATCH /jobs/:id     → modifier (propriétaire uniquement)
- DELETE /jobs/:id    → soft delete (isActive: false)
- Auto-expiration via BullMQ job scheduler

UI (@beauty/ui) :
- JobPostCard.tsx → props: JobPostCardData, onPress, isLoading

Mobile :
- JobFeedScreen.tsx → liste des posts nearby
- CreateJobPostScreen.tsx → formulaire création rapide (< 2 min)

Web :
- /jobs → feed des posts
```

### ✅ Checkpoint Phase 3
```
□ Feed workers géolocalisé fonctionne iOS + Android + Web
□ Filtres specialty + availability opérationnels
□ Cache Redis actif (vérifier avec Redis CLI)
□ Salons peuvent créer des hiring posts
□ Workers voient les jobs nearby
□ Performance : réponse < 200ms sur géo queries
□ Registre mis à jour
```

---

## PHASE 4 — MESSAGERIE
## Durée : 4 jours

### Étape 4.1 — Messaging API + Realtime
```
PROMPT :

Module : messaging
Plateforme : api

Service MessagingService :
- createConversation(user1Id, user2Id) → idempotent (pas de doublon)
- sendMessage(conversationId, senderId, content, mediaUrl?)
- getMessages(conversationId, cursor?) → pagination cursor
- markAsRead(conversationId, userId)

Gateway WebSocket (NestJS @WebSocketGateway) :
- Events : message:send, message:received, typing:start, typing:stop
- Auth via JWT dans handshake
- Room par conversationId

Supabase Realtime en fallback si WebSocket indisponible.
```

### Étape 4.2 — UI Messagerie
```
PROMPT :

REGISTRE : [registre actuel]

Dans packages/ui/src/components/ :
- MessageBubble.tsx  → props: message, isSelf, showAvatar
- ConversationItem.tsx → props: conversation, lastMessage, unreadCount, onPress

Mobile :
- ConversationsListScreen.tsx → liste toutes les conversations
- ChatScreen.tsx → messages temps réel + input + media picker

Web :
- /messages → split view (liste gauche, chat droite)
  → même logique, layout différent

Ne pas dupliquer la logique WebSocket — hook useMessages() partagé.
```

### ✅ Checkpoint Phase 4
```
□ Deux users peuvent s'envoyer des messages
□ Temps réel < 500ms de latence
□ Photos partageables dans le chat
□ Notifications push sur nouveau message
□ Fonctionne iOS + Android + Web
□ Registre mis à jour
```

---

## PHASE 5 — CONFIANCE & SÉCURITÉ
## Durée : 3 jours

### Étape 5.1 — Vérification d'identité
```
PROMPT :

Intégrer Stripe Identity pour la vérification workers :
- Endpoint POST /verify/identity → crée une session Stripe Identity
- Webhook Stripe → met à jour WorkerProfile.isVerified
- Badge vérifié visible sur WorkerCard

Vérification salons :
- Validation manuelle du numéro EIN (formulaire + admin review)
- Endpoint admin PATCH /admin/salons/:id/verify
```

### Étape 5.2 — Signalement & modération
```
PROMPT :

REGISTRE : [registre actuel]

API :
- POST /reports → signaler un user (type: FAKE_PROFILE | NO_SHOW | INAPPROPRIATE)
- Seuil auto-suspension : 3 rapports validés → isActive: false
- Queue BullMQ pour traitement async des rapports

Mobile + Web :
- Bouton "Signaler" sur WorkerCard, SalonCard, ChatScreen
- Modal de signalement avec catégories
- Confirmation après envoi
```

### ✅ Checkpoint Phase 5
```
□ Workers peuvent se vérifier via Stripe Identity
□ Badge vérifié visible sur les profils
□ Signalement fonctionnel sur toutes les plateformes
□ Auto-suspension après seuil atteint
□ Registre mis à jour
```

---

## PHASE 6 — PRODUCTION
## Durée : 5 jours

### Étape 6.1 — Tests
```
PROMPT (une session par module) :

Écris les tests pour le module matching :
- Unit : MatchingService.findNearbyWorkers() avec mocks PostGIS
- Integration : endpoint GET /workers/nearby avec vraie DB test
- E2E mobile : DiscoveryFeedScreen avec MSW (mock service worker)

Cible : 80% coverage sur les modules critiques
(auth, matching, messaging, jobs)
```

### Étape 6.2 — CI/CD
```
PROMPT :

Crée le pipeline GitHub Actions :
.github/workflows/ci.yml :
  - lint + type-check (toutes les apps)
  - tests unitaires
  - tests integration (Postgres + Redis via services)
  - build mobile (Expo EAS)
  - build web (Next.js)
  - build api (Docker)

.github/workflows/deploy.yml (sur merge main) :
  - Deploy api → AWS ECS Fargate
  - Deploy web → Vercel
  - Submit mobile → EAS Update (OTA) ou EAS Build (store)
```

### Étape 6.3 — Monitoring
```
PROMPT :

Intégre Datadog APM :
- Traces sur tous les endpoints API
- Métriques custom : geo_query_duration, cache_hit_rate, active_workers_by_city
- Alertes : API p95 > 500ms, error rate > 1%, cache hit < 70%

Sentry pour les erreurs :
- Mobile : @sentry/react-native
- Web : @sentry/nextjs
- API : @sentry/node
```

### ✅ Checkpoint Final — Go Live
```
□ CI passe à 100% sur main
□ Coverage > 80% modules critiques
□ API p95 < 200ms sur geo queries
□ App soumise App Store + Play Store
□ Web déployé sur domaine production
□ Monitoring actif avec alertes configurées
□ GUARDIAN registre complet et à jour
□ Rollback plan documenté
```

---

## RÈGLE D'OR DU DÉVELOPPEMENT

```
Une session Claude = une seule chose.

❌ "Crée le feed, les profils, et la messagerie"
✅ "Crée uniquement le endpoint GET /workers/nearby"

❌ "Améliore l'app"
✅ "Dans WorkerCard, ajoute la prop showDistance sans modifier le reste"

Plus la tâche est petite et précise,
moins Claude peut casser quelque chose.
```

---

## ORDRE DE DÉVELOPPEMENT RÉSUMÉ

```
Phase 0 — Setup monorepo          2 jours   ████
Phase 1 — Auth                    3 jours   ██████
Phase 2 — Profils                 4 jours   ████████
Phase 3 — Discovery (core)        5 jours   ██████████
Phase 4 — Messagerie              4 jours   ████████
Phase 5 — Confiance               3 jours   ██████
Phase 6 — Production              5 jours   ██████████
─────────────────────────────────────────────────────
Total                            26 jours
(avec 1-2 sessions Claude/jour, ~2 heures/jour de ton temps)
```

---

## LES 3 FICHIERS À TOUJOURS AVOIR OUVERTS

```
1. MASTER_PROMPT.md       → architecture + stack + règles de base
2. CONVENTIONS.md         → nommage + patterns + anti-duplication
3. GUARDIAN.md            → registre actuel + protocole anti-régression

Ces 3 fichiers + le format de tâche précis =
Claude ne casse rien, ne duplique rien, et avance vite.
```
