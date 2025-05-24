declare module '*.css' {
  // For side-effect imports (import './file.css') we export an empty object so
  // the type system is satisfied while bundlers (Vite, Webpack, etc.) handle
  // the actual CSS inclusion.
  const classes: { [key: string]: string };
  export default classes;
} 