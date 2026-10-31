/* ==== 1. CONFIGURAÇÃO (a config web do Firebase é pública; a proteção está nas Security Rules) ==== */
import{initializeApp}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import{getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,GoogleAuthProvider,signInWithPopup,sendPasswordResetEmail,signOut,updateProfile}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import{getFirestore,doc,getDoc,setDoc,updateDoc,addDoc,collection,query,where,getDocs,limit,serverTimestamp,runTransaction,deleteDoc}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
const FIREBASE={apiKey:"AIzaSyCDRbUsrfrfKJ3erCUXWTRTyLG2GE6Xdpg",authDomain:"vellum-gns.firebaseapp.com",projectId:"vellum-gns",storageBucket:"vellum-gns.firebasestorage.app",messagingSenderId:"523498921953",appId:"1:523498921953:web:14ba0ba049cf89da68fca0"};
const CONFIG_OK=FIREBASE.apiKey!=="COLE_AQUI";
const app=initializeApp(FIREBASE),auth=getAuth(app),db=getFirestore(app);

/* ==== 2. UTILITÁRIOS ==== */
const $=(s,r=document)=>r.querySelector(s);
const vt=f=>document.startViewTransition&&!matchMedia("(prefers-reduced-motion:reduce)").matches?document.startViewTransition(f).updateCallbackDone:Promise.resolve(f());
const marcar=b=>b.parentElement.querySelectorAll("button").forEach(x=>{const on=x===b;x.classList.toggle("sel",on);x.classList.toggle("dim",!on&&x.matches(".opt,.pcard"));x.setAttribute("aria-pressed",on)});
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(msg,tipo="ok"){const t=document.createElement("div");t.className="toast "+tipo;t.setAttribute("role",tipo==="err"?"alert":"status");t.textContent=msg;$("#toasts").append(t);setTimeout(()=>t.remove(),4500)}
const ERROS={"auth/invalid-credential":"E-mail ou senha incorretos.","auth/email-already-in-use":"Este e-mail já tem conta. Entre ou recupere a senha.","auth/weak-password":"A senha precisa ter ao menos 6 caracteres.","auth/invalid-email":"E-mail inválido.","auth/popup-closed-by-user":"Login com Google cancelado.","auth/too-many-requests":"Muitas tentativas. Aguarde alguns minutos.","permission-denied":"Você não tem permissão para esta ação."};
const msgErro=e=>ERROS[e.code]||e.message_pt||"Não foi possível concluir. Tente novamente.";
async function acao(btn,fn){if(new URLSearchParams(location.search).get("vis")){toast("Modo visualização: as ações ficam desativadas.","err");return}btn.setAttribute("aria-busy","true");try{await fn()}catch(e){console.error(e);toast(msgErro(e),"err")}finally{btn.removeAttribute("aria-busy")}}
function cpfValido(v){const d=v.replace(/\D/g,"");if(d.length!==11||/^(\d)\1+$/.test(d))return false;const dv=n=>{let s=0;for(let i=0;i<n;i++)s+=d[i]*(n+1-i);return(s*10%11)%10};return dv(9)==d[9]&&dv(10)==d[10]}

