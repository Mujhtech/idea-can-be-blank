import { IGiveaway } from "@/interface/giveaway";
import { createGiveaway } from "@/utils/giveaway";
import { errorAlert, successAlert } from "@/utils/toast";
import { useCelo } from "@celo/react-celo";
import moment from "moment";
import { useRouter } from "next/router";
import { useState } from "react";

const expires = [
  { value: "30", label: "30 minutes" },
  { value: "1", label: "1 hour" },
  { value: "2", label: "2 hours" },
  { value: "3", label: "3 hours" },
];

export default function Home() {
  const [giveaways, setGiveaways] = useState<IGiveaway[] | null>(null);
  const [isManageGiveawayModalOpen, setIsManageGiveawayModalOpen] =
    useState(false);
  const router = useRouter();

  const { initialised, kit, connect, address, destroy, network } = useCelo();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [amountInCelo, setAmountInCelo] = useState("");
  const [numbersOfUserToJoin, setNumbersOfUserToJoin] = useState("");
  const [expiredIn, setExpiredIn] = useState("");
  const [description, setDescription] = useState("");

  const submitForm = async (e: any) => {
    try {
      e.preventDefault();

      if (address === null) {
        await connect();
      }

      let expiredAt = moment().add(parseInt(expiredIn), "hours").unix();

      if (expiredIn === "30") {
        expiredAt = moment().add(parseInt(expiredIn), "minutes").unix();
      }

      setLoading(true);

      await createGiveaway({
        title,
        totalAmount: parseInt(amountInCelo),
        numbersOfUserToJoin: parseInt(numbersOfUserToJoin),
        expiredAt: `${expiredAt}`,
        description,
        id: "",
        creator: address as string,
        joinedUsers: [],
      });

      setLoading(false);
      router.push("/");
      successAlert("Giveaway created successfully");
    } catch (e) {
      //
      setLoading(false);
      errorAlert("Something went wrong");
    }
  };

  return (
    <div className="w-full flex flex-col px-4">
      <div className="mt-4">
        <h1>Create</h1>
      </div>
      <form className="flex flex-col" onSubmit={(e) => submitForm(e)}>
        <div className="my-3">
          <label
            htmlFor="numberToRegister"
            className="block text-sm font-medium text-gray-700"
          >
            Title
          </label>
          <input
            required
            type="text"
            name="title"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-celo-green focus:ring-celo-green sm:text-sm"
          />
        </div>
        <div className="my-3">
          <label
            htmlFor="amountInCelo"
            className="block text-sm font-medium text-gray-700"
          >
            Amount in Celo
          </label>
          <input
            type="text"
            name="amountInCelo"
            id="amountInCelo"
            required
            value={amountInCelo}
            onChange={(e) => setAmountInCelo(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-celo-green focus:ring-celo-green sm:text-sm"
          />
        </div>
        <div className="my-3">
          <label
            htmlFor="numberToRegister"
            className="block text-sm font-medium text-gray-700"
          >
            Number of user to join (Note: each user get equal amount of Celo)
          </label>
          <input
            type="text"
            required
            name="numberToRegister"
            id="numberToRegister"
            value={numbersOfUserToJoin}
            onChange={(e) => setNumbersOfUserToJoin(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-celo-green focus:ring-celo-green sm:text-sm"
          />
        </div>
        <div className="my-3">
          <label
            htmlFor="numberToRegister"
            className="block text-sm font-medium text-gray-700"
          >
            Expire in
          </label>
          <select
            name="numberToRegister"
            id="numberToRegister"
            required
            value={expiredIn}
            onChange={(e) => setExpiredIn(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-celo-green focus:ring-celo-green sm:text-sm h-[40px]"
          >
            {expires.map((expire) => (
              <option value={expire.value}>{expire.label}</option>
            ))}
          </select>
        </div>
        <div className="my-3">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            name="description"
            required
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-celo-green focus:ring-celo-green sm:text-sm"
          />
        </div>

        <div className="mt-3 flex items-center w-full justify-center">
          <button
            disabled={loading}
            className="inline-flex content-center place-items-center rounded-full border border-wood bg-forest py-2 px-5 text-md font-medium text-snow hover:bg-black disabled:cursor-not-allowed"
          >
            Manage
          </button>
        </div>
      </form>
    </div>
  );
}
