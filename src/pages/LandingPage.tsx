import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star, ArrowRight } from 'lucide-react';
import sportsDay from '@/assets/sports-day.jpg';
import library from '@/assets/library.jpg';
import scienceFair from '@/assets/science-fair.jpg';
import heroIllustration from '@/assets/hero-illustration.png';

const galleryImages = [
  { src: sportsDay, label: 'Sports Day', rotation: '-6deg', top: '0', left: '0' },
  { src: library, label: 'Library', rotation: '3deg', top: '40px', left: '30%' },
  { src: scienceFair, label: 'Science Fair', rotation: '-2deg', top: '10px', left: '60%' },
  { src: heroIllustration, label: 'Classroom', rotation: '5deg', top: '60px', left: '15%' },
  { src: sportsDay, label: 'Activities', rotation: '-4deg', top: '50px', left: '45%' },
  { src: library, label: 'Reading', rotation: '2deg', top: '20px', left: '75%' },
];

const LandingPage = () => {
  const [loginOpen, setLoginOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* ── Navigation ── */}
      <nav className="w-full px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <img src="/brightminds-logo1.png" alt="BrightMinds" className="h-14 w-14 object-contain" />
          <span className="text-xl font-bold text-foreground tracking-tight">BrightMinds</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <span className="hover:text-foreground cursor-pointer transition-colors">Products</span>
          <span className="hover:text-foreground cursor-pointer transition-colors">Schools</span>
          <span className="hover:text-foreground cursor-pointer transition-colors">Pricing</span>
          <span className="hover:text-foreground cursor-pointer transition-colors">About</span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLoginOpen(true)}>Log In</Button>
          <Button size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setLoginOpen(true)}>
            Sign up
          </Button>
        </div>
      </nav>

      {/* ── Hero Section – Centered like ClassDojo ── */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-8 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] text-foreground mb-6">
          The Intelligent Classroom Platform for{' '}
          <span className="bg-gradient-to-r from-primary via-[hsl(300,50%,60%)] to-secondary bg-clip-text text-transparent">
            Modern Schools
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Smarter Classrooms. Stronger Learning.<br />
          Powered by Intelligent Teaching.
        </p>
      </section>

      {/* ── "Get started as a..." Role Cards ── */}
      <section className="max-w-3xl mx-auto px-6 pb-12">
        <h3 className="text-center text-lg font-bold text-foreground mb-6">Get started as a...</h3>
        <div className="flex flex-wrap justify-center gap-4">
          {/* Teacher – active */}
          <Link to="/login" className="group">
            <div className="flex flex-col items-center gap-2 px-6 py-5 rounded-2xl border-2 border-border bg-white hover:border-primary/40 hover:shadow-lg transition-all duration-300 min-w-[120px]">
              <div className="w-14 h-14 rounded-full bg-[hsl(350,80%,90%)] flex items-center justify-center text-2xl">
                👩‍🏫
              </div>
              <span className="text-sm font-semibold text-foreground">Teacher</span>
              <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          {/* Parent – coming soon */}
          <div className="flex flex-col items-center gap-2 px-6 py-5 rounded-2xl border-2 border-border bg-white opacity-70 min-w-[120px]">
            <div className="w-14 h-14 rounded-full bg-[hsl(200,70%,90%)] flex items-center justify-center text-2xl">
              👩‍👧
            </div>
            <span className="text-sm font-semibold text-foreground">Parent</span>
            <Badge variant="secondary" className="text-[10px] px-2 py-0">Soon</Badge>
          </div>

          {/* Student – active */}
          <Link to="/student" className="group">
            <div className="flex flex-col items-center gap-2 px-6 py-5 rounded-2xl border-2 border-border bg-white hover:border-primary/40 hover:shadow-lg transition-all duration-300 min-w-[120px]">
              <div className="w-14 h-14 rounded-full bg-[hsl(210,70%,90%)] flex items-center justify-center text-2xl">
                🎒
              </div>
              <span className="text-sm font-semibold text-foreground">Student</span>
              <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        </div>
      </section>

      {/* ── Star Reviews ── */}
      <section className="text-center pb-10">
        <div className="flex items-center justify-center gap-1 mb-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-6 w-6 fill-secondary text-secondary" />
          ))}
        </div>
        <p className="text-sm text-muted-foreground font-medium">Trusted by schools everywhere</p>
      </section>

      {/* ── Photo Mosaic ── */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {galleryImages.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden shadow-md aspect-[4/3] hover:shadow-xl transition-shadow duration-300"
              style={{ transform: `rotate(${item.rotation})` }}
            >
              <img
                src={item.src}
                alt={item.label}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src="/brightminds-logo1.png" alt="BrightMinds" className="h-6 w-6" />
            <span>© 2026 BrightMinds. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <span className="hover:text-foreground cursor-pointer">Privacy</span>
            <span className="hover:text-foreground cursor-pointer">Terms</span>
            <span className="hover:text-foreground cursor-pointer">Contact</span>
          </div>
        </div>
      </footer>

      {/* Login Role Picker Dialog */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Log in as...</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center gap-4 py-4">
            {/* Teacher */}
            <button
              onClick={() => { setLoginOpen(false); navigate('/login'); }}
              className="group flex flex-col items-center gap-2 px-6 py-5 rounded-2xl border-2 border-border bg-white hover:border-primary/40 hover:shadow-lg transition-all duration-300 min-w-[110px]"
            >
              <div className="w-14 h-14 rounded-full bg-[hsl(350,80%,90%)] flex items-center justify-center text-2xl">
                👩‍🏫
              </div>
              <span className="text-sm font-semibold text-foreground">Teacher</span>
              <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* Parent – coming soon */}
            <div className="flex flex-col items-center gap-2 px-6 py-5 rounded-2xl border-2 border-border bg-white opacity-70 min-w-[110px]">
              <div className="w-14 h-14 rounded-full bg-[hsl(200,70%,90%)] flex items-center justify-center text-2xl">
                👩‍👧
              </div>
              <span className="text-sm font-semibold text-foreground">Parent</span>
              <Badge variant="secondary" className="text-[10px] px-2 py-0">Soon</Badge>
            </div>

            {/* Student */}
            <button
              onClick={() => { setLoginOpen(false); navigate('/student'); }}
              className="group flex flex-col items-center gap-2 px-6 py-5 rounded-2xl border-2 border-border bg-white hover:border-primary/40 hover:shadow-lg transition-all duration-300 min-w-[110px]"
            >
              <div className="w-14 h-14 rounded-full bg-[hsl(210,70%,90%)] flex items-center justify-center text-2xl">
                🎒
              </div>
              <span className="text-sm font-semibold text-foreground">Student</span>
              <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPage;
