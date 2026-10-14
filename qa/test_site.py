from playwright.sync_api import sync_playwright
import os, shutil
URL=os.environ.get("SITE_URL","http://127.0.0.1:8765/").rstrip("/")+"/"
BROWSER=os.environ.get("CHROMIUM_EXECUTABLE") or shutil.which("chromium") or shutil.which("chromium-browser")
from pathlib import Path
import json, time, re, math
OUT=Path(os.environ.get("QA_OUTPUT",Path(__file__).parent/"output"));OUT.mkdir(exist_ok=True)
results=[]; errors=[]; failed=[]
def check(name,ok,details=None):
 results.append({'check':name,'pass':bool(ok),'details':details})
def layout(page):
 return page.evaluate('''() => ({width:innerWidth, doc:document.documentElement.scrollWidth,
  overflow:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width&&r.height&&(r.right>innerWidth+2||r.left<-2)&&s.position!=='absolute'&&!e.closest('.sr-only')}).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right}))})''')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=BROWSER,headless=True,args=['--no-sandbox'])
 for w in [320,360,390,600,700,768,900,1024,1280,1440,1920]:
  context=browser.new_context(viewport={'width':w,'height':900 if w>=768 else 844},device_scale_factor=1)
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('requestfailed',lambda r:failed.append(r.url))
  page.goto(URL,wait_until='networkidle');page.evaluate('document.fonts.ready');page.wait_for_timeout(250)
  d=layout(page);check(f'{w}px no horizontal overflow',d['doc']<=w,d)
  # Text itself, not just its grid cell, must stay clear of the cat.
  boxes=page.evaluate('''() => {const text=document.querySelector('.title-sleep .ink-text').getBoundingClientRect();const img=document.querySelector('.poster-cat').getBoundingClientRect();return {text:{x:text.x,right:text.right,top:text.top,bottom:text.bottom},image:{x:img.x,right:img.right,top:img.top,bottom:img.bottom}}}''')
  # Entire image box can include transparent margins; use a conservative minimum gap.
  check(f'{w}px title readable',boxes['text']['right']<=w-12 and boxes['text']['x']>=12,boxes)
  if w in [390,768,1024,1440]:page.screenshot(path=str(OUT/f'hero-{w}.png'))
  if w in [390,1440]:
   page.locator('#cartTrigger').click();page.wait_for_timeout(250)
   check(f'{w}px empty basket opens',page.locator('#cartDialog').is_visible() and page.locator('.empty-cart').is_visible())
   check(f'{w}px close button initially focused',page.locator('[data-close="cartDialog"].icon-btn').evaluate('(e)=>e===document.activeElement'))
   page.screenshot(path=str(OUT/f'cart-empty-{w}.png'))
   page.keyboard.press('Escape');check(f'{w}px escape closes basket',not page.locator('#cartDialog').is_visible())
   check(f'{w}px focus restored',page.locator('#cartTrigger').evaluate('(e)=>e===document.activeElement'))
   page.locator('#cartTrigger').click();page.locator('#emptyCatalog').click();check(f'{w}px empty CTA opens catalog',not page.locator('#cartDialog').is_visible())
   page.locator('[data-product]').first.click();page.locator('#addToCart').click();page.locator('#cartTrigger').click()
   check(f'{w}px item added',page.locator('.cart-line').count()==1 and page.locator('#cartCount').inner_text()=='1')
   page.locator('[data-cart-qty="1"]').click();check(f'{w}px quantity updates',page.locator('#drawerCount').inner_text()=='2')
   check(f'{w}px total correct',page.locator('#cartTotal').inner_text().replace('\u00a0',' ').strip()=='4 000 ₽',page.locator('#cartTotal').inner_text())
   page.screenshot(path=str(OUT/f'cart-filled-{w}.png'))
   page.locator('#checkoutTrigger').click();page.locator('#draftButton').click();check(f'{w}px validation errors',page.locator('#formErrors').is_visible())
   page.screenshot(path=str(OUT/f'checkout-errors-{w}.png'))
   page.locator('#customerName').fill('Тест');page.locator('#customerEmail').fill('test@example.org');page.locator('#customerCity').fill('Самара');page.locator('#draftButton').click();check(f'{w}px local draft',page.locator('#successView').is_visible())
   page.screenshot(path=str(OUT/f'draft-{w}.png'))
   page.locator('#continueAfterDraft').click();page.reload(wait_until='networkidle');page.locator('#cartTrigger').click()
   check(f'{w}px persistence',page.locator('#drawerCount').inner_text()=='2')
   page.locator('[data-remove]').click();check(f'{w}px remove last item',page.locator('.empty-cart').is_visible() and page.locator('#cartCount').inner_text()=='0')
   page.keyboard.press('Escape')
   # Navigation categories, search and mobile menu.
   if w==390:
    page.locator('#menuTrigger').click();page.wait_for_timeout(250);page.screenshot(path=str(OUT/'menu-mobile.png'));page.locator('#mobileMenu [data-category="merch"]').click()
   else:page.locator('.nav-links [data-category="merch"]').click()
   check(f'{w}px merchandise navigation',page.locator('.product').count()==7,page.locator('.product').count())
   page.locator('[data-filter="books"]').click();page.locator('#searchInput').fill('несуществующее');page.wait_for_timeout(400)
   check(f'{w}px search empty state',page.locator('.product').count()==0)
   page.locator('#searchInput').fill('');page.wait_for_timeout(400)
   check(f'{w}px search recovers',page.locator('.product').count()==11)
   page.evaluate('window.scrollTo({top:0,behavior:"instant"})');page.wait_for_timeout(300)
   # Section screenshots are separate actual viewport images, not a contact sheet.
   for sec in ['catalog','merch','about','contacts']:
    page.locator('#'+sec).scroll_into_view_if_needed();page.wait_for_timeout(350);page.screenshot(path=str(OUT/f'{sec}-{w}.png'))
  context.close()
 # Rope: dynamic displacement, endpoint convergence, keyboard slider, motion preference.
 context=browser.new_context(viewport={'width':1440,'height':900});page=context.new_page();page.goto(URL,wait_until='networkidle');page.wait_for_timeout(500)
 initial=page.locator('#ropePath').get_attribute('d')
 page.evaluate('window.scrollTo({top:1200,behavior:"instant"})');page.wait_for_timeout(180)
 during=page.locator('#ropePath').get_attribute('d');page.screenshot(path=str(OUT/'rope-moving.png'))
 check('rope moves with scroll',initial!=during)
 check('rope bends rather than straight scaling',len(set(re.findall(r'Q([\d.]+)',during)))>2,during)
 page.wait_for_timeout(5000);end=page.locator('#ropeCharm').get_attribute('transform');page.wait_for_timeout(1200);end2=page.locator('#ropeCharm').get_attribute('transform');check('rope settles and stops',end==end2,{'first':end,'second':end2})
 page.locator('#bloodRange').focus();page.keyboard.press('End');page.wait_for_timeout(600)
 check('slider End reaches bottom',page.evaluate('Math.abs(scrollY-(document.documentElement.scrollHeight-innerHeight))<4'))
 page.keyboard.press('Home');page.wait_for_timeout(600);check('slider Home reaches top',page.evaluate('scrollY<4'))
 page.emulate_media(reduced_motion='reduce');page.evaluate('window.scrollTo({top:800,behavior:"instant"})');page.wait_for_timeout(200);d=page.locator('#ropePath').get_attribute('d');check('reduced motion uses straight rope','Q' not in d,d)
 context.close();browser.close()
report={'checks':results,'console_errors':errors,'failed_requests':failed,'passed':sum(x['pass'] for x in results),'failed':sum(not x['pass'] for x in results)}
(OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'passed':report['passed'],'failed':report['failed'],'failures':[x for x in results if not x['pass']],'console_errors':errors,'failed_requests':failed},ensure_ascii=False,indent=2))
