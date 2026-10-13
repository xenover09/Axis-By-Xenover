import React, { useState, useEffect, useRef, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import Editor from '@monaco-editor/react';
import { Player } from '@remotion/player';
import type { PlayerRef } from '@remotion/player';
import { 
  Play, Pause, RotateCcw, Trash2, Settings as SettingsIcon, ChevronLeft, 
  AlertCircle, CheckCircle2, Download, Search, Plus, Edit2, Video, 
  Minus, Square, X, Code2, FolderOpen, Sun, Moon,
  FilePlus, FolderPlus, FileText, ChevronRight, ChevronDown, Star, Folder,
  Sparkles, Sliders, Copy, Film, BookOpen, HelpCircle,
  Globe, GitBranch, ExternalLink, RefreshCw
} from 'lucide-react';
import { evaluateProject } from './utils/compiler';
import type { ProjectFile } from './utils/compiler';
import { axisLogoUri as axisLogo } from './assets/logoDataUri';

declare const __APP_VERSION__: string;
declare const __APP_HOMEPAGE__: string;
declare const __APP_REPOSITORY__: string;

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Preview Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', color: '#fca5a5', backgroundColor: '#450a0a', width: '100%', height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px' }}>
            <AlertCircle size={18} /> Component Error
          </div>
          <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', margin: 0, opacity: 0.9 }}>{this.state.error?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function getApiUrl(): string {
  try {
    const electronPort = (window as any).electron?.getServerPort?.();
    if (electronPort) return `http://127.0.0.1:${electronPort}/api`;
  } catch (e) {}
  const urlParams = new URLSearchParams(window.location.search);
  const port = urlParams.get('port') || '17842';
  return `http://127.0.0.1:${port}/api`;
}
const API_URL = getApiUrl();

type Theme = 'light' | 'dark' | 'system';

type RenderSettings = {
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5' | 'custom';
  quality: '720p' | '1080p' | '4K';
  customWidth: number;
  customHeight: number;
  fps: number;
  durationInSeconds: number;
};

type Project = {
  id: string;
  name: string;
  template: string;
  code: string;
  settings: RenderSettings;
  thumbnailUrl?: string;
  files: ProjectFile[];
  activeFilePath: string;
  entryFilePath: string;
};

function getDimensions(settings: RenderSettings) {
  if (settings.aspectRatio === 'custom') return { w: settings.customWidth, h: settings.customHeight };
  
  let base = 1920;
  if (settings.quality === '720p') base = 1280;
  if (settings.quality === '1080p') base = 1920;
  if (settings.quality === '4K') base = 3840;

  if (settings.aspectRatio === '16:9') return { w: base, h: Math.round(base * 9 / 16) };
  if (settings.aspectRatio === '9:16') {
    const h = settings.quality === '720p' ? 1280 : settings.quality === '1080p' ? 1920 : 3840;
    return { w: Math.round(h * 9 / 16), h };
  }
  if (settings.aspectRatio === '1:1') return { w: base, h: base };
  if (settings.aspectRatio === '4:5') return { w: Math.round(base * 4 / 5), h: base };
  return { w: 1080, h: 1920 };
}

function ProjectThumbnailPreview({ project }: { project: Project }) {
  const [component, setComponent] = useState<React.FC | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [evalError, setEvalError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    try {
      const filesToEval = (project.files && project.files.length > 0)
        ? project.files
        : [{ name: 'UserCode.tsx', path: 'UserCode.tsx', content: project.code || '' }];
      const entry = project.entryFilePath || (filesToEval[0] ? filesToEval[0].path : 'UserCode.tsx');
      const res = evaluateProject(filesToEval, entry);
      if (isMounted) {
        if (res && res.component) {
          setComponent(() => res.component);
          setEvalError(false);
        } else {
          setEvalError(true);
        }
      }
    } catch (e) {
      if (isMounted) setEvalError(true);
    }
    return () => {
      isMounted = false;
    };
  }, [project.files, project.entryFilePath, project.code]);

  const dims = getDimensions(project.settings);
  const durationFrames = Math.max(1, (project.settings.durationInSeconds || 5) * (project.settings.fps || 30));
  const previewFrame = Math.min(25, Math.floor(durationFrames / 2));

  if (project.thumbnailUrl) {
    return (
      <div 
        className="project-thumbnail-wrapper"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <video 
          src={project.thumbnailUrl} 
          muted 
          playsInline 
          loop 
          autoPlay={isHovered}
          className="project-thumbnail-media"
        />
      </div>
    );
  }

  if (component && !evalError) {
    return (
      <div 
        className="project-thumbnail-wrapper"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="project-thumbnail-player-inner">
          <ErrorBoundary>
            <Player
              component={component}
              durationInFrames={durationFrames}
              compositionWidth={dims.w}
              compositionHeight={dims.h}
              fps={project.settings.fps || 30}
              controls={false}
              autoPlay={isHovered}
              loop
              initialFrame={previewFrame}
              style={{
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                objectFit: 'cover',
              }}
              errorFallback={() => (
                <div className="project-thumbnail-placeholder">
                  <Film size={34} color="var(--accent-color)" />
                  <span>{project.name}</span>
                </div>
              )}
            />
          </ErrorBoundary>
        </div>
      </div>
    );
  }

  return (
    <div className="project-thumbnail-placeholder">
      <Film size={34} color="var(--accent-color)" />
      <span>{project.template || project.name}</span>
    </div>
  );
}

type TreeNode = {
  name: string;
  fullPath: string;
  isFolder: boolean;
  children: TreeNode[];
  file?: ProjectFile;
};

function buildFileTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode = { name: '', fullPath: '', isFolder: true, children: [] };

  for (const file of files) {
    const parts = file.path.replace(/\\/g, '/').split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const curPath = parts.slice(0, i + 1).join('/');

      if (isLast) {
        current.children.push({
          name: part,
          fullPath: file.path,
          isFolder: false,
          children: [],
          file,
        });
      } else {
        let folderNode = current.children.find(c => c.isFolder && c.name === part);
        if (!folderNode) {
          folderNode = {
            name: part,
            fullPath: curPath,
            isFolder: true,
            children: [],
          };
          current.children.push(folderNode);
        }
        current = folderNode;
      }
    }
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFolder === b.isFolder) return a.name.localeCompare(b.name);
      return a.isFolder ? -1 : 1;
    });
    for (const n of nodes) {
      if (n.isFolder) sortNodes(n.children);
    }
  };

  sortNodes(root.children);
  return root.children;
}

function getFileIcon(name: string) {
  if (name.endsWith('.tsx') || name.endsWith('.jsx')) return <Code2 size={14} color="#38bdf8" />;
  if (name.endsWith('.ts') || name.endsWith('.js')) return <Code2 size={14} color="#facc15" />;
  if (name.endsWith('.json')) return <FileText size={14} color="#c084fc" />;
  if (name.endsWith('.css')) return <FileText size={14} color="#f472b6" />;
  return <FileText size={14} color="var(--text-secondary)" />;
}

function getEditorLanguage(filePath: string) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) return 'typescript';
  if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) return 'javascript';
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.css')) return 'css';
  if (filePath.endsWith('.html')) return 'html';
  return 'typescript';
}

