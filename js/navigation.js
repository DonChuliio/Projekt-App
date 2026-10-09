import { showView, goToDashboard } from './router.js';

// Keep declared parent routes and module-specific Back handlers intact.
export function initNavigation() {
 document.querySelectorAll('.back-button').forEach(back => {
  if(back.dataset.navigationBound)return;
  back.dataset.navigationBound='true';
  if(!back.hasAttribute('data-document-navigation')&&!back.hasAttribute('data-imposter-navigation')) {
   if(back.dataset.viewBack)back.addEventListener('click',()=>showView(back.dataset.viewBack));
   else if(back.hasAttribute('data-back'))back.addEventListener('click',goToDashboard);
  }
  const home=document.createElement('button');home.type='button';home.className='home-button';home.textContent='Home';
  home.addEventListener('click',goToDashboard);back.insertAdjacentElement('afterend',home);
 });
}
