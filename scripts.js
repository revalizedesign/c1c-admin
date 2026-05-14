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
  { cellRenderer: p => p.data?.locked ? '<i class="fa-solid fa-lock" title="Will be preserved when workspace is reset"></i>' : '', headerName: '', sortable: false },
  { field: 'source', headerName: 'Source' },
  { field: 'name', headerName: 'Name', suppressSizeToFit: false },
  { field: 'type', headerName: 'Type', valueFormatter: p => ({ md: 'Markdown', pdf: 'PDF' })[p.value] ?? p.value?.toUpperCase() },
  { field: 'size', headerName: 'Size', type: 'rightAligned' },
  { field: 'pages', headerName: 'Pages', type: 'rightAligned' },
  { field: 'owner', headerName: 'Owner' },
  { field: 'created', headerName: 'Created' },
]

let filesGrid = null

// State

const INITIAL_STATE = {
  activeTab: 'files',
  context: 0,
  demoIndex: 0,
  files: [],
  messages: [],
  placeholder: 'Message…',
  selectedFile: null,
  status: null,
  workflow: null,
  workspace: { status: 'New session', title: 'Workspace' },
}

const state = { ...INITIAL_STATE }

// Data

let workflows = {}
let fixtures = {}
let productData = null
let statusInterval = null
let workflowStartTime = null
let activeAutomation = null
let skipIndustry = Math.random() > 0.5

const demo = () => fixtures.demo ?? []
const currentStep = () => demo()[state.demoIndex]

const reset = () => {
  if (statusInterval) { clearInterval(statusInterval); statusInterval = null }
  productData = null
  activeAutomation = null
  buildQueue = []
  state.lastElapsed = null
  skipIndustry = Math.random() > 0.5
  Object.assign(state, { ...INITIAL_STATE, files: [], messages: [] })
  enterStep(0)
}

// Step engine

const enterStep = idx => {
  state.demoIndex = idx
  const step = demo()[idx]
  if (!step) return
  if (step.workflow) state.workflow = { id: step.workflow, step: 0 }
  if (step.placeholder) state.placeholder = step.placeholder
  if (step.preloadFiles) step.preloadFiles.forEach(f => addContextFile(f))

  // Skippable step
  if (step.skip && skipIndustry) {
    state.messages.push({ type: 'agent', text: step.skip.agent })
    if (step.file) addContextFile(step.file)
    enterStep(idx + 1)
    return
  }

  if (step.agent) state.messages.push({ type: 'agent', text: step.agent })

  // Automated step — has sub-steps to run
  if (step.steps) {
    workflowStartTime = Date.now()
    if (step.file) {
      const pendingFile = { ...step.file, progress: 0 }
      state.messages.push({ type: 'file-card', file: pendingFile })
      activeAutomation = { stepIdx: 0, fileMsg: state.messages[state.messages.length - 1] }
    } else {
      activeAutomation = { stepIdx: 0 }
    }
    render()
    setTimeout(advanceAutomation, 500)
    return
  }

  render()
}

const advanceStep = userText => {
  const step = currentStep()
  if (!step) return

  // Push user message
  if (userText) state.messages.push(userText)

  // Add file if step produces one
  if (step.file) addContextFile(step.file)

  // Recap — collapse messages before advancing
  if (step.recap) {
    if (step.files) step.files.forEach(f => {
      const file = state.files.find(sf => sf.name === f.label)
      if (file) state.messages.push({ type: 'file-card', file })
    })
    const archived = [...state.messages]
    state.messages = [{ type: 'collapsed-messages', archived, expanded: false }]
    if (step.files) {
      const wf = state.workflow && workflows[state.workflow.id]
      state.messages.push({ type: 'recap', files: step.files, label: `${wf?.name ?? 'Workflow'} complete` })
    }
    if (step.context) state.context = step.context
  }

  // Action selection
  if (step.actions) {
    const action = step.actions.find(a => a.label === userText) ?? step.actions.find(a => !a.disabled)
    if (action.workflow) state.workflow = { id: action.workflow, step: 0 }
    if (action.response) state.messages.push({ type: 'agent', text: action.response })
    if (action.actions) state.messages.push({ type: 'actions', actions: action.actions.map(label => ({ label, handler: () => { state.messages = state.messages.filter(m => m.type !== 'actions'); state.messages.push(label); state.workspace.status = label; render() } })) })
    if (action.placeholder) state.placeholder = action.placeholder
    enterStep(state.demoIndex + 1)
    return
  }

  enterStep(state.demoIndex + 1)
}

