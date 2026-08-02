document.addEventListener('DOMContentLoaded', () => {
  // Only run GSAP if it's loaded
  if (typeof gsap === 'undefined') return;

  // 1. Initial State Sets
  gsap.set('.title-line', { y: 40, opacity: 0, rotationX: -20, transformOrigin: "0% 50% -50" });
  gsap.set('.hero-desc', { opacity: 0, y: 20 });
  gsap.set('.auth-badge', { opacity: 0, x: -20 });
  gsap.set('.point-item', { opacity: 0, x: -20 });
  gsap.set('.auth-card', { autoAlpha: 0, x: 40, scale: 0.95 });
  gsap.set('.floating-widget', { opacity: 0, scale: 0.5, rotation: -10 });
  gsap.set('.bg-floating-logo', { scale: 4, opacity: 0, rotation: -15 });
  gsap.set('.auth-logo img', { opacity: 0, scale: 0.5, rotation: -15 });

  // 2. Entrance Timeline
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

  tl.to('.auth-card', {
    autoAlpha: 1, // handles visibility: hidden -> visible
    x: 0,
    scale: 1,
    duration: 1.5,
    ease: 'power3.out'
  })
  .to('.bg-floating-logo', {
    scale: 1,
    opacity: 0.03, // matching the subtle background opacity from index
    rotation: 0,
    duration: 2.5
  }, "-=1.2")
  .to('.auth-badge', {
    opacity: 1,
    x: 0,
    duration: 1
  }, "-=2")
  .to('.title-line', {
    y: 0,
    opacity: 1,
    rotationX: 0,
    duration: 1.2,
    stagger: 0.15
  }, "-=1.8")
  .to('.hero-desc', {
    opacity: 1,
    y: 0,
    duration: 1
  }, "-=1")
  .to('.point-item', {
    opacity: 1,
    x: 0,
    duration: 0.8,
    stagger: 0.1
  }, "-=0.8")
  .to('.auth-logo img', {
    opacity: 1,
    scale: 1,
    rotation: 0,
    duration: 1.2,
    ease: 'elastic.out(1, 0.5)'
  }, "-=1.5")
  .to('.floating-widget', {
    opacity: 1,
    scale: 1,
    rotation: 0,
    duration: 1.5,
    stagger: 0.2,
    ease: 'back.out(1.5)'
  }, "-=1");

  // 3. Mouse Spotlight & Parallax Effects
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
    const x = (e.clientX / window.innerWidth - 0.5) * 30;
    const y = (e.clientY / window.innerHeight - 0.5) * 30;

    widgets.forEach((widget, index) => {
      const depth = (index + 1) * 0.8;
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

  // 4. Magnetic Button Logic
  const magneticButtons = document.querySelectorAll('.magnetic-btn');
  magneticButtons.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * 0.3;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.3;
      gsap.to(btn, { x: x, y: y, duration: 0.4, ease: 'power2.out' });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.3)' });
    });
  });
});
