import ManageGiveawayModal from "@/components/modals/ManageGiveawayModal";
import { IGiveaway } from "@/interface/giveaway";
import { useRouter } from "next/router";
import { useState } from "react";

export default function Home() {
  const [giveaways, setGiveaways] = useState<IGiveaway[] | null>(null);
  const [isManageGiveawayModalOpen, setIsManageGiveawayModalOpen] =
    useState(false);
  const router = useRouter();

  return (
    <div className="w-full flex flex-col">
      <div className="w-full flex flex-row justify-between mt-5 items-center">
        <h1>Manage</h1>
        <button
          onClick={() => {
            router.push("/create");
          }}
          className="inline-flex content-center place-items-center rounded-full border border-wood bg-forest py-2 px-5 text-md font-medium text-snow hover:bg-black"
        >
          Create new
        </button>
      </div>
      <ManageGiveawayModal
        isOpen={isManageGiveawayModalOpen}
        onDismiss={() => setIsManageGiveawayModalOpen(false)}
      />
    </div>
  );
}
