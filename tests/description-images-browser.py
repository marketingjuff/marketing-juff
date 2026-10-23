import asyncio,json,os
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True)
  ctx=await b.new_context(viewport={'width':1280,'height':1800})
  page=await ctx.new_page()
  with open(os.path.expanduser('~/.cache/lovable-auth/session.json')) as f:m=json.load(f)
  await page.goto('http://localhost:8080/auth')
  await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[m['storage_key'],json.dumps(m['session'])])
  await page.goto('http://localhost:8080/tarefas/quadros')
  await page.get_by_text('Marketing Interno',exact=True).last.click(timeout=60000)
  await page.get_by_role('button',name='Sair',exact=True).wait_for()
  fixture=await page.evaluate("""async()=>{const {supabase}=await import('/src/integrations/supabase/client.ts'); const {data:q}=await supabase.from('tarefa_quadros').select('id').eq('nome','Marketing Interno').single();const {data:co}=await supabase.from('tarefa_colunas').select('id').eq('quadro_id',q.id).eq('arquivado',false).order('posicao').limit(1).single();const {data,error}=await supabase.from('tarefa_cards').insert({quadro_id:q.id,coluna_id:co.id,titulo:'Teste imagens em envio 23out',descricao:'<p>Texto preservado</p>',posicao:9999}).select('id').single();if(error)throw Error(error.message);return data}""")
  try:
   await page.get_by_text('Teste imagens em envio 23out',exact=True).last.click(timeout=30000)
   async def delay(route):
    if route.request.method=='POST': await asyncio.sleep(4)
    await route.continue_()
   await page.route('**/storage/v1/object/**',delay)
   editor=page.locator('.descricao-rica[contenteditable=true]')
   await editor.wait_for(timeout=30000)
   await editor.click()
   await page.keyboard.press('Control+End')
   await editor.evaluate("""el=>{const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='),c=>c.charCodeAt(0));const dt=new DataTransfer();dt.items.add(new File([bytes],'captura1.png',{type:'image/png'}));dt.items.add(new File([bytes],'captura2.png',{type:'image/png'}));el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))}""")
   await page.get_by_text('Enviando imagem…',exact=True).first.wait_for()
   await page.get_by_role('dialog').get_by_text('Descrição',exact=True).click()
   estado=await page.evaluate("async(id)=>{const {supabase}=await import('/src/integrations/supabase/client.ts');const {data}=await supabase.from('tarefa_cards').select('descricao').eq('id',id).single();return data.descricao}",fixture['id'])
   assert '<img' not in estado, 'Upload placeholders must not be persisted on blur'
   await page.get_by_role('button',name='Close',exact=True).click()
   assert await page.get_by_role('dialog').count()==1
   await page.wait_for_timeout(8000)
   result=await page.evaluate("""async(id)=>{const {supabase}=await import('/src/integrations/supabase/client.ts');const {data}=await supabase.from('tarefa_cards').select('descricao').eq('id',id).single();const {data:a}=await supabase.from('tarefa_anexos').select('id').eq('card_id',id);return {html:data.descricao,anexos:a.length}}""",fixture['id'])
   print(result)
   assert result['anexos']==2 and result['html'].count('data-anexo-id=')==2 and 'Texto preservado' in result['html']
   await page.get_by_role('button',name='Close',exact=True).click()
   await page.get_by_text('Teste imagens em envio 23out',exact=True).last.click()
   await page.locator('.descricao-rica img[src]').first.wait_for(timeout=30000)
   assert await page.locator('.descricao-rica img[src]').count()==2
   print('Imagem permaneceu na descricao apos fechar e reabrir.')
   await page.locator('.descricao-rica[contenteditable=true]').screenshot(path='/tmp/browser/imagens/resultado.png')
  finally:
   await page.unroute_all(behavior='wait')
   await page.evaluate("""async(id)=>{const {supabase}=await import('/src/integrations/supabase/client.ts');const {data:a}=await supabase.from('tarefa_anexos').select('path').eq('card_id',id);if(a.length)await supabase.storage.from('tarefas').remove(a.map(x=>x.path));await supabase.from('tarefa_cards').delete().eq('id',id)}""",fixture['id'])
   await b.close()
asyncio.run(main())
