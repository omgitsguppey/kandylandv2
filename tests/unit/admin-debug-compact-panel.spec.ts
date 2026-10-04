// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Activity } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminDebugControlCanvas } from "@/components/creative-tim/kandydrops/admin-debug/AdminDebugControlCanvas";
import { AdminDebugEvidenceBoundary } from "@/components/creative-tim/kandydrops/admin-debug/AdminDebugEvidenceBoundary";
const root = process.cwd();
const read=(relativePath:string)=>readFileSync(join(root,relativePath),"utf8");
afterEach(cleanup);
describe("admin debug compact panel",()=>{
  it("keeps the real bound status, active workstream and collapsed source boundary",()=>{
    const page=read("src/app/admin/debug/page.tsx");
    expect(page).toContain("<AdminDebugControlCanvas");
    expect(page).toContain("statusLabel={sourceStateLabel}");
    expect(page).toContain("evidenceBoundary={(");
    expect(page).toContain("<CompactDebugStatusRail items={compactSummaryItems} detailItems={detailItems} />");
    expect(page).toContain("return <AdminDebugEvidenceBoundary items={items} detailItems={detailItems} />");
    const item={label:"Sample count",value:0,meta:"Missing source window",truthState:"unavailable" as const};
    const details=[{...item,copy:{operatorSummary:"Source is missing.",recommendedNextCheck:"Read the existing source owner.",sourceDetails:"Controlled fixture only."}}];
    const change=vi.fn();
    const evidence=createElement(AdminDebugEvidenceBoundary,{items:[item],detailItems:details});
    render(createElement(AdminDebugControlCanvas,{title:"Debug",subtitle:"Source review",statusLabel:"No source",statusClassName:"",statusTextClassName:"",tabs:[{id:"now",label:"Now",icon:Activity},{id:"actions",label:"Actions",icon:Activity}],activeTab:"now",onTabChange:change,priorityAction:{label:"Open actions",value:0,meta:"Missing source",truthState:"unavailable"},evidenceBoundary:evidence,children:createElement("p",null,"Active workstream")}));
    expect(screen.getByText("Active workstream")).toBeVisible();
    const source=screen.getByText("Source and evidence details");
    expect(source.closest("details")).not.toHaveAttribute("open");
    fireEvent.click(source);
    expect(screen.getByText("Current source signals")).toBeVisible();
    expect(screen.queryAllByText("0",{exact:true})).toHaveLength(0);
    const drilldown=screen.getByText("Open evidence drilldown");
    expect(drilldown.closest("details")).not.toHaveAttribute("open");
    fireEvent.click(drilldown);
    expect(screen.getByText("Source is missing.")).toBeVisible();
    expect(screen.getByText("Read the existing source owner.")).toBeVisible();
    expect(screen.getByText("Controlled fixture only.")).toBeVisible();
    fireEvent.change(screen.getByRole("combobox",{name:"Debug workstream"}),{target:{value:"actions"}});
    expect(change).toHaveBeenCalledOnce();expect(change).toHaveBeenCalledWith("actions");
  });
  it.each(["live","cached","degraded"] as const)("retains a real zero from %s evidence without erasing its source explanation",truthState=>{
    const item={label:"Source metric",value:0,meta:"Bounded source window",truthState};
    render(createElement(AdminDebugEvidenceBoundary,{items:[item],detailItems:[]}));
    expect(screen.getByText("0",{exact:true})).toBeVisible();
    expect(screen.getByText("Bounded source window")).toBeVisible();
  });
  it("keeps all original source-heavy Now consumers bound behind their existing closed disclosure",()=>{
    const page=read("src/app/admin/debug/page.tsx"),nowTab=read("src/app/admin/debug/components/DebugTabNow.tsx");
    expect(page).toContain("<DebugTabNow");expect(page).toContain("trackingSummary={data?.trackingSummary}");
    expect(page).not.toContain("<DebugTrackingSummaryPanel trackingSummary={data?.trackingSummary} />");
    expect(nowTab).toContain('title="Current source drilldowns"');expect(nowTab).toContain("defaultOpen={false}");
    expect(nowTab).toContain("<DebugTrackingSummaryPanel trackingSummary={trackingSummary} />");
    expect(nowTab).toContain("<DebugTelemetryHealthSummary telemetryHealth={data?.telemetryHealth} />");
    expect(nowTab).toContain("<DebugRecoveryEvidenceSummary recoveryEvidence={data?.adminAnalyticsRecoveryEvidence} />");
    expect(nowTab).toContain("<DebugCreatorLane data={data} />");expect(nowTab).toContain("<DebugNowDiagnostics");
    expect(nowTab).toContain('data-admin-debug-now-density="single_drilldown_drawer"');
    expect(nowTab).toContain('data-admin-debug-source-heavy-default="collapsed"');
  });
});
