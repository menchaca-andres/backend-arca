/* Portal de arquitectura ARCA - navegación, render y visor de diagramas. */

const PLANTUML_SERVER = 'https://www.plantuml.com/plantuml';
const PLANTUML_STYLE = `skinparam backgroundColor #FFFFFF
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam ArrowColor #0F5C86
skinparam ArrowFontColor #10233F
skinparam ActorBackgroundColor #E5F3FB
skinparam ActorBorderColor #0F5C86
skinparam UsecaseBackgroundColor #E5F3FB
skinparam UsecaseBorderColor #0F5C86
skinparam ClassBackgroundColor #FFFFFF
skinparam ClassBorderColor #0F5C86
skinparam ClassFontColor #10233F
skinparam PackageBackgroundColor #F5F9FF
skinparam PackageBorderColor #9DB8CC
skinparam NoteBackgroundColor #FFFBEB
skinparam NoteBorderColor #D97706
skinparam DatabaseBackgroundColor #E5F3FB
skinparam ComponentBackgroundColor #E5F3FB
skinparam ComponentBorderColor #0F5C86`;

const architectureMeta = {
  mapa: {
    name: 'Mapa de contenedores',
    icon: 'fa-diagram-project',
    description: 'Frontend, gateway, servicios, Gotenberg y PostgreSQL.',
  },
  dependencias: {
    name: 'Dependencias internas',
    icon: 'fa-arrows-left-right',
    description: 'Llamadas permitidas entre servicios y contratos internos.',
  },
  auditoria: {
    name: 'Auditoría y trazabilidad',
    icon: 'fa-shield-halved',
    description: 'Flujo previsto para HU-24 en el gateway.',
  },
  auditoriaEr: {
    name: 'ER auditoría',
    icon: 'fa-database',
    description: 'Tabla evento del schema auditoria, de solo inserción.',
  },
  despliegue: {
    name: 'Despliegue',
    icon: 'fa-server',
    description: 'Contenedores locales y PostgreSQL administrado en Supabase.',
  },
};

const state = {
  currentModule: null,
  currentDiagram: null,
  currentPuml: null,
  currentImage: null,
  showingSource: false,
  zoom: 1,
  panX: 0,
  panY: 0,
  panning: false,
  panStartX: 0,
  panStartY: 0,
};

const elements = {
  sidebar: document.getElementById('sidebar'),
  mainContent: document.getElementById('mainContent'),
  pageTitle: document.getElementById('pageTitle'),
  toggleSidebar: document.getElementById('toggleSidebar'),
  mobileMenu: document.getElementById('mobileMenu'),
  template: document.getElementById('module-template'),
  contentContainer: document.querySelector('.content-container'),
  moduleDiagrams: document.getElementById('architectureDiagrams'),
  modal: document.getElementById('diagramModal'),
  modalTitle: document.getElementById('modalTitle'),
  modalBody: document.getElementById('diagramModalBody'),
  diagramContainer: document.getElementById('diagramContainer'),
  zoomIn: document.getElementById('zoomIn'),
  zoomOut: document.getElementById('zoomOut'),
  zoomReset: document.getElementById('zoomReset'),
  zoomLevel: document.getElementById('zoomLevel'),
  viewSource: document.getElementById('viewSource'),
  downloadDiagram: document.getElementById('downloadDiagram'),
  openInTab: document.getElementById('openInTab'),
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function withStyle(code) {
  if (!code) return code;
  return code.replace('@startuml', `@startuml\n${PLANTUML_STYLE}`);
}

async function encodePlantUml(code) {
  const data = new TextEncoder().encode(code);
  const compressedStream = new CompressionStream('deflate');
  const writer = compressedStream.writable.getWriter();
  writer.write(data);
  writer.close();

  const compressed = await new Response(compressedStream.readable).arrayBuffer();
  const bytes = new Uint8Array(compressed);
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  let result = '';

  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;

    result += chars[b1 >> 2];
    result += chars[((b1 & 3) << 4) | (b2 >> 4)];
    if (i + 1 < bytes.length) result += chars[((b2 & 15) << 2) | (b3 >> 6)];
    if (i + 2 < bytes.length) result += chars[b3 & 63];
  }

  return result;
}

