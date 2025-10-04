import HeroSection from "@/app/(public)/_components/hero-section";
import IntegrationsSection from "./_components/integrations-7";
import FeaturesSection from "./_components/features-4";
import TestimonialsSection from "./_components/testimonials";
import PricingSection from "./_components/pricing";
import CallToActionSection from "./_components/call-to-action";
import FooterSection from "./_components/footer";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <FeaturesSection />
      <IntegrationsSection />
      <TestimonialsSection />
      <PricingSection />
      <CallToActionSection />
      <FooterSection />
    </div>
  );
}
