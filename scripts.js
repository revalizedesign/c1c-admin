const g = document.getElementById.bind(document)
const q = sel => document.querySelectorAll(sel)

const makeEl = (tag, cls, text) => {
  const el = document.createElement(tag)
  if (cls) el.className = cls
  if (text !== undefined) el.textContent = text
  return el
}

// AG Grid

agGrid.ModuleRegistry.registerModules([agGrid.AllCommunityModule, agGrid.AllEnterpriseModule])

const gridTheme = () => agGrid.themeQuartz.withParams({
  backgroundColor: 'var(--color-lightest)',
  borderColor: 'var(--color-light)',
  foregroundColor: 'var(--color-darkest)',
  headerBackgroundColor: 'var(--color-lighter)',
  headerTextColor: 'var(--color-darker)',
  rowBorder: { color: 'var(--color-light)', style: 'solid', width: 1 },
  rowHoverColor: 'var(--color-lighter)',
})

const fileCols = [
  { field: 'name', flex: 1, headerName: 'Name' },
  { field: 'type', headerName: 'Type', valueFormatter: p => p.value?.toUpperCase(), width: 80 },
  { field: 'size', headerName: 'Size', width: 100 },
  { field: 'pages', headerName: 'Pages', width: 80 },
]

let uploadedGrid = null
let generatedGrid = null

// State

const INITIAL_STATE = {
  activeTab: 'files',
  files: [],
  messages: [],
  placeholder: 'Message…',
  selectedFile: null,
  status: null,
  workflow: { id: 'first-use', step: 0 },
  workspace: { status: 'New session', title: 'Workspace' },
}

const state = { ...INITIAL_STATE }

const reset = () => {
  if (statusInterval) { clearInterval(statusInterval); statusInterval = null }
  Object.assign(state, { ...INITIAL_STATE, files: [], messages: [], workflow: { ...INITIAL_STATE.workflow } })
}

// Data

let workflows = {}
let fixtures = {}

// Render helpers

const renderMessage = msg => {
  if (typeof msg === 'string') return makeEl('div', 'chat-bubble', msg)
  if (msg.type === 'agent') return makeEl('div', 'chat-bubble agent', msg.text)
  if (msg.type === 'tool') {
    const el = makeEl('div', 'chat-tool')
    el.appendChild(makeEl('span', 'chat-tool-label', msg.label))
    el.appendChild(makeEl('span', 'chat-tool-detail', msg.detail))
    return el
  }
  if (msg.type === 'file-card') {
    const card = makeEl('div', 'file-card')
    const icon = makeEl('i'); icon.className = 'fa-regular fa-file-pdf'
    card.appendChild(icon)
    const text = makeEl('div', 'fork-card-text')
    text.appendChild(makeEl('b', null, msg.file.name))
    text.appendChild(makeEl('span', null, `${msg.file.size} · ${msg.file.assessment?.pages ?? ''} pages · ${msg.file.assessment?.tables ?? ''} tables`))
    card.appendChild(text)
    const chevron = makeEl('i'); chevron.className = 'fa-solid fa-angle-right'
    card.appendChild(chevron)
    card.addEventListener('click', () => { state.selectedFile = msg.file; state.activeTab = 'files'; g('detail-panel').classList.remove('collapsed'); render() })
    return card
  }
  if (msg.type === 'actions') {
    const wrap = makeEl('div', 'chat-actions')
    msg.actions.forEach(action => {
      const btn = makeEl('button', 'button outline', action.label)
      btn.type = 'button'
      btn.addEventListener('click', () => action.handler?.())
      wrap.appendChild(btn)
    })
    return wrap
  }
  return makeEl('div', 'chat-bubble', String(msg))
}

const renderWorkflowBar = () => {
  const bar = g('workflow-bar')
  bar.replaceChildren()

  const wf = state.workflow && workflows[state.workflow.id]
  if (wf) {
    bar.appendChild(makeEl('b', null, `${wf.name} workflow`))
    wf.steps.forEach((step, i) => {
      bar.appendChild(makeEl('span', 'inline-separator', '—'))
      const dot = makeEl('span', 'workflow-dot')
      if (i < state.workflow.step) dot.classList.add('done')
      else if (i === state.workflow.step) dot.classList.add(state.status ? 'running' : 'active')
      bar.appendChild(dot)
      bar.appendChild(makeEl('span', 'workflow-step', step))
    })
  }

  const status = makeEl('span', null, state.status ?? '✻ Awaiting user input')
  status.id = 'workflow-status'
  if (state.status) status.classList.add('running')
  if (!wf) status.style.marginLeft = '0'
  bar.appendChild(status)
}

const renderChat = () => {
  const el = g('chat-messages')
  el.replaceChildren()
  if (!state.messages.length) {
    el.appendChild(renderFork())
  } else {
    state.messages.forEach(msg => el.appendChild(renderMessage(msg)))
    if (activeIngress) {
      const card = makeEl('div', 'ingress-card')
      const spinner = makeEl('i'); spinner.className = 'fa-solid fa-spinner fa-spin ingress-card-icon'
      card.appendChild(spinner)
      const text = makeEl('span', null, state.status ?? 'Starting…')
      text.id = 'chat-ingress-status'
      card.appendChild(text)
      el.appendChild(card)
    }
  }
  el.scrollTop = el.scrollHeight
}

