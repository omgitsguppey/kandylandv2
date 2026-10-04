import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateChatComposerModalScope } from "../../scripts/agent/validate-chat-composer-modal-lift";
import { createSourceValidatorTaskFixture } from "./utils/source-validator-contract";

const VALIDATOR="scripts/agent/validate-chat-composer-modal-lift.ts";
const REPORT="agent/state/chat-composer-modal-lift.generated.json";
const CONTROLLER="src/components/Chat/ChatExperience.tsx";
const PRESENTATION="src/components/creative-tim/kandydrops/chat/ChatNewMessageModal.tsx";
const controller=readFileSync(resolve(CONTROLLER),"utf8"),presentation=readFileSync(resolve(PRESENTATION),"utf8");
function fixture() {
  const current=createSourceValidatorTaskFixture({validator:VALIDATOR,report:REPORT,allowedSourceFiles:[CONTROLLER,PRESENTATION]});
  current.write(CONTROLLER,controller);current.write(PRESENTATION,presentation);
  return current;
}
function reportOf(current: ReturnType<typeof fixture>) { return JSON.parse(current.read(REPORT)); }
const healthy={bottomNavUntouched:true,topNavUntouched:true,chatFunctionsUntouched:true,creatorPickerLogicUntouched:true,paymentWalletGumdropUntouched:true};

describe("chat composer modal lift",()=>{
  it("validates the actual imported picker and current sheet/list/creator bindings with isolated outputs",()=>{
    const current=fixture(),result=current.run();
    expect(result.status,result.output).toBe(0);
    const report=reportOf(current);
    expect(report.status).toBe("pass");expect(report.modalComponent).toBe(CONTROLLER);expect(report.presentationComponent).toBe(PRESENTATION);
    expect(report).toMatchObject(healthy);
    expect(report.checks).toMatchObject({modalHasRequiredDataAttrs:true,modalUsesBottomNavSafeOffset:true,modalHasInternalBottomPadding:true,modalUsesBlackFrostedGlassSkin:true,modalAvoidsLightGrayPanel:true,mobileSafeAreaHandlingExists:true});
    expect(report.validationFailures).toEqual([]);
    expect(report).toHaveProperty("concurrentBottomNavFilesChanged");expect(report).toHaveProperty("concurrentTopNavFilesChanged");expect(report).toHaveProperty("concurrentChatLogicFilesChanged");expect(report).toHaveProperty("concurrentPaymentWalletGumdropFilesChanged");
  },30_000);

  it("scopes actual mutation safeguards to the consumed modal and exact creator uid",()=>{
    expect(evaluateChatComposerModalScope(controller,presentation)).toEqual(healthy);
    expect(evaluateChatComposerModalScope('authFetch("/api/chat/elsewhere");\n'+controller,presentation)).toEqual(healthy);
    expect(evaluateChatComposerModalScope(controller,presentation.replace("onClick={onClose}",'onClick={() => authFetch("/api/chat/elsewhere")}')).chatFunctionsUntouched).toBe(false);
    expect(evaluateChatComposerModalScope(controller,presentation.replace("onClick={onClose}","onClick={() => chargeWallet(creatorId)}")).paymentWalletGumdropUntouched).toBe(false);
    expect(evaluateChatComposerModalScope(controller,presentation.replace('<X className="h-4 w-4" />','<><BottomNav /><X className="h-4 w-4" /></>')).bottomNavUntouched).toBe(false);
    expect(evaluateChatComposerModalScope(controller,presentation.replace('<X className="h-4 w-4" />','<><TopNav /><X className="h-4 w-4" /></>')).topNavUntouched).toBe(false);
    expect(evaluateChatComposerModalScope(controller,presentation.replace('if (!open) {','if (!open || selectedThreadId) {')).chatFunctionsUntouched).toBe(false);
    expect(evaluateChatComposerModalScope(controller,presentation.replace("onSelectCreator(creator.uid)","onSelectCreator(creator.displayName)")).creatorPickerLogicUntouched).toBe(false);
  });

  it.each([
    ["disconnected picker callback",(source:string)=>source.replace("onSelectCreator={openThreadComposer}","onSelectCreator={() => setComposePickerOpen(false)}"),"creatorPickerLogicUntouched"],
    ["disconnected sheet style",(source:string)=>source.replace("sheetStyle={newMessageSheetStyle}","sheetStyle={undefined}"),"modalUsesBottomNavSafeOffset"],
    ["wrong canonical list clearance",(source:string)=>source.replace("scrollPaddingBottom: CHAT_NEW_MESSAGE_MODAL_LIST_BOTTOM_PADDING","scrollPaddingBottom: 0"),"modalHasInternalBottomPadding"],
  ] as const)("rejects %s through the actual isolated CLI",(_name,change,check)=>{
    const current=fixture();current.write(CONTROLLER,change(controller));
    const result=current.run();expect(result.status,result.output).toBe(1);expect(reportOf(current).checks[check]).toBe(false);
  },30_000);

  it("rejects an unused picker and comments containing the entire correct call",()=>{
    const current=fixture();
    const start=controller.indexOf("            <ChatNewMessageModal"),end=controller.indexOf("\n            />",start)+"\n            />".length;
    expect(start).toBeGreaterThan(0);expect(end).toBeGreaterThan(start);
    const call=controller.slice(start,end);
    current.write(CONTROLLER,controller.slice(0,start)+"            {/* picker temporarily absent */}"+controller.slice(end)+"\n/* "+call+" */\nconst unusedPicker = ("+call+");\n");
    const result=current.run();expect(result.status,result.output).toBe(1);
    expect(reportOf(current).checks.modalComponentPresent).toBe(false);expect(reportOf(current).checks.creatorPickerLogicUntouched).toBe(false);
  },30_000);

  it.each([
    ["title",(source:string)=>source.replace('className="text-base font-semibold text-white">New message','className="text-base font-semibold text-black">New message')],
    ["subtitle",(source:string)=>source.replace('className="mt-1 text-sm text-[#8f9097]">Choose','className="mt-1 text-sm text-black">Choose')],
  ] as const)("rejects dark-fill %s with disconnected readable foreground",(_name,change)=>{
    const current=fixture();current.write(PRESENTATION,change(presentation));
    const result=current.run();expect(result.status,result.output).toBe(1);expect(reportOf(current).checks.modalUsesBlackFrostedGlassSkin).toBe(false);
  },30_000);

  it("accepts an equivalent imported component alias and semantic surface/foreground pair",()=>{
    const current=fixture();
    current.write(CONTROLLER,controller.replace("import { ChatNewMessageModal }", "import { ChatNewMessageModal as CreatorMessagePicker }").replace("<ChatNewMessageModal","<CreatorMessagePicker"));
    current.write(PRESENTATION,presentation.replace("bg-slate-950/95","bg-card text-card-foreground").replace('className="text-base font-semibold text-white">New message','className="text-base font-semibold text-card-foreground">New message').replace('className="mt-1 text-sm text-[#8f9097]">Choose','className="mt-1 text-sm text-muted-foreground">Choose'));
    const result=current.run();expect(result.status,result.output).toBe(0);expect(reportOf(current).validationFailures).toEqual([]);
  },30_000);
});
