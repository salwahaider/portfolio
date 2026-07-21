// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { TripsPage } from "./pages/TripsPage";
import { TripDashboard } from "./pages/TripDashboard";
import { SignupPage } from "./pages/SignupPage";
import { JoinTripPage } from "./pages/JoinTripPage";
import SplitCosts from "./pages/SplitCosts";
import Itinerary from "./pages/Itinerary";
import FlightsPage from "./pages/FlightsPage";
import HotelsPage from "./pages/HotelsPage";
import { BackgroundProvider } from "./context/BackgroundProvider";

export default function App() {
  return (
    <BackgroundProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth / landing */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Main app */}
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/trip/:tripId" element={<TripDashboard />} />
          <Route path="/trip/:tripId/split-costs" element={<SplitCosts />} />
          <Route path="/trip/:tripId/itinerary" element={<Itinerary />} />
          <Route path="/trip/:tripId/flights" element={<FlightsPage />} />
          <Route path="/trip/:tripId/hotels" element={<HotelsPage />} />
          <Route path="/join/:inviteCode" element={<JoinTripPage />} />
        </Routes>
      </BrowserRouter>
    </BackgroundProvider>
  );
}
