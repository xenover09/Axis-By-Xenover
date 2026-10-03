import React, { useState, useEffect, useMemo, useRef, Component, ErrorInfo, ReactNode } from 'react';
import Editor from '@monaco-editor/react';
import { Player } from '@remotion/player';
import { Play, Trash2, LayoutGrid, Folder, Settings as SettingsIcon, ChevronLeft, AlertCircle, CheckCircle2, Download, Search, Plus, Edit2, Video, Minus, Square, X, Code2, FolderOpen, Monitor, Sun, Moon, MessageCircle, MessageSquare, MonitorPlay } from 'lucide-react';
import { evaluateCode } from './utils/compiler';

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
        <div style={{ padding: '20px', color: '#fca5a5', backgroundColor: '#7f1d1d', width: '100%', height: '100%', overflow: 'auto' }}>
          <h4>Preview Error</h4>
          <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>{this.state.error?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const API_URL = 'http://localhost:3001/api';

const WhatsappIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.031 0C5.383 0 0 5.383 0 12.031c0 2.658.868 5.143 2.373 7.185L.435 24l5.074-1.921A11.968 11.968 0 0 0 12.03 24c6.647 0 12.03-5.383 12.03-12.03S18.677 0 12.03 0zm5.666 17.15c-.244.686-1.42 1.309-1.986 1.393-.524.078-1.2.222-3.411-.698-2.67-1.11-4.38-3.83-4.512-4.004-.131-.174-1.077-1.433-1.077-2.732 0-1.299.675-1.935.914-2.196.24-.26.522-.326.696-.326.175 0 .349.002.502.009.158.008.371-.061.58.441.218.523.74 1.808.805 1.939.066.13.11.282.022.456-.088.174-.131.283-.261.436-.131.152-.274.327-.393.457-.13.14-.268.295-.121.549.148.254.654 1.079 1.4 1.745.961.859 1.767 1.127 2.03 1.258.261.13.414.11.566-.065.153-.174.654-.761.828-1.022.174-.262.348-.218.587-.131.24.087 1.524.718 1.785.849.261.13.436.196.499.304.066.11.066.632-.178 1.318z"/>
  </svg>
);

const YoutubeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const DiscordIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 127.14 96.36" fill="currentColor">
    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.33,46,96.22,53,91.08,65.69,84.69,65.69Z"/>
  </svg>
);

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
  folderFiles?: { name: string, path: string, content: string }[];
  activeFileIndex?: number;
};

