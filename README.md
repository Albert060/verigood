# VeriGood

> Plataforma SaaS de inteligencia artificial para colegios españoles. Automatiza la creación de exámenes, corrección de ejercicios manuscritos, dinámicas de clase, fichas, rúbricas y materiales didácticos — para todas las asignaturas de Primaria y ESO.

---

## Índice

1. [Descripción del producto](#descripción-del-producto)
2. [Arquitectura técnica](#arquitectura-técnica)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Módulos disponibles](#módulos-disponibles)
5. [Sistema de tools (catálogo declarativo)](#sistema-de-tools-catálogo-declarativo)
6. [Corrector OCR genérico](#corrector-ocr-genérico)
7. [Biblioteca unificada](#biblioteca-unificada)
8. [Facturación y PDFs](#facturación-y-pdfs)
9. [Notificaciones in-app](#notificaciones-in-app)
10. [Tests](#tests)
11. [Modo demo](#modo-demo)
12. [Sistema de roles](#sistema-de-roles)
13. [Instalación local](#instalación-local)
14. [Variables de entorno](#variables-de-entorno)
15. [Base de datos](#base-de-datos)
16. [API REST](#api-rest)
17. [Dirección estética](#dirección-estética)
18. [Deploy en producción](#deploy-en-producción)
19. [Credenciales de demo](#credenciales-de-demo)
20. [Roadmap](#roadmap)

---

## Descripción del producto

VeriGood es un SaaS B2B dirigido exclusivamente a centros educativos españoles. Permite a los profesores delegar en IA las tareas docentes más repetitivas: diseñar exámenes y actividades por asignatura (Primaria y ESO), corregir ejercicios manuscritos con OCR, preparar dinámicas de clase, generar fichas temáticas y rúbricas de evaluación.

El modelo de negocio es institucional: el colegio contrata un plan, activa módulos y gestiona a sus profesores desde un panel de administración centralizado.

---

## Arquitectura técnica

```
┌─────────────────────────────────────────────────────────┐
│                    verigood.com (VPS Madrid)              │
│                                                           │
│   Nginx (reverse proxy + SSL + static cache)              │
│       ├── / → React SPA (build estático)                 │
│       └── /api → Node.js Express :3001                   │
│                                                           │
│   PostgreSQL :5432 (multi-tenant por organization_id)    │
└─────────────────────────────────────────────────────────┘
```

**Stack:**

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Estado cliente | Zustand (auth) + React Query v5 (server state) |
| Routing | React Router v6 |
| Backend | Node.js 20 + Express |
| Base de datos | PostgreSQL 15 |
| IA generativa | Anthropic Claude API — `claude-haiku-4-5-20251001` (tools/correcciones) + `claude-sonnet-4-6` (generación larga) |
| OCR | Google Cloud Vision API |
| Pagos | Stripe (checkout, customer portal, webhooks, facturas oficiales) |
| PDF | PDFKit — renderers propios por output_kind |
| Tests | Jest (backend) + Vitest (frontend) + Playwright (e2e) |
| Deploy | Nginx + PM2 + VPS Madrid |

---

## Estructura del proyecto

```
verigood/
├── package.json                          # npm workspaces root
├── .env.example                          # variables documentadas
├── ecosystem.config.js                   # PM2
├── deploy.sh
│
├── agentes/                              # Perfiles de agente para desarrollo
│
├── backend/
│   └── src/
│       ├── index.js
│       ├── config/database.js
│       ├── middleware/auth.js
│       ├── utils/aiAvailable.js          # detección de clave IA válida
│       ├── controllers/
│       │   ├── moduleToolsController.js  # dispatcher tools + auto-persistencia
│       │   ├── moduleOcrController.js    # OCR genérico por asignatura
│       │   ├── libraryController.js      # CRUD biblioteca
│       │   └── ...
│       ├── routes/
│       │   ├── moduleTools.js
│       │   ├── moduleOcr.js
│       │   ├── library.js
│       │   ├── cambridge.js
│       │   ├── stripe.js                 # incluye /invoices (Stripe + fallback)
│       │   ├── pdf.js
│       │   └── ...
│       ├── services/
│       │   ├── claudeService.js          # callClaude con códigos de error mapeados
│       │   ├── pdfService.js             # renderers por output_kind + invoice
│       │   ├── ocrSubjects.js            # config declarativa de OCR por asignatura
│       │   ├── ocrSubjectCorrectorService.js
│       │   └── tools/
│       │       ├── index.js              # registro central
│       │       ├── demoFixtures.js       # fixtures por output_kind
│       │       ├── consistencyCheck.js
│       │       └── <21 handlers por módulo>.js
│       ├── migrations/
│       │   ├── 001_initial_schema.sql
│       │   ├── 002_modules_catalog.sql
│       │   ├── 003_module_tools.sql
│       │   ├── 004_library_items.sql
│       │   └── 005_notifications.sql
│       └── seeds/
│           ├── 001_modules_catalog.sql   # 23 módulos
│           ├── 002_module_tools.sql      # 56 tools + bindings
│           └── dev_demo_data.sql
│
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── services/api.js               # axios + APIs por subsistema
│       ├── components/
│       │   ├── ui/                       # Button, Card, DownloadPdfButton, ...
│       │   ├── tools/
│       │   │   ├── ToolRunner.jsx        # ejecutor genérico + PDF + biblioteca
│       │   │   ├── DynamicForm.jsx
│       │   │   └── results/              # 6 renderers por output_kind
│       │   └── layout/
│       └── pages/
│           ├── auth/
│           ├── landing/
│           ├── superadmin/
│           ├── institutional/            # Dashboard, Users, Modules, Stats,
│           │                             # Resources (biblioteca), ResourceDetail,
│           │                             # Billing (con PDF facturas)
│           ├── module/                   # ModuleLayout, ModuleHome,
│           │                             # ToolPage, ModuleOcrPage
│           └── cambridge/                # layout dedicado
│
├── docker-compose.yml
├── start.bat   start.sh
└── README.md
```

---

## Módulos disponibles

Los módulos viven en un **catálogo cerrado** (tabla `modules` + pivote `organization_modules`). Cada colegio activa/desactiva desde el panel de administración.

### Primaria

| ID | Nombre | Tools | OCR |
|----|--------|:----:|:---:|
| `matematicas_primaria` | Matemáticas | 3 | ✅ |
| `lengua_primaria` | Lengua castellana | 3 | ✅ |
| `ingles_primaria` | Inglés | 3 | ✅ |
| `medio_primaria` | Conocimiento del medio | 3 | ✅ |
| `plastica_primaria` | Plástica | 2 | — |
| `ed_fisica_primaria` | Educación física | 3 | — |
| `musica_primaria` | Música | 3 | — |
| `ed_artistica_primaria` | Educación artística | 3 | — |
| `religion_primaria` | Religión | 2 | — |
| `ciudadania_primaria` | Ed. Ciudadanía | 2 | — |

### ESO

| ID | Nombre | Tools | OCR |
|----|--------|:----:|:---:|
| `lengua_eso` | Lengua castellana y literatura | 4 | ✅ |
| `matematicas_eso` | Matemáticas | 3 | ✅ |
| `ingles_eso` | Inglés | 3 | ✅ |
| `cambridge` | Cambridge | **layout dedicado** | ✅ |
| `geo_historia_eso` | Geografía e Historia | 3 | ✅ |
| `ed_fisica_eso` | Educación física | 3 | — |
| `bio_geo_eso` | Biología y Geología | 3 | ✅ |
| `tecno_digital_eso` | Tecnología y digitalización | 3 | ✅ |
| `fis_quim_eso` | Física y Química | 1 | ✅ |
| `epva_eso` | EPVA | 3 | — |
| `religion_eso` | Religión | 2 | — |
| `valores_eticos_eso` | Valores éticos | 3 | — |
| `tutorias_eso` | Tutorías | 3 | — |

**Total: 56 tools en el catálogo, 11 módulos con OCR genérico y Cambridge con flujo dedicado.**

### Módulo Cambridge — 4 agentes dedicados

**Agente 1 — Generador de exámenes** — Crea exámenes estilo Cambridge completos para niveles A1–C2. Generación híbrida: primero busca preguntas verificadas en BD (`exam_questions`), completa con Claude cuando no hay cobertura. Devuelve título, instrucciones, soluciones con explicación, fuente (BD vs IA).

**Agente 2 — Corrector OCR** — Foto del examen → Google Vision → Claude. Devuelve puntuación, banda Cambridge, errores con corrección, fortalezas, áreas de mejora y feedback.

**Agente 3 — Generador de dinámicas** — Actividades de clase para 8 tipos (vocabulary, speaking, reading, writing, listening, grammar, warmup, review). Incluye objetivos, materiales, procedimiento con tiempos, diferenciación y criterios de evaluación.

**Agente 4 — Generador de presentaciones** — Prompt optimizado para NotebookLM + esquema de diapositivas.

**Vista `/cambridge/exams`** — Mis exámenes con búsqueda por título/tema, filtros por nivel, tipo, módulo y rango de fechas. Cada examen abre un detalle (`/cambridge/exams/:id`) con render completo de las preguntas, botón descargar PDF y eliminar.

### Módulos genéricos — `ModuleLayout` + tools

Todos los módulos no-Cambridge usan el patrón declarativo. La home del módulo (`ModuleHome`) replica el formato visual de Cambridge: PageHeader + 4 stat cards + grid de tools con numeración romana §I, §II...

---

## Sistema de tools (catálogo declarativo)

Núcleo del catálogo Fase 1: cualquier herramienta se define declarativamente en BD y se ejecuta con un único dispatcher.

### Flujo end-to-end

```
Profesor abre /eso/byg/byg.exam
    ↓
ToolRunner renderiza DynamicForm desde tool.input_schema
    ↓
Profesor rellena form y pulsa Generar
    ↓
POST /api/modules/bio_geo_eso/tools/byg.exam/run  { input }
    ↓
moduleToolsController.run
    ├─ Valida input contra input_schema
    ├─ Si !aiAvailable() → demoFixtures.forKind(output_kind, input)
    ├─ Si IA → handler real (Claude con prompt LOMLOE)
    ├─ Auto-persiste en library_items
    └─ Devuelve { output_kind, output, autoSaved: true }
    ↓
ResultRenderer pinta según output_kind
    ↓
Profesor: descarga PDF · ya está en biblioteca
```

### Output kinds soportados

`text` · `exercise_set` · `rubric` · `timeline` · `quiz` · `commentary` · `exam`

Cada uno tiene renderer frontend + renderer PDF + fixture demo. Añadir un kind nuevo = añadir las tres piezas.

### Añadir una tool nueva — 3 pasos

1. **Seed** — fila en `backend/src/seeds/002_module_tools.sql`
2. **Handler** — función en `backend/src/services/tools/<modulo>.js` + registro en `tools/index.js`
3. **Renderer** — solo si es un `output_kind` nuevo

Sin migraciones, sin tocar el dispatcher.

---

## Corrector OCR genérico

Cualquier módulo declarado en `ocrSubjects.OCR_CONFIG` expone automáticamente un corrector OCR. Mismo flujo que Cambridge, pero parametrizado.

**Módulos con OCR habilitado (11):** Inglés Primaria/ESO, Lengua Primaria/ESO, Matemáticas Primaria/ESO, Conocimiento del Medio, Geografía e Historia, Biología y Geología, Física y Química, Tecnología y Digitalización.

### Flujo

1. Profesor sube foto de la prueba del alumno
2. Google Vision extrae texto
3. Claude (Haiku) corrige con system prompt específico de la asignatura
4. Devuelve `{ totalScore, maxScore, grade, questions[], strengths, improvements, studyRecommendations, overallFeedback }`

En modo demo devuelve fixture coherente sin llamar a IA.

### Añadir OCR a un módulo nuevo

Una sola edición: entrada en `OCR_CONFIG` con `{label, levels, focusOptions, system, userPromptBuilder}`. Frontend y rutas ya están preparados.

---

## Biblioteca unificada

Tabla `library_items` (migración 004) + tabla `exams` (Cambridge legacy) unidas en runtime.

**Auto-persistencia**: cada vez que un profesor genera un resultado con cualquier tool del catálogo Fase 1, el dispatcher lo guarda automáticamente con título derivado del `tool.name + topic/focus`. El modo demo no ensucia BD.

**Vista `/dashboard/resources`**:
- Búsqueda por título o tema
- Filtros: módulo (autoinferido del catálogo activo), tipo (autoinferido de los datos)
- Descargar PDF (regenera on-demand desde el payload, sin storage de blobs)
- Eliminar con confirmación
- Click en una card → detalle (`/dashboard/resources/:id`) con render completo + descargar PDF + eliminar

### Endpoints

```
GET    /api/library/items?search&module&kind&from&to
GET    /api/library/items/:id
POST   /api/library/items
DELETE /api/library/items/:id
```

---

## Facturación y PDFs

### Listado de facturas

`GET /api/stripe/invoices` resuelve en tres niveles:

1. **Stripe real** — si la org tiene `stripe_customer_id` y la clave Stripe no es placeholder, consulta `stripe.invoices.list({ customer })` y devuelve facturas con `invoice_pdf` (PDF oficial AEAT-correlativo).
2. **Fixture backend** — 6 meses retroactivos del plan en curso (IVA 21% calculado, nº derivado del orgId).
3. **Fallback frontend** — 4 facturas precargadas en `Billing.jsx` como ejemplo descargable mientras el backend no responda.

### PDF de factura

Renderer `renderInvoice` ([pdfService.js](backend/src/services/pdfService.js)) produce un PDF con:

- Cabecera con título + número de factura
- Bloque emisor (CIF, dirección, contacto) / cliente (nombre, CIF, dirección, email)
- Caja meta de 4 columnas: NÚMERO · EMITIDA · VENCIMIENTO · PAGADA
- Sello rotado **PAGADA** (verde) o **PENDIENTE** (granate)
- Periodo facturado
- Tabla CONCEPTO · CANT. · IMPORTE con periodo por línea
- Totales alineados: Base imponible → IVA 21% → **TOTAL** → Importe pagado
- Pie legal RGPD

### Sistema PDF para tools y exámenes

`buildPdf({ type, data, title, subtitle, moduleKey })` con renderers por `type`:

| `type` | Caso |
|---|---|
| `exam` | Cambridge legacy |
| `exercise_set` | Tools Fase 1 — examen + página solucionario |
| `quiz` | Cuestionarios tipo test con solucionario |
| `rubric` | Rúbricas con criterios y niveles |
| `timeline` | Líneas de tiempo |
| `commentary` | Comentarios de texto guiados |
| `text` | Markdown ligero (#, ##, -, **bold**) |
| `invoice` | Facturas |
| `feedback` / `ocr` | Informes de corrección |

Todos comparten paleta y tipografía "Cuaderno del Catedrático".

---

## Notificaciones in-app

Sistema de alertas dentro de la app para `admin_centro` y `profesor`. Tabla `notifications` (migración 005) + helper `notifyService` invocado desde controladores.

### Eventos que disparan notificación

| Flujo | Tipo | Destinatarios |
|---|---|---|
| Admin activa un módulo | `module_activated` | Todos los profesores del centro |
| Admin desactiva un módulo | `module_deactivated` | Todos los profesores del centro |
| Profesor genera output con cualquier tool | `tool_generated` | El propio profesor |
| Profesor guarda examen Cambridge | `exam_saved` | El propio profesor |
| OCR completado (Cambridge o genérico) | `ocr_completed` | El profesor con la puntuación |
| Stripe `checkout.session.completed` (webhook) | `invoice_paid` | Admins del centro |
| Stripe `invoice.paid` (webhook) | `invoice_paid` | Admins del centro |

### UI

`NotificationBell` en el `Topbar`:
- Badge con número de no-leídas (máximo "99+")
- Polling cada 30 s vía React Query
- Dropdown con las últimas 12 notificaciones, color de acento por tipo, formato relativo ("hace 5 min")
- Click en una notificación: marca como leída + navega al `link`
- Botón "Marcar todas leídas"

### Endpoints

```
GET    /api/notifications?unread=true&limit=30
GET    /api/notifications/unread-count
POST   /api/notifications/:id/read
POST   /api/notifications/read-all
DELETE /api/notifications/:id
```

### Robustez

`notifyService.notify(...)` es **best-effort**: si la tabla aún no está migrada o falla la query, se registra el warning y el flujo del caller (activar módulo, generar tool, etc.) sigue normal. Las notificaciones nunca son críticas para la operación principal.

---

## Tests

Cobertura en tres capas:

### Comandos

```bash
# Desde la raíz (workspace)
npm test                # backend (Jest) + frontend (Vitest)
npm run test:backend    # solo backend
npm run test:frontend   # solo frontend
npm run test:e2e        # Playwright (arranca backend + frontend automáticamente)
npm run test:e2e:ui     # Playwright UI mode (interactivo)
npm run test:e2e:install # instala el navegador Chromium

# Por workspace
npm run test --workspace=backend -- --watch
npm run test --workspace=frontend -- --watch
npm run test:coverage --workspace=backend
```

### Jest (backend)

Configurado en `backend/jest.config.js`. Solo `node`, sin DOM.

**Archivos de test:**
- `src/utils/aiAvailable.test.js` — detector de configuración de IA (6 casos)
- `src/services/claudeService.test.js` — `parseJSON` con respuestas malformadas de la IA (8 casos)
- `src/services/pdfService.test.js` — smoke test de los renderers PDF críticos (5 casos)
- `src/services/tools/demoFixtures.test.js` — fixtures por output_kind (9 casos)

Excluye `tests/integration/**` por defecto. Tests que dependen de BD/IA reales viven en una carpeta aparte para que CI pueda correr solo los unitarios rápidos.

### Vitest (frontend)

Configurado en `frontend/vitest.config.js`. Entorno `jsdom` con `@testing-library/jest-dom` y cleanup automático entre tests.

**Archivos de test:**
- `src/components/tools/DynamicForm.test.jsx` — render del schema, required, onChange, defaults (6 casos)
- `src/components/ui/Button.test.jsx` — primitives Button, Card, Badge, ProgressBar

API compatible con Jest (`describe`, `test`, `expect` en scope global).

### Playwright (e2e)

Configurado en `playwright.config.js`. `webServer` arranca el backend (3001) y el frontend (5173) automáticamente.

**Specs:**
- `tests/e2e/login.spec.js` — login correcto, credenciales inválidas, logout (3 casos)
- `tests/e2e/tool-flow.spec.js` — Cambridge accesible, biblioteca carga, mis exámenes, panel módulos (4 casos)
- `tests/e2e/billing.spec.js` — listado de facturas, gestionar suscripción, descarga real de PDF (3 casos)

Helpers compartidos en `tests/e2e/helpers.js` con `loginAs(page, user)` usando los seeds demo.

**Importante**: los e2e asumen MODO DEMO (`ANTHROPIC_API_KEY` placeholder) para no golpear la API de Anthropic en CI ni generar coste.

### Cómo añadir nuevos tests

- Backend: nuevo archivo `*.test.js` junto al fichero que prueba. Jest lo detecta automáticamente.
- Frontend: nuevo archivo `*.test.jsx` en cualquier carpeta de `src/`. Vitest globals (`describe`, `test`, `expect`) están disponibles.
- e2e: nuevo `*.spec.js` en `tests/e2e/`. Usar el helper `loginAs(page, ADMIN)` para autenticarse.

---

## Modo demo

`aiAvailable()` detecta clave válida: existe, no es `PLACEHOLDER`, empieza por `sk-ant-`, longitud >= 30.

Si falsea, el sistema entra en **modo demo controlado** sin reventar:

| Subsistema | Comportamiento en demo |
|---|---|
| Cambridge exam generator | Híbrido: preguntas reales de `exam_questions` + fixture |
| Cambridge OCR | `fixtures.ocrCorrection` |
| Tools del catálogo | `demoFixtures.forKind(output_kind, input)` |
| OCR genérico por asignatura | `demoFixture` coherente |
| Facturas | Fixture backend (6 meses) + 4 fallbacks frontend |

`ToolRunner` muestra banner amarillo discreto cuando el resultado es `demo: true`.

### Manejo de errores IA

`callClaude` mapea errores SDK con códigos estables:

| Código | Status | Caso | Mensaje al usuario |
|---|---|---|---|
| `AI_NOT_CONFIGURED` | 503 | Clave vacía o placeholder | "La integración con la IA no está configurada en este servidor" |
| `AI_INVALID_KEY` | 503 | 401/403 de Anthropic | "La clave de la API de IA no es válida" |
| `AI_RATE_LIMITED` | 429 | 429 de Anthropic | "Has alcanzado el límite de la API. Espera unos segundos" |
| `AI_UNAVAILABLE` | 502 | 5xx / 529 de Anthropic | "La API de IA está temporalmente saturada" |
| `BAD_AI_RESPONSE` | 502 | JSON no parseable | "La IA devolvió un resultado no válido" |

Nunca se filtra el body crudo de Anthropic al usuario.

---

## Sistema de roles

```
superadmin       → Acceso total al sistema (interno VeriGood)
admin_centro     → Gestiona su colegio: usuarios, módulos, biblioteca, facturación
profesor         → Accede a los módulos activos de su organización
```

JWT con dos tokens:
- **Access token** — 15 minutos. Se renueva automáticamente con `TOKEN_EXPIRED`.
- **Refresh token** — 7 días, rotativo. Se guarda en BD y se invalida al usarse.

---

## Instalación local

### Opción A — Con Docker (recomendado)

**Windows:** doble clic en `start.bat`

**Mac / Linux:**
```bash
chmod +x start.sh
./start.sh
```

Construye contenedores, ejecuta migraciones, carga seeds y abre el navegador en `http://localhost:5173`.

### Opción B — Sin Docker

```bash
# 1. Instalar
npm install

# 2. Base de datos (orden estricto)
createdb verigood_local
psql verigood_local < backend/src/migrations/001_initial_schema.sql
psql verigood_local < backend/src/migrations/002_modules_catalog.sql
psql verigood_local < backend/src/migrations/003_module_tools.sql
psql verigood_local < backend/src/migrations/004_library_items.sql
psql verigood_local < backend/src/migrations/005_notifications.sql
psql verigood_local < backend/src/seeds/001_modules_catalog.sql   # SISTEMA
psql verigood_local < backend/src/seeds/002_module_tools.sql      # SISTEMA — 56 tools
psql verigood_local < backend/src/seeds/dev_demo_data.sql         # DEMO

# 3. Entorno
cp .env.example backend/.env
# Editar con DATABASE_URL real

# 4. Arrancar
npm run dev
```

---

## Variables de entorno

```env
# Base de datos
DATABASE_URL=postgresql://user:pass@localhost:5432/verigood
DB_SSL=false

# JWT
JWT_SECRET=cambia_esto
JWT_REFRESH_SECRET=otro_secreto
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Anthropic — REQUIRED para no entrar en modo demo
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_HAIKU_MODEL=claude-haiku-4-5-20251001
CLAUDE_SONNET_MODEL=claude-sonnet-4-6

# Google Vision (OCR real)
GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json
GOOGLE_CLOUD_PROJECT_ID=verigood-...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_COLEGIO=price_...

# App
PORT=3001
CORS_ORIGINS=https://verigood.es,http://localhost:5173
FRONTEND_URL=https://verigood.es
NODE_ENV=production
```

Con `ANTHROPIC_API_KEY=sk-ant-PLACEHOLDER` (o ausente) la plataforma funciona en **modo demo controlado**: todas las respuestas IA son fixtures plausibles y la facturación cae a fixtures coherentes. Pensado para entornos pre-producción y demos comerciales.

---

## Base de datos

Arquitectura multi-tenant por `organization_id`. Migraciones en orden estricto.

**Tablas principales:**

```
organizations          → Colegio raíz + stripe_customer_id + plan + onboarding_completed_at
users                  → superadmin | admin_centro | profesor
refresh_tokens         → rotating tokens
modules                → Catálogo cerrado (23 módulos)
organization_modules   → Pivote: módulos activos por org
module_tools           → 56 tools con input_schema + output_kind
module_tool_bindings   → Pivote: qué tools tiene cada módulo
library_items          → Biblioteca unificada (outputs de cualquier tool)
notifications          → Notificaciones in-app (8 tipos canónicos, polling 30s)
exams                  → Cambridge legacy (questions JSONB)
exam_questions         → Banco curado Cambridge (BD híbrida)
exam_attempts          → Correcciones OCR Cambridge
usage_logs             → Consumo IA por org/user/tool
resources              → DEPRECATED (hoy = library_items + exams)
```

---

## API REST

Base URL: `https://verigood.es/api` (producción) · `http://localhost:3001/api` (local)

| Método | Ruta | Descripción |
|--------|------|-------------|
| **Auth** | | |
| POST | `/auth/login` | Iniciar sesión |
| POST | `/auth/register` | Registrar org + admin |
| POST | `/auth/refresh` | Renovar access token |
| POST | `/auth/logout` | Cerrar sesión |
| GET | `/auth/me` | Usuario actual |
| **Módulos** | | |
| GET | `/modules` | Catálogo global |
| GET | `/organizations/:id/modules` | Módulos activos de la org |
| POST | `/organizations/:id/modules/:moduleId/activate` | Activar módulo |
| DELETE | `/organizations/:id/modules/:moduleId` | Desactivar |
| GET | `/organizations/:id/onboarding-state` | Estado onboarding |
| POST | `/organizations/:id/onboarding-state/complete` | Marcar completado |
| **Tools (catálogo Fase 1)** | | |
| GET | `/modules/:moduleId/tools` | Tools vinculadas |
| POST | `/modules/:moduleId/tools/:toolKey/run` | Ejecutar (auto-persiste en biblioteca) |
| **OCR genérico** | | |
| GET | `/modules/:moduleId/ocr/config` | Config pública para autoconfigurar UI |
| POST | `/modules/:moduleId/ocr/correct` | Multipart `examImage` → corrección |
| **Biblioteca** | | |
| GET | `/library/items` | Listar con filtros |
| GET | `/library/items/:id` | Detalle |
| POST | `/library/items` | Guardar manual (el dispatcher ya lo hace auto) |
| DELETE | `/library/items/:id` | Eliminar |
| **Notificaciones in-app** | | |
| GET | `/notifications?unread=true&limit=30` | Listar |
| GET | `/notifications/unread-count` | Contador para el badge |
| POST | `/notifications/:id/read` | Marcar individual como leída |
| POST | `/notifications/read-all` | Marcar todas como leídas |
| DELETE | `/notifications/:id` | Eliminar |
| **Cambridge** | | |
| POST | `/cambridge/exams/generate` | Generar examen Cambridge |
| POST | `/cambridge/exams/save` | Guardar examen |
| GET | `/cambridge/exams` | Listar (con metadata para filtros) |
| GET | `/cambridge/exams/:id` | Detalle completo con preguntas |
| DELETE | `/cambridge/exams/:id` | Eliminar |
| POST | `/cambridge/ocr/correct` | Multipart `examImage` |
| POST | `/cambridge/dynamics/generate` | Dinámica de aula |
| POST | `/cambridge/presentations/generate` | Prompt NotebookLM |
| **Stripe / Facturación** | | |
| GET | `/stripe/plans` | Planes disponibles |
| POST | `/stripe/checkout` | Crear sesión de pago |
| POST | `/stripe/portal` | Portal de facturación |
| GET | `/stripe/invoices` | Histórico (Stripe real con fallback fixture) |
| GET | `/stripe/invoices/:id` | Detalle de una factura |
| POST | `/stripe/webhook` | Raw body (registrado ANTES de express.json) |
| **PDF** | | |
| POST | `/pdf/render` | Binario `application/pdf` (type + data) |
| GET | `/pdf/status` | Estado AI/demo |

Todos los endpoints (salvo `/auth/*`, `/stripe/plans`, `/stripe/webhook`) requieren `Authorization: Bearer <token>`.

---

## Dirección estética

**Concepto: Cuaderno del Catedrático**

Materialidad de aula real ejecutada con sobriedad académica. Nada infantil, nada decorativo por decorar.

**Tipografía:**
- Display: Libre Baskerville (`font-display`) — títulos con italics expresivas
- Body: Inter — sans neutra
- Manuscrito: Caveat (`font-caveat`) — solo anotaciones de corrección
- Mono: JetBrains Mono (`font-mono`) — puntuaciones, códigos, metadatos

**Paleta:**

| Token | Hex | Uso |
|-------|-----|-----|
| Papel | `#EDE6D6` | Fondo principal |
| Tinta | `#14182B` | Texto principal |
| Marino | `#1F2A4D` | Acción primaria, Cambridge |
| Granate | `#6B1F2A` | Errores, Lengua |
| Amarillo | `#E8D89A` | Avisos, modo demo |
| Línea | `#B8A988` | Bordes |

Granate y amarillo tienen peso semántico. Cuando aparecen, significan algo.

**Gestos diferenciadores:**
- Fondo cuadrícula 24px al 8% opacidad
- Marginalia romana: § I, § II, § III en granate apagado
- Cards con esquina doblada (`clip-path`)
- Score stamps rotados con opacidad
- Sombras secas `box-shadow: 2px 2px 0 rgba(184,169,136,0.4)`

**Prohibido:** `border-radius` > 2px · gradientes · sombras blandas · iconos genéricos · emoji.

---

## Deploy en producción

```bash
# En el VPS (Ubuntu 22.04, Madrid)

git clone https://github.com/tu-usuario/verigood.git
cd verigood

cp .env.example backend/.env
nano backend/.env  # credenciales reales

chmod +x deploy.sh
./deploy.sh

# Comando rápido si ya está configurado
./deploy.sh --skip-migrate

# PM2
pm2 status
pm2 logs verigood-backend
pm2 reload ecosystem.config.js --env production

# SSL
certbot --nginx -d verigood.es -d www.verigood.es
```

---

## Credenciales de demo

Tras ejecutar `dev_demo_data.sql`:

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin de centro | admin@verigood.com | demo1234 |
| Profesor | profesor@verigood.com | demo1234 |

---

## Flujo de desarrollo con agentes

El directorio `agentes/` documenta cinco perfiles que se aplican en secuencia para cada feature:

```
arquitecto-software → desarrollador → auditor → tester → documentador
```

Ver `agentes/README.md` para el detalle de cada rol y cuándo saltar pasos.

---

## Roadmap

**Hecho:**
- ✅ Catálogo declarativo de 23 módulos + 56 tools implementadas
- ✅ Cambridge con 4 agentes + filtros avanzados + detalle + PDF
- ✅ Corrector OCR genérico para 11 asignaturas
- ✅ Biblioteca unificada con auto-persistencia
- ✅ Sistema PDF para todos los `output_kind` + facturas
- ✅ Modo demo controlado en todos los subsistemas
- ✅ Facturación con fallback fixture y PDF oficial Stripe
- ✅ Notificaciones in-app con 7 flujos disparadores integrados
- ✅ Scaffolding de tests: Jest + Vitest + Playwright con ejemplos representativos

**En curso / próximos pasos:**
- Banco de preguntas curadas por asignatura (estilo `exam_questions` de Cambridge)
- Ampliar cobertura de tests (sobre el scaffolding actual)
- CI/CD pipeline (GitHub Actions → tests + deploy automático)
- Panel de superadmin completo (facturación global con datos reales)
- WebSockets para notificaciones casi-tiempo-real (hoy polling 30s)
- Bachillerato (Fase 2)

---

*VeriGood — Plataforma SaaS de IA para colegios españoles · 2026*
