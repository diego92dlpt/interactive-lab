import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import WaitCalculator from "./experiments/wait-calculator";
import Outbreak from "./experiments/outbreak";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/experiments/wait-calculator" element={<WaitCalculator />} />
        <Route path="/experiments/outbreak" element={<Outbreak />} />
      </Routes>
    </BrowserRouter>
  );
}