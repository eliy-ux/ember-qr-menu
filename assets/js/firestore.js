import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase.js?v=ember-auth-41";

const trackingRef = id => doc(db,"orderTracking",id);

export async function createOrder(order){
  const orderRef = doc(collection(db,"orders"));
  const status = "Pending";
  await Promise.all([
    setDoc(orderRef, {...order,status,createdAt:serverTimestamp()}),
    setDoc(trackingRef(orderRef.id), {orderId:orderRef.id, deviceId:order.deviceId, tableNumber:order.tableNumber, total:Number(order.total || 0), status})
  ]);
  return orderRef;
}
export function watchOrder(id, callback, onError){ return onSnapshot(trackingRef(id), snapshot => callback(snapshot.exists() ? {id:snapshot.id,...snapshot.data()} : null), onError); }
export function watchOrders(callback, onError){ return onSnapshot(query(collection(db,"orders"),orderBy("createdAt","desc")), snapshot => callback(snapshot.docs.map(d=>({id:d.id,...d.data()}))), onError); }
export function changeOrderStatus(id,status,newTotal){
  const update = {status};
  if(newTotal !== undefined) update.total = newTotal;
  return Promise.all([
    updateDoc(doc(db,"orders",id), update),
    setDoc(trackingRef(id), {orderId:id, ...update}, {merge:true})
  ]);
}
export function deleteOrder(id){ return Promise.all([deleteDoc(doc(db,"orders",id)), deleteDoc(trackingRef(id))]); }
export async function createServiceRequest(request){ return addDoc(collection(db,"serviceRequests"), {...request,status:"Pending",createdAt:serverTimestamp()}); }
export function watchServiceRequests(callback, onError){ return onSnapshot(query(collection(db,"serviceRequests"),orderBy("createdAt","desc")), snapshot => callback(snapshot.docs.map(d=>({id:d.id,...d.data()}))), onError); }
export function changeServiceRequestStatus(id,status){ return updateDoc(doc(db,"serviceRequests",id), {status}); }
export function watchMenu(callback, onError){ return onSnapshot(query(collection(db,"menu"),orderBy("name")), snapshot => callback(snapshot.docs.map(d=>({...d.data(), id:d.id}))), onError); }
export function addMenuItem(item){ return addDoc(collection(db,"menu"), {...item,createdAt:serverTimestamp()}); }
export function updateMenuItem(id,item){ return updateDoc(doc(db,"menu",id), item); }
export function deleteMenuItem(id){ return deleteDoc(doc(db,"menu",id)); }
// Role lookup: a "roles" doc (ID = lowercase email) with role:"staff" limits the account; no doc means full admin
export async function getUserRole(email){ try { const snap = await getDoc(doc(db,"roles",String(email||"").toLowerCase())); return snap.exists() ? (snap.data().role || "staff") : "admin"; } catch(e){ console.error("Role lookup failed, defaulting to admin UI (rules still enforce permissions).", e); return "admin"; } }
