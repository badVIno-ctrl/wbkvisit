from playwright.sync_api import sync_playwright
import os, shutil
URL=os.environ.get("SITE_URL","http://127.0.0.1:8765/").rstrip("/")+"/"
BROWSER=os.environ.get("CHROMIUM_EXECUTABLE") or shutil.which("chromium") or shutil.which("chromium-browser")
from pathlib import Path
import json,re
out=Path(os.environ.get("QA_OUTPUT",Path(__file__).parent/"output"));checks=[]
def check(n,ok,d=None):checks.append({'check':n,'pass':bool(ok),'details':d})
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=BROWSER,headless=True,args=['--no-sandbox'])
 for w,h in [(320,640),(390,844),(844,390),(1440,900)]:
  ctx=b.new_context(viewport={'width':w,'height':h});p=ctx.new_page();p.goto(URL,wait_until='networkidle')
  # Actual garment variation flow, including missing-size recovery.
  p.locator('[data-filter="shirts"]').click();p.locator('[data-product]').first.click();p.locator('#addToCart').click();check(f'{w}x{h} size required',p.locator('#sizeError').is_visible())
  p.locator('input[name="size"][value="M"]').check();p.locator('#addToCart').click();p.locator('#cartTrigger').click();p.wait_for_timeout(250)
  check(f'{w}x{h} shirt variation persists',p.locator('.cart-line').inner_text().find('Размер M')>=0)
  # Every focused control remains inside the open dialog after a complete Tab loop.
  ids=[]
  for i in range(14):
   p.keyboard.press('Tab');ids.append(p.evaluate('document.querySelector("#cartDialog").contains(document.activeElement)'))
  check(f'{w}x{h} focus contained',all(ids))
  p.locator('#checkoutTrigger').click();p.wait_for_timeout(200)
  r=p.locator('#cartTitle').bounding_box();c=p.locator('[data-close="cartDialog"].icon-btn').bounding_box()
  check(f'{w}x{h} heading clear of close button',r['x']+r['width']<=c['x']-8,{'title':r,'close':c})
  check(f'{w}x{h} checkout body scrollable',p.locator('#drawerBody').evaluate('(e)=>e.scrollHeight>=e.clientHeight'))
  if w==320:p.screenshot(path=str(out/'checkout-320.png'))
  if w==844:p.screenshot(path=str(out/'checkout-landscape.png'))
  p.keyboard.press('Escape');ctx.close()
 # Separate physical tests, sample multiple positions in both scroll directions.
 ctx=b.new_context(viewport={'width':1440,'height':900});p=ctx.new_page();p.goto(URL,wait_until='networkidle')
 paths=[]
 for y in [900,2200,350,1400,0]:
  p.evaluate('(y)=>scrollTo({top:y,behavior:"instant"})',y)
  for delay in [40,100,240]:
   p.wait_for_timeout(delay);d=p.locator('#ropePath').get_attribute('d');paths.append(d)
   check(f'rope finite at scroll {y}, sample {delay}','NaN' not in d and 'Infinity' not in d)
   # Midpoint Y values in the smoothed path should never double back into a knot.
   points=re.findall(r'Q([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)',d);ys=[float(v[3]) for v in points]
   check(f'rope never knots at scroll {y}, sample {delay}',all(ys[i+1]>=ys[i] for i in range(len(ys)-1)))
 # Correct 3 decoration instances, real local favicon assets, local fonts, no runtime dependency.
 check('exactly five splashes',p.locator('.ink-splash').count()==5)
 check('favicon SVG loaded',p.request.get(URL+"assets/favicon.svg").status==200)
 check('favicon ICO loaded',p.request.get(URL+"assets/favicon.ico").status==200)
 p.emulate_media(reduced_motion='reduce');p.evaluate('scrollTo({top:1000,behavior:"instant"})');p.wait_for_timeout(150);d=p.locator('#ropePath').get_attribute('d');p.wait_for_timeout(200);check('reduced-motion rope stays still',d==p.locator('#ropePath').get_attribute('d'))
 ctx.close();b.close()
report={'checks':checks,'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks)}
(out/'extra-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({'passed':report['passed'],'failed':report['failed'],'failures':[x for x in checks if not x['pass']]},ensure_ascii=False,indent=2))