const addContextFile = src => {
  const now = new Date().toISOString().slice(0, 10)
  if (state.files.some(f => f.name === src.name)) return
  const file = { ...src, created: src.created ?? now, locked: src.locked ?? true, source: src.source ?? 'Generated' }
  if (src.verticalId) {
    const v = (fixtures.verticals ?? []).find(v => v.id === src.verticalId)
    if (v) { file.path = v.path; file.size = v.size }
  }
  state.files.push(file)
}

// Automation engine (ingress + build phases)

const advanceAutomation = () => {
  if (!activeAutomation) return
  const step = currentStep()
  const steps = step.steps ?? []
  if (statusInterval) { clearInterval(statusInterval); statusInterval = null }

  if (activeAutomation.stepIdx >= steps.length) {
    if (activeAutomation.fileMsg) activeAutomation.fileMsg.file.progress = 1
    state.workflow.step = steps.length
    state.status = null

    if (step.file) {
      const a = step.assessment ?? {}
      const detail = [a.pages && `${a.pages} pages`, a.tables && `${a.tables} tables`].filter(Boolean).join(' · ')
      const file = { ...step.file, assessment: a, detail: detail || undefined, progress: 1 }
      state.files.push(file)
      if (step.productSummary) updateProductSummary(step.productSummary, step.assessment)
      state.selectedFile = file
      state.activeTab = 'files'
      state.workspace.status = step.label ?? file.name
      if (activeAutomation.fileMsg) {
        activeAutomation.fileMsg.file = file
      } else {
        state.messages.push({ type: 'file-card', file })
      }
    } else if (step.label) {
      // Build phase complete
      const detail = steps.map(s => s.detail).pop()
      state.messages.push({ type: 'result-card', label: step.label, detail, tab: step.tab })
    }

    pushElapsed()
    activeAutomation = null
    if (step.file) openDetail()
    render()
    if (buildQueue.length) setTimeout(nextBuildPhase, 1500)
    return
  }

  const sub = steps[activeAutomation.stepIdx]
  state.workflow.step = activeAutomation.stepIdx
  if (sub.context) state.context = sub.context
  const totalFrames = steps.reduce((n, s) => n + (s.statusFrames?.length ?? 1), 0)
  const framesCompleted = steps.slice(0, activeAutomation.stepIdx).reduce((n, s) => n + (s.statusFrames?.length ?? 1), 0)
  if (activeAutomation.fileMsg) activeAutomation.fileMsg.file.progress = framesCompleted / totalFrames
  const frames = sub.statusFrames ?? [`${sub.step}…`]
  state.status = frames[0]
  render()

  if (frames.length > 1) {
    let frameIdx = 0
    statusInterval = setInterval(() => {
      frameIdx++
      if (frameIdx >= frames.length) frameIdx = 0
      state.status = frames[frameIdx]
      q('.status-text').forEach(el => el.textContent = frames[frameIdx])
      if (activeAutomation?.fileMsg) {
        const p = (framesCompleted + frameIdx + 1) / totalFrames
        activeAutomation.fileMsg.file.progress = p
        q('.file-card-progress').forEach(el => el.style.width = `${Math.round(p * 100)}%`)
      }
    }, sub.ms / frames.length)
  }

  activeAutomation.stepIdx++
  setTimeout(advanceAutomation, sub.ms)
}

const updateProductSummary = (name, assessment) => {
  const existing = state.files.find(f => f.name === name)
  const prev = existing?.assessment ?? {}
  const merged = {
    ...prev, ...assessment,
    figures: (prev.figures ?? 0) + (assessment.figures ?? 0),
    modelEstimates: { ...prev.modelEstimates, ...assessment.modelEstimates },
    pages: (prev.pages ?? 0) + (assessment.pages ?? 0),
    summary: prev.summary ? `${prev.summary}\n\n${assessment.summary}` : assessment.summary,
    tables: (prev.tables ?? 0) + (assessment.tables ?? 0),
    tokens: `~${Math.round((parseInt(prev.tokens?.replace(/\D/g, '') ?? '0') + parseInt(assessment.tokens?.replace(/\D/g, '') ?? '0')) / 1000)}k`,
  }
  const file = { assessment: merged, created: new Date().toISOString().slice(0, 10), locked: false, name, owner: 'Agent', pages: 1, size: existing ? '5.1 kb' : '3.4 kb', source: 'Generated', type: 'md' }
  const idx = state.files.findIndex(f => f.name === name)
  if (idx >= 0) state.files[idx] = file; else state.files.push(file)
}

