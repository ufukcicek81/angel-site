import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const CLOUDINARY_CLOUD_NAME = "dnnpbmenh";
const CLOUDINARY_UPLOAD_PRESET = "angelprive_upload";

const $ = (id) => document.getElementById(id);

const refs = {
  loginCard: $("loginCard"),
  panel: $("panel"),
  loginForm: $("loginForm"),
  loginMsg: $("loginMsg"),
  uidText: $("uidText"),
  logoutBtn: $("logoutBtn"),
  settingsForm: $("settingsForm"),
  settingsMsg: $("settingsMsg"),
  productForm: $("productForm"),
  productMsg: $("productMsg"),
  productList: $("productList"),
  clearProduct: $("clearProduct")
};

let products = [];

function msg(el, text) {
  if (el) el.textContent = text || "";
}

function val(id) {
  return ($(id)?.value || "").trim();
}

function setVal(id, value = "") {
  const el = $(id);
  if (el) el.value = value ?? "";
}

function slugify(text = "") {
  return String(text).toLowerCase()
    .replaceAll("ı","i").replaceAll("ğ","g").replaceAll("ü","u").replaceAll("ş","s").replaceAll("ö","o").replaceAll("ç","c")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function loadSettings() {
  const snap = await getDoc(doc(db, "site_ayarlari", "ana_sayfa"));
  const d = snap.exists() ? snap.data() : {};
  setVal("marka_adi", d.marka_adi || "Angel Privé");
  setVal("whatsapp_no", d.whatsapp_no || "905000000000");
  setVal("site_title", d.site_title || "Angel Privé | Kişiye Özel Dikim Kıyafet ve Premium Tasarım");
  setVal("site_description", d.site_description || "Angel Privé, kişiye özel dikim kıyafet ve premium tasarım hizmeti sunar.");
  setVal("hero_etiket", d.hero_etiket || "LUXURY CUSTOM CLOTHING");
  setVal("hero_vurgu", d.hero_vurgu || "premium kıyafetler");
  setVal("hero_baslik", d.hero_baslik || "Sana özel dikilen premium kıyafetler.");
  setVal("hero_aciklama", d.hero_aciklama || "Angel Privé, hazır ürün satışı yerine tamamen kişiye özel dikim kıyafet tasarlar. Model, kumaş, renk, ölçü ve teslim süreci sana özel planlanır.");
  setVal("hero_gorsel_url", d.hero_gorsel_url || "");
  const heroPreview = $("heroPreview");
  if (heroPreview && val("hero_gorsel_url")) {
    heroPreview.src = val("hero_gorsel_url");
    heroPreview.style.display = "block";
  }
}

async function loadProducts() {
  const q = query(collection(db, "urunler"), orderBy("sira", "asc"));
  const snap = await getDocs(q);
  products = snap.docs.map(x => ({ id: x.id, ...x.data() }));
  renderProducts();
}

function escapeHtml(v = "") {
  return String(v).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
}

function renderProducts() {
  if (!products.length) {
    refs.productList.innerHTML = "<p>Henüz kart eklenmedi.</p>";
    return;
  }
  refs.productList.innerHTML = products.map(p => `
    <div class="product">
      <div>
        <strong>${escapeHtml(p.ad || "İsimsiz")}</strong>
        <p>${escapeHtml(p.kategori || "Kategori yok")} · sıra: ${p.sira || 0} · ${p.aktif === false ? "pasif" : "aktif"}</p>
      </div>
      <div class="toolbar">
        <button class="btn dark" data-edit="${p.id}">Düzenle</button>
        <button class="btn red" data-delete="${p.id}">Sil</button>
      </div>
    </div>
  `).join("");
}

function clearProductForm() {
  setVal("product_id", "");
  setVal("sira", "1");
  setVal("ad", "");
  setVal("kategori", "");
  setVal("aciklama", "");
  setVal("detay_aciklama", "");
  setVal("olcu_bilgisi", "");
  setVal("teslim_suresi", "");
  setVal("kalip_model", "");
  setVal("kumas_cinsi", "");
  setVal("gorsel_url", "");
  setVal("galeri_urls", "");
  renderAllImagePreviews();
    renderImageManagers();
  const productPreview = $("productPreview");
  if (productPreview) {
    productPreview.src = "";
    productPreview.style.display = "none";
  }
  setVal("fiyat_notu", "Teklif al");
  setVal("buton_link", "");
  setVal("aktif", "true");
}


async function uploadToCloudinary(file, targetInputId, previewId, buttonEl) {
  if (!file) {
    alert("Önce bir fotoğraf seç.");
    return;
  }

  const oldText = buttonEl ? buttonEl.textContent : "";
  if (buttonEl) {
    buttonEl.textContent = "Yükleniyor...";
    buttonEl.disabled = true;
  }

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", "angelprive");

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (!res.ok || !data.secure_url) {
      console.error(data);
      throw new Error(data.error?.message || "Cloudinary yükleme hatası");
    }

    setVal(targetInputId, data.secure_url);

    const preview = $(previewId);
    if (preview) {
      preview.src = data.secure_url;
      preview.style.display = "block";
    }

    alert("Fotoğraf yüklendi. Şimdi Kaydet butonuna bas.");
  } catch (err) {
    console.error(err);
    alert("Fotoğraf yüklenemedi. Upload preset Unsigned mı kontrol et. Hata: " + err.message);
  } finally {
    if (buttonEl) {
      buttonEl.textContent = oldText || "Fotoğraf Yükle";
      buttonEl.disabled = false;
    }
  }
}



