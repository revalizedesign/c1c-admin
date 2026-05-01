if (new URLSearchParams(location.search).has('dev')) document.body.classList.add('dev')

const isSuperadmin = () => document.getElementById('superadmin-check')?.checked

const g = document.getElementById.bind(document)
const q = document.querySelectorAll.bind(document)

const makeEl = (tag, cls, text) => {
  const el = document.createElement(tag)
  if (cls) el.className = cls
  if (text !== undefined) el.textContent = text
  return el
}

const makeStub = (iconClass, title) => {
  const stub = makeEl('div', 'pane-stub')
  const i = makeEl('i')
  i.className = iconClass
  stub.appendChild(i)
  stub.appendChild(makeEl('h2', null, title))
  return stub
}

const FEATURES = [
  { label: 'Two-pane layout (Chat + Workspace)', status: 'shipped' },
  { label: 'Guided onboarding flow', status: 'shipped' },
  { label: 'AI generation with step-by-step progress', status: 'shipped' },
  { label: 'Tab reveal during generation', status: 'shipped' },
  { label: 'Model tree with input inspection', status: 'shipped' },
  { label: 'Rules & equations display', status: 'shipped' },
  { label: 'BOM results grid', status: 'shipped' },
  { label: 'Interactive configuration preview', status: 'prototype' },
  { label: 'Build approval flow', status: 'shipped' },
  { label: 'Commit simulation with audit trail', status: 'shipped' },
  { label: 'AI health signal (post-commit)', status: 'shipped' },
  { label: '5-stage workflow', status: 'shipped' },
  { label: 'Session persistence', status: 'shipped' },
  { label: 'Superadmin mode', status: 'shipped' },
  { label: 'No-delete guardrails (v1)', status: 'shipped' },
  { label: 'Attributes UX', status: 'soon' },
  { label: 'Chat Q&A responses', status: 'prototype' },
  { label: 'Refinement loop (inline + chat edits)', status: 'prototype' },
  { label: 'Q&A → generation handoff', status: 'prototype' },
  { label: 'Domain knowledge injection (vertical-specific)', status: 'prototype' },
  { label: 'Confidence indicators per row', status: 'out' },
  { label: 'Inline validation warnings', status: 'out' },
  { label: 'Undo / action archiving', status: 'subagent' },
  { label: 'Data retention & GDPR compliance', status: 'subagent' },
  { label: 'Cost benchmarking & rate limiting', status: 'subagent' },
  { label: 'Regional model availability', status: 'subagent' },
  { label: 'Human benchmarking & quality baselines', status: 'subagent' },
]

const INDUSTRIES = ['Automotive', 'Construction', 'Healthcare', 'Manufacturing', 'Retail', 'Technology', 'Other']
const PRODUCT_STEPS = ['Model', 'Rules', 'BOM', 'Preview', 'Commit']

const COMMIT_STEPS = [
  { detail: '3 new · 0 edits', ms: 1500, name: 'Operation selection', reasoning: ['Classifying draft items as new or edit…'] },
  { detail: 'Product created', ms: 2000, name: 'Writing product', reasoning: ['Creating product record in C1C…'] },
  { detail: '4 groups · 12 inputs', ms: 2500, name: 'Writing skeleton', reasoning: ['Committing input groups and inputs…', 'Validating attribute references…'] },
  { detail: '3 logic items', ms: 2000, name: 'Writing rules', reasoning: ['Committing logic items and drivens…', 'Validating dependency order…'] },
  { detail: '8 line items', ms: 2000, name: 'Writing BOM', reasoning: ['Committing BOM line items…', 'Linking item masters…'] },
  { detail: 'All checks passed', ms: 1500, name: 'Binding validation', reasoning: ['Running schema validation…', 'Checking reference integrity…'] },
]

const GEN_STEPS = [
  { detail: '847 tokens · 12 pages', ms: 1500, name: 'Document parsed', reasoning: null },
  { detail: '4 groups · 12 inputs', ms: 3500, name: 'Input groups', reasoning: ['Scanning spec tables for configurable attributes…', 'Mapping dropdown options to input values…', 'Resolving defaults from requirements…'], stage: 'build', tab: 'model' },
  { detail: '1 root · 1 logic item', ms: 5000, name: 'Logic model', reasoning: ['Analyzing conditional relationships between attributes…', 'Grouping inputs by functional area…', 'Validating attribute dependency graph…'], tab: 'model' },
  { detail: '3 rules', ms: 4000, name: 'Rules', reasoning: ['Extracting if/then constraints from spec notes…', 'Resolving filter actions for dependent inputs…'], tab: 'rules' },
  { detail: '2 expressions', ms: 3000, name: 'Equations', reasoning: ['Translating pricing formulas to expressions…', 'Mapping input variables to equation fields…'], tab: 'equations' },
  { detail: '8 line items', ms: 3000, name: 'BOM mapping', reasoning: ['Linking part numbers from item master…', 'Resolving quantities from spec requirements…'], tab: 'results' },
]

// AG Grid

agGrid.ModuleRegistry.registerModules([agGrid.AllCommunityModule, agGrid.AllEnterpriseModule])

const gridTheme = () =>
  agGrid.themeQuartz.withParams({
    backgroundColor: 'var(--color-lightest)',
    borderColor: 'var(--color-light)',
    foregroundColor: 'var(--color-darkest)',
    headerBackgroundColor: 'var(--color-lighter)',
    headerTextColor: 'var(--color-darker)',
    rowBorder: { color: 'var(--color-light)', style: 'solid', width: 1 },
    rowHoverColor: 'var(--color-lighter)',
  })

const flattenBOM = (items, path = []) =>
  items.flatMap(item => {
    const nodePath = [...path, item.partNumber || item.description]
    return [{ ...item, _path: nodePath }, ...(item.children ? flattenBOM(item.children, nodePath) : [])]
  })

const bomBaseCols = [
  { field: 'partNumber', headerName: 'Part No.', width: 140 },
  { field: 'quantity', headerName: 'Qty', type: 'numericColumn', width: 70 },
  { field: 'unit', headerName: 'Unit', width: 70 },
]

const resultsCols = [
  ...bomBaseCols,
  {
    cellRenderer: () => {
      const btn = makeEl('button', 'button outline compact')
      btn.textContent = 'Configure'
      btn.type = 'button'
      return btn
    },
    headerName: '', sortable: false, suppressSizeToFit: true, width: 110,
  },
]

const draftCols = [...bomBaseCols]

