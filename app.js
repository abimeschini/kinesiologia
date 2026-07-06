// ==========================================================================
// Mi plan de estudios — lógica de la aplicación
// ==========================================================================
//
// Reglas de negocio:
//   - Nota final: entero entre 1 y 10.
//   - Nota >= 4  -> la materia queda APROBADA con esa nota (habilita
//                   correlativas).
//   - Nota < 4   -> se registra como un INTENTO DE FINAL DESAPROBADO. No
//                   aprueba la materia y no pisa una nota aprobatoria que
//                   ya exista, pero SÍ suma al promedio general.
//   - Promedio general = (suma de notas aprobatorias + suma de intentos
//     desaprobados) / (cantidad total de esos valores cargados).
//   - "Materias aprobadas" y "% del plan completado" cuentan solo materias
//     con una nota aprobatoria (>= 4) cargada.
//   - "En curso" es una marca visual/personal (no afecta correlativas ni
//     promedio) para señalar qué materias habilitadas estás cursando.
//   - Tanto en "Materias aprobadas" como en "Finales desaprobados" y en el
//     "Plan completo" se puede editar/corregir una nota ya cargada.

const STORAGE_KEY = "plan-estudios-notas-kinesiologia-v2";
const STORAGE_KEY_LEGACY = "plan-estudios-notas-kinesiologia-v1";

// ---------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------
// notas = {
//   aprobadas: { [codigo]: number },      // nota final aprobatoria (>=4)
//   intentos:  { [codigo]: number[] },    // intentos desaprobados (<4)
//   enCurso:   { [codigo]: true }         // marca visual "En curso"
// }

let notas = cargarNotas();
let vistaActual = "habilitadas"; // "habilitadas" | "notas"
let planCompletoVisible = false;

function estadoVacio() {
  return { aprobadas: {}, intentos: {}, enCurso: {} };
}

function cargarNotas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        aprobadas: parsed.aprobadas || {},
        intentos: parsed.intentos || {},
        enCurso: parsed.enCurso || {},
      };
    }
  } catch (e) {
    console.error("No se pudieron leer las notas guardadas:", e);
  }

  // Migración desde el formato viejo (v1: { [codigo]: number })
  try {
    const rawLegacy = localStorage.getItem(STORAGE_KEY_LEGACY);
    if (rawLegacy) {
      const legacy = JSON.parse(rawLegacy);
      const migrado = estadoVacio();
      Object.keys(legacy).forEach((codigo) => {
        const nota = legacy[codigo];
        if (typeof nota === "number") {
          if (nota >= 4) {
            migrado.aprobadas[codigo] = nota;
          } else {
            migrado.intentos[codigo] = [nota];
          }
        }
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrado));
      localStorage.removeItem(STORAGE_KEY_LEGACY);
      return migrado;
    }
  } catch (e) {
    console.error("No se pudo migrar el formato anterior de notas:", e);
  }

  return estadoVacio();
}

function guardarNotas() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notas));
  } catch (e) {
    console.error("No se pudieron guardar las notas:", e);
  }
}

// ---------------------------------------------------------------------
// Registrar / editar notas
// ---------------------------------------------------------------------

// Carga una nota nueva (desde "Habilitadas" o desde "Plan completo").
function registrarNota(codigo, nota) {
  if (nota >= 4) {
    notas.aprobadas[codigo] = nota;
  } else {
    if (!notas.intentos[codigo]) notas.intentos[codigo] = [];
    notas.intentos[codigo].push(nota);
  }
  guardarNotas();
  renderTodo();
}

// Corrige la nota aprobatoria de una materia ya aprobada.
// Si la corrección baja de 4, esa materia deja de estar aprobada y la
// nota pasa a sumarse como un intento desaprobado.
function editarAprobada(codigo, nuevaNota) {
  if (nuevaNota >= 4) {
    notas.aprobadas[codigo] = nuevaNota;
  } else {
    delete notas.aprobadas[codigo];
    if (!notas.intentos[codigo]) notas.intentos[codigo] = [];
    notas.intentos[codigo].push(nuevaNota);
  }
  guardarNotas();
  renderTodo();
}

