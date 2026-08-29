export function AdminModerationWorkspaceAccent() {
    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-24 top-[-8rem] h-72 w-72 rounded-full bg-fuchsia-500/[0.18] blur-3xl" />
            <div className="absolute -right-28 bottom-[-9rem] h-80 w-80 rounded-full bg-violet-500/[0.16] blur-3xl" />
            <div className="absolute left-[18%] top-0 h-px w-2/3 bg-gradient-to-r from-transparent via-fuchsia-200/65 to-transparent" />
            <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(112deg,rgba(255,255,255,0.045),transparent_58%)]" />
        </div>
    );
}
