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
  context: 6,
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
  productData = null
  activeBuild = null
  industryNeeded = Math.random() > 0.5
  Object.assign(state, { ...INITIAL_STATE, files: [], messages: [], workflow: { ...INITIAL_STATE.workflow } })
  if (fixtures.onboarding) state.messages.push({ type: 'agent', text: fixtures.onboarding.company.agent })
}

// Data

let workflows = {}
let fixtures = {}
let productData = null

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
  if (msg.type === 'build-card') {
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
    const card = makeEl('div', 'file-card')
    const icon = makeEl('i'); icon.className = 'fa-regular fa-file-pdf'
    card.appendChild(icon)
    const text = makeEl('div', 'card-text')
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
  if (msg.type === 'onboarding-recap') {
    const frag = document.createDocumentFragment()
    if (msg.expanded) msg.archived.forEach(m => frag.appendChild(renderMessage(m)))
    const card = makeEl('div', 'recap-card')
    const header = makeEl('div', 'recap-header')
    const check = makeEl('i'); check.className = 'fa-solid fa-circle-check'
    header.appendChild(check)
    header.appendChild(makeEl('b', null, 'Onboarding complete'))
    header.appendChild(makeEl('span', 'recap-meta', `${msg.files.length} files saved`))
    card.appendChild(header)
    const list = makeEl('div', 'recap-files')
    msg.files.forEach(f => {
      const row = makeEl('div', 'recap-file')
      const icon = makeEl('i'); icon.className = f.icon
      row.appendChild(icon)
      row.appendChild(makeEl('b', null, f.label))
      row.appendChild(makeEl('span', null, ` — ${f.desc}`))
      list.appendChild(row)
    })
    card.appendChild(list)
    const toggle = makeEl('button', 'recap-toggle')
    toggle.type = 'button'
    const chev = makeEl('i'); chev.className = msg.expanded ? 'fa-solid fa-angle-up' : 'fa-solid fa-angle-down'
    toggle.appendChild(chev)
    toggle.appendChild(makeEl('span', null, msg.expanded ? 'Hide conversation' : 'Show conversation'))
    toggle.addEventListener('click', () => { msg.expanded = !msg.expanded; render() })
    card.appendChild(toggle)
    frag.appendChild(card)
    return frag
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
  if (state.workflow?.id === 'triage' && state.workflow.step === 0) {
    state.messages.forEach(msg => el.appendChild(renderMessage(msg)))
    el.appendChild(renderFork())
  } else if (state.workflow?.id === 'first-use') {
    state.messages.forEach(msg => el.appendChild(renderMessage(msg)))
    renderOnboardingStep(el)
  } else {
    state.messages.forEach(msg => el.appendChild(renderMessage(msg)))
    if ((activeIngress || activeBuild) && state.status) {
      const card = makeEl('div', 'chat-status-card')
      const inner = makeEl('div', 'status-card')
      inner.appendChild(makeEl('span', 'spinner'))
      inner.appendChild(makeEl('span', 'status-text', state.status))
      card.appendChild(inner)
      el.appendChild(card)
    }
  }
  el.scrollTop = el.scrollHeight
}

const renderFilesList = () => {
  const el = g('files-grid')
  if (!el) return
  const rows = state.files.map(f => ({ created: f.created ?? '', locked: f.locked ?? false, name: f.name, owner: f.owner ?? 'Agent', pages: f.assessment?.pages ?? f.pages ?? '', size: f.size, source: f.source ?? 'Uploaded', type: f.type }))
  if (filesGrid) filesGrid.destroy()
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
      const file = state.files.find(f => f.name === e.data.name) ?? (fixtures.customerContext?.files ?? []).find(f => f.name === e.data.name)
      if (file) { state.selectedFile = file; g('detail-panel').classList.remove('collapsed'); renderDetail() }
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
  if (file.details) {
    const d = file.details
    view.appendChild(makeEl('p', 'detail-summary', d.summary))
    if (d.fields) {
      const grid = makeEl('div', 'detail-estimates')
      d.fields.forEach(([k, v]) => {
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
    { count: state.files.length, icon: 'fa-regular fa-arrow-up-from-bracket', label: 'uploaded' },
    { count: 0, icon: 'fa-regular fa-sparkles', label: 'generated' },
  ]
  if (!p) return { files }
  return {
    attributes: [
      { count: countFrom(p.attributes, 'productAttributes'), icon: 'fa-regular fa-box', label: 'product attributes' },
      { count: countFrom(p.attributes, 'inputAttributes'), icon: 'fa-regular fa-table-cells', label: 'input attributes' },
    ],
    equations: [
      { count: p.equations?.length ?? 0, icon: 'fa-regular fa-superscript', label: 'equations' },
    ],
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

// Tab content renderers

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
        g('detail-panel').classList.remove('collapsed')
        renderDetail()
      })
      tree.appendChild(row)
    })
  })
  if (json) {
    json.replaceChildren()
    const pre = makeEl('pre', 'json-view', JSON.stringify(productData.model, null, 2))
    json.appendChild(pre)
  }
}

