document.addEventListener('DOMContentLoaded', () => {
  const lightbox = document.querySelector('#photo-lightbox');
  if (lightbox) {
    const image = lightbox.querySelector('img');
    lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
    document.querySelectorAll('.lightbox-trigger').forEach(button => {
      button.addEventListener('click', () => {
        image.src = button.dataset.full;
        image.alt = button.getAttribute('aria-label') || 'Full-size photo';
        lightbox.showModal();
      });
    });
    lightbox.addEventListener('click', event => {
      if (event.target === lightbox) lightbox.close();
    });
  }

  const input = document.querySelector('#photos');
  if (input) {
    const status = document.querySelector('#upload-status');
    const previews = document.querySelector('#image-previews');
    const submit = document.querySelector('#upload-submit');
    input.addEventListener('change', () => {
      previews.replaceChildren();
      const files = Array.from(input.files || []);
      const invalid = files.some(file => file.size > 10 * 1024 * 1024);
      status.textContent = invalid
        ? 'One or more files exceed the 10 MB limit.'
        : `${files.length} image(s) selected.`;
      submit.disabled = invalid || files.length > 10;
      files.filter(file => file.type.startsWith('image/')).forEach(file => {
        const image = document.createElement('img');
        image.alt = file.name;
        image.src = URL.createObjectURL(file);
        previews.append(image);
      });
    });
    input.form.addEventListener('submit', () => {
      submit.disabled = true;
      submit.textContent = 'Uploading…';
      status.textContent = 'Upload in progress. Please wait.';
    });
  }
});