const gridOpts = extra => ({
  autoGroupColumnDef: { cellRendererParams: { suppressCount: true }, flex: 1, headerName: 'Description', minWidth: 200, valueGetter: p => p.data?.description },
  defaultColDef: { resizable: false, sortable: true },
  getDataPath: row => row._path,
  groupDefaultExpanded: -1,
  popupParent: document.body,
  rowSelection: { checkboxes: true, headerCheckbox: true, mode: 'multiRow' },
  selectionColumnDef: { pinned: 'left', suppressSizeToFit: true, width: 40 },
  theme: gridTheme(),
  treeData: true,
  ...extra,
})

let resultsGrid = null, draftGrid = null

const renderResultsGrid = items => {
  if (resultsGrid) resultsGrid.destroy()
  resultsGrid = agGrid.createGrid(g('results-grid'), gridOpts({ columnDefs: resultsCols, rowData: flattenBOM(items) }))
}

// Stage + tab switching

const activateStage = name => {
  q('.stage-btn').forEach(b => b.classList.remove('active'))
  q('.stage-panel').forEach(p => p.classList.remove('active'))
  document.querySelector(`[data-stage="${name}"]`).classList.add('active')
  g(`stage-${name}`)?.classList.add('active')
  if (name === 'context') {
    g('chat-panel').classList.remove('collapsed')
    const drafts = activeSession?.drafts
    if (drafts?.length) renderDraft(drafts[drafts.length - 1])
  }
}

const activateDetailTab = name => {
  q('.detail-tab').forEach(t => t.classList.remove('active'))
  q('.detail-pane').forEach(p => p.classList.remove('active'))
  document.querySelector(`[data-detail-tab="${name}"]`).classList.add('active')
  g(`detail-pane-${name}`).classList.add('active')
  if (g('detail-panel').classList.contains('collapsed')) g('detail-panel').classList.remove('collapsed')
}

const activateTab = name => {
  q('.result-tab').forEach(t => t.classList.remove('active'))
  q('.tab-pane').forEach(p => p.classList.remove('active'))
  document.querySelector(`[data-tab="${name}"]`).classList.add('active')
  g(`pane-${name}`).classList.add('active')
}

const showContextDraft = () => activateStage('context')

const activateSubTab = subtabId => {
  const pane = g(`subpane-${subtabId}`)
  const parent = pane.closest('.tab-pane') ?? pane.closest('.stage-panel')
  parent.querySelectorAll(':scope > nav > .sub-tab').forEach(t => t.classList.remove('active'))
  parent.querySelectorAll(':scope > .sub-pane').forEach(p => p.classList.remove('active'))
  parent.querySelector(`[data-subtab="${subtabId}"]`).classList.add('active')
  pane.classList.add('active')
}

q('.stage-btn').forEach(btn => btn.addEventListener('click', () => activateStage(btn.dataset.stage)))

q('.result-tab').forEach(tab => tab.addEventListener('click', () => activateTab(tab.dataset.tab)))

q('.detail-tab').forEach(tab => tab.addEventListener('click', () => activateDetailTab(tab.dataset.detailTab)))

q('.sub-tab').forEach(tab =>
  tab.addEventListener('click', () => {
    const parent = tab.closest('.tab-pane') ?? tab.closest('.stage-panel')
    parent.querySelectorAll(':scope > nav > .sub-tab').forEach(t => t.classList.remove('active'))
    parent.querySelectorAll(':scope > .sub-pane').forEach(p => p.classList.remove('active'))
    tab.classList.add('active')
    parent.querySelector(`#subpane-${tab.dataset.subtab}`)?.classList.add('active')
  }),
)

// Draft view (Context stage)

const renderDraft = draft => {
  const view = g('draft-view')
  view.replaceChildren()
  const meta = makeEl('div', 'draft-meta')
  meta.appendChild(makeEl('span', 'badge', 'DRAFT'))
  meta.appendChild(makeEl('span', 'draft-meta-version', draft.time))
  view.appendChild(meta)
  const gridEl = makeEl('div', 'draft-grid-el')
  view.appendChild(gridEl)
  if (draftGrid) draftGrid.destroy()
  draftGrid = agGrid.createGrid(gridEl, gridOpts({ columnDefs: draftCols, rowData: flattenBOM(draft.items) }))
  g('draft-empty').hidden = true
  view.hidden = false
}

// Chat cards

const makeDraftCard = draft => {
  const card = makeEl('div', 'draft-card')
  card.addEventListener('click', () => { showContextDraft(); renderDraft(draft) })
  const icon = makeEl('i')
  icon.className = 'fa-regular fa-file-lines'
  card.appendChild(icon)
  const info = makeEl('div', 'draft-info')
  info.appendChild(makeEl('span', 'draft-label', 'Draft'))
  info.appendChild(makeEl('span', 'draft-version', `${draft.time} · ${draft.groups} groups · ${draft.inputs} inputs · ${draft.values} values`))
  card.appendChild(info)
  const chevron = makeEl('i')
  chevron.className = 'fa-solid fa-angle-right'
  card.appendChild(chevron)
  return card
}

const makeBuildCard = build => {
  const card = makeEl('div', 'draft-card')
  card.addEventListener('click', () => { activateStage('build'); activateTab('model') })
  const icon = makeEl('i')
  icon.className = 'fa-regular fa-hammer'
  card.appendChild(icon)
  const info = makeEl('div', 'draft-info')
  info.appendChild(makeEl('span', 'draft-label', 'Build'))
  info.appendChild(makeEl('span', 'draft-version', `${build.time} · ${build.zones} zones · ${build.inputs} inputs · ${build.rules} rules`))
  card.appendChild(info)
  const chevron = makeEl('i')
  chevron.className = 'fa-solid fa-angle-right'
  card.appendChild(chevron)
  return card
}

const makeGenerationCard = session => {
  const card = makeEl('div', 'draft-card')
  card.addEventListener('click', () => { activateStage('build'); activateTab('model') })
  const icon = makeEl('i'); icon.className = 'fa-regular fa-sparkles'
  card.appendChild(icon)
  const info = makeEl('div', 'draft-info')
  info.appendChild(makeEl('span', 'draft-label', 'Generation'))
  const groups = getInputGroups(session)
  const inputs = groups.flatMap(ig => ig.inputs)
  info.appendChild(makeEl('span', 'draft-version', [
    `${groups.length} input groups`,
    `${inputs.length} inputs`,
    `${(session.rules ?? []).length} rules`,
    `${(session.equations ?? []).length} equations`,
    `${(session.build?.results ?? []).length} BOM items`,
  ].join(' · ')))
  card.appendChild(info)
  const chevron = makeEl('i'); chevron.className = 'fa-solid fa-angle-right'
  card.appendChild(chevron)
  return card
}

