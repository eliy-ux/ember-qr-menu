import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { createOrder, createServiceRequest, watchOrder, watchMenu } from "./firestore.js?v=ember-features-45";
import { fallbackMenu, money, escapeHtml } from "./utils.js";
import { auth } from "./firebase.js?v=ember-auth-45";

const $ = selector => document.querySelector(selector);
const state = {menu:fallbackMenu, category:"All", search:"", language:localStorage.getItem("ember-language") || "en", cart:JSON.parse(localStorage.getItem("ember-cart") || "[]"), orderUnsubscribe:null, activeOrderId:null, lastOrderStatus:null, installPrompt:null};
const deviceStorageKey = "ember-device-id";
const debugLog = (...args) => console.info("[EMBER]", ...args);
const getDeviceId = () => {
  let deviceId = localStorage.getItem(deviceStorageKey);
  if(!deviceId){
    deviceId = globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(deviceStorageKey, deviceId);
  }
  return deviceId;
};
const saveCart = () => localStorage.setItem("ember-cart", JSON.stringify(state.cart));
const toast = message => { const node=$("#toast"); node.textContent=message; node.classList.add("show"); clearTimeout(toast.timer); toast.timer=setTimeout(()=>node.classList.remove("show"),3200); };
const image = item => item.image || "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85";

const translations = { 
  en: {
    admin: "Admin",
    order: "Order",
    menu: "Menu",
    install: "Install app",
    today: "Today’s selection",
    find: "Find your favourite",
    search: "Search menu",
    callWaiter: "Call waiter",
    placeOrder: "Place order",
    tableService: "Table service",
    callTitle: "Call a waiter?",
    callCopy: "A team member will come to your table shortly.",
    requestAssistance: "Request assistance",
    almostThere: "Almost there",
    yourOrder: "Your order",
    emptyOrder: "Your order is empty.",
    addSomething: "Add something delicious from the menu.",
    tableNumber: "Table number",
    orderNotes: "Order notes (optional)",
    subtotal: "Subtotal",
    total: "Total",
    done: "Done",
    confirmed: "Order confirmed",
    success: "Order successful",
    orderSent: "Your order has been sent to the kitchen.",
    serving: "Order serving",
    ready: "Your order is ready",
    enjoy: "The kitchen marked your order as completed. Enjoy your meal."
  }, 
  am: {
    admin: "አስተዳዳሪ",
    order: "ትዕዛዝ",
    menu: "ምናሌ",
    install: "መተግበሪያ ጫን",
    today: "የዛሬ ምርጫ",
    find: "የሚወዱትን ይምረጡ",
    search: "ምግብ ፈልግ",
    callWaiter: "አስተናጋጅ ጥራ",
    placeOrder: "ትዕዛዝ አስገባ",
    tableService: "የጠረጴዛ አገልግሎት",
    callTitle: "አስተናጋጅ ይጥራ?",
    callCopy: "የቡድናችን አባል በቅርቡ ወደ ጠረጴዛዎ ይመጣል።",
    requestAssistance: "እርዳታ ጠይቅ",
    almostThere: "በጥቂቱ ቀርቷል",
    yourOrder: "ትዕዛዝዎ",
    emptyOrder: "ትዕዛዝዎ ባዶ ነው።",
    addSomething: "ከምናሌው ውስጥ የሚወዱትን ይጨምሩ።",
    tableNumber: "የጠረጴዛ ቁጥር",
    orderNotes: "ተጨማሪ ማስታወሻ (ካለ)",
    subtotal: "ንዑስ ድምር",
    total: "ጠቅላላ ድምር",
    done: "ተከናውኗል",
    confirmed: "ትዕዛዝ ተረጋግጧል",
    success: "ትዕዛዝ ተሳክቷል",
    orderSent: "ትዕዛዝዎ ወደ ወጥ ቤት ተልኳል።",
    serving: "ምግብ እየቀረበ ነው",
    ready: "ትዕዛዝዎ ዝግጁ ነው",
    enjoy: "ወጥ ቤቱ ትዕዛዝዎን አጠናቋል። በደስታ ይመገቡ።"
  } 
};

const t = key => translations[state.language]?.[key] || translations.en[key] || key;

