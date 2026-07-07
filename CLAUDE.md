# VeriGood — CLAUDE.md

Plataforma SaaS de herramientas IA para docentes de colegios españoles.
Monorepo npm workspaces: `/frontend` (React + Vite) + `/backend` (Node + Express).

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Query v5, Zustand v4, React Router v6, Axios |
| Backend | Node.js 20, Express, PostgreSQL (pg), JWT auth |
| IA | Anthropic SDK — `claude-haiku-4-5-20251001` (correcciones/tools), `claude-sonnet-4-6` (generación larga) |
| OCR | Google Cloud Vision API |
| Pagos | Stripe (checkout sessions, customer portal, webhooks, facturas oficiales) |
| PDF | PDFKit — renderers propios por output_kind |
| Tests | Jest (backend) + Vitest (frontend) + Playwright (e2e) |
| Deploy | Nginx + PM2 + VPS Madrid |

---

## Estructura de directorios

```
verigood/
├── package.json              # npm workspaces root
├── .env.example              # todas las variables de entorno
├── ecosystem.config.js       # PM2 — backend cluster + cron `verigood-digest` (lunes 08:00)
├── nginx.conf                # reverse proxy, SSL, rate limiting
├── deploy.sh                 # script de despliegue VPS
│
├── agentes/                  # Agentes especializados de desarrollo (docs md)
│   ├── README.md
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
│       │   └── auth.js       # authenticate, authorize, requireModule, requireModuleActive
│       ├── utils/
│       │   ├── aiAvailable.js      # detecta si ANTHROPIC_API_KEY es válida (no placeholder)
│       │   └── stripeAvailable.js  # mismo patrón para STRIPE_SECRET_KEY (sk_*)
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── usersController.js
│       │   ├── modulesController.js          # catálogo, activación, onboarding-state
│       │   ├── moduleToolsController.js      # dispatcher tools + auto-persistencia en biblioteca
│       │   ├── moduleOcrController.js        # config + corrección OCR genérica por asignatura
│       │   ├── libraryController.js          # CRUD library_items
│       │   ├── notificationsController.js    # CRUD notifications + unread-count
│       │   └── organizationsController.js
│       ├── routes/
│       │   ├── auth.js
│       │   ├── users.js
│       │   ├── organizations.js
│       │   ├── modules.js                    # catálogo + toggle + onboarding
│       │   ├── moduleTools.js                # GET tools + POST run (dispatcher)
│       │   ├── moduleOcr.js                  # GET config + POST correct (multer)
│       │   ├── library.js                    # GET/POST/DELETE library_items
│       │   ├── notifications.js              # GET/POST/DELETE notifications
│       │   ├── cambridge.js                  # 4 agentes + GET/:id + DELETE/:id
│       │   ├── lengua.js                     # legacy
│       │   ├── matematicas.js                # legacy
│       │   ├── medio.js                      # legacy
│       │   ├── stripe.js                     # plans, checkout, portal, invoices, webhook
│       │   └── pdf.js                        # POST /render genérico
│       ├── services/
│       │   ├── claudeService.js              # callClaude (con códigos AI_NOT_CONFIGURED/INVALID_KEY/…)
│       │   ├── examGeneratorService.js       # híbrido BD + IA (Cambridge)
│       │   ├── ocrCorrectorService.js        # Google Vision + Claude Haiku (Cambridge)
│       │   ├── ocrSubjectCorrectorService.js # OCR genérico para asignaturas
│       │   ├── ocrSubjects.js                # config declarativa de qué módulos tienen OCR
│       │   ├── notifyService.js              # helper notify() / notifyRole() / wasRecentlyNotified()
│       │   ├── aiErrorThrottle.js             # contador en memoria → 1 alerta al admin tras N errores IA
│       │   ├── quotaService.js                # comprueba 50/80/100% del límite mensual de tokens
│       │   ├── digestService.js               # resumen semanal + profes inactivos + retención
│       │   ├── hybridGeneratorService.js      # patrón BD+IA reutilizable (withCuratedBank / fetchSeeds)
│       │   ├── dynamicsService.js
│       │   ├── presentationsService.js
│       │   ├── lenguaService.js              # legacy
│       │   ├── matematicasService.js         # legacy
│       │   ├── pdfService.js                 # renderers por output_kind + invoice
│       │   └── tools/
│       │       ├── index.js                  # registro central de handlers
│       │       ├── consistencyCheck.js       # avisa BD ↔ código en arranque
│       │       ├── demoFixtures.js           # fixtures genéricos por output_kind
│       │       ├── ingles.js
│       │       ├── plastica.js
│       │       ├── musica.js
│       │       ├── religion.js
│       │       ├── ciudadania.js
│       │       ├── geoHistoria.js
│       │       ├── bioGeo.js
│       │       ├── fisQuim.js
│       │       ├── matematicasPrimaria.js
│       │       ├── matematicasEso.js
│       │       ├── lenguaPrimaria.js
│       │       ├── lenguaEso.js
│       │       ├── medioPrimaria.js
│       │       ├── edFisicaPrimaria.js
│       │       ├── edFisicaEso.js
│       │       ├── edArtisticaPrimaria.js
│       │       ├── tecnoDigitalEso.js
│       │       ├── epvaEso.js
│       │       ├── valoresEticosEso.js
│       │       └── tutoriasEso.js
│       ├── migrations/
│       │   ├── 001_initial_schema.sql
│       │   ├── 002_modules_catalog.sql       # tablas modules + organization_modules + onboarding
│       │   ├── 003_module_tools.sql          # tablas module_tools + module_tool_bindings
│       │   ├── 004_library_items.sql         # tabla library_items (biblioteca unificada)
│       │   ├── 005_notifications.sql         # tabla notifications (in-app)
│       │   ├── 006_user_modules.sql          # pivote user_modules — asignación profe ↔ módulo
│       │   ├── 007_notifications_indices.sql # índices anti-spam + retención
│       │   └── 008_exam_questions_module_id.sql # exam_questions soporta el catálogo Fase 1
│       ├── jobs/
│       │   └── weeklyDigest.js               # cron PM2 — resumen semanal + profes inactivos + purge
│       └── seeds/
│           ├── 001_modules_catalog.sql       # SISTEMA — catálogo cerrado de módulos
│           ├── 002_module_tools.sql          # SISTEMA — 56 tools + bindings
│           ├── 003_exam_questions_by_module.sql # SISTEMA — banco curado por módulo (hybridGenerator)
│           └── dev_demo_data.sql             # DEMO — admin@verigood.com / demo1234
│
└── frontend/
    └── src/
        ├── App.jsx                       # BrowserRouter, todas las rutas
        ├── main.jsx                      # QueryClient, StrictMode
        ├── index.css                     # design system completo
        ├── stores/
        │   └── authStore.js              # Zustand + persist
        ├── services/
        │   └── api.js                    # Axios + interceptor JWT + APIs
        ├── components/
        │   ├── ui/
        │   │   ├── index.jsx             # Button, Card, TagCloud, ProgressBar, etc.
        │   │   ├── DownloadPdfButton.jsx
        │   │   └── EmptyState.jsx
        │   ├── tools/
        │   │   ├── ToolRunner.jsx        # ejecuta tool + PDF + biblioteca
        │   │   ├── DynamicForm.jsx       # form generado desde input_schema
        │   │   └── results/
        │   │       ├── ResultRenderer.jsx
        │   │       ├── TextResult.jsx
        │   │       ├── ExerciseSetResult.jsx
        │   │       ├── RubricResult.jsx
        │   │       ├── TimelineResult.jsx
        │   │       ├── QuizResult.jsx
        │   │       └── CommentaryResult.jsx
        │   ├── onboarding/
        │   │   └── OnboardingHero.jsx
        │   └── layout/
        │       ├── Topbar.jsx               # incluye NotificationBell
        │       ├── NotificationBell.jsx     # campana con badge + dropdown + polling 30s
        │       ├── Sidebar.jsx
        │       └── SidebarStage.jsx
        └── pages/
            ├── auth/                     # LoginPage, RegisterPage
            ├── landing/                  # LandingPage (pública)
            ├── superadmin/               # Dashboard, Organizations, Billing, System
            ├── institutional/            # Dashboard, Users (CRUD profes), Modules,
            │                             # Stats, Billing, ManageBilling (/billing/manage),
            │                             # Resources (biblioteca), ResourceDetail
            ├── module/                   # ModuleLayout, ModuleHome (Fase 1),
            │                             # ToolPage, ModuleOcrPage (OCR genérico)
            ├── cambridge/                # Home, ExamGenerator, ExamsList, ExamDetail,
            │                             # OcrCorrector, DynamicsGenerator, PresentationGenerator
            ├── lengua/                   # legacy
            ├── matematicas/              # legacy
            └── medio/                    # legacy
```

