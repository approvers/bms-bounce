/**
 * @author RkEclair / https://github.com/RkEclair
 */

import {Component} from "react";
import * as bms from "bms";
import toWav from "audiobuffer-to-wav";

const Bouncer = async (reader, title, files, nameView) => {
  const bin = reader.result;
  const compiled = bms.Compiler.compile(bin);
  const notes = bms.Notes.fromBMSChart(compiled.chart);
  const sounds = bms.Keysounds.fromBMSChart(compiled.chart);
  const bpm = compiled.chart.headers.get("bpm");
  const lastNote = notes.all()[notes.count() - 1];
  const songLength = (((lastNote.endBeat || lastNote.beat) + 4) / bpm) * 60 * 44100;
  const soundCache = {},
    decoder = new AudioContext(),
    ctx = new OfflineAudioContext(2, songLength, 44100);
  const works = [];
  for (const note of notes.all()) {
    const sound = sounds.get(note.keysound);
    const soundFile = soundCache[sound.split(".")[0]];
    if (soundFile === undefined) {
      const soundReader = new FileReader();
      soundCache[sound.split(".")[0]] = await new Promise((resolve) => {
        soundReader.onload = async () => {
          nameView(sound);
          resolve(decoder.decodeAudioData(soundReader.result));
        };
        soundReader.readAsArrayBuffer(files[sound.split(".")[0]]);
      });
    }
    const source = ctx.createBufferSource();
    source.src = buf;
    source.connect(ctx.destination);
    const offset = (note.beat / bpm) * 60 * 44100;
    source.start(offset);
  }
  nameView("");
  await Promise.all(works);
  const rendered = await ctx.startRendering();
  const buf = new Uint8Array(toWav(rendered));
  const downloader = document.createElement("a");
  downloader.download = title.split(".")[0] + ".wav";
  downloader.href = URL.createObjectURL(new Blob([buf]));
  downloader.click();
};

export default class Index extends Component {
  state = {bouncing: false, loadingSoundName: ""};

  render() {
    return (
      <div>
        <h1>BMS Bouncer</h1>
        <h3>
          {this.state.bouncing
            ? "バウンス中…"
            : "BMSファイルが入ったフォルダ内のファイル全てを選択してね"}
        </h3>
        <h4>{this.state.loadingSoundName}</h4>
        <input
          type="file"
          multiple
          onInput={(e) => {
            if (4 < e.target.files.length) {
              this.setState({bouncing: true});
              const files = {};
              const firstBMSIndex = Object.keys(e.target.files).filter(
                (key) => {
                  files[e.target.files[key].name.split(".")[0]] =
                    e.target.files[key];
                  const exts = e.target.files[key].name.split(".");
                  return ["bms", "bme", "bml", "pms"].some(
                    (e) => e === exts[exts.length - 1]
                  );
                }
              )[0];
              const bms = e.target.files[firstBMSIndex];
              const reader = new FileReader();
              reader.onload = () => {
                Bouncer(reader, bms.name, files, (name) =>
                  this.setState({bouncing: true, loadingSoundName: name})
                ).then(() => this.setState({bouncing: false}));
              };
              reader.readAsText(bms);
            }
          }}
        />
        <style jsx>{``}</style>
      </div>
    );
  }
}