const renderFilesList = () => {
  const uploadedEl = g('files-uploaded-grid')
  const generatedEl = g('files-generated-grid')
  const dropZone = g('drop-zone')
  if (!uploadedEl) return
  if (dropZone) dropZone.style.display = state.files.length ? 'none' : ''
  uploadedEl.style.display = state.files.length ? '' : 'none'
  const genEmpty = g('generated-empty')
  if (genEmpty) genEmpty.style.display = ''
  generatedEl.style.display = 'none'

  const gridOpts = (el, rows) => ({
    columnDefs: fileCols,
    defaultColDef: { resizable: false, sortable: true },
    domLayout: rows.length ? 'autoHeight' : undefined,
    overlayNoRowsTemplate: 'No files',
    popupParent: document.body,
    rowData: rows,
    rowSelection: { mode: 'singleRow' },
    theme: gridTheme(),
  })

  const uploadedRows = state.files.map(f => ({ name: f.name, pages: f.assessment?.pages ?? '', size: f.size, type: f.type }))
  if (uploadedGrid) uploadedGrid.destroy()
  uploadedGrid = agGrid.createGrid(uploadedEl, {
    ...gridOpts(uploadedEl, uploadedRows),
    onRowClicked: e => {
      state.selectedFile = state.files.find(f => f.name === e.data.name)
      g('detail-panel').classList.remove('collapsed')
      renderDetail()
    },
  })

  if (generatedGrid) generatedGrid.destroy()
  generatedGrid = agGrid.createGrid(generatedEl, gridOpts(generatedEl, []))

  const stats = g('files-stats')
  if (stats) {
    stats.replaceChildren()
    const mkStat = (icon, text) => { const s = makeEl('span', 'overview-stat'); const i = makeEl('i'); i.className = icon; s.appendChild(i); s.appendChild(document.createTextNode(text)); return s }
    stats.appendChild(mkStat('fa-regular fa-arrow-up-from-bracket', `${state.files.length} uploaded`))
    stats.appendChild(mkStat('fa-regular fa-sparkles', '0 generated'))
  }
}

const renderDetail = () => {
  const content = g('detail-content')
  if (!content) return
  content.replaceChildren()
  if (!state.selectedFile) { content.appendChild(makeEl('div', 'detail-empty', 'Select a file to view details')); return }
  const file = state.selectedFile
  const view = makeEl('div', 'detail-view')
  view.appendChild(makeEl('b', null, file.name))
  if (file.size) view.appendChild(makeEl('span', 'detail-meta', `${file.type.toUpperCase()} · ${file.size}`))
  if (file.assessment) {
    const a = file.assessment
    view.appendChild(makeEl('p', 'detail-summary', a.summary))
    const mkSection = (label, content) => { const s = makeEl('div', 'detail-section'); s.appendChild(makeEl('b', 'detail-section-label', label)); s.appendChild(content); return s }
    const statsGrid = makeEl('div', 'detail-stats')
    ;[['Pages', a.pages], ['Tokens', a.tokens], ['Tables', a.tables], ['Figures', a.figures]].forEach(([l, v]) => {
      const item = makeEl('div', 'detail-stat'); item.appendChild(makeEl('span', 'detail-stat-val', String(v))); item.appendChild(makeEl('span', 'detail-stat-label', l)); statsGrid.appendChild(item)
    })
    view.appendChild(mkSection('Document Stats', statsGrid))
    if (a.modelEstimates) {
      const grid = makeEl('div', 'detail-estimates')
      Object.entries(a.modelEstimates).forEach(([k, v]) => {
        const row = makeEl('div', 'detail-est-row'); row.appendChild(makeEl('span', null, k.replace(/([A-Z])/g, ' $1').toLowerCase())); row.appendChild(makeEl('span', 'detail-est-val', String(v))); grid.appendChild(row)
      })
      view.appendChild(mkSection('Model Estimates', grid))
    }
  }
  content.appendChild(view)
}

const renderModelStats = () => {
  const el = g('model-stats')
  if (!el || !fixtures.modelStats) return
  el.replaceChildren()
  fixtures.modelStats.forEach(({ count, icon, label }) => {
    const stat = makeEl('span', 'overview-stat')
    const i = makeEl('i'); i.className = icon
    stat.appendChild(i)
    stat.appendChild(document.createTextNode(`${count} ${label}`))
    el.appendChild(stat)
  })
}

// Main render

