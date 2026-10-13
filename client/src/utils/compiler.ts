import * as Babel from '@babel/standalone';
import React from 'react';
import * as Remotion from 'remotion';
import * as LucideIcons from 'lucide-react';

export type ProjectFile = {
  name: string;
  path: string;
  content: string;
};

export function evaluateProject(files: ProjectFile[], entryPath: string) {
  try {
    if (!files || files.length === 0) {
      return { component: null, error: 'No files in project' };
    }

    const moduleCache: Record<string, any> = {};

    function normalizePath(p: string): string {
      return p.replace(/\\/g, '/').replace(/^\.\//, '');
    }

    function resolvePath(currentFilePath: string, relativePath: string): string | null {
      const curNormalized = normalizePath(currentFilePath);
      const curDir = curNormalized.includes('/') ? curNormalized.substring(0, curNormalized.lastIndexOf('/')) : '';
      
      const full = curDir ? `${curDir}/${relativePath}` : relativePath;
      const parts = full.split('/');
      const stack: string[] = [];
      for (const part of parts) {
        if (part === '.' || part === '') continue;
        if (part === '..') {
          stack.pop();
        } else {
          stack.push(part);
        }
      }
      const resolved = stack.join('/');

      const candidates = [
        resolved,
        `${resolved}.tsx`,
        `${resolved}.ts`,
        `${resolved}.jsx`,
        `${resolved}.js`,
        `${resolved}.json`,
        `${resolved}.css`,
        `${resolved}/index.tsx`,
        `${resolved}/index.ts`,
        `${resolved}/index.js`,
      ];

      for (const cand of candidates) {
        const found = files.find(f => normalizePath(f.path) === cand);
        if (found) return found.path;
      }
      return null;
    }

    function createSmartModule(mod: any) {
      if (!mod || (typeof mod !== 'object' && typeof mod !== 'function')) return mod;
      return new Proxy(mod, {
        get(target, prop, receiver) {
          if (prop in target) return target[prop];
          if (typeof prop === 'string') {
            // Match case-insensitively
            const matchKey = Object.keys(target).find(k => k.toLowerCase() === prop.toLowerCase());
            if (matchKey) return target[matchKey];

            // If target.default exists, check within default
            if (target.default) {
              if (typeof target.default === 'object' && prop in target.default) {
                return target.default[prop];
              }
              if (typeof target.default === 'function') {
                return target.default;
              }
            }

            // Fallback to any function export
            const fnKey = Object.keys(target).find(k => typeof target[k] === 'function');
            if (fnKey) return target[fnKey];
          }
          return Reflect.get(target, prop, receiver);
        }
      });
    }

    function requireModule(fromPath: string, moduleName: string): any {
      if (moduleName === 'react' || moduleName === 'react/jsx-runtime' || moduleName === 'react/jsx-dev-runtime') {
        return { ...React, default: React };
      }
      if (moduleName === 'remotion') {
        return { ...Remotion, default: Remotion };
      }
      if (moduleName === 'lucide-react') {
        return { ...LucideIcons, default: LucideIcons };
      }

      if (moduleName.startsWith('.')) {
        const targetPath = resolvePath(fromPath, moduleName);
        if (!targetPath) {
          throw new Error(`Cannot resolve '${moduleName}' imported from '${fromPath}'`);
        }

        const normTarget = normalizePath(targetPath);
        if (moduleCache[normTarget]) {
          return moduleCache[normTarget];
        }

        const targetFile = files.find(f => normalizePath(f.path) === normTarget);
        if (!targetFile) {
          throw new Error(`File '${targetPath}' not found`);
        }

        if (targetPath.endsWith('.json')) {
          try {
            const parsed = JSON.parse(targetFile.content);
            moduleCache[normTarget] = parsed;
            return parsed;
          } catch (e) {
            throw new Error(`Invalid JSON in '${targetPath}': ${e}`);
          }
        }

        if (targetPath.endsWith('.css')) {
          moduleCache[normTarget] = {};
          return {};
        }

        const compMatches = Array.from(targetFile.content.matchAll(/(?:function|const|let|var)\s+([A-Z][a-zA-Z0-9_]*)/g)).map(m => m[1]);
        const transpiled = Babel.transform(targetFile.content, {
          presets: ['env', 'react', 'typescript'],
          filename: targetPath,
        }).code;

        let wrapped = transpiled || '';
        if (compMatches.length > 0) {
          wrapped += `\nif (!module.exports.default && (!module.exports || Object.keys(module.exports).length === 0)) {\n`
            + compMatches.map(name => `  try { if (typeof ${name} === 'function') { module.exports.default = ${name}; module.exports.${name} = ${name}; } } catch(e){}`).join('\n')
            + `\n}\n`;
        }

        const exports: any = {};
        const module = { exports };
        const localRequire = (reqName: string) => requireModule(targetPath, reqName);

        // eslint-disable-next-line no-new-func
        const fn = new Function('require', 'module', 'exports', 'React', 'Remotion', wrapped);
        fn(localRequire, module, exports, React, Remotion);

        const rawResult = module.exports.default !== undefined ? module.exports : { default: module.exports, ...module.exports };
        const modResult = createSmartModule(rawResult);
        moduleCache[normTarget] = modResult;
        return modResult;
      }

      throw new Error(`Module '${moduleName}' not found. Supported: local files, 'react', 'remotion', and 'lucide-react'.`);
    }

    // Find entry file
    let entryFile = files.find(f => normalizePath(f.path) === normalizePath(entryPath));
    if (!entryFile) {
      entryFile = files.find(f => f.content.includes('export default')) || files[0];
    }

    if (!entryFile) {
      return { component: null, error: 'Could not find entry file to render' };
    }

    if (!entryFile.content || !entryFile.content.trim()) {
      const BlankCanvasComponent: React.FC<any> = () => {
        return React.createElement('div', {
          style: {
            width: '100%',
            height: '100%',
            backgroundColor: '#07090e',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            fontFamily: 'sans-serif',
            fontSize: '13px',
            userSelect: 'none',
            padding: '20px',
            textAlign: 'center',
          }
        }, 'Empty Project — write or paste your React / Remotion component');
      };
      return {
        component: BlankCanvasComponent,
        compositionMeta: null,
        error: null,
      };
    }

    // Auto-discover declared component names (e.g. const Aurora = ..., function MyVideo(...))
    const compMatches = Array.from(entryFile.content.matchAll(/(?:function|const|let|var)\s+([A-Z][a-zA-Z0-9_]*)/g)).map(m => m[1]);

    const transpiled = Babel.transform(entryFile.content, {
      presets: ['env', 'react', 'typescript'],
      filename: entryFile.path,
    }).code;

    // Inject fallback exports so code without explicit `export default` still works!
    let wrappedCode = transpiled || '';
    if (compMatches.length > 0) {
      const fallbackBlock = `
if (!module.exports.default && (!module.exports || Object.keys(module.exports).length === 0)) {
${compMatches.map(name => `  try { if (typeof ${name} === 'function') { module.exports.default = ${name}; module.exports.${name} = ${name}; } } catch(e){}`).join('\n')}
}
`;
      wrappedCode += '\n' + fallbackBlock;
    }

    const exports: any = {};
    const module = { exports };
    const rootRequire = (reqName: string) => requireModule(entryFile.path, reqName);

    // eslint-disable-next-line no-new-func
    const fn = new Function('require', 'module', 'exports', 'React', 'Remotion', wrappedCode);
    fn(rootRequire, module, exports, React, Remotion);

    let rawComponent = module.exports.default;
    if (typeof rawComponent !== 'function' && typeof module.exports === 'object') {
      const keys = Object.keys(module.exports).filter(k => k !== 'default' && typeof module.exports[k] === 'function');
      const preferred = keys.find(k => k.toLowerCase().includes('remotionroot') || k.toLowerCase().includes('root'))
        || keys.find(k => !k.toLowerCase().includes('remotionroot') && !k.toLowerCase().includes('root'))
        || keys[0];
      if (preferred) {
        rawComponent = module.exports[preferred];
      } else if (typeof rawComponent !== 'function') {
        rawComponent = module.exports;
      }
    }

    let unwrappedComponent: any = rawComponent;
    let compositionMeta: { id?: string; durationInFrames?: number; fps?: number; width?: number; height?: number } = {};

    function findCompositionInElement(element: any): { comp: any; meta: any } | null {
      if (!element || !React.isValidElement(element)) return null;
      const props = element.props as any;
      if (props?.component) {
        return {
          comp: props.component,
          meta: {
            id: props.id,
            durationInFrames: props.durationInFrames,
            fps: props.fps,
            width: props.width,
            height: props.height,
          }
        };
      }
      if (props?.children) {
        const children = React.Children.toArray(props.children);
        for (const child of children) {
          const res = findCompositionInElement(child);
          if (res) return res;
        }
      }
      return null;
    }

    // Try to unwrap if rawComponent is a Composition Root (like RemotionRoot)
    if (typeof rawComponent === 'function') {
      try {
        const rendered = rawComponent({});
        const found = findCompositionInElement(rendered);
        if (found) {
          unwrappedComponent = found.comp;
          compositionMeta = found.meta;
        }
      } catch (e) {
        // Raw component uses hooks/context directly (keep rawComponent)
      }
    }

    // Safety fallback: if unwrappedComponent is somehow still null/undefined or not a valid component,
    // search project files for fallback
    if (!unwrappedComponent || (typeof unwrappedComponent !== 'function' && typeof unwrappedComponent !== 'object')) {
      const otherFile = files.find(f => f.path !== entryFile.path && (f.name.endsWith('.tsx') || f.name.endsWith('.jsx')));
      if (otherFile) {
        try {
          const otherMod = requireModule(entryFile.path, `./${otherFile.path.replace(/\.[^/.]+$/, '')}`);
          if (otherMod && (otherMod.default || typeof otherMod === 'function')) {
            unwrappedComponent = otherMod.default || otherMod;
          }
        } catch (e) {}
      }
    }

    if (!unwrappedComponent || (typeof unwrappedComponent !== 'function' && typeof unwrappedComponent !== 'object')) {
      throw new Error(`No React component found in '${entryFile.path}'. Make sure your component is defined or exported.`);
    }

    // Safe player component that renders the unwrapped visual component
    const SafePlayerComponent: React.FC<any> = (props) => {
      return React.createElement(unwrappedComponent, props);
    };

    return {
      component: SafePlayerComponent,
      compositionMeta,
      error: null,
    };
  } catch (error: any) {
    console.error('Project evaluation failed:', error);
    return {
      component: null,
      compositionMeta: null,
      error: error?.message || String(error),
    };
  }
}

export function evaluateCode(code: string) {
  return evaluateProject([{ name: 'UserCode.tsx', path: 'UserCode.tsx', content: code }], 'UserCode.tsx');
}
