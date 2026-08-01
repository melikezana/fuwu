export function SceneFallback() {
  return (
    <div className="relative h-full min-h-[320px] w-full overflow-visible">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 aspect-[1.45] w-[96%] max-w-[880px] -translate-x-1/2 -translate-y-1/2"
      >
        <span className="absolute inset-x-[5%] bottom-[6%] h-[22%] rounded-[50%] bg-[linear-gradient(180deg,#FFFFFF_0%,#F3F6FA_100%)] shadow-[0_34px_90px_rgba(10,37,64,0.16)] ring-1 ring-[rgba(10,37,64,0.06)]" />
        <span className="absolute left-[18%] top-[18%] h-[58%] w-[64%] rounded-[1.1rem] border border-white/80 bg-[linear-gradient(145deg,#FFFFFF_0%,#F7F9FC_54%,#EEF3F8_100%)] shadow-[0_30px_72px_rgba(10,37,64,0.15)]" />
        <span className="absolute left-[14%] top-[10%] h-[17%] w-[72%] skew-x-[-18deg] rounded-t-[1rem] bg-[linear-gradient(135deg,#07182F_0%,#0A2540_72%,#183B63_100%)] shadow-[0_18px_44px_rgba(10,37,64,0.18)]" />
        <span className="absolute left-[61%] top-[3%] h-[17%] w-[7%] rounded-sm bg-[linear-gradient(180deg,#FFFFFF_0%,#DDE5EE_100%)] shadow-[0_8px_24px_rgba(10,37,64,0.12)]" />
        <span className="absolute left-[22%] top-[31%] h-[18%] w-[17%] rounded-md bg-white/96 shadow-[inset_0_0_0_1px_rgba(10,37,64,0.08),0_14px_32px_rgba(10,37,64,0.08)]" />
        <span className="absolute left-[42%] top-[31%] h-[18%] w-[18%] rounded-md bg-white/92 shadow-[inset_0_0_0_1px_rgba(10,37,64,0.07)]" />
        <span className="absolute left-[63%] top-[31%] h-[18%] w-[15%] rounded-md bg-[#FFF4EA] shadow-[inset_0_0_0_1px_rgba(255,101,0,0.12)]" />
        <span className="absolute left-[24%] top-[54%] h-[17%] w-[16%] rounded-md bg-[#FFF4EA] shadow-[inset_0_0_0_1px_rgba(255,101,0,0.12)]" />
        <span className="absolute left-[43%] top-[54%] h-[17%] w-[17%] rounded-md bg-white/96 shadow-[inset_0_0_0_1px_rgba(10,37,64,0.08)]" />
        <span className="absolute left-[63%] top-[54%] h-[17%] w-[15%] rounded-md bg-white/92 shadow-[inset_0_0_0_1px_rgba(10,37,64,0.07)]" />
      </div>
    </div>
  );
}
