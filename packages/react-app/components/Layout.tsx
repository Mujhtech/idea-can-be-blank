import { FC, ReactNode } from "react";
import Footer from "./Footer";
import Header from "./Header";

interface Props {
  children: ReactNode;
}
const Layout: FC<Props> = ({ children }) => {
  return (
    <>
      <div className="bg-gray-100 h-full">
        <div className="bg-white flex min-h-screen my-0 mx-auto overflow-x-hidden relative shadow-xl shadow-gray-300 home-container">
          <Header />
          <div className="py-16 w-full space-y-8 sm:px-6 lg:px-8">
            {children}
          </div>
          <Footer />
        </div>
      </div>
    </>
  );
};

export default Layout;
