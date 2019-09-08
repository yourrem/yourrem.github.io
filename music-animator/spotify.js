
function getToken() {
  return fetch('https://spotify-web-api-token.herokuapp.com/token')
    .then(function(response) {
      return response.json();
    })
    .then(function(myJson) {
      return myJson.token;
    })
    .catch(function(err) {
      console.log(err);
      debugger;
    });
}

function getPeaks(data) {

  // What we're going to do here, is to divide up our audio into parts.

  // We will then identify, for each part, what the loudest sample is in that
  // part.

  // It's implied that that sample would represent the most likely 'beat'
  // within that part.

  // Each part is 0.5 seconds long - or 22,050 samples.

  // This will give us 60 'beats' - we will only take the loudest half of
  // those.

  // This will allow us to ignore breaks, and allow us to address tracks with
  // a BPM below 120.

  let partSize = 22050,
      parts = data[0].length / partSize,
      peaks = [];

  for (let i = 0; i < parts; i++) {
    let max = 0;
    for (let j = i * partSize; j < (i + 1) * partSize; j++) {
      let volume = Math.max(Math.abs(data[0][j]), Math.abs(data[1][j]));
      if (!max || (volume > max.volume)) {
        max = {
          position: j,
          volume: volume
        };
      }
    }
    peaks.push(max);
  }

  // We then sort the peaks according to volume...

  peaks.sort(function(a, b) {
    return b.volume - a.volume;
  });

  // ...take the loundest half of those...

  peaks = peaks.splice(0, peaks.length * 0.5);

  // ...and re-sort it back based on position.

  peaks.sort(function(a, b) {
    return a.position - b.position;
  });

  return peaks;
}

function getIntervals(peaks) {

  // What we now do is get all of our peaks, and then measure the distance to
  // other peaks, to create intervals.  Then based on the distance between
  // those peaks (the distance of the intervals) we can calculate the BPM of
  // that particular interval.

  // The interval that is seen the most should have the BPM that corresponds
  // to the track itself.

  let groups = [];

  peaks.forEach(function(peak, index) {
    for (let i = 1; (index + i) < peaks.length && i < 10; i++) {
      let group = {
        tempo: (60 * 44100) / (peaks[index + i].position - peak.position),
        count: 1
      };

      while (group.tempo < 90) {
        group.tempo *= 2;
      }

      while (group.tempo > 180) {
        group.tempo /= 2;
      }

      group.tempo = Math.round(group.tempo);

      if (!(groups.some(function(interval) {
        return (interval.tempo === group.tempo ? interval.count++ : 0);
      }))) {
        groups.push(group);
      }
    }
  });
  return groups;
}

function analyzeAudio(audio) {
  buffer = audio.renderedBuffer;
  peaks = getPeaks([buffer.getChannelData(0), buffer.getChannelData(1)]).map(peak => {
    const relativePositionOfPeak = peak.position / buffer.length;
    const timeOfPeak = relativePositionOfPeak * buffer.duration * 1000;
    return {
      ...peak,
      timeOfPeak,
    };
  });
  groups = getIntervals(peaks);

  const weightedSum = groups.reduce(function(sum, group) {
    return sum + (group.count * group.tempo);
  }, 0);
  const weights = groups.reduce(function(sum, group) {
    return sum + group.count;
  }, 0);
  // Not perfect measure of BPM. For Japanesse denim BPM is 124 but
  // the calcualted BPM is 133.
  const bpm = weightedSum / weights;


  return {
    buffer,
    peaks,
    groups,
    bpm,
  };
}
