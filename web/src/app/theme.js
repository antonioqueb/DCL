// Tema claro u oscuro: preferencia guardada o la del sistema. Se aplica antes de pintar.
const saved = localStorage.getItem('dcl.tema');
const dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.classList.toggle('dark', dark);