// Corrige un intento desaprobado puntual (por índice dentro del arreglo).
// Si la corrección sube a 4 o más, ese intento se elimina de la lista y
// la materia pasa a estar aprobada con esa nota.
function editarIntento(codigo, indice, nuevaNota) {
  if (nuevaNota >= 4) {
    notas.intentos[codigo].splice(indice, 1);
    if (notas.intentos[codigo].length === 0) delete notas.intentos[codigo];
    notas.aprobadas[codigo] = nuevaNota;
  } else {
    notas.intentos[codigo][indice] = nuevaNota;
  }
  guardarNotas();
  renderTodo();
}

function validarNota(valorCrudo) {
  const val = String(valorCrudo).trim();
  if (val === "") return { error: "Ingresá una nota." };
  const num = Number(val);
  if (!Number.isInteger(num) || num < 1 || num > 10) {
    return { error: "La nota debe ser un número entero entre 1 y 10." };
  }
  return { num };
}

// ---------------------------------------------------------------------
// Helpers de datos
// ---------------------------------------------------------------------

function estaAprobada(codigo) {
  return notas.aprobadas[codigo] !== undefined;
}

function estaEnCurso(codigo) {
  return !!notas.enCurso[codigo];
}

function toggleEnCurso(codigo) {
  notas.enCurso[codigo] = !notas.enCurso[codigo];
  guardarNotas();
  renderTodo();
}

function correlativasFaltantes(materia) {
  return materia.correlativas.filter((cod) => !estaAprobada(cod));
}

function estaHabilitada(materia) {
  if (estaAprobada(materia.codigo)) return false;
  return correlativasFaltantes(materia).length === 0;
}

function nombrePorCodigo(codigo) {
  const m = MATERIAS.find((x) => x.codigo === codigo);
  return m ? m.nombre : `Código ${codigo}`;
}

// ---------------------------------------------------------------------
// Cálculo de estadísticas
// ---------------------------------------------------------------------

function calcularStats() {
  const notasAprobatorias = Object.values(notas.aprobadas);
  const notasIntentos = Object.values(notas.intentos).flat();
  const todasLasNotas = [...notasAprobatorias, ...notasIntentos];

  const promedio =
    todasLasNotas.length > 0
      ? todasLasNotas.reduce((acc, n) => acc + n, 0) / todasLasNotas.length
      : null;

  const aprobadas = Object.keys(notas.aprobadas).length;
  const total = MATERIAS.length;
  const porcentaje = total > 0 ? (aprobadas / total) * 100 : 0;

  return { promedio, aprobadas, total, porcentaje };
}

function renderStats() {
  const { promedio, aprobadas, total, porcentaje } = calcularStats();
  document.getElementById("stat-promedio").textContent =
    promedio === null ? "–" : promedio.toFixed(2);
  document.getElementById("stat-aprobadas").textContent = `${aprobadas} / ${total}`;
  document.getElementById("stat-porcentaje").textContent = `${Math.round(porcentaje)}%`;
}

// ---------------------------------------------------------------------
// Render: vista "Habilitadas"
// ---------------------------------------------------------------------

function renderHabilitadas() {
  const grid = document.getElementById("habilitadas-grid");
  const emptyMsg = document.getElementById("habilitadas-empty");
  grid.innerHTML = "";

  const habilitadas = MATERIAS.filter(estaHabilitada);

  if (habilitadas.length === 0) {
    emptyMsg.hidden = false;
    return;
  }
  emptyMsg.hidden = true;

  habilitadas.forEach((materia) => {
    grid.appendChild(crearTarjetaHabilitada(materia));
  });
}

