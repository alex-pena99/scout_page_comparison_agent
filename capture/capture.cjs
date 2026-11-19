const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const standalone = require('@sparticuz/chromium').default;

const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');

const now = () => new Date().toISOString();
const digest = value => createHash('sha256').update(value).digest('hex');
const write = async (file, value) => {
  await fs.writeFile(file + '.tmp', JSON.stringify(value, null, 2) + '\n');
  await fs.rename(file + '.tmp', file);
};

function readDocument() {
  const roots = [document];
  const segments = [], headings = [], images = [], openShadow = [];
  for (const root of roots) {
    const selector = root === document ? 'body, body *' : '*';
    for (const el of root.querySelectorAll(selector)) {
      if (el.closest('script,style,noscript,template')) continue;
      if (el.shadowRoot) {
        roots.push(el.shadowRoot);
        openShadow.push({ host: el.localName, text: el.shadowRoot.textContent });
      }
      const shown = !!el.getClientRects().length &&
        getComputedStyle(el).visibility === 'visible';
      const block = el.closest('section,article,main,details,[id]');
      const section = block?.id || block?.querySelector('h1,h2,h3,h4')?.textContent.trim() || el.tagName;
      if (/^H[1-6]$/.test(el.tagName) || el.getAttribute('role') === 'heading') {
        headings.push({ text: el.textContent.trim(), section, visible: shown });
      }
      for (const node of el.childNodes) {
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent.includes('$')) continue;
        const range = document.createRange();
        range.selectNode(node);
        segments.push({ text: node.textContent.trim(), section,
          context: el.textContent.trim(), visible: shown && !!range.getClientRects().length });
      }
      if (shown && el.tagName === 'IMG') {
        const box = el.getBoundingClientRect();
        images.push({ alt: el.alt, src: el.currentSrc || el.src, loaded: el.complete && el.naturalWidth > 0,
          width: box.width, height: box.height, section, top: box.top + scrollY });
      }
      if (shown && /^(SECTION|DIV|HEADER|ASIDE|A|SPAN)$/.test(el.tagName)) {
        const css = getComputedStyle(el).backgroundImage;
        if (css.includes('url(')) {
          const box = el.getBoundingClientRect();
          images.push({ background: css, text: el.innerText?.slice(0, 180), width: box.width,
            height: box.height, section, top: box.top + scrollY });
        }
      }
    }
  }
  const visibleText = document.body?.innerText ?? '';
  return {
    url: location.href, title: document.title, visibleText, headings, images, openShadow,
    literalDollarCount: segments.reduce((n, s) => n + (s.text.match(/\$/g) || []).length, 0),
    segments,
    visibleAmounts: visibleText.replace(/\s+/g, ' ').match(/\$\s*\d[\d,]*(?:\.\d{1,2})?(?:\s*\/\s*(?:month|mo|year|yr))?/g) || [],
    visibleDollarLines: visibleText.split('\n').filter(line => line.includes('$')),
    iframes: Array.from(document.querySelectorAll('iframe'), f => ({
      src:f.src, title:f.title, width:f.clientWidth, height:f.clientHeight
    })),
  };
}

async function controls(page) {
  return page.locator('button, summary, [role=button], [role=tab], a[href], .jsModal').evaluateAll(els =>
    els.filter(el => el.getClientRects().length && getComputedStyle(el).visibility === 'visible')
      .map(el => ({
        tag: el.tagName, role: el.getAttribute('role'), type: el.getAttribute('type'),
        href: el.getAttribute('href'), aria: el.getAttribute('aria-label'), expanded: el.getAttribute('aria-expanded'),
        target: el.getAttribute('aria-controls') || el.getAttribute('data-bs-target') || el.getAttribute('data-target'),
        selected:el.getAttribute('aria-selected') || el.getAttribute('aria-pressed') || el.getAttribute('data-state'),
        className:String(el.className),
        text: (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' '),
      })).filter(el => el.text || el.aria)
  );
}

