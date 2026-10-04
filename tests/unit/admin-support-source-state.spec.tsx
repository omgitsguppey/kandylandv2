// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { HUMAN_ERROR_DICTIONARY } from "@/lib/errors/error-dictionary";
import { resolveClientActionError } from "@/lib/errors/client-error-adapter";
import { AdminSupportQueue } from "@/components/Admin/AdminSupportQueue";
import { useAdminSupportRealtime } from "@/hooks/useAdminSupportRealtime";
import type { SupportMessageRecord, SupportThreadRecord } from "@/lib/support-readiness";

const transport = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/lib/authFetch", () => ({ authFetch: transport.fetch }));
const response = (body: unknown, status = 200) => ({ok:status < 400, status, json:async () => body, text:async () => JSON.stringify(body)});
const thread = (id: string) => ({id, status:"open", category:"general", createdAt:1, updatedAt:1, lastMessageAt:1, messageCount:1} as SupportThreadRecord);
const message = (id: string) => ({id:`message-${id}`, threadId:id, body:`Detail ${id}`, createdAt:1} as SupportMessageRecord);
const detail = (id: string) => response({success:true, thread:thread(id), messages:[message(id)]});
beforeEach(() => { transport.fetch.mockReset(); });
afterEach(cleanup);

describe("Support source snapshot recovery", () => {
  it.each([
    ["unsuccessful detail", response({success:false, thread:thread("a"), messages:[]})],
    ["missing message source", response({success:true, thread:thread("a")})],
    ["another thread's detail", detail("b")],
  ])("does not turn %s into empty success", async (_label, payload) => {
    transport.fetch.mockImplementation((url: string) => Promise.resolve(url.includes("?") ? response({success:true, threads:[]}) : payload));
    const { result } = renderHook(() => useAdminSupportRealtime("a"));
    await waitFor(() => expect(result.current.isLoadingMessages).toBe(false));
    expect(result.current.messagesError).toBeInstanceOf(Error);
    expect(result.current.messages).toEqual([]);
  });

  it("shows only the selected thread while an older request settles late", async () => {
    let settleA!: (value: unknown) => void;
    let settleB!: (value: unknown) => void;
    transport.fetch.mockImplementation((url: string) => url.includes("?")
      ? Promise.resolve(response({success:true, threads:[]}))
      : new Promise(resolve => { if (url.endsWith("/a")) settleA=resolve; else settleB=resolve; }));
    const { result, rerender } = renderHook(({id}) => useAdminSupportRealtime(id), {initialProps:{id:"a"}});
    rerender({id:"b"});
    expect(result.current.messages).toEqual([]);
    await act(async () => { settleB(detail("b")); });
    expect(result.current.messages).toEqual([message("b")]);
    await act(async () => { settleA(detail("a")); });
    expect(result.current.messages).toEqual([message("b")]);
    expect(result.current.messagesError).toBeNull();
  });

  it("clears another thread's cached detail and retains only a verified same-thread cache on failure", async () => {
    transport.fetch.mockImplementation((url: string) => Promise.resolve(url.includes("?") ? response({success:true, threads:[]}) : detail("a")));
    const { result, rerender } = renderHook(({id}) => useAdminSupportRealtime(id), {initialProps:{id:"a"}});
    await waitFor(() => expect(result.current.messages).toEqual([message("a")]));
    transport.fetch.mockRejectedValueOnce(new Error("Offline"));
    await act(async () => { await result.current.refreshMessages(); });
    expect(result.current.messages).toEqual([message("a")]);
    expect(result.current.messagesError).toBeInstanceOf(Error);
    transport.fetch.mockReturnValue(new Promise(() => {}));
    rerender({id:"b"});
    expect(result.current.messages).toEqual([]);
    expect(result.current.messagesError).toBeNull();
    expect(result.current.isLoadingMessages).toBe(true);
  });

  it("does not restore pending list or detail after the source is disabled", async () => {
    let settleList!: (value: unknown) => void;
    let settleDetail!: (value: unknown) => void;
    transport.fetch.mockImplementation((url: string) => new Promise(resolve => { if (url.includes("?")) settleList=resolve; else settleDetail=resolve; }));
    const { result, rerender } = renderHook(({enabled}) => useAdminSupportRealtime("a", {enabled}), {initialProps:{enabled:true}});
    rerender({enabled:false});
    await act(async () => { settleList(response({success:true, threads:[thread("a")]})); settleDetail(detail("a")); });
    expect(result.current.summary).toBeNull();
    expect(result.current.threads).toEqual([]);
    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoadingThreads).toBe(false);
    expect(result.current.isLoadingMessages).toBe(false);
  });

  it("keeps counts absent while the initial source request is pending", async () => {
    let settle!: (value: unknown) => void;
    transport.fetch.mockReturnValue(new Promise(resolve => { settle = resolve; }));
    const { result } = renderHook(() => useAdminSupportRealtime(null));
    expect(result.current.summary).toBeNull();
    await act(async () => { settle(response({success:true, threads:[]})); });
    expect(result.current.summary?.total).toBe(0);
  });

  it.each([
    ["permission denial", response({error:"Forbidden"}, 403)],
    ["explicitly unsuccessful payload", response({success:false, threads:[]})],
    ["missing thread source", response({success:true})],
    ["incomplete summary", response({success:true, threads:[], summary:{total:0}})],
  ])("keeps missing counts distinct from zero after %s", async (_label, payload) => {
    transport.fetch.mockResolvedValue(payload);
    const { result } = renderHook(() => useAdminSupportRealtime(null));
    await waitFor(() => expect(result.current.isLoadingThreads).toBe(false));
    expect(result.current.summary).toBeNull();
    expect(result.current.threadsError).toBeInstanceOf(Error);
  });

  it("retains a verified empty list through background failure and recovers on a valid refresh", async () => {
    transport.fetch.mockResolvedValue(response({success:true, threads:[]}));
    const { result } = renderHook(() => useAdminSupportRealtime(null));
    await waitFor(() => expect(result.current.isLoadingThreads).toBe(false));
    expect(result.current.summary?.total).toBe(0);
    transport.fetch.mockRejectedValueOnce(new Error("Network unavailable"));
    await act(async () => { await result.current.refreshThreads(); });
    expect(result.current.summary?.total).toBe(0);
    expect(result.current.threadsError).toBeInstanceOf(Error);
    await act(async () => { await result.current.refreshThreads(); });
    expect(result.current.threadsError).toBeNull();
    expect(result.current.summary?.total).toBe(0);
  });

  it("clears the snapshot when disabled and performs no further protected read", async () => {
    transport.fetch.mockResolvedValue(response({success:true, threads:[]}));
    const { result, rerender } = renderHook(({ enabled }) => useAdminSupportRealtime(null, {enabled}), {initialProps:{enabled:true}});
    await waitFor(() => expect(result.current.summary?.total).toBe(0));
    rerender({enabled:false});
    await waitFor(() => expect(result.current.summary).toBeNull());
    expect(transport.fetch).toHaveBeenCalledOnce();
  });
});


