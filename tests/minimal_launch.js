const { _electron: electron } = require('playwright');
const path = require('path');

(async () => {
  console.log('Launching minimal...');
  const app = await electron.launch({
    args: [path.join(__dirname, '..')]
  });
  console.log('App launched!');
  const window = await app.firstWindow();
  console.log('Window opened!');
  console.log('Title:', await window.title());
  await app.close();
})();
