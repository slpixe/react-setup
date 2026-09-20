export const PACKAGE_VERSIONS = {
  dependencies: {
    react: '^19.2.8',
    'react-dom': '^19.2.8',
  },
  devDependencies: {
    '@babel/core': '^7.29.7',
    '@playwright/test': '^1.63.0',
    '@rolldown/plugin-babel': '^0.2.3',
    '@testing-library/dom': '^10.4.2',
    '@testing-library/jest-dom': '^7.0.1',
    '@testing-library/react': '^16.3.3',
    '@testing-library/user-event': '^14.6.7',
    '@types/babel__core': '^7.20.5',
    '@types/node': '^24.13.3',
    '@types/react': '^19.2.18',
    '@types/react-dom': '^19.2.7',
    '@vitejs/plugin-react': '^6.1.1',
    'babel-plugin-react-compiler': '^1.0.0',
    typescript: '~6.0.2',
    vite: '^8.3.0',
    vitest: '^5.0.1',
  },
}

export const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun']

export const LOCKFILES = [
  ['pnpm', 'pnpm-lock.yaml'],
  ['yarn', 'yarn.lock'],
  ['bun', 'bun.lock'],
  ['bun', 'bun.lockb'],
  ['npm', 'package-lock.json'],
  ['npm', 'npm-shrinkwrap.json'],
]
