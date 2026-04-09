export interface AdminNotificationFunnelItemInput {
    label: string;
    count: number;
}

export interface AdminNotificationActionItemInput {
    label: string;
    value: number;
}

export interface AdminNotificationReminderReasonInput {
    label: string;
    count: number;
}

export interface AdminNotificationFunnelModel {
    hasData: boolean;
    activeFunnelItems: AdminNotificationFunnelItemInput[];
    pieData: Array<{ name: string; value: number }>;
    maxActionValue: number;
    reminderReasonCount: number;
}

export function buildAdminNotificationFunnelModel(input: {
    funnelItems: AdminNotificationFunnelItemInput[];
    actionItems: AdminNotificationActionItemInput[];
    reminderReasons: AdminNotificationReminderReasonInput[];
}) : AdminNotificationFunnelModel {
    const activeFunnelItems = input.funnelItems.filter((item) => item.count > 0);

    return {
        hasData: activeFunnelItems.length > 0 || input.actionItems.length > 0 || input.reminderReasons.length > 0,
        activeFunnelItems,
        pieData: activeFunnelItems.map((item) => ({
            name: item.label,
            value: item.count,
        })),
        maxActionValue: input.actionItems.reduce((current, item) => Math.max(current, item.value), 0),
        reminderReasonCount: input.reminderReasons.length,
    };
}