async function scrollPage(page, remaining) {
  return page.evaluate(async max => {
    const started = performance.now();
    const positions = [];
    const height = () => document.documentElement.scrollHeight;
    const initialHeight = height();
    let maxHeight = initialHeight;
    let reachedEnd = false;
    while (performance.now() - started < max) {
      const before = scrollY;
      window.scrollTo({ top: before + 680, behavior: 'instant' });
      await new Promise(resolve => setTimeout(resolve, 85));
      positions.push(scrollY);
      maxHeight = Math.max(maxHeight, height());
      if (scrollY + innerHeight >= height() - 2) {
        await new Promise(resolve => setTimeout(resolve, 180));
        maxHeight = Math.max(maxHeight, height());
        if (scrollY + innerHeight >= height() - 2) {
          reachedEnd = true;
          break;
        }
      } else if (before === scrollY) break;
    }
    const endPosition = scrollY;
    window.scrollTo({ top: 0, behavior: 'instant' });
    return { reachedEnd, endPosition, positions, height:height(), initialHeight, maxHeight,
      grew:maxHeight > initialHeight, interrupted:!reachedEnd };
  }, Math.min(remaining(), 14000));
}

async function measure(log, operation, fn, fields = {}) {
  const at = now();
  const start = performance.now();
  let outcome = 'ok';
  try { return await fn(); }
  catch (error) { outcome = 'error'; throw error; }
  finally { log.push({ operation, ...fields, at, offset_ms:start, elapsed_ms:performance.now()-start, outcome }); }
}

const dialogSelector = '.modal--active, .modal.show, [role=dialog][aria-modal=true], dialog[open]';
const dismissSelector = '[aria-label*="close" i], [aria-label*="dismiss" i], [data-dismiss="modal"], [data-bs-dismiss="modal"], .modal__close, .modal-close, .close';
const transient = /timeout|ERR_CONNECTION_RESET|ERR_CONNECTION_CLOSED|ERR_CONNECTION_TIMED_OUT|ERR_NETWORK_CHANGED|HTTP 5\d\d/i;
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const bodyText = page => page.locator('body').innerText();
const cleanText = text => text.replace(/[\u200b\u00ad]/g, '').replace(/\s+/g, ' ').trim();
function stableDocument(data) {
  return digest(JSON.stringify([data.url, data.title,
    data.headings.filter(h=>h.visible).slice(0,8).map(h=>cleanText(h.text)),
    [...new Set(data.visibleAmounts)].sort()]));
}

function locatorFor(page, action) {
  if (action.selector) return page.locator(action.selector);
  if (action.aria) return page.getByLabel(action.aria, {exact:true});
  if (action.button) return page.getByRole('button', {name: action.label, exact:true}).or(
    page.getByRole('tab', {name: action.label, exact:true}));
  return page.getByText(action.label, {exact:true});
}

async function targetFor(page, action) {
  const candidates = locatorFor(page, action).filter({visible:true});
  const count = await candidates.count();
  if (action.ordinal !== undefined) {
    if (action.count !== count || action.ordinal >= count) return { reason:'unresolved-ordinal', count };
    return { locator:candidates.nth(action.ordinal), count };
  }
  return count === 1 ? {locator:candidates.first(), count} : {reason:count ? 'ambiguous' : 'absent', count};
}