const pushElapsed = () => {
  if (!workflowStartTime) return
  state.lastElapsed = `✻ Workflow ran for ${Math.round((Date.now() - workflowStartTime) / 1000)}s`
  workflowStartTime = null
}

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
  if (msg.type === 'result-card' || msg.type === 'build-card') {
    const card = makeEl('div', 'file-card')
    const icon = makeEl('i'); icon.className = 'fa-regular fa-cube'
    card.appendChild(icon)
    const text = makeEl('div', 'card-text')
    text.appendChild(makeEl('b', null, msg.label))
    text.appendChild(makeEl('span', null, msg.detail))
    card.appendChild(text)
    const chevron = makeEl('i'); chevron.className = 'fa-solid fa-angle-right'
    card.appendChild(chevron)
    card.addEventListener('click', () => { state.activeTab = msg.tab ?? 'model'; render() })
    return card
  }
  if (msg.type === 'file-card') {
    const f = msg.file
    const card = makeEl('div', 'file-card')
    const icon = makeEl('i'); icon.className = f.type === 'pdf' ? 'fa-regular fa-file-pdf' : 'fa-regular fa-file'
    card.appendChild(icon)
    const meta = [f.size, f.detail].filter(Boolean)
    if (meta.length > 1) {
      const text = makeEl('div', 'card-text')
      text.appendChild(makeEl('span', 'file-card-name', f.name))
      text.appendChild(makeEl('span', 'file-card-meta', meta.join(' · ')))
      card.appendChild(text)
    } else {
      card.appendChild(makeEl('span', 'file-card-name', f.name))
      if (meta.length) card.appendChild(makeEl('span', 'file-card-meta', meta[0]))
    }
    const chevron = makeEl('i'); chevron.className = 'fa-solid fa-angle-right'
    card.appendChild(chevron)
    if (f.progress !== undefined && !f.detail) {
      const bar = makeEl('div', 'file-card-progress')
      bar.style.width = `${Math.round(f.progress * 100)}%`
      card.appendChild(bar)
    }
    card.addEventListener('click', () => { state.selectedFile = f; state.activeTab = 'files'; openDetail(); render() })
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
  if (msg.type === 'collapsed-messages') {
    const frag = document.createDocumentFragment()
    const toggle = makeEl('button', 'message-toggle')
    toggle.type = 'button'
    const chev = makeEl('i'); chev.className = msg.expanded ? 'fa-solid fa-angle-up' : 'fa-solid fa-angle-down'
    toggle.appendChild(chev)
    toggle.appendChild(makeEl('span', null, msg.expanded ? `Hide ${msg.archived.length} messages` : `Show ${msg.archived.length} messages`))
    toggle.addEventListener('click', () => { msg.expanded = !msg.expanded; render() })
    if (msg.expanded) msg.archived.forEach(m => frag.appendChild(renderMessage(m)))
    frag.appendChild(toggle)
    return frag
  }
  if (msg.type === 'recap') {
    const card = makeEl('div', 'file-card')
    const icon = makeEl('i'); icon.className = 'fa-solid fa-circle-check'
    card.appendChild(icon)
    card.appendChild(makeEl('b', null, msg.label))
    card.appendChild(makeEl('span', 'file-card-meta', `${msg.files.length} files saved`))
    const chevron = makeEl('i'); chevron.className = 'fa-solid fa-angle-right'
    card.appendChild(chevron)
    card.addEventListener('click', () => { state.activeTab = 'files'; render() })
    return card
  }
  return makeEl('div', 'chat-bubble', String(msg))
}

// Render

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
  const status = makeEl('span', state.status ? 'status-card' : '', state.status ? undefined : '✻ Awaiting human input')
  status.id = 'workflow-status'
  if (!state.status) status.style.color = 'var(--color-light)'
  if (state.status) {
    status.appendChild(makeEl('span', 'spinner'))
    status.appendChild(makeEl('span', 'status-text', state.status))
  }
  bar.appendChild(status)
}

