/* ═══════════════════════════════════════════════════════════
   PAGE CONFIG — set window.PRODUCT_DESCRIPTION and window.voiceConfig
   in an inline <script> before loading this file.
═══════════════════════════════════════════════════════════ */
var PRODUCT_DESCRIPTION = window.PRODUCT_DESCRIPTION || { text: "" };
var TTS_TEXT   = (PRODUCT_DESCRIPTION.text || "").trim();
var voiceConfig = window.voiceConfig || { lang: "id-ID", rate: 1.2, speechSpeed: 1.7 };

/* ═══════════════════════════════════════════════════════════
   IMAGE CAROUSEL
═══════════════════════════════════════════════════════════ */
var carouselTrack   = document.getElementById("carouselTrack");
var carouselPrev    = document.getElementById("carouselPrev");
var carouselNext    = document.getElementById("carouselNext");
var carouselCounter = document.getElementById("carouselCounter");
var carouselThumbs  = document.querySelectorAll(".carousel-thumb");
var carouselSlides  = document.querySelectorAll(".carousel-slide");
var carouselIndex   = 0;

function updateCarousel() {
    if (!carouselTrack || !carouselSlides.length) return;
    carouselTrack.style.transform = "translateX(" + (-carouselIndex * 100) + "%)";
    carouselCounter.textContent = (carouselIndex + 1) + " / " + carouselSlides.length;
    carouselThumbs.forEach(function(thumb, i) {
        thumb.classList.toggle("is-active", i === carouselIndex);
    });
}

function goCarousel(step) {
    carouselIndex = (carouselIndex + step + carouselSlides.length) % carouselSlides.length;
    updateCarousel();
    startCarouselAutoPlay();
}

if (carouselPrev && carouselNext) {
    carouselPrev.addEventListener("click", function() { goCarousel(-1); });
    carouselNext.addEventListener("click", function() { goCarousel(1); });
}

carouselThumbs.forEach(function(thumb) {
    thumb.addEventListener("click", function() {
        carouselIndex = Number(thumb.dataset.carouselIndex);
        updateCarousel();
        startCarouselAutoPlay();
    });
});

updateCarousel();

var carouselAutoTimer = null;
function startCarouselAutoPlay() {
    stopCarouselAutoPlay();
    carouselAutoTimer = setInterval(function() { goCarousel(1); }, 5000);
}
function stopCarouselAutoPlay() { clearInterval(carouselAutoTimer); }
startCarouselAutoPlay();

/* ═══════════════════════════════════════════════════════════
   BUILD WORD SPANS FROM TTS_TEXT
═══════════════════════════════════════════════════════════ */
var ttsTextBody    = document.getElementById("ttsTextBody");
var ttsWave        = document.getElementById("ttsWave");
var ttsPlayBtn     = document.getElementById("ttsPlayBtn");
var ttsRestartBtn  = document.getElementById("ttsRestartBtn");
var ttsStopBtn     = document.getElementById("ttsStopBtn");
var ttsProgress    = document.getElementById("ttsProgress");
var ttsCurrentTime = document.getElementById("ttsCurrentTime");
var ttsTotalTime   = document.getElementById("ttsTotalTime");

var ttsSentences = TTS_TEXT.split(/(?<=[.!?—])\s+/).filter(function(s) { return s.trim() !== ""; });

var sentenceStartPos = [];
var searchIdx = 0;
ttsSentences.forEach(function(sent) {
    var pos = TTS_TEXT.indexOf(sent, searchIdx);
    sentenceStartPos.push(pos);
    searchIdx = pos + sent.length;
});

var ttsWords = TTS_TEXT.match(/\S+/g) || [];
var wordCharPositions = [];
var wordSearchIdx = 0;
ttsWords.forEach(function(word) {
    var clean = word.replace(/[.,!?—]/g, "");
    var pos   = TTS_TEXT.indexOf(clean, wordSearchIdx);
    wordCharPositions.push({ start: pos, end: pos + clean.length });
    wordSearchIdx = pos + clean.length;
});

var wordSpans = [];
ttsWords.forEach(function(word, i) {
    var span = document.createElement("span");
    span.className   = "aw";
    span.textContent = word;
    (function(charPos) {
        span.addEventListener("click", function() {
            var targetSentIdx = 0;
            for (var s = sentenceStartPos.length - 1; s >= 0; s--) {
                if (charPos >= sentenceStartPos[s]) { targetSentIdx = s; break; }
            }
            ttsJumpToSentence(targetSentIdx);
        });
    })(wordCharPositions[i].start);
    wordSpans.push(span);
    ttsTextBody.appendChild(span);
    ttsTextBody.appendChild(document.createTextNode(" "));
});

var totalWords   = ttsWords.length;
var totalSeconds = Math.ceil(totalWords / voiceConfig.speechSpeed);
ttsProgress.max  = totalSeconds;
ttsTotalTime.textContent = fmtTimeTTS(totalSeconds);

