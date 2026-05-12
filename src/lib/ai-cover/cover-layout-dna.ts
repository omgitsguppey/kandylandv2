export type CoverLayoutDna = {
  topBrandSlot: string;
  mainTitleSlot: string;
  heroSlot: string;
  bottomBarText: string;
};

export function getDefaultCoverLayoutDna(): CoverLayoutDna {
  return {
    topBrandSlot: "small creator brand at top",
    mainTitleSlot: "large main flavor title center",
    heroSlot: "single hero object center frame",
    bottomBarText: "UNWRAP BEFORE IT'S GONE",
  };
}
