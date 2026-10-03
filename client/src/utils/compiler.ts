import * as Babel from '@babel/standalone';
import React from 'react';
import * as Remotion from 'remotion';

export function evaluateCode(code: string) {
  try {
    const transpiled = Babel.transform(code, {
      presets: ['env', 'react', 'typescript'],
      filename: 'template.tsx',
    }).code;

    const customRequire = (moduleName: string) => {
      if (moduleName === 'react') return { ...React, default: React };
      if (moduleName === 'remotion') return { ...Remotion, default: Remotion };
      throw new Error(`Module ${moduleName} not found`);
    };

    const exports: any = {};
    const module = { exports };
    
    // Provide React in the function scope in case the classic JSX transform is used
    // and the user didn't import React.
    // eslint-disable-next-line no-new-func
    const fn = new Function('require', 'module', 'exports', 'React', transpiled);
    fn(customRequire, module, exports, React);

    const component = module.exports.default || module.exports;
    
    if (!component) {
        throw new Error("No default export found. Please add 'export default function YourComponent() { ... }'");
    }

    return {
      component,
      error: null
    };
  } catch (error) {
    console.error('Code evaluation failed:', error);
    return {
      component: null,
      error: String(error)
    };
  }
}
