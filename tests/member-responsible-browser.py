import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
 async with async_playwright() as p:
  browser = await p.chromium.launch(headless=True)
  context = await browser.new_context(viewport={"width":1280,"height":1800})
  page = await context.new_page()
  with open(os.path.expanduser('~/.cache/lovable-auth/session.json')) as f: minted=json.load(f)
  cookies=minted.get('cookies') or []
  if cookies: await context.add_cookies([{**c,'url':'http://localhost:8080'} for c in cookies])
  await page.goto('http://localhost:8080')
  await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[minted['storage_key'],json.dumps(minted['session'])])
  await page.goto('http://localhost:8080/tarefas/quadros')
  await page.wait_for_timeout(2500)
  fixture=await page.evaluate('''async()=>{
   const {supabase:s}=await import('/src/integrations/supabase/client.ts');
   const must=r=>{if(r.error)throw Error(r.error.message);return r.data;};
   const user=must(await s.auth.getUser()).user;
   const me=must(await s.from('profiles').select('nome').eq('id',user.id).single());
   const other=must(await s.from('profiles').select('id').neq('id',user.id).limit(1))[0];
   const board=must(await s.from('tarefa_quadros').select('id').eq('cards_privados',true).eq('arquivado',false).limit(1))[0];
   if(!board||!other)throw Error('Fixture missing');
   const col=must(await s.from('tarefa_colunas').select('id').eq('quadro_id',board.id).eq('arquivado',false).order('posicao').limit(1))[0];
   const card=must(await s.from('tarefa_cards').insert({quadro_id:board.id,coluna_id:col.id,titulo:'Teste temporário responsável único',criado_por:user.id}).select('id').single());
   must(await s.from('tarefa_cards').update({responsavel_id:null}).eq('id',card.id));
   must(await s.from('tarefa_card_membros').insert([{card_id:card.id,user_id:user.id},{card_id:card.id,user_id:other.id}]));
   return {card:card.id,board:board.id,me:user.id,name:me.nome,other:other.id};
  }''')
  try:
   await page.goto('http://localhost:8080/tarefas/quadros/'+fixture['board']+'?card='+fixture['card'])
   dialog=page.get_by_role('dialog')
   await dialog.get_by_role('combobox').filter(has_text='Responsável').click(timeout=30000)
   await page.get_by_role('option',name=fixture['name'],exact=True).click()
   await page.wait_for_timeout(2500)
   result=await page.evaluate('''async f=>{
    const {supabase:s}=await import('/src/integrations/supabase/client.ts');
    const c=await s.from('tarefa_cards').select('responsavel_id').eq('id',f.card).single();
    const m=await s.from('tarefa_card_membros').select('user_id').eq('card_id',f.card);
    if(c.error||m.error)throw Error('Read failed');return {responsible:c.data.responsavel_id,members:m.data.map(x=>x.user_id)};
   }''',fixture)
   assert result['responsible']==fixture['me']
   assert result['members']==[fixture['other']], 'Responsible must be removed; other member preserved'
   await page.reload()
   await dialog.get_by_role('button',name='Membros 1',exact=True).wait_for(timeout=30000)
   await dialog.get_by_role('button',name='Membros 1',exact=True).click()
   assert await page.locator('label').filter(has_text=fixture['name']).count()==0, 'Current responsible must not be offered as member'
   await page.keyboard.press('Escape')
   prevented=await page.evaluate('''async f=>{
    const {supabase:s}=await import('/src/integrations/supabase/client.ts');
    const r=await s.from('tarefa_card_membros').insert({card_id:f.card,user_id:f.me});
    if(r.error)throw Error(r.error.message);
    const m=await s.from('tarefa_card_membros').select('user_id').eq('card_id',f.card).eq('user_id',f.me);
    if(m.error)throw Error(m.error.message);return m.data.length===0;
   }''',fixture)
   assert prevented, 'Direct member insertion must also exclude responsible'
   await dialog.screenshot(path='/tmp/browser/member-responsible/result.png')
   print('PASS: UI assignment removes duplicate, preserves other member, persists after reload, and direct insertion is prevented')
  finally:
   await page.evaluate('''async f=>{const {supabase:s}=await import('/src/integrations/supabase/client.ts'); const r=await s.from('tarefa_cards').delete().eq('id',f.card);if(r.error)throw Error(r.error.message);}''',fixture)
   await browser.close()
asyncio.run(main())