const supportUi = vi.hoisted(() => ({ actor:"operator-a", providers:[] as Array<{providerId:string}>, search:"", listeners:new Set<() => void>(), push:vi.fn(), success:vi.fn(), error:vi.fn(), report:vi.fn() }));
vi.mock("@/context/AuthContext", () => ({ useAuth:() => ({ user:{uid:supportUi.actor,providerData:supportUi.providers} }) }));
vi.mock("@/components/Analytics/PageViewEvent", () => ({ PageViewEvent:() => null }));
vi.mock("@/lib/client-error-reporting", () => ({ reportClientIssue:supportUi.report }));
vi.mock("sonner", () => ({ toast:{success:supportUi.success,error:supportUi.error} }));
vi.mock("next/navigation", async () => {
  const {useSyncExternalStore} = await vi.importActual<typeof import("react")>("react");
  return { useSearchParams:() => { const search = useSyncExternalStore((listener) => { supportUi.listeners.add(listener); return () => supportUi.listeners.delete(listener); }, () => supportUi.search); return new URLSearchParams(search); }, useRouter:() => ({push:supportUi.push,replace:supportUi.push}) };
});
beforeEach(() => {
  supportUi.actor="operator-a";supportUi.providers=[];supportUi.search="";
  supportUi.success.mockReset();supportUi.error.mockReset();supportUi.report.mockReset();supportUi.push.mockReset();
  supportUi.push.mockImplementation((href:string) => { supportUi.search=new URL(href,"http://localhost").search; supportUi.listeners.forEach(listener => listener()); });
});
function queueThread(id:string): SupportThreadRecord {
  return {id,userId:"user-"+id,threadKey:"support:user-"+id,userEmail:id+"@example.invalid",userDisplayName:"Synthetic "+id,userHandle:null,sourcePath:"/dashboard",status:"waiting_on_support",category:"technical",channel:"in_app",subject:"Synthetic subject "+id,lastMessageAt:1700000000000,createdAt:1700000000000,updatedAt:1700000000000,messageCount:1,lastMessagePreview:"Preview for "+id,unreadForAdmin:true};
}
function queueMessage(id:string): SupportMessageRecord { return {id:"message-"+id,threadId:id,senderRole:"user",senderId:"user-"+id,senderLabel:"Synthetic "+id,body:"Transcript for "+id,createdAt:1700000000000}; }
function queueTransport(action?: (url:string,init:RequestInit) => Promise<unknown>) {
  const records=[queueThread("a"),queueThread("b")];
  transport.fetch.mockImplementation((url:string,init?:RequestInit) => {
    if(init?.method) return action ? action(url,init) : Promise.resolve(response({success:true}));
    if(url.includes("?"))return Promise.resolve(response({success:true,threads:records}));
    const id=url.split("/").pop()!;return Promise.resolve(response({success:true,thread:queueThread(id),messages:[queueMessage(id)]}));
  });
}
function selectSupportThread(id:string) { fireEvent.click(screen.getByRole("button",{name:new RegExp("Synthetic subject "+id)})); }
async function openQueue() { const view=render(React.createElement(AdminSupportQueue));await screen.findByText("Transcript for a");return view; }
describe("Admin Support actual mutation acknowledgement and request custody", () => {
  it.each([["false success",{success:false,error:"Not accepted"}],["missing acknowledgement",{}]])("retains a reply after %s and does not claim success",async(_label,ack) => {
    queueTransport(async()=>response(ack));await openQueue();fireEvent.change(screen.getByLabelText("Reply"),{target:{value:"Draft must survive"}});fireEvent.click(screen.getByRole("button",{name:"Send Reply"}));
    await waitFor(()=>expect(supportUi.error).toHaveBeenCalled());expect(screen.getByLabelText("Reply")).toHaveValue("Draft must survive");expect(supportUi.success).not.toHaveBeenCalled();
  });
  it("keeps each selected thread draft separate",async()=>{
    queueTransport();await openQueue();fireEvent.change(screen.getByLabelText("Reply"),{target:{value:"Draft A"}});selectSupportThread("b");await screen.findByText("Transcript for b");expect(screen.getByLabelText("Reply")).toHaveValue("");fireEvent.change(screen.getByLabelText("Reply"),{target:{value:"Draft B"}});selectSupportThread("a");await screen.findByText("Transcript for a");expect(screen.getByLabelText("Reply")).toHaveValue("Draft A");
  });
  it("does not clear a newer draft when the same thread reply completes",async()=>{
    let settle!:(v:unknown)=>void;queueTransport(async()=>new Promise(resolve=>{settle=resolve;}));await openQueue();fireEvent.change(screen.getByLabelText("Reply"),{target:{value:"Sent A"}});fireEvent.click(screen.getByRole("button",{name:"Send Reply"}));fireEvent.change(screen.getByLabelText("Reply"),{target:{value:"New A"}});await act(async()=>{settle(response({success:true}));});expect(screen.getByLabelText("Reply")).toHaveValue("New A");
  });
  it("does not clear another thread draft when a previous reply completes",async()=>{
    let settle!:(v:unknown)=>void;queueTransport(async()=>new Promise(resolve=>{settle=resolve;}));await openQueue();fireEvent.change(screen.getByLabelText("Reply"),{target:{value:"Sent A"}});fireEvent.click(screen.getByRole("button",{name:"Send Reply"}));selectSupportThread("b");await screen.findByText("Transcript for b");fireEvent.change(screen.getByLabelText("Reply"),{target:{value:"New B"}});await act(async()=>{settle(response({success:true}));});expect(screen.getByLabelText("Reply")).toHaveValue("New B");expect(transport.fetch.mock.calls.filter(([,init])=>init?.method==="POST")[0][0]).toBe("/api/admin/support/threads/a/messages");
  });
  it("settles an old actor reply without refreshing or clearing the next actor draft",async()=>{
    let settle!:(v:unknown)=>void;queueTransport(async()=>new Promise(resolve=>{settle=resolve;}));const view=await openQueue();fireEvent.change(screen.getByLabelText("Reply"),{target:{value:"Sent by A"}});fireEvent.click(screen.getByRole("button",{name:"Send Reply"}));supportUi.actor="operator-b";view.rerender(React.createElement(AdminSupportQueue));fireEvent.change(screen.getByLabelText("Reply"),{target:{value:"Actor B draft"}});const readsBefore=transport.fetch.mock.calls.length;await act(async()=>{settle(response({success:true}));});expect(screen.getByLabelText("Reply")).toHaveValue("Actor B draft");expect(transport.fetch.mock.calls).toHaveLength(readsBefore);expect(supportUi.success).not.toHaveBeenCalled();
  });
  it("blocks fixture writes even when a protected read from an earlier operator was retained",async()=>{
    queueTransport();const view=await openQueue();supportUi.providers=[{providerId:"admin-ui-test-session"}];view.rerender(React.createElement(AdminSupportQueue));await waitFor(()=>expect(screen.queryByText("Transcript for a")).not.toBeInTheDocument());expect(transport.fetch.mock.calls.filter(([,init])=>init?.method)).toHaveLength(0);expect(screen.getByText(/source_missing: support source is not loaded in this fixture/)).toBeInTheDocument();
  });
});


