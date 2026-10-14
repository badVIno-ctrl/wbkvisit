"use strict";
const products = [
  {
    id: 1,
    name: "Страшные истории на ночь №1",
    price: 2200,
    old: null,
    desc: "",
    category: "books",
    short: "Многосерийные истории",
    images: ["assets/product-be20b984cf5a.webp", "assets/product-dbbc499490b8.webp"],
  },
  {
    id: 2,
    name: "Страшные истории на ночь №2",
    price: 2400,
    old: 2500,
    desc: "",
    category: "books",
    short: "Одиночные и эксклюзивные истории",
    images: ["assets/product-8bb48aad187a.webp", "assets/product-aca19dbeb16f.webp"],
  },
  {
    id: 3,
    name: "Страшные истории на ночь №3",
    price: 1400,
    old: 1500,
    desc: "",
    category: "books",
    short: "Одиночные страшные истории",
    images: ["assets/product-1801ba08ac02.webp", "assets/product-3d5304b6717a.webp"],
  },
  {
    id: 4,
    name: "Страшные истории на ночь №4",
    price: 2000,
    old: 2200,
    desc: "",
    category: "books",
    short: "Одиночные и многосерийные истории",
    images: ["assets/product-579cb68ea300.webp", "assets/product-ea78560ae927.webp"],
  },
  {
    id: 5,
    name: "Шоппер «Беги прочь из деревни»",
    price: 1300,
    old: null,
    desc: "",
    category: "bags",
    short: "Авторский принт, 100% хлопок",
    images: ["assets/product-284c093cd95f.webp"],
  },
  {
    id: 6,
    name: "Шоппер «Паштет»",
    price: 1300,
    old: null,
    desc: "",
    category: "bags",
    short: "Из истории «Что это вылезло из тумана?»",
    images: ["assets/merch-bag.webp"],
  },
  {
    id: 7,
    name: "Шоппер «World Begemot Kot»",
    price: 1300,
    old: null,
    desc: "",
    category: "bags",
    short: "Авторский принт канала",
    images: ["assets/product-ee3ecf938095.webp"],
  },
  {
    id: 8,
    name: "Футболка «Kot Begemot World»",
    price: 2000,
    old: null,
    desc: "",
    category: "shirts",
    short: "Принт канала Кота Бегемота",
    images: ["assets/merch-shirt.webp"],
  },
  {
    id: 9,
    name: "Футболка «Ох, зря ты сюда полез»",
    price: 2000,
    old: null,
    desc: "",
    category: "shirts",
    short: "Для любителей заглянуть в неизвестность",
    images: ["assets/product-a9a7d70d7a46.webp"],
  },
  {
    id: 10,
    name: "Футболка «Паштет»",
    price: 2000,
    old: null,
    desc: "",
    category: "shirts",
    short: "Из истории «Что это вылезло из тумана?»",
    images: ["assets/product-641bbc745175.webp"],
  },
  {
    id: 11,
    name: "Футболка «Пирожок»",
    price: 2000,
    old: null,
    desc: "",
    category: "shirts",
    short: "Для истинных любителей пирожков",
    images: ["assets/product-b1a61b4d558a.webp"],
  },
];
const icons = {
  bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l2 14H4L6 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6"/></svg>',
  right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>',
};
const $ = (s, root = document) => root.querySelector(s),
  $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const money = (n) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
const escapeText = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const productById = new Map(products.map((p) => [p.id, p]));
const sizes = ["S", "M", "L", "XL", "XXL", "XXXL"];
const storageKey = "wbk-redesign-cart-v1";
let cart = [],
  storageAvailable = true,
  category = "books",
  query = "",
  sort = "featured",
  activeProduct = null,
  activeImage = 0,
  detailQuantity = 1,
  previousFocus = null,
  toastTimer = null,
  draftText = "",
  searchTimer = null;
function readCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(raw)) return [];
    const valid = [];
    for (const r of raw) {
      if (!r || typeof r !== "object") continue;
      const p = productById.get(Number(r.id));
      if (!p) continue;
      const size =
        p.category === "shirts" && sizes.includes(r.size)
          ? r.size
          : p.category === "shirts"
            ? null
            : "";
      if (size === null) continue;
      const qty = Number(r.qty);
      if (!Number.isInteger(qty) || qty < 1) continue;
      const existing = valid.find((x) => x.id === p.id && x.size === size);
      if (existing) existing.qty = Math.min(99, existing.qty + qty);
      else valid.push({ id: p.id, size, qty: Math.min(99, qty) });
    }
    return valid;
  } catch (e) {
    if (!(e instanceof SyntaxError)) storageAvailable = false;
    return [];
  }
}
function saveCart() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(cart));
  } catch (e) {
    storageAvailable = false;
  }
  $("#storageNote").hidden = storageAvailable;
  updateCartBadge();
}
function updateCartBadge() {
  const n = cart.reduce((a, x) => a + x.qty, 0);
  $("#cartCount").textContent = n;
  $("#cartTrigger").setAttribute("aria-label", `Открыть корзину, товаров: ${n}`);
}
function total() {
  return cart.reduce((a, x) => a + productById.get(x.id).price * x.qty, 0);
}
function plural(n, forms) {
  const v = n % 100;
  return forms[v > 10 && v < 20 ? 2 : n % 10 === 1 ? 0 : n % 10 >= 2 && n % 10 <= 4 ? 1 : 2];
}
function notify(text) {
  clearTimeout(toastTimer);
  $("#toastMessage").textContent = text;
  $("#toast").hidden = false;
  toastTimer = setTimeout(() => ($("#toast").hidden = true), 4200);
}
function readUrl() {
  const params = new URLSearchParams(location.search);
  const c = params.get("category");
  category = ["all", "books", "shirts", "bags", "merch"].includes(c) ? c : "books";
  query = (params.get("q") || "").slice(0, 120);
  sort = ["featured", "price-asc", "price-desc", "name"].includes(params.get("sort"))
    ? params.get("sort")
    : "featured";
  $("#searchInput").value = query;
  $("#sortSelect").value = sort;
}
function writeUrl(replace = false) {
  try {
    const u = new URL(location.href);
    u.searchParams.set("category", category);
    query ? u.searchParams.set("q", query) : u.searchParams.delete("q");
    sort !== "featured" ? u.searchParams.set("sort", sort) : u.searchParams.delete("sort");
    history[replace ? "replaceState" : "pushState"]({}, "", u);
  } catch (e) {
    /* file:// history restrictions do not block the catalog */
  }
}
function renderCatalog() {
  let list = products.filter(
    (p) =>
      (category === "all" ||
        p.category === category ||
        (category === "merch" && p.category !== "books")) &&
      (!query ||
        `${p.name} ${p.short} ${p.desc}`
          .toLocaleLowerCase("ru")
          .replaceAll("ё", "е")
          .includes(query.toLocaleLowerCase("ru").replaceAll("ё", "е"))),
  );
  const featured = [4, 1, 3, 2, 6, 5, 7, 8, 10, 9, 11];
  list.sort(
    sort === "price-asc"
      ? (a, b) => a.price - b.price
      : sort === "price-desc"
        ? (a, b) => b.price - a.price
        : sort === "name"
          ? (a, b) => a.name.localeCompare(b.name, "ru")
          : (a, b) => featured.indexOf(a.id) - featured.indexOf(b.id),
  );
  $$(".category").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.filter === category)),
  );
  $("#clearSearch").hidden = !query;
  $("#resultCount").textContent =
    `${list.length} ${plural(list.length, category === "books" ? ["книга", "книги", "книг"] : ["товар", "товара", "товаров"])}${category === "merch" ? " в мерче" : ""}${query ? " по запросу «" + query + "»" : ""}`;
  $("#emptyResults").hidden = !!list.length;
  $("#productGrid").hidden = !list.length;
  $("#productGrid").innerHTML = list
    .map(
      (p) =>
        `<article class="product"><button class="product-photo" data-product="${p.id}" aria-label="Подробнее: ${escapeText(p.name)}">${p.id === 4 ? '<span class="photo-tag">Сборник №4</span>' : ""}<img src="${p.images[0]}" alt="${escapeText(p.name)}" width="850" height="850" loading="lazy" decoding="async"></button><div class="product-content"><h3><button class="title-button" data-product="${p.id}">${escapeText(p.name)}</button></h3><p class="product-description">${escapeText(p.short)}</p><div class="product-buy"><div class="price">${money(p.price)}${p.old ? `<del>${money(p.old)}</del>` : ""}</div><button class="btn" data-product="${p.id}">${p.category === "shirts" ? "Выбрать размер" : "Подробнее"}</button></div></div></article>`,
    )
    .join("");
}
// Useful content fills only an incomplete final catalog row, not a fake product.
const renderProductCatalog = renderCatalog;
renderCatalog = function () {
  renderProductCatalog();
  const cards = $$('.product', $('#productGrid'));
  if (!query && cards.length % 4 === 3) {
    const guide = document.createElement('aside');
    guide.className = 'catalog-guide';
    guide.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 3h6v18H4zM14 3h6v18h-6zM4 8h6M14 8h6"/></svg><h3>Перед покупкой</h3><p>Размеры, наличие и доставка: что стоит уточнить перед заказом.</p><a class="btn secondary" href="#help">Вопросы и ответы</a>';
    $('#productGrid').append(guide);
  }
};

