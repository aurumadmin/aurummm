import React, { useState, useEffect, useRef } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDocFromServer,
  arrayUnion,
  increment
} from 'firebase/firestore';
import { db, auth } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/firestore-error';
import { UserProfile, PricingPlan, ChatSession, BillingTransaction, MessageBubble, Coupon } from './types';
import { motion, AnimatePresence } from 'motion/react';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import AdminPage from './components/AdminPage';
import {
  Sparkles,
  Settings,
  LogOut,
  Users,
  CreditCard,
  MessageSquare,
  Shield,
  Key,
  Info,
  DollarSign,
  Send,
  Loader2,
  Lock,
  Menu,
  X,
  User,
  Plus,
  Trash2,
  ExternalLink,
  Coins,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Globe,
  Edit2,
  ArrowLeft,
  ArrowRight,
  Check,
  Bitcoin,
  Paperclip,
  Copy,
  TriangleAlert,
  FileCode,
  Image as ImageIcon,
  Download,
  History
} from 'lucide-react';

// Establish connection test to satisfy Firestore validation constraints
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Initial standard system plans to seed into Firestore if database is empty
const BOOTSTRAPPED_PLANS: PricingPlan[] = [
  {
    id: 'plan_free',
    name: 'Free',
    priceINR: 0,
    queriesLimit: 50,
    description: 'Explore with limited credits, perfect for trying it out.',
    createdAt: new Date()
  },
  {
    id: 'plan_pro',
    name: 'Pro',
    priceINR: 10,
    queriesLimit: 100,
    description: 'For regular users needing higher caps.',
    createdAt: new Date()
  },
  {
    id: 'plan_pro_plus',
    name: 'Pro+',
    priceINR: 24,
    queriesLimit: 500,
    description: 'For power users with high consumption needs.',
    createdAt: new Date()
  },
  {
    id: 'plan_business',
    name: 'Business',
    priceINR: 49,
    queriesLimit: 1000,
    description: 'For teams and power users with heavy generation needs.',
    createdAt: new Date()
  },
  {
    id: 'plan_unlimited',
    name: 'Unlimited',
    priceINR: 99,
    queriesLimit: 99999,
    description: 'Infinite deep conversational capability with maximum speed priority.',
    createdAt: new Date()
  }
];

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#2D2D30]/40 text-[#A9A9B3] hover:text-white hover:bg-[#2D2D30]/90 transition-all cursor-pointer border border-transparent select-none"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400 font-medium text-xs">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs">Copy code</span>
        </>
      )}
    </button>
  );
};

const parseBoldAndCode = (text: string): React.ReactNode[] => {
  const tokens: { type: 'text' | 'bold' | 'code'; content: string }[] = [];
  let currentWord = '';
  let i = 0;

  while (i < text.length) {
    if (text.substring(i, i + 2) === '**') {
      if (currentWord) {
        tokens.push({ type: 'text', content: currentWord });
        currentWord = '';
      }
      i += 2;
      let boldContent = '';
      while (i < text.length && text.substring(i, i + 2) !== '**') {
        boldContent += text[i];
        i++;
      }
      tokens.push({ type: 'bold', content: boldContent });
      i += 2;
    } else if (text[i] === '`') {
      if (currentWord) {
        tokens.push({ type: 'text', content: currentWord });
        currentWord = '';
      }
      i += 1;
      let codeContent = '';
      while (i < text.length && text[i] !== '`') {
        codeContent += text[i];
        i++;
      }
      tokens.push({ type: 'code', content: codeContent });
      i += 1;
    } else {
      currentWord += text[i];
      i++;
    }
  }

  if (currentWord) {
    tokens.push({ type: 'text', content: currentWord });
  }

  return tokens.map((token, index) => {
    if (token.type === 'bold') {
      return <strong key={index} className="font-extrabold text-white">{token.content}</strong>;
    } else if (token.type === 'code') {
      return (
        <code key={index} className="px-1.5 py-0.5 rounded bg-[#2D2D30]/60 border border-gold-900/10 text-[#DFB15F] font-mono text-[12px] select-all mx-0.5">
          {token.content}
        </code>
      );
    } else {
      return <span key={index}>{token.content}</span>;
    }
  });
};

const ChatImageWithLoader = ({ url, alt }: { url: string; alt?: string; key?: string }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const isGenericAlt = !alt || /^Asset\s+[A-Z0-9]?$/i.test(alt) || /^Generated\s+(Visual|Image)/i.test(alt);

  return (
    <span className="block my-3">
      <div className="relative overflow-hidden rounded-xl border border-gold-900/20 bg-[#111115]">
        {!loaded && !error && (
          <div className="w-full h-64 sm:h-80 bg-gradient-to-r from-[#121216] via-[#1C1C24] to-[#121216] bg-[length:200%_100%] animate-pulse flex flex-col items-center justify-center gap-3 p-4 text-center select-none">
            <div className="w-10 h-10 rounded-full bg-gold-950/60 border border-gold-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(223,177,95,0.2)]">
              <Loader2 className="w-5 h-5 text-[#DFB15F] animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gold-300 tracking-wide font-sans">
                Generating & rendering image...
              </p>
              <p className="text-[10px] text-gray-500 font-mono">
                Hold tight — applying neural diffusion & rendering pixels
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="w-full h-48 bg-[#1A1110] border border-red-900/30 rounded-xl flex flex-col items-center justify-center p-4 gap-2 text-center">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <p className="text-xs text-red-300 font-medium">Failed to load image asset.</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#DFB15F] underline hover:text-white"
            >
              Open link directly
            </a>
          </div>
        )}

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`relative group ${loaded ? 'block' : 'hidden'}`}
        >
          <img
            src={url}
            alt={alt || 'Visual asset'}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            className="w-full max-h-[420px] object-cover rounded-xl transition-transform duration-300 group-hover:scale-[1.01]"
            referrerPolicy="no-referrer"
          />
          <span className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono text-gold-300 border border-gold-900/30 opacity-90 group-hover:opacity-100 transition-all font-medium pointer-events-none shadow-lg">
            View Original
          </span>
        </a>
      </div>
      {!isGenericAlt && alt && (
        <span className="block text-center text-[10px] text-gray-400 mt-1.5 italic font-mono">{alt}</span>
      )}
    </span>
  );
};

const renderInlineElements = (text: string): React.ReactNode => {
  const imgRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g;
  let lineParts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = imgRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      lineParts.push(
        ...parseBoldAndCode(text.substring(lastIndex, match.index))
      );
    }
    const alt = match[1];
    const url = match[2];
    lineParts.push(
      <ChatImageWithLoader key={`img-${match.index}`} url={url} alt={alt} />
    );
    lastIndex = imgRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    lineParts.push(...parseBoldAndCode(text.substring(lastIndex)));
  }

  return <>{lineParts}</>;
};

