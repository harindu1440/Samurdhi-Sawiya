document.addEventListener('DOMContentLoaded', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Initialize Lenis Smooth Scrolling
  // ─────────────────────────────────────────────────────────────────────────────
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
    direction: 'vertical', 
    gestureDirection: 'vertical', 
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Sync GSAP ScrollTrigger with Lenis
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    
    // Update ScrollTrigger on Lenis scroll
    lenis.on('scroll', ScrollTrigger.update);
    
    gsap.ticker.add((time)=>{
      lenis.raf(time * 1000);
    });
    
    gsap.ticker.lagSmoothing(0);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Mouse Spotlight & Parallax Effects
  // ─────────────────────────────────────────────────────────────────────────────
  const spotlight = document.getElementById('mouse-spotlight');
  const widgets = document.querySelectorAll('.floating-widget');
  
  document.addEventListener('mousemove', (e) => {
    // Spotlight
    if (spotlight) {
      gsap.to(spotlight, {
        x: e.clientX,
        y: e.clientY,
        opacity: 1,
        duration: 0.5,
        ease: 'power2.out'
      });
    }

    // Micro Parallax on Widgets
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;

    widgets.forEach((widget, index) => {
      const depth = (index + 1) * 0.5;
      gsap.to(widget, {
        x: x * depth,
        y: y * depth,
        duration: 1,
        ease: 'power2.out'
      });
    });
  });

  document.addEventListener('mouseleave', () => {
    if (spotlight) gsap.to(spotlight, { opacity: 0, duration: 0.5 });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Navbar Scroll Shrink Effect
  // ─────────────────────────────────────────────────────────────────────────────
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Initial Entrance Timeline
  // ─────────────────────────────────────────────────────────────────────────────
  if (typeof gsap !== 'undefined') {
    // Initial Sets
    gsap.set('.navbar', { y: -100, opacity: 0 });
    gsap.set('.title-line', { y: 60, opacity: 0, rotationX: -20, transformOrigin: "0% 50% -50" });
    gsap.set('.hero-desc', { opacity: 0, y: 20 });
    gsap.set('.hero-buttons a', { opacity: 0, scale: 0.8 });
    gsap.set('.trust-badge', { opacity: 0, x: -20 });
    gsap.set('.dashboard-mockup', { scale: 0.8, opacity: 0, rotationY: 20 });
    gsap.set('.floating-widget', { opacity: 0, scale: 0.5, z: -100 });
    gsap.set('.bg-floating-logo', { scale: 4, opacity: 0, rotation: -15 });

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

    // Background Logo Watermark
    tl.to('.bg-floating-logo', {
      duration: 3,
      scale: 1,
      opacity: 0.03,
      rotation: 0,
      ease: 'power3.out'
    }, 0)

    // Navbar
    .to('.navbar', { duration: 1, y: 0, opacity: 1 }, 0.2)
    
    // Trust Badge
    .to('.trust-badge', { duration: 0.8, opacity: 1, x: 0 }, 0.4)

    // 3D Split Typography Reveal
    .to('.title-line', {
      duration: 1.2,
      y: 0,
      opacity: 1,
      rotationX: 0,
      stagger: 0.15,
      ease: 'back.out(1.2)'
    }, 0.5)

    // Description
    .to('.hero-desc', { duration: 1, opacity: 1, y: 0 }, 1)

    // Buttons
    .to('.hero-buttons a', {
      duration: 0.8,
      opacity: 1,
      scale: 1,
      stagger: 0.1,
      ease: 'back.out(1.5)'
    }, 1.1)

    // Dashboard Entrance
    .to('.dashboard-mockup', {
      duration: 1.5,
      scale: 1,
      opacity: 1,
      rotationY: -10,
      ease: 'power3.out'
    }, 0.6)

    // Floating Glass Widgets Pop-In
    .to('.floating-widget', {
      duration: 1,
      opacity: 1,
      scale: 1,
      z: 0,
      stagger: 0.15,
      ease: 'elastic.out(1, 0.5)'
    }, 1.2);

    // Continuous Floating Animation for Dashboard
    gsap.to('.dashboard-mockup', {
      y: -15,
      rotationX: 8,
      duration: 4,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: 2
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. ScrollTrigger Animations
  // ─────────────────────────────────────────────────────────────────────────────
  if (typeof ScrollTrigger !== 'undefined') {
    
    // Statistics Counters
    const counters = document.querySelectorAll('.counter');
    ScrollTrigger.create({
      trigger: '.stats-section',
      start: 'top 80%',
      once: true,
      onEnter: () => {
        counters.forEach(counter => {
          const target = +counter.getAttribute('data-target');
          gsap.to(counter, {
            innerHTML: target,
            duration: 2.5,
            ease: 'power2.out',
            snap: { innerHTML: 1 },
            onUpdate: function() {
              counter.innerHTML = Math.round(this.targets()[0].innerHTML);
            }
          });
        });
      }
    });

    // Features Cards (Staggered Fade Up with Blur to Clear)
    gsap.from('.feature-card', {
      scrollTrigger: {
        trigger: '.features-grid',
        start: 'top 85%',
      },
      duration: 0.8,
      y: 100,
      opacity: 0,
      filter: 'blur(10px)',
      stagger: 0.15,
      ease: 'back.out(1.2)'
    });

    // Security Section Visual (Slide Left)
    gsap.from('.security-visual', {
      scrollTrigger: {
        trigger: '.security-section',
        start: 'top 80%',
      },
      duration: 1.2,
      x: -100,
      opacity: 0,
      ease: 'power3.out'
    });

    // Security Section Content (Slide Right)
    gsap.from('.security-content', {
      scrollTrigger: {
        trigger: '.security-section',
        start: 'top 80%',
      },
      duration: 1.2,
      x: 100,
      opacity: 0,
      ease: 'power3.out'
    });

    // CTA Panel (Zoom / Scale Up)
    gsap.from('.cta-glass-panel', {
      scrollTrigger: {
        trigger: '.cta-section',
        start: 'top 85%',
      },
      duration: 1,
      scale: 0.9,
      y: 50,
      opacity: 0,
      ease: 'expo.out'
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Magnetic Button Hover Effect
  // ─────────────────────────────────────────────────────────────────────────────
  const magneticButtons = document.querySelectorAll('.magnetic-btn');
  
  magneticButtons.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const h = rect.width / 2;
      const x = e.clientX - rect.left - h;
      const y = e.clientY - rect.top - rect.height / 2;
      
      gsap.to(btn, {
        x: x * 0.3,
        y: y * 0.3,
        duration: 0.4,
        ease: 'power2.out'
      });
      
      // Move children slightly more for parallax
      const children = btn.querySelectorAll('span, i');
      gsap.to(children, {
        x: x * 0.15,
        y: y * 0.15,
        duration: 0.4,
        ease: 'power2.out'
      });
    });

    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.3)' });
      const children = btn.querySelectorAll('span, i');
      gsap.to(children, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.3)' });
    });
  });

});