import React from "react";

export default function GiveawayCard() {
  return (
    <div className="flex flex-row">
      <div className="bg-gypsum rounded-xl h-[100px] w-[100px] text-center flex items-center justify-center">
        <h4 className="text-2xl font-black">#1</h4>
      </div>
      <div className="ml-4 flex flex-col items-start">
        <h6>Join my birthday giveaway</h6>
        <div className="flex flex-row">
          <span>0 / 10</span>
          <span>0hr:0mins:30secs</span>
        </div>
      </div>
    </div>
  );
}