function crearTarjetaHabilitada(materia) {
  const enCurso = estaEnCurso(materia.codigo);

  const card = document.createElement("div");
  card.className = "materia-card" + (enCurso ? " en-curso" : "");

  card.innerHTML = `
    <p class="trayecto">${escapeHtml(materia.trayecto)}</p>
    <p class="nombre">${escapeHtml(materia.nombre)} <span class="codigo">(${materia.codigo})</span></p>
    <button type="button" class="estado-toggle-btn">${enCurso ? "En curso" : "Habilitada"}</button>
    <div class="nota-form">
      <input type="number" min="1" max="10" step="1" placeholder="1-10" />
      <button type="button">Guardar</button>
    </div>
    <p class="nota-error"></p>
  `;

  card.querySelector(".estado-toggle-btn").addEventListener("click", () => {
    toggleEnCurso(materia.codigo);
  });

  const input = card.querySelector(".nota-form input");
  const boton = card.querySelector(".nota-form button");
  const error = card.querySelector(".nota-error");

  const guardar = () => {
    const resultado = validarNota(input.value);
    if (resultado.error) {
      error.textContent = resultado.error;
      return;
    }
    registrarNota(materia.codigo, resultado.num);
  };

  boton.addEventListener("click", guardar);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") guardar();
  });

  return card;
}

function renderProximas() {
  const list = document.getElementById("proximas-list");
  const emptyMsg = document.getElementById("proximas-empty");
  list.innerHTML = "";

  const proximas = MATERIAS
    .filter((m) => !estaAprobada(m.codigo) && !estaHabilitada(m))
    .map((m) => ({ materia: m, faltantes: correlativasFaltantes(m) }))
    .sort((a, b) => a.faltantes.length - b.faltantes.length);

  if (proximas.length === 0) {
    emptyMsg.hidden = false;
    return;
  }
  emptyMsg.hidden = true;

  proximas.forEach(({ materia, faltantes }) => {
    const item = document.createElement("div");
    item.className = "proxima-item";
    const nombresFaltantes = faltantes.map(nombrePorCodigo).join(", ");
    item.innerHTML = `
      <div>
        <p class="nombre">${escapeHtml(materia.nombre)}</p>
        <p class="faltantes">Faltan aprobar: ${escapeHtml(nombresFaltantes)}</p>
      </div>
      <span class="proxima-badge">${faltantes.length} materia${faltantes.length === 1 ? "" : "s"}</span>
    `;
    list.appendChild(item);
  });
}

// ---------------------------------------------------------------------
// Render: vista "Notas cargadas"
// ---------------------------------------------------------------------

function crearFormularioEdicion(valorActual, onGuardar) {
  const wrap = document.createElement("div");
  wrap.className = "item-nota";
  wrap.innerHTML = `
    <input type="number" min="1" max="10" step="1" value="${valorActual}" />
    <button type="button">Guardar</button>
  `;
  const input = wrap.querySelector("input");
  const boton = wrap.querySelector("button");
  boton.addEventListener("click", () => {
    const resultado = validarNota(input.value);
    if (resultado.error) {
      input.style.borderColor = "#B23A3A";
      input.title = resultado.error;
      return;
    }
    onGuardar(resultado.num);
  });
  return wrap;
}

function renderAprobadas() {
  const list = document.getElementById("aprobadas-list");
  const emptyMsg = document.getElementById("aprobadas-empty");
  list.innerHTML = "";

  const codigos = Object.keys(notas.aprobadas).map(Number);
  if (codigos.length === 0) {
    emptyMsg.hidden = false;
    return;
  }
  emptyMsg.hidden = true;

  codigos
    .sort((a, b) => nombrePorCodigo(a).localeCompare(nombrePorCodigo(b)))
    .forEach((codigo) => {
      const item = document.createElement("div");
      item.className = "proxima-item";
      item.innerHTML = `
        <div>
          <p class="nombre">${escapeHtml(nombrePorCodigo(codigo))} <span class="codigo">(${codigo})</span></p>
          <p class="faltantes">Aprobada</p>
        </div>
      `;
      const controles = document.createElement("div");
      controles.className = "item-controles";
      controles.appendChild(crearFormularioEdicion(notas.aprobadas[codigo], (nuevaNota) => {
        editarAprobada(codigo, nuevaNota);
      }));
      item.appendChild(controles);
      list.appendChild(item);
    });
}

