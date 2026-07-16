(() => {
  "use strict";

  const DB_NAME = "suka-berbusana-db";
  const STORE = "products";
  const seed = [
    ["Jaket Puma Hitam","Puma","114","60","2024-10-06"],
    ["Adidas Bunga Biru","Adidas","104","60","2024-10-06"],
    ["Adidas Pink","Adidas","104","62","2024-10-06"],
    ["Nike Hitam Putih","Nike","108","61","2024-10-06"],
    ["Adidas Running Abu Hitam","Adidas","104–110","64","2024-10-06"],
    ["New Balance Full Print","New Balance","102","58","2024-10-06"],
    ["Adidas Big Logo","Adidas","102–104","63","2024-10-06"],
    ["K-Swiss Merah","K-Swiss","104","67","2024-10-06"],
    ["Ellesse","Ellesse","102","57","2024-10-06"],
    ["Uniqlo","Uniqlo","108","65–70","2024-10-06"],
    ["Adidas Running Putih","Adidas","100","62","2024-10-06"],
    ["Nepa Bulang","Nepa","110–112","67–72","2024-10-06"],
    ["Jaket Adidas Biru List Putih","Adidas","106","67","2024-10-20"],
    ["Jaket Umbro England","Umbro","120","71","2024-10-20"],
    ["Nike Dri-Fit Abu Hitam","Nike","104","66–69","2024-10-20"],
    ["Nike Running Biru","Nike","96","58","2024-10-20"],
    ["Nike Hoodie Logo Center","Nike","104","59","2024-10-20"],
    ["Nike Big Swoosh","Nike","110","65","2024-10-20"],
    ["Hoodie Champion","Champion","120","70","2024-10-20"],
    ["Hoodie Adidas","Adidas","104","68","2024-10-20"],
    ["Jaket Jeans GAP","GAP","94","60","2024-10-20"],
    ["Uniqlo Parasut Hijau","Uniqlo","120","70","2024-10-20"],
    ["Jaket Herington","Herington","110","63","2024-10-20"]
  ].map((row, index) => ({
    id: `j${String(index + 1).padStart(2,"0")}`,
    name: row[0], brand: row[1], ld: row[2], p: row[3], createdAt: row[4],
    price: null, status: "Tersedia", photo: null
  }));

  const el = id => document.getElementById(id);
  const dialog = el("product-dialog");
  const form = el("product-form");
  let products = [];
  let stagedPhoto = null;
  let stagedPhotoUrl = null;
  let deferredInstall = null;
  let toastTimer = null;

  const openDb = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, {keyPath:"id"});
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const dbAll = async () => {
    const db = await openDb();
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return result;
  };

  const dbPut = async item => {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(item);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  };

  const dbDelete = async id => {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  };

  const dbReplaceAll = async data => {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.clear();
      data.forEach(item => store.put(item));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  };

  const esc = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);
  const money = value => Number(value) > 0 ? new Intl.NumberFormat("id-ID", {style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value) : "Harga belum diisi";
  const photoUrl = item => item.photo instanceof Blob ? URL.createObjectURL(item.photo) : null;

  function toast(message) {
    el("toast").textContent = message;
    el("toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el("toast").classList.remove("show"), 2500);
  }

  function visibleProducts() {
    const query = el("search").value.trim().toLowerCase();
    const brand = el("brand-filter").value;
    const status = el("status-filter").value;
    const sort = el("sort").value;
    const filtered = products.filter(item => {
      const searchable = `${item.name} ${item.brand} ${item.ld} ${item.p}`.toLowerCase();
      return (!query || searchable.includes(query)) && (brand === "all" || item.brand === brand) && (status === "all" || item.status === status);
    });
    filtered.sort((a,b) => {
      if (sort === "name") return a.name.localeCompare(b.name,"id");
      if (sort === "price-high") return (Number(b.price) || -1) - (Number(a.price) || -1);
      if (sort === "price-low") return (Number(a.price) || Number.MAX_SAFE_INTEGER) - (Number(b.price) || Number.MAX_SAFE_INTEGER);
      return String(b.createdAt).localeCompare(String(a.createdAt)) || b.id.localeCompare(a.id);
    });
    return filtered;
  }

  function renderBrands() {
    const current = el("brand-filter").value;
    const brands = [...new Set(products.map(item => item.brand).filter(Boolean))].sort((a,b) => a.localeCompare(b,"id"));
    el("brand-filter").innerHTML = '<option value="all">Semua merek</option>' + brands.map(brand => `<option value="${esc(brand)}">${esc(brand)}</option>`).join("");
    if (brands.includes(current)) el("brand-filter").value = current;
  }

  function renderStats() {
    const available = products.filter(item => item.status === "Tersedia");
    const priced = products.filter(item => Number(item.price) > 0);
    el("stat-total").textContent = products.length;
    el("stat-available").textContent = available.length;
    el("stat-sold").textContent = `${products.filter(item => item.status === "Terjual").length} terjual`;
    el("stat-priced").textContent = priced.length;
    el("stat-unpriced").textContent = `${products.length - priced.length} belum diisi`;
    el("stat-value").textContent = new Intl.NumberFormat("id-ID", {style:"currency",currency:"IDR",maximumFractionDigits:0}).format(available.reduce((sum,item) => sum + (Number(item.price) || 0),0));
  }

  function productCard(item) {
    const url = photoUrl(item);
    const image = url ? `<img src="${url}" alt="Foto ${esc(item.name)}" onload="URL.revokeObjectURL(this.src)">` : `<div class="photo-placeholder"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h3l1.3-2h7.4l1.3 2h3v11H4z"></path><circle cx="12" cy="13" r="3.2"></circle></svg><span>Belum ada foto</span></div>`;
    return `<article class="product-card${item.status === "Terjual" ? " sold" : ""}">
      <div class="product-photo">${image}<span class="status-pill">${esc(item.status)}</span></div>
      <div class="product-body">
        <p class="product-brand">${esc(item.brand)}</p>
        <h3 class="product-name">${esc(item.name)}</h3>
        <div class="product-size"><span>LD ${esc(item.ld)} cm</span><span>P ${esc(item.p)} cm</span></div>
        <div class="product-footer"><span class="product-price">${esc(money(item.price))}</span><button class="edit-button" type="button" data-edit="${esc(item.id)}">Edit</button></div>
      </div>
    </article>`;
  }

  function render() {
    const visible = visibleProducts();
    renderStats();
    renderBrands();
    el("result-count").textContent = `${visible.length} dari ${products.length} item`;
    el("product-grid").innerHTML = visible.length ? visible.map(productCard).join("") : '<div class="empty-state"><strong>Tidak ada jaket yang cocok.</strong><p>Coba ubah kata pencarian atau filter.</p></div>';
  }

  function resetPhotoPreview() {
    if (stagedPhotoUrl) URL.revokeObjectURL(stagedPhotoUrl);
    stagedPhoto = null;
    stagedPhotoUrl = null;
    el("photo-input").value = "";
    el("photo-preview").innerHTML = '<div class="photo-empty"><span>＋</span><strong>Tambahkan foto</strong><small>JPG, PNG, atau WEBP</small></div>';
  }

  function setPhotoPreview(blob) {
    if (stagedPhotoUrl) URL.revokeObjectURL(stagedPhotoUrl);
    stagedPhoto = blob;
    stagedPhotoUrl = blob instanceof Blob ? URL.createObjectURL(blob) : null;
    el("photo-preview").innerHTML = stagedPhotoUrl ? `<img src="${stagedPhotoUrl}" alt="Pratinjau foto jaket">` : '<div class="photo-empty"><span>＋</span><strong>Tambahkan foto</strong><small>JPG, PNG, atau WEBP</small></div>';
  }

  function openForm(item = null) {
    form.reset();
    resetPhotoPreview();
    el("dialog-title").textContent = item ? "Edit jaket" : "Tambah jaket";
    el("delete-product").hidden = !item;
    el("item-id").value = item?.id || "";
    el("item-name").value = item?.name || "";
    el("item-brand").value = item?.brand || "";
    el("item-status").value = item?.status || "Tersedia";
    el("item-ld").value = item?.ld || "";
    el("item-p").value = item?.p || "";
    el("item-price").value = item?.price || "";
    if (item?.photo) setPhotoPreview(item.photo);
    dialog.showModal();
  }

  function closeForm() {
    dialog.close();
    if (stagedPhotoUrl) URL.revokeObjectURL(stagedPhotoUrl);
    stagedPhotoUrl = null;
  }

  async function saveForm() {
    const existingId = el("item-id").value;
    const existing = products.find(item => item.id === existingId);
    const item = {
      id: existingId || `j-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      name: el("item-name").value.trim(),
      brand: el("item-brand").value.trim(),
      status: el("item-status").value,
      ld: el("item-ld").value.trim(),
      p: el("item-p").value.trim(),
      price: el("item-price").value ? Number(el("item-price").value) : null,
      createdAt: existing?.createdAt || new Date().toISOString(),
      photo: stagedPhoto || existing?.photo || null
    };
    await dbPut(item);
    products = await dbAll();
    closeForm();
    render();
    toast(existing ? "Perubahan jaket disimpan." : "Jaket baru ditambahkan.");
  }

  const blobToDataUrl = blob => new Promise((resolve,reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
  });
  const dataUrlToBlob = dataUrl => {
    const [header,encoded] = dataUrl.split(",");
    const mime = (header.match(/data:([^;]+)/) || [null,"application/octet-stream"])[1];
    const binary = atob(encoded); const bytes = new Uint8Array(binary.length);
    for (let i=0;i<binary.length;i+=1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes],{type:mime});
  };

  async function exportData() {
    const output = [];
    for (const item of products) output.push({...item, photo:item.photo instanceof Blob ? await blobToDataUrl(item.photo) : null});
    const blob = new Blob([JSON.stringify({version:1,store:"suka.berbusana",exportedAt:new Date().toISOString(),products:output},null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `suka-berbusana-${new Date().toISOString().slice(0,10)}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url),1000); toast("Cadangan berhasil diekspor.");
  }

  async function importData(file) {
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed.products)) throw new Error("invalid");
      const restored = parsed.products.map(item => ({...item,photo:typeof item.photo === "string" ? dataUrlToBlob(item.photo) : null}));
      await dbReplaceAll(restored); products = await dbAll(); render(); toast("Cadangan berhasil dipulihkan.");
    } catch (error) { toast("File cadangan tidak valid."); }
  }

  el("add-product").addEventListener("click", () => openForm());
  el("close-dialog").addEventListener("click", closeForm);
  el("cancel-dialog").addEventListener("click", closeForm);
  el("choose-photo").addEventListener("click", () => el("photo-input").click());
  el("photo-input").addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Pilih file gambar.");
    if (file.size > 8 * 1024 * 1024) return toast("Ukuran foto maksimal 8 MB.");
    setPhotoPreview(file);
  });
  form.addEventListener("submit", event => { event.preventDefault(); if (form.reportValidity()) saveForm(); });
  el("delete-product").addEventListener("click", async () => {
    const id = el("item-id").value;
    const item = products.find(product => product.id === id);
    if (!item || !confirm(`Hapus ${item.name} dari katalog?`)) return;
    await dbDelete(id); products = await dbAll(); closeForm(); render(); toast("Jaket dihapus.");
  });
  el("product-grid").addEventListener("click", event => {
    const button = event.target.closest("[data-edit]");
    if (button) openForm(products.find(item => item.id === button.dataset.edit));
  });
  ["search","brand-filter","status-filter","sort"].forEach(id => el(id).addEventListener(id === "search" ? "input" : "change", render));
  el("more-actions").addEventListener("click", () => {
    const willOpen = el("action-menu").hidden;
    el("action-menu").hidden = !willOpen;
    el("more-actions").setAttribute("aria-expanded", String(willOpen));
  });
  el("export-data").addEventListener("click", exportData);
  el("import-data").addEventListener("click", () => el("import-file").click());
  el("import-file").addEventListener("change", event => { if (event.target.files[0]) importData(event.target.files[0]); event.target.value = ""; });
  window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); deferredInstall = event; el("install-app").hidden = false; });
  el("install-app").addEventListener("click", async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; el("install-app").hidden = true; });

  async function init() {
    products = await dbAll();
    if (!products.length) { await dbReplaceAll(seed); products = await dbAll(); }
    render();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
  init().catch(() => toast("Penyimpanan browser tidak tersedia."));
})();
