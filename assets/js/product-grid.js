/* ── Filter buttons ── */
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
    });
});

/* ── Product card video preview ──
   1. On mouseenter → start 400ms delay
   2. After delay → load video (if not loaded), seek to data-video-start, play
   3. On timeupdate → when currentTime >= data-video-end, loop back to data-video-start
   4. On mouseleave → cancel delay, pause video, crossfade back to image
*/
document.querySelectorAll('.product-card').forEach(card => {
    const video = card.querySelector('.card-video');
    const src   = card.dataset.videoSrc;
    const start = parseFloat(card.dataset.videoStart) || 0;
    const end   = parseFloat(card.dataset.videoEnd)   || 10;

    let hoverTimer = null;
    let loaded     = false;

    function loopSegment() {
        if (video.currentTime >= end || video.currentTime < start) {
            video.currentTime = start;
        }
    }

    function startPreview() {
        card.classList.add('is-playing');

        if (!loaded) {
            video.src = src;
            video.load();
            loaded = true;
            video.addEventListener('canplay', () => {
                video.currentTime = start;
                video.play().catch(() => {});
            }, { once: true });
        } else {
            video.currentTime = start;
            video.play().catch(() => {});
        }

        video.addEventListener('timeupdate', loopSegment);
    }

    function stopPreview() {
        clearTimeout(hoverTimer);
        card.classList.remove('is-playing');
        video.pause();
        video.removeEventListener('timeupdate', loopSegment);
    }

    card.addEventListener('mouseenter', () => { hoverTimer = setTimeout(startPreview, 400); });
    card.addEventListener('mouseleave', stopPreview);
});

/* ── Load More ── */
(function() {
    var BATCH = 8;
    var cards = Array.from(document.querySelectorAll('.product-card'));
    var btn   = document.getElementById('loadMoreBtn');
    var shown = 0;

    function showNext() {
        var limit = Math.min(shown + BATCH, cards.length);
        for (var i = shown; i < limit; i++) { cards[i].style.display = ''; }
        shown = limit;
        if (btn && shown >= cards.length) btn.style.display = 'none';
    }

    cards.forEach(function(c) { c.style.display = 'none'; });
    showNext();
    if (btn) btn.addEventListener('click', showNext);
})();
