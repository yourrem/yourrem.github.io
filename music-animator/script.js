const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
const data = new Uint8Array(analyser.frequencyBinCount);

const audioTag = document.querySelector('#audio');
const spotifyApi = new SpotifyWebApi();

class MyVisualzier extends AbstractVisualizer {
  renderBeatAnimation() {
    const point = {
      x: generateRandomValue(300, 700),
      y: generateRandomValue(100, 500),
    };
    //const radius =  generateRandomValue(5, 25);
    //const color = generateRandomColor();
    //const width = generateRandomValue(1, 2);

    //this.addCircle(point, radius, {color: color, width: width})

    const i =  generateRandomValue(5, 25);
    this.addSpiral(i, point)
  }
}

const visualizer = new MyVisualzier();

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

  visualizer.growShapes();

  if ((audioTag.currentTime * 1000) - peaks[index].timeOfPeak > 0) {
    visualizer.shrinkShapes();

    visualizer.renderBeatAnimation();

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

document.getElementById('playButton').addEventListener('click', (fromEvent) => {
  fromEvent.preventDefault();
  startMusic(function(audio) {
    const analyzedAudio = analyzeAudio(audio);
    visualizer.start();
    requestAnimationFrame(function() {
      renderVisualization(analyzedAudio)
    });
  });
});
