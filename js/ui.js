/* ================================
   UI.JS
   Responsável apenas pela interface
   (renderização e eventos visuais)
   Com funcionalidades profissionais:
   - Busca de produtos
   - Filtros e ordenação
   - Toast notifications
   ================================ */

import {
  getProducts,
  getCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  getCartTotal,
  getCartCount
} from "./store.js";

/* ---------- UTIL ---------- */
function toBRL(v){ try{ return Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }catch{ return 'R$ ' + (Number(v)||0).toFixed(2).replace('.',','); } }

/* ---------- TOAST NOTIFICATIONS ---------- */
function showToast(message, type = 'success', duration = 4000) {
  // Criar container se não existir
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
    </div>
    <div class="toast-timer" style="animation-duration: ${duration}ms;"></div>
  `;

  container.appendChild(toast);

  // Remover após o tempo especificado
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => {
      toast.remove();
      // Limpar container se estiver vazio
      if (container.children.length === 0) {
        container.remove();
      }
    }, 300);
  }, duration);
}

/* ---------- ELEMENTOS ---------- */
const productsContainer = document.querySelector(".products-list");
const cartSidebar = document.getElementById("cart-sidebar");
const cartOverlay = document.getElementById("cart-overlay");
const cartItemsContainer = document.querySelector(".cart-items");
const cartCount = document.querySelector(".cart-count");
const cartTotal = document.getElementById("cart-total");
const openCartBtn = document.getElementById("open-cart");
const closeCartBtn = document.getElementById("close-cart");
const checkoutLink = document.querySelector('.checkout-button');
const searchInput = document.getElementById('product-search');
const searchClear = document.getElementById('search-clear');
const filterBar = document.getElementById('filter-bar');

/* ---------- ESTADO DE FILTROS ---------- */
let currentFilter = 'all';
let currentSearch = '';
let allProducts = [];

/* ---------- PRODUTOS ---------- */
export async function renderProducts(products = null) {
  if (!products) {
    allProducts = await getProducts();
    products = allProducts;
  }

  productsContainer.innerHTML = "";

  if (products.length === 0) {
    productsContainer.innerHTML = "<p style='text-align:center;color:var(--muted);grid-column:1/-1;padding:40px;'>Nenhum produto encontrado.</p>";
    return;
  }

  products.forEach((product, index) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.style.animation = `fadeInUp 0.5s ease ${index * 0.05}s both`;

    const basePrice = parseFloat(product.price);
    const promoEnabled = !!product.promoEnabled && product.promoPrice !== '' && !isNaN(parseFloat(product.promoPrice)) && parseFloat(product.promoPrice) > 0 && parseFloat(product.promoPrice) < basePrice;
    const promoPrice = promoEnabled ? parseFloat(product.promoPrice) : null;
    const priceHTML = promoEnabled 
      ? `<span class="price-old">${toBRL(basePrice)}</span><span class="price-new">${toBRL(promoPrice)}</span>`
      : `${toBRL(basePrice)}`;
    const badgeHTML = promoEnabled ? `<div class="badge-promo">Promo</div>` : '';

    card.innerHTML = `
      <div class="product-image">
        <img src="${product.img}" alt="${product.name}" loading="lazy">
      </div>

      <div class="product-info">
        ${badgeHTML}
        <h3 class="product-name">${product.name}</h3>
        <p class="product-price">${priceHTML}</p>

        <button class="product-button" data-id="${product.id}">
          Adicionar ao carrinho
        </button>
      </div>
    `;

    if (promoEnabled) card.classList.add('promo');

    productsContainer.appendChild(card);
  });

  bindAddToCartButtons();
}

/* ---------- FILTROS E BUSCA ---------- */
function filterProducts() {
  let products = [...allProducts];

  // Aplicar busca
  if (currentSearch) {
    const search = currentSearch.toLowerCase().trim();
    products = products.filter(p => 
      p.name.toLowerCase().includes(search) ||
      (p.description && p.description.toLowerCase().includes(search))
    );
  }

  // Aplicar filtros
  switch (currentFilter) {
    case 'promo':
      products = products.filter(p => p.promoEnabled && p.promoPrice < p.price);
      break;
    case 'low':
      products.sort((a, b) => {
        const priceA = a.promoEnabled ? a.promoPrice : a.price;
        const priceB = b.promoEnabled ? b.promoPrice : b.price;
        return priceA - priceB;
      });
      break;
    case 'high':
      products.sort((a, b) => {
        const priceA = a.promoEnabled ? a.promoPrice : a.price;
        const priceB = b.promoEnabled ? b.promoPrice : b.price;
        return priceB - priceA;
      });
      break;
  }

  renderProducts(products);
}

function initSearch() {
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value;
    searchClear.classList.toggle('visible', currentSearch.length > 0);
    filterProducts();
  });

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      currentSearch = '';
      searchClear.classList.remove('visible');
      filterProducts();
      searchInput.focus();
    });
  }
}

function initFilters() {
  if (!filterBar) return;

  const filterBtns = filterBar.querySelectorAll('.filter-btn');
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remover active de todos
      filterBtns.forEach(b => b.classList.remove('active'));
      // Adicionar active no clicado
      btn.classList.add('active');
      // Aplicar filtro
      currentFilter = btn.dataset.filter;
      filterProducts();
    });
  });
}

/* ---------- CARRINHO ---------- */
export function renderCart() {
  const cart = getCart();
  cartItemsContainer.innerHTML = "";

  if (cart.length === 0){
    cartItemsContainer.innerHTML = `<div class="cart-empty" style="text-align:center;padding:40px;color:var(--muted);">
      <div style="font-size:3rem;margin-bottom:16px;">🛒</div>
      <p>Seu carrinho está vazio.</p>
      <p style="font-size:0.85rem;margin-top:8px;">Adicione produtos para continuar.</p>
    </div>`;
  }

  cart.forEach((item) => {
    const div = document.createElement("div");
    div.className = "cart-item";

    div.innerHTML = `
      <div class="cart-item-left">
        <div class="cart-thumb"><img src="${item.img || 'assets/images/produto1.png'}" alt="${item.name}"></div>
        <div class="cart-meta">
          <div class="cart-name">${item.name}</div>
          <div class="cart-price">${toBRL(item.price)}</div>
        </div>
      </div>

      <div class="cart-item-right">
        <div class="qty-controls">
          <button class="qty-decrease" data-id="${item.id}" aria-label="Diminuir quantidade">−</button>
          <input class="qty-input" data-id="${item.id}" type="number" min="1" value="${item.qty}" aria-label="Quantidade do produto">
          <button class="qty-increase" data-id="${item.id}" aria-label="Aumentar quantidade">+</button>
        </div>
        <div class="cart-sub" style="font-weight:700;color:var(--text);">${toBRL(item.price * item.qty)}</div>
        <button class="remove-item" data-id="${item.id}" aria-label="Remover item" style="background:none;border:none;color:#ff5555;cursor:pointer;font-size:1.1rem;padding:4px;">✕</button>
      </div>
    `;

    cartItemsContainer.appendChild(div);
  });

  cartCount.textContent = getCartCount();
  cartTotal.textContent = toBRL(getCartTotal());

  // enable/disable checkout link based on cart contents
  const checkoutBtn = document.querySelector('.checkout-button');
  if (checkoutBtn) {
    if (cart.length === 0) {
      checkoutBtn.classList.add('disabled');
      checkoutBtn.setAttribute('aria-disabled', 'true');
      checkoutBtn.setAttribute('tabindex','-1');
    } else {
      checkoutBtn.classList.remove('disabled');
      checkoutBtn.removeAttribute('aria-disabled');
      checkoutBtn.removeAttribute('tabindex');
    }
  }

  bindCartItemEvents();
}

/* ---------- EVENTOS ---------- */
async function bindAddToCartButtons() {
  // only bind buttons that are inside a product card (avoid binding CTAs like checkout or promo view)
  document.querySelectorAll('.product-card .product-button').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const products = await getProducts();
      const product = products.find(p => p.id == id);

      if (!product) return;

      const basePrice = parseFloat(product.price);
      const promoEnabled = !!product.promoEnabled && product.promoPrice !== '' && !isNaN(parseFloat(product.promoPrice)) && parseFloat(product.promoPrice) > 0 && parseFloat(product.promoPrice) < basePrice;
      const priceToAdd = promoEnabled ? parseFloat(product.promoPrice) : parseFloat(product.price);

      addToCart({ id: product.id, name: product.name, price: priceToAdd, img: product.img }, 1);

      renderCart();
      openCart();

      // Toast notification
      showToast(`${product.name} adicionado ao carrinho!`, 'success');

      // small visual feedback
      btn.textContent = 'Adicionado ✓';
      btn.style.background = '#10b981';
      setTimeout(()=> { 
        btn.textContent = 'Adicionar ao carrinho';
        btn.style.background = '';
      }, 900);
    };
  });
}

function bindCartItemEvents(){
  // qty buttons
  document.querySelectorAll('.qty-increase').forEach(b=> b.onclick = () => {
    const id = b.dataset.id; 
    const current = document.querySelector(`.qty-input[data-id="${id}"]`);
    updateQuantity(id, Number(current.value||1) + 1); 
    renderCart();
    showToast('Quantidade atualizada', 'info');
  });
  
  document.querySelectorAll('.qty-decrease').forEach(b=> b.onclick = () => {
    const id = b.dataset.id; 
    const current = document.querySelector(`.qty-input[data-id="${id}"]`);
    const newQ = Number(current.value||1) - 1; 
    updateQuantity(id, newQ); 
    renderCart();
    if (newQ <= 0) showToast('Item removido do carrinho', 'info');
  });
  
  document.querySelectorAll('.qty-input').forEach(inp=> inp.onchange = () => {
    const id = inp.dataset.id; 
    const v = Number(inp.value||1); 
    if (isNaN(v) || v < 1) { 
      inp.value = 1; 
      updateQuantity(id,1);
    } else { 
      updateQuantity(id,v); 
    } 
    renderCart();
  });

  // remove
  document.querySelectorAll('.remove-item').forEach(b=> b.onclick = () => { 
    removeFromCart(b.dataset.id); 
    renderCart();
    showToast('Item removido do carrinho', 'info');
  });
}

/* ---------- ABRIR / FECHAR ---------- */
export function openCart() {
  cartSidebar.classList.add("active");
  cartOverlay.classList.add("active");
}

export function closeCart() {
  cartSidebar.classList.remove("active");
  cartOverlay.classList.remove("active");
}

/* ---------- BIND GLOBAL ---------- */
export function bindCartControls() {
  openCartBtn.onclick = openCart;
  closeCartBtn.onclick = closeCart;
  cartOverlay.onclick = closeCart;
  if (checkoutLink) checkoutLink.addEventListener('click', ()=> closeCart());

  // Clear cart (button created dynamically)
  const clearBtn = document.querySelector('.clear-cart');
  if (clearBtn) clearBtn.addEventListener('click', ()=> {
    if (confirm('Tem certeza que deseja limpar o carrinho?')){ 
      clearCart(); 
      renderCart();
      showToast('Carrinho limpo', 'info');
    }
  });
}

/* ---------- THEME ---------- */
function setTheme(theme){
  // add a temporary class to enable smooth transitions
  try{ document.documentElement.classList.add('with-transition'); }catch(e){ /* noop */ }

  // respect prefers-reduced-motion
  try{ if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { if (theme === 'light') document.documentElement.setAttribute('data-theme','light'); else document.documentElement.removeAttribute('data-theme'); localStorage.setItem('xd-theme', theme); setTimeout(()=>{ try{ document.documentElement.classList.remove('with-transition'); }catch(e){} }, 300); return; } }catch(e){}

  // create a themed overlay to mask repaints during the theme switch
  try{
    const existing = document.querySelector('.theme-fade');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'theme-fade ' + (theme === 'light' ? 'light' : 'dark');
    document.body.appendChild(overlay);
    // force a reflow so transition can be applied
    // eslint-disable-next-line no-unused-expressions
    overlay.offsetWidth; // trigger reflow

    // fade overlay in
    overlay.classList.add('visible');

    // add animating class to trigger the cross-fade + micro-zoom
    try{ if (!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) { document.documentElement.classList.add('theme-animating'); } }catch(e){}

    // apply the theme while the overlay covers the page to avoid flashes
    if (theme === 'light') document.documentElement.setAttribute('data-theme','light'); else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('xd-theme', theme);

    // ensure we remove the overlay later
    const FADE_MS = 1000; // should match CSS timing (updated to match CSS)

    // after a short delay, fade out the overlay and then remove transition class
    setTimeout(()=>{
      overlay.classList.remove('visible');
      setTimeout(()=>{ try{ overlay.remove(); }catch(e){} }, 260);
    }, FADE_MS - 220);

    // remove the transition and animating class after the fade + a bit of buffer
    setTimeout(()=>{ try{ document.documentElement.classList.remove('with-transition'); document.documentElement.classList.remove('theme-animating'); }catch(e){} }, FADE_MS + 120);
  }catch(e){
    // fallback: just apply theme and remove transition after a safe timeout
    if (theme === 'light') document.documentElement.setAttribute('data-theme','light');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('xd-theme', theme);
    setTimeout(()=>{ try{ document.documentElement.classList.remove('with-transition'); }catch(e){} }, 1000);
  }
}

function toggleTheme(){
  const current = localStorage.getItem('xd-theme') || 'dark';
  setTheme(current === 'dark' ? 'light' : 'dark');
}

function initTheme(){
  const saved = localStorage.getItem('xd-theme') || 'dark';
  setTheme(saved);
  const tbtn = document.getElementById('theme-toggle');
  if (tbtn) tbtn.onclick = toggleTheme;
}

function bindPromoButton(){
  const btn = document.getElementById('view-promos');
  if (!btn) return;
  btn.addEventListener('click', ()=>{
    // Ativar filtro de promoções
    currentFilter = 'promo';
    const promoBtn = document.querySelector('[data-filter="promo"]');
    if (promoBtn) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      promoBtn.classList.add('active');
    }
    filterProducts();
    
    // Scroll até produtos
    const productsSection = document.getElementById('products');
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

/* ---------- MARQUEE (seamless) ---------- */
function debounce(fn, wait=150){
  let t;
  return (...args)=>{ clearTimeout(t); t = setTimeout(()=> fn(...args), wait); };
}

function initMarquee(){
  const marquee = document.querySelector('.marquee');
  if (!marquee) return;

  // Force marquee on by default (ignore prefers-reduced-motion to keep banner moving)
  const forced = true;
  marquee.style.animation = '';

  // Ensure we have two copies for seamless looping
  const spans = marquee.querySelectorAll('span');
  if (spans.length < 2){
    const text = marquee.textContent.trim();
    marquee.innerHTML = `<span>${text}</span><span aria-hidden="true">${text}</span>`;
  }

  const first = marquee.querySelector('span');
  if (!first) return;
  const styleId = 'xd-marquee-style';
  const existing = document.getElementById(styleId);
  if (existing) existing.remove();

  // compute shift as width of one copy
  const shift = first.offsetWidth + 32; // small fudge for spacing
  const speed = 60; // pixels per second
  const duration = Math.max(6, Math.round((shift / speed) * 10) / 10);

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `@keyframes xdMarquee { 0%{ transform: translateX(0); } 100%{ transform: translateX(-${shift}px); } } .marquee { animation: xdMarquee ${duration}s linear infinite !important; }`;
  document.head.appendChild(style);
}

/* ---------- MOBILE DETECTION ---------- */
function detectMobile() {
  const isMobile = window.innerWidth < 768;
  document.body.classList.toggle('mobile', isMobile);
}

/* ---------- INIT ---------- */
export async function initUI() {
  initTheme();
  await renderProducts();
  renderCart();
  bindCartControls();
  bindPromoButton();
  initMarquee();
  initSearch();
  initFilters();
  detectMobile();
  window.addEventListener('resize', debounce(initMarquee, 200));
  window.addEventListener('resize', debounce(detectMobile, 200));
}

// Auto init on DOMContentLoaded
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUI); else initUI();

// Export showToast for use in other modules
export { showToast };