async function inspect(locator, timeout) {
  await locator.scrollIntoViewIfNeeded({timeout:timeout()});
  return locator.evaluate(el => {
    const node = el.closest('button,summary,a,[role=button],[role=tab],label,input,.js-interact') || el;
    const rect = el.getBoundingClientRect();
    const covered = document.elementFromPoint(rect.x + rect.width/2, rect.y + rect.height/2);
    const href = node.getAttribute('href');
    const forbidden = node.matches('input,label,button[type=submit]') ||
      node.matches('button:not([type])') && !!node.closest('form') ||
      href && !href.startsWith('#') && !/^javascript:void\(0\);?$/i.test(href);
    const disabled = !!node.closest('[disabled],[aria-disabled=true],.swiper-button-disabled');
    return { disabled, forbidden:!!forbidden,
      obstruction:covered && !el.contains(covered) && !node.contains(covered) ?
        {tag:covered.tagName, id:covered.id, className:String(covered.className), text:covered.innerText?.slice(0,100)} : null,
      selected:node.matches('[aria-selected=true],[aria-pressed=true],[data-state=active],[data-active=true],.active,.is-active,.selected,.is-selected') ||
        /(?:--active|--selected)(?:\s|$)/.test(String(node.className)),
      className:String(node.className), target:node.getAttribute('data-target') || node.getAttribute('aria-controls') };
  });
}

async function dismiss(page, overlay, timeout) {
  const dialog = page.locator(dialogSelector).filter({visible:true});
  if (await dialog.count() > 1) return false;
  if (await dialog.count() === 1) {
    const close = dialog.locator(dismissSelector).filter({visible:true});
    const named = dialog.getByText('Close', {exact:true}).filter({visible:true});
    const hasBackdrop = await page.locator('.overlay').filter({visible:true}).count() > 0;
    const target = await close.count() === 1 ? close : named;
    if (await target.count() !== 1) return false;
    await target.click({timeout:timeout()});
    await dialog.waitFor({state:'hidden',timeout:timeout()});
    if (hasBackdrop) {
      await page.waitForFunction(() => ![...document.querySelectorAll('.overlay')].some(el=>{
        const style = getComputedStyle(el);
        return !!el.getClientRects().length && style.visibility === 'visible' && style.pointerEvents !== 'none';
      }),null,{timeout:timeout()});
    }
    return true;
  }
  // The known consent overlay is dismissed through its offered button.
  if (overlay && /gpc|consent|privacy|cookie/i.test(overlay.id+' '+overlay.className)) {
    const action = page.getByRole('button',{name:'Continue without changes',exact:true}).filter({visible:true});
    if (await action.count() !== 1) return false;
    await action.click({timeout:timeout()});
    await action.waitFor({state:'hidden',timeout:timeout()});
    return true;
  }
  return false;
}

async function verifyState(page, action, before, timeout) {
  const expected = action.expected || {};
  await page.waitForFunction(({expected, before, selectedLabel, selectedSelector}) => {
    const visible = el => !!el.getClientRects().length && getComputedStyle(el).visibility === 'visible';
    const normalized = text => (text || '').replace(/[\u200b\u00ad]/g,'').replace(/\s+/g,' ').trim();
    const text = normalized(document.body?.innerText || '');
    const scope = expected.scope ? [...document.querySelectorAll(expected.scope)].filter(visible)
      .map(el=>normalized(el.innerText)).join(' ') : text;
    if (expected.visible && ![...document.querySelectorAll(expected.visible)].some(visible)) return false;
    if (expected.hidden && [...document.querySelectorAll(expected.hidden)].some(visible)) return false;
    if (expected.text && !new RegExp(expected.text, 'i').test(scope)) return false;
    if (expected.excludes && new RegExp(expected.excludes, 'i').test(scope)) return false;
    if (expected.device || expected.selected) {
      const controls = [...document.querySelectorAll(selectedSelector || 'button,[role=tab],[role=button]')]
        .filter(el=>visible(el) && normalized(el.innerText)===selectedLabel);
      if (controls.length !== 1) return false;
      const el = controls[0];
      const selected = el.matches('[aria-selected=true],[aria-pressed=true],[data-state=active],[data-active=true],.active,.is-active,.selected,.is-selected') ||
        /(?:--active|--selected)(?:\s|$)/.test(String(el.className)) ||
        (expected.selectedClass && new RegExp(expected.selectedClass).test(String(el.className)));
      if (!selected) return false;
    }
    return expected.changed === false || text !== before;
  }, {expected, before, selectedLabel:action.label, selectedSelector:action.selector}, {timeout:timeout()});
}

