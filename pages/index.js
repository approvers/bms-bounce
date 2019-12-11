/**
 * @author RkEclair / https://github.com/RkEclair
 */

import {Component} from 'react';
import * as bms from 'bms';
import toWav from 'audiobuffer-to-wav';
import {resolve} from 'any-promise';
import {decode} from 'punycode';

const Bouncer = async (reader, title, files, nameView) => {
  const bin = reader.result;
  const compiled = bms.Compiler.compile(bin);
  const notes = bms.Notes.fromBMSChart(compiled.chart);
  const sounds = bms.Keysounds.fromBMSChart(compiled.chart);
  const bpm = compiled.chart.headers.get('bpm');

  const beat2Frame = (beat) => (beat / bpm) * 60 * 44100;

  const lastNote = notes.all()[notes.count() - 1];
  const songLength = beat2Frame((lastNote.endBeat || lastNote.beat) + 4);
  const soundCache = {},
    soundLoaders = [],
    decoder = new AudioContext(),
    ctx = new OfflineAudioContext(2, songLength, 44100);
  for (const note of notes.all()) {
    const sound = sounds.get(note.keysound.replace(/.ogg$/, '.wav'));
    if (sound === undefined) {
      if (
        window.confirm(
          `未定義のキー音 ${note.keysound} があります、続行しますか?`
        )
      )
        continue;
      nameView('中断');
      return;
    }
    const soundName = sound.split('.')[0];
    if (soundCache[soundName] === undefined) {
      soundLoaders.push(
        new Promise((resolve) => {
          const soundReader = new FileReader();
          soundReader.onload = async () => {
            nameView(sound);
            const wav = await decoder.decodeAudioData(soundReader.result);
            soundCache[soundName] = wav;
            resolve();
          };
          soundReader.readAsArrayBuffer(files[sound.split('.')[0]]);
        })
      );
    }
  }
  nameView('キー音読み出し中……');
  await Promise.all(soundLoaders);

  const soundRings = [];
  for (const note of notes.all()) {
    soundRings.push(async () => {
      const sound = sounds.get(note.keysound.replace(/.ogg$/, '.wav'));
      if (sound === undefined) return;
      const soundName = sound.split('.')[0];

      nameView('合成中…… ' + soundName);
      const buf = soundCache[soundName];
      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.connect(ctx.destination);
      const startFrame = beat2Frame(note.beat);
      source.start(startFrame);
    });
  }
  nameView('合成中……');
  await Promise.all(soundRings);
  nameView('Wav (PCM) に変換中……');
  const rendered = await ctx.startRendering();

  const speaker = new window.AudioContext();
  const toListen = speaker.createBufferSource();
  toListen.buffer = rendered;
  toListen.connect(speaker.destination);
  toListen.start();

  nameView('完了');
  const buf = new Uint8Array(toWav(rendered, {float32: true}));
  const downloader = document.createElement('a');
  downloader.download = title.split('.')[0] + '.wav';
  downloader.href = URL.createObjectURL(new Blob([buf]));
  downloader.click();
};

export default class Index extends Component {
  state = {bouncing: false, loadingSoundName: ''};

  render() {
    return (
      <div>
        <h1>BMS Bouncer</h1>
        <h3>
          {this.state.bouncing
            ? 'バウンス中…'
            : 'BMSファイルが入ったフォルダ内のファイル全てを選択してね'}
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
                  files[e.target.files[key].name.split('.')[0]] =
                    e.target.files[key];
                  const exts = e.target.files[key].name.split('.');
                  return ['bms', 'bme', 'bml', 'pms'].some(
                    (e) => e === exts[exts.length - 1]
                  );
                }
              )[0];
              const bms = e.target.files[firstBMSIndex];
              const reader = new FileReader();
              reader.onload = () => {
                Bouncer(reader, bms.name, files, (name) =>
                  this.setState({bouncing: true, loadingSoundName: name})
                ).finally(() => this.setState({bouncing: false}));
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
