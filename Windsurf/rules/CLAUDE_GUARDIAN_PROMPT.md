# CLAUDE GUARDIAN SYSTEM — BEAUTY MARKETPLACE
# Le système qui empêche Claude de casser ce qui marche déjà.
# Colle ce prompt EN PREMIER dans chaque session, avant tout autre chose.

---

## TON RÔLE PRINCIPAL DANS CE PROJET

Tu es le gardien de la codebase du Beauty Marketplace.
Ton job n°1 n'est PAS d'écrire du nouveau code.
Ton job n°1 est de NE PAS CASSER CE QUI MARCHE.

Avant chaque action, tu poses ces 3 questions à toi-même :
1. Est-ce que ce que je vais écrire REMPLACE quelque chose qui existe ?
2. Est-ce que ce changement peut AFFECTER un autre écran ou composant ?
3. Est-ce que j'ai VÉRIFIÉ que ma solution ne duplique pas l'existant ?

Si tu ne peux pas répondre avec certitude → tu demandes avant d'écrire.

---

## SYSTÈME DE REGISTRE — SOURCE DE VÉRITÉ

À chaque session, je te fournirai l'état actuel du projet.
Tu ne présumes RIEN. Tu travailles UNIQUEMENT depuis ce registre.

### FORMAT DU REGISTRE (je le mets à jour manuellement après chaque session)

