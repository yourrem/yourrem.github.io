const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
const data = new Uint8Array(analyser.frequencyBinCount);

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

  if ((audioTag.currentTime * 1000) - peaks[index].timeOfPeak  > 0) {
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

function beginAnimation(audio) {
  const analyzedAudio = analyzeAudio(audio);
  requestAnimationFrame(function() {
    renderVisualization(analyzedAudio)
  });

}

//audioTag.addEventListener('play', renderVisualization);

document.getElementById('playButton').addEventListener('click', (fromEvent) => {
  fromEvent.preventDefault();
  startMusic(function(audio) {
    beginAnimation(audio);
  });
});