/* ═══════════════════════════════════════════════════════════
   TTS STATE
═══════════════════════════════════════════════════════════ */
var ttsIsReading   = false;
var ttsIsPaused    = false;
var ttsCurSentIdx  = 0;
var ttsFakeProgress= 0;
var ttsTimer       = null;

function fmtTimeTTS(s) {
    if (!Number.isFinite(s) || s < 0) s = 0;
    return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
}

function ttsSetPlaying(on) {
    ttsPlayBtn.textContent = on ? "⏸" : "▶";
    if (on) ttsWave.classList.add("is-playing");
    else    ttsWave.classList.remove("is-playing");
}

function ttsClearHighlight() {
    wordSpans.forEach(function(s) { s.classList.remove("is-active", "is-past"); });
}

function ttsHighlightByChar(absoluteChar) {
    ttsClearHighlight();
    var found = -1;
    for (var i = 0; i < wordCharPositions.length; i++) {
        if (absoluteChar >= wordCharPositions[i].start && absoluteChar <= wordCharPositions[i].end) {
            found = i; break;
        }
    }
    if (found !== -1) {
        wordSpans[found].classList.add("is-active");
        for (var j = 0; j < found; j++) wordSpans[j].classList.add("is-past");
    }
}

function ttsStartProgressTimer() {
    ttsStopProgressTimer();
    ttsTimer = setInterval(function() {
        if (ttsFakeProgress < totalSeconds) {
            ttsFakeProgress++;
            ttsProgress.value = ttsFakeProgress;
            ttsCurrentTime.textContent = fmtTimeTTS(ttsFakeProgress);
        }
    }, 1000);
}

function ttsStopProgressTimer() { clearInterval(ttsTimer); }

function ttsReadSentence() {
    if (ttsCurSentIdx >= ttsSentences.length) { ttsStop(); return; }
    var utt = new SpeechSynthesisUtterance(ttsSentences[ttsCurSentIdx]);
    utt.lang  = voiceConfig.lang;
    utt.rate  = voiceConfig.rate;
    utt.pitch = 1;
    utt.volume= 1;
    var sentStart = sentenceStartPos[ttsCurSentIdx];
    utt.onboundary = function(e) {
        if (e.name === "word") ttsHighlightByChar(sentStart + e.charIndex);
    };
    utt.onend = function() {
        if (!ttsIsReading || ttsIsPaused) return;
        ttsCurSentIdx++;
        ttsReadSentence();
    };
    speechSynthesis.speak(utt);
}

function ttsPlay() {
    speechSynthesis.cancel();
    ttsCurSentIdx   = 0;
    ttsFakeProgress = 0;
    ttsProgress.value = 0;
    ttsCurrentTime.textContent = "0:00";
    ttsIsReading = true;
    ttsIsPaused  = false;
    ttsSetPlaying(true);
    ttsStartProgressTimer();
    ttsReadSentence();
}

function ttsPause() {
    speechSynthesis.pause();
    ttsIsPaused = true;
    ttsSetPlaying(false);
    ttsStopProgressTimer();
}

function ttsResume() {
    speechSynthesis.resume();
    ttsIsPaused = false;
    ttsSetPlaying(true);
    ttsStartProgressTimer();
}

function ttsStop() {
    speechSynthesis.cancel();
    ttsIsReading   = false;
    ttsIsPaused    = false;
    ttsCurSentIdx  = 0;
    ttsFakeProgress= 0;
    ttsProgress.value = 0;
    ttsCurrentTime.textContent = "0:00";
    ttsSetPlaying(false);
    ttsStopProgressTimer();
    ttsClearHighlight();
}

function ttsJumpToSentence(idx) {
    speechSynthesis.cancel();
    ttsStopProgressTimer();
    ttsCurSentIdx = idx;
    var charPos    = sentenceStartPos[idx];
    var charFrac   = charPos / TTS_TEXT.length;
    ttsFakeProgress = Math.round(charFrac * totalSeconds);
    ttsProgress.value = ttsFakeProgress;
    ttsCurrentTime.textContent = fmtTimeTTS(ttsFakeProgress);
    ttsClearHighlight();
    for (var i = 0; i < wordCharPositions.length; i++) {
        if (wordCharPositions[i].start < charPos) wordSpans[i].classList.add("is-past");
        else break;
    }
    if (ttsIsReading && !ttsIsPaused) {
        ttsStartProgressTimer();
        ttsReadSentence();
    }
}

ttsPlayBtn.addEventListener("click", function() {
    if (!ttsIsReading)    ttsPlay();
    else if (ttsIsPaused) ttsResume();
    else                  ttsPause();
});

ttsRestartBtn.addEventListener("click", function() { ttsStop(); ttsPlay(); });
ttsStopBtn.addEventListener("click",    function() { ttsStop(); });

ttsProgress.addEventListener("input", function() {
    ttsFakeProgress = Number(ttsProgress.value);
    ttsCurrentTime.textContent = fmtTimeTTS(ttsFakeProgress);
    var pct = ttsFakeProgress / totalSeconds;
    var targetSentIdx = Math.floor(pct * ttsSentences.length);
    if (targetSentIdx >= ttsSentences.length) targetSentIdx = ttsSentences.length - 1;
    if (ttsIsReading) ttsJumpToSentence(targetSentIdx);
});