const renderAttributesTab = () => {
  const el = g('pane-attributes')
  if (!el || !productData) return
  el.replaceChildren()
  const a = productData.attributes
  if (a.productAttributes?.length) {
    const sec = makeEl('div', 'pane-section')
    sec.appendChild(makeEl('b', null, 'Product Attributes'))
    const grid = makeEl('div', 'data-grid')
    a.productAttributes.forEach(attr => {
      const row = makeEl('div', 'data-row')
      row.appendChild(makeEl('span', 'data-key', attr.name))
      row.appendChild(makeEl('span', null, String(attr.value)))
      grid.appendChild(row)
    })
    sec.appendChild(grid)
    el.appendChild(sec)
  }
  if (a.inputAttributes?.length) {
    const sec = makeEl('div', 'pane-section')
    sec.appendChild(makeEl('b', null, 'Input Attributes'))
    const grid = makeEl('div', 'data-grid')
    a.inputAttributes.forEach(attr => {
      const row = makeEl('div', 'data-row')
      row.appendChild(makeEl('span', 'data-key', attr.name))
      row.appendChild(makeEl('span', 'data-type', attr.type))
      row.appendChild(makeEl('span', null, JSON.stringify(attr.values)))
      grid.appendChild(row)
    })
    sec.appendChild(grid)
    el.appendChild(sec)
  }
}

const renderRulesTab = () => {
  const el = g('pane-rules')
  if (!el || !productData) return
  el.replaceChildren()
  const r = productData.rules
  ;[
    ['Logic Groups', r.logicGroups, item => `${item.name}`],
    ['Logic Items', r.logicItems, item => `${item.name} (${item.type})`],
    ['Driven Inputs', r.drivenInputs, item => item.description],
    ['Input Filters', r.inputFilters, item => `Input ${item.filteredInputNum} filtered by ${item.filteringInputNum} (${item.attribute})`],
    ['Iterators', r.iterators, item => `${item.code} — ${item.description}`],
  ].forEach(([label, items, fmt]) => {
    if (!items?.length) return
    const sec = makeEl('div', 'pane-section')
    sec.appendChild(makeEl('b', null, label))
    const list = makeEl('div', 'data-grid')
    items.forEach(item => {
      const row = makeEl('div', 'data-row')
      row.appendChild(makeEl('span', null, fmt(item)))
      list.appendChild(row)
    })
    sec.appendChild(list)
    el.appendChild(sec)
  })
}

const renderEquationsTab = () => {
  const el = g('pane-equations')
  if (!el || !productData) return
  el.replaceChildren()
  ;(productData.equations ?? []).forEach(eq => {
    const sec = makeEl('div', 'equation-card')
    const header = makeEl('div', 'equation-header')
    header.appendChild(makeEl('b', null, eq.label))
    header.appendChild(makeEl('span', 'data-type', `→ ${eq.outputField}`))
    sec.appendChild(header)
    sec.appendChild(makeEl('code', 'equation-expr', eq.expression))
    if (eq.variables?.length) {
      const vars = makeEl('div', 'equation-vars')
      eq.variables.forEach(v => vars.appendChild(makeEl('span', 'data-type', `${v.name} (input ${v.inputNum})`)))
      sec.appendChild(vars)
    }
    el.appendChild(sec)
  })
}

