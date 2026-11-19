// Only explicit in-page tab controls with an associated panel are automatic.
// Never infer that a CTA, form, disclosure, or external link is a product tab.
const { createHash } = require('node:crypto');
async function discoverHeadlineTabs(page) {
  const candidates = await page.evaluate(() => {
    const visible = el => !!el.getClientRects().length && getComputedStyle(el).visibility === 'visible';
    const forbidden = /details?|terms?|conditions|faq|disclosure|legal|eligibility|learn more|read more/i;
    return [...document.querySelectorAll('[role=tab],button[aria-controls]')].filter(visible).flatMap(el => {
      const label = (el.getAttribute('aria-label') || el.innerText || '').replace(/\s+/g,' ').trim();
      const id = el.getAttribute('aria-controls') || el.getAttribute('data-target')?.replace(/^#/,'');
      const panel = id && document.getElementById(id);
      if (!panel || !label || label.length > 80 || forbidden.test(label+' '+id) ||
          el.closest('form,[role=dialog],dialog') || panel.matches('dialog,[role=dialog],.modal') ||
          el.matches('[aria-haspopup=dialog],[data-toggle=modal],[data-bs-toggle=modal]')) return [];
      const selector = el.id ? '#'+CSS.escape(el.id) : '[role="tab"][aria-controls="'+CSS.escape(id)+'"]';
      if (document.querySelectorAll(selector).length !== 1) return [];
      return [{label,selector,scope:'#'+CSS.escape(id)}];
    });
  });
  return candidates.map(c=>({id:'tab-'+createHash('sha256').update(c.selector).digest('hex').slice(0,12),
    surface:'product-tab',label:c.label,selector:c.selector,reason:'Capture the primary '+c.label+' tab',
    expected:{selected:true,scope:c.scope,visible:c.scope,text:'\\S'}}));
}
module.exports={discoverHeadlineTabs};
