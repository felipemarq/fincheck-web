//import { Outlet } from "react-router-dom";
import { Outlet } from "react-router-dom";
//import { Logo } from "../components/Logo";
export const LoginLayout = () => {
  return (
    <div className="flex w-full h-full ">
      {/* Right Side */}
      <div className="w-1/2 h-full justify-center items-center p-4 relative hidden lg:flex ">
        {/* Background Image */}
        <img
          src={"illustration"}
          alt="illustration"
          className="object-cover w-full h-full max-w-[656px] max-h-[500px] select-none rounded-[32px]"
        />

        {/* Bottom Div Image */}

        {/* End Bottom Div Image */}
      </div>
      {/* End Right Side */}

      {/* Left Side */}
      <div className=" w-full h-full flex justify-center items-center flex-col gap-16 lg:w-1/2">
        <div className="w-full max-w-[504px] px-8">
          <Outlet />
        </div>
      </div>
      {/* End Left Side */}
    </div>
  );
};
