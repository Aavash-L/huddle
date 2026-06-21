import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import GroupChatGraveyard from '@/components/GroupChatGraveyard';
import BentoGrid from '@/components/BentoGrid';
import DownloadHub from '@/components/DownloadHub';
import FAQ from '@/components/FAQ';
import ClosingCTA from '@/components/ClosingCTA';
import Footer from '@/components/Footer';
import MobileCTABar from '@/components/MobileCTABar';

export default function HomePage() {
  return (
    <>
      <Nav />
      <main className="bg-[#0A0E14]">
        <Hero />
        <GroupChatGraveyard />
        <BentoGrid />
        <DownloadHub />
        <FAQ />
        <ClosingCTA />
        <Footer />
      </main>
      <MobileCTABar />
    </>
  );
}
