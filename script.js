/* Verto Studio — client interactions 2026
   Header scroll state, split-text hero reveal, IntersectionObserver reveals,
   cursor spotlight, mobile menu, project filter, lazy live-iframe loading. */
(function(){
  'use strict';
  const $=(s,ctx)=>(ctx||document).querySelector(s);
  const $$=(s,ctx)=>Array.from((ctx||document).querySelectorAll(s));
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Year
  $$('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());

  // Header scroll state
  const header=$('[data-header]');
  if(header){
    const setScrolled=()=>header.setAttribute('data-scrolled',window.scrollY>12?'1':'0');
    setScrolled();
    window.addEventListener('scroll',setScrolled,{passive:true});
  }

  // Mobile menu
  const toggle=$('[data-menu-toggle]');
  const nav=$('[data-navigation]');
  if(toggle&&nav){
    toggle.addEventListener('click',()=>{
      const open=nav.getAttribute('data-open')==='1';
      nav.setAttribute('data-open',open?'0':'1');
      toggle.setAttribute('aria-expanded',open?'false':'true');
      document.body.style.overflow=open?'':'hidden';
    });
    $$('a',nav).forEach(a=>a.addEventListener('click',()=>{
      nav.setAttribute('data-open','0');
      toggle.setAttribute('aria-expanded','false');
      document.body.style.overflow='';
    }));
  }

  // Split hero title into word wrappers for reveal
  const title=$('[data-split]');
  if(title&&!reduce){
    const html=title.innerHTML;
    // Wrap each word (keep <em> inline structure)
    const tmp=document.createElement('div');
    tmp.innerHTML=html;
    const walk=(node)=>{
      const out=[];
      node.childNodes.forEach(n=>{
        if(n.nodeType===3){
          n.textContent.split(/(\s+)/).forEach(part=>{
            if(!part) return;
            if(/^\s+$/.test(part)){out.push(document.createTextNode(part));return}
            const w=document.createElement('span');w.className='word';
            const inner=document.createElement('span');inner.textContent=part;
            w.appendChild(inner);
            out.push(w);
          });
        } else if(n.nodeType===1){
          const clone=n.cloneNode(false);
          const parts=walk(n);
          parts.forEach(p=>clone.appendChild(p));
          out.push(clone);
        }
      });
      return out;
    };
    const nodes=walk(tmp);
    title.innerHTML='';
    nodes.forEach(n=>title.appendChild(n));
  }

  // Reveal on scroll (with fallback for content already past the viewport on load)
  const revealTargets=$$('[data-reveal],[data-reveal-stagger]');
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}
      });
    },{threshold:0,rootMargin:'0px 0px -8% 0px'});
    revealTargets.forEach(el=>{
      const r=el.getBoundingClientRect();
      if(r.bottom<0){el.classList.add('in')} // already scrolled past
      else io.observe(el);
    });
  } else {
    revealTargets.forEach(el=>el.classList.add('in'));
  }

  // Cursor spotlight
  const glow=$('.cursor-glow');
  if(glow&&window.matchMedia('(hover:hover)').matches&&!reduce){
    let x=window.innerWidth/2,y=window.innerHeight/2,tx=x,ty=y,raf=0;
    document.body.setAttribute('data-cursor','1');
    window.addEventListener('mousemove',(e)=>{tx=e.clientX;ty=e.clientY;if(!raf) raf=requestAnimationFrame(tick)});
    const tick=()=>{
      x+=(tx-x)*.14;y+=(ty-y)*.14;
      glow.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;
      if(Math.abs(tx-x)>.5||Math.abs(ty-y)>.5) raf=requestAnimationFrame(tick);
      else raf=0;
    };
    // Button spotlight (radial fill following cursor)
    $$('.btn').forEach(b=>{
      b.addEventListener('mousemove',(e)=>{
        const r=b.getBoundingClientRect();
        b.style.setProperty('--mx',((e.clientX-r.left)/r.width*100)+'%');
        b.style.setProperty('--my',((e.clientY-r.top)/r.height*100)+'%');
      });
    });
  }

  // Project filter
  const filterTabs=$$('.filter-tab');
  const projectRows=$$('[data-project]');
  if(filterTabs.length&&projectRows.length){
    filterTabs.forEach(tab=>{
      tab.addEventListener('click',()=>{
        const f=tab.dataset.filter;
        filterTabs.forEach(t=>t.removeAttribute('data-active'));
        tab.setAttribute('data-active','1');
        projectRows.forEach(row=>{
          const kind=row.dataset.kind;
          const show=f==='all'||f===kind;
          if(show){row.hidden=false;requestAnimationFrame(()=>row.classList.add('in'))}
          else{row.hidden=true}
        });
      });
    });
  }

  // Lazy load live iframes (only when scrolled into view)
  const iframes=$$('iframe[data-live-src]');
  if(iframes.length&&'IntersectionObserver' in window){
    const iio=new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          const f=e.target;
          if(!f.src) f.src=f.dataset.liveSrc;
          iio.unobserve(f);
        }
      });
    },{rootMargin:'200px 0px'});
    iframes.forEach(f=>iio.observe(f));
  } else {
    iframes.forEach(f=>f.src=f.dataset.liveSrc);
  }
})();
