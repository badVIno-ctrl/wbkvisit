from playwright.sync_api import sync_playwright
import os,shutil
URL=os.environ.get("SITE_URL","http://127.0.0.1:8765/").rstrip("/")+"/"
BROWSER=os.environ.get("CHROMIUM_EXECUTABLE") or shutil.which("chromium") or shutil.which("chromium-browser")
from pathlib import Path
import json
out=Path(os.environ.get("QA_OUTPUT",Path(__file__).parent/"output"));out.mkdir(exist_ok=True);checks=[];errors=[]
def check(name,ok,detail=None):checks.append({'check':name,'pass':bool(ok),'details':detail})
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=BROWSER,headless=True,args=['--no-sandbox'])
 for w in [320,360,390,600,700,768,900,1024,1280,1440,1920]:
  p=b.new_page(viewport={'width':w,'height':900 if w>700 else 844});p.on('pageerror',lambda e:errors.append(str(e)));p.goto(URL,wait_until='networkidle');p.evaluate('document.fonts.ready');p.wait_for_timeout(220)
  d=p.evaluate('''() => {const words=[document.querySelector('.poster-line-first .ink-text'),document.querySelector('.title-give .ink-text'),document.querySelector('.title-sleep .ink-text')];return {font:words.map(e=>getComputedStyle(e).fontSize),mask:getComputedStyle(words[0]).maskImage,filter:getComputedStyle(words[0]).filter,y:words.slice(1).map(e=>e.getBoundingClientRect().y),doc:document.documentElement.scrollWidth}}''')
  check(f'{w}px heading uses reliable outlined distressed artwork',d['mask']=='none' and d['filter']=='none' and p.locator('.poster-lettering path').count()>20,d)
  check(f'{w}px heading has one font size',len(set(d['font']))==1,d['font'])
  check(f'{w}px second-line words aligned',abs(d['y'][0]-d['y'][1])<1,d['y'])
  check(f'{w}px page has no horizontal overflow',d['doc']<=w,d['doc'])
  splashes=p.locator('.ink-splash').evaluate_all('''es=>es.map(e=>{const r=e.getBoundingClientRect(),frame=e.parentElement.getBoundingClientRect();let ancestors=[],a=e.parentElement;while(a){const s=getComputedStyle(a);if(['hidden','clip'].includes(s.overflowX)||['hidden','clip'].includes(s.overflowY))ancestors.push(a.className);a=a.parentElement}return {x:r.x,right:r.right,width:r.width,frameX:frame.x,frameRight:frame.right,cropping:ancestors}})''')
  check(f'{w}px five complete, uncropped splashes',len(splashes)==5 and all(s['x']>=-1 and s['right']<=w+1 and not s['cropping'] for s in splashes),splashes)
  if w>=1024:
   sizes=p.locator('.nav-links .chapter-link,#cartTrigger').evaluate_all('es=>es.map(e=>({height:e.getBoundingClientRect().height,font:getComputedStyle(e).fontSize,y:e.getBoundingClientRect().y}))')
   check(f'{w}px top buttons proportional',len(set(x['height'] for x in sizes))==1 and len(set(x['font'] for x in sizes))==1 and len(set(x['y'] for x in sizes))==1,sizes)
  if w in [390,1024,1440]:p.screenshot(path=str(out/f'hero-{w}.png'))
  if w in [390,1440]:
   for name,sel in [('catalog-heading','#catalog .section-head'),('merch','#merch .merch-inner'),('about','#about .about-inner'),('help','#help .help-inner'),('contacts','#contacts .footer-top')]:
    p.locator(sel).scroll_into_view_if_needed();p.wait_for_timeout(200);p.locator(sel).screenshot(path=str(out/f'{name}-{w}.png'))
  p.close()
 b.close()
report={'checks':checks,'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks),'console_errors':errors};(out/'correction-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({'passed':report['passed'],'failed':report['failed'],'failures':[x for x in checks if not x['pass']],'errors':errors},ensure_ascii=False,indent=2))
