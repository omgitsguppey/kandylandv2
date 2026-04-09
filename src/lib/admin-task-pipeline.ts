export interface AdminTaskPipelineItemInput {
    label: string;
    count: number;
}

export interface AdminTaskPipelineModel {
    hasData: boolean;
    items: AdminTaskPipelineItemInput[];
    peakCount: number;
}

export function buildAdminTaskPipelineModel(items: AdminTaskPipelineItemInput[]): AdminTaskPipelineModel {
    return {
        hasData: items.some((item) => item.count > 0),
        items,
        peakCount: items.reduce((current, item) => Math.max(current, item.count), 0),
    };
}
