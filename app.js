/* ==== 1. CONFIGURAÇÃO (a config web do Firebase é pública; a proteção está nas Security Rules) ==== */
import{initializeApp}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import{getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,GoogleAuthProvider,signInWithPopup,sendPasswordResetEmail,signOut,updateProfile}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import{getFirestore,doc,getDoc,setDoc,updateDoc,addDoc,collection,query,where,getDocs,limit,serverTimestamp,runTransaction,deleteDoc}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
const FIREBASE={apiKey:"COLE_AQUI",authDomain:"SEU_PROJETO.firebaseapp.com",projectId:"SEU_PROJETO",appId:"COLE_AQUI"};
const app=initializeApp(FIREBASE),auth=getAuth(app),db=getFirestore(app);

/* ==== 2. UTILITÁRIOS ==== */
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(msg,tipo="ok"){const t=document.createElement("div");t.className="toast "+tipo;t.setAttribute("role",tipo==="err"?"alert":"status");t.textContent=msg;$("#toasts").append(t);setTimeout(()=>t.remove(),4500)}
const ERROS={"auth/invalid-credential":"E-mail ou senha incorretos.","auth/email-already-in-use":"Este e-mail já tem conta. Entre ou recupere a senha.","auth/weak-password":"A senha precisa ter ao menos 6 caracteres.","auth/invalid-email":"E-mail inválido.","auth/popup-closed-by-user":"Login com Google cancelado.","auth/too-many-requests":"Muitas tentativas. Aguarde alguns minutos.","permission-denied":"Você não tem permissão para esta ação."};
const msgErro=e=>ERROS[e.code]||e.message_pt||"Não foi possível concluir. Tente novamente.";
async function acao(btn,fn){btn.setAttribute("aria-busy","true");try{await fn()}catch(e){console.error(e);toast(msgErro(e),"err")}finally{btn.removeAttribute("aria-busy")}}
function cpfValido(v){const d=v.replace(/\D/g,"");if(d.length!==11||/^(\d)\1+$/.test(d))return false;const dv=n=>{let s=0;for(let i=0;i<n;i++)s+=d[i]*(n+1-i);return(s*10%11)%10};return dv(9)==d[9]&&dv(10)==d[10]}