const renderResultsTab = () => {
  const el = g('pane-results')
  if (!el || !productData) return
  el.replaceChildren()
  const r = productData.results
  ;[
    ['Item Families', r.itemFamilies, item => `${item.name} — ${item.description}`],
    ['Item Masters', r.itemMasters, item => `${item.smartPartNumber} — ${item.description} (${item.type})`],
    ['BOM Skeleton', r.bomSkeleton, item => `${'  '.repeat(item.level)}${item.referenceName} × ${item.quantity.value ?? item.quantity.inputName ?? item.quantity.equationName}${item.includedByDefault ? '' : ' (optional)'}`],
    ['Driven Item Masters', r.drivenItemMasters, item => item.description],
    ['Product Outputs', r.productOutputs, item => `${item.name} (${item.type})`],
  ].forEach(([label, items, fmt]) => {
    if (!items?.length) return
    const sec = makeEl('div', 'pane-section')
    sec.appendChild(makeEl('b', null, label))
    const list = makeEl('div', 'data-grid')
    items.forEach(item => {
      const row = makeEl('div', 'data-row')
      row.appendChild(makeEl('span', null, fmt(item)))
      list.appendChild(row)
    })
    sec.appendChild(list)
    el.appendChild(sec)
  })
}

const renderPreviewTab = () => {
  const el = g('pane-preview')
  if (!el || !productData) return
  el.replaceChildren()
  const form = makeEl('div', 'preview-form')
  ;(productData.model.inputGroups ?? []).forEach(group => {
    const sec = makeEl('div', 'preview-section')
    sec.appendChild(makeEl('b', null, group.name))
    const fields = makeEl('div', 'preview-fields')
    ;(productData.model.inputs ?? []).filter(i => i.groupNum === group.num).forEach(input => {
      const field = makeEl('div', 'preview-field')
      field.appendChild(makeEl('label', null, input.label))
      if (input.type === 'dropdown') {
        const sel = document.createElement('select')
        ;(input.options ?? []).forEach(opt => {
          const o = document.createElement('option')
          o.value = opt; o.textContent = opt
          if (opt === String(input.default)) o.selected = true
          sel.appendChild(o)
        })
        field.appendChild(sel)
      } else if (input.type === 'toggle') {
        const chk = document.createElement('input')
        chk.type = 'checkbox'; chk.checked = !!input.default
        field.appendChild(chk)
      } else {
        const inp = document.createElement('input')
        inp.type = input.type === 'numeric' ? 'number' : 'text'
        if (input.default !== undefined) inp.value = input.default
        field.appendChild(inp)
      }
      fields.appendChild(field)
    })
    sec.appendChild(fields)
    form.appendChild(sec)
  })
  el.appendChild(form)
}

const renderCommitTab = () => {
  const el = g('pane-commit')
  if (!el || !productData) return
  el.replaceChildren()
  const m = productData.model
  const r = productData.rules
  const res = productData.results
  const manifest = [
    [1, 'Product'],
    [m.inputGroups?.length ?? 0, 'Input Groups'],
    [m.inputs?.length ?? 0, 'Inputs'],
    [m.inputValues?.length ?? 0, 'Input Values'],
    [r.logicGroups?.length ?? 0, 'Logic Groups'],
    [r.logicItems?.length ?? 0, 'Logic Items'],
    [productData.equations?.length ?? 0, 'Equations'],
    [res.itemMasters?.length ?? 0, 'Item Masters'],
    [res.bomSkeleton?.length ?? 0, 'BOM Lines'],
  ].filter(([c]) => c)
  const total = manifest.reduce((s, [c]) => s + c, 0)

  const view = makeEl('div', 'commit-view')
  view.appendChild(makeEl('b', null, 'Draft Summary'))
  const list = makeEl('div', 'data-grid')
  manifest.forEach(([count, label]) => {
    const row = makeEl('div', 'data-row')
    row.appendChild(makeEl('span', 'data-count', String(count)))
    row.appendChild(makeEl('span', null, label))
    list.appendChild(row)
  })
  list.appendChild(makeEl('div', 'data-row-total', `${total} items total`))
  view.appendChild(list)
  el.appendChild(view)
}

const renderTabContent = () => {
  if (!productData) return
  renderModelTab()
  renderAttributesTab()
  renderRulesTab()
  renderEquationsTab()
  renderResultsTab()
  renderPreviewTab()
  renderCommitTab()
}

const renderAllStats = () => {
  const stats = buildStats()
  for (const [tab, items] of Object.entries(stats)) renderStats(`overview-${tab}-stats`, items)
}

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
  renderFilesList()
  renderAllStats()
  renderTabContent()
  renderDetail()
}

