/* ── Filter buttons ── */
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
    });
});

/* ── Product card video preview ──
   Sources tried in order: data-video-local → data-video-drive
   If both absent the card stays image-only.
   To use local only:  set data-video-local, omit data-video-drive
   To use drive only:  set data-video-drive, omit data-video-local
   To disable video:   omit both attributes
*/
document.querySelectorAll('.product-card').forEach(card => {
    const video   = card.querySelector('.card-video');
    const sources = [card.dataset.videoLocal, card.dataset.videoDrive].filter(Boolean);
    const start   = parseFloat(card.dataset.videoStart) || 0;
    const end     = parseFloat(card.dataset.videoEnd)   || 10;

    if (!sources.length) return;

    let hoverTimer = null;
    let srcIndex   = 0;
    let loaded     = false;
    let failed     = false;

    function loopSegment() {
        if (video.currentTime >= end || video.currentTime < start) {
            video.currentTime = start;
        }
    }

    function loadSource() {
        video.src = sources[srcIndex++];
        video.load();
        video.addEventListener('canplay', () => {
            video.currentTime = start;
            video.play().catch(() => {});
        }, { once: true });
    }

    function startPreview() {
        if (failed) return;
        card.classList.add('is-playing');
        if (!loaded) {
            loaded = true;
            loadSource();
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

    video.addEventListener('error', () => {
        if (!loaded || failed) return;
        if (srcIndex >= sources.length) {
            failed = true;
            card.classList.remove('is-playing');
            return;
        }
        loadSource();
    });

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
