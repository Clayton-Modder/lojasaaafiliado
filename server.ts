import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs/promises';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;
  const CONTAS_FILE = path.join(process.cwd(), 'contas.json');
  const CONTASREG_FILE = path.join(process.cwd(), 'contasreg.json');
  const DEALS_FILE = path.join(process.cwd(), 'produtos.jsonb');
  const CONFIG_FILE = path.join(process.cwd(), 'config.json');
  const INFO_FILE = path.join(process.cwd(), 'info.json');

  const ADMIN_EMAIL = 'admimn@gmasil.com';
  const ADMIN_PASSWORD = 'Admin42';

  // Ensure files exist
  const ensureFiles = async () => {
    try { await fs.access(CONTAS_FILE); } catch { await fs.writeFile(CONTAS_FILE, '[]'); }
    try { await fs.access(CONTASREG_FILE); } catch { await fs.writeFile(CONTASREG_FILE, '[]'); }
    try { await fs.access(DEALS_FILE); } catch { await fs.writeFile(DEALS_FILE, '[]'); }
    try { 
      await fs.access(CONFIG_FILE); 
    } catch { 
      const defaultConfig = {
        siteName: "Nova Ofertas",
        siteDescription: "As melhores ofertas da internet em um só lugar",
        footerText: "© 2026 Nova Ofertas. Todos os direitos reservados.",
        whatsapp: "",
        instagram: "",
        categories: [
          {name: "Todos", icon: "Filter"},
          {name: "Smartphones", icon: "Smartphone"},
          {name: "Notebooks", icon: "Laptop"},
          {name: "Áudio", icon: "Headphones"},
          {name: "Casa Inteligente", icon: "Home"},
          {name: "Wearables", icon: "Watch"},
          {name: "Hardware", icon: "Cpu"},
          {name: "Periféricos", icon: "Laptop"}
        ]
      };
      await fs.writeFile(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2)); 
    }

    try {
      await fs.access(INFO_FILE);
    } catch {
      const defaultInfo = {
        totalClicks: 0,
        dealClicks: {},
        totalUsers: 0
      };
      await fs.writeFile(INFO_FILE, JSON.stringify(defaultInfo, null, 2));
    }

    // Ensure Admin User exists
    const contasData = await fs.readFile(CONTAS_FILE, 'utf-8');
    const contas = JSON.parse(contasData);
    if (!contas.find((u: any) => u.email === ADMIN_EMAIL)) {
      contas.push({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin', createdAt: new Date().toISOString() });
      await fs.writeFile(CONTAS_FILE, JSON.stringify(contas, null, 2));
    }
  };
  await ensureFiles();

  // Mock database for subscriptions/interests
  const userInterests = new Map<string, string[]>();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('subscribe_interests', (categories: string[]) => {
      userInterests.set(socket.id, categories);
      console.log(`User ${socket.id} subscribed to:`, categories);
    });

    socket.on('disconnect', () => {
      userInterests.delete(socket.id);
      console.log('User disconnected:', socket.id);
    });
  });

  app.use(express.json());

  // Config Endpoints
  app.get('/api/config', async (req, res) => {
    try {
      const configData = await fs.readFile(CONFIG_FILE, 'utf-8');
      res.json(JSON.parse(configData));
    } catch (error) {
      res.status(500).json({ error: 'Erro ao carregar configurações' });
    }
  });

  app.post('/api/config', async (req, res) => {
    try {
      const { config, adminEmail, adminPassword } = req.body;
      if (adminEmail !== ADMIN_EMAIL || adminPassword !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
  });

  // Stats Endpoints
  app.get('/api/stats', async (req, res) => {
    try {
      const infoData = await fs.readFile(INFO_FILE, 'utf-8');
      const info = JSON.parse(infoData);
      
      const dealsData = await fs.readFile(DEALS_FILE, 'utf-8');
      const deals = JSON.parse(dealsData);
      
      const usersData = await fs.readFile(CONTAS_FILE, 'utf-8');
      const users = JSON.parse(usersData);

      res.json({
        ...info,
        totalProducts: deals.length,
        totalUsers: users.length
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao carregar estatísticas' });
    }
  });

  app.post('/api/deals/:id/click', async (req, res) => {
    try {
      const { id } = req.params;
      const infoData = await fs.readFile(INFO_FILE, 'utf-8');
      const info = JSON.parse(infoData);
      
      info.totalClicks = (info.totalClicks || 0) + 1;
      info.dealClicks = info.dealClicks || {};
      info.dealClicks[id] = (info.dealClicks[id] || 0) + 1;
      
      await fs.writeFile(INFO_FILE, JSON.stringify(info, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao registrar clique' });
    }
  });

  // Deals Endpoints
  app.get('/api/deals', async (req, res) => {
    try {
      const dealsData = await fs.readFile(DEALS_FILE, 'utf-8');
      res.json(JSON.parse(dealsData));
    } catch (error) {
      res.status(500).json({ error: 'Erro ao carregar ofertas' });
    }
  });

  app.post('/api/deals', async (req, res) => {
    try {
      const { deal, adminEmail, adminPassword } = req.body;
      
      if (adminEmail !== ADMIN_EMAIL || adminPassword !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const dealsData = await fs.readFile(DEALS_FILE, 'utf-8');
      const deals = JSON.parse(dealsData);
      
      const newDeal = {
        ...deal,
        id: Date.now().toString(),
        timestamp: 'Agora mesmo'
      };

      deals.unshift(newDeal);
      await fs.writeFile(DEALS_FILE, JSON.stringify(deals, null, 2));

      // Notify users
      io.sockets.sockets.forEach((socket) => {
        const interests = userInterests.get(socket.id) || [];
        if (interests.includes('Todos') || interests.includes(newDeal.category)) {
          socket.emit('new_deal_notification', {
            id: Date.now().toString(),
            title: 'Nova Oferta Publicada!',
            message: `${newDeal.title} por apenas R$ ${newDeal.price.toFixed(2)} na ${newDeal.store}!`,
            deal: newDeal,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      });

      res.json({ success: true, deal: newDeal });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao salvar oferta' });
    }
  });

  app.put('/api/deals/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { deal, adminEmail, adminPassword } = req.body;

      if (adminEmail !== ADMIN_EMAIL || adminPassword !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const dealsData = await fs.readFile(DEALS_FILE, 'utf-8');
      let deals = JSON.parse(dealsData);
      
      const index = deals.findIndex((d: any) => d.id === id);
      if (index === -1) return res.status(404).json({ error: 'Oferta não encontrada' });

      deals[index] = { ...deals[index], ...deal };
      await fs.writeFile(DEALS_FILE, JSON.stringify(deals, null, 2));

      res.json({ success: true, deal: deals[index] });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao editar oferta' });
    }
  });

  app.delete('/api/deals/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { adminEmail, adminPassword } = req.body;

      if (adminEmail !== ADMIN_EMAIL || adminPassword !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const dealsData = await fs.readFile(DEALS_FILE, 'utf-8');
      let deals = JSON.parse(dealsData);
      
      deals = deals.filter((d: any) => d.id !== id);
      await fs.writeFile(DEALS_FILE, JSON.stringify(deals, null, 2));

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao excluir oferta' });
    }
  });

  // Registration Endpoint
  app.post('/api/register', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios' });

      // Read current accounts
      const contasData = await fs.readFile(CONTAS_FILE, 'utf-8');
      const contas = JSON.parse(contasData);

      if (contas.find((u: any) => u.email === email)) {
        return res.status(400).json({ error: 'Usuário já existe' });
      }

      const newUser = { 
        email, 
        password, 
        name: email.split('@')[0],
        xp: 0,
        level: 1,
        lastXpUpdate: new Date().toISOString(),
        createdAt: new Date().toISOString() 
      };
      
      // Save to contasreg.json (as per user request: "contasreg.json sera as contas que vai ser registrada")
      const regData = await fs.readFile(CONTASREG_FILE, 'utf-8');
      const registrations = JSON.parse(regData);
      registrations.push(newUser);
      await fs.writeFile(CONTASREG_FILE, JSON.stringify(registrations, null, 2));

      // Also save to contas.json (as per user request: "contas.json sera aonde vai amarzena todas copntas ja criada")
      contas.push(newUser);
      await fs.writeFile(CONTAS_FILE, JSON.stringify(contas, null, 2));

      res.json({ success: true });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  });

  // Login Endpoint
  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const contasData = await fs.readFile(CONTAS_FILE, 'utf-8');
      const contas = JSON.parse(contasData);

      const user = contas.find((u: any) => u.email === email && u.password === password);
      if (user) {
        // Update XP on login
        const now = new Date();
        const lastUpdate = new Date(user.lastXpUpdate || user.createdAt);
        const hoursPassed = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60));
        
        if (hoursPassed > 0) {
          user.xp = (user.xp || 0) + hoursPassed;
          user.lastXpUpdate = new Date(lastUpdate.getTime() + hoursPassed * 3600000).toISOString();
          
          // Level up logic: 5 XP per level for now as per "1/5 para pegar level 2"
          user.level = Math.floor((user.xp || 0) / 5) + 1;
          
          await fs.writeFile(CONTAS_FILE, JSON.stringify(contas, null, 2));
        }

        res.json({ 
          success: true, 
          user: { 
            email: user.email, 
            name: user.name || user.email.split('@')[0],
            xp: user.xp || 0,
            level: user.level || 1,
            lastXpUpdate: user.lastXpUpdate
          } 
        });
      } else {
        res.status(401).json({ error: 'Credenciais inválidas' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  });

  // User Profile Endpoints
  app.post('/api/user/update', async (req, res) => {
    try {
      const { email, name } = req.body;
      const contasData = await fs.readFile(CONTAS_FILE, 'utf-8');
      let contas = JSON.parse(contasData);
      
      const index = contas.findIndex((u: any) => u.email === email);
      if (index === -1) return res.status(404).json({ error: 'Usuário não encontrado' });
      
      contas[index].name = name;
      await fs.writeFile(CONTAS_FILE, JSON.stringify(contas, null, 2));
      
      res.json({ success: true, user: contas[index] });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
  });

  app.post('/api/user/change-password', async (req, res) => {
    try {
      const { email, currentPassword, newPassword } = req.body;
      const contasData = await fs.readFile(CONTAS_FILE, 'utf-8');
      let contas = JSON.parse(contasData);
      
      const index = contas.findIndex((u: any) => u.email === email && u.password === currentPassword);
      if (index === -1) return res.status(401).json({ error: 'Senha atual incorreta' });
      
      contas[index].password = newPassword;
      await fs.writeFile(CONTAS_FILE, JSON.stringify(contas, null, 2));
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao alterar senha' });
    }
  });

  app.get('/api/user/xp/:email', async (req, res) => {
    try {
      const { email } = req.params;
      const contasData = await fs.readFile(CONTAS_FILE, 'utf-8');
      let contas = JSON.parse(contasData);
      
      const index = contas.findIndex((u: any) => u.email === email);
      if (index === -1) return res.status(404).json({ error: 'Usuário não encontrado' });
      
      const user = contas[index];
      const now = new Date();
      const lastUpdate = new Date(user.lastXpUpdate || user.createdAt);
      const hoursPassed = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60));
      
      if (hoursPassed > 0) {
        user.xp = (user.xp || 0) + hoursPassed;
        user.lastXpUpdate = new Date(lastUpdate.getTime() + hoursPassed * 3600000).toISOString();
        user.level = Math.floor((user.xp || 0) / 5) + 1;
        await fs.writeFile(CONTAS_FILE, JSON.stringify(contas, null, 2));
      }
      
      res.json({ 
        xp: user.xp || 0, 
        level: user.level || 1, 
        nextLevelXp: 5,
        lastXpUpdate: user.lastXpUpdate 
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar XP' });
    }
  });

  // API to simulate a new deal being published
  app.post('/api/simulate-deal', (req, res) => {
    const { deal } = req.body;
    
    // Broadcast to users interested in this category
    io.sockets.sockets.forEach((socket) => {
      const interests = userInterests.get(socket.id) || [];
      if (interests.includes('Todos') || interests.includes(deal.category)) {
        socket.emit('new_deal_notification', {
          id: Date.now().toString(),
          title: 'Nova Oferta!',
          message: `${deal.title} por apenas R$ ${deal.price.toFixed(2)} na ${deal.store}!`,
          deal: deal,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    });

    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
