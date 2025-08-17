(function(){
  function fetchText(url){
    return fetch(url, {cache:'no-store'}).then(r=>{ if(!r.ok) throw new Error('Failed to fetch '+url+' ('+r.status+')'); return r.text(); });
  }

  function loadSidebar(){
    const root = document.getElementById('sidebar-root');
    if(!root) return;
    const src = root.dataset.src || '/sidebar.html';
    fetchText(src).then(html=>{
      root.innerHTML = html;
      // Do not modify IDs/classes — original script.js expects these exact elements.
      // If your main script needs re-initialization after injection, call any init function here.
      if(typeof initializeMobileControls === 'function'){
        try{ initializeMobileControls(); }catch(e){ console.warn('initializeMobileControls threw', e); }
      }
      document.dispatchEvent(new CustomEvent('sidebar:loaded'));
    }).catch(err=>{
      console.error('Sidebar load failed', err);
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadSidebar);
  else loadSidebar();
})();