async function uploadFileToCloudinary(file, statusElement = null) {
  if (!file) throw new Error("Önce bir fotoğraf seç.");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "angelprive");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();

  if (!res.ok || !data.secure_url) {
    console.error("Cloudinary hata:", data);
    throw new Error(data?.error?.message || "Cloudinary yükleme hatası");
  }

  return data.secure_url;
}

function appendLineToTextarea(id, line) {
  const el = $(id);
  if (!el) return;
  const current = (el.value || "").trim();
  el.value = current ? current + "\n" + line : line;
}

refs.loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg(refs.loginMsg, "Giriş yapılıyor...");
  try {
    await signInWithEmailAndPassword(auth, val("email"), val("password"));
    msg(refs.loginMsg, "");
  } catch (err) {
    console.error(err);
    msg(refs.loginMsg, "Giriş olmadı. Email/Password Authentication açık mı ve kullanıcı oluşturuldu mu kontrol et.");
  }
});

refs.logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

refs.settingsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg(refs.settingsMsg, "Kaydediliyor...");
  try {
    await setDoc(doc(db, "site_ayarlari", "ana_sayfa"), {
      marka_adi: val("marka_adi"),
      whatsapp_no: val("whatsapp_no"),
      site_title: val("site_title"),
      site_description: val("site_description"),
      hero_etiket: val("hero_etiket"),
      hero_vurgu: val("hero_vurgu"),
      hero_baslik: val("hero_baslik"),
      hero_aciklama: val("hero_aciklama"),
      hero_gorsel_url: val("hero_gorsel_url"),
      updatedAt: serverTimestamp()
    }, { merge: true });
    msg(refs.settingsMsg, "Kaydedildi. Ana site birkaç saniye içinde güncellenir.");
  } catch (err) {
    console.error(err);
    msg(refs.settingsMsg, "Kaydedilemedi. Firestore Rules izin vermiyor olabilir.");
  }
});

refs.productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg(refs.productMsg, "Kaydediliyor...");
  try {
    const id = val("product_id");
    const payload = {
      sira: Number(val("sira") || 0),
      ad: val("ad"),
      slug: slugify(val("ad")),
      kategori: val("kategori"),
      kumas_cinsi: val("kumas_cinsi"),
      kalip_model: val("kalip_model"),
      teslim_suresi: val("teslim_suresi"),
      olcu_bilgisi: val("olcu_bilgisi"),
      detay_aciklama: val("detay_aciklama"),
      aciklama: val("aciklama"),
      gorsel_url: val("gorsel_url"),
      galeri_urls: val("galeri_urls"),
      fiyat_notu: val("fiyat_notu"),
      buton_text: val("fiyat_notu"),
      buton_link: val("buton_link"),
      aktif: val("aktif") === "true",
      updatedAt: serverTimestamp()
    };
    if (!payload.ad) {
      msg(refs.productMsg, "Başlık zorunlu.");
      return;
    }
    if (id) await updateDoc(doc(db, "urunler", id), payload);
    else await addDoc(collection(db, "urunler"), { ...payload, createdAt: serverTimestamp() });
    clearProductForm();
    await loadProducts();
    msg(refs.productMsg, "Kart kaydedildi.");
  } catch (err) {
    console.error(err);
    msg(refs.productMsg, "Kart kaydedilemedi. Firestore Rules izin vermiyor olabilir.");
  }
});