---

## Auth & Roles

JWT access tokens (15 min) + rotating refresh tokens (7 días, en PostgreSQL).

| Role | Acceso |
|------|--------|
| `superadmin` | `/superadmin/*` — gestiona organizaciones, facturación global |
| `admin_centro` | `/dashboard/*` — gestiona usuarios, módulos, stats, biblioteca, facturación |
| `profesor` | `/dashboard` (lectura) + módulos **asignados** por el admin (subconjunto de los activos de la org) |

`requireModule(name)` y `requireModuleActive` (variante paramétrica que lee `moduleId` de `req.params`) comprueban:
1. que el módulo esté activo en `organization_modules` para la org del usuario, y
2. si el usuario es `profesor`, que además figure en `user_modules` para ese módulo.

`admin_centro` y `superadmin` solo necesitan (1). La gestión de asignaciones se hace vía `POST/DELETE /api/users/:userId/modules/:moduleId` (admin de la propia org). Cuando un admin desactiva un módulo a nivel de org, las filas de `user_modules` correspondientes se borran en cascada lógica para no dejar accesos huérfanos.

### Visibilidad de actividad reciente

`GET /api/organizations/:orgId/stats` (controller `organizationsController.getStats`) sirve tanto el dashboard institucional, como `RecentActivityList`, como `/dashboard/stats`. Devuelve:

```
users           — active_users / total_users
usageByModule   — top action_types últimos 30 días (legacy, para dashboard)
recentActivity  — últimas 10 acciones (alimenta RecentActivityList)
monthly         — { current_month, previous_month, delta_pct, hours_saved }
weeklyUsage     — [{ week: 1..5, count }] del mes en curso
moduleBreakdown — [{ module_id, label, count }] del mes (usa metadata->>'moduleId'
                  para tools Fase 1, module::text para Cambridge nativo)
teacherStats    — desglose por profe del mes con categorías exams/corrections/dynamics
                  (LIKE sobre action_type)
topTeacher      — el primero de teacherStats
topModule       — el primero de moduleBreakdown
```

Filtra `usage_logs` por rol:

- `admin_centro` y `superadmin` → toda la actividad de la org.
- `profesor` → solo sus propias filas (`ul.user_id = req.user.id`). El criterio "solo módulos asignados" se cumple por construcción: `requireModuleActive` impide registrar `usage_logs` de módulos no asignados, así que el conjunto del profe ya está acotado a sus módulos. No hace falta JOIN extra contra `user_modules` (que además rompería el histórico si el admin retira un módulo después).

---

## Módulos

Catálogo cerrado (tabla `modules`, seed `001_modules_catalog.sql`).
Se activan por organización vía `organization_modules` (pivote). El antiguo `organizations.active_modules[]` queda DEPRECATED.

### Catálogo Fase 1 — estado de implementación

**Primaria** (`stage = 'primaria'`):

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

**ESO** (`stage = 'eso'`):

| ID | Nombre | Tools | OCR |
|----|--------|:----:|:---:|
| `lengua_eso` | Lengua castellana y literatura | 4 | ✅ |
| `matematicas_eso` | Matemáticas | 3 | ✅ |
| `ingles_eso` | Inglés | 3 | ✅ |
| `cambridge` | Cambridge | layout custom | ✅ (dedicado) |
| `geo_historia_eso` | Geografía e Historia | 3 | ✅ |
| `ed_fisica_eso` | Educación física | 3 | — |
| `bio_geo_eso` | Biología y Geología | 3 | ✅ |
| `tecno_digital_eso` | Tecnología y digitalización | 3 | ✅ |
| `fis_quim_eso` | Física y Química | 1 | ✅ |
| `epva_eso` | EPVA | 3 | — |
| `religion_eso` | Religión | 2 | — |
| `valores_eticos_eso` | Valores éticos | 3 | — |
| `tutorias_eso` | Tutorías | 3 | — |

**Total: 56 tools implementadas + 11 módulos con OCR genérico + Cambridge dedicado.**

Solo Cambridge tiene layout propio (caso especial: preparación de examen con generación híbrida BD+IA, OCR específico, dinámicas y presentaciones). El resto renderiza el patrón genérico `ModuleLayout` + `ModuleHome` + `ToolPage` desde el catálogo.

### Categorías

`modules.category` (VARCHAR abierto): `asignatura`, `preparacion_examen`, `religion_valores`, `accion_tutorial`.

### Cómo añadir un módulo nuevo

1. Insertar fila en `001_modules_catalog.sql`.
2. Añadir `<Route>` en `App.jsx` apuntando a `ModuleLayout` con su `moduleId`.
3. Si usa un `icon` nuevo, mapearlo en `ICON_GLYPHS` de `SidebarStage.jsx`.
4. Si tiene OCR: añadir entrada en `OCR_CONFIG` de `backend/src/services/ocrSubjects.js`.

Sin cambios de esquema ni de controlador.

---

## Sistema de tools (catálogo declarativo)

Núcleo del catálogo Fase 1: cualquier herramienta se define declarativamente en BD y se enrola con un único dispatcher.

### Flujo