function inclinar(raiz){if(!matchMedia("(hover:hover)").matches)return;const al=e=>e.target.closest(".t3d>*,[data-e=tilt]>*");
raiz.addEventListener("pointermove",e=>{const c=al(e);if(!c)return;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
c.style.setProperty("--ry",(x*18).toFixed(1)+"deg");c.style.setProperty("--rx",(-y*18).toFixed(1)+"deg");c.style.setProperty("--px",(x*2).toFixed(2));c.style.setProperty("--py",(y*2).toFixed(2))});
raiz.addEventListener("pointerout",e=>{const c=al(e);if(!c)return;["--rx","--ry","--px","--py"].forEach(k=>c.style.removeProperty(k))})}
function coverflow(el){const f=()=>{if(!el.isConnected){removeEventListener("resize",f);return}const r=el.getBoundingClientRect(),m=r.left+r.width/2;[...el.children].forEach(k=>{const b=k.getBoundingClientRect(),o=(b.left+b.width/2-m)/b.width;k.style.setProperty("--o",o.toFixed(3));k.style.setProperty("--a",Math.min(Math.abs(o),2.5).toFixed(3))})};
let w=0;el.addEventListener("scroll",()=>{if(!w)w=requestAnimationFrame(()=>{w=0;f()})},{passive:true});addEventListener("resize",f);f();setTimeout(f,350)}
/* ==== 3. TEMA E ESTABELECIMENTO (multiloja via ?s=<id>) ==== */
const slug=()=>{const s=new URLSearchParams(location.search).get("s");if(s)localStorage.setItem("slug",s);return s||localStorage.getItem("slug")};
const href=p=>"#/"+p.replace(".html","");
function lum(h){const[r,g,b]=[1,3,5].map(i=>parseInt(h.substr(i,2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*b}
const FONTES={classica:["'Playfair Display',Georgia,serif","'Inter',system-ui,sans-serif","Playfair+Display:wght@400;600&family=Inter:wght@400;600"],
moderna:["'Inter',system-ui,sans-serif","'Inter',system-ui,sans-serif","Inter:wght@400;600;700"],
editorial:["'DM Serif Display',Georgia,serif","'DM Sans',system-ui,sans-serif","DM+Serif+Display&family=DM+Sans:wght@400;600"],
industrial:["'Oswald',Impact,sans-serif","'Inter',system-ui,sans-serif","Oswald:wght@400;600&family=Inter:wght@400;600"],
geometrica:["'Syne',system-ui,sans-serif","'DM Sans',system-ui,sans-serif","Syne:wght@500;700&family=DM+Sans:wght@400;600"],
artesanal:["'Fraunces',Georgia,serif","'Inter',system-ui,sans-serif","Fraunces:wght@400;600&family=Inter:wght@400;600"]};
function aplicarTema(t={}){const R=document.documentElement,S=(k,v)=>R.style.setProperty(k,v),c=/^#[0-9a-f]{6}$/i.test(t.cor)?t.cor:"#23395b",F=FONTES[t.fonte]||FONTES.classica;
S("--brand",c);S("--on-brand",lum(c)>.4?"#111":"#fff");S("--r",{reto:"2px",discreto:"8px",suave:"14px",redondo:"26px",capsula:"40px"}[t.estilo]||"14px");
R.dataset.theme={escuro:"dark",argila:"argila",nevoa:"nevoa"}[t.tema]||"light";R.dataset.fundo=t.fundo||"";R.dataset.foto=t.fotoForma||"arco";R.dataset.efeito=t.fotoEfeito||"contorno";S("--serif",F[0]);S("--sans",F[1]);
let l=document.getElementById("gf");if(!l){l=document.createElement("link");l.id="gf";l.rel="stylesheet";document.head.append(l)}const u="https://fonts.googleapis.com/css2?family="+F[2]+"&display=swap";if(l.href!==u)l.href=u;
S("--bw",(t.borda??1)+"px");S("--op",(t.opac??100)+"%");S("--sh",["none","0 1px 0 var(--line)","0 12px 28px -18px rgb(0 0 0/.4)","0 26px 50px -22px rgb(0 0 0/.5)"][t.prof||0]);S("--bright",(t.brilho??100)+"%");S("--lg",(t.logoTam||36)+"px");S("--ov",(t.heroOverlay??40)/100)}
const logoTag=(t,pos,cls="")=>{const x=t?.tema;return x?.logo&&pos.includes(x.logoPos||"lado")?`<img class="logo lf-${x.logoForma||"livre"} ${cls}" src="${x.logo}" alt="${esc(t.nome)}">`:""};
const TC=new Map();let OVR=null,TT=null,PING=0;
async function carregarTenant(id){if(id===false)return null;id=id||slug();if(!id)return null;let c=TC.get(id);
if(!c||Date.now()-c.em>6e4){const d=await getDoc(doc(db,"tenants",id));if(!d.exists())return null;c={em:Date.now(),t:{id:d.id,...d.data()}};TC.set(id,c)}
const t=c.t;if(OVR&&OVR.id===id)Object.assign(t,{nome:OVR.nome,tema:OVR.tema});if(t.status==="suspenso")return{...t,suspenso:true};aplicarTema(t.tema);document.title=t.nome;pwa(t);return t}

/* ==== 4. AUTENTICAÇÃO E PAPÉIS (papel vem de masters/ e acessos/, só o Master grava) ==== */
let SES;const sessaoBase=async()=>SES&&auth.currentUser?.uid===SES.u.uid?SES:(SES=await sessaoRaw());
const sessao=async()=>{const s=await sessaoBase(),v=new URLSearchParams(location.search).get("vis");return s?.papel==="master"&&v&&slug()?{...s,papel:v==="loja"?"proprietario":"cliente",tenantId:v==="loja"?slug():undefined,previa:true}:s};
const sessaoRaw=()=>new Promise(r=>{const un=onAuthStateChanged(auth,async u=>{un();r(u?{u,...await papelDe(u)}:null)})});
async function papelDe(u){if((await getDoc(doc(db,"masters",u.uid))).exists())return{papel:"master"};
let a=await getDoc(doc(db,"acessos",u.uid));
if(!a.exists()&&u.email){const cv=await getDoc(doc(db,"convites",u.email.toLowerCase()));if(cv.exists()){const c=cv.data();
await setDoc(doc(db,"acessos",u.uid),{tenantId:c.tenantId,papel:c.papel,unidades:c.unidades||[],permissoes:c.permissoes||[],email:u.email.toLowerCase(),nome:u.displayName||""});await deleteDoc(cv.ref);a=await getDoc(doc(db,"acessos",u.uid))}}
return a.exists()?{papel:a.data().papel,tenantId:a.data().tenantId,unidades:a.data().unidades||[],permissoes:a.data().permissoes||[]}:{papel:"cliente"}}
const destino=s=>s.papel==="master"?"master.html":s.papel==="cliente"?"agendar.html":"agendamentos.html";
async function irParaPainel(){const u=auth.currentUser;location.replace(href(destino({...await papelDe(u)})))}
function exigir(s,papeis,perm){if(!s){location.replace(href("login.html"));return false}if(!papeis.includes(s.papel)||(s.papel==="equipe"&&perm&&perm!=="agendamentos"&&!(s.permissoes||[]).includes(perm))){location.replace(href(destino(s)));return false}return true}
async function garantirPerfil(u,extra={}){const r=doc(db,"users",u.uid);if(!(await getDoc(r)).exists())await setDoc(r,{nome:extra.nome||u.displayName||"",email:u.email,criadoEm:serverTimestamp(),...(extra.lgpdEm?{lgpdEm:serverTimestamp()}:{})})}
const entrarGoogle=async()=>{const c=await signInWithPopup(auth,new GoogleAuthProvider());await garantirPerfil(c.user,{lgpdEm:1})};
async function auditar(ev,dados){await addDoc(collection(db,"auditoria"),{ev,dados,uid:auth.currentUser.uid,em:serverTimestamp()})}

/* ==== 5. CABEÇALHO COMPARTILHADO ==== */
function topo(t,s){document.body.dataset.papel=s?.papel||"";const n=[];
if(s?.papel==="cliente")n.push(["agendar.html","Agendar"],["cliente.html","Meu perfil"]);
const NAV=[["agendamentos.html","Agenda",1],["bloqueios.html","Bloqueios",1],["unidades.html","Unidades",0],["profissionais.html","Profissionais",1],["servicos.html","Serviços",1],["promocoes.html","Promoções",0],["metas.html","Metas",0],["avaliacoes.html","Avaliações",1],["indicadores.html","Indicadores",0],["equipe.html","Equipe",0],["ajustes.html","Ajustes",0]];
if(s?.papel==="proprietario")NAV.forEach(([r,l])=>n.push([r,l]));
if(s?.papel==="equipe")NAV.forEach(([r,l,a])=>{const k=r.replace(".html","");if(a&&(k==="agendamentos"||(s.permissoes||[]).includes(k)))n.push([r,l])});
if(s?.papel==="master")n.push(["master.html","Plataforma"],["personalizacao.html","Aparência"],["equipe.html","Equipe"]);
$("#topo").innerHTML=`<a class="marca ${t?.tema?.logoPos==='centro'?"col":""}" data-l="index.html">${logoTag(t,["lado","centro","so"])}${t?.tema?.logoPos==="so"&&t.tema.logo?"":esc(t?.nome||"Agenda")}</a><nav aria-label="Principal">${n.map(([p,l])=>`<a data-l="${p}"${p.replace(".html","")===(location.hash.replace(/^#\/?/,"")||"index")?' aria-current="page"':""}>${l}</a>`).join("")}${s?.previa?`<span class="tag">Prévia</span>`:s?`<button class="btn ghost" id="sair">Sair</button>`:`<a data-l="login.html" class="btn ghost">Entrar</a>`}</nav>`;
$("#sair")?.addEventListener("click",async()=>{await signOut(auth);location.replace(href("index.html"))})}

/* ==== 6. PÁGINAS (cada uma só roda quando <body data-page="..."> coincide) ==== */
const P={};
function revelar(){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("vis");io.unobserve(e.target)}}),{threshold:.12});document.querySelectorAll(".rv").forEach((x,i)=>{x.style.transitionDelay=(i%4)*70+"ms";io.observe(x)})}
P.index=async t=>{const h=$("#hero");
if(t?.suspenso)return h.innerHTML=`<h1>Estabelecimento indisponível</h1><p class="lead">Este estabelecimento está temporariamente fora do ar.</p>`;
if(!t){const q=await getDocs(query(collection(db,"tenants"),where("status","==","ativo"),limit(20)));
return h.innerHTML=`<h1>Escolha onde quer ser atendido</h1>`+(q.empty?`<p class="lead">Nenhum estabelecimento cadastrado ainda. Peça ao administrador da plataforma para criar o primeiro.</p>`:`<div class="grid" style="width:100%">${q.docs.map(d=>`<a class="card lnk" href="?s=${encodeURIComponent(d.id)}#/index"><strong>${esc(d.data().nome)}</strong><br><span class="mute">${esc(d.data().descricao||"")}</span></a>`).join("")}</div>`)}
const ler=async n=>(await getDocs(collection(db,"tenants",t.id,n))).docs.map(d=>({id:d.id,...d.data()})),tm=t.tema||{};
const[V,PR,SV,rv]=await Promise.all([ler("vitrine"),ler("profissionais"),ler("servicos"),rev(t)]);
const cta=`<a class="btn cta" data-l="agendar.html">Agendar horário</a>`,fig=v=>`<figure class="rv"><img src="${v.img}" alt="${esc(v.legenda||v.tipo)}" loading="lazy"><figcaption>${esc(v.legenda||"")}</figcaption></figure>`;
const capa=V.find(v=>v.tipo==="capa"),fotos=V.filter(v=>v!==capa).sort((a,b)=>a.ordem-b.ordem),todas=[capa,...fotos].filter(Boolean),L=tm.layout||"cinema";
const txt=`${logoTag(t,["hero"],"hero-logo")}<h1>${esc(t.nome)}</h1><p class="lead">${esc(t.descricao||"")}</p>${cta}`;let topoH="";
if(L==="cinema")topoH=`<section class="cine"><div class="cine-img" ${capa?`style="background-image:url('${capa.img}')"`:""}></div><div class="cine-txt">${txt}</div></section>${fotos.length?`<section class="strip">${fotos.map(fig).join("")}</section>`:""}`;
if(L==="mosaico")topoH=`<section class="sec"><div class="mos"><div class="mos-t rv">${txt}</div>${todas.slice(0,8).map(fig).join("")}</div></section>`;
if(L==="editorial")topoH=`<section class="edi"><div class="edi-t">${txt}</div><div class="edi-f">${todas.map(fig).join("")||""}</div></section>`;
if(L==="coverflow")topoH=`<section class="sec cf-t"><div class="cf-head">${txt}</div></section><div class="cflow gal3d">${todas.map(v=>fig(v).replace('class="rv"','')).join("")}</div>`;
if(L==="revista")topoH=`<section class="rev">${todas.map((v,i)=>`<figure><img src="${v.img}" alt="${esc(v.legenda||v.tipo)}"><div class="rv-t">${i===0?txt:esc(v.legenda||"")}</div></figure>`).join("")||`<figure><div class="rv-t">${txt}</div></figure>`}</section>`;
const pm=(await getDocs(query(collection(db,"tenants",t.id,"promocoes"),where("emailCliente","==",""),where("destaqueHome","==",true)))).docs.map(d=>d.data()).filter(p=>p.ativo!==false&&(!p.validade||p.validade>=hoje()));
const promoH=pm.length?`<section class="sec"><h2 class="rv">Promoções</h2><div class="promo-grid">${pm.map(p=>`<div class="promo rv"><b>${p.tipo==="percent"?p.valor+"%":brl(p.valor)} OFF</b><strong>${esc(p.titulo)}</strong><span>${esc(p.descricao||"")}</span>${p.codigo?`<code>Cupom ${esc(p.codigo)}</code>`:""}${p.validade?`<small>Até ${esc(p.validade.split("-").reverse().join("/"))}</small>`:""}</div>`).join("")}</div></section>`:"";
const eq=PR.filter(p=>p.ativo!==false),sv=SV.filter(v=>v.ativo!==false);
$("#main").classList.add("solto");
h.className="home";h.innerHTML=(tm.logo&&tm.logoPos==="marca"?`<img class="dagua" src="${tm.logo}" alt="">`:"")+topoH+
promoH+(tm.homeEquipe==="sim"&&eq.length?`<section class="sec"><h2 class="rv">Nossa equipe</h2><div class="equipe ${tm.equipeModelo==="coverflow"?"cflow":""}" data-m="${tm.equipeModelo||"grade"}" data-t="${tm.equipeTam||"m"}" data-e="${tm.equipeEfeito||"tilt"}" data-foto="${tm.equipeForma||"arco"}">${eq.map(p=>`<div class="eq"><span class="arch">${p.foto?`<img src="${p.foto}" alt="">`:`<i>${esc((p.nome||"?")[0])}</i>`}</span><strong>${esc(p.nome)}</strong></div>`).join("")}</div></section>`:"")+
(sv.length?`<section class="sec"><h2 class="rv">Serviços</h2><ul class="lista rv">${sv.map(v=>`<li><span>${esc(v.nome)}</span><strong>${brl(v.preco)}</strong></li>`).join("")}</ul></section>`:"")+
(rv?`<section class="sec"><h2 class="rv">Quem já passou por aqui</h2>${rv}</section>`:"")+`<section class="sec fim rv"><h2>Pronto para o seu horário?</h2>${cta}</section>`;
document.querySelectorAll("[data-l]").forEach(a=>a.href=href(a.dataset.l));revelar();document.querySelectorAll(".cflow").forEach(coverflow);inclinar(h);
const im=$(".cine-img");if(im&&!matchMedia("(prefers-reduced-motion:reduce)").matches){let w=0;const f=()=>{if(!im.isConnected)return removeEventListener("scroll",f);if(w)return;w=requestAnimationFrame(()=>{w=0;im.style.setProperty("--py",Math.min(scrollY,900)*.18+"px")})};addEventListener("scroll",f,{passive:true})}};

P.login=async(t,s)=>{if(s)return irParaPainel();const f=$("#f");
f.onsubmit=e=>{e.preventDefault();acao($("button",f),async()=>{await signInWithEmailAndPassword(auth,f.email.value.trim(),f.senha.value);await irParaPainel()})};
$("#g").onclick=e=>acao(e.currentTarget,async()=>{await entrarGoogle();await irParaPainel()});
$("#rec").onclick=async e=>{e.preventDefault();const m=f.email.value.trim();if(!m)return toast("Digite seu e-mail e toque em Esqueci a senha.","err");
try{await sendPasswordResetEmail(auth,m)}catch(x){if(x.code==="auth/invalid-email")return toast("E-mail inválido.","err")}toast("Se este e-mail tiver conta, enviamos o link para criar uma nova senha.")}};

P.cadastro=async(t,s)=>{if(s)return irParaPainel();const f=$("#f");
f.onsubmit=e=>{e.preventDefault();if(!f.lgpd.checked)return toast("Aceite o uso dos dados para continuar.","err");
acao($("button",f),async()=>{const c=await createUserWithEmailAndPassword(auth,f.email.value.trim(),f.senha.value);const nome=f.nome.value.trim();
await updateProfile(c.user,{displayName:nome});await garantirPerfil(c.user,{nome,lgpdEm:1});await irParaPainel()})};
$("#g").onclick=e=>acao(e.currentTarget,async()=>{await entrarGoogle();await irParaPainel()})};

P.cliente=async(t,s)=>{if(!exigir(s,["cliente"]))return;const f=$("#f"),ref=doc(db,"users",s.u.uid),CAMPOS=["nome","telefone","nascimento","cpf","cep","endereco","estilo"];
const d=(await getDoc(ref)).data()||{};CAMPOS.forEach(k=>f[k].value=d[k]||"");f.hidden=false;$("#carga").remove();
f.onsubmit=e=>{e.preventDefault();if(f.cpf.value&&!cpfValido(f.cpf.value))return toast("CPF inválido. Confira os números ou deixe em branco.","err");
acao($("button",f),async()=>{const v={};CAMPOS.forEach(k=>v[k]=f[k].value.trim());await setDoc(ref,v,{merge:true});toast("Perfil salvo.")})}};

P.personalizacao=async(t,s)=>{if(!exigir(s,["master"]))return;const f=$("#f"),sel=$("#lojas"),q=await getDocs(collection(db,"tenants"));
if(q.empty){$("#carga").remove();toast("Crie um estabelecimento primeiro, na tela Plataforma.","err");return}
const L=new Map(q.docs.map(d=>[d.id,{id:d.id,...d.data()}]));sel.innerHTML=[...L.values()].map(x=>`<option value="${esc(x.id)}">${esc(x.nome)}</option>`).join("");let cur,logo="";
const ler=()=>({cor:f.cor.value,tema:f.tema.value,estilo:f.estilo.value,fundo:f.fundo.value,fonte:f.fonte.value,borda:+f.borda.value,opac:+f.opac.value,prof:+f.prof.value,brilho:+f.brilho.value,logo,logoTam:+f.logoTam.value,logoPos:f.logoPos.value,logoForma:f.logoForma.value,layout:f.layout.value,fotoForma:f.fotoForma.value,fotoEfeito:f.fotoEfeito.value,dataModelo:f.dataModelo.value,horaModelo:f.horaModelo.value,fotoLayout:f.fotoLayout.value,heroOverlay:+f.heroOverlay.value,homeEquipe:f.homeEquipe.value,equipeModelo:f.equipeModelo.value,equipeForma:f.equipeForma.value,equipeTam:f.equipeTam.value,equipeEfeito:f.equipeEfeito.value});
const enviar=()=>{const w=$("#vif")?.contentWindow;if(w)w.postMessage({tema:ler(),nome:f.nome.value},location.origin)},pv=enviar;
addEventListener("message",function m(e){if(!$("#vif")){removeEventListener("message",m);return}if(e.origin===location.origin&&e.data?.pronto)enviar()});
async function galeria(){const g=await getDocs(collection(db,"tenants",cur.id,"vitrine"));$("#gal").innerHTML=g.empty?`<p class="mute">Nenhuma foto na vitrine ainda.</p>`:g.docs.map(d=>`<figure class="mini"><img src="${d.data().img}" alt=""><figcaption>${esc(d.data().tipo)}</figcaption><button type="button" data-x="${d.id}" aria-label="Remover foto">×</button></figure>`).join("")}
const D={cor:"#23395b",tema:"claro",estilo:"suave",fundo:"",fonte:"classica",borda:1,opac:100,prof:0,brilho:100,logoTam:36,logoPos:"lado",logoForma:"livre",layout:"cinema",fotoForma:"arco",fotoEfeito:"contorno",dataModelo:"faixa",horaModelo:"pilulas",fotoLayout:"grade",heroOverlay:40,homeEquipe:"nao",equipeModelo:"grade",equipeForma:"arco",equipeTam:"m",equipeEfeito:"tilt"};
const TELAS={cliente:[["index","Início"],["agendar","Agendar"]],loja:[["agendamentos","Agenda"],["unidades","Unidades"],["profissionais","Profissionais"],["servicos","Serviços"],["avaliacoes","Avaliações"],["indicadores","Indicadores"]]};
const telas=()=>{$("#vtela").innerHTML=TELAS[$("#vmodo").value].map(([r,n])=>`<option value="${r}">${n}</option>`).join("")};
const ir2=()=>{const i=$("#vif"),w=$("#vdisp").value;i.style.width=w==="100%"?"100%":w+"px";i.src=`${location.pathname}?s=${encodeURIComponent(cur.id)}&vis=${$("#vmodo").value}&_=${Date.now()}#/${$("#vtela").value}`;$("#vabrir").href=i.src.replace(/&_=\d+/,"")};
const escolher=async()=>{cur=L.get(sel.value);const x={...D,...cur.tema};logo=x.logo||"";f.nome.value=cur.nome||"";f.descricao.value=cur.descricao||"";Object.keys(D).forEach(k=>f[k].value=x[k]);f.logo.value="";pv();await galeria();ir2()};
$("#carga").remove();f.hidden=false;$("#prev").hidden=false;telas();$("#vmodo").onchange=()=>{telas();ir2()};$("#vtela").onchange=$("#vdisp").onchange=ir2;
const cheia=on=>{$("#prev").classList.toggle("cheia",on);document.body.classList.toggle("cheia",on);$("#vsair").hidden=!on;$("#vcheia").hidden=on};
$("#vcheia").onclick=()=>cheia(true);$("#vsair").onclick=()=>cheia(false);
document.addEventListener("keydown",function k(e){if(!$("#prev")){document.removeEventListener("keydown",k);document.body.classList.remove("cheia");return}if(e.key==="Escape")cheia(false)});
await escolher();sel.onchange=escolher;
f.logo.onchange=async()=>{if(f.logo.files[0]){logo=await imgData(f.logo.files[0],320,true);pv();toast("Logo carregada. Salve para publicar.")}};
f.oninput=e=>{if(!["logo","fotos","tipo","legenda"].includes(e.target.name))pv()};$("#descartar").onclick=escolher;
$("#gal").onclick=e=>{const b=e.target.closest("[data-x]");if(b)acao(b,async()=>{await deleteDoc(doc(db,"tenants",cur.id,"vitrine",b.dataset.x));await galeria()})};
$("#addfoto").onclick=e=>acao(e.currentTarget,async()=>{const fs=[...f.fotos.files];if(!fs.length)return toast("Escolha ao menos uma foto.","err");
for(const x of fs)await addDoc(collection(db,"tenants",cur.id,"vitrine"),{img:await imgData(x,1000),legenda:f.legenda.value.trim(),tipo:f.tipo.value,ordem:Date.now()});f.fotos.value="";toast(`${fs.length} foto(s) adicionada(s).`);await galeria()});
f.onsubmit=e=>{e.preventDefault();if(!f.nome.value.trim())return toast("Informe o nome do estabelecimento.","err");
acao($("button[type=submit]",f),async()=>{const novo={nome:f.nome.value.trim(),descricao:f.descricao.value.trim(),tema:ler()};await updateDoc(doc(db,"tenants",cur.id),novo);await auditar("tenant.aparencia",{id:cur.id});Object.assign(cur,novo);pwa(cur);TC.clear();toast("Aparência salva.");ir2()})}};

P.master=async(t,s)=>{if(!exigir(s,["master"]))return;const L=$("#lista"),sel=$("#sel");
async function listar(){const q=await getDocs(collection(db,"tenants"));$("#carga")?.remove();
L.innerHTML=q.empty?`<li class="mute">Nenhum estabelecimento ainda. Crie o primeiro ao lado.</li>`:q.docs.map(d=>{const x=d.data(),on=x.status!=="suspenso";
return`<li><span><strong>${esc(x.nome)}</strong><br><span class="mute">${esc(d.id)}</span> <span class="tag ${on?"":"off"}">${on?"ativo":"suspenso"}</span></span><button class="btn ghost" data-id="${esc(d.id)}" data-st="${on?"suspenso":"ativo"}">${on?"Suspender":"Reativar"}</button></li>`}).join("");
sel.innerHTML=q.docs.map(d=>`<option value="${esc(d.id)}">${esc(d.data().nome)}</option>`).join("")}
L.onclick=e=>{const b=e.target.closest("button");if(!b)return;acao(b,async()=>{await updateDoc(doc(db,"tenants",b.dataset.id),{status:b.dataset.st});await auditar("tenant.status",{id:b.dataset.id,status:b.dataset.st});toast("Status atualizado.");await listar()})};
$("#nova").onsubmit=e=>{e.preventDefault();const f=e.target,id=f.id_.value.trim().toLowerCase();
if(!/^[a-z0-9-]{3,40}$/.test(id))return toast("Endereço: use 3 a 40 letras minúsculas, números ou hífen.","err");
acao($("button",f),async()=>{if((await getDoc(doc(db,"tenants",id))).exists())return toast("Este endereço já está em uso.","err");
await setDoc(doc(db,"tenants",id),{slug:id,nome:f.nome.value.trim(),descricao:"",status:"ativo",tema:{cor:f.cor.value,tema:"claro",estilo:"suave"},criadoEm:serverTimestamp()});
await auditar("tenant.criado",{id});f.reset();toast("Estabelecimento criado.");await listar()})};
$("#dono").onsubmit=e=>{e.preventDefault();const f=e.target;acao($("button",f),async()=>{
const q=await getDocs(query(collection(db,"users"),where("email","==",f.email.value.trim().toLowerCase()),limit(1)));
if(q.empty)return toast("Nenhuma conta com esse e-mail. A pessoa precisa se cadastrar primeiro.","err");
await setDoc(doc(db,"acessos",q.docs[0].id),{tenantId:sel.value,papel:"proprietario"});await auditar("acesso.concedido",{uid:q.docs[0].id,tenantId:sel.value});f.reset();toast("Proprietário vinculado.")})};
await listar()};

/* ==== 6f. AVALIAÇÕES ==== */
async function rev(t){const q=await getDocs(query(collection(db,"tenants",t.id,"avaliacoes"),where("publica","==",true),limit(6)));
return q.empty?"":`<div class="grid" style="width:100%;margin-top:2rem">${q.docs.map(d=>{const a=d.data();return`<figure class="card" style="margin:0"><strong>${"★".repeat(a.nota)}</strong><p>${esc(a.txt)}</p><figcaption class="mute">${esc(a.nome)} · ${esc(a.profNome)}</figcaption></figure>`}).join("")}</div>`}
P.avaliacoes=async(t,s)=>{if(!exigir(s,["proprietario","equipe"],"avaliacoes"))return;const L=$("#lista");
async function lista(){const q=await getDocs(collection(db,"tenants",t.id,"avaliacoes")),l=q.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.em?.seconds||0)-(a.em?.seconds||0));
L.innerHTML=l.length?l.map(a=>`<li><span><strong>${"★".repeat(a.nota)}${"☆".repeat(5-a.nota)}</strong> ${esc(a.nome)} · ${esc(a.profNome)}<br><span class="mute">${esc(a.txt||"Sem comentário")}</span></span><button class="btn ghost" data-id="${a.id}" data-p="${!a.publica}">${a.publica?"Ocultar":"Publicar"}</button></li>`).join(""):`<li class="mute">Nenhuma avaliação recebida ainda.</li>`;
$("#media").textContent=l.length?`Média geral ${(l.reduce((n,a)=>n+a.nota,0)/l.length).toFixed(1)} em ${l.length} avaliações. Só as publicadas aparecem na página inicial.`:""}
L.onclick=e=>{const b=e.target.closest("button");if(b)acao(b,async()=>{await updateDoc(doc(db,"tenants",t.id,"avaliacoes",b.dataset.id),{publica:b.dataset.p==="true"});await lista()})};await lista()};

