const g = document.getElementById.bind(document)
const q = document.querySelectorAll.bind(document)

const makeEl = (tag, cls, text) => {
  const el = document.createElement(tag)
  if (cls) el.className = cls
  if (text !== undefined) el.textContent = text
  return el
}

const initStrip = (stripId, toggleId) => {
  const strip = g(stripId)
  g(toggleId).addEventListener('click', e => { e.stopPropagation(); strip.classList.toggle('collapsed') })
  strip.addEventListener('click', () => { if (strip.classList.contains('collapsed')) strip.classList.remove('collapsed') })
}

let workflowTimer = null

const setWorkflowStatus = (text = '✻ Awaiting user input') => {
  const el = g('workflow-status')
  el.classList.remove('running')
  el.textContent = text
  if (workflowTimer) { clearInterval(workflowTimer); workflowTimer = null }
}

const startWorkflowTimer = seconds => {
  const el = g('workflow-status')
  el.classList.add('running')
  let remaining = seconds
  const update = () => {
    const m = Math.floor(remaining / 60)
    const s = remaining % 60
    el.textContent = `${m}m ${String(s).padStart(2, '0')}s`
    if (remaining <= 0) {
      clearInterval(workflowTimer)
      workflowTimer = null
      setWorkflowStatus()
    }
    remaining--
  }
  update()
  workflowTimer = setInterval(update, 1000)
}

let workflows = {}
let activeWorkflow = null

const renderWorkflow = (id, activeStep = 0) => {
  const bar = g('workflow-bar')
  bar.replaceChildren()
  const wf = workflows[id]
  if (!wf) return
  activeWorkflow = id

  bar.appendChild(makeEl('b', null, `${wf.name} workflow`))

  wf.steps.forEach((step, i) => {
    bar.appendChild(makeEl('span', 'inline-separator', '—'))
    const dot = makeEl('span', 'workflow-dot')
    if (i < activeStep) dot.classList.add('done')
    else if (i === activeStep) dot.classList.add('active')
    bar.appendChild(dot)
    bar.appendChild(makeEl('span', 'workflow-step', step))
  })

  const status = makeEl('span', null, '✻ Awaiting user input')
  status.id = 'workflow-status'
  bar.appendChild(status)
}

fetch('workflows.json').then(r => r.json()).then(data => {
  workflows = data
  renderWorkflow('first-use')
})

fetch('fixtures.json').then(r => r.json()).then(data => {
  const container = g('model-stats')
  data.modelStats.forEach(({ count, icon, label }) => {
    const stat = makeEl('span', 'overview-stat')
    const i = makeEl('i'); i.className = icon
    stat.appendChild(i)
    stat.appendChild(document.createTextNode(`${count} ${label}`))
    container.appendChild(stat)
  })
})

const selectFork = label => {
  const fork = g('chat-fork')
  const messages = g('chat-messages')
  fork.remove()
  const bubble = makeEl('div', 'chat-bubble', label)
  messages.appendChild(bubble)
  if (label === 'Demo from link') g('chat-input').placeholder = 'Paste URL…'
}

g('fork-new').addEventListener('click', () => selectFork('New product'))
g('fork-edit').addEventListener('click', () => selectFork('Edit product'))
g('fork-demo').addEventListener('click', () => selectFork('Demo from link'))

initStrip('sidenav', 'nav-toggle')
initStrip('chat-panel', 'chat-toggle')
initStrip('detail-panel', 'detail-toggle')

g('quick-actions-header').addEventListener('click', () => g('quick-actions').classList.toggle('collapsed'))

q('.chip-tab').forEach(tab => tab.addEventListener('click', () => {
  q('.chip-tab').forEach(t => t.classList.remove('active'))
  q('.tab-pane').forEach(p => p.classList.remove('active'))
  tab.classList.add('active')
  g(`pane-${tab.dataset.tab}`)?.classList.add('active')
}))
