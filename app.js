(() => {
  const stages = [...document.querySelectorAll('.demo-stage')];
  const progress = document.getElementById('demoProgress');
  let stage = 0;
  let timer;

  function showStage(index) {
    stage = index % stages.length;
    stages.forEach((el, i) => el.classList.toggle('active', i === stage));
    if (progress) {
      progress.style.transition = 'none';
      progress.style.width = '0';
      requestAnimationFrame(() => {
        progress.style.transition = 'width 2.7s linear';
        progress.style.width = '100%';
      });
    }
  }

  function startDemo() {
    showStage(stage);
    clearInterval(timer);
    timer = setInterval(() => {
      showStage(stage + 1);
    }, 3000);
  }

  startDemo();

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    }
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

  const toggle = document.getElementById('langToggle');
  const preferred = localStorage.getItem('proof-lang') ||
    (navigator.language && navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en');
  let lang = preferred === 'ru' ? 'ru' : 'en';

  function applyLanguage() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-en][data-ru]').forEach((el) => {
      el.textContent = el.dataset[lang];
    });
    if (toggle) toggle.textContent = lang === 'en' ? 'RU' : 'EN';
    localStorage.setItem('proof-lang', lang);
  }

  applyLanguage();

  toggle?.addEventListener('click', () => {
    lang = lang === 'en' ? 'ru' : 'en';
    applyLanguage();
  });

  document.querySelectorAll('.copy-button').forEach((button) => {
    button.addEventListener('click', async () => {
      const text = button.dataset.copy || '';
      try {
        await navigator.clipboard.writeText(text);
        const old = button.textContent;
        button.textContent = lang === 'ru' ? 'Скопировано ✓' : 'Copied ✓';
        setTimeout(() => { button.textContent = old; }, 1400);
      } catch {
        button.textContent = lang === 'ru' ? 'Выделите команду' : 'Select command';
      }
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
