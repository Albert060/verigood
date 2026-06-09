# VeriGood — CLAUDE.md

Plataforma SaaS de herramientas IA para docentes de colegios españoles.
Monorepo npm workspaces: `/frontend` (React + Vite) + `/backend` (Node + Express).

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Query v5, Zustand v4, React Router v6, Axios |
| Backend | Node.js 20, Express, PostgreSQL (pg), JWT auth |
| IA | Anthropic SDK — `claude-haiku-4-5-20251001` (correcciones), `claude-sonnet-4-6` (generación) |
| OCR | Google Cloud Vision API |
| Pagos | Stripe (checkout sessions, customer portal, webhooks) |
| Deploy | Nginx + PM2 + VPS Madrid |

---

## Estructura de directorios

```
verigood/
├── package.json              # npm workspaces root
├── .env.example              # todas las variables de entorno
├── ecosystem.config.js       # PM2 — cluster mode, 2 instancias
├── nginx.conf                # reverse proxy, SSL, rate limiting
├── deploy.sh                 # script de despliegue VPS
│
├── agentes/                  # Agentes especializados de desarrollo (docs md)
│   ├── README.md             # Flujo: arquitecto → dev → auditor → tester → documentador
│   ├── arquitecto-software.md
│   ├── desarrollador.md
│   ├── auditor.md
│   ├── tester.md
│   └── documentador.md
│
├── backend/
│   └── src/
│       ├── index.js          # Express app, middlewares, rutas
│       ├── config/
│       │   └── database.js   # pg Pool, helper query()
│       ├── middleware/
│       │   └── auth.js       # authenticate, authorize, requireModule (lee organization_modules)
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── usersController.js
│       │   ├── modulesController.js      # catálogo, activación, onboarding-state
│       │   └── organizationsController.js
│       ├── routes/
│       │   ├── auth.js
│       │   ├── users.js
│       │   ├── organizations.js
│       │   ├── modules.js                # catálogo + toggle + onboarding
│       │   ├── cambridge.js
│       │   ├── lengua.js
│       │   ├── matematicas.js
│       │   ├── medio.js
│       │   └── stripe.js
│       ├── services/
│       │   ├── claudeService.js          # callClaude(), callClaudeJSON(), parseJSON()
│       │   ├── examGeneratorService.js   # híbrido DB + IA
│       │   ├── ocrCorrectorService.js    # Google Vision → Claude Haiku
│       │   ├── dynamicsService.js
│       │   ├── presentationsService.js
│       │   ├── lenguaService.js
│       │   └── matematicasService.js
│       ├── migrations/
│       │   ├── 001_initial_schema.sql
│       │   └── 002_modules_catalog.sql   # tablas modules + organization_modules + onboarding
│       └── seeds/
│           ├── 001_modules_catalog.sql   # SISTEMA — catálogo cerrado de módulos (también en prod)
│           └── dev_demo_data.sql         # DEMO — admin@verigood.com / demo1234
│
└── frontend/
    └── src/
        ├── App.jsx                       # BrowserRouter, todas las rutas
        ├── main.jsx                      # QueryClient, StrictMode
        ├── index.css                     # design system completo (clases CSS custom)
        ├── stores/
        │   └── authStore.js              # Zustand + persist
        ├── services/
        │   └── api.js                    # Axios + interceptor JWT refresh
        ├── components/
        │   ├── ui/
        │   │   ├── index.jsx             # Button, Card, TagCloud, ProgressBar, etc.
        │   │   └── EmptyState.jsx        # estado vacío reutilizable
        │   ├── onboarding/
        │   │   └── OnboardingHero.jsx    # hero de bienvenida con 3 CTAs
        │   └── layout/
        │       ├── Topbar.jsx
        │       ├── Sidebar.jsx
        │       └── SidebarStage.jsx      # agrupación por etapa (Primaria / ESO)
        └── pages/
            ├── auth/                     # LoginPage, RegisterPage
            ├── landing/                  # LandingPage (pública, marketing)
            ├── superadmin/               # Dashboard, Organizations, Billing, System
            ├── institutional/            # Dashboard, Users, Modules, Stats, Billing
            ├── placeholder/              # ModulePlaceholderPage (módulos sin layout propio)
            ├── cambridge/                # Home, ExamGenerator, ExamsList, OcrCorrector,
            │                             # DynamicsGenerator, PresentationGenerator
            ├── lengua/                   # Home, ExerciseGenerator, EssayCorrector,
            │                             # SyntaxAnalysis, TextCommentary, LenguaDynamics
            ├── matematicas/              # Home, ProblemGenerator, PhotoCorrector, ExerciseSeries
            └── medio/                    # Home, ThematicSheets, Questionnaires, STEMActivities
```

