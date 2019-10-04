class MyVisualizer extends AbstractVisualizer {
    constructor(analyzedAudio) {
      super();
      this.peaks = analyzedAudio.peaks;
      this.start();
    }

    /**
     * TODO(you): 
     * 1) Call drawShapes() to re-draw the visual at the current time index.
     *    -- If you want to "conditionally" draw (ex. only draw at a certain
     *    BEAT in the song), what do you need to add?
     * 2) Add the requestAnimationFrame loop which recursively calls
     * itself ("updateVisual") to repeatedly update the visual.
     */
    updateVisual(index) {
      index = index || 0;

      if (index >= this.peaks.length) {
          return;
      }

      const audioEl = document.querySelector('#audio');

      if ((audioEl.currentTime * 1000) - this.peaks[index].timeOfPeak > 0) {

        this.drawShapes();

        requestAnimationFrame(() => {
          this.updateVisual(index + 1)
        });
      } else {
        requestAnimationFrame(() => {
          this.updateVisual(index)
        });
      }
    }

    /**
     * TODO(you): Draw the shapes you'd expect to see in your visual.
     */
    drawShapes() {
        const point = {
          x: generateRandomValue(300, 700),
          y: generateRandomValue(100, 500),
        };
        const point2 = {
          x: generateRandomValue(300, 700),
          y: generateRandomValue(100, 500),
        };
        const radius =  generateRandomValue(5, 25);
        const color = generateRandomColor();
        const width = generateRandomValue(1, 2);
        const i =  generateRandomValue(5, 25);
        const startAngle =  generateRandomValue(0, Math.PI);
        const endAngle =  generateRandomValue(0, Math.PI);

        this.drawCircle(point, radius, {});
        //this.drawSemiCircle(point, radius, startAngle, endAngle, 10, color);
        //this.drawLine(point, point2, {});
        //this.drawSpiral(i, point, color)
        //this.drawSquigglyLine(point, i, {});
    }
}

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
const data = new Uint8Array(analyser.frequencyBinCount);

const spotifyApi = new SpotifyWebApi();

getToken().then((token) => {
  spotifyApi.setAccessToken(token);
});

/**
 * TODO(you): Add a 'click' event listener that starts the music.
 */
document.getElementById('playButton').addEventListener('click', (fromEvent) => { 
  fromEvent.preventDefault();

  const audioEl = document.querySelector('#audio');
  const queryInput = document.querySelector('#query')
  document.getElementById('playCircle').setAttribute("class", "playing");

  if(!audioEl.src) {
    // TODO(you): Use the spotifyApi to searchTracks for your input. Documentation can be found at:
    // https://doxdox.org/jmperez/spotify-web-api-js#src-spotify-web-api.js-constr.prototype.searchtracks
    spotifyApi.searchTracks(queryInput.value.trim(), {limit: 1}) 
      .then((results) => {
        let track = results.tracks.items[0];
        let previewUrl = track.preview_url;
        if (previewUrl) {
          queryInput.remove();

          startMusic(audioEl, previewUrl, (audio) => {
            const analyzedAudio = analyzeAudio(audio);

            // TODO(you): Create an instance of MyVisualizer.
            const visualizer = new MyVisualizer(analyzedAudio);

            audioEl.play();
            visualizer.updateVisual();
          });
        } else {
          console.warn('This song does not have a preview');
          document.getElementById('playCircle').setAttribute("class", "");
        }
      })
      .catch((error) => {
        console.warn('Something went wrong');
        console.warn(error);
        document.getElementById('playCircle').setAttribute("class", "");
      });
  } else if (!audioEl.paused) {
    audioEl.pause();
		document.getElementById('playCircle').setAttribute("class", "");
  } else {
    audioEl.play();
		document.getElementById('playCircle').setAttribute("class", "playing");
  }
});
