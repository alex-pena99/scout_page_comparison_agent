// Discover semantic product tabs plus the observed AT&T legacy category switch.
// Navigation links, forms, disclosure controls and arbitrary buttons stay excluded.
const { createHash } = require('node:crypto');
async function discoverHeadlineTabs(page) {
  const candidates = await page.evaluate(() => {
    const visible = el => !!el.getClientRects().length && getComputedStyle(el).visibility === 'visible';
    const forbidden = /details?|terms?|conditions|faq|disclosure|legal|eligibility|learn more|read more/i;
    const att = /(^|\.)att\.com$/i.test(location.hostname) && location.pathname.startsWith('/cfd/');
    const cssPath = el => {
      if(el.id && document.querySelectorAll('#'+CSS.escape(el.id)).length===1)return '#'+CSS.escape(el.id);
      const parts=[];
      for(let n=el;n&&n!==document.body;n=n.parentElement){
        const siblings=[...n.parentElement.children].filter(s=>s.localName===n.localName);
        parts.unshift(n.localName+':nth-of-type('+(siblings.indexOf(n)+1)+')');
      }
      return 'body > '+parts.join(' > ');
    };
    return [...document.querySelectorAll('[role=tab],button[aria-controls],button[aria-pressed],.hero-deals__tabs > button')]
      .filter(visible).flatMap(el => {
      const label = (el.getAttribute('aria-label') || el.innerText || '').replace(/\s+/g,' ').trim();
      const id = el.getAttribute('aria-controls') || el.getAttribute('data-target')?.replace(/^#/,'');
      const panel = id && document.getElementById(id);
      const legacy = att && el.matches('.hero-deals__tabs > button.hero-deals__tabs--internet,.hero-deals__tabs > button.hero-deals__tabs--wireless') && /^(Internet|Wireless)$/.test(label);
      const semantic = el.matches('[role=tab][aria-selected]');
      const device = el.matches('button[aria-pressed]') && /^(Apple(?: iOS)?|Android)$/i.test(label);
      if ((!panel && !semantic && !device && !legacy) || !label || label.length > 80 || forbidden.test(label+' '+(id||'')) ||
          el.closest('form,[role=dialog],dialog') || panel?.matches('dialog,[role=dialog],.modal') ||
          el.matches('[type=submit],[aria-haspopup=dialog],[data-toggle=modal],[data-bs-toggle=modal]')) return [];
      const sameLabel=[...document.querySelectorAll('button,[role=tab]')].filter(n=>visible(n)&&
        !n.closest('form,[role=dialog],dialog') && (n.getAttribute('aria-label')||n.innerText||'').replace(/\s+/g,' ').trim()===label);
      // Labels survive hydration/reparenting. Fall back to a scoped CSS path
      // only when several visible controls share the same label.
      const selector=sameLabel.length===1?undefined:cssPath(el);
      const scope=panel?'#'+CSS.escape(id):'body';
      return [{label,selector,scope,legacy}];
    });
  });
  return candidates.map(c=>({id:'tab-'+createHash('sha256').update(c.selector||'label:'+c.label).digest('hex').slice(0,12),
    automatic:true,surface:'product-tab',label:c.label,selector:c.selector,reason:'Capture the primary '+c.label+' tab',
    expected:{selected:true,scope:c.scope,visible:c.scope,text:'\\S',...(c.legacy?{selectedClass:'(?:^|\\s)highlight-deal(?:\\s|$)'}:{})}}));
}
module.exports={discoverHeadlineTabs};