const renderChat = () => {
  const el = g('chat-messages')
  el.replaceChildren()
  let cardGroup = null
  state.messages.forEach(msg => {
    const isCard = msg.type === 'file-card' || msg.type === 'result-card' || msg.type === 'build-card'
    if (isCard) {
      if (!cardGroup) { cardGroup = makeEl('div', 'card-group'); el.appendChild(cardGroup) }
      cardGroup.appendChild(renderMessage(msg))
    } else {
      cardGroup = null
      el.appendChild(renderMessage(msg))
    }
  })

  const step = currentStep()
  if (!step) { el.scrollTop = el.scrollHeight; return }

  // Card — key/value verification
  if (step.card && !activeAutomation) {
    const card = makeEl('div', 'verification-card')
    Object.entries(step.card).forEach(([k, v]) => {
      const row = makeEl('div', 'verification-row')
      row.appendChild(makeEl('span', 'verification-key', k))
      row.appendChild(makeEl('span', null, v))
      card.appendChild(row)
    })
    el.appendChild(card)
  }

  // Files — review list
  if (step.files && !activeAutomation) {
    const group = makeEl('div', 'card-group')
    step.files.forEach(f => {
      const file = state.files.find(sf => sf.name === f.label)
      if (file) group.appendChild(renderMessage({ type: 'file-card', file }))
    })
    if (group.children.length) el.appendChild(group)
  }

  // Button
  if (step.button && !activeAutomation) {
    const btn = makeEl('button', 'button primary', step.button)
    btn.style.alignSelf = 'flex-start'
    btn.type = 'button'
    btn.addEventListener('click', () => advanceStep(step.button))
    el.appendChild(btn)
  }

  // Actions
  if (step.actions && !activeAutomation) {
    const group = makeEl('div', 'card-group')
    step.actions.forEach(action => {
      const card = makeEl('div', action.disabled ? 'file-card disabled' : 'file-card')
      if (action.icon) { const icon = makeEl('i'); icon.className = action.icon; card.appendChild(icon) }
      if (action.desc) {
        const text = makeEl('div', 'card-text')
        text.appendChild(makeEl('b', null, action.label))
        text.appendChild(makeEl('span', null, action.desc))
        card.appendChild(text)
      } else {
        card.appendChild(makeEl('span', null, action.label))
      }
      if (!action.disabled) card.addEventListener('click', () => advanceStep(action.label))
      group.appendChild(card)
    })
    el.appendChild(group)
  }

  // Workflow card during automation
  if (activeAutomation && state.workflow) {
    const wf = workflows[state.workflow.id]
    if (wf) {
      const card = makeEl('div', 'chat-workflow-card')
      card.appendChild(makeEl('b', null, `${wf.name} workflow`))
      wf.steps.forEach((step, i) => {
        const row = makeEl('div', 'chat-workflow-step')
        const dot = makeEl('span', 'workflow-dot')
        if (i < state.workflow.step) dot.classList.add('done')
        else if (i === state.workflow.step) dot.classList.add('running')
        row.appendChild(dot)
        row.appendChild(makeEl('span', i === state.workflow.step ? null : 'chat-workflow-label', step))
        card.appendChild(row)
      })
      el.appendChild(card)
    }
  }

  el.scrollTop = el.scrollHeight
}

const renderChatStatus = () => {
  const el = g('chat-status')
  if (!el) return
  el.replaceChildren()
  if (state.status) {
    const inner = makeEl('div', 'status-card')
    inner.appendChild(makeEl('span', 'spinner'))
    inner.appendChild(makeEl('span', 'status-text', state.status))
    el.appendChild(inner)
  } else if (state.lastElapsed) {
    el.appendChild(makeEl('span', 'status-elapsed', state.lastElapsed))
  } else {
    el.appendChild(makeEl('span', 'status-elapsed', '✻ Awaiting human input'))
  }
}

const renderFilesList = () => {
  const el = g('files-grid')
  if (!el) return
  const rows = state.files.map(f => ({ created: f.created ?? '', locked: f.locked ?? false, name: f.name, owner: f.owner ?? 'Agent', pages: f.assessment?.pages ?? f.pages ?? '', size: f.size, source: f.source ?? 'Uploaded', type: f.type }))
  if (filesGrid) {
    filesGrid.setGridOption('rowData', rows)
    if (state.activeTab === 'files') { filesGrid.autoSizeAllColumns(); filesGrid.sizeColumnsToFit() }
    return
  }
  if (state.activeTab !== 'files') return
  filesGrid = agGrid.createGrid(el, {
    autoSizeStrategy: { type: 'fitCellContents', scaleUpToFitGridWidth: true },
    columnDefs: fileCols,
    defaultColDef: { resizable: false, sortable: true, suppressSizeToFit: true },
    popupParent: document.body,
    rowData: rows,
    rowSelection: { checkboxes: true, headerCheckbox: true, mode: 'multiRow' },
    selectionColumnDef: { pinned: 'left', suppressSizeToFit: true },
    theme: gridTheme(),
    onRowClicked: e => {
      const file = state.files.find(f => f.name === e.data.name)
      if (file) { state.selectedFile = file; openDetail(); renderDetail() }
    },
  })
}