const render = () => {
  g('workspace-title').textContent = state.workspace.title
  g('workspace-status').textContent = state.workspace.status
  g('chat-input').placeholder = state.placeholder
  q('.chip-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === state.activeTab))
  q('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `pane-${state.activeTab}`))
  renderWorkflowBar()
  renderChat()
  renderFilesList()
  renderModelStats()
  renderDetail()
}

// Entry points

const renderFork = () => {
  const el = makeEl('div', null)
  el.id = 'chat-fork'
  ;[
    { desc: 'Build a configuration model from scratch', icon: 'fa-regular fa-sparkles', label: 'New product', workflow: 'first-use' },
    { desc: 'Update an existing configuration model', icon: 'fa-regular fa-pen-to-square', label: 'Edit product', workflow: 'edit-product' },
    { desc: 'Load a product from a URL', handler: startDemoFlow, icon: 'fa-regular fa-link', label: 'Demo from link' },
  ].forEach(entry => {
    const card = makeEl('div', 'fork-card')
    const icon = makeEl('i'); icon.className = entry.icon
    card.appendChild(icon)
    const text = makeEl('div', 'fork-card-text')
    text.appendChild(makeEl('b', null, entry.label))
    text.appendChild(makeEl('span', null, entry.desc))
    card.appendChild(text)
    card.addEventListener('click', () => {
      if (entry.handler) { entry.handler(); return }
      state.messages.push(entry.label)
      state.workflow = { id: entry.workflow, step: 0 }
      render()
    })
    el.appendChild(card)
  })
  return el
}

// Demo flow

const startDemoFlow = () => {
  state.messages.push('Demo from link')
  state.placeholder = 'Paste URL…'
  state.messages.push({ type: 'agent', text: 'Select an example from the list below or submit a URL (experimental).' })
  state.messages.push({ type: 'actions', actions: (fixtures.demoExamples ?? []).map(ex => ({ label: ex.label, handler: () => startIngress(ex) })) })
  render()
}

let statusInterval = null
let activeIngress = null

const startIngress = example => {
  state.messages = state.messages.filter(m => m.type !== 'actions')
  state.messages.push(example.label)
  state.workflow = { id: 'file-ingress', step: 0 }
  state.placeholder = 'Message…'
  activeIngress = { example, stepIdx: 0, stepRows: null, card: null }
  render()

  setTimeout(() => advanceIngress(), 500)
}

const buildProgressCard = example => {
  const card = makeEl('div', 'progress-card')
  const stepsEl = makeEl('div', 'progress-steps')
  card.appendChild(stepsEl)
  const stepRows = example.ingress.map(step => {
    const row = makeEl('div', 'progress-step pending')
    const iconWrap = makeEl('div', 'step-icon')
    const icon = makeEl('i'); icon.className = 'fa-regular fa-circle'
    iconWrap.appendChild(icon)
    row.appendChild(iconWrap)
    const body = makeEl('div', 'step-body')
    body.appendChild(makeEl('span', 'step-name', step.step))
    const detail = makeEl('span', 'step-detail')
    body.appendChild(detail)
    row.appendChild(body)
    stepsEl.appendChild(row)
    return { detail, icon, row }
  })
  return { card, stepRows }
}

const advanceIngress = () => {
  if (!activeIngress) return
  const { example } = activeIngress
  if (statusInterval) { clearInterval(statusInterval); statusInterval = null }

  if (activeIngress.stepIdx >= example.ingress.length) {
    state.files.push({ ...example.file, assessment: example.assessment })
    state.selectedFile = state.files[state.files.length - 1]
    state.workflow.step = example.ingress.length
    state.status = null
    state.activeTab = 'files'
    state.workspace.status = example.label
    state.messages.push({ type: 'file-card', file: state.selectedFile })
    activeIngress = null
    g('detail-panel').classList.remove('collapsed')
    render()
    return
  }

  const step = example.ingress[activeIngress.stepIdx]
  state.workflow.step = activeIngress.stepIdx
  const frames = step.statusFrames ?? [`${step.step}…`]
  state.status = frames[0]
  render()

  if (frames.length > 1) {
    let frameIdx = 0
    statusInterval = setInterval(() => {
      frameIdx = (frameIdx + 1) % frames.length
      state.status = frames[frameIdx]
      const statusEl = g('workflow-status')
      if (statusEl) statusEl.textContent = frames[frameIdx]
      const chatStatus = g('chat-ingress-status')
      if (chatStatus) chatStatus.textContent = frames[frameIdx]
    }, step.ms / frames.length)
  }

  activeIngress.stepIdx++
  setTimeout(advanceIngress, step.ms)
}

// Collapsible panels

const initStrip = (stripId, toggleId) => {
  const strip = g(stripId)
  g(toggleId).addEventListener('click', e => { e.stopPropagation(); strip.classList.toggle('collapsed') })
  strip.addEventListener('click', () => { if (strip.classList.contains('collapsed')) strip.classList.remove('collapsed') })
}

initStrip('sidenav', 'nav-toggle')
initStrip('chat-panel', 'chat-toggle')
initStrip('detail-panel', 'detail-toggle')

g('quick-actions-header').addEventListener('click', () => g('quick-actions').classList.toggle('collapsed'))

q('.chip-tab').forEach(tab => tab.addEventListener('click', () => { state.activeTab = tab.dataset.tab; render() }))

g('reset-btn').addEventListener('click', () => { reset(); render() })

// Init

Promise.all([
  fetch('workflows.json').then(r => r.json()),
  fetch('fixtures.json').then(r => r.json()),
]).then(([wf, fx]) => { workflows = wf; fixtures = fx; render() })
