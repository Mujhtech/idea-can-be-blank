import { useCountdownTimer } from "@/hooks/useCountdownTimer";
import { IGiveaway } from "@/interface/giveaway";
import WebBlsBlindingClient from "@/utils/bls-binding-client";
import { ALFAJORES_ACCOUNT_PK } from "@/utils/constant";
import { getGiveaway } from "@/utils/giveaway";
import { E164_REGEX } from "@/utils/validator";
import { ContractKit, newKit } from "@celo/contractkit";
import { FederatedAttestationsWrapper } from "@celo/contractkit/lib/wrappers/FederatedAttestations";
import { OdisPaymentsWrapper } from "@celo/contractkit/lib/wrappers/OdisPayments";
import { OdisUtils } from "@celo/identity";
import { IdentifierPrefix } from "@celo/identity/lib/odis/identifier";
import {
  AuthSigner,
  OdisContextName,
  getServiceContext,
} from "@celo/identity/lib/odis/query";
import { useCelo } from "@celo/react-celo";
import BigNumber from "bignumber.js";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { Account } from "web3-core";

export default function Home() {
  let [componentInitialized, setComponentInitialized] = useState(false);
  const { initialised, kit, connect, address, destroy, network } = useCelo();
  const [giveaways, setGiveaways] = useState<IGiveaway[] | null>(null);

  const DEK_PRIVATE_KEY = process.env.NEXT_PUBLIC_DEK_PRIVATE_KEY;
  let issuerKit: ContractKit,
    issuer: Account,
    federatedAttestationsContract: FederatedAttestationsWrapper,
    odisPaymentContract: OdisPaymentsWrapper;
  const router = useRouter();
  const { id } = router.query;
  const [giveaway, setGiveaway] = useState<IGiveaway | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchGiveaway = async () => {
    try {
      const res = await getGiveaway(id as string);
      setGiveaway(res);
    } catch (e) {
      //
    }
  };

  useEffect(() => {
    if (giveaway == null) {
      fetchGiveaway();
    }
  });

  useEffect(() => {
    if (initialised) {
      setComponentInitialized(true);
    }
  }, [initialised]);

  useEffect(() => {
    const intializeIssuer = async () => {
      issuerKit = newKit(network.rpcUrl);
      issuer =
        issuerKit.web3.eth.accounts.privateKeyToAccount(ALFAJORES_ACCOUNT_PK);
      issuerKit.addAccount(ALFAJORES_ACCOUNT_PK);
      issuerKit.defaultAccount = issuer.address;
      federatedAttestationsContract =
        await issuerKit.contracts.getFederatedAttestations();
      odisPaymentContract = await issuerKit.contracts.getOdisPayments();
    };
    intializeIssuer();
  });

  async function deregisterPhoneNumber(phoneNumber: string) {
    try {
      const identifier = await getIdentifier(phoneNumber);
      const receipt = await federatedAttestationsContract
        .revokeAttestation(identifier, issuer.address, address as string)
        .sendAndWaitForReceipt();
      console.log(
        `revoke attestation transaction receipt status: ${receipt.status}`
      );
    } catch (error) {
      throw `Failed to deregister phone number: ${error}`;
    }
  }

  async function getIdentifier(phoneNumber: string) {
    try {
      if (!E164_REGEX.test(phoneNumber)) {
        throw "Attempting to hash a non-e164 number: " + phoneNumber;
      }
      const ONE_CENT_CUSD = issuerKit.web3.utils.toWei("0.01", "ether");

      let authMethod: any = OdisUtils.Query.AuthenticationMethod.ENCRYPTION_KEY;
      const authSigner: AuthSigner = {
        authenticationMethod: authMethod,
        rawKey: DEK_PRIVATE_KEY as string,
      };

      const serviceContext = getServiceContext(OdisContextName.ALFAJORES);

      //check remaining quota
      const { remainingQuota } = await OdisUtils.Quota.getPnpQuotaStatus(
        issuer.address,
        authSigner,
        serviceContext
      );

      //increase quota if needed.
      console.log("remaining ODIS quota", remainingQuota);
      if (remainingQuota < 1) {
        // give odis payment contract permission to use cUSD
        const cusd = await issuerKit.contracts.getStableToken();
        const currrentAllowance = await cusd.allowance(
          issuer.address,
          odisPaymentContract.address
        );
        console.log("current allowance:", currrentAllowance.toString());
        let enoughAllowance: boolean = false;

        if (currrentAllowance < BigNumber(ONE_CENT_CUSD)) {
          const approvalTxReceipt = await cusd
            .increaseAllowance(odisPaymentContract.address, ONE_CENT_CUSD)
            .sendAndWaitForReceipt();
          console.log("approval status", approvalTxReceipt.status);
          enoughAllowance = approvalTxReceipt.status;
        } else {
          enoughAllowance = true;
        }

        // increase quota
        if (enoughAllowance) {
          const odisPayment = await odisPaymentContract
            .payInCUSD(issuer.address, ONE_CENT_CUSD)
            .sendAndWaitForReceipt();
          console.log("odis payment tx status:", odisPayment.status);
          console.log("odis payment tx hash:", odisPayment.transactionHash);
        } else {
          throw "cUSD approval failed";
        }
      }

      const blindingClient = new WebBlsBlindingClient(
        serviceContext.odisPubKey
      );
      await blindingClient.init();
      console.log("fetching identifier for:", phoneNumber);
      const response = await OdisUtils.Identifier.getObfuscatedIdentifier(
        phoneNumber,
        IdentifierPrefix.PHONE_NUMBER,
        issuer.address,
        authSigner,
        serviceContext,
        undefined,
        undefined,
        blindingClient
      );

      console.log(`Obfuscated phone number: ${response.obfuscatedIdentifier}`);

      console.log(
        `Obfuscated phone number is a result of: sha3('tel://${response.plaintextIdentifier}__${response.pepper}') => ${response.obfuscatedIdentifier}`
      );

      return response.obfuscatedIdentifier;
    } catch (error) {
      throw `failed to get identifier: ${error}`;
    }
  }

  // this function needs to be called once when using a new issuer address for the first time
  async function registerIssuerAccountAndDEK() {
    if (issuer.address == undefined) {
      throw "issuer not found";
    }
    const accountsContract = await issuerKit.contracts.getAccounts();

    // register account if needed
    let registeredAccount = await accountsContract.isAccount(issuer.address);
    if (!registeredAccount) {
      console.log("Registering account");
      const receipt = await accountsContract
        .createAccount()
        .sendAndWaitForReceipt({ from: issuer.address });
      console.log("Receipt status: ", receipt.status);
    } else {
      console.log("Account already registered");
    }

    // register DEK
    const DEK_PUBLIC_KEY = ALFAJORES_ACCOUNT_PK;
    console.log("registering dek");
    await accountsContract
      .setAccountDataEncryptionKey(DEK_PUBLIC_KEY as string)
      .sendAndWaitForReceipt({ from: issuer.address });
    console.log("dek registered");
  }

  const [days, hours, minutes, seconds] = useCountdownTimer(
    giveaway != null ? parseInt(giveaway!.expiredAt) : new Date().getTime()
  );

  const joinGiveaway = async () => {
    try {
    } catch (e) {
      //
    }
  };

  return (
    <div className="flex flex-col mt-5">
      {giveaway != null ? (
        <div>
          <h1 className="text-2xl font-black">{giveaway.title}</h1>
          <div className="flex flex-row mt-2 space-x-3">
            <div className="flex items-center space-x-2">
              <img
                src="/favicon.ico"
                width={25}
                height={25}
                className="rounded-full"
              />
              <span>{giveaway.totalAmount}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Jazzicon
                diameter={25}
                seed={jsNumberForAddress(giveaway.creator)}
              />
              <span>
                {giveaway.creator.slice(0, 6)}...
                {giveaway.creator.slice(-4)}{" "}
              </span>
            </div>
          </div>
          <div className="my-5 text-sm">
            <p>{giveaway.description}</p>
          </div>
          <div>
            <div className="mt-10 flex items-start justify-start flex-col w-full">
              <p className="md:text-md lg:text-lg font-black">Ends at:</p>
              {minutes > 0 ? (
                <div className="flex flex-col w-full">
                  <div className="flex w-full justify-between mt-6 py-0 px-6 font-black">
                    <div className="flex flex-col items-center justify-center">
                      <span className="md:text-2xl lg:text-3xl">{days}</span>
                      <i className="mt-2 not-italic text-xs">Days</i>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <span className="md:text-2xl lg:text-3xl">{hours}</span>
                      <i className="mt-2 not-italic text-xs">Hours</i>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <span className="md:text-2xl lg:text-3xl">{minutes}</span>
                      <i className="mt-2 not-italic text-xs">Minutes</i>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <span className="md:text-2xl lg:text-3xl">{seconds}</span>
                      <i className="mt-2 not-italic text-xs">Seconds</i>
                    </div>
                  </div>
                  <button className="mt-7 inline-flex content-center place-items-center items-center justify-center rounded-full border border-wood bg-forest py-2 px-5 text-md font-medium text-snow hover:bg-black disabled:cursor-not-allowed">
                    Join Giveaway
                  </button>
                </div>
              ) : (
                <div className="w-full flex items-center justify-center">
                  <h1 className="text-center text-2xl font-black">
                    Giveaway Ended
                  </h1>
                </div>
              )}
            </div>
          </div>
          <div className="text-sm mt-10">List of joined users</div>
          {giveaway.joinedUsers.length > 0 ? (
            giveaway.joinedUsers.map((data) => (
              <div>
                <Jazzicon diameter={25} seed={jsNumberForAddress(data)} />
                <span>
                  {data.slice(0, 6)}...
                  {data.slice(-4)}{" "}
                </span>
              </div>
            ))
          ) : (
            <h4 className="text-xs mt-4">Be the first to join</h4>
          )}
        </div>
      ) : (
        <div></div>
      )}
    </div>
  );
}
