importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// We use an empty config because we'll initialize it safely in the client to avoid exposing keys incorrectly, or we rely on the URL query params if provided. 
// However, the service worker needs a generic initialized app to catch background messages.
// Best practice is to construct the config from search params or hard-code the public identifiers here.
const firebaseConfig = {
    apiKey: new URL(location).searchParams.get("apiKey"),
    projectId: new URL(location).searchParams.get("projectId"),
    messagingSenderId: new URL(location).searchParams.get("messagingSenderId"),
    appId: new URL(location).searchParams.get("appId"),
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon-192x192.png',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
