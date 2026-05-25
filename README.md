# VeriGood

> Plataforma SaaS de inteligencia artificial para colegios. Automatiza la creación de exámenes, corrección de ejercicios manuscritos, dinámicas de clase y materiales didácticos.

---

## Índice

1. [Descripción del producto](#descripción-del-producto)
2. [Arquitectura técnica](#arquitectura-técnica)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Módulos disponibles](#módulos-disponibles)
5. [Sistema de roles](#sistema-de-roles)
6. [Instalación local](#instalación-local)
7. [Variables de entorno](#variables-de-entorno)
8. [Base de datos](#base-de-datos)
9. [API REST](#api-rest)
10. [Dirección estética](#dirección-estética)
11. [Deploy en producción](#deploy-en-producción)
12. [Credenciales de demo](#credenciales-de-demo)
13. [Roadmap](#roadmap)

---

## Descripción del producto

VeriGood es un SaaS B2B dirigido exclusivamente a centros educativos. Permite a los profesores delegar en IA las tareas docentes más repetitivas: diseñar exámenes Cambridge desde cero, corregir ejercicios manuscritos con OCR, preparar dinámicas de clase y generar prompts para presentaciones con NotebookLM.

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
| Estado cliente | Zustand (auth) + React Query (server state) |
| Routing | React Router v6 |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL 15 |
| IA generativa | Anthropic Claude API (haiku + sonnet) |
| OCR | Google Vision API |
| Pagos | Stripe (checkout sessions + webhooks) |
| Logs | Winston |
| Contenedores | Docker + Docker Compose |

---

## Estructura del proyecto

```
verigood/
├── frontend/
│   ├── src/
│   │   ├── App.jsx                     # Rutas y ProtectedRoute
│   │   ├── index.css                   # Tailwind + clases custom
│   │   ├── stores/
│   │   │   └── authStore.js            # Zustand con persist
│   │   ├── services/
│   │   │   └── api.js                  # Axios + interceptor JWT
│   │   ├── components/
│   │   │   ├── ui/                     # Button, Card, Input, Modal, Badge, DemoBanner
│   │   │   └── layout/                 # Sidebar, Topbar
│   │   └── pages/
│   │       ├── auth/                   # LoginPage, RegisterPage
│   │       ├── institutional/          # Dashboard, Users, Modules, Courses,
│   │       │                           # Resources, Stats, Billing
│   │       ├── cambridge/              # CambridgeLayout, Home, ExamGenerator,
│   │       │                           # OcrCorrector, DynamicsGenerator,
│   │       │                           # PresentationGenerator, ExamsList
│   │       └── landing/                # LandingPage pública
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── nginx.conf                      # Config SPA + proxy /api
│
├── backend/
│   ├── src/
│   │   ├── index.js                    # App Express principal
│   │   ├── config/
│   │   │   ├── database.js             # pg Pool
│   │   │   └── logger.js               # Winston
│   │   ├── middleware/
│   │   │   ├── auth.js                 # authenticate, authorize, requireModule
│   │   │   └── validate.js             # express-validator formatter
│   │   ├── controllers/
│   │   │   ├── authController.js       # register, login, refresh, logout, me
│   │   │   ├── usersController.js      # CRUD usuarios
│   │   │   └── organizationsController.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── cambridge.js            # 4 agentes IA
│   │   │   ├── stripe.js
│   │   │   └── stats.js
│   │   └── services/
│   │       ├── claudeService.js        # callClaude(), parseJSON()
│   │       ├── examGeneratorService.js # Generación híbrida BD+Claude
│   │       ├── ocrCorrectorService.js  # Google Vision + corrección
│   │       ├── dynamicsService.js      # 8 tipos de dinámica
│   │       ├── presentationsService.js # NotebookLM prompt + slides
│   │       └── mockService.js          # Respuestas mock para DEMO_MODE
│   ├── migrations/
│   │   ├── 001_initial_schema.sql      # 15 tablas + ENUMs + triggers
│   │   └── run.js                      # Runner con control de versiones
│   ├── seeds/
│   │   ├── 001_modules.sql             # 4 módulos base
│   │   └── 002_demo_data.sql           # Datos y usuarios de demo
│   ├── Dockerfile                      # Producción
│   └── Dockerfile.local                # Dev con nodemon + auto-migración
│
├── docker-compose.yml                  # Producción
├── docker-compose.local.yml            # Local (postgres + backend + frontend)
├── .env.example                        # Todas las variables documentadas
├── .env.local                          # Pre-configurado para pruebas locales
├── start.bat                           # Arranque con un clic — Windows
├── start.sh                            # Arranque con un clic — Mac/Linux
└── README.md                           # Este archivo
```

---

## Módulos disponibles

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| `cambridge` | ✅ Implementado | Cambridge English A1–C2 — 4 agentes IA |
| `espanol` | 🔜 Pendiente | Lengua española |
| `matematicas` | 🔜 Pendiente | Matemáticas |
| `oposiciones` | 🔜 Pendiente | Preparación de oposiciones |

### Módulo Cambridge — 4 agentes

**Agente 1 — Generador de exámenes**
Crea exámenes estilo Cambridge completos para niveles A1–C2. Tipos de pregunta: multiple choice, open cloze, word formation, key word transformation. Genera título, instrucciones, duración, puntuación total y soluciones con explicación. Usa generación híbrida: primero busca preguntas verificadas en BD, completa con Claude cuando no hay cobertura suficiente.

**Agente 2 — Corrector OCR**
El profesor sube una foto del examen manuscrito del alumno. Google Vision extrae el texto; Claude lo corrige devolviendo: puntuación numérica, banda Cambridge, errores gramaticales con corrección, fortalezas, áreas de mejora y feedback narrativo. Cada corrección queda guardada con el historial del alumno.

**Agente 3 — Generador de dinámicas**
Genera actividades de clase completas para 8 tipos (vocabulary, speaking, reading, writing, listening, grammar, warmup, review). El output incluye: objetivos, materiales, procedimiento paso a paso con tiempos, diferenciación (apoyo + ampliación) y criterios de evaluación.

**Agente 4 — Generador de presentaciones**
Produce el prompt optimizado para NotebookLM más un esquema de diapositivas detallado. El profesor lo pega directamente en NotebookLM para generar la presentación final.

---

## Sistema de roles

```
superadmin       → Acceso total al sistema (interno VeriGood)
admin_centro     → Gestiona su colegio: usuarios, módulos, facturación
profesor         → Accede a los módulos activos de su organización
```

La autenticación usa JWT con dos tokens:
- **Access token**: 15 minutos. Se renueva automáticamente en el frontend cuando el servidor devuelve `TOKEN_EXPIRED`.
- **Refresh token**: 7 días, rotativo. Se guarda en BD y se invalida al usarse.

---

## Instalación local

### Opción A — Con Docker (recomendado)

**Requisito:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo.

**Windows:**
```
Doble clic en start.bat
```

**Mac / Linux:**
```bash
chmod +x start.sh
./start.sh
```

El script hace todo automáticamente: construye contenedores, ejecuta migraciones, carga datos de demo y abre el navegador en `http://localhost:5173`.

### Opción B — Sin Docker (solo Node.js)

**Requisitos:** Node.js 18+ y PostgreSQL 15+ instalados localmente.

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar base de datos
createdb verigood_local
psql verigood_local < backend/migrations/001_initial_schema.sql
psql verigood_local < backend/seeds/001_modules.sql
psql verigood_local < backend/seeds/002_demo_data.sql

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de base de datos

# 4. Arrancar
npm run dev
```

---

## Variables de entorno

Copia `.env.example` a `.env.local` y rellena los valores:

```env
# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/verigood

# JWT
JWT_SECRET=tu_secreto_muy_largo_aqui
JWT_REFRESH_SECRET=otro_secreto_para_refresh

# Claude API (Anthropic)
ANTHROPIC_API_KEY=sk-ant-...

# Google Vision (para OCR real)
GOOGLE_APPLICATION_CREDENTIALS=/ruta/a/service-account.json

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Modo demo (true = sin IA real, respuestas simuladas)
DEMO_MODE=true

# URLs
FRONTEND_URL=http://localhost:5173
```

Con `DEMO_MODE=true` la plataforma funciona completamente sin ninguna clave de API. Todas las respuestas de IA son simuladas con datos realistas.

---

## Base de datos

15 tablas principales con arquitectura multi-tenant:

```
organizations          → Colegio raíz (organization_id presente en toda la BD)
users                  → Profesores y admins
subscriptions          → Plan activo por organización
modules                → Catálogo de módulos disponibles
organization_modules   → Módulos activados por organización
courses                → Asignaturas / cursos
groups                 → Grupos dentro de un curso
group_professors       → Relación N:M profesores-grupos
resources              → Biblioteca de recursos compartidos
exam_questions         → Banco de preguntas verificadas
exams                  → Exámenes generados
exam_results           → Resultados de correcciones OCR
dynamics               → Dinámicas de clase generadas
presentation_prompts   → Prompts de presentación generados
usage_logs             → Registro de uso para analytics
refresh_tokens         → Tokens de refresco activos
```

Las migraciones se ejecutan de forma secuencial mediante `backend/migrations/run.js`, que mantiene una tabla `schema_migrations` para evitar re-ejecuciones.

---

## API REST

Base URL: `https://verigood.com/api` (producción) · `http://localhost:3001/api` (local)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | Iniciar sesión |
| POST | `/auth/register` | Registrar organización + admin |
| POST | `/auth/refresh` | Renovar access token |
| POST | `/auth/logout` | Cerrar sesión |
| GET | `/auth/me` | Usuario actual con suscripción |
| GET | `/organizations/:id` | Datos de la organización |
| GET | `/organizations/:id/modules` | Módulos activados |
| GET | `/users` | Lista de usuarios paginada |
| POST | `/cambridge/exams/generate` | Generar examen Cambridge |
| GET | `/cambridge/exams` | Listar exámenes guardados |
| POST | `/cambridge/correct/ocr` | Corregir examen por imagen |
| GET | `/cambridge/corrections` | Historial de correcciones |
| POST | `/cambridge/dynamics/generate` | Generar dinámica de clase |
| POST | `/cambridge/presentations/generate` | Generar prompt presentación |
| GET | `/stripe/plans` | Planes disponibles |
| POST | `/stripe/checkout` | Crear sesión de pago |
| POST | `/stripe/portal` | Portal de facturación |
| GET | `/stats/dashboard` | Estadísticas de uso |

Todos los endpoints (salvo `/auth/*` y `/stripe/plans`) requieren header `Authorization: Bearer <token>`.

---

## Dirección estética

**Concepto: Cuaderno del Catedrático**

Materialidad de aula real ejecutada con sobriedad académica. Nada infantil, nada decorativo por decorar.

**Tipografía:**
- Display: Reckless Neue (serif contemporánea, italics expresivas para módulos)
- Body: Söhne (sans neutra, presencia editorial)
- Manuscrito: Caveat — uso quirúrgico, solo anotaciones de corrección. Nunca UI funcional.
- Mono: JetBrains Mono para puntuaciones, códigos y metadatos (`A2 · KEY · 47/60`)

**Paleta:**

| Token | Hex | Uso |
|-------|-----|-----|
| Papel | `#EDE6D6` | Base de todo |
| Papel hover | `#E5DCC7` | Estados hover de fondo |
| Tinta | `#14182B` | Texto principal |
| Marino | `#1F2A4D` | Autoridad, headers |
| Granate | `#6B1F2A` | Solo correcciones y errores reales |
| Amarillo | `#E8D89A` | Solo subrayado de información relevante |
| Línea | `#B8A988` | Bordes y reglas |

El granate y el amarillo tienen peso semántico. Cuando aparecen, significan algo. Nunca usarlos como decoración.

**Gestos diferenciadores:**
- Fondo con rejilla cuadriculada 24px al 8% de opacidad (estilo cuaderno Seyès francés)
- Overlay SVG de grano de papel (`opacity: 0.04`)
- Marginalia romana al margen izquierdo: § I, § II, § III en granate apagado
- Corrección OCR animada con círculo manuscrito dibujándose en tiempo real (`stroke-dasharray`)
- Cards con esquina superior derecha doblada (`clip-path` CSS + sombra interior)
- Hover con subrayado highlighter `#E8D89A` animado de izquierda a derecha en 200ms
- Sello editorial granate ligeramente desalineado para logo y puntuaciones finales
- Todos los números en JetBrains Mono (puntuaciones, niveles, códigos)

**Prohibido:** `border-radius` > 2px · gradientes · sombras blandas (`box-shadow` difuso) · iconos Lucide genéricos · microinteracciones nerviosas · emoji.

---

## Deploy en producción

```bash
# En el VPS (Ubuntu 22.04, Madrid)

# 1. Clonar repositorio
git clone https://github.com/tu-usuario/verigood.git
cd verigood

# 2. Configurar variables
cp .env.example .env
nano .env  # Rellenar con credenciales de producción

# 3. Arrancar
docker compose up --build -d

# 4. Configurar Nginx + SSL
certbot --nginx -d verigood.com -d www.verigood.com
```

El `docker-compose.yml` de producción incluye PostgreSQL con volumen persistente, backend Node.js y frontend servido por Nginx con SSL, gzip y caché de assets estáticos.

---

## Credenciales de demo

Disponibles tras ejecutar el seed de demo con `DEMO_MODE=true`:

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin de centro | admin@verigood.com | demo1234 |
| Profesor | profesor@verigood.com | demo1234 |

---

## Roadmap

**Módulos pendientes:**
- Español / Lengua
- Matemáticas
- Oposiciones

**Funcionalidades pendientes:**
- Exportación de exámenes a PDF con formato oficial Cambridge
- Sistema de notificaciones in-app
- Panel de superadmin (gestión global de organizaciones)
- Integración completa Google Vision (actualmente mockeada en dev)
- Tests unitarios (Jest) y e2e (Playwright)
- CI/CD pipeline (GitHub Actions → deploy automático al VPS)

---

*VeriGood — Construido con Claude (Anthropic) · 2025*
