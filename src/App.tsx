/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Tag, 
  ExternalLink, 
  Smartphone, 
  Laptop, 
  Headphones, 
  Home, 
  Watch, 
  Cpu, 
  X,
  User,
  LogIn,
  LogOut,
  Mail,
  Lock,
  ChevronRight,
  Copy,
  Check,
  Flame,
  Clock,
  Filter,
  Bell,
  Heart,
  Settings,
  Zap,
  Shield,
  Plus,
  Image as ImageIcon,
  Link as LinkIcon,
  Store,
  Trash2,
  Edit2,
  Layout,
  Type,
  AlignLeft,
  Copyright,
  List,
  Instagram,
  MessageCircle,
  BarChart3,
  TrendingUp,
  MousePointer2,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';

// Types
interface SiteConfig {
  siteName: string;
  siteDescription: string;
  footerText: string;
  whatsapp?: string;
  instagram?: string;
  categories: { name: string; icon: string }[];
}

interface Notification {
  id: string;
  title: string;
  message: string;
  deal: Deal;
  timestamp: string;
  read: boolean;
}
interface Deal {
  id: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  store: string;
  category: string;
  imageUrl: string;
  screenshots?: string[];
  link: string;
  coupon?: string;
  isHot?: boolean;
  timestamp: string;
}

// Mock Data
const DEALS: Deal[] = [];

const CATEGORIES = [
  { name: 'Todos', icon: Filter },
  { name: 'Smartphones', icon: Smartphone },
  { name: 'Notebooks', icon: Laptop },
  { name: 'Áudio', icon: Headphones },
  { name: 'Casa Inteligente', icon: Home },
  { name: 'Wearables', icon: Watch },
  { name: 'Hardware', icon: Cpu },
  { name: 'Periféricos', icon: Laptop },
];

const ICON_MAP: Record<string, any> = {
  Filter,
  Smartphone,
  Laptop,
  Headphones,
  Home,
  Watch,
  Cpu,
  Tag,
  Zap,
  Shield,
  Search,
  User,
  Bell,
  Heart,
  Settings,
  Instagram,
  MessageCircle
};