async function buildPlantUmlUrl(code, format = 'svg') {
  const encoded = await encodePlantUml(withStyle(code));
  return `${PLANTUML_SERVER}/${format}/~1${encoded}`;
}

function setPageTitle(title) {
  elements.pageTitle.textContent = title;
}

function closeMobileSidebar() {
  elements.sidebar.classList.remove('open');
}

function showSection(sectionId) {
  const target = document.getElementById(sectionId);
  if (!target || target.classList.contains('module-template')) return;

  document.querySelectorAll('.content-section').forEach((section) => {
    section.classList.toggle('active', section.id === sectionId);
  });

  document.querySelectorAll('.nav-link[data-section]').forEach((link) => {
    link.classList.toggle('active', link.dataset.section === sectionId);
  });

  if (sectionId === 'inicio') setPageTitle('Portal de Arquitectura');
  else if (sectionId === 'arquitectura') setPageTitle('Arquitectura C4');
  else if (sectionId === 'microservicios') setPageTitle('Microservicios');
  else if (sectionId === 'estado') setPageTitle('Estado y alcance');
  else if (modulesData[sectionId]) setPageTitle(`${modulesData[sectionId].name} · ${modulesData[sectionId].subtitle}`);

  closeMobileSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function buildModuleSection(moduleId, module) {
  const section = elements.template.cloneNode(true);
  section.id = moduleId;
  section.classList.remove('module-template');

  section.querySelector('.module-eyebrow').textContent = module.subtitle;
  section.querySelector('.module-title').textContent = module.name;
  section.querySelector('.module-description').textContent = module.description;
  section.querySelector('.module-schema').textContent = module.schema;
  section.querySelector('.module-port').textContent = String(module.port);
  section.querySelector('.module-hus-count').textContent = `${module.hus.length} historias`;

  const sprint = section.querySelector('.module-sprint');
  sprint.textContent = module.sprint;

  const status = section.querySelector('.module-status');
  status.textContent = module.status;
  status.className = `status-pill module-status ${module.statusClass}`;

  const responsibilities = section.querySelector('.module-responsibilities');
  responsibilities.innerHTML = module.responsibilities
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');

  const hus = section.querySelector('.module-hus');
  hus.innerHTML = module.hus
    .map((item) => `<span class="chip">${escapeHtml(item)}</span>`)
    .join('');

  const endpoints = section.querySelector('.endpoint-list');
  endpoints.innerHTML = module.endpoints
    .map(
      ([method, path, description, endpointStatus]) => `
        <div class="endpoint">
          <span class="endpoint-method">${escapeHtml(method)}</span>
          <code>${escapeHtml(path)}</code>
          <span class="endpoint-status">${escapeHtml(endpointStatus || description)}</span>
        </div>`,
    )
    .join('');

  const diagrams = section.querySelector('.module-diagrams');
  diagrams.innerHTML = module.diagrams
    .map((type) => {
      const meta = diagramMeta[type];
      return `
        <button class="diagram-card" data-module="${moduleId}" data-diagram="${type}">
          <i class="fas ${meta.icon}"></i>
          <strong>${escapeHtml(meta.name)}</strong>
          <span>${escapeHtml(meta.description)}</span>
        </button>`;
    })
    .join('');

  elements.contentContainer.appendChild(section);
  return section;
}

function buildArchitectureCards() {
  elements.moduleDiagrams.innerHTML = Object.entries(architectureMeta)
    .map(
      ([type, meta]) => `
        <button class="diagram-card" data-module="arquitectura" data-diagram="${type}">
          <i class="fas ${meta.icon}"></i>
          <strong>${escapeHtml(meta.name)}</strong>
          <span>${escapeHtml(meta.description)}</span>
        </button>`,
    )
    .join('');
}

function buildModules() {
  Object.entries(modulesData).forEach(([moduleId, module]) => {
    buildModuleSection(moduleId, module);
  });
  buildArchitectureCards();
}

function resetZoom() {
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  applyZoom();
}

function applyZoom() {
  const render = elements.diagramContainer.querySelector('.diagram-render');
  if (!render) return;
  render.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  elements.zoomLevel.textContent = `${Math.round(state.zoom * 100)}%`;
  elements.diagramContainer.classList.toggle('zoomed', state.zoom !== 1);
}

function setImageMode(isImage) {
  elements.viewSource.style.display = isImage ? 'none' : '';
  elements.downloadDiagram.style.display = isImage ? 'none' : '';
  elements.openInTab.style.display = isImage ? 'none' : '';
}

function setDiagramMode(isDiagram) {
  elements.viewSource.style.display = isDiagram ? '' : 'none';
  elements.downloadDiagram.style.display = isDiagram ? '' : 'none';
  elements.openInTab.style.display = isDiagram ? '' : 'none';
}

function openModal(title) {
  elements.modalTitle.textContent = title;
  elements.modal.classList.add('active');
  elements.modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  resetZoom();
}

function closeModal() {
  elements.modal.classList.remove('active');
  elements.modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  elements.diagramContainer.innerHTML = '';
  state.currentModule = null;
  state.currentDiagram = null;
  state.currentPuml = null;
  state.currentImage = null;
  state.showingSource = false;
  setDiagramMode(true);
}

function showLoading() {
  elements.diagramContainer.innerHTML = `
    <div class="loading">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Cargando diagrama...</p>
    </div>`;
}

function showFallback(code) {
  elements.diagramContainer.innerHTML = `
    <div class="error-box">
      <i class="fas fa-triangle-exclamation"></i>
      <p>No se pudo renderizar el diagrama automaticamente.</p>
      <pre class="source-view"><code>${escapeHtml(code)}</code></pre>
    </div>`;
}

function showSource() {
  if (!state.currentPuml) return;
  state.showingSource = true;
  elements.viewSource.innerHTML = '<i class="fas fa-image"></i> Diagrama';
  elements.diagramContainer.innerHTML = `<pre class="source-view"><code>${escapeHtml(
    state.currentPuml,
  )}</code></pre>`;
}

function showDiagram() {
  if (!state.currentPuml) return;
  state.showingSource = false;
  elements.viewSource.innerHTML = '<i class="fas fa-code"></i> Código';
  renderDiagram(state.currentPuml);
}

function renderDiagram(code) {
  setDiagramMode(true);
  showLoading();
  buildPlantUmlUrl(code)
    .then((url) => {
      window.__arcaDiagramError = () => showFallback(code);
      elements.diagramContainer.innerHTML = `
        <div class="diagram-render">
          <img src="${url}" alt="Diagrama PlantUML" onerror="window.__arcaDiagramError()" />
        </div>`;
      resetZoom();
    })
    .catch(() => showFallback(code));
}

function openDiagram(moduleId, diagramType) {
  const isArchitecture = moduleId === 'arquitectura';
  const code = isArchitecture
    ? architectureDiagrams[diagramType]
    : diagramsData[moduleId] && diagramsData[moduleId][diagramType];

  if (!code) return;

  const meta = isArchitecture ? architectureMeta[diagramType] : diagramMeta[diagramType];
  const module = isArchitecture ? { name: 'Arquitectura' } : modulesData[moduleId];

  state.currentModule = moduleId;
  state.currentDiagram = diagramType;
  state.currentPuml = code;
  state.currentImage = null;
  state.showingSource = false;
  elements.viewSource.innerHTML = '<i class="fas fa-code"></i> Código';

  openModal(`${module.name} · ${meta.name}`);
  renderDiagram(code);
}

window.showImageModal = function showImageModal(src, alt) {
  state.currentModule = null;
  state.currentDiagram = null;
  state.currentPuml = null;
  state.currentImage = src;
  state.showingSource = false;
  setImageMode(true);
  openModal(alt);
  elements.diagramContainer.innerHTML = `
    <div class="diagram-render">
      <img class="diagram-image" src="${src}" alt="${alt}" />
    </div>`;
  resetZoom();
};

function downloadCurrent() {
  if (!state.currentPuml) return;

  const safeName = `${state.currentModule || 'arquitectura'}-${state.currentDiagram || 'diagrama'}`;
  buildPlantUmlUrl(state.currentPuml)
    .then((url) => fetch(url))
    .then((response) => {
      if (!response.ok) throw new Error('No se pudo descargar');
      return response.blob();
    })
    .then((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${safeName}.svg`;
      link.click();
      URL.revokeObjectURL(link.href);
    })
    .catch(() => {
      const blob = new Blob([state.currentPuml], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${safeName}.puml`;
      link.click();
      URL.revokeObjectURL(link.href);
    });
}

function openCurrentInTab() {
  if (state.currentImage) {
    window.open(state.currentImage, '_blank', 'noopener');
    return;
  }
  if (!state.currentPuml) return;
  buildPlantUmlUrl(state.currentPuml).then((url) => window.open(url, '_blank', 'noopener'));
}

function bindEvents() {
  document.querySelectorAll('.nav-link[data-section]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      showSection(link.dataset.section);
    });
  });

  document.querySelectorAll('[data-go]').forEach((button) => {
    button.addEventListener('click', () => showSection(button.dataset.go));
  });

  document.addEventListener('click', (event) => {
    const diagramCard = event.target.closest('[data-module][data-diagram]');
    if (diagramCard) {
      openDiagram(diagramCard.dataset.module, diagramCard.dataset.diagram);
      return;
    }

    if (event.target.closest('[data-close-modal]')) {
      closeModal();
    }
  });

  elements.toggleSidebar.addEventListener('click', () => {
    if (window.innerWidth <= 1080) {
      elements.sidebar.classList.toggle('open');
    } else {
      elements.sidebar.classList.toggle('collapsed');
    }
  });

  elements.mobileMenu.addEventListener('click', () => {
    elements.sidebar.classList.toggle('open');
  });

  document.addEventListener('click', (event) => {
    if (window.innerWidth > 1080) return;
    if (!elements.sidebar.contains(event.target) && !elements.mobileMenu.contains(event.target)) {
      closeMobileSidebar();
    }
  });

  elements.zoomIn.addEventListener('click', () => {
    state.zoom = Math.min(state.zoom + 0.2, 4);
    applyZoom();
  });

  elements.zoomOut.addEventListener('click', () => {
    state.zoom = Math.max(state.zoom - 0.2, 0.3);
    applyZoom();
  });

  elements.zoomReset.addEventListener('click', resetZoom);

  elements.viewSource.addEventListener('click', () => {
    if (state.showingSource) showDiagram();
    else showSource();
  });

  elements.downloadDiagram.addEventListener('click', downloadCurrent);
  elements.openInTab.addEventListener('click', openCurrentInTab);

  elements.modalBody.addEventListener(
    'wheel',
    (event) => {
      if (!elements.diagramContainer.querySelector('.diagram-render')) return;
      event.preventDefault();
      if (event.deltaY < 0) state.zoom = Math.min(state.zoom + 0.1, 4);
      else state.zoom = Math.max(state.zoom - 0.1, 0.3);
      applyZoom();
    },
    { passive: false },
  );

  elements.modalBody.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    if (!elements.diagramContainer.querySelector('.diagram-render')) return;
    state.panning = true;
    state.panStartX = event.clientX - state.panX;
    state.panStartY = event.clientY - state.panY;
  });

  window.addEventListener('mousemove', (event) => {
    if (!state.panning) return;
    state.panX = event.clientX - state.panStartX;
    state.panY = event.clientY - state.panStartY;
    applyZoom();
  });

  window.addEventListener('mouseup', () => {
    state.panning = false;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && elements.modal.classList.contains('active')) closeModal();
  });
}

buildModules();
bindEvents();