const makeCommitCard = () => {
  const card = makeEl('div', 'draft-card')
  card.addEventListener('click', () => activateStage('commit'))
  const icon = makeEl('i'); icon.className = 'fa-regular fa-rocket-launch'
  card.appendChild(icon)
  const info = makeEl('div', 'draft-info')
  info.appendChild(makeEl('span', 'draft-label', 'Committed'))
  const manifest = getDraftManifest(activeSession)
  const total = manifest.reduce((s, [c]) => s + c, 0)
  info.appendChild(makeEl('span', 'draft-version', `${total} items · v2.14 · ${new Date().toLocaleTimeString()}`))
  card.appendChild(info)
  const chevron = makeEl('i'); chevron.className = 'fa-solid fa-angle-right'
  card.appendChild(chevron)
  return card
}

const makeApprovalCard = () => {
  const session = activeSession
  const latestDraft = session.drafts[session.drafts.length - 1]
  const card = makeEl('div', 'approval-card')

  const header = makeEl('div', 'approval-header')
  const hIcon = makeEl('i')
  hIcon.className = 'fa-regular fa-file-check'
  header.appendChild(hIcon)
  header.appendChild(makeEl('span', 'approval-title', 'Build Summary'))
  card.appendChild(header)

  const addSection = (label, rows) => {
    const sec = makeEl('div', 'approval-section')
    sec.appendChild(makeEl('p', 'approval-label', label))
    rows.forEach(([iconCls, text, sub]) => {
      const row = makeEl('div', 'approval-row')
      const ico = makeEl('i')
      ico.className = iconCls
      row.appendChild(ico)
      const body = makeEl('div', 'approval-row-body')
      body.appendChild(makeEl('span', null, text))
      if (sub) body.appendChild(makeEl('span', 'approval-sub', sub))
      row.appendChild(body)
      sec.appendChild(row)
    })
    card.appendChild(sec)
  }

  addSection('Source Draft', [
    ['fa-regular fa-file-lines', `Draft · ${latestDraft.time}`, `${latestDraft.groups} groups · ${latestDraft.inputs} inputs · ${latestDraft.values} values — latest`],
  ])
  addSection('References', session.files.map(f => ['fa-regular fa-file-pdf', f.name]))

  if (session.drafts.length >= 2) {
    const prev = session.drafts[session.drafts.length - 2]
    const changes = []
    const prevFlat = flattenBOM(prev.items).filter(i => i.partNumber)
    for (const item of flattenBOM(latestDraft.items).filter(i => i.partNumber)) {
      const prevItem = prevFlat.find(i => i.partNumber === item.partNumber)
      if (!prevItem) changes.push(['fa-regular fa-circle-dot', `${item.partNumber} added`])
      else if (prevItem.quantity !== item.quantity) changes.push(['fa-regular fa-circle-dot', `${item.partNumber} quantity updated: ${prevItem.quantity} → ${item.quantity}`])
    }
    if (changes.length) addSection('Changes', changes)
  }

  const footer = makeEl('div', 'approval-footer')
  const approveBtn = makeEl('button', 'button primary compact', 'Approve Build')
  approveBtn.type = 'button'
  const cancelBtn = makeEl('button', 'button outline compact', 'Cancel')
  cancelBtn.type = 'button'

  approveBtn.addEventListener('click', () => {
    footer.replaceChildren(makeEl('span', 'approval-approved', 'Approved'))
    const messages = g('chat-messages')
    messages.appendChild(makeBuildCard(session.build))
    const doneMsg = makeEl('div', 'chat-bubble ai', 'Build complete. Click the card to review in the Model tab.')
    messages.appendChild(doneMsg)
    messages.scrollTop = messages.scrollHeight
    session.chat.push({ id: `m-build-${Date.now()}`, type: 'build-card' })
    session.chat.push({ id: `m-done-${Date.now()}`, role: 'ai', content: 'Build complete. Click the card to review in the Model tab.' })
    persist()
  })
  cancelBtn.addEventListener('click', () => card.remove())

  footer.appendChild(approveBtn)
  footer.appendChild(cancelBtn)
  card.appendChild(footer)
  return card
}

// Collapsible strips

const initStrip = (stripId, toggleId) => {
  const strip = g(stripId)
  g(toggleId).addEventListener('click', e => { e.stopPropagation(); strip.classList.toggle('collapsed') })
  strip.addEventListener('click', () => { if (strip.classList.contains('collapsed')) strip.classList.remove('collapsed') })
}

let notifPanel = null

const toggleNotifications = () => {
  if (notifPanel) { notifPanel.remove(); notifPanel = null; return }
  notifPanel = makeEl('div', 'notif-panel')

  const addSection = (label, items, iconClass, rowClass) => {
    notifPanel.appendChild(makeEl('span', 'notif-section-label', label))
    for (const f of items) {
      const row = makeEl('div', rowClass ? `notif-row ${rowClass}` : 'notif-row')
      const icon = makeEl('i'); icon.className = iconClass
      row.appendChild(icon)
      row.appendChild(makeEl('span', null, f.label))
      notifPanel.appendChild(row)
    }
  }

  addSection('Shipped', FEATURES.filter(f => f.status === 'shipped'), 'fa-solid fa-check')
  addSection('Coming Soon', FEATURES.filter(f => f.status === 'soon'), 'fa-regular fa-clock', 'coming-soon')
  addSection('Eng Prototype Only', FEATURES.filter(f => f.status === 'prototype'), 'fa-regular fa-flask', 'coming-soon')
  addSection('Dedicated Sub-Agent', FEATURES.filter(f => f.status === 'subagent'), 'fa-regular fa-robot', 'coming-soon')
  addSection('Out of MVP Scope', FEATURES.filter(f => f.status === 'out'), 'fa-regular fa-circle-xmark', 'out-of-scope')

  document.body.appendChild(notifPanel)
  const rect = g('notif-btn').getBoundingClientRect()
  notifPanel.style.top = rect.bottom + 4 + 'px'
  notifPanel.style.right = (window.innerWidth - rect.right) + 'px'

  setTimeout(() => {
    const close = e => {
      if (!notifPanel?.contains(e.target) && e.target !== g('notif-btn')) {
        notifPanel?.remove(); notifPanel = null
        document.removeEventListener('click', close)
      }
    }
    document.addEventListener('click', close)
  })
}

