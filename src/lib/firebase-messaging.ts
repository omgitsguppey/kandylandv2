import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { app } from "./firebase";

export const requestFirebaseNotificationPermission = async () => {
    try {
        const supported = await isSupported();
        if (!supported) {
            console.log("Firebase Messaging not supported in this browser.");
            return null;
        }

        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            const messaging = getMessaging(app);

            // Register service worker with config in URL params
            const config = {
                apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
            };

            const swUrl = `/firebase-messaging-sw.js?apiKey=${config.apiKey}&projectId=${config.projectId}&messagingSenderId=${config.messagingSenderId}&appId=${config.appId}`;
            const registration = await navigator.serviceWorker.register(swUrl);

            const token = await getToken(messaging, {
                vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY, // Needs to be added to .env.local
                serviceWorkerRegistration: registration,
            });

            return token;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Failed to request notification permission:", error);
        return null;
    }
};

export const onNotificationMessage = (callback: (payload: any) => void) => {
    isSupported().then((supported) => {
        if (supported) {
            const messaging = getMessaging(app);
            onMessage(messaging, callback);
        }
    });
};
