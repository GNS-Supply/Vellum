/* ==== 1. CONFIGURAÇÃO (a config web do Firebase é pública; a proteção está nas Security Rules) ==== */
import{initializeApp}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import{getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,GoogleAuthProvider,signInWithPopup,sendPasswordResetEmail,signOut,updateProfile}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import{getFirestore,doc,getDoc,setDoc,updateDoc,addDoc,collection,query,where,getDocs,limit,serverTimestamp}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
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
const destino=s=>s.papel==="master"?"master.html":s.papel==="cliente"?"cliente.html":"personalizacao.html";
async function irParaPainel(){const u=auth.currentUser;location.replace(href(destino({...await papelDe(u)})))}
function exigir(s,papeis){if(!s){location.replace(href("login.html"));return false}if(!papeis.includes(s.papel)){location.replace(href(destino(s)));return false}return true}
async function garantirPerfil(u,extra={}){const r=doc(db,"users",u.uid);if(!(await getDoc(r)).exists())await setDoc(r,{nome:extra.nome||u.displayName||"",email:u.email,criadoEm:serverTimestamp(),...(extra.lgpdEm?{lgpdEm:serverTimestamp()}:{})})}
const entrarGoogle=async()=>{const c=await signInWithPopup(auth,new GoogleAuthProvider());await garantirPerfil(c.user,{lgpdEm:1})};
async function auditar(ev,dados){await addDoc(collection(db,"auditoria"),{ev,dados,uid:auth.currentUser.uid,em:serverTimestamp()})}

/* ==== 5. CABEÇALHO COMPARTILHADO ==== */
function topo(t,s){const n=[];
if(s?.papel==="cliente")n.push(["cliente.html","Meu perfil"]);
if(s?.papel==="proprietario")n.push(["personalizacao.html","Personalização"]);
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

/* ==== 7. INICIALIZAÇÃO ==== */
(async()=>{const pg=document.body.dataset.page;
try{const s=await sessao(),t=await carregarTenant(pg==="personalizacao"?s?.tenantId:null);topo(t,s);
document.querySelectorAll("[data-l]").forEach(a=>a.href=href(a.dataset.l));await P[pg]?.(t,s);
document.querySelectorAll("[data-l]").forEach(a=>a.href=href(a.dataset.l))}
catch(e){console.error(e);toast(msgErro(e),"err")}})();
