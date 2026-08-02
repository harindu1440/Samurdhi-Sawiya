document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap === 'undefined') {
    return;
  }

  // Set initial states to prevent flickering before animation starts
  gsap.set('.navbar', { y: -60, opacity: 0 });
  gsap.set('.brand img', { scale: 0.5, rotation: -20, opacity: 0 });
  gsap.set('.brand-text', { x: -20, opacity: 0 });
  gsap.set('.hero-kicker', { y: 30, opacity: 0 });
  gsap.set('.hero h1', { y: 50, opacity: 0, scale: 0.95 });
  gsap.set('.hero-subtitle', { y: 40, opacity: 0 });
  gsap.set('.cta-button', { scale: 0.8, opacity: 0 });
  gsap.set('.overview-card', { y: 60, opacity: 0 });

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // 1. Drop down the navbar
  tl.to('.navbar', {
    duration: 0.8,
    y: 0,
    opacity: 1,
    ease: 'back.out(1.2)'
  })
  
  // 2. Pop in the logo with a springy rotation
  .to('.brand img', {
    duration: 1.2,
    scale: 1,
    rotation: 0,
    opacity: 1,
    ease: 'elastic.out(1, 0.5)'
  }, '-=0.4')

  // 3. Slide in the brand text
  .to('.brand-text', {
    duration: 0.6,
    x: 0,
    opacity: 1,
    ease: 'power3.out'
  }, '-=0.9')

  // 4. Hero content cascades in
  .to('.hero-kicker', {
    duration: 0.7,
    y: 0,
    opacity: 1,
    ease: 'power2.out'
  }, '-=0.3')
  .to('.hero h1', {
    duration: 0.9,
    y: 0,
    scale: 1,
    opacity: 1,
    ease: 'back.out(1.4)'
  }, '-=0.5')
  .to('.hero-subtitle', {
    duration: 0.8,
    y: 0,
    opacity: 1,
    ease: 'power2.out'
  }, '-=0.6')

  // 5. Pop the CTA button dynamically
  .to('.cta-button', {
    duration: 1,
    scale: 1.05,
    opacity: 1,
    ease: 'elastic.out(1, 0.4)'
  }, '-=0.3')

  // 6. Stagger the overview cards at the bottom
  .to('.overview-card', {
    duration: 0.8,
    y: 0,
    opacity: 1,
    stagger: 0.15,
    ease: 'back.out(1.2)'
  }, '-=0.5');
  
  // Add an infinite subtle floating animation to the logo
  gsap.to('.brand img', {
    y: -4,
    duration: 2,
    repeat: -1,
    yoyo: true,
    ease: 'power1.inOut',
    delay: 1.5
  });

  // Add an infinite pulse to the CTA button glow
  gsap.to('.cta-button', {
    boxShadow: '0 0 50px rgba(47, 111, 237, 0.7)',
    duration: 1.5,
    repeat: -1,
    yoyo: true,
    ease: 'power1.inOut',
    delay: 1.5
  });
});