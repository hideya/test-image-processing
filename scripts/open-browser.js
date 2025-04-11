// scripts/open-browser.js
import 'dotenv/config';

// Give the server a moment to start
setTimeout(() => {
  const port = process.env.PORT || 5001;
  
  // Use the native Node.js APIs instead of a package
  const url = `http://localhost:${port}`;
  const { platform } = process;
  
  console.log(`Opening browser at ${url}`);
  
  // Open URL based on platform
  if (platform === 'win32') {
    // Windows
    import('child_process').then(cp => cp.exec(`start ${url}`));
  } else if (platform === 'darwin') {
    // macOS
    import('child_process').then(cp => cp.exec(`open ${url}`));
  } else {
    // Linux and others
    import('child_process').then(cp => cp.exec(`xdg-open ${url}`));
  }
}, 1000);
