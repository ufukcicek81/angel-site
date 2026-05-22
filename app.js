import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const DEFAULTS = {
  marka_adi: "Angel Privé",
  site_title: "Angel Privé | Kişiye Özel Dikim Kıyafet ve Premium Tasarım",
  site_description: "Angel Privé, kişiye özel dikim kıyafet ve premium tasarım hizmeti sunar.",
  hero_etiket: "LUXURY CUSTOM CLOTHING",
  hero_baslik: "Sana özel dikilen premium kıyafetler.",
  hero_vurgu: "premium kıyafetler",
  hero_aciklama: "Angel Privé, hazır ürün satışı yerine tamamen kişiye özel dikim kıyafet tasarlar. Model, kumaş, renk, ölçü ve teslim süreci sana özel planlanır.",
  hero_gorsel_url: "",
  whatsapp_no: "905000000000"
};

let currentSettings = { ...DEFAULTS };
let lastProductsForRender = [];

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function cleanPhone(value = "") {
  return String(value).replace(/\D/g, "");
}

function waUrl(text = "Merhaba, Angel Privé özel dikim kıyafet hakkında bilgi almak istiyorum.") {
  const phone = cleanPhone(currentSettings.whatsapp_no || DEFAULTS.whatsapp_no);
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

function setText(selector, value) {
  const el = qs(selector);
  if (el && value) el.textContent = value;
}

function setDescription(value) {
  const meta = document.querySelector('meta[name="description"]');
  if (meta && value) meta.setAttribute("content", value);
}

function renderSettings(data = {}) {
  currentSettings = { ...DEFAULTS, ...data };
  window.ANGEL_WHATSAPP_NUMBER = cleanPhone(currentSettings.whatsapp_no);

  document.title = currentSettings.site_title || DEFAULTS.site_title;
  setDescription(currentSettings.site_description);

  setText("#heroEyebrow", currentSettings.hero_etiket);

  const heroTitle = qs("#heroTitle");
  if (heroTitle && currentSettings.hero_baslik) {
    const title = currentSettings.hero_baslik;
    const emphasis = currentSettings.hero_vurgu || "";
    if (emphasis && title.includes(emphasis)) {
      heroTitle.innerHTML = title.replace(emphasis, `<span>${emphasis}</span>`);
    } else {
      heroTitle.textContent = title;
    }
  }

  setText("#heroText", currentSettings.hero_aciklama);

  const visual = qs("#heroVisual");
  const heroImage = qs("#heroImage");
  if (visual && heroImage && currentSettings.hero_gorsel_url) {
    heroImage.src = currentSettings.hero_gorsel_url;
    visual.classList.add("has-image");
  } else if (visual && heroImage) {
    heroImage.removeAttribute("src");
    visual.classList.remove("has-image");
  }

  qsa(".wa-link").forEach(link => {
    link.href = waUrl();
  });

  if (lastProductsForRender.length) renderProducts(lastProductsForRender);
}

function safe(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


let activeGallery = [];
let activeGalleryIndex = 0;

function parseImages(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/\n|,/)
    .map(x => x.trim())
    .filter(Boolean);
}

function openGallery(images, startIndex = 0) {
  activeGallery = images.filter(Boolean);
  if (!activeGallery.length) return;
  activeGalleryIndex = Math.max(0, Math.min(startIndex, activeGallery.length - 1));

  const modal = document.getElementById("galleryModal");
  const photo = document.getElementById("galleryPhoto");
  const thumbs = document.getElementById("galleryThumbs");

  if (!modal || !photo || !thumbs) return;

  function draw() {
    photo.src = activeGallery[activeGalleryIndex];
    thumbs.innerHTML = activeGallery.map((src, i) =>
      `<img src="${src}" class="${i === activeGalleryIndex ? "active" : ""}" data-gallery-thumb="${i}" alt="Ürün görseli ${i + 1}">`
    ).join("");
  }

  draw();
  modal.classList.add("open");

  thumbs.onclick = (e) => {
    const img = e.target.closest("[data-gallery-thumb]");
    if (!img) return;
    activeGalleryIndex = Number(img.dataset.galleryThumb);
    draw();
  };
}

function closeGallery() {
  const modal = document.getElementById("galleryModal");
  if (modal) modal.classList.remove("open");
}

function moveGallery(step) {
  if (!activeGallery.length) return;
  activeGalleryIndex = (activeGalleryIndex + step + activeGallery.length) % activeGallery.length;
  const photo = document.getElementById("galleryPhoto");
  const thumbs = document.getElementById("galleryThumbs");
  if (photo) photo.src = activeGallery[activeGalleryIndex];
  if (thumbs) {
    thumbs.querySelectorAll("img").forEach((img, i) => img.classList.toggle("active", i === activeGalleryIndex));
  }
}

document.addEventListener("click", (e) => {
  if (e.target?.id === "galleryClose" || e.target?.id === "galleryModal") closeGallery();
  if (e.target?.id === "galleryPrev") moveGallery(-1);
  if (e.target?.id === "galleryNext") moveGallery(1);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeGallery();
  if (e.key === "ArrowLeft") moveGallery(-1);
  if (e.key === "ArrowRight") moveGallery(1);
});


function renderProducts(products = []) {
  lastProductsForRender = products;
  const grid = qs("#productGrid");
  if (!grid || !products.length) return;

  const active = products.filter(p => p.aktif !== false);
  if (!active.length) return;

  grid.innerHTML = active.map((p, index) => {
    const title = safe(p.ad || "Özel Dikim Kıyafet");
    const cat = safe(p.kategori || "Özel Dikim");
    const desc = safe(p.aciklama || "Kişiye özel ölçü ve tasarım ile hazırlanır.");
    const price = safe(p.fiyat_notu || p.buton_text || "Bilgi Al");
    const galleryImages = [p.gorsel_url, ...parseImages(p.galeri_urls), currentSettings.hero_gorsel_url].filter(Boolean);
    const img = galleryImages[0] || "";
    const href = p.buton_link || waUrl(`${p.ad || "Özel dikim kıyafet"} hakkında bilgi almak istiyorum.`);
    return `
      <article class="feature">
        <div class="feature-img" onclick='openGallery(${JSON.stringify(galleryImages)})'>${img ? `<img src="${img}" alt="${title}" loading="lazy">` : ""}</div>
        <div class="feature-content">
          <small>${String(index + 1).padStart(2, "0")} / ${cat}</small>
          <h3>${title}</h3>
          <p>${desc}</p>
          <a class="btn btn-gold" href="${href}" target="_blank">${price}</a>
        </div>
      </article>
    `;
  }).join("");
}

onSnapshot(doc(db, "site_ayarlari", "ana_sayfa"), (snapshot) => {
  if (snapshot.exists()) renderSettings(snapshot.data());
  else renderSettings(DEFAULTS);
}, (error) => {
  console.warn("Site ayarları okunamadı:", error);
  renderSettings(DEFAULTS);
});

const productsQuery = query(collection(db, "urunler"), orderBy("sira", "asc"));
onSnapshot(productsQuery, (snapshot) => {
  const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderProducts(products);
}, (error) => {
  console.warn("Ürünler okunamadı:", error);
});