initStrip('sidenav', 'nav-toggle')
initStrip('workspace-list', 'workspace-toggle')
initStrip('chat-panel', 'chat-toggle')
initStrip('detail-panel', 'detail-toggle')

g('notif-btn').addEventListener('click', toggleNotifications)
g('workspace-new').addEventListener('click', e => { e.stopPropagation(); createNewSession() })
g('reset-btn').addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); createNewSession() })
g('files-add').addEventListener('click', e => e.stopPropagation())
g('files-header').addEventListener('click', () => g('files-panel').classList.toggle('collapsed'))
g('chat-header').addEventListener('click', () => g('chat-section').classList.toggle('collapsed'))
g('quick-actions-header').addEventListener('click', () => g('quick-actions-panel').classList.toggle('collapsed'))

q('.pill').forEach(pill =>
  pill.addEventListener('click', () => {
    if (pill.textContent === 'Commit') {
      activateStage('commit')
      setTimeout(() => simulateCommit(), 300)
    } else if (pill.textContent === 'Build') {
      const messages = g('chat-messages')
      messages.appendChild(makeEl('div', 'chat-bubble ai', "I've reviewed the draft history and references. Here's a summary of what will be included in this build:"))
      messages.appendChild(makeApprovalCard())
      messages.scrollTop = messages.scrollHeight
    }
  }),
)

// Fixture / hydration

let data, sessions, activeSession, types
const STORAGE_KEY = 'revalize-admin'

let persistTimer
const persist = () => {
  clearTimeout(persistTimer)
  persistTimer = setTimeout(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(data)), 300)
}

const renderFiles = files => {
  const list = g('files-list')
  list.replaceChildren()
  for (const file of files) {
    const item = makeEl('div', 'file-item')
    const icon = makeEl('i')
    icon.className = `fa-regular ${{ mm: 'fa-file-chart-pie', pdf: 'fa-file-pdf' }[file.type] ?? 'fa-file'}`
    item.appendChild(icon)
    const info = makeEl('div', 'file-info')
    info.appendChild(makeEl('span', 'file-name', file.name))
    info.appendChild(makeEl('span', 'file-meta', `${file.type.toUpperCase()} · ${file.size}`))
    item.appendChild(info)
    list.appendChild(item)
  }
}

const renderChat = (messages, draftMap) => {
  const container = g('chat-messages')
  container.replaceChildren()
  for (const msg of messages) {
    if (msg.role) {
      container.appendChild(makeEl('div', `chat-bubble ${msg.role}`, msg.content))
    } else if (msg.type === 'draft-card') {
      const draft = draftMap[msg.draftId]
      if (draft) container.appendChild(makeDraftCard(draft))
    } else if (msg.type === 'build-card') {
      container.appendChild(makeBuildCard(activeSession.build))
    } else if (msg.type === 'generation-card') {
      container.appendChild(makeGenerationCard(activeSession))
    } else if (msg.type === 'commit-card') {
      container.appendChild(makeCommitCard())
    }
  }
  container.scrollTop = container.scrollHeight
}

const renderWorkspaceList = () => {
  g('workspace-items').querySelectorAll('.workspace-item').forEach(el => el.remove())
  for (const session of sessions) {
    const item = makeEl('div', session.id === activeSession.id ? 'workspace-item active' : 'workspace-item')
    item.appendChild(makeEl('span', 'workspace-name', session.name))
    item.addEventListener('click', () => {
      activeSession = session
      g('workspace-items').querySelectorAll('.workspace-item').forEach(el => el.classList.remove('active'))
      item.classList.add('active')
      renderSession()
    })
    g('workspace-items').appendChild(item)
  }
}

// Model rendering

const getInputGroups = session =>
  session.model?.logicGroups?.flatMap(lg => lg.logicItems?.flatMap(li => li.inputGroups ?? []) ?? []) ?? []

const showInputDetail = input => {
  const pane = g('detail-pane-details')
  pane.replaceChildren()
  const detail = makeEl('div', 'input-detail')
  detail.appendChild(makeEl('span', 'input-detail-label', input.label))
  detail.appendChild(makeEl('code', 'input-detail-id', input.id))
  const meta = makeEl('div', 'input-detail-meta')
  meta.appendChild(makeEl('span', 'badge', input.type))
  if (input.required) meta.appendChild(makeEl('span', 'badge', 'required'))
  detail.appendChild(meta)
  if (input.options?.length) {
    detail.appendChild(makeEl('p', 'input-detail-section-label', 'Options'))
    const opts = makeEl('div', 'input-detail-options')
    for (const opt of input.options) {
      const chip = makeEl('span', 'input-detail-option', opt)
      if (opt === input.default) chip.classList.add('default')
      opts.appendChild(chip)
    }
    detail.appendChild(opts)
  }
  pane.appendChild(detail)
  g('detail-panel').classList.remove('collapsed')
  activateDetailTab('details')
}

const renderModelTree = session => {
  const tree = g('model-tree')
  tree.replaceChildren()
  const logicGroups = session.model?.logicGroups ?? []
  if (!logicGroups.length) { tree.appendChild(makeStub('fa-regular fa-diagram-project', 'No model data')); return }
  for (const lg of logicGroups) {
    const lgRow = makeEl('div', 'tree-row tree-lg')
    const chev = makeEl('i'); chev.className = 'fa-solid fa-chevron-down tree-chevron'
    lgRow.appendChild(chev)
    lgRow.appendChild(makeEl('span', 'tree-label', lg.label))
    lgRow.appendChild(makeEl('span', 'tree-type', lg.isDefault ? 'default logic group' : 'logic group'))
    tree.appendChild(lgRow)
    for (const li of lg.logicItems ?? []) {
      for (const ig of li.inputGroups ?? []) {
        const igRow = makeEl('div', 'tree-row tree-ig')
        const igChev = makeEl('i'); igChev.className = 'fa-solid fa-chevron-down tree-chevron'
        igRow.appendChild(igChev)
        igRow.appendChild(makeEl('span', 'tree-label', ig.label))
        igRow.appendChild(makeEl('span', 'tree-type', `input group · ${ig.inputs.length} inputs`))
        tree.appendChild(igRow)
        for (const input of ig.inputs) {
          const row = makeEl('div', 'tree-row tree-input')
          row.appendChild(makeEl('span', 'tree-label', input.label))
          const meta = makeEl('div', 'tree-input-meta')
          meta.appendChild(makeEl('code', 'tree-id', input.id))
          let typeText = input.type
          if (input.options?.length) typeText += ` · ${input.options.length} options`
          meta.appendChild(makeEl('span', 'tree-type', typeText))
          row.appendChild(meta)
          row.addEventListener('click', () => showInputDetail(input))
          tree.appendChild(row)
        }
      }
    }
  }
}

