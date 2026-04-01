// #region agent log
const fs = require('fs');
const path = require('path');
const logPath = path.join(__dirname, '..', '..', '.cursor', 'debug.log');
try {
  // Try multiple possible paths
  const possiblePaths = [
    path.join(__dirname, 'node_modules', 'tailwindcss', 'package.json'),
    path.join(__dirname, '..', 'node_modules', 'tailwindcss', 'package.json'),
    path.join(__dirname, '..', '..', 'node_modules', 'tailwindcss', 'package.json'),
  ];
  let tailwindPkg = null;
  let foundPath = null;
  for (const pkgPath of possiblePaths) {
    if (fs.existsSync(pkgPath)) {
      tailwindPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      foundPath = pkgPath;
      break;
    }
  }
  if (tailwindPkg) {
    const logData = {
      location: 'postcss.config.js:15',
      message: 'Tailwind CSS version check - FOUND',
      data: {
        packageJsonVersion: '^3.4.19',
        installedVersion: tailwindPkg.version,
        foundPath: foundPath,
        isV4: tailwindPkg.version && tailwindPkg.version.startsWith('4'),
        postcssConfigFormat: 'object',
        hasPostcssPlugin: !!tailwindPkg.exports?.['./plugin'],
        mainEntry: tailwindPkg.main,
        exports: Object.keys(tailwindPkg.exports || {})
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run2',
      hypothesisId: 'A'
    };
    fs.appendFileSync(logPath, JSON.stringify(logData) + '\n');
  } else {
    // Check if dist/lib.js exists (means package is installed but package.json missing)
    const libPath = path.join(__dirname, 'node_modules', 'tailwindcss', 'dist', 'lib.js');
    const libExists = fs.existsSync(libPath);
    const logData = {
      location: 'postcss.config.js:35',
      message: 'Tailwind CSS version check - NOT FOUND in package.json but lib.js exists',
      data: {
        packageJsonNotFound: true,
        libJsExists: libExists,
        checkedPaths: possiblePaths
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run2',
      hypothesisId: 'A'
    };
    fs.appendFileSync(logPath, JSON.stringify(logData) + '\n');
  }
} catch (err) {
  const errorLog = {
    location: 'postcss.config.js:45',
    message: 'Error checking tailwindcss version',
    data: { error: err.message, stack: err.stack },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run2',
    hypothesisId: 'A'
  };
  try {
    fs.appendFileSync(logPath, JSON.stringify(errorLog) + '\n');
  } catch (e) {}
}
// #endregion

module.exports = {
  plugins: {
    tailwindcss: {},
    // autoprefixer: {}, // Temporarily disabled - Next.js will handle vendor prefixes
  },
} 