---

## Auth & Roles

JWT access tokens (15 min) + rotating refresh tokens (7 días, almacenados en PostgreSQL).

| Role | Acceso |
|------|--------|
| `superadmin` | `/superadmin/*` — gestiona organizaciones, facturación global |
| `admin_centro` | `/dashboard/*` — gestiona usuarios, módulos, stats del colegio |
| `profesor` | `/dashboard` (sólo lectura) + módulos activos de su org |

El middleware `requireModule(name)` comprueba `organization.active_modules[]` en la DB antes de cada ruta IA.

---

## Módulos

Los módulos viven en un **catálogo cerrado** (tabla `modules`, seed `001_modules_catalog.sql`).
Se activan por organización vía `organization_modules` (pivote). El antiguo `organizations.active_modules[]` (ENUM array) queda DEPRECATED y se elimina en migración 003.

### Catálogo Fase 1

**Primaria** (`stage = 'primaria'`):

| ID | Nombre | Categoría | Ruta |
|----|--------|-----------|------|
| `matematicas_primaria` | Matemáticas | asignatura | `/primaria/matematicas` |
| `lengua_primaria` | Lengua castellana y literatura | asignatura | `/primaria/lengua` |
| `ingles_primaria` | Inglés | asignatura | `/primaria/ingles` |
| `medio_primaria` | Conocimiento del medio natural, social y cultural | asignatura | `/primaria/medio` |
| `plastica_primaria` | Plástica | asignatura | `/primaria/plastica` |
| `ed_fisica_primaria` | Educación física | asignatura | `/primaria/ed-fisica` |
| `musica_primaria` | Música | asignatura | `/primaria/musica` |
| `ed_artistica_primaria` | Educación artística | asignatura | `/primaria/ed-artistica` |
| `religion_primaria` | Religión | asignatura | `/primaria/religion` |
| `ciudadania_primaria` | Ed. Ciudadanía | asignatura | `/primaria/ciudadania` |

> `ed_artistica_primaria` (LOMLOE: paraguas que engloba Plástica + Música) coexiste con `plastica_primaria` y `musica_primaria`. El centro elige granularidad al activar.

**ESO** (`stage = 'eso'`):

| ID | Nombre | Categoría | Ruta |
|----|--------|-----------|------|
| `lengua_eso` | Lengua castellana y literatura | asignatura | `/eso/lengua` |
| `matematicas_eso` | Matemáticas | asignatura | `/eso/matematicas` |
| `ingles_eso` | Inglés | asignatura | `/eso/ingles` |
| `cambridge` | Cambridge | preparacion_examen | `/eso/cambridge` → `/cambridge` |
| `geo_historia_eso` | Geografía e Historia | asignatura | `/eso/geh` |
| `ed_fisica_eso` | Educación física | asignatura | `/eso/ed-fisica` |
| `bio_geo_eso` | Biología y Geología | asignatura | `/eso/byg` |
| `tecno_digital_eso` | Tecnología y digitalización | asignatura | `/eso/tecno-digital` |
| `fis_quim_eso` | Física y Química | asignatura | `/eso/fyq` |
| `epva_eso` | Educación plástica, visual y audiovisual | asignatura | `/eso/epva` |
| `religion_eso` | Religión | religion_valores | `/eso/religion` |
| `valores_eticos_eso` | Educación en valores éticos | religion_valores | `/eso/valores-eticos` |
| `tutorias_eso` | Tutorías | accion_tutorial | `/eso/tutorias` |

**Categorías** (`modules.category`): `asignatura`, `preparacion_examen`, `religion_valores`, `accion_tutorial`. Es un dominio abierto (`VARCHAR`); añadir más sólo requiere actualizar `CATEGORY_LABELS`/`CATEGORY_ORDER` en `Modules.jsx`.

Sólo `cambridge` tiene layout propio. El resto renderizan `ModulePlaceholderPage` hasta que se construya su layout. Las etapas vacías (sin módulos activos) se ocultan en la sidebar.

Para añadir un módulo nuevo: (1) insertar fila en el seed `001_modules_catalog.sql`, (2) añadir su `<Route>` placeholder en `App.jsx`, (3) si usa un `icon` nuevo, mapearlo en `ICON_GLYPHS` de `SidebarStage.jsx`. Sin cambios de esquema ni de controlador.

### Módulos legacy (en vías de rediseño)

