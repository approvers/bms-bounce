/**
 * @author RkEclair / https://github.com/RkEclair 
 */

import * as bms from 'bms';
import toWav from 'audiobuffer-to-wav';

const Bouncer = (reader, title, files) => async () => {
  const bin = reader.result;
  const compiled = bms.Compiler.compile(bin);
  const notes = bms.Notes.fromBMSChart(compiled.chart);
  const sounds = bms.Keysounds.fromBMSChart(compiled.chart);
  const bpm = compiled.chart.headers.get('bpm');
  const lastNote = notes.all()[notes.count() - 1];
  const songLength = (lastNote.endBeat || lastNote.beat) / bpm * 60 * 44100;
  const soundMap = {}, decoder = new AudioContext, ctx = new OfflineAudioContext(2, songLength, 44100);
  for (const note of notes.all()) {
    const sound = sounds.get(note.keysound);
    if (soundMap[sound] === undefined) {
      const soundReader = new FileReader();
      soundReader.onload = () => {
        decoder.decodeAudioData(soundReader.result).then(buf => {
          const source = ctx.createBufferSource();
          source.src = buf;
          source.connect(ctx.destination);
          const offset = note.beat / bpm * 60 * 44100;
          console.log(offset);
          source.start(offset);
        });
      };
      soundReader.readAsArrayBuffer(files[sound]);
    }
  }
  await ctx.startRendering().then(rendered => {
    const buf = new Uint8Array(toWav(rendered));
    const downloader = document.createElement('a');
    downloader.download = `${title}.wav`;
    downloader.href = URL.createObjectURL(new Blob(buf));
    console.log(downloader);
    downloader.click();
  });
};

export default () => (
  <div>
    <h1>BMS Bouncer</h1>
    <h3>BMSファイルが入ったフォルダ内のファイル全てを選択してね</h3>
    <input type="file" multiple onInput={e => {
      if (4 < e.target.files.length) {
        const files = {};
        const firstBMSIndex = Object.keys(e.target.files).filter(
          key => {
            files[e.target.files[key].name] = e.target.files[key];
            return /\.(bms|bme|bml|pms)/i.test(e.target.files[key].name);
          }
        );
        const bms = e.target.files[firstBMSIndex];
        const reader = new FileReader();
        reader.onload = Bouncer(reader, bms.name, files);
        reader.readAsText(bms);
      }
    }} />
    <style jsx>{`
      
    `}</style>
  </div>
);
