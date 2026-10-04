// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";

const transport=vi.hoisted(() => ({fetch:vi.fn()}));
vi.mock("@/lib/authFetch", () => ({authFetch:transport.fetch}));
vi.mock("@/context/AuthContext", () => ({useAuth:() => ({user:{uid:"admin-source-proof"}})}));
vi.mock("@/lib/client-error-reporting", () => ({reportClientIssue:vi.fn()}));
const response=(body:unknown,status=200) => ({ok:status<400,status,json:async () => body,text:async () => JSON.stringify(body)});
const wrapper=({children}:{children:ReactNode}) => <SWRConfig value={{provider:()=>new Map(),dedupingInterval:0,revalidateOnFocus:false,revalidateOnReconnect:false}}>{children}</SWRConfig>;
const advance=async (ms=0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
beforeEach(() => {vi.useFakeTimers(); vi.spyOn(Math,"random").mockReturnValue(0); transport.fetch.mockReset();});
afterEach(() => {cleanup(); vi.useRealTimers(); vi.restoreAllMocks();});

describe("Protected Admin SWR read recovery", () => {
  it.each([401,403,422,429])("does not replay a permanent or unbounded %i response through automatic retry timers", async (status) => {
    transport.fetch.mockResolvedValue(response({error:"Source blocked"},status));
    const {result}=renderHook(() => ({...useAdminPollingSWR("/api/admin/source-proof",0,{errorRetryInterval:10})}),{wrapper});
    await advance();
    expect(result.current.error?.status).toBe(status);
    await advance(1000);
    expect(transport.fetch).toHaveBeenCalledOnce();
    expect(result.current.data).toBeUndefined();
  });

  it("keeps transient server retries bounded and allows an explicit later recovery", async () => {
    transport.fetch.mockResolvedValue(response({error:"Source unavailable"},500));
    const {result}=renderHook(() => ({...useAdminPollingSWR<{total:number}>("/api/admin/source-proof",0,{errorRetryInterval:10})}),{wrapper});
    await advance(1000);
    expect(transport.fetch).toHaveBeenCalledTimes(4);
    transport.fetch.mockResolvedValue(response({total:0}));
    await act(async () => { await result.current.mutate(); });
    expect(result.current.data).toEqual({total:0});
    expect(result.current.error).toBeUndefined();
  });

  it("retains verified cached data after a failed background read", async () => {
    transport.fetch.mockResolvedValue(response({total:12}));
    const {result}=renderHook(() => ({...useAdminPollingSWR<{total:number}>("/api/admin/source-proof",0,{errorRetryInterval:10})}),{wrapper});
    await advance();
    expect(result.current.data).toEqual({total:12});
    transport.fetch.mockResolvedValue(response({error:"Forbidden"},403));
    await act(async () => { await result.current.mutate().catch(() => undefined); });
    await advance(1000);
    expect(result.current.data).toEqual({total:12});
    expect(result.current.error?.status).toBe(403);
    expect(transport.fetch).toHaveBeenCalledTimes(2);
  });

  it("does not automatically replay explicit maintenance and recovers on a deliberate later read", async () => {
    transport.fetch.mockResolvedValue(response({state:"maintenance",message:"KandyDrops is upgrading. We will be back soon.",privateData:"must not be copied"},503));
    const {result}=renderHook(() => ({...useAdminPollingSWR<{total:number}>("/api/admin/source-proof",0,{errorRetryInterval:10})}),{wrapper});
    await advance(1000);
    expect(transport.fetch).toHaveBeenCalledOnce();
    expect(result.current.error).toMatchObject({status:503,state:"maintenance",message:"KandyDrops is upgrading. We will be back soon."});
    expect(result.current.error).not.toHaveProperty("info");
    expect(result.current.error).not.toHaveProperty("privateData");
    expect(result.current.data).toBeUndefined();
    transport.fetch.mockResolvedValue(response({total:0}));
    await act(async () => {await result.current.mutate();});
    expect(transport.fetch).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual({total:0});
    expect(result.current.error).toBeUndefined();
  });

  it.each([{status:503,body:{state:"upgrading",message:"Temporary outage"}},{status:503,body:{state:42,message:"Temporary outage"}},{status:500,body:{state:"maintenance",message:"Temporary outage"}}])("keeps ordinary server failure retries bounded without inventing maintenance: %j", async ({status,body}) => {
    transport.fetch.mockResolvedValue(response(body,status));
    const {result}=renderHook(() => ({...useAdminPollingSWR("/api/admin/source-proof",0,{errorRetryInterval:10})}),{wrapper});
    await advance(1000);
    expect(transport.fetch).toHaveBeenCalledTimes(4);
    expect(result.current.error?.status).toBe(status);
    expect(result.current.error).not.toHaveProperty("state");
    expect(result.current.data).toBeUndefined();
  });

  it.each([403,500])("retains HTTP%i classification when a failed response is malformed JSON", async (status) => {
    transport.fetch.mockResolvedValue({ok:false,status,json:async () => {throw new SyntaxError("Invalid fixture JSON");},text:async () => "<html>Source unavailable</html>"});
    const {result}=renderHook(() => ({...useAdminPollingSWR("/api/admin/source-proof",0,{errorRetryInterval:10})}),{wrapper});
    await advance(1000);
    expect(transport.fetch).toHaveBeenCalledTimes(status===403?1:4);
    expect(result.current.error?.status).toBe(status);
    expect(result.current.data).toBeUndefined();
  });

  it("rejects a declared nonretryable HTTP200 failure rather than accepting a successful data value", async () => {
    transport.fetch.mockResolvedValue(response({success:false,retryable:false,message:"Source validation failed",code:"source_invalid"}));
    const {result}=renderHook(() => ({...useAdminPollingSWR("/api/admin/source-proof",0,{errorRetryInterval:10})}),{wrapper});
    await advance(1000);
    expect(transport.fetch).toHaveBeenCalledOnce();
    expect(result.current.error).toMatchObject({status:200,retryable:false,code:"source_invalid",message:"Source validation failed"});
    expect(result.current.data).toBeUndefined();
  });

});