/* ==== 6g. INDICADORES (ECharts), FINANCEIRO E CSV ==== */
const carregarEcharts=()=>window.echarts?Promise.resolve():new Promise((ok,no)=>{const x=document.createElement("script");x.src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js";x.onload=ok;x.onerror=()=>no({message_pt:"Não foi possível carregar os gráficos. Verifique a conexão."});document.head.append(x)});
P.indicadores=async(t,s)=>{if(!exigir(s,["proprietario"]))return;const de=$("#de"),ate=$("#ate");de.value=hoje().slice(0,8)+"01";ate.value=hoje();let L=[];
async function carregar(){$("#kpis").innerHTML=`<div class="skel"></div>`;const q=await getDocs(query(collection(db,"tenants",t.id,"agendamentos"),where("inicio",">=",de.value),where("inicio","<=",ate.value+"T23:59")));L=q.docs.map(d=>d.data());
const c=L.filter(a=>a.status==="concluido"),soma=x=>x.reduce((n,a)=>n+(Number(a.preco)-Number(a.desconto||0)),0);
if(!L.length){$("#kpis").innerHTML=`<p class="mute">Sem agendamentos neste período.</p>`;["c1","c2","prof"].forEach(i=>$("#"+i).innerHTML="");return}
const k=(l,v)=>`<div class="card"><span class="mute">${l}</span><div class="kpi">${v}</div></div>`;
$("#kpis").innerHTML=k("Agendamentos",L.length)+k("Concluídos",c.length)+k("Cancelados e faltas",L.filter(a=>["cancelado","ausente"].includes(a.status)).length)+k("A realizar",brl(soma(L.filter(a=>a.status==="agendado"))))+k("Realizado",brl(soma(c)));
await carregarEcharts();const cor=getComputedStyle(document.documentElement).getPropertyValue("--brand").trim();
const g=(id,o)=>{const e=echarts.getInstanceByDom($("#"+id))||echarts.init($("#"+id));e.setOption({color:[cor],grid:{left:48,right:12,top:40,bottom:30},tooltip:{trigger:"axis"},...o},true)};
const por=(f)=>c.reduce((m,a)=>(m[f(a)]=(m[f(a)]||0)+(Number(a.preco)-Number(a.desconto||0)),m),{}),dia=por(a=>a.inicio.slice(0,10)),sv=por(a=>a.servicoNome),ks=Object.keys(dia).sort();
g("c1",{title:{text:"Realizado por dia",textStyle:{fontSize:14}},xAxis:{type:"category",data:ks},yAxis:{type:"value"},series:[{type:"line",smooth:true,data:ks.map(x=>dia[x])}]});
g("c2",{title:{text:"Receita por serviço",textStyle:{fontSize:14}},xAxis:{type:"category",data:Object.keys(sv)},yAxis:{type:"value"},series:[{type:"bar",data:Object.values(sv)}]});
const pf={};c.forEach(a=>{const p=pf[a.profNome]??={n:0,v:0,com:0};p.n++;p.v+=(Number(a.preco)-Number(a.desconto||0));p.com+=(Number(a.preco)-Number(a.desconto||0))*(a.comissaoPct||0)/100});
$("#prof").innerHTML=Object.entries(pf).map(([n,p])=>`<li><span><strong>${esc(n)}</strong><br><span class="mute">${p.n} atendimentos · ${brl(p.v)}</span></span><strong>Comissão ${brl(p.com)}</strong></li>`).join("")||`<li class="mute">Nenhum atendimento concluído no período.</li>`}
de.onchange=ate.onchange=()=>acao(de,carregar);
$("#csv").onclick=()=>{if(!L.length)return toast("Não há dados no período.","err");const r=[["data","hora","cliente","servico","profissional","unidade","preco","comissao_pct","status"],...L.map(a=>[a.inicio.slice(0,10),a.inicio.slice(11),a.clienteNome,a.servicoNome,a.profNome,a.unidadeNome,a.preco,a.comissaoPct??"",a.status])];
const l=document.createElement("a");l.href=URL.createObjectURL(new Blob(["\ufeff"+r.map(x=>x.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";")).join("\n")],{type:"text/csv"}));l.download=`agendamentos_${de.value}_${ate.value}.csv`;l.click()};
await carregar()};

/* ==== 6h. PWA E IDENTIDADE (favicon, ícone e manifesto gerados da logo da loja) ==== */
function pwa(t){const l=t.tema?.logo;if(!l||pwa.k===t.id+l.length)return;pwa.k=t.id+l.length;const i=new Image();
i.onload=()=>{const ic=z=>{const c=document.createElement("canvas");c.width=c.height=z;c.getContext("2d").drawImage(i,0,0,z,z);return c.toDataURL("image/png")},cor=t.tema.cor||"#23395b";
$("#fav").href=ic(64);$("#ati").href=ic(180);$("meta[name=theme-color]").content=cor;
$("#mf").href=URL.createObjectURL(new Blob([JSON.stringify({name:t.nome,short_name:t.nome.slice(0,12),start_url:location.origin+location.pathname+"?s="+t.id,scope:location.origin+location.pathname,display:"standalone",background_color:cor,theme_color:cor,icons:[192,512].map(z=>({src:ic(z),sizes:z+"x"+z,type:"image/png"}))})],{type:"application/manifest+json"}))};i.src=l}

/* ==== 6b. IMAGENS (plano A: reduzidas no navegador e guardadas no próprio Firestore) ==== */
const imgData=(f,max=480,png)=>new Promise((ok,no)=>{const i=new Image(),u=URL.createObjectURL(f);i.onload=()=>{const k=Math.min(1,max/Math.max(i.width,i.height)),c=document.createElement("canvas");c.width=i.width*k;c.height=i.height*k;c.getContext("2d").drawImage(i,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c.toDataURL(png?"image/png":"image/jpeg",.78))};i.onerror=no;i.src=u});

/* ==== 6c. CADASTROS DO PROPRIETÁRIO (unidades, profissionais, serviços) ==== */
const CFG={unidades:{t:"Unidades",f:[["nome","Nome"],["endereco","Endereço"],["telefone","Telefone"],["capacidade","Atendimentos simultâneos","number"],["abre","Abre","time"],["fecha","Fecha","time"]]},
profissionais:{t:"Profissionais",f:[["nome","Nome"],["unidadeId","Unidade","ref"],["comissao","Comissão (%)","number"],["fixo","Remuneração fixa mensal (R$)","number"],["foto","Foto","img"]]},
servicos:{t:"Serviços",f:[["nome","Nome"],["preco","Preço (R$)","number"],["duracao","Duração (minutos)","number"]]}};
const INFO={unidades:x=>`${x.abre} às ${x.fecha} · ${x.capacidade} atendimento(s) simultâneo(s)`,profissionais:x=>`Comissão de ${x.comissao||0}%`,servicos:x=>`${brl(x.preco)} · ${x.duracao} min`};
async function crud(t,s,k){if(!exigir(s,k==="unidades"?["proprietario"]:["proprietario","equipe"],k))return;const C=CFG[k],col=collection(db,"tenants",t.id,k),F=$("#f"),L=$("#lista");let ed=null,docs=new Map();
const un=k==="profissionais"?(await getDocs(collection(db,"tenants",t.id,"unidades"))).docs:[];$("#carga").remove();$("#tit").textContent=C.t;
const form=()=>{F.innerHTML=C.f.map(([n,l,ty])=>`<label>${l}`+(ty==="ref"?`<select name="${n}" required>${un.map(d=>`<option value="${d.id}">${esc(d.data().nome)}</option>`).join("")}</select>`:ty==="img"?`<input name="${n}" type="file" accept="image/*">`:`<input name="${n}" type="${ty||"text"}" ${ty==="number"?'step="any" min="0"':""} ${n==="nome"?"required":""}>`)+`</label>`).join("")+`<button class="btn">${ed?"Salvar alterações":"Adicionar"}</button> <button class="btn ghost" type="button" id="novo">Limpar</button>`;
if(ed)C.f.forEach(([n,,ty])=>{if(ty!=="img")F[n].value=docs.get(ed)[n]??""});$("#novo").onclick=()=>{ed=null;form()}};
async function lista(){const q=await getDocs(col);docs=new Map(q.docs.map(d=>[d.id,d.data()]));
L.innerHTML=q.empty?`<li class="mute">Nada cadastrado ainda. Use o formulário para adicionar.</li>`:q.docs.map(d=>{const x=d.data();return`<li><span>${x.foto?`<img src="${x.foto}" alt="" width="40" height="40" style="border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:.6rem">`:""}<strong>${esc(x.nome)}</strong>${x.ativo===false?' <span class="tag off">pausado</span>':""}<br><span class="mute">${INFO[k](x)}</span></span><span><button class="btn ghost" data-p="${d.id}">${x.ativo===false?"Ativar":"Pausar"}</button><button class="btn ghost" data-e="${d.id}">Editar</button> <button class="btn ghost" data-x="${d.id}">Excluir</button></span></li>`}).join("")}
L.onclick=e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.p)return acao(b,async()=>{await updateDoc(doc(col,b.dataset.p),{ativo:docs.get(b.dataset.p).ativo===false});await lista()});if(b.dataset.e){ed=b.dataset.e;form();F.scrollIntoView({behavior:"smooth"})}
else acao(b,async()=>{if(!confirm("Excluir este item? Agendamentos já feitos são mantidos."))return;await deleteDoc(doc(col,b.dataset.x));toast("Excluído.");await lista()})};
F.onsubmit=e=>{e.preventDefault();acao($("button",F),async()=>{const v={};for(const[n,,ty]of C.f){if(ty==="img"){v[n]=F[n].files[0]?await imgData(F[n].files[0]):(ed?docs.get(ed)[n]||"":"")}else v[n]=ty==="number"?Number(F[n].value||0):F[n].value.trim()}
if(k==="unidades"&&(!(v.capacidade>=1)||!v.abre||!v.fecha||v.abre>=v.fecha))return toast("Informe capacidade (mínimo 1) e um horário de abertura anterior ao de fechamento.","err");
if(k==="servicos"&&(!(v.duracao>=15)||!(v.preco>=0)))return toast("Informe preço e duração de pelo menos 15 minutos.","err");
if(k==="profissionais"&&!v.unidadeId)return toast("Cadastre uma unidade antes.","err");
ed?await updateDoc(doc(col,ed),v):await addDoc(col,{...v,ativo:true,criadoEm:serverTimestamp()});toast("Salvo.");ed=null;form();await lista()})};
form();await lista()}
P.unidades=(t,s)=>crud(t,s,"unidades");P.profissionais=(t,s)=>crud(t,s,"profissionais");P.servicos=(t,s)=>crud(t,s,"servicos");