describe("Admin Support actual mutation settlement controls", () => {
  it.each([["false status",{success:false,error:"Status not accepted"}],["missing status acknowledgement",{}]])("does not claim %s as a status update",async(_label,ack)=>{
    queueTransport(async()=>response(ack));await openQueue();fireEvent.click(screen.getByRole("button",{name:"Resolve"}));await waitFor(()=>expect(supportUi.error).toHaveBeenCalled());expect(supportUi.success).not.toHaveBeenCalled();
  });
  it("clears only the acknowledged unchanged draft and sends the canonical captured intent once",async()=>{
    queueTransport();await openQueue();fireEvent.change(screen.getByLabelText("Reply"),{target:{value:"Concrete next step"}});fireEvent.click(screen.getByRole("button",{name:"Send Reply"}));await waitFor(()=>expect(supportUi.success).toHaveBeenCalledWith("Support reply sent."));expect(screen.getByLabelText("Reply")).toHaveValue("");const writes=transport.fetch.mock.calls.filter(([,init])=>init?.method);expect(writes).toHaveLength(1);expect(writes[0]).toEqual(["/api/admin/support/threads/a/messages",expect.objectContaining({method:"POST",body:JSON.stringify({message:"Concrete next step"})})]);
  });
  it("keeps a captured status target while selection changes",async()=>{
    let settle!:(v:unknown)=>void;queueTransport(async()=>new Promise(resolve=>{settle=resolve;}));await openQueue();fireEvent.click(screen.getByRole("button",{name:"Resolve"}));selectSupportThread("b");await screen.findByText("Transcript for b");await act(async()=>{settle(response({success:true}));});const writes=transport.fetch.mock.calls.filter(([,init])=>init?.method);expect(writes).toHaveLength(1);expect(writes[0]).toEqual(["/api/admin/support/threads/a",expect.objectContaining({method:"PATCH",body:JSON.stringify({status:"resolved"})})]);expect(screen.getByText("Transcript for b")).toBeInTheDocument();
  });
  it("performs no automatic retry after forbidden and permits one explicit recovered reply",async()=>{
    let accepted=false;queueTransport(async()=>response(accepted?{success:true}:{error:"Forbidden",errorCode:"permission_denied",retryable:false},accepted?200:403));await openQueue();fireEvent.change(screen.getByLabelText("Reply"),{target:{value:"Retained after denial"}});fireEvent.click(screen.getByRole("button",{name:"Send Reply"}));await waitFor(()=>expect(supportUi.error).toHaveBeenCalled());expect(screen.getByLabelText("Reply")).toHaveValue("Retained after denial");expect(transport.fetch.mock.calls.filter(([,init])=>init?.method)).toHaveLength(1);accepted=true;fireEvent.click(screen.getByRole("button",{name:"Send Reply"}));await waitFor(()=>expect(supportUi.success).toHaveBeenCalled());expect(transport.fetch.mock.calls.filter(([,init])=>init?.method)).toHaveLength(2);
  });
  it("does not refresh or announce a mutation after unmount",async()=>{
    let settle!:(v:unknown)=>void;queueTransport(async()=>new Promise(resolve=>{settle=resolve;}));const view=await openQueue();fireEvent.change(screen.getByLabelText("Reply"),{target:{value:"Pending at unmount"}});fireEvent.click(screen.getByRole("button",{name:"Send Reply"}));const calls=transport.fetch.mock.calls.length;view.unmount();await act(async()=>{settle(response({success:true}));});expect(transport.fetch.mock.calls).toHaveLength(calls);expect(supportUi.success).not.toHaveBeenCalled();expect(supportUi.error).not.toHaveBeenCalled();
  });
  it("does not expose the old actor's unsent draft to the next actor",async()=>{
    queueTransport();const view=await openQueue();fireEvent.change(screen.getByLabelText("Reply"),{target:{value:"Private operator A draft"}});supportUi.actor="operator-b";view.rerender(React.createElement(AdminSupportQueue));expect(screen.getByLabelText("Reply")).toHaveValue("");
  });
});


