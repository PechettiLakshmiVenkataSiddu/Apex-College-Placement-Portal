const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const publicDir = path.join(__dirname, '..', 'public');
const appJs = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

http.get('http://localhost:5000/api/jobs', (res) => {
  let d = '';
  res.on('data', chunk => d += chunk);
  res.on('end', () => {
    const jobsData = JSON.parse(d);

    const elements = new Map();
    const listeners = new Map();

    class MockEl {
      constructor(id = '', tag = 'div') {
        this.id = id;
        this.tag = tag;
        this.innerHTML = '';
        this.textContent = '';
        this.value = '';
        this.children = [];
        this.style = {};
      }
      appendChild(c) { this.children.push(c); return c; }
      addEventListener(evt, fn) {
        if (!listeners.has(evt)) listeners.set(evt, []);
        listeners.get(evt).push(fn);
      }
    }

    ['jobsContainer', 'searchInput', 'locationFilter', 'jobTypeFilter', 'heroAuthButtons',
     'statCompaniesVisiting', 'statDrivesOpen', 'statStudentsPlaced'].forEach(id => {
      elements.set(id, new MockEl(id));
    });

    const sandbox = {
      console: console,
      document: {
        getElementById: id => elements.get(id) || new MockEl(id),
        querySelector: sel => sel === '.nav-container' ? new MockEl('nav') : null,
        querySelectorAll: () => [],
        createElement: tag => new MockEl('', tag),
        addEventListener: (evt, fn) => {
          if (!listeners.has(evt)) listeners.set(evt, []);
          listeners.get(evt).push(fn);
        }
      },
      window: {
        location: { href: 'index.html' },
        localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      },
      localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      fetch: async (url) => {
        if (url.includes('/public/stats')) {
          return { ok: true, json: async () => ({ ok: true, data: { companiesVisiting: 8, drivesOpen: 8, studentsPlaced: 1 } }) };
        }
        return { ok: true, json: async () => jobsData };
      },
      Date: Date,
      Number: Number,
      String: String,
      Promise: Promise,
      Set: Set,
      Math: Math,
      setTimeout: (fn) => fn()
    };

    const scriptMatch = indexHtml.match(/<script>([\s\S]*?)<\/script>/i);
    const code = `${appJs}\n${scriptMatch[1]}`;

    try {
      vm.createContext(sandbox);
      vm.runInContext(code, sandbox);
      console.log('Script parsed cleanly.');

      const domLoadedFns = listeners.get('DOMContentLoaded') || [];
      Promise.all(domLoadedFns.map(fn => fn())).then(() => {
        const container = elements.get('jobsContainer');
        console.log('jobsContainer innerHTML length:', container.innerHTML.length);
        console.log('Has job-card class?', container.innerHTML.includes('job-card'));
        const matches = container.innerHTML.match(/class="job-card"/g);
        console.log('Total job cards rendered:', matches ? matches.length : 0);
      }).catch(err => {
        console.error('Runtime error in DOMContentLoaded:', err);
      });
    } catch (e) {
      console.error('Fatal execution error:', e);
    }
  });
});

