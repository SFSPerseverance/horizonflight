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

      // Call your global initializers from script.js so the site CSS/JS take effect
      if(typeof initializeMobileControls === 'function'){
        try{ initializeMobileControls(); }catch(e){ console.warn('initializeMobileControls threw', e); }
      }

      // Wire up auth open button(s) to use your existing modal functions if available
      setupAuthButtons(root);

      document.dispatchEvent(new CustomEvent('sidebar:loaded'));
    }catch(err){
      console.error('Sidebar load failed', err);
    }
  }

  function setupAuthButtons(root){
    const btn = root.querySelector('#btn-open-login');
    if(!btn) return;
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      const modal = document.getElementById('authModal');
      if(modal){
        // Prefer existing helper functions if present
        if(typeof animateModalOpen === 'function') animateModalOpen(modal);
        if(typeof showLoginForm === 'function') showLoginForm();
        // fallback: simply display
        else { modal.style.display = 'block'; }
      }
    });

    // Also wire up any inline "open-login" anchors that may exist
    document.querySelectorAll('[data-open-auth], .open-auth').forEach(a=>{
      a.addEventListener('click', (e)=>{ e.preventDefault(); const modal=document.getElementById('authModal'); if(modal){ if(typeof animateModalOpen==='function') animateModalOpen(modal); if(typeof showLoginForm==='function') showLoginForm(); else modal.style.display='block'; } });
    });
  }

  // Run loader on DOMContentLoaded so <div id="sidebar-root"> exists
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', loadSidebar);
  } else { loadSidebar(); }

})();