const TEMPLATE_PREVIEWS: Record<string, { desc: string; gradient: string; ratio: '16:9' | '9:16' }> = {
  AuroraGlow: {
    desc: 'Dreamy generative ambient aurora canvas with dynamic flowing lights and glass card.',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
    ratio: '16:9',
  },
  SocialReel: {
    desc: 'Trendy 9:16 viral vertical reel with animated punchy headline and pulsing gradients.',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)',
    ratio: '9:16',
  },
  TitleReveal: {
    desc: 'Cinematic 3D intro with flying kinetic particles, dynamic spring physics, and bold text.',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #000000 100%)',
    ratio: '16:9',
  },
  GlowBlocks: {
    desc: 'Futuristic rhythm-synced neon blocks pulsing to generative mathematical waves.',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #064e3b 100%)',
    ratio: '16:9',
  },
  NeonSpiral: {
    desc: 'Psychedelic cyberpunk wireframe spiral spinning in an infinite perspective vortex.',
    gradient: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 50%, #1e1b4b 100%)',
    ratio: '16:9',
  },
};

function normalizeProject(p: any): Project {
  let files: ProjectFile[] = p.files;
  if (!files || files.length === 0) {
    if (p.folderFiles && p.folderFiles.length > 0) {
      files = p.folderFiles.map((f: any) => ({
        name: f.name,
        path: f.path && !f.path.includes(':') ? f.path : f.name,
        content: f.content
      }));
    } else {
      files = [{ name: 'UserCode.tsx', path: 'UserCode.tsx', content: p.code || '' }];
    }
  }

  const entryFilePath = p.entryFilePath 
    || files.find(f => f.name === 'UserCode.tsx' || f.name === 'Root.tsx')?.path
    || files.find(f => f.content.includes('export default') && (f.name.endsWith('.tsx') || f.name.endsWith('.jsx')))?.path
    || files.find(f => f.content.includes('export default'))?.path
    || files[0]?.path
    || 'UserCode.tsx';

  const activeFilePath = p.activeFilePath || entryFilePath;
  const activeFile = files.find(f => f.path === activeFilePath) || files[0];

  return {
    id: p.id || Date.now().toString(),
    name: p.name || 'Untitled Project',
    template: p.template || 'Blank',
    settings: p.settings || { aspectRatio: '9:16', quality: '1080p', customWidth: 1080, customHeight: 1920, fps: 30, durationInSeconds: 5 },
    thumbnailUrl: p.thumbnailUrl,
    files,
    entryFilePath,
    activeFilePath: activeFile ? activeFile.path : entryFilePath,
    code: activeFile ? activeFile.content : p.code || '',
  };
}

