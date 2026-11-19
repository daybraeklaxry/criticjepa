(function(){
var E=[25.282,23.045,22.818,23.406],P=[16.652,9.503,7.127,6.718],S=[0,10,30,90],REF=20.209;
var svg=document.getElementById('diagChart'),read=document.getElementById('diagRead');
var NS='http://www.w3.org/2000/svg';
function x(i){return 80+S[i]/90*500}function y(v){return 290-v*8.3}
function el(t,a,txt){var e=document.createElementNS(NS,t);for(var k in a)e.setAttribute(k,a[k]);if(txt!=null)e.textContent=txt;svg.appendChild(e);return e}
function draw(s){
 Array.prototype.slice.call(svg.querySelectorAll('g,line,path,circle,text:not(title)')).forEach(function(n){if(n.parentNode===svg)svg.removeChild(n)});
 [0,10,20,30].forEach(function(v){el('line',{x1:70,x2:620,y1:y(v),y2:y(v),stroke:'#d9d8ce'});el('text',{x:60,y:y(v)+4,'text-anchor':'end'},v)});
 S.forEach(function(st,i){el('text',{x:x(i),y:316,'text-anchor':'middle'},st)});
 el('text',{x:345,y:336,'text-anchor':'middle'},'gradient steps');
 el('text',{x:16,y:24},'endpoint error, lower is better');
 el('line',{x1:70,x2:620,y1:y(REF),y2:y(REF),stroke:'#0f7a72','stroke-width':2,'stroke-dasharray':'6 5'});
 el('text',{x:620,y:y(REF)-8,'text-anchor':'end',fill:'#0f7a72'},'CriticJEPA-0 reference 20.2');
 [[E,'#56657a','executed'],[P,'#bf5039','predicted']].forEach(function(d){
  el('path',{d:d[0].map(function(v,i){return(i?'L':'M')+x(i)+' '+y(v)}).join(''),fill:'none',stroke:d[1],'stroke-width':2.5});
  d[0].forEach(function(v,i){var on=i===s;el('circle',{cx:x(i),cy:y(v),r:on?7:4,fill:on?d[1]:'#f8f7f2',stroke:d[1],'stroke-width':2.5})});
  var atEnd=s===S.length-1;
  el('text',{x:x(s)+(atEnd?-12:12),y:y(d[0][s])+(d[2]==='executed'?-8:18),'text-anchor':atEnd?'end':'start',style:'fill:'+d[1]+';font-weight:600'},d[2]+' '+d[0][s].toFixed(1));
 });
 el('line',{x1:x(s),x2:x(s),y1:y(E[s]),y2:y(P[s]),stroke:'#17322a','stroke-dasharray':'2 3'});
 var de=(E[s]-E[0]).toFixed(1),dp=(P[s]-P[0]).toFixed(1);
 read.innerHTML=s===0?'Before search, executed error is <b>25.3</b> and predicted error is <b>16.7</b>.':'After <b>'+S[s]+'</b> steps, executed error is <b>'+E[s].toFixed(1)+'</b> ('+de+' since step 0) while predicted error is <b>'+P[s].toFixed(1)+'</b> ('+dp+'). Gap '+(E[s]-P[s]).toFixed(1)+'.';
 document.querySelectorAll('[data-step]').forEach(function(b){b.setAttribute('aria-pressed',String(+b.dataset.step===s))});
}
document.querySelectorAll('[data-step]').forEach(function(b){b.addEventListener('click',function(){draw(+b.dataset.step)})});
draw(3);
var R=['01111101111111001101000101101001110011111111011101','11010111011011111111100111111011111011111111011101','11011111111110111101110011110000010111011111011000'];
var grid=document.getElementById('grid'),rr=document.getElementById('runRead');
function run(k){
 var bits=[];for(var i=0;i<50;i++){bits.push(k<3?R[k][i]==='1':(R[0][i]==='1'||R[1][i]==='1'||R[2][i]==='1'))}
 grid.innerHTML='';var n=0;
 bits.forEach(function(ok,i){var li=document.createElement('li');li.className=ok?'s':'f';li.textContent=ok?'':'×';li.setAttribute('aria-label','Task '+(i+1)+(ok?' solved':' failed'));li.title='Task '+(i+1);if(ok)n++;grid.appendChild(li)});
 rr.textContent=(k<3?'Run '+(k+1):'Any of three')+': '+n+'/50 tasks solved'+(k<3?'.':', task coverage only.');
 document.querySelectorAll('[data-run]').forEach(function(b){b.setAttribute('aria-pressed',String(+b.dataset.run===k))});
}
document.querySelectorAll('[data-run]').forEach(function(b){b.addEventListener('click',function(){run(+b.dataset.run)})});
run(3);
var c=document.getElementById('copy'),m=document.getElementById('copyMsg'),bib=document.getElementById('bib');
c.addEventListener('click',function(){var t=bib.textContent;function done(){m.textContent='Copied.'}
 if(navigator.clipboard){navigator.clipboard.writeText(t).then(done,fb)}else fb();
 function fb(){var r=document.createRange();r.selectNodeContents(bib);var s=getSelection();s.removeAllRanges();s.addRange(r);try{document.execCommand('copy');done()}catch(e){m.textContent='Press Ctrl+C to copy.'}}
});
})();

