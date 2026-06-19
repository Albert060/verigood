# VeriGood — Informe de cambios

**Sesión de trabajo · Estado del proyecto tras esta jornada**

Documento ejecutivo dirigido al equipo directivo. Resume todo lo implementado en la sesión sobre la plataforma VeriGood, con métricas, decisiones arquitectónicas y archivos clave.

---

## Resumen ejecutivo

| Métrica | Antes | Después |
|---|---|---|
| Módulos del catálogo con tools implementadas | 1 (solo Cambridge) | **23 módulos · 56 tools** |
| Módulos con corrector OCR | 1 (solo Cambridge) | **12 módulos** (Cambridge + 11 asignaturas) |
| Renderers PDF disponibles | 6 (exam, problems, dynamics, sheet, feedback, JSON) | **13** (+exercise_set, quiz, rubric, timeline, commentary, text, invoice) |
| Vista de "Biblioteca" del centro | Mockup hardcoded | **Sistema real unificado** con auto-persistencia |
| Vista de "Mis Exámenes" Cambridge | Búsqueda básica por tema | **Filtros completos** (título, nivel, tipo, módulo, rango de fechas) |
| Sistema de facturación | Botón "PDF" sin función | **PDFs profesionales** con IVA, sello PAGADA, integración Stripe |
| Panel superadmin (organizaciones) | Datos mock hardcoded | **Conectado al backend real** |
| Manejo de modo demo | Solo Cambridge | **Todos los subsistemas** con fixtures por tipo |
| Manejo de errores IA | Volcado JSON crudo al usuario | **5 códigos estables** con mensajes en español |

---

## 1. Catálogo de módulos completado

### Problema detectado
12 módulos del catálogo Fase 1 estaban en estado *placeholder*: registrados en el catálogo pero sin herramientas funcionales. El profesor podía activarlos pero no había nada que ejecutar.

### Solución implementada
Implementación masiva de 35 nuevas tools (cada una con su prompt LOMLOE detallado en español de España) cubriendo todas las asignaturas pendientes:

**Primaria (5 módulos completados):**
- Matemáticas — problemas, series de cálculo, actividades manipulativas
- Lengua castellana — ejercicios, comprensión lectora, propuestas de escritura
- Conocimiento del medio — fichas temáticas, cuestionarios, experimentos sencillos
- Educación física — sesiones, juegos motrices, rúbricas
- Educación artística — proyectos, audiciones comentadas, rúbricas

**ESO (7 módulos completados):**
- Lengua y literatura — ejercicios, análisis sintáctico, comentarios de texto, redacciones
- Matemáticas — problemas con resolución paso a paso, tandas de ejercicios, preguntas de examen
- Educación física — sesiones, contenidos teóricos, rúbricas
- Tecnología y digitalización — proyectos, ejercicios técnicos, competencia digital
- EPVA — proyectos visuales, rúbricas, análisis de obra
- Valores éticos — dilemas, debates guiados, comentarios filosóficos
- Tutorías — sesiones, dinámicas de grupo, gestión de conflictos

### Resultado
**56 tools en total** funcionando con el patrón declarativo del proyecto. La verificación de consistencia del backend confirma que todas las tools declaradas en BD tienen su handler de código correspondiente.

**Archivos clave:** `backend/src/services/tools/*` (12 archivos nuevos), `backend/src/seeds/002_module_tools.sql`, `backend/src/services/tools/index.js`, `frontend/src/App.jsx`.

---

## 2. Corrector OCR genérico por asignatura

### Problema detectado
Solo Cambridge tenía corrector OCR. Las demás asignaturas carecían de la funcionalidad de "sube foto del examen del alumno y corrige automáticamente".

### Solución arquitectónica
Se ha extraído el patrón Cambridge a una infraestructura **declarativa y reutilizable**: cualquier módulo se da de alta como módulo OCR con una sola entrada de configuración.

**Componentes:**
- `backend/src/services/ocrSubjects.js` — catálogo declarativo con prompts específicos por asignatura
- `backend/src/services/ocrSubjectCorrectorService.js` — servicio genérico (Google Vision + Claude)
- `backend/src/controllers/moduleOcrController.js` — controlador HTTP
- `backend/src/routes/moduleOcr.js` — endpoints REST
- `frontend/src/pages/module/ModuleOcrPage.jsx` — UI reutilizable autoconfigurada