```
=== # SALONIN — GUARDIAN REGISTRE
# Fichier : .windsurf/rules/04-guardian.md
# Mis à jour après chaque session Windsurf.
# Claude lit ce fichier AVANT chaque tâche.

---

## STATUTS

[DONE]  = complet et fonctionnel — ne pas toucher
[WIP]   = en cours — STOP si une tâche veut le modifier, demander confirmation
[STUB]  = fichier créé mais vide — structure seulement, logique pas encore écrite
[TODO]  = pas commencé
[PASS]  = checkpoint validé

---

## RÈGLES ABSOLUES POUR CLAUDE

1. Lire CE fichier en entier avant d'écrire quoi que ce soit
2. Ne jamais toucher un [WIP] sans confirmation explicite
3. Ne jamais recréer quelque chose de [DONE] ou [STUB]
4. Fournir un bloc MISE À JOUR REGISTRE à la fin de chaque session
5. STOP et demander si une tâche affecte un fichier hors scope

---

## INFRASTRUCTURE MONOREPO

[DONE] /                         root — package.json, turbo.json, pnpm-workspace.yaml, .gitignore, tsconfig.json
[DONE] packages/config            @salonin/config — tailwind.config.js (brand tokens Salonin), tsconfig/{base,react-native,nextjs,nestjs}.json
[DONE] packages/types             @salonin/types — types Prisma, DTOs, UI card types, PaginatedResponse, ApiResponse
[DONE] packages/ui                @salonin/ui — useTheme, Skeleton, Text, Button, Avatar, Badge, Input, Divider + Skeletons
[DONE] packages/ui components     AvailabilityBadge, WorkerCard(+Skeleton), SalonCard(+Skeleton), PortfolioItem(+Skeleton), PortfolioGrid, JobPostCard(+Skeleton), MessageBubble(+Skeleton), ConversationItem(+Skeleton)
                                  WorkerCard.isVerified → '✓ Verified' green badge (rgba(29,158,117,0.15))
                                  SalonCard.isVerified → same badge style
[DONE] packages/utils             @salonin/utils — geo, formatting, availability, isJobExpired, getAvatarGradient
[DONE] packages/api-client        @salonin/api-client — client.ts, auth.api.ts, workers/salons/jobs stubs; messages.api.ts updated
[DONE] packages/types WorkerProfileFull  WorkerProfileFull interface: all WorkerProfile scalars + portfolioItems[] + user{email,role,createdAt}
[DONE] packages/types CursorResponse<T>  { data: T[], nextCursor: string|null, hasMore: boolean } — cursor-based pagination
[DONE] packages/types FindNearbyWorkersDto  cursor?: string added
[DONE] packages/api-client media  media.api.ts — mediaApi.uploadMedia(file, folder) → multipart FormData → POST /media/upload
[DONE] apps/mobile hooks          useMediaUpload — expo-image-picker gallery pick → S3 upload → returns url
                                  options: { folder: avatars|portfolio|uploads, type: image|video|any, allowsEditing }
[DONE] apps/mobile                @salonin/mobile — Expo 51, Expo Router, Zustand, auth flow (store + hook + 3 screens)
[DONE] apps/web                   @salonin/web — Next.js 14 App Router, Zustand, auth flow (/login + /register)
                                   @salonin/utils added as dep (WorkerCard web component)
[DONE] apps/api                   @salonin/api — NestJS scaffold: main.ts, AppModule, PrismaService/Module

--- apps/api ENV VARS (required) ---
DATABASE_URL, REDIS_URL, JWT_SECRET, CORS_ORIGINS
AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
(optional) SENTRY_DSN, DD_SERVICE, DD_ENV, DD_AGENT_HOST
(no Supabase — auth uses bcrypt + @nestjs/jwt directly)

--- TOOLING ---
[DONE] Package manager            pnpm@9.4.0 (installed 2.9.14)
[DONE] Turborepo                  2.9.14 — tasks: build, dev, lint, type-check
[DONE] TypeScript                 5.9.3 — strict: true everywhere
[DONE] Prettier                   3.8.3

--- DESIGN TOKENS (@salonin/config/tailwind) ---
[DONE] brand.primary #D85A30 / brand.light #FF8C5A / brand.dark #993C1D
[DONE] dark.{base,surface,elevated,input,border,border2}
[DONE] light.{base,surface,border,border2}
[DONE] avail.{now #1D9E75, today #378ADD, weekend #EF9F27, none #555}

--- CHECKPOINTS ---
[PASS] turbo type-check           12 successful, 0 errors — FULL TURBO 50ms (deploy-blockers fixed)
[PASS] pnpm test (api)             31 tests, 4 suites, 0 failures
[PASS] pnpm ls -r                 all 9 workspaces resolve
[TODO] turbo build                pending (apps not scaffolded yet)
[PASS] docker-compose up -d       2/2 containers Healthy (postgres:5433, redis:6380)
[PASS] prisma migrate deploy      1 migration applied, 0 errors — 20260525133337_init
[PASS] PostGIS geo indexes        workers_location_idx + salons_location_idx verified
[PASS] prisma generate            client generated v5.22.0
[PASS] prisma db push             stripeSessionId+ein fields added — salonin DB 20260525
[PASS] prisma db push             ReportType+ReportStatus enums, Report model, User.isActive — salonin DB 20260525
[PASS] prisma db push             User.passwordHash String? added — Supabase removed 20260525
[PASS] prisma migrate status      2 migrations tracked, database schema is up to date
                                   20260525133337_init — full schema + PostGIS indexes
                                   20260525200000_add_reports_auth — isActive, passwordHash, stripeSessionId, ein, Report model
[PASS] Android debug build         ./gradlew installDebug — BUILD SUCCESSFUL, APK installed on device
                                   JS bundle embedded (debuggableVariants=[], extraPackagerArgs=["--dev","true"])
                                   metro.config.js: singleton React, prisma-enums shim, monorepo watchFolders

---

## PRISMA & BASE DE DONNÉES

[DONE] prisma/schema.prisma       10 modèles + 7 enums — source de vérité
[DONE] Enum Role                  WORKER | SALON | ADMIN
[DONE] Enum Availability          NOW | TODAY | WEEKEND | NOT_AVAILABLE
[DONE] Enum EmploymentType        FULL_TIME | PART_TIME | TEMPORARY | WEEKEND | EMERGENCY
[DONE] Enum MediaType             IMAGE | VIDEO
[DONE] Enum AppStatus             PENDING | VIEWED | ACCEPTED | DECLINED
[DONE] Enum ReportType            FAKE_PROFILE | NO_SHOW | INAPPROPRIATE
[DONE] Enum ReportStatus          PENDING | REVIEWED | DISMISSED
[DONE] User.isActive              Boolean @default(true) — set false on auto-suspension (3+ reports)
[DONE] PostGIS field              WorkerProfile.location geography(Point,4326)
[DONE] PostGIS field              SalonProfile.location geography(Point,4326)
[DONE] cityId                     présent sur WorkerProfile, SalonProfile, JobPost
[DONE] Geo index                  workers_location_idx ON "WorkerProfile" USING GIST(location)
[DONE] Geo index                  salons_location_idx ON "SalonProfile" USING GIST(location)
[DONE] Migration                  20260525133337_init — appliquée, indexes inclus
[DONE] Prisma client              généré v5.22.0 → node_modules/@prisma/client
[DONE] docker-compose.yml         PostgreSQL 15+PostGIS 3.4 (port 5433) + Redis 7 (port 6380)
                                  ⚠️  Ports non-standard — lookme-postgres/redis occupent 5432/6379
                                  postgres: platform linux/amd64 (Rosetta 2 sur Apple Silicon)
[DONE] docker/init.sql            CREATE EXTENSION IF NOT EXISTS postgis
[DONE] salonin-postgres           Healthy — localhost:5433
[DONE] salonin-redis              Healthy — localhost:6380
[DONE] .env                       DATABASE_URL port 5433 / REDIS_URL port 6380
[DONE] .env.example               template sans secrets

---

## PACKAGES PARTAGÉS

--- @salonin/types ---
[DONE] Model re-exports            User, WorkerProfile, SalonProfile, JobPost, JobApplication, PortfolioItem, Conversation, ConversationParticipant, Message
[DONE] Enum re-exports             Role, Availability, EmploymentType, MediaType, AppStatus, ReportType, ReportStatus (valeurs runtime)
[DONE] FindNearbyWorkersDto        lat, lng, radiusMiles, cityId, specialty?, availability?
[DONE] CreateJobPostDto            title, description, specialty, payStructure, type, isUrgent?, cityId, expiresAt
[DONE] UpdateAvailabilityDto       availability, location?{lat,lng}
[DONE] SendMessageDto              conversationId, content?, mediaUrl?
[DONE] ConversationPreview         id, otherParticipant{userId,name,photoUrl,role}, lastMessage{content,mediaUrl,createdAt,isRead,senderId}|null, unreadCount, createdAt
[DONE] CreateReportDto             reportedUserId: string, type: ReportType, reason?: string
[DONE] prisma schema fields        WorkerProfile.stripeSessionId String? — Stripe Identity session tracking
                                   SalonProfile.ein String? — EIN for admin manual verification
                                   User.isActive Boolean @default(true) — suspension flag
                                   Report model: id, reporterId→User(ReportGiver), reportedId→User(ReportReceiver), type ReportType, reason String?, status ReportStatus @default(PENDING), createdAt
[DONE] WorkerCardData              id, name, photoUrl, specialties, availability, distanceMiles, experienceYears, isVerified, cityId
[DONE] SalonCardData               id, name, photoUrls, specialties, isHiring, isVerified, distanceMiles, cityId
[DONE] JobPostCardData             id, title, specialty, payStructure, type, isUrgent, cityId, expiresAt, salonName, salonPhotoUrl
[DONE] PaginatedResponse<T>        data, total, page, limit, hasMore
[DONE] ApiResponse<T>              success: true, data: T
[DONE] ApiError                    success: false, error, code, statusCode
[DONE] dep added                   @prisma/client ^5.0.0

--- @salonin/utils ---
[DONE] MILES_TO_METERS             1609.344
[DONE] milesToMeters(miles)
[DONE] metersToMiles(meters)
[DONE] formatDistance(miles)       "2.3 mi" / "< 0.1 mi"
[DONE] formatExperience(years)     "3 years exp." / "New pro"
[DONE] AVAILABILITY_LABELS         Record<Availability, string>
[DONE] AVAILABILITY_COLORS         Record<Availability, string> — classes Tailwind
[DONE] isJobExpired(expiresAt)
[DONE] getAvatarGradient(name)     hash déterministe — stable entre sessions
[DONE] dep added                   @salonin/types: workspace:*

--- @salonin/config ---
[DONE] tailwind brand tokens       via packages/config/tailwind.config.js
[DONE] SUPPORTED_CITIES            dmv(active), atlanta(active), houston(false), miami(false)
[DONE] CityId type                 keyof typeof SUPPORTED_CITIES
[DONE] packages/config/src/cities.ts
[DONE] packages/config/tsconfig.json

--- @salonin/api-client ---
[DONE] client.ts                   axios.create + Bearer interceptor + 401 refresh queue + token store
[DONE] auth.api.ts                 register(), login(), refresh(), logout() — calls setAuthTokens/clearAuthTokens
[DONE] workers.api.ts              findNearby()→CursorResponse<WorkerCardData>, getMe(), getById()→WorkerProfileFull, updateProfile(), updateAvailability(), updateLocation(), addPortfolioItem()
[DONE] salons.api.ts               getById(), updateProfile(), setHiringStatus()
[DONE] jobs.api.ts                 create(), list(), getById(), update(), remove()
[DONE] messages.api.ts             createConversation(otherUserId), getConversations(), getMessages(id,cursor?), sendMessage(id,content?,mediaUrl?), markAsRead(id)
[DONE] verify.api.ts               createIdentitySession() → {url,sessionId}; submitEin(ein)
[DONE] reports.api.ts              createReport(reportedUserId, type, reason?) → void
[DONE] media.api.ts                mediaApi.uploadMedia(file: MediaFile, folder: MediaFolder) — multipart FormData → POST /media/upload
                                   types: MediaFile{uri,mimeType,name}, MediaFolder = 'avatars'|'portfolio'|'uploads'
[DONE] tsconfig.json               lib: [ES2022, DOM] — DOM required for FormData global

---

## UI COMPONENTS (@salonin/ui)

--- Primitives ---
[DONE] useTheme()                  Theme interface, dark/light tokens — useColorScheme() from RN
[DONE] Skeleton                    shimmer — opacity Animated.loop 0.4→1, useNativeDriver: true
[DONE] Text                        variants: heading/title/body/caption/label + TextSkeleton
[DONE] Button                      4 variants: primary/secondary/ghost/danger + size sm/md/lg + ButtonSkeleton
[DONE] Avatar                      uri + initials fallback, getAvatarGradient() for bg + AvatarSkeleton
[DONE] Badge                       availability colors via useTheme() + AVAILABILITY_LABELS + BadgeSkeleton
[DONE] Input                       label, error, focus border, placeholderTextColor + InputSkeleton
[DONE] Divider                     horizontal/vertical, color via useTheme()
[DONE] src/types/nativewind.d.ts   className augmentation on View/Text/Image/TextInput/TouchableOpacity
[DONE] packages/ui deps            react ^18.2, react-native ^0.73 (dev+peer), @salonin/types+utils (dep)

--- Components ---
[DONE] WorkerCard                  props: WorkerCardData, onPress, isLoading, onLongPress? — avatar 44×44 br-14, AvailabilityBadge, ✓ Verified badge, formatDistance/formatExperience + WorkerCardSkeleton
[DONE] SalonCard                   props: SalonCardData, onPress, isLoading, onLongPress? — isHiring coral pill, ✓ Verified badge + SalonCardSkeleton
[DONE] AvailabilityBadge           props: status Availability — dot 5×5 + label, CONFIG hardcoded per design spec
[DONE] PortfolioItem               props: item PortfolioItem (IMAGE|VIDEO) — VIDEO shows play overlay, string comparison 'VIDEO'
[DONE] PortfolioGrid               props: items PortfolioItem[], onPressItem, isLoading — FlatList numColumns=3, scrollEnabled=false, empty state
[DONE] JobPostCard                 props: JobPostCardData, onPress, isLoading — salon avatar 44×44, title/salon/specialty/type, pay (coral), expiry, URGENT badge (amber) + JobPostCardSkeleton
[DONE] MessageBubble               props: message, isSelf, showAvatar, senderName?, senderPhotoUrl? — coral self / #1E1E1E received, tail corners, time + MediaBubble + MessageBubbleSkeleton
[DONE] ConversationItem            props: conversation, isSelected, onPress — avatar, name, lastMsg preview, unread coral badge, time + ConversationItemSkeleton
[DONE] ReportModal                 props: isVisible, reportedName, onClose, onSubmit(type,reason?) — bottom sheet, 3 options (FAKE_PROFILE/NO_SHOW/INAPPROPRIATE), radio select, reason TextInput, Cancel+Submit buttons

---

## API — MODULES NESTJS (apps/api)

--- Scaffold ---
[DONE] apps/api/package.json       NestJS ^10, @nestjs/config, @prisma/client, class-validator, class-transformer, reflect-metadata, rxjs
[DONE] apps/api/tsconfig.json      isolatedModules: false (emitDecoratorMetadata compat), rootDir: src
[DONE] src/main.ts                 bootstrap, ValidationPipe(whitelist+transform), CORS origins: 3000/8081/19000/19006, port: process.env.PORT ?? 4000
                                   rawBody: true (Phase 5.1 — required for Stripe webhook signature verification)
[DONE] src/modules/auth/jwt.strategy.ts  +isActive check: UnauthorizedException('Account suspended') if user.isActive === false
[DONE] src/app.module.ts           ConfigModule.forRoot(isGlobal:true) + PrismaModule + RedisModule + AuthModule + WorkersModule + SalonsModule + MediaModule + JobsModule + MessagingModule + VerifyModule + ReportsModule
                                   BullModule.forRootAsync — parses REDIS_URL → {host,port} for BullMQ connection
[DONE] src/prisma/prisma.service.ts  extends PrismaClient, datasources.db.url from process.env.DATABASE_URL, onModuleInit → $connect()
[DONE] src/prisma/prisma.module.ts   @Global() — PrismaService provided + exported

--- Scaffold ---
[DONE] apps/mobile/package.json       Expo ~51, expo-router ~3.5, expo-image-picker ~15.0.7, zustand ^4.5, react-native 0.74.5
                                        @salonin/{api-client,types,ui,utils} workspace:*, "main": "expo-router/entry"
                                        expo-constants ~16.0.2, expo-linking ~6.3.1, expo-modules-core ~1.12.26 (pinned SDK 51)
[DONE] apps/mobile/metro.config.js    monorepo config: watchFolders=[workspaceRoot], nodeModulesPaths, singleton React resolve, prisma-enums shim
[DONE] apps/mobile/prisma-enums.js    runtime enum values for mobile (mirrors prisma/schema.prisma) — Metro shim for @prisma/client
[DONE] apps/mobile/android/           expo prebuild + settings.gradle paths-constrained resolve for @react-native/gradle-plugin
                                        build.gradle: debuggableVariants=[], extraPackagerArgs=["--dev","true"]
                                        gradle.properties: bundleInDebug=true, hermesEnabled=true
[DONE] apps/mobile/tsconfig.json      extends react-native.json (declarationMap: false fix applied)
[DONE] packages/config/tsconfig/react-native.json  +declarationMap: false (resolves base.json conflict)

--- Auth Mobile ---
[DONE] src/store/authStore.ts         Zustand — user, accessToken, refreshToken, isLoading
[DONE] src/hooks/useAuth.ts           login(), register(), logout() + isAuthenticated computed
[DONE] src/screens/auth/LoginScreen.tsx    email+password form — login() → router.replace('/(tabs)')
[DONE] src/screens/auth/RegisterScreen.tsx  name+email+password+role form — register() → router.replace('/(tabs)')
[DONE] src/screens/auth/RoleSelectScreen.tsx  WORKER | SALON picker → router.push register with role param
[DONE] app/_layout.tsx                Stack root layout (headerShown: false)
[DONE] app/index.tsx                  Redirect → /(auth)/login or /(tabs) based on authStore
[DONE] app/(auth)/_layout.tsx         Stack auth group (slide_from_right)
[DONE] app/(auth)/login.tsx           re-export LoginScreen
[DONE] app/(auth)/register.tsx        re-export RegisterScreen
[DONE] app/(auth)/role-select.tsx     re-export RoleSelectScreen
[DONE] app/(tabs)/_layout.tsx         Tabs layout — 4 tabs (Discover/Jobs/Messages/Profile), coral active tint, styled tabBar
[DONE] app/(tabs)/index.tsx           re-export DiscoveryFeedScreen — main feed tab
[DONE] app/(tabs)/jobs.tsx            re-export JobFeedScreen — jobs/hiring tab
[DONE] app/jobs/create.tsx            re-export CreateJobPostScreen
[DONE] app/jobs/[id].tsx              JobDetailScreen placeholder — "Coming in the next phase"
[DONE] app/(tabs)/messages.tsx        re-export ConversationsListScreen
[DONE] app/(tabs)/profile.tsx         ProfileScreen placeholder — "Coming in the next phase"
[DONE] app/chat/[id].tsx              re-export ChatScreen (params: id, name, otherUserId?)

--- Scaffold ---
[DONE] apps/web/package.json          next ^14.2, react ^18.2, react-dom, zustand ^4.5, @salonin/{api-client,types,utils} + type-check script
[DONE] apps/web/next-env.d.ts         /// <reference types="next" />
[DONE] apps/web/tsconfig.json         extends nextjs.json (moduleResolution:Bundler, jsx:preserve, lib:dom)

--- Auth Web ---
[DONE] src/store/authStore.ts         Zustand — identical interface to mobile (user|accessToken|refreshToken|isLoading)
[DONE] src/hooks/useAuth.ts           login(), register(), logout() — identical to mobile (platform-agnostic)

--- Feed Web (Phase 3.3) ---
[DONE] src/store/locationStore.ts     Zustand — same interface as mobile: cityId|lat|lng, setLocation(), clearLocation()
[DONE] src/hooks/useNearbyWorkers.ts  same interface as mobile — recreated for web (no RN deps)
[DONE] src/components/WorkerCard.tsx  pure HTML/CSS, matches @salonin/ui/WorkerCard visually; WorkerCardSkeleton included
[DONE] src/app/workers/page.tsx       'use client', CSS Grid auto-fill minmax(300px), sidebar, Intersection Observer scroll

--- Feed Web (Phase 3.4) ---
[DONE] src/hooks/useJobFeed.ts        same interface as mobile — offset pagination, cityId from locationStore
[DONE] src/components/JobPostCard.tsx pure HTML/CSS, matches @salonin/ui/JobPostCard visually; JobPostCardSkeleton included
[DONE] src/app/jobs/page.tsx          'use client', CSS Grid auto-fill minmax(300px), sidebar (city+specialty), Intersection Observer scroll

--- Messaging Web (Phase 4) ---
[DONE] src/hooks/useConversations.ts  load + refresh ConversationPreview[] — same interface as mobile
[DONE] src/hooks/useMessages.ts       socket.io-client WS + REST — same interface as mobile; process.env.NEXT_PUBLIC_API_URL
[DONE] src/components/ConversationItem.tsx  pure HTML/CSS — selected highlight with coral left border
[DONE] src/components/MessageBubble.tsx     pure HTML/CSS — self=coral right, received=#1E1E1E left, time overlay
[DONE] src/app/messages/page.tsx      'use client', split view 300px sidebar + ChatPanel — ConvSkeleton + MsgSkeleton loaders
[DONE] src/app/layout.tsx             RootLayout — dark bg #0A0A0A, SF Pro font stack
[DONE] src/app/page.tsx               redirect('/login') — Server Component
[DONE] src/app/(auth)/login/page.tsx  'use client' — email+password form → useAuth.login() → /dashboard
[DONE] src/app/(auth)/register/page.tsx  'use client' — role toggle (WORKER|SALON) + name/email/password → useAuth.register()

--- Modules ---
[DONE] Module Auth                 register, login, refresh, logout — Supabase Auth JWT
[DONE] Module Workers              GET /workers/nearby(matching), GET /workers/me, GET /workers/:id, PATCH /workers/me, PATCH /workers/availability, POST /workers/location, POST /workers/portfolio
                                   updateAvailability → redis.delByPattern(nearby:{cityId}:*) — cache invalidation
[DONE] Module Matching/Redis       src/redis/redis.{service,module}.ts — @Global, ioredis wrapper: get/set(EX)/delByPattern(SCAN)
                                   src/modules/matching/matching.service.ts — PostGIS ST_DWithin CTE + cursor pagination + Redis TTL 60s
                                   src/modules/matching/matching.module.ts — exports MatchingService
[DONE] Module Salons               GET /salons/:id, PATCH /salons/me, PATCH /salons/hiring-status
[DONE] Module Media                POST /media/upload — AWS S3 + sharp (avatar 200×200 WebP, portfolio 800px JPEG, video passthrough)
[DONE] Phase 2.4                   Mobile screens complete — WorkerProfileScreen, EditProfileScreen, PortfolioUploadScreen
[DONE] Module Jobs                 POST/GET/PATCH/DELETE /jobs — salon-only create (ForbiddenException if no SalonProfile)
                                   list: isActive+expiresAt>now filter, cityId required, specialty?/type? optional, PaginatedResponse
                                   soft-delete: isActive=false, ownership via salon.userId check
                                   [TODO] BullMQ auto-expiration (deferred — query filter handles expiry correctly)
[DONE] Module Messaging            POST/GET /conversations — idempotent createConversation, getConversations+preview+unreadCount
                                   GET /conversations/:id/messages — cursor pagination (30/page)
                                   POST /conversations/:id/messages — send + WS broadcast
                                   PATCH /conversations/:id/read — mark all received msgs read
                                   MessagingGateway WS: join/leave:conversation rooms, typing:start/stop → emit 'typing', broadcastMessage()
                                   deps: @nestjs/websockets, @nestjs/platform-socket.io, socket.io
[DONE] Module Verify               POST /verify/identity — WORKER only, creates Stripe Identity session → {url,sessionId}
                                   POST /verify/webhook — raw body, constructEvent, sets isVerified:true on verified
                                   PATCH /verify/salon/ein — SALON only, stores EIN on SalonProfile
                                   PATCH /admin/salons/:id/verify — ADMIN only, manually sets SalonProfile.isVerified
                                   rawBody: true added to NestFactory.create() in main.ts
                                   stripe ^15.0.0 added to API deps
[DONE] Module Reports              POST /reports — JwtAuthGuard, idempotent (no duplicate PENDING same type), enqueues BullMQ check-suspension job
                                   ReportsProcessor: counts PENDING reports for reportedId → if ≥3 sets User.isActive=false
                                   BullMQ queue name: 'reports' — @nestjs/bullmq ^10.0.0 + bullmq ^5.0.0
                                   ReportsService: flexible lookup — accepts User.id OR WorkerProfile.id OR SalonProfile.id as reportedUserId
[TODO] Module Notifications        push Expo, email
[TODO] Module Analytics            events, métriques par ville
[DONE] Common Guards               JwtAuthGuard — src/common/guards/jwt-auth.guard.ts
[TODO] Common Guards (remaining)   RolesGuard, OwnershipGuard
[DONE] Common Pipes                ValidationPipe — global in main.ts (whitelist+transform+forbidNonWhitelisted)
[DONE] Common Filters              GlobalExceptionFilter — src/common/filters/global-exception.filter.ts

--- Endpoints ---
[DONE] POST /auth/register         → User + WorkerProfile|SalonProfile
[DONE] POST /auth/login            → { accessToken, refreshToken, user }
[DONE] POST /auth/refresh          → { accessToken, refreshToken } — Redis blacklist check
[DONE] POST /auth/logout           → 204 — invalidates refreshToken in Redis (TTL 7d)
[DONE] GET  /workers/nearby        lat, lng, radiusMiles, cityId, specialty?, availability?, cursor? → CursorResponse<WorkerCardData>
                                   PostGIS ST_DWithin CTE, ORDER BY distance ASC, LIMIT 51, Redis TTL 60s
                                   Cache invalidated on PATCH /workers/availability
[DONE] GET  /workers/me            JwtAuthGuard — returns WorkerProfileFull (with portfolioItems + user)
[DONE] GET  /workers/:id           → WorkerProfileFull (id = WorkerProfile.id)
[DONE] PATCH /workers/me           JwtAuthGuard — owner check via CurrentUser
[DONE] PATCH /workers/availability JwtAuthGuard
[DONE] POST /workers/location      JwtAuthGuard — PostGIS $executeRaw ST_SetSRID(ST_MakePoint)
[DONE] POST /workers/portfolio     JwtAuthGuard — creates PortfolioItem{workerId,mediaUrl,type,caption?}
[DONE] GET  /salons/:id            → SalonProfile
[DONE] PATCH /salons/me            JwtAuthGuard — owner check
[DONE] PATCH /salons/hiring-status JwtAuthGuard
[DONE] POST /media/upload          JwtAuthGuard — FileInterceptor(memoryStorage), ?folder= query param
[DONE] POST /jobs                  JwtAuthGuard — salon only (ForbiddenException if no SalonProfile)
[DONE] GET  /jobs                  cityId required, specialty?, type?, page?, limit? → PaginatedResponse<JobPostCardData>
[DONE] GET  /jobs/:id              → JobPost + salon info
[DONE] PATCH /jobs/:id             JwtAuthGuard — ownership check via salon.userId
[DONE] DELETE /jobs/:id            JwtAuthGuard — soft delete (isActive: false)
[DONE] GET  /conversations           JwtAuthGuard — ConversationPreview[] with last message + unread count
[DONE] POST /conversations           JwtAuthGuard — idempotent create/find conversation
[DONE] GET  /conversations/:id/messages  JwtAuthGuard — participant check, cursor pagination → CursorResponse<Message>
[DONE] POST /conversations/:id/messages  JwtAuthGuard — send + WS broadcastMessage → socket room conv:{id}
[DONE] PATCH /conversations/:id/read     JwtAuthGuard — updateMany isRead:true for received messages
[DONE] POST /verify/identity       JwtAuthGuard + WORKER role check → Stripe Identity session {url,sessionId}
[DONE] POST /verify/webhook        no auth, raw body → handle identity.verification_session.verified
[DONE] PATCH /verify/salon/ein     JwtAuthGuard + SALON role check → store EIN
[DONE] PATCH /admin/salons/:id/verify  JwtAuthGuard + ADMIN role check → isVerified:true
[DONE] POST /reports               JwtAuthGuard — cannot self-report, no dup PENDING same type, enqueues check-suspension
                                   auto-suspend: BullMQ processor counts PENDING reports → ≥3 → User.isActive=false

---

## MOBILE — SCREENS (apps/mobile)

--- Auth ---
[DONE] LoginScreen                 src/screens/auth/LoginScreen.tsx — email+password → useAuth.login() → /(tabs)
[DONE] RegisterScreen              src/screens/auth/RegisterScreen.tsx — name+email+password+role → useAuth.register()
[DONE] RoleSelectScreen            src/screens/auth/RoleSelectScreen.tsx — WORKER|SALON picker → register with role

--- Onboarding ---
[TODO] OnboardingScreen            flow < 3 min

--- Feed ---
[DONE] DiscoveryFeedScreen         FlatList+WorkerCard, specialty pills (8 presets), pull-to-refresh, skeleton/empty/error states
                                   no-location: city preset picker (DMV, Atlanta) — app/(tabs)/index.tsx
                                   WorkerCard onLongPress → ReportModal (reportedUserId = WorkerProfile.id, resolved server-side)
[DONE] JobFeedScreen               FlatList+JobPostCard, specialty pills, pull-to-refresh, skeleton/empty/error states
                                   “Post Job” button visible for SALON role — app/(tabs)/jobs.tsx

--- Profils ---
[DONE] WorkerProfileScreen         hero(Avatar xl)+bio+specialties+portfolio+edit link(owner) — app/worker/[id].tsx
[DONE] EditProfileScreen           name+bio+specialties+exp+availability+photo upload (pickAvatar) — app/worker/edit.tsx
[DONE] PortfolioUploadScreen       PortfolioGrid+addPhoto+addVideo buttons (useMediaUpload) — app/worker/portfolio.tsx
[TODO] SalonProfileScreen
[DONE] CreateJobPostScreen         title+description+specialty+pay+type picker+duration picker+urgent toggle
                                   expiresAt computed from duration (7/14/30 days) — app/jobs/create.tsx

--- Detail ---
[DONE] JobDetailScreen             placeholder — app/jobs/[id].tsx (full detail screen Phase 4+)

--- Messagerie ---
[DONE] ConversationsListScreen     FlatList+ConversationItem, pull-to-refresh, skeleton/empty states — app/(tabs)/messages.tsx
                                   nav to ChatScreen passes: id, name, otherUserId
[DONE] ChatScreen                  inverted FlatList+MessageBubble, KeyboardAvoidingView, TextInput, WS typing indicator
                                   markAsRead on mount — app/chat/[id].tsx (params: id, name, otherUserId?)
                                   '⋯' header button → ReportModal when otherUserId present

--- Mon compte ---
[DONE] ProfileScreen               placeholder — app/(tabs)/profile.tsx (full profile Phase 5+)

--- Hooks ---
[DONE] useAuth()                   src/hooks/useAuth.ts — login/register/logout + isAuthenticated
[DONE] useMediaUpload(options)     src/hooks/useMediaUpload.ts — expo-image-picker gallery → S3 upload → url
                                   options: { folder: avatars|portfolio|uploads, type: image|video|any, allowsEditing }
[DONE] useWorkerProfile(id)        src/hooks/useWorkerProfile.ts — useState+useEffect, GET /workers/:id
[DONE] useMyWorkerProfile()        src/hooks/useWorkerProfile.ts — GET /workers/me + refetch() trigger
[DONE] useNearbyWorkers(opts)      src/hooks/useNearbyWorkers.ts — refresh/loadMore/cursor pagination, specialty+availability filters
                                   enabled only when cityId+lat+lng set; isRefreshRef tracks pull-to-refresh vs filter change
[DONE] useJobFeed(opts)            src/hooks/useJobFeed.ts — offset pagination (page/limit), cityId from locationStore
                                   refresh() + loadMore() + isLoading/isRefreshing/isLoadingMore/hasMore/error
[DONE] useLocationStore()          src/store/locationStore.ts — Zustand: cityId|lat|lng|null, setLocation(), clearLocation()
[DONE] useMessages(conversationId) src/hooks/useMessages.ts — socket.io-client WS (join/leave room, message:received, typing)
                                   loadMore() cursor pagination + sendMessage() + setTyping()
[DONE] useConversations()          src/hooks/useConversations.ts — load + refresh ConversationPreview[]
[TODO] useNotifications()

--- Stores Zustand ---
[DONE] authStore                   src/store/authStore.ts — user, accessToken, refreshToken, isLoading + setTokens/clearAuth/setLoading
[DONE] locationStore               src/store/locationStore.ts — { cityId, lat, lng, setLocation(cityId,lat,lng), clearLocation() }

---

## WEB — PAGES (apps/web)

[TODO] /                           landing page
[DONE] /workers                    workers page — CSS Grid auto-fill minmax(300px), sidebar filters, Intersection Observer infinite scroll
                                   web WorkerCard: same visuals as @salonin/ui, pure HTML/CSS (no RNW)
                                   web locationStore (Zustand) + web useNearbyWorkers (same interface as mobile)
[TODO] /workers/[id]               profil worker
[TODO] /salons/[id]                profil salon
[DONE] /jobs                       web jobs feed — CSS Grid auto-fill, sidebar filters, Intersection Observer scroll
                                   web JobPostCard + web useJobFeed (same interface as mobile)
[TODO] /jobs/[id]                  détail job
[DONE] /messages                   split view — 300px sidebar (ConversationItem list) + main ChatPanel
                                   useConversations + useMessages(selectedId), WS typing indicator, skeleton loaders
[DONE] /login                      src/app/(auth)/login/page.tsx — 'use client', email+password form
[DONE] /register                   src/app/(auth)/register/page.tsx — 'use client', role toggle + name/email/password

---

## INFRA & DÉPLOIEMENT

[DONE] Phase 6.1 tests             jest ^29 + ts-jest ^29 + @nestjs/testing ^10 + supertest ^7 added to apps/api devDeps
                                   jest.config.ts: rootDir=src, ts-jest, node env, coverage lcov
                                   turbo.json: test task added (dependsOn build, outputs coverage/**)
[DONE] reports.service.spec.ts     6 tests: self-report guard, not-found, dup-pending, success create+enqueue, reason pass-through, flexible OR lookup
[DONE] reports.processor.spec.ts   4 tests: <3 no suspend, =3 suspend, >3 suspend, PENDING filter
[DONE] matching.service.spec.ts    11 tests: cache hit/miss, pagination (hasMore, nextCursor, length=50), base64 cursor decode, distanceMiles conversion, pg array string parse, native array, empty {}, isVerified cast
[DONE] jobs.service.spec.ts        10 tests: create forbidden/success/isUrgent, getById not-found/found, remove not-found/forbidden/soft-delete, update not-found/forbidden/partial-fields
[DONE] Phase 6.2 CI pipeline       .github/workflows/ci.yml — 6 jobs:
                                     quality: type-check all workspaces (turbo)
                                     test: unit tests + coverage artifact (14d retention)
                                     test-integration: postgis:15-3.4 + redis:7 services, prisma db push, placeholder step
                                     build-web: pnpm --filter @salonin/web build (NEXT_PUBLIC_API_URL=localhost:4000)
                                     build-api-docker: docker/build-push-action@v5, no push, GHA cache
                                     build-mobile: EAS build --platform all, main branch only, requires EAS_TOKEN secret
[DONE] apps/api/Dockerfile         multi-stage: builder (node:20-alpine, pnpm install, prisma generate, export prisma-client from pnpm store, nest webpack build)
                                     runner (pnpm install --prod, COPY --from=builder prisma-client → overlay into runner pnpm store, copy dist/)
                                     ⚠️ pnpm virtual store: prisma client lives under node_modules/.pnpm/@prisma+client@*/..., NOT flat node_modules/.prisma
[DONE] apps/web/Dockerfile         multi-stage: builder (pnpm install, prisma generate, next build) → runner (standalone output, port 8080)
[DONE] apps/api/railway.json       builder: DOCKERFILE, healthcheckPath: /health, restartPolicyType: ON_FAILURE (max 3)
[DONE] apps/web/railway.json       builder: DOCKERFILE, healthcheckPath: /, restartPolicyType: ON_FAILURE (max 3)
[DONE] DEPLOY.md                   Railway deployment guide — 8-step walkthrough, env vars reference, CI pipeline docs,
                                     post-deploy checklist, rollback plan, troubleshooting (Docker, Railway, Prisma, CORS)
[DONE] apps/api/nest-cli.json      webpack: true, webpackConfigPath: webpack.config.js
[DONE] apps/api/webpack.config.js  nodeExternals allowlist: [/^@salonin\//] — workspace packages inlined in bundle
[DONE] .dockerignore               node_modules, .env, .git, Windsurf/, dist, coverage excluded
[DONE] Phase 6.3 Monitoring        Datadog APM: dd-trace ^5 init in apps/api/src/tracing.ts (service/env/hostname from env)
                                   Datadog StatsD: hot-shots ^10 via MetricsService (@Global) — timing/increment/gauge
                                   MetricsModule: @Global, exported to all modules
                                   MatchingService: 3 custom metrics wired:
                                     salonin.geo_query_duration (timing ms, tag city)
                                     salonin.cache.hit / salonin.cache.miss (increment, tag city)
                                     salonin.active_workers_by_city (gauge, tag city)
                                   Sentry API: @sentry/node ^8, init in apps/api/src/instrument.ts
                                     tracesSampleRate 0.2 prod / 1.0 dev, enabled only if SENTRY_DSN set
                                   Sentry Web: @sentry/nextjs ^8 — sentry.{client,server,edge}.config.ts
                                     client: Replay integration, replaysOnErrorSampleRate 1.0
                                     apps/web/next.config.ts: withSentryConfig (hideSourceMaps, silent unless CI)
                                   Sentry Mobile: @sentry/react-native ^5
                                     apps/mobile/app/_layout.tsx: Sentry.init + Sentry.wrap(RootLayout)
                                     EXPO_PUBLIC_SENTRY_DSN (inlined by Metro at build time)
                                   .env.example: DD_SERVICE/DD_ENV/DD_AGENT_HOST, SENTRY_DSN/ORG/PROJECT, NEXT_PUBLIC_SENTRY_DSN, EXPO_PUBLIC_SENTRY_DSN
                                   main.ts: import './tracing' + import './instrument' FIRST (before reflect-metadata)
[DONE] deploy blockers resolved
  configureClient()               mobile: _layout.tsx calls configureClient(EXPO_PUBLIC_API_URL ?? localhost:4000)
                                   web: layout.tsx calls configureClient(NEXT_PUBLIC_API_URL ?? localhost:4000)
  GET /health                      apps/api/src/health/health.controller.ts — checks Prisma ($queryRaw SELECT 1)
                                     and Redis (get __health__); returns {status,db,cache,timestamp}
                                     503 ServiceUnavailableException if DB is down
                                     HealthModule registered in AppModule
  prisma/migrations baseline       2 migrations tracked, shadow-DB workaround via migrate diff --from-empty
                                     + migrate resolve --applied for already-synced local DB
                                     production CI can now use: prisma migrate deploy
[DONE] auth: Supabase→PostgreSQL   removed @supabase/supabase-js entirely
                                   auth.service.ts: bcrypt ^5 (SALT_ROUNDS=12) + @nestjs/jwt ^10
                                     register: findUnique duplicate check → bcrypt.hash → prisma.user.create
                                     login: findUnique → bcrypt.compare → issueTokens
                                     refresh: redis GET refresh:{token} → del → issueTokens (rotation)
                                     logout: redis DEL refresh:{token}
                                     issueTokens: jwt.sign({sub,email}, 15m) + randomUUID stored redis 7d
                                   jwt.strategy.ts: secretOrKey uses JWT_SECRET (was SUPABASE_JWT_SECRET)
                                   auth.module.ts: JwtModule.registerAsync(JWT_SECRET, expiresIn:15m)
                                   prisma/schema.prisma: User.passwordHash String? added
                                   .env.example: JWT_SECRET, AWS_*, STRIPE_*, NEXT_PUBLIC_API_URL,
                                                 EXPO_PUBLIC_API_URL, SENTRY_AUTH_TOKEN added
                                                 SUPABASE_* removed
[TODO] Integration tests           *.integration-spec.ts for GET /workers/nearby + auth flows
[TODO] GitHub Actions deploy       api→Railway (auto-deploy on main), web→Railway, mobile→EAS OTA (deploy.yml)
                                     current: DEPLOY.md documents manual Railway setup; auto-deploy via GitHub integration
[TODO] Datadog alerts              API p95 > 500ms, error rate > 1%, cache hit < 70% (Datadog UI config)
[TODO] Custom domain               api.salonin.com + app.salonin.com — CNAME → Railway, update CORS_ORIGINS + API_URL vars

---

## PROCÉDURE DE MISE À JOUR

Après chaque session, Claude fournit :
=== MISE À JOUR REGISTRE ===
[DONE] Nom du fichier/module   description courte
[WIP]  Nom du fichier/module   EN COURS — NE PAS TOUCHER
============================

Tu cherches la ligne dans ce fichier et tu changes le statut.
Tu sauvegardes, puis Cmd+Shift+P → Reload Window.


### Règle 2 — Jamais de réécriture complète
```
Si je te demande "améliore WorkerCard", tu modifies UNIQUEMENT ce qui est demandé.
Tu ne réécris PAS le composant entier.
Tu ne "nettoies" PAS le code existant sans qu'on te le demande.
Tu ne "refactorises" PAS ce qui n'est pas dans la tâche.
```

### Règle 3 — Props API stables
```typescript
// Une fois un endpoint créé [DONE], son contrat ne change JAMAIS sans discussion
// GET /workers/nearby?lat=&lng=&radius=&cityId=
// → ne devient pas GET /workers?location=&r= dans une session suivante
```

### Règle 4 — Isolation des changements UI
```typescript
// Si tu modifies un style global (couleur, spacing, font)
// tu listes TOUS les composants qui utilisent ce style
// AVANT de faire le changement