refs.clearProduct.addEventListener("click", clearProductForm);

refs.productList.addEventListener("click", async (e) => {
  const editBtn = e.target.closest("[data-edit]");
  const deleteBtn = e.target.closest("[data-delete]");
  if (editBtn) {
    const p = products.find(x => x.id === editBtn.dataset.edit);
    if (!p) return;
    setVal("product_id", p.id);
    setVal("sira", p.sira ?? 1);
    setVal("ad", p.ad || "");
    setVal("kategori", p.kategori || "");
    setVal("aciklama", p.aciklama || "");
    setVal("kumas_cinsi", p.kumas_cinsi || "");
    setVal("kalip_model", p.kalip_model || "");
    setVal("teslim_suresi", p.teslim_suresi || "");
    setVal("olcu_bilgisi", p.olcu_bilgisi || "");
    setVal("detay_aciklama", p.detay_aciklama || "");

    setVal("gorsel_url", p.gorsel_url || "");
    setVal("galeri_urls", p.galeri_urls || "");
    const productPreview = $("productPreview");
    if (productPreview && p.gorsel_url) {
      productPreview.src = p.gorsel_url;
      productPreview.style.display = "block";
    }
    setVal("fiyat_notu", p.fiyat_notu || p.buton_text || "Teklif al");
    setVal("buton_link", p.buton_link || "");
    setVal("aktif", p.aktif === false ? "false" : "true");
    refs.productForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (deleteBtn) {
    const p = products.find(x => x.id === deleteBtn.dataset.delete);
    if (!p || !confirm(`"${p.ad}" kartını silmek istiyor musun?`)) return;
    await deleteDoc(doc(db, "urunler", p.id));
    await loadProducts();
  }
});


const heroUploadBtn = $("heroUploadBtn");
if (heroUploadBtn) {
  heroUploadBtn.addEventListener("click", () => {
    uploadToCloudinary($("heroUploadFile")?.files?.[0], "hero_gorsel_url", "heroPreview", heroUploadBtn);
  });
}


const galleryUploadBtn = $("galleryUploadBtn");
if (galleryUploadBtn) {
  galleryUploadBtn.addEventListener("click", async () => {
    const file = $("galleryUploadFile")?.files?.[0];
    if (!file) {
      alert("Önce bir galeri fotoğrafı seç.");
      return;
    }

    const oldText = galleryUploadBtn.textContent;
    galleryUploadBtn.textContent = "Yükleniyor...";
    galleryUploadBtn.disabled = true;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("folder", "angelprive");

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.secure_url) throw new Error(data.error?.message || "Yükleme hatası");

      const current = val("galeri_urls");
      setVal("galeri_urls", current ? current + "\\n" + data.secure_url : data.secure_url);
      alert("Galeri fotoğrafı eklendi. Kartı Kaydet butonuna bas.");
    } catch (err) {
      console.error(err);
      alert("Galeri fotoğrafı yüklenemedi: " + err.message);
    } finally {
      galleryUploadBtn.textContent = oldText || "Galeri Fotoğrafı Yükle";
      galleryUploadBtn.disabled = false;
    }
  });
}


const productUploadBtn = $("productUploadBtn");
if (productUploadBtn) {
  productUploadBtn.addEventListener("click", () => {
    uploadToCloudinary($("productUploadFile")?.files?.[0], "gorsel_url", "productPreview", productUploadBtn);
  });
}




