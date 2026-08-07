import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";
import HowItWorksSection from "./components/HowItWorksSection";
import DashboardPreview from "./components/DashboardPreview";
import ArchitectureSection from "./components/ArchitectureSection";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <div className="relative flex flex-col flex-1">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <DashboardPreview />
        <ArchitectureSection />
      </main>
      <Footer />
    </div>
  );
}
