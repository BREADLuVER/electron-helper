// expose ipc and inject resize handle
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (ch, data) => ipcRenderer.send(ch, data)
});

window.addEventListener('DOMContentLoaded', () => {
  // inject CSS for drag bar and resize handle
  const style = document.createElement('style');
  style.textContent = `
    body::before {
      content: '';
      position: fixed; top: 0; left:0; right:0; height:20px;
      -webkit-app-region: drag;
      background: transparent;
      z-index: 2147483647;
    }
    #doc-resize-handle {
      position: fixed; right:0; bottom:0; width:18px; height:18px;
      z-index:2147483647;
      cursor: se-resize;
    }
    #doc-resize-handle::after {
      content:''; position:absolute; right:2px; bottom:2px; width:12px; height:12px;
      border-right:2px solid rgba(0,0,0,0.4);
      border-bottom:2px solid rgba(0,0,0,0.4);
    }
  `;
  document.head.appendChild(style);

  const handle = document.createElement('div');
  handle.id = 'doc-resize-handle';
  document.body.appendChild(handle);

  let startX=0, startY=0;
  handle.addEventListener('mousedown', (e)=>{
    e.preventDefault();
    startX=e.screenX; startY=e.screenY;
    function onMove(ev){
      const dx=ev.screenX-startX; const dy=ev.screenY-startY;
      if(dx===0 && dy===0) return;
      ipcRenderer.send('win-resize', { edge:'corner', dx, dy });
      startX=ev.screenX; startY=ev.screenY;
    }
    function onUp(){
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });
}); 