import {
  AuthSigner,
  getServiceContext,
  OdisContextName,
} from "@celo/identity/lib/odis/query";
import { FederatedAttestationsWrapper } from "@celo/contractkit/lib/wrappers/FederatedAttestations";
import { OdisPaymentsWrapper } from "@celo/contractkit/lib/wrappers/OdisPayments";
import { ContractKit, newKit } from "@celo/contractkit";
import { useCelo } from "@celo/react-celo";
import { useEffect, useState } from "react";
import { IdentifierPrefix } from "@celo/identity/lib/odis/identifier";
import { Account } from "web3-core";
import { OdisUtils } from "@celo/identity";
import { ALFAJORES_ACCOUNT_PK } from "@/utils/constant";
import BigNumber from "bignumber.js";
import WebBlsBlindingClient from "@/utils/bls-binding-client";
import { E164_REGEX } from "@/utils/validator";

export default function Home() {
  let [componentInitialized, setComponentInitialized] = useState(false);
  const { initialised, kit, connect, address, destroy, network } = useCelo();

  const DEK_PRIVATE_KEY = process.env.NEXT_PUBLIC_DEK_PRIVATE_KEY;
  let issuerKit: ContractKit,
    issuer: Account,
    federatedAttestationsContract: FederatedAttestationsWrapper,
    odisPaymentContract: OdisPaymentsWrapper;

  const [isRegisterNumberModalOpen, setIsRegisterNumberModalOpen] =
    useState(false);
  const [isSendToNumberModalOpen, setIsSendToNumberModalOpen] = useState(false);
  const [isDeregisterNumberModalOpen, setIsDeregisterNumberModalOpen] =
    useState(false);

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
    const DEK_PUBLIC_KEY = process.env.NEXT_PUBLIC_DEK_PUBLIC_KEY;
    console.log("registering dek");
    await accountsContract
      .setAccountDataEncryptionKey(DEK_PUBLIC_KEY as string)
      .sendAndWaitForReceipt({ from: issuer.address });
    console.log("dek registered");
  }

  async function registerNumber(number: string) {
    try {
      const verificationTime = Math.floor(new Date().getTime() / 1000);

      const identifier = await getIdentifier(number);
      console.log(identifier);

      // TODO: lookup list of issuers per phone number.
      // This could be a good example to have for potential issuers to learn about this feature.

      const { accounts } =
        await federatedAttestationsContract.lookupAttestations(identifier, [
          issuer.address,
        ]);
      console.log(accounts);

      if (accounts.length == 0) {
        const attestationReceipt = await federatedAttestationsContract
          .registerAttestationAsIssuer(
            identifier,
            address as string,
            verificationTime
          )
          .sendAndWaitForReceipt();
        console.log("attestation Receipt status:", attestationReceipt.status);
        console.log(
          `Register Attestation as issuer TX hash: ${network.explorer}/tx/${attestationReceipt.transactionHash}/internal-transactions`
        );
      } else {
        console.log("phone number already registered with this issuer");
      }
    } catch (error) {
      throw `Error registering phone number: ${error}`;
    }
  }

  async function sendToNumber(number: string, amount: string) {
    try {
      const identifier = await getIdentifier(number);
      const amountInWei = issuerKit.web3.utils.toWei(amount, "ether");

      const attestations =
        await federatedAttestationsContract.lookupAttestations(identifier, [
          issuer.address,
        ]);

      // TODO: handle when no accounts mapped to number

      const CELO = await kit.contracts.getGoldToken();
      await CELO.transfer(
        attestations.accounts[0],
        amountInWei
      ).sendAndWaitForReceipt({ gasPrice: 20000000000 });
    } catch (error) {
      throw `Failed to send funds to ${number}: ${error}`;
    }
  }

  return (
    <div>
      <div className="h1">
        There you go... a canvas for your next Celo project!
      </div>
    </div>
  );
}