const renderDetail = () => {
  const content = g('detail-content')
  if (!content) return
  content.replaceChildren()
  if (!state.selectedFile) { content.appendChild(makeEl('div', 'detail-empty', 'Select a file to view details')); return }
  const file = state.selectedFile
  const view = makeEl('div', 'detail-view')
  view.appendChild(makeEl('b', null, file.name))
  const typeName = ({ md: 'Markdown', pdf: 'PDF' })[file.type] ?? file.type?.toUpperCase()
  if (typeName) view.appendChild(makeEl('span', 'detail-meta', file.size && file.size !== '—' ? `${typeName} · ${file.size}` : typeName))
  if (file.markdown || (file.path && file.type === 'md')) {
    const md = makeEl('div', 'markdown-body')
    const renderMd = text => { md.innerHTML = marked.parse(text) }
    if (file.markdown) {
      renderMd(file.markdown)
    } else {
      md.textContent = 'Loading…'
      fetch(file.path).then(r => r.text()).then(text => { file.markdown = text; renderMd(text) })
    }
    view.appendChild(md)
    content.appendChild(view)
    return
  }
  if (file.details) {
    view.appendChild(makeEl('p', 'detail-summary', file.details.summary))
    if (file.details.fields) {
      const grid = makeEl('div', 'detail-estimates')
      file.details.fields.forEach(([k, v]) => {
        const row = makeEl('div', 'detail-est-row')
        row.appendChild(makeEl('span', null, k))
        row.appendChild(makeEl('span', 'detail-est-val', v))
        grid.appendChild(row)
      })
      view.appendChild(grid)
    }
  }
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

const renderStats = (containerId, stats) => {
  const el = g(containerId)
  if (!el || !stats) return
  el.replaceChildren()
  stats.forEach(({ count, icon, label }) => {
    const stat = makeEl('span', 'overview-stat')
    const i = makeEl('i'); i.className = icon
    stat.appendChild(i)
    stat.appendChild(document.createTextNode(`${count} ${label}`))
    el.appendChild(stat)
  })
}

const countFrom = (obj, ...keys) => keys.reduce((n, k) => n + (Array.isArray(obj?.[k]) ? obj[k].length : 0), 0)

const buildStats = () => {
  const p = productData
  const files = [
    { count: state.files.filter(f => f.source === 'Uploaded').length, icon: 'fa-regular fa-arrow-up-from-bracket', label: 'uploaded' },
    { count: state.files.filter(f => f.source === 'Generated').length, icon: 'fa-regular fa-sparkles', label: 'generated' },
    { count: state.files.filter(f => f.source === 'System').length, icon: 'fa-regular fa-robot', label: 'system' },
  ]
  if (!p) return { files }
  return {
    attributes: [
      { count: countFrom(p.attributes, 'productAttributes'), icon: 'fa-regular fa-box', label: 'product attributes' },
      { count: countFrom(p.attributes, 'inputAttributes'), icon: 'fa-regular fa-table-cells', label: 'input attributes' },
    ],
    equations: [{ count: p.equations?.length ?? 0, icon: 'fa-regular fa-superscript', label: 'equations' }],
    files,
    model: [
      { count: countFrom(p.model, 'inputGroups'), icon: 'fa-regular fa-layer-group', label: 'input groups' },
      { count: countFrom(p.model, 'inputs'), icon: 'fa-regular fa-input-text', label: 'inputs' },
      { count: countFrom(p.model, 'inputValues'), icon: 'fa-regular fa-list', label: 'input values' },
    ],
    results: [
      { count: countFrom(p.results, 'itemFamilies'), icon: 'fa-regular fa-sitemap', label: 'item families' },
      { count: countFrom(p.results, 'itemMasters'), icon: 'fa-regular fa-barcode', label: 'item masters' },
      { count: countFrom(p.results, 'bomSkeleton'), icon: 'fa-regular fa-diagram-project', label: 'BOM lines' },
      { count: countFrom(p.results, 'productOutputs'), icon: 'fa-regular fa-square-poll-horizontal', label: 'product outputs' },
      { count: countFrom(p.results, 'drivenItemMasters'), icon: 'fa-regular fa-arrow-right-arrow-left', label: 'driven item masters' },
    ],
    rules: [
      { count: 1, icon: 'fa-regular fa-folder-tree', label: 'root logic group' },
      { count: countFrom(p.rules, 'logicGroups'), icon: 'fa-regular fa-folder', label: 'logic groups' },
      { count: countFrom(p.rules, 'logicItems'), icon: 'fa-regular fa-cube', label: 'logic items' },
      { count: countFrom(p.rules, 'drivenInputs'), icon: 'fa-regular fa-code-branch', label: 'driven inputs' },
      { count: countFrom(p.rules, 'inputFilters'), icon: 'fa-regular fa-filter', label: 'input filters' },
      { count: countFrom(p.rules, 'iterators'), icon: 'fa-regular fa-repeat', label: 'iterators' },
    ],
  }
}

const renderAllStats = () => {
  const stats = buildStats()
  for (const [tab, items] of Object.entries(stats)) renderStats(`overview-${tab}-stats`, items)
}

// Tab content renderers (unchanged — driven by productData)

const renderModelTab = () => {
  const tree = g('subpane-model-tree')
  const json = g('subpane-model-json')
  if (!tree || !productData) return
  tree.replaceChildren()
  const m = productData.model
  ;(m.inputGroups ?? []).forEach(group => {
    const groupEl = makeEl('div', 'tree-row tree-group')
    groupEl.appendChild(makeEl('b', null, group.name))
    groupEl.appendChild(makeEl('span', 'tree-count', `${(m.inputs ?? []).filter(i => i.groupNum === group.num).length} inputs`))
    tree.appendChild(groupEl)
    ;(m.inputs ?? []).filter(i => i.groupNum === group.num).forEach(input => {
      const row = makeEl('div', 'tree-row tree-input')
      row.appendChild(makeEl('span', null, input.label))
      row.appendChild(makeEl('span', 'tree-type', input.type))
      if (input.options) row.appendChild(makeEl('span', 'tree-count', `${input.options.length} options`))
      row.addEventListener('click', () => {
        state.selectedFile = { name: input.label, details: { summary: `Input: ${input.name} (${input.type})`, fields: [['ID', input.id], ['Group', group.name], ['Default', String(input.default ?? '—')], ['Required', input.required ? 'Yes' : 'No'], ...input.options ? [['Options', input.options.join(', ')]] : []] } }
        openDetail()
        renderDetail()
      })
      tree.appendChild(row)
    })
  })
  if (json) { json.replaceChildren(); json.appendChild(makeEl('pre', 'json-view', JSON.stringify(productData.model, null, 2))) }
}

const renderAttributesTab = () => {
  const el = g('pane-attributes'); if (!el || !productData) return; el.replaceChildren()
  const a = productData.attributes
  ;[['Product Attributes', a.productAttributes, attr => [attr.name, String(attr.value)]], ['Input Attributes', a.inputAttributes, attr => [attr.name, `${attr.type}: ${JSON.stringify(attr.values)}`]]].forEach(([label, items, fmt]) => {
    if (!items?.length) return
    const sec = makeEl('div', 'pane-section'); sec.appendChild(makeEl('b', null, label))
    const grid = makeEl('div', 'data-grid')
    items.forEach(item => { const [k, v] = fmt(item); const row = makeEl('div', 'data-row'); row.appendChild(makeEl('span', 'data-key', k)); row.appendChild(makeEl('span', null, v)); grid.appendChild(row) })
    sec.appendChild(grid); el.appendChild(sec)
  })
}

const renderRulesTab = () => {
  const el = g('pane-rules'); if (!el || !productData) return; el.replaceChildren()
  const r = productData.rules
  ;[['Logic Groups', r.logicGroups, i => i.name], ['Logic Items', r.logicItems, i => `${i.name} (${i.type})`], ['Driven Inputs', r.drivenInputs, i => i.description], ['Input Filters', r.inputFilters, i => `Input ${i.filteredInputNum} filtered by ${i.filteringInputNum} (${i.attribute})`], ['Iterators', r.iterators, i => `${i.code} — ${i.description}`]].forEach(([label, items, fmt]) => {
    if (!items?.length) return
    const sec = makeEl('div', 'pane-section'); sec.appendChild(makeEl('b', null, label))
    const grid = makeEl('div', 'data-grid')
    items.forEach(item => { const row = makeEl('div', 'data-row'); row.appendChild(makeEl('span', null, fmt(item))); grid.appendChild(row) })
    sec.appendChild(grid); el.appendChild(sec)
  })
}

const renderEquationsTab = () => {
  const el = g('pane-equations'); if (!el || !productData) return; el.replaceChildren()
  ;(productData.equations ?? []).forEach(eq => {
    const sec = makeEl('div', 'equation-card')
    const header = makeEl('div', 'equation-header'); header.appendChild(makeEl('b', null, eq.label)); header.appendChild(makeEl('span', 'data-type', `→ ${eq.outputField}`)); sec.appendChild(header)
    sec.appendChild(makeEl('code', 'equation-expr', eq.expression))
    if (eq.variables?.length) { const vars = makeEl('div', 'equation-vars'); eq.variables.forEach(v => vars.appendChild(makeEl('span', 'data-type', `${v.name} (input ${v.inputNum})`))); sec.appendChild(vars) }
    el.appendChild(sec)
  })
}

const renderResultsTab = () => {
  const el = g('pane-results'); if (!el || !productData) return; el.replaceChildren()
  const r = productData.results
  ;[['Item Families', r.itemFamilies, i => `${i.name} — ${i.description}`], ['Item Masters', r.itemMasters, i => `${i.smartPartNumber} — ${i.description} (${i.type})`], ['BOM Skeleton', r.bomSkeleton, i => `${'  '.repeat(i.level)}${i.referenceName} × ${i.quantity.value ?? i.quantity.inputName ?? i.quantity.equationName}${i.includedByDefault ? '' : ' (optional)'}`], ['Driven Item Masters', r.drivenItemMasters, i => i.description], ['Product Outputs', r.productOutputs, i => `${i.name} (${i.type})`]].forEach(([label, items, fmt]) => {
    if (!items?.length) return
    const sec = makeEl('div', 'pane-section'); sec.appendChild(makeEl('b', null, label))
    const grid = makeEl('div', 'data-grid')
    items.forEach(item => { const row = makeEl('div', 'data-row'); row.appendChild(makeEl('span', null, fmt(item))); grid.appendChild(row) })
    sec.appendChild(grid); el.appendChild(sec)
  })
}

const renderPreviewTab = () => {
  const el = g('pane-preview'); if (!el || !productData) return; el.replaceChildren()
  const form = makeEl('div', 'preview-form')
  ;(productData.model.inputGroups ?? []).forEach(group => {
    const sec = makeEl('div', 'preview-section'); sec.appendChild(makeEl('b', null, group.name))
    const fields = makeEl('div', 'preview-fields')
    ;(productData.model.inputs ?? []).filter(i => i.groupNum === group.num).forEach(input => {
      const field = makeEl('div', 'preview-field'); field.appendChild(makeEl('label', null, input.label))
      if (input.type === 'dropdown') { const sel = document.createElement('select'); (input.options ?? []).forEach(opt => { const o = document.createElement('option'); o.value = opt; o.textContent = opt; if (opt === String(input.default)) o.selected = true; sel.appendChild(o) }); field.appendChild(sel) }
      else if (input.type === 'toggle') { const chk = document.createElement('input'); chk.type = 'checkbox'; chk.checked = !!input.default; field.appendChild(chk) }
      else { const inp = document.createElement('input'); inp.type = input.type === 'numeric' ? 'number' : 'text'; if (input.default !== undefined) inp.value = input.default; field.appendChild(inp) }
      fields.appendChild(field)
    })
    sec.appendChild(fields); form.appendChild(sec)
  })
  el.appendChild(form)
}

const renderCommitTab = () => {
  const el = g('pane-commit'); if (!el || !productData) return; el.replaceChildren()
  const manifest = [[1, 'Product'], [productData.model.inputGroups?.length ?? 0, 'Input Groups'], [productData.model.inputs?.length ?? 0, 'Inputs'], [productData.model.inputValues?.length ?? 0, 'Input Values'], [productData.rules.logicGroups?.length ?? 0, 'Logic Groups'], [productData.rules.logicItems?.length ?? 0, 'Logic Items'], [productData.equations?.length ?? 0, 'Equations'], [productData.results.itemMasters?.length ?? 0, 'Item Masters'], [productData.results.bomSkeleton?.length ?? 0, 'BOM Lines']].filter(([c]) => c)
  const total = manifest.reduce((s, [c]) => s + c, 0)
  const view = makeEl('div', 'commit-view'); view.appendChild(makeEl('b', null, 'Draft Summary'))
  const list = makeEl('div', 'data-grid')
  manifest.forEach(([count, label]) => { const row = makeEl('div', 'data-row'); row.appendChild(makeEl('span', 'data-count', String(count))); row.appendChild(makeEl('span', null, label)); list.appendChild(row) })
  list.appendChild(makeEl('div', 'data-row-total', `${total} items total`))
  view.appendChild(list); el.appendChild(view)
}

const renderTabContent = () => { if (!productData) return; renderModelTab(); renderAttributesTab(); renderRulesTab(); renderEquationsTab(); renderResultsTab(); renderPreviewTab(); renderCommitTab() }

// Main render

const render = () => {
  g('workspace-title').textContent = state.workspace.title
  g('workspace-status').textContent = state.workspace.status
  g('workspace-context').textContent = `Context ${state.context}%`
  g('chat-input').placeholder = state.placeholder
  q('.chip-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === state.activeTab))
  q('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `pane-${state.activeTab}`))
  renderWorkflowBar()
  renderChat()
  renderChatStatus()
  renderFilesList()
  renderAllStats()
  renderTabContent()
  renderDetail()
}

// Continue — walks the demo script

const demoContinue = userText => {
  const step = currentStep()
  if (!step) return
  if (activeAutomation) return

  // If next step is a build phase, trigger build
  const next = demo()[state.demoIndex + 1]
  if (next?.buildPhase) {
    startBuild()
    return
  }

  const msg = userText ?? (step.actions ? step.actions.find(a => !a.disabled)?.label : step.response)
  if (msg) state.messages.push(msg)
  state.status = 'Architect is working…'
  render()

  setTimeout(() => {
    state.status = null
    advanceStep()
  }, 1000)
}

// Build — finds and chains all build-phase steps

let buildQueue = []

const startBuild = () => {
  if (activeAutomation) return
  state.messages.push('Build')
  buildQueue = demo().reduce((acc, s, i) => i > state.demoIndex && s.buildPhase ? [...acc, i] : acc, [])
  nextBuildPhase()
}

const nextBuildPhase = () => {
  if (!buildQueue.length) {
    const source = demo().find(s => s.productData)
    if (!source) return
    fetch(source.productData).then(r => r.json()).then(pd => {
      productData = pd
      state.workspace.status = pd.product.name
      state.activeTab = 'model'
      state.messages.push({ type: 'result-card', label: 'Build complete', detail: `${pd.model.inputs.length} inputs · ${pd.rules.logicItems.length} logic items · ${pd.results.bomSkeleton.length} BOM lines`, tab: 'model' })
      render()
    })
    return
  }
  enterStep(buildQueue.shift())
}

// Collapsible panels

const initStrip = (stripId, toggleId) => {
  const strip = g(stripId)
  g(toggleId).addEventListener('click', e => { e.stopPropagation(); strip.classList.toggle('collapsed') })
  strip.addEventListener('click', () => { if (strip.classList.contains('collapsed')) strip.classList.remove('collapsed') })
}

initStrip('sidenav', 'nav-toggle')
initStrip('chat-panel', 'chat-toggle')

const openDetail = () => { g('detail-panel').classList.remove('collapsed'); g('detail-overlay').hidden = false }
const closeDetail = () => { g('detail-panel').classList.add('collapsed'); g('detail-overlay').hidden = true }
g('detail-toggle').addEventListener('click', closeDetail)
g('detail-overlay').addEventListener('click', closeDetail)

g('quick-actions-header').addEventListener('click', () => g('quick-actions').classList.toggle('collapsed'))

q('.pill').forEach(pill => pill.addEventListener('click', () => {
  if (pill.textContent === 'Continue') demoContinue()
  if (pill.textContent === 'Update') { const idx = demo().findIndex((s, i) => i > state.demoIndex && s.steps && !s.buildPhase); if (idx >= 0) enterStep(idx) }
  if (pill.textContent === 'Build') startBuild()
}))

q('.sub-tab').forEach(tab => tab.addEventListener('click', () => {
  const parent = tab.closest('.tab-pane')
  parent.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'))
  parent.querySelectorAll('.sub-pane').forEach(p => p.classList.remove('active'))
  tab.classList.add('active')
  parent.querySelector(`#subpane-${tab.dataset.subtab}`)?.classList.add('active')
}))

q('.chip-tab').forEach(tab => tab.addEventListener('click', () => {
  state.activeTab = tab.dataset.tab
  render()
  if (tab.dataset.tab === 'files' && filesGrid) { filesGrid.autoSizeAllColumns(); filesGrid.sizeColumnsToFit() }
}))

const submitInput = () => {
  const input = g('chat-input')
  const val = input.value.trim()
  if (!val) return
  input.value = ''
  demoContinue(val)
}

g('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') submitInput() })
g('send-btn').addEventListener('click', submitInput)
g('reset-btn').addEventListener('click', () => { reset(); render() })

// Init

fetch('fixtures.json').then(r => r.json()).then(fx => { fixtures = fx; workflows = fx.workflows ?? {}; enterStep(0) })
