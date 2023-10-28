import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Navbar from "./components/Navbar";
import SSOLogin from "./pages/SSOLogin";
import ResetPasswordEmail from "./pages/ResetPasswordEmail";
import ResetPassword from "./pages/ResetPassword";
import UserProfile from "./pages/UserProfile";
import OTPVerification from "./pages/OTPVerification";
import QRVerification from "./pages/QRVerification";
import QRVerificationSetup from "./pages/QRVerificationSetup"
const App = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navbar />}>
          <Route element={<Login />} index />
          <Route element={<Home />} path="home" />
          <Route element={<OTPVerification />} path="otp" />
          <Route element={<QRVerification />} path="qr" />
          <Route element={<QRVerificationSetup />} path="qr-setup" />
          <Route element={<Login />} path="login" />
          <Route element={<SSOLogin />} path="sso-login" />
          <Route element={<ResetPasswordEmail />} path="reset-password-email" />
          <Route element={<ResetPassword />} path="reset-password" />
          <Route element={<UserProfile />} path="user-profile" />
        </Route>
      </Routes>
    </>
  );
};

export default App;