Las rutas `/lengua`, `/matematicas`, `/medio` siguen montadas en `App.jsx` y siguen usando los IDs antiguos (`espanol`, `matematicas`, `medio`) que **no están en el catálogo nuevo** — quedarán inalcanzables hasta que se decida su mapeo al catálogo Fase 1.

---

## API — endpoints principales

### Auth
```
POST /api/auth/register    # crea org + admin en transacción
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

### Módulos (catálogo + activación)
```
GET    /api/modules                                          # catálogo global
GET    /api/organizations/:orgId/modules                     # módulos activos de la org
POST   /api/organizations/:orgId/modules/:moduleId/activate  # admin_centro|superadmin
DELETE /api/organizations/:orgId/modules/:moduleId           # admin_centro|superadmin
GET    /api/organizations/:orgId/onboarding-state
POST   /api/organizations/:orgId/onboarding-state/complete   # admin_centro|superadmin
```

### Cambridge
```
POST /api/cambridge/exams/generate     # hybrid DB+AI exam generation
POST /api/cambridge/exams/save
GET  /api/cambridge/exams
POST /api/cambridge/ocr/correct        # multipart/form-data: examImage
POST /api/cambridge/dynamics/generate
POST /api/cambridge/presentations/generate
```

### Lengua
```
POST /api/lengua/exercises/generate
POST /api/lengua/essays/correct
POST /api/lengua/syntax/analyze
POST /api/lengua/commentary/generate
POST /api/lengua/dynamics/generate
```

### Matemáticas
```
POST /api/matematicas/problems/generate
POST /api/matematicas/photo/correct    # multipart/form-data: mathImage
POST /api/matematicas/series/generate
```

### C. del Medio
```
POST /api/medio/sheets/generate
POST /api/medio/quizzes/generate
POST /api/medio/stem/generate
```

### Stripe
```
GET  /api/stripe/plans
POST /api/stripe/checkout
POST /api/stripe/portal
POST /api/stripe/webhook               # raw body — registrar ANTES de express.json()
```

---

## Variables de entorno

El archivo `.env.example` está en la raíz. En producción crear `backend/.env`:

```env
# Base de datos
DATABASE_URL=postgresql://user:pass@localhost:5432/verigood
DB_SSL=false

# JWT
JWT_SECRET=cambia_esto_en_produccion
JWT_REFRESH_SECRET=cambia_esto_tambien
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google Vision (OCR)
GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_CENTRO=price_...

# App
PORT=3001
CORS_ORIGIN=https://verigood.es
NODE_ENV=production
```

---

## Comandos de desarrollo

```bash
# Instalar todo desde la raíz
npm install

# Arrancar backend + frontend en paralelo
npm run dev

# Sólo backend (puerto 3001)
npm run dev:backend

# Sólo frontend (puerto 5173, proxy /api → 3001)
npm run dev:frontend

# Migraciones (orden estricto)
psql $DATABASE_URL -f backend/src/migrations/001_initial_schema.sql
psql $DATABASE_URL -f backend/src/migrations/002_modules_catalog.sql

# Seed de SISTEMA (también en producción) — catálogo de módulos
psql $DATABASE_URL -f backend/src/seeds/001_modules_catalog.sql

