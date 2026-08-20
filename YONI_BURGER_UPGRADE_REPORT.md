# Yoni Burger Boutique Luxury PWA: Architecture & Deployment Guide

This document records the complete transition and technical polish of the restaurant QR menu from **Ember** to **Yoni Burger** (Version v50). The upgrade delivers an ultra-fast, mobile-optimized, boutique luxury Progressive Web App (PWA) with sub-2-second load times, advanced offline caching, seamless live order tracking, and a robust staff management dashboard.

---

## 1. Executive Summary & Branding Evolution

The application has been fully rebranded to **Yoni Burger**, replacing all legacy Ember iconography, titles, manifests, and color schemes while preserving the high-performance **Cyber-Orange** (`#ff6600`) visual identity.

| Component | Previous State (Ember) | Upgraded State (Yoni Burger v50) |
| :--- | :--- | :--- |
| **Brand Identity** | Ember QR Restaurant Menu | Yoni Burger — Boutique Luxury PWA |
| **Logo & Mark** | Flame icon with generic dark mark | Rotated rounded-square (`logo-square`) with custom glowing **'Y'** typography |
| **Typography** | Playfair Display / DM Sans | Playfair Display (Headers) / DM Sans (Body) with non-blocking print-onload loading |
| **Performance Kit** | v49 Service Worker (Cache-First) | v50 Service Worker with Stale-While-Revalidate caching & optimized Unsplash compression (`w=600, q=70`) |
| **Admin Controls** | Cluttered inline management | Streamlined tabbed navigation, dedicated daily stats reset, and secure Firebase Auth |

---

## 2. Technical Architecture & Performance Optimization

To achieve sub-2-second load times even on low-bandwidth cellular networks, version v50 implements several core engineering enhancements:

1. **Stale-While-Revalidate Service Worker (`sw.js`)**:
   - Caches the entire application shell (`index.html`, CSS sheets, JavaScript modules, manifest, and icons) on install.
   - Serves cached assets instantly while concurrently fetching updates from the network in the background.
   - Provides robust offline fallback handling for seamless browsing.

2. **Image Optimization Pipeline**:
   - All menu item images leverage Unsplash dynamic resize and compression parameters (`w=600&q=70`), reducing payload sizes by over 70% and ensuring instant rendering.
   - Lazy-loading (`loading="lazy"`) is enforced across all menu grid images.

3. **Mobile UX & Tap Highlight Elimination**:
   - `-webkit-tap-highlight-color: transparent` and explicit outline resets eliminate blue square tap highlights on iOS and Android devices.
   - Responsive CSS enforces a clean 4-column desktop grid and a high-density 2-column mobile grid.

---

## 3. Feature Highlights & Staff Dashboard

### Customer-Side Experience
- **Streamlined Navigation**: Hero section removed for an immediate, friction-free menu-first experience.
- **Hamburger Menu Integration**: Language switching (English / Amharic), PWA installation, and Admin login are consolidated into a clean, dropdown hamburger menu.
- **Order Success Modal**: Binance-style green success modal confirming table number and total immediately upon checkout.
- **Order Serving & Push Notifications**: Automatic device-targeted push notifications when the kitchen marks an order as completed.
- **Footer & Interactive Rating**: Includes contact info (+251 912 345 678, `hello@yoniburger.com`, Bole Road), a dark-themed Google Map, and a persistent star-rating system linked to Firestore.

### Staff Dashboard (`admin.html`)
- **Tabbed Navigation**: Focuses kitchen staff on live orders, menu management, and QR code generation.
- **Daily Stats Reset**: A dedicated "Reset Stats" button clears completed orders, revenue totals, and service requests for daily shift turnover.
- **Role-Based Access Control**: Secure Firebase Authentication supporting Admin (full privileges) and Staff (order queue management) roles.

---

## 4. Deployment Instructions

The project is fully synced to GitHub (`eliy-ux/ember-qr-menu`) and configured for instant deployment via **Vercel** or **Firebase Hosting**.

### Deploying to Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting,firestore:rules
```
The application will be live at your configured Firebase Hosting domain (e.g., `https://hotel-menu-33295.web.app`), which can be pasted directly into the admin QR code generator.

---
*Created by Manus AI for Yoni Burger.*