export default function App() {
  const [screen, setScreen] = useState<'home' | 'editor' | 'new-project'>('home');
  const [homeTab, setHomeTab] = useState<'projects' | 'templates' | 'settings'>('projects');
  const [theme, setTheme] = useState<Theme>('dark');
  const [exportDest, setExportDest] = useState('Downloads/Axis');

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('axis_projects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeProject);
        }
      }
    } catch (e) {
      console.error('Failed to load saved projects:', e);
    }
    return [];
  });

  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [code, setCode] = useState<string>('');
  const [compiledComponent, setCompiledComponent] = useState<React.FC | null>(null);
  const [compositionMeta, setCompositionMeta] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState<'live' | 'rendered'>('live');
  const playerRef = useRef<PlayerRef | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackFrame, setPlaybackFrame] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // File explorer states
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [newFileModal, setNewFileModal] = useState<{ isOpen: boolean; isFolder: boolean } | null>(null);
  const [newFileInput, setNewFileInput] = useState('');

  // About modal states
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [updateState, setUpdateState] = useState<{
    status: 'idle' | 'checking' | 'up-to-date' | 'update-available';
    message?: string;
    url?: string;
  }>({ status: 'idle' });
  const [appMeta, setAppMeta] = useState({
    version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '',
    homepage: typeof __APP_HOMEPAGE__ !== 'undefined' ? __APP_HOMEPAGE__ : '',
    repository: typeof __APP_REPOSITORY__ !== 'undefined' ? __APP_REPOSITORY__ : '',
  });

  // Render states
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgressData, setRenderProgressData] = useState<any>(null);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [renderLocalPath, setRenderLocalPath] = useState<string | null>(null);
  const [exportFolder, setExportFolder] = useState<string>(() => localStorage.getItem('axis_export_folder') || '');
  const renderIntervalRef = useRef<any>(null);

  const handleSelectExportFolder = async () => {
    if ((window as any).electron?.selectExportFolder) {
      const selected = await (window as any).electron.selectExportFolder();
      if (selected) {
        setExportFolder(selected);
        localStorage.setItem('axis_export_folder', selected);
      }
    }
  };

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, projectId: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuDropdown, setActiveMenuDropdown] = useState<'file' | 'help' | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<string[]>([
    'AuroraGlow', 'SocialReel', 'TitleReveal', 'GlowBlocks', 'NeonSpiral'
  ]);

  // Close menu dropdown on click outside
  useEffect(() => {
    const handleWindowClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.header-app-menu')) {
        setActiveMenuDropdown(null);
      }
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // Listen for Electron Menu events
  useEffect(() => {
    if ((window as any).electron?.onMenuOpenFolder) {
      (window as any).electron.onMenuOpenFolder((data: any) => {
        if (data && data.files && data.files.length > 0) {
          const files: ProjectFile[] = data.files.map((f: any) => ({
            name: f.name,
            path: f.path,
            content: f.content
          }));
          const entryFile = files.find(f => f.name === 'UserCode.tsx' || f.name === 'Root.tsx')
            || files.find(f => f.content.includes('export default') && (f.name.endsWith('.tsx') || f.name.endsWith('.jsx')))
            || files.find(f => f.content.includes('export default'))
            || files[0];
          const newProject: Project = {
            id: Date.now().toString(),
            name: data.folderPath.split(/[/\\]/).pop() || 'Imported Project',
            template: 'Folder',
            code: entryFile ? entryFile.content : '',
            files,
            activeFilePath: entryFile ? entryFile.path : files[0].path,
            entryFilePath: entryFile ? entryFile.path : files[0].path,
            settings: { aspectRatio: '9:16', quality: '1080p', customWidth: 1080, customHeight: 1920, fps: 30, durationInSeconds: 5 },
          };
          setProjects(prev => [newProject, ...prev]);
          openProject(newProject);
        }
      });
    }
    if ((window as any).electron?.onMenuNewProject) {
      (window as any).electron.onMenuNewProject(() => {
        handleCreateBlankProject();
      });
    }
    if ((window as any).electron?.onMenuAbout) {
      (window as any).electron.onMenuAbout(() => {
        setShowAboutModal(true);
      });
    }
    if ((window as any).electron?.getMetadata) {
      (window as any).electron.getMetadata().then((data: any) => {
        if (data) {
          setAppMeta(prev => ({
            version: data.version || prev.version,
            homepage: data.homepage || prev.homepage,
            repository: data.repository || prev.repository,
          }));
        }
      });
    }
  }, []);

  // Persist projects
  useEffect(() => {
    try {
      localStorage.setItem('axis_projects', JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to persist projects:', e);
    }
  }, [projects]);

  // Theme Sync
  useEffect(() => {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [theme]);

  // Fetch templates from server if available
  useEffect(() => {
    fetch(`${API_URL}/templates`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.templates) && data.templates.length > 0) {
          setAvailableTemplates(prev => Array.from(new Set([...prev, ...data.templates])));
        }
      })
      .catch(() => {});
  }, []);

  // Multi-file Compiler debounce
  useEffect(() => {
    if (!activeProject || !activeProject.files || activeProject.files.length === 0) {
      setCompiledComponent(() => null);
      setError(null);
      return;
    }
    const timer = setTimeout(() => {
      const { component, compositionMeta: meta, error: compError } = evaluateProject(activeProject.files, activeProject.entryFilePath);
      if (compError) {
        setError(compError);
      } else {
        setError(null);
        setCompiledComponent(() => component);
        setCompositionMeta(meta);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [activeProject?.files, activeProject?.entryFilePath]);

  // Sync player events
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onFrame = (e: any) => {
      if (e?.detail?.frame !== undefined) setPlaybackFrame(e.detail.frame);
    };

    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);
    player.addEventListener('timeupdate', onFrame);

    return () => {
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
      player.removeEventListener('timeupdate', onFrame);
    };
  }, [compiledComponent]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setExplorerCollapsed(prev => !prev);
      } else if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (activeProject) {
          setProjects(prev => prev.map(p => p.id === activeProject.id ? activeProject : p));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeProject]);

  const handleMinimize = () => {
    if ((window as any).electron) (window as any).electron.minimize();
  };
  const handleMaximize = () => {
    if ((window as any).electron) (window as any).electron.toggleMaximize();
  };
  const handleClose = () => {
    if ((window as any).electron) (window as any).electron.close();
  };

  const openProject = (proj: Project) => {
    const normalized = normalizeProject(proj);
    setActiveProject(normalized);
    setCode(normalized.code);
    setScreen('editor');
    setRenderUrl(null);
  };

  const handleCreateBlankProject = () => {
    const newProj: Project = {
      id: Date.now().toString(),
      name: 'Untitled Project',
      template: 'Blank',
      code: '',
      files: [{ name: 'UserCode.tsx', path: 'UserCode.tsx', content: '' }],
      entryFilePath: 'UserCode.tsx',
      activeFilePath: 'UserCode.tsx',
      settings: {
        aspectRatio: '16:9',
        quality: '1080p',
        customWidth: 1920,
        customHeight: 1080,
        fps: 30,
        durationInSeconds: 5
      }
    };
    setProjects(prev => [newProj, ...prev]);
    openProject(newProj);
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      let templateCode = '';
      try {
        const res = await fetch(`${API_URL}/templates/${templateId}`);
        if (res.ok) templateCode = await res.text();
      } catch (e) {}

      if (!templateCode) {
        // Fallback default codes
        templateCode = `import React from 'react';\nimport { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';\n\nexport default function ${templateId}() {\n  const frame = useCurrentFrame();\n  const { width, height } = useVideoConfig();\n  return (\n    <AbsoluteFill style={{ backgroundColor: '#07090e', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>\n      <h1 style={{ fontSize: 64 }}>${templateId}</h1>\n    </AbsoluteFill>\n  );\n}`;
      }

      const presetRatio = TEMPLATE_PREVIEWS[templateId]?.ratio || '9:16';
      const newProj: Project = {
        id: Date.now().toString(),
        name: `${templateId} Reel`,
        template: templateId,
        code: templateCode,
        files: [{ name: 'UserCode.tsx', path: 'UserCode.tsx', content: templateCode }],
        entryFilePath: 'UserCode.tsx',
        activeFilePath: 'UserCode.tsx',
        settings: {
          aspectRatio: presetRatio,
          quality: '1080p',
          customWidth: presetRatio === '9:16' ? 1080 : 1920,
          customHeight: presetRatio === '9:16' ? 1920 : 1080,
          fps: 30,
          durationInSeconds: 5
        }
      };
      setProjects(prev => [newProj, ...prev]);
      openProject(newProj);
    } catch (e) {
      console.error(e);
    }
  };
  void availableTemplates;
  void handleCreateFromTemplate;

  const handleOpenFolder = async () => {
    if (!(window as any).electron?.openFolder) {
      alert('Folder import requires running in the Electron desktop environment.');
      return;
    }
    try {
      const data = await (window as any).electron.openFolder();
      if (data && data.files && data.files.length > 0) {
        const files: ProjectFile[] = data.files.map((f: any) => ({
          name: f.name,
          path: f.path,
          content: f.content
        }));

        const entryFile = files.find(f => f.name === 'UserCode.tsx' || f.name === 'Root.tsx')
          || files.find(f => f.content.includes('export default') && (f.name.endsWith('.tsx') || f.name.endsWith('.jsx')))
          || files.find(f => f.content.includes('export default'))
          || files[0];
        
        const newProject: Project = {
          id: Date.now().toString(),
          name: data.folderPath.split(/[/\\]/).pop() || 'Imported Project',
          template: 'Folder',
          code: entryFile ? entryFile.content : '',
          files,
          activeFilePath: entryFile ? entryFile.path : files[0].path,
          entryFilePath: entryFile ? entryFile.path : files[0].path,
          settings: { aspectRatio: '9:16', quality: '1080p', customWidth: 1080, customHeight: 1920, fps: 30, durationInSeconds: 5 },
        };
        setProjects(prev => [newProject, ...prev]);
        openProject(newProject);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const saveActiveProjectSettings = (newSettings: RenderSettings) => {
    if (!activeProject) return;
    const updated = { ...activeProject, settings: newSettings };
    setActiveProject(updated);
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const saveActiveProjectCode = (newCode: string) => {
    setCode(newCode);
    if (previewMode === 'rendered') {
      setPreviewMode('live');
    }
    if (!activeProject) return;

    const activePath = activeProject.activeFilePath || activeProject.entryFilePath;
    const updatedFiles = activeProject.files.map(f => 
      f.path === activePath ? { ...f, content: newCode } : f
    );

    const isEntry = activePath === activeProject.entryFilePath;
    const updated: Project = {
      ...activeProject,
      code: isEntry ? newCode : activeProject.code,
      files: updatedFiles,
    };

    setActiveProject(updated);
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleSelectFile = (filePath: string) => {
    if (!activeProject) return;
    const targetFile = activeProject.files.find(f => f.path === filePath);
    if (!targetFile) return;

    const updated: Project = {
      ...activeProject,
      activeFilePath: filePath,
      code: targetFile.content,
    };
    setActiveProject(updated);
    setCode(targetFile.content);
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleSetMainEntry = (filePath: string) => {
    if (!activeProject) return;
    const updated: Project = {
      ...activeProject,
      entryFilePath: filePath,
    };
    setActiveProject(updated);
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleCreateFileOrFolder = () => {
    if (!activeProject || !newFileInput.trim()) return;
    let cleanPath = newFileInput.trim().replace(/\\/g, '/').replace(/^\//, '');

    if (newFileModal?.isFolder) {
      cleanPath = `${cleanPath}/Component.tsx`;
    } else if (!cleanPath.includes('.')) {
      cleanPath += '.tsx';
    }

    const name = cleanPath.split('/').pop() || cleanPath;
    let initialContent = '';
    if (cleanPath.endsWith('.tsx') || cleanPath.endsWith('.jsx')) {
      const compName = name.replace(/\.(tsx|jsx)$/, '').replace(/[^a-zA-Z0-9]/g, '');
      initialContent = `import React from 'react';\n\nexport default function ${compName || 'Component'}() {\n  return (\n    <div style={{ color: 'white', fontSize: 28, padding: 20 }}>\n      ${name}\n    </div>\n  );\n}\n`;
    } else if (cleanPath.endsWith('.json')) {
      initialContent = '{\n  \n}\n';
    } else if (cleanPath.endsWith('.css')) {
      initialContent = '/* Styles */\n';
    } else {
      initialContent = '// Code\n';
    }

    const newFile: ProjectFile = { name, path: cleanPath, content: initialContent };
    const existingIdx = activeProject.files.findIndex(f => f.path === cleanPath);
    let updatedFiles = [...activeProject.files];
    if (existingIdx >= 0) {
      updatedFiles[existingIdx] = newFile;
    } else {
      updatedFiles.push(newFile);
    }

    const updated: Project = {
      ...activeProject,
      files: updatedFiles,
      activeFilePath: cleanPath,
      code: initialContent,
    };
    setActiveProject(updated);
    setCode(initialContent);
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    setNewFileModal(null);
    setNewFileInput('');
  };

  const handleDeleteFile = (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeProject) return;
    if (activeProject.files.length <= 1) {
      alert('Project must have at least 1 file.');
      return;
    }
    if (!window.confirm(`Delete "${filePath}"?`)) return;

    const updatedFiles = activeProject.files.filter(f => f.path !== filePath);
    let newEntry = activeProject.entryFilePath;
    if (activeProject.entryFilePath === filePath) {
      newEntry = updatedFiles.find(f => f.content.includes('export default'))?.path || updatedFiles[0].path;
    }

    let newActive = activeProject.activeFilePath;
    if (activeProject.activeFilePath === filePath) {
      newActive = newEntry;
    }
    const activeFile = updatedFiles.find(f => f.path === newActive) || updatedFiles[0];

    const updated: Project = {
      ...activeProject,
      files: updatedFiles,
      entryFilePath: newEntry,
      activeFilePath: activeFile.path,
      code: activeFile.content,
    };
    setActiveProject(updated);
    setCode(activeFile.content);
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleRender = async (isDraft = false) => {
    if (!activeProject) return;
    
    if (renderIntervalRef.current) {
      clearInterval(renderIntervalRef.current);
      renderIntervalRef.current = null;
    }

    setIsRendering(true);
    setRenderUrl(null);
    setRenderLocalPath(null);
    setRenderProgressData({ status: 'bundling', renderedFrames: 0, totalFrames: 0 });
    
    try {
      const { w, h } = getDimensions(activeProject.settings);
      const entryFile = activeProject.files.find(f => f.path === activeProject.entryFilePath) || activeProject.files[0];
      
      const res = await fetch(`${API_URL}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: entryFile?.content || code,
          entryFile: activeProject.entryFilePath,
          files: activeProject.files,
          isDraft,
          exportDest: exportFolder || undefined,
          settings: {
            width: isDraft ? Math.round(w * 0.67) : w,
            height: isDraft ? Math.round(h * 0.67) : h,
            fps: activeProject.settings.fps,
            durationInFrames: activeProject.settings.durationInSeconds * activeProject.settings.fps
          } 
        }),
      });
      const data = await res.json();
      
      if (data.renderId) {
        const interval = setInterval(async () => {
          try {
            const progRes = await fetch(`${API_URL}/progress/${data.renderId}`);
            const progData = await progRes.json();
            
            if (progData.status === 'done') {
              if (renderIntervalRef.current) clearInterval(renderIntervalRef.current);
              setRenderUrl(progData.url);
              setPreviewMode('rendered');
              if (progData.localPath) {
                setRenderLocalPath(progData.localPath);
              }
              setIsRendering(false);
              setRenderProgressData(null);
              
              const finalUrl = progData.url;
              setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, thumbnailUrl: finalUrl } : p));
              setActiveProject(prev => prev ? { ...prev, thumbnailUrl: finalUrl } : null);
            } else if (progData.status === 'error') {
              if (renderIntervalRef.current) clearInterval(renderIntervalRef.current);
              alert('Render Error: ' + progData.error);
              setIsRendering(false);
              setRenderProgressData(null);
            } else {
              setRenderProgressData(progData);
            }
          } catch (e) {}
        }, 250);
        renderIntervalRef.current = interval;
      } else if (data.error) {
        alert('Render Error: ' + data.error);
        setIsRendering(false);
      }
    } catch (err) {
      alert('Failed to render: ' + err);
      setIsRendering(false);
    }
  };

  const deleteProject = (id: string) => {
    if (window.confirm('Delete this project?')) {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (activeProject?.id === id) {
        setScreen('home');
        setActiveProject(null);
      }
    }
  };

  const renderTreeNodes = (nodes: TreeNode[], depth = 0) => {
    return nodes.map((node) => {
      if (node.isFolder) {
        const isExpanded = expandedFolders[node.fullPath] !== false;
        return (
          <div key={node.fullPath} className="tree-folder">
            <div 
              className="tree-folder-row" 
              style={{ paddingLeft: `${14 + depth * 12}px` }}
              onClick={() => setExpandedFolders(prev => ({ ...prev, [node.fullPath]: !prev[node.fullPath] }))}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Folder size={15} color="#38bdf8" />
              <span>{node.name}</span>
            </div>
            {isExpanded && (
              <div className="tree-folder-children">
                {renderTreeNodes(node.children, depth + 1)}
              </div>
            )}
          </div>
        );
      }

      const isActive = activeProject?.activeFilePath === node.fullPath;
      const isEntry = activeProject?.entryFilePath === node.fullPath;

      return (
        <div 
          key={node.fullPath}
          className={`tree-item-file ${isActive ? 'active' : ''}`}
          style={{ paddingLeft: `${16 + depth * 12}px` }}
          onClick={() => handleSelectFile(node.fullPath)}
          title={node.fullPath}
        >
          {getFileIcon(node.name)}
          <span className="file-name-text">{node.name}</span>

          {isEntry && (
            <span className="main-entry-badge" title="Main Video Composition">
              <Star size={10} fill="#facc15" /> Main
            </span>
          )}

          <div className="tree-item-actions">
            {!isEntry && (
              <button 
                className="explorer-btn" 
                onClick={(e) => { e.stopPropagation(); handleSetMainEntry(node.fullPath); }}
                title="Set as Main Composition"
              >
                <Star size={12} />
              </button>
            )}
            <button 
              className="explorer-btn" 
              onClick={(e) => handleDeleteFile(node.fullPath, e)}
              title="Delete File"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="app-container">
      {/* ========================================================
          UNIFIED TOP HEADER / TITLE BAR ("ooper wali patti")
      ======================================================== */}
      <div className="top-header-bar" onDoubleClick={handleMaximize}>
        <div className="header-left-zone">
          <div className="brand-badge" onClick={() => setScreen('home')} title="Axis Studio Home">
            <img src={axisLogo} className="brand-logo-img" alt="Axis" />
            <div className="brand-title">
              Axis <span className="brand-version-pill">v1.0</span>
            </div>
          </div>

          {/* File & Help Application Menu (Only File and Help) */}
          <div className="header-app-menu">
            <div className="menu-dropdown-wrapper">
              <button 
                type="button"
                className={`menu-bar-btn ${activeMenuDropdown === 'file' ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setActiveMenuDropdown(prev => prev === 'file' ? null : 'file'); }}
              >
                File
              </button>
              {activeMenuDropdown === 'file' && (
                <div className="menu-dropdown-menu">
                  <div className="menu-dropdown-item" onClick={() => { setActiveMenuDropdown(null); handleOpenFolder(); }}>
                    <FolderOpen size={14} /> Open Folder...
                  </div>
                  <div className="menu-dropdown-item" onClick={() => { setActiveMenuDropdown(null); handleCreateBlankProject(); }}>
                    <Plus size={14} /> New Project
                  </div>
                  {activeProject && (
                    <div className="menu-dropdown-item" onClick={() => { setActiveMenuDropdown(null); alert('Project is automatically saved!'); }}>
                      <CheckCircle2 size={14} /> Save Project
                    </div>
                  )}
                  {(window as any).electron && (
                    <>
                      <div className="menu-dropdown-divider" />
                      <div className="menu-dropdown-item" onClick={() => { setActiveMenuDropdown(null); (window as any).electron.close(); }}>
                        <X size={14} /> Exit
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="menu-dropdown-wrapper">
              <button 
                type="button"
                className={`menu-bar-btn ${activeMenuDropdown === 'help' ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setActiveMenuDropdown(prev => prev === 'help' ? null : 'help'); }}
              >
                Help
              </button>
              {activeMenuDropdown === 'help' && (
                <div className="menu-dropdown-menu">
                  <div className="menu-dropdown-item" onClick={() => { setActiveMenuDropdown(null); window.open('https://remotion.dev/docs', '_blank'); }}>
                    <BookOpen size={14} /> Remotion Docs
                  </div>
                  <div className="menu-dropdown-item" onClick={() => { setActiveMenuDropdown(null); setShowAboutModal(true); }}>
                    <HelpCircle size={14} /> About Axis
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Switcher Tabs when on Home */}
          {screen === 'home' && (
            <div className="header-nav-tabs">
              <button 
                className={`nav-tab-btn ${homeTab === 'projects' ? 'active' : ''}`}
                onClick={() => setHomeTab('projects')}
              >
                <Folder size={14} /> Projects
                <span className="nav-tab-badge">{projects.length}</span>
              </button>
              <button 
                className={`nav-tab-btn ${homeTab === 'templates' ? 'active' : ''}`}
                onClick={() => setHomeTab('templates')}
              >
                <Sparkles size={14} /> Templates
              </button>
            </div>
          )}

          {/* Navigation Controls when inside Editor */}
          {screen === 'editor' && activeProject && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button className="editor-back-btn" onClick={() => setScreen('home')} title="Back to Projects">
                <ChevronLeft size={16} /> Projects
              </button>
              <div className="project-title-editor">
                <input 
                  type="text" 
                  value={activeProject.name} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setActiveProject(prev => prev ? { ...prev, name: val } : null);
                    setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, name: val } : p));
                  }} 
                  className="project-title-input"
                  title="Click to rename project"
                />
                <span className="saved-pill">
                  <CheckCircle2 size={11} /> Saved
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Center Zone Meta Pills in Editor */}
        {screen === 'editor' && activeProject && (
          <div className="header-center-zone">
            <div className="meta-pill" title="Active File">
              <Code2 size={13} color="#38bdf8" />
              <span>{activeProject.activeFilePath}</span>
            </div>
            <div className="meta-pill" title="Render Settings">
              <Film size={13} color="#facc15" />
              <span>{activeProject.settings.aspectRatio} • {activeProject.settings.durationInSeconds}s @ {activeProject.settings.fps}fps</span>
            </div>
          </div>
        )}

        {/* Right Zone Controls & Action Buttons */}
        <div className="header-right-zone">
          {screen === 'home' && (
            <>
              <button 
                className="btn-draft"
                onClick={handleOpenFolder}
                title="Open and edit folder from PC"
              >
                <FolderOpen size={14} /> Open Folder
              </button>
              <button 
                className="btn-primary-gradient" 
                onClick={handleCreateBlankProject}
                title="Create a new blank video project"
              >
                <Plus size={15} /> New Project
              </button>
            </>
          )}

          {screen === 'editor' && activeProject && (
            <>
              {isRendering && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid var(--accent-color)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                  <span>
                    {renderProgressData?.status === 'bundling' ? 'Preparing media...' : `Rendering ${renderProgressData?.renderedFrames || 0}/${renderProgressData?.totalFrames || '...'}`}
                  </span>
                </div>
              )}

              {renderUrl && !isRendering ? (
                <a 
                  href={renderUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  download 
                  className="btn-primary-gradient" 
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, padding: '7px 16px', borderRadius: '8px' }}
                >
                  <Download size={15} /> Download MP4
                </a>
              ) : !isRendering ? (
                <button 
                  className="btn-primary-gradient" 
                  onClick={() => handleRender(false)}
                  title="Render and download MP4"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, padding: '7px 16px', borderRadius: '8px' }}
                >
                  <Download size={15} /> Download MP4
                </button>
              ) : null}
            </>
          )}

          {/* Theme switcher */}
          <button 
            className="header-icon-btn" 
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Window Control Buttons */}
          <div className="window-controls">
            <button className="win-control-btn" onClick={handleMinimize} title="Minimize"><Minus size={15} /></button>
            <button className="win-control-btn" onClick={handleMaximize} title="Maximize"><Square size={13} /></button>
            <button className="win-control-btn close" onClick={handleClose} title="Close"><X size={16} /></button>
          </div>
        </div>
      </div>

      {/* ========================================================
          APP BODY CONTENT
      ======================================================== */}
      <div className="app-body">
        {/* HOME SCREEN */}
        {screen === 'home' && (
          <div className="home-view-container">
            {/* PROJECTS TAB */}
            {homeTab === 'projects' && (
              <>
                <div className="home-hero-banner">
                  <div className="hero-title-group">
                    <h1>My Projects</h1>
                    <p>Code, preview, and render stunning high-framerate React reels natively.</p>
                  </div>
                  <div className="hero-actions-group">
                    <div className="search-input-box">
                      <Search size={15} color="var(--text-muted)" />
                      <input 
                        type="text" 
                        placeholder="Search projects..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {(() => {
                  const query = searchQuery.trim().toLowerCase();
                  const filtered = query 
                    ? projects.filter(p => p.name.toLowerCase().includes(query) || p.template.toLowerCase().includes(query))
                    : projects;

                  if (filtered.length === 0) {
                    return (
                      <div className="empty-state-card">
                        <div className="empty-state-icon"><Video size={32} /></div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>No projects found</h3>
                        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {searchQuery ? `No project matches "${searchQuery}".` : 'Create your first project or pick a template to get started!'}
                        </p>
                        <button className="btn-primary-gradient" onClick={handleCreateBlankProject}>
                          <Plus size={16} /> Create Project
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="projects-grid">
                      {filtered.map(p => (
                        <div 
                          key={p.id} 
                          className="project-card"
                          onClick={() => openProject(p)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ x: e.clientX, y: e.clientY, projectId: p.id });
                          }}
                        >
                          <div className="project-thumbnail-area">
                            <ProjectThumbnailPreview project={p} />
                            <div className="thumbnail-badge-ratio">{p.settings.aspectRatio}</div>
                            <div className="thumbnail-badge-duration">{p.settings.durationInSeconds}s</div>
                          </div>
                          <div className="project-card-info">
                            <div className="project-card-header">
                              <h3 className="project-card-title">{p.name}</h3>
                              <button 
                                className="explorer-btn" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setContextMenu({ x: e.clientX, y: e.clientY, projectId: p.id });
                                }}
                              >
                                •••
                              </button>
                            </div>
                            <div className="project-card-meta">
                              <span>{p.files.length} file{p.files.length > 1 ? 's' : ''}</span>
                              <span>•</span>
                              <span>{p.settings.quality} @ {p.settings.fps}fps</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </>
            )}

            {/* TEMPLATES TAB */}
            {homeTab === 'templates' && (
              <>
                <div className="home-hero-banner">
                  <div className="hero-title-group">
                    <h1>Motion Templates</h1>
                    <p>Start instantly with production-ready generative motion graphics.</p>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '45vh',
                  textAlign: 'center',
                  padding: '40px 20px',
                }}>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 600,
                    fontStyle: 'italic',
                    color: 'var(--text-muted)',
                    letterSpacing: '1.5px',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                    Coming Soon
                  </div>
                </div>
              </>
            )}

            {/* SETTINGS TAB */}
            {homeTab === 'settings' && (
              <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="home-hero-banner" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <button className="btn-draft" onClick={() => setHomeTab('projects')}>
                    <Folder size={14} /> Back to Projects
                  </button>
                  <div className="hero-title-group">
                    <h1>Settings</h1>
                    <p>Configure output preferences and studio environment.</p>
                  </div>
                </div>

                <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px' }}>Theme Appearance</h4>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Select interface appearance mode</p>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className={`nav-tab-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>Dark</button>
                      <button className={`nav-tab-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>Light</button>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px' }}>Export Destination</h4>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Where rendered MP4s will be saved</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="text" 
                        value={exportDest} 
                        readOnly 
                        style={{ width: '180px', padding: '6px 10px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-color)', fontSize: '12px' }}
                      />
                      <button 
                        className="btn-draft"
                        onClick={async () => {
                          if ((window as any).electron?.selectExportFolder) {
                            const f = await (window as any).electron.selectExportFolder();
                            if (f) setExportDest(f);
                          }
                        }}
                      >
                        Browse
                      </button>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>Community & Support</h4>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="btn-draft" onClick={() => window.open('https://youtube.com/@xenoverhub99?si=4YKTgSh-8Eniw-uh', '_blank')}>
                        YouTube
                      </button>
                      <button className="btn-draft" onClick={() => window.open('https://discord.gg/aMs4cjgG4S', '_blank')}>
                        Discord
                      </button>
                      <button className="btn-draft" onClick={() => window.open('https://whatsapp.com/channel/0029Vb69uw7EawdnN1zo5T3u', '_blank')}>
                        WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            EDITOR SCREEN
        ======================================================== */}
        {screen === 'editor' && activeProject && (
          <div className="editor-screen">
            {/* Left File Explorer */}
            <div className={`file-explorer-sidebar ${explorerCollapsed ? 'collapsed' : ''}`}>
              <div className="explorer-header">
                <div className="explorer-title">
                  <Folder size={14} />
                  <span>FILES ({activeProject.files.length})</span>
                </div>
                <div className="explorer-actions">
                  <button 
                    className="explorer-btn" 
                    onClick={() => { setNewFileInput(''); setNewFileModal({ isOpen: true, isFolder: false }); }}
                    title="New File (e.g. Card.tsx)"
                  >
                    <FilePlus size={15} />
                  </button>
                  <button 
                    className="explorer-btn" 
                    onClick={() => { setNewFileInput(''); setNewFileModal({ isOpen: true, isFolder: true }); }}
                    title="New Folder"
                  >
                    <FolderPlus size={15} />
                  </button>
                </div>
              </div>

              <div className="explorer-tree">
                {renderTreeNodes(buildFileTree(activeProject.files))}
              </div>
            </div>

            {/* Center Code Editor Panel */}
            <div className="editor-center-panel">
              <div className="editor-tabs-bar">
                <button 
                  className="explorer-btn" 
                  onClick={() => setExplorerCollapsed(!explorerCollapsed)} 
                  title={explorerCollapsed ? "Expand Explorer" : "Collapse Explorer"}
                >
                  {explorerCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>

                <div className="editor-tab-item active">
                  {getFileIcon(activeProject.activeFilePath)}
                  <span>{activeProject.activeFilePath}</span>
                </div>

                {activeProject.activeFilePath !== activeProject.entryFilePath ? (
                  <button 
                    className="set-as-main-btn" 
                    onClick={() => handleSetMainEntry(activeProject.activeFilePath)}
                    title="Set this file as Main Video Composition"
                  >
                    <Star size={13} /> Set as Main Composition
                  </button>
                ) : (
                  <div className="main-entry-badge" style={{ marginLeft: 'auto' }}>
                    <Star size={11} fill="#facc15" /> Main Entry Point
                  </div>
                )}
              </div>

              <div className="code-editor-container">
                <Editor
                  language={getEditorLanguage(activeProject.activeFilePath)}
                  theme={theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'vs-dark' : 'light'}
                  value={code}
                  onChange={val => saveActiveProjectCode(val || '')}
                  options={{ 
                    minimap: { enabled: false }, 
                    fontSize: 14, 
                    wordWrap: 'on', 
                    padding: { top: 16 },
                    fontFamily: '"Fira Code", "Cascadia Code", Consolas, monospace',
                  }}
                />
              </div>

              {error && (
                <div className="problems-panel">
                  <div className="problems-header"><AlertCircle size={14} /> Compiler Problem</div>
                  <pre className="problems-content">{error}</pre>
                </div>
              )}
            </div>

            {/* Right Preview and Render Panel */}
            <div className="right-panel">
              {/* Preview Viewport */}
              <div className="preview-section">
                <div className="preview-wrapper">
                  <div 
                    className="player-frame-box"
                    style={{ 
                      aspectRatio: `${compositionMeta?.width || getDimensions(activeProject.settings).w} / ${compositionMeta?.height || getDimensions(activeProject.settings).h}`,
                      height: '100%',
                      width: 'auto',
                      maxWidth: '100%',
                      maxHeight: '100%'
                    }}
                  >
                    {previewMode === 'rendered' && renderUrl ? (
                      <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <video 
                          key={renderUrl}
                          src={renderUrl} 
                          controls 
                          autoPlay 
                          loop 
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                        />
                      </div>
                    ) : (
                      <ErrorBoundary>
                        {compiledComponent ? (
                          <Player
                            ref={playerRef}
                            component={compiledComponent}
                            durationInFrames={compositionMeta?.durationInFrames || (activeProject.settings.durationInSeconds * activeProject.settings.fps)}
                            compositionWidth={compositionMeta?.width || getDimensions(activeProject.settings).w}
                            compositionHeight={compositionMeta?.height || getDimensions(activeProject.settings).h}
                            fps={compositionMeta?.fps || activeProject.settings.fps}
                            controls
                            alwaysShowControls
                            clickToPlay
                            spaceKeyToPlayOrPause
                            autoPlay
                            loop
                            style={{
                              width: '100%',
                              height: '100%',
                              backgroundColor: '#000',
                            }}
                            errorFallback={(e: any) => (
                              <div style={{ padding: '20px', color: '#fca5a5', backgroundColor: '#450a0a', width: '100%', height: '100%', overflow: 'auto' }}>
                                <h4 style={{ margin: '0 0 8px 0' }}>Render Error</h4>
                                <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', margin: 0 }}>{e.error.message}</pre>
                              </div>
                            )}
                          />
                        ) : (
                          <div className="loading-preview-box">
                            {error ? (
                              <div style={{ color: '#f87171' }}>Fix code errors to resume preview</div>
                            ) : (
                              <div>Preparing Remotion Player...</div>
                            )}
                          </div>
                        )}
                      </ErrorBoundary>
                    )}

                    {/* Rendering In-Player Progress Overlay with 1-100% counter and timer */}
                    {isRendering && (
                      <div className="render-overlay-modal">
                        {(() => {
                          const tf = renderProgressData?.totalFrames || 0;
                          const rf = renderProgressData?.renderedFrames || 0;
                          const pct = tf > 0 
                            ? Math.min(100, Math.max(1, Math.round((rf / tf) * 100))) 
                            : (renderProgressData?.status === 'rendering' ? 10 : 1);
                          return (
                            <>
                              <div className="render-progress-circle">
                                <svg viewBox="0 0 100 100">
                                  <circle className="circle-bg" cx="50" cy="50" r="40" />
                                  <circle 
                                    className="circle-progress" 
                                    cx="50" cy="50" r="40" 
                                    style={{ 
                                      strokeDasharray: 251.2, 
                                      strokeDashoffset: 251.2 - ((pct / 100) * 251.2)
                                    }} 
                                  />
                                </svg>
                                <div className="circle-text" style={{ fontSize: '20px', fontWeight: 900 }}>
                                  {pct}%
                                </div>
                              </div>
                              <div className="render-status-title" style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                                {renderProgressData?.status === 'bundling' ? 'Packaging Bundle...' : `Rendering Video: ${pct}%`}
                              </div>
                              <div className="render-status-detail" style={{ fontSize: '13px', marginTop: '6px', color: '#94a3b8' }}>
                                {renderProgressData?.status === 'rendering' 
                                  ? `Frame ${rf} / ${tf} • Speed: ${renderProgressData.currentFps || 0} fps • ETA: ${renderProgressData.eta || 'calculating...'}`
                                  : 'Preparing Remotion render pipeline...'}
                              </div>
                              <div style={{ width: '80%', maxWidth: '280px', height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginTop: '14px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #00f2fe, #4facfe)', transition: 'width 0.25s ease' }} />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Studio Live Playback Toolbar */}
                <div className="studio-playback-toolbar">
                  <button 
                    type="button" 
                    className="btn-playback-action"
                    onClick={() => {
                      if (playerRef.current) {
                        if (isPlaying) {
                          playerRef.current.pause();
                        } else {
                          playerRef.current.play();
                        }
                      }
                    }}
                    title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                  </button>
                  <button 
                    type="button" 
                    className="btn-playback-mini"
                    onClick={() => playerRef.current?.seekTo(0)}
                    title="Restart from Start"
                  >
                    <RotateCcw size={13} />
                  </button>
                  <input 
                    type="range"
                    min={0}
                    max={Math.max(1, (compositionMeta?.durationInFrames || (activeProject.settings.durationInSeconds * activeProject.settings.fps)) - 1)}
                    value={playbackFrame}
                    onChange={(e) => playerRef.current?.seekTo(Number(e.target.value))}
                    className="playback-timeline-slider"
                  />
                  <span className="playback-counter-badge">
                    {playbackFrame}f / {compositionMeta?.durationInFrames || (activeProject.settings.durationInSeconds * activeProject.settings.fps)}f
                  </span>
                </div>
              </div>

              {/* Preview Info Tag */}
              <div className="preview-info-bar">
                <span>Entry: <strong>{activeProject.entryFilePath}</strong></span>
                <span>{compositionMeta?.width || getDimensions(activeProject.settings).w} × {compositionMeta?.height || getDimensions(activeProject.settings).h}</span>
              </div>

              {/* Render Settings Card */}
              <div className="render-settings-card">
                <div className="render-settings-header">
                  <div className="render-settings-title">
                    <Sliders size={16} color="var(--accent-color)" /> Render Settings
                  </div>
                </div>

                <div className="settings-fields-grid">
                  <div className="setting-field-group">
                    <label>Aspect Ratio</label>
                    <select 
                      value={activeProject.settings.aspectRatio}
                      onChange={e => saveActiveProjectSettings({...activeProject.settings, aspectRatio: e.target.value as any})}
                    >
                      <option value="9:16">9:16 (Portrait / Reel)</option>
                      <option value="16:9">16:9 (Landscape / YouTube)</option>
                      <option value="1:1">1:1 (Square / Post)</option>
                      <option value="4:5">4:5 (Social)</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  
                  <div className="setting-field-group">
                    <label>Quality</label>
                    <select 
                      value={activeProject.settings.quality}
                      onChange={e => saveActiveProjectSettings({...activeProject.settings, quality: e.target.value as any})}
                      disabled={activeProject.settings.aspectRatio === 'custom'}
                    >
                      <option value="1080p">1080p (Full HD)</option>
                      <option value="720p">720p (Draft Fast)</option>
                      <option value="4K">4K (Ultra HD)</option>
                    </select>
                  </div>

                  <div className="setting-field-group">
                    <label>Framerate</label>
                    <select 
                      value={activeProject.settings.fps}
                      onChange={e => saveActiveProjectSettings({...activeProject.settings, fps: Number(e.target.value)})}
                    >
                      <option value="30">30 fps (Standard)</option>
                      <option value="60">60 fps (Super Smooth)</option>
                    </select>
                  </div>

                  <div className="setting-field-group">
                    <label>Duration</label>
                    <select 
                      value={activeProject.settings.durationInSeconds}
                      onChange={e => saveActiveProjectSettings({...activeProject.settings, durationInSeconds: Number(e.target.value)})}
                    >
                      <option value="3">3 seconds</option>
                      <option value="5">5 seconds</option>
                      <option value="10">10 seconds</option>
                      <option value="15">15 seconds</option>
                      <option value="30">30 seconds</option>
                    </select>
                  </div>

                  <div className="setting-field-group" style={{ gridColumn: 'span 2' }}>
                    <label>Save Destination</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        readOnly 
                        value={exportFolder || 'Default: Videos/Axis'} 
                        style={{ flex: 1, fontSize: '11px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '7px 10px', color: 'var(--text-secondary)' }}
                      />
                      {(window as any).electron && (
                        <button 
                          type="button"
                          className="btn-draft" 
                          style={{ fontSize: '11px', padding: '7px 10px', whiteSpace: 'nowrap' }}
                          onClick={handleSelectExportFolder}
                        >
                          <FolderOpen size={12} /> Browse...
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Render Result Banner if complete */}
                {renderUrl && !isRendering && (
                  <div className="render-success-box">
                    <div className="render-success-header">
                      <CheckCircle2 size={16} /> Render Finished Successfully!
                    </div>
                    <div className="render-success-actions">
                      <a href={renderUrl} target="_blank" rel="noreferrer" download className="btn-success-action">
                        <Download size={14} /> Download MP4
                      </a>
                      {renderLocalPath && (window as any).electron && (
                        <button 
                          className="btn-draft"
                          onClick={() => (window as any).electron.showInFolder(renderLocalPath)}
                          title="Show video in Windows File Explorer"
                        >
                          <Folder size={13} /> Show in Folder
                        </button>
                      )}
                      {renderLocalPath && (window as any).electron && (
                        <button 
                          className="btn-draft"
                          onClick={() => (window as any).electron.openPath(renderLocalPath)}
                          title="Open video in default media player"
                        >
                          <Film size={13} /> Play Video
                        </button>
                      )}
                      <button 
                        className="btn-draft"
                        onClick={() => setPreviewMode(prev => prev === 'rendered' ? 'live' : 'rendered')}
                        title="Toggle in-viewport player between rendered video and live code preview"
                      >
                        {previewMode === 'rendered' ? <Code2 size={13} /> : <Play size={13} />}
                        {previewMode === 'rendered' ? 'Live Preview' : 'Play Rendered'}
                      </button>
                      <button 
                        className="btn-draft"
                        onClick={() => {
                          navigator.clipboard.writeText(renderUrl);
                          alert('Video URL copied to clipboard!');
                        }}
                      >
                        <Copy size={13} /> Copy Link
                      </button>
                    </div>
                  </div>
                )}

                {/* Render Action Buttons */}
                <div className="render-actions-bar">
                  <button 
                    className="btn-render-big" 
                    onClick={() => handleRender(false)}
                    disabled={isRendering}
                  >
                    <Video size={17} /> {isRendering ? 'Rendering...' : 'Render Video (MP4)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          CONTEXT MENU
      ======================================================== */}
      {contextMenu && (
        <div 
          className="context-menu" 
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="context-menu-item"
            onClick={() => {
              const p = projects.find(pr => pr.id === contextMenu.projectId);
              if (p) openProject(p);
              setContextMenu(null);
            }}
          >
            <Play size={14} /> Open Project
          </button>
          <button 
            className="context-menu-item"
            onClick={() => {
              const p = projects.find(pr => pr.id === contextMenu.projectId);
              if (p) {
                const newName = prompt('Enter new project name:', p.name);
                if (newName && newName.trim()) {
                  setProjects(prev => prev.map(item => item.id === p.id ? { ...item, name: newName.trim() } : item));
                }
              }
              setContextMenu(null);
            }}
          >
            <Edit2 size={14} /> Rename
          </button>
          <button 
            className="context-menu-item danger"
            onClick={() => {
              deleteProject(contextMenu.projectId);
              setContextMenu(null);
            }}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}

      {/* ========================================================
          NEW FILE / FOLDER MODAL
      ======================================================== */}
      {newFileModal && (
        <div className="modal-overlay" onClick={() => setNewFileModal(null)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{newFileModal.isFolder ? 'New Folder' : 'New File'}</h3>
              <button className="explorer-btn" onClick={() => setNewFileModal(null)}><X size={16} /></button>
            </div>
            <input
              type="text"
              className="modal-input"
              placeholder={newFileModal.isFolder ? "e.g. components" : "e.g. Card.tsx"}
              value={newFileInput}
              onChange={e => setNewFileInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateFileOrFolder(); }}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setNewFileModal(null)}>Cancel</button>
              <button className="btn-primary-gradient" onClick={handleCreateFileOrFolder}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          CUSTOM ABOUT AXIS MODAL
      ======================================================== */}
      {showAboutModal && (
        <div className="modal-overlay" onClick={() => setShowAboutModal(false)}>
          <div className="about-modal-card" onClick={e => e.stopPropagation()}>
            <div className="about-modal-header">
              <div className="about-brand-group">
                <div className="about-logo-wrapper">
                  <img src={axisLogo} alt="Axis Logo" className="about-modal-logo" />
                </div>
                <div className="about-title-group">
                  <h2>
                    Axis Video Studio
                    <span className="about-version-badge">v{appMeta.version || '1.0.0'}</span>
                  </h2>
                  <p className="about-modal-tagline">
                    Code-driven video creation, rendered locally on your PC.
                  </p>
                </div>
              </div>
              <button 
                type="button"
                className="about-close-btn" 
                onClick={() => setShowAboutModal(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Clickable Links: Website, GitHub Repo, Check for Updates */}
            <div className="about-links-group">
              <button 
                type="button"
                className="about-link-btn"
                onClick={() => {
                  const url = appMeta.homepage || appMeta.repository;
                  if (url) {
                    if ((window as any).electron?.openExternal) (window as any).electron.openExternal(url);
                    else window.open(url, '_blank', 'noopener,noreferrer');
                  }
                }}
                title="Visit Website"
              >
                <Globe size={14} />
                <span>Website</span>
                <ExternalLink size={12} className="about-link-icon-end" />
              </button>

              <button 
                type="button"
                className="about-link-btn"
                onClick={() => {
                  const url = appMeta.repository;
                  if (url) {
                    if ((window as any).electron?.openExternal) (window as any).electron.openExternal(url);
                    else window.open(url, '_blank', 'noopener,noreferrer');
                  }
                }}
                title="View GitHub Repository"
              >
                <GitBranch size={14} />
                <span>GitHub Repo</span>
                <ExternalLink size={12} className="about-link-icon-end" />
              </button>

              <button 
                type="button"
                className="about-link-btn"
                onClick={async () => {
                  setUpdateState({ status: 'checking', message: 'Checking for updates...' });
                  try {
                    if ((window as any).electron?.checkForUpdates) {
                      const res = await (window as any).electron.checkForUpdates();
                      setUpdateState({
                        status: res?.status || 'up-to-date',
                        message: res?.message || `Axis is up to date (v${appMeta.version}).`,
                        url: res?.url
                      });
                    } else {
                      setTimeout(() => {
                        setUpdateState({
                          status: 'up-to-date',
                          message: `Axis is up to date (v${appMeta.version}).`
                        });
                      }, 500);
                    }
                  } catch {
                    setUpdateState({
                      status: 'up-to-date',
                      message: `Axis is up to date (v${appMeta.version}).`
                    });
                  }
                }}
                disabled={updateState.status === 'checking'}
                title="Check for software updates"
              >
                <RefreshCw size={14} className={updateState.status === 'checking' ? 'spin-animation' : ''} />
                <span>Check for Updates</span>
              </button>
            </div>

            {/* Update Status Feedback */}
            {updateState.status !== 'idle' && (
              <div className={`about-update-status status-${updateState.status}`}>
                {updateState.status === 'checking' && (
                  <>
                    <RefreshCw size={13} className="spin-animation" />
                    <span>Checking for updates...</span>
                  </>
                )}
                {updateState.status === 'up-to-date' && (
                  <>
                    <CheckCircle2 size={13} color="#34d399" />
                    <span>{updateState.message || `Axis is up to date (v${appMeta.version}).`}</span>
                  </>
                )}
                {updateState.status === 'update-available' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span>{updateState.message}</span>
                    {updateState.url && (
                      <button 
                        type="button"
                        className="about-update-download-btn"
                        onClick={() => {
                          if ((window as any).electron?.openExternal) (window as any).electron.openExternal(updateState.url!);
                          else window.open(updateState.url!, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        View Release <ExternalLink size={11} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Meta & Credits Section */}
            <div className="about-meta-divider" />
            <div className="about-meta-section">
              <div className="about-meta-row">
                <span className="about-meta-label">Credits</span>
                <span className="about-meta-value">Built with Electron, Remotion &amp; FFmpeg</span>
              </div>
              <div className="about-meta-row">
                <span className="about-meta-label">License</span>
                <span className="about-meta-value">Free for personal and commercial use.</span>
              </div>
            </div>

            {/* Footer with Copyright and Close Button */}
            <div className="about-modal-footer">
              <div className="about-copyright">&copy; 2026 Xenover Tools</div>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setShowAboutModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Bottom-Left Settings Button */}
      <button 
        className={`bottom-left-settings-btn ${screen === 'home' && homeTab === 'settings' ? 'active' : ''}`}
        onClick={() => {
          if (screen === 'home' && homeTab === 'settings') {
            setHomeTab('projects');
          } else {
            setScreen('home');
            setHomeTab('settings');
          }
        }}
        title="Settings"
      >
        <SettingsIcon size={16} />
        <span>Settings</span>
      </button>
    </div>
  );
}