function renderDesaprobados() {
  const list = document.getElementById("desaprobados-list");
  const emptyMsg = document.getElementById("desaprobados-empty");
  list.innerHTML = "";

  const entradas = [];
  Object.keys(notas.intentos).forEach((codigo) => {
    const cod = Number(codigo);
    notas.intentos[codigo].forEach((nota, indice) => {
      entradas.push({ codigo: cod, nota, indice });
    });
  });

  if (entradas.length === 0) {
    emptyMsg.hidden = false;
    return;
  }
  emptyMsg.hidden = true;

  entradas
    .sort((a, b) => nombrePorCodigo(a.codigo).localeCompare(nombrePorCodigo(b.codigo)))
    .forEach(({ codigo, nota, indice }) => {
      const item = document.createElement("div");
      item.className = "proxima-item";
      item.innerHTML = `
        <div>
          <p class="nombre">${escapeHtml(nombrePorCodigo(codigo))} <span class="codigo">(${codigo})</span></p>
          <p class="faltantes">Intento desaprobado</p>
        </div>
      `;
      const controles = document.createElement("div");
      controles.className = "item-controles";
      controles.appendChild(crearFormularioEdicion(nota, (nuevaNota) => {
        editarIntento(codigo, indice, nuevaNota);
      }));
      item.appendChild(controles);
      list.appendChild(item);
    });
}

// ---------------------------------------------------------------------
// Render: plan completo (con edición de nota)
// ---------------------------------------------------------------------

function renderPlanCompleto() {
  const contenedor = document.getElementById("plan-completo");
  if (!planCompletoVisible) {
    contenedor.hidden = true;
    contenedor.innerHTML = "";
    return;
  }
  contenedor.hidden = false;
  contenedor.innerHTML = "";

  const porTrayecto = {};
  MATERIAS.forEach((m) => {
    if (!porTrayecto[m.trayecto]) porTrayecto[m.trayecto] = [];
    porTrayecto[m.trayecto].push(m);
  });

  Object.keys(porTrayecto)
    .sort()
    .forEach((trayecto) => {
      const grupo = document.createElement("div");
      grupo.className = "trayecto-group";
      const titulo = document.createElement("h3");
      titulo.textContent = trayecto;
      grupo.appendChild(titulo);

      porTrayecto[trayecto].forEach((materia) => {
        grupo.appendChild(crearFilaPlan(materia));
      });

      contenedor.appendChild(grupo);
    });
}

