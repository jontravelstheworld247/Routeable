import { auth, googleProvider, signInWithPopup } from './services/firebase'; 
import { sendPasswordResetEmail, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { resetUserPassword } from './services/firebase';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Calendar, Compass, Download, Loader2, Sparkles, Plane, ArrowRight, ChevronLeft, Send, User, Lock, Mail, Phone } from 'lucide-react';
import { generateBrochure, updateBrochure, validateDestination, validateMustVisit, BrochureData } from './services/geminiService';
import { COUNTRIES } from './constants/countries';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const Logo = ({ className = "h-12" }: { className?: string }) => (
  <div className={cn("flex items-center justify-center", className)}>
    <svg viewBox="0 550 1000 350" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Main Text - ROUTEABLE (Uppercase, Heavy Bold) */}
      <text 
        x="500" 
        y="680" 
        textAnchor="middle" 
        fill="#000000" 
        style={{ 
          fontSize: '135px', 
          fontWeight: '900', 
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '0.04em'
        }}
      >
        ROUTEABLE
      </text>

      {/* Subtext - travel planner (Lowercase, Medium) */}
      <text 
        x="500" 
        y="780" 
        textAnchor="middle" 
        fill="#000000" 
        style={{ 
          fontSize: '68px', 
          fontWeight: '600', 
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '0.02em'
        }}
      >
        travel planner
      </text>

      {/* Established Date (Lowercase, Light) */}
      <text 
        x="500" 
        y="850" 
        textAnchor="middle" 
        fill="#000000" 
        style={{ 
          fontSize: '32px', 
          fontWeight: '400',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '0.05em'
        }}
      >
        estd 2026
      </text>
    </svg>
  </div>
);

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const WONDERS_IMAGES = [
  "https://images.weserv.nl/?url=https://images.pexels.com/photos/1423580/pexels-photo-1423580.jpeg?w=1200", // Great Wall
  "https://images.weserv.nl/?url=https://images.pexels.com/photos/1631665/pexels-photo-1631665.jpeg?w=1200", // Petra
  "https://images.weserv.nl/?url=https://images.pexels.com/photos/532263/pexels-photo-532263.jpeg?w=1200", // Colosseum
  "https://images.weserv.nl/?url=https://images.unsplash.com/photo-1589882868702-f0c72816f98b?q=80&w=1332&auto=format&fit=crop", // Chichen Itza
  "https://images.weserv.nl/?url=https://images.pexels.com/photos/2356045/pexels-photo-2356045.jpeg?w=1200", // Machu Picchu
  "https://images.weserv.nl/?url=https://images.pexels.com/photos/1603650/pexels-photo-1603650.jpeg?w=1200", // Taj Mahal
  "https://images.weserv.nl/?url=https://images.pexels.com/photos/13911606/pexels-photo-13911606.jpeg?w=1200"  // Christ the Redeemer
];

const FAMOUS_PLACES = [
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80", // Paris
  "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=1200&q=80", // Venice
  "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?auto=format&fit=crop&w=1200&q=80", // Kyoto
  "https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=1200&q=80", // Tokyo
  "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?auto=format&fit=crop&w=1200&q=80", // Bali
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80", // Yosemite
  "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80", // Santorini
  "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=1200&q=80", // London
  "https://images.unsplash.com/photo-1520116468816-95b69f847357?auto=format&fit=crop&w=1200&q=80", // Switzerland
  "https://images.unsplash.com/photo-1531572753322-ad063cecc140?auto=format&fit=crop&w=1200&q=80", // Rome
];

