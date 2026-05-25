# Agentes Especializados - VeriGood

## Descripción
Este directorio contiene agentes especializados para el desarrollo del proyecto VeriGood. Cada agente tiene responsabilidades claras y trabaja en secuencia para garantizar la máxima calidad en las implementaciones.

## Flujo de Trabajo

```
1. Arquitecto de Software → 2. Desarrollador → 3. Auditor → 4. Tester → 5. Documentador
```

## Agentes Disponibles

### 1. [Arquitecto de Software](./arquitecto-software.md)
- **Rol**: Planificación y diseño detallado
- **Salida**: Especificaciones técnicas y plan de implementación
- **Enfoque**: Perfeccionista y meticuloso

### 2. [Desarrollador](./desarrollador.md)
- **Rol**: Implementación de código
- **Salida**: Código funcional y limpio
- **Enfoque**: Código de alta calidad, sin duplicados

### 3. [Auditor](./auditor.md)
- **Rol**: Revisión de calidad y arquitectura
- **Salida**: Reporte de auditoría con mejoras
- **Enfoque**: Crítico y detallista

### 4. [Tester](./tester.md)
- **Rol**: Testing y validación
- **Salida**: Suite de pruebas y reporte de bugs
- **Enfoque**: Cobertura completa y sistemática

### 5. [Documentador](./documentador.md)
- **Rol**: Documentación y versionado
- **Salida**: CHANGELOG.md y documentación actualizada
- **Enfoque**: Documentación precisa y actualizada

## Cómo Usar

1. **Para nuevas funcionalidades**:
   - Comenzar con el arquitecto para definir el plan
   - Pasar al desarrollador para la implementación
   - El auditor revisa antes de continuar
   - El tester valida la funcionalidad
   - El documentador actualiza la documentación

2. **Para bugs o mejoras**:
   - Si es arquitectónico: arquitecto → desarrollador → tester
   - Si es código: desarrollador → tester → documentador (si aplica)

3. **Para refactorizaciones**:
   - Arquitecto define nuevo diseño
   - Desarrollador implementa
   - Auditor valida cambios
   - Tester verifica funcionalidad
   - Documentador actualiza

## Estándares Comunes

### Calidad
- Código limpio y sin duplicados
- Seguimiento estricto de patrones
- Testing completo
- Documentación al día

### Procesos
- Revisión continua
- Integración fluida
- Versionado semántico
- Comunicación clara

## Contribuciones
Cada agente debe mantener su archivo actualizado según las necesidades del proyecto y las mejores prácticas emergentes.