function bindGalleryUploadButton() {
  const btn = $("galleryUploadBtn");
  const fileInput = $("galleryUploadFile");
  const msgBox = refs.productMsg;

  if (!btn || !fileInput || btn.dataset.bound === "1") return;

  btn.dataset.bound = "1";
  btn.addEventListener("click", async () => {
    const files = Array.from(fileInput.files || []);

    if (!files.length) {
      alert("Önce Dosya Seç butonundan bir veya birkaç fotoğraf seç.");
      return;
    }

    const oldText = btn.textContent;
    btn.disabled = true;
    msg(msgBox, `${files.length} fotoğraf yükleniyor...`);

    let success = 0;
    let failed = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        btn.textContent = `Yükleniyor ${i + 1}/${files.length}`;
        try {
          const url = await uploadFileToCloudinary(files[i], msgBox);
          appendLineToTextarea("galeri_urls", url);
          renderGalleryPreview();
          renderImageManagers();
          success++;
        } catch (err) {
          console.error("Galeri yükleme hatası:", err);
          failed++;
        }
      }

      fileInput.value = "";
      msg(msgBox, `${success} fotoğraf galeriye eklendi. ${failed ? failed + " fotoğraf yüklenemedi. " : ""}Şimdi Kartı Kaydet butonuna bas.`);
      alert(`${success} fotoğraf galeriye eklendi. Şimdi Kartı Kaydet butonuna bas.`);
    } finally {
      btn.textContent = oldText || "Seçili Galeri Fotoğraflarını Yükle";
      btn.disabled = false;
    }
  });
}

bindGalleryUploadButton();


onAuthStateChanged(auth, async (user) => {
  const logged = !!user;
  refs.loginCard.classList.toggle("hidden", logged);
  refs.panel.classList.toggle("hidden", !logged);
  if (!logged) return;
  refs.uidText.textContent = user.uid;
  await loadSettings();
  await loadProducts();
});



function bindImageCleanButtons() {
  const clearHero = $("clearHeroImageBtn");
  if (clearHero && clearHero.dataset.bound !== "1") {
    clearHero.dataset.bound = "1";
    clearHero.addEventListener("click", () => {
      if (!confirm("Ana kapak görseli URL alanı temizlensin mi? Sonra Site Ayarlarını Kaydet demen gerekir.")) return;
      setVal("hero_gorsel_url", "");
      msg(refs.settingsMsg, "Ana kapak görseli temizlendi. Kalıcı olması için Site Ayarlarını Kaydet.");
    });
  }

  const clearProduct = $("clearProductImageBtn");
  if (clearProduct && clearProduct.dataset.bound !== "1") {
    clearProduct.dataset.bound = "1";
    clearProduct.addEventListener("click", () => {
      if (!confirm("Bu ürünün ana görseli temizlensin mi? Sonra Kartı Kaydet demen gerekir.")) return;
      setVal("gorsel_url", "");
      renderProductImagePreview();
        renderImageManagers();
      msg(refs.productMsg, "Ürün ana görseli temizlendi. Kalıcı olması için Kartı Kaydet.");
    });
  }

  const clearGallery = $("clearGalleryBtn");
  if (clearGallery && clearGallery.dataset.bound !== "1") {
    clearGallery.dataset.bound = "1";
    clearGallery.addEventListener("click", () => {
      if (!confirm("Bu ürünün galeri görsel listesi tamamen temizlensin mi? Sonra Kartı Kaydet demen gerekir.")) return;
      setVal("galeri_urls", "");
      renderGalleryPreview();
      msg(refs.productMsg, "Galeri listesi temizlendi. Kalıcı olması için Kartı Kaydet.");
    });
  }
}