function renderMenu(){ 
  const term=state.search.trim().toLowerCase(); 
  const items=state.menu.filter(i => !i.outOfStock && (state.category==="All"||i.category===state.category) && (`${i.name} ${i.description}`).toLowerCase().includes(term)); 
  $("#menuContainer").innerHTML=items.length?items.map(item=>{
    const isPopular = ["doro-wat", "beyaynetu", "kitfo"].includes(item.id);
    return `<article class="food-card">
      <div class="food-image">
        <img src="${image(item)}" alt="${escapeHtml(item.name)}" loading="lazy">
        <button data-detail="${item.id}" aria-label="View ${escapeHtml(item.name)}"></button>
      </div>
      <div class="food-info">
        ${isPopular ? '<span class="badge badge-popular">Popular</span>' : ''}
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.description)}</p>
        <div class="card-bottom">
          <span class="price">${money(item.price)}</span>
          <button class="add-button" data-add="${item.id}" aria-label="Add ${escapeHtml(item.name)}"><span class="btn-plus">+</span><span class="btn-text">Add</span></button>
        </div>
      </div>
    </article>`;
  }).join(""):`<p class="empty-cart">${state.menu.length?"No dishes matched your search.":"Our menu is being updated. Please check back soon."}</p>`; 
}

function renderCategories(){ const cats=["All",...new Set(state.menu.map(i=>i.category))]; $("#categoryList").innerHTML=cats.map(c=>`<button class="category-button ${c===state.category?"active":""}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join(""); }
function cartTotal(){return state.cart.reduce((total,line)=>total+line.price*line.quantity,0)}

function renderCart(){ 
  const count=state.cart.reduce((sum,line)=>sum+line.quantity,0); 
  const total = cartTotal();
  $("#cartCount").textContent=count; 
  $("#cartSubtotal").textContent=money(total); 
  $("#cartTotal").textContent=money(total); 
  const checkoutTotal = $("#checkoutButtonTotal");
  if(checkoutTotal) checkoutTotal.textContent = count > 0 ? `· ${money(total)}` : "";

  $("#cartItems").innerHTML=state.cart.length?state.cart.map(line=>`<article class="cart-row"><img src="${image(line)}" alt=""><div><h3>${escapeHtml(line.name)}</h3><p>${money(line.price)}</p><div class="quantity-control"><button class="quantity-button" data-quantity="${line.id}" data-step="-1" aria-label="Decrease">−</button><b>${line.quantity}</b><button class="quantity-button" data-quantity="${line.id}" data-step="1" aria-label="Increase">+</button></div></div><button class="remove-button" data-remove="${line.id}">Remove</button></article>`).join(""):`<div class="empty-cart"><strong>${t("emptyOrder")}</strong>${t("addSomething")}</div>`; 
}

function addToCart(id){ const item=state.menu.find(i=>i.id===id); if(!item)return; const line=state.cart.find(i=>i.id===id); if(line)line.quantity++;else state.cart.push({...item,quantity:1}); saveCart();renderCart();toast(`${item.name} added to your order`); }
function changeQuantity(id,step){const line=state.cart.find(i=>i.id===id);if(!line)return;line.quantity+=step;if(line.quantity<1)state.cart=state.cart.filter(i=>i.id!==id);saveCart();renderCart();}
function openCart(){ $("#cartDrawer").classList.add("open"); $("#cartDrawer").setAttribute("aria-hidden","false"); $("#scrim").hidden=false;document.body.style.overflow="hidden"; }
function closeCart(){ $("#cartDrawer").classList.remove("open"); $("#cartDrawer").setAttribute("aria-hidden","true"); $("#scrim").hidden=true;document.body.style.overflow=""; }
function showDetail(id){const item=state.menu.find(i=>i.id===id);if(!item)return; $("#itemModalBody").innerHTML=`<img class="modal-image" src="${image(item)}" alt="${escapeHtml(item.name)}"><p class="eyebrow">${escapeHtml(item.category)}</p><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.description)}</p><span class="modal-price">${money(item.price)}</span><button class="primary-button" data-add="${item.id}" data-close-after-add="true">Add to order</button>`;$("#itemModal").showModal();}

function applyLanguage(){
  const nodes={
    "#adminLoginButton": "admin",
    "#openCartButton span:not([aria-hidden])": "order",
    "#installAppButton .menu-option-label": "install",
    ".section-heading .eyebrow": "today",
    "#menuHeading": "find",
    "#searchInput": "search",
    "#callWaiterButton": "callWaiter",
    "#waiterTitle": "callTitle",
    "#sendWaiterRequest": "requestAssistance",
    "#cartDrawer .eyebrow": "almostThere",
    "#cartDrawer h2": "yourOrder",
    ".drawer-header h2": "yourOrder",
    ".field-label:first-child": "tableNumber",
    ".totals .total-row:first-child span": "subtotal",
    ".grand-total span": "total",
    "#checkoutButton span:first-child": "placeOrder"
  };
  Object.entries(nodes).forEach(([selector,key])=>{
    const node=$(selector);
    if(node) {
      if (node.childNodes.length > 0 && node.childNodes[0].nodeType === 3) {
        node.childNodes[0].textContent = t(key);
      } else {
        node.textContent = t(key);
      }
    }
  });
  
  const search=$("#searchInput"); if(search)search.placeholder=t("search");
  const waiterEyebrow=$("#waiterModal .eyebrow"); if(waiterEyebrow)waiterEyebrow.textContent=t("tableService");
  const waiterCopy=$("#waiterModal .muted"); if(waiterCopy)waiterCopy.textContent=t("callCopy");
  const toggle=$("#languageToggle"); 
  if(toggle){
    const label=toggle.querySelector(".menu-option-label");
    if(label) label.textContent = state.language === "en" ? "አማ" : "EN";
    toggle.setAttribute("aria-label", state.language === "en" ? "Switch to Amharic" : "Switch to English");
  }
  const menuToggle=$("#menuToggle"); if(menuToggle)menuToggle.setAttribute("aria-label",t("menu"));
  document.documentElement.lang=state.language==="am"?"am":"en";
}

async function requestWaiter(){
  const tableNumber=$("#waiterTableNumber").value.trim() || $("#tableNumber").value.trim();
  if(!tableNumber) return toast("Please enter your table number first.");
  const button=$("#sendWaiterRequest"); button.disabled=true; button.textContent="Sending…";
  try{await createServiceRequest({type:"waiter",tableNumber,source:"customer-menu"});$("#waiterModal").close();toast("A waiter has been called to your table.");}
  catch(error){console.error(error);toast("Could not call a waiter. Please try again.");}
  finally{button.disabled=false;applyLanguage();}
}

async function requestServingNotificationPermission(){
  if(typeof Notification === "undefined"){
    toast("This browser does not support serving notifications.");
    debugLog("Notifications unsupported");
    return false;
  }
  if(Notification.permission === "granted"){
    debugLog("Notification permission already granted");
    return true;
  }
  if(Notification.permission === "denied"){
    toast("Notifications are blocked. Enable them in this site’s browser settings.");
    debugLog("Notification permission denied");
    return false;
  }
  try{
    const permission = await Notification.requestPermission();
    debugLog("Notification permission result", permission);
    if(permission !== "granted") toast("Notifications were not enabled. You can still watch the order in this page.");
    return permission === "granted";
  }catch(error){
    console.warn("Notification permission unavailable",error);
    toast("Notification permission could not be requested on this browser.");
    return false;
  }
}

async function notifyServingOnDevice(order){
  if(!(typeof Notification !== "undefined") || Notification.permission !== "granted") return;
  const table = order?.tableNumber || "your table";
  const options = {
    body: `Your order for Table ${table} is ready and being served!`,
    icon: "assets/icons/ember.svg",
    badge: "assets/icons/ember.svg",
    tag: `ember-order-${order?.orderId || order?.id || state.activeOrderId}`,
    renotify: true
  };
  try{
    if("serviceWorker" in navigator){
      const registration = await navigator.serviceWorker.ready;
      if(registration?.showNotification){await registration.showNotification("EMBER: Order Serving", options);return;}
    }
  }catch(error){console.warn("Service-worker notification unavailable",error);}
  try{new Notification("EMBER: Order Serving", options);}catch(error){console.warn("Browser notification unavailable",error);}
}

function registerPwa(){
  if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(error=>console.warn("PWA unavailable",error));

  window.addEventListener("beforeinstallprompt", event=>{event.preventDefault();state.installPrompt=event;const button=$("#installAppButton");if(button){button.hidden=false;applyLanguage();}});
  $("#installAppButton")?.addEventListener("click",async()=>{if(!state.installPrompt)return;state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;$("#installAppButton").hidden=true;closePreferencesMenu();});
}

function openPreferencesMenu(){const menu=$("#preferencesMenu");const toggle=$("#menuToggle");if(!menu||!toggle)return;menu.hidden=false;toggle.setAttribute("aria-expanded","true");}
function closePreferencesMenu(){const menu=$("#preferencesMenu");const toggle=$("#menuToggle");if(!menu||!toggle)return;menu.hidden=true;toggle.setAttribute("aria-expanded","false");}
function togglePreferencesMenu(){const menu=$("#preferencesMenu");if(menu?.hidden)openPreferencesMenu();else closePreferencesMenu();}

function showOrderSuccess(table,total){
  const modal = $("#orderSuccessModal");
  if(!modal) return;
  $("#successTable").textContent = table;
  $("#successTotal").textContent = money(total);
  const eyebrow = $(".success-eyebrow");
  const title = $("#successTitle");
  const message = $(".success-message");
  const doneBtn = $(".success-done");

  if(eyebrow) eyebrow.textContent = t("confirmed");
  if(title) title.textContent = t("success");
  if(message) message.textContent = t("orderSent");
  if(doneBtn) doneBtn.textContent = t("done");

  if(!modal.open) modal.showModal();
}

function showOrderServing(order){
  if(order?.deviceId && order.deviceId !== getDeviceId()){
    debugLog("Ignoring serving update for another device", {orderId:order?.orderId || order?.id, deviceId:order.deviceId});
    return;
  }
  const table = order?.tableNumber || $("#successTable")?.textContent || "your table";
  const total = Number(order?.total || 0);
  const notificationsEnabled = typeof Notification !== "undefined" && Notification.permission === "granted";
  debugLog("Serving update matched this device", {orderId:order?.orderId || order?.id, table, notificationsEnabled});
  notifyServingOnDevice(order);

  const modal = $("#orderSuccessModal");
  if(!modal){ toast("Your order is now serving."); return; }
  $("#successTable").textContent = table;
  $("#successTotal").textContent = money(total);
  $(".success-eyebrow").textContent = t("serving");
  $("#successTitle").textContent = t("ready");
  $(".success-message").textContent = t("enjoy");
  if(!modal.open) modal.showModal();
  toast(notificationsEnabled ? "Your order is now serving." : "Your order is now serving. Notifications are blocked on this phone.");
}

function watchCustomerOrder(orderId){
  if(!orderId) return;
  if(state.orderUnsubscribe) state.orderUnsubscribe();
  state.orderUnsubscribe = null;
  state.activeOrderId = orderId;
  state.lastOrderStatus = null;
  debugLog("Watching order tracking document", {orderId, deviceId:getDeviceId()});
  state.orderUnsubscribe = watchOrder(orderId, order => {
    debugLog("Order tracking snapshot", {orderId, order});
    if(!order || (order.deviceId && order.deviceId !== getDeviceId())) return;
    const status = String(order.status || "Pending").toLowerCase();
    if(status === "completed" && state.lastOrderStatus !== "completed"){
      showOrderServing(order);
      localStorage.removeItem("ember-active-order");
      if(state.orderUnsubscribe){ state.orderUnsubscribe(); state.orderUnsubscribe = null; }
    }
    state.lastOrderStatus = status;
  }, error => {
    console.error("Unable to watch order status.", error);
    debugLog("Order tracking listener failed", {orderId, code:error?.code, message:error?.message});
    toast(error?.code === "permission-denied" ? "Order updates are blocked by Firebase rules. Publish firestore.rules, then try a new order." : "Order placed, but live status updates are unavailable.");
  });
}

async function checkout(){ 
  const tableNumber=$("#tableNumber").value.trim(); 
  if(!state.cart.length) return toast("Add an item before placing your order."); 
  if(!tableNumber) return toast("Please enter your table number."); 
  
  const button=$("#checkoutButton");
  const originalHtml = button.innerHTML;
  const notificationsEnabled = await requestServingNotificationPermission();
  const orderTotal = cartTotal();
  button.disabled=true;
  button.innerHTML = `<span>${t("placeOrder")}...</span>`; 
  
  try{ 
    await new Promise(resolve => setTimeout(resolve, 1200));
    const orderRef = await createOrder({
      tableNumber,
      deviceId:getDeviceId(),
      notes:$("#orderNotes").value.trim(),
      items:state.cart.map(({id,name,price,quantity})=>({id,name,price,quantity})),
      total:orderTotal
    });
    debugLog("Order created", {orderId:orderRef.id, tableNumber, deviceId:getDeviceId(), notificationsEnabled});
    localStorage.setItem("ember-active-order", orderRef.id);
    watchCustomerOrder(orderRef.id); 
    state.cart=[];
    saveCart();
    renderCart();
    $("#tableNumber").value="";
    $("#orderNotes").value="";
    closeCart();
    showOrderSuccess(tableNumber,orderTotal); 
  } catch(error) {
    console.error(error);
    if($("#orderSuccessModal")?.open) $("#orderSuccessModal").close();
    toast("Could not send the order. Check Firebase setup and rules.");
  } finally {
    button.disabled=false;
    button.innerHTML = originalHtml;
    renderCart();
  }
}

document.addEventListener("click", async event=>{ 
  const t=event.target.closest("button");
  if(!t)return;
  if(t.dataset.add){addToCart(t.dataset.add);if(t.dataset.closeAfterAdd)$("#itemModal").close();return}
  if(t.dataset.detail)return showDetail(t.dataset.detail);
  if(t.dataset.category){state.category=t.dataset.category;renderCategories();renderMenu();return}
  if(t.dataset.quantity)return changeQuantity(t.dataset.quantity,Number(t.dataset.step));
  if(t.dataset.remove)return changeQuantity(t.dataset.remove,-999);
  if(t.matches("[data-close-modal]"))t.closest("dialog").close();
});

$("#openCartButton").addEventListener("click",openCart);
$("#closeCartButton").addEventListener("click",closeCart);
$("#scrim").addEventListener("click",closeCart);
$("#searchInput").addEventListener("input",e=>{state.search=e.target.value;renderMenu()});
$("#checkoutButton").addEventListener("click",checkout);
$("#adminLoginButton")?.addEventListener("click", (e) => {
  e.preventDefault();
  closePreferencesMenu();
  $("#loginModal").showModal();
});
$("#menuToggle")?.addEventListener("click",togglePreferencesMenu);
$("#languageToggle")?.addEventListener("click",()=>{
  state.language=state.language==="en"?"am":"en";
  localStorage.setItem("ember-language",state.language);
  applyLanguage();
  renderMenu();
  closePreferencesMenu();
});
document.addEventListener("click",event=>{if(!event.target.closest(".preferences-wrap"))closePreferencesMenu();});
$("#callWaiterButton")?.addEventListener("click",()=>{$("#waiterTableNumber").value=$("#tableNumber").value.trim();$("#waiterModal").showModal();});
$("#sendWaiterRequest")?.addEventListener("click",requestWaiter);
$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const b=e.submitter;
  b.disabled=true;
  b.textContent="Signing in...";
  try{
    await signInWithEmailAndPassword(auth,$("#loginEmail").value,$("#loginPassword").value);
    $("#loginModal").close();
    window.location.href="admin.html"
  }catch(error){
    console.error(error);
    toast("Sign-in failed. Check your email and password.")
  }finally{
    b.disabled=false;
    b.textContent="Sign in";
  }
});

onAuthStateChanged(auth,user=>{const label=$("#adminLoginButton .menu-option-label");if(label)label.textContent=user && !user.isAnonymous ? "Dashboard" : t("admin");});
$("#year").textContent=new Date().getFullYear();
applyLanguage();
renderCategories();
renderMenu();
renderCart();
registerPwa();
getDeviceId();
debugLog("Customer app ready", {deviceId:getDeviceId(), notificationPermission:typeof Notification === "undefined" ? "unsupported" : Notification.permission, serviceWorkerControlled:Boolean(navigator.serviceWorker?.controller)});

const tableFromQr=new URLSearchParams(window.location.search).get("table");
if(tableFromQr){$("#tableNumber").value=tableFromQr;toast(`Welcome! You're ordering for table ${tableFromQr}.`);}
watchMenu(items=>{state.menu=items;if(state.category!=="All"&&!items.some(i=>i.category===state.category))state.category="All";renderCategories();renderMenu();},error=>console.error("Live menu unavailable, using fallback menu.",error));
const savedOrderId = localStorage.getItem("ember-active-order");
if(savedOrderId) watchCustomerOrder(savedOrderId);
