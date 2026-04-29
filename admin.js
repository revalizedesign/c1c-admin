const g = document.getElementById.bind(document)
const q = document.querySelectorAll.bind(document)

const items = [
  { code: 'RO-A-A2-1', name: 'Replacement Optic Adjustable Zoom', qty: 1, type: 'ITEM' },
  { code: 'COL-AR', name: 'Alternate Media Clear Film', qty: 1, type: 'ITEM' },
  { code: 'RO-A-W-1', name: 'Replacement Optic Wallwash', qty: 1, type: 'ITEM' },
  { code: 'P-A2R-4', name: 'Parelux Atomos Renew — Round Fixture Panel, 4″ Wide', qty: 1, type: 'ITEM' },
  { code: 'SFL-AR', name: 'Alternate Media Soft Focus Film', qty: 1, type: 'ITEM' },
  { code: 'RO-A-60-1', name: 'Replacement Optic 60 Degree', qty: 1, type: 'ITEM' },
  { code: 'RO-A-25-1', name: 'Replacement Optic 25 Degree', qty: 1, type: 'ITEM' },
  { code: 'P-A2S-4', name: 'Parelux Atomos Renew — Square Fixture Panel, 4″ Wide', qty: 1, type: 'ITEM' },
  { code: 'RO-A-15-1', name: 'Replacement Optic 15 Degree', qty: 1, type: 'ITEM' },
  { code: 'HCL-AR', name: 'Alternate Media Honeycomb Louver', qty: 1, type: 'ITEM' },
  { code: 'LSL-AR', name: 'Alternate Media Linear Spread Film', qty: 1, type: 'ITEM' },
  { code: 'WOL-AR', name: 'Alternate Media Wide Distribution Film', qty: 1, type: 'ITEM' },
  { code: 'RO-A-30-1', name: 'Replacement Optic 30 Degree', qty: 1, type: 'ITEM' },
  { code: 'TOOL-HEX-050', name: 'Adjustment Tool Hex 050', qty: 1, type: 'ITEM' },
  { code: 'PANEL-BRACKET', name: '5/16-inch T-Grid Mounting Bracket', qty: 1, type: 'ITEM' },
]

const drafts = [
  { items, version: '10:51 AM' },
  { items: items.map(i => ({ ...i, qty: i.code === 'RO-A-60-1' ? 2 : i.qty })), version: '11:03 AM' },
]

const makeEl = (tag, cls, text) => {
  const el = document.createElement(tag)
  if (cls) el.className = cls
  if (text !== undefined) el.textContent = text
  return el
}

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

const resultsCols = [
  {
    cellRenderer: p => makeEl('span', 'badge', p.value),
    field: 'type',
    headerName: '',
    sortable: false,
    width: 70,
  },
  {
    field: 'name',
    flex: 1,
    headerName: 'Name',
  },
  {
    field: 'code',
    headerName: 'Code',
    width: 150,
  },
  {
    field: 'qty',
    headerName: 'Qty',
    type: 'numericColumn',
    width: 80,
  },
  {
    cellRenderer: () => {
      const btn = makeEl('button', 'button outline compact')
      btn.textContent = 'Configure'
      btn.type = 'button'
      return btn
    },
    headerName: '',
    sortable: false,
    width: 110,
  },
]

agGrid.createGrid(g('results-grid'), {
  autoSizeStrategy: { type: 'fitCellContents', scaleUpToFitGridWidth: true },
  columnDefs: resultsCols,
  defaultColDef: { resizable: false, sortable: true },
  popupParent: document.body,
  rowData: items,
  rowSelection: { checkboxes: true, headerCheckbox: true, mode: 'multiRow' },
  selectionColumnDef: { pinned: 'left', suppressSizeToFit: true, width: 40 },
  theme: gridTheme(),
})

// Stage + tab switching
const activateStage = name => {
  q('.stage-btn').forEach(b => b.classList.remove('active'))
  q('.stage-panel').forEach(p => p.classList.remove('active'))
  document.querySelector(`[data-stage="${name}"]`).classList.add('active')
  g(`stage-${name}`)?.classList.add('active')
}

const activateTab = name => {
  q('.result-tab').forEach(t => t.classList.remove('active'))
  q('.tab-pane').forEach(p => p.classList.remove('active'))
  document.querySelector(`[data-tab="${name}"]`).classList.add('active')
  g(`pane-${name}`).classList.add('active')
}

const showContextDraft = () => activateStage('context')

q('.stage-btn').forEach(btn =>
  btn.addEventListener('click', () => activateStage(btn.dataset.stage)),
)

q('.result-tab').forEach(tab =>
  tab.addEventListener('click', () => activateTab(tab.dataset.tab)),
)

q('.section-tab').forEach(tab =>
  tab.addEventListener('click', () => {
    q('.section-tab').forEach(t => t.classList.remove('active'))
    tab.classList.add('active')
  }),
)

q('.sub-tab').forEach(tab =>
  tab.addEventListener('click', () => {
    const parent = tab.closest('.tab-pane') ?? tab.closest('.stage-panel')
    parent.querySelectorAll(':scope > nav > .sub-tab').forEach(t => t.classList.remove('active'))
    parent.querySelectorAll(':scope > .sub-pane').forEach(p => p.classList.remove('active'))
    tab.classList.add('active')
    parent.querySelector(`#subpane-${tab.dataset.subtab}`)?.classList.add('active')
  }),
)

