import {
    buildDeviceUiDryAuditReport,
    printDeviceUiDryAuditSummary,
    writeDeviceUiDryAuditReport,
} from "../../src/lib/device-ui-dry-audit";

const report = buildDeviceUiDryAuditReport();
writeDeviceUiDryAuditReport(report);
printDeviceUiDryAuditSummary(report);