describe("Admin Support operator generation", () => {
  it("rejects an A to B to A late acknowledgement even when the new A draft equals the old sent text",async()=>{
    let settle!:(v:unknown)=>void;queueTransport(async()=>new Promise(resolve=>{settle=resolve;}));const view=await openQueue();fireEvent.change(screen.getByLabelText("Reply"),{target:{value:"Identical text, different action"}});fireEvent.click(screen.getByRole("button",{name:"Send Reply"}));supportUi.actor="operator-b";view.rerender(React.createElement(AdminSupportQueue));fireEvent.change(screen.getByLabelText("Reply"),{target:{value:"Operator B draft"}});supportUi.actor="operator-a";view.rerender(React.createElement(AdminSupportQueue));fireEvent.change(screen.getByLabelText("Reply"),{target:{value:"Identical text, different action"}});const calls=transport.fetch.mock.calls.length;await act(async()=>{settle(response({success:true}));});expect(screen.getByLabelText("Reply")).toHaveValue("Identical text, different action");expect(transport.fetch.mock.calls).toHaveLength(calls);expect(supportUi.success).not.toHaveBeenCalled();
  });
});


describe("Admin Support action HTTP classification",()=>{
  it.each([[401,"auth_required"],[403,"forbidden"],[503,"service_unavailable"]] as const)("preserves status %s in the actual reply error copy",async(status,key)=>{
    queueTransport(async()=>response({},status));await openQueue();fireEvent.change(screen.getByLabelText("Reply"),{target:{value:"Retain through expected failure"}});fireEvent.click(screen.getByRole("button",{name:"Send Reply"}));await waitFor(()=>expect(supportUi.error).toHaveBeenCalledWith(HUMAN_ERROR_DICTIONARY[key].operatorMessage));expect(screen.getByLabelText("Reply")).toHaveValue("Retain through expected failure");expect(transport.fetch.mock.calls.filter(([,init])=>init?.method)).toHaveLength(1);expect(supportUi.success).not.toHaveBeenCalled();
  });
});