async function perform(page, action, context) {
  const { timings, visit, actionStates, remaining, limits } = context;
  const actionStart = performance.now();
  const timeout = () => Math.max(1, Math.min(remaining(), Math.floor(limits.interaction-(performance.now()-actionStart))));
  const fields = { visit, action:action.id };
  const result = { id:action.id, reason:action.reason, required:action.required !== false,
    expected:action.expected, started:now() };
  actionStates.push(result);
  try {
    let selection = await targetFor(page,action);
    if (!selection.locator && action.optionalIfAbsent && selection.reason === 'absent') {
      result.outcome = 'not-present';
      return result;
    }
    if (!selection.locator) {
      result.outcome = selection.reason;
      return result;
    }
    let locator = selection.locator;
    let observed = await measure(timings,'action_preflight',()=>inspect(locator,timeout),fields);
    result.preflight = observed;
    if (observed.disabled || observed.forbidden) {
      result.outcome = observed.disabled ? 'disabled-skipped' : 'unsafe-control';
      return result;
    }
    if (observed.obstruction) {
      result.obstructed = true;
      let recovered = await measure(timings, 'modal_recovery',
        ()=>dismiss(page, observed.obstruction, timeout), fields);
      if (!recovered) {
        result.outcome = 'obstructed';
        return result;
      }
      selection = await targetFor(page,action);
      if (!selection.locator) {
        result.outcome = selection.reason;
        return result;
      }
      locator = selection.locator;
      observed = await measure(timings,'action_preflight',()=>inspect(locator,timeout),fields);
      if (observed.obstruction || observed.disabled || observed.forbidden) {
        result.outcome = 'obstructed-after-recovery';
        return result;
      }
      result.recovered = true;
    }
    const before = cleanText(await bodyText(page));
    const initialUrl = page.url();
    if (action.expected?.device && observed.selected) {
      await measure(timings,'state_verification',()=>verifyState(page,
        {...action, expected:{...action.expected, changed:false}}, before, timeout),fields);
      result.outcome = 'already-in-state';
      return result;
    }
    result.attempted = true;
    await measure(timings,'click',()=>locator.click({timeout:timeout()}),fields);
    if (page.url().split('#')[0] !== initialUrl.split('#')[0]) throw new Error('Unexpected action navigation');
    await measure(timings,'state_verification',()=>verifyState(page,action,before,timeout),fields);
    result.outcome = 'captured';
    return result;
  } catch (error) {
    result.outcome = /timeout/i.test(String(error)) ? 'timed-out' : 'error';
    result.error = String(error);
    return result;
  } finally {
    result.finished = now();
    result.elapsed_ms = performance.now()-actionStart;
  }
}

async function providerPanels(page, attempt, specs, context, collect) {
  const carousel = page.locator('#scrollProvidersBox');
  if (!specs.length) return;
  attempt.carousel = [];
  for (const action of specs) {
    const card = { marker:action.provider, reason:action.reason, time:now() };
    attempt.carousel.push(card);
    if (context.remaining() < 100 || !await carousel.count()) {
      card.outcome = context.remaining() < 100 ? 'deadline' : 'absent';
      continue;
    }
    try {
      const change = await measure(context.timings,'carousel_selection',()=>carousel.evaluate((el,id)=>{
        const card = [...el.querySelectorAll('.slick-slide:not(.slick-cloned) img[data-target]')]
          .find(img=>img.dataset.target===id);
        if (!card || !el.slick) return null;
        const slide = Number(card.closest('.slick-slide').getAttribute('data-slick-index'));
        el.slick.slickPause();
        el.slick.slickGoTo(slide,true);
        return card.alt;
      },action.provider), {visit:context.visit, action:action.id});
      if (change === null) {
        card.outcome = 'absent';
        continue;
      }
      card.label = change;
      const outcome = await perform(page,{
        ...action, selector:'.slick-active img[data-target="'+action.provider+'"]',
        expected:{visible:'[id="'+action.provider+'"].modal--active'},
      },context);
      card.outcome = outcome.outcome;
      if (outcome.outcome === 'captured') {
        const modal = page.locator('[id="'+action.provider+'"].modal--active');
        card.details = await modal.evaluate(el=>({text:el.innerText, headings:[...el.querySelectorAll('h1,h2,h3,h4')].map(h=>h.innerText)}));
        await collect(action.id,'interaction-revealed: provider '+action.provider, false);
      }
    } catch (error) {
      card.outcome = 'error';
      card.error = String(error);
    }
    if (await page.locator(dialogSelector).filter({visible:true}).count()) {
      const closed = await measure(context.timings,'modal_recovery',()=>dismiss(page,null,
        ()=>Math.max(1,Math.min(context.remaining(),context.limits.interaction))),{visit:context.visit,action:action.id})
        .catch(()=>false);
      if (!closed) {
        card.closure = 'unverified';
        break;
      }
    }
  }
}

