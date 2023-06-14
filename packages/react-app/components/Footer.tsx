import { useRouter } from "next/router";

type Props = {
  className?: string;
};

export default function Footer() {
  const router = useRouter();

  const { pathname } = router;

  const splitLocation = pathname.split("/");

  return (
    <footer className="w-full left-0 bottom-0 fixed justify-center items-center z-[9999]">
      <ul className="footer-container">
        <button
          onClick={function () {
            router.push("/");
          }}
          className="flex flex-row items-center space-x-3"
        >
          <span className={splitLocation[1] == "" ? "underline" : ""}>
            Giveaways
          </span>
        </button>
        <button
          onClick={function () {
            router.push("/manage");
          }}
          className="flex flex-row items-center space-x-3"
        >
          <span className={splitLocation[1] == "manage" ? "underline" : ""}>
            Manage Giveaway
          </span>
        </button>
      </ul>
    </footer>
  );
}
