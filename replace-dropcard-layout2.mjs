
import fs from "fs";
const file = "src/components/DropCard.tsx";
let code = fs.readFileSync(file, "utf-8");

const old916 = `        return (
            <div ref={cardRef} className="group relative p-1.5 md:p-3 rounded-2xl md:rounded-3xl glass-panel overflow-hidden h-full flex flex-col">
                <button
                    type="button"
                    onClick={() => {
                        handlePreviewOpen();
                    }}
                    className="relative w-full rounded-xl md:rounded-2xl overflow-hidden border border-white/10 bg-black text-left flex-shrink-0" style={ratioStyle}
                >
                    <NextImage
                        src={drop.imageUrl || "/placeholder.jpg"}
                        alt={drop.title}
                        fill
                        priority={priority}
                        className={cn("object-cover object-center bg-black transition-all duration-500", imageLoaded ? "scale-100" : "scale-105")}
                        onLoadingComplete={() => setImageLoaded(true)}
                        sizes="(max-width: 768px) 25vw, 180px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute top-1.5 right-1.5 z-10">
                        <FileCountChip images={fileCounts.images} videos={fileCounts.videos} compact />
                    </div>
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 space-y-1">
                        {displayedTags.length > 0 ? <DropCardBadge label={displayedTags[0]} compact /> : null}
                        <div className="w-full">
                            <TitleMarquee 
                                title={drop.title} 
                                delaySeed={drop.id.charCodeAt(0) % 6} 
                                className="text-[10px] font-bold text-white leading-tight" 
                            />
                        </div>
                    </div>
                </button>
                <div className="mt-2 flex flex-col gap-2 flex-grow justify-between">
                    <div className="space-y-2 w-full">
                        <div className="flex items-center justify-between w-full">
                            <div className="inline-flex px-2 py-1 rounded-md border border-brand-purple/20 bg-brand-purple/10 text-brand-purple font-bold text-[10px] w-fit">
                                {drop.unlockCost} GD
                            </div>
                            <div
                                className="flex items-center gap-1 opacity-60 text-[9px] font-medium text-white/80"
                                aria-label={\`\${totalViews.toLocaleString()} views\`}
                                title={\`\${totalViews.toLocaleString()} views\`}
                            >
                                <Eye aria-hidden="true" className="w-2.5 h-2.5" />
                                <span>{totalViews.toLocaleString()}</span>
                            </div>
                        </div>
                        {ctaButton}
                    </div>
                    <div className="mt-auto pt-1">
                        <DropCardTimer validUntil={drop.validUntil} />
                    </div>
                </div>
            </div>
        );`;

const new916 = `        return (
            <div ref={cardRef} className="group relative p-1.5 md:p-2.5 rounded-[14px] md:rounded-2xl glass-panel overflow-hidden h-full flex flex-col">
                <button
                    type="button"
                    onClick={() => {
                        handlePreviewOpen();
                    }}
                    className="relative w-full rounded-xl overflow-hidden border border-white/10 bg-black text-left flex-shrink-0" style={ratioStyle}
                >
                    <NextImage
                        src={drop.imageUrl || "/placeholder.jpg"}
                        alt={drop.title}
                        fill
                        priority={priority}
                        className={cn("object-cover object-center bg-black transition-all duration-500", imageLoaded ? "scale-100" : "scale-105")}
                        onLoadingComplete={() => setImageLoaded(true)}
                        sizes="(max-width: 768px) 25vw, 180px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute top-1 right-1 z-10">
                        <FileCountChip images={fileCounts.images} videos={fileCounts.videos} compact />
                    </div>
                    <div className="absolute bottom-1 left-1 right-1 space-y-0.5">
                        <div className="w-full">
                            <TitleMarquee 
                                title={drop.title} 
                                delaySeed={drop.id.charCodeAt(0) % 6} 
                                className="text-[9px] md:text-[10px] font-bold text-white leading-tight drop-shadow-md" 
                            />
                        </div>
                    </div>
                </button>
                <div className="mt-1.5 flex flex-col gap-1.5 flex-grow justify-between">
                    <div className="w-full flex items-center justify-between">
                        <div className="inline-flex px-1.5 py-0.5 rounded-sm bg-brand-purple/10 text-brand-purple font-bold text-[9px] max-w-[50%] tracking-tight">
                            {drop.unlockCost} GD
                        </div>
                        <div
                            className="flex items-center justify-end gap-0.5 opacity-60 text-[8px] font-medium text-white/80"
                            aria-label={\`\${totalViews.toLocaleString()} views\`}
                            title={\`\${totalViews.toLocaleString()} views\`}
                        >
                            <Eye aria-hidden="true" className="w-[9px] h-[9px]" />
                            <span>{totalViews.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="w-full max-h-min mb-1">
                        {ctaButton}
                    </div>
                    <div className="mt-auto">
                        <DropCardTimer validUntil={drop.validUntil} />
                    </div>
                </div>
            </div>
        );`;


