/* Scroll suave en anclas */
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', e=>{
    const id = a.getAttribute('href');
    if(id.length>1){
      e.preventDefault();
      document.querySelector(id)?.scrollIntoView({behavior:'smooth', block:'start'});
      history.pushState(null,'',id);
    }
  });
});

/* Scrollspy: resalta el link activo según sección visible */
const sections = [...document.querySelectorAll('section[id^="semana"]')];
const navLinks = [...document.querySelectorAll('nav a')];

const io = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      const activeId = '#'+entry.target.id;
      navLinks.forEach(l=>l.classList.toggle('active', l.getAttribute('href')===activeId));
    }
  });
},{rootMargin:'-40% 0px -55% 0px', threshold:0});

sections.forEach(s=>io.observe(s));

/* Anima las progress bars al entrar en viewport */
const fills = document.querySelectorAll('.progress-fill');
const io2 = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.style.transform='scaleX(1)';
      // ya tienen width definida en el HTML (25/50/75/100), solo forzamos reflujo para animación
      e.target.style.transition='width .6s ease';
    }
  });
},{threshold:0.2});
fills.forEach(f=>io2.observe(f));

/* Botón back-to-top visible a partir de cierto scroll (por si querés ocultarlo al inicio) */
const backTop = document.querySelector('.backtop');
if(backTop){
  const toggleBackTop = ()=> backTop.style.display = (window.scrollY>300?'inline-block':'none');
  toggleBackTop();
  window.addEventListener('scroll', toggleBackTop);
}
