document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap === 'undefined') {
    return;
  }

  gsap.from('.navbar', {
    duration: 0.9,
    y: -42,
    opacity: 0,
    ease: 'power3.out'
  });

  gsap.from('.hero-kicker', {
    duration: 0.7,
    y: 28,
    opacity: 0,
    delay: 0.15,
    ease: 'power3.out'
  });

  gsap.from('.hero h1', {
    duration: 0.9,
    y: 44,
    opacity: 0,
    delay: 0.35,
    ease: 'power3.out'
  });

  gsap.from('.hero-subtitle', {
    duration: 0.8,
    y: 32,
    opacity: 0,
    delay: 0.55,
    ease: 'power3.out'
  });

  gsap.from('.cta-button', {
    duration: 0.75,
    y: 24,
    opacity: 0,
    delay: 0.75,
    ease: 'power3.out'
  });
});