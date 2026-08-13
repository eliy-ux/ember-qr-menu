import { auth } from "./firebase.js?v=ember-auth-41";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { watchOrders, changeOrderStatus, deleteOrder, watchMenu, addMenuItem, updateMenuItem, deleteMenuItem, watchServiceRequests, changeServiceRequestStatus, getUserRole } from "./firestore.js?v=ember-features-41";
import { money, escapeHtml, fallbackMenu } from "./utils.js";

const $ = selector => document.querySelector(selector);
const state = { orders: [], menu: [], serviceRequests: [], pickedImage: "", role: "admin", orderFilter: "live", orderSearch: "", menuSearch: "", unsubscribeOrders: null, unsubscribeMenu: null, unsubscribeServiceRequests: null, audioContext: null, orderSnapshotReady: false, seenOrderIds: new Set() };
const toast = message => { const node = $("#toast"); if (!node) return; node.textContent = message; node.classList.add("show"); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove("show"), 4200); };
const firestoreError = (error, fallback) => { const code = String(error?.code || "").replace(/^firebase\\//, ""); if (code === "permission-denied") return `${fallback} Firestore denied this account. Confirm it is an admin account and that the latest rules are deployed.`; if (code === "not-found") return `${fallback} This menu item no longer exists. Refresh the dashboard.`; if (code === "resource-exhausted") return `${fallback} The image or document is too large. Use an image URL or a smaller picture.`; if (code === "invalid-argument") return `${fallback} Check the name, price, category, and image URL.`; return `${fallback} (${code || "unknown error"})`; };

const statusKey = status => { const raw = String(status || "Pending").toLowerCase(); return raw === "new" ? "pending" : raw; };
const statusLabel = status => { const raw = String(status || "Pending").toLowerCase(); if (raw === "new") return "Pending"; const key = statusKey(status); return key.charAt(0).toUpperCase() + key.slice(1); };
const nextStatus = status => ({ pending: "Preparing", preparing: "Completed" }[statusKey(status)] || "");
const nextActionLabel = status => ({ pending: "Start preparing", preparing: "Mark complete" }[statusKey(status)] || "");
const dietaryText = item => Array.isArray(item?.dietary) ? item.dietary.join(", ") : String(item?.dietary || "");

function formatDate(value) { if (value?.toDate) return value.toDate().toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); return "Just received"; }
function orderReference(order) { const raw = String(order.id || "").replace(/[^a-z0-9]/gi, "").toUpperCase(); return raw ? `#${raw.slice(-6)}` : "#NEW"; }

function ensureAudio() { try { if (!state.audioContext) state.audioContext = new (window.AudioContext || window.webkitAudioContext)(); if (state.audioContext.state === "suspended") state.audioContext.resume(); } catch (error) { console.warn("Order sound unavailable", error); } }
function playNewOrderSound() { ensureAudio(); const context = state.audioContext; if (!context) return; const now = context.currentTime; [659, 880, 1175].forEach((frequency, index) => { const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.type = "sine"; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(0.0001, now + index * 0.12); gain.gain.exponentialRampToValueAtTime(0.12, now + index * 0.12 + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.22); oscillator.connect(gain); gain.connect(context.destination); oscillator.start(now + index * 0.12); oscillator.stop(now + index * 0.12 + 0.24); }); }
document.addEventListener("pointerdown", ensureAudio, { once: true });

function renderOrders() {
  const orders = state.orders; const key = statusKey;
  $("#pendingCount").textContent = orders.filter(x => key(x.status) === "pending").length;
  $("#preparingCount").textContent = orders.filter(x => key(x.status) === "preparing").length;
  $("#completedCount").textContent = orders.filter(x => key(x.status) === "completed").length;
  $("#revenueAmount").textContent = money(orders.filter(x => key(x.status) === "completed").reduce((sum, x) => sum + Number(x.total || 0), 0));
  let filtered = orders;
  if (state.orderFilter === "live") filtered = filtered.filter(x => !["completed", "cancelled"].includes(key(x.status)));
  if (state.orderFilter === "completed") filtered = filtered.filter(x => key(x.status) === "completed");
  if (state.orderFilter === "cancelled") filtered = filtered.filter(x => key(x.status) === "cancelled");
  const query = state.orderSearch.trim().toLowerCase();
  if (query) filtered = filtered.filter(order => [order.id, order.tableNumber, order.status, order.notes, ...(order.items || []).map(item => item.name)].join(" ").toLowerCase().includes(query));
  const countLabel = $("#orderCountLabel"); if (countLabel) countLabel.textContent = `${filtered.length} ${filtered.length === 1 ? "order" : "orders"}`;
  const container = $("#orderList");
  if (!filtered.length) { const message = query ? "No orders match your search." : state.orderFilter === "live" ? "The kitchen queue is clear." : `No ${state.orderFilter} orders yet.`; container.innerHTML = `<div class="empty-cart"><strong>${message}</strong><span>New orders will appear here automatically.</span></div>`; return; }
  container.innerHTML = filtered.map(order => {
    const status = key(order.status); const next = nextStatus(order.status); const itemCount = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0); const table = order.tableNumber ? `Table ${escapeHtml(order.tableNumber)}` : "Walk-in order"; const safeId = escapeHtml(order.id || ""); const safeStatus = escapeHtml(statusLabel(order.status));
    return `<article class="order-card"><div class="order-card-top"><div><h3>${table}</h3><p>${orderReference(order)} · ${formatDate(order.createdAt)} · ${itemCount} ${itemCount === 1 ? "item" : "items"}</p></div><span class="status-pill status-${status}">${safeStatus}</span></div><div class="order-lines">${(order.items || []).map(item => `<div class="item-line">${Number(item.quantity || 0)}× ${escapeHtml(item.name)} — ${money(Number(item.price || 0) * Number(item.quantity || 0))}</div>`).join("")}<div class="order-total"><span>Order total</span><strong>${money(order.total)}</strong></div>${order.notes ? `<div class="order-notes"><em>Guest note: ${escapeHtml(order.notes)}</em></div>` : ""}</div><div class="order-card-footer">${next ? `<button class="next-action" data-status="${next}" data-order="${safeId}" type="button">${nextActionLabel(order.status)} <span aria-hidden="true" style="display: flex; align-items: center;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span></button>` : `<span class="section-count">${status === "completed" ? "Service complete" : "No further action"}</span>`}<details class="order-more"><summary>More actions</summary><div class="order-more-body"><div class="price-adjustment"><label>Adjust total</label><div class="adjustment-controls"><input type="number" class="price-input" data-order="${safeId}" placeholder="Amount in Br" step="10" aria-label="Adjust order total"><button class="adj-btn" data-adjust="-100" data-order="${safeId}" type="button">−100</button><button class="adj-btn" data-adjust="100" data-order="${safeId}" type="button">+100</button></div></div><div class="order-status-actions">${["Pending", "Preparing", "Completed", "Cancelled"].map(s => `<button class="status-btn" data-status="${s}" data-order="${safeId}" type="button">${s}</button>`).join("")}<button class="status-btn status-btn-delete" data-delete-order="${safeId}" type="button">Delete order</button></div></div></details></div></article>`;
  }).join("");
}

