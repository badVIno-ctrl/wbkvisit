from playwright.sync_api import sync_playwright
from pathlib import Path
from PIL import Image
import shutil,json,os
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('QA_OUTPUT',ROOT/'qa/output-v3'));OUT.mkdir(parents=True,exist_ok=True)
URL=os.environ.get('SITE_URL','http://127.0.0.1:8765/')
checks=[];errors=[]
def check(n,v,d=None):checks.append({'check':n,'pass':bool(v),'details':d})
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 for w in [320,360,390,600,700,701,768,900,901,1024,1280,1440,1920]:
  p=b.new_page(viewport={'width':w,'height':900});p.on('pageerror',lambda e:errors.append(str(e)));p.goto(URL,wait_until='networkidle');p.evaluate('document.fonts.ready')
  d=p.evaluate('''()=>{let r=e=>{let x=e.getBoundingClientRect();return {x:x.x,y:x.y,w:x.width,h:x.height,bottom:x.bottom,right:x.right}};let art=document.querySelector('.splash-contacts');return {overflow:document.documentElement.scrollWidth>innerWidth,fonts:[document.fonts.check('700 18px "Cormorant Horror"','Книги'),document.fonts.check('500 17px Jura','Остаёмся')],art:r(art),links:[...document.querySelectorAll('.contact-links a')].map(r),nav:[...document.querySelectorAll('.nav-links a,#cartTrigger')].filter(e=>e.getBoundingClientRect().width).map(r),colors:[...document.querySelectorAll('.poster-lettering,.drip-shape')].map(e=>getComputedStyle(e).fill),variants:new Set([...document.querySelectorAll('.drip-shape path')].map(e=>e.getAttribute('d'))).size,filters:[...document.querySelectorAll('.ink-text')].map(e=>getComputedStyle(e).filter)}}''')
  check(f'{w}: no overflow',not d['overflow']);check(f'{w}: both Cyrillic fonts loaded',all(d['fonts']));check(f'{w}: identical scarlet for letters and drips',len(set(d['colors']))==1 and d['colors'][0]=='rgb(207, 38, 50)',d['colors']);check(f'{w}: five distinct drip shapes',d['variants']==5);check(f'{w}: no fragile HTML SVG filters',set(d['filters'])=={'none'});check(f'{w}: splash below all links',d['art']['y']>=max(x['bottom'] for x in d['links'])+19);check(f'{w}: splash wholly inside viewport',d['art']['x']>=0 and d['art']['right']<=w);check(f'{w}: compact nav retains 44px targets',all(x['h']==44 for x in d['nav']))
  if w in [390,1440]:
   p.locator('#contacts').screenshot(path=str(OUT/f'footer-complete-{w}.png'))
   p.screenshot(path=str(OUT/f'final-hero-{w}.png'))
  p.close()
 # Font failure + no JS cannot make the hero vanish. Compare actual rendered artwork.
 for mode in ['normal','font-blocked','no-js','file']:
  c=b.new_context(viewport={'width':1440,'height':900},java_script_enabled=mode!='no-js');p=c.new_page()
  if mode=='font-blocked':p.route('**/*.woff',lambda r:r.abort())
  p.goto(ROOT.joinpath('index.html').as_uri() if mode=='file' else URL,wait_until='networkidle');p.locator('#heroTitle').screenshot(path=str(OUT/f'title-{mode}.png'))
  im=Image.open(OUT/f'title-{mode}.png').convert('RGB');solid=sum(n for n,col in im.getcolors(im.width*im.height) if col==(207,38,50));check(f'{mode}: artwork really painted',solid>20000,solid)
  c.close()
 # The decoration is owned only by footer, and dimensions are reserved before lazy-load.
 p=b.new_page();p.goto(URL,wait_until='networkidle');check('footer decoration belongs to contact panel',p.locator('.contact-panel > .splash-contacts').count()==1);check('contact links unchanged',p.locator('.contact-links a').evaluate_all('(es)=>es.map(e=>e.getAttribute("href"))')==['mailto:wbk-shop@mail.ru','tel:+79158109180','https://vk.ru/worldkotbegemot']);check('h1 accessible wording',p.locator('h1').get_attribute('aria-label')=='Не все истории дают уснуть.');check('decorative SVG not keyboard focusable',all(x=='false' for x in p.locator('.poster-lettering,.drip-shape').evaluate_all('es=>es.map(e=>e.getAttribute("focusable"))')));p.close();b.close()
report={'checks':checks,'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks),'errors':errors};(OUT/'v3-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({'passed':report['passed'],'failed':report['failed'],'failures':[x for x in checks if not x['pass']],'errors':errors},ensure_ascii=False,indent=2))
