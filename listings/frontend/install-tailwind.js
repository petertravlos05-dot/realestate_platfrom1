const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '..', '..', '.cursor', 'debug.log');
function log(message, data) {
  const logData = {
    location: 'install-tailwind.js',
    message,
    data,
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run3',
    hypothesisId: 'B'
  };
  try {
    fs.appendFileSync(logPath, JSON.stringify(logData) + '\n');
  } catch (e) {}
}

const tailwindPath = path.join(__dirname, 'node_modules', 'tailwindcss', 'package.json');
const parentTailwindPath = path.join(__dirname, '..', 'node_modules', 'tailwindcss', 'package.json');
const rootTailwindPath = path.join(__dirname, '..', '..', 'node_modules', 'tailwindcss', 'package.json');

log('Starting tailwindcss installation check', {
  currentDir: __dirname,
  tailwindPath,
  parentTailwindPath,
  rootTailwindPath,
  localExists: fs.existsSync(tailwindPath),
  parentExists: fs.existsSync(parentTailwindPath),
  rootExists: fs.existsSync(rootTailwindPath)
});

// First, try to remove tailwindcss from root node_modules to force local installation
if (fs.existsSync(rootTailwindPath)) {
  console.log('Found tailwindcss in root node_modules. Removing it to force local installation...');
  try {
    fs.rmSync(path.dirname(rootTailwindPath), { recursive: true, force: true });
    log('Removed tailwindcss from root node_modules', {});
    console.log('Removed tailwindcss from root node_modules.');
  } catch (rmError) {
    log('Failed to remove root tailwindcss', { error: rmError.message });
    console.warn('Could not remove root tailwindcss:', rmError.message);
  }
}