```
Profesor ejecuta tool
    ↓
POST /api/modules/:moduleId/tools/:toolKey/run  { input }
    ↓
moduleToolsController.run
    ↓
1. Lee tool de BD (input_schema, output_kind, default_model)
2. Valida input contra input_schema
3. Si !aiAvailable() → demoFixtures.forKind(output_kind, input) → fixture realista
4. Si IA → toolsRegistry.run(toolKey, input, ctx) → handler real
5. Auto-persiste resultado en library_items (best-effort)
6. Devuelve { output_kind, output, autoSaved: true, demo?: true }
```

### Output kinds soportados

`text` · `exercise_set` · `rubric` · `timeline` · `quiz` · `commentary` · `exam` (Cambridge legacy)

Cada uno tiene:
- Renderer frontend en `components/tools/results/`
- Renderer PDF en `backend/src/services/pdfService.js`
- Fixture demo en `backend/src/services/tools/demoFixtures.js`

### Añadir una tool nueva en 3 pasos

1. **Seed** — fila en `backend/src/seeds/002_module_tools.sql`:
   ```sql
   INSERT INTO module_tools (key, name, description, output_kind, input_schema, sort_order) VALUES
     ('miclave.minueva', 'Mi herramienta', 'Descripción.', 'text',
      '{"fields":[{"key":"x","label":"X","type":"text","required":true}]}'::jsonb, 10);
   INSERT INTO module_tool_bindings (module_id, tool_key, sort_order) VALUES
     ('algun_modulo_id', 'miclave.minueva', 10);
   ```

2. **Handler** — función en `backend/src/services/tools/<modulo>.js`:
   ```js
   exports.minueva = async (input, ctx) => {
     const text = await callClaude({ system: '...', messages: '...', model: 'haiku' });
     return { output_kind: 'text', output: text };
   };
   ```
   Registrar en `tools/index.js`:
   ```js
   'miclave.minueva': miModulo.minueva,
   ```

3. **Renderer (opcional)** — solo si el `output_kind` no existe aún. Si reusas uno, NO hay que tocar nada.

`consistencyCheck.js` avisa al arranque si hay discrepancia BD ↔ código.

---

## Banco curado de preguntas (patrón híbrido BD + IA)

Inspirado en Cambridge, extendido al catálogo Fase 1. Cualquier tool que genere `exercise_set` o `quiz` puede tirar de un **banco curado por módulo** en `exam_questions`. Si la BD cubre parte, lo demás lo completa Claude.

### Esquema

`exam_questions` ([migración 008](backend/src/migrations/008_exam_questions_module_id.sql)) tiene una columna `module_id VARCHAR(50) REFERENCES modules(id)` alineada con el catálogo. El enum legacy `module` queda como nullable para compat con filas históricas. Índices: `(module_id, level)` y `(module_id, topic)` con WHERE `is_active`.

### Servicio reutilizable

`services/hybridGeneratorService.js` expone `withCuratedBank(opts)`:

```js
const { withCuratedBank } = require('../hybridGeneratorService');

exports.problems = async (input, ctx) => {
  const output = await withCuratedBank({
    moduleId: ctx.moduleId,              // del dispatcher
    input, count, topic, course,
    mapSeed: (row) => ({                 // row exam_questions → item handler-shape
      type: row.type, prompt: row.question, answer: row.answer,
    }),
    buildOutput: async ({ remaining }) => {
      // El handler construye SU prompt original pero pidiendo `remaining`
      // en vez de `count`. Devuelve el mismo JSON que devolvería sin BD.
      return callClaudeJSON({ system, messages: `...${remaining}...`, model, maxTokens });
    },
    itemsKey: 'exercises',               // 'questions' para output_kind 'quiz'
  });
  return { output_kind: 'exercise_set', output };
};
```

El servicio:
1. Lee hasta `floor(count * 0.5)` filas de `exam_questions WHERE module_id=$1 AND level ILIKE %course% AND topic ILIKE %topic%`.
2. Si la BD ya cubre el total, evita el call a Claude y devuelve solo seeds.
3. Si no, llama a `buildOutput({ remaining })` y fusiona: seeds primero (source `'database'`), IA después (source `'ai'`).
4. Devuelve el output original del handler con `dbCount` y `aiCount` añadidos para trazabilidad.

### Handlers que usan el patrón

15 handlers de `output_kind` en `'exercise_set' | 'quiz'`:

`ingles.exercises`, `ingles.reading`, `byg.exam`, `fyq.problems`, `mat_prim.problems`, `mat_prim.series`, `len_prim.exercises`, `len_prim.reading`, `len_eso.exercises`, `mat_eso.problems`, `mat_eso.exercises`, `mat_eso.exam`, `tec_eso.exercises`, `geh.quiz`, `med_prim.quiz`.

Cambridge mantiene su `examGeneratorService` propio (output shape distinto: `questions[]` en vez de `exercises[]`). También actualizado para filtrar por `module_id = 'cambridge'`.

### Seeds curados

`seeds/003_exam_questions_by_module.sql` siembra 3-5 preguntas por módulo (~40 totales) como demo realista. Es seed de SISTEMA, idempotente (NOT EXISTS sobre (module_id, question)). El contenido pedagógico real se amplía con SQL directo o desde el panel cuando se cree.

### Modo demo

Si `aiAvailable() === false` y el banco cubre el total, el output sale 100% BD. Si el banco no cubre, el dispatcher cortocircuita con `demoFixtures.forKind(...)` ANTES de llegar al handler (ver § Modo demo).

---

## Corrector OCR genérico por asignatura

Cualquier módulo declarado en `ocrSubjects.OCR_CONFIG` expone automáticamente un corrector OCR. Mismo flujo que Cambridge pero parametrizado.

### Flujo

```
Profesor sube foto del examen del alumno
    ↓
POST /api/modules/:moduleId/ocr/correct  multipart examImage
    ↓
moduleOcrController.correctOcr
    ↓
1. Verifica que el módulo tiene OCR habilitado en OCR_CONFIG
2. Google Vision → extrae texto
3. Si !aiAvailable() → demoFixture coherente
4. Si IA → Claude con system+prompt específico de la asignatura
5. Loguea uso
6. Devuelve { totalScore, maxScore, grade, questions[], strengths, improvements, studyRecommendations, overallFeedback }
```

### Frontend

- `ModuleOcrPage.jsx` (genérico) carga `GET /modules/:moduleId/ocr/config` para autoconfigurar niveles, focus options y modos de feedback.
- `ModuleLayout` muestra entrada "Corrector OCR" en la sidebar si `ocrEnabled = true`.
- `ModuleHome` lo expone como una tool más (§ II) en la grid.

### Módulos con OCR habilitado (11)

`ingles_primaria`, `ingles_eso`, `lengua_primaria`, `lengua_eso`, `matematicas_primaria`, `matematicas_eso`, `medio_primaria`, `geo_historia_eso`, `bio_geo_eso`, `fis_quim_eso`, `tecno_digital_eso`. Cambridge mantiene su OCR dedicado.

### Cómo activar OCR en un módulo nuevo