// Entry points

const renderFork = () => {
  const el = makeEl('div', null)
  el.id = 'chat-fork'
  ;[
    { desc: 'Build a configuration model from scratch', icon: 'fa-regular fa-sparkles', label: 'New product', placeholder: 'Message…', response: 'Upload a product manual or spec file to get started. You can drag files into the chat or use the attach button.', workflow: 'new-product' },
    { desc: 'Update an existing configuration model', icon: 'fa-regular fa-pen-to-square', label: 'Edit product', placeholder: 'Search products…', response: 'You can ask me to search for it or select from this list of recently modified products:', actions: ['Cyclo 6000 Gearmotor', 'Cyclo Bevel Buddybox', 'Hansen P4 Industrial', 'Fine Cyclo F2C', 'Paramax 9000', 'SM-Hyponic RH Series', 'Alta Series AC Drive', 'Lafert HPS Motor'], workflow: 'edit-product' },
    { desc: 'Load a product from a URL', handler: startDemoFlow, icon: 'fa-regular fa-link', label: 'Demo from link' },
  ].forEach(entry => {
    const card = makeEl('div', 'fork-card')
    const icon = makeEl('i'); icon.className = entry.icon
    card.appendChild(icon)
    const text = makeEl('div', 'card-text')
    text.appendChild(makeEl('b', null, entry.label))
    text.appendChild(makeEl('span', null, entry.desc))
    card.appendChild(text)
    card.addEventListener('click', () => {
      if (entry.handler) { entry.handler(); return }
      state.messages.push(entry.label)
      state.workflow = { id: entry.workflow, step: 0 }
      if (entry.response) state.messages.push({ type: 'agent', text: entry.response })
      if (entry.actions) state.messages.push({ type: 'actions', actions: entry.actions.map(label => ({ label, handler: () => { state.messages = state.messages.filter(m => m.type !== 'actions'); state.messages.push(label); state.workspace.status = label; render() } })) })
      if (entry.placeholder) state.placeholder = entry.placeholder
      render()
    })
    el.appendChild(card)
  })
  return el
}

// Onboarding

let industryNeeded = Math.random() > 0.5

const advanceOnboarding = () => {
  const completed = state.workflow.step
  let next = completed + 1

  const now = new Date().toISOString().slice(0, 10)
  const addFile = name => {
    const src = (fixtures.customerContext?.files ?? []).find(f => f.name === name)
    if (src && !state.files.some(f => f.name === name)) state.files.push({ ...src, created: now, locked: true, source: 'Generated' })
  }

  if (completed === 0) addFile('COMPANY.md')
  if (completed === 1 || (completed === 0 && !industryNeeded)) addFile('VERTICAL.md')
  if (completed === 2) addFile('USER.md')

  const ob = fixtures.onboarding
  if (next === 1 && !industryNeeded) {
    state.messages.push({ type: 'agent', text: ob.industrySkipped.agent })
    next = 2
  }
  if (next === 1) state.messages.push({ type: 'agent', text: ob.industryNeeded.agent })
  if (next === 2) state.messages.push({ type: 'agent', text: ob.user.agent })
  if (next === 3) state.messages.push({ type: 'agent', text: ob.review.agent })
  state.workflow.step = next
  render()
}

const renderOnboardingStep = el => {
  const ob = fixtures.onboarding
  if (!ob) return
  const step = state.workflow.step

  if (step === 0) {
    state.placeholder = ob.company.placeholder
  } else if (step === 1) {
    const card = makeEl('div', 'verification-card')
    Object.entries(ob.industryNeeded.card).forEach(([k, v]) => {
      const row = makeEl('div', 'verification-row')
      row.appendChild(makeEl('span', 'verification-key', k))
      row.appendChild(makeEl('span', null, v))
      card.appendChild(row)
    })
    el.appendChild(card)
    state.placeholder = 'Confirm or correct…'
  } else if (step === 2) {
    state.placeholder = ob.user.placeholder
  } else if (step === 3) {
    const fileList = makeEl('div', 'review-files')
    ob.review.files.forEach(f => {
      const row = makeEl('div', 'review-file-row')
      const icon = makeEl('i'); icon.className = f.icon
      row.appendChild(icon)
      row.appendChild(makeEl('b', null, f.label))
      row.appendChild(makeEl('span', null, ` → ${f.desc}`))
      fileList.appendChild(row)
    })
    el.appendChild(fileList)
    const btn = makeEl('button', 'button outline', "I'm done")
    btn.type = 'button'
    btn.addEventListener('click', () => {
      const archived = [...state.messages, "I'm done"]
      state.messages = [{ type: 'onboarding-recap', archived, expanded: false, files: ob.review.files }]
      state.workflow = { id: 'triage', step: 0 }
      state.context = 6
      state.placeholder = 'Message…'
      render()
    })
    el.appendChild(btn)
  }
}

