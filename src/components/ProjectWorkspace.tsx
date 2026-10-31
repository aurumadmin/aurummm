import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FileCode,
  FileText,
  FileJson,
  Code2,
  Play,
  Wrench,
  Download,
  ExternalLink,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Monitor,
  Tablet,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Terminal,
  Layers,
  Save
} from 'lucide-react';
import { WebProject } from '../types';

interface ProjectWorkspaceProps {
  user: any;
  auth: any;
  onDeductCredits?: (amount: number) => void;
}

export default function ProjectWorkspace({ user, auth }: ProjectWorkspaceProps) {
  const [projects, setProjects] = useState<WebProject[]>([]);
  const [activeProject, setActiveProject] = useState<WebProject | null>(null);
  const [activeFilePath, setActiveFilePath] = useState<string>('src/App.tsx');
  const [fileContent, setFileContent] = useState<string>('');
  const [isModified, setIsModified] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // UI States
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [isFixing, setIsFixing] = useState<boolean>(false);
  const [promptInput, setPromptInput] = useState<string>('');
  const [editPromptInput, setEditPromptInput] = useState<string>('');
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [showLogsConsole, setShowLogsConsole] = useState<boolean>(true);
  const [iframeKey, setIframeKey] = useState<number>(0);
  
  // New File Modal
  const [showNewFileModal, setShowNewFileModal] = useState<boolean>(false);
  const [newFilePath, setNewFilePath] = useState<string>('src/components/NewComponent.tsx');

  // Open Tabs
  const [openTabs, setOpenTabs] = useState<string[]>(['src/App.tsx', 'src/components/Navbar.tsx']);

  // Helper to safely retrieve active auth token
  const getAuthToken = () => {
    if (auth && typeof auth.getToken === 'function') {
      const t = auth.getToken();
      if (t) return t;
    }
    return localStorage.getItem('aurum_token') || localStorage.getItem('token') || '';
  };

  // Fetch initial project list
  useEffect(() => {
    fetchUserProjects();
  }, []);

  // Update fileContent when activeFilePath or activeProject changes
  useEffect(() => {
    if (activeProject && activeProject.files) {
      const content = activeProject.files[activeFilePath] || '';
      setFileContent(content);
      setIsModified(false);
      if (!openTabs.includes(activeFilePath)) {
        setOpenTabs(prev => [...prev, activeFilePath]);
      }
    }
  }, [activeFilePath, activeProject]);

  const fetchUserProjects = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/user/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data);
          setActiveProject(data[0]);
          const fileKeys = Object.keys(data[0].files || {});
          if (fileKeys.length > 0) {
            const defaultEntry = fileKeys.find(k => k.endsWith('App.tsx') || k.endsWith('main.tsx')) || fileKeys[0];
            setActiveFilePath(defaultEntry);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch user projects:', err);
    }
  };

  const handleGenerateProject = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const targetPrompt = customPrompt || promptInput || editPromptInput;
    if (!targetPrompt.trim()) return;

    setIsGenerating(true);
    setAgentLogs([
      `[Step 1/5] 🧠 Initializing Website Creation Agent...`,
      `[Step 2/5] ⚡ Planning multi-file architecture with Gemini 3.7 Flash...`
    ]);

    try {
      const token = getAuthToken();
      const res = await fetch('/api/user/projects/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: targetPrompt,
          projectId: activeProject?.id
        })
      });

      const data = await res.json();
      if (data.success && data.project) {
        setActiveProject(data.project);
        setProjects(prev => {
          const idx = prev.findIndex(p => p.id === data.project.id);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = data.project;
            return copy;
          }
          return [data.project, ...prev];
        });
        if (data.logs) {
          setAgentLogs(data.logs);
        }
        const fileKeys = Object.keys(data.project.files || {});
        if (fileKeys.length > 0) {
          const defaultEntry = fileKeys.find((k: string) => k.endsWith('App.tsx') || k.endsWith('main.tsx')) || fileKeys[0];
          setActiveFilePath(defaultEntry);
        }
        setIframeKey(Date.now());
        setPromptInput('');
        setEditPromptInput('');
      } else {
        setAgentLogs(prev => [...prev, `❌ Error: ${data.error || 'Failed to generate project'}`]);
      }
    } catch (err: any) {
      setAgentLogs(prev => [...prev, `❌ Network Error: ${err.message}`]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveFile = async () => {
    if (!activeProject || !activeFilePath) return;

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/projects/${activeProject.id}/files`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          filePath: activeFilePath,
          content: fileContent
        })
      });

      const data = await res.json();
      if (data.success && data.project) {
        setActiveProject(data.project);
        setIsModified(false);
        setIframeKey(Date.now());
      }
    } catch (err: any) {
      console.error('Failed to save file:', err);
    }
  };

  const handleCreateFile = async () => {
    if (!activeProject || !newFilePath.trim()) return;

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/projects/${activeProject.id}/files`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          filePath: newFilePath,
          content: `import React from 'react';\n\nexport default function ${newFilePath.split('/').pop()?.replace(/\.(tsx|ts|jsx|js)$/, '')}() {\n  return (\n    <div className="p-4">\n      <h2 className="text-xl font-bold">New Component</h2>\n    </div>\n  );\n}`
        })
      });

      const data = await res.json();
      if (data.success && data.project) {
        setActiveProject(data.project);
        setActiveFilePath(newFilePath);
        setShowNewFileModal(false);
        setNewFilePath('');
        setIframeKey(Date.now());
      }
    } catch (err: any) {
      console.error('Failed to create file:', err);
    }
  };

  const handleDeleteFile = async (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeProject) return;
    if (!confirm(`Are you sure you want to delete ${filePath}?`)) return;

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/projects/${activeProject.id}/files`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ filePath })
      });

      const data = await res.json();
      if (data.success && data.project) {
        setActiveProject(data.project);
        setOpenTabs(prev => prev.filter(t => t !== filePath));
        const remaining = Object.keys(data.project.files || {});
        if (remaining.length > 0) {
          setActiveFilePath(remaining[0]);
        }
        setIframeKey(Date.now());
      }
    } catch (err: any) {
      console.error('Failed to delete file:', err);
    }
  };

  const handleRunBuild = async () => {
    if (!activeProject) return;
    setIsBuilding(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/projects/${activeProject.id}/build`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.project) {
        setActiveProject(data.project);
        setIframeKey(Date.now());
      }
    } catch (err) {
      console.error('Build check failed:', err);
    } finally {
      setIsBuilding(false);
    }
  };

  const handleAiFix = async () => {
    if (!activeProject) return;
    setIsFixing(true);
    setAgentLogs(prev => [...prev, `[AI Fix] 🛠️ Invoking Claude Opus 5 senior reviewer to fix build errors...`]);

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/projects/${activeProject.id}/ai-fix`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.project) {
        setActiveProject(data.project);
        setIframeKey(Date.now());
        setAgentLogs(prev => [...prev, `[AI Fix] ✨ Claude Opus 5 auto-fix pass complete! Build status: ${data.project.buildState}`]);
      }
    } catch (err: any) {
      setAgentLogs(prev => [...prev, `[AI Fix] ❌ Fix failed: ${err.message}`]);
    } finally {
      setIsFixing(false);
    }
  };

  const handleExportZip = () => {
    if (!activeProject) return;
    window.open(`/api/projects/${activeProject.id}/export`, '_blank');
  };

  // Helper file icons
  const getFileIcon = (path: string) => {
    if (path.endsWith('.tsx') || path.endsWith('.jsx')) return <FileCode className="w-4 h-4 text-cyan-400" />;
    if (path.endsWith('.ts') || path.endsWith('.js')) return <Code2 className="w-4 h-4 text-blue-400" />;
    if (path.endsWith('.json')) return <FileJson className="w-4 h-4 text-amber-400" />;
    if (path.endsWith('.html')) return <FileText className="w-4 h-4 text-orange-400" />;
    if (path.endsWith('.css')) return <FileText className="w-4 h-4 text-emerald-400" />;
    return <FileText className="w-4 h-4 text-slate-400" />;
  };

  const projectFiles = activeProject?.files || {};
  const filteredFiles = Object.keys(projectFiles).filter(f => f.toLowerCase().includes(searchQuery.toLowerCase()));

  // If no projects exist yet, show initial prompt creation screen
  if (!activeProject && !isGenerating) {
    return (
      <div className="w-full h-full min-h-0 overflow-y-auto py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8 pb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Multi-File Website Studio</span>
          </div>
          
          <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
            Build Real Multi-File Web Applications
          </h1>
          <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
            Describe any SaaS platform, e-commerce store, interactive dashboard, or landing page. The AI agent generates full React + TypeScript code trees with components, pages, and styling.
          </p>

          <form onSubmit={handleGenerateProject} className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-2xl text-left space-y-4 max-w-2xl mx-auto">
            <label className="block text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
              Project Description
            </label>
            <textarea
              rows={4}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="e.g. Build me a modern AI SaaS website called Nebula AI with landing page, pricing page, dashboard, login modal, responsive mobile design, and dark mode."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-100 text-sm focus:outline-none focus:border-amber-500/50 resize-none"
            />
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">Powered by Gemini 3.7 Flash & Claude Opus 5</span>
              <button
                type="submit"
                disabled={isGenerating || !promptInput.trim()}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Generate Project</span>
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 text-left text-xs text-slate-400">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1">
              <Layers className="w-4 h-4 text-amber-400 mb-2" />
              <span className="font-bold text-slate-200 block">Multi-File React + TS</span>
              <span>Generates package.json, App.tsx, Navbar.tsx, pages, types, and styling.</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1">
              <Wrench className="w-4 h-4 text-emerald-400 mb-2" />
              <span className="font-bold text-slate-200 block">Auto Build & Debug</span>
              <span>Includes esbuild bundling check with Claude Opus 5 build error fixer.</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1">
              <Download className="w-4 h-4 text-cyan-400 mb-2" />
              <span className="font-bold text-slate-200 block">ZIP Export</span>
              <span>Download complete source code anytime as a ready-to-run ZIP archive.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[600px] w-full bg-slate-950 text-slate-100 rounded-2xl border border-slate-800/80 overflow-hidden">
      
      {/* HEADER WORKSPACE TOOLBAR */}
      <div className="h-14 border-b border-slate-800/80 bg-slate-900/60 px-4 flex items-center justify-between gap-4">
        
        {/* Left: Project Selector */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
            <Code2 className="w-4 h-4" />
          </div>
          <div>
            <select
              value={activeProject?.id || ''}
              onChange={(e) => {
                const proj = projects.find(p => p.id === e.target.value);
                if (proj) {
                  setActiveProject(proj);
                  const keys = Object.keys(proj.files || {});
                  if (keys.length > 0) setActiveFilePath(keys[0]);
                }
              }}
              className="bg-slate-950 border border-slate-800 text-slate-100 text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500/50"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          
          {/* Status Badge */}
          {activeProject?.buildState === 'success' ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              Build Green
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <AlertCircle className="w-3 h-3" />
              Build Error
            </span>
          )}
        </div>

        {/* Center: View Mode & Device Switcher */}
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${viewMode === 'split' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Split View
            </button>
            <button
              onClick={() => setViewMode('editor')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${viewMode === 'editor' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Editor Only
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${viewMode === 'preview' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Preview Only
            </button>
          </div>

          {viewMode !== 'editor' && (
            <div className="hidden sm:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setDeviceMode('desktop')}
                className={`p-1.5 rounded-lg transition-all ${deviceMode === 'desktop' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
                title="Desktop View"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDeviceMode('tablet')}
                className={`p-1.5 rounded-lg transition-all ${deviceMode === 'tablet' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
                title="Tablet View"
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDeviceMode('mobile')}
                className={`p-1.5 rounded-lg transition-all ${deviceMode === 'mobile' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
                title="Mobile View"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunBuild}
            disabled={isBuilding}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
            title="Re-run esbuild compilation check"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Build</span>
          </button>

          {activeProject?.buildState === 'failed' && (
            <button
              onClick={handleAiFix}
              disabled={isFixing}
              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
            >
              {isFixing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
              <span>AI Fix</span>
            </button>
          )}

          <button
            onClick={() => setIframeKey(Date.now())}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
            title="Refresh Preview"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <a
            href={`/api/site-preview/${activeProject?.id}`}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
            title="Open preview in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={handleExportZip}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            title="Download ZIP Archive"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">ZIP Export</span>
          </button>
        </div>
      </div>

      {/* MAIN WORKSPACE BODY */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* LEFT PANEL: FILE EXPLORER */}
        {viewMode !== 'preview' && (
          <div className="w-64 border-r border-slate-800/80 bg-slate-900/40 flex flex-col min-h-0">
            {/* Explorer Header */}
            <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                Project Files
              </span>
              <button
                onClick={() => setShowNewFileModal(true)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-all"
                title="Create New File"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Search Files */}
            <div className="p-2 border-b border-slate-800/80">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800/80 rounded-lg pl-8 pr-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500/40"
                />
              </div>
            </div>

            {/* File List Tree */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {filteredFiles.map((path) => {
                const isActive = path === activeFilePath;
                return (
                  <div
                    key={path}
                    onClick={() => setActiveFilePath(path)}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-300 font-medium border border-amber-500/30'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {getFileIcon(path)}
                      <span className="truncate">{path}</span>
                    </div>
                    
                    <button
                      onClick={(e) => handleDeleteFile(path, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded transition-all"
                      title="Delete File"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CENTER PANEL: CODE EDITOR */}
        {viewMode !== 'preview' && (
          <div className="flex-1 flex flex-col min-h-0 border-r border-slate-800/80 bg-slate-950">
            {/* Opened File Tabs */}
            <div className="h-9 border-b border-slate-800/80 bg-slate-900/40 px-2 flex items-center gap-1 overflow-x-auto">
              {openTabs.map(tabPath => (
                <div
                  key={tabPath}
                  onClick={() => setActiveFilePath(tabPath)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-t-lg text-xs border-t border-x cursor-pointer transition-all ${
                    tabPath === activeFilePath
                      ? 'bg-slate-950 border-slate-800 text-amber-300 font-semibold'
                      : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {getFileIcon(tabPath)}
                  <span>{tabPath.split('/').pop()}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenTabs(prev => prev.filter(t => t !== tabPath));
                    }}
                    className="hover:text-rose-400"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Code Editor Body */}
            <div className="flex-1 relative flex flex-col min-h-0">
              <div className="absolute top-3 right-4 z-10 flex items-center gap-2">
                {isModified && (
                  <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                    Unsaved
                  </span>
                )}
                <button
                  onClick={handleSaveFile}
                  disabled={!isModified}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs px-3 py-1 rounded-lg flex items-center gap-1 shadow transition-all cursor-pointer"
                >
                  <Save className="w-3 h-3" />
                  <span>Save</span>
                </button>
              </div>

              <textarea
                value={fileContent}
                onChange={(e) => {
                  setFileContent(e.target.value);
                  setIsModified(true);
                }}
                spellCheck={false}
                className="w-full h-full bg-slate-950 text-slate-100 p-4 font-mono text-xs leading-relaxed resize-none focus:outline-none"
              />
            </div>

            {/* AI Prompter Bar below editor */}
            <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 space-y-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px]">
                <span className="text-slate-500 font-mono uppercase text-[10px]">Quick Edits:</span>
                <button
                  onClick={() => handleGenerateProject(undefined, 'Add a dark mode toggle button to Navbar')}
                  className="px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all text-[11px]"
                >
                  🌙 Dark Mode
                </button>
                <button
                  onClick={() => handleGenerateProject(undefined, 'Add responsive mobile navigation drawer')}
                  className="px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all text-[11px]"
                >
                  📱 Responsive Nav
                </button>
                <button
                  onClick={() => handleGenerateProject(undefined, 'Add an interactive pricing plan grid section')}
                  className="px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all text-[11px]"
                >
                  💰 Pricing Section
                </button>
              </div>

              <form onSubmit={handleGenerateProject} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask Website Agent to modify project (e.g. Add dark mode, update hero design)..."
                  value={editPromptInput}
                  onChange={(e) => setEditPromptInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
                <button
                  type="submit"
                  disabled={isGenerating || !editPromptInput.trim()}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Modify</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* RIGHT PANEL: LIVE PREVIEW IFRAME */}
        {viewMode !== 'editor' && (
          <div className={`flex-1 bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden ${
            deviceMode === 'tablet' ? 'p-6' : deviceMode === 'mobile' ? 'p-8' : 'p-0'
          }`}>
            {activeProject?.buildState === 'failed' ? (
              <div className="p-8 max-w-lg text-center space-y-4 bg-rose-950/20 border border-rose-500/30 rounded-2xl">
                <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                <h3 className="text-lg font-bold text-rose-200">Build Error Detected</h3>
                <pre className="text-left bg-slate-950 p-4 rounded-xl text-xs font-mono text-rose-300 max-h-48 overflow-y-auto border border-rose-900/40">
                  {activeProject.buildError}
                </pre>
                <button
                  onClick={handleAiFix}
                  disabled={isFixing}
                  className="bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold px-6 py-2 rounded-xl text-xs flex items-center gap-2 mx-auto shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
                >
                  {isFixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                  <span>Fix with Claude Opus 5</span>
                </button>
              </div>
            ) : (
              <iframe
                key={iframeKey}
                src={`/api/site-preview/${activeProject?.id}`}
                title="Live Web Preview"
                className={`w-full h-full border-0 transition-all duration-300 bg-slate-950 ${
                  deviceMode === 'tablet' ? 'max-w-[768px] rounded-2xl border border-slate-800 shadow-2xl' :
                  deviceMode === 'mobile' ? 'max-w-[375px] rounded-3xl border border-slate-800 shadow-2xl h-[667px]' : 'w-full h-full'
                }`}
              />
            )}
          </div>
        )}
      </div>

      {/* BOTTOM COLLAPSIBLE ACTIVITY CONSOLE */}
      <div className="border-t border-slate-800/80 bg-slate-900/80 text-xs">
        <div
          onClick={() => setShowLogsConsole(!showLogsConsole)}
          className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 select-none"
        >
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>Agent Console & Build Activity ({agentLogs.length} logs)</span>
          </div>
          {showLogsConsole ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>

        {showLogsConsole && (
          <div className="h-28 overflow-y-auto bg-slate-950 p-3 font-mono text-[11px] text-slate-300 space-y-1 border-t border-slate-800/80">
            {agentLogs.length === 0 ? (
              <span className="text-slate-600">Console ready. Actions will stream here...</span>
            ) : (
              agentLogs.map((log, i) => (
                <div key={i} className="leading-relaxed">
                  {log}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* NEW FILE MODAL */}
      {showNewFileModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">Create New File</h3>
            <div className="space-y-1">
              <label className="text-xs font-mono uppercase text-slate-400">Relative Path</label>
              <input
                type="text"
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                placeholder="src/components/MyComponent.tsx"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500/50 font-mono"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewFileModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFile}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow"
              >
                Create File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