describe("Admin Support sourced inbox and conversation navigation", () => {
  it("opens a selected thread through the canonical URL and keeps its account filter",async()=>{
    supportUi.search="?userId=user-a";queueTransport();await openQueue();selectSupportThread("a");expect(supportUi.push).toHaveBeenCalledWith("/admin/support?userId=user-a&threadId=a",{scroll:false});expect(document.querySelector('[data-admin-support-pane="conversation"]')).toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"Back to inbox"}));expect(supportUi.search).toBe("?userId=user-a");expect(document.querySelector('[data-admin-support-pane="inbox"]')).toBeInTheDocument();
  });
  it("keeps an explicit deep-linked thread beyond the loaded inbox and recovers it through the same bounded detail hook",async()=>{
    supportUi.search="?threadId=outside";queueTransport();render(React.createElement(AdminSupportQueue));await screen.findByText("Transcript for outside");expect(screen.queryByText("Transcript for a")).not.toBeInTheDocument();expect(transport.fetch.mock.calls.filter(([url])=>url==="/api/admin/support/threads/outside")).toHaveLength(1);expect(document.querySelector('[data-admin-support-pane="conversation"]')).toBeInTheDocument();
  });
  it("restores the selected conversation after a local component reload using its URL",async()=>{
    supportUi.search="?threadId=b";queueTransport();const first=render(React.createElement(AdminSupportQueue));await screen.findByText("Transcript for b");first.unmount();render(React.createElement(AdminSupportQueue));await screen.findByText("Transcript for b");expect(screen.getByRole("link",{name:"View Record"})).toHaveAttribute("href","/admin/user/user-b");
  });
  it("makes resolved and closed threads accessible from the existing normalized status filter",async()=>{
    transport.fetch.mockImplementation((url:string)=>Promise.resolve(url.includes("?")?response({success:true,threads:[queueThread("a"),{...queueThread("b"),status:"closed"}]}):response({success:true,thread:queueThread(url.split("/").pop()!),messages:[queueMessage(url.split("/").pop()!)]})));await openQueue();const disclosure=screen.getByText("Thread status: All statuses");fireEvent.click(disclosure);fireEvent.click(screen.getByRole("button",{name:"Resolved",exact:true}));expect(disclosure).toHaveTextContent("Thread status: Resolved");expect(disclosure).toHaveFocus();expect(disclosure.closest("details")).not.toHaveAttribute("open");expect(screen.getByRole("button",{name:/Synthetic subject b/})).toBeInTheDocument();expect(screen.queryByRole("button",{name:/Synthetic subject a/})).not.toBeInTheDocument();
  });
  it("exposes a failed inbox as unavailable and recovers only on an explicit refresh",async()=>{
    transport.fetch.mockResolvedValue(response({error:"Forbidden"},403));render(React.createElement(AdminSupportQueue));await screen.findByText("Inbox unavailable");expect(screen.getAllByText("--")).toHaveLength(3);expect(screen.queryByText("No support threads in the loaded inbox.")).not.toBeInTheDocument();expect(screen.getByRole("alert")).toBeInTheDocument();expect(transport.fetch).toHaveBeenCalledOnce();queueTransport();fireEvent.click(screen.getByRole("button",{name:"Refresh inbox"}));await screen.findByText("Transcript for a");expect(screen.queryByText("Inbox unavailable")).not.toBeInTheDocument();
  });
  it("distinguishes a verified empty inbox from an initial missing source",async()=>{
    transport.fetch.mockResolvedValue(response({success:true,threads:[]}));render(React.createElement(AdminSupportQueue));await screen.findByText("No support threads in the loaded inbox.");expect(screen.getAllByText("0")).toHaveLength(3);expect(screen.queryByText("Inbox unavailable")).not.toBeInTheDocument();
  });
  it("settles missing deep-link detail visibly instead of leaving an indefinite spinner",async()=>{
    supportUi.search="?threadId=missing";transport.fetch.mockImplementation((url:string)=>Promise.resolve(url.includes("?")?response({success:true,threads:[]}):response({success:true,thread:null,messages:[]})));render(React.createElement(AdminSupportQueue));await screen.findByRole("heading",{name:"Conversation unavailable"});expect(screen.getByRole("button",{name:"Reload conversation"})).toBeInTheDocument();expect(screen.queryByRole("textbox",{name:"Reply"})).not.toBeInTheDocument();expect(screen.queryByText("Checking the selected thread.")).not.toBeInTheDocument();
  });
  it("retains verified same-thread messages after a failed refresh and requires source recovery before another reply",async()=>{
    queueTransport();await openQueue();transport.fetch.mockImplementation((url:string)=>Promise.resolve(url.includes("?")?response({success:true,threads:[queueThread("a"),queueThread("b")]}):response({error:"Forbidden"},403)));fireEvent.click(screen.getByRole("button",{name:"Refresh inbox"}));await screen.findByRole("button",{name:"Reload conversation"});expect(screen.getByText("Transcript for a")).toBeInTheDocument();expect(screen.getByRole("textbox",{name:"Reply"})).toBeDisabled();queueTransport();fireEvent.click(screen.getByRole("button",{name:"Reload conversation"}));await waitFor(()=>expect(screen.getByRole("textbox",{name:"Reply"})).not.toBeDisabled());expect(screen.queryByRole("button",{name:"Reload conversation"})).not.toBeInTheDocument();
  });
  it("labels a system transcript as System rather than attributing it to the user",async()=>{
    transport.fetch.mockImplementation((url:string)=>Promise.resolve(url.includes("?")?response({success:true,threads:[queueThread("a")]}):response({success:true,thread:queueThread("a"),messages:[{...queueMessage("a"),senderRole:"system"}]})));await openQueue();expect(within(screen.getByRole("region",{name:"Conversation messages"})).getByText("System")).toBeInTheDocument();expect(within(screen.getByRole("region",{name:"Conversation messages"})).queryByText("User")).not.toBeInTheDocument();
  });
});


