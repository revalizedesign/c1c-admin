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
  { field: 'name', headerName: 'Name', minWidth: 160 },
  { cellRenderer: p => {
    const labels = { csv: 'CSV', md: 'Markdown', pdf: 'PDF' }
    const label = labels[p.value] ?? p.value?.toUpperCase()
    const el = makeEl('span', 'cell-filter', label)
    el.addEventListener('click', e => { e.stopPropagation(); state.filters.files = new Set([p.value]); filesGrid.onFilterChanged(); renderFilesToolbar() })
    return el
  }, field: 'type', headerName: 'Type' },
  { field: 'size', headerName: 'Size', type: 'rightAligned' },
  { field: 'pages', headerName: 'Pages', type: 'rightAligned' },
  { field: 'owner', headerName: 'Owner' },
  { field: 'created', headerName: 'Created' },
]


// State

const merge = (base, over) => {
  const result = { ...base }
  for (const [k, v] of Object.entries(over)) {
    result[k] = v && typeof v === 'object' && !Array.isArray(v) && result[k] && typeof result[k] === 'object' && !Array.isArray(result[k]) ? merge(result[k], v) : v
  }
  return result
}

const buildDemoSequences = (shared, demoFile) => {
  const seqs = {}
  for (const [key, seq] of Object.entries(shared)) {
    const overrides = demoFile.overrides?.[key]
    seqs[key] = overrides ? { ...seq, steps: seq.steps.map((step, i) => overrides[i] ? merge(step, overrides[i]) : { ...step }) } : structuredClone(seq)
  }
  if (demoFile.sequences) Object.assign(seqs, demoFile.sequences)
  return seqs
}

const createWorkspace = (demoId = 0, sequence = 'onboarding') => ({
  activeAutomation: null,
  activeTab: 'overview',
  context: 0,
  demoId,
  demoIndex: 0,
  files: [],
  filters: {},
  lastElapsed: null,
  messages: [],
  name: demos[demoId]?.name ?? 'New workspace',
  placeholder: g('chat-input').placeholder,
  productData: null,
  selectedFile: null,
  sequence,
  skipIndustry: Math.random() > 0.5,
  status: null,
  statusInterval: null,
  workflow: null,
  workflowStartTime: null,
})

let workflows = {}
let fixtures = {}
let filesGrid = null
const demos = []
const workspaces = []
let activeWorkspaceId = 0
let state = {}

const demo = () => demos[state.demoId]?.sequences?.[state.sequence]?.steps ?? []
const currentStep = () => demo()[state.demoIndex]
const pushMsg = msg => { if (typeof msg === 'object' && msg !== null) msg.time = new Date().toLocaleTimeString(); state.messages.push(msg) }

const switchWorkspace = id => {
  activeWorkspaceId = id
  state = workspaces[id]
  if (modelGrid) { modelGrid.destroy(); modelGrid = null }
  if (modelTree) { modelTree.destroy(); modelTree = null }
  if (resultsGrid) { resultsGrid.destroy(); resultsGrid = null }
  if (rulesGrid) { rulesGrid.destroy(); rulesGrid = null }
  if (rulesTree) { rulesTree.destroy(); rulesTree = null }
  render()
}

const lockedFiles = () => workspaces.flatMap(ws => ws.files.filter(f => f.locked))

const addWorkspace = (demoId = state.demoId ?? 0) => {
  const ws = createWorkspace(demoId, 'triage')
  const seen = new Set()
  lockedFiles().forEach(f => { if (!seen.has(f.name)) { seen.add(f.name); ws.files.push({ ...f }) } })
  workspaces.push(ws)
  switchWorkspace(workspaces.length - 1)
  enterStep(0)
}

const reset = () => {
  if (state.statusInterval) { clearInterval(state.statusInterval); state.statusInterval = null }
  if (modelGrid) { modelGrid.destroy(); modelGrid = null }
  if (modelTree) { modelTree.destroy(); modelTree = null }
  if (resultsGrid) { resultsGrid.destroy(); resultsGrid = null }
  if (rulesGrid) { rulesGrid.destroy(); rulesGrid = null }
  if (rulesTree) { rulesTree.destroy(); rulesTree = null }
  const { demoId, sequence } = state
  const id = activeWorkspaceId
  workspaces[id] = createWorkspace(demoId, sequence)
  state = workspaces[id]
  enterStep(0)
}

// Step engine