if (!fs.existsSync(tailwindPath)) {
  console.log('Tailwind CSS not found locally. Installing tailwindcss@3.4.19...');
  
  // Check if package-lock.json exists and what it says about tailwindcss
  const packageLockPath = path.join(__dirname, 'package-lock.json');
  const packageLockExists = fs.existsSync(packageLockPath);
  log('Pre-install check', {
    packageLockExists,
    nodeModulesExists: fs.existsSync(path.join(__dirname, 'node_modules')),
    hasTailwindInLock: packageLockExists ? (fs.readFileSync(packageLockPath, 'utf8').includes('tailwindcss') ? 'yes' : 'no') : 'N/A'
  });
  
  // Don't remove package-lock.json - Next.js needs it
  // Instead, we'll regenerate it after installation if needed
  if (packageLockExists) {
    log('package-lock.json exists, will keep it', {});
  }
  
  log('Attempting to install tailwindcss@3.4.19', {
    command: 'npm install tailwindcss@3.4.19 --save-dev --legacy-peer-deps --force --no-package-lock',
    cwd: __dirname
  });
  
  try {
    // Try to install without --no-package-lock first (to preserve lockfile)
    // Only use --no-package-lock if there's a conflict
    let output = '';
    try {
      output = execSync('npm install tailwindcss@3.4.19 --save-dev --legacy-peer-deps --force --loglevel=verbose', {
        encoding: 'utf8',
        cwd: __dirname,
        stdio: 'pipe'
      });
    } catch (installError) {
      // If it fails due to lockfile conflict, try with --no-package-lock
      log('First install attempt failed, trying with --no-package-lock', { error: installError.message });
      output = execSync('npm install tailwindcss@3.4.19 --save-dev --legacy-peer-deps --force --no-package-lock --loglevel=verbose', {
        encoding: 'utf8',
        cwd: __dirname,
        stdio: 'pipe'
      });
    }
    log('npm install output', { output: output.substring(0, 2000) }); // First 2000 chars
    
    // Check if it was installed
    if (fs.existsSync(tailwindPath)) {
      const pkg = JSON.parse(fs.readFileSync(tailwindPath, 'utf8'));
      log('Installation successful', { version: pkg.version });
      console.log(`Tailwind CSS v${pkg.version} installed successfully!`);
      } else {
        log('Local install failed - npm said "up to date" but package not found', {
          checkedPath: tailwindPath
        });
        console.log('npm did not install locally (likely using parent node_modules).');
        console.log('Trying to force local installation by removing from parent...');
        
        // Try removing from parent node_modules to force local install
        if (fs.existsSync(parentTailwindPath)) {
          try {
            fs.rmSync(path.dirname(parentTailwindPath), { recursive: true, force: true });
            log('Removed tailwindcss from parent node_modules', {});
            console.log('Removed tailwindcss from parent node_modules. Retrying installation...');
            
            // Retry installation with --no-package-lock
            execSync('npm install tailwindcss@3.4.19 --save-dev --legacy-peer-deps --force --no-package-lock', {
              encoding: 'utf8',
              cwd: __dirname,
              stdio: 'inherit'
            });
            
            if (fs.existsSync(tailwindPath)) {
              const pkg = JSON.parse(fs.readFileSync(tailwindPath, 'utf8'));
              log('Installation successful after removing parent', { version: pkg.version });
              console.log(`Tailwind CSS v${pkg.version} installed successfully!`);
            } else {
              log('Installation still failed after removing parent', {});
              console.error('Installation still failed. Please check npm configuration.');
              process.exit(1);
            }
          } catch (rmError) {
            log('Failed to remove parent tailwindcss', { error: rmError.message });
            console.error('Could not remove parent tailwindcss:', rmError.message);
            process.exit(1);
          }
        } else {
          // Last resort: try using npm pack and manual extraction
          log('Trying npm pack as last resort', {});
          console.log('Trying alternative installation method (npm pack)...');
          try {
            // Create temp dir for pack
            const tempDir = path.join(__dirname, '.temp-tailwind');
            if (fs.existsSync(tempDir)) {
              fs.rmSync(tempDir, { recursive: true, force: true });
            }
            fs.mkdirSync(tempDir, { recursive: true });
            
            // Pack tailwindcss
            execSync('npm pack tailwindcss@3.4.19', {
              encoding: 'utf8',
              cwd: tempDir,
              stdio: 'pipe'
            });
            
            // Find the tarball
            const tarballs = fs.readdirSync(tempDir).filter(f => f.endsWith('.tgz'));
            if (tarballs.length > 0) {
              const tarball = path.join(tempDir, tarballs[0]);
              log('Packed tailwindcss', { tarball });
              
              // Extract to node_modules using npm's extract (works cross-platform)
              const nodeModulesDir = path.join(__dirname, 'node_modules');
              if (!fs.existsSync(nodeModulesDir)) {
                fs.mkdirSync(nodeModulesDir, { recursive: true });
              }
              
              // Use npm's built-in extract command (works on Windows)
              const targetDir = path.join(nodeModulesDir, 'tailwindcss');
              if (fs.existsSync(targetDir)) {
                fs.rmSync(targetDir, { recursive: true, force: true });
              }
              
              // Extract using npm pack --pack-destination and manual extraction
              // Or use a simple approach: install to temp dir and copy
              const extractTempDir = path.join(tempDir, 'extract');
              fs.mkdirSync(extractTempDir, { recursive: true });
              
              // Use npm install to extract the tarball
              log('Installing tarball to extract', { tarball, extractTempDir });
              let installOutput = '';
              try {
                installOutput = execSync(`npm install "${tarball}" --no-save --legacy-peer-deps --loglevel=verbose`, {
                  encoding: 'utf8',
                  cwd: extractTempDir,
                  stdio: 'pipe'
                });
                log('npm install tarball output', { output: installOutput.substring(0, 2000) });
              } catch (installError) {
                log('npm install tarball error', { 
                  error: installError.message, 
                  stdout: installError.stdout?.substring(0, 1000),
                  stderr: installError.stderr?.substring(0, 1000)
                });
                // Don't throw - maybe it still worked
              }
              
              // Alternative: install directly to current directory's node_modules
              log('Trying direct install to current node_modules', { tarball, nodeModulesDir });
              try {
                // Create a temporary package.json in extract dir to force npm to install there
                const tempPackageJson = path.join(extractTempDir, 'package.json');
                fs.writeFileSync(tempPackageJson, JSON.stringify({ name: 'temp-extract', version: '1.0.0' }, null, 2));
                
                const directInstallOutput = execSync(`npm install "${tarball}" --no-save --legacy-peer-deps`, {
                  encoding: 'utf8',
                  cwd: extractTempDir,
                  stdio: 'pipe'
                });
                log('Direct install output', { output: directInstallOutput.substring(0, 2000) });
                
                // Check if it created node_modules
                const checkNodeModules = path.join(extractTempDir, 'node_modules');
                log('Checking for node_modules after direct install', { 
                  exists: fs.existsSync(checkNodeModules),
                  contents: fs.existsSync(checkNodeModules) ? fs.readdirSync(checkNodeModules) : []
                });
                
                // Try to find tailwindcss in various locations
                const possibleLocations = [
                  path.join(extractTempDir, 'node_modules', 'tailwindcss'),
                  path.join(extractTempDir, 'node_modules', 'package'),
                  path.join(extractTempDir, 'package'),
                  extractTempDir
                ];
                
                for (const loc of possibleLocations) {
                  if (fs.existsSync(loc)) {
                    log('Found package at location', { location: loc, isDir: fs.statSync(loc).isDirectory() });
                    const pkgJsonPath = path.join(loc, 'package.json');
                    if (fs.existsSync(pkgJsonPath)) {
                      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
                      log('Found package.json', { location: loc, version: pkg.version });
                      
                      // Copy to target
                      if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(path.dirname(targetDir), { recursive: true });
                      }
                      const copyRecursive = (src, dest) => {
                        const stats = fs.statSync(src);
                        if (stats.isDirectory()) {
                          if (!fs.existsSync(dest)) {
                            fs.mkdirSync(dest, { recursive: true });
                          }
                          const files = fs.readdirSync(src);
                          for (const file of files) {
                            copyRecursive(path.join(src, file), path.join(dest, file));
                          }
                        } else {
                          fs.copyFileSync(src, dest);
                        }
                      };
                      copyRecursive(loc, targetDir);
                      log('Copied to target', { targetDir, exists: fs.existsSync(targetDir) });
                      break;
                    }
                  }
                }
              } catch (directError) {
                log('Direct install failed', { error: directError.message, stack: directError.stack });
                // Continue with extraction method
              }
              
              // Check what was created
              const extractNodeModules = path.join(extractTempDir, 'node_modules');
              log('Checking extracted files', {
                extractNodeModulesExists: fs.existsSync(extractNodeModules),
                extractNodeModulesContents: fs.existsSync(extractNodeModules) ? fs.readdirSync(extractNodeModules) : []
              });
              
              // Find the extracted package - npm install might put it directly in node_modules
              let extractedDir = path.join(extractTempDir, 'node_modules', 'tailwindcss');
              if (!fs.existsSync(extractedDir)) {
                // Try alternative location (package might be at root of extract dir)
                extractedDir = path.join(extractTempDir, 'package');
                log('Trying alternative location', { extractedDir, exists: fs.existsSync(extractedDir) });
              }
              
              if (fs.existsSync(extractedDir)) {
                log('Found extracted package', { extractedDir });
                // Copy to target location using fs operations (cross-platform)
                const copyRecursive = (src, dest) => {
                  const stats = fs.statSync(src);
                  if (stats.isDirectory()) {
                    if (!fs.existsSync(dest)) {
                      fs.mkdirSync(dest, { recursive: true });
                    }
                    const files = fs.readdirSync(src);
                    for (const file of files) {
                      copyRecursive(path.join(src, file), path.join(dest, file));
                    }
                  } else {
                    fs.copyFileSync(src, dest);
                  }
                };
                
                copyRecursive(extractedDir, targetDir);
                log('Copied package to target', { targetDir, exists: fs.existsSync(targetDir) });
              } else {
                log('Extracted package not found', { 
                  checkedPaths: [
                    path.join(extractTempDir, 'node_modules', 'tailwindcss'),
                    path.join(extractTempDir, 'package'),
                    extractTempDir
                  ],
                  extractTempDirContents: fs.readdirSync(extractTempDir)
                });
                throw new Error('Failed to extract tarball - package not found after npm install');
              }
              
              // Verify installation before cleanup
              if (fs.existsSync(tailwindPath)) {
                const pkg = JSON.parse(fs.readFileSync(tailwindPath, 'utf8'));
                log('Installation successful via npm pack', { version: pkg.version });
                console.log(`Tailwind CSS v${pkg.version} installed successfully via npm pack!`);
                
                // Install tailwindcss dependencies (they weren't installed with manual copy)
                console.log('Installing tailwindcss dependencies...');
                try {
                  // First, try to install all missing dependencies from package-lock.json
                  execSync('npm ci --legacy-peer-deps', {
                    encoding: 'utf8',
                    cwd: __dirname,
                    stdio: 'inherit'
                  });
                  log('Installed all dependencies via npm ci', {});
                  console.log('All dependencies installed successfully!');
                } catch (ciError) {
                  // If npm ci fails, try regular install
                  log('npm ci failed, trying npm install', { error: ciError.message });
                  try {
                    execSync('npm install --legacy-peer-deps', {
                      encoding: 'utf8',
                      cwd: __dirname,
                      stdio: 'inherit'
                    });
                    log('Installed dependencies via npm install', {});
                    console.log('Dependencies installed successfully!');
                  } catch (depError) {
                    log('Failed to install dependencies', { error: depError.message });
                    console.warn('Could not install dependencies:', depError.message);
                    console.warn('You may need to run "npm install" manually to install all dependencies.');
                  }
                }
                
                // Regenerate package-lock.json if it was deleted
                const packageLockPath = path.join(__dirname, 'package-lock.json');
                if (!fs.existsSync(packageLockPath)) {
                  console.log('Regenerating package-lock.json...');
                  try {
                    execSync('npm install --package-lock-only', {
                      encoding: 'utf8',
                      cwd: __dirname,
                      stdio: 'pipe'
                    });
                    log('Regenerated package-lock.json', {});
                  } catch (lockError) {
                    log('Failed to regenerate package-lock.json', { error: lockError.message });
                    console.warn('Could not regenerate package-lock.json:', lockError.message);
                  }
                }
                
                // Cleanup temp directory
                fs.rmSync(tempDir, { recursive: true, force: true });
                process.exit(0);
              } else {
                log('npm pack installation failed', {});
                console.error('Installation completed but tailwindcss not found in node_modules!');
                process.exit(1);
              }
            } else {
              log('No tarball found after npm pack', {});
              console.error('Failed to pack tailwindcss');
              process.exit(1);
            }
          } catch (packError) {
            log('npm pack error', { error: packError.message, stack: packError.stack });
            console.error('Failed to install via npm pack:', packError.message);
            process.exit(1);
          }
        }
      }
  } catch (error) {
    log('Installation error', { error: error.message, stack: error.stack });
    console.error('Failed to install Tailwind CSS:', error.message);
    process.exit(1);
  }
} else {
  log('Tailwindcss found at local path', { 
    tailwindPath, 
    exists: fs.existsSync(tailwindPath),
    __dirname,
    nodeModulesExists: fs.existsSync(path.join(__dirname, 'node_modules'))
  });
  const pkg = JSON.parse(fs.readFileSync(tailwindPath, 'utf8'));
  log('Read package.json', { version: pkg.version, path: tailwindPath });
  if (pkg.version && !pkg.version.startsWith('3.')) {
    console.log(`Found Tailwind CSS v${pkg.version}, but need v3.x. Installing v3.4.19...`);
    try {
      // Remove existing v4 first
      const tailwindDir = path.join(__dirname, 'node_modules', 'tailwindcss');
      if (fs.existsSync(tailwindDir)) {
        fs.rmSync(tailwindDir, { recursive: true, force: true });
      }
      execSync('npm install tailwindcss@3.4.19 --save-dev --legacy-peer-deps --force', {
        stdio: 'inherit',
        cwd: __dirname
      });
      // Verify installation
      if (fs.existsSync(tailwindPath)) {
        const newPkg = JSON.parse(fs.readFileSync(tailwindPath, 'utf8'));
        console.log(`Tailwind CSS v${newPkg.version} installed successfully!`);
      } else {
        console.error('Installation completed but tailwindcss not found in node_modules!');
        process.exit(1);
      }
    } catch (error) {
      console.error('Failed to install Tailwind CSS v3.4.19:', error.message);
      process.exit(1);
    }
  } else {
    log('Tailwindcss version check passed', { version: pkg.version, path: tailwindPath });
    console.log(`Tailwind CSS v${pkg.version} is already installed.`);
    
    // Verify it actually exists (double-check)
    if (!fs.existsSync(tailwindPath)) {
      log('WARNING: tailwindPath says it exists but file not found!', { tailwindPath });
      console.error('ERROR: Script says tailwindcss is installed but file not found!');
      console.error('This is a bug - tailwindcss was detected but file is missing.');
      process.exit(1);
    }
    
    // Check if package-lock.json exists - Next.js needs it
    const packageLockPath = path.join(__dirname, 'package-lock.json');
    if (!fs.existsSync(packageLockPath)) {
      console.log('package-lock.json is missing. Regenerating it for Next.js...');
      try {
        execSync('npm install --package-lock-only', {
          encoding: 'utf8',
          cwd: __dirname,
          stdio: 'inherit'
        });
        log('Regenerated package-lock.json', {});
        console.log('package-lock.json regenerated successfully!');
      } catch (lockError) {
        log('Failed to regenerate package-lock.json', { error: lockError.message });
        console.warn('Could not regenerate package-lock.json:', lockError.message);
        console.warn('You may need to run "npm install --package-lock-only" manually.');
      }
    }
  }
}

