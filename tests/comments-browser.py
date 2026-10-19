import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  context=await browser.new_context(viewport={"width":1280,"height":1800})
  page=await context.new_page()
  await page.goto('http://localhost:8080')
  await page.evaluate('([k,v]) => localStorage.setItem(k,v)',[os.environ['LOVABLE_BROWSER_SUPABASE_STORAGE_KEY'],os.environ['LOVABLE_BROWSER_SUPABASE_SESSION_JSON']])
  await page.goto('http://localhost:8080/tarefas/quadros')
  await page.wait_for_timeout(12000)
  print('url',page.url)
  print('errors',await page.evaluate('document.readyState'))

  await page.get_by_text('Marketing Interno',exact=True).last.click()
  await page.wait_for_timeout(15000)
  await page.get_by_text('Automação de Prospecção',exact=True).click()
  composer=page.get_by_role('textbox',name='Escreva um comentário',exact=True)
  await composer.wait_for(timeout=30000)
  previous=page.locator('li.group').filter(has_text='Teste temporário comentário rico')
  while await previous.count():
   await previous.first.hover()
   await previous.first.get_by_role('button',name='Apagar comentário').click()
   await page.wait_for_timeout(2000)
  await composer.fill('   ')
  inserts=[]
  async def remember(response):
   if 'tarefa_comentarios' in response.url and response.request.method=='POST':
    inserts.append(response.request)
  page.on('response',remember)
  assert await page.get_by_role('button',name='Comentar',exact=True).is_disabled()
  await composer.fill('Teste temporário comentário rico')
  await composer.press('Control+a')
  await page.get_by_role('dialog').get_by_role('button',name='Negrito',exact=True).last.click()
  await page.get_by_role('dialog').get_by_role('button',name='Marcadores',exact=True).last.click()
  await page.get_by_role('button',name='Cor do texto:',exact=False).click()
  picker=page.get_by_role('dialog').last
  hex_input=page.locator('input').filter(visible=True) if False else page.get_by_label('Hexadecimal')
  await page.locator('input').last.fill('#dc2626')
  await page.keyboard.press('Escape')
  await composer.click()
  await composer.press('End')
  await composer.press('Enter')
  await composer.press('Enter')
  await composer.press_sequentially('https://example.com',delay=30)
  await composer.press('Space')
  await page.wait_for_timeout(500)
  await page.get_by_role('button',name='Comentar',exact=True).click()
  bubble=page.locator('li.group').filter(has_text='Teste temporário comentário rico').last
  await bubble.wait_for(timeout=30000)
  assert await bubble.locator('strong').count()>0
  assert await bubble.locator('ul').count()>0
  assert await bubble.locator('a').count()>0
  assert await bubble.locator('[style*="color"]').count()>0
  request=inserts[-1]
  headers=await request.all_headers()
  table_url=request.url.split('?')[0]
  rows=await page.request.get(table_url+'?select=id,autor_id&texto=like.*Teste%20tempor%C3%A1rio%20coment%C3%A1rio%20rico*',headers=headers)
  records=await rows.json()
  own=next(r for r in records if r['autor_id']==json.loads(os.environ['LOVABLE_BROWSER_SUPABASE_SESSION_JSON'])['user']['id'])
  denied=await page.request.patch(table_url+'?id=eq.'+own['id'],headers=headers,data={'autor_id':'00000000-0000-0000-0000-000000000000'})
  assert denied.status in (401,403), 'Author must not be reassigned by the comment writer'
  await bubble.hover()
  await bubble.get_by_role('button',name='Editar comentário',exact=True).click()
  edit=page.get_by_role('textbox',name='Editar comentário',exact=True)
  await edit.fill('Teste temporário comentário editado')
  await page.get_by_role('button',name='Salvar',exact=True).click()
  updated=page.locator('li.group').filter(has_text='Teste temporário comentário editado')
  await updated.get_by_text('editado',exact=True).wait_for(timeout=30000)
  await page.screenshot(path='/tmp/browser/comments/edited.png')
  print('saved rich comment and author edit; edited marker visible')
  await updated.hover()
  await updated.get_by_role('button',name='Apagar comentário',exact=True).click()
  await updated.wait_for(state='detached',timeout=30000)
  print('temporary comment removed')
  await browser.close()
asyncio.run(main())