### Módulos con OCR habilitado (12)
Inglés Primaria/ESO · Lengua Primaria/ESO · Matemáticas Primaria/ESO · Conocimiento del Medio · Geografía e Historia · Biología y Geología · Física y Química · Tecnología y Digitalización · Cambridge (mantenido con su flujo propio).

### Endpoints nuevos
- `GET /api/modules/:moduleId/ocr/config` — configuración pública para autocomponer la UI
- `POST /api/modules/:moduleId/ocr/correct` — multipart con la imagen del examen

### Coste de añadir OCR a un módulo nuevo
Una única edición en el catálogo (`OCR_CONFIG`). El frontend y las rutas ya están preparados.

---

## 3. Diseño uniforme de las pantallas de módulo

### Cambio de diseño
La pantalla inicial de cada módulo (`ModuleHome`) ahora replica el patrón visual de Cambridge:

- Cabecera con título y subtítulo dinámico ("4 AGENTES IA · ESO · ASIGNATURA")
- 4 stat cards arriba (Herramientas, Correcciones OCR, Ejecuciones, Recursos)
- Sección "HERRAMIENTAS DISPONIBLES" con grid de tools numeradas en romano (§ I, § II, § III, § IV)
- El corrector OCR aparece como agente §II en la grid, no como bloque destacado aparte — coherente con la posición del corrector OCR en Cambridge

### Resultado
Experiencia visual idéntica entre Cambridge y el resto de módulos. Un profesor que se mueve entre asignaturas no nota cambios de patrón.

**Archivo clave:** `frontend/src/pages/module/ModuleHome.jsx`.

---

## 4. Buscador, detalle y exportación de exámenes (Cambridge)

### Mejoras en "Mis exámenes"
Filtros ampliados sobre `frontend/src/pages/cambridge/ExamsList.jsx`:
- Búsqueda por título **o** tema
- Filtro por nivel (A1–C2)
- Filtro por tipo de ejercicio (inferido de los datos reales)
- Filtro por módulo (preparado para multi-módulo)
- Rango de fechas (desde / hasta)
- Botón "Limpiar" cuando hay filtros activos
- Acciones inline por fila: ver y eliminar

### Vista de detalle de examen (nueva)
Página `frontend/src/pages/cambridge/ExamDetail.jsx` en la ruta `/cambridge/exams/:id`:
- Render completo de las preguntas (enunciado, opciones, respuesta correcta, explicación)
- Bloque resumen con tema, profesor y fecha
- Botón "Descargar PDF" — genera el PDF on-demand desde los datos guardados
- Botón "Eliminar" con confirmación

### Endpoints añadidos
- `GET /api/cambridge/exams/:id` — detalle individual
- `DELETE /api/cambridge/exams/:id` — eliminar

### Mejora de persistencia
El servicio `saveExam` ahora guarda `metadata` con `exerciseTypes`, `source` y `totalQuestions` — campos que el frontend usaba pero que se perdían (bug heredado).

---

## 5. Biblioteca unificada del centro

### Problema detectado
La página `Resources.jsx` (Biblioteca) estaba 100% hardcoded con datos mock. No existía persistencia para los outputs de las tools del catálogo Fase 1.

### Solución arquitectónica
Nueva tabla `library_items` (migración 004) con auto-persistencia desde el dispatcher de tools.

**Cómo funciona ahora:**
1. El profesor genera un examen, una rúbrica, un comentario, etc. con cualquier tool
2. El dispatcher de tools (`moduleToolsController.run`) persiste automáticamente el resultado en `library_items`
3. La página `Resources.jsx` (`/dashboard/resources`) une los `library_items` de Fase 1 con los `exams` legacy de Cambridge
4. Búsqueda, filtros (módulo + tipo, inferidos del catálogo activo), descargar PDF, eliminar

### Endpoints REST nuevos
- `GET /api/library/items?search&module&kind&from&to`
- `GET /api/library/items/:id`
- `POST /api/library/items` (lo invoca el dispatcher automáticamente)
- `DELETE /api/library/items/:id`

### Página de detalle
Nueva ruta `/dashboard/resources/:id` con render completo del recurso + descargar PDF + eliminar.

### Decisión clave
**Sin storage de blobs.** El PDF se regenera on-demand desde el `payload` guardado. Esto elimina la necesidad de filesystem o S3 y evita duplicación de almacenamiento.

