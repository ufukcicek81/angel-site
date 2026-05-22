import { db } from "./firebase-config.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function parseImages(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return String(value).split(/\n|,/).map(x => x.trim()).filter(Boolean);
}

function cleanPhone(value = "") {
  return String(value).replace(/\D/g, "");
}

function setText(id, value, fallback = "-") {
  const el = $(id);
  if (el) el.textContent = value || fallback;
}

function renderGallery(images) {
  const main = $("mainPhoto");
  const thumbs = $("thumbs");
  if (!main || !thumbs) return;

  if (!images.length) {
    main.removeAttribute("src");
    thumbs.innerHTML = "";
    return;
  }

  let active = 0;
  function draw() {
    main.src = images[active];
    thumbs.innerHTML = images.map((src, i) =>
      `<img src="${src}" class="${i === active ? "active" : ""}" data-i="${i}" alt="Ürün fotoğrafı ${i + 1}">`
    ).join("");
  }

  thumbs.onclick = (e) => {
    const img = e.target.closest("[data-i]");
    if (!img) return;
    active = Number(img.dataset.i);
    draw();
  };

  draw();
}

async function init() {
  const id = getParam("id");
  if (!id) {
    setText("title", "Ürün bulunamadı", "Ürün bulunamadı");
    return;
  }

  const productSnap = await getDoc(doc(db, "urunler", id));
  const settingsSnap = await getDoc(doc(db, "site_ayarlari", "ana_sayfa"));

  if (!productSnap.exists()) {
    setText("title", "Ürün bulunamadı", "Ürün bulunamadı");
    return;
  }

  const p = productSnap.data();
  const settings = settingsSnap.exists() ? settingsSnap.data() : {};
  const images = [p.gorsel_url, ...parseImages(p.galeri_urls)].filter(Boolean);

  document.title = `${p.ad || "Ürün Detayı"} | Angel Privé`;

  setText("category", p.kategori || "Özel dikim");
  setText("title", p.ad || "Özel Dikim Kıyafet");
  setText("desc", p.aciklama || "Kişiye özel ölçü ve tasarım ile hazırlanır.", "");
  setText("fabric", p.kumas_cinsi || "-");
  setText("model", p.kalip_model || "-");
  setText("measure", p.olcu_bilgisi || "Kişiye özel ölçü alınır");
  setText("delivery", p.teslim_suresi || "-");
  setText("detail", p.detay_aciklama || "", "");

  renderGallery(images);

  const phone = cleanPhone(settings.whatsapp_no || "905000000000");
  const msg = encodeURIComponent(`Merhaba, Angel Privé sitesindeki "${p.ad || "özel dikim kıyafet"}" ürünü için bilgi ve teklif almak istiyorum.`);
  $("waBtn").href = `https://wa.me/${phone}?text=${msg}`;
}

init().catch(err => {
  console.error(err);
  setText("title", "Ürün yüklenemedi", "Ürün yüklenemedi");
});