const draftCols = [
  {
    cellRenderer: p => makeEl('span', 'badge', p.value),
    field: 'type',
    headerName: '',
    sortable: false,
    width: 70,
  },
  { field: 'name', flex: 1, headerName: 'Name' },
  { field: 'code', headerName: 'Code', width: 150 },
  { field: 'qty', headerName: 'Qty', type: 'numericColumn', width: 80 },
]

let draftGrid = null

const renderDraft = draft => {
  const view = g('draft-view')
  view.replaceChildren()

  const meta = makeEl('div', 'draft-meta')
  meta.appendChild(makeEl('span', 'badge', 'DRAFT'))
  meta.appendChild(makeEl('span', 'draft-meta-version', draft.version))
  view.appendChild(meta)

  const gridEl = makeEl('div', 'draft-grid-el')
  view.appendChild(gridEl)

  if (draftGrid) draftGrid.destroy()
  draftGrid = agGrid.createGrid(gridEl, {
    autoSizeStrategy: { type: 'fitCellContents', scaleUpToFitGridWidth: true },
    columnDefs: draftCols,
    defaultColDef: { resizable: false, sortable: true },
    popupParent: document.body,
    rowData: draft.items,
    rowSelection: { checkboxes: true, headerCheckbox: true, mode: 'multiRow' },
    selectionColumnDef: { pinned: 'left', suppressSizeToFit: true, width: 40 },
    theme: gridTheme(),
  })

  g('draft-empty').hidden = true
  view.hidden = false
}

q('.draft-card').forEach(card =>
  card.addEventListener('click', () => {
    renderDraft(drafts[+card.dataset.draft])
    showContextDraft()
  }),
)

// Build card
const now = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

const makeBuildCard = () => {
  const card = makeEl('div', 'draft-card')
  card.addEventListener('click', () => { activateStage('build'); activateTab('model') })

  const icon = makeEl('i')
  icon.className = 'fa-regular fa-hammer'
  card.appendChild(icon)

  const info = makeEl('div', 'draft-info')
  info.appendChild(makeEl('span', 'draft-label', 'Build'))
  info.appendChild(makeEl('span', 'draft-version', `${now()} · 3 zones · 8 inputs · 12 rules`))
  card.appendChild(info)

  const chevron = makeEl('i')
  chevron.className = 'fa-solid fa-angle-right'
  card.appendChild(chevron)

  return card
}

// Approval card
const makeApprovalCard = () => {
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
    ['fa-regular fa-file-lines', 'Draft · 11:03 AM', '4 groups · 15 inputs · 16 values — latest'],
  ])
  addSection('References', [
    ['fa-regular fa-file-pdf', 'Parelux Atomos Renew Specification v2.1'],
    ['fa-regular fa-file-pdf', 'Optics Configuration Playbook'],
    ['fa-regular fa-file-pdf', 'Panel Mounting Guidelines'],
  ])
  addSection('Changes', [
    ['fa-regular fa-circle-dot', 'RO-A-60-1 quantity updated: 1 → 2'],
    ['fa-regular fa-circle-dot', 'PANEL-BRACKET added'],
  ])

  const footer = makeEl('div', 'approval-footer')
  const approveBtn = makeEl('button', 'button primary compact', 'Approve Build')
  approveBtn.type = 'button'
  const cancelBtn = makeEl('button', 'button outline compact', 'Cancel')
  cancelBtn.type = 'button'

  approveBtn.addEventListener('click', () => {
    footer.replaceChildren(makeEl('span', 'approval-approved', 'Approved'))
    const messages = g('chat-messages')
    messages.appendChild(makeBuildCard())
    messages.appendChild(makeEl('div', 'chat-bubble ai', 'Build complete. Click the card to review in the Model tab.'))
    messages.scrollTop = messages.scrollHeight
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
  g(toggleId).addEventListener('click', e => {
    e.stopPropagation()
    strip.classList.toggle('collapsed')
  })
  strip.addEventListener('click', () => {
    if (strip.classList.contains('collapsed')) strip.classList.remove('collapsed')
  })
}

initStrip('sidenav', 'nav-toggle')
initStrip('workspace-list', 'workspace-toggle')
initStrip('chat-panel', 'chat-toggle')
initStrip('detail-panel', 'detail-toggle')

g('files-add').addEventListener('click', e => e.stopPropagation())
g('files-header').addEventListener('click', () => g('files-panel').classList.toggle('collapsed'))
g('chat-header').addEventListener('click', () => g('chat-section').classList.toggle('collapsed'))
g('quick-actions-header').addEventListener('click', () => g('quick-actions-panel').classList.toggle('collapsed'))

q('.pill').forEach(pill =>
  pill.addEventListener('click', () => {
    if (pill.textContent === 'Build') {
      const messages = g('chat-messages')
      messages.appendChild(makeEl('div', 'chat-bubble ai', "I've reviewed the draft history and references. Here's a summary of what will be included in this build:"))
      messages.appendChild(makeApprovalCard())
      messages.scrollTop = messages.scrollHeight
    }
  }),
)
