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
    const file = fileInput.files && fileInput.files[0];

    if (!file) {
      alert("Önce Dosya Seç butonundan bir fotoğraf seç.");
      return;
    }

    const oldText = btn.textContent;
    btn.textContent = "Yükleniyor...";
    btn.disabled = true;
    msg(msgBox, "Galeri fotoğrafı yükleniyor...");

    try {
      const url = await uploadFileToCloudinary(file, msgBox);
      appendLineToTextarea("galeri_urls", url);
      fileInput.value = "";
      msg(msgBox, "Galeri fotoğrafı eklendi. Şimdi Kartı Kaydet butonuna bas.");
      alert("Galeri fotoğrafı yüklendi ve listeye eklendi. Şimdi Kartı Kaydet butonuna bas.");
    } catch (err) {
      console.error(err);
      msg(msgBox, "Galeri yükleme hatası: " + err.message);
      alert("Galeri fotoğrafı yüklenemedi: " + err.message + "\nCloudinary preset Unsigned mı kontrol et.");
    } finally {
      btn.textContent = oldText || "Galeri Fotoğrafı Yükle";
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
