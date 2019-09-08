const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
const data = new Uint8Array(analyser.frequencyBinCount);

const queryInput = document.querySelector('#query')
const audioTag = document.querySelector('#audio');
const spotifyApi = new SpotifyWebApi();


getToken().then(function(token) {
  spotifyApi.setAccessToken(token);
});

function renderVisualization(analyzedAudio, index) {
  const buffer = analyzedAudio.buffer;
  const peaks = analyzedAudio.peaks;
  const bpm = analyzedAudio.bpm;
  const groups = analyzedAudio.groups;
  index = index || 0;

  if (index >= peaks.length) {
		return;
	}

  growShapes();

  const relativePositionOfPeak = peaks[index].position / buffer.length;
  const timeOfPeak = relativePositionOfPeak * buffer.duration * 1000;

  if (Math.abs(timeOfPeak - (audioTag.currentTime * 1000)) < 20) {
    shrinkShapes();

    renderBeatAnimation();

    requestAnimationFrame(function() {
      renderVisualization(analyzedAudio, index + 1)
    });
  } else {
    requestAnimationFrame(function() {
      renderVisualization(analyzedAudio, index)
    });
  }
  
}

//audioTag.addEventListener('play', renderVisualization);

document.getElementById('playButton').addEventListener('click', (formEvent) => {
  formEvent.preventDefault();
	queryInput.remove();
  drawBackground(canvas, {width: CANVAS_WIDTH, height: CANVAS_HEIGHT});
	drawBackground(barCanvas, {width: CANVAS_WIDTH, height: BAR_CANVAS_HEIGHT});

  if (!audioTag.paused) {
    audioTag.pause();
		document.getElementById('playCirclePlaying').setAttribute("id", "playCircle");
  } else if (audioTag.paused) {
    audioTag.play();
		document.getElementById('playCircle').setAttribute("id", "playCirclePlaying");
  }

  spotifyApi.searchTracks(
    queryInput.value.trim(), {limit: 1})
    .then(function(results) {
      let track = results.tracks.items[0];
      let previewUrl = track.preview_url;
      audioTag.src = previewUrl;

      let request = new XMLHttpRequest();
      request.open('GET', previewUrl, true);
      request.responseType = 'arraybuffer';
      request.onload = function() {
        // Create offline context
        let OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        let offlineContext = new OfflineContext(2, 30 * 44100, 44100);

        offlineContext.decodeAudioData(request.response, function(buffer) {

          // Create buffer source
          let source = offlineContext.createBufferSource();
          source.buffer = buffer;

          // Beats, or kicks, generally occur around the 100 to 150 hz range.
          // Below this is often the bassline.  So let's focus just on that.

          // First a lowpass to remove most of the song.

          let lowpass = offlineContext.createBiquadFilter();
          lowpass.type = "lowpass";
          lowpass.frequency.value = 150;
          lowpass.Q.value = 1;

          // Run the output of the source through the low pass.

          source.connect(lowpass);

          // Now a highpass to remove the bassline.

          let highpass = offlineContext.createBiquadFilter();
          highpass.type = "highpass";
          highpass.frequency.value = 100;
          highpass.Q.value = 1;

          // Run the output of the lowpass through the highpass.

          lowpass.connect(highpass);

          // Run the output of the highpass through our offline context.

          highpass.connect(offlineContext.destination);

          // Start the source, and render the output into the offline conext.

          source.start(0);
          offlineContext.startRendering();
        });

        offlineContext.oncomplete = function(audio) {
          const analyzedAudio = analyzeAudio(audio);
          requestAnimationFrame(function() {
            renderVisualization(analyzedAudio)
          });
        };
      };

      request.send();
    });
});