// Demo flow

const startDemoFlow = () => {
  state.messages.push('Demo from link')
  state.workflow = { id: 'new-product', step: 0 }
  state.placeholder = 'Paste URL…'
  state.messages.push({ type: 'agent', text: 'Select an example from the list below or submit a URL (experimental).' })
  state.messages.push({ type: 'actions', actions: (fixtures.demoExamples ?? []).map(ex => ({ label: ex.label, handler: () => startIngress(ex) })) })
  render()
}

let statusInterval = null
let workflowStartTime = null
let activeIngress = null

const pushElapsed = () => {
  if (!workflowStartTime) return
  const s = Math.round((Date.now() - workflowStartTime) / 1000)
  state.messages.push({ type: 'agent', text: `✻ Workflow ran for ${s}s` })
  workflowStartTime = null
}

const startIngress = example => {
  state.messages = state.messages.filter(m => m.type !== 'actions')
  state.messages.push(example.label)
  state.workflow = { id: 'file-ingress', step: 0 }
  state.placeholder = 'Message…'
  activeIngress = { example, stepIdx: 0, stepRows: null, card: null }
  workflowStartTime = Date.now()
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
    const file = { ...example.file, assessment: example.assessment }
    state.files.push(file)
    const existingProduct = state.files.find(f => f.name === 'PRODUCT.md')
    const prevAssessment = existingProduct?.assessment ?? {}
    const newA = example.assessment
    const merged = {
      ...prevAssessment,
      ...newA,
      pages: (prevAssessment.pages ?? 0) + (newA.pages ?? 0),
      tables: (prevAssessment.tables ?? 0) + (newA.tables ?? 0),
      figures: (prevAssessment.figures ?? 0) + (newA.figures ?? 0),
      tokens: `~${Math.round((parseInt(prevAssessment.tokens?.replace(/\D/g,'') ?? '0') + parseInt(newA.tokens?.replace(/\D/g,'') ?? '0')) / 1000)}k`,
      summary: prevAssessment.summary ? `${prevAssessment.summary}\n\n${newA.summary}` : newA.summary,
      modelEstimates: { ...prevAssessment.modelEstimates, ...newA.modelEstimates },
    }
    const productMd = {
      assessment: merged,
      created: new Date().toISOString().slice(0, 10),
      locked: false,
      name: 'PRODUCT.md',
      owner: 'Agent',
      pages: 1,
      size: existingProduct ? '5.1 kb' : '3.4 kb',
      type: 'md',
    }
    const idx = state.files.findIndex(f => f.name === 'PRODUCT.md')
    if (idx >= 0) state.files[idx] = productMd
    else state.files.push(productMd)
    state.selectedFile = file
    state.workflow.step = example.ingress.length
    state.status = null
    state.activeTab = 'files'
    state.workspace.status = example.label
    state.messages.push({ type: 'file-card', file })
    pushElapsed()
    activeIngress = null
    g('detail-panel').classList.remove('collapsed')
    render()
    setTimeout(() => { state.workflow = { id: 'new-product', step: 0 }; render() }, 2000)
    return
  }

  const step = example.ingress[activeIngress.stepIdx]
  state.workflow.step = activeIngress.stepIdx
  if (step.context) state.context = step.context
  const frames = step.statusFrames ?? [`${step.step}…`]
  state.status = frames[0]
  render()

  if (frames.length > 1) {
    let frameIdx = 0
    statusInterval = setInterval(() => {
      frameIdx = (frameIdx + 1) % frames.length
      state.status = frames[frameIdx]
      q('.status-text').forEach(el => el.textContent = frames[frameIdx])
    }, step.ms / frames.length)
  }

  activeIngress.stepIdx++
  setTimeout(advanceIngress, step.ms)
}

