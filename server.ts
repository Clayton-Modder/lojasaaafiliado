import express from 'express'

const app = express()
app.use(express.json())

// ⚠️ Memória temporária (reseta a cada execução serverless)
let contas: any[] = []
let deals: any[] = []
let config: any = {
  siteName: "Nova Ofertas",
  siteDescription: "As melhores ofertas da internet",
}
let info: any = {
  totalClicks: 0,
  dealClicks: {}
}

const ADMIN_EMAIL = 'admimn@gmasil.com'
const ADMIN_PASSWORD = 'Admin42'

/* ================= CONFIG ================= */

app.get('/api/config', (req, res) => {
  res.json(config)
})

app.post('/api/config', (req, res) => {
  const { config: newConfig, adminEmail, adminPassword } = req.body

  if (adminEmail !== ADMIN_EMAIL || adminPassword !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Acesso negado' })
  }

  config = newConfig
  res.json({ success: true })
})

/* ================= DEALS ================= */

app.get('/api/deals', (req, res) => {
  res.json(deals)
})

app.post('/api/deals', (req, res) => {
  const { deal, adminEmail, adminPassword } = req.body

  if (adminEmail !== ADMIN_EMAIL || adminPassword !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Acesso negado' })
  }

  const newDeal = {
    ...deal,
    id: Date.now().toString(),
    timestamp: new Date().toISOString()
  }

  deals.unshift(newDeal)
  res.json({ success: true, deal: newDeal })
})

/* ================= REGISTER ================= */

app.post('/api/register', (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha obrigatórios' })
  }

  if (contas.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Usuário já existe' })
  }

  const newUser = {
    email,
    password,
    xp: 0,
    level: 1,
    createdAt: new Date().toISOString()
  }

  contas.push(newUser)

  res.json({ success: true })
})

/* ================= LOGIN ================= */

app.post('/api/login', (req, res) => {
  const { email, password } = req.body

  const user = contas.find(
    u => u.email === email && u.password === password
  )

  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' })
  }

  res.json({
    success: true,
    user
  })
})

/* ================= STATS ================= */

app.get('/api/stats', (req, res) => {
  res.json({
    totalUsers: contas.length,
    totalProducts: deals.length,
    totalClicks: info.totalClicks
  })
})

export default app