const buildPreviewForm = groups => {
  const scroll = makeEl('div', 'preview-scroll')
  const form = makeEl('div', 'preview-form')
  form.appendChild(makeEl('h2', 'preview-title', 'Interactive Configuration'))
  for (const group of groups) {
    const section = makeEl('div', 'preview-section')
    const sHeader = makeEl('div', 'preview-section-header')
    sHeader.appendChild(makeEl('span', 'preview-section-label', group.label))
    sHeader.appendChild(makeEl('span', 'preview-section-count', `${group.inputs.length} inputs`))
    section.appendChild(sHeader)
    const fields = makeEl('div', 'preview-fields')
    for (const input of group.inputs) {
      const field = makeEl('div', 'preview-field')
      field.appendChild(makeEl('label', 'preview-field-label', input.label))
      if (input.type === 'dropdown') {
        const sel = document.createElement('select')
        sel.className = 'preview-select'
        ;(input.options ?? []).forEach(opt => {
          const o = document.createElement('option')
          o.value = opt; o.textContent = opt
          if (opt === input.default) o.selected = true
          sel.appendChild(o)
        })
        field.appendChild(sel)
      } else if (input.type === 'toggle') {
        const wrap = makeEl('label', 'preview-toggle')
        const chk = document.createElement('input')
        chk.type = 'checkbox'; chk.checked = !!input.default
        wrap.appendChild(chk)
        wrap.appendChild(makeEl('span', null, 'Enabled'))
        field.appendChild(wrap)
      } else {
        const inp = document.createElement('input')
        inp.type = input.type === 'numeric' ? 'number' : 'text'
        inp.className = 'preview-input-field'
        if (input.default !== undefined) inp.value = input.default
        field.appendChild(inp)
      }
      fields.appendChild(field)
    }
    section.appendChild(fields)
    form.appendChild(section)
  }
  scroll.appendChild(form)
  return scroll
}

const renderDetailPreview = session => {
  const pane = g('detail-pane-preview')
  const groups = getInputGroups(session)
  if (!groups.length) { pane.replaceChildren(makeStub('fa-regular fa-eye', 'No model data')); return }
  pane.replaceChildren(buildPreviewForm(groups))
}

const renderActivity = session => {
  const pane = g('detail-pane-activity')
  pane.replaceChildren()
  const messages = makeEl('div', 'activity-messages')
  for (const msg of session.chat) {
    if (msg.role) messages.appendChild(makeEl('div', `chat-bubble ${msg.role}`, msg.content))
  }
  pane.appendChild(messages)
}

const renderRules = session => {
  const pane = g('pane-rules')
  pane.replaceChildren()
  const rules = session.rules ?? []
  if (!rules.length) { pane.appendChild(makeStub('fa-regular fa-code-branch', 'No rules')); return }
  const list = makeEl('div', 'rule-list')
  for (const rule of rules) {
    const item = makeEl('div', 'rule-item')
    item.appendChild(makeEl('span', 'rule-label', rule.label))
    const detail = makeEl('div', 'rule-detail')
    detail.appendChild(makeEl('code', null, `IF ${rule.condition}`))
    detail.appendChild(makeEl('span', 'rule-arrow', '→'))
    detail.appendChild(makeEl('code', null, rule.action))
    item.appendChild(detail)
    list.appendChild(item)
  }
  pane.appendChild(list)
}

const renderEquations = session => {
  const pane = g('pane-equations')
  pane.replaceChildren()
  const equations = session.equations ?? []
  if (!equations.length) { pane.appendChild(makeStub('fa-regular fa-superscript', 'No equations')); return }
  const list = makeEl('div', 'equation-list')
  for (const eq of equations) {
    const item = makeEl('div', 'equation-item')
    const header = makeEl('div', 'equation-header')
    header.appendChild(makeEl('span', 'equation-label', eq.label))
    header.appendChild(makeEl('code', 'equation-output', `→ ${eq.outputField}`))
    item.appendChild(header)
    item.appendChild(makeEl('code', 'equation-expr', eq.expression))
    list.appendChild(item)
  }
  pane.appendChild(list)
}


// Onboarding

const makeIndustryPills = session => {
  const wrap = makeEl('div', 'onboarding-pills')
  for (const industry of INDUSTRIES) {
    const pill = makeEl('button', 'pill', industry)
    pill.type = 'button'
    pill.addEventListener('click', () => {
      session.onboarding.industry = industry
      session.onboarding.step = 'route'
      session.name = `New ${industry} Product`
      persist()
      renderWorkspaceList()
      renderOnboarding(session)
    })
    wrap.appendChild(pill)
  }
  return wrap
}

const makeRouteCard = (iconClass, label, desc, onClick) => {
  const card = makeEl('div', 'route-card')
  const icon = makeEl('i')
  icon.className = iconClass
  card.appendChild(icon)
  card.appendChild(makeEl('span', 'route-card-label', label))
  card.appendChild(makeEl('span', 'route-card-desc', desc))
  card.addEventListener('click', onClick)
  return card
}

const makeStepTracker = () => {
  const tracker = makeEl('div', 'product-steps')
  PRODUCT_STEPS.forEach((step, i) => {
    const stepEl = makeEl('div', i === 0 ? 'product-step active' : 'product-step')
    stepEl.appendChild(makeEl('div', 'step-dot'))
    stepEl.appendChild(makeEl('span', 'step-label', step))
    tracker.appendChild(stepEl)
    if (i < PRODUCT_STEPS.length - 1) tracker.appendChild(makeEl('div', 'step-connector'))
  })
  return tracker
}

const makeProductPicker = currentSession => {
  const picker = makeEl('div', 'product-picker')
  const existing = sessions.filter(s => s.id !== currentSession.id && !s.onboarding)
  if (!existing.length) { picker.appendChild(makeEl('span', 'pick-empty', 'No existing products found.')); return picker }
  for (const s of existing) {
    const card = makeEl('div', 'product-pick-card')
    card.appendChild(makeEl('span', 'pick-name', s.name))
    card.appendChild(makeEl('span', 'pick-meta', [s.drafts?.length && 'Draft', s.build && 'Build'].filter(Boolean).join(' · ') || 'No data'))
    card.addEventListener('click', () => {
      sessions = sessions.filter(x => x.id !== currentSession.id)
      data.sessions = sessions
      activeSession = s
      persist()
      renderWorkspaceList()
      renderSession()
    })
    picker.appendChild(card)
  }
  return picker
}