// Actual hook, decoder, adapter and Queue; only protected transport/operator and external sinks are isolated.
// New read-boundary coverage uses real Response bodies instead of bypassing the canonical body reader.
function encodedSupportRead(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("Support typed read error ownership", () => {
  it.each([
    ["list", 401, { success: false, errorKey: "session_expired" }, "session_expired"],
    ["list", 403, { success: false, errorKey: "forbidden" }, "forbidden"],
    ["list", 503, { success: false, error: "Admin support inbox index is not configured.", errorCode: "missing_firestore_index", retryable: false }, "service_unavailable"],
    ["detail", 401, { success: false, errorKey: "session_expired" }, "session_expired"],
    ["detail", 403, { success: false, errorKey: "forbidden" }, "forbidden"],
    ["detail", 503, {}, "service_unavailable"],
  ] as const)("retains %s status %s and its admitted error metadata through the canonical adapter", async (lane, status, body, expectedKey) => {
    transport.fetch.mockImplementation((url: string) => Promise.resolve(url.includes("?")
      ? lane === "list" ? encodedSupportRead(body, status) : encodedSupportRead({ success: true, threads: [] })
      : encodedSupportRead(body, status)));
    const { result } = renderHook(() => useAdminSupportRealtime(lane === "detail" ? "a" : null));
    await waitFor(() => expect(lane === "list" ? result.current.isLoadingThreads : result.current.isLoadingMessages).toBe(false));
    const error = lane === "list" ? result.current.threadsError : result.current.messagesError;
    const metadata = Object.fromEntries(Object.entries(body).filter(([key]) => ["errorKey", "errorCode", "code", "retryable"].includes(key)));
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ status, ...metadata });
    expect(resolveClientActionError(error, { surface: "admin_truth", fallbackKey: "admin_truth_unavailable" }).descriptor.errorKey).toBe(expectedKey);
    if (lane === "list") expect(result.current.summary).toBeNull();
    else expect(result.current.messages).toEqual([]);
    expect(transport.fetch.mock.calls.filter(([url]) => lane === "list" ? url.includes("?") : url.endsWith("/a"))).toHaveLength(1);
  });

  it("shows the real inbox index503 as unavailable and sends the same safe classification to Debug", async () => {
    transport.fetch.mockResolvedValue(encodedSupportRead({ success: false, error: "Admin support inbox index is not configured.", errorCode: "missing_firestore_index", retryable: false }, 503));
    render(React.createElement(AdminSupportQueue));
    await screen.findByText("Inbox unavailable");
    const safeMessage = HUMAN_ERROR_DICTIONARY.service_unavailable.operatorMessage;
    expect(within(screen.getByRole("region", { name: "Support thread queue" })).getByRole("alert")).toHaveTextContent(safeMessage);
    expect(supportUi.report).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.objectContaining({ route: "/api/admin/support/threads", message: safeMessage }) }));
    expect(screen.getAllByText("--")).toHaveLength(3);
    expect(screen.queryByText("No support threads in the loaded inbox.")).not.toBeInTheDocument();
    expect(transport.fetch).toHaveBeenCalledOnce();
  });

  it("shows a real detail403 in the selected conversation and Debug without exposing raw error text", async () => {
    supportUi.search = "?threadId=a";
    transport.fetch.mockImplementation((url: string) => Promise.resolve(url.includes("?")
      ? encodedSupportRead({ success: true, threads: [queueThread("a")] })
      : encodedSupportRead({ success: false, errorKey: "forbidden", userMessage: HUMAN_ERROR_DICTIONARY.forbidden.userMessage }, 403)));
    render(React.createElement(AdminSupportQueue));
    await screen.findByRole("button", { name: "Reload conversation" });
    const safeMessage = HUMAN_ERROR_DICTIONARY.forbidden.operatorMessage;
    expect(within(screen.getByRole("region", { name: "Support thread workspace" })).getByRole("alert")).toHaveTextContent(safeMessage);
    expect(supportUi.report).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.objectContaining({ route: "/api/admin/support/threads/a", threadId: "a", message: safeMessage }) }));
    expect(screen.getByRole("textbox", { name: "Reply" })).toBeDisabled();
    expect(transport.fetch.mock.calls.filter(([url]) => url.endsWith("/a"))).toHaveLength(1);
  });

  it("retains a verified list during a pending index failure and recovers only through the existing explicit refresh", async () => {
    transport.fetch.mockResolvedValue(encodedSupportRead({ success: true, threads: [queueThread("a")] }));
    const { result } = renderHook(() => useAdminSupportRealtime(null));
    await waitFor(() => expect(result.current.summary?.total).toBe(1));
    let settle!: (value: Response) => void;
    transport.fetch.mockImplementationOnce(() => new Promise(resolve => { settle = resolve; }));
    let refresh!: Promise<void>;
    act(() => { refresh = result.current.refreshThreads(); });
    expect(result.current.isLoadingThreads).toBe(true);
    expect(result.current.threads.map(item => item.id)).toEqual(["a"]);
    await act(async () => { settle(encodedSupportRead({ success: false, errorCode: "missing_firestore_index", retryable: false }, 503)); await refresh; });
    expect(result.current.isLoadingThreads).toBe(false);
    expect(result.current.summary?.total).toBe(1);
    expect(result.current.threads.map(item => item.id)).toEqual(["a"]);
    expect(result.current.threadsError).toMatchObject({ status: 503, errorCode: "missing_firestore_index", retryable: false });
    expect(transport.fetch).toHaveBeenCalledTimes(2);
    transport.fetch.mockResolvedValueOnce(encodedSupportRead({ success: true, threads: [queueThread("b")] }));
    await act(async () => { await result.current.refreshThreads(); });
    expect(result.current.threadsError).toBeNull();
    expect(result.current.threads.map(item => item.id)).toEqual(["b"]);
    expect(transport.fetch).toHaveBeenCalledTimes(3);
    expect(transport.fetch.mock.calls.every(([url]) => url === "/api/admin/support/threads?status=all")).toBe(true);
  });

  it("retains only verified same-thread messages through detail403 and settles the next valid explicit read", async () => {
    transport.fetch.mockImplementation((url: string) => Promise.resolve(encodedSupportRead(url.includes("?")
      ? { success: true, threads: [queueThread("a")] }
      : { success: true, thread: queueThread("a"), messages: [queueMessage("a")] })));
    const { result } = renderHook(() => useAdminSupportRealtime("a"));
    await waitFor(() => expect(result.current.messages).toEqual([queueMessage("a")]));
    let settle!: (value: Response) => void;
    transport.fetch.mockImplementationOnce(() => new Promise(resolve => { settle = resolve; }));
    let refresh!: Promise<void>;
    act(() => { refresh = result.current.refreshMessages(); });
    expect(result.current.isLoadingMessages).toBe(true);
    expect(result.current.messages).toEqual([queueMessage("a")]);
    await act(async () => { settle(encodedSupportRead({ success: false, errorKey: "forbidden" }, 403)); await refresh; });
    expect(result.current.isLoadingMessages).toBe(false);
    expect(result.current.messages).toEqual([queueMessage("a")]);
    expect(result.current.messagesError).toMatchObject({ status: 403, errorKey: "forbidden" });
    expect(transport.fetch).toHaveBeenCalledTimes(3);
    transport.fetch.mockResolvedValueOnce(encodedSupportRead({ success: true, thread: queueThread("a"), messages: [{ ...queueMessage("a"), body: "Recovered transcript" }] }));
    await act(async () => { await result.current.refreshMessages(); });
    expect(result.current.messagesError).toBeNull();
    expect(result.current.messages[0].body).toBe("Recovered transcript");
    expect(transport.fetch).toHaveBeenCalledTimes(4);
  });

  it("never restores a late typed failure from the previously selected thread", async () => {
    let settleA!: (value: Response) => void;
    transport.fetch.mockImplementation((url: string) => url.includes("?")
      ? Promise.resolve(encodedSupportRead({ success: true, threads: [] }))
      : url.endsWith("/a") ? new Promise(resolve => { settleA = resolve; })
        : Promise.resolve(encodedSupportRead({ success: true, thread: queueThread("b"), messages: [queueMessage("b")] })));
    const { result, rerender } = renderHook(({ id }) => useAdminSupportRealtime(id), { initialProps: { id: "a" } });
    rerender({ id: "b" });
    await waitFor(() => expect(result.current.messages).toEqual([queueMessage("b")]));
    await act(async () => { settleA(encodedSupportRead({ success: false, errorKey: "forbidden" }, 403)); });
    expect(result.current.messages).toEqual([queueMessage("b")]);
    expect(result.current.messagesError).toBeNull();
    expect(result.current.isLoadingMessages).toBe(false);
    expect(transport.fetch.mock.calls.filter(([url]) => !url.includes("?"))).toHaveLength(2);
  });

  it("does not report or restore late typed read errors after the actor enters isolated fixture mode", async () => {
    supportUi.search = "?threadId=a";
    let settleList!: (value: Response) => void;
    let settleDetail!: (value: Response) => void;
    transport.fetch.mockImplementation((url: string) => new Promise(resolve => { if (url.includes("?")) settleList = resolve; else settleDetail = resolve; }));
    const view = render(React.createElement(AdminSupportQueue));
    supportUi.providers = [{ providerId: "admin-ui-test-session" }];
    view.rerender(React.createElement(AdminSupportQueue));
    await screen.findByText(/source_missing: support source is not loaded in this fixture/);
    await act(async () => {
      settleList(encodedSupportRead({ success: false, errorCode: "missing_firestore_index", retryable: false }, 503));
      settleDetail(encodedSupportRead({ success: false, errorKey: "forbidden" }, 403));
    });
    expect(supportUi.report).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Refresh inbox" })).toBeDisabled();
    expect(screen.getAllByText("--")).toHaveLength(3);
    expect(transport.fetch).toHaveBeenCalledTimes(2);
  });

  it.each(["list", "detail"] as const)("never admits a %s payload with valid-looking records but no success acknowledgement", async (lane) => {
    transport.fetch.mockImplementation((url: string) => Promise.resolve(encodedSupportRead(url.includes("?")
      ? { ...(lane === "detail" ? { success: true } : {}), threads: [queueThread("a")] }
      : { thread: queueThread("a"), messages: [queueMessage("a")] })));
    const { result } = renderHook(() => useAdminSupportRealtime(lane === "detail" ? "a" : null));
    await waitFor(() => expect(lane === "list" ? result.current.isLoadingThreads : result.current.isLoadingMessages).toBe(false));
    if (lane === "list") {
      expect(result.current.summary).toBeNull();
      expect(result.current.threads).toEqual([]);
      expect(result.current.threadsError).toBeInstanceOf(Error);
    } else {
      expect(result.current.messages).toEqual([]);
      expect(result.current.messagesError).toBeInstanceOf(Error);
    }
  });
});