function bindSeparatedUploads() {
  const heroBtn = $("heroUploadBtn");
  const heroFile = $("heroUploadFile");
  if (heroBtn && heroFile && heroBtn.dataset.boundSeparated !== "1") {
    heroBtn.dataset.boundSeparated = "1";
    heroBtn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();

      const file = heroFile.files && heroFile.files[0];
      if (!file) {
        alert("Önce ana kapak görseli için fotoğraf seç.");
        return;
      }

      const oldText = heroBtn.textContent;
      heroBtn.textContent = "Yükleniyor...";
      heroBtn.disabled = true;
      msg(refs.settingsMsg, "Ana kapak görseli yükleniyor...");

      try {
        const url = await uploadFileToCloudinary(file);
        setVal("hero_gorsel_url", url);
        heroFile.value = "";
        msg(refs.settingsMsg, "Ana kapak görseli yüklendi. Kalıcı olması için Site Ayarlarını Kaydet.");
      } catch (err) {
        alert("Ana kapak görseli yüklenemedi: " + err.message);
        msg(refs.settingsMsg, "Ana kapak görseli yüklenemedi: " + err.message);
      } finally {
        heroBtn.textContent = oldText || "Ana Görseli Yükle";
        heroBtn.disabled = false;
      }
    }, true);
  }

  const productBtn = $("productUploadBtn");
  const productFile = $("productUploadFile");
  if (productBtn && productFile && productBtn.dataset.boundSeparated !== "1") {
    productBtn.dataset.boundSeparated = "1";
    productBtn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();

      const file = productFile.files && productFile.files[0];
      if (!file) {
        alert("Önce ürün ana görseli için fotoğraf seç.");
        return;
      }

      const oldText = productBtn.textContent;
      productBtn.textContent = "Yükleniyor...";
      productBtn.disabled = true;
      msg(refs.productMsg, "Ürün ana görseli yükleniyor...");

      try {
        const url = await uploadFileToCloudinary(file);
        setVal("gorsel_url", url);
        renderProductImagePreview();
        productFile.value = "";
        msg(refs.productMsg, "Ürün ana görseli yüklendi. Kalıcı olması için Kartı Kaydet.");
      } catch (err) {
        alert("Ürün ana görseli yüklenemedi: " + err.message);
        msg(refs.productMsg, "Ürün ana görseli yüklenemedi: " + err.message);
      } finally {
        productBtn.textContent = oldText || "Ürün Görseli Yükle";
        productBtn.disabled = false;
      }
    }, true);
  }
}

function bindGalleryUploadButtonFixed() {
  const btn = $("galleryUploadBtn");
  const fileInput = $("galleryUploadFile");
  const msgBox = refs.productMsg;

  if (!btn || !fileInput || btn.dataset.boundFixed === "1") return;

  btn.dataset.boundFixed = "1";
  btn.addEventListener("click", async (ev) => {
    ev.preventDefault();
    ev.stopImmediatePropagation();

    const files = Array.from(fileInput.files || []);
    if (!files.length) {
      alert("Önce bir veya birkaç galeri fotoğrafı seç.");
      return;
    }

    const oldText = btn.textContent;
    btn.disabled = true;
    let success = 0;
    let failed = 0;
    msg(msgBox, `${files.length} galeri fotoğrafı yükleniyor...`);

    try {
      for (let i = 0; i < files.length; i++) {
        btn.textContent = `Yükleniyor ${i + 1}/${files.length}`;
        try {
          const url = await uploadFileToCloudinary(files[i]);
          appendLineToTextarea("galeri_urls", url);
          renderGalleryPreview();
          success++;
        } catch (err) {
          console.error(err);
          failed++;
        }
      }

      fileInput.value = "";
      msg(msgBox, `${success} galeri fotoğrafı eklendi. ${failed ? failed + " fotoğraf yüklenemedi. " : ""}Kalıcı olması için Kartı Kaydet.`);
      alert(`${success} galeri fotoğrafı eklendi. Şimdi Kartı Kaydet butonuna bas.`);
    } finally {
      btn.textContent = oldText || "Seçili Galeri Fotoğraflarını Yükle";
      btn.disabled = false;
    }
  }, true);
}

document.addEventListener("DOMContentLoaded", () => {
  bindImageCleanButtons();
  bindSeparatedUploads();
  bindGalleryUploadButtonFixed();
});



function parseImageLines(value) {
  if (!value) return [];
  return String(value)
    .split(/\n|,/)
    .map(x => x.trim())
    .filter(Boolean);
}

