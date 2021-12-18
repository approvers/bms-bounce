import { ChangeEvent, useState } from "react";
import { NextPage } from "next";
import toWav from "audiobuffer-to-wav";

const forEachChannel = (
  buf: AudioBuffer,
  f: (arr: Float32Array, channel: number) => void,
) => {
  for (let channel = 0; channel < buf.numberOfChannels; ++channel) {
    const arr = buf.getChannelData(channel);
    f(arr, channel);
  }
};

const bounce = async (
  source: string,
  filename: string,
  files: Readonly<Record<string, Blob>>,
  nameView: (message: string) => void,
) => {
  const { BmsData } = await import("../bms-rs-wasm/pkg/bms_rs_wasm");
  const bms = new BmsData(source, { free: () => {} });
  const lengthSeconds = bms.length_seconds();
  const ctx = new AudioContext();
  const sampleRate = 44100;
  const buf = ctx.createBuffer(2, lengthSeconds * sampleRate, sampleRate);
  const audioSeconds = bms.audio_play_seconds();
  // const notes = bms.Notes.fromBMSChart(compiled.chart);
  // const sounds = bms.Keysounds.fromBMSChart(compiled.chart);
  // const bpm = compiled.chart.headers.get("bpm");

  // const beat2Frame = (beat) => (beat / bpm) * 60 * 44100;

  // const lastNote = notes.all()[notes.count() - 1];
  // const songLength = beat2Frame((lastNote.endBeat || lastNote.beat) + 4);
  // const soundCache = {},
  //   soundLoaders = [],
  //   decoder = new AudioContext(),
  //   ctx = new OfflineAudioContext(2, songLength, 44100);
  // for (const note of notes.all()) {
  //   const sound = sounds.get(note.keysound.replace(/.ogg$/, ".wav"));
  //   if (sound === undefined) {
  //     if (
  //       window.confirm(
  //         `未定義のキー音 ${note.keysound} があります、続行しますか?`,
  //       )
  //     ) {
  //       continue;
  //     }
  //     nameView("中断");
  //     return;
  //   }
  //   const soundName = sound.split(".")[0];
  //   if (soundCache[soundName] === undefined) {
  //     soundLoaders.push(
  //       new Promise((resolve) => {
  //         const soundReader = new FileReader();
  //         soundReader.onload = async () => {
  //           nameView(sound);
  //           const wav = await decoder.decodeAudioData(soundReader.result);
  //           soundCache[soundName] = wav;
  //           resolve();
  //         };
  //         soundReader.readAsArrayBuffer(files[sound.split(".")[0]]);
  //       }),
  //     );
  //   }
  // }
  // nameView("キー音読み出し中……");
  // await Promise.all(soundLoaders);

  // const soundRings = [];
  // for (const note of notes.all()) {
  //   soundRings.push(async () => {
  //     const sound = sounds.get(note.keysound.replace(/.ogg$/, ".wav"));
  //     if (sound === undefined) return;
  //     const soundName = sound.split(".")[0];

  //     nameView("合成中…… " + soundName);
  //     const buf = soundCache[soundName];
  //     const source = ctx.createBufferSource();
  //     source.buffer = buf;
  //     source.connect(ctx.destination);
  //     const startFrame = beat2Frame(note.beat);
  //     source.start(startFrame);
  //   });
  // }
  // nameView("合成中……");
  // await Promise.all(soundRings);
  // nameView("Wav (PCM) に変換中……");
  // const rendered = await ctx.startRendering();

  // const speaker = new window.AudioContext();
  // const toListen = speaker.createBufferSource();
  // toListen.buffer = rendered;
  // toListen.connect(speaker.destination);
  // toListen.start();

  // nameView("完了");
  // const buf = new Uint8Array(toWav(rendered, { float32: true }));
  // const downloader = document.createElement("a");
  // downloader.download = filename.split(".")[0] + ".wav";
  // downloader.href = URL.createObjectURL(new Blob([buf]));
  // downloader.click();
};

const fileHandler =
  (setBouncing: (v: boolean) => void, setLoadingName: (v: string) => void) =>
  (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (4 < files.length) {
      setBouncing(true);
      const soundFiles: Record<string, Blob> = {};
      const firstBMSIndex = Object.keys(files).filter((key) => {
        soundFiles[files[key].name.split(".")[0]] = files[key];
        const exts = files[key].name.split(".");
        const ext = exts[exts.length - 1];
        return ["bms", "bme", "bml", "pms"].includes(ext);
      })[0];
      const bms = files[firstBMSIndex];
      const reader = new FileReader();
      reader.onload = (e) => {
        bounce(e.target.result as string, bms.name, soundFiles, (name) => {
          setBouncing(true);
          setLoadingName(name);
        }).finally(() => setBouncing(false));
      };
      reader.readAsText(bms);
    }
  };

const Index: NextPage = () => {
  const [bouncing, setBouncing] = useState(false);
  const [loadingName, setLoadingName] = useState("");

  return (
    <div>
      <h1>BMS Bouncer</h1>
      <h3>
        {bouncing
          ? "バウンス中…"
          : "BMSファイルが入ったフォルダ内のファイル全てを選択してね"}
      </h3>
      <h4>{loadingName}</h4>
      <input
        type="file"
        multiple
        onChange={fileHandler(setBouncing, setLoadingName)}
      />
      <style jsx>{``}</style>
    </div>
  );
};

export default Index;