// Exemple : changer la couleur primary de orange → coral
// Impact : Button (variant=primary), AvailabilityBadge (NOW),
//          JobPostCard (isUrgent), OnboardingScreen (CTA)
// → je les liste, tu confirmes, ALORS je change
```

### Règle 5 — Zéro AI fingerprint
```typescript
// ❌ Commentaires inutiles générés par défaut
// This function handles the worker data fetching logic
// We use useQuery here to fetch the data from the API
// Return the JSX for the worker card component

// ✅ Commentaires uniquement quand la logique est non-évidente
// PostGIS retourne la distance en mètres — conversion obligatoire ici
// TTL 60s aligné avec le cache Redis côté API
```

---

## DÉTECTION DES DUPLICATIONS — CHECKLIST AUTOMATIQUE

Avant de créer un fichier, Claude vérifie chaque ligne :

| Ce que je veux créer | Vérification obligatoire |
|---|---|
| Un composant Card | Est-il dans le registre ? Sinon → demander |
| Un hook `useXxx` | Existe-t-il déjà dans le registre ? |
| Une fonction `formatXxx` | Est-elle dans `@beauty/utils` ? |
| Un type ou interface | Est-il dans `@beauty/types` ? |
| Un appel API | L'endpoint est-il dans le registre ? |
| Un store Zustand | Existe-t-il déjà un store pour ce domaine ? |
| Une constante | Est-elle dans `@beauty/config` ou `@beauty/utils` ? |

---

## FORMAT DE TÂCHE — CE QUE TU M'ENVOIES

Pour chaque tâche, utilise CE format exact :

```
REGISTRE : [colle le registre actuel ici]