function renderProductImagePreview() {
  const box = $("productImagePreview");
  if (!box) return;

  const url = val("gorsel_url");
  if (!url) {
    box.innerHTML = `<div class="image-preview-empty">Ürün ana görseli yok.</div>`;
    return;
  }

  box.innerHTML = `
    <div class="image-preview-item single">
      <button class="image-preview-remove" type="button" id="removeProductImagePreview">×</button>
      <img src="${url}" alt="Ürün ana görseli">
    </div>
  `;

  const btn = $("removeProductImagePreview");
  if (btn) {
    btn.addEventListener("click", () => {
      if (!confirm("Ürün ana görseli kaldırılsın mı? Sonra Kartı Kaydet demen gerekir.")) return;
      setVal("gorsel_url", "");
      renderProductImagePreview();
      msg(refs.productMsg, "Ürün ana görseli kaldırıldı. Kalıcı olması için Kartı Kaydet.");
    });
  }
}

function renderGalleryPreview() {
  const box = $("galleryPreview");
  if (!box) return;

  const images = parseImageLines(val("galeri_urls"));

  if (!images.length) {
    box.innerHTML = `<div class="image-preview-empty">Galeri görseli yok.</div>`;
    return;
  }

  box.innerHTML = images.map((url, index) => `
    <div class="image-preview-item">
      <button class="image-preview-remove" type="button" data-remove-gallery="${index}">×</button>
      <img src="${url}" alt="Galeri görseli ${index + 1}">
    </div>
  `).join("");

  box.querySelectorAll("[data-remove-gallery]").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.removeGallery);
      const list = parseImageLines(val("galeri_urls"));
      if (!list[index]) return;

      if (!confirm("Bu galeri fotoğrafı kaldırılsın mı? Sonra Kartı Kaydet demen gerekir.")) return;

      list.splice(index, 1);
      setVal("galeri_urls", list.join("\\n"));
      renderGalleryPreview();
      msg(refs.productMsg, "Galeri fotoğrafı kaldırıldı. Kalıcı olması için Kartı Kaydet.");
    });
  });
}

function renderAllImagePreviews() {
  renderProductImagePreview();
  renderGalleryPreview();
}