const renderTextBlocks = (text: string) => {
  const lines = text.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      renderedElements.push(
        <ul key={`list-${listKey++}`} className="list-disc pl-6 space-y-1.5 my-3 text-gray-200">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmedLine = rawLine.trim();

    if (trimmedLine === '') {
      flushList();
      continue;
    }

    if (trimmedLine.startsWith('# ')) {
      flushList();
      renderedElements.push(
        <h1 key={`h1-${i}`} className="text-2xl font-bold text-white tracking-tight mt-6 mb-2.5 flex items-center gap-2">
          {renderInlineElements(trimmedLine.substring(2))}
        </h1>
      );
    } else if (trimmedLine.startsWith('## ')) {
      flushList();
      renderedElements.push(
        <h2 key={`h2-${i}`} className="text-xl font-bold text-white tracking-tight mt-5 mb-2 flex items-center gap-2 border-b border-gold-900/10 pb-1">
          {renderInlineElements(trimmedLine.substring(3))}
        </h2>
      );
    } else if (trimmedLine.startsWith('### ')) {
      flushList();
      renderedElements.push(
        <h3 key={`h3-${i}`} className="text-[17px] font-extrabold text-[#DFB15F] tracking-tight mt-4 mb-2 flex items-center gap-2">
          {renderInlineElements(trimmedLine.substring(4))}
        </h3>
      );
    } else if (trimmedLine.startsWith('#### ')) {
      flushList();
      renderedElements.push(
        <h4 key={`h4-${i}`} className="text-base font-bold text-[#DFB15F] tracking-tight mt-3 mb-1">
          {renderInlineElements(trimmedLine.substring(5))}
        </h4>
      );
    } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      listItems.push(
        <li key={`li-${i}`} className="leading-relaxed">
          {renderInlineElements(trimmedLine.substring(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(trimmedLine)) {
      flushList();
      const dotIndex = trimmedLine.indexOf('.');
      renderedElements.push(
        <div key={`ol-${i}`} className="flex gap-2 my-2 text-gray-200 leading-relaxed pl-1 text-[13.5px]">
          <span className="font-semibold text-[#DFB15F] min-w-[1.25rem] text-right">{trimmedLine.substring(0, dotIndex)}.</span>
          <span className="flex-1">{renderInlineElements(trimmedLine.substring(dotIndex + 1).trim())}</span>
        </div>
      );
    } else {
      flushList();
      const imgRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g;
      if (imgRegex.test(rawLine)) {
        renderedElements.push(
          <div key={`img-line-${i}`} className="my-2">
            {renderInlineElements(rawLine)}
          </div>
        );
      } else {
        renderedElements.push(
          <p key={`p-${i}`} className="text-gray-200 leading-relaxed my-3 text-[13.5px]">
            {renderInlineElements(rawLine)}
          </p>
        );
      }
    }
  }

  flushList();
  return <div className="space-y-1">{renderedElements}</div>;
};

const renderMessageContent = (content: string) => {
  const parts = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)(?:```|$)/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex, match.index),
        key: `text-${lastIndex}`
      });
    }
    
    parts.push({
      type: 'code',
      language: match[1] || 'code',
      code: match[2],
      key: `code-${match.index}`
    });
    
    lastIndex = codeBlockRegex.lastIndex;
  }
  
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.substring(lastIndex),
      key: `text-end`
    });
  }

  return (
    <div className="space-y-3">
      {parts.map((p) => {
        if (p.type === 'code') {
          return (
            <div key={p.key} className="rounded-lg overflow-hidden border border-[#232329] bg-[#0E0E11] shadow-xl my-4 text-xs font-mono">
              <div className="flex items-center justify-between px-4 py-2 bg-[#17171C] text-[#A2A2B3] border-b border-[#232329] select-none text-xs font-sans tracking-wide">
                <span className="font-semibold text-gold-300">
                  {p.language || 'code'}
                </span>
                <CopyButton text={p.code} />
              </div>
              <div className="p-4 overflow-x-auto text-[13px] text-gray-200 leading-relaxed font-mono whitespace-pre bg-[#0A0A0C]">
                <code>{p.code}</code>
              </div>
            </div>
          );
        } else {
          return <div key={p.key}>{renderTextBlocks(p.content)}</div>;
        }
      })}
    </div>
  );
};

export default function App() {
  // Auth and Profile states
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const getProfileQueriesLimit = () => {
    if (!profile) return 50;
    const activePlan = systemPlans.find(p => p.id === profile.planId) || BOOTSTRAPPED_PLANS.find(p => p.id === profile.planId);
    return activePlan ? activePlan.queriesLimit : 50;
  };

  // Navigation / View states
  const [currentView, setCurrentView] = useState<'home' | 'auth' | 'app' | 'admin'>('home');
  const [initialAuthTab, setInitialAuthTab] = useState<'signin' | 'signup'>('signin');

  const navigate = (view: 'home' | 'auth' | 'app' | 'admin', pushHistory = true) => {
    setCurrentView(view);
    if (pushHistory) {
      const path = view === 'app' ? '/app' : view === 'auth' ? '/auth' : view === 'admin' ? '/admin' : '/';
      if (window.location.pathname !== path) {
        window.history.pushState({ view }, '', path);
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/app' || path.startsWith('/app/')) {
        setCurrentView('app');
      } else if (path === '/auth') {
        setCurrentView('auth');
      } else if (path === '/admin') {
        setCurrentView('admin');
      } else {
        setCurrentView('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // General App views: 'chat' | 'pricing' | 'admin' | 'api' | 'sites'
  const [activeTab, setActiveTab] = useState<'chat' | 'pricing' | 'admin' | 'api' | 'sites'>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Checkout & Coupon states
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState<PricingPlan | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0); 
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<'oxapay' | 'card'>('oxapay');
  const [isActivatingFreeFlow, setIsActivatingFreeFlow] = useState(false);

  // Chat conversation states
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatGenerating, setChatGenerating] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [chatMode, setChatMode] = useState<'default' | 'fast' | 'writing'>('default');
  const [imageMode, setImageMode] = useState<boolean>(false);
  const [imageCount, setImageCount] = useState<number>(1);
  const [accountModalOpen, setAccountModalOpen] = useState<boolean>(false);

  // Custom API Integration dashboard states
  const [developerApis, setDeveloperApis] = useState<any[]>([]);
  const [newApiName, setNewApiName] = useState('');
  const [newApiSysPrompt, setNewApiSysPrompt] = useState('');
  const [newApiUserPrompt, setNewApiUserPrompt] = useState('');
  const [apiListLoading, setApiListLoading] = useState(false);
  
  // Custom API Keys states
  const [userApiKeys, setUserApiKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [revealKey, setRevealKey] = useState<string | null>(null);

  // Lovable AI Website Builder states
  const [userSites, setUserSites] = useState<any[]>([]);
  const [newSitePrompt, setNewSitePrompt] = useState('A modern SaaS landing site for an AI study buddy app, with home, features, pricing, blog, and contact pages.');
  const [newSiteSteps, setNewSiteSteps] = useState(11);
  const [numPages, setNumPages] = useState(5);
  const [numImages, setNumImages] = useState(4);
  const [showSiteConfirmModal, setShowSiteConfirmModal] = useState(false);
  const [siteBuildError, setSiteBuildError] = useState<string | null>(null);
  const [viewingSite, setViewingSite] = useState<any | null>(null);
  const [siteSubTab, setSiteSubTab] = useState<'preview' | 'files'>('preview');
  const [siteCreating, setSiteCreating] = useState(false);
  const [siteStepsLog, setSiteStepsLog] = useState<any[]>([]);
  const [siteDeletingId, setSiteDeletingId] = useState<string | null>(null);
  const [siteDeleteConfirmId, setSiteDeleteConfirmId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inspiration files state
  interface InspirationFile {
    id: string;
    name: string;
    type: string;
    size: number;
    content?: string;
    dataUrl?: string;
  }
  const [inspirationFiles, setInspirationFiles] = useState<InspirationFile[]>([]);
  const [isDraggingInspiration, setIsDraggingInspiration] = useState(false);
  const inspirationInputRef = useRef<HTMLInputElement>(null);

  const processInspirationFiles = (files: FileList) => {
    Array.from(files).forEach((file) => {
      // Check file size limit: 12MB
      if (file.size > 12 * 1024 * 1024) {
        setStatusMsg({ type: 'error', text: `File "${file.name}" exceeds the 12MB upload limit.` });
        return;
      }

      const reader = new FileReader();
      const isImage = file.type.startsWith('image/');
      const isText = file.type.includes('text') || 
                     file.name.endsWith('.html') || 
                     file.name.endsWith('.css') || 
                     file.name.endsWith('.js') || 
                     file.name.endsWith('.jsx') || 
                     file.name.endsWith('.ts') || 
                     file.name.endsWith('.tsx') || 
                     file.name.endsWith('.json') || 
                     file.name.endsWith('.xml') || 
                     file.name.endsWith('.md') ||
                     file.name.endsWith('.yaml') ||
                     file.name.endsWith('.yml');

      const fileObj: InspirationFile = {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        type: file.type,
        size: file.size
      };

      if (isImage) {
        reader.onload = (e) => {
          if (e.target?.result) {
            fileObj.dataUrl = String(e.target.result);
            setInspirationFiles(prev => [...prev, fileObj]);
          }
        };
        reader.readAsDataURL(file);
      } else if (isText) {
        reader.onload = (e) => {
          if (e.target?.result) {
            fileObj.content = String(e.target.result);
            setInspirationFiles(prev => [...prev, fileObj]);
          }
        };
        reader.readAsText(file);
      } else {
        // Binary non-image/text file placeholder
        reader.onload = () => {
          setInspirationFiles(prev => [...prev, fileObj]);
        };
        reader.readAsArrayBuffer(file);
      }
    });

    setStatusMsg({ type: 'success', text: `Uploaded inspiration files successfully.` });
  };

  const handleInspirationDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingInspiration(true);
  };

  const handleInspirationDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingInspiration(false);
  };

  const handleInspirationDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingInspiration(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processInspirationFiles(e.dataTransfer.files);
    }
  };

  const removeInspirationFile = (id: string) => {
    setInspirationFiles(prev => prev.filter(f => f.id !== id));
  };

  // Site Asset Files explorer & Iterative Chatted Revision Editor states
  interface SiteAssetFile {
    name: string;
    type: 'html' | 'image';
    url?: string;
    content?: string;
  }
  const [selectedSiteFile, setSelectedSiteFile] = useState<SiteAssetFile | null>(null);

  interface RevisionMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }
  const [revisionChats, setRevisionChats] = useState<Record<string, RevisionMessage[]>>({});
  const [selectedSiteRevisionInput, setSelectedSiteRevisionInput] = useState('');
  const [siteEditing, setSiteEditing] = useState(false);
  const [siteEditError, setSiteEditError] = useState<string | null>(null);
  const [siteEditStepsLog, setSiteEditStepsLog] = useState<{name: string, status: string, active: boolean, complete?: boolean}[]>([]);
  
  // Custom states for system configuration
  const [systemPlans, setSystemPlans] = useState<PricingPlan[]>([]);
  const [systemSettings, setSystemSettings] = useState<{
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
  }>({
    hasNvidiaNimKey: false,
    hasOxapayKey: false
  });

  // Admin dynamic control lists
  const [adminUsersList, setAdminUsersList] = useState<UserProfile[]>([]);
  const [adminTransactionsList, setAdminTransactionsList] = useState<BillingTransaction[]>([]);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  
  // Modals / forms states
  const [configNnimKey, setConfigNnimKey] = useState('');
  const [configOxapayKey, setConfigOxapayKey] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  // Plans creator modal state
  const [newPlan, setNewPlan] = useState({
    name: '',
    priceINR: 199,
    queriesLimit: 100,
    description: ''
  });

  // Transaction billing feedback
  const [activeTx, setActiveTx] = useState<string | null>(null);
  const [isBillingLoading, setIsBillingLoading] = useState(false);

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    planId: '',
    queriesCount: 0,
    topupCredits: 0
  });

  const handleOpenEditUser = (userObj: UserProfile) => {
    setEditingUser(userObj);
    setEditUserForm({
      planId: userObj.planId || 'plan_free',
      queriesCount: userObj.queriesCount || 0,
      topupCredits: userObj.topupCredits || 0
    });
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !isAdmin) return;
    setStatusMsg(null);

    try {
      const selectedPlan = systemPlans.find(sp => sp.id === editUserForm.planId) || BOOTSTRAPPED_PLANS.find(sp => sp.id === editUserForm.planId);
      const planName = selectedPlan ? selectedPlan.name : 'Free';

      const userDocRef = doc(db, 'users', editingUser.id);
      await updateDoc(userDocRef, {
        planId: editUserForm.planId,
        planName: planName,
        queriesCount: Number(editUserForm.queriesCount),
        topupCredits: Number(editUserForm.topupCredits)
      });

      setStatusMsg({ type: 'success', text: `Successfully updated user profile for ${editingUser.displayName || editingUser.email}` });
      setEditingUser(null);
      loadAdminOverview();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${editingUser.id}`);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamRafRef = useRef<boolean>(false);
  const latestAccumulatedTextRef = useRef<string>('');
  const adminEmails = ['teamthunderofficialyt@gmail.com', 'freefiregtamcpe@gmail.com'];

  // ---------------------------------------------------------------------------
  // AUTHENTICATION LOGIC
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Setup / login profile sync
        const profileRef = doc(db, 'users', firebaseUser.uid);
        try {
          const profileSnap = await getDoc(profileRef);
          
          if (!profileSnap.exists()) {
            // First time entry setting
            const newProfile: UserProfile = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'Aurum Seeker',
              photoURL: firebaseUser.photoURL || '',
              planId: 'plan_free',
              planName: 'Free',
              queriesCount: 0,
              createdAt: serverTimestamp(),
              planExpiresAt: null
            };
            await setDoc(profileRef, newProfile);
            setProfile(newProfile);
          } else {
            setProfile(profileSnap.data() as UserProfile);
          }
          // Determine where they should be sent based on current URL path and state
          const path = window.location.pathname;
          if (path === '/app' || path.startsWith('/app/')) {
            setCurrentView('app');
          } else if (path === '/admin') {
            setCurrentView('admin');
          } else if (path === '/auth') {
            // If they were at /auth and signed up / signed in, redirect them seamlessly to /app
            navigate('app', true);
          } else {
            // Otherwise allow staying on the home page even when signed up!
            setCurrentView('home');
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `users/${firebaseUser.uid}`);
        }

        // Establish admin status
        const isUserAdmin = !!firebaseUser.email && adminEmails.includes(firebaseUser.email.toLowerCase());
        setIsAdmin(isUserAdmin);
      } else {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        // Safely redirect to landing home page if they were inside the app playground or auth screen
        const curPath = window.location.pathname;
        if (curPath === '/app' || curPath.startsWith('/app/') || curPath === '/auth' || curPath === '/admin') {
          navigate('home', true);
        } else {
          setCurrentView('home');
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ---------------------------------------------------------------------------
  // SYNC USER PROFILE & CHATS REALTIME
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!user) return;

    // Realtime User profile synchronization
    const profileRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(profileRef, async (snap) => {
      if (snap.exists()) {
        const uData = snap.data() as UserProfile;
        
        // Client-side auto-downgrade check when plan matches expiry timestamp
        if (uData.planId !== 'plan_free' && uData.planExpiresAt && uData.planExpiresAt !== 'unlimited') {
          const expiresMs = Number(uData.planExpiresAt);
          if (!isNaN(expiresMs) && Date.now() > expiresMs) {
            console.log("Client detected expired plan. Resetting plan status.");
            try {
              await updateDoc(profileRef, {
                planId: 'plan_free',
                planName: 'Free',
                queriesCount: 0,
                planExpiresAt: null
              });
            } catch (err) {
              console.error("Auto-downgrade client update failure:", err);
            }
            return;
          }
        }

        // Daily reset check on client side
        const currentDateString = new Date().toISOString().split('T')[0];
        if (uData.lastResetDate !== currentDateString) {
          try {
            await updateDoc(profileRef, {
              queriesCount: 0,
              lastResetDate: currentDateString
            });
            uData.queriesCount = 0;
            uData.lastResetDate = currentDateString;
          } catch (resetErr) {
            console.warn("Client daily reset update error:", resetErr);
          }
        }

        setProfile(uData);
      }
    }, (e) => {
      handleFirestoreError(e, OperationType.GET, `users/${user.uid}`);
    });

    // Realtime Client historical chats query
    const chatsRef = collection(db, 'chats');
    const qChats = query(chatsRef, where('userId', '==', user.uid));
    
    const unsubChats = onSnapshot(qChats, (snap) => {
      const sessions: ChatSession[] = [];
      snap.forEach((docSnap) => {
        sessions.push(docSnap.data() as ChatSession);
      });
      // Sort in-memory to avoid missing index errors
      sessions.sort((a, b) => {
        const getMillis = (ts: any) => {
          if (!ts) return 0;
          if (typeof ts.toMillis === 'function') return ts.toMillis();
          if (ts.seconds !== undefined) return ts.seconds * 1000 + (ts.nanoseconds || 0) / 1000000;
          if (ts instanceof Date) return ts.getTime();
          return Number(ts);
        };
        return getMillis(b.updatedAt) - getMillis(a.updatedAt);
      });
      setChatSessions(prev => {
        const firestoreMap = new Map(sessions.map(s => [s.id, s]));
        // Keep active session in history if snapshot hasn't persisted it yet
        if (currentSession && !firestoreMap.has(currentSession.id)) {
          return [currentSession, ...sessions];
        }
        return sessions;
      });
      
      // Update active selection to match newer payload if applicable
      if (currentSession && !chatGenerating) {
        const updated = sessions.find(s => s.id === currentSession.id);
        if (updated) setCurrentSession(updated);
      }
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'chats');
    });

    return () => {
      unsubProfile();
      unsubChats();
    };
  }, [user]);

  // ---------------------------------------------------------------------------
  // SYNC SYSTEM PLANS & ADMIN METRICS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!user) return;

    // Real-time Plans synchronization 
    const plansRef = collection(db, 'plans');
    const qPlans = query(plansRef, orderBy('createdAt', 'asc'));

    const unsubPlans = onSnapshot(qPlans, async (snap) => {
      const plansList: PricingPlan[] = [];
      snap.forEach((d) => {
        plansList.push(d.data() as PricingPlan);
      });

      // Seed standard starting tiers if Firestore does not contain record profiles or misses core tiers
      const hasCoreNewPlans = plansList.some(p => p.id === 'plan_pro_plus');
      if ((plansList.length === 0 || !hasCoreNewPlans) && isAdmin) {
        console.log('Seeding initial premium pricing configurations');
        try {
          for (const sp of BOOTSTRAPPED_PLANS) {
            await setDoc(doc(db, 'plans', sp.id), {
              ...sp,
              createdAt: serverTimestamp()
            });
          }
        } catch (e) {
          console.error('Seeding error:', e);
        }
      }
      setSystemPlans(plansList);
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'plans');
    });

    // Real-time Coupons synchronization
    const couponsRef = collection(db, 'coupons');
    const unsubCoupons = onSnapshot(couponsRef, async (snap) => {
      const couponsList: Coupon[] = [];
      snap.forEach((d) => {
        couponsList.push(d.data() as Coupon);
      });

      // If coupons are empty, populate standard default codes securely
      if (couponsList.length === 0 && isAdmin) {
        console.log('Seeding initial promotional coupons');
        const defaultCoupons: Coupon[] = [
          { code: 'FREE', discount: 100, type: 'percent', planId: 'all', active: true },
          { code: 'FREEAURUM', discount: 100, type: 'percent', planId: 'all', active: true },
          { code: 'AURUM100', discount: 100, type: 'percent', planId: 'all', active: true },
          { code: 'WELCOME50', discount: 50, type: 'percent', planId: 'all', active: true },
          { code: 'DISCOUNT50', discount: 50, type: 'percent', planId: 'all', active: true },
          { code: 'AURUM50', discount: 50, type: 'percent', planId: 'all', active: true },
          { code: 'AURUM20', discount: 20, type: 'percent', planId: 'all', active: true }
        ];
        try {
          for (const c of defaultCoupons) {
            await setDoc(doc(db, 'coupons', c.code), c);
          }
        } catch (err) {
          console.error('Seeding coupons error:', err);
        }
      }
      setCoupons(couponsList);
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'coupons');
    });

    // Load admin panel dashboard overview metrics
    if (isAdmin) {
      loadAdminOverview();
      fetchMaskedAdminSettings();
    }

    return () => {
      unsubPlans();
      unsubCoupons();
    };
  }, [user, isAdmin]);



  // Scroll to bottom helper for sleek chat alignment
  useEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: chatGenerating ? 'auto' : 'smooth' });
  }, [currentSession?.messages, chatGenerating]);

  // ---------------------------------------------------------------------------
  // ADMIN PANEL OPERATIONS
  // ---------------------------------------------------------------------------
  const fetchMaskedAdminSettings = async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSystemSettings(data);
      }
    } catch (e) {
      console.error('Error fetching admin settings:', e);
    }
  };

  const loadAdminOverview = async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin/overview', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminUsersList(data.users || []);
        setAdminTransactionsList(data.transactions || []);
      }
    } catch (e) {
      console.error('Overview retrieval crash details:', e);
    }
  };

  const handleCreateCoupon = async (coupon: Coupon) => {
    try {
      await setDoc(doc(db, 'coupons', coupon.code), coupon);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `coupons/${coupon.code}`);
    }
  };

  const handleToggleCoupon = async (code: string, active: boolean) => {
    try {
      await updateDoc(doc(db, 'coupons', code), { active });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `coupons/${code}`);
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    try {
      await deleteDoc(doc(db, 'coupons', code));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `coupons/${code}`);
    }
  };

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingSettings(true);
    setStatusMsg(null);

    try {
      const idToken = await user.getIdToken();
      const payload: any = {};
      if (configNnimKey.trim()) payload.nvidiaNimKey = configNnimKey.trim();
      if (configOxapayKey.trim()) payload.oxapayKey = configOxapayKey.trim();

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setStatusMsg({ type: 'success', text: 'System keys written securely into credentials vault' });
        setConfigNnimKey('');
        setConfigOxapayKey('');
        fetchMaskedAdminSettings();
      } else {
        const err = await res.json();
        setStatusMsg({ type: 'error', text: err.error || 'Failed updating secrets' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error occurred saving settings' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setStatusMsg(null);

    const planId = 'plan_' + newPlan.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const planRef = doc(db, 'plans', planId);

    try {
      await setDoc(planRef, {
        id: planId,
        name: newPlan.name,
        priceINR: Number(newPlan.priceINR),
        queriesLimit: Number(newPlan.queriesLimit),
        description: newPlan.description,
        createdAt: serverTimestamp()
      });
      setStatusMsg({ type: 'success', text: `Plan "${newPlan.name}" updated successfully` });
      setNewPlan({ name: '', priceINR: 249, queriesLimit: 100, description: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `plans/${planId}`);
    }
  };

  const handleDeletePlan = async (id: string, name: string) => {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await deleteDoc(doc(db, 'plans', id));
      setStatusMsg({ type: 'success', text: `Plan "${name}" deleted` });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `plans/${id}`);
    }
  };

  // ---------------------------------------------------------------------------
  // CLIENT CHAT ACTIONS
  // ---------------------------------------------------------------------------
  const handleStartNewSession = () => {
    setCurrentSession(null);
    setInputMessage('');
    setActiveTab('chat');
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      setChatSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
      await deleteDoc(doc(db, 'chats', sessionId));
    } catch (err: any) {
      console.error("Failed to delete session:", err);
    }
  };

  // Load APIs from server proxy
  const fetchDeveloperApis = async () => {
    if (!user) return;
    setApiListLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/developer/list', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (res.ok) {
        const d = await res.json();
        setDeveloperApis(d.apis || []);
      }
    } catch (e) {
      console.error("fetch APIs error:", e);
    } finally {
      setApiListLoading(false);
    }
  };

  // Load compiled sites from Firestore
  const fetchUserSites = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'sites'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const sites: any[] = [];
      snap.forEach(docSnap => sites.push(docSnap.data()));
      // Sort in-memory to prevent index errors
      sites.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setUserSites(sites);
    } catch (e) {
      console.error("fetch Sites error:", e);
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!user) return;
    setSiteDeletingId(siteId);
    try {
      // Delete document directly on client Firestore first so it never reappears on reload
      try {
        await deleteDoc(doc(db, 'sites', siteId));
        console.log(`[Firestore] Site ${siteId} deleted directly from user Firestore database.`);
      } catch (fsErr) {
        console.warn("Client site doc delete error:", fsErr);
      }

      const idToken = await user.getIdToken();
      const res = await fetch('/api/delete-site', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ siteId })
      });

      setUserSites(prev => prev.filter(s => s.id !== siteId));
      setStatusMsg({ type: 'success', text: 'Website deleted successfully.' });
      if (viewingSite?.id === siteId) {
        setViewingSite(null);
      }
    } catch (e: any) {
      console.error("Delete site error:", e);
      setStatusMsg({ type: 'error', text: e.message || 'Failed to delete website.' });
    } finally {
      setSiteDeletingId(null);
      setSiteDeleteConfirmId(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'api') {
      fetchDeveloperApis();
      fetchUserApiKeys();
    } else if (activeTab === 'sites' || activeTab === 'chat') {
      fetchUserSites();
    }
  }, [activeTab, user]);

  const fetchUserApiKeys = async () => {
    if (!user) return;
    setApiKeysLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/developer/keys/list', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (res.ok) {
        const d = await res.json();
        setUserApiKeys(d.apiKeys || []);
      }
    } catch (e) {
      console.error("fetch API Keys error:", e);
    } finally {
      setApiKeysLoading(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newKeyName.trim()) return;
    setRevealKey(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/developer/keys/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ name: newKeyName.trim() })
      });
      if (res.ok) {
        const d = await res.json();
        setUserApiKeys(prev => [d.apiKey, ...prev]);
        setNewKeyName('');
        setRevealKey(d.apiKey.keySecret);
        setStatusMsg({ type: 'success', text: `API key "${d.apiKey.name}" generated successfully!` });
      } else {
        const err = await res.json();
        setStatusMsg({ type: 'error', text: err.error || 'Failed to create API key' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!user || !window.confirm("Are you sure you want to permanently revoke this API key? Any dynamic services utilizing it will fail instantly.")) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/developer/keys/delete/${keyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (res.ok) {
        setUserApiKeys(prev => prev.filter(key => key.id !== keyId));
        setStatusMsg({ type: 'success', text: 'API key successfully revoked.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleCreateApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newApiName.trim()) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/developer/create-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          name: newApiName.trim(),
          systemPrompt: newApiSysPrompt,
          userPrompt: newApiUserPrompt
        })
      });
      if (res.ok) {
        const d = await res.json();
        setDeveloperApis(prev => [d.api, ...prev]);
        setNewApiName('');
        setNewApiSysPrompt('');
        setNewApiUserPrompt('');
        setStatusMsg({ type: 'success', text: `API endpoint "${d.api.name}" registered successfully!` });
      } else {
        const err = await res.json();
        setStatusMsg({ type: 'error', text: err.error || 'Failed to register API' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleDeleteApi = async (apiId: string) => {
    if (!user || !window.confirm("Are you sure you want to delete this custom API?")) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/developer/delete-api/${apiId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (res.ok) {
        setDeveloperApis(prev => prev.filter(a => a.id !== apiId));
        setStatusMsg({ type: 'success', text: 'Custom API endpoint deleted.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const calculateAestheticCost = (p: string) => {
    // Elegant, predictable synthesis configuration — the compiler dynamically outputs complete, massive websites automatically.
    return { pages: 3, images: 3, total: 8 };
  };

  const handleCreateSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newSitePrompt.trim() || siteCreating) return;

    // Compute steps count dynamically: pages + images + 2 setup calls
    const { pages, images, total } = calculateAestheticCost(newSitePrompt);
    setNumPages(pages);
    setNumImages(images);
    setNewSiteSteps(total);
    setShowSiteConfirmModal(true);
  };

  const executeSiteGeneration = async () => {
    if (!user || !newSitePrompt.trim() || siteCreating) return;
    
    setSiteCreating(true);
    const { pages, images, total } = calculateAestheticCost(newSitePrompt);
    const cost = total;
    setNumPages(pages);
    setNumImages(images);
    setNewSiteSteps(total);

    setSiteStepsLog([
      { name: 'Wireframing Schemas', status: 'Generating site layout grids, component states, and responsive view toggles...', active: true },
      { name: 'Tailwind Aesthetic Theme Integration', status: 'Pending compilation...', active: false },
      { name: 'Alpine.js State Machine & Real AI Assets Placement', status: 'Pending compilation...', active: false }
    ]);

    try {
      const idToken = await user.getIdToken();
      
      // Simulate real-time progress steps for luxurious interactive feedback
      const timer1 = setTimeout(() => {
        setSiteStepsLog([
          { name: 'Wireframing Schemas', status: 'Generated site layout grids successfully! [Consumed 1 Cr]', active: false, complete: true },
          { name: 'Tailwind Aesthetic Theme Integration', status: 'Styling dark/light panels, typography heights... [Consumed 1 Cr]', active: true },
          { name: 'Alpine.js State Machine & Real AI Assets Placement', status: 'Pending compilation...', active: false }
        ]);
      }, 3500);

      const timer2 = setTimeout(() => {
        setSiteStepsLog([
          { name: 'Wireframing Schemas', status: 'Generated site layout grids successfully! [Consumed 1 Cr]', active: false, complete: true },
          { name: 'Tailwind Aesthetic Theme Integration', status: 'Styled dark/light channels and glassmorphic layouts! [Consumed 1 Cr]', active: false, complete: true },
          { name: 'Alpine.js State Machine & Real AI Assets Placement', status: 'Compiling state routers and AI graphic elements... [Consumed 1 Cr]', active: true }
        ]);
      }, 7500);

      const res = await fetch('/api/create-site', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          prompt: newSitePrompt.trim(),
          stepsCount: cost,
          inspirationFiles: inspirationFiles.map(f => ({
            name: f.name,
            type: f.type,
            content: f.content
          }))
        })
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (res.ok) {
        let d: any;
        const textData = await res.text();
        try {
          d = JSON.parse(textData);
        } catch (e) {
          if (textData.trim().startsWith('<')) {
            throw new Error('Server returned HTML instead of JSON. Please click "Create Site" again.');
          }
          throw new Error('Server API response was not valid JSON. Please click "Create Site" again!');
        }

        if (!d || !d.site) {
          throw new Error(d?.error || d?.message || 'Site compilation payload was incomplete.');
        }
        
        // Save the generated site from the client side to bypass server sandbox permission limits
        try {
          await setDoc(doc(db, 'sites', d.site.id), d.site);
          console.log("Newly generated site successfully stored on user's Firestore collection.");
        } catch (fsErr) {
          console.warn("Client site registration skipped (could exist already or missing index):", fsErr);
        }

        // Deduct priority credits on client side for premium site generation
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const cost = numPages + numImages + 2;
          await updateDoc(userDocRef, {
            queriesCount: increment(cost)
          });
          console.log(`[Credits] Successfully deducted generator cost of ${cost} credits on client.`);
        } catch (dbErr) {
          console.warn('Credits decrement client fallback bypassed:', dbErr);
        }

        setUserSites(prev => [d.site, ...prev]);
        setViewingSite(d.site);
        setNewSitePrompt('');
        setSiteStepsLog([]);
        setStatusMsg({ type: 'success', text: `SPECTACULAR SITE COMPILATION SATELLITE ONLINE!` });
      } else {
        let errMsg = 'Failed to compile site.';
        try {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const err = await res.json();
            errMsg = err.message || err.error || errMsg;
          } else {
            const txt = await res.text();
            errMsg = `Server error (${res.status}): ` + (txt.substring(0, 180) || 'No response text');
          }
        } catch (parseErr) {
          errMsg = `Server error (${res.status})`;
        }
        setSiteBuildError(errMsg);
        setSiteStepsLog([]);
      }
    } catch (err: any) {
      setSiteBuildError('Aurum Engine Compiler network exception: ' + err.message);
      setSiteStepsLog([]);
    } finally {
      setSiteCreating(false);
    }
  };

  const getSiteFiles = (site: any): SiteAssetFile[] => {
    if (!site || !site.code) return [];

    const filesList: SiteAssetFile[] = [
      { name: 'index.html', type: 'html', content: site.code }
    ];

    // Extract asset proxies
    const regex = /\/api\/image-proxy\?[^"']+/g;
    const matches = site.code.match(regex) || [];
    const uniqueUrls = Array.from(new Set(matches)) as string[];

    uniqueUrls.forEach((url, index) => {
      filesList.push({
        name: `assets/image-${index + 1}.png`,
        type: 'image',
        url: url
      });
    });

    return filesList;
  };

  useEffect(() => {
    if (viewingSite) {
      setSelectedSiteFile({ name: 'index.html', type: 'html', content: viewingSite.code });
    } else {
      setSelectedSiteFile(null);
    }
  }, [viewingSite]);

  const [revertingSite, setRevertingSite] = useState(false);

  const executeSiteRevert = async (historyIndex: number) => {
    if (!viewingSite || !user || revertingSite || siteEditing) return;

    if (!window.confirm("Are you sure you want to revert to this previous build? This will rewind your project state to that point.")) {
      return;
    }

    setRevertingSite(true);
    setStatusMsg({ type: 'info', text: 'REVERTING TO SELECTED PREVIOUS BUILD...' });

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/revert-site', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          siteId: viewingSite.id,
          historyIndex,
          currentCode: viewingSite.code,
          currentPrompt: viewingSite.prompt,
          currentTitle: viewingSite.title,
          currentHistory: viewingSite.history || []
        })
      });

      if (res.ok) {
        const data = await res.json();
        const updatedSite = data.site;

        // Save updated site to local firestore cache if possible
        try {
          await setDoc(doc(db, 'sites', updatedSite.id), updatedSite);
        } catch (fsErr) {
          console.warn("Client site revert registration skipped:", fsErr);
        }

        setUserSites(prev => prev.map(s => s.id === updatedSite.id ? updatedSite : s));
        setViewingSite(updatedSite);

        const aiMsg: RevisionMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Reverted to previous build successfully! Check the compilation output.`,
          timestamp: Date.now()
        };

        setRevisionChats(prev => ({
          ...prev,
          [viewingSite.id]: [...(prev[viewingSite.id] || []), aiMsg]
        }));
        setStatusMsg({ type: 'success', text: `WEBPAGE REWOUND & RE-COMPILED SECURELY!` });
      } else {
        const err = await res.json();
        setStatusMsg({ type: 'error', text: err.message || 'Failed to revert to select build.' });
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Network connection failed during revert action.' });
    } finally {
      setRevertingSite(false);
    }
  };

  const executeSiteEditing = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = selectedSiteRevisionInput.trim();
    if (!text || !viewingSite || !user || siteEditing) return;

    const newMsg: RevisionMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    setRevisionChats(prev => ({
      ...prev,
      [viewingSite.id]: [...(prev[viewingSite.id] || []), newMsg]
    }));

    setSelectedSiteRevisionInput('');
    setSiteEditing(true);
    setSiteEditError(null);

    setSiteEditStepsLog([
      { name: 'Analyzing Original Webpage', status: 'Reading existing HTML components and dependencies...', active: true },
      { name: 'Injecting Layout Code Revisions', status: 'Pending compilation...', active: false },
      { name: 'Updating Sandbox Live Previews', status: 'Pending compilation...', active: false }
    ]);

    try {
      const idToken = await user.getIdToken();

      const timer1 = setTimeout(() => {
        setSiteEditStepsLog([
          { name: 'Analyzing Original Webpage', status: 'Analyzed html and elements successfully!', active: false, complete: true },
          { name: 'Injecting Layout Code Revisions', status: 'Applying instructions via Llama-3.3-70b AI model...', active: true },
          { name: 'Updating Sandbox Live Previews', status: 'Pending compilation...', active: false }
        ]);
      }, 3000);

      const timer2 = setTimeout(() => {
        setSiteEditStepsLog([
          { name: 'Analyzing Original Webpage', status: 'Analyzed html and elements successfully!', active: false, complete: true },
          { name: 'Injecting Layout Code Revisions', status: 'Applied custom edits and styled container dimensions!', active: false, complete: true },
          { name: 'Updating Sandbox Live Previews', status: 'Syncing live sandbox files...', active: true }
        ]);
      }, 6500);

      const res = await fetch('/api/edit-site', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          siteId: viewingSite.id,
          instruction: text,
          currentCode: viewingSite.code,
          currentPrompt: viewingSite.prompt,
          currentTitle: viewingSite.title,
          currentHistory: viewingSite.history || [],
          stepsCount: 1
        })
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (res.ok) {
        const textData = await res.text();
        let data: any;
        try {
          data = JSON.parse(textData);
        } catch (e) {
          throw new Error('Server API response was not JSON. Please try applying the edit again!');
        }

        if (!data || !data.site) {
          throw new Error(data?.error || data?.message || 'Site edit compilation payload was incomplete.');
        }
        const updatedSite = data.site;

        // Deduct credit in Firestore for user
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, {
            queriesCount: increment(1)
          });
          console.log("[Credits] Deducted edit credit of 1 on client side.");
        } catch (dbErr) {
          console.warn("[Credits] Skip client side decrement:", dbErr);
        }

        // Save updated site to local firestore cache
        try {
          await setDoc(doc(db, 'sites', updatedSite.id), updatedSite);
        } catch (fsErr) {
          console.warn("Client site update registration skipped:", fsErr);
        }

        setUserSites(prev => prev.map(s => s.id === updatedSite.id ? updatedSite : s));
        setViewingSite(updatedSite);

        const aiMsg: RevisionMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Applied code edit successfully! Check the updated sandbox preview.`,
          timestamp: Date.now()
        };

        setRevisionChats(prev => ({
          ...prev,
          [viewingSite.id]: [...(prev[viewingSite.id] || []), aiMsg]
        }));
        setSiteEditStepsLog([]);
        setStatusMsg({ type: 'success', text: `WEBPAGE REVISED & RE-COMPILED SECURELY!` });
      } else {
        let errMsg = 'Failed to edit site.';
        try {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const err = await res.json();
            errMsg = err.message || err.error || errMsg;
          } else {
            const txt = await res.text();
            errMsg = `Server error (${res.status}): ` + (txt.substring(0, 180) || 'No response text');
          }
        } catch (parseErr) {
          errMsg = `Server error (${res.status})`;
        }
        setSiteEditError(errMsg);
        setSiteEditStepsLog([]);
      }
    } catch (err: any) {
      setSiteEditError('Aurum Engine Compiler network exception: ' + err.message);
      setSiteEditStepsLog([]);
    } finally {
      setSiteEditing(false);
    }
  };

  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const addFilesToAttachments = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    if (incoming.length === 0) return;
    setAttachments(prev => [...prev, ...incoming]);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.stopPropagation();
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
      addFilesToAttachments(e.clipboardData.files);
    } else if (e.clipboardData && e.clipboardData.items) {
      const pastedImages: File[] = [];
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const ext = item.type.split('/')[1] || 'png';
            const renamedFile = new File([file], `pasted_image_${Date.now()}.${ext}`, { type: item.type });
            pastedImages.push(renamedFile);
          }
        }
      }
      if (pastedImages.length > 0) {
        addFilesToAttachments(pastedImages);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingFile) setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToAttachments(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToAttachments(e.target.files);
    }
  };

  const handleRemoveAttachment = (idxToRemove: number) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || chatGenerating || !user) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setChatGenerating(true);

    const isImageGeneration = imageMode || messageText.toLowerCase().startsWith('draw ');
    const finalSentPrompt = isImageGeneration && !messageText.toLowerCase().startsWith('draw ') 
      ? `draw ${messageText}` 
      : messageText;

    let promptWithAttachments = finalSentPrompt;
    if (attachments.length > 0) {
      for (const att of attachments) {
        try {
          if (att.type.startsWith('image/')) {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(att);
            });
            promptWithAttachments += `\n\n[Attached Image: ${att.name}]\n${dataUrl}`;
          } else {
            const txt = await att.text();
            promptWithAttachments += `\n\n[Attached File Content: ${att.name}]\n\`\`\`\n${txt.substring(0, 50000)}\n\`\`\``;
          }
        } catch (attErr) {
          console.warn('Error reading attachment file:', attErr);
          promptWithAttachments += `\n\n[Attachment: ${att.name} (${(att.size / 1024).toFixed(1)} KB)]`;
        }
      }
    }

    const existingMessages: MessageBubble[] = currentSession?.messages || [];
    
    let displayContent = messageText;
    if (attachments.length > 0) {
      const names = attachments.map(att => att.name).join(", ");
      displayContent += `\n📎 Attached files: ${names}`;
    }

    const outgoingMessagesForState = [
      ...existingMessages,
      { role: 'user' as const, content: displayContent, timestamp: Date.now() }
    ];

    const outgoingMessagesForApi = [
      ...existingMessages,
      { role: 'user' as const, content: promptWithAttachments, timestamp: Date.now() }
    ];

    // Clear attachment state and image generator overrides
    setAttachments([]);
    setImageMode(false);

    // Generate stable chatId immediately for instant history entry
    const activeChatId = currentSession?.id || doc(collection(db, 'chats')).id;
    const sessionTitle = currentSession?.title || (messageText.length > 28 ? messageText.substring(0, 28) + '...' : messageText);

    // optimistically align panel user bubble and add initial assistant streaming bubble
    const assistantBubble: MessageBubble = {
      role: 'assistant',
      content: isImageGeneration ? '🎨 *Generating visual asset...*' : '',
      timestamp: Date.now()
    };

    const initialMessages = [...outgoingMessagesForState, assistantBubble];

    const tempSession: ChatSession = {
      id: activeChatId,
      userId: user.uid,
      title: sessionTitle,
      messages: initialMessages,
      updatedAt: Date.now()
    };
    setCurrentSession(tempSession);

    // Immediately unshift into sidebar history list
    setChatSessions(prev => {
      const filtered = prev.filter(s => s.id !== activeChatId);
      return [tempSession, ...filtered];
    });

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          messages: outgoingMessagesForApi,
          chatId: activeChatId,
          mode: chatMode,
          imageCount: isImageGeneration ? imageCount : 1
        })
      });

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';
        let sseBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(trimmed.substring(6));

                if (eventData.chunk) {
                  accumulatedText += eventData.chunk;
                  latestAccumulatedTextRef.current = accumulatedText;

                  if (!streamRafRef.current) {
                    streamRafRef.current = true;
                    requestAnimationFrame(() => {
                      streamRafRef.current = false;
                      const textToApply = latestAccumulatedTextRef.current;
                      setCurrentSession(prev => {
                        if (!prev) return null;
                        const msgs = [...prev.messages];
                        const lastIdx = msgs.length - 1;
                        if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
                          msgs[lastIdx] = { ...msgs[lastIdx], content: textToApply };
                        }
                        return { ...prev, messages: msgs };
                      });
                    });
                  }
                }

                if (eventData.done) {
                  streamRafRef.current = false;
                  const finalTxt = eventData.answer || accumulatedText;
                  setCurrentSession(prev => {
                    if (!prev) return null;
                    const msgs = [...prev.messages];
                    const lastIdx = msgs.length - 1;
                    if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
                      msgs[lastIdx] = { ...msgs[lastIdx], content: finalTxt };
                    }
                    const updatedSession = {
                      ...prev,
                      id: eventData.chatId || prev.id,
                      title: eventData.title || prev.title,
                      messages: msgs
                    };
                    setChatSessions(sList => {
                      const filtered = sList.filter(s => s.id !== updatedSession.id);
                      return [updatedSession, ...filtered];
                    });
                    return updatedSession;
                  });

                  // Client fallback save if needed
                  if (eventData.saveOnClient && eventData.newMessages) {
                    try {
                      const chatDocRef = doc(db, 'chats', eventData.chatId);
                      const chatSnap = await getDoc(chatDocRef);
                      if (!chatSnap.exists()) {
                        await setDoc(chatDocRef, {
                          id: eventData.chatId,
                          userId: user.uid,
                          title: eventData.title || tempSession.title,
                          messages: eventData.newMessages,
                          updatedAt: serverTimestamp()
                        });
                      } else {
                        await updateDoc(chatDocRef, {
                          messages: arrayUnion(...eventData.newMessages),
                          updatedAt: serverTimestamp()
                        });
                      }
                      const userDocRef = doc(db, 'users', user.uid);
                      await updateDoc(userDocRef, {
                        queriesCount: increment(1)
                      });
                    } catch (dbErr) {
                      console.warn('Client-side sync fallback bypassed:', dbErr);
                    }
                  }
                }

                if (eventData.error) {
                  const errorMsg = `⚠️ ${eventData.error}${eventData.details ? '\n' + eventData.details : ''}`;
                  setCurrentSession(prev => {
                    if (!prev) return null;
                    const msgs = [...prev.messages];
                    const lastIdx = msgs.length - 1;
                    if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
                      msgs[lastIdx] = { ...msgs[lastIdx], content: errorMsg };
                    } else {
                      msgs.push({ role: 'assistant', content: errorMsg, timestamp: Date.now() });
                    }
                    return { ...prev, messages: msgs };
                  });
                }
              } catch (pErr) {
                // json parse error skip
              }
            }
          }
        }

        if (accumulatedText.trim().length === 0) {
          setCurrentSession(prev => {
            if (!prev) return null;
            const msgs = [...prev.messages];
            const lastIdx = msgs.length - 1;
            if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant' && msgs[lastIdx].content === '') {
              msgs[lastIdx] = { ...msgs[lastIdx], content: '⚠️ DeepSeek / Aurum engine did not return a response. Please check connection or retry.' };
            }
            return { ...prev, messages: msgs };
          });
        }
      } else {
        // Non-streaming response or JSON fallback (e.g., image generation)
        const data = await res.json();
        if (!res.ok) {
          if (data.quotaExceeded) {
            setCurrentSession(prev => prev ? {
              ...prev,
              messages: [
                ...prev.messages,
                { role: 'system' as const, content: '⚠️ CAP EXCEEDED: You have exhausted the query limits for this subscription level. Please select Pricing to upgrade your plan limits.', timestamp: Date.now() }
              ]
            } : null);
          } else {
            setCurrentSession(prev => prev ? {
              ...prev,
              messages: [
                ...outgoingMessagesForState,
                { role: 'system' as const, content: `⚠️ ${data.message || data.error || 'Server error'}`, timestamp: Date.now() }
              ]
            } : null);
          }
        } else {
          const finalSession: ChatSession = {
            id: data.chatId || activeChatId,
            userId: user.uid,
            title: data.title || tempSession.title,
            messages: [
              ...outgoingMessagesForState,
              { role: 'assistant' as const, content: data.answer, timestamp: Date.now() }
            ],
            updatedAt: Date.now()
          };
          setCurrentSession(finalSession);
          setChatSessions(prev => {
            const filtered = prev.filter(s => s.id !== finalSession.id);
            return [finalSession, ...filtered];
          });

          if (data.saveOnClient && data.newMessages) {
            try {
              const chatDocRef = doc(db, 'chats', data.chatId);
              const chatSnap = await getDoc(chatDocRef);
              if (!chatSnap.exists()) {
                await setDoc(chatDocRef, {
                  id: data.chatId,
                  userId: user.uid,
                  title: data.title || tempSession.title,
                  messages: data.newMessages,
                  updatedAt: serverTimestamp()
                });
              } else {
                await updateDoc(chatDocRef, {
                  messages: arrayUnion(...data.newMessages),
                  updatedAt: serverTimestamp()
                });
              }
              const userDocRef = doc(db, 'users', user.uid);
              await updateDoc(userDocRef, {
                queriesCount: increment(isImageGeneration ? (imageCount * 5) : 1)
              });
            } catch (dbErr) {
              console.warn('Client-side sync fallback bypassed:', dbErr);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Chat generation crash:', err);
      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [
          ...outgoingMessagesForState,
          { role: 'system' as const, content: `⚠️ Network error: ${err.message}`, timestamp: Date.now() }
        ]
      } : null);
    } finally {
      setChatGenerating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // BILLING & OXAPAY CHECKOUT FLOW
  // ---------------------------------------------------------------------------
  const handleInitiateUpgrade = async (planId: string) => {
    if (!user) return;
    setIsBillingLoading(true);
    setStatusMsg(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/payment/create-charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ planId })
      });

      const data = await res.json();
      if (res.ok && data.payUrl) {
        setActiveTx(data.txId);
        // Direct users elegantly to Oxapay checkout URL
        // Using window.open fallback cleanly inside user action context
        window.open(data.payUrl, '_blank', 'noreferrer,noopener');
      } else {
        setStatusMsg({ type: 'error', text: data.message || data.error || 'Failed creating invoice' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Payment initiation failed' });
    } finally {
      setIsBillingLoading(false);
    }
  };

  // Apply coupon code discount calculation
  const handleApplyCoupon = () => {
    setCouponError(null);
    setCouponSuccess(null);
    const cleaned = couponCode.trim().toUpperCase();

    if (!cleaned) {
      setCouponError('Please enter a valid coupon code.');
      setAppliedDiscount(0);
      return;
    }

    // Search coupons array synchronized in real-time from Firestore
    const found = coupons.find(c => c.code === cleaned);

    if (!found) {
      setCouponError("Invalid or expired coupon code.");
      setAppliedDiscount(0);
      return;
    }

    if (!found.active) {
      setCouponError("This coupon code is currently deactivated.");
      setAppliedDiscount(0);
      return;
    }

    // Check specific plan resource lock
    if (selectedCheckoutPlan) {
      if (found.planId !== 'all' && found.planId !== selectedCheckoutPlan.id) {
        const topups = [
          { id: 'topup_starter', name: 'Starter Pack' },
          { id: 'topup_power', name: 'Power Pack' },
          { id: 'topup_pro', name: 'Pro Pack' }
        ];
        const targetPlan = systemPlans.find(p => p.id === found.planId) || 
                           BOOTSTRAPPED_PLANS.find(p => p.id === found.planId) || 
                           topups.find(p => p.id === found.planId);
        const planRequiredName = targetPlan ? targetPlan.name : found.planId;
        setCouponError(`This coupon is only valid for "${planRequiredName}".`);
        setAppliedDiscount(0);
        return;
      }
    }

    if (found.type === 'percent') {
      const fraction = found.discount / 100;
      setAppliedDiscount(fraction);
      if (fraction >= 1) {
        setCouponSuccess('Success! 100% discount applied. Get this plan for free.');
      } else {
        setCouponSuccess(`Success! ${found.discount}% discount applied to your chosen tier.`);
      }
    } else {
      // Fixed INR discount amount
      if (selectedCheckoutPlan) {
        const fraction = found.discount / selectedCheckoutPlan.priceINR;
        setAppliedDiscount(Math.min(1.0, fraction));
        if (found.discount >= selectedCheckoutPlan.priceINR) {
          setCouponSuccess(`Success! ₹${found.discount} discount applied. Get this plan for free.`);
        } else {
          setCouponSuccess(`Success! ₹${found.discount} discount applied to your chosen tier.`);
        }
      } else {
        setCouponError("Please select a plan tier first.");
        setAppliedDiscount(0);
      }
    }
  };

  // Free/coupon instant activation flow
  const handleActivatePlanViaOrder = async (plan: PricingPlan) => {
    if (!user) {
      setStatusMsg({ type: 'error', text: 'You must be logged in to buy a plan.' });
      return;
    }

    setIsActivatingFreeFlow(true);
    try {
      const basePrice = plan.priceINR;
      const discountVal = Math.round(basePrice * appliedDiscount);
      const finalPrice = Math.max(0, basePrice - discountVal);

      // 1. Direct user profile write in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const isTopup = plan.id.startsWith('topup_');

      if (isTopup) {
        // Resolve credit increment count from topup pack definition
        let creditsToIncrement = 100; // topup_starter
        if (plan.id === 'topup_power') creditsToIncrement = 500;
        if (plan.id === 'topup_pro') creditsToIncrement = 1500;

        await updateDoc(userDocRef, {
          topupCredits: increment(creditsToIncrement),
          updatedAt: Date.now()
        });
      } else {
        // Upgrading queries limits and tier identifiers for standard subscriptions
        await updateDoc(userDocRef, {
          planId: plan.id,
          planName: plan.name,
          queriesCount: 0,
          planExpiresAt: plan.id === 'plan_free' ? null : (Date.now() + 30 * 24 * 60 * 60 * 1000), // bought system plans run for 30 days
          updatedAt: Date.now()
        });
      }

      // 2. Create the Transaction receipt in Firestore
      const txId = `tx_order_${Date.now()}_${Math.random().toString(36).substring(4, 9)}`;
      const receiptDocRef = doc(db, 'transactions', txId);
      await setDoc(receiptDocRef, {
        id: txId,
        userId: user.uid,
        userEmail: user.email,
        planId: plan.id,
        planName: plan.name,
        amount: finalPrice,
        status: 'paid', // activated free of charge or coupon discount
        type: isTopup ? 'topup_order' : 'subscription_order',
        couponUsed: couponCode.trim().toUpperCase() || 'none',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Show gorgeous toast/status message
      setStatusMsg({
        type: 'success',
        text: isTopup 
          ? `🎉 Refill processed successfully! Your high priority coins have been added!`
          : `🎉 Order processed successfully! You are now subscribed to Aurum ${plan.name}!`
      });

      // Clear checkout selections
      setSelectedCheckoutPlan(null);
      setCouponCode('');
      setAppliedDiscount(0);
      setCouponSuccess(null);
      
      // Navigate user back to playground active workspace
      setActiveTab('chat');

    } catch (err: any) {
      console.error('Order checkout exception:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Unable to update profile authorization.' });
    } finally {
      setIsActivatingFreeFlow(false);
    }
  };

  const handleVerifyActiveTransaction = async () => {
    if (!user) return;
    setAuthLoading(true);
    try {
      // Re-read Firestore user document to see if callback processed and upgraded plan
      const profileRef = doc(db, 'users', user.uid);
      const snap = await getDoc(profileRef);
      if (snap.exists()) {
        const uData = snap.data() as UserProfile;
        setProfile(uData);
        if (uData.planId !== 'plan_free') {
          setStatusMsg({
            type: 'success',
            text: `🎉 Access unlocked! Welcome to ${uData.planName || 'your premium tier'}.`
          });
          setActiveTx(null);
          setActiveTab('chat');
        } else {
          setStatusMsg({
            type: 'error',
            text: "🔍 Payment status pending on Oxapay. If you finished payment, wait a moment and verify again."
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      console.error('Sign-in failed:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      handleStartNewSession();
      navigate('home');
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  // Filter overview list of admin users
  const filteredUsers = adminUsersList.filter(userObj => {
    const q = adminSearchQuery.toLowerCase();
    return (
      userObj.email.toLowerCase().includes(q) ||
      (userObj.displayName || '').toLowerCase().includes(q) ||
      userObj.planId.toLowerCase().includes(q)
    );
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex flex-col items-center justify-center font-sans">
        <Sparkles className="w-12 h-12 text-[#DFB15F] animate-pulse mb-4" />
        <p className="text-sm font-mono tracking-widest text-gold-200 uppercase animate-pulse">Initializing Aurum...</p>
      </div>
    );
  }

  // Render Core view routes
  if (currentView === 'home') {
    return (
      <LandingPage
        user={user}
        onNavigateToAuth={(mode) => {
          setInitialAuthTab(mode);
          navigate('auth');
        }}
        onEnterWorkspace={() => {
          navigate('app');
          setActiveTab('chat');
        }}
        onEnterPricing={() => {
          navigate('app');
          setActiveTab('pricing');
        }}
        systemPlans={systemPlans.length > 0 ? systemPlans : BOOTSTRAPPED_PLANS}
      />
    );
  }

  if (currentView === 'auth') {
    return (
      <AuthPage
        onBackToHome={() => navigate('home')}
        onSuccess={() => navigate('app')}
        handleGoogleSignIn={handleGoogleSignIn}
        preferredTab={initialAuthTab}
      />
    );
  }

  // Absolute protection for internal app workspace
  if (!user || !profile) {
    return (
      <AuthPage
        onBackToHome={() => navigate('home')}
        onSuccess={() => navigate('app')}
        handleGoogleSignIn={handleGoogleSignIn}
        preferredTab="signin"
      />
    );
  }

  if (currentView === 'admin') {
    return (
      <AdminPage
        user={user}
        isAdmin={isAdmin}
        onBackToApp={() => navigate('app')}
        systemPlans={systemPlans.length > 0 ? systemPlans : BOOTSTRAPPED_PLANS}
        systemSettings={systemSettings}
        adminUsersList={adminUsersList}
        onSubmitKeys={async (nnKey, oxKey, extraSettings = {}) => {
          setIsSavingSettings(true);
          try {
            const idToken = await user!.getIdToken();
            const payload: any = { ...extraSettings };
            if (nnKey.trim()) payload.nvidiaNimKey = nnKey.trim();
            if (oxKey.trim()) payload.oxapayKey = oxKey.trim();

            const res = await fetch('/api/admin/settings', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
              },
              body: JSON.stringify(payload)
            });

            if (res.ok) {
              setStatusMsg({ type: 'success', text: 'System keys written securely into credentials vault' });
              fetchMaskedAdminSettings();
            } else {
              const err = await res.json();
              setStatusMsg({ type: 'error', text: err.error || 'Failed updating secrets' });
            }
          } catch (err: any) {
            setStatusMsg({ type: 'error', text: err.message || 'Error occurred saving settings' });
          } finally {
            setIsSavingSettings(false);
          }
        }}
        onSubmitPlan={async (planName, priceINR, queriesLimit, description) => {
          const planId = 'plan_' + planName.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const planRef = doc(db, 'plans', planId);

          try {
            await setDoc(planRef, {
              id: planId,
              name: planName,
              priceINR: Number(priceINR),
              queriesLimit: Number(queriesLimit),
              description: description,
              createdAt: serverTimestamp()
            });
            setStatusMsg({ type: 'success', text: `Plan "${planName}" updated successfully` });
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `plans/${planId}`);
          }
        }}
        onDeletePlan={async (id, name) => {
          if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
          try {
            await deleteDoc(doc(db, 'plans', id));
            setStatusMsg({ type: 'success', text: `Plan "${name}" deleted` });
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `plans/${id}`);
          }
        }}
        onSaveUserEdit={async (userId, planId, queriesCount, topupCredits) => {
          try {
            const selectedPlan = systemPlans.find(sp => sp.id === planId) || BOOTSTRAPPED_PLANS.find(sp => sp.id === planId);
            const planName = selectedPlan ? selectedPlan.name : 'Free';

            const userDocRef = doc(db, 'users', userId);
            await updateDoc(userDocRef, {
              planId: planId,
              planName: planName,
              queriesCount: Number(queriesCount),
              topupCredits: Number(topupCredits),
              planExpiresAt: planId === 'plan_free' ? null : (Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            setStatusMsg({ type: 'success', text: `Successfully updated user profile` });
            loadAdminOverview();
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
          }
        }}
        statusMsg={statusMsg}
        setStatusMsg={setStatusMsg}
        loadAdminOverview={loadAdminOverview}
        fetchMaskedAdminSettings={fetchMaskedAdminSettings}
        coupons={coupons}
        onSubmitCoupon={handleCreateCoupon}
        onToggleCoupon={handleToggleCoupon}
        onDeleteCoupon={handleDeleteCoupon}
      />
    );
  }

  return (
    <div className="h-screen bg-[#0A0A0C] flex flex-col md:flex-row font-sans text-gray-200 overflow-hidden">
      
      {/* SIDEBAR FOR DESKTOP - Shown in chat view */}
      <aside className={`w-80 border-r border-[#DFB15F]/15 bg-[#111114]/90 backdrop-blur-md flex-col shrink-0 ${sidebarOpen ? 'fixed inset-0 z-50 flex' : (activeTab === 'chat' ? 'hidden md:flex' : 'hidden')}`}>
        
        {/* Sidebar Header */}
        <div className="h-16 border-b border-gold-900/10 flex items-center justify-between px-5">
          <button
            onClick={() => navigate('home')}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-all text-left focus:outline-none select-none"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#DFB15F] via-[#E9C37A] to-[#B3873B] flex items-center justify-center shadow-[0_0_12px_rgba(223,177,95,0.2)] border border-[#DFB15F]/20 select-none">
              <span className="font-serif text-black font-bold text-sm leading-none">A</span>
            </div>
            <span className="font-serif text-md font-bold tracking-widest text-[#FCF8F2]">
              Aurum<span className="text-[#DFB15F]">.</span>
            </span>
          </button>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {activeTab === 'chat' && (
          <>
            {/* Dynamic New Chat Button */}
            <div className="p-4">
              <button
                onClick={handleStartNewSession}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-gold-600 to-[#DFB15F] hover:from-gold-500 hover:to-gold-400 text-black font-semibold uppercase tracking-wider text-[11px] active:scale-[0.98] transition-all cursor-pointer shadow-[0_4px_15px_rgba(223,177,95,0.12)]"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>New chat</span>
              </button>
            </div>

            {/* Conversations History */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
              <div className="px-2 text-[10px] font-mono font-bold text-gold-500 uppercase tracking-[0.2em] select-none">
                HISTORY
              </div>

              <div className="space-y-1">
                {chatSessions.length === 0 ? (
                  <div className="px-2 py-4 text-xs text-gray-500 font-mono tracking-wider italic uppercase">
                    No active threads
                  </div>
                ) : (
                  chatSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`group relative flex items-center justify-between rounded-lg transition-all truncate ${currentSession?.id === session.id ? 'bg-[#DFB15F]/10 text-gold-300 font-medium border-l-2 border-[#DFB15F]' : 'text-gray-400 hover:bg-[#16161D]/40 hover:text-gray-200'}`}
                    >
                      <button
                        onClick={() => {
                          setCurrentSession(session);
                          setActiveTab('chat');
                          setSidebarOpen(false);
                        }}
                        className="flex-1 text-left px-3.5 py-2.5 text-xs flex items-center gap-3 truncate cursor-pointer bg-transparent"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                        <span className="truncate pr-6">{session.title}</span>
                      </button>
                      
                      {/* Delete button (displays on hover) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.id);
                        }}
                        className="absolute right-2 opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 rounded hover:bg-red-950/20 transition-all cursor-pointer bg-transparent"
                        title="Delete Chat Thread"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-gray-500 hover:text-red-400" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* Minimalist Sidebar Profile details footer */}
        <div className="p-4 border-t border-gold-900/10 bg-[#0E0E10]/50">
          <div className="flex items-center gap-3">
            <img
              src={profile.photoURL || 'https://via.placeholder.com/40'}
              alt={profile.displayName}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full border border-gold-500/20 object-cover"
            />
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-gold-50 truncate">{profile.displayName}</p>
              <p className="text-[9px] font-mono text-gold-400 uppercase tracking-widest">{profile.planName} MEMBER</p>
              {profile.planId !== 'plan_free' && profile.planExpiresAt && profile.planExpiresAt !== 'unlimited' && (
                <p className="text-[9px] font-mono text-gray-500 mt-0.5 tracking-tighter">
                  Renews: {new Date(Number(profile.planExpiresAt)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* COMPANION NAVIGATION HEADER FOR MOBILE */}
      <header className="md:hidden h-16 border-b border-gold-900/20 bg-[#111114] flex items-center justify-between px-4 sticky top-0 z-40">
        <button
          onClick={() => navigate('home')}
          className="flex items-center gap-2.5 hover:text-[#DFB15F] transition-colors cursor-pointer text-left select-none"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#DFB15F] via-[#E9C37A] to-[#B3873B] flex items-center justify-center shadow-[0_0_12px_rgba(223,177,95,0.2)] border border-[#DFB15F]/20 select-none">
            <span className="font-serif text-black font-bold text-sm leading-none">A</span>
          </div>
          <span className="font-serif text-md font-bold tracking-widest text-[#FCF8F2]">
            Aurum<span className="text-[#DFB15F]">.</span>
          </span>
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('pricing')}
            className={`p-2 rounded-lg ${activeTab === 'pricing' ? 'text-gold-300' : 'text-gray-400'}`}
          >
            <CreditCard className="w-5 h-5" />
          </button>
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MAIN VIEWPORT PANES */}
      <main className="flex-1 flex flex-col bg-[#0A0A0C] min-w-0 relative">
        <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(rgba(184,122,33,0.015),transparent)] pointer-events-none" />

        {/* HEADER BAR FOR LOGGED IN USERS */}
        <header className="h-16 md:h-18 border-b border-gold-900/10 bg-[#111114]/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 text-gray-400 hover:text-white cursor-pointer mr-1"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
              <span className="text-gold-300 font-medium font-sans text-sm">
                {activeTab === 'chat' ? (currentSession ? currentSession.title : 'New chat') : activeTab === 'pricing' ? 'Upgrade' : activeTab === 'api' ? 'Developer API' : activeTab === 'sites' ? 'Website Builder' : 'Admin'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Dynamic Credits Badge */}
            <div className="px-3 py-1.5 rounded-full bg-gold-950/40 border border-gold-900/15 flex items-center gap-1.5 text-[11px] text-[#DFB15F] font-mono tracking-wide">
              <Sparkles className="w-3 h-3 text-gold-400 shrink-0" />
              <span>{getProfileQueriesLimit() === -1 ? '✨ ∞' : `✨ ${Math.max(0, (getProfileQueriesLimit() + (profile?.topupCredits || 0)) - (profile?.queriesCount || 0))}`}</span>
            </div>

            {/* Navigation tab links */}
            <button
              onClick={() => {
                setActiveTab('chat');
              }}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer text-xs font-mono ${
                activeTab === 'chat'
                  ? 'border-[#DFB15F] bg-[#DFB15F]/10 text-[#DFB15F]'
                  : 'border-gold-900/10 bg-[#16161A]/40 text-gray-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-gold-400" />
              <span>Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('pricing')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${activeTab === 'pricing' ? 'border-[#DFB15F] bg-[#DFB15F]/10 text-[#DFB15F]' : 'border-gold-900/15 text-gray-400 hover:border-gold-500/40 hover:text-white'}`}
            >
              Upgrade
            </button>

            <button
              onClick={() => setAccountModalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gold-900/10 bg-[#16161A]/40 text-xs font-mono text-gray-400 hover:text-white transition-all cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-gold-400" />
              <span>Account</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('sites');
                setCurrentSession(null);
              }}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer text-xs font-mono ${
                activeTab === 'sites' 
                  ? 'border-[#DFB15F] bg-[#DFB15F]/10 text-[#DFB15F]' 
                  : 'border-gold-900/10 bg-[#16161A]/40 text-gray-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-gold-400" />
              <span>Sites</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('api');
                setCurrentSession(null);
              }}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer text-xs font-mono ${
                activeTab === 'api' 
                  ? 'border-[#DFB15F] bg-[#DFB15F]/10 text-[#DFB15F]' 
                  : 'border-gold-900/10 bg-[#16161A]/40 text-gray-400 hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-gold-400" />
              <span>API</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => navigate('admin')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gold-900/10 bg-[#16161A]/40 text-xs font-mono text-gray-400 hover:text-white hover:border-[#DFB15F]/40 transition-all cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-gold-450" />
                <span>Admin</span>
              </button>
            )}

            {/* Logout icon trigger */}
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg border border-gold-900/10 text-gray-400 hover:text-red-400 hover:bg-red-950/10 cursor-pointer ml-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {activeTx && (
          <div className="bg-gold-950/20 border-b border-gold-800/20 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs z-20">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#DFB15F] shrink-0" />
              <p className="text-gold-200 leading-normal">
                You have an unverified pending Oxapay invoice receipt. Click Verify Status once payment is made.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleVerifyActiveTransaction}
                className="bg-gold-500 hover:bg-gold-400 text-black py-1 px-3 rounded font-semibold transition-all shrink-0 cursor-pointer text-[11px]"
              >
                Verify Receipt Status
              </button>
              <button
                onClick={() => setActiveTx(null)}
                className="text-gray-400 hover:text-gray-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {statusMsg && (
          <div className="p-4 mx-4 mt-4 rounded-lg flex items-start gap-3 text-xs z-10 bg-[#111114] border border-gold-900/15">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#DFB15F] shrink-0 mt-0.5 animate-pulse" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-gray-300 leading-relaxed">{statusMsg.text}</div>
            <button onClick={() => setStatusMsg(null)} className="text-gray-500 hover:text-gray-300 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* CUSTOM WARNING CONFIRMATION MODAL (IMAGE 4) */}
        {showSiteConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-sans">
            <div className="bg-[#111114] border border-[#DFB15F]/15 max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl relative text-left">
              {/* Close Button top-right */}
              <button 
                onClick={() => setShowSiteConfirmModal(false)}
                className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-6 sm:p-8">
                {/* Content with warning icon and title */}
                <div className="flex gap-4">
                  <div className="p-3 bg-amber-500/10 text-[#DFB15F] rounded-xl h-fit border border-amber-500/15">
                    <TriangleAlert className="w-5 h-5 shrink-0" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white tracking-wide">
                      Heads up — this is a premium, full-scale build run!
                    </h3>
                    <div className="space-y-3.5 text-xs text-gray-400 leading-relaxed font-sans font-medium">
                      <p>
                        Building a comprehensive website executes advanced planning schemas, atmospheric design layers, elite layouts, and fully stateful interactive assets just like Lovable and Google AI Studio.
                      </p>
                      <p>
                        This luxurious compilation run will consume <span className="text-[#DFB15F] font-bold font-mono">8 credits</span>.
                      </p>
                      <p>
                        You currently have <span className="text-gray-300 font-bold font-mono">{getProfileQueriesLimit() === -1 ? '✨ ∞' : `${Math.max(0, (getProfileQueriesLimit() + (profile?.topupCredits || 0)) - (profile?.queriesCount || 0))}`}</span> credits available.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Buttons footer bar (Matches Image 4) */}
              <div className="flex justify-end gap-3 px-6 py-4 bg-[#0A0A0C]/60 border-t border-gold-900/15">
                <button
                  type="button"
                  onClick={() => setShowSiteConfirmModal(false)}
                  className="px-5 py-2.5 text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-800/10 rounded-lg border border-gray-800/50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSiteConfirmModal(false);
                    executeSiteGeneration();
                  }}
                  className="bg-gradient-to-r from-[#DFB15F] to-[#ECCF9A] hover:scale-[1.01] active:scale-[0.98] text-black text-xs font-bold px-5 py-2.5 rounded-lg tracking-wide transition-all cursor-pointer"
                >
                  I understand, build it
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM ERROR ALERT MODAL (IMAGE 2) */}
        {siteBuildError && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in leading-normal font-sans">
            <div className="bg-[#1C1417] border border-[#FCB5C5]/10 max-w-md w-full rounded-2xl overflow-hidden shadow-2xl relative text-left">
              <div className="p-6 sm:p-8 space-y-4">
                <div className="font-mono text-[10px] text-gray-500 uppercase tracking-wider select-none">
                  {window.location.hostname || "app.aurum.io"} says
                </div>
                <div className="text-sm text-gray-200 leading-relaxed font-sans font-medium break-words">
                  {siteBuildError}
                </div>
              </div>
              <div className="flex justify-end px-6 py-4 bg-black/20 border-t border-[#FCB5C5]/5">
                <button
                  type="button"
                  onClick={() => setSiteBuildError(null)}
                  className="bg-[#FCB5C5] text-[#1E1114] hover:bg-[#F99EB0] font-bold text-xs tracking-wide py-2 sm:py-2.5 px-6 sm:px-8 rounded-full shadow-lg transition-all cursor-pointer select-none"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SWITCH TABS VIEW */}
        <AnimatePresence mode="wait">
          
          {/* TAB 1: CONVERSATION PLAYGROUND */}
          {activeTab === 'chat' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col h-full min-h-0 relative"
              onPaste={handlePaste}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Drag & Drop Visual Overlay */}
              {isDraggingFile && (
                <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md border-2 border-dashed border-[#DFB15F] rounded-2xl flex flex-col items-center justify-center gap-3 p-6 text-center animate-fade-in pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-gold-950/80 border border-gold-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(223,177,95,0.3)] animate-bounce">
                    <Paperclip className="w-8 h-8 text-[#DFB15F]" />
                  </div>
                  <p className="text-base font-bold text-[#FCF8F2] tracking-wide font-sans">
                    Drop files here to attach
                  </p>
                  <p className="text-xs text-gold-300/80 font-mono">
                    Images & documents will be added as attachments to your message
                  </p>
                </div>
              )}
              {/* Chat Session Area */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-28">
                {!currentSession ? (
                  // Initial Landing Greeting State
                  <div className="max-w-xl mx-auto text-center py-8 md:py-14">
                    <motion.div
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      className="inline-flex items-center justify-center w-16 h-16 bg-gold-950/25 border border-gold-900/20 rounded-full mb-6 shadow-[0_0_35px_rgba(223,177,95,0.08)]"
                    >
                      <Sparkles className="w-8 h-8 text-[#DFB15F]" />
                    </motion.div>
                    
                    <h2 className="font-serif text-3.5xl md:text-4.5xl font-bold tracking-tight text-[#FCF8F2] mb-3 select-none">
                      Ask Aurum anything.
                    </h2>
                    <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed mb-1 select-none">
                      An unrestricted AI assistant. No filters, no lectures — just answers.
                    </p>
                    <p className="text-[10px] font-mono text-gold-400 tracking-[0.25em] uppercase mb-8 select-none">
                      1 credit per message.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-xl mx-auto text-left">
                      {[
                        "Explain quantum entanglement like I'm 12",
                        "Write a Python script that scrapes a webpage",
                        "Give me a 7-day high-protein meal plan",
                        "Brainstorm 5 startup ideas in renewable energy"
                      ].map((prompt, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => setInputMessage(prompt)}
                          className="p-4 rounded-xl border border-gold-900/10 bg-[#111114]/40 hover:bg-gold-500/5 hover:border-gold-500/30 text-xs text-gray-300 leading-relaxed transition-all text-left cursor-pointer group"
                        >
                          <p className="font-sans font-medium group-hover:text-[#DFB15F]">{prompt}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Chat Log View
                  <div className="max-w-3xl mx-auto space-y-6">
                    {currentSession.messages.map((msg, idx) => (
                      <div
                        key={msg.timestamp ? `${msg.role}_${msg.timestamp}_${idx}` : `msg_${idx}`}
                        className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role !== 'user' && (
                          <div className="w-8 h-8 rounded-full bg-gold-900/20 border border-gold-800/40 flex items-center justify-center shrink-0">
                            <Sparkles className="w-4 h-4 text-gold-400" />
                          </div>
                        )}

                        <div className={`max-w-[85%] rounded-lg px-4 py-3.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#DFB15F] text-black font-medium' : msg.role === 'system' ? 'bg-[#1A1110] border border-red-950 text-red-300 font-mono text-xs' : 'bg-[#111114] border border-gold-900/10 text-gray-200'}`}>
                          {msg.role === 'system' ? (
                            <div>{msg.content}</div>
                          ) : msg.role === 'assistant' && msg.content === '' && chatGenerating ? (
                            <div className="flex items-center gap-2.5 text-xs font-mono text-gold-400 py-1">
                              <Loader2 className="w-3.5 h-3.5 text-[#DFB15F] animate-spin" />
                              <span className="animate-pulse text-[#DFB15F] tracking-wide">Aurum is designing response...</span>
                              <span className="inline-block w-2 h-4 bg-[#DFB15F] animate-pulse ml-0.5 align-middle rounded-xs" />
                            </div>
                          ) : (
                            <div className="prose prose-invert prose-xs max-w-none font-sans whitespace-pre-wrap relative">
                              {msg.content === '' ? (
                                <span className="text-red-400 font-mono text-xs">⚠️ No response generated. Please try again.</span>
                              ) : (
                                renderMessageContent(msg.content)
                              )}
                              {msg.role === 'assistant' && idx === currentSession.messages.length - 1 && chatGenerating && (
                                <span className="inline-block w-2 h-4 bg-[#DFB15F] animate-pulse ml-1 align-middle rounded-xs shadow-[0_0_8px_#DFB15F]" />
                              )}
                            </div>
                          )}
                          <div className={`text-[9px] mt-1.5 ${msg.role === 'user' ? 'text-black/60 font-mono' : 'text-gray-500 font-mono text-right'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {msg.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-[#DFB15F] flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-black" />
                          </div>
                        )}
                      </div>
                    ))}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Chat Input form container */}
              <div className="p-4 border-t border-gold-900/10 bg-[#111114]/50 hover:border-gold-900/20 sticky bottom-0 z-20">
                <div className="max-w-3xl mx-auto space-y-3">
                  
                  {/* Badge button: Create images & file attachments list */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* Mode Level Selector Pills */}
                      <div className="flex items-center gap-0.5 p-0.5 bg-black/60 border border-gold-900/20 rounded-full shadow-inner select-none">
                        <button
                          type="button"
                          onClick={() => setChatMode('default')}
                          className={`px-3 py-0.5 text-[10px] font-mono rounded-full cursor-pointer transition-all ${
                            chatMode === 'default'
                              ? 'bg-[#DFB15F] text-black font-bold shadow-sm'
                              : 'text-gray-400 hover:text-gold-200'
                          }`}
                          title="Default Mode"
                        >
                          Default
                        </button>
                        <button
                          type="button"
                          onClick={() => setChatMode('fast')}
                          className={`px-3 py-0.5 text-[10px] font-mono rounded-full cursor-pointer transition-all ${
                            chatMode === 'fast'
                              ? 'bg-[#DFB15F] text-black font-bold shadow-sm'
                              : 'text-gray-400 hover:text-gold-200'
                          }`}
                          title="Fast Mode"
                        >
                          Fast
                        </button>
                        <button
                          type="button"
                          onClick={() => setChatMode('writing')}
                          className={`px-3 py-0.5 text-[10px] font-mono rounded-full cursor-pointer transition-all ${
                            chatMode === 'writing'
                              ? 'bg-[#DFB15F] text-black font-bold shadow-sm'
                              : 'text-gray-400 hover:text-gold-200'
                          }`}
                          title="Writing Mode"
                        >
                          Writing
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setImageMode(!imageMode)}
                        className={`px-3 py-1 text-[10px] font-mono rounded-full flex items-center gap-1.5 cursor-pointer shadow-sm select-none transition-all duration-300 border ${
                          imageMode 
                            ? 'bg-gold-500/20 border-[#DFB15F]/70 text-[#FCF8F2] font-semibold ring-1 ring-[#DFB15F]/35' 
                            : 'bg-gold-950/40 border-gold-900/20 hover:bg-gold-900/30 hover:border-[#DFB15F]/40 text-gold-300'
                        }`}
                        title={imageMode ? "Deactivate Image model mode" : "Activate Image model mode"}
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${imageMode ? 'text-[#DFB15F] animate-spin' : 'text-gold-400'}`} />
                        <span>{imageMode ? 'Image Mode Active' : 'Create images'}</span>
                      </button>

                      {attachments.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setAttachments([])}
                          className="text-[9px] font-mono text-rose-400 hover:text-rose-300 transition-all cursor-pointer border border-rose-950/40 bg-rose-950/15 px-2.5 py-0.5 rounded-full"
                        >
                          Clear all ({attachments.length})
                        </button>
                      )}

                      {imageMode && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 p-0.5 bg-black/40 border border-gold-900/10 rounded-full">
                            <button
                              type="button"
                              onClick={() => setImageCount(1)}
                              className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono transition-all cursor-pointer ${imageCount === 1 ? 'bg-[#DFB15F]/20 text-gold-200 font-semibold shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            >
                              1 Image (5 Cr)
                            </button>
                            <button
                              type="button"
                              onClick={() => setImageCount(2)}
                              className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono transition-all cursor-pointer ${imageCount === 2 ? 'bg-[#DFB15F]/20 text-gold-200 font-semibold shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            >
                              2 Images (10 Cr)
                            </button>
                          </div>
                          <span className="text-[10px] font-mono text-amber-400/90 bg-amber-950/30 border border-amber-800/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            Image generation might be slow as it is under beta
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Renders list of attached document badges styled cleanly */}
                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-1.5 bg-black/40 border border-gold-900/10 rounded-xl max-w-full">
                        {attachments.map((file, fileIdx) => {
                          const sizeStr = file.size > 1024 * 1024
                            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                            : `${(file.size / 1024).toFixed(0)} KB`;
                          return (
                            <div 
                              key={fileIdx}
                              className="flex items-center gap-1.5 bg-[#111114] border border-gold-900/20 px-2 py-0.5 rounded text-[10px] font-mono text-gray-300 shadow-sm animate-fade-in"
                            >
                              <Paperclip className="w-2.5 h-2.5 text-gold-400" />
                              <span className="truncate max-w-[130px]" title={file.name}>{file.name}</span>
                              <span className="text-[8px] text-gray-500">({sizeStr})</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(fileIdx)}
                                className="text-gray-500 hover:text-red-400 cursor-pointer p-0.5 font-bold"
                                title="Remove file"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSendMessage} className="relative bg-[#0A0A0C] border border-gold-900/20 focus-within:border-[#DFB15F]/60 rounded-xl flex items-center transition-all p-1">
                    {/* Hidden input for media attachments selection */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      multiple
                      onChange={handleFileChange}
                    />

                    {/* Attachment trigger paperclip representation */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 text-gray-400 hover:text-[#DFB15F] cursor-pointer flex items-center justify-center shrink-0"
                      title="Attach documents"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder={
                        imageMode 
                          ? "Describe the visual asset to construct..." 
                          : "Ask Aurum anything..."
                      }
                      className="flex-1 bg-transparent border-0 px-2.5 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-0 font-sans"
                      disabled={chatGenerating}
                    />

                    {/* Send button */}
                    <button
                      type="submit"
                      className="bg-[#DFB15F] hover:bg-gold-400 text-black py-2.5 px-3.5 rounded-lg shrink-0 font-mono font-bold transition-all disabled:opacity-30 hover:scale-[1.01] active:scale-[0.98] cursor-pointer flex items-center justify-center mr-1"
                      disabled={chatGenerating || !inputMessage.trim()}
                    >
                      <Send className="w-3.5 h-3.5 text-black" />
                    </button>
                  </form>

                  {/* Input bottom tags footer */}
                  <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 uppercase tracking-widest px-1">
                    <div className="flex items-center gap-1.5 select-none">
                      <span>⏎ send</span>
                      <span>·</span>
                      <span>📎 image/PDF/code</span>
                      <span>·</span>
                      <span className="text-[#DFB15F]/75 animate-pulse">
                        {imageMode ? "IMAGE MODE ENGAGED" : "type 'draw...' or toggle Mode"}
                      </span>
                    </div>
                    <div>
                      <span>{(profile?.queriesCount || 0)} / {getProfileQueriesLimit() === -1 ? '∞' : (getProfileQueriesLimit() + (profile?.topupCredits || 0))} CR</span>
                    </div>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 2: MEMBERSHIP & PLANS */}
          {activeTab === 'pricing' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full py-10"
            >
              {selectedCheckoutPlan ? (
                /* CHECKOUT VIEW */
                <div className="max-w-4xl mx-auto">
                  {/* Back button */}
                  <button
                    onClick={() => {
                      setSelectedCheckoutPlan(null);
                      setCouponCode('');
                      setAppliedDiscount(0);
                      setCouponSuccess(null);
                      setCouponError(null);
                    }}
                    className="flex items-center gap-2 text-xs text-gray-400 hover:text-[#DFB15F] transition-colors uppercase tracking-widest font-mono mb-8 group cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                    <span>Back to plans</span>
                  </button>

                  {/* Header */}
                  <div className="mb-10 text-left">
                    <h2 className="font-serif text-3xl sm:text-4xl font-normal text-white tracking-tight mb-2 select-none">
                      Complete your <span className="text-[#DFB15F] italic font-serif">order.</span>
                    </h2>
                    <p className="text-xs text-gray-400 tracking-wide font-mono uppercase">
                      Invoice desk · Secure blockchain settlement
                    </p>
                  </div>

                  {/* Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Plan & Payment Method */}
                    <div className="lg:col-span-7 space-y-6 text-left">
                      
                      {/* Product Card */}
                      <div className="bg-[#111114]/60 border border-gold-900/20 rounded-xl p-6 relative overflow-hidden shadow-xl">
                        {/* Aurum aesthetic ambient aura */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-gold-500/5 rounded-full blur-2xl" />
                        
                        <div className="flex items-start justify-between mb-4">
                          <div className="space-y-1.5 font-serif">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-[#DFB15F]" />
                              <h3 className="text-xl font-bold text-gold-50 tracking-wide">{selectedCheckoutPlan.name}</h3>
                            </div>
                            <p className="text-xs text-gray-400">Authorized capability tier</p>
                          </div>
                          
                          <span className="bg-gold-950/40 text-[#DFB15F] font-mono text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border border-gold-500/35">
                            Subscription
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1.5 mb-5 border-b border-gold-900/10 pb-4">
                          <span className="font-mono text-3xl font-bold text-gold-100">₹{selectedCheckoutPlan.priceINR}</span>
                          <span className="text-xs text-gray-500 font-mono">
                            {selectedCheckoutPlan.id.startsWith('topup_') ? '/ one-time pack' : '/ month'}
                          </span>
                        </div>

                        {/* Checklist */}
                        <div className="space-y-3 text-xs text-gray-300 text-left">
                          <p className="text-gray-400 italic mb-2 leading-relaxed">{selectedCheckoutPlan.description}</p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full bg-gold-950/40 border border-gold-900/30 flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5 text-[#DFB15F]" />
                              </div>
                              <span className="font-mono text-[11px]">
                                {selectedCheckoutPlan.queriesLimit === -1 ? 'Unlimited' : `${selectedCheckoutPlan.queriesLimit}`} queries limit
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full bg-gold-950/40 border border-gold-900/30 flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5 text-[#DFB15F]" />
                              </div>
                              <span className="text-[11px]">High-priority prompt queue</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full bg-gold-950/40 border border-gold-900/30 flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5 text-[#DFB15F]" />
                              </div>
                              <span className="text-[11px]">Advanced image generation</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full bg-gold-950/40 border border-gold-900/30 flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5 text-[#DFB15F]" />
                              </div>
                              <span className="text-[11px]">24/7 dedicated support priority</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payment Method section */}
                      <div className="bg-[#111114]/40 border border-gold-900/10 rounded-xl p-6 space-y-4">
                        <div className="flex items-center gap-2 text-gold-200">
                          <CreditCard className="w-4 h-4 text-[#DFB15F]" />
                          <h4 className="font-serif text-sm font-bold tracking-widest uppercase">Payment method</h4>
                        </div>
                        
                        <div className="space-y-3">
                          {/* Option 1: Oxapay */}
                          <div
                            onClick={() => setCheckoutPaymentMethod('oxapay')}
                            className={`flex items-center justify-between p-4 bg-[#0A0A0C] border rounded-lg cursor-pointer transition-all ${checkoutPaymentMethod === 'oxapay' ? 'border-[#DFB15F] bg-[#DFB15F]/5 shadow-sm' : 'border-gold-900/10 hover:border-gold-500/25'}`}
                          >
                            <div className="flex items-center gap-3 text-left">
                              <div className="text-[#DFB15F] bg-[#DFB15F]/10 p-2 rounded-md">
                                <Bitcoin className="w-5 h-5 text-[#DFB15F]" />
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-semibold text-gold-100">OxaPay - Crypto Assets</p>
                                <p className="text-[10px] text-gray-400">Pay with BTC, ETH, USDT, TRX, LTC & more</p>
                              </div>
                            </div>

                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${checkoutPaymentMethod === 'oxapay' ? 'border-[#DFB15F]' : 'border-gray-700'}`}>
                              {checkoutPaymentMethod === 'oxapay' && (
                                <div className="w-2 h-2 rounded-full bg-[#DFB15F]" />
                              )}
                            </div>
                          </div>

                          {/* Option 2: Card / UPI */}
                          <div className="flex items-center justify-between p-4 bg-[#08080A] border border-gray-900/50 rounded-lg opacity-50 cursor-not-allowed">
                            <div className="flex items-center gap-3 text-left">
                              <div className="text-gray-500 bg-gray-950 p-2 rounded-md">
                                <CreditCard className="w-5 h-5 text-gray-500" />
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-semibold text-gray-500">Card & UPI Payments</p>
                                <p className="text-[10px] text-gray-500">Indian Debit/Credit Card or UPI payments</p>
                              </div>
                            </div>
                            <div className="w-4 h-4 rounded-full border border-gray-800 flex items-center justify-center">
                              <span className="text-[8px] font-mono font-bold text-gray-600 font-sans tracking-wide">SOON</span>
                            </div>
                          </div>
                        </div>

                        <p className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono text-left">
                          <Lock className="w-3 h-3 text-gold-500/50" />
                          <span>Payments processed securely. Transactions require standard consensus block confirmation.</span>
                        </p>
                      </div>

                    </div>

                    {/* Right Column: Order Summary */}
                    <div className="lg:col-span-5 text-left">
                      <div className="bg-[#0E0E11] border border-gold-900/20 rounded-xl p-6 space-y-6 shadow-2xl sticky top-24">
                        <h4 className="font-serif text-sm font-bold tracking-widest text-[#DFB15F] uppercase border-b border-gold-900/10 pb-3">
                          Order summary
                        </h4>

                        {/* Calculations */}
                        <div className="space-y-3.5 text-xs text-left">
                          <div className="flex justify-between text-gray-400">
                            <span>{selectedCheckoutPlan.name} Subscription</span>
                            <span className="font-mono text-gold-50">₹{selectedCheckoutPlan.priceINR.toFixed(2)}</span>
                          </div>

                          {/* Coupon Code Output */}
                          {appliedDiscount > 0 && (
                            <div className="flex justify-between text-red-400 font-mono text-[11px]">
                              <span>Coupon Discount (-{Math.round(appliedDiscount * 100)}%)</span>
                              <span>-₹{(selectedCheckoutPlan.priceINR * appliedDiscount).toFixed(2)}</span>
                            </div>
                          )}

                          <div className="border-t border-gold-900/10 pt-3 flex justify-between items-baseline">
                            <span className="text-sm font-semibold text-white">Total</span>
                            <span className="font-mono text-xl font-bold text-[#DFB15F]">
                              ₹{Math.max(0, selectedCheckoutPlan.priceINR - Math.round(selectedCheckoutPlan.priceINR * appliedDiscount)).toFixed(2)}
                            </span>
                          </div>
                          
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono text-right font-semibold">
                            currency: INR
                          </p>
                        </div>

                        {/* COUPON INPUT AREA */}
                        <div className="border-t border-[#DFB15F]/20 pt-5 space-y-2 text-left">
                          <label className="block text-[10px] font-mono tracking-wider text-gold-300 font-semibold uppercase">
                            HAVE A COUPON?
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value)}
                              placeholder="ENTER CODE (e.g. FREE)"
                              className="bg-[#050507] border border-gold-900/20 focus:border-[#DFB15F]/40 focus:outline-[#DFB15F]/20 rounded-lg py-2 px-3 text-xs w-full text-gold-100 font-mono placeholder-gray-600 uppercase"
                            />
                            <button
                              type="button"
                              onClick={handleApplyCoupon}
                              className="bg-[#16161A] hover:bg-gold-500/10 border border-gold-900/30 text-[#DFB15F] font-mono text-xs font-semibold px-4 rounded-lg cursor-pointer transition-all active:scale-[0.98]"
                            >
                              Apply
                            </button>
                          </div>

                          {/* Coupon validations */}
                          {couponError && (
                            <p className="text-[11px] text-red-400 font-mono leading-tight">{couponError}</p>
                          )}
                          {couponSuccess && (
                            <p className="text-[11px] text-green-400 font-mono leading-tight">{couponSuccess}</p>
                          )}
                        </div>

                        {/* Submit Button */}
                        <div className="space-y-4 pt-2">
                          {(() => {
                            const finalPrice = Math.max(0, selectedCheckoutPlan.priceINR - Math.round(selectedCheckoutPlan.priceINR * appliedDiscount));
                            const isFreeOrder = finalPrice === 0;

                            return (
                              <button
                                type="button"
                                disabled={isActivatingFreeFlow || isBillingLoading}
                                onClick={() => {
                                  if (isFreeOrder) {
                                    handleActivatePlanViaOrder(selectedCheckoutPlan);
                                  } else {
                                    handleInitiateUpgrade(selectedCheckoutPlan.id);
                                  }
                                }}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gold-600 via-[#ECD3A3] to-gold-500 hover:from-gold-500 hover:to-gold-400 active:scale-[0.98] text-black text-xs font-bold py-3.5 rounded-lg cursor-pointer transition-all disabled:opacity-50 tracking-wider font-sans uppercase"
                              >
                                {isActivatingFreeFlow || isBillingLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                                ) : isFreeOrder ? (
                                  <>
                                    <span>Activate Plan (Free)</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </>
                                ) : (
                                  <>
                                    <span>Pay ₹{finalPrice.toFixed(2)}</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </>
                                )}
                              </button>
                            );
                          })()}


                        </div>

                        <p className="text-[10px] text-gray-500 leading-relaxed pt-2 text-center select-none font-mono">
                          By continuing you agree to our terms. Credits renew daily at 00:00 IST.
                        </p>

                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                /* SYSTEM PLANS SELECTION GRID (ORIGINAL UPGRADE SHEET) */
                <>
                  <div className="text-center max-w-xl mx-auto mb-12 animate-fade-in">
                     <h2 className="font-serif text-3xl font-bold tracking-widest text-[#FCF8F2] mb-3 uppercase">SELECT PLANS</h2>
                     <p className="text-sm text-gray-400">
                        Choose an authorization level to expand maximum credits caps immediately. Plans are monthly subscription tiers (will downgrade to the free tier if not renewed within a month).
                     </p>
                  </div>

                  {/* Plans Catalog */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left">
                     {systemPlans.map((planObj) => {
                       const currentPlanId = profile?.planId || 'plan_free';
                       const isActive = currentPlanId === planObj.id;

                       // Find active plan details to get active price
                       const activePlanDetails = (systemPlans.length > 0 ? systemPlans : BOOTSTRAPPED_PLANS).find(p => p.id === currentPlanId) || BOOTSTRAPPED_PLANS.find(p => p.id === currentPlanId);
                       const activePlanPrice = activePlanDetails ? activePlanDetails.priceINR : 0;
                       const isLowerTier = !isActive && planObj.priceINR < activePlanPrice;

                       return (
                         <div
                           key={planObj.id}
                           className={`rounded-xl border p-6 flex flex-col justify-between relative overflow-hidden bg-[#111114]/50 transition-all ${isActive ? 'border-gold-400 shadow-[0_4px_24px_rgba(223,177,95,0.15)] ring-1 ring-gold-400' : 'border-gold-900/25 hover:border-gold-700/50'}`}
                         >
                           {isActive && (
                             <div className="absolute top-3 right-3 bg-gold-950 text-gold-300 font-mono text-[9px] font-semibold px-2 py-0.5 rounded border border-gold-500/50 uppercase tracking-widest">
                               Active
                             </div>
                           )}

                           <div>
                             <h3 className="font-serif text-xl font-bold text-gold-50 mb-1">{planObj.name}</h3>
                             <div className="flex items-baseline gap-1.5 mb-4 font-serif">
                               <span className="font-mono text-2xl font-bold text-gold-100">₹{planObj.priceINR}</span>
                               <span className="text-xs text-gray-500">/ month</span>
                             </div>
                             <p className="text-xs text-gray-400 min-h-[50px] leading-relaxed mb-6">{planObj.description}</p>
                           </div>

                           <div className="space-y-4">
                             <div className="bg-[#0A0A0C] rounded-lg p-3 text-xs flex justify-between items-center border border-gold-900/10">
                               <span className="text-gray-400">Queries Limit:</span>
                               <span className="font-mono font-semibold text-gold-100">
                                 {planObj.queriesLimit >= 99999 ? 'Unlimited Priority Credits' : `${planObj.queriesLimit} Priority Credits / Day, then Unlimited`}
                               </span>
                             </div>

                             {isActive ? (
                               <div className="w-full text-center text-xs py-2.5 font-semibold font-mono text-gold-400 border border-gold-500/30 rounded-lg uppercase tracking-wide bg-gold-950/20">
                                 Tier Active
                               </div>
                             ) : isLowerTier ? (
                               <div className="w-full text-center text-xs py-2.5 font-semibold font-mono text-gray-500 border border-gray-900 rounded-lg uppercase tracking-wide bg-gray-900/40 select-none cursor-not-allowed">
                                 Downgrade Restricted
                               </div>
                             ) : (
                               <button
                                 onClick={() => setSelectedCheckoutPlan(planObj)}
                                 className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gold-600 via-[#EDC480] to-[#DFB15F] hover:from-gold-500 hover:to-gold-400 active:scale-[0.98] text-black text-xs font-bold py-2.5 rounded-lg cursor-pointer transition-all font-sans uppercase tracking-widest"
                               >
                                 {activePlanPrice > 0 ? 'UPGRADE' : 'BUY'}
                               </button>
                             )}
                           </div>
                         </div>
                       );
                     })}
                  </div>

                  {/* Top Up Quota section */}
                  <div className="text-center max-w-xl mx-auto mb-8 mt-14 text-center">
                    <h2 className="font-serif text-2xl font-bold tracking-widest text-gold-200 mb-2 uppercase select-none">Top-Up Quota Credits</h2>
                    <p className="text-xs text-gray-500 text-center">
                      Inject non-expiring queries directly into your active account. Select pack to buy.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left">
                    {[
                      { id: 'topup_starter', name: 'Starter Pack', priceINR: 10, queriesLimit: 100, description: 'Ideal for light testing or quick query sessions.' },
                      { id: 'topup_power', name: 'Power Pack', priceINR: 40, queriesLimit: 500, description: 'Most popular bundle for advanced study and production.' },
                      { id: 'topup_pro', name: 'Pro Pack', priceINR: 100, queriesLimit: 1500, description: 'Maximum value. Built for developers with high volume workloads.' }
                    ].map((pack) => (
                      <div
                        key={pack.id}
                        className="rounded-xl border border-gold-900/15 p-5 flex flex-col justify-between bg-gradient-to-b from-[#111114]/55 to-[#0A0A0C]/40 hover:border-gold-500/30 transition-all group"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-serif text-lg font-bold text-gold-100 group-hover:text-gold-300 transition-colors">{pack.name}</span>
                            <span className="text-[10px] font-mono bg-gold-950 text-gold-400 px-2 py-0.5 rounded border border-gold-900/40 uppercase font-semibold">Topup</span>
                          </div>
                          <div className="flex items-baseline gap-1 mb-3">
                            <span className="font-mono text-xl font-bold text-gold-100">₹{pack.priceINR}</span>
                            <span className="text-[10px] text-gray-500">/ one-time pack</span>
                          </div>
                          <p className="text-[11px] text-gray-400 leading-relaxed mb-5 min-h-[40px]">{pack.description}</p>
                        </div>

                        <div className="space-y-4">
                          <div className="bg-[#0A0A0C] rounded-lg p-2.5 text-xs flex justify-between items-center border border-gold-900/10 font-mono">
                            <span className="text-gray-500 text-[10.5px]">Credits Added:</span>
                            <span className="font-semibold text-gold-300 font-mono">+{pack.queriesLimit} credits</span>
                          </div>

                          <button
                            onClick={() => setSelectedCheckoutPlan(pack as any)}
                            className="w-full flex items-center justify-center gap-1.5 bg-[#16161A] hover:bg-gold-500/10 border border-gold-900/30 text-[#DFB15F] text-[11px] font-mono font-bold py-2 rounded-lg cursor-pointer transition-all uppercase tracking-wider"
                          >
                            BUY
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Explainer card */}
                  <div className="bg-[#111114]/30 border border-gold-900/15 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-5 text-gray-400 text-xs shadow-sm">
                    <div className="flex gap-4 items-start text-left">
                      <div className="p-3 rounded-full bg-gold-950/35 border border-gold-900/20 shrink-0 text-[#DFB15F]">
                        <Info className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 text-left">
                        <p className="font-serif font-semibold text-gold-200 text-sm">How do purchases behave?</p>
                        <p className="leading-relaxed text-[#8a8a93]">
                          Click BUY to select any subscription tier or credit refill pack. On the Complete Order summary desk, you can input discount coupons to get plans for free, select payment routes, and initialize transaction hooks.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* TAB: DEVELOPER API DASHBOARD */}
          {activeTab === 'api' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full py-10 space-y-8 text-left"
            >
              <div className="border-b border-gold-900/20 pb-5">
                <h2 className="font-serif text-3xl font-bold tracking-widest text-[#FCF8F2] uppercase flex items-center gap-3 select-none">
                  <Key className="w-8 h-8 text-[#DFB15F]" />
                  <span>Developer APIs</span>
                </h2>
                <p className="text-xs text-gray-400 font-mono tracking-wider mt-1 uppercase select-none">
                  Deploy custom AI gateway microservice micro-backends in one click
                </p>
              </div>

              {/* Developer Keys & Header details capsule */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Panel: API Key Manager */}
                <div className="md:col-span-1 bg-[#111114]/50 border border-gold-900/25 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Key className="w-5 h-5 text-[#DFB15F]" />
                      <h3 className="text-xs font-mono font-bold text-gold-400 uppercase tracking-widest select-none">API Access Keys</h3>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed text-left">
                      Use your Aurum credits programmatically. Each request consumes 1 credit. Available on plans with medium or high priority credits.
                    </p>

                    {/* Create Key Form */}
                    <form onSubmit={handleCreateApiKey} className="space-y-2 text-left">
                      <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider select-none">Create New Secret Key</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="Key name (e.g. Production)"
                          className="flex-1 min-w-0 bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-gold-500"
                        />
                        <button
                          type="submit"
                          className="px-3 py-2 bg-[#DFB15F] hover:bg-gold-500 text-black text-xs font-bold rounded-lg cursor-pointer transition-colors whitespace-nowrap active:scale-95"
                        >
                          + Create
                        </button>
                      </div>
                    </form>

                    {/* Highlighted Newly Created Key banner */}
                    {revealKey && (
                      <div className="p-3 bg-gold-950/30 border border-gold-500/30 rounded-xl space-y-1.5 animate-fade-in text-xs text-left">
                        <p className="font-extrabold text-[#DFB15F] flex items-center gap-1.5 text-[11px] uppercase tracking-wide select-none">
                          ⚠️ Copy Secret Key
                        </p>
                        <p className="text-gray-400 text-[10px] leading-normal select-none">
                          For security, this secret key is shown ONLY once at creation. Copy and store it securely.
                        </p>
                        <div className="bg-[#0A0A0C] border border-gold-500/20 px-2.5 py-1.5 rounded font-mono text-[10.5px] select-all break-all flex items-center justify-between gap-1 shadow-inner text-gold-300">
                          <span className="truncate pr-1">{revealKey}</span>
                          <CopyButton text={revealKey} />
                        </div>
                      </div>
                    )}

                    {/* Active Keys Indices */}
                    <div className="space-y-2 border-t border-gold-900/10 pt-3">
                      <h4 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider select-none text-left">Your Active Keys</h4>
                      
                      {apiKeysLoading ? (
                        <div className="flex items-center gap-1.5 py-3 text-xs text-gray-500 font-mono">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#DFB15F]" />
                          <span>Syncing keys...</span>
                        </div>
                      ) : userApiKeys.length === 0 ? (
                        <div className="py-5 text-center text-[10px] text-gray-500 font-mono italic border border-dashed border-gold-900/5 rounded-xl bg-black/10 select-none">
                          NO ACTIVE SECRET KEYS
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                          {userApiKeys.map((kObj) => (
                            <div key={kObj.id} className="bg-[#0A0A0C]/50 border border-gold-900/10 p-2.5 rounded-lg flex items-center justify-between gap-3 text-left">
                              <div className="flex-1 min-w-0 font-mono">
                                <p className="text-xs font-bold text-gray-300 truncate font-sans">{kObj.name}</p>
                                <p className="text-[10.5px] text-[#DFB15F] truncate select-all">{kObj.keyMasked}</p>
                                <p className="text-[9px] text-gray-500 mt-0.5 select-none">
                                  Created: {new Date(kObj.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <button
                                onClick={() => handleDeleteApiKey(kObj.id)}
                                className="p-1 rounded hover:bg-rose-950/15 text-gray-500 hover:text-red-400 cursor-pointer border border-transparent hover:border-rose-950/20 transition-all shrink-0 active:scale-90"
                                title="Revoke Key Access"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fallback Legacy Key details */}
                  <div className="bg-[#0A0A0C]/40 p-2.5 border border-dashed border-gold-900/10 rounded-lg text-left text-[10.5px] text-gray-400 font-mono">
                    <p className="font-extrabold text-[#DFB15F] uppercase text-[9px] tracking-wider select-none mb-1">Standard Token:</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate pr-1">aurum_live_{profile?.id}</span>
                      <CopyButton text={`aurum_live_${profile?.id}`} />
                    </div>
                  </div>
                </div>

                {/* Right Panel (colspan=2): Create custom microservice API */}
                <div className="md:col-span-2 bg-[#111114]/50 border border-gold-900/25 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono font-bold text-gold-400 uppercase tracking-widest select-none">Register custom microservice API</h3>
                    <form onSubmit={handleCreateApi} className="space-y-3 text-left">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">API Slug / Name</label>
                          <input
                            type="text"
                            required
                            value={newApiName}
                            onChange={(e) => setNewApiName(e.target.value)}
                            placeholder="e.g. sentiment-analyzer"
                            className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-gold-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">User Query Instruction Prefix</label>
                          <input
                            type="text"
                            value={newApiUserPrompt}
                            onChange={(e) => setNewApiUserPrompt(e.target.value)}
                            placeholder="Classify sentiment of input:"
                            className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-gold-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Service Persona System Prompt Override</label>
                        <textarea
                          value={newApiSysPrompt}
                          onChange={(e) => setNewApiSysPrompt(e.target.value)}
                          placeholder="You are an expert NLP sentiment analyzer microserver. Return ONLY sentiment: positive / negative."
                          rows={2}
                          className="w-full bg-[#0A0A0C] border border-[#DFB15F]/15 focus:border-[#DFB15F] rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none resize-none font-mono"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!newApiName.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-gold-600 to-[#DFB15F] hover:from-gold-500 hover:to-gold-400 text-black text-xs font-semibold rounded-lg uppercase tracking-wider shadow-sm transition-all cursor-pointer active:scale-95"
                      >
                        Deploy Endpoint
                      </button>
                    </form>
                  </div>

                  <div className="border border-gold-900/10 p-3 rounded-lg bg-black/10 text-[10px] text-gray-400 leading-relaxed text-left font-mono">
                    💡 <strong className="text-[#DFB15F]">Microservices Overview:</strong> Deploy fully self-contained pipeline agents instantly. Once mapped, query endpoint programmatically using custom API key via <code>GET/POST /api/v1/execute/:apiId</code>.
                  </div>
                </div>
              </div>

              {/* Active User APIs list endpoints */}
              <div className="bg-[#111114]/50 border border-gold-900/25 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-mono font-bold text-gold-400 uppercase tracking-widest select-none text-left">Active microservice endpoints</h3>
                
                {apiListLoading ? (
                  <div className="flex items-center justify-center p-8 text-center text-xs text-gray-500 font-mono uppercase tracking-widest gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#DFB15F]" />
                    <span>Querying active gateway channels...</span>
                  </div>
                ) : developerApis.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 font-mono tracking-wider italic uppercase bg-black/10 border border-dashed border-gold-900/10 rounded-xl select-none">
                    NO CUSTOM ENDPOINTS DEPLOYED
                  </div>
                ) : (
                  <div className="space-y-3">
                    {developerApis.map((apiItem) => {
                      const executeUrl = `${window.location.origin}/api/v1/execute/${apiItem.id}`;
                      return (
                        <div key={apiItem.id} className="bg-black/20 border border-gold-900/10 p-4 rounded-xl flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="space-y-2 flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gold-200">/{apiItem.name}</span>
                              <span className="text-[9px] bg-gold-950 text-gold-400 px-1.5 py-0.5 rounded border border-gold-900/30 uppercase tracking-widest font-mono">POST</span>
                            </div>
                            <div className="font-mono text-[10px] text-gray-400 select-all p-2 bg-[#0A0A0C] border border-gold-900/5 rounded flex justify-between items-center whitespace-nowrap overflow-x-auto">
                              <span className="truncate pr-4 select-all text-[#DFB15F]">{executeUrl}</span>
                              <CopyButton text={executeUrl} />
                            </div>
                            <div className="text-[10px] text-gray-500 space-y-1">
                              <p><span className="text-gray-400">System block:</span> <code>{apiItem.systemPrompt}</code></p>
                              {apiItem.userPrompt && <p><span className="text-gray-400">Prefix template:</span> <code>{apiItem.userPrompt}</code></p>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-start">
                            <button
                              onClick={() => {
                                const activeHeaderKey = revealKey || `aurum_live_${profile?.id}`;
                                const sampleCurl = `curl -X POST "${executeUrl}" \\\n  -H "Authorization: Bearer ${activeHeaderKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"input": "YOUR_SAMPLE_QUERY"}'`;
                                navigator.clipboard.writeText(sampleCurl);
                                alert("Sample CURL command copied to clipboard!");
                              }}
                              className="px-2.5 py-1 rounded bg-[#16161A] text-gray-400 hover:text-white border border-gold-900/15 text-[10px] font-mono cursor-pointer transition-colors"
                              title="Copy Curl template"
                            >
                              cURL Command
                            </button>
                            <button
                              onClick={() => handleDeleteApi(apiItem.id)}
                              className="p-1.5 rounded hover:bg-rose-950/15 text-gray-500 hover:text-red-400 cursor-pointer border border-transparent hover:border-rose-950"
                              title="Revoke Endpoint Access"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick start & Developer Documentation segment */}
              <div className="bg-[#111114]/50 border border-gold-900/25 rounded-2xl p-6 space-y-6">
                <div className="border-b border-gold-900/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-left">
                    <h3 className="text-sm font-sans font-extrabold text-[#FCF8F2] tracking-wider uppercase select-none flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-gold-400 animate-pulse" />
                      <span>Quick Start Documentation</span>
                    </h3>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5 uppercase tracking-wide">OpenAI-Compatible completions API</p>
                  </div>
                  <span className="self-start sm:self-center px-2 py-0.5 rounded bg-emerald-950/40 text-[9.5px] font-mono text-emerald-400 border border-emerald-900/30 uppercase tracking-widest font-semibold select-none">
                    Status: v1 Gateway Online
                  </span>
                </div>

                {/* Base URL Endpoint container */}
                <div className="space-y-2 text-left">
                  <span className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider select-none">BASE URL</span>
                  <div className="bg-[#0A0A0C] border border-gold-900/20 px-3.5 py-3 rounded-xl flex items-center justify-between gap-4 font-mono text-xs shadow-inner">
                    <span className="text-[#DFB15F] select-all truncate">{window.location.origin}/api/v1</span>
                    <CopyButton text={`${window.location.origin}/api/v1`} />
                  </div>
                </div>

                {/* Grid layout for Docs topics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                  {/* Left topic block: cURL example block */}
                  <div className="space-y-3 text-left">
                    <span className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider select-none">CHAT COMPLETION CURL</span>
                    <div className="relative rounded-xl overflow-hidden border border-[#232329] bg-[#0E0E11] shadow-xl text-xs font-mono">
                      <div className="flex items-center justify-between px-4 py-2 bg-[#17171C] text-[#A2A2B3] border-b border-[#232329] select-none text-[10px] font-sans tracking-wide">
                        <span className="font-semibold text-gold-300">Bash / cURL</span>
                        <CopyButton text={`curl -X POST "${window.location.origin}/api/v1/chat/completions" \\\n  -H "Authorization: Bearer <YOUR_API_KEY>" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "meta/llama-3.3-70b-instruct",\n    "messages": [\n      {"role": "system", "content": "You are a professional research agent."},\n      {"role": "user", "content": "Hello! Show me the ways of the gold."}\n    ],\n    "temperature": 0.5,\n    "max_tokens": 500\n  }'`} />
                      </div>
                      <div className="p-4 overflow-x-auto text-[11px] text-gray-200 leading-relaxed font-mono whitespace-pre bg-[#0A0A0C] min-h-[160px]">
                        <code>
{`curl -X POST "${window.location.origin}/api/v1/chat/completions" \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "meta/llama-3.3-70b-instruct",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "temperature": 0.5
  }'`}
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Right topic block: Schema Documentation list */}
                  <div className="space-y-4 text-left">
                    <div>
                      <span className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider select-none border-b border-gold-900/10 pb-1">Request Parameters</span>
                      <div className="space-y-3 mt-3 text-[11px] leading-relaxed">
                        <div>
                          <p className="font-mono text-gold-300 font-semibold">messages <span className="text-gray-500 font-normal">array (required)</span></p>
                          <p className="text-gray-400">Conversational history blocks. Each is an object containing `role` ('system', 'user', 'assistant') and `content` text.</p>
                        </div>
                        <div>
                          <p className="font-mono text-gold-300 font-semibold">model <span className="text-gray-500 font-normal">string (optional)</span></p>
                          <p className="text-gray-400">Target inference model. Defaults to: <code>{systemSettings.nvidiaNimModel || 'meta/llama-3.3-70b-instruct'}</code>.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pb-2">
                          <div>
                            <p className="font-mono text-gold-300 font-semibold">temperature <span className="text-gray-500 font-normal">number</span></p>
                            <p className="text-gray-400">Variance [0.0 - 1.0]. Default: <code>0.5</code>.</p>
                          </div>
                          <div>
                            <p className="font-mono text-gold-300 font-semibold">max_tokens <span className="text-gray-500 font-normal">integer</span></p>
                            <p className="text-gray-400">Limit on output tokens. Default: <code>1000</code>.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider select-none border-b border-gold-900/10 pb-1">Response JSON Shape (OpenAI Standard)</span>
                      <pre className="mt-3 text-[10px] text-gray-400 bg-black/40 p-3 rounded-xl border border-gold-900/5 font-mono leading-normal overflow-x-auto max-h-[120px]">
{`{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1782390823,
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "AI predictive response content here..."
      },
      "finish_reason": "stop"
    }
  ]
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: LOVABLE WEBSITES COMPILER DASHBOARD */}
          {activeTab === 'sites' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl mx-auto w-full py-10 space-y-12 text-left"
            >
              
              {/* Build website dashboard top panel (Image 3 layout) */}
              <div className="flex flex-col items-center text-center max-w-3xl mx-auto py-4 select-none">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#DFB15F] via-[#E9C37A] to-[#B3873B] flex items-center justify-center shadow-[0_0_25px_rgba(223,177,95,0.25)] border border-[#DFB15F]/20 mb-6">
                  <Globe className="w-7 h-7 text-black" />
                </div>
                <h2 className="text-3.5xl font-serif font-bold text-white mb-3 tracking-wide">
                  Build a full website
                </h2>
                <p className="text-xs text-gray-400 max-w-xl leading-relaxed">
                  Aurum Engine powered by <span className="text-[#DFB15F] font-semibold">Claude Haiku 4.5</span> will architect, write, and design a magnificent full-scale website with atmospheric glassmorphism layouts, glowing ambient themes, and full Alpine.js state reactivity.
                </p>
              </div>

              {/* Website prompt generator bar console (Form container matches Image 3 exactly) */}
              <div className="bg-[#111114]/40 border border-[#DFB15F]/10 p-6 rounded-2xl max-w-2xl mx-auto w-full shadow-2xl relative overflow-hidden">
                <form onSubmit={handleCreateSite} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-[#DFB15F] font-bold select-none">
                      Describe your site
                    </label>
                    <textarea
                      required
                      disabled={siteCreating}
                      value={newSitePrompt}
                      onChange={(e) => setNewSitePrompt(e.target.value)}
                      placeholder="e.g. A modern SaaS landing site for an AI study buddy app, with home, features, pricing, blog, and contact pages."
                      className="w-full bg-[#0A0A0C] border border-gold-900/20 focus:border-[#DFB15F]/60 rounded-xl px-4 py-3 text-xs text-gray-250 focus:outline-none min-h-[110px] resize-y leading-relaxed font-sans"
                    />
                  </div>

                  {/* Visual Design Inspiration Files Drop-Zone */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-400 font-bold select-none">
                      Attached Inspiration Files (Mocks, Specifications, text layout guides)
                    </label>
                    
                    <div
                      onDragOver={handleInspirationDragOver}
                      onDragLeave={handleInspirationDragLeave}
                      onDrop={handleInspirationDrop}
                      className={`border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all duration-250 cursor-pointer ${
                        isDraggingInspiration 
                          ? 'border-[#DFB15F] bg-[#DFB15F]/10 scale-[1.01]' 
                          : 'border-gold-900/15 bg-[#0A0A0C]/40 hover:border-gold-900/40 hover:bg-[#0A0A0C]/70'
                      }`}
                      onClick={() => inspirationInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={inspirationInputRef}
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            processInspirationFiles(e.target.files);
                          }
                        }}
                      />
                      
                      <div className="w-10 h-10 rounded-full bg-gold-900/10 flex items-center justify-center mb-2">
                        <Paperclip className="w-5 h-5 text-[#DFB15F]" />
                      </div>
                      <p className="text-xs text-gray-300 font-medium select-none">
                        Drag & drop files or <span className="text-[#DFB15F] font-semibold underline cursor-pointer">browse</span>
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1 max-w-[320px] select-none">
                        Support mockups, screenshots, specs, layout txt/json, code blocks (Max 12MB each)
                      </p>
                    </div>

                    {/* Loaded files collection display */}
                    {inspirationFiles.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pb-2">
                        {inspirationFiles.map((file) => (
                          <div 
                            key={file.id} 
                            className="bg-[#0e0e11] border border-gold-900/10 rounded-xl p-2.5 flex items-center justify-between gap-3 group hover:border-[#DFB15F]/25 transition-all duration-200"
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <div className="w-9 h-9 rounded-lg bg-[#000000]/60 flex items-center justify-center border border-gold-900/5 overflow-hidden shrink-0">
                                {file.dataUrl ? (
                                  <img 
                                    src={file.dataUrl} 
                                    alt={file.name} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : file.type.includes('json') || file.name.endsWith('.json') || file.name.endsWith('.html') ? (
                                  <FileCode className="w-4 h-4 text-[#DFB15F]" />
                                ) : (
                                  <FileCode className="w-4 h-4 text-blue-400" />
                                )}
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-[11px] font-sans font-medium text-gray-200 truncate pr-2">
                                  {file.name}
                                </p>
                                <p className="text-[9px] font-mono text-gray-500 uppercase mt-0.5">
                                  {(file.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeInspirationFile(file.id);
                              }}
                              className="p-1 px-1.5 rounded-lg bg-gray-900 hover:bg-red-950/40 text-gray-500 hover:text-red-400 transition-all cursor-pointer opacity-80 group-hover:opacity-100 shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footing controller row (Calculated cost & Generate button) */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-gold-900/5">
                    <div className="text-xs text-gray-400 select-none">
                      Estimated compilation cost: <span className="text-[#DFB15F] font-bold font-mono">~{newSitePrompt.trim() ? calculateAestheticCost(newSitePrompt).total : 11} credits</span>
                    </div>

                    <button
                      type="submit"
                      disabled={!isAdmin || siteCreating || !newSitePrompt.trim()}
                      className="bg-gradient-to-r from-[#DFB15F] to-[#ECCF9A] hover:from-[#ECCF9A] hover:to-[#DFB15F] hover:scale-[1.01] active:scale-[0.98] text-black text-xs font-bold px-6 py-3.5 rounded-xl uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2 select-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {!isAdmin ? (
                        <span>Under Maintenance</span>
                      ) : siteCreating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                          <span>Compiling app...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-black shrink-0" />
                          <span>Generate website</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Progressive logger console for visual layout generation steps */}
                  {siteCreating && siteStepsLog.length > 0 && (
                    <div className="bg-black/40 border border-gold-900/10 p-4 rounded-xl font-mono text-[11px] space-y-2 mt-4 text-left shadow-inner">
                      <div className="flex items-center gap-1.5 text-gold-400 font-bold uppercase tracking-widest border-b border-gold-900/5 pb-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Compilation Log Status</span>
                      </div>
                      <div className="space-y-1.5">
                        {siteStepsLog.map((st, sidx) => (
                          <div key={sidx} className="flex justify-between items-start gap-3">
                            <div className="flex items-center gap-2 text-left">
                              {st.complete ? (
                                <span className="text-emerald-400">●</span>
                              ) : st.active ? (
                                <span className="text-gold-400 animate-pulse">●</span>
                              ) : (
                                <span className="text-gray-650">○</span>
                              )}
                              <span className={st.complete ? 'text-gray-300 animate-fade-in' : st.active ? 'text-gold-100 font-bold' : 'text-gray-500'}>
                                {st.name}
                              </span>
                            </div>
                            <span className={st.active ? 'text-[10px] text-gold-300 italic' : 'text-[10px] text-gray-500'}>{st.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Split screen workspace previewer */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Left panel: Sites Collection list */}
                <div className="lg:col-span-1 bg-[#111114]/40 border border-gold-900/15 rounded-2xl p-4 space-y-4">
                  <h3 className="text-xs font-mono font-bold text-gold-400 uppercase tracking-widest border-b border-gold-900/5 pb-1 select-none text-left">Compiled Apps ({userSites.length})</h3>
                  
                  {userSites.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-500 font-mono italic">
                      No compiled websites. vision one above!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[450px] overflow-y-auto">
                      {userSites.map((siteItem) => {
                        const isActive = viewingSite?.id === siteItem.id;
                        const isConfirming = siteDeleteConfirmId === siteItem.id;
                        const isDeleting = siteDeletingId === siteItem.id;

                        return (
                          <div key={siteItem.id} className="relative group/site">
                            <button
                              disabled={isDeleting}
                              onClick={() => {
                                if (!isConfirming) {
                                  setViewingSite(siteItem);
                                }
                              }}
                              className={`w-full text-left p-3 pr-12 rounded-lg border text-xs flex flex-col gap-1 transition-all cursor-pointer bg-transparent ${
                                isActive 
                                  ? 'bg-gold-500/10 border-gold-500 text-gold-300' 
                                  : 'bg-[#0E0E10]/40 border-gold-900/5 text-gray-400 hover:border-gold-850 hover:bg-[#111114]/60'
                              } disabled:opacity-55`}
                            >
                              <span className="font-semibold truncate w-full text-left">{siteItem.title}</span>
                              <span className="text-[9px] font-mono text-gray-500 text-left">{(new Date(siteItem.createdAt)).toLocaleDateString()}</span>
                            </button>

                            {/* Deletion Overlay / Action */}
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              {isConfirming ? (
                                <div className="flex items-center gap-1 bg-[#1a0f0f] border border-red-900/30 rounded-lg p-1 animate-fade-in z-10 shadow-lg">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSite(siteItem.id);
                                    }}
                                    className="p-1 px-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-mono text-[9px] uppercase tracking-wider font-semibold cursor-pointer transition-all"
                                    title="Click to confirm deletion"
                                    disabled={isDeleting}
                                  >
                                    {isDeleting ? '...' : 'Del'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSiteDeleteConfirmId(null);
                                    }}
                                    className="p-1 px-1.5 rounded bg-gray-950 hover:bg-gray-900 text-gray-400 text-[9px] font-semibold cursor-pointer transition-all"
                                    title="Cancel"
                                    disabled={isDeleting}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSiteDeleteConfirmId(siteItem.id);
                                  }}
                                  className="p-1.5 rounded-lg bg-[#0E0E10]/95 hover:bg-red-950/50 text-gray-500 hover:text-red-400 transition-all opacity-0 group-hover/site:opacity-100 focus:opacity-100 cursor-pointer border border-gold-900/5 hover:border-red-900/20"
                                  title="Delete website"
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right panel: Gorgeous Live Sandbox Viewer */}
                <div className={`${viewingSite ? 'lg:col-span-2' : 'lg:col-span-3'} bg-[#111114]/55 border border-gold-900/20 rounded-2xl overflow-hidden flex flex-col h-[550px]`}>
                  
                  {/* Sandbox bar headers */}
                  <div className="bg-[#0A0A0C] border-b border-gold-900/15 px-4 h-12 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                      </div>
                      
                      {viewingSite && (
                        <a
                          href={`/api/site-preview/${viewingSite.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[#DFB15F] hover:text-white font-mono text-[9px] uppercase tracking-wider font-semibold bg-[#DFB15F]/10 px-2 py-0.5 rounded border border-[#DFB15F]/20 hover:bg-[#DFB15F]/20 transition-all cursor-pointer"
                          title="Open website full-screen in a clean new browser tab"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Open in New Tab</span>
                        </a>
                      )}
                    </div>
                    
                    {viewingSite ? (
                      <div className="flex gap-1.5 p-0.5 bg-black/40 border border-gold-900/15 rounded-lg shrink-0">
                        <button
                          onClick={() => setSiteSubTab('preview')}
                          className={`font-mono text-[9px] uppercase tracking-wider px-2.5 py-1 rounded cursor-pointer transition-colors ${siteSubTab === 'preview' ? 'bg-[#DFB15F] text-black font-semibold shadow-inner' : 'text-gray-400'}`}
                        >
                          Live Preview
                        </button>
                        <button
                          onClick={() => {
                            setSiteSubTab('files');
                            const allF = getSiteFiles(viewingSite);
                            if (allF.length > 0) setSelectedSiteFile(allF[0]);
                          }}
                          className={`font-mono text-[9px] uppercase tracking-wider px-2.5 py-1 rounded cursor-pointer transition-colors ${siteSubTab === 'files' ? 'bg-[#DFB15F] text-black font-semibold shadow-inner' : 'text-gray-400'}`}
                        >
                          Files Tree
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-gray-600">AURUM COMPILER SANDBOX</span>
                    )}
                  </div>

                  {/* Sandbox Frame body */}
                  <div className="flex-1 bg-black/10 relative overflow-hidden">
                    {!viewingSite ? (
                      <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-6 text-gray-500 font-mono space-y-3">
                        <Globe className="w-12 h-12 text-gold-900/20 shrink-0 mb-2" />
                        <div className="text-xs uppercase tracking-widest max-w-sm leading-relaxed self-center">
                          Enter and launch your brand description in the bar above to watch the compiler thread real components & visual elements in real-time.
                        </div>
                      </div>
                    ) : siteSubTab === 'preview' ? (
                      <iframe
                        srcDoc={
                          viewingSite.code.includes('<head>')
                            ? viewingSite.code.replace('<head>', `<head><base href="${window.location.origin}/">`)
                            : viewingSite.code.includes('<!DOCTYPE') || viewingSite.code.includes('<html')
                            ? viewingSite.code
                            : `<!DOCTYPE html><html><head><base href="${window.location.origin}/"></head><body>${viewingSite.code}</body></html>`
                        }
                        title="Sandbox compilation frame previewer"
                        className="w-full h-full border-none bg-[#09090b] rounded-b-xl"
                        sandbox="allow-scripts allow-popups allow-forms allow-same-origin"
                      />
                    ) : (
                      <div className="w-full h-full flex bg-[#0A0A0C] text-gray-300 font-sans">
                        {/* File list / tree sidebar */}
                        <div className="w-48 border-r border-[#DFB15F]/15 flex flex-col justify-between p-2.5 select-none shrink-0 bg-[#0E0E11]/80 text-left h-full">
                          <div className="space-y-4">
                            <div className="text-[9px] uppercase tracking-widest font-mono text-gold-400 font-bold">Workspace Files</div>
                            <div className="space-y-1">
                              {getSiteFiles(viewingSite).map((f) => {
                                const isSel = selectedSiteFile?.name === f.name;
                                return (
                                  <button
                                    key={f.name}
                                    onClick={() => setSelectedSiteFile(f)}
                                    className={`w-full text-left px-2 py-1.5 rounded text-[11px] font-mono flex items-center gap-2 cursor-pointer transition-all ${
                                      isSel ? 'bg-[#DFB15F]/15 text-gold-300 border-l-2 border-[#DFB15F]' : 'text-gray-400 hover:bg-white/5'
                                    }`}
                                  >
                                    {f.type === 'html' ? (
                                      <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                    ) : (
                                      <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    )}
                                    <span className="truncate">{f.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          
                          {/* Download Action Bar */}
                          <button
                            onClick={() => {
                              const allFiles = getSiteFiles(viewingSite);
                              allFiles.forEach((file) => {
                                const link = document.createElement('a');
                                if (file.type === 'html') {
                                  const blob = new Blob([file.content || ''], { type: 'text/html' });
                                  link.href = URL.createObjectURL(blob);
                                } else {
                                  link.href = file.url || '';
                                }
                                link.download = file.name.split('/').pop() || 'file';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              });
                            }}
                            className="w-full bg-[#DFB15F] hover:bg-[#E9C37A] text-black font-semibold font-mono text-[9px] py-2 rounded-lg cursor-pointer transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 mt-2"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download ZIP
                          </button>
                        </div>

                        {/* File Content Preview area */}
                        <div className="flex-1 p-3.5 overflow-y-auto flex flex-col justify-between">
                          {selectedSiteFile ? (
                            <div className="h-full flex flex-col text-left">
                              <div className="border-b border-[#DFB15F]/10 pb-2 flex justify-between items-center shrink-0">
                                <div className="font-mono text-[10px]">
                                  <span className="text-gray-500">path: </span>
                                  <span className="text-gold-300 font-bold">{selectedSiteFile.name}</span>
                                </div>
                                {selectedSiteFile.type === 'html' ? (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(selectedSiteFile.content || '');
                                      alert("HTML code copied successfully!");
                                    }}
                                    className="border border-[#DFB15F]/20 hover:border-[#DFB15F]/60 text-gold-400 font-mono text-[9px] px-2 py-0.5 rounded cursor-pointer transition-colors"
                                  >
                                    COPY CODE
                                  </button>
                                ) : (
                                  <a
                                    href={`${window.location.origin}${selectedSiteFile.url}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="border border-[#DFB15F]/20 hover:border-[#DFB15F]/60 text-emerald-400 font-mono text-[9px] px-2 py-0.5 rounded cursor-pointer transition-colors"
                                  >
                                    VIEW FULL IMAGE
                                  </a>
                                )}
                              </div>

                              <div className="flex-1 flex justify-center items-center py-4 overflow-hidden">
                                {selectedSiteFile.type === 'html' ? (
                                  <div className="relative w-full h-full bg-[#111114]/40 border border-[#DFB15F]/5 p-3 rounded-lg overflow-auto font-mono text-[11px] text-blue-300">
                                    <pre className="whitespace-pre-wrap select-text">{selectedSiteFile.content}</pre>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center space-y-4 max-w-full max-h-full">
                                    <div className="relative border border-[#DFB15F]/15 rounded-xl overflow-hidden shadow-2xl bg-black/60 max-h-[220px] flex items-center justify-center p-2">
                                      <img
                                        src={`${window.location.origin}${selectedSiteFile.url}`}
                                        alt={selectedSiteFile.name}
                                        referrerPolicy="no-referrer"
                                        className="max-h-[200px] max-w-full object-contain rounded-lg shadow-inner"
                                      />
                                    </div>
                                    <div className="text-[9px] font-mono text-gray-500 text-center uppercase tracking-wider">
                                      Generating graphics resolved via Flux proxy
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col justify-center items-center text-center text-gray-500 font-mono text-[11px]">
                              <FileCode className="w-8 h-8 text-gold-900/10 mb-2" />
                              <div>SELECT A FILE ON THE LEFT TO PREVIEW</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Right panel: Gorgeous AI Revision chat panel (Only visible when viewingSite is active) */}
                {viewingSite && (
                  <div className="lg:col-span-1 bg-[#111114]/40 border border-gold-900/15 rounded-2xl flex flex-col h-[550px] overflow-hidden">
                    {/* Header */}
                    <div className="bg-[#0A0A0C] border-b border-gold-900/15 px-3 h-12 flex items-center justify-between shrink-0 select-none">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                        <span className="text-[10px] font-mono font-bold text-gold-400 uppercase tracking-widest text-left">AI Page Editor</span>
                      </div>
                      <span className="bg-emerald-500/10 text-[#DFB15F] font-mono text-[8px] px-1.5 py-0.5 rounded border border-[#DFB15F]/10">Active</span>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#0E0E10]/30 text-left">
                      {/* Default Welcome Message */}
                      <div className="bg-gold-500/5 border border-gold-905/10 p-2.5 rounded-lg space-y-1.5">
                        <div className="text-[10px] font-mono text-gold-400 font-semibold uppercase">Aurum Co-pilot</div>
                        <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                          Describe what you want to modify (e.g. <i>"Make it custom dark mode"</i> or <i>"Add more benefits/details to pricing tables"</i>). Every edit costs 1 credit.
                        </p>
                      </div>

                      {/* Revisions History Accordion */}
                      {viewingSite?.history && viewingSite.history.length > 0 && (
                        <div className="bg-gold-900/5 border border-[#DFB15F]/15 rounded-lg p-2.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-gold-400 font-semibold uppercase tracking-wider">
                              <History className="w-3.5 h-3.5 text-[#DFB15F]" />
                              <span>REVISION HISTORY ({viewingSite.history.length})</span>
                            </div>
                          </div>
                          
                          <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1.5">
                            {viewingSite.history.map((rev: any, revIdx: number) => {
                              const revDate = new Date(rev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              return (
                                <div 
                                  key={revIdx} 
                                  className="flex items-center justify-between gap-1.5 p-1.5 rounded bg-[#0D0D10] border border-gold-900/10 hover:border-[#DFB15F]/30 transition-all group"
                                >
                                  <div className="flex-1 min-w-0 pr-1 text-left">
                                    <div className="text-[10px] font-mono text-white truncate font-semibold">
                                      {revIdx + 1}. {rev.instruction || "Initial Compilation"}
                                    </div>
                                    <div className="text-[8px] font-mono text-gray-500">
                                      {revDate} • {rev.prompt ? rev.prompt.split('\n')[0].substring(0, 20) + '...' : 'Base layout'}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => executeSiteRevert(revIdx)}
                                    disabled={revertingSite || siteEditing}
                                    className="px-2 py-0.5 rounded text-[8px] font-mono uppercase bg-[#DFB15F]/10 hover:bg-[#DFB15F] text-[#DFB15F] hover:text-black transition-colors shrink-0 border border-[#DFB15F]/20 cursor-pointer disabled:opacity-40"
                                  >
                                    Revert
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Chat History */}
                      {(revisionChats[viewingSite.id] || []).map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-2.5 rounded-lg space-y-1 ${
                            msg.role === 'user'
                              ? 'bg-gold-500/10 border border-gold-500/10 text-right'
                              : 'bg-white/5 border border-white/5 text-left'
                          }`}
                        >
                          <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                            {msg.role === 'user' ? 'Directives' : 'Aurum Co-pilot'}
                          </div>
                          <p className="text-[11px] text-gray-300 font-sans leading-normal whitespace-pre-wrap select-text">
                            {msg.content}
                          </p>
                        </div>
                      ))}

                      {/* Progress Logger for revisions */}
                      {siteEditing && (
                        <div className="bg-black/50 border border-gold-900/10 p-2.5 rounded-lg font-mono text-[10px] space-y-2 mt-2 leading-tight">
                          <div className="flex items-center gap-1.5 text-gold-400 font-bold uppercase tracking-wider pb-0.5 border-b border-gold-900/5">
                            <Loader2 className="w-3 animate-spin" />
                            <span>Updating page layouts</span>
                          </div>
                          <div className="space-y-1.5">
                            {siteEditStepsLog.map((st, sidx) => (
                              <div key={sidx} className="flex justify-between items-start gap-2">
                                <div className="flex items-center gap-1.5 text-left">
                                  {st.complete ? (
                                    <span className="text-emerald-400">●</span>
                                  ) : st.active ? (
                                    <span className="text-gold-400 animate-pulse">●</span>
                                  ) : (
                                    <span className="text-gray-750">○</span>
                                  )}
                                  <span className={st.complete ? 'text-gray-400' : st.active ? 'text-gold-100 font-bold' : 'text-gray-600'}>
                                    {st.name}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Editing errors */}
                      {siteEditError && (
                        <div className="bg-rose-500/10 border border-rose-500/25 p-2.5 rounded-lg font-mono text-[10px] text-rose-400">
                          <div className="font-bold uppercase tracking-wider mb-1">Compilation Failure</div>
                          <div>{siteEditError}</div>
                        </div>
                      )}
                    </div>

                    {/* Chat Editor Input bar form */}
                    <form onSubmit={executeSiteEditing} className="p-2 bg-[#08080A] border-t border-gold-900/15 flex gap-1.5 items-center">
                      <input
                        type="text"
                        required
                        disabled={siteEditing}
                        value={selectedSiteRevisionInput}
                        onChange={(e) => setSelectedSiteRevisionInput(e.target.value)}
                        placeholder="Ask Aurum to edit page..."
                        className="flex-1 bg-[#111114] border border-gold-900/15 focus:border-[#DFB15F]/50 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none placeholder-gray-650 font-sans"
                      />
                      <button
                        type="submit"
                        disabled={siteEditing || !selectedSiteRevisionInput.trim()}
                        className="bg-[#DFB15F] hover:bg-[#E9C37A] text-black w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                      >
                        {siteEditing ? (
                          <Loader2 className="w-4 h-4 animate-spin text-black" />
                        ) : (
                          <Send className="w-3.5 h-3.5 text-black" />
                        )}
                      </button>
                    </form>
                  </div>
                )}

              </div>

            </motion.div>
          )}

          {false && activeTab === 'admin' && isAdmin && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full py-10 space-y-10"
            >
              <div className="border-b border-gold-900/20 pb-5">
                <h2 className="font-serif text-3xl font-bold tracking-widest text-gold-50 uppercase flex items-center gap-3">
                  <Shield className="w-8 h-8 text-[#DFB15F]" />
                  <span>COMMAND CONSOLE</span>
                </h2>
                <p className="text-xs text-gray-500 font-mono tracking-wider mt-1 uppercase">
                  Workspace Control Office — teamthunderofficialyt@gmail.com & freefiregtamcpe@gmail.com
                </p>
              </div>

              {/* ADMIN GRID ROW: 1. SECRETS UPDATE & 2. PLAN CONSERVATOR */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* System Secrets Config Form */}
                <div className="bg-[#111114]/50 border border-gold-900/20 rounded-xl p-6 space-y-6">
                  <h3 className="font-serif text-lg font-bold text-gold-100 flex items-center gap-2.5 border-b border-gold-900/10 pb-2">
                    <Key className="w-40 h-40 text-gold-400 rotate-45 shrink-0" style={{ width: '1.1rem', height: '1.1rem' }} />
                    <span>System Secrets Config</span>
                  </h3>

                  <form onSubmit={handleSaveKeys} className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono uppercase text-gold-450 tracking-wider mb-1.5 font-medium">NVIDIA NIM API KEY</label>
                      <input
                        type="password"
                        value={configNnimKey}
                        onChange={(e) => setConfigNnimKey(e.target.value)}
                        placeholder={systemSettings.hasNvidiaNimKey ? "******** (Already configured - enter to rewrite)" : "Paste key from build.nvidia.com..."}
                        className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-gold-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase text-gold-450 tracking-wider mb-1.5 font-medium">OXAPAY MERCHANT API KEY</label>
                      <input
                        type="password"
                        value={configOxapayKey}
                        onChange={(e) => setConfigOxapayKey(e.target.value)}
                        placeholder={systemSettings.hasOxapayKey ? "******** (Already configured - enter to rewrite)" : "Paste key from oxapay.com merchant..."}
                        className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-gold-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="w-full py-2.5 px-4 bg-gold-500 hover:bg-gold-400 text-black text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSavingSettings ? (
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Store Vault Secrets</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Mask statuses summary */}
                  <div className="bg-[#0A0A0C] rounded-lg p-3.5 text-xs font-mono border border-gold-900/10 space-y-2">
                    <p className="text-[10px] text-gold-400/65 uppercase tracking-widest font-semibold mb-1">State Audit Check</p>
                    <div className="flex justify-between">
                      <span className="text-gray-500">NIM API Status:</span>
                      <span className={systemSettings.hasNvidiaNimKey ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {systemSettings.hasNvidiaNimKey ? 'ENABLED' : 'MISSING'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Oxapay Status:</span>
                      <span className={systemSettings.hasOxapayKey ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {systemSettings.hasOxapayKey ? 'ENABLED' : 'MISSING'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pricing Plans Constructor Mode */}
                <div className="bg-[#111114]/50 border border-gold-900/20 rounded-xl p-6 space-y-6">
                  <h3 className="font-serif text-lg font-bold text-gold-100 flex items-center gap-2.5 border-b border-gold-900/10 pb-2">
                    <Coins className="w-4 h-4 text-gold-400" />
                    <span>INR Pricing Tier Creator</span>
                  </h3>

                  <form onSubmit={handleCreatePlan} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono uppercase text-gold-400 mb-1.5 font-medium">TIER PLAN NAME</label>
                        <input
                          type="text"
                          required
                          value={newPlan.name}
                          onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                          placeholder="e.g. Aurum Zenith"
                          className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-gold-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono uppercase text-gold-400 mb-1.5 font-medium">COST IN INR (₹)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={newPlan.priceINR}
                          onChange={(e) => setNewPlan({ ...newPlan, priceINR: Number(e.target.value) })}
                          placeholder="e.g. 499"
                          className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-gold-500"
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
                          value={newPlan.queriesLimit}
                          onChange={(e) => setNewPlan({ ...newPlan, queriesLimit: Number(e.target.value) })}
                          placeholder="e.g. 500 or -1"
                          className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-gold-500"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <span className="text-[10px] text-gray-500 leading-normal pb-1 font-mono italic">
                          * Tip: Input -1 to make queries completely unlimited.
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase text-gold-400 mb-1.5 font-medium">TIER BENEFITS SUMMARY</label>
                      <input
                        type="text"
                        required
                        value={newPlan.description}
                        onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                        placeholder="Unlimited responses, Priority 8B speeds..."
                        className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-gold-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-[#DFB15F] hover:bg-gold-400 text-black text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-black" />
                      <span>Assemble / Overwrite Tier</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* ACTIVE PLANS IN SYSTEM TABLE LIST */}
              <div className="bg-[#111114]/30 border border-gold-900/15 rounded-xl p-6">
                <h3 className="font-serif text-lg font-bold text-gold-100 mb-4 flex items-center justify-between border-b border-gold-900/10 pb-2">
                  <span>Current pricing catalog</span>
                  <span className="font-mono text-xs bg-gold-950 text-gold-300 px-2 py-0.5 rounded uppercase tracking-wider">{systemPlans.length} plans</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gold-900/20 text-gray-500 font-mono uppercase tracking-wider">
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
                              onClick={() => handleDeletePlan(sp.id, sp.name)}
                              className="text-red-400 hover:text-red-300 p-1 bg-red-950/10 rounded"
                            >
                              <X className="w-4_ h-4_" style={{ width: '0.9rem', height: '0.9rem' }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MEMBER SUBSCRIBER REGISTRY TABLE */}
              <div className="bg-[#111114]/30 border border-gold-900/15 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-2 border-b border-gold-900/10">
                  <h3 className="font-serif text-lg font-bold text-gold-100 flex items-center gap-2">
                    <Users className="w-5 h-5 text-gold-400" />
                    <span>Aurum Active Seekers</span>
                  </h3>

                  <div className="relative shrink-0 w-full sm:w-64">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                      placeholder="Filter email, name, plan..."
                      className="w-full bg-[#0A0A0C] border border-gold-900/25 rounded-md pl-9 pr-3.5 py-1.5 text-xs text-gray-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gold-900/20 text-gray-500 font-mono uppercase tracking-wider">
                        <th className="pb-3 pt-1">User name / UID</th>
                        <th className="pb-3 pt-1">Contact Email</th>
                        <th className="pb-3 pt-1 text-center">Active subscription plan</th>
                        <th className="pb-3 pt-1 text-right">Consumption quota</th>
                        <th className="pb-3 pt-1 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gold-900/10">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-gray-500 italic">No record matches of members</td>
                        </tr>
                      ) : (
                        filteredUsers.map(u => (
                          <tr key={u.id} className="text-gray-300 hover:bg-[#16161D]/20">
                            <td className="py-3">
                              <p className="font-semibold text-gray-100">{u.displayName || 'Unknown visitor'}</p>
                              <p className="font-mono text-[9px] text-gray-500">{u.id}</p>
                            </td>
                            <td className="py-3 font-mono text-gray-300">{u.email}</td>
                            <td className="py-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${u.planId !== 'plan_free' ? 'bg-gold-950 border-gold-700/55 text-[#DFB15F] font-bold' : 'bg-gray-900 border-gray-800 text-gray-400'}`}>
                                  {u.planName || u.planId}
                                </span>
                                {Number(u.topupCredits || 0) > 0 && (
                                  <span className="text-[9px] text-emerald-400 font-mono font-semibold">+{u.topupCredits} refill cr</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-right font-mono font-semibold">
                              {u.queriesCount} queries used
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="text-[#DFB15F] hover:text-gold-200 p-1.5 bg-gold-950/20 hover:bg-gold-950/40 rounded border border-gold-900/30 font-semibold cursor-pointer text-xs flex items-center gap-1 ml-auto"
                                title="Edit seeker profile"
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

              {/* LOGGED OXAPAY BILLING TRANSACTIONS MODULE */}
              <div className="bg-[#111114]/30 border border-gold-900/15 rounded-xl p-6">
                <h3 className="font-serif text-lg font-bold text-gold-100 mb-4 flex items-center gap-2 border-b border-gold-900/10 pb-2">
                  <Coins className="w-5 h-5 text-gold-400" />
                  <span>Oxapay Transaction Audits</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gold-900/20 text-gray-500 font-mono uppercase tracking-wider">
                        <th className="pb-3 pt-1">Invoice ID / Track ID</th>
                        <th className="pb-3 pt-1">User email</th>
                        <th className="pb-3 pt-1 text-center">Plan target</th>
                        <th className="pb-3 pt-1 text-right">Price (INR)</th>
                        <th className="pb-3 pt-1 text-right">Verification State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gold-900/10">
                      {adminTransactionsList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-gray-500 italic">No checkout transaction histories captured yet</td>
                        </tr>
                      ) : (
                        adminTransactionsList.map(tx => (
                          <tr key={tx.id} className="text-gray-300 hover:bg-[#16161D]/20">
                            <td className="py-3 font-mono text-[10px]">
                              <p className="text-gray-100 font-bold">{tx.id}</p>
                              <p className="text-gray-500">Track: {tx.trackId || 'N/A'}</p>
                            </td>
                            <td className="py-3 font-mono">{tx.userEmail}</td>
                            <td className="py-3 text-center bg-[#111114]/10">
                              <span className="font-serif text-gold-200 text-[10.5px] tracking-wide">{tx.planName}</span>
                            </td>
                            <td className="py-3 text-right font-mono font-bold text-gold-100">₹{tx.amount}</td>
                            <td className="py-3 text-right">
                              <span className={`inline-block px-2.5 py-0.5 rounded text-[9.5px] font-mono border uppercase ${tx.status === 'paid' ? 'bg-emerald-950/50 border-emerald-700/50 text-emerald-300' : tx.status === 'pending' ? 'bg-amber-950/50 border-amber-800/40 text-amber-200' : 'bg-rose-955/20 border-rose-900/30 text-rose-350'}`}>
                                {tx.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>


            </motion.div>
          )}

        </AnimatePresence>

        {/* SECURE ADMIN CONTROL: VISITOR PROFILE EDITOR MODAL */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#111114] border border-[#DFB15F]/30 rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-[0_10px_50px_rgba(0,0,0,0.8)]"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gold-900/10">
                <h3 className="font-serif text-md font-bold text-gold-100 uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#DFB15F]" />
                  <span>Update seeker</span>
                </h3>
                <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-white cursor-pointer p-0.5">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditUser} className="space-y-4">
                <div>
                  <p className="text-[10px] text-gray-500 mb-1 font-mono uppercase tracking-wider">Active Seekers Identifier</p>
                  <div className="bg-[#0A0A0C] border border-gold-900/10 rounded-lg px-3 py-2 text-xs font-mono text-gold-400 truncate">
                    {editingUser.email}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gold-300 uppercase tracking-wider mb-1.5 font-semibold">Assigned Subscription Plan</label>
                  <select
                    value={editUserForm.planId}
                    onChange={(e) => setEditUserForm({ ...editUserForm, planId: e.target.value })}
                    className="w-full bg-[#0A0A0C] border border-gold-900/25 rounded-lg px-3 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-gold-500"
                  >
                    {[
                      { id: 'plan_free', name: 'Free' },
                      { id: 'plan_pro', name: 'Pro' },
                      { id: 'plan_pro_plus', name: 'Pro+' },
                      { id: 'plan_business', name: 'Business' },
                      { id: 'plan_unlimited', name: 'Unlimited' }
                    ].map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
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
                      className="w-full bg-[#0A0A0C] border border-gold-900/25 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-[#DFB15F]"
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

        {/* CORNERSTONE RENDER: CUSTOM PROFILE ACCOUNT DETAILS OVERLAY */}
         {accountModalOpen && (
           <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <motion.div
               initial={{ opacity: 0, scale: 0.95, y: 15 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: -15 }}
               className="bg-[#111114] border border-gold-900/20 max-w-md w-full rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(223,177,95,0.08)]"
             >
               {/* Modal Header */}
               <div className="bg-gradient-to-r from-gold-950/40 to-[#0A0A0C] border-b border-gold-900/15 p-5 flex items-center justify-between">
                 <div className="flex items-center gap-2.5">
                   <div className="w-8 h-8 rounded-full bg-gold-950 border border-[#DFB15F]/20 flex items-center justify-center shadow-inner">
                     <User className="w-4 h-4 text-gold-400" />
                   </div>
                   <div>
                     <h3 className="font-serif text-md font-bold text-gold-50 uppercase tracking-widest leading-none">Account profile</h3>
                     <span className="text-[9px] font-mono text-gold-400 tracking-wider">MEMBER IDENTITY FILE</span>
                   </div>
                 </div>
                 <button 
                   onClick={() => setAccountModalOpen(false)}
                   className="text-gray-500 hover:text-white p-1.5 hover:bg-white/5 rounded-lg transition-colors cursor-pointer bg-transparent"
                 >
                   <X className="w-4 h-4" />
                 </button>
               </div>

               {/* Modal Body */}
               <div className="p-6 space-y-6">
                 {/* User Info Capsule */}
                 <div className="flex items-center gap-4 bg-black/20 p-4 border border-gold-900/10 rounded-xl">
                   <img 
                     src={profile?.photoURL || 'https://via.placeholder.com/64'}
                     alt={profile?.displayName || 'AURUM PRO'}
                     className="w-12 h-12 rounded-full border border-gold-500/20 shadow-inner"
                     referrerPolicy="no-referrer"
                   />
                   <div className="flex-1 overflow-hidden text-left">
                     <p className="text-sm font-bold text-gold-100 truncate">{profile?.displayName}</p>
                     <p className="text-xs text-gray-400 truncate">{profile?.email}</p>
                     <p className="text-[10px] font-mono text-[#DFB15F] uppercase tracking-widest mt-1">ID: {profile?.id}</p>
                   </div>
                 </div>

                 {/* Subscription Stats Box */}
                 <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <CreditCard className="w-4 h-4 text-gold-450" />
                       <span className="text-xs font-mono uppercase tracking-wider text-gray-300">Active Membership</span>
                     </div>
                     <span className="px-2.5 py-0.5 rounded bg-gold-950 text-[#DFB15F] font-mono text-[9px] font-bold uppercase border border-gold-800/30">
                       {profile?.planName}
                     </span>
                   </div>

                   {/* Progress credits meters */}
                   <div className="bg-[#0A0A0C] border border-gold-900/10 p-4 rounded-xl space-y-3 font-mono text-left">
                     <div className="flex justify-between items-baseline text-xs">
                       <span className="text-gray-400">Total Credits Used Today:</span>
                       <span className="font-semibold text-gold-100">
                         {profile?.queriesCount} / {getProfileQueriesLimit() === -1 ? '∞' : (getProfileQueriesLimit() + (profile?.topupCredits || 0))} CR
                       </span>
                     </div>

                     {/* Visual gradient progress bar */}
                     {getProfileQueriesLimit() !== -1 && (
                       <div className="w-full bg-[#16161A] h-2 rounded-full overflow-hidden border border-gold-900/5">
                         <div 
                           className="bg-gradient-to-r from-gold-600 to-[#DFB15F] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(223,177,95,0.4)]"
                           style={{ width: `${Math.min(100, ((profile?.queriesCount || 0) / (getProfileQueriesLimit() + (profile?.topupCredits || 0))) * 100)}%` }}
                         />
                       </div>
                     )}

                     <div className="flex justify-between text-[10px] text-gray-500 pt-1 leading-normal border-t border-gold-900/5 mt-1">
                       <span>Refills Today: +{profile?.topupCredits || 0} CR</span>
                       <span>Resets Daily (00:00 UTC)</span>
                     </div>
                   </div>
                 </div>

                 {/* Developer API integration keys section */}
                 <div className="space-y-1.5 pt-2 border-t border-gold-900/10 text-left">
                   <label className="block text-[10px] font-mono uppercase tracking-widest text-[#DFB15F]">Developer Token API Credentials</label>
                   <div className="flex gap-2 items-center">
                     <div className="flex-1 bg-[#0A0A0C] border border-gold-900/20 rounded-lg px-3 py-2 text-[11px] font-mono text-gray-400 select-all truncate">
                       aurum_live_{profile?.id}
                     </div>
                     <CopyButton text={`aurum_live_${profile?.id}`} />
                   </div>
                   <p className="text-[9px] text-gray-500 leading-normal">
                     Use this bearer token inside headers as <code className="text-gold-200">Authorization: Bearer aurum_live_...</code> to invoke your custom API endpoints.
                   </p>
                 </div>
               </div>

               {/* Modal Footer */}
               <div className="bg-[#0D0D10] border-t border-gold-900/15 p-4 flex gap-3">
                 <button
                   onClick={() => {
                     setAccountModalOpen(false);
                     setActiveTab('pricing');
                   }}
                   className="flex-1 py-2 px-3 text-center bg-transparent hover:bg-white/5 border border-gold-500/35 hover:border-gold-500 text-gold-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                 >
                   Upgrade Plans
                 </button>
                 <button
                   onClick={() => setAccountModalOpen(false)}
                   className="flex-1 py-1 px-3 text-center bg-[#DFB15F] hover:bg-gold-400 text-black rounded-lg text-xs font-semibold cursor-pointer transition-all active:scale-[0.98]"
                 >
                   Close Details
                 </button>
               </div>
             </motion.div>
           </div>
         )}
      </main>

    </div>
  );
}
