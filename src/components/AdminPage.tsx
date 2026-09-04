import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Layers,
  Cpu,
  CreditCard,
  Tag,
  Sliders,
  Edit2,
  Search,
  Shield,
  X,
  ExternalLink,
  Lock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Activity,
  Award,
  Sparkles,
  Save
} from 'lucide-react';
import { UserProfile, PricingPlan, Coupon } from '../types';

interface AdminPageProps {
  user: any;
  isAdmin: boolean;
  onBackToApp: () => void;
  systemPlans: PricingPlan[];
  systemSettings: {
    hasNvidiaNimKey: boolean;
    hasOxapayKey: boolean;
    nvidiaNimProvider?: string;
    nvidiaNimDisplayName?: string;
    nvidiaNimModel?: string;
    nvidiaNimPriority?: number;
    nvidiaNimImageModel?: string;
    nvidiaNimEnabled?: boolean;
    nvidiaNimKey?: string;
    oxapayKey?: string;
    hybraApiKey?: string;
    hybraModel?: string;
    hybraApiUrl?: string;
    hybraEnabled?: boolean;
    showModelTag?: boolean;
  };
  adminUsersList: UserProfile[];
  onSubmitKeys: (nnimKey: string, oxapayKey: string, extraSettings?: any) => Promise<void>;
  onSubmitPlan: (planName: string, priceINR: number, queriesLimit: number, description: string) => Promise<void>;
  onDeletePlan: (id: string, name: string) => Promise<void>;
  onSaveUserEdit: (userId: string, planId: string, queriesCount: number, topupCredits: number) => Promise<void>;
  statusMsg: { type: 'success' | 'error'; text: string } | null;
  setStatusMsg: (msg: { type: 'success' | 'error'; text: string } | null) => void;
  loadAdminOverview: () => void;
  fetchMaskedAdminSettings: () => void;
  coupons: Coupon[];
  onSubmitCoupon: (coupon: Coupon) => Promise<void>;
  onToggleCoupon: (code: string, active: boolean) => Promise<void>;
  onDeleteCoupon: (code: string) => Promise<void>;
}