const ENV_INFO = [['Instance', 'c1c-prod-us'], ['Region', 'us-east-1'], ['Server', 'app-04.c1c.revalize.com'], ['Database', 'c1c_main_7f2a']]

const getDraftManifest = session => {
  const groups = getInputGroups(session)
  const inputs = groups.flatMap(ig => ig.inputs)
  return [
    [1, 'Product'],
    [groups.length, 'Input Groups'],
    [inputs.length, 'Inputs'],
    [(session.rules ?? []).length, 'Logic Rules'],
    [(session.equations ?? []).length, 'Equations'],
    [(session.build?.results ?? []).length, 'BOM Line Items'],
  ].filter(([c]) => c)
}

const makePublishSection = (label, desc, content) => {
  const sec = makeEl('div', 'publish-section')
  sec.appendChild(makeEl('h3', 'publish-section-heading', label))
  if (desc) sec.appendChild(makeEl('p', 'publish-section-desc', desc))
  sec.appendChild(content)
  return sec
}

const makeEnvGrid = () => {
  const grid = makeEl('div', 'publish-env')
  for (const [k, v] of ENV_INFO) {
    const item = makeEl('div', 'publish-env-item')
    item.appendChild(makeEl('span', 'publish-env-key', k))
    item.appendChild(makeEl('span', 'publish-env-val', v))
    grid.appendChild(item)
  }
  return grid
}

const renderPublish = session => {
  const pane = g('stage-commit')
  pane.replaceChildren()

  const manifest = getDraftManifest(session)
  const total = manifest.reduce((s, [c]) => s + c, 0)

  if (!total) { pane.appendChild(makeStub('fa-regular fa-rocket-launch', 'Nothing to commit')); return }

  const view = makeEl('div', 'publish-view')
  view.appendChild(makeEl('h2', 'publish-heading', 'Publish'))
  view.appendChild(makeEl('p', 'publish-desc', 'Review the draft summary and environment before committing to ConfigureOne Cloud.'))

  view.appendChild(makePublishSection('Environment', 'Target instance and infrastructure for this commit.', makeEnvGrid()))

  const mList = makeEl('div', 'publish-manifest')
  for (const [count, label] of manifest) {
    const row = makeEl('div', 'publish-manifest-row')
    row.appendChild(makeEl('span', 'publish-manifest-count', String(count)))
    row.appendChild(makeEl('span', 'publish-manifest-label', label))
    row.appendChild(makeEl('span', 'badge', 'NEW'))
    mList.appendChild(row)
  }
  mList.appendChild(makeEl('div', 'publish-manifest-total', `${total} items total`))
  view.appendChild(makePublishSection('Draft Summary', 'Items staged for commit. All items write atomically in hierarchy order.', mList))

  const gatesList = makeEl('div', 'publish-gates')
  const GATES = [
    ['Schema validation', 'All required fields present and correctly typed.'],
    ['Reference integrity', 'No broken references between inputs, rules, and BOM items.'],
    ['No conflicts detected', 'No overlapping logic rules or duplicate identifiers.'],
    ['Naming conventions', 'Labels follow the customer context layer naming patterns.'],
  ]
  for (const [label, desc] of GATES) {
    const gate = makeEl('div', 'publish-gate')
    const left = makeEl('div', 'publish-gate-left')
    const icon = makeEl('i'); icon.className = 'fa-solid fa-circle-check'
    left.appendChild(icon)
    const text = makeEl('div', 'publish-gate-text')
    text.appendChild(makeEl('span', 'publish-gate-label', label))
    text.appendChild(makeEl('span', 'publish-gate-desc', desc))
    left.appendChild(text)
    gate.appendChild(left)
    const action = makeEl('button', 'button outline compact', 'View details')
    action.type = 'button'
    gate.appendChild(action)
    gatesList.appendChild(gate)
  }
  view.appendChild(makePublishSection('Readiness', 'All validation gates must pass before committing.', gatesList))

  const actions = makeEl('div', 'publish-actions')
  const commitBtn = makeEl('button', 'button primary', 'Commit — make it live')
  commitBtn.type = 'button'
  commitBtn.addEventListener('click', () => simulateCommit())
  actions.appendChild(commitBtn)
  for (const [iconCls, label] of [['fa-regular fa-file-csv', 'Download CSV'], ['fa-regular fa-file-pdf', 'Download PDF']]) {
    const btn = makeEl('button', 'button outline')
    btn.type = 'button'
    const ico = makeEl('i'); ico.className = iconCls
    btn.appendChild(ico)
    btn.appendChild(document.createTextNode(` ${label}`))
    actions.appendChild(btn)
  }
  const discardBtn = makeEl('button', 'button outline', 'Discard draft')
  discardBtn.type = 'button'
  actions.appendChild(discardBtn)
  view.appendChild(actions)

  pane.appendChild(view)
}