export default function App() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [config, setConfig] = useState<SiteConfig>({
    siteName: 'Nova Ofertas',
    siteDescription: 'As melhores ofertas da internet em um só lugar',
    footerText: '© 2026 Nova Ofertas. Todos os direitos reservados.',
    whatsapp: '',
    instagram: '',
    categories: []
  });
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  // New states for Notifications and Wishlist
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [interestCategories, setInterestCategories] = useState<string[]>(['Todos']);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalClicks: number;
    totalProducts: number;
    totalUsers: number;
    dealClicks: Record<string, number>;
  } | null>(null);

  // Admin Panel States
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'list' | 'form' | 'config' | 'categories' | 'stats'>('list');
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [newDeal, setNewDeal] = useState<Partial<Deal>>({
    title: '',
    description: '',
    price: 0,
    originalPrice: 0,
    store: '',
    category: 'Smartphones',
    imageUrl: '',
    screenshots: [],
    link: '',
    coupon: '',
    isHot: false
  });
  const [newScreenshotUrl, setNewScreenshotUrl] = useState('');

  // Category Edit State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Tag');

  const isAdmin = userEmail === 'admimn@gmasil.com' && isLoggedIn;

  // Fetch Config
  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  // Fetch Deals
  const fetchDeals = async () => {
    try {
      const response = await fetch('/api/deals');
      const data = await response.json();
      setDeals(data);
    } catch (error) {
      console.error('Error fetching deals:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchDeals();
    fetchConfig();
    if (isAdminPanelOpen) fetchStats();
  }, [isAdminPanelOpen]);

  // Initialize Socket.io
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('new_deal_notification', (notification: Omit<Notification, 'read'>) => {
      setNotifications(prev => [{ ...notification, read: false }, ...prev]);
      
      // Browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, { body: notification.message });
      }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Sync interests with server
  useEffect(() => {
    if (socket) {
      socket.emit('subscribe_interests', interestCategories);
    }
  }, [socket, interestCategories]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const toggleWishlist = (id: string) => {
    setWishlist(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleInterest = (category: string) => {
    setInterestCategories(prev => {
      if (category === 'Todos') return ['Todos'];
      const filtered = prev.filter(c => c !== 'Todos');
      return filtered.includes(category) 
        ? (filtered.length === 1 ? ['Todos'] : filtered.filter(c => c !== category))
        : [...filtered, category];
    });
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    try {
      const endpoint = isRegisterMode ? '/api/register' : '/api/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, password })
      });

      const data = await response.json();

      if (response.ok) {
        if (isRegisterMode) {
          // After successful registration, switch to login mode or auto-login
          setIsRegisterMode(false);
          setAuthError('Conta criada com sucesso! Agora faça login.');
        } else {
          setIsLoggedIn(true);
          setIsLoginModalOpen(false);
        }
      } else {
        setAuthError(data.error || 'Ocorreu um erro. Tente novamente.');
      }
    } catch (error) {
      setAuthError('Erro de conexão com o servidor.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail('');
    setPassword('');
    setAuthError('');
  };

  const handleAddDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingDealId ? 'PUT' : 'POST';
      const url = editingDealId ? `/api/deals/${editingDealId}` : '/api/deals';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          deal: newDeal, 
          adminEmail: 'admimn@gmasil.com', 
          adminPassword: 'Admin42' 
        })
      });

      if (response.ok) {
        setIsAdminPanelOpen(false);
        setEditingDealId(null);
        setAdminTab('list');
        fetchDeals();
        setNewDeal({
          title: '',
          description: '',
          price: 0,
          originalPrice: 0,
          store: '',
          category: config.categories[1]?.name || 'Smartphones',
          imageUrl: '',
          screenshots: [],
          link: '',
          coupon: '',
          isHot: false
        });
      }
    } catch (error) {
      console.error('Error saving deal:', error);
    }
  };

  const handleDeleteDeal = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta oferta?')) return;
    try {
      const response = await fetch(`/api/deals/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adminEmail: 'admimn@gmasil.com', 
          adminPassword: 'Admin42' 
        })
      });

      if (response.ok) {
        fetchDeals();
      }
    } catch (error) {
      console.error('Error deleting deal:', error);
    }
  };

  const startEditing = (deal: Deal) => {
    setNewDeal(deal);
    setEditingDealId(deal.id);
    setAdminTab('form');
  };

  const handleTrackClick = async (dealId: string) => {
    try {
      await fetch(`/api/deals/${dealId}/click`, { method: 'POST' });
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          config, 
          adminEmail: 'admimn@gmasil.com', 
          adminPassword: 'Admin42' 
        })
      });
      if (response.ok) {
        alert('Configurações salvas com sucesso!');
      }
    } catch (error) {
      console.error('Error saving config:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName) return;
    const updatedConfig = {
      ...config,
      categories: [...config.categories, { name: newCategoryName, icon: newCategoryIcon }]
    };
    setConfig(updatedConfig);
    setNewCategoryName('');
    
    // Save to server
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        config: updatedConfig, 
        adminEmail: 'admimn@gmasil.com', 
        adminPassword: 'Admin42' 
      })
    });
  };

  const handleDeleteCategory = async (name: string) => {
    if (name === 'Todos') return;
    const updatedConfig = {
      ...config,
      categories: config.categories.filter(c => c.name !== name)
    };
    setConfig(updatedConfig);
    
    // Save to server
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        config: updatedConfig, 
        adminEmail: 'admimn@gmasil.com', 
        adminPassword: 'Admin42' 
      })
    });
  };

  const simulateNewDeal = async () => {
    if (deals.length === 0) return;
    const randomDeal = deals[Math.floor(Math.random() * deals.length)];
    const dealWithNewId = { ...randomDeal, id: Date.now().toString(), title: `[NOVA] ${randomDeal.title}` };
    
    await fetch('/api/simulate-deal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deal: dealWithNewId })
    });
  };

  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      const matchesSearch = deal.title.toLowerCase().includes(search.toLowerCase()) || 
                           deal.store.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'Todos' || deal.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory, deals]);

  const handleCopyCoupon = (coupon: string, id: string) => {
    navigator.clipboard.writeText(coupon);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
                <Flame className="text-white w-6 h-6 fill-current" />
              </div>
              <span className="text-xl font-bold tracking-tight hidden sm:block">
                {config.siteName}
              </span>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-xl relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-2xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none text-sm"
                placeholder="O que você está procurando?"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Notification Bell */}
              <div className="relative">
                <button 
                  onClick={() => setIsNotificationCenterOpen(!isNotificationCenterOpen)}
                  className="p-2.5 bg-gray-50 hover:bg-orange-50 text-gray-600 hover:text-orange-500 rounded-xl transition-all relative"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </button>

                {/* Notification Center Dropdown */}
                <AnimatePresence>
                  {isNotificationCenterOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsNotificationCenterOpen(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                      >
                        <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                          <h3 className="font-bold text-sm">Notificações</h3>
                          <button 
                            onClick={markAllAsRead}
                            className="text-[10px] font-bold text-orange-500 hover:underline"
                          >
                            Marcar todas como lidas
                          </button>
                        </div>
                        <div className="max-h-96 overflow-y-auto no-scrollbar">
                          {notifications.length > 0 ? (
                            notifications.map((n) => (
                              <div 
                                key={n.id} 
                                className={`p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer ${!n.read ? 'bg-orange-50/30' : ''}`}
                              >
                                <div className="flex gap-3">
                                  <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                                    <img src={n.deal.imageUrl} alt="" className="w-full h-full object-cover" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs font-bold text-gray-900 line-clamp-1">{n.title}</p>
                                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{n.message}</p>
                                    <span className="text-[9px] text-gray-400 mt-1 block">{n.timestamp}</span>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center">
                              <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                              <p className="text-xs text-gray-400">Nenhuma notificação por enquanto.</p>
                            </div>
                          )}
                        </div>
                        <div className="p-3 bg-gray-50 text-center">
                          <button 
                            onClick={simulateNewDeal}
                            className="text-[10px] font-bold text-gray-500 hover:text-orange-500 flex items-center justify-center gap-1 mx-auto"
                          >
                            <Zap className="w-3 h-3" /> Simular Nova Oferta
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Settings / Interests */}
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 bg-gray-50 hover:bg-orange-50 text-gray-600 hover:text-orange-500 rounded-xl transition-all"
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* Admin Panel Button */}
              {isAdmin && (
                <button 
                  onClick={() => setIsAdminPanelOpen(true)}
                  className="p-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-100"
                  title="Painel Administrativo"
                >
                  <Shield className="w-5 h-5" />
                </button>
              )}

              {/* Login/User */}
              <div className="hidden md:block">
                {isLoggedIn ? (
                  <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-gray-900 truncate max-w-[100px]">{userEmail}</span>
                      <button onClick={handleLogout} className="text-[10px] font-bold text-red-500 hover:underline">Sair</button>
                    </div>
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                  </div>
                ) : adminTab === 'stats' ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100">
                        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-orange-200">
                          <MousePointer2 className="text-white w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">Total de Cliques</p>
                        <h3 className="text-3xl font-black text-orange-600">{stats?.totalClicks || 0}</h3>
                      </div>
                      <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
                          <Zap className="text-white w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Total de Produtos</p>
                        <h3 className="text-3xl font-black text-blue-600">{stats?.totalProducts || 0}</h3>
                      </div>
                      <div className="p-6 bg-purple-50 rounded-3xl border border-purple-100">
                        <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-purple-200">
                          <Users className="text-white w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Total de Usuários</p>
                        <h3 className="text-3xl font-black text-purple-600">{stats?.totalUsers || 0}</h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden">
                        <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-orange-500" />
                            Cliques por Produto
                          </h3>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                          {deals.length > 0 ? (
                            deals
                              .map(deal => ({ ...deal, clicks: stats?.dealClicks?.[deal.id] || 0 }))
                              .sort((a, b) => b.clicks - a.clicks)
                              .map(deal => (
                                <div key={deal.id} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 bg-white">
                                      <img src={deal.imageUrl} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-700 line-clamp-1 max-w-[150px]">{deal.title}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-orange-500">{deal.clicks}</span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">cliques</span>
                                  </div>
                                </div>
                              ))
                          ) : (
                            <div className="p-8 text-center text-gray-400 text-sm italic">Nenhuma oferta para mostrar.</div>
                          )}
                        </div>
                      </div>

                      <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden">
                        <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <User className="w-4 h-4 text-orange-500" />
                            Perfil do Administrador
                          </h3>
                        </div>
                        <div className="p-8">
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
                              <Shield className="w-8 h-8 text-orange-500" />
                            </div>
                            <div>
                              <h4 className="text-lg font-black text-gray-900">Administrador Master</h4>
                              <p className="text-sm text-gray-500">Acesso total ao sistema</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">E-mail</span>
                              <span className="text-sm font-bold text-gray-700">admimn@gmasil.com</span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status</span>
                              <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                Ativo
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsLoginModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-orange-500 transition-all shadow-md shadow-gray-100"
                  >
                    <LogIn className="w-4 h-4" />
                    Entrar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Panel Modal */}
      <AnimatePresence>
        {isAdminPanelOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdminPanelOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-2">
                    <Shield className="w-6 h-6 text-orange-500" />
                    <h2 className="text-2xl font-black text-gray-900">Painel Administrativo</h2>
                  </div>
                  <button onClick={() => {
                    setIsAdminPanelOpen(false);
                    setEditingDealId(null);
                    setAdminTab('list');
                  }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="flex gap-4 mb-8 border-b border-gray-100 pb-4 overflow-x-auto no-scrollbar">
                  <button 
                    onClick={() => setAdminTab('list')}
                    className={`text-sm font-bold px-4 py-2 rounded-xl transition-all whitespace-nowrap ${adminTab === 'list' ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    Lista de Ofertas
                  </button>
                  <button 
                    onClick={() => {
                      setAdminTab('form');
                      setEditingDealId(null);
                      setNewDeal({
                        title: '',
                        description: '',
                        price: 0,
                        originalPrice: 0,
                        store: '',
                        category: config.categories[1]?.name || 'Smartphones',
                        imageUrl: '',
                        screenshots: [],
                        link: '',
                        coupon: '',
                        isHot: false
                      });
                    }}
                    className={`text-sm font-bold px-4 py-2 rounded-xl transition-all whitespace-nowrap ${adminTab === 'form' ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    {editingDealId ? 'Editar Oferta' : 'Nova Oferta'}
                  </button>
                  <button 
                    onClick={() => setAdminTab('config')}
                    className={`text-sm font-bold px-4 py-2 rounded-xl transition-all whitespace-nowrap ${adminTab === 'config' ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    Site
                  </button>
                  <button 
                    onClick={() => setAdminTab('categories')}
                    className={`text-sm font-bold px-4 py-2 rounded-xl transition-all whitespace-nowrap ${adminTab === 'categories' ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    Categorias
                  </button>
                  <button 
                    onClick={() => {
                      setAdminTab('stats');
                      fetchStats();
                    }}
                    className={`text-sm font-bold px-4 py-2 rounded-xl transition-all whitespace-nowrap ${adminTab === 'stats' ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    Estatísticas
                  </button>
                </div>

                {adminTab === 'list' ? (
                  <div className="space-y-4">
                    {deals.length > 0 ? (
                      deals.map(deal => (
                        <div key={deal.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-gray-100">
                              <img src={deal.imageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{deal.title}</h4>
                              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{deal.store} • {deal.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => startEditing(deal)}
                              className="p-2 bg-white text-blue-500 rounded-xl hover:bg-blue-50 transition-all border border-gray-100"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteDeal(deal.id)}
                              className="p-2 bg-white text-red-500 rounded-xl hover:bg-red-50 transition-all border border-gray-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-gray-400 text-sm italic">Nenhuma oferta cadastrada.</p>
                      </div>
                    )}
                  </div>
                ) : adminTab === 'form' ? (
                  <form onSubmit={handleAddDeal} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Título do Produto</label>
                        <div className="relative">
                          <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="text" 
                            required
                            value={newDeal.title}
                            onChange={(e) => setNewDeal({...newDeal, title: e.target.value})}
                            placeholder="Ex: iPhone 15 Pro Max"
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Loja</label>
                        <div className="relative">
                          <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="text" 
                            required
                            value={newDeal.store}
                            onChange={(e) => setNewDeal({...newDeal, store: e.target.value})}
                            placeholder="Ex: Amazon, Mercado Livre"
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Preço Atual (R$)</label>
                        <input 
                          type="number" 
                          required
                          value={newDeal.price}
                          onChange={(e) => setNewDeal({...newDeal, price: parseFloat(e.target.value)})}
                          className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Preço Original (R$)</label>
                        <input 
                          type="number" 
                          value={newDeal.originalPrice}
                          onChange={(e) => setNewDeal({...newDeal, originalPrice: parseFloat(e.target.value)})}
                          className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Categoria</label>
                        <select 
                          value={newDeal.category}
                          onChange={(e) => setNewDeal({...newDeal, category: e.target.value})}
                          className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                        >
                          {config.categories.filter(c => c.name !== 'Todos').map(c => (
                            <option key={c.name} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Cupom (Opcional)</label>
                        <input 
                          type="text" 
                          value={newDeal.coupon}
                          onChange={(e) => setNewDeal({...newDeal, coupon: e.target.value})}
                          placeholder="Ex: JERSU10"
                          className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Descrição do Produto</label>
                        <textarea 
                          value={newDeal.description}
                          onChange={(e) => setNewDeal({...newDeal, description: e.target.value})}
                          placeholder="Detalhes sobre a oferta..."
                          rows={3}
                          className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">URL da Imagem</label>
                        <div className="relative">
                          <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="url" 
                            required
                            value={newDeal.imageUrl}
                            onChange={(e) => setNewDeal({...newDeal, imageUrl: e.target.value})}
                            placeholder="https://..."
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Screenshots / Imagens Adicionais</label>
                        <div className="flex gap-2 mb-4">
                          <div className="relative flex-1">
                            <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                              type="url" 
                              value={newScreenshotUrl}
                              onChange={(e) => setNewScreenshotUrl(e.target.value)}
                              placeholder="URL da imagem adicional..."
                              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                            />
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              if (newScreenshotUrl) {
                                setNewDeal({
                                  ...newDeal,
                                  screenshots: [...(newDeal.screenshots || []), newScreenshotUrl]
                                });
                                setNewScreenshotUrl('');
                              }
                            }}
                            className="px-6 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all"
                          >
                            Adicionar
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {newDeal.screenshots?.map((url, index) => (
                            <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 group">
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              <button 
                                type="button"
                                onClick={() => {
                                  setNewDeal({
                                    ...newDeal,
                                    screenshots: newDeal.screenshots?.filter((_, i) => i !== index)
                                  });
                                }}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Link da Oferta</label>
                        <div className="relative">
                          <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="url" 
                            required
                            value={newDeal.link}
                            onChange={(e) => setNewDeal({...newDeal, link: e.target.value})}
                            placeholder="https://..."
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                      <input 
                        type="checkbox" 
                        id="isHot"
                        checked={newDeal.isHot}
                        onChange={(e) => setNewDeal({...newDeal, isHot: e.target.checked})}
                        className="w-5 h-5 rounded border-orange-300 text-orange-500 focus:ring-orange-500"
                      />
                      <label htmlFor="isHot" className="text-sm font-bold text-orange-700 cursor-pointer flex items-center gap-2">
                        <Flame className="w-4 h-4 fill-current" />
                        Marcar como Oferta Quente
                      </label>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
                    >
                      {editingDealId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      {editingDealId ? 'Salvar Alterações' : 'Publicar Oferta'}
                    </button>
                  </form>
                ) : adminTab === 'config' ? (
                  <form onSubmit={handleSaveConfig} className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Nome do Site</label>
                      <div className="relative">
                        <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                          type="text" 
                          required
                          value={config.siteName}
                          onChange={(e) => setConfig({...config, siteName: e.target.value})}
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Descrição do Site</label>
                      <div className="relative">
                        <AlignLeft className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                        <textarea 
                          required
                          value={config.siteDescription}
                          onChange={(e) => setConfig({...config, siteDescription: e.target.value})}
                          rows={3}
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Texto do Rodapé (Footer)</label>
                      <div className="relative">
                        <Copyright className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                          type="text" 
                          required
                          value={config.footerText}
                          onChange={(e) => setConfig({...config, footerText: e.target.value})}
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">WhatsApp (Link ou Número)</label>
                        <div className="relative">
                          <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="text" 
                            value={config.whatsapp}
                            onChange={(e) => setConfig({...config, whatsapp: e.target.value})}
                            placeholder="Ex: https://wa.me/..."
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Instagram (Link)</label>
                        <div className="relative">
                          <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="text" 
                            value={config.instagram}
                            onChange={(e) => setConfig({...config, instagram: e.target.value})}
                            placeholder="Ex: https://instagram.com/..."
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Salvar Configurações
                    </button>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="p-6 bg-gray-50 rounded-[32px] border border-gray-100">
                      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-orange-500" />
                        Adicionar Nova Categoria
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                          type="text" 
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Nome da categoria"
                          className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                        />
                        <select 
                          value={newCategoryIcon}
                          onChange={(e) => setNewCategoryIcon(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                        >
                          {Object.keys(ICON_MAP).map(icon => (
                            <option key={icon} value={icon}>{icon}</option>
                          ))}
                        </select>
                      </div>
                      <button 
                        onClick={handleAddCategory}
                        className="w-full mt-4 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-all"
                      >
                        Adicionar Categoria
                      </button>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 px-1">
                        <List className="w-4 h-4 text-orange-500" />
                        Categorias Atuais
                      </h3>
                      {config.categories.map(cat => (
                        <div key={cat.name} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl group">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
                              {React.createElement(ICON_MAP[cat.icon] || Tag, { className: "w-4 h-4" })}
                            </div>
                            <span className="text-sm font-bold text-gray-700">{cat.name}</span>
                          </div>
                          {cat.name !== 'Todos' && (
                            <button 
                              onClick={() => handleDeleteCategory(cat.name)}
                              className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings / Interests Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-gray-900">Configurações de Alerta</h2>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-orange-500" />
                      Categorias de Interesse
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">Selecione as categorias que você deseja receber notificações em tempo real.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {config.categories.map(cat => {
                        const Icon = ICON_MAP[cat.icon] || Tag;
                        return (
                          <button
                            key={cat.name}
                            onClick={() => toggleInterest(cat.name)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all border ${
                              interestCategories.includes(cat.name)
                                ? 'bg-orange-500 text-white border-orange-500'
                                : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-orange-200'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      Lista de Desejos ({wishlist.length})
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">Você receberá alertas prioritários para itens marcados com coração.</p>
                    {wishlist.length > 0 ? (
                      <div className="space-y-2">
                        {wishlist.map(id => {
                          const deal = DEALS.find(d => d.id === id);
                          if (!deal) return null;
                          return (
                            <div key={id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                              <div className="flex items-center gap-3">
                                <img src={deal.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                                <span className="text-xs font-bold text-gray-700 truncate max-w-[200px]">{deal.title}</span>
                              </div>
                              <button onClick={() => toggleWishlist(id)} className="text-red-500 p-1 hover:bg-red-50 rounded-lg">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-400 italic">Sua lista de desejos está vazia.</p>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm mt-8 hover:bg-orange-500 transition-all"
                >
                  Salvar Preferências
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                      <Flame className="text-white w-5 h-5 fill-current" />
                    </div>
                    <span className="text-lg font-bold">Jersu<span className="text-orange-500">Indica</span></span>
                  </div>
                  <button 
                    onClick={() => setIsLoginModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <h2 className="text-2xl font-black text-gray-900 mb-2">
                  {isRegisterMode ? 'Crie sua conta' : 'Bem-vindo de volta!'}
                </h2>
                <p className="text-gray-500 text-sm mb-8">
                  {isRegisterMode 
                    ? 'Junte-se a nós para não perder nenhuma oferta exclusiva.' 
                    : 'Entre para salvar suas ofertas favoritas e receber alertas exclusivos.'}
                </p>

                {authError && (
                  <div className={`p-4 rounded-2xl text-xs font-bold mb-6 ${authError.includes('sucesso') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {authError}
                  </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="email" 
                        required
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                      />
                    </div>
                  </div>

                  {!isRegisterMode && (
                    <div className="flex items-center justify-between text-xs pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-gray-500 font-medium">
                        <input type="checkbox" className="rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                        Lembrar de mim
                      </label>
                      <button type="button" className="text-orange-500 font-bold hover:underline">Esqueceu a senha?</button>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-100 hover:bg-orange-600 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAuthLoading ? 'Carregando...' : (isRegisterMode ? 'Criar Conta' : 'Entrar na Conta')}
                  </button>
                </form>

                <div className="mt-8 pt-8 border-t border-gray-100 text-center">
                  <p className="text-sm text-gray-500">
                    {isRegisterMode ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'} {' '}
                    <button 
                      onClick={() => {
                        setIsRegisterMode(!isRegisterMode);
                        setAuthError('');
                      }}
                      className="text-orange-500 font-bold hover:underline"
                    >
                      {isRegisterMode ? 'Faça login' : 'Cadastre-se grátis'}
                    </button>
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Hero / Banner */}
        <section className="mb-12">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-orange-600 to-orange-400 p-8 sm:p-12 text-white shadow-2xl">
            <div className="relative z-10 max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                  Ofertas do Dia
                </span>
                <h1 className="text-4xl sm:text-5xl font-black mb-6 leading-tight">
                  {config.siteName}
                </h1>
                <p className="text-orange-50 opacity-90 text-lg mb-8">
                  {config.siteDescription}
                </p>
                <div className="flex flex-wrap gap-4">
                  <button className="px-8 py-3 bg-white text-orange-600 rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg">
                    Ver Ofertas Quentes
                  </button>
                  <button className="px-8 py-3 bg-orange-700/30 backdrop-blur-md text-white border border-white/20 rounded-2xl font-bold hover:bg-orange-700/40 transition-all">
                    Grupo VIP Telegram
                  </button>
                </div>
              </motion.div>
            </div>
            {/* Abstract Background Shapes */}
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white rounded-full blur-3xl"></div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="mb-8 overflow-x-auto pb-4 no-scrollbar">
          <div className="flex gap-3 min-w-max">
            {config.categories.map((cat) => {
              const Icon = ICON_MAP[cat.icon] || Tag;
              return (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all border ${
                    activeCategory === cat.name
                      ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-orange-200 hover:bg-orange-50/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* Deals Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {activeCategory === 'Todos' ? 'Últimas Ofertas' : activeCategory}
              <span className="text-sm font-normal text-gray-400 ml-2">({filteredDeals.length})</span>
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              Atualizado agora
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredDeals.map((deal) => (
                <motion.div
                  layout
                  key={deal.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-300 flex flex-col"
                >
                  {/* Image Container */}
                  <div className="relative aspect-square overflow-hidden bg-gray-50">
                    <img
                      src={deal.imageUrl}
                      alt={deal.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    {deal.isHot && (
                      <div className="absolute top-3 left-3 px-3 py-1 bg-red-500 text-white text-[10px] font-black uppercase tracking-tighter rounded-full flex items-center gap-1 shadow-lg">
                        <Flame className="w-3 h-3 fill-current" />
                        Oferta Quente
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex flex-col gap-2">
                      <div className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] font-bold text-gray-600 shadow-sm border border-gray-100">
                        {deal.timestamp}
                      </div>
                      <button 
                        onClick={(e) => { e.preventDefault(); toggleWishlist(deal.id); }}
                        className={`p-2 rounded-full shadow-lg transition-all ${
                          wishlist.includes(deal.id) 
                            ? 'bg-red-500 text-white scale-110' 
                            : 'bg-white/90 text-gray-400 hover:text-red-500'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${wishlist.includes(deal.id) ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">{deal.store}</span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">{deal.category}</span>
                    </div>
                    
                    <h3 
                      onClick={() => {
                        setSelectedDeal(deal);
                        setActiveImage(deal.imageUrl);
                      }}
                      className="text-sm font-bold text-gray-800 mb-1 line-clamp-2 leading-snug group-hover:text-orange-500 transition-colors cursor-pointer"
                    >
                      {deal.title}
                    </h3>
                    
                    {deal.description && (
                      <p className="text-[11px] text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                        {deal.description}
                      </p>
                    )}

                    <div className="mt-auto">
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-2xl font-black text-gray-900">
                          {deal.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        {deal.originalPrice && (
                          <span className="text-xs text-gray-400 line-through">
                            {deal.originalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        )}
                      </div>

                      {/* Coupon Section */}
                      {deal.coupon && (
                        <div className="mb-4 p-2 bg-orange-50 border border-dashed border-orange-200 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Tag className="w-3 h-3 text-orange-500" />
                            <span className="text-xs font-mono font-bold text-orange-600">{deal.coupon}</span>
                          </div>
                          <button 
                            onClick={() => handleCopyCoupon(deal.coupon!, deal.id)}
                            className="p-1.5 hover:bg-orange-100 rounded-lg transition-colors text-orange-500"
                          >
                            {copiedId === deal.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      )}

                      <a
                        href={deal.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleTrackClick(deal.id)}
                        className="w-full py-3 bg-gray-900 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-orange-500 transition-all shadow-lg shadow-gray-100 group-hover:shadow-orange-100"
                      >
                        Ir para a Loja
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredDeals.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma oferta encontrada</h3>
              <p className="text-gray-500">Tente buscar por outros termos ou categorias.</p>
              <button 
                onClick={() => {setSearch(''); setActiveCategory('Todos');}}
                className="mt-6 text-orange-500 font-bold hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedDeal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDeal(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                    <Flame className="text-white w-5 h-5 fill-current" />
                  </div>
                  <span className="text-lg font-bold">Detalhes da Oferta</span>
                </div>
                <button 
                  onClick={() => setSelectedDeal(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="overflow-y-auto p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="aspect-square rounded-3xl overflow-hidden bg-gray-50 border border-gray-100">
                    <img 
                      src={activeImage || selectedDeal.imageUrl} 
                      alt={selectedDeal.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-3 py-1 bg-orange-100 text-orange-600 text-[10px] font-bold uppercase tracking-widest rounded-full">
                        {selectedDeal.store}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-widest rounded-full">
                        {selectedDeal.category}
                      </span>
                    </div>

                    <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-4 leading-tight">
                      {selectedDeal.title}
                    </h2>

                    <div className="flex items-baseline gap-3 mb-6">
                      <span className="text-3xl font-black text-orange-500">
                        {selectedDeal.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      {selectedDeal.originalPrice && (
                        <span className="text-lg text-gray-400 line-through">
                          {selectedDeal.originalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      )}
                    </div>

                    {selectedDeal.coupon && (
                      <div className="mb-6 p-4 bg-orange-50 border border-dashed border-orange-200 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Cupom de Desconto</p>
                          <p className="text-lg font-black text-orange-600 tracking-wider">{selectedDeal.coupon}</p>
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(selectedDeal.coupon!);
                            setCopiedId(selectedDeal.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="px-4 py-2 bg-white text-orange-500 rounded-xl text-xs font-bold shadow-sm hover:bg-orange-500 hover:text-white transition-all"
                        >
                          {copiedId === selectedDeal.id ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    )}

                    <a 
                      href={selectedDeal.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleTrackClick(selectedDeal.id)}
                      className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold text-center shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
                    >
                      Ir para a Loja
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </div>

                <div className="mt-12">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-orange-500" />
                    Screenshots do Produto
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    <div 
                      onClick={() => setActiveImage(selectedDeal.imageUrl)}
                      className={`aspect-square rounded-2xl overflow-hidden border transition-all cursor-pointer hover:scale-105 ${
                        (activeImage === selectedDeal.imageUrl || !activeImage) ? 'border-orange-500 ring-2 ring-orange-100' : 'border-gray-100 bg-gray-50'
                      }`}
                    >
                      <img 
                        src={selectedDeal.imageUrl} 
                        alt="" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    {selectedDeal.screenshots?.map((url, index) => (
                      <div 
                        key={index}
                        onClick={() => setActiveImage(url)}
                        className={`aspect-square rounded-2xl overflow-hidden border transition-all cursor-pointer hover:scale-105 ${
                          activeImage === url ? 'border-orange-500 ring-2 ring-orange-100' : 'border-gray-100 bg-gray-50'
                        }`}
                      >
                        <img 
                          src={url} 
                          alt="" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-12">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <AlignLeft className="w-5 h-5 text-orange-500" />
                    Descrição Completa
                  </h3>
                  <div className="bg-gray-50 rounded-[32px] p-6 md:p-8 border border-gray-100">
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                      {selectedDeal.description || 'Nenhuma descrição detalhada disponível para esta oferta.'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 pt-16 pb-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Flame className="text-white w-5 h-5 fill-current" />
                </div>
                <span className="text-lg font-bold tracking-tight">
                  {config.siteName}
                </span>
              </div>
              <p className="text-gray-500 max-w-sm leading-relaxed">
                {config.siteDescription}
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-6">Links Úteis</h4>
              <ul className="space-y-4 text-sm text-gray-500">
                <li><a href="#" className="hover:text-orange-500 transition-colors">Sobre nós</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Contato</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-6">Redes Sociais</h4>
              <ul className="space-y-4 text-sm text-gray-500">
                {config.whatsapp && (
                  <li>
                    <a href={config.whatsapp.startsWith('http') ? config.whatsapp : `https://wa.me/${config.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </a>
                  </li>
                )}
                {config.instagram && (
                  <li>
                    <a href={config.instagram.startsWith('http') ? config.instagram : `https://instagram.com/${config.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors flex items-center gap-2">
                      <Instagram className="w-4 h-4" /> Instagram
                    </a>
                  </li>
                )}
                <li><a href="#" className="hover:text-orange-500 transition-colors">Telegram</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">YouTube</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-400">
              {config.footerText}
            </p>
            <div className="flex items-center gap-6">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                Feito com <span className="text-red-500">❤</span> para economizar
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
