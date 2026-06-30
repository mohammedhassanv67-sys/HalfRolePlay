// ============================================
// Hero Section - Stars & Particles
// ============================================
function createStars() {
    const container = document.querySelector('.stars-container');
    if (!container) return;
    
    for (let i = 0; i < 100; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 3 + 1;
        star.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--duration:${Math.random()*3+2}s;--delay:${Math.random()*5}s;--opacity:${Math.random()*0.8+0.2};`;
        container.appendChild(star);
    }
    
    for (let i = 0; i < 5; i++) {
        const star = document.createElement('div');
        star.className = 'shooting-star';
        star.style.cssText = `left:${Math.random()*80}%;top:${Math.random()*50}%;--speed:${Math.random()*4+3}s;--delay:${Math.random()*10}s;--angle:${Math.random()*30+30}deg;`;
        container.appendChild(star);
    }
    
    for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `width:${Math.random()*4+2}px;height:${Math.random()*4+2}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--duration:${Math.random()*6+4}s;--delay:${Math.random()*8}s;--opacity:${Math.random()*0.3+0.1};`;
        container.appendChild(particle);
    }
}

function setupHeroParallax() {
    const hero = document.querySelector('.hero');
    const bgImage = document.querySelector('.hero-bg-image');
    const starsContainer = document.querySelector('.stars-container');
    if (!hero || !bgImage) return;
    
    hero.addEventListener('mousemove', function(e) {
        const rect = hero.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        bgImage.style.transform = `translate(${x*20}px, ${y*20}px) scale(1.05)`;
        if (starsContainer) starsContainer.style.transform = `translate(${x*40}px, ${y*40}px)`;
    });
    
    hero.addEventListener('mouseleave', function() {
        bgImage.style.transform = 'translate(0, 0) scale(1)';
        if (starsContainer) starsContainer.style.transform = 'translate(0, 0)';
    });
}

document.addEventListener('DOMContentLoaded', function() {
    createStars();
    setupHeroParallax();
});