/* ==== 6d. AGENDAMENTO (reserva atômica via transação + travas no Firestore) ==== */
const pad=n=>String(n).padStart(2,"0"),hm=m=>pad(m/60|0)+":"+pad(m%60),mins=h=>+h.slice(0,2)*60+ +h.slice(3);
const hoje=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const brl=v=>Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const fmt=i=>new Date(i).toLocaleString("pt-BR",{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
async function cancelar(tid,id,novo="cancelado"){const ar=doc(db,"tenants",tid,"agendamentos",id);await runTransaction(db,async tx=>{const a=await tx.get(ar),x=a.data();if(x.status!=="agendado")return;
const cr=x.caps.map(i=>doc(db,"tenants",tid,"cap",i)),K=await Promise.all(cr.map(r=>tx.get(r)));x.locks.forEach(i=>tx.delete(doc(db,"tenants",tid,"locks",i)));
cr.forEach((r,i)=>tx.set(r,{n:Math.max(0,(K[i].data()?.n||1)-1),u:x.unidadeId,d:x.inicio.slice(0,10)}));tx.update(ar,{status:novo})})}
P.agendar=async(t,s)=>{if(!exigir(s,["cliente"]))return;const A=$("#app");
if(!t||t.suspenso){A.innerHTML=`<p class="lead">Escolha um estabelecimento na <a data-l="index.html">página inicial</a>.</p>`;return}
const C=n=>collection(db,"tenants",t.id,n),ler=async n=>(await getDocs(C(n))).docs.map(d=>({id:d.id,...d.data()}));
const[U0,PR,SV,BL]=await Promise.all([ler("unidades"),ler("profissionais"),ler("servicos"),ler("bloqueios")]);const U=U0.filter(u=>u.ativo!==false);let ML=[];
const meus=async()=>{const q=await getDocs(query(C("agendamentos"),where("clienteUid","==",s.u.uid)));
if(t.fidelidade?.ativo){const m=t.fidelidade.meta||10,f=(await getDoc(doc(C("fidelidade"),s.u.uid))).data()||{},n=Math.min(f.n||0,m);
$("#fid").innerHTML=`<div class="card fid"><strong>Cartão fidelidade${t.fidelidade.brinde?" · "+esc(t.fidelidade.brinde):""}</strong><div class="selos" role="img" aria-label="${n} de ${m} carimbos">${Array.from({length:m},(_,i)=>`<i class="${i<n?"on":""}"></i>`).join("")}</div><span class="mute">${n} de ${m} atendimentos${f.brindes?` · <strong>${f.brindes} brinde(s) disponível(is)</strong>`:""}</span></div>`}else $("#fid").innerHTML="";
const l=q.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.inicio.localeCompare(a.inicio));ML=l;const av=new Set((await getDocs(query(C("avaliacoes"),where("cli","==",s.u.uid)))).docs.map(d=>d.id));
$("#meus").innerHTML=l.length?l.map(a=>`<li><span><strong>${esc(a.servicoNome)}</strong> com ${esc(a.profNome)}<br><span class="mute">${esc(fmt(a.inicio))} · ${esc(a.unidadeNome)}</span></span><span><span class="tag ${a.status==="cancelado"?"off":""}">${a.status}</span>${a.status==="agendado"&&new Date(a.inicio)>new Date()?` <button class="btn ghost" data-c="${a.id}">Cancelar</button>`:""}${a.status==="concluido"&&!av.has(a.id)?` <button class="btn ghost" data-v="${a.id}">Avaliar</button>`:""}</span></li>`).join(""):`<li class="mute">Você ainda não tem agendamentos.</li>`};
$("#meus").onclick=e=>{const v=e.target.closest("[data-v]");if(v)return acao(v,async()=>{const a=ML.find(x=>x.id===v.dataset.v),nota=Math.round(+prompt("Nota de 1 a 5 para o atendimento:"));if(!(nota>=1&&nota<=5))return toast("Informe uma nota de 1 a 5.","err");const txt=(prompt("Comentário (opcional):")||"").trim().slice(0,500);await setDoc(doc(C("avaliacoes"),a.id),{cli:s.u.uid,nome:(s.u.displayName||"Cliente").split(" ")[0],profId:a.profId,profNome:a.profNome,nota,txt,publica:false,em:serverTimestamp()});toast("Obrigado pela avaliação!");await meus()});
const b=e.target.closest("[data-c]");if(b)acao(b,async()=>{if(!confirm("Cancelar este agendamento?"))return;await cancelar(t.id,b.dataset.c);toast("Agendamento cancelado.");await meus()})};
if(!U.length||!SV.length){A.innerHTML=`<p class="lead">Este estabelecimento ainda não liberou horários.</p>`;return meus()}
/* assistente em etapas: unidade, profissional, serviço, data, horário */
const unica=U.length===1,st={step:unica?1:0,u:unica?U[0].id:"",p:null,s:"",d:"",sl:null,lista:[]},NOMES=["Unidade","Profissional","Serviço","Data","Horário"];
const profs=()=>PR.filter(p=>p.unidadeId===st.u&&p.ativo!==false),sv=()=>SV.find(x=>x.id===st.s);
const X=t.textos||{},TM=t.tema||{};const dias=[...Array(28)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)});
const cl=(sel,any)=>sel?"sel":any?"dim":"";
const opt=(k,id,h,sel,any)=>`<button type="button" class="opt ${cl(sel,any)}" data-k="${k}" data-id="${esc(id)}" aria-pressed="${sel}">${h}</button>`;
const pc=(id,nome,foto,sel)=>`<button type="button" class="pcard ${cl(sel,st.p!==null)}" data-k="p" data-id="${esc(id)}" aria-pressed="${sel}"><span class="arch${id===""?" mix":""}">${id===""?(profs().filter(x=>x.foto).slice(0,3).map(x=>`<img src="${x.foto}" alt="">`).join("")||`<i>✦</i>`):foto?`<img src="${foto}" alt="">`:`<i>${esc((nome[0]||"?").toUpperCase())}</i>`}<em class="tick">✓</em></span><strong>${esc(nome)}</strong></button>`;
const sumario=()=>{const c=[];if(st.step>0&&st.u&&!unica)c.push(`<span class="tg">${esc(U.find(x=>x.id===st.u)?.nome)}</span>`);
if(st.step>1&&st.p!==null){const x=PR.find(y=>y.id===st.p);c.push(`<span class="tg"><span class="av">${x?.foto?`<img src="${x.foto}" alt="">`:"✦"}</span>${esc(x?.nome||"Sem preferência")}</span>`)}
if(st.step>2&&st.s)c.push(`<span class="tg">${esc(sv().nome)}</span>`);if(st.step>3&&st.d)c.push(`<span class="tg">${esc(new Date(st.d+"T12:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short"}))}</span>`);
return c.length?`<div class="sumario">${c.join("")}</div>`:""};
const ir=n=>{document.documentElement.dataset.dir=n<st.step?"back":"fwd";vt(()=>{st.step=n;draw()})};
const dx=d=>new Date(d+"T12:00"),wd=d=>dx(d).toLocaleDateString("pt-BR",{weekday:"short"}),mo=d=>dx(d).toLocaleDateString("pt-BR",{month:"short"}),rel=d=>d===dias[0]?"Hoje":d===dias[1]?"Amanhã":wd(d);
const dataHTML=()=>{const m=TM.dataModelo||"faixa",b=(d,c,h)=>`<button type="button" class="${c} ${st.d===d?"sel":""}" data-k="d" data-id="${d}" aria-pressed="${st.d===d}">${h}</button>`;
if(m==="calendario")return`<div class="cal">${["D","S","T","Q","Q","S","S"].map(x=>`<span class="cal-h">${x}</span>`).join("")}${"<span></span>".repeat(dx(dias[0]).getDay())}${dias.map(d=>b(d,"cal-d",`${d.slice(8)}${d.slice(8)==="01"||d===dias[0]?`<small>${mo(d)}</small>`:""}`)).join("")}</div>`;
if(m==="lista")return`<div class="dlist">${dias.map(d=>b(d,"dl",`<span>${rel(d)}</span><small>${d.slice(8)} de ${mo(d)}</small>`)).join("")}</div>`;
if(m==="destaque")return`<div class="days dest">${dias.map(d=>b(d,"dd",`<small>${wd(d)}</small><b>${d.slice(8)}</b><small>${mo(d)}</small>`)).join("")}</div>`;
if(m==="etiquetas")return`<div class="tags">${dias.map(d=>b(d,"chip",`${rel(d)} ${d.slice(8)}`)).join("")}</div>`;
return`<div class="days">${dias.map(d=>b(d,"day",`<small>${wd(d)}</small><b>${d.slice(8)}</b><small>${mo(d)}</small>`)).join("")}</div>`};
const horasHTML=out=>{const m=TM.horaModelo||"pilulas",L=out.map((o,i)=>[o,i]),b=(o,i,c)=>`<button type="button" class="${c}" data-k="h" data-id="${i}">${o.h}</button>`;
if(m==="grade")return`<div class="hgrade">${L.map(([o,i])=>b(o,i,"hq")).join("")}</div>`;
if(m==="periodos")return[["Manhã",0,12],["Tarde",12,18],["Noite",18,24]].map(([n,a,z])=>{const g=L.filter(([o])=>+o.h.slice(0,2)>=a&&+o.h.slice(0,2)<z);return g.length?`<h3 class="per">${n}</h3><div class="slots">${g.map(([o,i])=>b(o,i,"chip")).join("")}</div>`:""}).join("");
if(m==="lista")return`<div class="hlist">${L.map(([o,i])=>`<button type="button" class="hl" data-k="h" data-id="${i}"><b>${o.h}</b><span>Disponível</span></button>`).join("")}</div>`;
if(m==="trilho")return`<div class="trilho">${L.map(([o,i])=>b(o,i,"ht")).join("")}</div>`;
return`<div class="slots">${L.map(([o,i])=>b(o,i,"chip")).join("")}</div>`};
function draw(){const e=st.step,bar=`<ol class="steps">${NOMES.map((n,i)=>`<li class="${i<e?"feito":i===e?"atual":""}"><b>${i<e?"✓":i+1}</b><span>${n}</span></li>`).join("")}</ol>`;let p="";
if(e===0)p=`<h2>${esc(X.tu||"Onde você quer ser atendido?")}</h2><div class="opts">${U.map(u=>opt("u",u.id,`<strong>${esc(u.nome)}</strong><small>${esc(u.endereco||"")}</small>`,st.u===u.id,st.u)).join("")}</div>`;
if(e===1)p=`<h2>${esc(X.tp||"Com quem você prefere?")}</h2><div class="profs ${{tilt:"t3d",coverflow:"cflow",pilha:"deck"}[TM.fotoLayout]||""}">${pc("","Sem preferência","",st.p==="")}${profs().map(x=>pc(x.id,x.nome,x.foto,st.p===x.id)).join("")}</div>`;
if(e===2)p=`<h2>${esc(X.ts||"Qual serviço você quer?")}</h2><div class="opts">${SV.filter(v=>v.ativo!==false).map(v=>opt("s",v.id,`<strong>${esc(v.nome)}</strong><small>${brl(v.preco)}</small>`,st.s===v.id,st.s)).join("")}</div>`;
if(e===3)p=`<h2>${esc(X.td||"Qual dia fica melhor?")}</h2>`+dataHTML();
if(e===4)p=`<h2>${esc(X.th||"Escolha o horário")}</h2><div id="hs"></div><div id="res"></div>`;
A.innerHTML=bar+sumario()+`<div class="panel">${p}</div>`+(e>(unica?1:0)?`<button class="btn ghost voltar" data-back>Voltar</button>`:"");const cf=$(".profs.cflow");if(cf){coverflow(cf);(cf.querySelector(".sel")||cf.children[Math.min(1,cf.children.length-1)])?.scrollIntoView({inline:"center",block:"nearest"})}if(e===4)slots()}
async function slots(){const H=$("#hs"),un=U.find(x=>x.id===st.u),v=sv(),n=Math.ceil(v.duracao/30);H.innerHTML=`<div class="skel"></div>`;
const q=[where("u","==",un.id),where("d","==",st.d)],[lk,cp]=await Promise.all([getDocs(query(C("locks"),...q)),getDocs(query(C("cap"),...q))]),Lk=new Set(lk.docs.map(d=>d.id)),K={};cp.docs.forEach(d=>K[d.id]=d.data().n);
const ps=profs().filter(p=>st.p===""||p.id===st.p),out=[];
for(let m=mins(un.abre);m+v.duracao<=mins(un.fecha);m+=30){if(new Date(`${st.d}T${hm(m)}`)<=new Date())continue;const us=[...Array(n)].map((_,i)=>hm(m+30*i));
if(us.some(h=>(K[`${un.id}_${st.d}_${h}`]||0)>=un.capacidade))continue;const livres=ps.filter(p=>us.every(h=>!Lk.has(`${p.id}_${st.d}_${h}`))&&!BL.some(b=>b.data===st.d&&(!b.unidadeId||b.unidadeId===un.id)&&(!b.profId||b.profId===p.id)&&(b.todoDia||(mins(b.de)<m+v.duracao&&mins(b.ate)>m))));if(livres.length)out.push({h:hm(m),us,livres})}
st.lista=out;H.innerHTML=out.length?horasHTML(out):`<p class="mute">Sem horários livres neste dia. Volte e escolha outra data ou outro profissional.</p>`}
async function reservar(){const un=U.find(x=>x.id===st.u),v=sv(),sl=st.sl;
for(const p of sl.livres){try{await runTransaction(db,async tx=>{const lr=sl.us.map(h=>doc(C("locks"),`${p.id}_${st.d}_${h}`)),cr=sl.us.map(h=>doc(C("cap"),`${un.id}_${st.d}_${h}`));
const L=await Promise.all(lr.map(r=>tx.get(r))),K=await Promise.all(cr.map(r=>tx.get(r)));
if(L.some(x=>x.exists())||K.some(x=>(x.data()?.n||0)>=un.capacidade))throw Object.assign(new Error("conflito"),{conflito:1});
lr.forEach(r=>tx.set(r,{cli:s.u.uid,u:un.id,d:st.d}));cr.forEach((r,i)=>tx.set(r,{n:(K[i].data()?.n||0)+1,u:un.id,d:st.d}));
tx.set(doc(C("agendamentos")),{clienteUid:s.u.uid,clienteNome:s.u.displayName||s.u.email,unidadeId:un.id,unidadeNome:un.nome,profId:p.id,profNome:p.nome,servicoId:v.id,servicoNome:v.nome,preco:v.preco,dur:v.duracao,inicio:`${st.d}T${sl.h}`,status:"agendado",cupom:st.cupom||"",desconto:st.desc||0,indicadoPor:(localStorage.getItem("ref")||"")===s.u.uid?"":localStorage.getItem("ref")||"",locks:lr.map(r=>r.id),caps:cr.map(r=>r.id),criadoEm:serverTimestamp()})});return p}
catch(e){if(!e.conflito)throw e}}throw{message_pt:"Esse horário acabou de ser ocupado. Escolha outro."}}
A.onclick=e=>{const b=e.target.closest("button");if(!b)return;
if(b.hasAttribute("data-back"))return ir(st.step-1);
if(b.hasAttribute("data-novo")){Object.assign(st,{step:unica?1:0,p:null,s:"",d:"",sl:null,cupom:"",desc:0});return draw()}
const{k,id}=b.dataset;
if(k==="u"){st.u=id;st.p=null;marcar(b);setTimeout(()=>ir(1),380)}
if(k==="p"){st.p=id;marcar(b);b.scrollIntoView({inline:"center",block:"nearest",behavior:"smooth"});setTimeout(()=>ir(2),380)}
if(k==="s"){st.s=id;st.cupom="";st.desc=0;marcar(b);setTimeout(()=>ir(3),380)}
if(k==="d"){st.d=id;marcar(b);setTimeout(()=>ir(4),380)}
if(k==="h"){st.sl=st.lista[id];document.querySelectorAll("#hs [data-k=h]").forEach(x=>x.classList.toggle("sel",x===b));const v=sv();
$("#res").innerHTML=`<div class="card resumo"><p style="margin:0 0 .8rem"><strong>${esc(v.nome)}</strong> · ${esc(fmt(st.d+"T"+st.sl.h))}<br><span class="mute">${st.p===""?"Profissional disponível no horário":"Com "+esc(PR.find(x=>x.id===st.p)?.nome||"")} · <span id="pf">${brl(v.preco-(st.desc||0))}</span></span></p><div class="cup"><input id="cup" placeholder="Cupom de desconto" value="${esc(st.cupom||"")}" aria-label="Cupom"><button class="btn ghost sm" id="aplicar" type="button">Aplicar</button></div><p class="mute" id="cupmsg"></p><button class="btn" id="ok">Confirmar agendamento</button></div>`;$("#res").scrollIntoView({behavior:"smooth",block:"nearest"})}
if(b.id==="aplicar")return acao(b,async()=>{const c=$("#cup").value.trim().toUpperCase().replace(/[^A-Z0-9]/g,"");if(!c)return;const d=await getDoc(doc(C("promocoes"),c)),p=d.data(),v=sv();
if(!d.exists()||p.ativo===false||(p.validade&&p.validade<hoje())||(p.emailCliente&&p.emailCliente!==(s.u.email||"").toLowerCase())){st.cupom="";st.desc=0;$("#pf").textContent=brl(v.preco);$("#cupmsg").textContent="Cupom inválido, expirado ou de outro cliente.";return}
st.cupom=c;st.desc=Math.min(v.preco,p.tipo==="percent"?v.preco*p.valor/100:p.valor);$("#pf").textContent=brl(v.preco-st.desc);$("#cupmsg").textContent="Cupom aplicado: -"+brl(st.desc)});
if(b.id==="ok")acao(b,async()=>{const p=await reservar();A.innerHTML=`<div class="sucesso"><div class="ok">✓</div><h2>Agendado!</h2><p class="lead" style="margin:0 auto 1rem">${esc(p.nome)} · ${esc(fmt(st.d+"T"+st.sl.h))}</p><button class="btn ghost" data-novo>Fazer outro agendamento</button></div>`;await meus()})};
if(matchMedia("(hover:hover)").matches){const alvo=e=>e.target.closest(".pcard")?.querySelector(".arch");
A.onpointermove=e=>{const a=alvo(e);if(!a)return;const r=a.getBoundingClientRect();a.style.setProperty("--px",((e.clientX-r.left)/r.width-.5)*2);a.style.setProperty("--py",((e.clientY-r.top)/r.height-.5)*2)};
A.onpointerout=e=>{const a=alvo(e);a?.style.removeProperty("--px");a?.style.removeProperty("--py")}}
const extras=async()=>{const a=await getDocs(C("avisos")),vistos=JSON.parse(localStorage.getItem("av_"+t.id)||"[]");
$("#avisos").innerHTML=a.docs.filter(d=>!vistos.includes(d.id)).sort((x,y)=>(y.data().em?.seconds||0)-(x.data().em?.seconds||0)).slice(0,3).map(d=>`<div class="aviso"><div><strong>${esc(d.data().titulo)}</strong><p>${esc(d.data().texto)}</p></div><button class="ibtn" data-fx="${d.id}" aria-label="Dispensar aviso">×</button></div>`).join("");
$("#indic").innerHTML=t.indicacao?.ativo?`<div class="card fid"><strong>Indique um amigo</strong><p class="mute" style="margin:.3rem 0 .6rem">Quando seu amigo concluir o primeiro atendimento, você ganha ${t.indicacao.bonus||1} carimbo(s) no cartão.</p><button class="btn ghost sm" id="ind" type="button">Copiar meu link</button></div>`:""};
$("#avisos").onclick=e=>{const b=e.target.closest("[data-fx]");if(!b)return;const v=JSON.parse(localStorage.getItem("av_"+t.id)||"[]");v.push(b.dataset.fx);localStorage.setItem("av_"+t.id,JSON.stringify(v));b.closest(".aviso").remove()};
$("#indic").onclick=e=>{if(e.target.closest("#ind"))navigator.clipboard?.writeText(`${location.origin}${location.pathname}?s=${t.id}&ref=${s.u.uid}`).then(()=>toast("Link copiado. Envie para seu amigo."),()=>toast("Não foi possível copiar o link.","err"))};
inclinar(A);draw();await Promise.all([meus(),extras()])};