/* ==== 3. TEMA E ESTABELECIMENTO (multiloja via ?s=<id>) ==== */
const slug=()=>{const s=new URLSearchParams(location.search).get("s");if(s)localStorage.setItem("slug",s);return s||localStorage.getItem("slug")};
const href=p=>p+(slug()?"?s="+encodeURIComponent(slug()):"");
function lum(h){const[r,g,b]=[1,3,5].map(i=>parseInt(h.substr(i,2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*b}
function aplicarTema(t={}){const R=document.documentElement,c=/^#[0-9a-f]{6}$/i.test(t.cor)?t.cor:"#23395b";
R.style.setProperty("--brand",c);R.style.setProperty("--on-brand",lum(c)>.4?"#111":"#fff");
R.style.setProperty("--r",{reto:"4px",suave:"14px",redondo:"26px"}[t.estilo]||"14px");R.dataset.theme=t.tema==="escuro"?"dark":"light"}
async function carregarTenant(id){id=id||slug();if(!id)return null;const d=await getDoc(doc(db,"tenants",id));if(!d.exists())return null;
const t={id:d.id,...d.data()};if(t.status==="suspenso")return{...t,suspenso:true};aplicarTema(t.tema);document.title=t.nome;return t}

/* ==== 4. AUTENTICAÇÃO E PAPÉIS (papel vem de masters/ e acessos/, só o Master grava) ==== */
const sessao=()=>new Promise(r=>{const un=onAuthStateChanged(auth,async u=>{un();r(u?{u,...await papelDe(u)}:null)})});
async function papelDe(u){if((await getDoc(doc(db,"masters",u.uid))).exists())return{papel:"master"};
const a=await getDoc(doc(db,"acessos",u.uid));return a.exists()?{papel:a.data().papel,tenantId:a.data().tenantId}:{papel:"cliente"}}
const destino=s=>s.papel==="master"?"master.html":s.papel==="cliente"?"agendar.html":"agendamentos.html";
async function irParaPainel(){const u=auth.currentUser;location.replace(href(destino({...await papelDe(u)})))}
function exigir(s,papeis){if(!s){location.replace(href("login.html"));return false}if(!papeis.includes(s.papel)){location.replace(href(destino(s)));return false}return true}
async function garantirPerfil(u,extra={}){const r=doc(db,"users",u.uid);if(!(await getDoc(r)).exists())await setDoc(r,{nome:extra.nome||u.displayName||"",email:u.email,criadoEm:serverTimestamp(),...(extra.lgpdEm?{lgpdEm:serverTimestamp()}:{})})}
const entrarGoogle=async()=>{const c=await signInWithPopup(auth,new GoogleAuthProvider());await garantirPerfil(c.user,{lgpdEm:1})};
async function auditar(ev,dados){await addDoc(collection(db,"auditoria"),{ev,dados,uid:auth.currentUser.uid,em:serverTimestamp()})}

/* ==== 5. CABEÇALHO COMPARTILHADO ==== */
function topo(t,s){const n=[];
if(s?.papel==="cliente")n.push(["agendar.html","Agendar"],["cliente.html","Meu perfil"]);
if(s?.papel==="proprietario")n.push(["agendamentos.html","Agenda"],["unidades.html","Unidades"],["profissionais.html","Profissionais"],["servicos.html","Serviços"],["personalizacao.html","Aparência"]);
if(s?.papel==="master")n.push(["master.html","Plataforma"]);
$("#topo").innerHTML=`<a class="marca" data-l="index.html">${esc(t?.nome||"Agenda")}</a><nav aria-label="Principal">${n.map(([p,l])=>`<a data-l="${p}">${l}</a>`).join("")}${s?`<button class="btn ghost" id="sair">Sair</button>`:`<a data-l="login.html" class="btn ghost">Entrar</a>`}</nav>`;
$("#sair")?.addEventListener("click",async()=>{await signOut(auth);location.replace(href("index.html"))})}

/* ==== 6. PÁGINAS (cada uma só roda quando <body data-page="..."> coincide) ==== */
const P={};
P.index=async t=>{const h=$("#hero");
if(t?.suspenso)return h.innerHTML=`<h1>Estabelecimento indisponível</h1><p class="lead">Este estabelecimento está temporariamente fora do ar.</p>`;
if(t)return h.innerHTML=`<h1>${esc(t.nome)}</h1><p class="lead">${esc(t.descricao||"Agende seu horário em poucos toques.")}</p><a class="btn" data-l="login.html">Entrar ou criar conta</a>`;
const q=await getDocs(query(collection(db,"tenants"),where("status","==","ativo"),limit(20)));
h.innerHTML=`<h1>Escolha onde quer ser atendido</h1>`+(q.empty?`<p class="lead">Nenhum estabelecimento cadastrado ainda. Peça ao administrador da plataforma para criar o primeiro.</p>`:`<div class="grid" style="width:100%">${q.docs.map(d=>`<a class="card lnk" href="index.html?s=${encodeURIComponent(d.id)}"><strong>${esc(d.data().nome)}</strong><br><span class="mute">${esc(d.data().descricao||"")}</span></a>`).join("")}</div>`)};

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

P.personalizacao=async(t,s)=>{if(!exigir(s,["proprietario"]))return;if(!t)return toast("Estabelecimento não encontrado.","err");
const f=$("#f"),ref=doc(db,"tenants",t.id);const preencher=x=>{f.nome.value=x.nome||"";f.descricao.value=x.descricao||"";f.cor.value=x.tema?.cor||"#23395b";f.tema.value=x.tema?.tema||"claro";f.estilo.value=x.tema?.estilo||"suave"};
const ler=()=>({cor:f.cor.value,tema:f.tema.value,estilo:f.estilo.value});preencher(t);f.hidden=false;$("#carga").remove();
f.oninput=()=>aplicarTema(ler());
$("#descartar").onclick=()=>{preencher(t);aplicarTema(t.tema)};
f.onsubmit=e=>{e.preventDefault();if(!f.nome.value.trim())return toast("Informe o nome do estabelecimento.","err");
acao($("button[type=submit]",f),async()=>{const novo={nome:f.nome.value.trim(),descricao:f.descricao.value.trim(),tema:ler()};await updateDoc(ref,novo);Object.assign(t,novo);toast("Personalização salva.")})}};

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

/* ==== 6b. IMAGENS (plano A: reduzidas no navegador e guardadas no próprio Firestore) ==== */
const imgData=(f,max=480)=>new Promise((ok,no)=>{const i=new Image(),u=URL.createObjectURL(f);i.onload=()=>{const k=Math.min(1,max/Math.max(i.width,i.height)),c=document.createElement("canvas");c.width=i.width*k;c.height=i.height*k;c.getContext("2d").drawImage(i,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c.toDataURL("image/jpeg",.78))};i.onerror=no;i.src=u});

/* ==== 6c. CADASTROS DO PROPRIETÁRIO (unidades, profissionais, serviços) ==== */
const CFG={unidades:{t:"Unidades",f:[["nome","Nome"],["endereco","Endereço"],["telefone","Telefone"],["capacidade","Atendimentos simultâneos","number"],["abre","Abre","time"],["fecha","Fecha","time"]]},
profissionais:{t:"Profissionais",f:[["nome","Nome"],["unidadeId","Unidade","ref"],["comissao","Comissão (%)","number"],["foto","Foto","img"]]},
servicos:{t:"Serviços",f:[["nome","Nome"],["preco","Preço (R$)","number"],["duracao","Duração (minutos)","number"]]}};
async function crud(t,s,k){if(!exigir(s,["proprietario"]))return;const C=CFG[k],col=collection(db,"tenants",t.id,k),F=$("#f"),L=$("#lista");let ed=null,docs=new Map();
const un=k==="profissionais"?(await getDocs(collection(db,"tenants",t.id,"unidades"))).docs:[];$("#carga").remove();$("#tit").textContent=C.t;
const form=()=>{F.innerHTML=C.f.map(([n,l,ty])=>`<label>${l}`+(ty==="ref"?`<select name="${n}" required>${un.map(d=>`<option value="${d.id}">${esc(d.data().nome)}</option>`).join("")}</select>`:ty==="img"?`<input name="${n}" type="file" accept="image/*">`:`<input name="${n}" type="${ty||"text"}" ${ty==="number"?'step="any" min="0"':""} ${n==="nome"?"required":""}>`)+`</label>`).join("")+`<button class="btn">${ed?"Salvar alterações":"Adicionar"}</button> <button class="btn ghost" type="button" id="novo">Limpar</button>`;
if(ed)C.f.forEach(([n,,ty])=>{if(ty!=="img")F[n].value=docs.get(ed)[n]??""});$("#novo").onclick=()=>{ed=null;form()}};
async function lista(){const q=await getDocs(col);docs=new Map(q.docs.map(d=>[d.id,d.data()]));
L.innerHTML=q.empty?`<li class="mute">Nada cadastrado ainda. Use o formulário para adicionar.</li>`:q.docs.map(d=>{const x=d.data();return`<li><span>${x.foto?`<img src="${x.foto}" alt="" width="40" height="40" style="border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:.6rem">`:""}<strong>${esc(x.nome)}</strong></span><span><button class="btn ghost" data-e="${d.id}">Editar</button> <button class="btn ghost" data-x="${d.id}">Excluir</button></span></li>`}).join("")}
L.onclick=e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.e){ed=b.dataset.e;form();F.scrollIntoView({behavior:"smooth"})}
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
const[U,PR,SV]=await Promise.all([ler("unidades"),ler("profissionais"),ler("servicos")]),st={u:U[0]?.id,p:"",s:SV[0]?.id,d:"",sl:null};
const meus=async()=>{const q=await getDocs(query(C("agendamentos"),where("clienteUid","==",s.u.uid))),m=t.fidelidade?.meta||10,f=(await getDoc(doc(C("fidelidade"),s.u.uid))).data()||{};
$("#fid").innerHTML=`<div class="card"><strong>Fidelidade:</strong> ${f.n||0} de ${m} atendimentos${f.brindes?` · <strong>${f.brindes} brinde(s) disponível(is)</strong>`:""}</div>`;
const l=q.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.inicio.localeCompare(a.inicio));
$("#meus").innerHTML=l.length?l.map(a=>`<li><span><strong>${esc(a.servicoNome)}</strong> com ${esc(a.profNome)}<br><span class="mute">${esc(fmt(a.inicio))} · ${esc(a.unidadeNome)}</span></span><span><span class="tag ${a.status==="cancelado"?"off":""}">${a.status}</span>${a.status==="agendado"&&new Date(a.inicio)>new Date()?` <button class="btn ghost" data-c="${a.id}">Cancelar</button>`:""}</span></li>`).join(""):`<li class="mute">Você ainda não tem agendamentos.</li>`};
$("#meus").onclick=e=>{const b=e.target.closest("[data-c]");if(b)acao(b,async()=>{if(!confirm("Cancelar este agendamento?"))return;await cancelar(t.id,b.dataset.c);toast("Agendamento cancelado.");await meus()})};
if(!U.length||!SV.length){A.innerHTML=`<p class="lead">Este estabelecimento ainda não liberou horários.</p>`;return meus()}
A.innerHTML=`<div class="card"><div class="cols"><label>Unidade<select id="u">${U.map(u=>`<option value="${u.id}">${esc(u.nome)}</option>`).join("")}</select></label><label>Serviço<select id="sv">${SV.map(v=>`<option value="${v.id}">${esc(v.nome)} · ${brl(v.preco)} · ${v.duracao} min</option>`).join("")}</select></label><label>Data<input id="d" type="date" min="${hoje()}"></label></div><h2>Profissional</h2><div id="pr" class="pick-grid"></div><h2>Horários</h2><div id="hs" class="pick-grid"></div><div id="res"></div></div>`;
const profs=()=>PR.filter(p=>p.unidadeId===st.u&&p.ativo!==false);
function desenharPr(){$("#pr").innerHTML=[{id:"",nome:"Sem preferência"},...profs()].map(p=>`<button type="button" class="pick" aria-pressed="${st.p===p.id}" data-p="${p.id}">${p.foto?`<img src="${p.foto}" alt="" width="56" height="56">`:""}${esc(p.nome)}</button>`).join("")}
async function slots(){st.sl=null;$("#res").innerHTML="";const H=$("#hs");if(!st.d){H.innerHTML=`<p class="mute">Escolha uma data.</p>`;return}H.innerHTML=`<div class="skel"></div>`;
const un=U.find(x=>x.id===st.u),sv=SV.find(x=>x.id===st.s),n=Math.ceil(sv.duracao/30),q=[where("u","==",un.id),where("d","==",st.d)];
const[lk,cp]=await Promise.all([getDocs(query(C("locks"),...q)),getDocs(query(C("cap"),...q))]),Lk=new Set(lk.docs.map(d=>d.id)),K={};cp.docs.forEach(d=>K[d.id]=d.data().n);
const ps=profs().filter(p=>!st.p||p.id===st.p),out=[];
for(let m=mins(un.abre);m+sv.duracao<=mins(un.fecha);m+=30){if(new Date(`${st.d}T${hm(m)}`)<=new Date())continue;const us=[...Array(n)].map((_,i)=>hm(m+30*i));
if(us.some(h=>(K[`${un.id}_${st.d}_${h}`]||0)>=un.capacidade))continue;const livres=ps.filter(p=>us.every(h=>!Lk.has(`${p.id}_${st.d}_${h}`)));if(livres.length)out.push({h:hm(m),us,livres})}
st.lista=out;H.innerHTML=out.length?out.map((o,i)=>`<button type="button" class="pick" data-h="${i}">${o.h}</button>`).join(""):`<p class="mute">Sem horários livres neste dia. Tente outra data ou outro profissional.</p>`}
async function reservar(){const un=U.find(x=>x.id===st.u),sv=SV.find(x=>x.id===st.s),sl=st.sl;
for(const p of sl.livres){try{await runTransaction(db,async tx=>{const lr=sl.us.map(h=>doc(C("locks"),`${p.id}_${st.d}_${h}`)),cr=sl.us.map(h=>doc(C("cap"),`${un.id}_${st.d}_${h}`));
const L=await Promise.all(lr.map(r=>tx.get(r))),K=await Promise.all(cr.map(r=>tx.get(r)));
if(L.some(x=>x.exists())||K.some(x=>(x.data()?.n||0)>=un.capacidade))throw Object.assign(new Error("conflito"),{conflito:1});
lr.forEach(r=>tx.set(r,{cli:s.u.uid,u:un.id,d:st.d}));cr.forEach((r,i)=>tx.set(r,{n:(K[i].data()?.n||0)+1,u:un.id,d:st.d}));
tx.set(doc(C("agendamentos")),{clienteUid:s.u.uid,clienteNome:s.u.displayName||s.u.email,unidadeId:un.id,unidadeNome:un.nome,profId:p.id,profNome:p.nome,servicoId:sv.id,servicoNome:sv.nome,preco:sv.preco,dur:sv.duracao,inicio:`${st.d}T${sl.h}`,status:"agendado",locks:lr.map(r=>r.id),caps:cr.map(r=>r.id),criadoEm:serverTimestamp()})});return p}
catch(e){if(!e.conflito)throw e}}throw{message_pt:"Esse horário acabou de ser ocupado. Escolha outro."}}
A.onchange=e=>{if(e.target.id==="u"){st.u=e.target.value;st.p="";desenharPr()}if(e.target.id==="sv")st.s=e.target.value;if(e.target.id==="d")st.d=e.target.value;slots()};
A.onclick=e=>{const b=e.target.closest("button");if(!b)return;
if(b.dataset.p!==undefined){st.p=b.dataset.p;desenharPr();slots()}
if(b.dataset.h!==undefined){st.sl=st.lista[b.dataset.h];const sv=SV.find(x=>x.id===st.s);document.querySelectorAll("[data-h]").forEach(x=>x.setAttribute("aria-pressed",x===b));
$("#res").innerHTML=`<p><strong>${esc(sv.nome)}</strong> · ${esc(fmt(st.d+"T"+st.sl.h))} · ${brl(sv.preco)}</p><button class="btn" id="ok">Confirmar agendamento</button>`}
if(b.id==="ok")acao(b,async()=>{const p=await reservar();toast(`Agendado com ${p.nome}!`);await slots();await meus()})};
desenharPr();await slots();await meus()};

/* ==== 6e. AGENDA DO PROPRIETÁRIO + FIDELIDADE ==== */
P.agendamentos=async(t,s)=>{if(!exigir(s,["proprietario"]))return;const D=$("#d"),L=$("#lista"),meta=t.fidelidade?.meta||10;D.value=hoje();
async function lista(){L.innerHTML=`<li><div class="skel"></div></li>`;const q=await getDocs(query(collection(db,"tenants",t.id,"agendamentos"),where("inicio",">=",D.value),where("inicio","<=",D.value+"T23:59")));
const l=q.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.inicio.localeCompare(b.inicio));
L.innerHTML=l.length?l.map(a=>`<li><span><strong>${a.inicio.slice(11)}</strong> · ${esc(a.clienteNome)}<br><span class="mute">${esc(a.servicoNome)} · ${esc(a.profNome)} · ${esc(a.unidadeNome)} · ${brl(a.preco)}</span></span><span><span class="tag ${["cancelado","ausente"].includes(a.status)?"off":""}">${a.status}</span>${a.status==="agendado"?` <button class="btn" data-a="concluido" data-id="${a.id}">Concluir</button> <button class="btn ghost" data-a="ausente" data-id="${a.id}">Faltou</button> <button class="btn ghost" data-a="cancelado" data-id="${a.id}">Cancelar</button>`:""}</span></li>`).join(""):`<li class="mute">Nenhum agendamento neste dia.</li>`}
async function concluir(id){const ar=doc(db,"tenants",t.id,"agendamentos",id);return runTransaction(db,async tx=>{const a=await tx.get(ar);if(a.data().status!=="agendado")return false;
const fr=doc(db,"tenants",t.id,"fidelidade",a.data().clienteUid),f=(await tx.get(fr)).data()||{};let n=(f.n||0)+1,b=f.brindes||0,ganhou=false;if(n>=meta){n-=meta;b++;ganhou=true}
tx.update(ar,{status:"concluido"});tx.set(fr,{n,brindes:b});return ganhou})}
D.onchange=lista;L.onclick=e=>{const b=e.target.closest("[data-a]");if(!b)return;acao(b,async()=>{const{a,id}=b.dataset;
if(a==="concluido"){toast(await concluir(id)?"Concluído. O cliente ganhou um brinde!":"Atendimento concluído.")}else{await cancelar(t.id,id,a);toast("Atualizado.")}await lista()})};await lista()};

/* ==== 7. INICIALIZAÇÃO ==== */
(async()=>{const pg=document.body.dataset.page;
try{const s=await sessao(),t=await carregarTenant(s?.tenantId||null);topo(t,s);
document.querySelectorAll("[data-l]").forEach(a=>a.href=href(a.dataset.l));await P[pg]?.(t,s);
document.querySelectorAll("[data-l]").forEach(a=>a.href=href(a.dataset.l))}
catch(e){console.error(e);toast(msgErro(e),"err")}})();