const enterStep = idx => {
  state.demoIndex = idx
  const step = demo()[idx]
  if (!step) {
    const next = demos[state.demoId]?.sequences?.[state.sequence]?.next
    if (next) { state.sequence = next; enterStep(0); return }
    state.status = null; render(); return
  }
  if (step.workspace) state.name = step.workspace
  if (step.workflow) state.workflow = { id: step.workflow, step: 0 }
  state.placeholder = step.placeholder ?? g('chat-input').dataset.default
  if (step.preloadFiles) step.preloadFiles.forEach(f => addContextFile(f))

  // Skippable step
  if (step.skip && state.skipIndustry) {
    pushMsg({ type: 'agent', text: step.skip.agent })
    if (step.file) addContextFile(step.file)
    enterStep(idx + 1)
    return
  }

  if (step.agent) pushMsg({ type: 'agent', text: step.agent })

  // Automated step — has sub-steps to run
  if (step.steps) {
    state.workflowStartTime = Date.now()
    if (step.file) {
      const pendingFile = { ...step.file, progress: 0 }
      pushMsg({ type: 'file-card', file: pendingFile })
      state.activeAutomation = { stepIdx: 0, fileMsg: state.messages[state.messages.length - 1] }
    } else {
      state.activeAutomation = { stepIdx: 0 }
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
  if (userText) pushMsg(userText)

  // Add file if step produces one
  if (step.file) addContextFile(step.file)

  // Recap — collapse messages before advancing
  if (step.recap) {
    if (step.files) step.files.forEach(f => {
      const file = state.files.find(sf => sf.name === f.label)
      if (file) pushMsg({ type: 'file-card', file })
    })
    const archived = [...state.messages]
    state.messages = [{ type: 'collapsed-messages', archived, expanded: false }]
    if (step.files) {
      const wf = state.workflow && workflows[state.workflow.id]
      pushMsg({ type: 'recap', files: step.files, label: `${wf?.name ?? 'Workflow'} complete` })
    }
    if (step.context) state.context = step.context
  }

  // Action selection
  if (step.actions) {
    const action = step.actions.find(a => a.label === userText) ?? step.actions.find(a => !a.disabled)
    if (action.workflow) state.workflow = { id: action.workflow, step: 0 }
    if (action.response) pushMsg({ type: 'agent', text: action.response })
    if (action.actions) pushMsg({ type: 'actions', actions: action.actions.map(label => ({ label, handler: () => { state.messages = state.messages.filter(m => m.type !== 'actions'); pushMsg(label); state.name = label; render() } })) })
    if (action.placeholder) state.placeholder = action.placeholder
    if (action.sequence) { state.sequence = action.sequence; enterStep(0) }
    else enterStep(state.demoIndex + 1)
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
  if (!state.activeAutomation) return
  const step = currentStep()
  const steps = step.steps ?? []
  if (state.statusInterval) { clearInterval(state.statusInterval); state.statusInterval = null }

  if (state.activeAutomation.stepIdx >= steps.length) {
    if (state.activeAutomation.fileMsg) state.activeAutomation.fileMsg.file.progress = 1
    state.workflow.step = steps.length
    state.status = null

    if (step.tab) state.activeTab = step.tab

    if (step.file) {
      const a = step.assessment ?? {}
      const detail = [a.pages && `${a.pages} pages`, a.tables && `${a.tables} tables`].filter(Boolean).join(' · ')
      const file = { ...step.file, assessment: a, detail: detail || undefined, progress: 1 }
      state.files.push(file)
      if (step.productSummary) updateProductSummary(step.productSummary, step.assessment)
      state.selectedFile = file
      if (!step.tab) state.activeTab = 'files'
      state.name = step.label ?? file.name
      if (state.activeAutomation.fileMsg) {
        state.activeAutomation.fileMsg.file = file
      } else {
        pushMsg({ type: 'file-card', file })
      }
    } else if (step.label) {
      const detail = steps.map(s => s.detail).pop()
      pushMsg({ type: 'result-card', label: step.label, detail, tab: step.tab })
      if (step.productData) {
        fetch(step.productData).then(r => r.json()).then(pd => {
          state.productData = pd
          state.name = pd.product.name
          render()
        })
      }
    }

    pushElapsed()
    state.activeAutomation = null
    if (step.file) openDetail()
    render()
    return
  }

  const sub = steps[state.activeAutomation.stepIdx]
  state.workflow.step = state.activeAutomation.stepIdx
  if (sub.context) state.context = sub.context
  const totalFrames = steps.reduce((n, s) => n + (s.statusFrames?.length ?? 1), 0)
  const framesCompleted = steps.slice(0, state.activeAutomation.stepIdx).reduce((n, s) => n + (s.statusFrames?.length ?? 1), 0)
  if (state.activeAutomation.fileMsg) state.activeAutomation.fileMsg.file.progress = framesCompleted / totalFrames
  const frames = sub.statusFrames ?? [`${sub.step}…`]
  state.status = frames[0]
  render()

  if (frames.length > 1) {
    let frameIdx = 0
    state.statusInterval = setInterval(() => {
      frameIdx++
      if (frameIdx >= frames.length) frameIdx = 0
      state.status = frames[frameIdx]
      q('.status-text').forEach(el => el.textContent = frames[frameIdx])
      if (state.activeAutomation?.fileMsg) {
        const p = (framesCompleted + frameIdx + 1) / totalFrames
        state.activeAutomation.fileMsg.file.progress = p
        q('.file-card-progress').forEach(el => el.style.width = `${Math.round(p * 100)}%`)
      }
    }, sub.ms / frames.length)
  }

  state.activeAutomation.stepIdx++
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
  if (!state.workflowStartTime) return
  const secs = Math.round((Date.now() - state.workflowStartTime) / 1000)
  const wf = state.workflow && workflows[state.workflow.id]
  const label = `${wf?.name ?? 'Workflow'} ran for ${secs}s`
  state.lastElapsed = label
  pushMsg({ type: 'agent', text: label })
  state.workflowStartTime = null
}

// Render helpers

const renderCard = msg => {
  const card = makeEl('div', 'file-card')
  // Icon
  const iconClass = msg.icon ?? (msg.file?.type === 'pdf' ? 'fa-regular fa-file-pdf' : msg.file ? 'fa-regular fa-file' : 'fa-regular fa-cube')
  const icon = makeEl('i'); icon.className = iconClass
  card.appendChild(icon)
  // Title + optional detail
  const title = msg.label ?? msg.file?.name
  const fileMeta = msg.file ? [msg.file.size, msg.file.detail].filter(Boolean) : []
  const detail = msg.detail ?? (fileMeta.length > 1 ? fileMeta.join(' · ') : null)
  const meta = detail ?? (msg.files ? `${msg.files.length} files saved` : fileMeta.length === 1 ? fileMeta[0] : null)
  if (title && detail) {
    const text = makeEl('div', 'card-text')
    text.appendChild(makeEl('b', 'file-card-name', title))
    text.appendChild(makeEl('span', 'file-card-meta', detail))
    card.appendChild(text)
  } else {
    if (title) card.appendChild(makeEl('b', 'file-card-name', title))
    if (meta) card.appendChild(makeEl('span', 'file-card-meta', meta))
  }
  // Chevron
  const chevron = makeEl('i'); chevron.className = 'fa-solid fa-angle-right'
  card.appendChild(chevron)
  // Progress bar
  const progress = msg.file?.progress
  if (progress !== undefined && !msg.file?.detail) {
    const bar = makeEl('div', 'file-card-progress')
    bar.style.width = `${Math.round(progress * 100)}%`
    card.appendChild(bar)
  }
  // Click
  card.addEventListener('click', () => {
    if (msg.file) { state.selectedFile = msg.file; state.activeTab = 'files'; openDetail() }
    else if (msg.tab) state.activeTab = msg.tab
    else state.activeTab = 'files'
    render()
  })
  return card
}

const renderMessage = msg => {
  const t = msg?.time ?? ''
  const stamped = el => { if (t) el.title = t; return el }
  if (typeof msg === 'string') return makeEl('div', 'chat-bubble', msg)
  if (msg.type === 'agent') return stamped(makeEl('div', 'chat-bubble agent', msg.text))
  if (msg.type === 'tool') {
    const el = makeEl('div', 'chat-tool')
    el.appendChild(makeEl('span', 'chat-tool-label', msg.label))
    el.appendChild(makeEl('span', 'chat-tool-detail', msg.detail))
    return stamped(el)
  }
  if (msg.type === 'card' || msg.type === 'result-card' || msg.type === 'build-card' || msg.type === 'file-card' || msg.type === 'recap') {
    return stamped(renderCard(msg))
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
  if (state.status) {
    const sc = makeEl('div', 'status-card')
    sc.appendChild(makeEl('span', 'spinner'))
    sc.appendChild(makeEl('span', 'status-text', state.status))
    bar.appendChild(sc)
  } else {
    bar.appendChild(makeEl('span', 'status', state.lastElapsed ?? 'Awaiting human input'))
  }
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
  if (step.card && !state.activeAutomation) {
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
  if (step.files && !state.activeAutomation) {
    const group = makeEl('div', 'card-group')
    step.files.forEach(f => {
      const file = state.files.find(sf => sf.name === f.label)
      if (file) group.appendChild(renderMessage({ type: 'file-card', file }))
    })
    if (group.children.length) el.appendChild(group)
  }

  // Button
  if (step.button && !state.activeAutomation) {
    const btn = makeEl('button', 'button primary', step.button)
    btn.style.alignSelf = 'flex-start'
    btn.type = 'button'
    btn.addEventListener('click', () => advanceStep(step.button))
    el.appendChild(btn)
  }

  // Actions
  if (step.actions && !state.activeAutomation) {
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
  if (state.activeAutomation && state.workflow) {
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

const renderStatusAndActions = () => {
  const el = g('status-and-actions')
  if (!el) return
  el.replaceChildren()
  if (state.status) {
    const inner = makeEl('div', 'status-card')
    inner.appendChild(makeEl('span', 'spinner'))
    inner.appendChild(makeEl('span', 'status-text', state.status))
    el.appendChild(inner)
  } else {
    el.appendChild(makeEl('span', 'status', state.lastElapsed ?? 'Awaiting human input'))
    const step = currentStep()
    const pills = state.activeAutomation ? [] : (step?.pills ?? [])
    if (pills.length) {
      const wrap = makeEl('div', 'action-pills')
      pills.forEach(p => {
        const pill = makeEl('button', p.demo ? 'pill pill-demo' : 'pill', p.label)
        pill.type = 'button'
        pill.addEventListener('click', () => demoContinue())
        wrap.appendChild(pill)
      })
      el.appendChild(wrap)
    }
  }
}

const renderFilesToolbar = () => {
  const types = [...new Set(state.files.map(f => f.type))].sort()
  const labels = { csv: 'CSV', md: 'Markdown', pdf: 'PDF' }
  const active = state.filters.files
  const filters = [
    { active: !active, label: 'All files', action: () => { state.filters.files = null; if (filesGrid) filesGrid.onFilterChanged(); renderFilesToolbar() } },
    ...types.map(t => ({ active: active?.has(t), label: labels[t] ?? t.toUpperCase(), action: () => { state.filters.files = new Set([t]); if (filesGrid) filesGrid.onFilterChanged(); renderFilesToolbar() } })),
  ]
  buildPaneToolbar(g('files-toolbar'), { filters, getGrid: () => filesGrid })
}

const gridDefaults = { editable: true, filter: 'agTextColumnFilter', resizable: true, sortable: true, suppressSizeToFit: true }
const actionsCol = {
  cellRenderer: p => {
    const btn = makeEl('button', 'button button-icon action-btn')
    const icon = makeEl('i'); icon.className = 'fa-regular fa-ellipsis'
    btn.appendChild(icon)
    btn.onclick = e => {
      e.stopPropagation()
      if (!p.data) return
      if (detailMode === 'hover') { openHoverCard(p.data.name ?? '', buildDetailContent(p.data, p.api)); return }
      state.selectedFile = p.data; openDetail(); renderDetail()
    }
    return btn
  },
  filter: false,
  headerName: 'Actions',
  sortable: false,
  suppressHeaderMenuButton: true,
  suppressSizeToFit: false,
}

const gridCommon = () => ({
  cellSelection: true,
  defaultColDef: gridDefaults,
  getContextMenuItems: gridContextMenu,
  onRowDoubleClicked: e => {
    if (!e.data) return
    if (detailMode === 'hover') { openHoverCard(e.data.name ?? '', buildDetailContent(e.data, e.api)); return }
    state.selectedFile = e.data; openDetail(); renderDetail()
  },
  popupParent: document.body,
  rowSelection: { checkboxes: true, headerCheckbox: true, mode: 'multiRow' },
  selectionColumnDef: { pinned: 'left', suppressSizeToFit: true },
  theme: gridTheme(),
})

const emptyState = (el, key) => {
  const cfg = fixtures.emptyStates?.[key]
  if (!cfg) return
  el.replaceChildren()
  const wrap = makeEl('div', 'empty-grid')
  wrap.appendChild(makeEl('div', 'empty-grid-header'))
  const body = makeEl('div', 'empty-grid-body')
  const iconBox = makeEl('div', 'empty-grid-icon')
  const ic = makeEl('i'); ic.className = cfg.icon
  iconBox.appendChild(ic)
  body.appendChild(iconBox)
  body.appendChild(makeEl('b', null, cfg.title))
  const desc = makeEl('p', null, cfg.description)
  body.appendChild(desc)
  if (cfg.link) {
    const link = makeEl('a', 'button outline', cfg.link.label)
    link.href = cfg.link.url
    link.target = '_blank'
    body.appendChild(link)
  }
  wrap.appendChild(body)
  el.appendChild(wrap)
}

const buildPaneToolbar = (toolbarEl, { filters, modes, getGrid, paneId }) => {
  toolbarEl.replaceChildren()
  if (modes) {
    const bar = makeEl('nav', 'tab-bar')
    modes.forEach(m => {
      const tab = makeEl('button', `button tab${m.active ? ' active' : ''}`)
      const icon = makeEl('i'); icon.className = m.icon
      tab.appendChild(icon)
      tab.appendChild(document.createTextNode(` ${m.label}`))
      tab.onclick = () => {
        bar.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
        tab.classList.add('active')
        const pane = g(paneId)
        pane.querySelectorAll('.pane-content').forEach(p => p.classList.remove('active'))
        g(m.target)?.classList.add('active')
        const showTableControls = m.label === 'Table' || m.label === 'Attributes'
        toolbarEl.querySelectorAll('.tab-bar.line, .button.outline, .toolbar-search').forEach(el => el.style.display = showTableControls ? '' : 'none')
        m.onActivate?.()
      }
      bar.appendChild(tab)
    })
    toolbarEl.appendChild(bar)
  }
  if (filters) {
    const line = makeEl('nav', 'tab-bar line')
    filters.forEach(f => {
      const tab = makeEl('button', `button tab${f.active ? ' active' : ''}`)
      tab.appendChild(document.createTextNode(f.label))
      tab.onclick = () => {
        line.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
        tab.classList.add('active')
        f.action?.()
      }
      line.appendChild(tab)
    })
    toolbarEl.appendChild(line)
  }
  toolbarEl.appendChild(makeEl('div', 'fill'))
  if (getGrid) {
    const search = makeEl('input', 'toolbar-search')
    search.type = 'search'
    let expanded = true
    const expandIcon = makeEl('i'); expandIcon.className = 'fa-regular fa-arrows-from-line'
    const expandBtn = makeEl('button', 'button outline')
    expandBtn.appendChild(expandIcon)
    expandBtn.title = 'Expand / Collapse all'
    expandBtn.onclick = () => { expanded = !expanded; expanded ? getGrid()?.expandAll() : getGrid()?.collapseAll() }
    toolbarEl.appendChild(expandBtn)
    search.placeholder = 'Search…'
    search.oninput = () => getGrid()?.setGridOption('quickFilterText', search.value)
    toolbarEl.appendChild(search)
    const filterIcon = makeEl('i'); filterIcon.className = 'fa-regular fa-bars-filter'
    const filterBtn = makeEl('button', 'button outline')
    filterBtn.appendChild(filterIcon)
    filterBtn.appendChild(document.createTextNode(' Filter'))
    filterBtn.onclick = () => {
      const active = filterBtn.classList.toggle('active')
      getGrid()?.setGridOption('defaultColDef', { ...gridDefaults, floatingFilter: active })
    }
    const colsIcon = makeEl('i'); colsIcon.className = 'fa-regular fa-table-columns'
    const colsBtn = makeEl('button', 'button outline')
    colsBtn.appendChild(colsIcon)
    colsBtn.appendChild(document.createTextNode(' Columns'))
    colsBtn.onclick = () => getGrid()?.showColumnChooser()
    toolbarEl.appendChild(filterBtn)
    toolbarEl.appendChild(colsBtn)
  }
}

const gridContextMenu = params => {
  if (!params.node) return params.defaultItems
  const rowData = []
  params.api.forEachNode(n => rowData.push(n.data))
  const idx = rowData.findIndex(r => r === params.node.data)
  const empty = Object.fromEntries(Object.keys(params.node.data).map(k => [k, '']))
  return [
    { name: 'Insert before', action: () => params.api.applyTransaction({ add: [{ ...empty }], addIndex: idx }) },
    { name: 'Insert after', action: () => params.api.applyTransaction({ add: [{ ...empty }], addIndex: idx + 1 }) },
    'separator',
    { name: 'Delete', action: () => params.api.applyTransaction({ remove: [params.node.data] }) },
    'separator',
    ...params.defaultItems,
  ]
}

const renderFilesList = () => {
  const el = g('files-grid')
  if (!el) return
  const rows = state.files.map(f => ({ created: f.created ?? '', locked: f.locked ?? false, name: f.name, owner: f.owner ?? 'Agent', pages: f.assessment?.pages ?? f.pages ?? '', size: f.size, source: f.source ?? 'Uploaded', type: f.type }))
  if (filesGrid) {
    filesGrid.setGridOption('rowData', rows)
    sizeActiveGrid()
    renderFilesToolbar()
    return
  }
  if (state.activeTab !== 'files') return
  filesGrid = agGrid.createGrid(el, {
    ...gridCommon(),
    columnDefs: [...fileCols, actionsCol],
    doesExternalFilterPass: node => state.filters.files.has(node.data.type),
    getRowClass: p => p.data?.name === state.selectedFile?.name ? 'row-active' : '',
    isExternalFilterPresent: () => state.filters.files != null,
    rowData: rows,
    onRowClicked: e => {
      const file = state.files.find(f => f.name === e.data.name)
      if (!file) return
      if (detailMode === 'hover') { openHoverCard(file.name, buildDetailContent(file)); return }
      state.selectedFile = file; filesGrid.redrawRows(); openDetail(); renderDetail()
    },
  })
  renderFilesToolbar()
}

const addField = (form, draft, key, label, opts = {}) => {
  const field = makeEl('div', 'detail-field')
  const lbl = makeEl('label', null, label)
  lbl.setAttribute('for', `detail-${key}`)
  field.appendChild(lbl)
  if (opts.type === 'checkbox') {
    const input = makeEl('input'); input.type = 'checkbox'; input.id = `detail-${key}`; input.checked = !!draft[key]
    input.onchange = () => { draft[key] = input.checked }
    field.appendChild(input)
  } else if (opts.type === 'select' && opts.options) {
    const select = makeEl('select'); select.id = `detail-${key}`
    opts.options.forEach(o => { const opt = makeEl('option', null, o); opt.value = o; if (draft[key] === o) opt.selected = true; select.appendChild(opt) })
    select.onchange = () => { draft[key] = select.value }
    field.appendChild(select)
  } else if (opts.type === 'textarea') {
    const input = makeEl('textarea'); input.id = `detail-${key}`; input.value = draft[key] ?? ''; input.rows = opts.rows ?? 3; input.placeholder = opts.placeholder ?? ''
    input.oninput = () => { draft[key] = input.value }
    field.appendChild(input)
  } else {
    const input = makeEl('input'); input.type = opts.type ?? 'text'; input.id = `detail-${key}`; input.value = draft[key] ?? ''; input.placeholder = opts.placeholder ?? label
    if (opts.readonly) input.readOnly = true
    input.oninput = () => { draft[key] = input.type === 'number' ? Number(input.value) : input.value }
    field.appendChild(input)
  }
  form.appendChild(field)
}

const formSchemas = {
  group: (form, draft) => {
    addField(form, draft, 'name', 'Group name', { placeholder: 'e.g. Top Options' })
  },
  input: (form, draft) => {
    addField(form, draft, 'name', 'Label', { placeholder: 'e.g. Wood Finish' })
    addField(form, draft, 'id', 'Input name', { placeholder: 'e.g. WOOD_FINISH', readonly: true })
    addField(form, draft, 'type', 'Input type', { type: 'select', options: ['Attribute display', 'Checkbox', 'Dropdown', 'Hidden', 'Radio', 'Slider', 'Text'] })
    addField(form, draft, 'default', 'Default value', { placeholder: 'Default input value' })
    addField(form, draft, 'options', 'Options', { type: 'textarea', placeholder: 'One value per line', rows: 4 })
  },
  value: (form, draft) => {
    addField(form, draft, 'name', 'Display name', { placeholder: 'e.g. Cherry' })
    addField(form, draft, 'value', 'Value code', { placeholder: 'e.g. CHR' })
  },
  logic_item: (form, draft) => {
    addField(form, draft, 'name', 'Name', { placeholder: 'e.g. Ask Table Design' })
    addField(form, draft, 'ruleType', 'Type', { readonly: true })
    addField(form, draft, 'action', 'Action', { placeholder: 'e.g. Ask Input Group: Table Design' })
    addField(form, draft, 'detail', 'Condition', { placeholder: 'e.g. IF CONNECTIVITY = Y' })
  },
  result: (form, draft) => {
    addField(form, draft, 'itemNumber', 'Item number')
    addField(form, draft, 'description', 'Description')
    addField(form, draft, 'qty', 'Quantity', { type: 'number' })
    addField(form, draft, 'uom', 'Unit of measure')
    addField(form, draft, 'source', 'Source', { readonly: true })
    addField(form, draft, 'resolution', 'Resolution', { readonly: true })
    addField(form, draft, 'included', 'Included', { type: 'checkbox' })
  },
}

const getFormSchema = data => {
  if (data.type && ({ md: 1, pdf: 1, csv: 1 })[data.type]) return null
  if (data.nodeType === 'group') return 'group'
  if (data.nodeType === 'input') return 'input'
  if (data.nodeType === 'value') return 'value'
  if (data.ruleType) return 'logic_item'
  if (data.itemNumber !== undefined || data.resolution !== undefined) return 'result'
  return null
}

const buildDetailContent = (data, api) => {
  const view = makeEl('div', 'detail-view')
  if (data.type && ({ md: 1, pdf: 1, csv: 1 })[data.type]) return buildFileDetail(data, view)
  const schemaKey = getFormSchema(data)
  const schema = formSchemas[schemaKey]
  if (!schema) return view
  const form = makeEl('form', 'detail-form')
  form.addEventListener('submit', e => e.preventDefault())
  const draft = { ...data }
  schema(form, draft)
  view.appendChild(form)
  if (schemaKey === 'input' && state.productData) {
    const attrLabel = makeEl('b', null, 'Attributes')
    attrLabel.style.marginTop = '0.75rem'
    view.appendChild(attrLabel)
    const inputNum = state.productData.model?.inputs?.find(i => i.id === data.id)?.num
    const attrs = (state.productData.attributes?.inputAttributes ?? []).filter(a => a.driverInputNum === inputNum)
    const values = (state.productData.model?.inputValues ?? []).filter(v => v.inputNum === inputNum)
    const attrRows = values.map(val => {
      const row = { label: val.label, value: val.value }
      attrs.forEach(a => { row[a.name] = a.values[val.value] ?? '' })
      return row
    })
    const gridEl = makeEl('div', 'detail-attr-grid')
    view.appendChild(gridEl)
    const cols = [{ field: 'label', headerName: 'Value' }, ...attrs.map(a => ({ field: a.name, headerName: a.name }))]
    if (!attrRows.length) {
      view.appendChild(makeEl('p', 'detail-empty-attrs', 'No attributes defined for this input.'))
    } else {
      agGrid.createGrid(gridEl, {
        columnDefs: cols,
        defaultColDef: { editable: true, resizable: true, sortable: true },
        onFirstDataRendered: e => { e.api.autoSizeAllColumns(); e.api.sizeColumnsToFit() },
        rowData: attrRows,
        theme: gridTheme(),
      })
    }
  }
  const actions = makeEl('div', 'detail-actions')
  const saveBtn = makeEl('button', 'button primary', 'Save')
  saveBtn.onclick = () => {
    Object.assign(data, draft)
    if (api) api.applyTransaction({ update: [data] })
    closeHoverCard()
    closeDetail()
  }
  const cancelBtn = makeEl('button', 'button outline', 'Cancel')
  cancelBtn.onclick = () => { closeHoverCard(); closeDetail() }
  actions.appendChild(cancelBtn)
  actions.appendChild(saveBtn)
  view.appendChild(actions)
  return view
}

const buildFileDetail = (file, view) => {
  view.appendChild(makeEl('b', null, file.name))
  const typeName = ({ md: 'Markdown', pdf: 'PDF' })[file.type] ?? file.type?.toUpperCase()
  if (typeName) view.appendChild(makeEl('span', 'detail-meta', file.size && file.size !== '—' ? `${typeName} · ${file.size}` : typeName))
  if (file.markdown || (file.path && file.type === 'md')) {
    const md = makeEl('div', 'markdown-body')
    const renderMd = text => { md.innerHTML = marked.parse(text) }
    if (file.markdown) renderMd(file.markdown)
    else { md.textContent = 'Loading…'; fetch(file.path).then(r => { if (!r.ok) throw new Error(r.status); return r.text() }).then(text => { file.markdown = text; renderMd(text) }).catch(() => { md.textContent = 'File not found.' }) }
    view.appendChild(md)
    return view
  }
  if (file.details) {
    view.appendChild(makeEl('p', 'detail-summary', file.details.summary))
    if (file.details.fields) {
      const grid = makeEl('div', 'detail-estimates')
      file.details.fields.forEach(([k, v]) => { const row = makeEl('div', 'detail-est-row'); row.appendChild(makeEl('span', null, k)); row.appendChild(makeEl('span', 'detail-est-val', v)); grid.appendChild(row) })
      view.appendChild(grid)
    }
  }
  if (file.assessment) {
    const a = file.assessment
    view.appendChild(makeEl('p', 'detail-summary', a.summary))
    const mkSection = (label, el) => { const s = makeEl('div', 'detail-section'); s.appendChild(makeEl('b', 'detail-section-label', label)); s.appendChild(el); return s }
    const statsGrid = makeEl('div', 'detail-stats')
    ;[['Pages', a.pages], ['Tokens', a.tokens], ['Tables', a.tables], ['Figures', a.figures]].forEach(([l, v]) => {
      const item = makeEl('div', 'detail-stat'); item.appendChild(makeEl('span', 'detail-stat-val', String(v))); item.appendChild(makeEl('span', 'detail-stat-label', l)); statsGrid.appendChild(item)
    })
    view.appendChild(mkSection('Document Stats', statsGrid))
    if (a.modelEstimates) {
      const grid = makeEl('div', 'detail-estimates')
      Object.entries(a.modelEstimates).forEach(([k, v]) => { const row = makeEl('div', 'detail-est-row'); row.appendChild(makeEl('span', null, k.replace(/([A-Z])/g, ' $1').toLowerCase())); row.appendChild(makeEl('span', 'detail-est-val', String(v))); grid.appendChild(row) })
      view.appendChild(mkSection('Model Estimates', grid))
    }
  }
  return view
}

const renderDetail = () => {
  const content = g('detail-content')
  if (!content) return
  content.replaceChildren()
  if (!state.selectedFile) { content.appendChild(makeEl('div', 'detail-empty', 'Select a file to view details')); return }
  content.appendChild(buildDetailContent(state.selectedFile))
}

const renderStats = (containerId, stats) => {
  const el = g(containerId)
  if (!el || !stats?.length) return
  el.replaceChildren()
  if (stats[0]?.value !== undefined) {
    const grid = makeEl('div', 'data-grid')
    stats.forEach(({ label, value }) => { const row = makeEl('div', 'data-row'); row.appendChild(makeEl('span', 'data-key', label)); row.appendChild(makeEl('span', null, value)); grid.appendChild(row) })
    el.appendChild(grid)
    return
  }
  stats.forEach(({ count, icon, label }) => {
    const stat = makeEl('div', 'overview-stat')
    const iconBox = makeEl('div', 'stat-icon')
    const i = makeEl('i'); i.className = icon
    iconBox.appendChild(i)
    stat.appendChild(iconBox)
    const text = makeEl('div', 'stat-text')
    text.appendChild(makeEl('div', 'stat-count', String(count)))
    text.appendChild(makeEl('div', 'stat-label', label))
    stat.appendChild(text)
    el.appendChild(stat)
  })
}

const countFrom = (obj, ...keys) => keys.reduce((n, k) => n + (Array.isArray(obj?.[k]) ? obj[k].length : 0), 0)

const buildStats = () => {
  const p = state.productData
  return {
    model: [
      { count: countFrom(p?.model, 'inputGroups'), icon: 'fa-regular fa-layer-group', label: 'input groups', level: 0 },
      { count: countFrom(p?.model, 'inputs'), icon: 'fa-regular fa-input-text', label: 'inputs', level: 1 },
      { count: countFrom(p?.model, 'inputValues'), icon: 'fa-regular fa-list', label: 'input values', level: 2 },
      { count: countFrom(p?.attributes, 'inputAttributes'), icon: 'fa-regular fa-table-cells', label: 'input attributes', level: 3 },
    ],
    results: [
      { count: countFrom(p?.results, 'itemFamilies'), icon: 'fa-regular fa-sitemap', label: 'item families', level: 0 },
      { count: countFrom(p?.results, 'itemMasters'), icon: 'fa-regular fa-barcode', label: 'item masters', level: 1 },
      { count: countFrom(p?.results, 'bomSkeleton'), icon: 'fa-regular fa-diagram-project', label: 'BOM lines', level: 0, sep: true },
      { count: countFrom(p?.results, 'productOutputs'), icon: 'fa-regular fa-square-poll-horizontal', label: 'product outputs', level: 0 },
      { count: countFrom(p?.results, 'drivenItemMasters'), icon: 'fa-regular fa-arrow-right-arrow-left', label: 'driven item masters', level: 0 },
    ],
    rules: [
      { count: p ? 1 : 0, icon: 'fa-regular fa-folder-tree', label: 'root logic group', level: 0 },
      { count: countFrom(p?.rules, 'logicGroups'), icon: 'fa-regular fa-folder', label: 'logic groups', level: 1 },
      { count: countFrom(p?.rules, 'logicItems'), icon: 'fa-regular fa-cube', label: 'logic items', level: 2 },
      { count: countFrom(p?.rules, 'drivenInputs'), icon: 'fa-regular fa-code-branch', label: 'driven inputs', level: 0, sep: true },
      { count: countFrom(p?.rules, 'inputFilters'), icon: 'fa-regular fa-filter', label: 'input filters', level: 0 },
      { count: countFrom(p?.rules, 'iterators'), icon: 'fa-regular fa-repeat', label: 'iterators', level: 0 },
      { count: countFrom(p?.rules, 'equations'), icon: 'fa-regular fa-superscript', label: 'equations', level: 0 },
    ],
  }
}

const buildProductCard = p => {
  const card = makeEl('div', 'product-card card')
  const img = makeEl('div', 'product-card-image')
  const icon = makeEl('i'); icon.className = 'fa-regular fa-box-open'
  img.appendChild(icon)
  card.appendChild(img)
  const body = makeEl('div', 'product-card-body')
  const breadcrumb = makeEl('div', 'breadcrumb')
  breadcrumb.appendChild(document.createTextNode('All Products'))
  if (p?.product?.category) {
    const sep = makeEl('i'); sep.className = 'fa-solid fa-angle-right'
    breadcrumb.appendChild(sep)
    breadcrumb.appendChild(document.createTextNode(p.product.category))
  }
  body.appendChild(breadcrumb)
  const title = makeEl('div', 'product-card-title')
  title.appendChild(document.createTextNode(p?.product?.name ?? 'Product name'))
  body.appendChild(title)
  const code = makeEl('div', 'product-card-code')
  code.appendChild(document.createTextNode(p?.product?.code ?? 'SKU'))
  body.appendChild(code)
  card.appendChild(body)
  return card
}

const renderProductCards = () => {
  const el = g('overview-products')
  if (!el) return
  el.replaceChildren()
  el.appendChild(buildProductCard(state.productData))
}

const overviewColumns = [
  { icon: 'fa-regular fa-box-open', key: 'product', label: 'Product' },
  { icon: 'fa-regular fa-cube', key: 'model', label: 'Model' },
  { icon: 'fa-regular fa-code-branch', key: 'rules', label: 'Rules' },
  { icon: 'fa-regular fa-barcode', key: 'results', label: 'Results' },
]

const renderOverviewColumns = () => {
  const el = g('overview-columns')
  if (!el) return
  el.replaceChildren()
  const p = state.productData
  const stats = buildStats()
  overviewColumns.forEach(col => {
    if (col.key === 'product') {
      const wrapper = makeEl('div', 'overview-col-product')
      wrapper.appendChild(buildProductCard(p))
      el.appendChild(wrapper)
      return
    }
    const card = makeEl('div', 'overview-col-card')
    card.dataset.section = col.key
    {
      const iconBox = makeEl('div', 'overview-col-icon')
      const icon = makeEl('i'); icon.className = col.icon
      iconBox.appendChild(icon)
      card.appendChild(iconBox)
      const colTitle = makeEl('div', 'overview-col-title')
      colTitle.appendChild(document.createTextNode(col.label))
      card.appendChild(colTitle)
      ;(stats[col.key] ?? []).forEach(({ count, icon, label, level, sep }) => {
        if (sep) card.appendChild(makeEl('div', 'overview-col-sep'))
        const row = makeEl('div', 'overview-col-stat')
        if (level) {
          row.style.paddingLeft = `${(level - 1) * 1}rem`
          row.appendChild(makeEl('span', 'overview-col-elbow', '└ '))
        }
        const ic = makeEl('i'); ic.className = icon
        row.appendChild(ic)
        row.appendChild(document.createTextNode(` ${label} `))
        row.appendChild(makeEl('span', 'overview-col-chip', String(count)))
        card.appendChild(row)
      })
    }
    el.appendChild(card)
  })
}

const renderAllStats = () => {
  buildPaneToolbar(g('overview-toolbar'), {
    modes: [
      { active: true, icon: 'fa-regular fa-table-list', label: 'Layout 1', target: 'overview-layout-2' },
      { active: false, icon: 'fa-regular fa-grid-2', label: 'Layout 2', target: 'overview-layout-1' },
      { active: false, icon: 'fa-regular fa-chart-network', label: 'Graph', target: 'overview-graph' },
    ],
    paneId: 'pane-overview',
  })
  renderOverviewColumns()
  renderProductCards()
  const graphEl = g('overview-graph')
  if (graphEl && !graphEl.children.length) emptyState(graphEl, 'graph')
  const stats = buildStats()
  for (const [tab, items] of Object.entries(stats)) renderStats(`overview-${tab}-stats`, items)
}

// Tab content renderers (unchanged — driven by state.productData)

let modelGrid = null
let modelTree = null
let rulesTree = null

const typeBadgeCategory = v => (v ?? '').toLowerCase().replace(/\s+/g, '-')

const badgeFilterLink = (getGrid, colId) => p => {
  if (!p.value) return ''
  const badge = makeEl('span', 'badge')
  badge.dataset.category = typeBadgeCategory(p.value)
  badge.textContent = p.value
  badge.classList.add('clickable')
  badge.onclick = e => {
    e.stopPropagation()
    const grid = getGrid()
    if (!grid) return
    const model = { ...(grid.getFilterModel() ?? {}) }
    model[colId] = { filter: String(p.value), filterType: 'text', type: 'equals' }
    grid.setFilterModel(model)
    grid.setGridOption('defaultColDef', { ...gridDefaults, floatingFilter: true })
  }
  return badge
}

const modelTreeCols = [
  { cellRenderer: badgeFilterLink(() => modelGrid, 'type'), field: 'type', headerName: 'Type' },
  { field: 'default', headerName: 'Default' },
  { field: 'value', headerName: 'Value' },
  { field: 'options', headerName: 'Options', type: 'rightAligned' },
]

const buildModelRows = p => {
  const m = p.model
  const attrsByInput = {}
  ;(p.attributes?.inputAttributes ?? []).forEach(a => { (attrsByInput[a.driverInputNum] ??= []).push(a) })
  const rows = []
  ;(m.inputGroups ?? []).forEach(group => {
    rows.push({ id: group.id, name: group.name, nodeType: 'group', path: [group.name] })
    ;(m.inputs ?? []).filter(i => i.groupNum === group.num).forEach(input => {
      const attrs = attrsByInput[input.num]
      const values = (m.inputValues ?? []).filter(v => v.inputNum === input.num)
      const detailRows = attrs ? values.map(val => {
        const row = { label: val.label, value: val.value }
        attrs.forEach(a => { row[a.name] = a.values[val.value] ?? '' })
        return row
      }) : null
      rows.push({ default: input.default, detailRows, id: input.id, name: input.label, nodeType: 'input', options: values.length || '', path: [group.name, input.label], type: input.type?.replace(/^./, c => c.toUpperCase()) })
      if (!attrs) values.forEach(val => {
        rows.push({ id: `${input.id}-${val.value}`, name: val.label, nodeType: 'value', path: [group.name, input.label, val.label], value: val.value })
      })
    })
  })
  return rows
}

const findInputNum = id => state.productData?.model?.inputs?.find(i => i.id === id)?.num

const modelContextMenu = params => {
  if (!params.node) return params.defaultItems
  const rowData = []
  params.api.forEachNode(n => rowData.push(n.data))
  const idx = rowData.findIndex(r => r.id === params.node.data.id)
  const d = params.node.data
  const makeRow = (level, parent) => {
    const id = `new-${Date.now()}`
    if (level === 'group') return { id, name: 'New Group', nodeType: 'group', path: [`New Group ${id.slice(-4)}`] }
    if (level === 'input') return { default: '', id, name: 'New Input', nodeType: 'input', path: [...(parent ?? d.path).slice(0, 1), `New Input ${id.slice(-4)}`], type: 'dropdown' }
    return { id, name: 'New Value', nodeType: 'value', path: [...(parent ?? d.path).slice(0, 2), `New Value ${id.slice(-4)}`], value: '' }
  }
  const items = [
    { name: `Insert ${d.nodeType} before`, action: () => params.api.applyTransaction({ add: [makeRow(d.nodeType)], addIndex: idx }) },
    { name: `Insert ${d.nodeType} after`, action: () => params.api.applyTransaction({ add: [makeRow(d.nodeType)], addIndex: idx + 1 }) },
  ]
  if (d.nodeType === 'group') items.push({ name: 'Add input', action: () => params.api.applyTransaction({ add: [makeRow('input', d.path)] }) })
  if (d.nodeType === 'input') {
    items.push({ name: 'Add value', action: () => params.api.applyTransaction({ add: [makeRow('value', d.path)] }) })
    items.push({ name: 'Add attribute', action: () => {
      const inputNum = findInputNum(d.id)
      const existing = (state.productData?.attributes?.inputAttributes ?? []).filter(a => a.driverInputNum === inputNum)
      const name = `attribute_${existing.length + 1}`
      const attr = { driverInputNum: inputNum, id: `ia-${Date.now()}`, name, type: 'text', values: {} }
      ;(state.productData.attributes ??= {}).inputAttributes ??= []
      state.productData.attributes.inputAttributes.push(attr)
      const values = (state.productData.model.inputValues ?? []).filter(v => v.inputNum === inputNum)
      d.detailRows = values.map(val => {
        const row = { label: val.label, value: val.value }
        ;[...existing, attr].forEach(a => { row[a.name] = a.values?.[val.value] ?? '' })
        return row
      })
      // Remove value child rows since they now live in the detail grid
      const toRemove = []
      params.api.forEachNode(n => { if (n.data.nodeType === 'value' && n.data.path[1] === d.path[1] && n.data.path[0] === d.path[0]) toRemove.push(n.data) })
      if (toRemove.length) params.api.applyTransaction({ remove: toRemove })
      params.api.applyTransaction({ update: [d] })
      params.api.getRowNode(d.id)?.setExpanded(true)
    }})
  }
  items.push('separator')
  items.push({ name: 'Delete', action: () => {
    const toRemove = [d]
    params.api.forEachNode(n => { if (n.data.path.length > d.path.length && n.data.path.slice(0, d.path.length).join('/') === d.path.join('/')) toRemove.push(n.data) })
    params.api.applyTransaction({ remove: toRemove })
  }})
  items.push('separator', ...params.defaultItems)
  return items
}

const renderModelTab = () => {
  const el = g('model-table')
  const json = g('model-json')
  if (!el) return
  buildPaneToolbar(g('model-toolbar'), {
    filters: [{ active: true, label: 'All options' }],
    getGrid: () => modelGrid,
    modes: [
      { active: true, icon: 'fa-regular fa-table', label: 'Table', target: 'model-table', onActivate: () => modelGrid?.setGridOption('rowData', buildModelRows(state.productData)) },
      { active: false, icon: 'fa-regular fa-table-cells', label: 'Attributes', target: 'model-table', onActivate: () => modelGrid?.setGridOption('rowData', buildModelRows(state.productData).filter(r => r.detailRows || r.nodeType === 'group')) },
      { active: false, icon: 'fa-regular fa-list-tree', label: 'Tree', target: 'model-tree' },
      { active: false, icon: 'fa-regular fa-chart-network', label: 'Graph', target: 'model-graph' },
      { active: false, icon: 'fa-regular fa-brackets-curly', label: 'JSON', target: 'model-json' },
    ],
    paneId: 'pane-model',
  })
  if (!state.productData) { emptyState(el, 'model'); return }
  const rows = buildModelRows(state.productData)
  if (modelGrid) { modelGrid.setGridOption('rowData', rows); return }
  el.replaceChildren()
  const gridEl = makeEl('div', 'pane-grid-full'); gridEl.id = 'model-grid'
  el.appendChild(gridEl)
  modelGrid = agGrid.createGrid(gridEl, {
    ...gridCommon(),
    autoGroupColumnDef: { cellRendererParams: { suppressCount: true }, headerName: 'Name', minWidth: 240 },
    columnDefs: [...modelTreeCols, actionsCol],
    detailCellRendererParams: p => {
      const inputNum = findInputNum(p.data.id)
      const attrs = (state.productData?.attributes?.inputAttributes ?? []).filter(a => a.driverInputNum === inputNum)
      const addCol = {
        headerComponent: class {
          init(hp) {
            this.gui = makeEl('button', 'button button-icon')
            const icon = makeEl('i'); icon.className = 'fa-solid fa-plus'
            this.gui.appendChild(icon)
            this.gui.title = 'Add attribute'
            this.gui.onclick = () => {
              const existing = (state.productData?.attributes?.inputAttributes ?? []).filter(a => a.driverInputNum === inputNum)
              const name = `attribute_${existing.length + 1}`
              const attr = { driverInputNum: inputNum, id: `ia-${Date.now()}`, name, type: 'text', values: {} }
              ;(state.productData.attributes ??= {}).inputAttributes ??= []
              state.productData.attributes.inputAttributes.push(attr)
              p.data.detailRows?.forEach(r => { r[name] = '' })
              const api = hp.api
              api.setGridOption('columnDefs', [...api.getColumnDefs().slice(0, -1), { field: name, headerName: name }, addCol])
              api.setGridOption('rowData', p.data.detailRows)
              api.autoSizeAllColumns()
              api.sizeColumnsToFit()
            }
          }
          getGui() { return this.gui }
        },
        sortable: false,
        suppressSizeToFit: true,
      }
      return {
        detailGridOptions: {
          columnDefs: [
            { field: 'label', headerName: 'Value' },
            ...attrs.map(a => ({ field: a.name, headerName: a.name })),
            addCol,
          ],
          defaultColDef: { editable: true, resizable: true, sortable: true },
          onFirstDataRendered: e => { e.api.autoSizeAllColumns(); e.api.sizeColumnsToFit() },
          theme: gridTheme(),
        },
        getDetailRowData: params => params.successCallback(p.data.detailRows ?? []),
      }
    },
    detailRowAutoHeight: true,
    getContextMenuItems: modelContextMenu,
    getDataPath: d => d.path,
    getRowId: p => p.data.id,
    groupDefaultExpanded: 1,
    isRowMaster: d => !!d.detailRows,
    masterDetail: true,
    rowData: rows,
    rowDragManaged: true,
    suppressMoveWhenRowDragging: true,
    treeData: true,
  })
  if (json) { json.replaceChildren(); json.appendChild(makeEl('pre', 'json-view', JSON.stringify(state.productData.model, null, 2))) }
  const treeEl = g('model-tree')
  if (treeEl && !modelTree) {
    treeEl.replaceChildren()
    const grip = '<i class="fa-solid fa-grip-vertical tree-grip"></i>'
    modelTree = new SortableTree({
      element: treeEl,
      icons: { collapsed: '<i class="fa-solid fa-angle-right"></i>', open: '<i class="fa-solid fa-angle-down"></i>' },
      initCollapseLevel: 99,
      lockRootLevel: true,
      nodes: rowsToNodes(rows),
      onChange: () => {},
      renderLabel: d => {
        const type = d.type ? `<span class="badge" data-category="${typeBadgeCategory(d.type)}">${d.type}</span>` : ''
        if (d.path?.length === 1) return `${grip}<b>${d.name}</b>`
        return `${grip}<span>${d.name}</span>${type}`
      },
    })
  }
  const graphEl = g('model-graph')
  if (graphEl && !graphEl.children.length) emptyState(graphEl, 'graph')
}

let rulesGrid = null

const rowsToNodes = rows => {
  const root = []
  const map = {}
  rows.forEach(r => {
    const key = r.path.join('/')
    const node = { data: r, nodes: [] }
    map[key] = node
    if (r.path.length === 1) { root.push(node); return }
    const parentKey = r.path.slice(0, -1).join('/')
    if (map[parentKey]) map[parentKey].nodes.push(node)
    else root.push(node)
  })
  return root
}

const ruleTypeLabels = {
  ask_input_group: 'Logic item', ask_product_input: 'Logic item', conditional_ask: 'Logic item', conditional_run: 'Logic item',
  driven_input: 'Driven input', end_of_page: 'Logic item', equation: 'Equation', include_bom_item: 'Logic item',
  input: 'Input', input_filter: 'Input filter', input_group: 'Input group', iterator: 'Iterator',
  logic_group: 'Logic group', run_logic_group: 'Logic item', set_quantity: 'Logic item',
}


const rulesTreeCols = [
  { cellRenderer: badgeFilterLink(() => rulesGrid, 'ruleType'), field: 'ruleType', headerName: 'Type' },
  { cellRenderer: p => {
    if (!p.value) return ''
    if (p.data.ruleType === ruleTypeLabels.equation) { const el = makeEl('code'); el.textContent = p.value; return el }
    const el = makeEl('span')
    el.innerHTML = p.value.replace(/\b(\w+_\w+)\b/g, '<code>$1</code>')
    return el
  }, field: 'detail', headerName: 'Detail' },
]

const buildRulesRows = p => {
  const r = p.rules
  const modelInputs = p.model?.inputs ?? []
  const modelGroups = p.model?.inputGroups ?? []
  const inputLabel = num => modelInputs.find(i => i.num === num)?.label ?? `Input ${num}`
  const referencedLogicGroups = new Set()
  const itemDetail = item => item.condition ? `IF ${item.condition.entity} ${item.condition.operation} ${item.condition.value}` : ''
  const rows = []

  const addTargetChildren = (item, itemPath) => {
    const targetName = item.name.replace(/^Ask\s+/, '')
    if (item.type === 'ask_input_group' || item.type === 'conditional_ask') {
      const ig = modelGroups.find(g => g.name === targetName)
      if (ig) {
        const igPath = [...itemPath, ig.name]
        rows.push({ id: ig.id, name: ig.name, path: igPath, ruleType: ruleTypeLabels.input_group })
        const igInputNums = modelInputs.filter(i => i.groupNum === ig.num).map(i => i.num)
        ;(r.inputFilters ?? []).filter(f => igInputNums.includes(f.filteredInputNum)).forEach(f => {
          const name = `${inputLabel(f.filteringInputNum)} filters ${inputLabel(f.filteredInputNum)}`
          rows.push({ detail: `attribute: ${f.attribute}`, id: f.id, name, path: [...igPath, name], ruleType: ruleTypeLabels.input_filter })
        })
        ;(r.drivenInputs ?? []).filter(d => igInputNums.includes(d.drivenInputNum)).forEach(d => {
          rows.push({ detail: `${inputLabel(d.driver1InputNum)} + ${inputLabel(d.driver2InputNum)} → ${inputLabel(d.drivenInputNum)}`, id: d.id, name: d.description, path: [...igPath, d.description], ruleType: ruleTypeLabels.driven_input })
        })
        ;(r.equations ?? []).filter(eq => eq.variables?.some(v => igInputNums.includes(v.inputNum))).forEach(eq => {
          rows.push({ detail: eq.expression, id: eq.id, name: eq.label, path: [...igPath, eq.label], ruleType: ruleTypeLabels.equation })
        })
      }
    }
    if (item.type === 'ask_product_input') {
      const inputRef = (item.action ?? '').replace(/^Ask Product Input:\s*/, '')
      const targetInput = modelInputs.find(i => i.name === inputRef || i.label === inputRef || i.label === targetName)
      if (targetInput) rows.push({ id: targetInput.id, name: targetInput.label, path: [...itemPath, targetInput.label], ruleType: ruleTypeLabels.input })
    }
    if (item.type === 'conditional_run' || item.type === 'run_logic_group') {
      const targetLG = (r.logicGroups ?? []).find(g => g.name === (item.action ?? '').replace(/^Run Logic Group:\s*/, ''))
      if (targetLG) {
        referencedLogicGroups.add(targetLG.name)
        const lgPath = [...itemPath, targetLG.name]
        rows.push({ id: targetLG.id, name: targetLG.name, path: lgPath, ruleType: ruleTypeLabels.logic_group })
        ;(r.logicItems ?? []).filter(li => li.groupNum === targetLG.num).forEach(li => {
          const liPath = [...lgPath, li.name]
          rows.push({ id: li.id, name: li.name, path: liPath, ruleType: ruleTypeLabels[li.type] ?? li.type })
          addTargetChildren(li, liPath)
        })
      }
    }
  }

  ;(r.logicGroups ?? []).filter(g => g.root).forEach(group => {
    const groupPath = ['Interface']
    rows.push({ id: group.id, name: 'Interface', path: groupPath, ruleType: ruleTypeLabels.logic_group })
    ;(r.logicItems ?? []).filter(i => i.groupNum === group.num).forEach(item => {
      const itemPath = [...groupPath, item.name]
      rows.push({ detail: itemDetail(item), id: item.id, name: item.name, path: itemPath, rawType: item.type, ruleType: ruleTypeLabels[item.type] ?? item.type })
      addTargetChildren(item, itemPath)
    })
  })
  ;(r.logicGroups ?? []).filter(g => !g.root && !referencedLogicGroups.has(g.name)).forEach(group => {
    const groupPath = [group.name]
    rows.push({ id: group.id, name: group.name, path: groupPath, ruleType: ruleTypeLabels.logic_group })
    ;(r.logicItems ?? []).filter(i => i.groupNum === group.num).forEach(item => {
      const itemPath = [...groupPath, item.name]
      rows.push({ detail: itemDetail(item), id: item.id, name: item.name, path: itemPath, rawType: item.type, ruleType: ruleTypeLabels[item.type] ?? item.type })
      addTargetChildren(item, itemPath)
    })
  })
  return rows
}

const renderRulesTab = () => {
  const tableEl = g('rules-table')
  const treeEl = g('rules-tree')
  const json = g('rules-json')
  if (!tableEl) return
  buildPaneToolbar(g('rules-toolbar'), {
    filters: [{ active: true, label: 'All rules' }],
    getGrid: () => rulesGrid,
    modes: [
      { active: true, icon: 'fa-regular fa-table', label: 'Table', target: 'rules-table' },
      { active: false, icon: 'fa-regular fa-list-tree', label: 'Tree', target: 'rules-tree' },
      { active: false, icon: 'fa-regular fa-brackets-curly', label: 'JSON', target: 'rules-json' },
    ],
    paneId: 'pane-rules',
  })
  if (!state.productData) { emptyState(tableEl, 'rules'); return }
  const r = state.productData.rules
  const rows = buildRulesRows(state.productData)
  if (rulesGrid) { rulesGrid.setGridOption('rowData', rows) }
  else {
    tableEl.replaceChildren()
    const gridEl = makeEl('div', 'pane-grid-full'); gridEl.id = 'rules-grid'
    tableEl.appendChild(gridEl)
    rulesGrid = agGrid.createGrid(gridEl, {
      ...gridCommon(),
      autoGroupColumnDef: { cellRendererParams: { suppressCount: true }, headerName: 'Name', minWidth: 240 },
      columnDefs: [...rulesTreeCols, actionsCol],
      getDataPath: d => d.path,
      getRowClass: p => p.data?.rawType === 'end_of_page' ? 'row-page-break' : '',
      getRowId: p => p.data.id,
      groupDefaultExpanded: -1,
      rowData: rows,
      treeData: true,
    })
  }
  if (!rulesTree) {
    treeEl.replaceChildren()
    const grip = '<i class="fa-solid fa-grip-vertical tree-grip"></i>'
    rulesTree = new SortableTree({
      element: treeEl,
      icons: { collapsed: '<i class="fa-solid fa-angle-right"></i>', open: '<i class="fa-solid fa-angle-down"></i>' },
      initCollapseLevel: 99,
      lockRootLevel: true,
      nodes: rowsToNodes(rows),
      onChange: () => {},
      renderLabel: d => {
        const type = d.ruleType ? `<span class="badge" data-category="${typeBadgeCategory(d.ruleType)}">${d.ruleType}</span>` : ''
        if (d.path?.length === 1) return `${grip}<b>${d.name}</b>`
        return `${grip}<span>${d.name}</span>${type}`
      },
    })
  }
  if (json) { json.replaceChildren(); json.appendChild(makeEl('pre', 'json-view', JSON.stringify(r, null, 2))) }
}

let resultsGrid = null

function sizeActiveGrid() {
  const grid = state.activeTab === 'files' ? filesGrid : state.activeTab === 'model' ? modelGrid : state.activeTab === 'rules' ? rulesGrid : state.activeTab === 'results' ? resultsGrid : null
  if (!grid) return
  grid.autoSizeAllColumns()
  grid.sizeColumnsToFit()
}

const resultsCols = [
  { field: 'itemNumber', headerName: 'Item #' },
  { cellRenderer: p => {
    const indent = (p.data?.level ?? 0) * 20
    const el = makeEl('span'); el.style.paddingLeft = `${indent}px`; el.textContent = p.value ?? ''
    return el
  }, field: 'description', headerName: 'Description', minWidth: 220 },
  { field: 'qty', headerName: 'Qty', type: 'rightAligned' },
  { field: 'uom', headerName: 'UOM' },
  { field: 'source', headerName: 'Source' },
  { cellRenderer: p => {
    if (!p.value) return ''
    const el = makeEl('span', 'badge'); el.textContent = p.value; el.dataset.category = p.value; return el
  }, field: 'resolution', headerName: 'Resolution' },
]
const resolveConfig = p => {
  const inputs = Object.fromEntries(p.model.inputs.map(i => [i.num, i]))
  const inputsByName = Object.fromEntries(p.model.inputs.map(i => [i.name, i]))
  const vals = Object.fromEntries(p.model.inputs.map(i => [i.name, i.default]))
  const valLabels = {}
  p.model.inputValues.forEach(iv => { if (String(inputs[iv.inputNum]?.default) === String(iv.value)) valLabels[iv.inputNum] = iv.label })
  const attrs = {}
  ;(p.attributes?.inputAttributes ?? []).forEach(ia => {
    const dv = String(inputs[ia.driverInputNum]?.default ?? '')
    attrs[ia.name] = Number(ia.values?.[dv] ?? 0)
  })
  const eqs = {}
  ;(p.rules?.equations ?? []).forEach(eq => {
    let expr = eq.expression
    eq.variables.forEach(v => { expr = expr.replaceAll(v.name, vals[v.name] ?? 0) })
    try { eqs[eq.outputField] = Math.round(Function(`"use strict"; return (${expr})`)() * 100) / 100 } catch { eqs[eq.outputField] = 0 }
  })
  const families = Object.fromEntries((p.results.itemFamilies ?? []).map(f => [f.id, f]))
  const masters = Object.fromEntries((p.results.itemMasters ?? []).map(m => [m.id, m]))
  const mastersList = p.results.itemMasters ?? []
  const findByLabel = label => label ? mastersList.find(m => m.description.toLowerCase().includes(label.toLowerCase())) : null
  const resolveQty = q => {
    if (!q) return 1
    if (q.type === 'value') return q.value
    if (q.type === 'equation') return eqs[q.equationName] ?? 0
    if (q.type === 'product_input') return attrs[q.attribute] ?? 0
    return 1
  }
  const rows = []
  ;(p.results.bomSkeleton ?? []).forEach(bom => {
    let itemNumber = '', desc = bom.referenceName, source = '', uom = '', resolution = '', included = bom.includedByDefault
    if (bom.type === 'item_family') {
      const f = families[bom.referenceId]
      if (f) {
        desc = f.name; uom = f.unitOfMeasure; source = 'configured'; resolution = 'configured'
        const seed = `${p.product?.id ?? ''}-${bom.referenceId}`
        const hash = [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)
        itemNumber = `C1C-${String(Math.abs(hash) % 100000).padStart(5, '0')}`
      }
    } else if (bom.type === 'item_master') {
      const m = masters[bom.referenceId]
      if (m) { itemNumber = m.smartPartNumber ?? m.itemNumber; desc = m.description; uom = m.unitOfMeasure; source = m.type; resolution = 'static' }
    } else if (bom.type === 'input') {
      const inputNum = Number(bom.referenceId.replace('inp-', ''))
      const m = findByLabel(valLabels[inputNum])
      if (m) { itemNumber = m.smartPartNumber ?? m.itemNumber; desc = m.description; uom = m.unitOfMeasure; source = m.type; resolution = 'input' }
      else { desc = `${bom.referenceName}: ${valLabels[inputNum] ?? ''}` ; resolution = 'input' }
    } else if (bom.type === 'driven') {
      const di = (p.results.drivenItemMasters ?? []).find(d => d.drivenItemId === bom.referenceId)
      if (di) {
        const label2 = valLabels[di.driver2InputNum ?? di.driverInputNum] ?? ''
        const m = mastersList.find(m => { const d = m.description.toLowerCase(); return d.includes(label2.toLowerCase()) || d.includes('all finishes') })
        if (m) { itemNumber = m.smartPartNumber ?? m.itemNumber; desc = m.description; uom = m.unitOfMeasure; source = m.type; resolution = 'driven' }
      }
      if (!itemNumber) resolution = 'driven'
    }
    if (!bom.includedByDefault) {
      const logicItems = p.rules?.logicItems ?? []
      const baseVal = vals.BASE
      if (bom.referenceId === 'im-9') included = baseVal !== 'T-LEG'
      else if (bom.referenceId === 'im-10') included = baseVal === 'T-LEG'
      else included = false
      resolution = 'conditional'
    }
    const qty = included ? resolveQty(bom.quantity) : 0
    rows.push({ description: desc, included, itemNumber, level: bom.level, qty: included ? qty : '', resolution, source, uom })
  })
  return rows
}
const renderResultsTab = () => {
  const el = g('results-content'); if (!el) return
  buildPaneToolbar(g('results-toolbar'), {
    filters: [{ active: true, label: 'All items' }],
    getGrid: () => resultsGrid,
  })
  if (!state.productData) { emptyState(el, 'results'); return }
  const rows = resolveConfig(state.productData)
  if (resultsGrid) { resultsGrid.setGridOption('rowData', rows); return }
  el.replaceChildren()
  const gridEl = makeEl('div', 'pane-grid-full'); gridEl.id = 'results-grid'
  el.appendChild(gridEl)
  resultsGrid = agGrid.createGrid(gridEl, {
    ...gridCommon(),
    columnDefs: [...resultsCols, actionsCol],
    getRowClass: p => p.data?.included === false ? 'row-excluded' : '',
    rowData: rows,
  })
}

const renderPreviewTab = () => {
  const el = g('preview-content'); if (!el) return; el.replaceChildren()
  if (!state.productData) { emptyState(el, 'preview'); return }
  const form = makeEl('div', 'preview-form')
  ;(state.productData.model.inputGroups ?? []).forEach(group => {
    const sec = makeEl('div', 'preview-section'); sec.appendChild(makeEl('b', null, group.name))
    const fields = makeEl('div', 'preview-fields')
    ;(state.productData.model.inputs ?? []).filter(i => i.groupNum === group.num).forEach(input => {
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

const renderVerifyTab = () => {
  const el = g('verify-content'); if (!el) return; el.replaceChildren()
  if (!state.productData) { emptyState(el, 'verify'); return }
  const isVerifyWf = state.workflow?.id === 'validate'
  const verifying = isVerifyWf && !!state.activeAutomation
  const verified = isVerifyWf && !state.activeAutomation
  const view = makeEl('div', 'commit-view')
  const header = makeEl('div', 'commit-header')
  header.appendChild(makeEl('b', null, 'Verification'))
  if (verified) {
    const badge = makeEl('span', 'badge')
    badge.dataset.category = 'input'
    badge.textContent = 'PASS'
    header.appendChild(badge)
  }
  header.appendChild(makeEl('div', 'fill'))
  const btn = makeEl('button', 'button primary', verified ? 'Passed' : verifying ? 'Verifying…' : 'Run verification')
  btn.disabled = verified || verifying
  btn.onclick = () => demoContinue('Verify')
  header.appendChild(btn)
  view.appendChild(header)
  view.appendChild(makeEl('p', 'section-lede', 'Run the staged spec through the simulator engine to catch broken refs, bad rules, BOM errors, IS NULL guard mistakes, and logic group cycles.'))
  view.appendChild(makeEl('b', null, 'Checks'))
  const phaseList = makeEl('div', 'data-grid')
  const currentStep = isVerifyWf ? state.workflow.step : 0
  ;(workflows['validate']?.steps ?? []).forEach((label, i) => {
    const row = makeEl('div', 'data-row')
    row.appendChild(makeEl('i', i < currentStep ? 'fa-regular fa-circle-check commit-done' : 'fa-regular fa-clock commit-pending'))
    row.appendChild(makeEl('span', null, label))
    row.appendChild(makeEl('span', 'commit-phase-status', i < currentStep ? 'PASS' : 'PENDING'))
    phaseList.appendChild(row)
  })
  view.appendChild(phaseList)
  if (verified) {
    view.appendChild(makeEl('p', 'section-lede', `All ${workflows['validate']?.steps?.length ?? 0} checks passed. Ready to commit.`))
  }
  el.appendChild(view)
}

const renderCommitTab = () => {
  const el = g('commit-content'); if (!el) return; el.replaceChildren()
  if (!state.productData) { emptyState(el, 'commit'); return }
  const p = state.productData
  const isCommitWf = state.workflow?.id === 'commit-to-cloud'
  const committing = isCommitWf && !!state.activeAutomation
  const committed = isCommitWf && !state.activeAutomation
  const view = makeEl('div', 'commit-view')
  const header = makeEl('div', 'commit-header')
  header.appendChild(makeEl('b', null, 'Commit to C1'))
  const badge = makeEl('span', 'badge')
  badge.dataset.category = committed ? 'input' : 'static'
  badge.textContent = committed ? 'Committed' : 'Uncommitted'
  header.appendChild(badge)
  header.appendChild(makeEl('div', 'fill'))
  const btn = makeEl('button', 'button primary', committed ? 'Committed' : committing ? 'Committing…' : 'Commit')
  btn.disabled = committed || committing
  btn.onclick = () => demoContinue('Commit')
  header.appendChild(btn)
  view.appendChild(header)
  view.appendChild(makeEl('b', null, 'Phases'))
  const phaseList = makeEl('div', 'data-grid')
  const currentStep = state.workflow?.id === 'commit-to-cloud' ? state.workflow.step : 0
  ;(workflows['commit-to-cloud']?.steps ?? []).forEach((label, i) => {
    const row = makeEl('div', 'data-row')
    row.appendChild(makeEl('i', i < currentStep ? 'fa-regular fa-circle-check commit-done' : 'fa-regular fa-clock commit-pending'))
    row.appendChild(makeEl('span', null, label))
    row.appendChild(makeEl('span', 'commit-phase-status', i < currentStep ? 'DONE' : 'PENDING'))
    phaseList.appendChild(row)
  })
  view.appendChild(phaseList)
  view.appendChild(makeEl('b', null, "What's about to commit"))
  const stats = makeEl('div', 'overview-stats'); stats.id = 'commit-stats'
  view.appendChild(stats)
  el.appendChild(view)
  renderStats('commit-stats', [
    { count: countFrom(p.model, 'inputGroups'), icon: 'fa-regular fa-layer-group', label: 'input groups' },
    { count: countFrom(p.rules, 'logicGroups'), icon: 'fa-regular fa-folder', label: 'logic groups' },
    { count: countFrom(p.rules, 'equations'), icon: 'fa-regular fa-superscript', label: 'equations' },
    { count: countFrom(p.results, 'itemFamilies'), icon: 'fa-regular fa-sitemap', label: 'item families' },
    { count: countFrom(p.results, 'itemMasters'), icon: 'fa-regular fa-barcode', label: 'item masters' },
    { count: countFrom(p.results, 'bomSkeleton'), icon: 'fa-regular fa-diagram-project', label: 'BOM lines' },
  ])
}


const clearTabContent = () => {
  if (modelGrid) { modelGrid.destroy(); modelGrid = null }
  if (modelTree) { modelTree.destroy(); modelTree = null }
  if (resultsGrid) { resultsGrid.destroy(); resultsGrid = null }
  if (rulesGrid) { rulesGrid.destroy(); rulesGrid = null }
  if (rulesTree) { rulesTree.destroy(); rulesTree = null }
  ;['model-table', 'model-tree', 'model-json', 'rules-table', 'rules-tree', 'rules-json', 'results-content', 'preview-content', 'verify-content', 'commit-content'].forEach(id => g(id)?.replaceChildren())
}

const tabRenderers = { commit: renderCommitTab, files: renderFilesList, model: renderModelTab, preview: renderPreviewTab, results: renderResultsTab, rules: renderRulesTab, verify: renderVerifyTab }
const renderTabContent = () => tabRenderers[state.activeTab]?.()


// Main render

const renderWorkspaces = () => {
  const el = g('workspaces-list')
  if (!el) return
  el.replaceChildren()
  workspaces.forEach((ws, i) => {
    const item = makeEl('button', `button nav-item${i === activeWorkspaceId ? ' active' : ''}`)
    item.appendChild(makeEl('span', null, ws.name))
    const menuId = `ws-menu-${i}`
    const btn = makeEl('button', 'button button-icon nav-menu')
    btn.type = 'button'
    btn.setAttribute('popovertarget', menuId)
    btn.style.anchorName = `--ws-menu-${i}`
    const icon = makeEl('i'); icon.className = 'fa-regular fa-ellipsis'
    btn.appendChild(icon)
    btn.addEventListener('click', e => e.stopPropagation())
    item.appendChild(btn)
    const dd = makeEl('div', 'dropdown-content ws-dropdown')
    dd.id = menuId
    dd.setAttribute('popover', '')
    dd.style.positionAnchor = `--ws-menu-${i}`
    const del = makeEl('button', 'dropdown-item destructive', 'Delete workspace')
    del.type = 'button'
    del.addEventListener('click', () => {
      dd.hidePopover()
      if (workspaces.length < 2) return
      workspaces.splice(i, 1)
      if (activeWorkspaceId >= workspaces.length) activeWorkspaceId = workspaces.length - 1
      state = workspaces[activeWorkspaceId]
      render()
    })
    dd.appendChild(del)
    item.appendChild(dd)
    item.addEventListener('click', () => switchWorkspace(i))
    el.appendChild(item)
  })
}

const render = () => {
  g('workspace-title').textContent = 'Workspace'
  g('workspace-status').textContent = state.name
  const wsBadge = g('workspace-badge')
  const isCommitted = state.workflow?.id === 'commit-to-cloud' && !state.activeAutomation
  const isVerified = state.workflow?.id === 'validate' && !state.activeAutomation
  const pd = state.productData
  const wsStatus = isCommitted ? 'Committed'
    : isVerified ? 'Verified'
    : pd?.results?.bomSkeleton?.length ? 'Uncommitted'
    : pd?.rules?.logicItems?.length ? 'Needs results'
    : pd?.model?.inputs?.length ? 'Needs rules'
    : state._fullProductData ? 'Needs model'
    : null
  wsBadge.hidden = !wsStatus
  wsBadge.textContent = wsStatus ?? ''
  wsBadge.dataset.category = isCommitted ? 'input' : isVerified ? 'configured' : 'static'
  g('menu-context').textContent = `Context ${state.context}%`
  const ring = document.querySelector('.context-ring-fill')
  if (ring) {
    const c = 100.53
    ring.setAttribute('stroke-dashoffset', c - (c * state.context / 100))
    ring.classList.toggle('danger', state.context > 40)
  }
  g('chat-input').placeholder = state.placeholder
  const ffBtn = g('ff-btn')
  const stop = nextFfStop()
  ffBtn.title = stop ? `Fast-forward to ${stop.title.toLowerCase()}` : 'Fast-forward'
  ffBtn.querySelector('i').className = stop?.workflow === 'commit-to-cloud' ? 'fa-regular fa-forward-fast' : 'fa-regular fa-forward'
  q('.chip-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === state.activeTab))
  q('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `pane-${state.activeTab}`))
  renderWorkspaces()
  renderWorkflowBar()
  renderChat()
  renderStatusAndActions()
  renderAllStats()
  renderTabContent()
  renderDetail()
}

// Continue — walks the demo script

const demoContinue = userText => {
  const step = currentStep()
  if (!step) return
  if (state.activeAutomation) return

  const msg = userText ?? step.response
  if (msg) pushMsg(msg)

  const next = demo()[state.demoIndex + 1]
  if (next?.steps) {
    enterStep(state.demoIndex + 1)
  } else {
    state.status = 'Architect is working…'
    render()
    setTimeout(() => { state.status = null; advanceStep() }, 1000)
  }
}


// Collapsible panels

const initStrip = (stripId, toggleId) => {
  const strip = g(stripId)
  g(toggleId).addEventListener('click', e => { e.stopPropagation(); strip.classList.toggle('collapsed') })
  strip.addEventListener('click', () => { if (strip.classList.contains('collapsed')) strip.classList.remove('collapsed') })
}

initStrip('sidenav', 'nav-toggle')
initStrip('workspaces-panel', 'workspaces-toggle')
initStrip('chat-panel', 'chat-toggle')
g('new-workspace-btn').addEventListener('click', addWorkspace)

const openDetail = () => { const p = g('detail-panel'); p.classList.remove('collapsed'); p.classList.toggle('narrow', !!state.selectedFile?.details); g('detail-overlay').hidden = false }
const closeDetail = () => { g('detail-panel').classList.add('collapsed'); g('detail-overlay').hidden = true; state.selectedFile = null; if (filesGrid) filesGrid.redrawRows() }
g('detail-back').addEventListener('click', closeDetail)
g('detail-toggle').addEventListener('click', closeDetail)
g('detail-overlay').addEventListener('click', closeDetail)
g('detail-open').addEventListener('click', () => { if (state.selectedFile?.path) window.open(state.selectedFile.path, '_blank') })
g('detail-download').addEventListener('click', () => {
  if (!state.selectedFile?.path) return
  const a = document.createElement('a')
  a.href = state.selectedFile.path
  a.download = state.selectedFile.name
  a.click()
})




q('.chip-tab').forEach(tab => tab.addEventListener('click', () => {
  state.activeTab = tab.dataset.tab
  render()
  sizeActiveGrid()
}))

const ffStops = [
  { tab: 'files', title: 'Files uploaded', workflow: 'file-ingress' },
  { tab: 'model', title: 'Model built', workflow: 'generate-model' },
  { tab: 'rules', title: 'Rules built', workflow: 'generate-rules' },
  { tab: 'results', title: 'Results built', workflow: 'generate-results' },
  { tab: 'verify', title: 'Validated', workflow: 'validate' },
  { tab: 'commit', title: 'Committed', workflow: 'commit-to-cloud' },
]
const nextFfStop = () => { const idx = ffStops.findIndex(s => s.workflow === state.workflow?.id); return ffStops[idx + 1] ?? null }

const fastForward = async target => {
  if (state.activeAutomation) {
    if (state.statusInterval) { clearInterval(state.statusInterval); state.statusInterval = null }
    state.activeAutomation = null
  }
  if (modelGrid) { modelGrid.destroy(); modelGrid = null }
  if (modelTree) { modelTree.destroy(); modelTree = null }
  if (resultsGrid) { resultsGrid.destroy(); resultsGrid = null }
  if (rulesGrid) { rulesGrid.destroy(); rulesGrid = null }
  if (rulesTree) { rulesTree.destroy(); rulesTree = null }
  const cur = (demos[state.demoId]?.sequences?.[state.sequence]?.steps ?? [])[state.demoIndex]
  if (cur?.workflow === state.workflow?.id && cur?.response) { pushMsg(cur.response); state.demoIndex++ }
  let hitTarget = false
  let pendingProductData = null
  for (let safety = 0; safety < 200; safety++) {
    const steps = demos[state.demoId]?.sequences?.[state.sequence]?.steps ?? []
    const step = steps[state.demoIndex]
    if (!step) {
      const next = demos[state.demoId]?.sequences?.[state.sequence]?.next
      if (next) { state.sequence = next; state.demoIndex = 0; continue }
      break
    }
    if (step.workspace) state.name = step.workspace
    if (step.workflow) {
      state.workflow = { id: step.workflow, step: step.steps?.length ?? 0 }
      if (step.workflow === target) hitTarget = true
    }
    if (step.placeholder) state.placeholder = step.placeholder
    if (step.preloadFiles) step.preloadFiles.forEach(f => addContextFile(f))
    if (step.skip && state.skipIndustry) {
      pushMsg({ type: 'agent', text: step.skip.agent })
      if (step.file) addContextFile(step.file)
      state.demoIndex++; continue
    }
    if (step.agent) pushMsg({ type: 'agent', text: step.agent })
    if (step.steps) {
      state.workflowStartTime = Date.now()
      if (step.file) {
        const a = step.assessment ?? {}
        const detail = [a.pages && `${a.pages} pages`, a.tables && `${a.tables} tables`].filter(Boolean).join(' · ')
        const file = { ...step.file, assessment: a, detail: detail || undefined, progress: 1 }
        state.files.push(file)
        if (step.productSummary) updateProductSummary(step.productSummary, step.assessment)
        pushMsg({ type: 'file-card', file })
      } else if (step.label) {
        const detail = step.steps.map(s => s.detail).pop()
        pushMsg({ type: 'result-card', label: step.label, detail, tab: step.tab })
      }
      if (step.productData) pendingProductData = step.productData
      const last = step.steps[step.steps.length - 1]
      if (last?.context) state.context = last.context
      if (step.tab) state.activeTab = step.tab
      pushElapsed()
    } else {
      if (step.file) addContextFile(step.file)
      if (step.recap) {
        if (step.files) step.files.forEach(f => {
          const file = state.files.find(sf => sf.name === f.label)
          if (file) pushMsg({ type: 'file-card', file })
        })
        const archived = [...state.messages]
        state.messages = [{ type: 'collapsed-messages', archived, expanded: false }]
        if (step.files) {
          const wf = state.workflow && workflows[state.workflow.id]
          pushMsg({ type: 'recap', files: step.files, label: `${wf?.name ?? 'Workflow'} complete` })
        }
        if (step.context) state.context = step.context
      }
      if (step.actions) {
        const action = step.actions.find(a => !a.disabled)
        if (action?.workflow) state.workflow = { id: action.workflow, step: 0 }
        if (action?.sequence) { state.sequence = action.sequence; state.demoIndex = 0; continue }
      }
    }
    const nextIdx = state.demoIndex + 1
    const ns = (demos[state.demoId]?.sequences?.[state.sequence]?.steps ?? [])[nextIdx]
    if (hitTarget && (!ns?.workflow || ns.workflow !== target)) break
    if (step.response) pushMsg(step.response)
    state.demoIndex++
  }
  if (pendingProductData) {
    state._fullProductData ??= await fetch(pendingProductData).then(r => r.json())
    const full = state._fullProductData
    state.name = full.product.name
    const reveal = { product: full.product, model: { inputGroups: [], inputs: [], inputValues: [] }, attributes: { inputAttributes: [] }, rules: { logicGroups: [], logicItems: [], drivenInputs: [], inputFilters: [], iterators: [], equations: [] }, results: { bomSkeleton: [], drivenItemMasters: [], itemFamilies: [], itemMasters: [], productOutputs: [] } }
    if (target === 'generate-model' || target === 'generate-rules' || target === 'generate-results' || target === 'validate' || target === 'commit-to-cloud') { reveal.model = full.model; reveal.attributes = full.attributes }
    if (target === 'generate-rules' || target === 'generate-results' || target === 'validate' || target === 'commit-to-cloud') reveal.rules = full.rules
    if (target === 'generate-results' || target === 'validate' || target === 'commit-to-cloud') reveal.results = full.results
    state.productData = reveal
  }
  const stop = ffStops.find(s => s.workflow === target)
  if (stop?.tab) state.activeTab = stop.tab
  state.placeholder = g('chat-input').dataset.default
  state.status = null
  state.activeAutomation = null
  render()
  sizeActiveGrid()
}

const submitInput = () => {
  const input = g('chat-input')
  const val = input.value.trim()
  if (!val) return
  input.value = ''
  demoContinue(val)
}

g('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') submitInput() })
g('send-btn').addEventListener('click', submitInput)
g('ff-btn').addEventListener('click', () => { const stop = nextFfStop(); if (stop) fastForward(stop.workflow) })

g('menu-reset').addEventListener('click', () => {
  g('workspace-menu').hidePopover()
  if (!confirm('Reset this workspace? All progress will be lost.')) return
  reset(); render()
})
let detailMode = 'drawer'

g('menu-detail-toggle').addEventListener('click', () => {
  const sw = g('menu-detail-toggle')
  const on = sw.getAttribute('aria-checked') !== 'true'
  sw.setAttribute('aria-checked', on)
  detailMode = on ? 'hover' : 'drawer'
})

g('hover-card-close').addEventListener('click', () => closeHoverCard())
g('detail-overlay').addEventListener('click', () => { if (detailMode === 'hover') closeHoverCard(); else closeDetail() })

const openHoverCard = (title, contentEl) => {
  g('hover-card-title').textContent = title
  const content = g('hover-card-content')
  content.replaceChildren()
  content.appendChild(contentEl)
  g('hover-card').hidden = false
  g('detail-overlay').hidden = false
}

const closeHoverCard = () => {
  g('hover-card').hidden = true
  g('detail-overlay').hidden = true
}

g('menu-workflow-toggle').addEventListener('click', () => {
  const bar = g('workflow-bar')
  const sw = g('menu-workflow-toggle')
  const on = sw.getAttribute('aria-checked') !== 'true'
  sw.setAttribute('aria-checked', on)
  bar.hidden = !on
})

// Init

fetch('fixtures.json').then(r => r.json()).then(fx => {
  fixtures = fx
  workflows = fx.workflows ?? {}
  return Promise.all((fx.demos ?? []).map(f => fetch(f).then(r => r.json())))
}).then(demoFiles => {
  demoFiles.forEach(df => demos.push({ ...df, sequences: buildDemoSequences(fixtures.sequences, df) }))
  demos.forEach((_, i) => workspaces.push(createWorkspace(i)))
  workspaces.forEach((ws, i) => { activeWorkspaceId = i; state = ws; enterStep(0) })
  activeWorkspaceId = 0
  state = workspaces[0]
  render()
})

window.addEventListener('resize', sizeActiveGrid)