Una edición: entrada en `OCR_CONFIG` de `backend/src/services/ocrSubjects.js` con `{label, levels, focusOptions, system, userPromptBuilder}`. Frontend y rutas ya están preparados.

---

## Biblioteca unificada

Tabla `library_items` (migración 004). Cualquier output de cualquier tool se auto-persiste tras generarse. Cambridge sigue usando su tabla `exams` legacy; la biblioteca une ambas en runtime sin duplicar storage.

### Endpoints

```
POST   /api/library/items                      # crear (lo hace el dispatcher automáticamente)
GET    /api/library/items                      # listar con filtros (search, module, kind, from, to)
GET    /api/library/items/:id
DELETE /api/library/items/:id
```

### Auto-persistencia

`moduleToolsController.run` invoca `autoSaveToLibrary(...)` tras el handler. Best-effort: si falla (tabla no migrada, etc.) lo registra pero no rompe la respuesta. El response trae `autoSaved: true`.

Modo demo NO ensucia BD: el cortocircuito de fixtures responde antes de llegar a la persistencia.

### Páginas

- `/dashboard/resources` (`Resources.jsx`) — biblioteca unificada con búsqueda, filtros (módulo + tipo inferidos), descargar PDF, eliminar.
- `/dashboard/resources/:id` (`ResourceDetail.jsx`) — detalle, render con `ResultRenderer`, PDF, eliminar.

---

## Sistema de PDF

`pdfService.buildPdf({ type, data, title, subtitle, moduleKey })` con renderers por `output_kind`:

| `type` | Renderer | Uso |
|---|---|---|
| `exam` | `renderExam` | Cambridge legacy |
| `exercise_set` / `exercises` | `renderExerciseSet` | Tools Fase 1 — examen + solucionario |
| `quiz` | `renderQuiz` | Cuestionarios tipo test |
| `rubric` | `renderRubric` | Rúbricas de evaluación |
| `timeline` | `renderTimeline` | Líneas de tiempo |
| `commentary` | `renderCommentary` | Comentarios de texto |
| `text` | `renderText` | Markdown ligero (#, ##, -, **bold**) |
| `problems` / `series` | `renderProblems` | Legacy mates |
| `dynamics` | `renderDynamics` | Cambridge dinámicas |
| `sheet` | `renderSheet` | Legacy fichas |
| `feedback` / `ocr` / `essay` / `syntax` | `renderFeedback` | Informes de corrección |
| `invoice` | `renderInvoice` | Facturas (PAGADA/PENDIENTE, IVA, totales) |
| default | `renderJSON` | Volcado pretty |

Todos comparten paleta y tipografía + footer con paginación.

### Flujo de descarga

Frontend → `pdfApi.download({ type, data, title, subtitle, moduleKey, filename })` → `POST /api/pdf/render` → binario `application/pdf` → forzar descarga.

`DownloadPdfButton` encapsula el flujo. ToolRunner pasa `output_kind` directo como `type`.

---

## Modo demo (sin clave de IA)

`aiAvailable()` (`utils/aiAvailable.js`) detecta clave válida: existe, no `PLACEHOLDER`, empieza por `sk-ant-`, longitud >= 30.

Si falsea, el sistema entra en **modo demo controlado**:

1. **Cambridge**: examGenerator devuelve preguntas reales de `exam_questions` (5 seedeadas en `dev_demo_data.sql`) + fixture para el resto. OCR cae a `fixtures.ocrCorrection`.
2. **Tools Fase 1**: `demoFixtures.forKind(output_kind, { input, tool })` genera fixture específico por kind con datos del input. El dispatcher devuelve `{ ...demo, demo: true }`.
3. **OCR genérico**: `ocrSubjectCorrectorService.demoFixture` devuelve corrección de muestra.
4. **Facturas**: `/stripe/invoices` devuelve 6 meses de fixture si no hay `stripe_customer_id` real. Adicionalmente el frontend tiene 4 facturas de ejemplo precargadas como último fallback.

`ToolRunner` muestra banner amarillo discreto cuando llega `demo: true`.

---

## Manejo de errores IA

`callClaude` mapea errores SDK y `aiAvailable()` con códigos estables:

| Código | Status | Caso |
|---|---|---|
| `AI_NOT_CONFIGURED` | 503 | ANTHROPIC_API_KEY vacía o placeholder |
| `AI_INVALID_KEY` | 503 | 401/403 de Anthropic |
| `AI_RATE_LIMITED` | 429 | 429 de Anthropic |
| `AI_UNAVAILABLE` | 502 | 5xx / 529 de Anthropic |
| `BAD_AI_RESPONSE` | 502 | JSON no parseable |

`moduleToolsController` y `ToolRunner` muestran mensaje en español. Nunca se filtra el body crudo de Anthropic al usuario.

---

## Notificaciones in-app

Sistema de alertas dentro de la app para `admin_centro` y `profesor`. Tabla `notifications` (migración 005) + helper `notifyService` invocado desde controladores.

### Tipos canónicos (en `services/notifyService.js`)

```
module_activated   · module_deactivated · tool_generated · exam_saved
ocr_completed      · invoice_paid       · ai_error       · system
teacher_first_login · teacher_inactive  · quota_warning  · weekly_digest
```

### Disparadores integrados

| Flujo | Tipo | Destinatarios |
|---|---|---|
| Admin asigna módulo a un profe | `module_activated` | El profesor asignado |
| Admin desactiva módulo de la org | `module_deactivated` | Solo profes que tenían ese módulo asignado |
| Admin desasigna módulo a un profe | `module_deactivated` | El profesor afectado |
| Profesor genera output de tool (Fase 1) | `tool_generated` | El propio profesor |
| Profesor guarda examen Cambridge | `exam_saved` | El propio profesor |
| OCR completado (Cambridge o genérico) | `ocr_completed` | El propio profesor |
| Stripe webhook `checkout.session.completed` | `invoice_paid` | Admins del centro |
| Stripe webhook `invoice.paid` | `invoice_paid` | Admins del centro |
| Profe invitado entra por primera vez | `teacher_first_login` | Admins del centro |
| 3 errores IA del mismo código en 15 min | `ai_error` | Admins del centro (1 sola alerta, cooldown 1h) |
| Org cruza 50/80/100% del límite mensual | `quota_warning` | Admins del centro (1 vez por umbral y mes) |
| Profe sin entrar ≥ 14 días | `teacher_inactive` | Admins del centro (1 por profe cada 14 días) |
| Resumen semanal (lunes 08:00) | `weekly_digest` | Admins del centro (si hubo actividad esa semana) |

### Helper

```js
const { notify, notifyRole, TYPES } = require('../services/notifyService');

// A un usuario concreto
await notify({
  userId,
  organizationId,
  type: TYPES.TOOL_GENERATED,
  title: 'Recurso generado: ...',
  body: 'Disponible en biblioteca',
  link: '/dashboard/resources',
  metadata: { moduleId, toolKey },
});

// A todos los usuarios de una org con un rol
await notifyRole({
  organizationId,
  role: 'profesor',
  type: TYPES.MODULE_ACTIVATED,
  title: 'Nuevo módulo disponible',
  link: '/dashboard',
});
```

Es **best-effort**: si la tabla no existe o la query falla, no rompe el flujo del caller. Los disparadores nunca son críticos para la operación principal.

### Frontend

- `NotificationBell.jsx` en el Topbar — badge con count de no-leídas (máximo "99+")
- Polling cada 30 s vía React Query (`refetchInterval: 30_000`)
- Dropdown con las últimas 12, marcado individual al click, "Marcar todas leídas"
- Cierra con click fuera o `Escape`
- Cada tipo tiene su color de acento (marino / granate / verde / amarillo)

---

## Tests

Configuración en tres capas: unitarios backend (Jest), unitarios frontend (Vitest, API Jest-compatible), end-to-end (Playwright).

### Comandos

```bash
# Desde la raíz (workspace)
npm test                # ejecuta backend + frontend unitarios
npm run test:backend    # solo Jest backend
npm run test:frontend   # solo Vitest frontend
npm run test:e2e        # Playwright (arranca backend+frontend automáticamente)
npm run test:e2e:ui     # Playwright UI mode (interactivo)
npm run test:e2e:install # instala el navegador Chromium
```

### Jest (backend)

Configurado en `backend/jest.config.js`. Solo `node`, sin DOM.

Archivos:
- `src/utils/aiAvailable.test.js` — detector de configuración de IA (6 casos)
- `src/services/claudeService.test.js` — `parseJSON` con respuestas malformadas (8 casos)
- `src/services/pdfService.test.js` — smoke test de los renderers críticos (5 casos)
- `src/services/tools/demoFixtures.test.js` — fixtures por output_kind (9 casos)

Excluye `tests/integration/**` por defecto. Tests con BD/IA reales viven aparte.

### Vitest (frontend)

Configurado en `frontend/vitest.config.js` + setup en `src/test/setup.js` con `@testing-library/jest-dom/vitest` y cleanup automático. Entorno `jsdom`.

Archivos:
- `src/components/tools/DynamicForm.test.jsx` — render del schema, required, onChange, defaults (6 casos)
- `src/components/ui/Button.test.jsx` — primitives Button, Card, Badge, ProgressBar

### Playwright (e2e)

Configurado en `playwright.config.js`. `webServer` arranca backend (3001) y frontend (5173) automáticamente. Usa `baseURL: http://localhost:5173` y locale `es-ES`. Solo Chromium por defecto.

Helpers en `tests/e2e/helpers.js` con login UI usando los seeds demo (`admin@verigood.com / demo1234`).

Specs:
- `tests/e2e/login.spec.js` — login OK, credenciales inválidas, logout (3 casos)
- `tests/e2e/tool-flow.spec.js` — Cambridge accesible, biblioteca carga, panel módulos, mis exámenes (4 casos)
- `tests/e2e/billing.spec.js` — listado de facturas, gestionar suscripción, descarga real de PDF (3 casos)

**Importante**: los e2e asumen MODO DEMO (sin `ANTHROPIC_API_KEY` válida) para no golpear la API de Anthropic en CI ni generar coste.

### Cómo añadir tests

- Backend: nuevo archivo `*.test.js` junto al fichero que prueba. Jest lo detecta vía `testMatch`.
- Frontend: nuevo archivo `*.test.jsx`. Vitest globals (`describe`, `test`, `expect`) están en scope.
- e2e: nuevo `*.spec.js` en `tests/e2e/`. Usar `loginAs(page, ADMIN)` del helper para autenticarse.

---

## API — endpoints principales

### Auth
```
POST /api/auth/register     # crea org + admin en transacción
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

### Usuarios (gestión de profesores por el admin del centro)
```
GET    /api/organizations/:orgId/users                       # listado del centro
POST   /api/organizations/:orgId/users                       # invitar (devuelve tempPassword)
PATCH  /api/users/:userId                                    # editar name / role / is_active
DELETE /api/users/:userId                                    # eliminar REAL (409 HAS_ACTIVITY si tiene historial; 409 LAST_ADMIN)
```

`PATCH` y `DELETE` aplican salvaguardas: el admin no puede mutarse a sí mismo (`CANNOT_SELF_MUTATE` / `CANNOT_SELF_DELETE`) ni eliminar al último admin activo del centro. La eliminación dura solo se permite si no hay filas en `usage_logs`, `exams`, `exam_attempts` o `library_items` para ese user_id; en caso contrario el flujo correcto es desactivar (PATCH `is_active=false`).

### Módulos
```
GET    /api/modules                                          # catálogo global
GET    /api/organizations/:orgId/modules                     # módulos activos
POST   /api/organizations/:orgId/modules/:moduleId/activate
DELETE /api/organizations/:orgId/modules/:moduleId
GET    /api/users/:userId/modules                            # módulos asignados al profesor
POST   /api/users/:userId/modules/:moduleId                  # admin asigna módulo
DELETE /api/users/:userId/modules/:moduleId                  # admin desasigna módulo
GET    /api/organizations/:orgId/onboarding-state
POST   /api/organizations/:orgId/onboarding-state/complete
```

### Tools del catálogo
```
GET  /api/modules/:moduleId/tools                            # tools vinculadas
POST /api/modules/:moduleId/tools/:toolKey/run               # ejecutar (auto-persiste)
```

### OCR genérico por asignatura
```
GET  /api/modules/:moduleId/ocr/config                       # config pública
POST /api/modules/:moduleId/ocr/correct                      # multipart examImage
```

### Biblioteca
```
POST   /api/library/items                                    # 403 MODULE_NOT_CONTRACTED si moduleId no está en organization_modules
GET    /api/library/items?search&module&kind&from&to
GET    /api/library/items/:id
PATCH  /api/library/items/:id                                # metadata: finalScore | approvedAt | studentName (validados)
DELETE /api/library/items/:id
```

### Temario del módulo (syllabus)
```
GET    /api/modules/:moduleId/syllabus                       # temario completo (temas + items + library_items enlazados)
POST   /api/modules/:moduleId/syllabus/sections              # crear tema
PATCH  /api/modules/:moduleId/syllabus/reorder               # reorden atómico { sectionIds: [uuid, ...] } en transacción
PATCH  /api/syllabus/sections/:sectionId                     # renombrar / mover
DELETE /api/syllabus/sections/:sectionId
POST   /api/syllabus/sections/:sectionId/items               # crear item (kind ∈ {exercise, presentation, dynamic, exam, documentation})
GET    /api/syllabus/items/:itemId                           # item + library_payload enlazado
GET    /api/syllabus/items/:itemId/corrections               # correcciones OCR agrupadas por syllabusItemId
PATCH  /api/syllabus/items/:itemId                           # library_item_id se valida cross-tenant (403 CROSS_TENANT si de otra org)
DELETE /api/syllabus/items/:itemId                           # cascade lógico: correcciones OCR huérfanas pierden metadata.syllabusItemId
```

### Notificaciones in-app
```
GET    /api/notifications?unread=true&limit=30
GET    /api/notifications/unread-count
POST   /api/notifications/:id/read
POST   /api/notifications/read-all
DELETE /api/notifications/:id
```

### Cambridge
```
POST   /api/cambridge/exams/generate
POST   /api/cambridge/exams/save
GET    /api/cambridge/exams
GET    /api/cambridge/exams/:id                              # detalle
DELETE /api/cambridge/exams/:id
POST   /api/cambridge/ocr/correct
POST   /api/cambridge/dynamics/generate
POST   /api/cambridge/presentations/generate
```

### Stripe / Facturación
```
GET  /api/stripe/plans
GET  /api/stripe/status                                      # configured + plan + customer + subscription
POST /api/stripe/checkout
POST /api/stripe/portal                                      # 503 STRIPE_NOT_CONFIGURED · 409 NO_CUSTOMER
POST /api/stripe/subscription/cancel                         # cancel_at_period_end = true
POST /api/stripe/subscription/resume                         # revierte cancelación programada
GET  /api/stripe/invoices                                    # Stripe real con fallback fixture
GET  /api/stripe/invoices/:id
POST /api/stripe/webhook                                     # raw body — ANTES de express.json()
```

### PDF
```
POST /api/pdf/render                                         # binario; type + data
GET  /api/pdf/status                                         # AI/demo status
```

---

## Variables de entorno

`.env.example` en raíz. En producción crear `backend/.env`:

```env
# Base de datos
DATABASE_URL=postgresql://user:pass@localhost:5432/verigood
DB_SSL=false

# JWT
JWT_SECRET=cambia_esto_en_produccion
JWT_REFRESH_SECRET=cambia_esto_tambien
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Anthropic — REQUIRED para que NO entre en modo demo
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_HAIKU_MODEL=claude-haiku-4-5-20251001
CLAUDE_SONNET_MODEL=claude-sonnet-4-6

# Google Vision (OCR)
GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json
GOOGLE_CLOUD_PROJECT_ID=verigood-...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_COLEGIO=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# App
PORT=3001
CORS_ORIGINS=https://verigood.es,http://localhost:5173
FRONTEND_URL=https://verigood.es
NODE_ENV=production
```

Con `ANTHROPIC_API_KEY=sk-ant-PLACEHOLDER` (o ausente) el sistema entra en modo demo automáticamente. No es bug — es funcionalidad para entornos pre-producción.

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
psql $DATABASE_URL -f backend/src/migrations/003_module_tools.sql
psql $DATABASE_URL -f backend/src/migrations/004_library_items.sql
psql $DATABASE_URL -f backend/src/migrations/005_notifications.sql
psql $DATABASE_URL -f backend/src/migrations/006_user_modules.sql
psql $DATABASE_URL -f backend/src/migrations/007_notifications_indices.sql
psql $DATABASE_URL -f backend/src/migrations/008_exam_questions_module_id.sql
psql $DATABASE_URL -f backend/src/migrations/009_organization_anthropic_key.sql

# Seeds de SISTEMA (idempotentes, ON CONFLICT)
psql $DATABASE_URL -f backend/src/seeds/001_modules_catalog.sql   # 23 módulos
psql $DATABASE_URL -f backend/src/seeds/002_module_tools.sql      # 56 tools + bindings
psql $DATABASE_URL -f backend/src/seeds/003_exam_questions_by_module.sql  # banco curado por módulo

# Seed de DEMO (solo dev)
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
amarillo #E8D89A   avisos / modo demo
linea    #B8A988   bordes, texto secundario
```

**Fuentes:** Libre Baskerville (títulos, `font-display`), Inter (cuerpo), Caveat (anotaciones manuscritas, `font-caveat`), JetBrains Mono (datos, `font-mono`)

**Reglas de diseño:**
- `border-radius` máximo 2px — sin píldoras, sin esquinas redondeadas
- Sin gradientes. Sin emojis en UI.
- Sombras secas: `box-shadow: 2px 2px 0 rgba(184,169,136,0.4)`
- Card corner fold via `clip-path` (clase `.card-fold`)
- Fondo cuadrícula 24px al 8% de opacidad (`.bg-grid-paper`)
- Score stamps rotados con opacidad (`.score-stamp`)
- Números romanos en márgenes como decoración (§ I, § II...)

### Responsive

Breakpoint principal: **`md` (768px)** — separa móvil/tablet-pequeño de tablet-grande/desktop.

- **Sidebar**: en `< md` es un drawer fijo que sale de la izquierda con backdrop. El estado vive en `stores/mobileMenuStore.js` (Zustand). El botón hamburguesa (☰) está en la Topbar (visible sólo `md:hidden`). Cada `SidebarItem` invoca `close()` al navegar. Bloquea scroll del body mientras está abierto y se cierra con `Escape`.
- **Topbar**: `sticky top-0 z-40`. En `< md`: hamburguesa + logo + chip de módulo compacto. El nombre de la org (`orgName`) sólo se muestra en `md+`.
- **Layouts** (`ModuleLayout`, `InstitutionalLayout`, `CambridgeLayout`, `SuperadminLayout`): `min-h-screen flex flex-col`. Padding del contenido `p-4 md:p-7` (Cambridge/Módulo/Superadmin) o `p-4 md:p-8 lg:p-10` (Institutional). El `<main>` incluye `min-w-0` para evitar overflow horizontal cuando hay tablas o textos largos.
- **Zoom global**: `body { zoom: 1.10 }` para engordar la tipografía en desktop, **desactivado en `< md`** vía media query en `index.css` (`@media (max-width: 767px) { body { zoom: 1 } }`) — en pantallas pequeñas rompía márgenes.
- **Grids**: patrón `grid-cols-1 sm:grid-cols-2 md:grid-cols-4` para stat cards (Superadmin Dashboard/Stats/Billing, Institutional Dashboard). Grids 12-col con `col-span-N` usan prefijo `md:` o `lg:` (Superadmin Users, Superadmin Modules).
- **OCR paneles (izquierda/derecha)**: `grid grid-cols-1 md:grid-cols-2 gap-5`. En móvil se apilan.
- **Cambridge**: `ExamGenerator` pasos con grids `grid-cols-3 sm:grid-cols-6` (nivel) y `grid-cols-1 sm:grid-cols-2` (tema+preguntas, tipos+source). `DynamicsGenerator` usa `grid grid-cols-1 lg:grid-cols-5` con `lg:col-span-2` / `lg:col-span-3`.
- **Modal** (`components/ui/index.jsx`): en `< sm` se pega abajo como bottom-sheet (`rounded-t-2xl`, sin padding lateral del backdrop); en `sm+` centrado con `max-w-xl rounded-2xl`. Body con `overflow-y-auto` y modal completo con `max-h-[90vh] flex flex-col`.
- **Tablas**: siempre envueltas en `overflow-x-auto` para permitir scroll horizontal en móvil sin romper el layout.

Para pantallas de tablet (≥ 768 px), la sidebar vuelve al comportamiento sticky en flujo normal — mismo layout que desktop.

---

## Patrones de código

### Llamada a IA (backend)

```js
// callClaude lanza AI_NOT_CONFIGURED/INVALID_KEY/... automáticamente
const result = await callClaudeJSON({
  system: 'Eres profesor de ... LOMLOE ...',
  messages: '... prompt ...',
  model: 'haiku',
  maxTokens: 2048,
});
// parseJSON() maneja bloques markdown, trailing commas, etc.
```

### Handler de tool

```js
exports.miHandler = async (input, ctx) => {
  // ctx = { moduleId, stage, userId, orgId, model }
  const result = await callClaudeJSON({ system, messages, model: 'haiku', maxTokens: 2000 });
  return { output_kind: 'exercise_set', output: result };
};
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
<ProtectedRoute module="cambridge">
  <CambridgeLayout />
</ProtectedRoute>
```

### Captura de consumo IA por tool

`runWithUsageCapture` (`claudeService.js`) usa `AsyncLocalStorage` para sumar `input_tokens` + `output_tokens` de todas las llamadas a `callClaude` que un handler haga durante una petición. El dispatcher persiste el resultado en `usage_logs.tokens_used`.

### Flujo de trabajo con agentes

`/agentes` contiene 5 perfiles especializados. Para nuevas funcionalidades:
`arquitecto-software → desarrollador → auditor → tester → documentador`.

---

## Base de datos — tablas principales

```sql
organizations         -- colegios/academias (multi-tenant)
                      --   + onboarding_completed_at, created_with_demo_data
                      --   + stripe_customer_id, plan
users                 -- superadmin | admin_centro | profesor
refresh_tokens        -- rotating tokens
modules               -- catálogo cerrado (id, name, stage, category, icon, route_prefix)
organization_modules  -- pivote: qué módulos tiene activos cada org
user_modules          -- pivote: qué módulos están asignados a cada profesor
                      --   (subconjunto de organization_modules de su org)
module_tools          -- catálogo declarativo de tools (key, output_kind, input_schema)
module_tool_bindings  -- pivote: qué tools tiene cada módulo
library_items         -- biblioteca unificada: outputs de cualquier tool persistidos
                      --   (module_id, tool_key, kind, title, payload, metadata)
notifications         -- in-app: user_id, type, title, body, link, read_at
                      --   (8 tipos canónicos en notifyService.TYPES)
exams                 -- Cambridge legacy (questions JSONB)
exam_questions        -- banco de preguntas Cambridge curadas (BD híbrida)
exam_attempts         -- intentos de corrección OCR Cambridge
resources             -- DEPRECATED (hoy biblioteca = library_items + exams)
usage_logs            -- registro de consumo IA por org/usuario/tool
                      --   getStats lo filtra por user_id si el rol es profesor
```

---

## Deploy en VPS Madrid

```bash
# Primera vez
cp .env.example backend/.env
# → editar con credenciales reales

# Desplegar
chmod +x deploy.sh
./deploy.sh

# Comando rápido si ya está configurado
./deploy.sh --skip-migrate

# PM2 — dos procesos: backend (cluster x2) y digest (cron lunes 08:00)
pm2 status
pm2 logs verigood-backend
pm2 logs verigood-digest                 # job semanal: resumen + profes inactivos + purge
pm2 reload ecosystem.config.js --env production

# Lanzar el digest manualmente (no espera al cron):
node backend/src/jobs/weeklyDigest.js

# Nginx
nginx -t && systemctl reload nginx
```

SSL con Let's Encrypt: `certbot --nginx -d verigood.es -d www.verigood.es`

---

## Blindaje multi-tenant y seguridad

Patrones defensivos añadidos tras auditoría. **Cualquier feature nueva debe respetarlos**.

### Boundary de organización

- **Nunca aceptar un id de otra tabla del body sin verificar su org**. Ej: `syllabus_items.library_item_id` debe pertenecer a la misma org que el temario destino. Endpoints afectados: `createItem`, `updateItem` en `syllabusController.js`. Si no coincide → `403 CROSS_TENANT`.
- **Helper `resolveTargetOrg(req)`** (`syllabusController.js`): usa `req.user.organization_id` por defecto y **solo** acepta el fallback `req.query.organizationId` cuando `role === 'superadmin'`. Si añades un nuevo rol sin org que no sea superadmin, la función lo bloquea con explicitud. Reutilízalo en cualquier endpoint del temario que necesite resolver el org objetivo.
- **`library_items.createItem` valida contrato del módulo**: exige que `moduleId` esté en `organization_modules` de la org del profe. `403 MODULE_NOT_CONTRACTED` si no. Superadmin exento.

### Uploads

- `backend/src/utils/fileValidation.js` expone `detectFileKind(buffer)` (detecta PNG/JPEG/WebP/PDF por firma binaria) y middleware `validateUploadMagicBytes`. Aplicado en `POST /api/modules/:moduleId/ocr/correct` y `POST /api/cambridge/ocr/correct`. `fileFilter` de multer no basta — el `mimetype` lo declara el cliente y se puede falsificar.
- Cualquier nuevo endpoint que reciba archivos debe encadenar `upload.single(...)` seguido de `validateUploadMagicBytes` antes del handler.

### Rate limiting

`index.js` mantiene dos limiters:
- `generalLimiter` (100 req / 15 min): aplicado globalmente a `/api/`.
- `aiLimiter` (30 req / 15 min): aplicado a rutas que consumen IA o Anthropic:
  - `/api/cambridge`, `/api/lengua`, `/api/matematicas`, `/api/medio`
  - `/api/modules/:m/tools/:t/run` (regex)
  - `/api/modules/:m/ocr/correct` (regex)
  - `/api/organizations/:orgId/anthropic` (regex) — el PUT valida la clave contra Anthropic con un ping real.

### Integridad de datos y cascade lógico

- `syllabus_items.library_item_id`: FK con `ON DELETE SET NULL` — al borrar un `library_item`, el slot del temario queda vacío pero persiste.
- Las **correcciones OCR** son `library_items` (kind='ocr') con `metadata.syllabusItemId` como pointer JSONB, sin FK real. Al borrar un `syllabus_item`, `syllabusController.deleteItem` ejecuta `UPDATE library_items SET metadata = metadata - 'syllabusItemId' …` antes del DELETE. Las correcciones **no se borran** (mantienen su valor pedagógico en la biblioteca del centro), solo pierden el enlace huérfano.
- El endpoint `PATCH /modules/:moduleId/syllabus/reorder` reordena todos los temas en una **transacción** (`BEGIN/COMMIT/ROLLBACK`). Antes se disparaban dos PATCH paralelos y un fallo intermedio dejaba `sort_order` inconsistente. Ver `handleMoveSection` en `ModuleSyllabus.jsx` como caller.

### Validaciones de payload

- `libraryController.updateItem` (usado por el "Dar visto bueno" del corrector OCR): rechaza `finalScore` vacío, NaN o negativo con `400 INVALID_SCORE`. Limita `studentName` a 120 caracteres. Antes `Number('')` daba 0 y se persistía 0/10 silenciosamente.
- `organizationsController.updateModules` (endpoint DEPRECATED que escribe en `organizations.active_modules[]`): filtra por `enum_range(NULL::module_type)` en runtime en vez de lista hardcodeada. Valida que `activeModules` sea array.
- Frontend: en cada correction result, el botón "Dar visto bueno" queda deshabilitado si el input `finalScore` es inválido (con aviso rojo). Ya no se bloquea permanentemente tras el primer approve — el copy cambia a "Re-guardar visto bueno" para clarificar.

### UX OCR — evitar ambigüedades

- Mientras hay una corrección OCR en vuelo (`isPending`), el `ReferenceKeyPanel` recibe `correcting={true}` que **deshabilita la textarea de la clave y el botón Validar**. Sin esto, editar la clave durante la corrección generaba dudas de "¿con qué clave se corrigió al alumno actual?".
- El `useEffect([item?.id, ...])` que rehidrata `answerKey` desde el backend usa un `useRef(lastLoadedItemId)`: si el item es el mismo que ya se cargó y el profe está tecleando (`answerKeyDirty === true`), NO sobrescribe su edición. Antes cualquier refetch de la query invalidaba en curso perdía el trabajo del profe.
- En Cambridge (`ExamGenerator`, `PresentationGenerator`), el auto-save + link al temario mantiene 3 estados: `linking` (en curso, píldora gris), `savedId && !linkError` (éxito, píldora verde), `linkError` (fallo, píldora granate + botón **Reintentar**). Ya no hay falso positivo "vinculado al temario" cuando el link falló silenciosamente.

### Accesibilidad

- `Modal` (`components/ui/index.jsx`) tiene `role="dialog"`, `aria-modal="true"`, `aria-labelledby="vg-modal-title"`. Botón `×` con `aria-label="Cerrar modal"` y el glifo envuelto en `<span aria-hidden="true">`. Sigue este patrón en cualquier control con solo icono (☰, ↻, ✕, etc.): `aria-label` en el botón, `aria-hidden` en el glifo.

---

## Notas importantes

- El webhook de Stripe **debe registrarse antes** de `express.json()` en `backend/src/index.js` para recibir el body sin parsear.
- Modelos de Anthropic: `claude-haiku-4-5-20251001` para tools/OCR/correcciones, `claude-sonnet-4-6` para generación larga (Cambridge exam generator).
- El Vite dev server hace proxy de `/api/*` → `localhost:3001` (configurado en `frontend/vite.config.js`).
- `parseJSON()` en `claudeService.js` maneja respuestas malformadas (bloques markdown, trailing commas, JSON anidado en texto).
- Las rutas legacy `/lengua`, `/matematicas`, `/medio` usan IDs antiguos (`espanol`, `matematicas`, `medio`) que NO están en el catálogo Fase 1. Quedarán inalcanzables hasta que se decida su mapeo.
- **Módulos**: la fuente de verdad es `organization_modules`. El array `organizations.active_modules` está deprecated.
- **Biblioteca**: `library_items` (tools Fase 1) + `exams` (Cambridge legacy) se unen en runtime en `Resources.jsx`. No se duplica storage de PDF: se regenera on-demand desde el payload.
- **Onboarding**: una org sin `onboarding_completed_at` ve el `OnboardingHero` en el dashboard institucional. La sidebar oculta etapas sin módulos activos. Estado expandido/contraído de la sidebar: `localStorage`.
- **Modo demo**: si `aiAvailable()` falsea, el dispatcher de tools cortocircuita con `demoFixtures.forKind(...)`. No es bug, es funcionalidad.
- **Facturas**: `renderInvoice` produce PDF con número correlativo, fechas, base imponible, IVA 21%, total, sello PAGADA/PENDIENTE y pie legal RGPD. Si la org tiene `stripe_customer_id` real, se usan facturas oficiales Stripe vía `invoice_pdf`. Si no, fixture backend (6 meses) y, como último fallback, 4 ejemplos precargados en el frontend.
- **Configuración de Anthropic por organización**: el CTA "Configurar IA" en `/dashboard/billing` navega a `/dashboard/anthropic` (componente `AnthropicSetup`). El admin del centro pega su propia clave de Anthropic; el backend la verifica con un ping a Anthropic, la cifra con AES-256-GCM (`utils/encryption.js`) y la persiste en `organizations.anthropic_api_key_encrypted` (mig 009). En runtime, el dispatcher de tools, Cambridge y OCR resuelven la clave de la org vía `utils/orgApiKey.js` y la inyectan en un `AsyncLocalStorage` (`runWithApiKey` en `claudeService`) — `callClaude` la lee de ahí. Cada org paga sus propios tokens directamente a Anthropic. Sin clave configurada → modo demo per-org (banco curado + fixtures). El antiguo flujo Stripe de gestión de suscripción (`/stripe/checkout`, `/portal`, `/status`, `/subscription/cancel|resume`) está eliminado; solo quedan `/stripe/plans`, `/stripe/invoices` y `/stripe/webhook`. Requiere `ENCRYPTION_KEY` (32 bytes hex/base64) en el .env del backend.
- **Notificaciones**: `notifyService` es best-effort — si falla (tabla no migrada, etc.) lo registra en logs pero **nunca rompe** el flujo del caller. Polling cada 30s en el frontend; migrar a WebSockets cuando haga falta inmediatez real. Tipos canónicos: ver `TYPES` en `notifyService.js`.
- **CRUD de profesores**: `PATCH /users/:userId` para editar nombre/rol/`is_active`; `DELETE /users/:userId` para eliminación REAL (no soft delete). Salvaguardas en el controller: `CANNOT_SELF_MUTATE`, `CANNOT_SELF_DELETE`, `LAST_ADMIN` y `HAS_ACTIVITY`. La UI ([Users.jsx](frontend/src/pages/institutional/Users.jsx)) oculta los botones para la propia fila del admin logueado para evitar clics inútiles.
- **Estadísticas**: `/dashboard/stats` consume **datos reales** de `GET /organizations/:id/stats` (no hay constantes mock). El controller hace 5 queries paralelas a `usage_logs` para `monthly`, `weeklyUsage` (cubos del mes en curso), `moduleBreakdown` (usa `metadata->>'moduleId'` para tools Fase 1), `teacherStats` (clasifica `action_type` en exámenes/correcciones/dinámicas con CASE/LIKE) y nombres del catálogo. Empty state si no hay actividad este mes — nunca números inventados.
- **StatCard**: `components/ui/index.jsx` aplica `overflow-hidden`, `truncate` con `title` (tooltip nativo) y auto-shrink del `font-size` cuando `mono=false`: 36→28→22px según longitud del string. Beneficia a cualquier StatCard sin tocar callers.
- **Tests**: scaffolding completo con Jest (backend) + Vitest (frontend) + Playwright (e2e). Los e2e asumen modo demo (sin clave de IA) para no golpear Anthropic en CI. Ejecutar: `npm test`, `npm run test:e2e`.
