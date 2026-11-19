document.querySelectorAll('button[aria-controls]').forEach(button => {
  const detail = document.getElementById(button.getAttribute('aria-controls'));
  const name = button.closest('tr').querySelector('.creative-name').textContent;
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') === 'false';
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', `${open ? 'Hide' : 'Show'} details for ${name}`);
    button.querySelector('.toggle-label').textContent = open ? 'Hide' : 'Details';
    detail.hidden = !open;
  });
});