function renderServiceRequests() {
  const requests = state.serviceRequests.filter(request => String(request.status || "Pending").toLowerCase() !== "completed");
  const count = $("#serviceRequestCount"); if (count) count.textContent = `${requests.length} active`;
  const container = $("#serviceRequestList"); if (!container) return;
  if (!requests.length) { container.innerHTML = `<div class="empty-cart"><strong>No table requests.</strong><span>Guests can call a waiter from the menu.</span></div>`; return; }
  container.innerHTML = requests.map(request => `<article class="service-request-card"><div><span class="eyebrow">Waiter requested</span><h3>Table ${escapeHtml(request.tableNumber || "—")}</h3><p>${formatDate(request.createdAt)}</p></div><button class="next-action" data-service-status="Completed" data-service-request="${escapeHtml(request.id)}" type="button">Acknowledge <span aria-hidden="true" style="display: flex; align-items: center;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span></button></article>`).join("");
}

function renderMenuItems() {
  const allItems = state.menu; const query = state.menuSearch.trim().toLowerCase(); const items = query ? allItems.filter(item => `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(query)) : allItems;
  $("#categoryOptions").innerHTML = [...new Set(allItems.map(item => item.category).filter(Boolean))].map(category => `<option value="${escapeHtml(category)}"></option>`).join("");
  const countLabel = $("#menuCountLabel"); if (countLabel) countLabel.textContent = `${items.length} ${items.length === 1 ? "dish" : "dishes"}`;
  const container = $("#menuItemList");
  if (items.length) { container.innerHTML = items.map(item => { const soldOut = Boolean(item.outOfStock); return `<article class="menu-item-card ${soldOut ? "is-sold-out" : ""}"><img src="${escapeHtml(item.image || "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85")}" alt="${escapeHtml(item.name)}"><div class="menu-item-info"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description || "")}</p><div class="menu-item-meta"><span class="status-pill">${escapeHtml(item.category || "Uncategorised")}</span>${soldOut ? "<span class=\"status-pill status-cancelled\">Sold out</span>" : ""}<span class="price">${money(item.price)}</span></div>${dietaryText(item) ? `<small class="dietary-meta">${escapeHtml(dietaryText(item))}</small>` : ""}</div><div class="menu-item-actions"><button class="status-btn ${soldOut ? "status-btn-ready" : "status-btn-cancelled"}" data-stock-item="${escapeHtml(item.id)}" type="button">${soldOut ? "Restore item" : "Mark sold out"}</button><button class="status-btn" data-edit-item="${escapeHtml(item.id)}" type="button">Edit</button><button class="status-btn status-btn-cancelled" data-delete-item="${escapeHtml(item.id)}" type="button">Delete</button></div></article>`; }).join(""); return; }
  if (query && allItems.length) { container.innerHTML = `<div class="empty-cart"><strong>No dishes match “${escapeHtml(query)}”.</strong><span>Try another name or category.</span></div>`; return; }
  container.innerHTML = `<div class="empty-cart"><strong>No menu items in Firestore yet.</strong><span>The dishes guests currently see are the built-in starter menu.</span><br><button class="primary-button import-menu-button" type="button" data-import-menu>Import starter menu (${fallbackMenu.length} items)</button></div>`;
}

function setImagePreview(src) { const preview = $("#menuItemPreview"); preview.src = src || ""; preview.hidden = !src; $("#removeImageButton").hidden = !src; $("#chooseImageButton").textContent = src ? "Change picture" : "Choose a picture"; }
function compressImage(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => { const img = new Image(); img.onload = () => { const max = 900; const scale = Math.min(1, max / Math.max(img.width, img.height)); const canvas = document.createElement("canvas"); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale); canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL("image/jpeg", 0.82)); }; img.onerror = () => reject(new Error("Could not read that image file.")); img.src = reader.result; }; reader.onerror = () => reject(new Error("Could not read that image file.")); reader.readAsDataURL(file); }); }
function openMenuItemModal(item) { $("#menuItemModalTitle").textContent = item ? "Edit menu item" : "Add menu item"; $("#menuItemId").value = item?.id || ""; $("#menuItemName").value = item?.name || ""; $("#menuItemDescription").value = item?.description || ""; $("#menuItemPrice").value = item?.price ?? ""; $("#menuItemCategory").value = item?.category || ""; $("#menuItemDietary").value = dietaryText(item); $("#menuItemOutOfStock").checked = Boolean(item?.outOfStock); const image = item?.image || ""; const isUploaded = image.startsWith("data:"); state.pickedImage = isUploaded ? image : ""; $("#menuItemImage").value = isUploaded ? "" : image; $("#menuItemImageFile").value = ""; setImagePreview(image); $("#menuItemModal").showModal(); }

function enableDashboard() {
  if (state.unsubscribeOrders) state.unsubscribeOrders();
  state.orderSnapshotReady = false; state.seenOrderIds = new Set();
  state.unsubscribeOrders = watchOrders(orders => { const incomingIds = new Set(orders.map(order => order.id)); const hasNewPending = state.orderSnapshotReady && orders.some(order => !state.seenOrderIds.has(order.id) && statusKey(order.status) === "pending"); state.orders = orders; state.seenOrderIds = incomingIds; state.orderSnapshotReady = true; $("#orderLiveStatus").textContent = "Live updates connected"; renderOrders(); if (hasNewPending) { playNewOrderSound(); toast("New order received"); } }, error => { console.error(error); $("#orderLiveStatus").textContent = "Unable to sync orders"; toast("Unable to load orders. Check Firestore rules and index."); });
  if (state.unsubscribeMenu) state.unsubscribeMenu();
  state.unsubscribeMenu = watchMenu(items => { state.menu = items; renderMenuItems(); }, error => { console.error(error); toast("Unable to load menu items. Check Firestore rules."); });
  if (state.unsubscribeServiceRequests) state.unsubscribeServiceRequests();
  state.unsubscribeServiceRequests = watchServiceRequests(requests => { state.serviceRequests = requests; renderServiceRequests(); }, error => { console.error(error); toast("Unable to sync table requests. Add serviceRequests to Firestore rules."); });
}

document.addEventListener("click", async event => {
  const target = event.target.closest("button"); if (!target) return;
  if (target.dataset.status) { try { await changeOrderStatus(target.dataset.order, target.dataset.status); toast(`Order updated to ${target.dataset.status}`); } catch (error) { if (error?.code === "not-found") toast("That order no longer exists. Refresh to re-sync."); else if (error?.code === "permission-denied") toast("Firestore blocked the update. Check the security rules."); else toast(`Status update failed (${error?.code || "unknown error"}).`); console.error(error); } }
  if (target.dataset.adjust) { const amount = Number(target.dataset.adjust); const order = state.orders.find(item => item.id === target.dataset.order); if (order) { const newTotal = Math.max(0, Number(order.total || 0) + amount); try { await changeOrderStatus(order.id, order.status, newTotal); toast(`Total adjusted to ${money(newTotal)}`); } catch (error) { toast("Adjustment failed. Check Firestore rules."); console.error(error); } } }
  if (target.dataset.deleteOrder) { const order = state.orders.find(item => item.id === target.dataset.deleteOrder); if (order && confirm(`Delete ${orderReference(order)} from ${order.tableNumber ? `Table ${order.tableNumber}` : "this order"}? This cannot be undone.`)) { try { await deleteOrder(order.id); toast("Order deleted"); } catch (error) { toast(error?.code === "permission-denied" ? "Firestore blocked the delete. Check the security rules." : `Delete failed (${error?.code || "unknown error"}).`); console.error(error); } } }
  if (target.dataset.serviceStatus) { try { await changeServiceRequestStatus(target.dataset.serviceRequest, target.dataset.serviceStatus); toast("Table request acknowledged"); } catch (error) { toast("Could not update the table request. Check Firestore rules."); console.error(error); } }
  if (target.dataset.stockItem) { const item = state.menu.find(entry => entry.id === target.dataset.stockItem); if (item) { try { await updateMenuItem(item.id, { outOfStock: !item.outOfStock }); toast(item.outOfStock ? `${item.name} is back on the menu` : `${item.name} marked sold out`); } catch (error) { toast("Stock update failed. Check Firestore rules."); console.error(error); } } }
  if (target.hasAttribute("data-import-menu")) { target.disabled = true; target.textContent = "Importing…"; try { await Promise.all(fallbackMenu.map(({ name, description, price, category, image, dietary }) => addMenuItem({ name, description, price, category, image, dietary, outOfStock: false }))); toast("Starter menu imported. You can now edit every dish."); } catch (error) { toast(error?.code === "permission-denied" ? "Firestore blocked the import. Check the security rules." : `Import failed (${error?.code || "unknown error"}).`); console.error(error); target.disabled = false; target.textContent = `Import starter menu (${fallbackMenu.length} items)`; } }
  if (target.dataset.editItem) { const item = state.menu.find(entry => entry.id === target.dataset.editItem); if (item) openMenuItemModal(item); }
  if (target.dataset.deleteItem) { const item = state.menu.find(entry => entry.id === target.dataset.deleteItem); if (item && confirm(`Delete “${item.name}” from the menu?`)) { try { await deleteMenuItem(item.id); toast(`${item.name} removed from the menu`); } catch (error) { toast("Delete failed. Check Firestore rules."); console.error(error); } } }
  if (target.dataset.filter) { state.orderFilter = target.dataset.filter; document.querySelectorAll(".filter-btn").forEach(button => button.classList.toggle("active", button.dataset.filter === state.orderFilter)); renderOrders(); }
  if (target.matches("[data-close-modal]")) target.closest("dialog").close();
});

$("#addMenuItemButton").addEventListener("click", () => openMenuItemModal(null));
$("#chooseImageButton").addEventListener("click", () => $("#menuItemImageFile").click());
$("#menuItemImageFile").addEventListener("change", async event => { const file = event.target.files[0]; if (!file) return; try { const dataUrl = await compressImage(file); if (dataUrl.length > 950000) { toast("That picture is too large even after compression. Try a smaller one."); return; } state.pickedImage = dataUrl; $("#menuItemImage").value = ""; setImagePreview(dataUrl); toast("Picture ready. Do not forget to save."); } catch (error) { console.error(error); toast("Could not load that picture. Try another file."); } });
$("#removeImageButton").addEventListener("click", () => { state.pickedImage = ""; $("#menuItemImageFile").value = ""; $("#menuItemImage").value = ""; setImagePreview(""); });
$("#menuItemImage").addEventListener("input", event => { state.pickedImage = ""; setImagePreview(event.target.value.trim()); });

$("#menuItemForm").addEventListener("submit", async event => { event.preventDefault(); const button = event.submitter || $("#menuItemForm button[type=submit]"); const id = $("#menuItemId").value.trim(); const name = $("#menuItemName").value.trim(); const description = $("#menuItemDescription").value.trim(); const price = Number($("#menuItemPrice").value); const category = $("#menuItemCategory").value.trim(); const image = state.pickedImage || $("#menuItemImage").value.trim(); if (!name || !category || !Number.isFinite(price) || price < 0) { toast("Add a name, category, and valid non-negative price before saving."); return; } if (state.pickedImage && state.pickedImage.length > 900000) { toast("That picture is too large for Firestore. Choose a smaller image."); return; } button.disabled = true; button.textContent = "Saving…"; const item = { name, description, price, category, dietary: $("#menuItemDietary").value.split(",").map(value => value.trim().toLowerCase()).filter(Boolean), outOfStock: $("#menuItemOutOfStock").checked, image }; try { if (id) { await updateMenuItem(id, item); toast(`${item.name} updated`); } else { await addMenuItem(item); toast(`${item.name} added to the menu`); } $("#menuItemModal").close(); } catch (error) { console.error("Menu save failed", { id, item, error }); toast(firestoreError(error, "Save failed.")); } finally { button.disabled = false; button.textContent = "Save item"; } });

$("#orderSearch").addEventListener("input", event => { state.orderSearch = event.target.value; renderOrders(); });
$("#menuSearch").addEventListener("input", event => { state.menuSearch = event.target.value; renderMenuItems(); });
document.querySelectorAll(".admin-nav-link[href^='#']").forEach(link => { link.addEventListener("click", () => document.querySelectorAll(".admin-nav-link").forEach(item => item.classList.toggle("is-active", item === link))); });

document.addEventListener("keypress", async event => { if (event.target.classList.contains("price-input") && event.key === "Enter") { const input = event.target; const amount = Number(input.value); const order = state.orders.find(item => item.id === input.dataset.order); if (order && !Number.isNaN(amount) && amount !== 0) { const newTotal = Math.max(0, Number(order.total || 0) + amount); try { await changeOrderStatus(order.id, order.status, newTotal); toast(`Total adjusted to ${money(newTotal)}`); input.value = ""; } catch (error) { toast("Adjustment failed. Check Firestore rules."); console.error(error); } } } });

function renderQrCode(baseUrl) { const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=8&data=${encodeURIComponent(baseUrl)}`; const html = `<article class="qr-card qr-card-single"><img src="${qrSrc}" alt="EMBER menu QR code" width="300" height="300"><strong>EMBER Menu</strong><span>Scan to order</span><a href="${escapeHtml(baseUrl)}" target="_blank" rel="noopener">${escapeHtml(baseUrl)}</a></article>`; $("#qrGrid").innerHTML = html; $("#qrModalBody").innerHTML = html; $("#printQrButton").hidden = false; $("#qrStatus").textContent = "QR code ready to print or place on a table."; $("#qrModal").showModal(); }
$("#qrForm").addEventListener("submit", event => { event.preventDefault(); const url = $("#qrBaseUrl").value.trim(); if (!url) return; renderQrCode(url); toast("Menu QR code generated"); });
$("#printQrButton").addEventListener("click", () => window.print());
$("#modalPrintQrButton").addEventListener("click", () => window.print());

