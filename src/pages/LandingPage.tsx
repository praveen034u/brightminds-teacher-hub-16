import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Star, CheckCircle, Shield, Zap, ArrowRight } from 'lucide-react';
import heroIllustration from '@/assets/hero-illustration.png';
import sportsDay from '@/assets/sports-day.jpg';
import library from '@/assets/library.jpg';
import scienceFair from '@/assets/science-fair.jpg';

const galleryItems = [
  { src: sportsDay, label: 'Annual Sports Day' },
  { src: library, label: 'Modern Library' },
  { src: scienceFair, label: 'Science Fair' },
];

const LandingPage = () => {
  const [galleryOffset, setGalleryOffset] = useState(0);

  const scrollGallery = (dir: 'left' | 'right') => {
    setGalleryOffset((prev) => {
      if (dir === 'right') return Math.min(prev + 1, galleryItems.length - 1);
      return Math.max(prev - 1, 0);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(270,60%,97%)] via-white to-[hsl(270,40%,96%)] overflow-x-hidden">
      {/* ── Navigation ── */}
      <nav className="w-full px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <img src="/brightminds-logo1.png" alt="BrightMinds" className="h-10 w-10 object-contain" />
          <span className="text-xl font-bold text-foreground tracking-tight">BrightMinds</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <span className="hover:text-foreground cursor-pointer transition-colors">Product</span>
          <span className="hover:text-foreground cursor-pointer transition-colors">Schools</span>
          <span className="hover:text-foreground cursor-pointer transition-colors">Pricing</span>
          <span className="hover:text-foreground cursor-pointer transition-colors">About</span>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link to="/login">
            <Button size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-16 flex flex-col lg:flex-row items-center gap-12">
        {/* Left – Copy */}
        <div className="flex-1 text-center lg:text-left space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-foreground">
            Where Classrooms<br />
            Become <span className="bg-gradient-to-r from-primary via-[hsl(300,50%,60%)] to-secondary bg-clip-text text-transparent">Smarter</span>{' '}
            Communities
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
            Empower teachers to manage classrooms, engage students, and personalize learning – all in one platform.
          </p>
          <div className="flex gap-4 justify-center lg:justify-start">
            <Link to="/login">
              <Button size="lg" className="rounded-full px-8">
                Get Started as <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Right – Illustration */}
        <div className="flex-1 flex justify-center">
          <img
            src={heroIllustration}
            alt="Teacher and students collaborating"
            className="w-full max-w-md lg:max-w-lg drop-shadow-xl"
          />
        </div>
      </section>

      {/* ── Decorative divider ── */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* ── Role Cards ── */}
      <section className="max-w-5xl mx-auto px-6 pt-8 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Link to="/login" className="group">
            <Card className="p-8 text-center hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-primary/30 bg-card">
              <div className="w-16 h-16 rounded-full bg-[hsl(40,90%,85%)] mx-auto mb-4 flex items-center justify-center text-2xl">
                👩‍🏫
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Teacher</h3>
              <p className="text-sm text-muted-foreground mb-4">Create and manage your classroom</p>
              <span className="text-primary font-medium text-sm group-hover:underline inline-flex items-center gap-1">
                Get Started <ArrowRight className="h-3 w-3" />
              </span>
            </Card>
          </Link>

          <Card className="p-8 text-center opacity-80 bg-card">
            <div className="w-16 h-16 rounded-full bg-[hsl(180,60%,85%)] mx-auto mb-4 flex items-center justify-center text-2xl">
              👩‍👧
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Parent</h3>
            <p className="text-sm text-muted-foreground mb-4">Stay engaged in your child's progress</p>
            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
          </Card>

          <Card className="p-8 text-center opacity-80 bg-card">
            <div className="w-16 h-16 rounded-full bg-[hsl(140,60%,85%)] mx-auto mb-4 flex items-center justify-center text-2xl">
              🎒
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Student</h3>
            <p className="text-sm text-muted-foreground mb-4">Join and participate in rooms</p>
            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
          </Card>
        </div>
      </section>

      {/* ── Trust Indicators ── */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
          {/* Stars */}
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-secondary text-secondary" />
            ))}
          </div>

          <div className="flex flex-col gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-accent" /> Built for modern schools
            </span>
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-destructive" /> Secure authentication powered by Auth0
            </span>
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-secondary" /> Fast setup in minutes
            </span>
          </div>
        </div>
      </section>

      {/* ── Photo Gallery Carousel ── */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="relative">
          {/* Navigation arrows */}
          <button
            onClick={() => scrollGallery('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-card/80 backdrop-blur rounded-full p-2 shadow-md hover:bg-card transition-colors disabled:opacity-30"
            disabled={galleryOffset === 0}
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <button
            onClick={() => scrollGallery('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-card/80 backdrop-blur rounded-full p-2 shadow-md hover:bg-card transition-colors disabled:opacity-30"
            disabled={galleryOffset >= galleryItems.length - 1}
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5 text-foreground" />
          </button>

          {/* Cards */}
          <div className="overflow-hidden rounded-2xl">
            <div
              className="flex gap-6 transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${galleryOffset * (100 / 3)}%)` }}
            >
              {galleryItems.map((item) => (
                <div key={item.label} className="min-w-[calc(33.333%-1rem)] flex-shrink-0">
                  <div className="rounded-2xl overflow-hidden shadow-md aspect-[4/3] relative group">
                    <img
                      src={item.src}
                      alt={item.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                      <p className="text-white font-semibold text-lg">{item.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card/50 py-8 mt-8">
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
    </div>
  );
};

export default LandingPage;
