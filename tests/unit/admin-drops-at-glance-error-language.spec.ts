// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Drop } from "@/types/db";
import type { AdminDropQueueConfig } from "@/lib/admin-drop-queue";
import { HUMAN_ERROR_DICTIONARY } from "@/lib/errors/error-dictionary";
import { AdminDropsAtGlancePanel as QueueSurface } from "@/components/Admin/AdminDropsAtGlancePanel";

const controlled = vi.hoisted(() => ({
  authFetch: vi.fn(), report: vi.fn(), success: vi.fn(), error: vi.fn(), sync: vi.fn(), mutate: vi.fn(),
  feed: vi.fn(), listeners: new Set<() => void>(), responses: [] as Response[],
  queue: null as AdminDropQueueConfig | null, user: {providerData: [] as Array<{providerId:string}>},
  drops: [] as Drop[],
}));

vi.mock("@/context/AuthContext", () => ({useAuth: () => ({user:controlled.user})}));
vi.mock("@/lib/authFetch", () => ({authFetch:controlled.authFetch}));
vi.mock("@/lib/client-error-reporting", () => ({reportClientIssue:controlled.report}));
vi.mock("@/lib/client-diagnostics", () => ({recordClientDiagnostic:vi.fn()}));
vi.mock("sonner", () => ({toast:{success:controlled.success,error:controlled.error}}));
vi.mock("@/hooks/client-runtime", () => ({dispatchAdminOverviewSync:controlled.sync}));
vi.mock("@/hooks/useAdminDropsFeed", () => ({useAdminDropsFeed:controlled.feed}));
vi.mock("@/hooks/useNow", () => ({useNow:()=>Date.UTC(2026,9,3,12)}));
vi.mock("@/lib/telemetry", () => ({trackEvent:vi.fn()}));
vi.mock("@/lib/notifications", () => ({sendNotification:vi.fn()}));
vi.mock("@/components/Admin/CreateDropModal", () => ({CreateDropModal:()=>null}));
vi.mock("@/components/Analytics/PageViewEvent", () => ({PageViewEvent:()=>null}));
vi.mock("@/components/ui/TitleMarquee", () => ({TitleMarquee:({title}:{title:string})=>React.createElement("span",null,title)}));
vi.mock("next/link", () => ({default:({children,...props}:React.ComponentProps<"a">)=>React.createElement("a",props,children)}));
vi.mock("next/image", () => ({default:({fill,priority,...props}:React.ComponentProps<"img"> & {fill?:boolean;priority?:boolean})=>React.createElement("img",props)}));
vi.mock("@/hooks/useAdminPollingSWR", () => ({
  useAdminPollingSWR:(key:string|null) => {
    const value=React.useSyncExternalStore(listener=>{controlled.listeners.add(listener);return()=>controlled.listeners.delete(listener);},()=>controlled.queue);
    return {data:key?value:undefined,mutate:controlled.mutate};
  },
}));

function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});}
function queueRequests(){return controlled.authFetch.mock.calls.filter(([url])=>url==="/api/admin/queue/toggle");}
function queueControl(queued=true){return screen.getAllByRole("button",{name:queued?"Unqueue drop":"Queue drop"})[0];}

beforeEach(() => {
  vi.clearAllMocks();
  controlled.listeners.clear();
  controlled.responses=[];
  controlled.user={providerData:[]};
  controlled.queue={queue:["queue-contract-drop"],timesPerDay:["09:00"],cooldownDays:1,queueAuthorityVersion:1};
  controlled.drops=[{id:"queue-contract-drop",title:"Queue contract record",description:"Retained original record",unlockCost:25,totalUnlocks:12,totalClicks:34,validFrom:1,validUntil:2,createdAt:1,updatedAt:1,approvalStatus:"approved",status:"expired",imageUrl:""} as unknown as Drop];
  controlled.feed.mockImplementation(()=>({drops:controlled.drops,legacyQueueIds:[],loading:false,loadError:null,fromCache:false}));
  controlled.mutate.mockImplementation(async (update:(current:AdminDropQueueConfig|null)=>AdminDropQueueConfig|null) => {
    controlled.queue=update(controlled.queue);
    controlled.listeners.forEach(listener=>listener());
    return controlled.queue;
  });
  controlled.authFetch.mockImplementation(async (url:string) => {
    if(url==="/api/admin/creator-options")return reply({creators:[]});
    if(url!=="/api/admin/queue/toggle")throw new Error("Unexpected transport: "+url);
    const response=controlled.responses.shift();
    if(!response)throw new Error("Unexpected queue replay");
    return response;
  });
  window.history.replaceState({},"","/admin");
});
afterEach(()=>cleanup());