function App() {
  const [screen, setScreen] = useState<'home' | 'editor' | 'new-project'>('home');
  const [theme, setTheme] = useState<Theme>('light');
  const [exportDest, setExportDest] = useState('Downloads/Axis');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const TitleBar = () => {
    const [logoFailed, setLogoFailed] = useState(false);

    const handleMinimize = () => {
      if ((window as any).electron) (window as any).electron.minimize();
    };
    const handleMaximize = () => {
      if ((window as any).electron) (window as any).electron.toggleMaximize();
    };
    const handleClose = () => {
      if ((window as any).electron) (window as any).electron.close();
    };
  
    return (
      <div className="title-bar" onDoubleClick={handleMaximize}>
        <div className="title-left">
          {logoFailed ? (
            <div className="title-logo-fallback">A</div>
          ) : (
            <img 
              src="./assets/axis-logo.png" 
              alt="Axis" 
              className="title-logo" 
              onError={() => {
                console.warn('Failed to load logo from ./assets/axis-logo.png');
                setLogoFailed(true);
              }} 
            />
          )}
          <span className="title-name">Axis</span>
        </div>
        <div className="title-right">
          <div className="update-pill">Update available</div>
          <div className="window-controls">
            <button className="window-btn" onClick={handleMinimize} title="Minimize"><Minus size={16} /></button>
            <button className="window-btn" onClick={handleMaximize} title="Maximize"><Square size={14} /></button>
            <button className="window-btn close" onClick={handleClose} title="Close"><X size={18} /></button>
          </div>
        </div>
      </div>
    );
  };
  
  const [templates, setTemplates] = useState<string[]>([]);
  const [code, setCode] = useState<string>('');
  const [compiledComponent, setCompiledComponent] = useState<React.FC | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgressData, setRenderProgressData] = useState<any>(null);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const renderIntervalRef = useRef<any>(null);
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, projectId: string } | null>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Computed dimensions based on preset and quality
  const getDimensions = (settings: RenderSettings) => {
    if (settings.aspectRatio === 'custom') return { w: settings.customWidth, h: settings.customHeight };
    
    let baseWidth = 1920;
    if (settings.quality === '720p') baseWidth = 1280;
    if (settings.quality === '1080p') baseWidth = 1920;
    if (settings.quality === '4K') baseWidth = 3840;

    if (settings.aspectRatio === '16:9') return { w: baseWidth, h: Math.round(baseWidth * 9 / 16) };
    if (settings.aspectRatio === '9:16') {
      const baseHeight = settings.quality === '720p' ? 1280 : settings.quality === '1080p' ? 1920 : 3840;
      return { w: Math.round(baseHeight * 9 / 16), h: baseHeight };
    }
    if (settings.aspectRatio === '1:1') return { w: baseWidth, h: baseWidth };
    if (settings.aspectRatio === '4:5') return { w: Math.round(baseWidth * 4 / 5), h: baseWidth };
    
    return { w: 1080, h: 1920 }; // fallback
  };

  useEffect(() => {
    fetch(`${API_URL}/templates`)
      .then(res => res.json())
      .then(data => {
        if (data.templates) {
          setTemplates(data.templates);
        }
      })
      .catch(err => console.error(err));
  }, []);

  // Theme Sync
  useEffect(() => {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [theme]);

  // Compiler debounce
  useEffect(() => {
    if (!code) {
      setCompiledComponent(() => null);
      setError(null);
      return;
    }
    const timer = setTimeout(() => {
      const { component, error: compError } = evaluateCode(code);
      if (compError) {
        setError(compError);
      } else {
        setError(null);
        setCompiledComponent(() => component);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [code]);

  const handleCreateProject = async (name: string, templateId: string) => {
    try {
      const res = await fetch(`${API_URL}/templates/${templateId}`);
      const templateCode = await res.text();
      
      const newProj: Project = {
        id: Date.now().toString(),
        name,
        template: templateId,
        code: templateCode,
        settings: {
          aspectRatio: '9:16',
          quality: '1080p',
          customWidth: 1080,
          customHeight: 1920,
          fps: 30,
          durationInSeconds: 5
        }
      };
      setProjects(prev => [...prev, newProj]);
      openProject(newProj);
    } catch (e) {
      console.error(e);
    }
  };

  const openProject = (proj: Project) => {
    setActiveProject(proj);
    setCode(proj.code);
    setScreen('editor');
    setRenderUrl(null);
  };

  const saveActiveProjectSettings = (newSettings: RenderSettings) => {
    if (!activeProject) return;
    const updated = { ...activeProject, settings: newSettings };
    setActiveProject(updated);
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const saveActiveProjectCode = (newCode: string) => {
    setCode(newCode);
    if (!activeProject) return;
    
    let folderFiles = activeProject.folderFiles;
    if (folderFiles && activeProject.activeFileIndex !== undefined) {
      folderFiles = [...folderFiles];
      folderFiles[activeProject.activeFileIndex] = {
        ...folderFiles[activeProject.activeFileIndex],
        content: newCode
      };
    }
    
    setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, code: newCode, folderFiles } : p));
  };

  const saveActiveProjectName = (newName: string) => {
    if (!activeProject) return;
    const updated = { ...activeProject, name: newName };
    setActiveProject(updated);
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const renameProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    const newName = prompt('Enter new project name:', project.name);
    if (newName && newName.trim()) {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName.trim() } : p));
      if (activeProject?.id === id) {
        setActiveProject(prev => prev ? { ...prev, name: newName.trim() } : null);
      }
    }
  };

  const deleteProject = (id: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (activeProject?.id === id) {
        setScreen('home');
        setActiveProject(null);
      }
    }
  };

  const handleRender = async (isDraft = false) => {
    if (!activeProject) return;
    
    if (renderIntervalRef.current) {
      clearInterval(renderIntervalRef.current);
      renderIntervalRef.current = null;
    }

    setIsRendering(true);
    setRenderUrl(null);
    setRenderProgressData({ status: 'bundling', text: 'Starting render...' });
    
    try {
      const { w, h } = getDimensions(activeProject.settings);
      
      const res = await fetch(`${API_URL}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code, 
          isDraft,
          settings: {
            width: w,
            height: h,
            fps: activeProject.settings.fps,
            durationInFrames: activeProject.settings.durationInSeconds * activeProject.settings.fps
          } 
        }),
      });
      const data = await res.json();
      
      if (data.renderId) {
        // Start polling
        const interval = setInterval(async () => {
          const progRes = await fetch(`${API_URL}/progress/${data.renderId}`);
          const progData = await progRes.json();
          
          if (progData.status === 'done') {
            if (renderIntervalRef.current) clearInterval(renderIntervalRef.current);
            setRenderUrl(progData.url);
            setIsRendering(false);
            setRenderProgressData(null);
            
            // Save video URL as project thumbnail
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
        }, 1000);
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const LeftRail = () => (
    <div className="icon-rail">
      <div className="rail-top">
        <button className="rail-icon accent-icon" onClick={() => setScreen('new-project')} title="New Project">
          <Plus size={24} />
        </button>
        <button className={`rail-icon ${screen === 'home' ? 'active' : ''}`} onClick={() => setScreen('home')} title="Projects">
          <LayoutGrid size={24} />
        </button>
      </div>
      <div className="rail-bottom">
        <button className="rail-icon" onClick={() => setSettingsOpen(true)} title="Settings">
          <SettingsIcon size={24} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="window-wrapper">
      <TitleBar />
      <div className="app">
        <LeftRail />
        
        {screen === 'home' && (
        <div className="home-screen">
          <div className="home-header">
            <div className="header-title">
              <h1>Projects</h1>
              <span className="count-badge">{projects.length}</span>
            </div>
            <div className="header-actions">
              <div className="search-box">
                <Search size={16} />
                <input type="text" placeholder="Search projects..." />
              </div>
              <button className="new-project-btn" onClick={() => setScreen('new-project')}>
                <Plus size={16} /> New Project
              </button>
            </div>
          </div>
          
          {projects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Video size={32} color="var(--text-secondary)" />
              </div>
              <h2>No projects yet</h2>
              <p>Create a new project to code, preview, and render stunning reels to MP4.</p>
            </div>
          ) : (
            <div className="projects-grid">
              {projects.map(p => (
                <div 
                  key={p.id} 
                className="project-card" 
                onClick={() => openProject(p)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, projectId: p.id });
                }}
              >
                <div className="card-thumbnail">
                  {p.thumbnailUrl ? (
                    <video src={`${p.thumbnailUrl}#t=2`} preload="metadata" muted playsInline />
                  ) : (
                    <div className="thumbnail-placeholder">
                      {p.template}
                    </div>
                  )}
                  <div className="duration-badge">{formatDuration(p.settings.durationInSeconds)}</div>
                </div>
                <div className="card-info">
                  <h3>{p.name}</h3>
                  <p>Edited just now</p>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {contextMenu && (
        <div 
          className="context-menu" 
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => {
            const p = projects.find(pr => pr.id === contextMenu.projectId);
            if (p) openProject(p);
            setContextMenu(null);
          }}>
            <Play size={16} /> Open Project
          </button>
          <button onClick={() => {
            renameProject(contextMenu.projectId);
            setContextMenu(null);
          }}>
            <Edit2 size={16} /> Rename
          </button>
          <button onClick={() => {
            deleteProject(contextMenu.projectId);
            setContextMenu(null);
          }} className="danger">
            <Trash2 size={16} /> Delete
          </button>
        </div>
      )}

      {screen === 'new-project' && (
        <div className="home-screen">
          <div className="home-header">
            <div className="header-title">
              <button className="back-btn" onClick={() => setScreen('home')} style={{ background: 'transparent', border: 'none', color: 'var(--text-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                <ChevronLeft size={20} /> Back
              </button>
            </div>
          </div>
          
          <div className="new-project-screen">
            <div className="mode-card" onClick={() => {
              const name = prompt('Project Name:', 'New Project');
              if (name) {
                const newProj: Project = {
                  id: Date.now().toString(),
                  name,
                  template: 'Blank',
                  code: '',
                  settings: { aspectRatio: '9:16', quality: '1080p', customWidth: 1080, customHeight: 1920, fps: 30, durationInSeconds: 5 }
                };
                setProjects(prev => [...prev, newProj]);
                openProject(newProj);
              }
            }}>
              <div className="mode-icon">
                <Code2 size={28} />
              </div>
              <h2>Manual Code</h2>
              <p>Template se shuru karo ya blank code likho</p>
            </div>

            <div className="mode-card" onClick={async () => {
              if (!(window as any).electron || !(window as any).electron.openFolder) {
                alert('Folder open is only supported in the Electron desktop app.');
                return;
              }
              const data = await (window as any).electron.openFolder();
              if (data && data.files) {
                if (data.files.length === 0) {
                  alert('Is folder mein koi code file nahi mili');
                  return;
                }
                const entryFileIndex = data.files.findIndex((f: any) => f.content.includes('export default'));
                const defaultIndex = entryFileIndex >= 0 ? entryFileIndex : 0;
                
                const newProject: Project = {
                  id: Date.now().toString(),
                  name: data.folderPath.split(/[/\\]/).pop() || 'Folder Project',
                  template: 'Folder',
                  code: data.files[defaultIndex].content,
                  settings: { aspectRatio: '16:9', quality: '1080p', customWidth: 1920, customHeight: 1080, fps: 30, durationInSeconds: 5 },
                  folderFiles: data.files,
                  activeFileIndex: defaultIndex
                };
                setProjects(prev => [newProject, ...prev]);
                setActiveProject(newProject);
                setCode(newProject.code);
                setScreen('editor');
              }
            }}>
              <div className="mode-icon">
                <FolderOpen size={28} />
              </div>
              <h2>Open Folder</h2>
              <p>Apne PC se project folder lao</p>
            </div>
          </div>
        </div>
      )}

      {screen === 'editor' && activeProject && (
        <div className="editor-screen">
          <div className="editor-topbar">
            <button className="back-btn" onClick={() => setScreen('home')}><ChevronLeft size={20} /> Projects</button>
            <div className="project-title">
              <input 
                type="text" 
                value={activeProject.name} 
                onChange={(e) => saveActiveProjectName(e.target.value)} 
                className="title-input"
              />
              <span className="save-status">
                <CheckCircle2 size={12} /> Saved
              </span>
            </div>

            {activeProject.folderFiles && activeProject.folderFiles.length > 0 && (
              <div style={{marginLeft: 'auto', marginRight: '20px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span style={{fontSize: '13px', color: 'var(--text-secondary)'}}>File:</span>
                <select 
                  style={{ background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px 8px', outline: 'none', cursor: 'pointer' }}
                  value={activeProject.activeFileIndex}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    const file = activeProject.folderFiles![idx];
                    const updated = { ...activeProject, activeFileIndex: idx, code: file.content };
                    setActiveProject(updated);
                    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
                    setCode(file.content);
                  }}
                >
                  {activeProject.folderFiles.map((f, i) => (
                    <option key={i} value={i}>{f.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <button className="btn-dark" style={{ marginLeft: 'auto', padding: '8px 20px' }} onClick={() => handleRender(true)} disabled={!!error || isRendering}>
              <Play size={16} /> {isRendering ? 'Restart Preview' : 'Preview'}
            </button>
          </div>

          <div className="editor-workspace">
            <div className="left-panel" style={{ width: '50%', flex: 'none' }}>
              <div className="code-editor-container">
                <Editor
                  language="typescript"
                  theme={theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'vs-dark' : 'light'}
                  value={code}
                  onChange={val => saveActiveProjectCode(val || '')}
                  options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on', padding: { top: 16 } }}
                />
              </div>
              {error && (
                <div className="problems-panel">
                  <div className="problems-header"><AlertCircle size={14} /> Problems</div>
                  <pre className="problems-content">{error}</pre>
                </div>
              )}
            </div>

            <div className="right-panel">
              <div className="preview-section">
                <div className="preview-wrapper" style={{ aspectRatio: `${getDimensions(activeProject.settings).w} / ${getDimensions(activeProject.settings).h}` }}>
                  <ErrorBoundary>
                    {compiledComponent ? (
                      <Player
                        component={compiledComponent}
                        durationInFrames={activeProject.settings.durationInSeconds * activeProject.settings.fps}
                        compositionWidth={getDimensions(activeProject.settings).w}
                        compositionHeight={getDimensions(activeProject.settings).h}
                        fps={activeProject.settings.fps}
                        controls
                        autoPlay
                        loop
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: '#000',
                          borderRadius: '8px'
                        }}
                        errorFallback={(e) => (
                          <div style={{ padding: '20px', color: '#fca5a5', backgroundColor: '#7f1d1d', width: '100%', height: '100%', overflow: 'auto' }}>
                            <h4>Render Error</h4>
                            <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>{e.error.message}</pre>
                          </div>
                        )}
                      />
                    ) : (
                      <div className="loading-preview">
                        {error ? 'Fix errors to view preview' : 'Waiting for component...'}
                      </div>
                    )}
                  </ErrorBoundary>

                  {isRendering && renderProgressData && (
                    <div className="render-overlay">
                      {renderProgressData.status === 'bundling' ? (
                        <div className="circular-progress bundling">
                          <svg width="100" height="100" className="spin-anim">
                            <circle className="progress-bg" cx="50" cy="50" r="40" />
                            <circle className="progress-value" cx="50" cy="50" r="40" style={{ strokeDasharray: 251.2, strokeDashoffset: 251.2 * 0.7 }} />
                          </svg>
                          <div className="progress-text">...</div>
                        </div>
                      ) : (
                        <div className="circular-progress">
                          <svg width="100" height="100">
                            <circle className="progress-bg" cx="50" cy="50" r="40" />
                            <circle 
                              className="progress-value" 
                              cx="50" cy="50" r="40" 
                              style={{ 
                                strokeDasharray: 251.2, 
                                strokeDashoffset: renderProgressData.totalFrames ? 251.2 - ((renderProgressData.renderedFrames / renderProgressData.totalFrames) * 251.2) : 251.2 
                              }} 
                            />
                          </svg>
                          <div className="progress-text">
                            {renderProgressData.totalFrames ? `${Math.round((renderProgressData.renderedFrames / renderProgressData.totalFrames) * 100)}%` : '0%'}
                          </div>
                        </div>
                      )}
                      <div className="render-status-text">
                        {renderProgressData.status === 'bundling' ? 'Preparing Media' : 'Rendering Frames'}
                      </div>
                      {renderProgressData.status === 'rendering' && renderProgressData.currentFps && (
                        <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: '12px' }}>
                          {renderProgressData.currentFps} fps • ETA: {renderProgressData.eta}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)', padding: '5px' }}>
                component: {compiledComponent?.name || 'anonymous'} ({typeof compiledComponent})
              </div>

              <div className="render-settings-section">
                <h3>Render Settings</h3>
                <div className="settings-grid">
                  <div className="setting-control">
                    <label>Aspect Ratio</label>
                    <select 
                      value={activeProject.settings.aspectRatio}
                      onChange={e => saveActiveProjectSettings({...activeProject.settings, aspectRatio: e.target.value as any})}
                    >
                      <option value="16:9">16:9 (Landscape)</option>
                      <option value="9:16">9:16 (Portrait)</option>
                      <option value="1:1">1:1 (Square)</option>
                      <option value="4:5">4:5 (Social)</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  
                  <div className="setting-control">
                    <label>Quality</label>
                    <select 
                      value={activeProject.settings.quality}
                      onChange={e => saveActiveProjectSettings({...activeProject.settings, quality: e.target.value as any})}
                      disabled={activeProject.settings.aspectRatio === 'custom'}
                    >
                      <option value="720p">720p</option>
                      <option value="1080p">1080p (HD)</option>
                      <option value="4K">4K (Ultra HD)</option>
                    </select>
                  </div>

                  <div className="setting-control">
                    <label>
                      FPS <span style={{fontSize: '10px', color: 'var(--text-secondary)'}}>(60fps = 2x slow render. 30fps is usually enough.)</span>
                    </label>
                    <select 
                      value={activeProject.settings.fps}
                      onChange={e => saveActiveProjectSettings({...activeProject.settings, fps: Number(e.target.value)})}
                    >
                      <option value={24}>24 fps</option>
                      <option value={30}>30 fps</option>
                      <option value={60}>60 fps</option>
                    </select>
                  </div>

                  <div className="setting-control">
                    <label>Duration (Seconds)</label>
                    <select 
                      value={activeProject.settings.durationInSeconds}
                      onChange={e => saveActiveProjectSettings({...activeProject.settings, durationInSeconds: Number(e.target.value)})}
                    >
                      <option value={5}>5 seconds</option>
                      <option value={8}>8 seconds</option>
                      <option value={10}>10 seconds</option>
                      <option value={15}>15 seconds</option>
                      <option value={30}>30 seconds</option>
                      <option value={60}>60 seconds</option>
                    </select>
                  </div>

                  {activeProject.settings.aspectRatio === 'custom' && (
                    <>
                      <div className="setting-control">
                        <label>Custom Width</label>
                        <input type="number" value={activeProject.settings.customWidth} onChange={e => saveActiveProjectSettings({...activeProject.settings, customWidth: Number(e.target.value)})} />
                      </div>
                      <div className="setting-control">
                        <label>Custom Height</label>
                        <input type="number" value={activeProject.settings.customHeight} onChange={e => saveActiveProjectSettings({...activeProject.settings, customHeight: Number(e.target.value)})} />
                      </div>
                    </>
                  )}
                </div>

                <div className="render-actions">
                  <div className="render-info">
                    {getDimensions(activeProject.settings).w} x {getDimensions(activeProject.settings).h} • {formatDuration(activeProject.settings.durationInSeconds)}
                  </div>
                  <div className="render-buttons">
                    <span className="render-status">
                      {isRendering && renderProgressData?.status === 'bundling' && 'Bundling...'}
                      {isRendering && renderProgressData?.status === 'rendering' && (
                        `Rendering: Frame ${renderProgressData.renderedFrames}/${renderProgressData.totalFrames} • ${renderProgressData.currentFps} fps • ETA: ${renderProgressData.eta}`
                      )}
                    </span>
                    {renderUrl && !isRendering && (
                      <a href={renderUrl} target="_blank" rel="noreferrer" className="btn-secondary">
                        <Download size={16} /> Download
                      </a>
                    )}
                    <button className="btn-secondary" onClick={() => handleRender(true)} disabled={!!error}>
                      {isRendering ? 'Restart Draft' : 'Draft Render'}
                    </button>
                    <button className="btn-primary" onClick={() => handleRender(false)} disabled={!!error}>
                      {isRendering ? 'Restart' : 'Render'}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="editor-footer">
                <button className="footer-btn" style={{ display: 'flex', alignItems: 'center' }}>
                  <Play size={14} />
                </button>
                <div className="timeline-track">
                  <div className="timeline-progress"></div>
                </div>
                <span className="time-text">0:00 / {activeProject.settings.durationInSeconds}:00</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Settings Modal */}
      {settingsOpen && (
        <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <h2>Settings</h2>
            </div>
            
            <div className="settings-section">
              <div className="settings-row">
                <div className="settings-info">
                  <h3>Appearance</h3>
                  <p>Customize how Axis looks on your device</p>
                </div>
                <div className="segmented-control">
                  <button className={theme === 'system' ? 'active' : ''} onClick={() => setTheme('system')}>
                    <Monitor size={16} /> System
                  </button>
                  <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>
                    <Sun size={16} /> Light
                  </button>
                  <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>
                    <Moon size={16} /> Dark
                  </button>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-info" style={{ marginBottom: '16px' }}>
                <h3>Community & Links</h3>
                <p>Join our platforms to get updates</p>
              </div>
              <div className="social-links">
                <a href="https://whatsapp.com/channel/0029Vb69uw7EawdnN1zo5T3u" target="_blank" rel="noreferrer" className="social-link">
                  <WhatsappIcon /> WhatsApp Channel
                </a>
                <a href="https://youtube.com/@xenoverhub99?si=4YKTgSh-8Eniw-uh" target="_blank" rel="noreferrer" className="social-link">
                  <YoutubeIcon /> YouTube
                </a>
                <a href="https://discord.gg/aMs4cjgG4S" target="_blank" rel="noreferrer" className="social-link">
                  <DiscordIcon /> Discord
                </a>
              </div>
            </div>

            <div className="settings-section" style={{ borderBottom: 'none' }}>
               <div className="settings-row">
                 <div className="settings-info">
                   <h3>Export Destination</h3>
                   <p>Where your videos are saved</p>
                 </div>
                 <input 
                   type="text" 
                   value={exportDest} 
                   readOnly
                   onClick={async () => {
                     // @ts-ignore
                     if (window.electron && window.electron.selectExportFolder) {
                       // @ts-ignore
                       const folder = await window.electron.selectExportFolder();
                       if (folder) setExportDest(folder);
                     }
                   }}
                   style={{ width: '250px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '6px', color: 'var(--text-color)', cursor: 'pointer' }} 
                   title="Click to select folder"
                 />
               </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => setSettingsOpen(false)} style={{ padding: '8px 24px' }}>Done</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default App;
