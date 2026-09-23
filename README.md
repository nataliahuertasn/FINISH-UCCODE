# Finish & UC Code — Variables (simulación funcional)

Simulación navegable de la nueva versión de **Finish & UC Code** dentro de la interfaz actual de
Project Agenda / SRP, con la nueva sección **Variables** que alimenta los campos del formulario.

Base de referencia: `CARGA EN SETTINGS FINISH & UC CODE.pdf` (pantallas reales + Observaciones).

---

## Cómo ejecutarla

Abrir `index.html` en el navegador (doble clic). No requiere Node, ni build, ni servidor:
son HTML + CSS + JavaScript plano con `<script>` clásicos.

---

## Estructura

```
index.html                     Shell: rail lateral, árbol FinishAndUCCode > Settings, tabs, footer
assets/css/app.css             Tokens y estilos (replican la pantalla actual)
assets/js/
  icons.js                     Set de iconos SVG inline (sin dependencias externas)
  mock-data.js                 *** BASE DE DATOS SIMULADA *** (secciones, variables, registros)
  api.js                       *** CAPA DE API *** — todo devuelve Promise
  store.js                     Estado en memoria + selectores + suscripciones
  ui.js                        Modal, confirmación, toast
  views/finish-list.js         Vista principal FINISH & UC CODE (tabla, filtros, NEW/IMPORT/EXPORT)
  views/finish-form.js         Modal New / Edit "Finish AND UC Code"
  views/variables.js           Vista VARIABLES FINISH & UC CODE
  app.js                       Bootstrap y tabs
```

### Regla de oro del modelo de datos

Un registro de Finish & UC Code **nunca guarda el texto** de una variable: guarda su **id**
(`supplierId`, `aamaId`, `coveringId`). De ahí salen los tres comportamientos pedidos:

| Acción sobre la variable | Efecto en los registros existentes | Efecto en el formulario |
|---|---|---|
| **Renombrar** | El nuevo nombre se refleja en todos (apuntan al mismo id) | Cambia la opción del dropdown |
| **Deshabilitar** | Conservan su valor (se marca `DISABLED` en la tabla) | Desaparece para registros nuevos; sigue seleccionable al editar un registro que ya la tenía |
| **Eliminar** | El campo queda **vacío**; el registro y sus demás campos se conservan | Desaparece de la lista |

### Conectar una API real

Sustituir el cuerpo de cada método de `assets/js/api.js` por un `fetch`. Las rutas sugeridas ya
están anotadas como comentario encima de cada método, por ejemplo:

```js
list: function () {
  return fetch('/api/finish-uc-code/variables').then(function (r) { return r.json(); });
}
```

Ningún componente lee `MockDb` directamente: las vistas consultan `Store` y escriben con `Api.*`,
luego llaman `Store.refresh()` y todo lo suscrito se vuelve a pintar. Al borrar `mock-data.js` la
aplicación sigue funcionando contra el backend real sin tocar las vistas.

---

## Flujo de demostración

1. **FINISH & UC CODE** — tabla de acabados, filtros por columna, switch `ENABLED`, editar/eliminar.
2. **+ NEW** — el formulario del PDF. `Supplier`, `AAMA` y `Covering` son **dropdowns** alimentados
   por Variables; `Name` y `Description` son texto libre; `Consecutive` se genera automáticamente.
3. **VARIABLES** — tres secciones (`Supplier`, `AAMA`, `Covering`), cada una con `+ NEW` y un lápiz.
   Los chips se ven limpios; las acciones de cada valor **sólo aparecen al pulsar el lápiz de esa
   sección** (y sólo en esa sección).
4. **+ NEW** en una sección → el valor aparece de inmediato en el dropdown del formulario.
5. **Lápiz** sobre un valor → renombrar (p. ej. `PVDF` → `PVDF 70%`); el cambio se propaga a los
   registros que lo usan.
6. **Ojo** sobre un valor → deshabilitar: deja de aparecer para registros nuevos y los antiguos
   conservan el valor, marcado como `DISABLED`.
7. **X** sobre un valor en uso → alerta de impacto con el listado de registros afectados; al
   confirmar, esos registros quedan con ese campo vacío (nada más se borra).

---

## Decisiones tomadas (y por qué)

- **AAMA también es dropdown.** Las Observaciones del PDF sólo mencionan explícitamente `Supplier`
  y `Covering`, pero `AAMA` es una de las tres secciones de la vista Variables, así que se comporta
  igual. Si debe seguir siendo texto libre, basta con sacarla de `MockDb.sections`.
- **Consecutivo.** La nota dice que es automático y que "aún no cuenta con una lógica definida...
  depende la tecnología que el usuario ingrese". Se implementó una regla **provisional**: prefijo
  según `Covering` (`Polvo→PV`, `Liquido→LQ`, `Pelicula→PL`, otro→`GN`) + correlativo. Está aislada
  en `MockDb.consecutivePrefix` para cambiarla en un solo sitio. El campo se muestra de sólo lectura
  con un enlace *Enter manually* para sobrescribirlo.
- **Pestañas.** El PDF muestra la pestaña `VARIABLES` sobre la pantalla; se añadió la pestaña
  hermana `FINISH & UC CODE` para poder volver.
- **Chips vs. tabla en Variables.** Se respetó el diseño de chips del PDF. El estado `DISABLED` se
  ve siempre; las acciones (lápiz / ojo / ×) y el contador de uso permanecen ocultos hasta pulsar
  el lápiz de la sección, para no ensuciar la lectura de los valores.
- **Cabecera y rail.** Se retiraron la barra superior *Project Agenda* y los iconos del rail que no
  intervienen en este flujo; queda el engranaje de Settings activo.
- **IMPORT / EXPORT.** Se dejaron funcionales en CSV (export de lo filtrado; import haciendo match
  de Supplier/AAMA/Covering por nombre contra Variables) para que los botones no queden muertos.
- Los datos viven en memoria: al recargar la página se vuelve al estado inicial de `mock-data.js`.