function crearFilaPlan(materia) {
  const row = document.createElement("div");
  row.className = "plan-row";

  const aprobada = estaAprobada(materia.codigo);
  const habilitada = !aprobada && estaHabilitada(materia);
  const enCurso = habilitada && estaEnCurso(materia.codigo);
  const faltantes = correlativasFaltantes(materia);

  let badgeClass = "estado-bloqueada";
  let badgeTexto = "Bloqueada";
  if (aprobada) {
    badgeClass = "estado-aprobada";
    badgeTexto = `Aprobada (${notas.aprobadas[materia.codigo]})`;
  } else if (enCurso) {
    badgeClass = "estado-en-curso";
    badgeTexto = "En curso";
  } else if (habilitada) {
    badgeClass = "estado-habilitada";
    badgeTexto = "Habilitada";
  }

  const detalle = aprobada
    ? ""
    : faltantes.length > 0
    ? `Faltan: ${faltantes.map(nombrePorCodigo).join(", ")}`
    : "Sin correlativas pendientes";

  row.innerHTML = `
    <div class="plan-row-main">
      <span class="plan-row-nombre">${escapeHtml(materia.nombre)} <span class="codigo">(${materia.codigo})</span></span>
      ${detalle ? `<span class="plan-row-detalle">${escapeHtml(detalle)}</span>` : ""}
    </div>
  `;

  const right = document.createElement("div");
  right.style.display = "flex";
  right.style.alignItems = "center";
  right.style.gap = "10px";
  right.style.flexShrink = "0";
  right.style.flexWrap = "wrap";

  const badge = document.createElement("span");
  badge.className = `estado-badge ${badgeClass}`;
  badge.textContent = badgeTexto;
  right.appendChild(badge);

  if (aprobada) {
    const notaWrap = document.createElement("div");
    notaWrap.className = "plan-row-nota";
    notaWrap.innerHTML = `
      <input type="number" min="1" max="10" step="1" placeholder="1-10" />
      <button type="button">Editar</button>
    `;
    const input = notaWrap.querySelector("input");
    const boton = notaWrap.querySelector("button");
    boton.addEventListener("click", () => {
      const resultado = validarNota(input.value);
      if (resultado.error) {
        input.style.borderColor = "#B23A3A";
        input.title = resultado.error;
        return;
      }
      editarAprobada(materia.codigo, resultado.num);
    });
    right.appendChild(notaWrap);
  } else if (habilitada) {
    const notaWrap = document.createElement("div");
    notaWrap.className = "plan-row-nota";
    notaWrap.innerHTML = `
      <input type="number" min="1" max="10" step="1" placeholder="1-10" />
      <button type="button">Guardar</button>
    `;
    const input = notaWrap.querySelector("input");
    const boton = notaWrap.querySelector("button");
    boton.addEventListener("click", () => {
      const resultado = validarNota(input.value);
      if (resultado.error) {
        input.style.borderColor = "#B23A3A";
        input.title = resultado.error;
        return;
      }
      registrarNota(materia.codigo, resultado.num);
    });
    right.appendChild(notaWrap);
  }

  row.appendChild(right);
  return row;
}

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------------------------------------------------------------------
// Render general
// ---------------------------------------------------------------------

function renderTodo() {
  renderStats();
  renderHabilitadas();
  renderProximas();
  renderAprobadas();
  renderDesaprobados();
  renderPlanCompleto();
}

// ---------------------------------------------------------------------
// Eventos de UI
// ---------------------------------------------------------------------

document.getElementById("btn-vista-habilitadas").addEventListener("click", () => {
  vistaActual = "habilitadas";
  document.getElementById("btn-vista-habilitadas").classList.add("active");
  document.getElementById("btn-vista-notas").classList.remove("active");
  document.getElementById("vista-habilitadas").hidden = false;
  document.getElementById("vista-notas").hidden = true;
});

document.getElementById("btn-vista-notas").addEventListener("click", () => {
  vistaActual = "notas";
  document.getElementById("btn-vista-notas").classList.add("active");
  document.getElementById("btn-vista-habilitadas").classList.remove("active");
  document.getElementById("vista-notas").hidden = false;
  document.getElementById("vista-habilitadas").hidden = true;
});

document.getElementById("btn-toggle-plan").addEventListener("click", () => {
  planCompletoVisible = !planCompletoVisible;
  document.getElementById("btn-toggle-plan").textContent = planCompletoVisible
    ? "Ocultar plan completo"
    : "Mostrar plan completo";
  renderPlanCompleto();
});

document.getElementById("btn-reset").addEventListener("click", () => {
  const ok = confirm("¿Seguro que querés borrar todas las notas cargadas? Esta acción no se puede deshacer.");
  if (!ok) return;
  notas = estadoVacio();
  guardarNotas();
  renderTodo();
});

// ---------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------

renderTodo();
