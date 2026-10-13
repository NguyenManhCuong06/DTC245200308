/**
 * Lumina Gallery - Modern Interactions
 * - Cinema Slideshow
 * - Dropzone Upload with live preview & validation
 * - Batch Download
 */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // 1. Cinema Fullscreen Slideshow
    // ----------------------------------------------------
    const cinemaModal = document.getElementById('cinemaSlideshowModal');
    if (cinemaModal) {
        const cinemaImage = document.getElementById('cinemaImage');
        const cinemaCounter = document.getElementById('cinemaCounter');
        const cinemaPhotoTitle = document.getElementById('cinemaPhotoTitle');
        const cinemaAlbumTitle = document.getElementById('cinemaAlbumTitle');
        const cinemaDownloadBtn = document.getElementById('cinemaDownloadBtn');
        const cinemaExitBtn = document.getElementById('cinemaExitBtn');
        const cinemaPrevBtn = document.getElementById('cinemaPrevBtn');
        const cinemaNextBtn = document.getElementById('cinemaNextBtn');
        const cinemaPlayPauseBtn = document.getElementById('cinemaPlayPauseBtn');
        const cinemaPlayText = document.getElementById('cinemaPlayText');
        const cinemaPlayIcon = document.getElementById('cinemaPlayIcon');

        let slides = [];
        let currentIndex = 0;
        let autoplayTimer = null;
        let isPlaying = false;

        function updateSlide(index) {
            if (!slides.length) return;
            currentIndex = (index + slides.length) % slides.length;
            const current = slides[currentIndex];
            cinemaImage.src = current.src;
            cinemaImage.alt = current.title || 'Slide photo';
            cinemaCounter.textContent = `${currentIndex + 1} / ${slides.length}`;
            if (cinemaPhotoTitle) cinemaPhotoTitle.textContent = current.title ? `— ${current.title}` : '';
            if (cinemaDownloadBtn) cinemaDownloadBtn.href = current.downloadUrl || current.src;
        }

        function openCinema(startIndex = 0, albumName = 'Trình chiếu') {
            const triggerElements = document.querySelectorAll('[data-cinema-slide]');
            slides = Array.from(triggerElements).map(el => ({
                src: el.getAttribute('data-cinema-slide') || el.getAttribute('data-full') || el.src,
                title: el.getAttribute('data-cinema-title') || el.getAttribute('aria-label') || el.alt || '',
                downloadUrl: el.getAttribute('data-cinema-download') || el.getAttribute('data-full') || el.src
            }));

            if (!slides.length) return;
            if (cinemaAlbumTitle) cinemaAlbumTitle.textContent = albumName;
            currentIndex = startIndex;
            updateSlide(currentIndex);
            cinemaModal.classList.add('active');
            cinemaModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }

        function closeCinema() {
            stopAutoplay();
            cinemaModal.classList.remove('active');
            cinemaModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        function nextSlide() { updateSlide(currentIndex + 1); }
        function prevSlide() { updateSlide(currentIndex - 1); }

        function toggleAutoplay() {
            if (isPlaying) {
                stopAutoplay();
            } else {
                startAutoplay();
            }
        }

        function startAutoplay() {
            isPlaying = true;
            if (cinemaPlayText) cinemaPlayText.textContent = 'Tạm dừng';
            autoplayTimer = setInterval(nextSlide, 3500);
        }

        function stopAutoplay() {
            isPlaying = false;
            if (cinemaPlayText) cinemaPlayText.textContent = 'Tự động chạy';
            if (autoplayTimer) {
                clearInterval(autoplayTimer);
                autoplayTimer = null;
            }
        }

        // Attach events
        cinemaExitBtn?.addEventListener('click', closeCinema);
        cinemaNextBtn?.addEventListener('click', nextSlide);
        cinemaPrevBtn?.addEventListener('click', prevSlide);
        cinemaPlayPauseBtn?.addEventListener('click', toggleAutoplay);

        // Global trigger buttons
        document.querySelectorAll('[data-start-slideshow]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const albumTitle = btn.getAttribute('data-album-title') || 'Album Gallery';
                openCinema(0, albumTitle);
            });
        });

        // Click on individual photo to open cinema at that index
        document.querySelectorAll('[data-cinema-slide]').forEach((el, idx) => {
            el.addEventListener('click', (e) => {
                // If inside a link, prevent default navigation if data-cinema-trigger is set
                if (el.dataset.cinemaTrigger === 'true') {
                    e.preventDefault();
                    const albumTitle = el.dataset.albumTitle || 'Thư viện ảnh';
                    openCinema(idx, albumTitle);
                }
            });
        });

        // Keyboard navigation
        window.addEventListener('keydown', (e) => {
            if (!cinemaModal.classList.contains('active')) return;
            if (e.key === 'Escape') closeCinema();
            if (e.key === 'ArrowRight') nextSlide();
            if (e.key === 'ArrowLeft') prevSlide();
            if (e.key === ' ') {
                e.preventDefault();
                toggleAutoplay();
            }
        });
    }

    // ----------------------------------------------------
    // 2. Drag & Drop Upload Zone + Multi-file Previews
    // ----------------------------------------------------
    const dropzone = document.getElementById('uploadDropzone');
    const fileInput = document.getElementById('photos');
    const previewsContainer = document.getElementById('image-previews');
    const uploadStatus = document.getElementById('upload-status');
    const submitBtn = document.getElementById('upload-submit');

    if (fileInput && previewsContainer) {
        function handleFiles(files) {
            previewsContainer.innerHTML = '';
            const fileList = Array.from(files || []);

            if (fileList.length === 0) {
                if (uploadStatus) uploadStatus.textContent = 'Chọn hoặc kéo thả tối đa 10 ảnh (JPEG, PNG, WebP; tối đa 10 MB/ảnh).';
                if (submitBtn) submitBtn.disabled = false;
                return;
            }

            let hasOversized = false;
            let invalidFormat = false;
            const validMimes = ['image/jpeg', 'image/png', 'image/webp'];

            fileList.forEach(file => {
                const isOver = file.size > 10 * 1024 * 1024;
                const isMimeOk = validMimes.includes(file.type);
                if (isOver) hasOversized = true;
                if (!isMimeOk) invalidFormat = true;

                const card = document.createElement('div');
                card.className = 'image-preview-card';
                if (isOver || !isMimeOk) {
                    card.style.borderColor = '#ef4444';
                }

                const img = document.createElement('img');
                img.alt = file.name;
                img.src = URL.createObjectURL(file);

                const badge = document.createElement('div');
                badge.className = 'file-size-badge';
                const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
                badge.textContent = `${sizeMb} MB`;
                if (isOver) badge.style.color = '#ef4444';

                card.appendChild(img);
                card.appendChild(badge);
                previewsContainer.appendChild(card);
            });

            if (fileList.length > 10) {
                if (uploadStatus) uploadStatus.innerHTML = '<span class="text-danger">Tối đa 10 ảnh trong một lần tải lên.</span>';
                if (submitBtn) submitBtn.disabled = true;
            } else if (hasOversized) {
                if (uploadStatus) uploadStatus.innerHTML = '<span class="text-danger">Một hoặc nhiều file vượt quá giới hạn 10 MB.</span>';
                if (submitBtn) submitBtn.disabled = true;
            } else if (invalidFormat) {
                if (uploadStatus) uploadStatus.innerHTML = '<span class="text-danger">Định dạng không hợp lệ. Chỉ chấp nhận JPEG, PNG hoặc WebP.</span>';
                if (submitBtn) submitBtn.disabled = true;
            } else {
                if (uploadStatus) uploadStatus.innerHTML = `<span class="text-success">✓ Đã chọn ${fileList.length} ảnh hợp lệ.</span>`;
                if (submitBtn) submitBtn.disabled = false;
            }
        }

        fileInput.addEventListener('change', () => handleFiles(fileInput.files));

        if (dropzone) {
            ['dragenter', 'dragover'].forEach(evt => {
                dropzone.addEventListener(evt, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropzone.classList.add('dragover');
                });
            });

            ['dragleave', 'drop'].forEach(evt => {
                dropzone.addEventListener(evt, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropzone.classList.remove('dragover');
                });
            });

            dropzone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                if (dt.files && dt.files.length) {
                    fileInput.files = dt.files;
                    handleFiles(dt.files);
                }
            });

            dropzone.addEventListener('click', () => {
                fileInput.click();
            });
        }

        fileInput.form?.addEventListener('submit', () => {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Đang xử lý tải lên...';
            }
        });
    }

    // ----------------------------------------------------
    // 3. Batch Download Photos
    // ----------------------------------------------------
    const batchDownloadBtn = document.getElementById('batchDownloadBtn');
    if (batchDownloadBtn) {
        batchDownloadBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const photos = document.querySelectorAll('[data-download-url]');
            if (!photos.length) {
                alert('Không có ảnh nào để tải xuống.');
                return;
            }

            const confirmed = confirm(`Bạn có chắc muốn tải xuống ${photos.length} ảnh trong album này?`);
            if (!confirmed) return;

            batchDownloadBtn.disabled = true;
            const originalText = batchDownloadBtn.innerHTML;
            batchDownloadBtn.innerHTML = 'Đang bắt đầu tải...';

            let count = 0;
            for (const item of photos) {
                const url = item.getAttribute('data-download-url');
                const filename = item.getAttribute('data-filename') || `photo-${count + 1}`;
                if (url) {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    count++;
                    // Small delay to prevent browser download throttling
                    await new Promise(r => setTimeout(r, 600));
                }
            }

            batchDownloadBtn.disabled = false;
            batchDownloadBtn.innerHTML = originalText;
        });
    }
});
