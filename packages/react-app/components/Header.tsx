import { Disclosure } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useCelo } from "@celo/react-celo";
import Image from "next/image";
import { useEffect, useState } from "react";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";

export default function Header() {
  let [componentInitialized, setComponentInitialized] = useState(false);
  let { initialised, address, connect, disconnect } = useCelo();

  useEffect(() => {
    if (initialised) {
      setComponentInitialized(true);
    }
  }, [initialised]);

  return (
    <header className="">
      <div className="w-full flex flex-row justify-between items-center text-black px-2 md:px-5">
        {componentInitialized && address ? (
          <a
            href={`https://alfajores-blockscout.celo-testnet.org/address/${address}/transactions`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-row items-center space-x-2"
          >
            <Jazzicon diameter={30} seed={jsNumberForAddress(address)} />
            <span>
              {address.slice(0, 6)}...
              {address.slice(-4)}{" "}
            </span>
          </a>
        ) : (
          <h4>Abeg</h4>
        )}
        {componentInitialized && address ? (
          <button
            type="button"
            className="inline-flex content-center place-items-center rounded-full border border-wood bg-black py-2 px-5 text-md font-medium text-snow hover:bg-forest"
            onClick={disconnect}
          >
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex content-center place-items-center rounded-full border border-wood bg-forest py-2 px-5 text-md font-medium text-snow hover:bg-black"
            onClick={() =>
              connect().catch((e) => console.log((e as Error).message))
            }
          >
            Connect
          </button>
        )}
      </div>
    </header>
  );
}