const showCommitSuccess = pane => {
  pane.replaceChildren()
  const wrap = makeEl('div', 'publish-view')

  const successIcon = makeEl('i'); successIcon.className = 'fa-regular fa-circle-check publish-success-icon'
  wrap.appendChild(successIcon)
  wrap.appendChild(makeEl('h2', 'publish-heading', 'Successfully committed'))

  const manifest = getDraftManifest(activeSession)
  const total = manifest.reduce((s, [c]) => s + c, 0)
  wrap.appendChild(makeEl('p', 'publish-desc', `${total} items committed to ConfigureOne Cloud`))

  wrap.appendChild(makePublishSection('Environment', null, makeEnvGrid()))

  const commitId = `cmt-${Math.random().toString(36).slice(2, 10)}`
  const duration = (COMMIT_STEPS.reduce((s, step) => s + step.ms, 0) / 1000).toFixed(1)
  const detailGrid = makeEl('div', 'publish-env')
  for (const [k, v] of [['Commit ID', commitId], ['Version', 'v2.14'], ['Duration', `${duration}s`], ['Initiated by', 'Admin']]) {
    const item = makeEl('div', 'publish-env-item')
    item.appendChild(makeEl('span', 'publish-env-key', k))
    item.appendChild(makeEl('span', 'publish-env-val', v))
    detailGrid.appendChild(item)
  }
  wrap.appendChild(makePublishSection('Commit Details', null, detailGrid))

  const itemsList = makeEl('div', 'publish-manifest')
  for (const [count, label] of manifest) {
    const row = makeEl('div', 'publish-manifest-row')
    const icon = makeEl('i'); icon.className = 'fa-solid fa-check publish-item-check'
    row.appendChild(icon)
    row.appendChild(makeEl('span', 'publish-manifest-label', `${label} (${count})`))
    row.appendChild(makeEl('span', 'badge', 'NEW'))
    itemsList.appendChild(row)
  }
  wrap.appendChild(makePublishSection('Items Committed', null, itemsList))

  const now = new Date()
  const totalMs = COMMIT_STEPS.reduce((s, step) => s + step.ms, 0)
  let offset = -totalMs
  const auditList = makeEl('div', 'publish-audit')
  for (const step of COMMIT_STEPS) {
    const t = new Date(now.getTime() + offset)
    const ts = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const row = makeEl('div', 'publish-audit-row')
    row.appendChild(makeEl('span', 'publish-audit-time', ts))
    row.appendChild(makeEl('span', 'publish-audit-step', step.name))
    row.appendChild(makeEl('span', 'publish-audit-result', step.detail))
    auditList.appendChild(row)
    offset += step.ms
  }
  wrap.appendChild(makePublishSection('Audit Trail', 'Each step logged with timestamp for post-commit investigation.', auditList))

  const health = makeEl('div', 'commit-health')
  const hIcon = makeEl('i'); hIcon.className = 'fa-regular fa-chart-line-up'
  health.appendChild(hIcon)
  health.appendChild(makeEl('span', null, 'Your AI acceptance rate this month: 89% — up from 74% last month.'))
  wrap.appendChild(health)

  const actions = makeEl('div', 'publish-actions')
  const buildBtn = makeEl('button', 'button outline', 'Return to Build')
  buildBtn.type = 'button'
  buildBtn.addEventListener('click', () => { activateStage('build'); activateTab('model') })
  actions.appendChild(buildBtn)
  const newBtn = makeEl('button', 'button outline', 'Start new draft')
  newBtn.type = 'button'
  newBtn.addEventListener('click', () => createNewSession())
  actions.appendChild(newBtn)
  wrap.appendChild(actions)

  pane.appendChild(wrap)
}

const simulateCommit = () => {
  const pane = g('stage-commit')
  pane.replaceChildren()
  const wrap = makeEl('div', 'publish-view')
  wrap.appendChild(makeEl('h2', 'publish-heading', 'Committing to ConfigureOne Cloud'))
  wrap.appendChild(makeEl('p', 'publish-desc', 'Writing draft to C1C in hierarchy order. All items commit atomically.'))

  const card = makeEl('div', 'progress-card')
  const stepsEl = makeEl('div', 'progress-steps')
  card.appendChild(stepsEl)
  wrap.appendChild(card)
  pane.appendChild(wrap)

  const stepRows = COMMIT_STEPS.map(step => {
    const row = makeEl('div', 'progress-step pending')
    const iconWrap = makeEl('div', 'step-icon')
    const icon = makeEl('i'); icon.className = 'fa-regular fa-circle'
    iconWrap.appendChild(icon)
    row.appendChild(iconWrap)
    const body = makeEl('div', 'step-body')
    body.appendChild(makeEl('span', 'step-name', step.name))
    const detail = makeEl('span', 'step-detail')
    body.appendChild(detail)
    row.appendChild(body)
    stepsEl.appendChild(row)
    return { detail, icon, row }
  })

  let reasoningInterval = null

  const complete = idx => {
    if (reasoningInterval) { clearInterval(reasoningInterval); reasoningInterval = null }
    const { row, icon, detail } = stepRows[idx]
    row.className = 'progress-step done'
    icon.className = 'fa-solid fa-check'
    detail.textContent = COMMIT_STEPS[idx].detail
  }

  const activate = idx => {
    const { row, icon, detail } = stepRows[idx]
    row.className = 'progress-step active'
    icon.className = 'fa-solid fa-spinner fa-spin'
    const step = COMMIT_STEPS[idx]
    if (step.reasoning?.length) {
      let ri = 0
      detail.textContent = step.reasoning[0]
      reasoningInterval = setInterval(() => { ri = (ri + 1) % step.reasoning.length; detail.textContent = step.reasoning[ri] }, 1600)
    }
  }

  let idx = 0
  const advance = () => {
    if (idx > 0) complete(idx - 1)
    if (idx === COMMIT_STEPS.length) {
      activeSession.chat.push({ id: `m-commit-${Date.now()}`, type: 'commit-card' })
      activeSession.chat.push({ id: `m-cai-${Date.now()}`, role: 'ai', content: 'Committed to ConfigureOne Cloud. Click the card above for full details.' })
      persist()
      setTimeout(() => showCommitSuccess(pane), 600)
      return
    }
    activate(idx)
    setTimeout(advance, COMMIT_STEPS[idx].ms)
    idx++
  }

  advance()
}

