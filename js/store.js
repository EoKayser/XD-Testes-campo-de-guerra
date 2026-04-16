/* ================================
   STORE.JS
   Gerenciamento de produtos e carrinho (suporte a qty)
   ================================ */

const PRODUCTS = [
  {
    id: 1,
    name: "Minecraft Full Acesso",
    price: 70.00,
    promoEnabled: true,
    promoPrice: 50.00,
    img: "assets/images/produto1.png",
    description: "Espada poderosa para derrotar mobs e chefes"
  },
  {
    id: 2,
    name: "Minecraft SFA",
    price: 2.50,
    img: "assets/images/produto2.png",
    description: "Picareta eficiente para mineração rápida"
  },
  {
    id: 3,
    name: "Conta + Capa",
    price: 90.00,
    img: "assets/images/produto3.png",
    description: "Três poções de cura para emergências"
  },
  {
    id: 4,
    name: "Capa Optifine (SFA)",
    price: 5.00,
    img: "assets/images/produto4.png",
    description: "Conjunto de armadura para proteção confiável"
  },
  {
    id: 5,
    name: "Capa Optifine FA",
    price: 30.00,
    img: "assets/images/produto5.png",
    description: "Pacote com 64 tochas para iluminar suas cavernas"
  },
  {
    id: 6,
    name: "Método Unban",
    price: 5.00,
    img: "assets/images/produto6.png",
    description: "Bloco decorativo para construção e paisagismo"
  },
  {
    id: 7,
    name: "Skin Profissional",
    price: 19.90,
    promoEnabled: true,
    promoPrice: 14.90,
    img: "assets/images/produto7.png",
    description: "Pacote especial com itens exclusivos para servidores"
  }
];

export async function getProducts() {
  return PRODUCTS;
}

export function getCart(){
  try{
    const raw = localStorage.getItem('cart');
    const cart = raw ? JSON.parse(raw) : [];
    return cart.map(i => ({ id: i.id, name: i.name, price: Number(i.price), qty: Number(i.qty||1), img: i.img || '' }));
  }catch(e){
    return [];
  }
}

function saveCart(cart){
  localStorage.setItem('cart', JSON.stringify(cart));
}

export function addToCart(product, qty = 1){
  const cart = getCart();
  const existing = cart.find(i => i.id == product.id);
  if (existing){
    existing.qty = Number(existing.qty) + Number(qty);
    if (!existing.img && product.img) existing.img = product.img;
  } else {
    cart.push({ id: product.id, name: product.name, price: Number(product.price), qty: Number(qty), img: product.img || '' });
  }
  saveCart(cart);
}

export function updateQuantity(id, qty){
  const cart = getCart();
  const idx = cart.findIndex(i => i.id == id);
  if (idx === -1) return;
  qty = Number(qty);
  if (qty <= 0) cart.splice(idx, 1);
  else cart[idx].qty = qty;
  saveCart(cart);
}

export function removeFromCart(id){
  const cart = getCart();
  const idx = cart.findIndex(i => i.id == id);
  if (idx !== -1){
    cart.splice(idx,1);
    saveCart(cart);
  }
}

export function clearCart(){
  saveCart([]);
}

export function getCartTotal(){
  const cart = getCart();
  return cart.reduce((total, item) => total + (Number(item.price) || 0) * (Number(item.qty) || 1), 0);
}

export function applyCoupon(code, percentage){
  localStorage.setItem('appliedCoupon', JSON.stringify({code, percentage: Number(percentage)}));
}

export function removeCoupon(){
  localStorage.removeItem('appliedCoupon');
}

export function getAppliedCoupon(){
  try{
    const raw = localStorage.getItem('appliedCoupon');
    return raw ? JSON.parse(raw) : null;
  }catch(e){
    return null;
  }
}

export function getDiscount(subtotal){
  const coupon = getAppliedCoupon();
  if (!coupon) return 0;
  return (subtotal * coupon.percentage) / 100;
}

export function getCartTotalWithDiscount(){
  const subtotal = getCartTotal();
  const discount = getDiscount(subtotal);
  return subtotal - discount;
}

export function getCartCount(){
  const cart = getCart();
  return cart.reduce((total, item) => total + (Number(item.qty) || 1), 0);
}