/* ═══════════════════════════════════════════════════════════
   VIDEO PLAYER
═══════════════════════════════════════════════════════════ */
var videoFrame    = document.getElementById("videoFrame");
var video         = document.getElementById("mainVideo");
var playBtn       = document.getElementById("playBtn");
var videoProgress = document.getElementById("videoProgress");
var videoTime     = document.getElementById("videoTime");
var speedMenu     = document.getElementById("speedMenu");
var speedBtn      = document.getElementById("speedBtn");
var speedOptions  = document.querySelectorAll(".speed-option");
var fullscreenBtn = document.getElementById("fullscreenBtn");

var videoDragging = false;

function fmtTimeVid(s) {
    if (!Number.isFinite(s)) return "0:00";
    return Math.floor(s/60) + ":" + String(Math.floor(s%60)).padStart(2,"0");
}

function getVideoDur() { var d = video.duration; return Number.isFinite(d) ? d : 0; }

function updateVideoUI() {
    var dur = getVideoDur(), cur = video.currentTime;
    if (!videoDragging) videoProgress.value = String(Math.round(dur ? cur / dur * 1000 : 0));
    videoTime.textContent = fmtTimeVid(cur) + " / " + fmtTimeVid(dur);
}

function setVideoPlaying(p) {
    playBtn.textContent = p ? "⏸" : "▶";
    playBtn.setAttribute("aria-label", p ? "Pause" : "Play");
}

function setVideoSpeed(rate) {
    video.playbackRate = rate;
    speedBtn.textContent = rate + "×";
    speedOptions.forEach(function(o) {
        o.classList.toggle("is-active", Number(o.dataset.speed) === rate);
    });
}

playBtn.addEventListener("click", function() { video.paused ? video.play() : video.pause(); });

document.querySelectorAll("[data-skip]").forEach(function(btn) {
    btn.addEventListener("click", function() {
        var dur = getVideoDur();
        video.currentTime = Math.min(Math.max(video.currentTime + Number(btn.dataset.skip), 0), dur || 0);
        updateVideoUI();
    });
});

videoProgress.addEventListener("pointerdown", function() { videoDragging = true; });
videoProgress.addEventListener("pointerup", function() {
    videoDragging = false;
    var dur = getVideoDur();
    if (dur) video.currentTime = Number(videoProgress.value) / 1000 * dur;
    updateVideoUI();
});
videoProgress.addEventListener("input", function() {
    var dur = getVideoDur(); if (!dur) return;
    video.currentTime = Number(videoProgress.value) / 1000 * dur;
    updateVideoUI();
});

var videoSpeedJustPicked = false;
speedBtn.addEventListener("click", function(e) {
    e.stopPropagation();
    var open = speedMenu.classList.toggle("is-open");
    speedBtn.setAttribute("aria-expanded", String(open));
});
speedOptions.forEach(function(o) {
    o.addEventListener("click", function() {
        videoSpeedJustPicked = true;
        setVideoSpeed(Number(o.dataset.speed));
        speedMenu.classList.remove("is-open");
        speedBtn.setAttribute("aria-expanded", "false");
    });
});
document.addEventListener("click", function(e) {
    if (videoSpeedJustPicked) { videoSpeedJustPicked = false; return; }
    if (!speedMenu.contains(e.target)) {
        speedMenu.classList.remove("is-open");
        speedBtn.setAttribute("aria-expanded", "false");
    }
});

function isFullscreen() {
    return document.fullscreenElement === videoFrame || document.webkitFullscreenElement === videoFrame;
}

function updateFullscreenBtn() {
    var on = isFullscreen();
    videoFrame.classList.toggle("is-fullscreen", on);
    fullscreenBtn.textContent = on ? "⤢" : "⛶";
    fullscreenBtn.title = on ? "Exit full screen" : "Full screen";
    if (on) speedMenu.classList.remove("is-open");
}

fullscreenBtn.addEventListener("click", async function() {
    try {
        if (!isFullscreen()) {
            if (videoFrame.requestFullscreen) await videoFrame.requestFullscreen();
            else if (videoFrame.webkitRequestFullscreen) videoFrame.webkitRequestFullscreen();
        } else {
            if (document.exitFullscreen) await document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
    } catch(e) { console.warn("Fullscreen not supported", e); }
});

document.addEventListener("fullscreenchange",       updateFullscreenBtn);
document.addEventListener("webkitfullscreenchange", updateFullscreenBtn);

video.addEventListener("loadedmetadata", updateVideoUI);
video.addEventListener("timeupdate",     updateVideoUI);
video.addEventListener("ended",  function() { setVideoPlaying(false); });
video.addEventListener("play",   function() { setVideoPlaying(true); });
video.addEventListener("pause",  function() { setVideoPlaying(false); });

video.volume = 1;
setVideoSpeed(1);
setVideoPlaying(false);
updateFullscreenBtn();
