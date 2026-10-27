(function(root){
'use strict';
const MAX=1000;
function number(v,label,min,max){if((typeof v!=='number'&&typeof v!=='string')||String(v).trim()===''||!Number.isFinite(Number(v)))throw Error(label+'需要填写有效数字'); const n=Number(v);if(n<min||n>max)throw Error(label+'须在 '+min+'–'+max+' 之间');return n;}
function precision(n,label){if(Number(n.toFixed(3))!==n)throw Error(label+'最多保留3位小数');return n;}
function validate(raw){
 if(!raw||!Array.isArray(raw.stages)||raw.stages.length<1||raw.stages.length>8)throw Error('请保留1–8个阶段');
 const stages=raw.stages.map((r,i)=>{if(!r||typeof r.name!=='string')throw Error('阶段名称无效');const name=r.name.trim();if(!name||Array.from(name).length>24)throw Error('阶段名称须为1–24个字符');const seconds=precision(number(r.seconds,'第'+(i+1)+'阶段耗时',0,1e7),'耗时'), speed=number(r.speed,'第'+(i+1)+'阶段倍数',.1,MAX);if(Number(speed.toFixed(3))!==speed)throw Error('倍数最多保留3位小数');return{name,seconds,speed};});
 if(!stages.some(s=>s.seconds>0))throw Error('至少一个阶段的原耗时须大于0');
 const overhead=precision(number(raw.overhead,'新增开销',0,1e7),'开销'), target=precision(number(raw.target,'目标加速比',1,1000),'目标');
 const selected=number(raw.selected,'选择阶段',0,stages.length-1);if(!Number.isInteger(selected))throw Error('选择阶段无效');
 return{version:1,stages,overhead,target,selected};
}
function compute(raw){const p=validate(raw);const rows=p.stages.map((s,i)=>({...s,index:i,after:s.seconds/s.speed,saved:s.seconds-s.seconds/s.speed}));const before=rows.reduce((a,s)=>a+s.seconds,0),after=rows.reduce((a,s)=>a+s.after,p.overhead);const rest=rows.reduce((a,s)=>a+(s.index===p.selected?0:s.after),p.overhead); const longest=rows.reduce((a,s)=>s.after>a.after?s:a);return{plan:p,rows,before,after,speedup:before/after,saved:before-after,percent:(before-after)/before*100,rest,limit:rest===0?Infinity:before/rest,longest:longest.index};}
function solve(raw){const r=compute(raw),p=r.plan,t=p.stages[p.selected].seconds,budget=r.before/p.target; if(r.after<=budget)return{kind:'met',speed:p.stages[p.selected].speed};if(t===0)return{kind:'zero'};const room=budget-r.rest; if(room<=0)return{kind:'impossible',limit:r.limit}; const required=t/room,apply=Math.ceil(required*1000)/1000; if(apply>MAX)return{kind:'range',required};return{kind:'possible',required,speed:Math.max(.1,apply)};}
function changeSpeed(raw,i,s){const p=validate(raw);p.stages[i].speed=s;return validate(p);}
function curve(raw){const p=validate(raw);return[1,2,4,8,16,32,64,128,256,512,1000].map(x=>({x,y:compute(changeSpeed(p,p.selected,x)).speedup}));}
function csv(raw){const r=compute(raw);const safe=s=>'"'+String(typeof s==='string'&&/^[=+\-@\t\r]/.test(s)?'\''+s:s).replace(/"/g,'""')+'"';return '\ufeff'+[['阶段','原耗时(秒)','相对原阶段倍数','新耗时(秒)','节省(秒)'],...r.rows.map(s=>[s.name,s.seconds,s.speed,s.after,s.saved]),['新增固定开销',0,'',r.plan.overhead,-r.plan.overhead],['合计',r.before,'',r.after,r.saved]].map(row=>row.map(safe).join(',')).join('\r\n');}
const samples={gpu:{version:1,stages:[{name:'读入资料',seconds:120,speed:1},{name:'GPU计算',seconds:600,speed:2},{name:'后处理',seconds:180,speed:1},{name:'写出结果',seconds:100,speed:1}],overhead:20,target:2,selected:1},io:{version:1,stages:[{name:'读取与传输',seconds:700,speed:1},{name:'计算',seconds:200,speed:8},{name:'写出',seconds:100,speed:1}],overhead:0,target:2,selected:1},cost:{version:1,stages:[{name:'准备',seconds:50,speed:1},{name:'执行',seconds:50,speed:2}],overhead:40,target:2,selected:1}};
const api={validate,compute,solve,curve,changeSpeed,csv,samples};if(typeof module==='object'&&module.exports)module.exports=api;else root.AppCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