describe("Admin Home queue error language and recovery",()=>{

  it.each([
    {status:403,code:"forbidden",key:"forbidden"},
    {status:401,code:"auth_required",key:"auth_required"},
    {status:503,code:"service_unavailable",key:"service_unavailable"},
  ] as const)("preserves a typed $status rejection, queue state, search and next manual operation",async({status,code,key})=>{
    controlled.responses.push(reply({success:false,error:"private queue diagnostics",code,retryable:status===503},status),reply({success:true,added:false}));
    render(React.createElement(QueueSurface));
    const search=screen.getByPlaceholderText("Search drops...");
    fireEvent.change(search,{target:{value:"Queue contract"}});
    fireEvent.click(queueControl());
    await waitFor(()=>expect(controlled.error).toHaveBeenCalledOnce());
    expect(controlled.error).toHaveBeenCalledWith(HUMAN_ERROR_DICTIONARY[key].userMessage);
    expect(controlled.error.mock.calls[0][0]).not.toContain("private queue diagnostics");
    expect(controlled.queue?.queue).toEqual(["queue-contract-drop"]);
    expect(controlled.queue?.queueAuthorityVersion).toBe(1);
    expect(controlled.mutate).not.toHaveBeenCalled();
    expect(controlled.sync).not.toHaveBeenCalled();
    expect(controlled.success).not.toHaveBeenCalled();
    expect(search).toHaveValue("Queue contract");
    expect(queueRequests()).toHaveLength(1);
    expect(controlled.report).toHaveBeenCalledWith(expect.objectContaining({error:expect.objectContaining({status,code}),detail:expect.objectContaining({status,errorKey:key,dropId:"queue-contract-drop"})}));
    await act(async()=>{await Promise.resolve();});
    expect(queueRequests()).toHaveLength(1);
    expect(queueControl()).toBeEnabled();
    fireEvent.click(queueControl());
    await waitFor(()=>expect(controlled.success).toHaveBeenCalledOnce());
    expect(controlled.queue?.queue).toEqual([]);
    expect(controlled.queue?.queueAuthorityVersion).toBe(1);
    expect(controlled.mutate).toHaveBeenCalledOnce();
    expect(controlled.sync).toHaveBeenCalledOnce();
    expect(queueRequests()).toHaveLength(2);
    expect(queueRequests()[1][1]).toEqual({method:"POST",body:JSON.stringify({dropId:"queue-contract-drop"})});
    expect(queueControl(false)).toBeEnabled();
    expect(search).toHaveValue("Queue contract");
  });

  it.each([
    ["explicit failure",{success:false,added:false,error:"not committed",code:"mutation_failed"}],
    ["absent success",{added:false}],
    ["absent result",{success:true}],
    ["malformed result",{success:true,added:"false"}],
  ])("does not apply a false-200 %s acknowledgement",async(_label,body)=>{
    controlled.responses.push(reply(body),reply({success:true,added:false}));
    render(React.createElement(QueueSurface));
    fireEvent.click(queueControl());
    await waitFor(()=>expect(controlled.error.mock.calls.length+controlled.mutate.mock.calls.length).toBe(1));
    expect(controlled.queue?.queue).toEqual(["queue-contract-drop"]);
    expect(controlled.mutate).not.toHaveBeenCalled();
    expect(controlled.error).toHaveBeenCalledWith(HUMAN_ERROR_DICTIONARY.mutation_failed.userMessage);
    expect(controlled.sync).not.toHaveBeenCalled();
    expect(controlled.success).not.toHaveBeenCalled();
    expect(queueRequests()).toHaveLength(1);
    fireEvent.click(queueControl());
    await waitFor(()=>expect(controlled.success).toHaveBeenCalledOnce());
    expect(controlled.queue?.queue).toEqual([]);
    expect(queueRequests()).toHaveLength(2);
  });

  it("retains the acknowledged add/remove projection and request payload",async()=>{
    controlled.queue={...controlled.queue!,queue:[]};
    controlled.responses.push(reply({success:true,added:true}),reply({success:true,added:false}));
    render(React.createElement(QueueSurface));
    fireEvent.click(queueControl(false));
    await waitFor(()=>expect(controlled.success).toHaveBeenCalledOnce());
    expect(controlled.queue?.queue).toEqual(["queue-contract-drop"]);
    fireEvent.click(queueControl());
    await waitFor(()=>expect(controlled.success).toHaveBeenCalledTimes(2));
    expect(controlled.queue?.queue).toEqual([]);
    expect(controlled.queue?.queueAuthorityVersion).toBe(1);
    expect(controlled.error).not.toHaveBeenCalled();
    expect(controlled.report).not.toHaveBeenCalled();
    expect(controlled.mutate).toHaveBeenCalledTimes(2);
    expect(controlled.sync).toHaveBeenCalledTimes(2);
    expect(queueRequests().map(([,options])=>options)).toEqual([{method:"POST",body:JSON.stringify({dropId:"queue-contract-drop"})},{method:"POST",body:JSON.stringify({dropId:"queue-contract-drop"})}]);
  });

  it("retains pending disablement and recovers after a rejected response",async()=>{
    let settle!:(response:Response)=>void;
    controlled.authFetch.mockImplementationOnce(()=>new Promise<Response>(resolve=>{settle=resolve;}));
    render(React.createElement(QueueSurface));
    fireEvent.click(queueControl());
    expect(queueControl()).toBeDisabled();
    expect(queueControl()).toHaveAttribute("aria-busy","true");
    fireEvent.click(queueControl());
    expect(queueRequests()).toHaveLength(1);
    await act(async()=>settle(reply({success:false,code:"forbidden",error:"private details"},403)));
    expect(queueControl()).toBeEnabled();
    expect(queueControl()).toHaveAttribute("aria-busy","false");
    expect(controlled.queue?.queue).toEqual(["queue-contract-drop"]);
    expect(controlled.mutate).not.toHaveBeenCalled();
    expect(controlled.error).toHaveBeenCalledWith(HUMAN_ERROR_DICTIONARY.forbidden.userMessage);
  });
});