const oldStd = `            <div className="relative z-10 space-y-2 md:space-y-3">
                {displayedTags.length > 0 ? <DropCardBadge label={displayedTags[0]} /> : null}
                <DropCardTimer validUntil={drop.validUntil} />

                <div>
                    <div className="mb-0.5 md:mb-1 w-full max-w-full overflow-hidden">
                        <TitleMarquee 
                            title={drop.title} 
                            delaySeed={drop.id.charCodeAt(0) % 6} 
                            className="text-sm md:text-base font-bold text-white leading-tight tracking-tight" 
                        />
                    </div>
                    <p className="text-[10px] md:text-xs text-gray-400 line-clamp-1 font-medium leading-relaxed">{drop.description}</p>
                </div>

                <div className="flex flex-col items-start gap-1.5 md:gap-2 mt-auto pt-1">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1 md:gap-2 px-2 py-1 bg-brand-purple/10 rounded-lg border border-brand-purple/20">
                            <span className="text-brand-purple font-bold text-[10px] md:text-xs tracking-wide whitespace-nowrap">{drop.unlockCost} GD</span>
                        </div>
                        <div
                            className="flex items-center gap-1 opacity-60 text-[9px] font-medium text-white/80"
                            aria-label={\`\${totalViews.toLocaleString()} views\`}
                            title={\`\${totalViews.toLocaleString()} views\`}
                        >
                            <Eye aria-hidden="true" className="w-2.5 h-2.5" />
                            <span>{totalViews.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="w-full">
                        {ctaButton}
                    </div>
                </div>
            </div>`;

const newStd = `            <div className="relative z-10 space-y-1.5 md:space-y-2 mt-1 md:mt-0">
                <div className="flex items-center justify-between w-full gap-2">
                    {displayedTags.length > 0 ? <DropCardBadge label={displayedTags[0]} compact /> : <div />}
                    <DropCardTimer validUntil={drop.validUntil} />
                </div>

                <div>
                    <div className="w-full max-w-full overflow-hidden">
                        <TitleMarquee 
                            title={drop.title} 
                            delaySeed={drop.id.charCodeAt(0) % 6} 
                            className="text-[13px] md:text-sm font-bold text-white leading-tight tracking-tight pt-0.5" 
                        />
                    </div>
                </div>

                <div className="flex flex-col items-start gap-1.5 mt-auto pt-0.5">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 md:py-1 bg-brand-purple/10 rounded-md border border-brand-purple/20">
                            <span className="text-brand-purple font-bold text-[10px] md:text-[11px] tracking-wide whitespace-nowrap">{drop.unlockCost} GD</span>
                        </div>
                        <div
                            className="flex items-center gap-1 opacity-60 text-[9px] font-medium text-white/80"
                            aria-label={\`\${totalViews.toLocaleString()} views\`}
                            title={\`\${totalViews.toLocaleString()} views\`}
                        >
                            <Eye aria-hidden="true" className="w-2.5 h-2.5" />
                            <span>{totalViews.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="w-full">
                        {ctaButton}
                    </div>
                </div>
            </div>`;

const oldFullStd = `    return (
        <div ref={cardRef} className="group relative p-2 md:p-3 rounded-2xl md:rounded-3xl glass-panel overflow-hidden h-full flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/5 via-transparent to-brand-purple/5 pointer-events-none" />`;

const newFullStd = `    return (
        <div ref={cardRef} className="group relative p-2 md:p-2.5 rounded-[14px] md:rounded-2xl glass-panel overflow-hidden h-full flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/5 via-transparent to-brand-purple/5 pointer-events-none" />`;

code = code.replace(/\r\n/g, "\n");
const old916Norm = old916.replace(/\r\n/g, "\n");
const oldStdNorm = oldStd.replace(/\r\n/g, "\n");
const oldFullStdNorm = oldFullStd.replace(/\r\n/g, "\n");

let error = false;
if (code.includes(old916Norm)) { code = code.replace(old916Norm, new916.replace(/\n/g, "\r\n")); } else { error = true; console.error("916 mismatch"); }
if (code.includes(oldStdNorm)) { code = code.replace(oldStdNorm, newStd.replace(/\n/g, "\r\n")); } else { error = true; console.error("Std mismatch"); }
if (code.includes(oldFullStdNorm)) { code = code.replace(oldFullStdNorm, newFullStd.replace(/\n/g, "\r\n")); } else { error = true; console.error("FullStd mismatch"); }

if (!error) {
    fs.writeFileSync(file, code);
    console.log("Success: DropCard layout updated");
}