$("#loginForm").addEventListener("submit", async event => { event.preventDefault(); const button = event.submitter; button.disabled = true; button.textContent = "Signing in…"; try { await signInWithEmailAndPassword(auth, $("#loginEmail").value, $("#loginPassword").value); $("#loginModal").close(); toast("Welcome to the dashboard."); } catch (error) { console.error(error); toast("Sign-in failed. Check your email and password."); } finally { button.disabled = false; button.textContent = "Sign in"; } });
$("#logoutButton").addEventListener("click", () => { signOut(auth); window.location.href = "index.html"; });

onAuthStateChanged(auth, async user => {
  if (user && !user.isAnonymous) {
    $("#loginModal").close();
    state.role = await getUserRole(user.email);
    document.body.classList.toggle("staff-mode", state.role !== "admin");
    $("#roleBadge").textContent = state.role === "admin" ? "Admin" : "Staff";
    document.body.classList.toggle("menu-editing-disabled", state.role !== "admin");
    if (state.role !== "admin") toast("Staff accounts can manage orders only. Sign in with an admin account to edit the menu.");
    $(".admin-layout").classList.add("is-authenticated");
    enableDashboard();
  } else {
    if (user?.isAnonymous) signOut(auth).catch(error => console.warn("Could not clear anonymous customer session.", error));
    if (state.unsubscribeOrders) state.unsubscribeOrders();
    if (state.unsubscribeMenu) state.unsubscribeMenu();
    if (state.unsubscribeServiceRequests) state.unsubscribeServiceRequests();
    state.orders = []; state.menu = []; state.serviceRequests = []; state.role = "admin";
    document.body.classList.remove("staff-mode", "menu-editing-disabled");
    $(".admin-layout").classList.remove("is-authenticated");
    renderOrders(); renderMenuItems(); renderServiceRequests();
    if (!$("#loginModal").open) $("#loginModal").showModal();
  }
});

$("#loginModal").addEventListener("close", () => { if (!auth.currentUser) window.location.href = "index.html"; });
$("#year").textContent = new Date().getFullYear(); $("#qrBaseUrl").value = new URL("index.html", window.location.href).href; renderOrders(); renderMenuItems(); renderServiceRequests();
