import { launchEdge, mobileContext, makeShooter, byText } from './deck/capture-kit.mjs';
const B='http://localhost:5190';
const browser=await launchEdge(); const { shot }=makeShooter('screenshots');
const ctx=await mobileContext(browser,{ seed:{ cm_birth:JSON.stringify({y:'2004',m:'11',d:'3',h:'모름',min:'0'}), cm_nick:'손용범' } });
const p=await ctx.newPage(); p.setDefaultTimeout(12000);
await p.goto(B,{waitUntil:'networkidle',timeout:30000});
await byText(p,'천문 식탁',true).click(); await p.waitForTimeout(1500);
// 그릇 열기(공개)
await p.locator('button[aria-label="오늘의 한 그릇 열기"]').click().catch(()=>{}); await p.waitForTimeout(1200);
await shot(p,'fin_food_top',600);
await p.evaluate(()=>window.scrollTo({top:99999})); await p.waitForTimeout(400);
await shot(p,'fin_food_bot',600);
await ctx.close(); await browser.close(); console.log('done');
