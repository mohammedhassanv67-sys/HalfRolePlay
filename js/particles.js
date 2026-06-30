// ============================================
// Stars & Particles - لكل الصفحات
// ============================================
function createParticles() {
    // Remove existing container
    const existing = document.getElementById('globalStars');
    if (existing) existing.remove();
    
    const container = document.createElement('div');
    container.className = 'stars-container';
    container.id = 'globalStars';
    
    // 100 regular stars
    for (let i = 0; i < 100; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 2.5 + 1;
        star.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            --duration: ${Math.random() * 4 + 3}s;
            --delay: ${Math.random() * 6}s;
            --opacity: ${Math.random() * 0.7 + 0.1};
        `;
        container.appendChild(star);
    }
    
    // 3 shooting stars
    for (let i = 0; i < 3; i++) {
        const star = document.createElement('div');
        star.className = 'shooting-star';
        star.style.cssText = `
            left: ${Math.random() * 70}%;
            top: ${Math.random() * 40}%;
            --speed: ${Math.random() * 5 + 4}s;
            --delay: ${Math.random() * 12 + 3}s;
            --angle: ${Math.random() * 40 + 25}deg;
        `;
        container.appendChild(star);
    }
    
    // 10 glowing particles
    for (let i = 0; i < 10; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        const size = Math.random() * 3 + 1.5;
        particle.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            --duration: ${Math.random() * 8 + 5}s;
            --delay: ${Math.random() * 10}s;
            --opacity: ${Math.random() * 0.2 + 0.05};
        `;
        container.appendChild(particle);
    }
    
    document.body.appendChild(container);
}

// Init on every page
document.addEventListener('DOMContentLoaded', function() {
    createParticles();
});