function setCategory(c, scroll = false) {
  clearTimeout(searchTimer);
  category = c;
  query = "";
  $("#searchInput").value = "";
  writeUrl();
  renderCatalog();
  if (scroll)
    $("#catalog").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
}
function openDialog(id) {
  const d = $("#" + id);
  if (d.open) return;
  previousFocus = document.activeElement;
  d.showModal();
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
    d.animate(
      [
        { opacity: 0, transform: id === "cartDialog" ? "translateX(24px)" : "translateY(8px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" },
    );
  document.body.classList.add("locked");
}
function closeDialog(id) {
  const d = $("#" + id);
  if (d.open) d.close();
}
$$("dialog").forEach((d) => {
  d.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const nodes = $$(
      'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex]:not([tabindex="-1"])',
      d,
    ).filter((n) => n.getClientRects().length > 0);
    if (!nodes.length) return;
    const first = nodes[0],
      last = nodes[nodes.length - 1];
    if (e.shiftKey && (document.activeElement === first || !d.contains(document.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (
      !e.shiftKey &&
      (document.activeElement === last || !d.contains(document.activeElement))
    ) {
      e.preventDefault();
      first.focus();
    }
  });
  d.addEventListener("close", () => {
    if (!$$("dialog[open]").length) document.body.classList.remove("locked");
    if (d.id === "mobileMenu") $("#menuTrigger").setAttribute("aria-expanded", "false");
    if (d.id === "productDialog") {
      activeProduct = null;
      const key = d.dataset.productId;
      const trigger = $(`[data-product="${key}"]`);
      if (trigger) trigger.focus({ preventScroll: true });
    } else if (previousFocus && previousFocus.isConnected)
      previousFocus.focus({ preventScroll: true });
  });
  d.addEventListener("click", (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        closeDialog(d.id);
    }
  });
});
function showProduct(id) {
  const p = productById.get(Number(id));
  if (!p) return;
  activeProduct = p;
  activeImage = 0;
  detailQuantity = 1;
  $("#productDialog").dataset.productId = p.id;
  $("#detailCategory").textContent =
    p.category === "books" ? "Книга" : p.category === "shirts" ? "Футболка" : "Шоппер";
  const specs =
    p.category === "books"
      ? `<dt>Содержание</dt><dd>${escapeText(p.short)}</dd><dt>Формат</dt><dd>Печатная книга</dd>`
      : p.category === "bags"
        ? `<dt>Материал</dt><dd>100% хлопок, по данным магазина</dd><dt>Замеры</dt><dd>Нужно уточнить</dd>`
        : `<dt>Размеры на сайте</dt><dd>S–XXXL</dd><dt>Наличие размера</dt><dd>Нужно уточнить</dd>`;
  $("#productDetail").innerHTML =
    `<div class="product-detail"><div class="detail-gallery"><div class="detail-photo"><img id="detailImage" src="${p.images[0]}" width="850" height="850" alt="${escapeText(p.name)}, фото 1"></div><div class="gallery-tools"><div class="gallery-thumbs">${p.images.map((src, i) => `<button class="thumb" data-image="${i}" aria-label="Фото ${i + 1}" aria-pressed="${i === 0}"><img src="${src}" alt="" width="56" height="56"></button>`).join("")}</div>${p.images.length > 1 ? `<div><button class="icon-btn" data-gallery="-1" aria-label="Предыдущее фото">${icons.left}</button><button class="icon-btn" data-gallery="1" aria-label="Следующее фото">${icons.right}</button></div>` : ""}</div></div><div class="detail-copy"><h2 id="detailTitle">${escapeText(p.name)}</h2><p>${escapeText(p.short)}.</p><div class="detail-price"><span class="price">${money(p.price)}</span>${p.old ? `<del>${money(p.old)}</del>` : ""}</div>${p.category === "shirts" ? `<fieldset id="sizeField"><legend>Выбери размер</legend><div class="sizes">${sizes.map((s) => `<label class="size-option"><input type="radio" name="size" value="${s}"><span>${s}</span></label>`).join("")}</div><p class="field-error" id="sizeError" role="alert" hidden>Выбери размер перед добавлением в корзину.</p></fieldset><details class="inline-guide"><summary>Как определить размер?</summary><p>Замеры изделия не предоставлены. S–XXXL — диапазон на оригинальном сайте, а не подтверждённые остатки. Уточни ширину и длину футболки и наличие своего размера у магазина: <a href="mailto:wbk-shop@mail.ru">wbk-shop@mail.ru</a>.</p></details>` : ""}<dl class="detail-specs">${specs}</dl><div class="detail-buy"><div class="quantity" aria-label="Количество товара"><button data-detail-qty="-1" aria-label="Уменьшить количество" disabled>−</button><output id="detailQty" aria-live="polite">1</output><button data-detail-qty="1" aria-label="Увеличить количество">+</button></div><button class="btn" id="addToCart">${icons.bag} В корзину</button></div><p class="source-note">Демонстрационный товар. Цена и фотографии с wbk-shop.ru. Наличие, характеристики и доставку подтверждает магазин.</p></div></div>`;
  openDialog("productDialog");
}
function changeImage(i) {
  if (!activeProduct) return;
  activeImage = (i + activeProduct.images.length) % activeProduct.images.length;
  $("#detailImage").src = activeProduct.images[activeImage];
  $("#detailImage").alt = `${activeProduct.name}, фото ${activeImage + 1}`;
  $$("[data-image]", $("#productDialog")).forEach((b) =>
    b.setAttribute("aria-pressed", String(Number(b.dataset.image) === activeImage)),
  );
}
function addToCart() {
  if (!activeProduct) return;
  const p = activeProduct;
  const selected = $("input[name=size]:checked", $("#productDialog"));
  if (p.category === "shirts" && !selected) {
    $("#sizeError").hidden = false;
    $$("input[name=size]", $("#productDialog")).forEach((r) =>
      r.setAttribute("aria-describedby", "sizeError"),
    );
    $("input[name=size]", $("#productDialog")).focus();
    return;
  }
  const size = p.category === "shirts" ? selected.value : "";
  const existing = cart.find((x) => x.id === p.id && x.size === size);
  if (existing && existing.qty + detailQuantity > 99) {
    notify("В одной позиции можно выбрать до 99 штук.");
    return;
  }
  if (existing) existing.qty += detailQuantity;
  else cart.push({ id: p.id, size, qty: detailQuantity });
  saveCart();
  closeDialog("productDialog");
  notify(`В корзине: ${p.name}${size ? ", размер " + size : ""}`);
}
function renderCart() {
  const html = cart.length
    ? `<ul class="cart-lines">${cart
        .map((x, i) => {
          const p = productById.get(x.id);
          return `<li class="cart-line"><img class="cart-thumb" src="${p.images[0]}" alt="${escapeText(p.name)}" width="80" height="96"><div><h3>${escapeText(p.name)}</h3><p>${x.size ? "Размер " + x.size : p.category === "books" ? "Книга" : "Шоппер"}</p><div class="cart-line-bottom"><div class="quantity" aria-label="Количество: ${escapeText(p.name)}${x.size ? ", размер " + x.size : ""}"><button data-cart-qty="-1" data-line="${i}" aria-label="Уменьшить количество ${escapeText(p.name)}" ${x.qty <= 1 ? "disabled" : ""}>−</button><output aria-live="polite">${x.qty}</output><button data-cart-qty="1" data-line="${i}" aria-label="Увеличить количество ${escapeText(p.name)}" ${x.qty >= 99 ? "disabled" : ""}>+</button></div><span class="price">${money(p.price * x.qty)}</span><button class="remove-line" data-remove="${i}" aria-label="Удалить ${escapeText(p.name)}${x.size ? ", размер " + x.size : ""}">Удалить</button></div></div></li>`;
        })
        .join("")}</ul>`
    : `<div class="empty-cart"><div class="empty-cart-art" aria-hidden="true"><img src="assets/hero-solid.webp" alt="" width="220" height="220"></div><h3>Здесь пока тихо.</h3><p>В корзине ещё нет книг и мерча. Выбери историю для своего вечера.</p><button class="btn" id="emptyCatalog">Выбрать книгу ${icons.right}</button><p class="empty-note">Оставь свет включённым.</p></div>`;
  $("#cartView").innerHTML = html;
  const units = cart.reduce((n, x) => n + x.qty, 0);
  const word = units % 10 === 1 && units % 100 !== 11 ? "товар" : units % 10 >= 2 && units % 10 <= 4 && (units % 100 < 12 || units % 100 > 14) ? "товара" : "товаров";
  $("#drawerCount").textContent = units;
  $("#cartSubtitle").textContent = units ? `${units} ${word} для твоей истории` : "Пока ни одной истории";
  $("#cartTotal").textContent = money(total());
  $("#cartActions").hidden = !cart.length;
}
function cartMode(mode) {
  $("#cartView").hidden = mode !== "cart";
  $("#checkoutView").hidden = mode !== "checkout";
  $("#successView").hidden = mode !== "success";
  $("#cartActions").hidden = mode !== "cart" || !cart.length;
  $("#cartTitle").textContent =
    mode === "cart" ? "Твоя корзина" : mode === "checkout" ? "Черновик заказа" : "Список товаров";
  $("#cartSubtitle").hidden = mode !== "cart";
  $("#drawerCount").hidden = mode !== "cart";
  $("#drawerBody").scrollTop = 0;
}
function openCart() {
  renderCart();
  cartMode("cart");
  openDialog("cartDialog");
}
function renderSummary(target) {
  const box = $(target);
  box.innerHTML =
    cart
      .map((x) => {
        const p = productById.get(x.id);
        return `<p><span>${escapeText(p.name)}${x.size ? " / " + x.size : ""} × ${x.qty}</span><strong>${money(p.price * x.qty)}</strong></p>`;
      })
      .join("") +
    `<p><span>Сумма товаров</span><strong>${money(total())}</strong></p><p><span>Доставка</span><span>Уточняется отдельно</span></p>`;
}
function validateField(input) {
  const rules = {
    customerName: { empty: "Введи имя для черновика.", error: "Введи имя, минимум 2 символа." },
    customerEmail: {
      empty: "Введи email для черновика.",
      error: "Проверь email, например name@example.ru.",
    },
    customerCity: {
      empty: "Укажи город доставки.",
      error: "Введи название города, минимум 2 символа.",
    },
  };
  const errorIds = {
    customerName: "nameError",
    customerEmail: "emailError",
    customerCity: "cityError",
  };
  const value = input.value.trim();
  let message = "";
  if (!value) message = rules[input.id].empty;
  else if (input.id === "customerEmail" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    message = rules[input.id].error;
  else if (input.id !== "customerEmail" && value.length < 2) message = rules[input.id].error;
  const error = $("#" + errorIds[input.id]);
  error.textContent = message;
  error.hidden = !message;
  input.setAttribute("aria-invalid", String(!!message));
  return !message;
}
function makeDraft() {
  const fd = new FormData($("#checkoutForm"));
  const lines = [
    "WBK SHOP — ЧЕРНОВИК, НЕ ЗАКАЗ",
    "Ничего не отправлено. Оплата не производилась.",
    "Наличие, цены и доставку нужно подтвердить у магазина.",
    "",
    `Имя: ${String(fd.get("name")).trim()}`,
    `Email: ${String(fd.get("email")).trim()}`,
    `Город: ${String(fd.get("city")).trim()}`,
    "",
    ...cart.map((x) => {
      const p = productById.get(x.id);
      return `${p.name}${x.size ? " / размер " + x.size : ""} — ${x.qty} шт. × ${money(p.price)} = ${money(p.price * x.qty)}`;
    }),
    "",
    `Сумма товаров: ${money(total())}`,
    "Доставка: не рассчитана, не входит в сумму.",
    `Комментарий: ${String(fd.get("comment") || "").trim()}`,
    "",
    "Контакт магазина: wbk-shop@mail.ru",
    "Оригинальный сайт: https://wbk-shop.ru/",
  ];
  draftText = lines.join("\n");
  renderSummary("#draftSummary");
  cartMode("success");
  $("#successTitle").focus();
}
function downloadDraft() {
  if (!draftText) return;
  const blob = new Blob(["\uFEFF" + draftText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "wbk-черновик-заказа.txt";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  notify("Скачан черновик. Это не оформленный заказ.");
}
// Event delegation keeps all generated catalog and basket controls connected.
document.addEventListener("click", (e) => {
  const close = e.target.closest("[data-close]");
  if (close) {
    closeDialog(close.dataset.close);
    return;
  }
  const categoryLink = e.target.closest("[data-category]");
  if (categoryLink) {
    e.preventDefault();
    if ($("#mobileMenu").open) closeDialog("mobileMenu");
    setCategory(categoryLink.dataset.category, true);
    return;
  }
  const filter = e.target.closest("[data-filter]");
  if (filter) {
    setCategory(filter.dataset.filter);
    return;
  }
  const product = e.target.closest("[data-product]");
  if (product) {
    showProduct(product.dataset.product);
    return;
  }
  const img = e.target.closest("[data-image]");
  if (img) {
    changeImage(Number(img.dataset.image));
    return;
  }
  const gallery = e.target.closest("[data-gallery]");
  if (gallery) {
    changeImage(activeImage + Number(gallery.dataset.gallery));
    return;
  }
  const dq = e.target.closest("[data-detail-qty]");
  if (dq) {
    detailQuantity = Math.min(99, Math.max(1, detailQuantity + Number(dq.dataset.detailQty)));
    $("#detailQty").textContent = detailQuantity;
    $('[data-detail-qty="-1"]').disabled = detailQuantity === 1;
    $('[data-detail-qty="1"]').disabled = detailQuantity === 99;
    return;
  }
  if (e.target.closest("#addToCart")) {
    addToCart();
    return;
  }
  const cq = e.target.closest("[data-cart-qty]");
  if (cq) {
    const i = Number(cq.dataset.line);
    if (!cart[i]) return;
    cart[i].qty = Math.min(99, Math.max(1, cart[i].qty + Number(cq.dataset.cartQty)));
    saveCart();
    renderCart();
    const next = $(`[data-cart-qty="${cq.dataset.cartQty}"][data-line="${i}"]`, $("#cartView"));
    if (next && !next.disabled) next.focus({ preventScroll: true });
    return;
  }
  const remove = e.target.closest("[data-remove]");
  if (remove) {
    cart.splice(Number(remove.dataset.remove), 1);
    saveCart();
    renderCart();
    notify("Товар удалён из корзины.");
    const next = $(".remove-line", $("#cartView"));
    if (next) next.focus({ preventScroll: true });
    else ($("#cartTitle").setAttribute("tabindex", "-1"), $("#cartTitle").focus());
    return;
  }
  if (e.target.closest("#emptyCatalog")) {
    closeDialog("cartDialog");
    setCategory("books", true);
  }
});
$("#cartTrigger").addEventListener("click", openCart);
$("#menuTrigger").addEventListener("click", () => {
  openDialog("mobileMenu");
  $("#menuTrigger").setAttribute("aria-expanded", "true");
});
$("#menuContacts").addEventListener("click", (e) => {
  e.preventDefault();
  closeDialog("mobileMenu");
  $(".footer").scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
  });
});
$$('a[href="#about"],a[href="#help"]', $("#mobileMenu")).forEach((a) =>
  a.addEventListener("click", () => closeDialog("mobileMenu")),
);
$("#searchInput").addEventListener("input", (e) => {
  query = e.target.value.slice(0, 120);
  category = "all";
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    writeUrl(true);
    renderCatalog();
  }, 200);
});
$("#clearSearch").addEventListener("click", () => {
  clearTimeout(searchTimer);
  query = "";
  $("#searchInput").value = "";
  writeUrl(true);
  renderCatalog();
  $("#searchInput").focus();
});
$("#sortSelect").addEventListener("change", (e) => {
  sort = e.target.value;
  writeUrl();
  renderCatalog();
});
$("#resetFilters").addEventListener("click", () => {
  sort = "featured";
  $("#sortSelect").value = sort;
  setCategory("all");
});
$("#productDialog").addEventListener("change", (e) => {
  if (e.target.name === "size") {
    $("#sizeError").hidden = true;
  }
});
$("#checkoutTrigger").addEventListener("click", () => {
  if (!cart.length) return;
  renderSummary("#checkoutSummary");
  cartMode("checkout");
  $("#customerName").focus();
});
$("#backCart").addEventListener("click", () => {
  renderCart();
  cartMode("cart");
  $("#checkoutTrigger").focus();
});
$$("#checkoutForm input").forEach((input) => {
  input.addEventListener("blur", () => validateField(input));
  input.addEventListener("input", () => {
    input.removeAttribute("aria-invalid");
    $("#" + input.getAttribute("aria-describedby")).hidden = true;
    $("#formErrors").hidden = true;
  });
});
$("#checkoutForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!cart.length) {
    renderCart();
    cartMode("cart");
    return;
  }
  const inputs = $$("#checkoutForm input");
  const validity = inputs.map(validateField);
  if (validity.some((v) => !v)) {
    $("#formErrors").textContent =
      "Проверь отмеченные поля. Введённые данные сохранены на странице.";
    $("#formErrors").hidden = false;
    const invalid = inputs[validity.indexOf(false)];
    invalid.focus({ preventScroll: true });
    invalid.closest(".field").scrollIntoView({ block: "nearest", behavior: "instant" });
    return;
  }
  $("#formErrors").hidden = true;
  makeDraft();
});
$("#downloadDraft").addEventListener("click", downloadDraft);
$("#editDraft").addEventListener("click", () => {
  cartMode("checkout");
  $("#customerName").focus();
});
$("#continueAfterDraft").addEventListener("click", () => closeDialog("cartDialog"));
window.addEventListener("popstate", () => {
  readUrl();
  renderCatalog();
});
/* viora-allow: scroll-listener Existing passive handler only toggles a header border state; no scroll-driven animation, no layout measurement. */
window.addEventListener("scroll", () => $("#header").classList.toggle("scrolled", scrollY > 24), {
  passive: true,
});
window.addEventListener("resize", () => {
  if (innerWidth > 900 && $("#mobileMenu").open) closeDialog("mobileMenu");
});
window.addEventListener("storage", (e) => {
  if (e.key === storageKey) {
    cart = readCart();
    updateCartBadge();
    if ($("#cartDialog").open) {
      renderCart();
      cartMode("cart");
      notify("Корзина обновлена в другой вкладке.");
    }
  }
});
cart = readCart();
readUrl();
renderCatalog();
updateCartBadge();
$("#storageNote").hidden = storageAvailable;
