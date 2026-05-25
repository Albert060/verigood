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
├── backend/
│   └── src/
│       ├── index.js          # Express app, middlewares, rutas
│       ├── config/
│       │   └── database.js   # pg Pool, helper query()
│       ├── middleware/
│       │   └── auth.js       # authenticate, authorize, requireModule
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── usersController.js
│       │   └── organizationsController.js
│       ├── routes/
│       │   ├── auth.js
│       │   ├── users.js
│       │   ├── organizations.js
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
│       │   └── 001_initial_schema.sql
│       └── seeds/
│           └── 002_demo_data.sql         # admin@verigood.com / demo1234
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
        │   ├── ui/index.jsx              # Button, Card, TagCloud, ProgressBar, etc.
        │   └── layout/
        │       ├── Topbar.jsx
        │       └── Sidebar.jsx
        └── pages/
            ├── auth/                     # LoginPage, RegisterPage
            ├── landing/                  # LandingPage (pública, marketing)
            ├── superadmin/               # Dashboard, Organizations, Billing, System
            ├── institutional/            # Dashboard, Users, Modules, Stats, Billing
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

Cada módulo se activa/desactiva por organización desde el panel admin. Nombres internos:

| Módulo | Nombre interno | Ruta frontend |
|--------|---------------|---------------|
| Inglés / Cambridge | `cambridge` | `/cambridge/*` |
| Lengua Castellana | `espanol` | `/lengua/*` |
| Matemáticas | `matematicas` | `/matematicas/*` |
| C. del Medio | `medio` | `/medio/*` |

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

# Migraciones
psql $DATABASE_URL -f backend/src/migrations/001_initial_schema.sql

# Seeds (datos de demo)
psql $DATABASE_URL -f backend/src/seeds/002_demo_data.sql
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

// Por módulo activo
<ProtectedRoute module="cambridge">
  <CambridgeLayout />
</ProtectedRoute>
```

---

## Base de datos — tablas principales

```sql
organizations   -- colegios/academias (multi-tenant)
users           -- superadmin | admin_centro | profesor
refresh_tokens  -- rotating tokens con expiración
exams           -- exámenes generados (Cambridge)
exam_questions  -- banco de preguntas (BD híbrida)
exam_attempts   -- intentos de corrección OCR
resources       -- biblioteca de recursos por módulo
usage_logs      -- registro de consumo IA por org/usuario
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