TÂCHE : [description précise de ce que tu veux]

FICHIERS CONCERNÉS : [liste les fichiers que tu penses être touchés]

CE QUI DOIT RESTER INTACT : [liste ce qui ne doit pas bouger]

DÉFINITION DE "DONE" : [comment tu sais que c'est terminé et ça marche]
```

Exemple réel :
```
REGISTRE : [... ton registre collé ici ...]

TÂCHE : Créer JobFeedScreen mobile qui liste les hiring posts
        avec filtre par spécialité

FICHIERS CONCERNÉS : nouveau fichier JobFeedScreen.tsx,
                     nouveau hook useJobFeed.ts,
                     nouvel endpoint GET /jobs (pas encore dans le registre)

CE QUI DOIT RESTER INTACT : WorkerFeedScreen, WorkerCard,
                             tous les [DONE] du registre

DÉFINITION DE "DONE" :
- L'écran affiche les jobs avec JobPostCard (existant)
- Le filtre par spécialité fonctionne
- Loading/empty/error states gérés
- Aucun composant [DONE] modifié
```

---

## SIGNAUX D'ALARME — ARRÊTE-TOI SI TU VOIS ÇA

Claude doit STOPPER et demander confirmation si :

🚨 Il est sur le point de modifier un fichier marqué [WIP] dans le registre
🚨 Il réécrit plus de 30% d'un composant [DONE] existant
🚨 Il crée un composant dont le nom est proche d'un existant (Card, Item, Row...)
🚨 Il change le nom ou le type d'une prop existante
🚨 Il modifie un fichier qui n'est pas dans la liste "FICHIERS CONCERNÉS"
🚨 Il introduit une nouvelle dépendance npm non discutée
🚨 Il change une route d'API existante

Dans ces cas, il écrit :
```
⚠️ STOP — CONFIRMATION REQUISE
Je suis sur le point de [action].
Cela va affecter [composant/fichier].
Dois-je continuer ? [OUI / NON / alternative]
```

---

## MISE À JOUR DU REGISTRE — PROCÉDURE

Après chaque session productive :
1. Claude fournit le bloc "MISE À JOUR REGISTRE"
2. Tu copies ce bloc dans ton fichier registre local
3. Tu colles le registre mis à jour au début de la session suivante

C'est le seul moyen de maintenir la continuité entre sessions.
Sans registre à jour = Claude travaille à l'aveugle = régressions garanties.

---

*Ce système ne remplace pas les tests automatisés.
Il est le filet de sécurité humain entre deux sessions de développement.*
