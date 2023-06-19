import { useCountdownTimer } from "@/hooks/useCountdownTimer";
import { IGiveaway } from "@/interface/giveaway";
import moment from "moment";
import Link from "next/link";
import React from "react";

type GiveawayCardProps = {
  data: IGiveaway;
};

export default function GiveawayCard({ data }: GiveawayCardProps) {
  const [days, hours, minutes, seconds] = useCountdownTimer(
    parseInt(data.expiredAt)
  );

  return (
    <Link href={data.id}>
      <div className="flex flex-row w-full">
        <div className="bg-gypsum rounded-xl h-[60px] w-[60px] text-center flex items-center justify-center">
          <h4 className="text-2xl font-black">#{data.joinedUsers.length}</h4>
        </div>
        <div className="ml-4 flex flex-col items-start">
          <h6>{data.title}</h6>
          <div className="flex flex-row space-x-8 mt-3">
            <span className="font-bold text-sm">
              {hours}hr : {minutes}mins : {seconds}secs
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
