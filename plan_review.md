`viewerUserFilter` is just passed as query param `viewerUser` to `api/admin/analytics/historical`. Inside the API, it calls `buildHistoricalViewerOverview(..., { viewerUser })`. And `viewerUser` correctly filters `viewerOverview` payload down.
The filtering is isolated and only happens for the "content" tab (where `viewerUserFilter` state is used).
The implementation is sound.
