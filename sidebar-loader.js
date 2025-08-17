(async function(){
  async function fetchText(url){
    const r = await fetch(url, {cache:'no-store'});
    if(!r.ok) throw new Error('Failed to fetch '+url+' ('+r.status+')');
    return await r.text();
  }

  async function loadSidebar(){
    const root = document.getElementById('sidebar-root');
    if(!root) return; // nothing to do
    const src = root.dataset.src || '/sidebar.html';
    try{
      const html = await fetchText(src);
      root.innerHTML = html;

      // Ensure sidebar CSS is present only once
      if(!document.querySelector('link[data-sidebar-css]')){
        const styleLink = document.createElement('link');
        styleLink.rel = 'stylesheet';
        styleLink.href = '/sidebar.css';
        styleLink.setAttribute('data-sidebar-css','true');
        document.head.appendChild(styleLink);
      }

      // Attach behavior
      initSidebarBehavior(root);
      document.dispatchEvent(new CustomEvent('sidebar:loaded'));
    }catch(err){
      console.error('Sidebar load failed', err);
    }
  }

  function initSidebarBehavior(root){
    const sidebar = root.querySelector('#sidebar');
    const overlay = root.querySelector('#sidebar-overlay');
    const toggle = root.querySelector('#sidebar-toggle');
    const openLoginBtn = root.querySelector('#btn-open-login');
    const loginModal = root.querySelector('#sidebar-login-modal');
    const modalClose = root.querySelector('#modal-close');
    const modalCancel = root.querySelector('#modal-cancel');
    const loginForm = root.querySelector('#login-form');
    const loginError = root.querySelector('#login-error');
    const authArea = root.querySelector('#auth-area');

    // Accessibility helpers
    function setAriaOpen(isOpen){
      if(toggle) toggle.setAttribute('aria-expanded', String(isOpen));
      if(sidebar) sidebar.classList.toggle('open', !!isOpen);
      if(overlay) overlay.classList.toggle('visible', !!isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    // Mobile toggle events
    if(toggle){
      toggle.addEventListener('click', ()=> setAriaOpen(true));
    }
    if(overlay){
      overlay.addEventListener('click', ()=> setAriaOpen(false));
    }

    // Close sidebar when a link is clicked on small screens
    root.querySelectorAll('.menu-item').forEach(a=>{
      a.addEventListener('click', ()=>{
        if(window.matchMedia('(max-width:899px)').matches){ setAriaOpen(false); }
      });
    });

    // Modal open/close
    if(openLoginBtn){
      openLoginBtn.addEventListener('click', ()=>{
        openLogin();
      });
    }
    if(modalClose) modalClose.addEventListener('click', closeLogin);
    if(modalCancel) modalCancel.addEventListener('click', closeLogin);

    function openLogin(){
      if(!loginModal) return;
      loginModal.setAttribute('aria-hidden','false');
      // focus the first input
      const first = loginModal.querySelector('input');
      if(first) first.focus();
    }
    function closeLogin(){
      if(!loginModal) return;
      loginModal.setAttribute('aria-hidden','true');
      loginError.textContent = '';
    }

    // Login form submit
    if(loginForm){
      loginForm.addEventListener('submit', async (e)=>{
        e.preventDefault();
        loginError.textContent = '';
        const form = new FormData(loginForm);
        const email = form.get('email');
        const password = form.get('password');
        const remember = form.get('remember');

        // Attempt real API call to /api/login; if it fails, fall back to a mocked success for dev
        try{
          const resp = await fetch('/api/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
          if(!resp.ok){
            // Try to read message
            const body = await resp.json().catch(()=>({}));
            throw new Error(body.message || ('Login failed: ' + resp.status));
          }
          const data = await resp.json();
          // expect { token, user: {name,email} }
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('authUser', JSON.stringify(data.user||{email}));
          if(remember){ localStorage.setItem('authRemember','1') } else { localStorage.removeItem('authRemember') }
          updateAuthUI();
          closeLogin();
        }catch(err){
          console.warn('API login failed, switching to fallback (dev) login.', err);
          // Fallback: accept any non-empty password (for local dev). Remove in production.
          if(email && password){
            localStorage.setItem('authToken','dev-token-'+Date.now());
            localStorage.setItem('authUser', JSON.stringify({name: email.split('@')[0], email}));
            updateAuthUI();
            closeLogin();
          } else {
            loginError.textContent = 'Please provide your email and password.';
          }
        }
      });
    }

    // Logout handler
    function logout(){
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      localStorage.removeItem('authRemember');
      updateAuthUI();
    }

    // Update auth area depending on login state
    function updateAuthUI(){
      const token = localStorage.getItem('authToken');
      const userRaw = localStorage.getItem('authUser');
      let user = null;
      try{ user = userRaw ? JSON.parse(userRaw) : null }catch(e){ user = null }

      if(token && user){
        authArea.innerHTML = `
          <div class="user-pill" title="${escapeHtml(user.email||'')}">
            <span class="avatar">${escapeHtml((user.name||'U').slice(0,1).toUpperCase())}</span>
            <div class="user-info">
              <div class="user-name">${escapeHtml(user.name||user.email||'User')}</div>
              <div class="user-email">${escapeHtml(user.email||'')}</div>
            </div>
          </div>
          <button id="btn-logout" class="btn btn-ghost">Sign out</button>
        `;
        const btnLogout = authArea.querySelector('#btn-logout');
        if(btnLogout) btnLogout.addEventListener('click', logout);
      } else {
        authArea.innerHTML = `
          <button id="btn-open-login" class="btn btn-primary">Log in</button>
          <a href="/signup.html" class="btn btn-ghost">Sign up</a>
        `;
        // re-wire the login open button
        const btnOpen = authArea.querySelector('#btn-open-login');
        if(btnOpen) btnOpen.addEventListener('click', openLogin);
      }
    }

    // small helper to avoid XSS when injecting user strings
    function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }

    // initial render
    updateAuthUI();

    // expose a tiny API on window so other scripts can query auth
    window.sidebarAuth = {
      isLoggedIn: ()=>!!localStorage.getItem('authToken'),
      getUser: ()=>{ try{return JSON.parse(localStorage.getItem('authUser'))}catch(e){return null} },
      logout
    };

    // Accessibility: close login modal on Escape
    document.addEventListener('keydown', (ev)=>{
      if(ev.key === 'Escape'){
        if(loginModal && loginModal.getAttribute('aria-hidden')==='false') closeLogin();
        // also close sidebar on mobile
        if(sidebar && sidebar.classList.contains('open')){
          setAriaOpen(false);
        }
      }
    });
  }

  // Run loader on DOMContentLoaded so <div id="sidebar-root"> exists
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', loadSidebar);
  } else { loadSidebar(); }

})();