const simulateUpload = session => {
  session.files = [{ name: 'Product Spec.pdf', size: '2.4 MB', type: 'pdf' }]
  renderFiles(session.files)

  const modelSource = sessions.find(s => s.model && !s.onboarding)
  const buildSource = sessions.find(s => s.build?.results?.length && !s.onboarding)
  if (modelSource) {
    session.model = JSON.parse(JSON.stringify(modelSource.model))
    session.rules = JSON.parse(JSON.stringify(modelSource.rules ?? []))
    session.equations = JSON.parse(JSON.stringify(modelSource.equations ?? []))
  }
  if (buildSource) session.build = JSON.parse(JSON.stringify(buildSource.build))
  renderModelTree(session)
  renderRules(session)
  renderEquations(session)
  renderResultsGrid(session.build?.results ?? [])

  persist()

  const container = g('chat-messages')
  container.appendChild(makeEl('div', 'chat-bubble user', 'Upload Spec'))

  const card = makeEl('div', 'progress-card')
  const header = makeEl('div', 'progress-header')
  const hIcon = makeEl('i'); hIcon.className = 'fa-regular fa-file-pdf'
  header.appendChild(hIcon)
  header.appendChild(makeEl('span', null, 'Analyzing Product Spec.pdf'))
  card.appendChild(header)
  const stepsEl = makeEl('div', 'progress-steps')
  card.appendChild(stepsEl)
  container.appendChild(card)

  const stepRows = GEN_STEPS.map(step => {
    const row = makeEl('div', 'progress-step pending')
    const iconWrap = makeEl('div', 'step-icon')
    const icon = makeEl('i'); icon.className = 'fa-regular fa-circle'
    iconWrap.appendChild(icon)
    row.appendChild(iconWrap)
    const body = makeEl('div', 'step-body')
    body.appendChild(makeEl('span', 'step-name', step.name))
    const detail = makeEl('span', 'step-detail')
    body.appendChild(detail)
    row.appendChild(body)
    stepsEl.appendChild(row)
    return { detail, icon, row }
  })

  container.scrollTop = container.scrollHeight

  let reasoningInterval = null

  const complete = idx => {
    if (reasoningInterval) { clearInterval(reasoningInterval); reasoningInterval = null }
    const { row, icon, detail } = stepRows[idx]
    row.className = 'progress-step done'
    icon.className = 'fa-solid fa-check'
    const step = GEN_STEPS[idx]
    detail.textContent = step.detail
    if (step.stage) activateStage(step.stage)
    if (step.tab) activateTab(step.tab)
  }

  const activate = idx => {
    const { row, icon, detail } = stepRows[idx]
    row.className = 'progress-step active'
    icon.className = 'fa-solid fa-spinner fa-spin'
    const step = GEN_STEPS[idx]
    if (step.reasoning?.length) {
      let ri = 0
      detail.textContent = step.reasoning[0]
      reasoningInterval = setInterval(() => { ri = (ri + 1) % step.reasoning.length; detail.textContent = step.reasoning[ri] }, 1600)
    }
    container.scrollTop = container.scrollHeight
  }

  let idx = 0
  const advance = () => {
    if (idx > 0) complete(idx - 1)
    if (idx === GEN_STEPS.length) {
      delete session.onboarding
      session.stage = 'build'
      session.activeTab = 'model'
      session.chat.push({ id: `m-u-${Date.now()}`, role: 'user', content: 'Upload Spec' })
      session.chat.push({ id: `m-gen-${Date.now()}`, type: 'generation-card' })
      session.chat.push({ id: `m-ai-${Date.now()}`, role: 'ai', content: 'Model generated. Review and refine in the Build tab, or ask me to adjust any part.' })
      persist()
      container.appendChild(makeEl('div', 'chat-bubble ai', 'Model generated. Review and refine in the Build tab, or ask me to adjust any part.'))
      container.scrollTop = container.scrollHeight
      setTimeout(() => renderSession(), 800)
      return
    }
    activate(idx)
    setTimeout(advance, GEN_STEPS[idx].ms)
    idx++
  }

  advance()
}

const renderOnboarding = session => {
  const container = g('chat-messages')
  container.replaceChildren()
  const ob = session.onboarding

  if (isSuperadmin()) {
    container.appendChild(makeEl('div', 'chat-bubble ai', 'Welcome to ConfigureOne Cloud. What industry is this product for?'))
    container.appendChild(makeIndustryPills(session))
    if (ob.step === 'industry') { container.scrollTop = container.scrollHeight; return }
  } else if (ob.step === 'industry') {
    ob.step = 'route'
    ob.industry = 'Manufacturing'
    session.name = 'New Manufacturing Product'
    persist()
  }

  container.appendChild(makeEl('div', 'chat-bubble user', ob.industry))
  container.appendChild(makeEl('div', 'chat-bubble ai', `Got it — ${ob.industry}. Are you configuring a new product or working with an existing one?`))

  const routeCards = makeEl('div', 'route-cards')
  routeCards.appendChild(makeRouteCard('fa-regular fa-sparkles', 'New Product', 'Build a configuration model from scratch', () => {
    session.onboarding.route = 'new'
    session.onboarding.step = 'new'
    persist()
    renderOnboarding(session)
  }))
  routeCards.appendChild(makeRouteCard('fa-regular fa-box-open', 'Existing Product', 'Update or review an existing configuration', () => {
    session.onboarding.route = 'existing'
    session.onboarding.step = 'existing'
    persist()
    renderOnboarding(session)
  }))
  container.appendChild(routeCards)

  if (ob.step === 'route') { container.scrollTop = container.scrollHeight; return }

  container.appendChild(makeEl('div', 'chat-bubble user', ob.route === 'new' ? 'New Product' : 'Existing Product'))

  if (ob.route === 'new') {
    container.appendChild(makeEl('div', 'chat-bubble ai', `Let's build your ${ob.industry} product. I'll guide you through each stage — start by uploading a spec or describing your product.`))
    container.appendChild(makeStepTracker())
    const actions = makeEl('div', 'onboarding-pills')
    for (const label of ['Upload Spec', 'Describe Product', 'Browse Templates']) {
      const pill = makeEl('button', 'pill', label)
      pill.type = 'button'
      if (label === 'Upload Spec') pill.addEventListener('click', () => simulateUpload(session))
      actions.appendChild(pill)
    }
    container.appendChild(actions)
  } else {
    container.appendChild(makeEl('div', 'chat-bubble ai', 'Select a product from your catalog to continue.'))
    container.appendChild(makeProductPicker(session))
  }

  container.scrollTop = container.scrollHeight
}

const createNewSession = () => {
  const session = {
    build: null,
    chat: [],
    drafts: [],
    equations: [],
    files: [],
    id: `session-${Date.now()}`,
    model: null,
    name: 'New Session',
    onboarding: { industry: null, route: null, step: 'industry' },
    rules: [],
    stage: 'context',
  }
  sessions.unshift(session)
  data.sessions = sessions
  activeSession = session
  persist()
  g('workspace-list').classList.remove('collapsed')
  renderWorkspaceList()
  renderSession()
}

const renderSession = () => {
  const drafts = activeSession.drafts ?? []
  const draftMap = Object.fromEntries(drafts.map(d => [d.id, d]))
  const latestDraft = drafts[drafts.length - 1] ?? null
  renderFiles(activeSession.files ?? [])
  if (activeSession.onboarding) {
    renderOnboarding(activeSession)
    g('chat-panel').classList.remove('collapsed')
  } else {
    renderChat(activeSession.chat, draftMap)
  }
  renderResultsGrid(activeSession.build?.results ?? [])
  renderModelTree(activeSession)
  renderRules(activeSession)
  renderEquations(activeSession)
  renderPublish(activeSession)
  renderDetailPreview(activeSession)
  renderActivity(activeSession)
  activateStage(activeSession.stage ?? 'context')
  if (activeSession.activeTab) activateTab(activeSession.activeTab)
}

const hydrate = json => {
  data = json
  sessions = json.sessions
  activeSession = sessions[0]
  renderWorkspaceList()
  renderSession()
}

Promise.all([fetch('types.json').then(r => r.json()), fetch('fixtures.json').then(r => r.json())])
  .then(([typesData, fixtureData]) => {
    types = typesData
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : null
    hydrate(parsed?.sessions ? parsed : fixtureData)
  })
