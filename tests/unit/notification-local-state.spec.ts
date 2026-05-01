import { describe, expect, it } from "vitest";

import {
    markNotificationsReadLocally,
    reconcileClearAllNotifications,
    removeNotificationsLocally,
} from "@/lib/notification-local-state";

const notes = [
    { id: "note_1", readBy: [] as string[], title: "One" },
    { id: "note_2", readBy: ["user_2"], title: "Two" },
    { id: "note_3", readBy: [] as string[], title: "Three" },
];

describe("notification local read state", () => {
    it("marks a visible notification as read without restoring unread state", () => {
        const result = markNotificationsReadLocally(notes, ["note_1"], "user_1");

        expect(result.find((note) => note.id === "note_1")?.readBy).toEqual(["user_1"]);
        expect(result.find((note) => note.id === "note_2")?.readBy).toEqual(["user_2"]);
    });

    it("removes cleared notifications from local unread UI immediately", () => {
        const result = removeNotificationsLocally(notes, ["note_1", "note_3"]);

        expect(result.map((note) => note.id)).toEqual(["note_2"]);
    });

    it("reconciles partial clear-all persistence by restoring only failed notifications", () => {
        const result = reconcileClearAllNotifications(notes, ["note_1", "note_2", "note_3"], ["note_1", "note_3"]);

        expect(result.map((note) => note.id)).toEqual(["note_2"]);
        expect(result[0]?.readBy).toEqual(["user_2"]);
    });
});
