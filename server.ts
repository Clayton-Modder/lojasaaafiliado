import express from "express";

const app = express();
app.use(express.json());

/*
  ⚠️ IMPORTANTE:
  Em Vercel, memória NÃO é persistente.
  Isso é apenas exemplo funcional.
  Para produção use:
  - Supabase
  - MongoDB Atlas
  - PlanetScale
*/

let users = [];
let deals = [];
let info = {
  totalClicks: 0,
  dealClicks: {}
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@email.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123456";

/* =========================
   CONFIG
========================= */

let config = {
  siteName: "Nova Ofertas",
  siteDescription: "As melhores ofertas da internet",
  footerText: "© 2026",
  categories: [
    { name: "Todos", icon: "Filter" },
    { name: "Smartphones", icon: "Smartphone" },
    { name: "Notebooks", icon: "Laptop" }
  ]
};

app.get("/api/config", (req, res) => {
  res.json(config);
});

app.post("/api/config", (req, res) => {
  const { newConfig, adminEmail, adminPassword } = req.body;

  if (adminEmail !== ADMIN_EMAIL || adminPassword !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "Acesso negado" });
  }

  config = newConfig;
  res.json({ success: true });
});

/* =========================
   DEALS
========================= */

app.get("/api/deals", (req, res) => {
  res.json(deals);
});

app.post("/api/deals", (req, res) => {
  const { deal, adminEmail, adminPassword } = req.body;

  if (adminEmail !== ADMIN_EMAIL || adminPassword !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "Acesso negado" });
  }

  const newDeal = {
    ...deal,
    id: Date.now().toString(),
    timestamp: new Date().toISOString()
  };

  deals.unshift(newDeal);

  res.json({ success: true, deal: newDeal });
});

app.put("/api/deals/:id", (req, res) => {
  const { id } = req.params;
  const { deal, adminEmail, adminPassword } = req.body;

  if (adminEmail !== ADMIN_EMAIL || adminPassword !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "Acesso negado" });
  }

  const index = deals.findIndex(d => d.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Oferta não encontrada" });
  }

  deals[index] = { ...deals[index], ...deal };

  res.json({ success: true, deal: deals[index] });
});

app.delete("/api/deals/:id", (req, res) => {
  const { id } = req.params;
  const { adminEmail, adminPassword } = req.body;

  if (adminEmail !== ADMIN_EMAIL || adminPassword !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "Acesso negado" });
  }

  deals = deals.filter(d => d.id !== id);

  res.json({ success: true });
});

/* =========================
   REGISTRO
========================= */

app.post("/api/register", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha obrigatórios" });
  }

  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: "Usuário já existe" });
  }

  const newUser = {
    email,
    password,
    name: email.split("@")[0],
    xp: 0,
    level: 1,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);

  res.json({ success: true });
});

/* =========================
   LOGIN
========================= */

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Credenciais inválidas" });
  }

  res.json({
    success: true,
    user: {
      email: user.email,
      name: user.name,
      xp: user.xp,
      level: user.level
    }
  });
});

/* =========================
   STATS
========================= */

app.get("/api/stats", (req, res) => {
  res.json({
    totalProducts: deals.length,
    totalUsers: users.length,
    totalClicks: info.totalClicks
  });
});

/* =========================
   EXPORT VERCEL
========================= */

export default app;