// Build flow

let activeBuild = null

const BUILD_PHASES = [
  { id: 'skeleton', label: 'Skeleton generated', tab: 'model', workflow: 'generate-skeleton' },
  { id: 'constraints', label: 'Constraints generated', tab: 'rules', workflow: 'generate-constraints' },
  { id: 'bom', label: 'BOM generated', tab: 'results', workflow: 'generate-bom' },
]

const startBuild = () => {
  if (activeBuild || activeIngress) return
  state.messages.push('Build')
  activeBuild = { phaseIdx: 0, stepIdx: 0 }
  runBuildPhase()
}

const runBuildPhase = () => {
  if (!activeBuild) return
  const phase = BUILD_PHASES[activeBuild.phaseIdx]
  if (!phase) {
    fetch('cyclo-6000.json').then(r => r.json()).then(pd => {
      productData = pd
      state.status = null
      state.workspace.status = pd.product.name
      state.activeTab = 'model'
      state.messages.push({ type: 'build-card', label: 'Build complete', detail: `${pd.model.inputs.length} inputs · ${pd.rules.logicItems.length} logic items · ${pd.results.bomSkeleton.length} BOM lines`, tab: 'model' })
      activeBuild = null
      render()
      setTimeout(() => { state.workflow = { id: 'new-product', step: 2 }; render() }, 2000)
    })
    return
  }
  const steps = fixtures.buildPhases?.[phase.id] ?? []
  activeBuild.stepIdx = 0
  workflowStartTime = Date.now()
  state.workflow = { id: phase.workflow, step: 0 }
  render()
  setTimeout(advanceBuild, 500)
}

const advanceBuild = () => {
  if (!activeBuild) return
  const phase = BUILD_PHASES[activeBuild.phaseIdx]
  const steps = fixtures.buildPhases?.[phase.id] ?? []
  if (statusInterval) { clearInterval(statusInterval); statusInterval = null }

  if (activeBuild.stepIdx >= steps.length) {
    state.workflow.step = steps.length
    state.status = null
    const detail = steps.map(s => s.detail).pop()
    state.messages.push({ type: 'build-card', label: phase.label, detail, tab: phase.tab })
    pushElapsed()
    render()
    activeBuild.phaseIdx++
    activeBuild.stepIdx = 0
    setTimeout(runBuildPhase, 1500)
    return
  }

  const step = steps[activeBuild.stepIdx]
  state.workflow.step = activeBuild.stepIdx
  if (step.context) state.context = step.context
  const frames = step.statusFrames ?? [`${step.step}…`]
  state.status = frames[0]
  render()

  if (frames.length > 1) {
    let frameIdx = 0
    statusInterval = setInterval(() => {
      frameIdx = (frameIdx + 1) % frames.length
      state.status = frames[frameIdx]
      q('.status-text').forEach(el => el.textContent = frames[frameIdx])
    }, step.ms / frames.length)
  }

  activeBuild.stepIdx++
  setTimeout(advanceBuild, step.ms)
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

q('.pill').forEach(pill => pill.addEventListener('click', () => {
  if (pill.textContent === 'Update' && fixtures.updateExample) startIngress(fixtures.updateExample)
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
  if (tab.dataset.tab === 'files' && filesGrid) {
    filesGrid.autoSizeAllColumns()
    filesGrid.sizeColumnsToFit()
  }
}))

const submitInput = () => {
  const input = g('chat-input')
  const val = input.value.trim()
  if (!val) return
  input.value = ''
  state.messages = state.messages.filter(m => m.type !== 'actions')
  state.messages.push(val)
  if (state.workflow?.id === 'first-use' && state.workflow.step <= 2) {
    advanceOnboarding()
    return
  }
  render()
}

g('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') submitInput() })
g('send-btn').addEventListener('click', submitInput)

g('reset-btn').addEventListener('click', () => { reset(); render() })

// Init

Promise.all([
  fetch('workflows.json').then(r => r.json()),
  fetch('fixtures.json').then(r => r.json()),
]).then(([wf, fx]) => {
  workflows = wf; fixtures = fx
  if (state.workflow?.id === 'first-use' && !state.messages.length) {
    state.messages.push({ type: 'agent', text: fx.onboarding.company.agent })
  }
  render()
})
