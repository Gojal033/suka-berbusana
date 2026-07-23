(() => {
  "use strict";

  const el = id => document.getElementById(id);

  const money = value =>
    Number(value) > 0
      ? new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0
        }).format(value)
      : "Hubungi penjual";

  const esc = value =>
    String(value ?? "").replace(
      /[&<>'"]/g,
      c =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;"
        })[c]
    );

  const camera = `
    <div class="photo-empty">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7.5h3l1.3-2h7.4l1.3 2h3v11H4z"></path>
        <circle cx="12" cy="13" r="3.2"></circle>
      </svg>
      <span>Foto segera hadir</span>
    </div>
  `;

  let products = [];
  let detailImages = [];
  let detailProduct = null;
  let detailIndex = 0;

  function imageUrl(path) {
    return window.sb.storage
      .from("product-images")
      .getPublicUrl(path).data.publicUrl;
  }

  function sortedImages(item) {
    return [...(item.product_images || [])].sort(
      (a, b) => a.sort_order - b.sort_order
    );
  }

  function visible() {
    const q = el("search").value.trim().toLowerCase();
    const brand = el("brand-filter").value;
    const status = el("status-filter").value;
    const sort = el("sort").value;

    const rows = products.filter(
      product =>
        (!q ||
          `${product.name} ${product.brand || ""}`
            .toLowerCase()
            .includes(q)) &&
        (brand === "all" || product.brand === brand) &&
        (status === "all" || product.status === status)
    );

    rows.sort((a, b) => {
      if (sort === "name") {
        return a.name.localeCompare(b.name, "id");
      }

      if (sort === "price-low") {
        return (
          (Number(a.price) || Number.MAX_SAFE_INTEGER) -
          (Number(b.price) || Number.MAX_SAFE_INTEGER)
        );
      }

      if (sort === "price-high") {
        return (
          (Number(b.price) || -1) -
          (Number(a.price) || -1)
        );
      }

      return String(b.created_at).localeCompare(
        String(a.created_at)
      );
    });

    return rows;
  }

  function card(product) {
    const images = sortedImages(product);
    const firstImage = images[0];

    return `
      <article class="product-card">
        <button
          class="product-photo"
          type="button"
          data-detail="${esc(product.id)}"
          aria-label="Lihat detail ${esc(product.name)}"
        >
          ${
            firstImage
              ? `
                <img
                  src="${esc(imageUrl(firstImage.image_path))}"
                  alt="Foto ${esc(product.name)}"
                  loading="lazy"
                >
              `
              : camera
          }

          <span class="status">${esc(product.status)}</span>

          ${
            images.length > 1
              ? `<span class="photo-count">▧ ${images.length} foto</span>`
              : ""
          }
        </button>

        <div class="product-copy">
          <p class="eyebrow">
            ${esc(product.brand || "Koleksi")}
          </p>

          <h3>${esc(product.name)}</h3>

          <div class="sizes">
            <span>LD ${esc(product.ld)} cm</span>
            <span>P ${esc(product.length)} cm</span>
          </div>

          <div class="product-bottom">
            <span class="price">
              ${esc(money(product.price))}
            </span>

            <button
              class="detail-button"
              type="button"
              data-detail="${esc(product.id)}"
            >
              Detail
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function render() {
    const rows = visible();

    el("available-count").textContent = products.filter(
      product => product.status === "Tersedia"
    ).length;

    el("result-count").textContent =
      `${rows.length} dari ${products.length} produk`;

    el("product-grid").innerHTML = rows.length
      ? rows.map(card).join("")
      : `
        <div class="empty-state">
          <strong>Belum ada produk yang cocok.</strong>
          <p>Coba ubah pencarian atau filter.</p>
        </div>
      `;
  }

  function renderBrands() {
    const select = el("brand-filter");
    const current = select.value;

    const brands = [
      ...new Set(
        products
          .map(product => product.brand)
          .filter(Boolean)
      )
    ].sort((a, b) => a.localeCompare(b, "id"));

    select.innerHTML =
      '<option value="all">Semua merek</option>' +
      brands
        .map(
          brand =>
            `<option value="${esc(brand)}">${esc(brand)}</option>`
        )
        .join("");

    if (brands.includes(current)) {
      select.value = current;
    }
  }

  function openDetail(id) {
    const product = products.find(row => row.id === id);

    if (!product) {
      return;
    }

    const images = sortedImages(product);
    const main = el("detail-main-photo");
    const thumbnails = el("detail-thumbnails");

    detailImages = images;
    detailProduct = product;

    const show = index => {
      detailIndex = index;
      const path = images[index]?.image_path;

      main.innerHTML = path
        ? `
          <button
            type="button"
            class="zoom-trigger"
            aria-label="Perbesar foto ${index + 1}"
          >
            <img
              src="${esc(imageUrl(path))}"
              alt="Foto detail ${esc(product.name)}"
            >
            <span>⌕ Perbesar</span>
          </button>
        `
        : camera;

      [...thumbnails.children].forEach((button, i) => {
        button.classList.toggle("active", i === index);
      });
    };

    thumbnails.innerHTML = images
      .map(
        (image, index) => `
          <button
            type="button"
            data-index="${index}"
            aria-label="Lihat foto ${index + 1}"
          >
            <img
              src="${esc(imageUrl(image.image_path))}"
              alt="Foto kecil ${index + 1}"
            >
          </button>
        `
      )
      .join("");

    thumbnails.onclick = event => {
      const button = event.target.closest("button[data-index]");

      if (button) {
        show(Number(button.dataset.index));
      }
    };

    main.onclick = event => {
      if (event.target.closest(".zoom-trigger")) {
        openLightbox(detailIndex);
      }
    };

    show(0);

    el("detail-brand").textContent =
      product.brand || "Koleksi";

    el("detail-name").textContent = product.name;
    el("detail-price").textContent = money(product.price);
    el("detail-status").textContent = product.status;
    el("detail-ld").textContent = `${product.ld} cm`;
    el("detail-length").textContent = `${product.length} cm`;

    el("detail-description").textContent =
      product.description ||
      "Detail tambahan dapat ditanyakan langsung kepada penjual.";

    el("detail-dialog").showModal();
  }

  function showLightbox(index) {
    if (!detailImages.length) {
      return;
    }

    detailIndex =
      (index + detailImages.length) % detailImages.length;

    el("lightbox-image").src = imageUrl(
      detailImages[detailIndex].image_path
    );

    el("lightbox-image").alt =
      `Foto ${detailIndex + 1} ` +
      `${detailProduct?.name || "produk"}`;

    el("lightbox-image").classList.remove("zoomed");

    el("lightbox-counter").textContent =
      `${detailIndex + 1} / ${detailImages.length}`;

    const hasMultipleImages = detailImages.length > 1;

    el("lightbox-previous").hidden = !hasMultipleImages;
    el("lightbox-next").hidden = !hasMultipleImages;
  }

  function openLightbox(index) {
    showLightbox(index);
    el("lightbox-dialog").showModal();
  }

  async function load() {
    el("notice").hidden = true;

    /*
     * Filter is_published memastikan katalog hanya mengambil
     * produk yang dicentang "Tampilkan di katalog pembeli".
     * Filter tetap berlaku meskipun katalog dibuka pada browser
     * yang sedang login sebagai admin.
     */
    const { data, error } = await window.sb
      .from("products")
      .select(
        "id,name,brand,ld,length,price,status,description," +
        "is_published,created_at,updated_at,product_images(*)"
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) {
      el("notice").hidden = false;
      el("notice").textContent =
        "Katalog belum dapat dimuat. Silakan coba beberapa saat lagi.";

      console.error(error);
      return;
    }

    products = data || [];
    renderBrands();
    render();
  }

  el("open-search").onclick = () => {
    el("search").focus();
    el("koleksi").scrollIntoView();
  };

  el("close-detail").onclick = () => {
    el("detail-dialog").close();
  };

  el("close-lightbox").onclick = () => {
    el("lightbox-dialog").close();
  };

  el("lightbox-previous").onclick = () => {
    showLightbox(detailIndex - 1);
  };

  el("lightbox-next").onclick = () => {
    showLightbox(detailIndex + 1);
  };

  el("lightbox-image").onclick = event => {
    event.currentTarget.classList.toggle("zoomed");
  };

  el("lightbox-dialog").addEventListener(
    "keydown",
    event => {
      if (event.key === "ArrowLeft") {
        showLightbox(detailIndex - 1);
      }

      if (event.key === "ArrowRight") {
        showLightbox(detailIndex + 1);
      }
    }
  );

  el("product-grid").onclick = event => {
    const button = event.target.closest("[data-detail]");

    if (button) {
      openDetail(button.dataset.detail);
    }
  };

  [
    "search",
    "brand-filter",
    "status-filter",
    "sort"
  ].forEach(id => {
    el(id).addEventListener(
      id === "search" ? "input" : "change",
      render
    );
  });

  load();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./sw.js")
      .catch(() => {});
  }
})();
