//import { Outlet } from "react-router-dom";
import { Outlet } from "react-router-dom";
//import { Logo } from "../components/Logo";
export const LoginLayout = () => {
  return (
    <div className="flex w-full h-full items-center justify-center">
      {/* Right Side */}

      {/* End Right Side */}

      {/* Left Side */}

      <Outlet />

      {/* End Left Side */}
    </div>
  );
};
