import { loadState } from './storage.js';
import { initState } from './state.js';
import { initUI } from './ui.js';

try {
  const initial = loadState();
  initState(initial);
  initUI();
} catch (err) {
  console.error('Failed to initialize app:', err);
  const main = document.getElementById('main');
  if (main) {
    const alert = document.createElement('p');
    alert.setAttribute('role', 'alert');
    alert.textContent = 'Something went wrong loading the app. Please refresh the page.';
    main.prepend(alert);
  }
}
