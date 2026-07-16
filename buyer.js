(() => {
  "use strict";
  const el = id => document.getElementById(id);
  const money = value => Number(value) > 0 ? new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value) : "Hubungi penjual";
  const esc = value => String(value ?? "").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);
  const camera = '<div class="photo-empty"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h3l1.3-2h7.4l1.3 2h3v11H4z"></path><circle cx="12" cy="13" r="3.2"></circle></svg><span>Foto segera hadir</span></div>';
  let products = [];

  function imageUrl(path){ return window.sb.storage.from("product-images").getPublicUrl(path).data.publicUrl; }
  function sortedImages(item){ return [...(item.product_images||[])].sort((a,b)=>a.sort_order-b.sort_order); }
  function visible(){
    const q=el("search").value.trim().toLowerCase(),brand=el("brand-filter").value,status=el("status-filter").value,sort=el("sort").value;
    const rows=products.filter(p=>(!q||`${p.name} ${p.brand||""}`.toLowerCase().includes(q))&&(brand==="all"||p.brand===brand)&&(status==="all"||p.status===status));
    rows.sort((a,b)=>sort==="name"?a.name.localeCompare(b.name,"id"):sort==="price-low"?(Number(a.price)||Number.MAX_SAFE_INTEGER)-(Number(b.price)||Number.MAX_SAFE_INTEGER):sort==="price-high"?(Number(b.price)||-1)-(Number(a.price)||-1):String(b.created_at).localeCompare(String(a.created_at)));
    return rows;
  }
  function card(p){
    const first=sortedImages(p)[0];
    return `<article class="product-card"><div class="product-photo">${first?`<img src="${esc(imageUrl(first.image_path))}" alt="Foto ${esc(p.name)}" loading="lazy">`:camera}<span class="status">${esc(p.status)}</span></div><div class="product-copy"><p class="eyebrow">${esc(p.brand||"Koleksi")}</p><h3>${esc(p.name)}</h3><div class="sizes"><span>LD ${esc(p.ld)} cm</span><span>P ${esc(p.length)} cm</span></div><div class="product-bottom"><span class="price">${esc(money(p.price))}</span><button class="detail-button" type="button" data-detail="${esc(p.id)}">Detail</button></div></div></article>`;
  }
  function render(){
    const rows=visible();
    el("available-count").textContent=products.filter(p=>p.status==="Tersedia").length;
    el("result-count").textContent=`${rows.length} dari ${products.length} produk`;
    el("product-grid").innerHTML=rows.length?rows.map(card).join(""):'<div class="empty-state"><strong>Belum ada produk yang cocok.</strong><p>Coba ubah pencarian atau filter.</p></div>';
  }
  function renderBrands(){
    const select=el("brand-filter"),current=select.value;
    const brands=[...new Set(products.map(p=>p.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"id"));
    select.innerHTML='<option value="all">Semua merek</option>'+brands.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join("");
    if(brands.includes(current))select.value=current;
  }
  function openDetail(id){
    const p=products.find(row=>row.id===id);if(!p)return;
    const images=sortedImages(p),main=el("detail-main-photo"),thumbs=el("detail-thumbnails");
    const show=path=>{main.innerHTML=path?`<img src="${esc(imageUrl(path))}" alt="Foto detail ${esc(p.name)}">`:camera;[...thumbs.children].forEach(b=>b.classList.toggle("active",b.dataset.path===path));};
    thumbs.innerHTML=images.map((img,i)=>`<button type="button" data-path="${esc(img.image_path)}" aria-label="Lihat foto ${i+1}"><img src="${esc(imageUrl(img.image_path))}" alt=""></button>`).join("");
    thumbs.onclick=e=>{const b=e.target.closest("button[data-path]");if(b)show(b.dataset.path);};
    show(images[0]?.image_path||null);
    el("detail-brand").textContent=p.brand||"Koleksi";el("detail-name").textContent=p.name;el("detail-price").textContent=money(p.price);el("detail-status").textContent=p.status;el("detail-ld").textContent=`${p.ld} cm`;el("detail-length").textContent=`${p.length} cm`;el("detail-description").textContent=p.description||"Detail tambahan dapat ditanyakan langsung kepada penjual.";
    el("detail-dialog").showModal();
  }
  async function load(){
    el("notice").hidden=true;
    const {data,error}=await window.sb.from("products").select("*, product_images(*)").order("created_at",{ascending:false});
    if(error){el("notice").hidden=false;el("notice").textContent="Katalog belum dapat dimuat. Silakan coba beberapa saat lagi.";console.error(error);return;}
    products=data||[];renderBrands();render();
  }
  el("open-search").onclick=()=>{el("search").focus();el("koleksi").scrollIntoView();};
  el("close-detail").onclick=()=>el("detail-dialog").close();
  el("product-grid").onclick=e=>{const b=e.target.closest("[data-detail]");if(b)openDetail(b.dataset.detail);};
  ["search","brand-filter","status-filter","sort"].forEach(id=>el(id).addEventListener(id==="search"?"input":"change",render));
  load();
  if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
})();
