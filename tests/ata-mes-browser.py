import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  context=await browser.new_context(viewport={"width":1280,"height":1800})
  page=await context.new_page()
  if os.environ.get('LOVABLE_BROWSER_AUTH_STATUS')=='injected':
   key=os.environ.get('LOVABLE_BROWSER_SUPABASE_STORAGE_KEY'); session=os.environ.get('LOVABLE_BROWSER_SUPABASE_SESSION_JSON'); cookies=json.loads(os.environ.get('LOVABLE_BROWSER_SUPABASE_COOKIES_JSON') or '[]')
  else:
   with open(os.path.expanduser('~/.cache/lovable-auth/session.json')) as f: minted=json.load(f)
   key=minted['storage_key'];session=json.dumps(minted['session']);cookies=minted.get('cookies') or []
  if cookies: await context.add_cookies([{**c,'url':'http://localhost:8080'} for c in cookies])
  await page.goto('http://localhost:8080')
  await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[key,session])
  await page.goto('http://localhost:8080/estrategia/ata'); await page.wait_for_timeout(1800)
  for i in range(3):
   await page.get_by_role('button',name='Próximo mês',exact=True).click(); await page.wait_for_timeout(900)
  writes=[]
  async def mock_save(route):
   writes.append(route.request.post_data_json)
   await route.fulfill(status=200,content_type='application/json',body='null')
  await page.route('**/rest/v1/rpc/estrategia_gravar_anotacoes',mock_save)
  text=page.locator('textarea').first
  print('FEBRUARY',repr(await text.input_value()))
  await text.fill('Teste isolado de fevereiro — sem salvar no banco')
  await page.get_by_role('button',name='Mês anterior',exact=True).click(); await page.wait_for_timeout(900)
  print('JANUARY',repr(await text.input_value()))
  assert await text.input_value() != 'Teste isolado de fevereiro — sem salvar no banco', 'February draft leaked into January'
  await page.get_by_role('button',name='Próximo mês',exact=True).click(); await page.wait_for_timeout(900)
  print('FEBRUARY AGAIN',repr(await text.input_value()))
  await text.focus()
  await page.get_by_role('button',name='Mês anterior',exact=True).click()
  await page.wait_for_timeout(600)
  assert writes and all(w['_mes']==2 and w['_ano']==2027 for w in writes), 'Draft was saved to the wrong month'
  print('PASS: February edits save only to February 2027; January stays unchanged')
  await page.screenshot(path='/tmp/browser/ata-month/month.png')
  await browser.close()
asyncio.run(main())