export default function App() {
  const [view, setView] = useState<'landing' | 'auth' | 'app' | 'contact' | 'forgot-password' | 'verify-otp' | 'reset-password'>('landing');
  const [user, setUser] = useState<{ name: string, photoURL?: string } | null>(() => {
    const saved = localStorage.getItem('routeables_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('routeables_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('routeables_user');
    }
  }, [user]);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    if (view === 'landing') {
      const interval = setInterval(() => {
        setHeroIndex((prev) => (prev + 1) % FAMOUS_PLACES.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [view]);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [duration, setDuration] = useState(3);
  const [mustVisit, setMustVisit] = useState('');
  const [destinationError, setDestinationError] = useState('');
  const [mustVisitError, setMustVisitError] = useState('');
  const [brochure, setBrochure] = useState<BrochureData | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'info' | 'error' } | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const countryInputRef = useRef<HTMLDivElement>(null);
  const brochureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryInputRef.current && !countryInputRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (country.trim() === '') {
      setFilteredCountries(COUNTRIES);
    } else {
      const filtered = COUNTRIES.filter(c => 
        c.toLowerCase().includes(country.toLowerCase())
      );
      setFilteredCountries(filtered);
    }
  }, [country]);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${window.location.origin}/api/health`);
        if (res.ok) {
          console.log("Server is healthy");
        } else {
          console.error("Server health check failed:", res.status);
        }
      } catch (err) {
        console.error("Could not reach server:", err);
      }
    };
    checkHealth();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Auth State
  const [isLogin, setIsLogin] = useState(true);
  const [authData, setAuthData] = useState({ name: '', dob: '', identifier: '', password: '', confirmPassword: '', otp: '' });
  const [authError, setAuthError] = useState('');

  const validateIdentifier = (id: string) => {
    // Email Regex: stricter
    const emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    // Phone Regex: basic international format
    const phoneRe = /^\+?[1-9]\d{1,14}$/;

    if (emailRe.test(id)) {
      const disposableDomains = ['mailinator.com', 'temp-mail.org', 'guerrillamail.com', '10minutemail.com', 'asdf.com', 'test.com'];
      const domain = id.split('@')[1];
      if (disposableDomains.includes(domain)) {
        return { valid: false, message: "Disposable or test email addresses are not allowed." };
      }

      const localPart = id.split('@')[0];
      // Stricter gibberish check
      if (localPart.length > 8) {
        const uniqueChars = new Set(localPart.toLowerCase().split('')).size;
        const vowels = localPart.match(/[aeiou]/gi);
        // If very few unique characters or very few vowels relative to length
        if (uniqueChars < 3 || !vowels || vowels.length / localPart.length < 0.15) {
          return { valid: false, message: "This email address looks suspicious. Please use a real one." };
        }
      }
      return { valid: true, type: 'email' };
    }

    if (phoneRe.test(id.replace(/[- ]/g, ''))) {
      if (id.replace(/[- ]/g, '').length < 10) {
        return { valid: false, message: "Phone number is too short." };
      }
      return { valid: true, type: 'phone' };
    }

    return { valid: false, message: "Please enter a valid email address or phone number." };
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setAuthError('');

    const validation = validateIdentifier(authData.identifier);
    if (!validation.valid) {
      setAuthError(validation.message || "Invalid input");
      return;
    }

    setLoading(true);
    const endpoint = isLogin ? '/api/login' : '/api/signup';
    const url = `${window.location.origin}${endpoint}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData),
      });
      
      // Handle lockout specifically even if response is not JSON
      if (res.status === 403 || res.status === 423) {
        setAuthError("Account locked due to 3 failed attempts. Redirecting to reset...");
        setTimeout(() => setView('forgot-password'), 2000);
        return;
      }

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch (e) {
          throw new Error("Failed to parse server response");
        }
      } else {
        const text = await res.text();
        console.error("Non-JSON response:", text);
        throw new Error(`Server error (${res.status}). Please try again later.`);
      }

      if (res.ok) {
        if (isLogin) {
          // If it's an email login, check if verified (skip for phone for now)
          if (authData.identifier.includes('@')) {
            try {
              // We don't sign in with Firebase here yet, but we can check if the user exists
              // For a real app, we'd use signInWithEmailAndPassword(auth, ...) and check user.emailVerified
              // Since we use a local DB for the main session, we'll just proceed but warn
              console.log("Session started for email user");
            } catch (e) {
              console.error("Verification check failed");
            }
          }
          setUser(data.user);
          setView('app');
        } else {
          // Create user in Firebase as well so reset email works
          if (authData.identifier.includes('@')) {
            try {
              const userCredential = await createUserWithEmailAndPassword(auth, authData.identifier, authData.password);
              // Send verification email to ensure it's a real email
              await sendEmailVerification(userCredential.user);
            } catch (fbErr: any) {
              console.error("Firebase signup error:", fbErr);
              if (fbErr.code === 'auth/email-already-in-use') {
                setAuthError("This email is already registered in our system.");
                setLoading(false);
                return;
              }
            }
            setIsLogin(true);
            setAuthError('Account created! A verification email has been sent to your address. Please verify it before logging in.');
          } else {
            // Phone signup
            setIsLogin(true);
            setAuthError('Account created with phone number! Please log in.');
          }
        }
      } else {
        setAuthError(data.error || "Authentication failed");
        if (isLogin && res.status === 404) {
          setTimeout(() => setIsLogin(false), 2000);
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setAuthError(err.message || 'Something went wrong. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setAuthError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Sync with local database
      const res = await fetch(`${window.location.origin}/api/google-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.displayName || 'Google User',
          identifier: user.email,
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setUser({
          ...data.user,
          photoURL: user.photoURL || undefined
        });
        setView('app');
      } else {
        setAuthError(data.error || "Google authentication failed");
      }
    } catch (err: any) {
      console.error("Google login error:", err);
      setAuthError(err.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, authData.identifier);
      setNotification({ 
        message: "A password reset link has been sent to your email address.", 
        type: 'info' 
      });
      setTimeout(() => setView('auth'), 3000);
    } catch (err: any) {
      console.error("Firebase reset error:", err);
      setAuthError(err.message || 'Failed to send reset email. Make sure the email is correct.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const url = `${window.location.origin}/api/verify-otp`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: authData.identifier, otp: authData.otp }),
      });
      
      const contentType = res.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error(`Server error (${res.status})`);
      }

      if (res.ok) {
        setView('reset-password');
      } else {
        setAuthError(data.error || "Verification failed");
      }
    } catch (err: any) {
      setAuthError(err.message || 'Something went wrong');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (authData.password !== authData.confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }
    try {
      const url = `${window.location.origin}/api/reset-password`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          identifier: authData.identifier, 
          otp: authData.otp, 
          password: authData.password 
        }),
      });
      
      const contentType = res.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error(`Server error (${res.status})`);
      }

      if (res.ok) {
        setView('landing');
        alert('Password reset successful! Please log in.');
      } else {
        setAuthError(data.error || "Reset failed");
      }
    } catch (err: any) {
      setAuthError(err.message || 'Something went wrong');
    }
  };

  const handleContinue = async () => {
    const fullDestination = city ? `${city}, ${country}` : country;
    if (!country) return;
    setLoading(true);
    setDestinationError('');
    try {
      const validation = await validateDestination(fullDestination);
      if (validation.isValid) {
        setStep(2);
      } else {
        setDestinationError(validation.message || "Please enter a real destination.");
      }
    } catch (error) {
      console.error("Validation error:", error);
      setDestinationError("Could not verify destination. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setMustVisitError('');
    try {
      const fullDestination = city ? `${city}, ${country}` : country;
      // Validate must visit places if provided
      if (mustVisit.trim()) {
        const validation = await validateMustVisit(fullDestination, mustVisit);
        if (!validation.isValid) {
          setMustVisitError(validation.message || "These places don't seem to exist.");
          setLoading(false);
          return;
        }
      }

      const data = await generateBrochure(fullDestination, duration, mustVisit);
      setBrochure(data);
      setStep(3);
    } catch (error) {
      console.error("Error generating brochure:", error);
      alert("Failed to generate brochure. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage || !brochure) return;
    setChatLoading(true);
    try {
      const updated = await updateBrochure(brochure, chatMessage);
      setBrochure(updated);
      setChatMessage('');
    } catch (error) {
      alert("Failed to update brochure.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('landing');
    setStep(1);
    setBrochure(null);
    setShowProfileDropdown(false);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      setView('landing');
    }
  };

  const downloadPDF = async () => {
    if (!brochureRef.current || !brochure) return;
    setLoading(true);
    try {
      window.scrollTo(0, 0);
      const destination = brochure.destination;
      
      // Wait for images
      const images = brochureRef.current.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          const timeout = setTimeout(resolve, 5000);
          img.onload = () => { clearTimeout(timeout); resolve(null); };
          img.onerror = () => { clearTimeout(timeout); resolve(null); };
        });
      }));
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Sections to capture
      const sectionIds = ['pdf-intro', ...brochure.itinerary.map(d => `pdf-day-${d.day}`), 'pdf-sidebar'];
      
      for (let i = 0; i < sectionIds.length; i++) {
        const sectionId = sectionIds[i];
        const sectionElement = document.getElementById(sectionId);
        if (!sectionElement) {
          console.warn(`Section ${sectionId} not found`);
          continue;
        }

        if (i > 0) pdf.addPage();

        const canvas = await html2canvas(sectionElement, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: document.documentElement.offsetWidth,
          windowHeight: document.documentElement.offsetHeight,
          onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.getElementById(sectionId);
            if (clonedElement) {
              // Force A4 Aspect Ratio (1:1.414)
              clonedElement.style.width = '1000px'; 
              clonedElement.style.minHeight = '1414px'; 
              clonedElement.style.display = 'flex';
              clonedElement.style.flexDirection = 'column';
              clonedElement.style.justifyContent = 'flex-start';
              clonedElement.style.alignItems = 'flex-start';
              clonedElement.style.textAlign = 'left';
              clonedElement.style.padding = '100px';
              clonedElement.style.backgroundColor = '#ffffff';
              clonedElement.style.margin = '0';
              clonedElement.style.width = '1000px';

              // Force left alignment on the main grid/container
              const mainContainer = clonedElement.querySelector('.grid');
              if (mainContainer) {
                (mainContainer as HTMLElement).style.display = 'flex';
                (mainContainer as HTMLElement).style.flexDirection = 'column';
                (mainContainer as HTMLElement).style.alignItems = 'flex-start';
                (mainContainer as HTMLElement).style.width = '100%';
              }

              // Force left alignment on all text containers
              const textContainers = clonedElement.querySelectorAll('.text-center, .items-center, .justify-center, .text-right');
              textContainers.forEach(container => {
                (container as HTMLElement).style.textAlign = 'left';
                (container as HTMLElement).style.alignItems = 'flex-start';
                (container as HTMLElement).style.justifyContent = 'flex-start';
                (container as HTMLElement).style.marginLeft = '0';
                (container as HTMLElement).style.marginRight = 'auto';
              });

              // Specific fix for the header (destination title area)
              const header = clonedElement.querySelector('.flex.justify-between');
              if (header) {
                (header as HTMLElement).style.display = 'flex';
                (header as HTMLElement).style.flexDirection = 'column';
                (header as HTMLElement).style.alignItems = 'flex-start';
                (header as HTMLElement).style.gap = '40px';
                (header as HTMLElement).style.marginBottom = '80px';
                (header as HTMLElement).style.width = '100%';
              }

              // Specific fix for itinerary items (Day X)
              const itineraryDay = clonedElement.querySelector('.text-sm.font-bold.uppercase');
              if (itineraryDay) {
                (itineraryDay as HTMLElement).style.marginBottom = '20px';
              }

              // Add spacing between elements to prevent overlapping
              const allChildren = clonedElement.querySelectorAll('.space-y-6, .space-y-4, .space-y-8');
              allChildren.forEach(child => {
                (child as HTMLElement).style.gap = '30px';
                (child as HTMLElement).style.display = 'flex';
                (child as HTMLElement).style.flexDirection = 'column';
              });

              // Hide the timeline dot
              const dots = clonedElement.querySelectorAll('.absolute');
              dots.forEach(dot => {
                if ((dot as HTMLElement).classList.contains('-left-1.5')) {
                  (dot as HTMLElement).style.display = 'none';
                }
              });

              const imgs = clonedElement.querySelectorAll('img');
              imgs.forEach(img => {
                img.style.margin = '40px 0';
                img.style.display = 'block';
                img.style.width = '100%';
                img.style.maxWidth = '800px';
                img.style.height = '550px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '32px';
                img.style.boxShadow = '0 20px 40px rgba(0,0,0,0.1)';
              });

              // Hide decorative background elements
              const decor = clonedElement.querySelectorAll('.bg-stone-50.rounded-full');
              decor.forEach(d => (d as HTMLElement).style.display = 'none');
            }
          }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        // Fill the entire page (no margins)
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }

      pdf.save(`Routeable-Brochure-${destination.replace(/\s+/g, '-')}.pdf`);
    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Failed to generate PDF.");
    } finally {
      setLoading(false);
    }
  };

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-logo-gradient">
        <header className="px-6 py-8 flex justify-between items-center max-w-7xl mx-auto">
          <button 
            onClick={() => setView('landing')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Logo className="h-16" />
          </button>
          
          <div className="flex items-center gap-6">
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-3 group"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-stone-900">{user.name}</p>
                    <p className="text-[10px] uppercase tracking-widest text-stone-400">Traveler</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-[#5A5A40] font-bold overflow-hidden group-hover:border-[#5A5A40] transition-colors">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      user.name.charAt(0)
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {showProfileDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-stone-100 py-2 z-[100]"
                    >
                      <button 
                        onClick={handleLogout}
                        className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <Lock className="w-4 h-4" /> Log Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button onClick={() => setView('auth')} className="px-6 py-2 bg-[#5A5A40] text-white rounded-full font-medium">
                Log In
              </button>
            )}
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-20 space-y-20">
          <section className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-7xl font-serif leading-tight text-stone-900">
                Travel planning, <br />
                <span className="italic">reimagined.</span>
              </h1>
              <p className="text-stone-500 text-xl font-light max-w-lg">
                Routeable is a boutique travel agency that uses cutting-edge AI to craft the perfect journey. From the cobblestone streets of Paris to the neon lights of Tokyo, we make sure every moment is unforgettable.
              </p>
              <button 
                onClick={() => setView(user ? 'app' : 'auth')}
                className="px-10 py-4 bg-[#5A5A40] text-white rounded-full text-lg font-medium flex items-center gap-2 hover:bg-[#4a4a34] transition-all"
              >
                Make your own Brochure <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <div className="relative h-[500px] overflow-hidden rounded-[40px] shadow-2xl">
              <AnimatePresence mode="wait">
                <motion.img 
                  key={heroIndex}
                  src={FAMOUS_PLACES[heroIndex]} 
                  alt="Famous Place" 
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 1 }}
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>
            </div>
          </section>

          <section className="space-y-8">
            <h2 className="text-3xl font-serif text-stone-800">Explore Destinations</h2>
            <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar">
              {WONDERS_IMAGES.map((src, i) => (
                <motion.div 
                  key={`${i}-${src}`} 
                  whileHover={{ scale: 1.05 }}
                  className="min-w-[400px] h-[250px] rounded-3xl overflow-hidden shadow-lg relative"
                >
                  <img 
                    key={src}
                    src={src} 
                    alt={`7 Wonders - ${["Great Wall", "Petra", "Colosseum", "Chichen Itza", "Machu Picchu", "Taj Mahal", "Christ the Redeemer"][i]}`} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-4 py-1 rounded-full text-white text-xs font-medium">
                    {["Great Wall", "Petra", "Colosseum", "Chichen Itza", "Machu Picchu", "Taj Mahal", "Christ the Redeemer"][i]}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (view === 'contact') {
    return (
      <div className="min-h-screen bg-logo-gradient relative">
        <button 
          onClick={() => setView('landing')}
          className="absolute top-8 right-8 text-stone-400 hover:text-[#5A5A40] flex items-center gap-2 font-medium transition-colors"
        >
          Back <ArrowRight className="w-4 h-4" />
        </button>
        <header className="px-6 py-8 flex justify-between items-center max-w-7xl mx-auto">
          <button 
            onClick={() => setView('landing')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Logo className="h-16" />
          </button>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-32 text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-8">
              <Mail className="w-10 h-10 text-[#5A5A40]" />
            </div>
            <h1 className="text-5xl font-serif text-stone-900">Get in Touch</h1>
            <p className="text-stone-500 text-xl font-light">
              Contact for any clarifications or suggestions
            </p>
            <div className="pt-8">
              <a 
                href="mailto:johntravelstheworld247@gmail.com"
                className="text-3xl font-serif text-[#5A5A40] hover:underline"
              >
                johntravelstheworld247@gmail.com
              </a>
            </div>
            <div className="pt-12">
              <button 
                onClick={() => setView('landing')}
                className="text-stone-400 hover:text-stone-600 flex items-center gap-2 mx-auto"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Home
              </button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-logo-gradient flex items-center justify-center p-6 relative">
        <button 
          onClick={() => setView('landing')}
          className="absolute top-8 right-8 text-stone-400 hover:text-[#5A5A40] flex items-center gap-2 font-medium transition-colors"
        >
          Back <ArrowRight className="w-4 h-4" />
        </button>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md border border-stone-100"
        >
          <div className="flex justify-center mb-8">
            <Logo className="h-20" />
          </div>
          <h2 className="text-3xl font-serif text-center mb-2">{isLogin ? 'Welcome Back' : 'Join Routeable'}</h2>
          <p className="text-stone-400 text-center mb-8 text-sm">Start your journey with us today.</p>
          
          <form onSubmit={handleAuth} className="space-y-6">
            {!isLogin && (
              <>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest text-stone-400 font-bold">Full Name</label>
                  <div className="flex items-center border-b border-stone-200 py-2">
                    <User className="w-4 h-4 text-stone-300 mr-3" />
                    <input 
                      type="text" required
                      className="w-full outline-none bg-transparent"
                      value={authData.name}
                      onChange={e => setAuthData({...authData, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest text-stone-400 font-bold">Date of Birth</label>
                  <div className="flex items-center border-b border-stone-200 py-2">
                    <Calendar className="w-4 h-4 text-stone-300 mr-3" />
                    <input 
                      type="date" required
                      className="w-full outline-none bg-transparent"
                      value={authData.dob}
                      onChange={e => setAuthData({...authData, dob: e.target.value})}
                    />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest text-stone-400 font-bold">Email or Phone</label>
              <div className="flex items-center border-b border-stone-200 py-2">
                <Mail className="w-4 h-4 text-stone-300 mr-3" />
                <input 
                  type="text" required
                  className="w-full outline-none bg-transparent"
                  value={authData.identifier}
                  onChange={e => setAuthData({...authData, identifier: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest text-stone-400 font-bold">Password</label>
              <div className="flex items-center border-b border-stone-200 py-2">
                <Lock className="w-4 h-4 text-stone-300 mr-3" />
                <input 
                  type="password" required
                  className="w-full outline-none bg-transparent"
                  value={authData.password}
                  onChange={e => setAuthData({...authData, password: e.target.value})}
                />
              </div>
            </div>

            {authError && <p className="text-red-500 text-xs text-center">{authError}</p>}

            {isLogin && (
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-stone-400">Maximum 3 attempts allowed</p>
              </div>
            )}

            <button className="w-full py-4 bg-[#5A5A40] text-white rounded-full font-medium shadow-lg hover:bg-[#4a4a34] transition-all">
              {isLogin ? 'Log In' : 'Sign Up'}
            </button>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-stone-400">Or continue with</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-4 bg-white border border-stone-200 text-stone-700 rounded-full font-medium shadow-sm hover:bg-stone-50 transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
          </form>

          <div className="mt-8 text-center space-y-4">
            {isLogin && (
              <button 
                onClick={() => setView('forgot-password')}
                className="text-stone-400 text-sm hover:text-[#5A5A40] transition-colors block w-full"
              >
                Forgot password?
              </button>
            )}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-stone-400 text-sm hover:text-[#5A5A40] transition-colors"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === 'forgot-password') {
    return (
      <div className="min-h-screen bg-logo-gradient flex items-center justify-center p-6 relative">
        <button 
          onClick={() => setView('auth')}
          className="absolute top-8 right-8 text-stone-400 hover:text-[#5A5A40] flex items-center gap-2 font-medium transition-colors"
        >
          Back <ArrowRight className="w-4 h-4" />
        </button>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md border border-stone-100"
        >
          <h2 className="text-3xl font-serif text-center mb-2">Forgot Password</h2>
          <p className="text-stone-400 text-center mb-8 text-sm">Enter your email or phone to receive an OTP.</p>
          
          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest text-stone-400 font-bold">Email or Phone</label>
              <div className="flex items-center border-b border-stone-200 py-2">
                <Mail className="w-4 h-4 text-stone-300 mr-3" />
                <input 
                  type="text" required
                  className="w-full outline-none bg-transparent"
                  value={authData.identifier}
                  onChange={e => setAuthData({...authData, identifier: e.target.value})}
                />
              </div>
            </div>

            {authError && <p className="text-red-500 text-xs text-center">{authError}</p>}

            <button className="w-full py-4 bg-[#5A5A40] text-white rounded-full font-medium shadow-lg hover:bg-[#4a4a34] transition-all">
              Send OTP
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (view === 'verify-otp') {
    return (
      <div className="min-h-screen bg-logo-gradient flex items-center justify-center p-6 relative">
        <button 
          onClick={() => setView('auth')}
          className="absolute top-8 right-8 text-stone-400 hover:text-[#5A5A40] flex items-center gap-2 font-medium transition-colors"
        >
          Back <ArrowRight className="w-4 h-4" />
        </button>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md border border-stone-100"
        >
          <h2 className="text-3xl font-serif text-center mb-2">Verify OTP</h2>
          <p className="text-stone-400 text-center mb-8 text-sm">Enter the 6-digit code sent to your email or phone. Valid for 5 minutes.</p>
          
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest text-stone-400 font-bold">OTP Code</label>
              <div className="flex items-center border-b border-stone-200 py-2">
                <Sparkles className="w-4 h-4 text-stone-300 mr-3" />
                <input 
                  type="text" required maxLength={6}
                  className="w-full outline-none bg-transparent tracking-[1em] text-center font-bold text-xl"
                  value={authData.otp}
                  onChange={e => setAuthData({...authData, otp: e.target.value})}
                />
              </div>
            </div>

            {authError && <p className="text-red-500 text-xs text-center">{authError}</p>}

            <button className="w-full py-4 bg-[#5A5A40] text-white rounded-full font-medium shadow-lg hover:bg-[#4a4a34] transition-all">
              Verify OTP
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (view === 'reset-password') {
    return (
      <div className="min-h-screen bg-logo-gradient flex items-center justify-center p-6 relative">
        <button 
          onClick={() => setView('auth')}
          className="absolute top-8 right-8 text-stone-400 hover:text-[#5A5A40] flex items-center gap-2 font-medium transition-colors"
        >
          Back <ArrowRight className="w-4 h-4" />
        </button>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md border border-stone-100"
        >
          <h2 className="text-3xl font-serif text-center mb-2">Reset Password</h2>
          <p className="text-stone-400 text-center mb-8 text-sm">Enter your new password below.</p>
          
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest text-stone-400 font-bold">New Password</label>
              <div className="flex items-center border-b border-stone-200 py-2">
                <Lock className="w-4 h-4 text-stone-300 mr-3" />
                <input 
                  type="password" required
                  className="w-full outline-none bg-transparent"
                  value={authData.password}
                  onChange={e => setAuthData({...authData, password: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest text-stone-400 font-bold">Confirm Password</label>
              <div className="flex items-center border-b border-stone-200 py-2">
                <Lock className="w-4 h-4 text-stone-300 mr-3" />
                <input 
                  type="password" required
                  className="w-full outline-none bg-transparent"
                  value={authData.confirmPassword}
                  onChange={e => setAuthData({...authData, confirmPassword: e.target.value})}
                />
              </div>
            </div>

            {authError && <p className="text-red-500 text-xs text-center">{authError}</p>}

            <button className="w-full py-4 bg-[#5A5A40] text-white rounded-full font-medium shadow-lg hover:bg-[#4a4a34] transition-all">
              Reset Password
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-logo-gradient selection:bg-olive-200 relative">
      {/* Notification Overlay */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-6"
          >
            <div className={cn(
              "p-4 rounded-2xl shadow-2xl border flex items-center gap-3",
              notification.type === 'error' ? "bg-red-50 border-red-100 text-red-800" : "bg-white border-stone-100 text-stone-800"
            )}>
              {notification.type === 'error' ? <Lock className="w-5 h-5 text-red-500" /> : <Mail className="w-5 h-5 text-[#5A5A40]" />}
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="px-6 py-8 flex justify-between items-start max-w-7xl mx-auto relative">
        <button 
          onClick={() => setView('landing')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity mt-2"
        >
          <Logo className="h-12" />
        </button>
        
        <div className="flex flex-col items-end gap-4">
          <button 
            onClick={handleBack}
            className="text-stone-400 hover:text-[#5A5A40] flex items-center gap-2 font-medium transition-colors"
          >
            Back <ArrowRight className="w-4 h-4" />
          </button>

          {user && (
            <div className="relative">
              <button 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-3 group"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-stone-900">{user.name}</p>
                  <p className="text-[10px] uppercase tracking-widest text-stone-400">Traveler</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-[#5A5A40] font-bold overflow-hidden group-hover:border-[#5A5A40] transition-colors">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    user.name.charAt(0)
                  )}
                </div>
              </button>

              <AnimatePresence>
                {showProfileDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-stone-100 py-2 z-[100]"
                  >
                    <button 
                      onClick={handleLogout}
                      className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <Lock className="w-4 h-4" /> Log Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-20">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12 pt-12"
            >
              <div className="space-y-4">
                <h1 className="text-6xl md:text-8xl font-serif font-light leading-tight text-stone-900">
                  Where will your <br />
                  <span className="italic">soul wander</span> next?
                </h1>
                <p className="text-stone-500 text-lg max-w-md font-light">
                  Routeable turns your travel dreams into beautifully crafted itineraries.
                </p>
              </div>

              <div className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="group relative" ref={countryInputRef}>
                    <label className="text-xs uppercase tracking-widest font-semibold text-stone-400 mb-2 block">Country</label>
                    <div className="flex items-center border-b-2 border-stone-200 focus-within:border-[#5A5A40] transition-all py-2">
                      <MapPin className="w-6 h-6 text-stone-300 mr-4" />
                      <input 
                        type="text" 
                        placeholder="e.g. Japan"
                        className="w-full bg-transparent text-3xl font-serif outline-none placeholder:text-stone-200"
                        value={country}
                        onFocus={() => setShowCountryDropdown(true)}
                        onChange={(e) => {
                          setCountry(e.target.value);
                          setDestinationError('');
                          setShowCountryDropdown(true);
                        }}
                      />
                    </div>
                    
                    <AnimatePresence>
                      {showCountryDropdown && filteredCountries.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute left-0 right-0 mt-2 max-h-64 overflow-y-auto bg-white rounded-2xl shadow-2xl border border-stone-100 z-[110] scrollbar-hide"
                        >
                          {filteredCountries.map((c) => (
                            <button
                              key={c}
                              onClick={() => {
                                setCountry(c);
                                setShowCountryDropdown(false);
                                setDestinationError('');
                              }}
                              className="w-full px-6 py-4 text-left hover:bg-stone-50 transition-colors flex items-center justify-between group/item"
                            >
                              <span className="text-lg font-serif text-stone-800 group-hover/item:text-[#5A5A40]">{c}</span>
                              <ArrowRight className="w-4 h-4 text-stone-200 opacity-0 group-hover/item:opacity-100 transition-all -translate-x-2 group-hover/item:translate-x-0" />
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="group relative">
                    <label className="text-xs uppercase tracking-widest font-semibold text-stone-400 mb-2 block">City (Optional)</label>
                    <div className="flex items-center border-b-2 border-stone-200 focus-within:border-[#5A5A40] transition-all py-2">
                      <MapPin className="w-6 h-6 text-stone-300 mr-4 opacity-50" />
                      <input 
                        type="text" 
                        placeholder="e.g. Kyoto"
                        className="w-full bg-transparent text-3xl font-serif outline-none placeholder:text-stone-200"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {destinationError && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-xs mt-2 font-medium"
                  >
                    {destinationError}
                  </motion.p>
                )}

                <div className="group relative">
                  <label className="text-xs uppercase tracking-widest font-semibold text-stone-400 mb-2 block">Duration (Days)</label>
                  <div className="flex items-center border-b-2 border-stone-200 focus-within:border-[#5A5A40] transition-all py-2">
                    <Calendar className="w-6 h-6 text-stone-300 mr-4" />
                    <input 
                      type="number" 
                      min="1"
                      max="30"
                      className="w-full bg-transparent text-3xl font-serif outline-none"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>

                <button 
                  disabled={!country || loading}
                  onClick={handleContinue}
                  className="w-full md:w-auto px-12 py-5 bg-[#5A5A40] text-white rounded-full font-medium flex items-center justify-center gap-2 hover:bg-[#4a4a34] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-olive-900/10"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      Continue <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12 pt-12"
            >
              <div className="space-y-4">
                <h2 className="text-5xl font-serif font-light text-stone-900">
                  Tell us your <span className="italic">must-sees</span>
                </h2>
                <p className="text-stone-500 text-lg max-w-md font-light">
                  Are there specific landmarks, restaurants, or hidden gems you can't miss?
                </p>
              </div>

              <div className="space-y-8">
                <div className="group relative">
                  <label className="text-xs uppercase tracking-widest font-semibold text-stone-400 mb-2 block">Specific Places</label>
                  <textarea 
                    placeholder="e.g. Fushimi Inari Shrine, a traditional tea ceremony, Gion district at night..."
                    className="w-full bg-transparent text-2xl font-serif outline-none border-b-2 border-stone-200 focus-within:border-[#5A5A40] transition-all py-4 min-h-[150px] resize-none placeholder:text-stone-200"
                    value={mustVisit}
                    onChange={(e) => {
                      setMustVisit(e.target.value);
                      setMustVisitError('');
                    }}
                  />
                  {mustVisitError && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-xs mt-2 font-medium"
                    >
                      {mustVisitError}
                    </motion.p>
                  )}
                </div>

                <button 
                  disabled={loading}
                  onClick={handleGenerate}
                  className="w-full md:w-auto px-12 py-5 bg-[#5A5A40] text-white rounded-full font-medium flex items-center justify-center gap-2 hover:bg-[#4a4a34] transition-all shadow-xl shadow-olive-900/10"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Crafting your brochure...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" /> Generate Brochure
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && brochure && (
            <motion.div
              key="step3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8 pt-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-serif font-medium text-stone-900">Your Custom Brochure</h2>
                  <p className="text-stone-500">Ready for your adventure in {brochure.destination}.</p>
                </div>
                <button 
                  disabled={loading}
                  onClick={downloadPDF}
                  className="px-6 py-3 bg-white border border-stone-200 rounded-full font-medium flex items-center gap-2 hover:bg-stone-50 transition-all shadow-sm disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> Download PDF
                    </>
                  )}
                </button>
              </div>

              {/* Brochure Preview */}
              <div 
                ref={brochureRef}
                id="brochure-content"
                className="bg-white p-12 md:p-20 shadow-2xl rounded-[40px] border border-stone-100 relative overflow-hidden"
              >
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-stone-50 rounded-full -mr-32 -mt-32 opacity-50" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-stone-50 rounded-full -ml-24 -mb-24 opacity-50" />

                <div className="relative z-10 space-y-12">
                  <div id="pdf-intro" className="space-y-12">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="text-xs uppercase tracking-[0.3em] font-bold text-[#5A5A40]">A Routeable Itinerary</div>
                        <h1 className="text-7xl font-serif font-bold text-stone-900">{brochure.destination}</h1>
                        <div className="flex items-center gap-4 text-stone-500 font-serif italic text-xl">
                          <span>{brochure.duration} Days of Discovery</span>
                          <span className="w-1.5 h-1.5 bg-stone-300 rounded-full" />
                          <span>Curated for You</span>
                        </div>
                      </div>
                      <div className="w-16 h-16 bg-[#5A5A40] rounded-full flex items-center justify-center text-white">
                        <Plane className="w-8 h-8" />
                      </div>
                    </div>

                    {/* Cover Image */}
                    <div className="w-full h-[750px] rounded-[48px] overflow-hidden shadow-2xl bg-stone-50 border border-stone-100 group relative">
                      <img 
                        src={`https://images.weserv.nl/?url=https://loremflickr.com/1600/1200/${encodeURIComponent(brochure.coverImageKeyword.replace(/\s+/g, ','))}/all`} 
                        alt={brochure.destination} 
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000 ease-out"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://picsum.photos/seed/${encodeURIComponent(brochure.destination)}/1600/1200`;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs uppercase tracking-widest font-bold text-stone-400">The Experience</h3>
                      <p className="text-2xl font-serif leading-relaxed text-stone-800 italic">
                        "{brochure.description}"
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-12">
                    <div className="md:col-span-2 space-y-8">
                      <div className="space-y-12">
                        <h3 className="text-xs uppercase tracking-widest font-bold text-stone-400">The Journey</h3>
                        {brochure.itinerary.map((day) => (
                          <div key={day.day} id={`pdf-day-${day.day}`} className="space-y-6 relative pl-8 border-l border-stone-100 break-inside-avoid py-8">
                            <div className="absolute -left-1.5 top-0 w-3 h-3 bg-[#5A5A40] rounded-full" />
                            <div className="space-y-4">
                              <span className="text-sm font-bold text-[#5A5A40] uppercase tracking-tighter">Day {day.day}</span>
                              <h4 className="text-3xl font-serif font-medium text-stone-900">{day.title}</h4>
                              <p className="text-stone-600 leading-relaxed font-light">
                                {day.description}
                              </p>
                            </div>
                            
                            <div className={`w-full ${day.day % 2 === 0 ? 'h-[700px]' : 'h-[600px]'} rounded-[40px] overflow-hidden shadow-xl bg-stone-50 border border-stone-50 group relative`}>
                              <img 
                                src={`https://images.weserv.nl/?url=https://loremflickr.com/1200/1000/${encodeURIComponent(day.imageKeyword.replace(/\s+/g, ','))}/all`} 
                                alt={day.title} 
                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                                referrerPolicy="no-referrer"
                                crossOrigin="anonymous"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = `https://picsum.photos/seed/${encodeURIComponent(day.imageKeyword)}/1200/1000`;
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            </div>

                            <div className="space-y-4">
                              <h5 className="text-xs uppercase tracking-widest font-bold text-stone-400">Activities</h5>
                              <ul className="space-y-3">
                                {day.activities.map((activity, i) => (
                                  <li key={i} className="flex items-start gap-3 text-stone-600 leading-relaxed">
                                    <span className="mt-2.5 w-1 h-1 bg-stone-300 rounded-full shrink-0" />
                                    {activity}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {day.ticketLink && (
                              <div className="pt-4">
                                <a 
                                  href={day.ticketLink.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-sm font-medium text-[#5A5A40] hover:underline"
                                >
                                  <Download className="w-4 h-4" /> Book Tickets: {day.ticketLink.name}
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div id="pdf-sidebar" className="space-y-12">
                      <div className="bg-stone-50 p-8 rounded-3xl space-y-6 break-inside-avoid">
                        <h3 className="text-xs uppercase tracking-widest font-bold text-stone-400">Traveler's Wisdom</h3>
                        <ul className="space-y-4">
                          {brochure.tips.map((tip, i) => (
                            <li key={i} className="text-sm text-stone-600 leading-relaxed italic">
                              "{tip}"
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-4 break-inside-avoid">
                        <h3 className="text-xs uppercase tracking-widest font-bold text-stone-400">Your Favorites</h3>
                        <p className="text-stone-600 text-sm leading-relaxed">
                          We've integrated your must-visit spots: <br />
                          <span className="font-serif italic text-lg text-stone-900">{brochure.mustVisit}</span>
                        </p>
                      </div>

                      <div className="space-y-6 break-inside-avoid">
                        <h3 className="text-xs uppercase tracking-widest font-bold text-stone-400">Booking Links</h3>
                        <div className="space-y-4">
                          {brochure.itinerary.filter(d => d.ticketLink).map((day, i) => (
                            <div key={i} className="p-4 bg-white border border-stone-100 rounded-2xl shadow-sm space-y-2">
                              <p className="text-xs font-bold text-stone-400 uppercase">Day {day.day}</p>
                              <p className="text-sm font-medium text-stone-800">{day.ticketLink?.name}</p>
                              <a 
                                href={day.ticketLink?.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#5A5A40] hover:underline flex items-center gap-1"
                              >
                                Official Site <ArrowRight className="w-3 h-3" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-12 border-t border-stone-100">
                        <Logo className="h-10" />
                        <p className="text-[10px] uppercase tracking-widest text-stone-400 mt-1">Crafting memories, one route at a time.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chatbox */}
              <div className="bg-white p-8 rounded-[40px] shadow-xl border border-stone-100 space-y-6">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-[#5A5A40]" />
                  <h3 className="text-xl font-serif font-medium">Ask Routeable AI</h3>
                </div>
                <p className="text-stone-500 text-sm">Want to change something? Add a day? Swap an activity? Just ask!</p>
                <form onSubmit={handleChat} className="flex gap-4">
                  <input 
                    type="text" 
                    placeholder="e.g. Can we add a day for shopping in Gion?"
                    className="flex-1 bg-stone-50 px-6 py-4 rounded-full outline-none focus:ring-2 ring-[#5A5A40]/20 transition-all"
                    value={chatMessage}
                    onChange={e => setChatMessage(e.target.value)}
                    disabled={chatLoading}
                  />
                  <button 
                    disabled={chatLoading || !chatMessage}
                    className="w-14 h-14 bg-[#5A5A40] text-white rounded-full flex items-center justify-center hover:bg-[#4a4a34] transition-all disabled:opacity-50"
                  >
                    {chatLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-stone-100 flex flex-col md:flex-row justify-between items-center gap-6 text-stone-400 text-sm">
        <p>© 2024 Routeable. All rights reserved.</p>
        <div className="flex gap-8">
          <button onClick={() => setView('landing')} className="hover:text-stone-600 transition-colors">Privacy</button>
          <button onClick={() => setView('landing')} className="hover:text-stone-600 transition-colors">Terms</button>
          <button onClick={() => setView('contact')} className="hover:text-stone-600 transition-colors">Contact</button>
        </div>
      </footer>
    </div>
  );
}