# Seed de DEMO (sólo dev) — usuarios y datos de prueba
psql $DATABASE_URL -f backend/src/seeds/dev_demo_data.sql
# → admin@verigood.com / demo1234
# → profesor@verigood.com / demo1234
```

---

## Design system — "Cuaderno del Catedrático"

Definido en `frontend/src/index.css` y `frontend/tailwind.config.js`.

**Paleta:**
```
papel    #EDE6D6   fondo principal
tinta    #14182B   texto principal
marino   #1F2A4D   Cambridge / acción primaria
granate  #6B1F2A   Lengua / errores
amarillo #E8D89A   avisos
linea    #B8A988   bordes, texto secundario
```

**Fuentes:** Libre Baskerville (títulos, `font-display`), Inter (cuerpo), Caveat (anotaciones manuscritas, `font-caveat`), JetBrains Mono (datos, `font-mono`)

**Reglas de diseño:**
- `border-radius` máximo 2px — sin píldoras, sin esquinas redondeadas
- Sin gradientes. Sin emojis en UI.
- Sombras secas: `box-shadow: 2px 2px 0 rgba(184,169,136,0.4)`
- Card corner fold via `clip-path` (clase `.card-fold`)
- Fondo cuadrícula 24px al 8% de opacidad (clase `.bg-grid-paper`)
- Score stamps rotados con opacidad (clase `.score-stamp`)
- Números romanos en márgenes como decoración (§ I, § II...)

**Clases CSS propias más usadas:**
```
.bg-grid-paper    fondo cuadrícula papel
.card-fold        esquina doblada (clip-path)
.score-stamp      sello de nota rotado
.vg-input         input estilizado
.vg-select        select estilizado
.vg-textarea      textarea estilizado
.btn-primary      botón principal marino
.btn-ghost        botón transparente con borde
.upload-zone      zona de drag & drop
.section-label    etiqueta de sección en mayúsculas mono
.vg-table         tabla con estilo cuaderno
.wstep-num        número de paso en wizard
```

---

## Patrones de código a seguir

### Llamada a IA (backend)
```js
// Siempre usar callClaudeJSON() para respuestas estructuradas
const result = await callClaudeJSON(
  `claude-haiku-4-5-20251001`,   // haiku para correcciones rápidas
  systemPrompt,
  userMessage,
  { maxTokens: 2048 }
);
// parseJSON() maneja bloques markdown, trailing commas, etc.
```

### Mutation en frontend
```jsx
const { mutate, isPending } = useMutation({
  mutationFn: () => cambridgeApi.generateExam(form),
  onSuccess: (res) => setResult(res.data),
});
```

### Protección de rutas
```jsx
// Por rol
<ProtectedRoute roles={['admin_centro']}>
  <InstitutionalUsers />
</ProtectedRoute>

// Por módulo activo — consulta organization_modules vía React Query
// (NO usa user.activeModules del JWT, que se queda stale tras toggles)
<ProtectedRoute module="cambridge">
  <CambridgeLayout />
</ProtectedRoute>
```

### Flujo de trabajo con agentes

`/agentes` contiene 5 perfiles de agente especializado. Para nuevas funcionalidades:
`arquitecto-software → desarrollador → auditor → tester → documentador`.
Ver `agentes/README.md` para los detalles y cuándo saltar pasos.

---

## Base de datos — tablas principales

```sql
organizations         -- colegios/academias (multi-tenant)
                      --   + onboarding_completed_at, created_with_demo_data
                      --   + active_modules[] DEPRECATED (eliminar en migración 003)
users                 -- superadmin | admin_centro | profesor
refresh_tokens        -- rotating tokens con expiración
modules               -- catálogo cerrado (id, name, stage, category, route_prefix...)
organization_modules  -- pivote: qué módulos tiene activa cada org
exams                 -- exámenes generados (Cambridge)
exam_questions        -- banco de preguntas (BD híbrida)
exam_attempts         -- intentos de corrección OCR
resources             -- biblioteca de recursos por módulo
usage_logs            -- registro de consumo IA por org/usuario
```

---

## Deploy en VPS Madrid

```bash
# Primera vez
cp .env.example backend/.env
# → editar backend/.env con credenciales reales

# Desplegar
chmod +x deploy.sh
./deploy.sh

# Comando rápido si ya está todo configurado
./deploy.sh --skip-migrate

# PM2
pm2 status
pm2 logs verigood-backend
pm2 reload ecosystem.config.js --env production

# Nginx
nginx -t && systemctl reload nginx
```

SSL con Let's Encrypt: `certbot --nginx -d verigood.es -d www.verigood.es`

---

## Notas importantes

- El webhook de Stripe **debe registrarse antes** de `express.json()` en `backend/src/index.js` para recibir el body sin parsear.
- Los modelos de Anthropic a usar: `claude-haiku-4-5-20251001` para OCR/correcciones, `claude-sonnet-4-6` para generación de exámenes y contenido largo.
- El Vite dev server hace proxy de `/api/*` → `localhost:3001` (configurado en `frontend/vite.config.js`).
- `parseJSON()` en `claudeService.js` maneja respuestas malformadas de la IA (bloques markdown, trailing commas, JSON anidado en texto).
- Las rutas del frontend usan español: `/lengua/ejercicios`, `/lengua/redaccion`, `/matematicas/problemas`, `/medio/fichas`, etc.
- **Módulos**: la fuente de verdad para "qué tiene activo una org" es la tabla `organization_modules`. El array `organizations.active_modules` y el ENUM `module_type` están deprecated. No leer ni escribir el campo legacy desde código nuevo.
- **Onboarding**: una org sin `onboarding_completed_at` ve el `OnboardingHero` en el dashboard institucional con 3 CTAs (activar módulos, invitar profesores, cargar datos demo). La sidebar oculta etapas sin módulos activos. Estado de la sidebar expandida/contraída por etapa: `localStorage`.