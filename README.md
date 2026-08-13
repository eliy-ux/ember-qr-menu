# EMBER QR Restaurant Menu

A responsive, vanilla HTML/CSS/JavaScript restaurant ordering app. It includes a customer menu, cart, Firestore checkout, Firebase Authentication admin login, and a live Firestore order dashboard.

## Run it

1. Open this folder in VS Code.
2. Serve it with the **Live Server** extension (or any local web server). Do not double-click `index.html`: Firebase ES modules need a web server.
3. Open the URL Live Server provides.

## Firebase setup

The provided Firebase configuration is already in `assets/js/config.js`.

In the Firebase Console for `hotel-menu-33295`:

1. Enable **Authentication → Email/Password** and create an admin user.
2. Create a **Cloud Firestore** database.
3. (Optional) Create a `roles` collection: add a document for any staff accounts — document ID = the email in lowercase, field `role = "staff"`. Any authenticated user without a `roles` document is treated as an admin (full access). This way your first sign-in already has full power without extra setup.
4. Use the following starter Firestore rules while developing. Tighten these before a public launch—the public order creation rule is deliberately designed for QR guests.

```js
rules_version = '2';

// Helper: is the signed-in user an admin?
function isAdmin() {
  return request.auth != null && !get(/databases/$(database)/documents/roles/$(request.auth.token.email.lower())).exists;
}
// Helper: is the signed-in user a staff member?
function isStaff() {
  return request.auth != null && get(/databases/$(database)/documents/roles/$(request.auth.token.email.lower())).data.role == 'staff';
}

service cloud.firestore {
  match /databases/{database}/documents {
    match /orders/{orderId} {
      allow create: if request.resource.data.status == 'Pending'
                    && request.resource.data.tableNumber is string
                    && request.resource.data.items is list;
      allow read: if request.auth != null;
      allow update: if isAdmin() || isStaff();
      allow delete: if isAdmin();
    }
    match /orderTracking/{orderId} {
      allow read: if true;
      allow create: if isAdmin() || isStaff()
                    || (request.resource.data.status == 'Pending'
                        && request.resource.data.orderId == orderId
                        && request.resource.data.tableNumber is string
                        && request.resource.data.total is number);
      allow update, delete: if isAdmin() || isStaff();
    }
    match /menu/{itemId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
    match /roles/{userId} {
      allow read: if request.auth != null && request.auth.token.email.lower() == userId;
      allow write: if isAdmin();
    }
  }
}
```

## Cross-device serving notifications

When a guest places an order, the app creates a matching `orderTracking/<orderId>` document containing only the order ID, device identifier, table number, total, and status. The customer page listens to this status-only document and ignores updates whose device identifier does not match its local device, so the system-level serving notification appears only on the phone that placed the order. Publish the included `firestore.rules` in Firebase Console → Firestore Database → Rules before testing this flow. The preview cannot deploy Firebase rules automatically because the Firebase CLI is not configured in this environment.

## Roles

The dashboard has two roles, both signing into the same `admin.html` page but with different permissions:

- **Admin** (you): sees everything — live orders, menu manager, QR code generator, order deletion, revenue stats.
- **Staff** (waiters, kitchen): sees the live orders panel only — they can change order status and adjust totals, but the menu, QR, delete buttons and revenue stats are hidden, and the Firestore rules above block them even if they try to bypass the UI.

To give someone staff access: add a Firestore document at `roles/<email>` (lowercase email) with a field `role: "staff"`. Delete the document to promote them to admin. The badge in the dashboard header shows the active role.

## Project structure

```text
index.html
assets/css/            # design, animations, responsive rules
assets/js/config.js    # Firebase config
assets/js/firebase.js  # Firebase initialization
assets/js/firestore.js # order and public status tracking operations
assets/js/app.js       # menu, cart, checkout, admin UI
```

## Notes

- Menu data lives in the Firestore `menu` collection and is managed from the admin dashboard (add, edit, delete). On first run, use the "Import starter menu" button in the dashboard to copy the built-in dishes (from `assets/js/utils.js`) into Firestore so they become editable/deletable. The hardcoded fallback is only shown while Firestore is unreachable.
- The menu QR code is generated from the admin dashboard ("Menu QR code" section). One code serves every table — guests scan it, browse, and type their table number at checkout. Enter your deployed menu URL, generate, and print.
- Food images load from Unsplash. Substitute them with restaurant-owned image URLs for production.
- The Firebase web config is public by design; Firestore security rules, Auth, and App Check are what protect your data.


## v41 Menu Editor and Permanent Hosting

The v41 release preserves the Firestore document ID when rendering menu records. This is important for legacy menu documents that contain an `id` field containing a dish slug: the editor now updates the real Firestore document instead of trying to update a slug-named document. Save errors also report actionable permission, missing-document, validation, and image-size messages.

The Firestore rules now recognize both accounts with no role document and accounts explicitly assigned `role: "admin"` as administrators. Accounts assigned `role: "staff"` remain restricted to order and service-request operations and cannot edit the menu or QR settings.

### Permanent Firebase deployment

The project includes `firebase.json` and `.firebaserc` bound to Firebase project `hotel-menu-33295`. From the project directory, install the Firebase CLI if necessary, authenticate with the Firebase account that owns the project, then deploy Hosting and Firestore rules:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting,firestore:rules
```

The deployed menu will be available at the Firebase Hosting domain shown by the CLI, normally `https://hotel-menu-33295.web.app`. Use that permanent URL when generating QR codes. Firebase Authentication and Firestore continue using the existing project configuration.

Before deploying, confirm that the signed-in account is either assigned `role: "admin"` in `roles/<lowercase-email>` or has no roles document. After deployment, hard-refresh the admin page and test editing an existing item as well as adding a new one.
