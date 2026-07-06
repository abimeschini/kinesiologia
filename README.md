# Mi plan de estudios — Licenciatura en Kinesiología

Aplicación web simple (HTML + CSS + JS, sin frameworks ni build) para hacer
seguimiento de las materias cursadas y ver qué materias tenés habilitadas
por correlativas.

## Funcionalidad

- **Toggle "Habilitadas" / "Notas cargadas"** arriba a la derecha:
  - **Habilitadas**: solo las materias en las que ya cumplís todas las
    correlativas, más la sección "Próximas a habilitarse" (ordenadas por
    cuántas correlativas te faltan).
  - **Notas cargadas**: todas las materias **aprobadas** y todos los
    **finales desaprobados**, con la posibilidad de editar/corregir
    cualquiera de esas notas.
- Las 3 tarjetas de arriba (promedio, materias aprobadas, % del plan
  completado) se muestran siempre, en ambas vistas.
- **Carga de notas**: entero entre 1 y 10.
  - Nota **≥ 4** → aprueba la materia (habilita sus correlativas).
  - Nota **< 4** → se guarda como un intento de final desaprobado: no
    aprueba la materia y no se pierde si más adelante aprobás con otra
    nota, pero sí suma al promedio general.
  - Ambos tipos de nota se pueden **editar** después, tanto desde "Notas
    cargadas" como desde "Plan completo".
- **Botón "Habilitada" / "En curso"** en cada materia habilitada: por
  defecto dice "Habilitada"; si lo tocás, la tarjeta se pinta del color
  principal (violeta) con texto blanco y el botón pasa a decir "En curso".
  Es solo una marca visual para vos, no afecta correlativas ni promedio.
- **Plan completo**: vista opcional con todas las materias agrupadas (acá,
  por duración: Cuatrimestral / Anual, ya que el Excel no traía una columna
  de área/trayecto), con su estado (aprobada / en curso / habilitada /
  bloqueada) y detalle de qué correlativas faltan.
- Las notas se guardan en el `localStorage` del navegador, así que persisten
  entre visitas **en el mismo navegador y dispositivo**. No hay backend ni
  base de datos. Hay un botón para borrarlas manualmente.

## Estructura de archivos

```
index.html    # estructura de la página
style.css     # estilos (blanco + violeta #A47DAB como color principal)
app.js        # lógica: correlativas, promedio, localStorage
data.js       # datos del plan de estudios (materias, correlativas, duración)
```

## Actualizar el plan de estudios

Editá el arreglo `MATERIAS` en `data.js`. Cada materia tiene:

```js
{
  codigo: 1636,
  nombre: "FISIOLOGIA",
  correlativas: [1627, 1628, 1629, 1634], // todos deben estar aprobados (nota >= 4)
  trayecto: "Anual"                        // usado solo para agrupar en "Plan completo"
}
```

## Cómo publicarlo en GitHub Pages

1. Creá un repositorio nuevo en GitHub y subí estos 4 archivos (`index.html`,
   `style.css`, `app.js`, `data.js`) a la raíz.
2. En el repositorio, andá a **Settings → Pages**.
3. En "Source", elegí **Deploy from a branch**, rama `main` (o `master`) y
   carpeta `/ (root)`. Guardá.
   - Si no ves esa opción habilitada, revisá que el repositorio sea
     **público** (los repos privados necesitan un plan pago de GitHub para
     usar Pages).
4. En un par de minutos la página va a estar disponible en
   `https://<tu-usuario>.github.io/<nombre-repo>/`.

También podés simplemente abrir `index.html` con doble clic para probarlo
localmente, sin necesidad de un servidor.