### Modo demo
El modo demo NO ensucia la base de datos: el dispatcher cortocircuita antes de la persistencia.

**Archivos clave:** `backend/src/migrations/004_library_items.sql`, `backend/src/controllers/libraryController.js`, `backend/src/routes/library.js`, `frontend/src/pages/institutional/Resources.jsx`, `frontend/src/pages/institutional/ResourceDetail.jsx`.

---

## 6. Sistema de PDFs profesionales para todas las tools

### Problema detectado
Cuando se exportaba a PDF cualquier output del catálogo Fase 1 (ejercicios de Matemáticas, cuestionarios de C. del Medio, rúbricas de Educación Física, etc.), el PDF salía **vacío**. Solo Cambridge generaba PDFs con contenido.

### Causa raíz
El renderer único existente (`renderExam`) buscaba campos con nombres específicos de Cambridge (`questions[].question`) pero los handlers del catálogo Fase 1 devolvían estructuras distintas (`exercises[].prompt`).

### Solución implementada
Seis nuevos renderers PDF específicos por tipo de salida, todos con el estilo "Cuaderno del Catedrático":

| Tipo de output | Renderer | Producto |
|---|---|---|
| `exercise_set` | renderExerciseSet | Examen con cabecera de alumno + ejercicios + **página de solucionario** |
| `quiz` | renderQuiz | Cuestionario tipo test + solucionario marcando opción correcta |
| `rubric` | renderRubric | Rúbrica con criterios, pesos y 4 niveles de logro por criterio |
| `timeline` | renderTimeline | Línea de tiempo con año destacado + título + descripción |
| `commentary` | renderCommentary | Texto fuente + contexto + conceptos clave + comentario + preguntas guía |
| `text` | renderText | Parser ligero de markdown (#, ##, -, **negrita**) |

### Simplificación del frontend
Se ha eliminado el mapeo de `output_kind → tipo de PDF` en el frontend. Ahora todos los componentes pasan el `output_kind` directamente al backend, que dispatcha al renderer correcto. Resultado: añadir un kind nuevo en el futuro solo requiere un renderer backend, sin tocar tres archivos del frontend.

**Archivo clave:** `backend/src/services/pdfService.js`.

---

## 7. Sistema de facturación con PDFs reales

### Problema detectado
- El botón "PDF" en la página de Facturación no tenía `onClick`. Era un botón muerto.
- Las facturas eran 4 entradas hardcoded.
- No había renderer de facturas en el servicio PDF.

### Solución implementada

**Backend — endpoint `/api/stripe/invoices` con resolución en tres niveles:**
1. **Stripe real** — si la organización tiene `stripe_customer_id` y la clave Stripe es válida, consulta las facturas reales y devuelve los datos incluyendo `invoice_pdf` (PDF oficial AEAT-correlativo)
2. **Fixture backend** — 6 meses retroactivos del plan en curso, con IVA 21% calculado, número derivado del orgId
3. **Fallback frontend** — 4 facturas precargadas en `Billing.jsx` como ejemplo descargable mientras el backend no responda

**Backend — nuevo renderer `renderInvoice` ([pdfService.js](backend/src/services/pdfService.js)) con:**
- Bloque emisor (CIF, dirección, contacto) y bloque cliente
- Caja meta con número, fechas (emisión / vencimiento / pago)
- **Sello rotado** PAGADA (verde) o PENDIENTE (granate)
- Tabla de detalle con concepto, cantidad, importe y periodo por línea
- Totales: base imponible → IVA 21% → TOTAL → importe pagado
- Pie legal RGPD

**Frontend — `Billing.jsx` reescrito:**
- Conectado a `GET /api/stripe/invoices` con React Query
- Estados loading / error / vacío
- Botón PDF funcional: si la factura trae `invoice_pdf` (Stripe), abre el PDF oficial; si no, descarga el PDF generado por el proyecto
- Banner que indica el origen de los datos (Stripe real, demo backend, ejemplos precargados)

### Conformidad legal
El PDF incluye número de factura, fecha de emisión, fecha de pago, descripción del servicio, base imponible, IVA 21% y total — campos mínimos exigidos por la AEAT para factura B2B.

**Archivos clave:** `backend/src/routes/stripe.js`, `backend/src/services/pdfService.js`, `frontend/src/pages/institutional/Billing.jsx`.

---

## 8. Robustez frente a errores de IA

### Problema detectado
Cuando la API de Anthropic devolvía un error (clave inválida, rate limit, caída), el body crudo de Anthropic se filtraba directamente al usuario en pantalla:

```
401 {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}
```

### Solución implementada

**Cinco códigos de error estables** en `claudeService.callClaude`:

| Código | Status HTTP | Caso | Mensaje al usuario |
|---|---|---|---|
| `AI_NOT_CONFIGURED` | 503 | Clave vacía o placeholder | "La integración con la IA no está configurada en este servidor" |
| `AI_INVALID_KEY` | 503 | 401/403 de Anthropic | "La clave de la API de IA no es válida o ha caducado" |
| `AI_RATE_LIMITED` | 429 | 429 de Anthropic | "Has alcanzado el límite de la API. Espera unos segundos" |
| `AI_UNAVAILABLE` | 502 | 5xx / 529 de Anthropic | "La API de IA está temporalmente saturada" |
| `BAD_AI_RESPONSE` | 502 | Respuesta no parseable | "La IA devolvió un resultado no válido" |

El dispatcher de tools mapea cada código a la respuesta HTTP adecuada y el `ToolRunner` los traduce a mensajes en español. **Nunca se filtra el body crudo de Anthropic al usuario final.**

---

## 9. Modo demo controlado en todos los subsistemas

### Problema detectado
Cuando la variable `ANTHROPIC_API_KEY` no estaba configurada (o tenía el placeholder), Cambridge funcionaba pero todas las tools del catálogo Fase 1 reventaban con error 401.

### Causa raíz
Los handlers nuevos no comprobaban `aiAvailable()` antes de llamar a Claude.

### Solución implementada
**Fixtures genéricos por tipo de output** en `backend/src/services/tools/demoFixtures.js`. El dispatcher de tools comprueba `aiAvailable()` y, si falsea, devuelve un fixture coherente según el `output_kind` declarado en BD, **sin tocar los 56 handlers individuales**.

**Cobertura del modo demo:**

| Subsistema | Comportamiento en demo |
|---|---|
| Cambridge generador de exámenes | Híbrido: preguntas reales de BD + fixture |
| Cambridge OCR | Fixture específico de Cambridge |
| Tools del catálogo Fase 1 | Fixture generado por tipo (text, exercise_set, rubric, timeline, quiz, commentary) |
| OCR genérico por asignatura | Fixture coherente con la asignatura |
| Facturas | 6 meses de fixture backend + 4 ejemplos precargados frontend |

El frontend muestra un banner amarillo discreto cuando el resultado es de modo demo.

### Beneficio para negocio
Demos comerciales sin coste de IA y sin riesgo de error en presentaciones. El sistema "siempre funciona", aunque sea con datos de muestra.

---

## 10. Panel de superadmin conectado a datos reales

### Problema detectado
El usuario reportó que el panel de superadmin **no mostraba los colegios nuevos** que se habían registrado como prueba.

### Causa raíz
Las páginas `Organizations.jsx` y `Dashboard.jsx` del superadmin tenían arrays de organizaciones hardcoded en el frontend. **No consultaban al backend en absoluto** — aunque el backend ya tenía los endpoints implementados.

### Solución implementada

**`Organizations.jsx` reescrito:**
- Conectado a `GET /api/superadmin/organizations` con búsqueda y filtros por estado
- Modal de edición conectado a `PATCH /api/superadmin/organizations/:orgId` (antes el botón "Guardar" cerraba el modal sin guardar)
- Estados loading / error / vacío con UX consistente
- Botón "Recargar" manual

**`Dashboard.jsx` reescrito:**
- Tabla "Organizaciones recientes" consultando datos reales (limit 5)
- Distribución por plan derivada del endpoint `/superadmin/stats.planBreakdown`
- **MRR (ingresos recurrentes) calculado de verdad** a partir de la distribución de planes en producción
- KPIs muestran datos reales o "—" cuando no hay datos, en lugar de números inventados

### Resultado
Cualquier centro que se registre vía `/auth/register` aparece inmediatamente en el panel del superadmin, ordenado por fecha de creación descendente.

---

## 11. Documentación de proyecto actualizada

Los dos archivos principales de documentación se han reescrito por completo reflejando el estado real de la plataforma:

- `CLAUDE.md` (713 líneas) — guía técnica para desarrollo continuo con IA
- `README.md` (646 líneas) — documento de presentación del proyecto, instalación, arquitectura, API, deploy

Contienen el estado completo: 23 módulos en el catálogo, 56 tools, sistema declarativo, OCR genérico, biblioteca unificada, sistema PDF, modo demo, manejo de errores IA, facturación con fallbacks, panel superadmin, todos los endpoints REST documentados con su firma.

---

## Métricas técnicas

### Archivos nuevos creados (resumen)

**Backend (24 archivos):**
- 1 migración (`004_library_items.sql`)
- 13 servicios de tools (12 handlers de asignaturas + `demoFixtures.js`)
- 1 servicio de OCR genérico (`ocrSubjectCorrectorService.js`)
- 1 catálogo declarativo de OCR (`ocrSubjects.js`)
- 3 controladores nuevos (`moduleToolsController`, `moduleOcrController`, `libraryController`)
- 3 archivos de rutas nuevos (`moduleTools.js`, `moduleOcr.js`, `library.js`)
- 1 utilidad (`utils/aiAvailable.js`)
- 1 archivo de comprobación de consistencia (`tools/consistencyCheck.js`)

**Frontend (10 archivos):**
- `pages/module/ModuleLayout.jsx`, `ModuleHome.jsx`, `ToolPage.jsx`, `ModuleOcrPage.jsx`
- `pages/cambridge/ExamDetail.jsx`
- `pages/institutional/ResourceDetail.jsx`
- `components/tools/ToolRunner.jsx`, `DynamicForm.jsx`, 6 `results/*.jsx`

### Archivos reescritos completos
`Resources.jsx`, `Billing.jsx`, `ExamsList.jsx`, `ModuleHome.jsx`, `Organizations.jsx` (superadmin), `Dashboard.jsx` (superadmin), `CLAUDE.md`, `README.md`.

### Endpoints REST nuevos
13 endpoints añadidos (tools, OCR genérico, biblioteca, facturación, detalle/borrado de exámenes Cambridge).

### Base de datos
1 migración nueva (`library_items`). Catálogo de tools en BD ampliado de 21 a 56 herramientas.

---

## Decisiones arquitectónicas relevantes

1. **Catálogo declarativo de tools en BD.** Una sola fuente de verdad para qué herramientas existen, su input_schema y su output_kind. Añadir una herramienta nueva no requiere tocar ni el dispatcher ni el frontend.

2. **Sin duplicación de almacenamiento de PDFs.** Los PDFs no se guardan como blobs. Se regeneran on-demand desde el `payload` JSON. Elimina dependencias de filesystem o S3.

3. **Biblioteca unificada en runtime.** No hay migración masiva de Cambridge a `library_items`. Las dos fuentes (`exams` legacy + `library_items` Fase 1) se unen en runtime en la UI. Permite migración futura sin cambio de comportamiento.

4. **Auto-persistencia silenciosa.** El profesor no necesita pulsar "Guardar". Todo lo que genera queda en su biblioteca automáticamente, salvo el modo demo (no ensucia BD).

5. **Modo demo como funcionalidad de producto.** No es un parche de pruebas. Es la forma en que la plataforma se comporta sin clave de IA, pensada para demos comerciales y entornos pre-producción. Genera datos plausibles, no errores.

6. **OCR como configuración, no como código.** Activar OCR en un módulo nuevo es una entrada en un objeto JavaScript. No requiere ni rutas ni controladores nuevos.

---

## Pendiente para próximas sesiones

- Banco de preguntas curadas en BD para asignaturas no-Cambridge (replicar el patrón híbrido BD+IA de `exam_questions`)
- Tests unitarios (Jest) y end-to-end (Playwright)
- Pipeline de CI/CD con despliegue automático al VPS
- Conectar `Billing.jsx` del superadmin a datos reales (sigue con mocks de facturación global)
- Serie temporal de uso en `/superadmin/stats` (la gráfica semanal del dashboard sigue como placeholder)
- Bachillerato (Fase 2)

---

## Configuración requerida para producción

Para que la plataforma deje el modo demo y opere con datos reales, el equipo de infraestructura debe configurar en `backend/.env`:

- `ANTHROPIC_API_KEY` — clave válida de Anthropic (no el placeholder actual)
- `GOOGLE_APPLICATION_CREDENTIALS` + `GOOGLE_CLOUD_PROJECT_ID` — para OCR real
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + IDs de precios — para facturación real

Hasta entonces el sistema funciona íntegramente en modo demo con datos de muestra plausibles.