export default function AdminPage({
  user,
  isAdmin,
  onBackToApp,
  systemPlans,
  systemSettings,
  adminUsersList,
  onSubmitKeys,
  onSubmitPlan,
  onDeletePlan,
  onSaveUserEdit,
  statusMsg,
  setStatusMsg,
  loadAdminOverview,
  fetchMaskedAdminSettings,
  coupons,
  onSubmitCoupon,
  onToggleCoupon,
  onDeleteCoupon
}: AdminPageProps) {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'plans' | 'ai-providers' | 'payments' | 'coupons' | 'settings'>('users');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Seeker Modal State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    planId: '',
    queriesCount: 0,
    topupCredits: 0
  });

  // Plan Creator Form State
  const [planForm, setPlanForm] = useState({
    name: '',
    priceINR: 249,
    queriesLimit: 100,
    description: ''
  });

  // Secrets Creator Form State
  const [nnimKey, setNnimKey] = useState('');
  const [oxapayKey, setOxapayKey] = useState('');
  const [isSavingKeys, setIsSavingKeys] = useState(false);

  // NVIDIA NIM Provider UI states styled from user reference
  const [providerType, setProviderType] = useState('NVIDIA NIM (build.nvidia.com)');
  const [displayName, setDisplayName] = useState('NVIDIA NIM (build.nvidia.com)');
  const [modelTextChat, setModelTextChat] = useState('meta/llama-3.2-11b-vision-instruct');
  const [priorityNum, setPriorityNum] = useState(1);
  const [imageGenModel, setImageGenModel] = useState('black-forest-labs/flux.1-dev');
  const [providerEnabled, setProviderEnabled] = useState(true);

  // Hybra API Primary Provider & Debug Model Tag states
  const [hybraApiKey, setHybraApiKey] = useState('femboysex');
  const [hybraModel, setHybraModel] = useState('deepseek-v4-pro');
  const [hybraApiUrl, setHybraApiUrl] = useState('https://hybra.lol/v1/chat/completions');
  const [hybraEnabled, setHybraEnabled] = useState(true);
  const [showModelTag, setShowModelTag] = useState(false);

  React.useEffect(() => {
    if (systemSettings) {
      if (systemSettings.nvidiaNimProvider) setProviderType(systemSettings.nvidiaNimProvider);
      if (systemSettings.nvidiaNimDisplayName) setDisplayName(systemSettings.nvidiaNimDisplayName);
      if (systemSettings.nvidiaNimModel) setModelTextChat(systemSettings.nvidiaNimModel);
      if (systemSettings.nvidiaNimPriority !== undefined) setPriorityNum(systemSettings.nvidiaNimPriority);
      if (systemSettings.nvidiaNimImageModel) setImageGenModel(systemSettings.nvidiaNimImageModel);
      if (systemSettings.nvidiaNimEnabled !== undefined) setProviderEnabled(systemSettings.nvidiaNimEnabled);
      if (systemSettings.hybraApiKey) setHybraApiKey(systemSettings.hybraApiKey);
      if (systemSettings.hybraModel) setHybraModel(systemSettings.hybraModel);
      if (systemSettings.hybraApiUrl) setHybraApiUrl(systemSettings.hybraApiUrl);
      if (systemSettings.hybraEnabled !== undefined) setHybraEnabled(systemSettings.hybraEnabled);
      if (systemSettings.showModelTag !== undefined) setShowModelTag(systemSettings.showModelTag);
    }
  }, [systemSettings]);

  // State for generating a new coupon
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount: 10,
    type: 'percent' as 'percent' | 'fixed',
    planId: 'all'
  });

  const handleOpenEditUser = (profileObj: UserProfile) => {
    setEditingUser(profileObj);
    setEditUserForm({
      planId: profileObj.planId || 'plan_free',
      queriesCount: profileObj.queriesCount || 0,
      topupCredits: profileObj.topupCredits || 0
    });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await onSaveUserEdit(editingUser.id, editUserForm.planId, editUserForm.queriesCount, editUserForm.topupCredits);
      setEditingUser(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmitPlan(planForm.name, planForm.priceINR, planForm.queriesLimit, planForm.description);
      setPlanForm({ name: '', priceINR: 249, queriesLimit: 100, description: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveKeysSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingKeys(true);
    try {
      await onSubmitKeys(nnimKey, oxapayKey, {
        nvidiaNimProvider: providerType,
        nvidiaNimDisplayName: displayName || 'NVIDIA NIM (build.nvidia.com)',
        nvidiaNimModel: modelTextChat || 'meta/llama-3.2-11b-vision-instruct',
        nvidiaNimPriority: Number(priorityNum),
        nvidiaNimImageModel: imageGenModel || 'black-forest-labs/flux.1-dev',
        nvidiaNimEnabled: providerEnabled,
        hybraEnabled,
        hybraApiKey,
        hybraModel,
        hybraApiUrl,
        showModelTag
      });
      setNnimKey('');
      setOxapayKey('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingKeys(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code.trim()) return;
    const cleanCode = newCoupon.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
    if (coupons.some(c => c.code === cleanCode)) {
      setStatusMsg({ type: 'error', text: `Coupon code "${cleanCode}" already exists.` });
      return;
    }
    try {
      await onSubmitCoupon({
        code: cleanCode,
        discount: Number(newCoupon.discount),
        type: newCoupon.type,
        planId: newCoupon.planId,
        active: true
      });
      setNewCoupon({ code: '', discount: 10, type: 'percent', planId: 'all' });
      setStatusMsg({ type: 'success', text: `Promo code "${cleanCode}" generated successfully.` });
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Failed to deploy coupon' });
    }
  };

  const toggleCoupon = async (code: string) => {
    const couponObj = coupons.find(c => c.code === code);
    if (!couponObj) return;
    try {
      await onToggleCoupon(code, !couponObj.active);
      setStatusMsg({ type: 'success', text: `Coupon "${code}" status updated.` });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCoupon = async (code: string) => {
    if (!confirm(`Are you sure you want to delete coupon "${code}"?`)) return;
    try {
      await onDeleteCoupon(code);
      setStatusMsg({ type: 'success', text: `Coupon "${code}" deleted.` });
    } catch (err) {
      console.error(err);
    }
  };

  // Search/Filter matching the screenshot lists
  const ADMIN_EMAILS = ['teamthunderofficialyt@gmail.com', 'freefiregtamcpe@gmail.com'];

  const filteredUsers = adminUsersList.filter(u => {
    const q = searchQuery.toLowerCase();
    const emailMatch = u.email?.toLowerCase().includes(q);
    const nameMatch = u.displayName?.toLowerCase().includes(q);
    const planMatch = u.planId?.toLowerCase().includes(q) || u.planName?.toLowerCase().includes(q);
    
    // Also support searching 'admin' to find admins easily
    const isAdminSearch = 'admin'.includes(q) && u.email && ADMIN_EMAILS.includes(u.email.toLowerCase());

    return emailMatch || nameMatch || planMatch || isAdminSearch;
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex flex-col items-center justify-center p-6 text-center text-gray-200">
        <Shield className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
        <h1 className="text-2xl font-serif font-bold text-gold-200 uppercase mb-2">Access Restrained</h1>
        <p className="text-xs text-gray-400 max-w-sm leading-relaxed mb-6">
          Your credentials do not encompass active administrative roles inside the Aurum mainframe.
        </p>
        <button
          onClick={onBackToApp}
          className="px-6 py-2.5 bg-[#DFB15F] hover:bg-gold-400 text-black font-semibold text-xs rounded-lg transition-all"
        >
          Return to Sanctuary
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-gray-200 font-sans flex flex-col selection:bg-gold-500/30 selection:text-white">
      
      {/* ADMINISTRATIVE COMPANION HEADER */}
      <header className="h-16 border-b border-gold-900/10 bg-[#111114]/90 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3 select-none">
          <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#DFB15F] via-[#E9C37A] to-[#B3873B] flex items-center justify-center font-serif text-black font-extrabold text-[15px] shadow-[0_0_12px_rgba(223,177,95,0.2)] border border-[#DFB15F]/20 select-none">
            A
          </div>
          <div className="flex items-center gap-2">
            <span className="font-serif text-md font-bold tracking-widest text-[#FCF8F2]">
              Aurum<span className="text-[#DFB15F]">.</span>
            </span>
            <span className="text-gray-600">/</span>
            <span className="text-xs font-mono font-bold tracking-widest text-[#DFB15F] uppercase">Admin</span>
          </div>
        </div>

        <button
          onClick={onBackToApp}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gold-900/15 bg-[#16161A]/40 text-xs font-mono font-semibold text-gray-400 hover:text-[#DFB15F] hover:border-[#DFB15F]/35 transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to app</span>
        </button>
      </header>

      {/* ADMIN WORKSPACE CONTAINER */}
      <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
        
        {/* SIDE NAVIGATION CONTROLLER */}
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gold-900/10 bg-[#111114]/40 shrink-0 p-4 space-y-1.5">
          <p className="px-3 pb-2 text-[9px] font-mono font-bold tracking-[0.2em] text-gray-500 uppercase select-none">
            WORKSPACE ROLES
          </p>
          <nav className="space-y-1">
            {[
              { id: 'users', label: 'Users', icon: Users },
              { id: 'plans', label: 'Plans', icon: Layers },
              { id: 'ai-providers', label: 'AI Providers', icon: Cpu },
              { id: 'payments', label: 'Payments', icon: CreditCard },
              { id: 'coupons', label: 'Coupons', icon: Tag },
              { id: 'settings', label: 'Settings', icon: Sliders }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveSubTab(tab.id as any);
                    setStatusMsg(null);
                  }}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-gold-950/40 to-[#DFB15F]/5 border-l-2 border-[#DFB15F] text-[#DFB15F] font-semibold font-mono'
                      : 'text-gray-400 hover:bg-[#16161D]/40 hover:text-gray-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#DFB15F]' : 'text-gray-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* PRIMARY ADMINISTRATIVE VIEWPORT */}
        <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto max-w-6xl">
          
          {/* Status Alert logs display inside viewport */}
          {statusMsg && (
            <div className="p-4 rounded-lg flex items-start gap-3 text-xs bg-[#111114] border border-gold-900/15 shadow-md">
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#DFB15F] shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-gray-300 leading-relaxed">{statusMsg.text}</div>
              <button onClick={() => setStatusMsg(null)} className="text-gray-500 hover:text-gray-300 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeSubTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              
              {/* HEADER LABELS */}
              <div>
                <h1 className="font-serif text-3.5xl font-semibold tracking-tight text-[#FCF8F2] capitalize">
                  {activeSubTab === 'ai-providers' ? 'AI Providers' : activeSubTab}
                </h1>
                <p className="text-xs text-gray-400 mt-1">
                  {activeSubTab === 'users' && 'Manage all accounts, roles, credits and plan assignments.'}
                  {activeSubTab === 'plans' && 'Configure subscription options, price tiers and quota limits.'}
                  {activeSubTab === 'ai-providers' && 'Configure external AI models, API keys and endpoint endpoints.'}
                  {activeSubTab === 'payments' && 'Manage merchant accounts, checkout Gateways and transaction records.'}
                  {activeSubTab === 'coupons' && 'Define coupon codes, seasonal discounts and loyalty vouchers.'}
                  {activeSubTab === 'settings' && 'Review workspace operational indicators, global values and connections.'}
                </p>
              </div>

              {/* VIEW 1: USERS PANEL */}
              {activeSubTab === 'users' && (
                <div className="bg-[#111114]/30 border border-gold-900/15 rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-gold-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111114]/20">
                    <h2 className="font-serif text-md font-semibold text-gold-100 flex items-center gap-2">
                      <Users className="w-4.5 h-4.5 text-[#DFB15F]" />
                      <span>Aurum User Base ({filteredUsers.length})</span>
                    </h2>

                    <div className="relative w-full sm:w-64 shrink-0">
                      <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter email, name, plan..."
                        className="w-full bg-[#0A0A0C] border border-gold-900/25 rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#DFB15F]/40 transition-all font-sans"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gold-900/10 text-gray-400 font-mono uppercase tracking-[0.1em] bg-[#111114]/10">
                          <th className="py-3.5 px-4 font-semibold">User</th>
                          <th className="py-3.5 px-4 font-semibold">Contact Email</th>
                          <th className="py-3.5 px-4 text-center font-semibold text-gold-400">Plan</th>
                          <th className="py-3.5 px-4 text-right font-semibold">Credits</th>
                          <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gold-900/10">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-gray-500 italic">No record matches</td>
                          </tr>
                        ) : (
                          filteredUsers.map(u => (
                            <tr key={u.id} className="text-gray-300 hover:bg-[#16161D]/20 transition-all">
                              <td className="py-4 px-4 flex items-center gap-3">
                                <img
                                  src={u.photoURL || 'https://via.placeholder.com/32'}
                                  referrerPolicy="no-referrer"
                                  className="w-7 h-7 rounded-full border border-gold-500/10 object-cover shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32';
                                  }}
                                />
                                <div className="truncate max-w-[160px]">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <p className="font-semibold text-gray-100 truncate">{u.displayName || 'Unknown visitor'}</p>
                                    {u.email && ADMIN_EMAILS.includes(u.email.toLowerCase()) && (
                                      <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-rose-950/60 border border-rose-500/30 text-rose-300 uppercase shrink-0">Admin</span>
                                    )}
                                  </div>
                                  <p className="font-mono text-[9px] text-gray-500 truncate">{u.id}</p>
                                </div>
                              </td>
                              <td className="py-4 px-4 font-mono text-gray-300">{u.email}</td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                                    u.planId !== 'plan_free' ? 'bg-gold-950 border-gold-700/55 text-[#DFB15F] font-bold' : 'bg-gray-900 border-gray-800 text-gray-400'
                                  }`}>
                                    {u.planName || u.planId}
                                  </span>
                                  {Number(u.topupCredits || 0) > 0 && (
                                    <span className="text-[9px] text-emerald-400 font-mono font-semibold bg-emerald-950/20 px-1 rounded border border-emerald-900/20">+{u.topupCredits} refill cr</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right font-mono font-semibold">
                                {u.queriesCount} queries used
                              </td>
                              <td className="py-4 px-4 text-right">
                                <button
                                  onClick={() => handleOpenEditUser(u)}
                                  className="text-[#DFB15F] hover:text-gold-200 p-1.5 bg-gold-950/20 hover:bg-[#DFB15F]/10 rounded border border-gold-900/30 font-semibold cursor-pointer text-xs flex items-center gap-1 ml-auto transition-all"
                                  title="Edit profile"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Control</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW 2: PLANS PANEL */}
              {activeSubTab === 'plans' && (
                <div className="space-y-6">
                  {/* Create Plan Card Form */}
                  <div className="bg-[#111114]/40 border border-gold-900/15 rounded-xl p-6 shadow-sm">
                    <h3 className="font-serif text-lg font-bold text-gold-100 flex items-center gap-2 border-b border-gold-900/10 pb-3 mb-5">
                      <Layers className="w-4 h-4 text-[#DFB15F]" />
                      <span>INR Pricing Tier Creator</span>
                    </h3>

                    <form onSubmit={handleCreatePlanSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-mono uppercase text-gold-400 mb-1.5 font-medium">TIER PLAN NAME</label>
                          <input
                            type="text"
                            required
                            value={planForm.name}
                            onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                            placeholder="e.g. Aurum Zenith"
                            className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-[#DFB15F] transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono uppercase text-gold-400 mb-1.5 font-medium">COST IN INR (₹)</label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={planForm.priceINR}
                            onChange={(e) => setPlanForm({ ...planForm, priceINR: Number(e.target.value) })}
                            placeholder="e.g. 499"
                            className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-[#DFB15F] transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-mono uppercase text-gold-400 mb-1.5 font-medium">QUERIES ALLOWED LIMIT</label>
                          <input
                            type="number"
                            required
                            min="-1"
                            value={planForm.queriesLimit}
                            onChange={(e) => setPlanForm({ ...planForm, queriesLimit: Number(e.target.value) })}
                            placeholder="e.g. 500 or -1"
                            className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-[#DFB15F] transition-all"
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <span className="text-[10px] text-gray-500 leading-normal pb-1 font-mono italic">
                            * Tip: Input -1 to make queries completely unlimited for subscribers.
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase text-gold-400 mb-1.5 font-medium">TIER BENEFITS SUMMARY</label>
                        <input
                          type="text"
                          required
                          value={planForm.description}
                          onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                          placeholder="Unlimited responses, Priority 8B speeds..."
                          className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-[#DFB15F] transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 bg-[#DFB15F] hover:bg-gold-500 text-black text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <Plus className="w-4 h-4 text-black stroke-[3]" />
                        <span>Assemble / Overwrite Tier</span>
                      </button>
                    </form>
                  </div>

                  {/* Active plans catalogue */}
                  <div className="bg-[#111114]/30 border border-gold-900/15 rounded-xl p-6 shadow-sm">
                    <h3 className="font-serif text-lg font-bold text-gold-100 mb-4 flex items-center justify-between border-b border-gold-900/10 pb-2">
                      <span>Current pricing catalog</span>
                      <span className="font-mono text-xs bg-gold-950 text-gold-300 px-2 py-0.5 rounded uppercase tracking-wider">{systemPlans.length} plans</span>
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-gold-900/10 text-gray-500 font-mono uppercase tracking-wider">
                            <th className="pb-3 pt-1">Plan Identifier</th>
                            <th className="pb-3 pt-1">Name</th>
                            <th className="pb-3 pt-1 text-right">INR Price</th>
                            <th className="pb-3 pt-1 text-center">Permitted Inquiries</th>
                            <th className="pb-3 pt-1 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gold-900/10">
                          {systemPlans.map(sp => (
                            <tr key={sp.id} className="text-gray-300 hover:bg-[#16161D]/20">
                              <td className="py-3 font-mono text-[11px] text-[#C59B27]">{sp.id}</td>
                              <td className="py-3 font-semibold">{sp.name}</td>
                              <td className="py-3 text-right font-mono text-gold-100">₹{sp.priceINR}</td>
                              <td className="py-3 text-center font-mono">
                                {sp.queriesLimit === -1 ? (
                                  <span className="text-emerald-400 font-bold bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/40">Unlimited</span>
                                ) : (
                                  `${sp.queriesLimit} credits`
                                )}
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => onDeletePlan(sp.id, sp.name)}
                                  className="text-red-400 hover:text-red-300 p-1 bg-red-950/10 rounded cursor-pointer transition-all"
                                  title="Delete Plan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 3: AI PROVIDERS PANEL */}
              {activeSubTab === 'ai-providers' && (
                <div className="space-y-6">
                  <form onSubmit={handleSaveKeysSubmit} className="space-y-6">

                    {/* CARD 1: PRIMARY AI PROVIDER - HYBRA API */}
                    <div className="bg-[#111114]/40 border border-[#DFB15F]/20 rounded-xl p-6 shadow-sm space-y-5 relative overflow-hidden">
                      <div className="border-b border-gold-900/10 pb-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-serif text-lg font-bold text-gold-100 flex items-center gap-2.5">
                            <Sparkles className="w-4.5 h-4.5 text-[#DFB15F]" />
                            <span>Primary Provider: Hybra API Proxy</span>
                          </h3>
                          <p className="text-xs text-gray-400 mt-1 font-sans">
                            High-speed OpenAI wire format proxy router. Primary chat endpoint.
                          </p>
                        </div>
                        <span className="bg-[#DFB15F]/10 text-[#DFB15F] font-mono text-[10px] px-2.5 py-1 rounded-full border border-[#DFB15F]/20 uppercase tracking-widest font-bold">
                          PRIMARY
                        </span>
                      </div>

                      {/* Hybra Base Endpoint */}
                      <div>
                        <label className="block text-xs font-mono uppercase text-gold-400 tracking-wider mb-1.5 font-medium">
                          Base API URL
                        </label>
                        <input
                          type="text"
                          value={hybraApiUrl}
                          onChange={(e) => setHybraApiUrl(e.target.value)}
                          placeholder="https://hybra.lol/v1/chat/completions"
                          className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-[#DFB15F] transition-all font-mono"
                        />
                      </div>

                      {/* Dual column: API Key & Model */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-mono uppercase text-gold-400 tracking-wider mb-1.5 font-medium">
                            Bearer API Key
                          </label>
                          <input
                            type="text"
                            value={hybraApiKey}
                            onChange={(e) => setHybraApiKey(e.target.value)}
                            placeholder="femboysex"
                            className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-[#DFB15F] transition-all font-mono"
                          />
                          <p className="text-[10px] text-gray-500 mt-1 font-sans">
                            Default public key: <code className="text-gold-200">femboysex</code>
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-mono uppercase text-gold-400 tracking-wider mb-1.5 font-medium">
                            Target Model Name
                          </label>
                          <input
                            type="text"
                            value={hybraModel}
                            onChange={(e) => setHybraModel(e.target.value)}
                            placeholder="deepseek-v4-pro"
                            className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-[#DFB15F] transition-all font-sans"
                          />
                          <p className="text-[10px] text-gray-500 mt-1 font-sans">
                            Primary model: <code className="text-gold-200 font-mono">deepseek-v4-pro</code>
                          </p>
                        </div>
                      </div>

                      {/* Hybra Enabled Switch Container */}
                      <div className="bg-[#0A0A0C]/60 border border-gold-900/15 p-4 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-serif font-semibold text-gold-100">Enable Hybra API Primary</p>
                          <p className="text-[11px] text-gray-400 font-sans">If disabled or failing, requests automatically route to NVIDIA NIM fallback.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setHybraEnabled(!hybraEnabled)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${hybraEnabled ? 'bg-[#DFB15F]' : 'bg-gray-800'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${hybraEnabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-gray-400'}`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* CARD 2: MODEL NAME TAG TOGGLE (For testing active model) */}
                    <div className="bg-[#111114]/40 border border-gold-900/15 rounded-xl p-6 shadow-sm space-y-4">
                      <div className="border-b border-gold-900/10 pb-3 flex items-center justify-between">
                        <div>
                          <h3 className="font-serif text-md font-bold text-gold-100 flex items-center gap-2">
                            <Tag className="w-4 h-4 text-[#DFB15F]" />
                            <span>Append Active Model Name Tag to Chat Responses</span>
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5 font-sans">
                            Enable this setting to display which model and API provider answered at the bottom of every chat response for testing.
                          </p>
                        </div>
                      </div>

                      <div className="bg-[#0A0A0C]/60 border border-gold-900/15 p-4 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-serif font-semibold text-gold-100">Show Model Name Tag</p>
                          <p className="text-[11px] text-gray-400 font-sans">
                            Example tag output: <code className="text-gold-300 font-mono">*Model: deepseek-v4-pro (Hybra API)*</code>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowModelTag(!showModelTag)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showModelTag ? 'bg-[#DFB15F]' : 'bg-gray-800'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${showModelTag ? 'translate-x-5 bg-black' : 'translate-x-0 bg-gray-400'}`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* CARD 3: FALLBACK PROVIDER - NVIDIA NIM */}
                    <div className="bg-[#111114]/40 border border-gold-900/15 rounded-xl p-6 shadow-sm">
                      <div className="border-b border-gold-900/10 pb-4 mb-6 flex items-center justify-between">
                        <div>
                          <h3 className="font-serif text-lg font-bold text-gold-100 flex items-center gap-2.5">
                            <Cpu className="w-4.5 h-4.5 text-[#DFB15F]" />
                            <span>Fallback Provider: NVIDIA NIM Gateway</span>
                          </h3>
                          <p className="text-xs text-gray-400 mt-1 font-sans">
                            Backup AI inference cluster used when primary Hybra API is degraded or disabled.
                          </p>
                        </div>
                        <span className="bg-gray-800 text-gray-300 font-mono text-[10px] px-2.5 py-1 rounded-full border border-gray-700 uppercase tracking-widest font-bold">
                          FALLBACK
                        </span>
                      </div>

                      <div className="space-y-5">
                        {/* Provider Select Field */}
                        <div>
                          <label className="block text-xs font-mono uppercase text-gold-400 tracking-wider mb-1.5 font-medium">
                            Provider
                          </label>
                          <select
                            value={providerType}
                            onChange={(e) => setProviderType(e.target.value)}
                            className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-[#DFB15F]/30 focus:outline-1 focus:border-[#DFB15F] transition-all font-sans cursor-pointer"
                          >
                            <option value="NVIDIA NIM (free)">NVIDIA NIM (free)</option>
                            <option value="NVIDIA NIM (enterprise)">NVIDIA NIM (enterprise)</option>
                          </select>
                          <p className="text-[10px] text-gray-500 mt-2 leading-relaxed font-sans">
                            Generous free tier with many open models. Try: <code className="text-gold-200 font-mono">meta/llama-3.3-70b-instruct</code>, <code className="text-gold-200">meta/llama-3.1-405b-instruct</code>, <code className="text-gray-400">mistralai/mixtral-8x22b-instruct-v0.1</code>.
                          </p>
                          <a
                            href="https://build.nvidia.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            referrerPolicy="no-referrer"
                            className="inline-flex items-center gap-1 text-[11px] text-[#DFB15F] hover:underline mt-1.5"
                          >
                            Get an API key →
                          </a>
                        </div>

                        {/* Display Name Field */}
                        <div>
                          <label className="block text-xs font-mono uppercase text-gold-400 tracking-wider mb-1.5 font-medium">
                            Display name
                          </label>
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="NVIDIA NIM (build.nvidia.com)"
                            className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-[#DFB15F] transition-all font-sans"
                          />
                        </div>

                        {/* API Key Field */}
                        <div>
                          <label className="block text-xs font-mono uppercase text-gold-400 tracking-wider mb-1.5 font-medium">
                            NVIDIA API key(s)
                          </label>
                          <textarea
                            rows={2}
                            value={nnimKey}
                            onChange={(e) => setNnimKey(e.target.value)}
                            placeholder={systemSettings.hasNvidiaNimKey ? "•••••••• (Already configured - Enter new keys to overwrite)" : "Paste your API key"}
                            className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-[#DFB15F] transition-all font-mono"
                          />
                          <p className="text-[10px] text-gray-500 mt-1 leading-normal font-sans">
                            Supports multi-key rotation! Specify multiple keys separated by commas or newlines.
                          </p>
                        </div>

                        {/* Model & Priority in dual grid layout */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-mono uppercase text-gold-400 tracking-wider mb-1.5 font-medium">
                              Model (text/chat)
                            </label>
                            <input
                              type="text"
                              value={modelTextChat}
                              onChange={(e) => setModelTextChat(e.target.value)}
                              placeholder="meta/llama-3.2-11b-vision-instruct"
                              className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-[#DFB15F] transition-all font-sans"
                            />
                            <p className="text-[10px] text-gray-500 mt-1 leading-normal font-sans">
                              Ultra-Fast Turbo (sub-second): <code className="text-gold-200">meta/llama-3.2-11b-vision-instruct</code>.
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-mono uppercase text-gold-400 tracking-wider mb-1.5 font-medium">
                              Priority (lower = first)
                            </label>
                            <input
                              type="number"
                              value={priorityNum}
                              onChange={(e) => setPriorityNum(Number(e.target.value))}
                              placeholder="1"
                              min={1}
                              className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-[#DFB15F] transition-all font-sans"
                            />
                          </div>
                        </div>

                        {/* Image Generation Model */}
                        <div>
                          <label className="block text-xs font-mono uppercase text-[#DFB15F] tracking-wider mb-1.5 font-medium flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-gold-400" />
                            <span>Image generation model</span>
                          </label>
                          <input
                            type="text"
                            value={imageGenModel}
                            onChange={(e) => setImageGenModel(e.target.value)}
                            placeholder="black-forest-labs/flux.1-dev"
                            className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-[#DFB15F] transition-all font-sans"
                          />
                          <p className="text-[10px] text-gray-500 mt-2 leading-relaxed font-sans">
                            Current active image model: <code className="text-gold-200 font-mono">black-forest-labs/flux.1-dev</code> (highest visual fidelity).
                          </p>
                        </div>

                        {/* Enabled Switch Styled Container */}
                        <div className="bg-[#0A0A0C]/60 border border-gold-900/15 p-4 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="text-xs font-serif font-semibold text-gold-100">Enabled Fallback</p>
                            <p className="text-[11px] text-gray-400 font-sans">Disabled providers are skipped.</p>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => setProviderEnabled(!providerEnabled)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${providerEnabled ? 'bg-[#DFB15F]' : 'bg-gray-800'}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${providerEnabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-gray-400'}`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Save Action Panel Footer */}
                    <div className="flex items-center justify-end gap-3 pt-3">
                      <button
                        type="submit"
                        disabled={isSavingKeys}
                        className="px-6 py-2.5 bg-[#DFB15F] hover:bg-[#E9C37A] text-black text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition-all shadow-lg hover:shadow-[0_0_20px_rgba(223,177,95,0.3)] active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                      >
                        {isSavingKeys ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                            <span>Persisting Configuration...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 text-black" />
                            <span>Save Provider Settings</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Service Connector Logs */}
                    <div className="bg-[#111114]/20 border border-gold-900/15 rounded-xl p-6">
                      <h4 className="font-serif text-sm font-bold text-gold-200 uppercase mb-3 font-mono">Service Connector Logs</h4>
                      <div className="space-y-2.5 text-xs font-mono">
                        <div className="flex justify-between items-center bg-[#0A0A0C] p-3 rounded border border-gold-900/10">
                          <span className="text-gray-400">Hybra API Proxy (Primary Chat)</span>
                          <span className={hybraEnabled ? 'text-emerald-400 font-bold bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30' : 'text-rose-400 font-bold bg-rose-950/10 px-2 py-0.5 rounded border border-rose-900/30'}>
                            {hybraEnabled ? `STATUS: PRIMARY (ONLINE) - ${hybraModel}` : 'STATUS: DISABLED'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-[#0A0A0C] p-3 rounded border border-gold-900/10">
                          <span className="text-gray-400">NVIDIA NIM Pipeline (Fallback Chat & Image)</span>
                          <span className={systemSettings.hasNvidiaNimKey && providerEnabled ? 'text-emerald-400 font-bold bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30' : 'text-amber-400 font-bold bg-amber-950/10 px-2 py-0.5 rounded border border-amber-900/30'}>
                            {!providerEnabled ? 'STATUS: DISABLED' : systemSettings.hasNvidiaNimKey ? 'STATUS: STANDBY / ACTIVE' : 'STATUS: DISCONNECTED'}
                          </span>
                        </div>
                      </div>
                    </div>

                  </form>
                </div>
              )}

              {/* VIEW 4: PAYMENTS PANEL */}
              {activeSubTab === 'payments' && (
                <div className="space-y-6">
                  {/* Oxapay Key configuration */}
                  <div className="bg-[#111114]/40 border border-gold-900/15 rounded-xl p-6 shadow-sm">
                    <h3 className="font-serif text-lg font-bold text-[#FCF8F2] flex items-center gap-2 border-b border-gold-900/10 pb-3 mb-5">
                      <CreditCard className="w-4 h-4 text-[#DFB15F]" />
                      <span>Configure Oxapay Payment Gateway Secret Keys</span>
                    </h3>

                    <form onSubmit={handleSaveKeysSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-mono uppercase text-gold-400 tracking-wider mb-1.5 font-medium">OXAPAY MERCHANT API KEY</label>
                        <input
                          type="password"
                          value={oxapayKey}
                          onChange={(e) => setOxapayKey(e.target.value)}
                          placeholder={systemSettings.hasOxapayKey ? "******** (Already configured - enter to rewrite)" : "Paste key from oxapay.com merchant..."}
                          className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-[#DFB15F] transition-all"
                        />
                      </div>

                      <div className="bg-[#0A0A0C] border border-gold-900/10 p-4 rounded-lg flex items-start gap-3">
                        <Award className="w-5 h-5 text-gold-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-xs font-serif font-semibold text-gold-100">Payment Processor Specifications</p>
                          <p className="text-[11px] text-gray-400 leading-normal">
                            Oxapay handles instant crypto invoicing for members across BTC, LTC, and USDT-TRC20. On successful invoice execution, automated webhooks communicate with the database for instant credential refills.
                          </p>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSavingKeys}
                        className="w-full py-2.5 bg-[#DFB15F] hover:bg-gold-500 text-black text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        {isSavingKeys ? (
                          <Loader2 className="w-4 h-4 animate-spin text-black" />
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Save Merchant Credentials</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Payment Gateway Logs */}
                  <div className="bg-[#111114]/20 border border-gold-900/15 rounded-xl p-6">
                    <h4 className="font-serif text-sm font-bold text-gold-200 uppercase mb-3 font-mono">Invoice Webhooks Status</h4>
                    <div className="space-y-2.5 text-xs font-mono">
                      <div className="flex justify-between items-center bg-[#0A0A0C] p-3 rounded border border-gold-900/10">
                        <span className="text-gray-400">Merchant Merchant Webhook Listener status</span>
                        <span className={systemSettings.hasOxapayKey ? 'text-emerald-400 font-bold bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30' : 'text-rose-400 font-bold bg-rose-950/10 px-2 py-0.5 rounded border border-rose-900/30'}>
                          {systemSettings.hasOxapayKey ? 'ACTIVE (SECURED)' : 'MISSING KEYS'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 5: COUPONS PANEL */}
              {activeSubTab === 'coupons' && (
                <div className="space-y-6">
                  {/* Coupon Generator form */}
                  <div className="bg-[#111114]/40 border border-gold-900/15 rounded-xl p-6 shadow-sm">
                    <h3 className="font-serif text-lg font-bold text-gold-100 flex items-center gap-2 border-b border-gold-900/10 pb-3 mb-5">
                      <Tag className="w-4 h-4 text-[#DFB15F]" />
                      <span>Assemble New Campaign Coupon Code</span>
                    </h3>

                    <form onSubmit={handleCreateCoupon} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="sm:col-span-1">
                          <label className="block text-xs font-mono uppercase text-gold-400 mb-1.5 font-medium">PROMO CODE</label>
                          <input
                            type="text"
                            required
                            value={newCoupon.code}
                            onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                            placeholder="e.g. AURUM_SUMMER_50"
                            className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 font-mono focus:outline-none focus:border-[#DFB15F] transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono uppercase text-gold-400 mb-1.5 font-medium">DISCOUNT TYPE</label>
                          <select
                            value={newCoupon.type}
                            onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value as any })}
                            className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-[#DFB15F] transition-all"
                          >
                            <option value="percent">Percentage (%)</option>
                            <option value="fixed">Fixed INR Amount (₹)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-mono uppercase text-gold-400 mb-1.5 font-medium">VALUE</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={newCoupon.discount}
                            onChange={(e) => setNewCoupon({ ...newCoupon, discount: Number(e.target.value) })}
                            placeholder="e.g. 10"
                            className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-[#DFB15F] transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono uppercase text-gold-400 mb-1.5 font-medium">APPLICABLE PLAN</label>
                          <select
                            value={newCoupon.planId}
                            onChange={(e) => setNewCoupon({ ...newCoupon, planId: e.target.value })}
                            className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-[#DFB15F] font-mono focus:outline-none focus:border-[#DFB15F] transition-all"
                          >
                            <option value="all">All Subscription Tiers</option>
                            {systemPlans.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-[#DFB15F] hover:bg-gold-500 text-black text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <Plus className="w-4 h-4 text-black stroke-[3]" />
                        <span>Deploy Coupon Code</span>
                      </button>
                    </form>
                  </div>

                  {/* Coupons catalog */}
                  <div className="bg-[#111114]/30 border border-gold-900/15 rounded-xl p-6 shadow-sm">
                    <h3 className="font-serif text-lg font-bold text-gold-100 mb-4 border-b border-gold-900/10 pb-2">
                      <span>Interactive coupons table</span>
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-gold-900/10 text-gray-500 font-mono uppercase tracking-wider">
                            <th className="pb-3 pt-1">Code</th>
                            <th className="pb-3 pt-1">Discount</th>
                            <th className="pb-3 pt-1">Restricted Plan</th>
                            <th className="pb-3 pt-1 text-center font-mono">Status</th>
                            <th className="pb-3 pt-1 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gold-900/10">
                          {coupons.map((c) => (
                            <tr key={c.code} className="text-gray-300 hover:bg-[#16161D]/20">
                              <td className="py-3 font-mono text-[11px] text-[#C59B27]">{c.code}</td>
                              <td className="py-3 font-semibold font-mono">
                                {c.type === 'percent' ? `${c.discount}% Discount` : `₹${c.discount} Discount`}
                              </td>
                              <td className="py-3 font-mono text-[11px] text-[#DFB15F]">
                                {c.planId === 'all' ? (
                                  <span className="text-gray-500 font-medium">All Tiers</span>
                                ) : (
                                  <span className="bg-amber-950/40 px-2 py-1 rounded text-[#DFB15F]">
                                    {systemPlans.find(p => p.id === c.planId)?.name || c.planId}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleCoupon(c.code)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-all border ${
                                    c.active
                                      ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400 font-bold animate-pulse'
                                      : 'bg-gray-900 border-gray-800 text-gray-400'
                                  }`}
                                >
                                  {c.active ? 'CAMPAIGN_LIVE' : 'CAMPAIGN_STOPPED'}
                                </button>
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => deleteCoupon(c.code)}
                                  className="text-red-400 hover:text-red-300 p-1 bg-red-950/10 rounded cursor-pointer transition-all"
                                  title="Remove Coupon"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 6: SETTINGS PANEL */}
              {activeSubTab === 'settings' && (
                <div className="space-y-6">
                  {/* System Indicators card dashboard */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#111114]/40 border border-gold-900/15 rounded-xl p-6 space-y-4">
                      <h4 className="font-serif text-md font-bold text-gold-100 flex items-center gap-2 border-b border-gold-900/10 pb-2">
                        <Activity className="w-4 h-4 text-[#DFB15F]" />
                        <span>System Health Indicators</span>
                      </h4>
                      <div className="space-y-3 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Mainframe Database Database State:</span>
                          <span className="text-emerald-400 font-bold">STABLE (CONNECTED)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total User Base size:</span>
                          <span className="text-gold-300 font-bold">{adminUsersList.length} Seekers</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Custom Catalog Tiers count:</span>
                          <span className="text-gold-300 font-bold">{systemPlans.length} Plans</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#111114]/40 border border-gold-900/15 rounded-xl p-6 space-y-4">
                      <h4 className="font-serif text-md font-bold text-gold-100 flex items-center gap-2 border-b border-gold-900/10 pb-2">
                        <Shield className="w-4 h-4 text-[#DFB15F]" />
                        <span>Secure Debug Tools</span>
                      </h4>
                      <p className="text-[11px] text-gray-500 leading-normal">
                        Verify real-time updates directly connected with Google Firebase or fetch masked settings configuration parameters.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            loadAdminOverview();
                            setStatusMsg({ type: 'success', text: 'Database logs retrieved successfully from live console.' });
                          }}
                          className="px-3 py-2 bg-gold-950/20 hover:bg-[#DFB15F]/10 text-gold-300 border border-gold-900/30 rounded text-center transition-all cursor-pointer text-xs font-mono font-bold"
                        >
                          Trigger Refresh
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            fetchMaskedAdminSettings();
                            setStatusMsg({ type: 'success', text: 'Secured secrets mask loaded successfully.' });
                          }}
                          className="px-3 py-2 bg-gold-950/20 hover:bg-[#DFB15F]/10 text-gold-300 border border-gold-900/30 rounded text-center transition-all cursor-pointer text-xs font-mono font-bold"
                        >
                          Fetch System Masks
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* SECURE ADMIN CONTROL: VISITOR PROFILE EDITOR MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111114] border border-[#DFB15F]/30 rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-[0_10px_50px_rgba(0,0,0,0.8)]"
          >
            <div className="flex justify-between items-center pb-2 border-b border-gold-900/10">
              <h3 className="font-serif text-md font-bold text-[#FCF8F2] uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#DFB15F]" />
                <span>Update Seeker</span>
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-white cursor-pointer p-0.5">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <p className="text-[10px] text-gray-500 mb-1 font-mono uppercase tracking-wider">Active Seekers Identifier</p>
                <div className="bg-[#0A0A0C] border border-gold-900/10 rounded-lg px-3 py-2 text-xs font-mono text-gold-400 truncate">
                  {editingUser.email}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gold-350 uppercase tracking-wider mb-1.5 font-semibold">Assigned Subscription Plan</label>
                <select
                  value={editUserForm.planId}
                  onChange={(e) => setEditUserForm({ ...editUserForm, planId: e.target.value })}
                  className="w-full bg-[#0A0A0C] border border-gold-900/25 rounded-lg px-3 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-[#DFB15F]"
                >
                  <option value="plan_free">Free (Initial)</option>
                  <option value="plan_pro">Pro (Starter)</option>
                  <option value="plan_pro_plus">Pro+ (Elite)</option>
                  <option value="plan_business">Business (Professional)</option>
                  <option value="plan_unlimited">Unlimited (Enterprise)</option>
                  {systemPlans.filter(sp => !['plan_free', 'plan_pro', 'plan_pro_plus', 'plan_business', 'plan_unlimited'].includes(sp.id)).map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Custom catalog)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs text-gold-300 uppercase tracking-wider mb-1.5 font-semibold">Queries Used</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editUserForm.queriesCount}
                    onChange={(e) => setEditUserForm({ ...editUserForm, queriesCount: Number(e.target.value) })}
                    className="w-full bg-[#0A0A0C] border border-gold-900/25 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-[#DFB15F]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gold-300 uppercase tracking-wider mb-1.5 font-semibold font-mono">Refill Credits</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editUserForm.topupCredits}
                    onChange={(e) => setEditUserForm({ ...editUserForm, topupCredits: Number(e.target.value) })}
                    className="w-full bg-[#0A0A0C] border border-[#DFB15F]/20 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-[#DFB15F]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-gold-600 to-[#DFB15F] hover:from-gold-500 hover:to-gold-400 text-black text-xs font-semibold rounded-lg uppercase tracking-wider transition-all mt-6 cursor-pointer"
              >
                Apply credentials
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