async function runEntry(browser, input, target, actions, output, job) {
  const dir = path.join(output,target.key);
  await fs.mkdir(dir,{recursive:true});
  const file = path.join(dir,'capture.json');
  const settings = input.settings;
  const limits = settings.timeouts_ms;
  const previous = await readJson(file).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (previous && (previous.audit_id !== input.audit_id || previous.runner_revision !== input.runner_revision ||
      previous.revision !== input.revision || previous.target.prepared !== target.prepared ||
      previous.capture_config_hash !== digest(JSON.stringify(settings)))) throw new Error('Incompatible saved capture '+target.key);
  const planHash = digest(JSON.stringify(actions));
  if (previous && !job.reopen) {
    if (previous.plan_hash !== planHash) throw new Error('Saved capture uses a different plan '+target.key);
    return previous;
  }
  if (!actions.every(a=>a.id && a.reason)) throw new Error('Offer action lacks provenance '+target.key);
  if (previous && job.reopen && !actions.length) throw new Error('Reopen requires a missing offer state '+target.key);
  if (previous && job.reopen &&
      previous.attempts.filter(a=>a.kind==='followup').length >= settings.targeted_finding_rechecks) {
    throw new Error('Follow-up budget exhausted '+target.key);
  }
  const known = previous?.attempts.flatMap(a=>a.actions) || [];
  if (previous && actions.every(a=>known.some(k=>k.id===a.id))) return previous;
  const start = performance.now();
  const priorSpent = previous?.elapsed_ms || 0;
  const remaining = ()=>Math.max(0,Math.floor(limits.capture_entry_total_including_retries-priorSpent-(performance.now()-start)));
  const result = previous || {
    audit_id:input.audit_id, revision:input.revision, instruction_commit:input.revision,
    runner_revision:input.runner_revision, inventory_revision:input.inventory_revision,
    config_version:input.config_version, clock_origin_utc_ms:performance.timeOrigin, capture_config_hash:digest(JSON.stringify(settings)), region:input.region,
    target, profile:{viewport:settings.viewport,locale:settings.locale,timezoneId:settings.timezone_id},
    browser:browser.version(), runType:'initial', started:now(), attempts:[],
    plan_hash:planHash, queue:[],
  };
  const queued = {worker:job.worker, ready_at:job.readyAt, started:now(), start_offset_ms:start, clock_origin_utc_ms:performance.timeOrigin,
    queue_wait_ms:start-job.readyMono, kind:job.reopen?'followup':'initial'};
  result.queue.push(queued);
  job.onStart(target.key, queued);
  let retry = 0;
  do {
    if (remaining() <= 100) break;
    const number = result.attempts.length+1;
    const visit = target.key+'-visit-'+number;
    const attempt = { number, visit, kind:job.reopen?'followup':retry?'transient-retry':'initial',
      baselineUse:'pending', started:now(), documents:[],states:[],warnings:[], actions:[], timings:[],
      action_plan_hash:planHash, coverage:[] };
    result.attempts.push(attempt);
    const track = (name,fn) => measure(attempt.timings,name,fn,{visit});
    let context, page, deadline;
    let transientFailure = false;
    try {
      context = await track('context_setup',()=>browser.newContext({...result.profile,ignoreHTTPSErrors:false}));
      deadline = setTimeout(()=>context.close().catch(()=>{}),Math.max(1,remaining()));
      page = await track('page_setup',()=>context.newPage());
      page.setDefaultTimeout(limits.interaction);
      context.on('page', other=>{ if (other!==page) other.close().catch(()=>{}); });
      page.on('response',r=>{
        if (r.request().isNavigationRequest() && r.frame()===page.mainFrame()) {
          attempt.documents.push({url:r.url(), status:r.status(), location:r.headers().location, at:now()});
        }
      });
      page.on('requestfailed',r=>{
        if (r.isNavigationRequest()) attempt.warnings.push({url:r.url(),failure:r.failure(),at:now()});
      });
      const response = await track('navigation',()=>page.goto(target.prepared,{waitUntil:'domcontentloaded',
        timeout:Math.max(1,Math.min(remaining(),limits.navigation))}));
      attempt.finalUrl = page.url();
      attempt.httpStatus = response?.status();
      if (attempt.httpStatus >= 400) throw new Error('HTTP '+attempt.httpStatus);
      await track('readiness',async()=>{
        await page.waitForFunction(()=>{
          const text = document.body?.innerText.trim() || '';
          return text.length > 160 && !!document.querySelector('h1,h2,main,[role=main]') ||
            /^(not found|forbidden|access denied|bad gateway|internal server error|error\b)/i.test(text);
        },null,{timeout:Math.max(1,Math.min(remaining(),limits.content_readiness))});
        if (/^(not found|forbidden|access denied|bad gateway|internal server error|error\b|verify you are human|checking your browser|pardon our interruption)/i.test((await bodyText(page)).trim()) ||
          /^(just a moment|attention required|access denied|request blocked)/i.test(await page.title())) {
          throw new Error('Unusable destination or access restriction');
        }
      });
      const signature = stableDocument(await track('revalidation',()=>page.evaluate(readDocument)));
      attempt.signature = signature;
      const saved = result.attempts.slice(0,-1).reverse().find(a=>a.ready && a.states.some(s=>s.presentation==='advertised'));
      const reuse = saved?.signature === signature;
      attempt.baselineUse = reuse?'reused':saved?'invalidated-and-recaptured':'captured';
      if (saved && !reuse) {
        attempt.invalidatedVisit = saved.visit;
        result.evidenceInvalidated = true;
      }
      async function collect(id, presentation, fullPage) {
        const data = await track('extraction',async()=>{
          const d = await page.evaluate(readDocument);
          d.controls = await controls(page);
          d.frameEvidence = [];
          for (const frame of page.frames().slice(1)) {
            const box = await frame.frameElement().then(e=>e.boundingBox()).catch(()=>null);
            if (!box || box.width<40 || box.height<30) continue;
            try { d.frameEvidence.push({url:frame.url(),box,data:await frame.evaluate(readDocument)}); }
            catch (error) { d.frameEvidence.push({url:frame.url(),box,error:String(error)}); }
          }
          return d;
        });
        const name = 'attempt-'+number+'-'+id;
        const state = {id,name,presentation,time:now(),json:name+'.json',png:name+'.png',title:data.title,url:data.url,fullPage,
          fingerprint:digest(cleanText(data.visibleText))};
        try {
          await track('screenshots',()=>page.screenshot({path:path.join(dir,state.png),fullPage,animations:'disabled',
            timeout:Math.max(1,Math.min(remaining(),limits.interaction))}));
        } catch (error) {
          state.png=null;
          state.screenshotError=String(error);
        }
        await track('artifact_writes',()=>write(path.join(dir,state.json),{...state,...data}));
        attempt.states.push(state);
        return data;
      }
      if (!reuse) {
        attempt.scroll = await track('scrolling',()=>scrollPage(page,remaining));
        const data = await collect('baseline','advertised',true);
        if (data.visibleText.length <= 160 || !data.headings.some(h=>h.visible) ||
          !/internet|provider|broadband|fiber|wireless|compare|offer|plan|customer|support|service|mobile|cellular/i.test(data.visibleText)) {
          throw new Error('Rendered content did not establish a usable offer or explicit no-offer state');
        }
        attempt.coverage.push({id:'baseline', inspected:true, headings:data.headings.filter(h=>h.visible).map(h=>h.text),
          lazyContent:attempt.scroll.reachedEnd?'bottom-confirmed':'review-required-if-offer-surface-missing'});
      } else {
        attempt.coverage.push({id:'baseline',inspected:true,reusedFrom:saved.visit});
      }
      attempt.ready = true;
      await track('artifact_writes',()=>write(path.join(dir,'checkpoint-baseline.json'),result));
      const progress = {timings:attempt.timings, visit, actionStates:attempt.actions, remaining, limits};
      const blocked = new Set();
      const signatures = new Map();
      for (const action of actions.filter(a=>!a.provider)) {
        if (remaining() < 100) {
          attempt.actions.push({id:action.id,reason:action.reason,outcome:'deadline',required:action.required!==false});
          continue;
        }
        if (action.dependsOn && !attempt.actions.some(a=>a.id===action.dependsOn && ['captured','already-in-state'].includes(a.outcome))) {
          attempt.actions.push({id:action.id,reason:action.reason,outcome:'prerequisite-missing',required:action.required!==false});
          continue;
        }
        const controlKey = action.selector || action.aria || action.label;
        if (blocked.has(controlKey)) {
          attempt.actions.push({id:action.id,reason:action.reason,outcome:'unchanged-skipped',required:action.required!==false});
          continue;
        }
        const times = action.carousel ? action.carousel : 1;
        for (let i=0;i<times;i++) {
          const step = i===0 ? action : {...action,id:action.id+'-'+(i+1)};
          const state = await perform(page,step,progress);
          if (['captured','already-in-state'].includes(state.outcome)) {
            const current = await bodyText(page);
            const fingerprint = digest(cleanText(current));
            if (signatures.has(fingerprint)) {
              state.outcome = 'equivalent-evidence';
              state.reuseState = signatures.get(fingerprint);
              break;
            }
            await collect(step.id,'interaction-revealed: '+(action.label || action.aria || action.id),false);
            signatures.set(fingerprint,step.id);
          } else {
            if (['obstructed','obstructed-after-recovery','disabled-skipped','timed-out'].includes(state.outcome)) {
              blocked.add(controlKey);
            }
            break;
          }
          if (action.modal && await page.locator(dialogSelector).filter({visible:true}).count()) {
            state.closed = await track('modal_recovery',()=>dismiss(page,null,()=>
              Math.max(1,Math.min(remaining(),limits.interaction)))).catch(()=>false);
          }
        }
      }
      await providerPanels(page,attempt,actions.filter(a=>a.provider),progress,collect);
      attempt.coverage.push(...attempt.actions.map(a=>({id:a.id,
        inspected:['captured','already-in-state','equivalent-evidence'].includes(a.outcome),
        required:a.required,reason:a.reason,outcome:a.outcome})));
    } catch (error) {
      attempt.error = String(error);
      if (!attempt.ready) attempt.ready = false;
      if (!attempt.finalUrl) attempt.finalUrl = page?.url();
      transientFailure = transient.test(String(error)) && !/certificate|ERR_CERT|429/i.test(String(error)) && !attempt.ready;
    } finally {
      clearTimeout(deadline);
      if (context) await track('context_teardown',()=>context.close()).catch(()=>{});
      attempt.finished = now();
    }
    if (!transientFailure || job.reopen) break;
    retry++;
  } while (retry <= settings.transient_capture_retries);
  result.finished = now();
  queued.finished = result.finished;
  queued.finish_offset_ms = performance.now();
  result.elapsed_ms = priorSpent + queued.finish_offset_ms-start;
  await write(file,result);
  job.onFinish(target.key,queued);
  return result;
}