document.addEventListener("input", (e) => {
  if (e.target && (e.target.id === "gorsel_url" || e.target.id === "galeri_urls")) {
    renderAllImagePreviews();
    renderImageManagers();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(renderAllImagePreviews, 400);
});



function setupAdminTabs(){
  const tabs=document.querySelectorAll("[data-admin-tab]"); if(!tabs.length)return;
  function show(tab){
    tabs.forEach(t=>t.classList.toggle("active",t.dataset.adminTab===tab));
    document.querySelectorAll(".admin-section").forEach(s=>s.classList.toggle("active",s.dataset.section===tab));
    const cards=[...document.querySelectorAll(".card")].filter(c=>!c.classList.contains("admin-section"));
    cards.forEach(card=>{const tx=(card.textContent||"").toLowerCase(); if(tab==="settings") card.style.display=(tx.includes("site")||tx.includes("ayar")||tx.includes("kapak")||tx.includes("whatsapp"))?"":"none"; else if(tab==="products") card.style.display=(tx.includes("ürün")||tx.includes("kart")||tx.includes("galeri"))?"":"none"; else card.style.display="none";});
    setTimeout(renderImageManagers,80);
  }
  tabs.forEach(t=>t.addEventListener("click",()=>show(t.dataset.adminTab))); show("settings");
}
function imageLines(v){return v?String(v).split(/\n|,/).map(x=>x.trim()).filter(Boolean):[];}
function renderImageManagers(){
  const pb=$("productImageManager"), gb=$("galleryImageManager"); if(!pb||!gb)return;
  const purl=val("gorsel_url");
  if(purl){pb.innerHTML=`<div class="image-row"><img src="${purl}" alt="Ürün ana görseli"><div><div class="image-row-title">Ürün ana görseli</div><div class="image-row-url">${purl}</div></div><button type="button" id="removeProductFromManager">×</button></div>`; $("removeProductFromManager")?.addEventListener("click",()=>{if(!confirm("Ürün ana görseli silinsin mi? Sonra Kartı Kaydet."))return; setVal("gorsel_url",""); if(typeof renderAllImagePreviews==="function")renderAllImagePreviews();
    renderImageManagers(); renderImageManagers(); msg(refs.productMsg,"Ürün ana görseli kaldırıldı. Kartı Kaydet.");});}
  else pb.innerHTML=`<div class="empty-note">Ürün ana görseli yok.</div>`;
  const gallery=imageLines(val("galeri_urls")); if(!gallery.length){gb.innerHTML=`<div class="empty-note">Galeri görseli yok.</div>`;return;}
  gb.innerHTML=gallery.map((url,i)=>`<div class="image-row"><img src="${url}" alt="Galeri ${i+1}"><div><div class="image-row-title">Galeri görseli ${i+1}</div><div class="image-row-url">${url}</div></div><button type="button" data-manager-remove="${i}">×</button></div>`).join("");
  gb.querySelectorAll("[data-manager-remove]").forEach(btn=>btn.addEventListener("click",()=>{const i=Number(btn.dataset.managerRemove); const list=imageLines(val("galeri_urls")); if(!list[i])return; if(!confirm("Bu galeri görseli silinsin mi? Sonra Kartı Kaydet."))return; list.splice(i,1); setVal("galeri_urls",list.join("\n")); if(typeof renderAllImagePreviews==="function")renderAllImagePreviews();
    renderImageManagers(); renderImageManagers(); msg(refs.productMsg,"Galeri görseli kaldırıldı. Kartı Kaydet.");}));
}
document.addEventListener("DOMContentLoaded",()=>{setupAdminTabs();setTimeout(renderImageManagers,600);});
document.addEventListener("input",e=>{if(e.target&&(e.target.id==="gorsel_url"||e.target.id==="galeri_urls"))setTimeout(renderImageManagers,50);});



function bindBulkProductUpload() {
  const btn = $("bulkProductUploadBtn");
  const fileInput = $("bulkProductUploadFile");
  const boxMsg = $("bulkProductMsg");

  if (!btn || !fileInput || btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";

  btn.addEventListener("click", async () => {
    const files = Array.from(fileInput.files || []);
    if (!files.length) {
      alert("Önce bir veya birkaç ürün fotoğrafı seç.");
      return;
    }

    const oldText = btn.textContent;
    btn.disabled = true;
    let success = 0;
    let failed = 0;

    try {
      msg(boxMsg, `${files.length} fotoğraf yükleniyor ve ürün kartları oluşturuluyor...`);

      const startOrder = products.length ? Math.max(...products.map(p => Number(p.sira || 0))) + 1 : 1;

      for (let i = 0; i < files.length; i++) {
        btn.textContent = `Ürün oluşturuluyor ${i + 1}/${files.length}`;

        try {
          const url = await uploadFileToCloudinary(files[i]);
          const order = startOrder + i;

          await addDoc(collection(db, "urunler"), {
            sira: order,
            aktif: true,
            ad: `Yeni Tasarım ${order}`,
            kategori: "Özel Tasarım",
            aciklama: "Kişiye özel ölçü ve tasarım ile hazırlanır.",
            gorsel_url: url,
            galeri_urls: "",
            kumas_cinsi: "",
            kalip_model: "",
            teslim_suresi: "7-14 gün",
            olcu_bilgisi: "Kişiye özel ölçü alınır",
            detay_aciklama: "",
            fiyat_notu: "Detayları İncele",
            buton_link: "",
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });

          success++;
        } catch (err) {
          console.error("Toplu ürün oluşturma hatası:", err);
          failed++;
        }
      }

      fileInput.value = "";
      await loadProducts();
      msg(boxMsg, `${success} ürün oluşturuldu. ${failed ? failed + " fotoğraf/ürün başarısız oldu. " : ""}Ürünler ana sayfa sliderına otomatik düşer.`);
      alert(`${success} ürün oluşturuldu. Ana sayfa sliderında otomatik görünecek.`);
    } finally {
      btn.textContent = oldText || "Seçili Fotoğraflardan Ürün Oluştur";
      btn.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(bindBulkProductUpload, 400);
});
