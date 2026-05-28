const g = document.getElementById.bind(document)
const q = sel => document.querySelectorAll(sel)

const makeEl = (tag, cls, text) => {
  const el = document.createElement(tag)
  if (cls) el.className = cls
  if (text !== undefined) el.textContent = text
  return el
}

const renderFilterBar = (options, activeSet, onToggle) => {
  if (!options.length) return null
  const bar = makeEl('div', 'filter-bar')
  const allChip = makeEl('button', `sub-tab${activeSet === null ? ' active' : ''}`, 'All')
  allChip.type = 'button'
  allChip.addEventListener('click', () => onToggle(null))
  bar.appendChild(allChip)
  options.forEach(opt => {
    const chip = makeEl('button', `sub-tab${activeSet?.has(opt.value) ? ' active' : ''}`, opt.label)
    chip.type = 'button'
    chip.addEventListener('click', () => {
      const next = activeSet ? new Set(activeSet) : new Set([opt.value])
      if (activeSet) { if (next.has(opt.value)) next.delete(opt.value); else next.add(opt.value) }
      onToggle(next.size === 0 ? null : next)
    })
    bar.appendChild(chip)
  })
  return bar
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
  { field: 'name', headerName: 'Name', minWidth: 160, suppressSizeToFit: false },
  { cellRenderer: p => {
    const labels = { csv: 'CSV', md: 'Markdown', pdf: 'PDF' }
    const label = labels[p.value] ?? p.value?.toUpperCase()
    const el = makeEl('span', 'cell-filter', label)
    el.addEventListener('click', e => { e.stopPropagation(); state.filters.files = new Set([p.value]); filesGrid.onFilterChanged(); renderFilesFilter() })
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
  placeholder: 'Message…',
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
  if (resultsGrid) { resultsGrid.destroy(); resultsGrid = null }
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
  if (resultsGrid) { resultsGrid.destroy(); resultsGrid = null }
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
  state.placeholder = step.placeholder ?? 'Message…'
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

const renderFilesFilter = () => {
  const pane = g('pane-files')
  pane.querySelector('.filter-bar')?.remove()
  const types = [...new Set(state.files.map(f => f.type))].sort()
  const labels = { csv: 'CSV', md: 'Markdown', pdf: 'PDF' }
  const bar = renderFilterBar(types.map(t => ({ label: labels[t] ?? t.toUpperCase(), value: t })), state.filters.files ?? null, set => {
    state.filters.files = set
    if (filesGrid) filesGrid.onFilterChanged()
    renderFilesFilter()
  })
  if (bar) pane.insertBefore(bar, pane.firstChild)
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
    renderFilesFilter()
    return
  }
  if (state.activeTab !== 'files') return
  filesGrid = agGrid.createGrid(el, {
    autoSizeStrategy: { type: 'fitCellContents', scaleUpToFitGridWidth: true },
    columnDefs: fileCols,
    cellSelection: true,
    defaultColDef: { editable: true, resizable: false, sortable: true, suppressSizeToFit: true },
    getContextMenuItems: gridContextMenu,
    doesExternalFilterPass: node => state.filters.files.has(node.data.type),
    getRowClass: p => p.data?.name === state.selectedFile?.name ? 'row-active' : '',
    isExternalFilterPresent: () => state.filters.files != null,
    popupParent: document.body,
    rowData: rows,
    rowSelection: { checkboxes: true, headerCheckbox: true, mode: 'multiRow' },
    selectionColumnDef: { pinned: 'left', suppressSizeToFit: true },
    theme: gridTheme(),
    onFirstDataRendered: onGridReady,
    onRowClicked: e => {
      const file = state.files.find(f => f.name === e.data.name)
      if (file) { state.selectedFile = file; filesGrid.redrawRows(); openDetail(); renderDetail() }
    },
  })
  renderFilesFilter()
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
      fetch(file.path).then(r => { if (!r.ok) throw new Error(r.status); return r.text() }).then(text => { file.markdown = text; renderMd(text) }).catch(() => { md.textContent = 'File not found.' })
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
  if (!el || !stats?.length) return
  el.replaceChildren()
  if (stats[0]?.value !== undefined) {
    const grid = makeEl('div', 'data-grid')
    stats.forEach(({ label, value }) => { const row = makeEl('div', 'data-row'); row.appendChild(makeEl('span', 'data-key', label)); row.appendChild(makeEl('span', null, value)); grid.appendChild(row) })
    el.appendChild(grid)
    return
  }
  if (!stats.some(s => s.count)) { el.appendChild(makeEl('span', 'empty-state', 'Nothing has been generated, yet.')); return }
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
  const p = state.productData
  if (!p) return { attributes: [], equations: [], model: [], results: [], rules: [] }
  return {
    attributes: (p.attributes?.productAttributes ?? []).map(a => ({ label: a.name, value: String(a.value) })),
    equations: [{ count: p.equations?.length ?? 0, icon: 'fa-regular fa-superscript', label: 'equations' }],
    model: [
      { count: countFrom(p.model, 'inputGroups'), icon: 'fa-regular fa-layer-group', label: 'input groups' },
      { count: countFrom(p.model, 'inputs'), icon: 'fa-regular fa-input-text', label: 'inputs' },
      { count: countFrom(p.model, 'inputValues'), icon: 'fa-regular fa-list', label: 'input values' },
      { count: countFrom(p.attributes, 'inputAttributes'), icon: 'fa-regular fa-table-cells', label: 'input attributes' },
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

// Tab content renderers (unchanged — driven by state.productData)

let modelGrid = null
let rulesTree = null

const modelTreeCols = [
  { field: 'type', headerName: 'Type' },
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
      rows.push({ default: input.default, detailRows, id: input.id, name: input.label, nodeType: 'input', options: values.length || '', path: [group.name, input.label], type: input.type })
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
  const el = g('subpane-model-tree')
  const json = g('subpane-model-json')
  if (!el || !state.productData) return
  const rows = buildModelRows(state.productData)
  if (modelGrid) { modelGrid.setGridOption('rowData', rows); return }
  el.replaceChildren()
  const gridEl = makeEl('div', 'pane-grid-full'); gridEl.id = 'model-grid'
  el.appendChild(gridEl)
  modelGrid = agGrid.createGrid(gridEl, {
    autoGroupColumnDef: { cellRendererParams: { suppressCount: true }, headerName: 'Name', minWidth: 240, suppressSizeToFit: false },
    autoSizeStrategy: { type: 'fitCellContents', scaleUpToFitGridWidth: true },
    cellSelection: true,
    columnDefs: modelTreeCols,
    defaultColDef: { editable: true, resizable: false, sortable: true, suppressSizeToFit: true },
    detailCellRendererParams: p => {
      const inputNum = findInputNum(p.data.id)
      const attrs = (state.productData?.attributes?.inputAttributes ?? []).filter(a => a.driverInputNum === inputNum)
      const addCol = {
        headerComponent: class {
          init(hp) {
            this.gui = makeEl('button', 'button button-icon')
            this.gui.innerHTML = '<i class="fa-solid fa-plus"></i>'
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
        maxWidth: 40,
        sortable: false,
        suppressSizeToFit: true,
      }
      return {
        detailGridOptions: {
          autoSizeStrategy: { type: 'fitCellContents', scaleUpToFitGridWidth: true },
          columnDefs: [
            { field: 'label', headerName: 'Value' },
            ...attrs.map(a => ({ field: a.name, headerName: a.name })),
            addCol,
          ],
          defaultColDef: { editable: true, resizable: false, sortable: true },
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
    onFirstDataRendered: onGridReady,
    popupParent: document.body,
    rowData: rows,
    rowDragManaged: true,
    suppressMoveWhenRowDragging: true,
    theme: gridTheme(),
    treeData: true,
  })
  if (json) { json.replaceChildren(); json.appendChild(makeEl('pre', 'json-view', JSON.stringify(state.productData.model, null, 2))) }
}

const renderRulesTab = () => {
  const el = g('subpane-rules-tree')
  const json = g('subpane-rules-json')
  if (!el || !state.productData) return
  if (rulesTree) return
  el.replaceChildren()
  const r = state.productData.rules
  const nodes = (r.logicGroups ?? []).map(group => ({
    data: { name: group.name, nodeType: 'group' },
    nodes: (r.logicItems ?? []).filter(i => i.groupNum === group.num).map(item => ({
      data: { meta: item.type.replace(/_/g, ' '), name: item.name, nodeType: 'item' },
      nodes: []
    }))
  }))
  const addSection = (name, items, fmt) => { if (items?.length) nodes.push({ data: { name, nodeType: 'section' }, nodes: items.map(i => ({ data: { ...fmt(i), nodeType: 'leaf' }, nodes: [] })) }) }
  addSection('Driven Inputs', r.drivenInputs, i => ({ name: i.description }))
  addSection('Input Filters', r.inputFilters, i => ({ meta: i.attribute, name: `Input ${i.filteredInputNum} filtered by ${i.filteringInputNum}` }))
  addSection('Iterators', r.iterators, i => ({ meta: i.description, name: i.code }))
  const grip = '<i class="fa-solid fa-grip-vertical tree-grip"></i>'
  rulesTree = new SortableTree({
    element: el,
    icons: { collapsed: '<i class="fa-solid fa-angle-right"></i>', open: '<i class="fa-solid fa-angle-down"></i>' },
    initCollapseLevel: 2,
    lockRootLevel: true,
    nodes,
    onChange: () => {},
    renderLabel: d => {
      const meta = d.meta ? `<span class="tree-type">${d.meta}</span>` : ''
      if (d.nodeType === 'group' || d.nodeType === 'section') return `${grip}<b>${d.name}</b>`
      return `${grip}<span>${d.name}</span>${meta}`
    },
  })
  if (json) { json.replaceChildren(); json.appendChild(makeEl('pre', 'json-view', JSON.stringify(state.productData.rules, null, 2))) }
}

const renderEquationsTab = () => {
  const el = g('subpane-rules-equations'); if (!el || !state.productData) return; el.replaceChildren()
  ;(state.productData.equations ?? []).forEach(eq => {
    const sec = makeEl('div', 'equation-card')
    const header = makeEl('div', 'equation-header'); header.appendChild(makeEl('b', null, eq.label)); header.appendChild(makeEl('span', 'data-type', `→ ${eq.outputField}`)); sec.appendChild(header)
    sec.appendChild(makeEl('code', 'equation-expr', eq.expression))
    if (eq.variables?.length) { const vars = makeEl('div', 'equation-vars'); eq.variables.forEach(v => vars.appendChild(makeEl('span', 'data-type', `${v.name} (input ${v.inputNum})`))); sec.appendChild(vars) }
    el.appendChild(sec)
  })
}

let resultsGrid = null

function sizeActiveGrid() {
  const grid = state.activeTab === 'files' ? filesGrid : state.activeTab === 'model' ? modelGrid : state.activeTab === 'results' ? resultsGrid : null
  if (!grid) return
  grid.autoSizeAllColumns()
  grid.sizeColumnsToFit()
}
const onGridReady = p => { p.api.autoSizeAllColumns(); p.api.sizeColumnsToFit() }

const resultsCols = [
  { field: 'itemNumber', headerName: 'Item #' },
  { cellRenderer: p => {
    const indent = (p.data?.level ?? 0) * 20
    const el = makeEl('span'); el.style.paddingLeft = `${indent}px`; el.textContent = p.value ?? ''
    return el
  }, field: 'description', headerName: 'Description', minWidth: 220, suppressSizeToFit: false },
  { field: 'qty', headerName: 'Qty', type: 'rightAligned' },
  { field: 'uom', headerName: 'UOM' },
  { field: 'source', headerName: 'Source' },
  { cellRenderer: p => {
    if (!p.value) return ''
    const el = makeEl('span', 'cell-badge'); el.textContent = p.value; el.dataset.category = p.value; return el
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
  ;(p.equations ?? []).forEach(eq => {
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
        const resolvePattern = pat => pat.replace(/\{(\w+)\}/g, (_, k) => vals[k.toUpperCase()] ?? vals[k] ?? k)
        const pattern = (p.attributes?.productAttributes ?? []).find(a => a.value?.includes('{') && f.name.toLowerCase().includes(a.name.replace(/_pattern$/, '').replace(/_/g, ' ')))
        itemNumber = pattern ? resolvePattern(pattern.value) : `${p.product?.code ?? 'CFG'}-${Object.values(vals).join('-')}`
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
  const el = g('pane-results'); if (!el || !state.productData) return
  const rows = resolveConfig(state.productData)
  if (resultsGrid) { resultsGrid.setGridOption('rowData', rows); return }
  el.replaceChildren()
  const gridEl = makeEl('div', 'pane-grid-full'); gridEl.id = 'results-grid'
  el.appendChild(gridEl)
  resultsGrid = agGrid.createGrid(gridEl, {
    autoSizeStrategy: { type: 'fitCellContents', scaleUpToFitGridWidth: true },
    columnDefs: resultsCols,
    cellSelection: true,
    defaultColDef: { editable: true, resizable: false, sortable: true, suppressSizeToFit: true },
    getContextMenuItems: gridContextMenu,
    getRowClass: p => p.data?.included === false ? 'row-excluded' : '',
    onFirstDataRendered: onGridReady,
    popupParent: document.body,
    rowData: rows,
    theme: gridTheme(),
  })
}

const renderPreviewTab = () => {
  const el = g('pane-preview'); if (!el || !state.productData) return; el.replaceChildren()
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

const renderCommitTab = () => {
  const el = g('commit-content'); if (!el || !state.productData) return; el.replaceChildren()
  const manifest = [[1, 'Product'], [state.productData.model.inputGroups?.length ?? 0, 'Input Groups'], [state.productData.model.inputs?.length ?? 0, 'Inputs'], [state.productData.model.inputValues?.length ?? 0, 'Input Values'], [state.productData.rules.logicGroups?.length ?? 0, 'Logic Groups'], [state.productData.rules.logicItems?.length ?? 0, 'Logic Items'], [state.productData.equations?.length ?? 0, 'Equations'], [state.productData.results.itemMasters?.length ?? 0, 'Item Masters'], [state.productData.results.bomSkeleton?.length ?? 0, 'BOM Lines']].filter(([c]) => c)
  const total = manifest.reduce((s, [c]) => s + c, 0)
  const view = makeEl('div', 'commit-view'); view.appendChild(makeEl('b', null, 'Draft Summary'))
  const list = makeEl('div', 'data-grid')
  manifest.forEach(([count, label]) => { const row = makeEl('div', 'data-row'); row.appendChild(makeEl('span', 'data-count', String(count))); row.appendChild(makeEl('span', null, label)); list.appendChild(row) })
  list.appendChild(makeEl('div', 'data-row-total', `${total} items total`))
  view.appendChild(list); el.appendChild(view)
}


const clearTabContent = () => {
  if (modelGrid) { modelGrid.destroy(); modelGrid = null }
  if (resultsGrid) { resultsGrid.destroy(); resultsGrid = null }
  if (rulesTree) { rulesTree.destroy(); rulesTree = null }
  ;['subpane-model-tree', 'subpane-model-attributes', 'subpane-model-json', 'subpane-rules-tree', 'subpane-rules-equations', 'subpane-rules-json', 'pane-results', 'pane-preview', 'commit-content'].forEach(id => g(id)?.replaceChildren())
}

const renderTabContent = () => { if (!state.productData) { clearTabContent(); return } renderModelTab(); renderRulesTab(); renderEquationsTab(); renderResultsTab(); renderPreviewTab(); renderCommitTab() }


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
  g('menu-context').textContent = `Context ${state.context}%`
  const ring = document.querySelector('.context-ring-fill')
  if (ring) {
    const c = 100.53
    ring.setAttribute('stroke-dashoffset', c - (c * state.context / 100))
    ring.classList.toggle('danger', state.context > 40)
  }
  g('chat-input').placeholder = state.placeholder
  const ffBtn = g('ff-btn')
  const atEnd = state.sequence === 'end-game'
  ffBtn.title = atEnd ? 'Fast-forward to commit' : 'Fast-forward to build complete'
  ffBtn.querySelector('i').className = atEnd ? 'fa-solid fa-forward-fast' : 'fa-solid fa-forward'
  q('.chip-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === state.activeTab))
  q('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `pane-${state.activeTab}`))
  renderWorkspaces()
  renderWorkflowBar()
  renderChat()
  renderStatusAndActions()
  renderFilesList()
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
  sizeActiveGrid()
}))

const fastForward = async target => {
  if (state.activeAutomation) {
    if (state.statusInterval) { clearInterval(state.statusInterval); state.statusInterval = null }
    state.activeAutomation = null
  }
  if (modelGrid) { modelGrid.destroy(); modelGrid = null }
  if (resultsGrid) { resultsGrid.destroy(); resultsGrid = null }
  if (rulesTree) { rulesTree.destroy(); rulesTree = null }
  const stopSequence = target === 'build' ? 'end-game' : null
  let pendingProductData = null
  for (let safety = 0; safety < 200; safety++) {
    const steps = demos[state.demoId]?.sequences?.[state.sequence]?.steps ?? []
    const step = steps[state.demoIndex]
    if (!step) {
      const next = demos[state.demoId]?.sequences?.[state.sequence]?.next
      if (next && next !== stopSequence) { state.sequence = next; state.demoIndex = 0; continue }
      break
    }
    if (step.workspace) state.name = step.workspace
    if (step.workflow) state.workflow = { id: step.workflow, step: step.steps?.length ?? 0 }
    if (step.placeholder) state.placeholder = step.placeholder
    if (step.preloadFiles) step.preloadFiles.forEach(f => addContextFile(f))
    if (step.skip && state.skipIndustry) {
      pushMsg({ type: 'agent', text: step.skip.agent })
      if (step.file) addContextFile(step.file)
      state.demoIndex++; continue
    }
    if (step.agent) pushMsg({ type: 'agent', text: step.agent })
    if (step.response) pushMsg(step.response)
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
    state.demoIndex++
  }
  if (pendingProductData) {
    const pd = await fetch(pendingProductData).then(r => r.json())
    state.productData = pd
    state.name = pd.product.name
  }
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
g('ff-btn').addEventListener('click', () => {
  const atEnd = state.sequence === 'end-game'
  fastForward(atEnd ? 'commit' : 'build')
})

g('menu-reset').addEventListener('click', () => {
  g('workspace-menu').hidePopover()
  if (!confirm('Reset this workspace? All progress will be lost.')) return
  reset(); render()
})
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