async function run(input, output, plan, options = {}) {
  const max = input.settings.max_concurrent_page_captures;
  if (!Number.isInteger(max) || max<1 || max>4) throw new Error('Invalid capture concurrency');
  if (new Set(input.targets.map(t=>t.key)).size!==input.targets.length ||
      new Set(input.targets.map(t=>t.prepared)).size!==input.targets.length) throw new Error('Capture targets must be unique');
  if (input.targets.some(t=>!/^entry-[a-z0-9-]+$/.test(t.key) || !/^https?:\/\//.test(t.prepared))) throw new Error('Invalid capture target');
  if (input.targets.some(t=>t.roles?.includes('tracking') && t.prepared!==t.original.trim() &&
      t.prepared!=='https://'+t.original.trim())) throw new Error('Tracking URL was changed');
  await fs.mkdir(output,{recursive:true});
  const executablePath = options.executablePath || process.env.SCOUT_CHROMIUM_PATH || await standalone.executablePath();
  const browser = await chromium.launch({executablePath,headless:input.settings.headless});
  try {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.setContent('<main><h1>Scout Chromium readiness</h1><p>Capture test rendered.</p></main>');
      if (!(await bodyText(page)).includes('Capture test rendered.')) throw new Error('Chromium render smoke failed');
      await write(path.join(output,options.reopen?'runtime-reopen-smoke.json':'runtime-smoke.json'),
        {time:now(),chromium:browser.version(),node:process.version,playwright:require('playwright/package.json').version,
          region:input.region,audit_id:input.audit_id,revision:input.revision,runner_revision:input.runner_revision});
    } finally { await context.close(); }
    const readyAt = now();
    const readyMono = performance.now();
    const targets = input.targets.filter(t=>!options.reopen || Object.hasOwn(plan,t.key));
    const events = [];
    let next = 0;
    let active = 0;
    let maxActive = 0;
    const failures = [];
    await Promise.all(Array.from({length:Math.min(max,targets.length)},(_,worker)=>(async()=>{
      while (next<targets.length) {
        const target=targets[next++];
        try {
          await runEntry(browser,input,target,plan[target.key] || [],output,{worker,readyAt,readyMono,reopen:options.reopen,
            onStart(key,record) {
              maxActive=Math.max(maxActive,++active);
              const event={event:'start',key,worker,active,at:record.started};
              events.push(event);
              console.log(JSON.stringify(event));
            },
            onFinish(key,record) {
              const event={event:'finish',key,worker,active:--active,at:record.finished};
              events.push(event);
              console.log(JSON.stringify(event));
            },
          });
        } catch (error) { failures.push({key:target.key,error:String(error)}); }
      }
    })()));
    await write(path.join(output,options.reopen?'runtime-reopen-queue.json':'runtime-queue.json'),
      {audit_id:input.audit_id,runner_revision:input.runner_revision,maxActive,events,failures});
    if (failures.length) throw new Error(JSON.stringify(failures));
    return {maxActive,events};
  } finally { await browser.close(); }
}

if (require.main===module) (async()=>{
  const [inputPath,planPath,output,reopen] = process.argv.slice(2);
  if (!output) throw new Error('Usage: node capture.cjs INPUT.json OFFER_PLAN.json OUTPUT [--reopen]');
  const input = await readJson(inputPath);
  const revision = 'sha256:'+digest(await fs.readFile(__filename));
  if (input.runner_revision && input.runner_revision !== revision) throw new Error('Runner content hash disagrees with audit input');
  input.runner_revision = revision;
  await run(input,output,await readJson(planPath),{reopen:reopen==='--reopen'});
})().catch(error=>{console.error(error);process.exitCode=1;});

module.exports={ run };