/* ==== 6e. AGENDA DO PROPRIETÁRIO + FIDELIDADE ==== */
P.ajustes=async(t,s)=>{if(!exigir(s,["proprietario"]))return;
const tx=$("#txt"),DEF={tu:"Onde você quer ser atendido?",tp:"Com quem você prefere?",ts:"Qual serviço você quer?",td:"Qual dia fica melhor?",th:"Escolha o horário"};
Object.keys(DEF).forEach(k=>{tx[k].placeholder=DEF[k];tx[k].value=t.textos?.[k]||""});
tx.onsubmit=e=>{e.preventDefault();acao($("button",tx),async()=>{const textos={};Object.keys(DEF).forEach(k=>{if(tx[k].value.trim())textos[k]=tx[k].value.trim().slice(0,60)});await updateDoc(doc(db,"tenants",t.id),{textos});t.textos=textos;toast("Textos salvos.")})};
const ff=$("#fid");ff.ativo.checked=!!t.fidelidade?.ativo;ff.meta.value=t.fidelidade?.meta||10;ff.brinde.value=t.fidelidade?.brinde||"";
ff.onsubmit=e=>{e.preventDefault();acao($("button",ff),async()=>{const fidelidade={ativo:ff.ativo.checked,meta:Math.max(2,Math.round(+ff.meta.value||10)),brinde:ff.brinde.value.trim()};await updateDoc(doc(db,"tenants",t.id),{fidelidade});t.fidelidade=fidelidade;toast("Fidelidade atualizada.")})};
const ii=$("#ind");ii.ativo.checked=!!t.indicacao?.ativo;ii.bonus.value=t.indicacao?.bonus||1;
ii.onsubmit=e=>{e.preventDefault();acao($("button",ii),async()=>{const indicacao={ativo:ii.ativo.checked,bonus:Math.max(1,Math.round(+ii.bonus.value||1))};await updateDoc(doc(db,"tenants",t.id),{indicacao});t.indicacao=indicacao;toast("Indicações atualizadas.")})};
};
P.bloqueios=async(t,s)=>{if(!exigir(s,["proprietario","equipe"],"bloqueios"))return;const C=n=>collection(db,"tenants",t.id,n),ler=async n=>(await getDocs(C(n))).docs.map(d=>({id:d.id,...d.data()})),F=$("#f"),L=$("#lista");
const[U1,PR]=await Promise.all([ler("unidades"),ler("profissionais")]),eq=s.papel==="equipe",U=eq?U1.filter(u=>(s.unidades||[]).includes(u.id)):U1;$("#carga").remove();
F.unidadeId.innerHTML=(eq?"":`<option value="">Todas as unidades</option>`)+U.map(u=>`<option value="${esc(u.id)}">${esc(u.nome)}</option>`).join("");
F.profId.innerHTML=`<option value="">Todos os profissionais</option>`+PR.map(p=>`<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join("");
F.data.min=F.fim.min=hoje();F.todo.onchange=()=>{F.de.disabled=F.ate.disabled=F.todo.checked};F.todo.onchange();
async function lista(){const b=(await ler("bloqueios")).filter(x=>x.data>=hoje()&&(!eq||U.some(u=>u.id===x.unidadeId))).sort((a,b)=>(a.data+(a.de||"")).localeCompare(b.data+(b.de||"")));
L.innerHTML=b.length?b.map(x=>`<li><span><strong>${esc(new Date(x.data+"T12:00").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"}))}</strong> · ${x.todoDia?"Dia inteiro":esc(x.de)+" às "+esc(x.ate)}<br><span class="mute">${esc(U.find(u=>u.id===x.unidadeId)?.nome||"Todas as unidades")} · ${esc(PR.find(p=>p.id===x.profId)?.nome||"Todos os profissionais")}</span></span><button class="btn ghost" data-x="${x.id}">Remover</button></li>`).join(""):`<li class="mute">Nenhum bloqueio futuro.</li>`}
L.onclick=e=>{const b=e.target.closest("[data-x]");if(b)acao(b,async()=>{await deleteDoc(doc(C("bloqueios"),b.dataset.x));await lista()})};
F.onsubmit=e=>{e.preventDefault();acao($("button",F),async()=>{const i=F.data.value,z=F.fim.value||i;if(!i||z<i)return toast("Informe uma data válida.","err");
if(!F.todo.checked&&(!F.de.value||!F.ate.value||F.de.value>=F.ate.value))return toast("O horário inicial precisa ser anterior ao final.","err");
const dias=[];for(let d=new Date(i+"T12:00");d<=new Date(z+"T12:00")&&dias.length<62;d.setDate(d.getDate()+1))dias.push(new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10));
for(const data of dias)await addDoc(C("bloqueios"),{unidadeId:F.unidadeId.value,profId:F.profId.value,data,todoDia:F.todo.checked,de:F.todo.checked?"":F.de.value,ate:F.todo.checked?"":F.ate.value});
toast(`${dias.length} bloqueio(s) criado(s).`);F.reset();F.todo.onchange();await lista()})};await lista()};

P.promocoes=async(t,s)=>{if(!exigir(s,["proprietario"]))return;const C=n=>collection(db,"tenants",t.id,n),F=$("#f"),FA=$("#fa"),L=$("#lista"),LA=$("#lavisos"),M=new Map();
async function lista(){const[p,a]=await Promise.all([getDocs(C("promocoes")),getDocs(C("avisos"))]);p.docs.forEach(d=>M.set(d.id,d.data()));
L.innerHTML=p.empty?`<li class="mute">Nenhuma promoção criada.</li>`:p.docs.map(d=>{const x=d.data();return`<li><span><strong>${esc(x.titulo)}</strong> ${x.ativo===false?'<span class="tag off">pausada</span>':""}<br><span class="mute">${x.tipo==="percent"?x.valor+"%":brl(x.valor)} de desconto${x.codigo?" · cupom "+esc(x.codigo):""}${x.validade?" · até "+esc(x.validade):""}${x.emailCliente?" · só para "+esc(x.emailCliente):""}${x.destaqueHome?" · na tela inicial":""}</span></span><span><button class="btn ghost" data-p="${d.id}">${x.ativo===false?"Ativar":"Pausar"}</button><button class="btn ghost" data-x="${d.id}">Excluir</button></span></li>`}).join("");
LA.innerHTML=a.empty?`<li class="mute">Nenhum aviso enviado.</li>`:a.docs.map(d=>`<li><span><strong>${esc(d.data().titulo)}</strong><br><span class="mute">${esc(d.data().texto)}</span></span><button class="btn ghost" data-xa="${d.id}">Remover</button></li>`).join("")}
L.onclick=e=>{const b=e.target.closest("button");if(b)acao(b,async()=>{if(b.dataset.p)await updateDoc(doc(C("promocoes"),b.dataset.p),{ativo:M.get(b.dataset.p).ativo===false});else if(confirm("Excluir esta promoção?"))await deleteDoc(doc(C("promocoes"),b.dataset.x));await lista()})};
LA.onclick=e=>{const b=e.target.closest("[data-xa]");if(b)acao(b,async()=>{await deleteDoc(doc(C("avisos"),b.dataset.xa));await lista()})};
F.onsubmit=e=>{e.preventDefault();acao($("button",F),async()=>{const v=Number(F.valor.value),cod=F.codigo.value.toUpperCase().replace(/[^A-Z0-9]/g,"");
if(!F.titulo.value.trim()||!(v>0)||(F.tipo.value==="percent"&&v>100))return toast("Informe título e um valor válido (percentual até 100).","err");
const x={titulo:F.titulo.value.trim(),descricao:F.descricao.value.trim(),tipo:F.tipo.value,valor:v,codigo:cod,validade:F.validade.value,emailCliente:F.email.value.trim().toLowerCase(),destaqueHome:F.home.checked,ativo:true,criadoEm:serverTimestamp()};
if(cod){if((await getDoc(doc(C("promocoes"),cod))).exists())return toast("Já existe um cupom com esse código.","err");await setDoc(doc(C("promocoes"),cod),x)}else await addDoc(C("promocoes"),x);
toast("Promoção criada.");F.reset();await lista()})};
FA.onsubmit=e=>{e.preventDefault();acao($("button",FA),async()=>{if(!FA.titulo.value.trim()||!FA.texto.value.trim())return toast("Preencha título e texto.","err");await addDoc(C("avisos"),{titulo:FA.titulo.value.trim().slice(0,80),texto:FA.texto.value.trim().slice(0,300),em:serverTimestamp()});toast("Aviso publicado para os clientes.");FA.reset();await lista()})};await lista()};

P.metas=async(t,s)=>{if(!exigir(s,["proprietario"]))return;const C=n=>collection(db,"tenants",t.id,n),F=$("#f"),L=$("#lista"),M=$("#mes");
const PR=(await getDocs(C("profissionais"))).docs.map(d=>({id:d.id,...d.data()}));F.profId.innerHTML=`<option value="">Equipe toda</option>`+PR.map(p=>`<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join("");M.value=F.mes.value=hoje().slice(0,7);
const bar=(l,p)=>`<div class="mbar"><span>${l}</span><div class="barra"><i style="width:${Math.min(100,p*100)}%"></i></div><b>${Math.round(p*100)}%</b></div>`;
async function lista(){if(!un){L.innerHTML=`<li class="mute">Selecione uma unidade para ver os agendamentos.</li>`;$("#resumo").innerHTML="";return}L.innerHTML=`<li><div class="skel"></div></li>`;const m=M.value,[ag,mt]=await Promise.all([getDocs(query(C("agendamentos"),where("inicio",">=",m+"-01"),where("inicio","<=",m+"-31T23:59"))),getDocs(query(C("metas"),where("mes","==",m)))]);
const c=ag.docs.map(d=>d.data()).filter(a=>a.status==="concluido"),liq=a=>Number(a.preco)-Number(a.desconto||0),metas=mt.docs.map(d=>({id:d.id,...d.data()}));
const dados=x=>{const k=x.profId?c.filter(a=>a.profId===x.profId):c,v=k.reduce((n,a)=>n+liq(a),0),at=k.length,pv=x.valor?v/x.valor:1,pa=x.atend?at/x.atend:1;return{v,at,pv,pa,ok:pv>=1&&pa>=1}};
L.innerHTML=metas.length?metas.map(x=>{const r=dados(x);return`<li class="meta"><div><strong>${x.profId?esc(PR.find(p=>p.id===x.profId)?.nome||"Profissional"):"Meta da equipe"}</strong> ${r.ok?'<span class="tag">meta batida</span>':""}${x.valor?bar("Faturamento "+brl(r.v)+" de "+brl(x.valor),r.pv):""}${x.atend?bar("Atendimentos "+r.at+" de "+x.atend,r.pa):""}<span class="mute">${x.bonus?"Bônus de "+brl(x.bonus)+(x.profId?"":" por profissional")+" ao bater a meta":"Sem bônus"}</span></div><button class="btn ghost" data-x="${x.id}">Remover</button></li>`}).join(""):`<li class="mute">Nenhuma meta definida para este mês.</li>`;
$("#rem").innerHTML=PR.map(p=>{const k=c.filter(a=>a.profId===p.id),com=k.reduce((n,a)=>n+liq(a)*(a.comissaoPct||0)/100,0),bon=metas.filter(x=>(!x.profId||x.profId===p.id)&&x.bonus&&dados(x).ok).reduce((n,x)=>n+Number(x.bonus),0),fix=Number(p.fixo||0);
return`<li><span><strong>${esc(p.nome)}</strong><br><span class="mute">Fixo ${brl(fix)} · Comissão ${brl(com)} · Bônus ${brl(bon)}</span></span><strong>${brl(fix+com+bon)}</strong></li>`}).join("")||`<li class="mute">Cadastre profissionais para ver a remuneração.</li>`}
M.onchange=lista;L.onclick=e=>{const b=e.target.closest("[data-x]");if(b)acao(b,async()=>{await deleteDoc(doc(C("metas"),b.dataset.x));await lista()})};
F.onsubmit=e=>{e.preventDefault();acao($("button",F),async()=>{const v=Number(F.valor.value||0),a=Number(F.atend.value||0);if(!v&&!a)return toast("Defina a meta de faturamento ou de atendimentos.","err");
await addDoc(C("metas"),{profId:F.profId.value,mes:F.mes.value,valor:v,atend:a,bonus:Number(F.bonus.value||0)});M.value=F.mes.value;toast("Meta criada.");await lista()})};await lista()};

const PERMS=[["agendamentos","Agenda"],["bloqueios","Bloqueios"],["avaliacoes","Avaliações"],["profissionais","Profissionais"],["servicos","Serviços"]];
const permHTML=(U,x={})=>`<div class="pw"${x.papel==="proprietario"?" hidden":""}><fieldset class="perm"><legend>Unidades</legend>${U.map(u=>`<label class="ck"><input type="checkbox" name="u" value="${esc(u.id)}"${(x.unidades||[]).includes(u.id)?" checked":""}>${esc(u.nome)}</label>`).join("")||'<span class="mute">Cadastre unidades primeiro.</span>'}</fieldset><fieldset class="perm"><legend>Pode acessar</legend>${PERMS.map(([k,l])=>`<label class="ck"><input type="checkbox" name="p" value="${k}"${k==="agendamentos"?" checked disabled":(x.permissoes||[]).includes(k)?" checked":""}>${l}</label>`).join("")}</fieldset></div>`;
const lerPerm=f=>({unidades:[...f.querySelectorAll("[name=u]:checked")].map(x=>x.value),permissoes:["agendamentos",...[...f.querySelectorAll("[name=p]:checked")].map(x=>x.value)]});
P.equipe=async(t,s)=>{if(!exigir(s,["proprietario","master"]))return;const adm=s.papel==="master",L=$("#lista"),LC=$("#lconv"),FC=$("#fc");let U=[],ac=[];
if(adm){const q=await getDocs(collection(db,"tenants"));$("#lj").innerHTML=q.docs.map(d=>`<option value="${esc(d.id)}">${esc(d.data().nome)}</option>`).join("");$("#ljw").hidden=false}
const tid=()=>adm?$("#lj").value:s.tenantId,admins=()=>ac.filter(x=>x.papel==="proprietario");
async function carregar(){const T=tid();if(!T){L.innerHTML=`<li class="mute">Crie um estabelecimento primeiro.</li>`;return}
const[a,c,u]=await Promise.all([getDocs(query(collection(db,"acessos"),where("tenantId","==",T))),getDocs(query(collection(db,"convites"),where("tenantId","==",T))),getDocs(collection(db,"tenants",T,"unidades"))]);
U=u.docs.map(d=>({id:d.id,...d.data()}));ac=a.docs.map(d=>({id:d.id,...d.data()}));
L.innerHTML=ac.length?ac.map(x=>`<li class="us"><form data-u="${x.id}"><div class="us-h"><span><strong>${esc(x.nome||x.email||"Usuário")}</strong>${x.id===s.u.uid?" (você)":""}<br><span class="mute">${esc(x.email||"")}</span></span><select name="papel" aria-label="Tipo de usuário"><option value="equipe"${x.papel==="equipe"?" selected":""}>Usuário da loja</option><option value="proprietario"${x.papel==="proprietario"?" selected":""}>Administrador</option></select></div>${permHTML(U,x)}<div class="us-a"><button class="btn sm">Salvar</button><button class="btn ghost sm" type="button" data-rm="${x.id}">Remover acesso</button></div></form></li>`).join(""):`<li class="mute">Nenhum usuário ainda.</li>`;
LC.innerHTML=c.empty?`<li class="mute">Nenhum convite pendente.</li>`:c.docs.map(d=>`<li><span><strong>${esc(d.data().email)}</strong><br><span class="mute">${d.data().papel==="proprietario"?"Administrador":"Usuário da loja"}</span></span><button class="btn ghost sm" data-cv="${esc(d.id)}">Cancelar</button></li>`).join("");
$("#fcu").innerHTML=permHTML(U,{papel:FC.papel.value})}
if(adm)$("#lj").onchange=carregar;
FC.papel.onchange=()=>{$("#fcu .pw").hidden=FC.papel.value==="proprietario"};
L.onchange=e=>{if(e.target.name==="papel")e.target.closest("form").querySelector(".pw").hidden=e.target.value==="proprietario"};
L.onsubmit=e=>{e.preventDefault();const f=e.target,id=f.dataset.u,papel=f.papel.value,{unidades,permissoes}=lerPerm(f);
if(papel==="equipe"&&!unidades.length)return toast("Escolha ao menos uma unidade.","err");
if(papel==="equipe"&&ac.find(x=>x.id===id)?.papel==="proprietario"&&admins().length<2)return toast("A loja precisa ter ao menos um administrador.","err");
acao($("button",f),async()=>{await updateDoc(doc(db,"acessos",id),{papel,unidades:papel==="equipe"?unidades:[],permissoes:papel==="equipe"?permissoes:[]});toast("Permissões atualizadas.");await carregar()})};
L.onclick=e=>{const b=e.target.closest("[data-rm]");if(!b)return;const id=b.dataset.rm;if(ac.find(x=>x.id===id)?.papel==="proprietario"&&admins().length<2)return toast("A loja precisa ter ao menos um administrador.","err");
acao(b,async()=>{if(!confirm("Remover o acesso desta pessoa?"))return;await deleteDoc(doc(db,"acessos",id));await carregar()})};
LC.onclick=e=>{const b=e.target.closest("[data-cv]");if(b)acao(b,async()=>{await deleteDoc(doc(db,"convites",b.dataset.cv));await carregar()})};
FC.onsubmit=e=>{e.preventDefault();const em=FC.email.value.trim().toLowerCase(),papel=FC.papel.value,{unidades,permissoes}=lerPerm(FC);if(papel==="equipe"&&!unidades.length)return toast("Escolha ao menos uma unidade.","err");
acao($("button",FC),async()=>{await setDoc(doc(db,"convites",em),{email:em,tenantId:tid(),papel,unidades:papel==="equipe"?unidades:[],permissoes:papel==="equipe"?permissoes:[],em:serverTimestamp()});toast("Convite criado. O acesso é liberado quando a pessoa entrar no app com este e-mail.");FC.reset();await carregar()})};
await carregar()};

P.agendamentos=async(t,s)=>{if(!exigir(s,["proprietario","equipe"],"agendamentos"))return;
const D=$("#d"),L=$("#lista"),meta=t.fidelidade?.meta||10;const UN0=(await getDocs(collection(db,"tenants",t.id,"unidades"))).docs.map(d=>({id:d.id,...d.data()})),UU=s.papel==="equipe"?UN0.filter(u=>(s.unidades||[]).includes(u.id)):UN0;
let un=localStorage.getItem("und_"+t.id);if(!UU.some(u=>u.id===un))un=UU.length===1?UU[0].id:"";
const pintar=()=>{$("#und").innerHTML=UU.length?UU.map(u=>`<button type="button" class="und-b${u.id===un?" sel":""}" data-u="${esc(u.id)}" aria-pressed="${u.id===un}">${esc(u.nome)}</button>`).join(""):`<span class="mute">Nenhuma unidade disponível para você.</span>`};pintar();
$("#und").onclick=e=>{const b=e.target.closest("[data-u]");if(!b)return;un=b.dataset.u;localStorage.setItem("und_"+t.id,un);pintar();lista()};
D.value=hoje();const dx=d=>new Date(d+"T12:00"),soma=x=>x.reduce((n,a)=>n+(Number(a.preco)-Number(a.desconto||0)),0);
const kp=l=>{const c=l.filter(a=>a.status==="concluido"),p=l.filter(a=>a.status==="agendado"),k=(r,v)=>`<div class="kpi-c"><span>${r}</span><b>${v}</b></div>`;
$("#resumo").innerHTML=k("Agendados",p.length)+k("Concluídos",c.length)+k("A receber",brl(soma(p)))+k("Realizado",brl(soma(c)));
$("#dtit").textContent=dx(D.value).toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})};
const mover=n=>{const d=dx(D.value);d.setDate(d.getDate()+n);D.value=new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);lista()};
$("#dprev").onclick=()=>mover(-1);$("#dnext").onclick=()=>mover(1);$("#dhoje").onclick=()=>{D.value=hoje();lista()};

async function lista(){L.innerHTML=`<li><div class="skel"></div></li>`;const q=await getDocs(query(collection(db,"tenants",t.id,"agendamentos"),where("unidadeId","==",un),where("inicio",">=",D.value),where("inicio","<=",D.value+"T23:59")));
const l=q.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.inicio.localeCompare(b.inicio));kp(l);
L.innerHTML=l.length?l.map(a=>`<li class="ag ${a.status}"><span><strong class="hora">${a.inicio.slice(11)}</strong> ${esc(a.clienteNome)}<br><span class="mute">${esc(a.servicoNome)} · ${esc(a.profNome)} · ${esc(a.unidadeNome)} · ${brl(a.preco)}</span></span><span><span class="tag ${["cancelado","ausente"].includes(a.status)?"off":""}">${a.status}</span>${a.status==="agendado"?` <button class="btn" data-a="concluido" data-id="${a.id}">Concluir</button> <button class="btn ghost" data-a="ausente" data-id="${a.id}">Faltou</button> <button class="btn ghost" data-a="cancelado" data-id="${a.id}">Cancelar</button>`:""}</span></li>`).join(""):`<li class="mute">Nenhum agendamento neste dia.</li>`}
async function concluir(id){const ar=doc(db,"tenants",t.id,"agendamentos",id);return runTransaction(db,async tx=>{const a=await tx.get(ar);if(a.data().status!=="agendado")return false;
const pr=(await tx.get(doc(db,"tenants",t.id,"profissionais",a.data().profId))).data()||{},fr=doc(db,"tenants",t.id,"fidelidade",a.data().clienteUid),f=(await tx.get(fr)).data()||{};const rf0=a.data().indicadoPor,cred=t.indicacao?.ativo&&rf0&&rf0!==a.data().clienteUid&&!f.visto,rr=cred?doc(db,"tenants",t.id,"fidelidade",rf0):null,rf=rr?((await tx.get(rr)).data()||{}):{};let n=(f.n||0)+1,b=f.brindes||0,ganhou=false;if(t.fidelidade?.ativo&&n>=(t.fidelidade.meta||10)){n-=meta;b++;ganhou=true}
tx.update(ar,{status:"concluido",comissaoPct:Number(pr.comissao||0)});tx.set(fr,{n,brindes:b,visto:true});if(rr){let rn=(rf.n||0)+(t.indicacao.bonus||1),rb=rf.brindes||0;const mm=t.fidelidade?.meta||10;while(t.fidelidade?.ativo&&rn>=mm){rn-=mm;rb++}tx.set(rr,{...rf,n:rn,brindes:rb})}return ganhou})}
D.onchange=lista;L.onclick=e=>{const b=e.target.closest("[data-a]");if(!b)return;acao(b,async()=>{const{a,id}=b.dataset;
if(a==="concluido"){toast(await concluir(id)?"Concluído. O cliente ganhou um brinde!":"Atendimento concluído.")}else{await cancelar(t.id,id,a);toast("Atualizado.")}await lista()})};await lista()};

/* ==== 7. ROTEADOR (app de página única: #/rota) ==== */
let exec=0;
const lim=(p,ms=10000)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no({message_pt:"O servidor demorou a responder. Verifique a internet e a configuração do Firebase."}),ms))]);
const aviso=(h,m)=>{if($("#boot"))$("#main").innerHTML=`<section class="hero"><h1>${h}</h1><p class="lead">${m}</p></section>`};
async function rotear(manter){if(!CONFIG_OK)return aviso("Falta configurar o Firebase","Abra app.js e cole a configuração do seu projeto Firebase na constante FIREBASE, no topo do arquivo.");const id=++exec,r=location.hash.replace(/^#\/?/,"")||"index",pg=P[r]?r:"index";
try{const s=await lim(sessao()),t=await lim(carregarTenant(s?.papel==="master"&&!s.previa&&!["index","agendar"].includes(pg)?false:s?.tenantId||null));if(id!==exec)return;TT=t;if(!t)aplicarTema();
await (manter?(f=>f()):vt)(()=>{$("#main").classList.remove("solto");$("#main").replaceChildren(document.getElementById("t-"+pg).content.cloneNode(true));document.body.dataset.page=pg;topo(t,s)});
const ln=()=>document.querySelectorAll("[data-l]").forEach(a=>a.href=href(a.dataset.l));ln();await P[pg](t,s);ln();if(!manter){scrollTo(0,0);$("#main").focus({preventScroll:true})}if(!PING&&parent!==window&&new URLSearchParams(location.search).get("vis")){PING=1;parent.postMessage({pronto:1},location.origin)}}
catch(e){console.error(e);aviso("Não foi possível carregar",esc(msgErro(e)));toast(msgErro(e),"err")}}
addEventListener("hashchange",()=>rotear());
let deb;addEventListener("message",e=>{if(e.origin!==location.origin||!e.data?.tema||!TT||!new URLSearchParams(location.search).get("vis"))return;OVR={id:TT.id,nome:e.data.nome,tema:e.data.tema};clearTimeout(deb);deb=setTimeout(()=>rotear(true),250)});
{const rf=new URLSearchParams(location.search).get("ref");if(rf)localStorage.setItem("ref",rf)}
rotear();
